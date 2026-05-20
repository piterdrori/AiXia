-- Ensure confirmed expense payments unlock employee recipient confirmation on linked expenses.
-- finance_recalculate_expense_coverage already sets recipient_confirmation_status to
-- pending_confirmation when covered by confirmed payments; call it explicitly after confirm.

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
      coalesce(sum(coalesce(converted_amount, allocated_amount, 0)), 0)::numeric(18,2)
    into v_allocated_amount
    from public.finance_payment_made_expense_allocations
    where payment_made_id = p_payment_id;

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

-- Backfill expenses still marked not_paid_yet while covered by confirmed expense payments.
do $$
declare
  v_expense_id uuid;
begin
  for v_expense_id in
    select distinct a.expense_id
    from public.finance_payment_made_expense_allocations a
    join public.finance_payments_made p on p.id = a.payment_made_id
    join public.finance_expenses e on e.id = a.expense_id
    where p.status = 'confirmed'
      and p.payment_source_type in ('operating_expense', 'reimbursement')
      and coalesce(a.lifecycle_status, 'active') = 'active'
      and coalesce(e.recipient_confirmation_status, 'not_paid_yet') in ('not_paid_yet', 'not_required')
  loop
    perform public.finance_recalculate_expense_coverage(v_expense_id);
  end loop;
end $$;
