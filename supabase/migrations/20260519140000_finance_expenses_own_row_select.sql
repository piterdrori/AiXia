-- Module 1 own-expenses defense in depth: authenticated users can SELECT their own
-- finance_expenses rows; finance users with team expense permissions retain broader access.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'finance_expenses'
      AND policyname = 'finance_expenses_select_own_rows'
  ) THEN
    CREATE POLICY finance_expenses_select_own_rows
      ON public.finance_expenses
      FOR SELECT
      TO authenticated
      USING (
        submitter_user_id = auth.uid()
        OR created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.finance_employee_refs fer
          WHERE fer.id = finance_expenses.employee_ref_id
            AND fer.user_id = auth.uid()
            AND finance_expenses.expense_made_by_type = 'employee'
        )
        OR COALESCE(
          (public.finance_get_effective_permissions(auth.uid()) ->> 'viewTeamExpenses')::boolean,
          false
        )
        OR COALESCE(
          (public.finance_get_effective_permissions(auth.uid()) ->> 'approveExpenses')::boolean,
          false
        )
      );
  END IF;
END
$$;
