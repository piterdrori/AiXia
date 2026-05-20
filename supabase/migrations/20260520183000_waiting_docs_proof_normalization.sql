create or replace function public.finance_approve_expense_to_spend(
  p_expense_id uuid,
  p_approved_amount numeric default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.finance_expenses%rowtype;
  v_amount numeric(18,2);
  v_has_link boolean := false;
  v_has_attachment boolean := false;
  v_has_proof boolean := false;
  v_documentation_status text := 'missing';
begin
  if not (
    public.finance_user_has_permission('approveFinanceRecords')
    or public.finance_user_has_permission('approveExpenses')
    or public.finance_user_has_permission('editFinanceRecords')
  ) then
    raise exception 'Missing permission: approveFinanceRecords / approveExpenses / editFinanceRecords';
  end if;

  select *
  into v_expense
  from public.finance_expenses
  where id = p_expense_id
  for update;

  if not found then
    raise exception 'Expense not found';
  end if;

  if coalesce(v_expense.request_status, v_expense.status) in ('archived', 'deleted', 'cancelled') then
    raise exception 'Archived, deleted, or cancelled expenses cannot be approved to spend';
  end if;

  v_amount := coalesce(p_approved_amount, v_expense.requested_amount, v_expense.amount, 0)::numeric(18,2);

  if v_amount <= 0 then
    raise exception 'Approved amount must be greater than zero';
  end if;

  v_has_link := coalesce(nullif(trim(v_expense.metadata ->> 'documentation_link'), ''), null) is not null;

  select exists (
    select 1
    from public.finance_record_attachments a
    where a.entity_type = 'finance_expense'
      and a.entity_id = p_expense_id
  )
  into v_has_attachment;

  v_documentation_status := case
    when coalesce(v_expense.documentation_status, '') in ('uploaded', 'linked', 'files_and_links', 'verified') then v_expense.documentation_status
    when v_has_attachment and v_has_link then 'files_and_links'
    when v_has_attachment then 'uploaded'
    when v_has_link then 'linked'
    else 'missing'
  end;

  v_has_proof := v_documentation_status in ('uploaded', 'linked', 'files_and_links', 'verified');

  update public.finance_expenses
  set
    request_status = case when v_has_proof then 'documentation_submitted' else 'approved_to_spend' end,
    approval_status = 'approved',
    approved_amount = v_amount,
    final_amount = coalesce(final_amount, v_amount),
    approved_to_spend_at = now(),
    approved_to_spend_by = auth.uid(),
    rejection_reason = null,
    documentation_status = v_documentation_status,
    documentation_submitted_at = case
      when v_has_proof then coalesce(documentation_submitted_at, now())
      else documentation_submitted_at
    end,
    finance_review_status = case
      when finance_review_status = 'rejected' then 'pending_review'
      when finance_review_status is null then 'pending_review'
      else finance_review_status
    end,
    notes = coalesce(nullif(trim(p_notes), ''), notes),
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_expense_id;
end;
$$;

with proof_flags as (
  select
    e.id,
    e.documentation_status,
    exists (
      select 1
      from public.finance_record_attachments a
      where a.entity_type = 'finance_expense'
        and a.entity_id = e.id
    ) as has_attachment,
    coalesce(nullif(trim(e.metadata ->> 'documentation_link'), ''), null) is not null as has_link
  from public.finance_expenses e
  where e.request_status = 'approved_to_spend'
    and coalesce(e.status, '') not in ('archived', 'deleted', 'cancelled')
    and coalesce(e.approval_status, '') = 'approved'
),
stale_rows as (
  select
    id,
    case
      when documentation_status in ('uploaded', 'linked', 'files_and_links', 'verified') then documentation_status
      when has_attachment and has_link then 'files_and_links'
      when has_attachment then 'uploaded'
      when has_link then 'linked'
      else 'missing'
    end as normalized_documentation_status
  from proof_flags
  where documentation_status in ('uploaded', 'linked', 'files_and_links', 'verified')
    or has_attachment
    or has_link
)
update public.finance_expenses e
set
  request_status = 'documentation_submitted',
  documentation_status = stale_rows.normalized_documentation_status,
  documentation_submitted_at = coalesce(e.documentation_submitted_at, now()),
  updated_at = now()
from stale_rows
where e.id = stale_rows.id;
