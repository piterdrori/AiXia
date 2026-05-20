-- Cross-currency expense allocations store expense-currency amounts in allocated_amount
-- and payment-currency amounts in converted_amount (or metadata). Confirm was summing
-- converted_amount first, which breaks when legacy rows swapped columns or when comparing
-- CNY coverage totals against a USD payment header.

CREATE OR REPLACE FUNCTION public.finance_allocation_payment_currency_amount(
  p_allocation public.finance_payment_made_expense_allocations,
  p_payment_currency_code text DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    nullif(trim(p_allocation.metadata->>'payment_currency_amount'), '')::numeric(18,2),
    CASE
      WHEN upper(coalesce(p_allocation.currency_code, '')) = upper(
        coalesce(p_allocation.payment_currency_code, p_payment_currency_code, '')
      )
      THEN coalesce(p_allocation.allocated_amount, p_allocation.converted_amount, 0)::numeric(18,2)
      ELSE coalesce(p_allocation.converted_amount, p_allocation.allocated_amount, 0)::numeric(18,2)
    END,
    0::numeric(18,2)
  );
$$;

CREATE OR REPLACE FUNCTION public.finance_allocation_expense_currency_amount(
  p_allocation public.finance_payment_made_expense_allocations
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    nullif(trim(p_allocation.metadata->>'expense_currency_amount'), '')::numeric(18,2),
    coalesce(p_allocation.allocated_amount, p_allocation.converted_amount, 0)::numeric(18,2),
    0::numeric(18,2)
  );
$$;

CREATE OR REPLACE FUNCTION public.finance_recalculate_expense_coverage(p_expense_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_expense public.finance_expenses%rowtype;
  v_covered numeric(18,2);
  v_target numeric(18,2);
begin
  select *
  into v_expense
  from public.finance_expenses
  where id = p_expense_id
  for update;

  if not found then
    return;
  end if;

  select
    coalesce(sum(public.finance_allocation_expense_currency_amount(a)), 0)::numeric(18,2)
  into v_covered
  from public.finance_payment_made_expense_allocations a
  join public.finance_payments_made p
    on p.id = a.payment_made_id
  where a.expense_id = p_expense_id
    and p.status = 'confirmed'
    and coalesce(a.lifecycle_status, 'active') = 'active';

  v_target := coalesce(
    v_expense.final_amount,
    v_expense.approved_amount,
    v_expense.requested_amount,
    v_expense.amount,
    0
  )::numeric(18,2);

  update public.finance_expenses
  set
    coverage_status = case
      when v_covered <= 0 then 'not_covered'
      when v_covered < v_target then 'partially_covered'
      else 'covered'
    end,
    recipient_confirmation_status = case
      when v_covered <= 0 then 'not_paid_yet'
      when v_covered > 0 and recipient_confirmation_status in ('not_paid_yet', 'pending_confirmation')
        then 'pending_confirmation'
      else recipient_confirmation_status
    end,
    updated_at = now()
  where id = p_expense_id;
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
