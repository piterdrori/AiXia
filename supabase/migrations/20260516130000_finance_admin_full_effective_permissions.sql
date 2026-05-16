-- Finance: org admins always get the finance_admin template baseline (all module caps)
-- merged on top of profiles.permissions, then finance_user_permission_overrides.
-- Non-admin users keep template + profile + overrides with approval keys stripped (unchanged).

UPDATE public.finance_permission_templates
SET permissions = permissions || '{
  "manageClients": true,
  "manageVendors": true,
  "createReimbursements": true,
  "viewOwnExpenses": true,
  "createExpenses": true,
  "editOwnDraftExpenses": true,
  "submitExpenses": true,
  "accessLedger": true,
  "viewLedger": true,
  "viewChartOfAccounts": true,
  "viewAccountingPeriods": true,
  "viewJournalEntries": true,
  "manageChartOfAccounts": true,
  "manageAccountingPeriods": true,
  "managePostingRules": true,
  "createManualJournalEntries": true,
  "postJournalEntries": true,
  "reverseJournalEntries": true,
  "voidJournalEntries": true,
  "viewJournalDrilldown": true,
  "exportLedgerReports": true,
  "exportTrialBalance": true,
  "exportAccountingReports": true
}'::jsonb
WHERE template_key = 'finance_admin'
  AND is_active = true;

CREATE OR REPLACE FUNCTION public.finance_get_effective_permissions(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    case
      when p.role = 'admin' then
        coalesce(p.permissions, '{}'::jsonb)
        || coalesce(
          (
            select ft.permissions
            from public.finance_permission_templates ft
            where ft.template_key = 'finance_admin'
              and ft.is_active = true
            order by ft.id
            limit 1
          ),
          '{}'::jsonb
        )
        || coalesce(o.override_permissions, '{}'::jsonb)
      else
        (
          coalesce(t.permissions, '{}'::jsonb)
          || coalesce(p.permissions, '{}'::jsonb)
          || coalesce(o.override_permissions, '{}'::jsonb)
        )
        - 'manageUsers'
        - 'accessApprovals'
        - 'viewApprovalQueue'
        - 'actOnFinanceApprovals'
    end
  from public.profiles p
  left join public.finance_user_permission_templates upt
    on upt.user_id = p.user_id
  left join public.finance_permission_templates t
    on t.id = upt.template_id
    and t.is_active = true
  left join lateral (
    select jsonb_object_agg(permission_key, to_jsonb(permission_value)) as override_permissions
    from public.finance_user_permission_overrides
    where user_id = p.user_id
  ) o on true
  where p.user_id = target_user_id;
$function$;
