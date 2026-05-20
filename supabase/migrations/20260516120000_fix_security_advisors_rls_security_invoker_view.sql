-- Applied via Supabase (project security advisors ERROR remediation).
-- Internal diagnostic tables: enable RLS with no policies so PostgREST anon/authenticated
-- cannot read/write; service_role continues to bypass RLS for triggers/backend jobs.
ALTER TABLE public.trigger_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_trigger_logs ENABLE ROW LEVEL SECURITY;

-- Employee identity view: use SECURITY INVOKER so caller RLS applies (advisor 0010).
ALTER VIEW public.finance_employee_identity_v SET (security_invoker = true);
