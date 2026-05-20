-- Stub finance report RPCs (safe defaults, caller RLS via SECURITY INVOKER).

CREATE OR REPLACE FUNCTION public.finance_reports_overview()
RETURNS TABLE (
  revenue_this_period numeric,
  expenses_this_period numeric,
  payroll_this_period numeric,
  ar_open numeric,
  ap_open numeric,
  payments_in_this_period numeric,
  payments_out_this_period numeric,
  cash_movement_this_period numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    0::numeric AS revenue_this_period,
    0::numeric AS expenses_this_period,
    0::numeric AS payroll_this_period,
    0::numeric AS ar_open,
    0::numeric AS ap_open,
    0::numeric AS payments_in_this_period,
    0::numeric AS payments_out_this_period,
    0::numeric AS cash_movement_this_period;
$$;

CREATE OR REPLACE FUNCTION public.finance_trial_balance()
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  total_debit numeric,
  total_credit numeric,
  balance numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    NULL::uuid AS account_id,
    NULL::text AS account_code,
    NULL::text AS account_name,
    NULL::text AS account_type,
    NULL::numeric AS total_debit,
    NULL::numeric AS total_credit,
    NULL::numeric AS balance
  WHERE false;
$$;

CREATE OR REPLACE FUNCTION public.finance_ar_aging()
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  balance_due numeric,
  aging_bucket text,
  days_overdue integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    NULL::uuid AS invoice_id,
    NULL::text AS invoice_number,
    NULL::numeric AS balance_due,
    NULL::text AS aging_bucket,
    NULL::integer AS days_overdue
  WHERE false;
$$;

CREATE OR REPLACE FUNCTION public.finance_ap_aging()
RETURNS TABLE (
  bill_id uuid,
  bill_number text,
  balance_due numeric,
  aging_bucket text,
  days_overdue integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    NULL::uuid AS bill_id,
    NULL::text AS bill_number,
    NULL::numeric AS balance_due,
    NULL::text AS aging_bucket,
    NULL::integer AS days_overdue
  WHERE false;
$$;

GRANT EXECUTE ON FUNCTION public.finance_reports_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_trial_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_ar_aging() TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_ap_aging() TO authenticated;
