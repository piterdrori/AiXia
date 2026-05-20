-- Roll up allocation/expense recipient confirmation to payment headers and backfill stale rows.

CREATE OR REPLACE FUNCTION public.finance_recalculate_payment_recipient_confirmation(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payment public.finance_payments_made%rowtype;
  v_has_active_allocations boolean;
  v_has_disputed boolean;
  v_has_not_received boolean;
  v_has_pending boolean;
  v_all_complete boolean;
  v_confirmed_at timestamptz;
  v_confirmed_by uuid;
  v_next_status text;
begin
  select *
  into v_payment
  from public.finance_payments_made
  where id = p_payment_id
  for update;

  if not found then
    return;
  end if;

  if v_payment.payment_source_type not in ('operating_expense', 'reimbursement') then
    return;
  end if;

  select exists (
    select 1
    from public.finance_payment_made_expense_allocations a
    where a.payment_made_id = p_payment_id
      and coalesce(a.lifecycle_status, 'active') = 'active'
  )
  into v_has_active_allocations;

  if not v_has_active_allocations then
    return;
  end if;

  select
    bool_or(coalesce(a.recipient_confirmation_status, '') = 'disputed'),
    bool_or(coalesce(a.recipient_confirmation_status, '') = 'not_received'),
    bool_or(
      coalesce(a.recipient_confirmation_status, '') in ('pending_confirmation', 'pending')
    ),
    bool_and(
      coalesce(a.recipient_confirmation_status, '') in ('received_confirmed', 'confirmed')
    ),
    max(a.recipient_confirmed_at),
    (
      array_agg(a.recipient_confirmed_by order by a.recipient_confirmed_at desc nulls last)
      filter (where a.recipient_confirmed_by is not null)
    )[1]
  into
    v_has_disputed,
    v_has_not_received,
    v_has_pending,
    v_all_complete,
    v_confirmed_at,
    v_confirmed_by
  from public.finance_payment_made_expense_allocations a
  where a.payment_made_id = p_payment_id
    and coalesce(a.lifecycle_status, 'active') = 'active';

  if v_has_disputed then
    v_next_status := 'disputed';
  elsif v_has_not_received then
    v_next_status := 'not_received';
  elsif v_has_pending then
    v_next_status := 'pending_confirmation';
  elsif v_all_complete then
    v_next_status := 'received_confirmed';
  else
    v_next_status := coalesce(v_payment.recipient_confirmation_status, 'not_required');
  end if;

  update public.finance_payments_made
  set
    recipient_confirmation_status = v_next_status,
    recipient_confirmed_at = case
      when v_next_status = 'received_confirmed'
        then coalesce(v_confirmed_at, recipient_confirmed_at, now())
      else recipient_confirmed_at
    end,
    recipient_confirmed_by = case
      when v_next_status = 'received_confirmed'
        then coalesce(v_confirmed_by, recipient_confirmed_by, auth.uid())
      else recipient_confirmed_by
    end,
    updated_at = now(),
    updated_by = coalesce(auth.uid(), updated_by)
  where id = p_payment_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finance_confirm_expense_payment_received(
  p_expense_id uuid,
  p_confirmation_status text,
  p_notes text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payment_id uuid;
begin
  if p_confirmation_status not in ('received_confirmed', 'not_received', 'disputed') then
    raise exception 'Invalid recipient confirmation status';
  end if;

  update public.finance_expenses
  set
    recipient_confirmation_status = p_confirmation_status,
    recipient_confirmed_at = now(),
    recipient_confirmed_by = auth.uid(),
    recipient_confirmation_notes = p_notes,
    recipient_dispute_reason = case
      when p_confirmation_status in ('not_received', 'disputed') then p_notes
      else null
    end,
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_expense_id;

  update public.finance_payment_made_expense_allocations
  set
    recipient_confirmation_status = p_confirmation_status,
    recipient_confirmed_at = now(),
    recipient_confirmed_by = auth.uid(),
    recipient_confirmation_notes = p_notes,
    recipient_dispute_reason = case
      when p_confirmation_status in ('not_received', 'disputed') then p_notes
      else null
    end,
    updated_at = now(),
    updated_by = auth.uid()
  where expense_id = p_expense_id;

  for v_payment_id in
    select distinct payment_made_id
    from public.finance_payment_made_expense_allocations
    where expense_id = p_expense_id
      and payment_made_id is not null
  loop
    perform public.finance_recalculate_payment_recipient_confirmation(v_payment_id);
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finance_confirm_payment_made(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payment public.finance_payments_made%rowtype;
  v_bill public.finance_bills_received%rowtype;
  v_effective_amount numeric(18,2);
  v_allocated_amount numeric(18,2);
  v_expense_id uuid;
begin
  if not public.finance_user_has_permission('editFinanceRecords') then
    raise exception 'Missing permission: editFinanceRecords';
  end if;

  select *
  into v_payment
  from public.finance_payments_made
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment made not found';
  end if;

  if v_payment.status <> 'draft' then
    raise exception 'Only draft payments made can be confirmed';
  end if;

  v_effective_amount := coalesce(v_payment.converted_amount, v_payment.amount, 0)::numeric(18,2);

  if v_effective_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if coalesce(v_payment.payment_source_type, 'vendor_bill') = 'vendor_bill' then
    if v_payment.bill_id is null then
      raise exception 'Payment made must be linked to a bill before confirmation';
    end if;

    select *
    into v_bill
    from public.finance_bills_received
    where id = v_payment.bill_id
    for update;

    if not found then
      raise exception 'Linked bill not found';
    end if;

    if v_bill.status not in ('open', 'partially_paid', 'overdue') then
      raise exception 'Bill must be open, partially paid, or overdue before payment confirmation';
    end if;

    if v_bill.approval_status is distinct from 'approved' then
      raise exception 'Bill must be approved before payment confirmation';
    end if;

    if v_effective_amount > coalesce(v_bill.balance_due, 0) then
      raise exception 'Payment amount exceeds bill balance due';
    end if;

    update public.finance_payments_made
    set
      status = 'confirmed',
      converted_amount = v_effective_amount,
      updated_at = now(),
      updated_by = auth.uid()
    where id = p_payment_id;

    update public.finance_bills_received
    set linked_to_payment_at = coalesce(linked_to_payment_at, now())
    where id = v_bill.id;

    perform public.finance_recalculate_bill_totals(v_bill.id);

    return;
  end if;

  if v_payment.payment_source_type in ('operating_expense', 'reimbursement') then
    select
      coalesce(
        sum(public.finance_allocation_payment_currency_amount(a, v_payment.payment_currency_code)),
        0
      )::numeric(18,2)
    into v_allocated_amount
    from public.finance_payment_made_expense_allocations a
    where a.payment_made_id = p_payment_id
      and coalesce(a.lifecycle_status, 'active') = 'active';

    if v_allocated_amount <= 0 then
      raise exception 'Expense/reimbursement payment must have expense allocations before confirmation';
    end if;

    if v_allocated_amount > v_effective_amount then
      raise exception 'Allocated expense amount exceeds payment amount';
    end if;

    update public.finance_payments_made
    set
      status = 'confirmed',
      converted_amount = v_effective_amount,
      recipient_confirmation_status = case
        when recipient_confirmation_status = 'not_required' then 'pending_confirmation'
        else recipient_confirmation_status
      end,
      updated_at = now(),
      updated_by = auth.uid()
    where id = p_payment_id;

    update public.finance_payment_made_expense_allocations
    set
      recipient_confirmation_status = case
        when recipient_confirmation_status in ('not_required', 'not_paid_yet') then 'pending_confirmation'
        when recipient_confirmation_status = 'pending_confirmation' then 'pending_confirmation'
        else recipient_confirmation_status
      end,
      updated_at = now(),
      updated_by = auth.uid()
    where payment_made_id = p_payment_id;

    for v_expense_id in
      select distinct expense_id
      from public.finance_payment_made_expense_allocations
      where payment_made_id = p_payment_id
        and expense_id is not null
    loop
      perform public.finance_recalculate_expense_coverage(v_expense_id);
    end loop;

    perform public.finance_recalculate_payment_recipient_confirmation(p_payment_id);

    return;
  end if;

  update public.finance_payments_made
  set
    status = 'confirmed',
    converted_amount = v_effective_amount,
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_payment_id;
end;
$function$;

-- Backfill stale payment headers where employee already confirmed receipt.
do $$
declare
  v_payment_id uuid;
begin
  for v_payment_id in
    select distinct p.id
    from public.finance_payments_made p
    join public.finance_payment_made_expense_allocations a on a.payment_made_id = p.id
    join public.finance_expenses e on e.id = a.expense_id
    where p.payment_source_type in ('operating_expense', 'reimbursement')
      and coalesce(a.lifecycle_status, 'active') = 'active'
      and (
        e.recipient_confirmation_status = 'received_confirmed'
        or a.recipient_confirmation_status = 'received_confirmed'
      )
      and coalesce(p.recipient_confirmation_status, '') <> 'received_confirmed'
  loop
    perform public.finance_recalculate_payment_recipient_confirmation(v_payment_id);
  end loop;
end $$;
