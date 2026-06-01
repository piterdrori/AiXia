# AgentOps Stage 10E Fix Plan Report

## Purpose

Create readable issue summaries and Cursor fix prompts for approved guest finance access issues (`AIXIA-WORKFLOW-RWF-28`, `AIXIA-WORKFLOW-RWF-29`) before any route-guard or permission code changes.

## Files Created

| File | Description |
| --- | --- |
| `qa-agent/agentops/fix-plans/AIXIA-WORKFLOW-RWF-28_FIX_PLAN.md` | Issue summary + fix plan + Cursor prompt for master-data |
| `qa-agent/agentops/fix-plans/AIXIA-WORKFLOW-RWF-29_FIX_PLAN.md` | Issue summary + fix plan + Cursor prompt for reports |
| `qa-agent/agentops/fix-plans/GUEST_FINANCE_ACCESS_FIX_PLAN_SUMMARY.md` | Combined summary, fix order, approval checklist |
| `qa-agent/agentops/AGENTOPS_STAGE_10E_FIX_PLAN_REPORT.md` | This report |

## Files Modified

**None** (planning/report-only stage).

## Issues Covered

- `AIXIA-WORKFLOW-RWF-28` — Guest can reach `/finance/master-data`
- `AIXIA-WORKFLOW-RWF-29` — Guest can reach `/finance/reports`

Both imported to staging AgentOps backlog in Stage 10D (`approvedByPiter: true`, `approvalStage: "10D"`).

## Route / Guard Inspection Summary

| Finding | Detail |
| --- | --- |
| Route registration | `src/App.tsx` — both routes use `<ProtectedRoute><DashboardLayout>…</ProtectedRoute>` |
| Route guard | `ProtectedRoute` calls `canAccessRoute(role, location.pathname, effectivePermissions)`; on failure navigates to `/dashboard` |
| Permission map | `src/lib/permissions.ts` — `ROUTE_PERMISSIONS` requires `manageFinanceMasterData` (master-data) and `exportFinanceReports` (reports) |
| Guest defaults | All finance permissions `false` in `ROLE_PERMISSIONS.guest` |
| Nav visibility | `DashboardLayout` shows Finance link only when `effectivePermissions.accessFinance` |
| Page guards | Master-data: `AixiaAccessDeniedState` when no read access; **Reports: no page-level permission gate**; loads Supabase report data on mount |
| Stage 10 browser evidence | Guest `finalUrl` → `/dashboard` for both routes; QA status `loaded` (classifier / timing mismatch vs product expectation of access-denied) |

## Recommended Fix Strategy

1. **Primary:** Shared route-level protection (`ProtectedRoute` + `canAccessRoute` / `ROUTE_PERMISSIONS`) — fix together for RWF-28 and RWF-29.
2. **Secondary:** Defense-in-depth on `FinanceReportsPage` (and audit master-data data-fetch timing).
3. **Optional:** Clearer access-denied UX vs silent dashboard redirect (align with workflow-scope `access-denied` expectation).

Do **not** change RLS, schema, or authorized-role permission matrices without explicit approval.

## Ready For Piter Approval

**Yes** — fix plans and copy-paste Cursor prompts are ready. **No code fix** has been applied in Stage 10E.

## What Was Not Done

- No app fix
- No permission change
- No `workflow-scope.json` change
- No DB / migration / RLS change
- No production or main Supabase / main GitHub change
- No scheduler / Hermes / CodeGraph automation
- No browser QA rerun (report-only; validation used foundation + build)

## Validation (Stage 10E)

| Command | Result |
| --- | --- |
| `npm run qa:validate-foundation` | **PASS** (registry, markdown, cross-refs OK) |
| `npm run build` | **PASS** (exit 0; pre-existing AiXia guardrail warnings only) |

## Next Recommended Stage

1. **Stage 10F** — Piter approves checklist in `GUEST_FINANCE_ACCESS_FIX_PLAN_SUMMARY.md`; implement guest finance route fix on staging using Cursor prompts in per-issue fix plans (single PR recommended).
2. **Stage 10G** — Verify with `npm run qa:agentops-role-workflow-safe` and related smokes; mark `AIXIA-WORKFLOW-RWF-28` / `29` fixed in AgentOps if passed.

Held Stage 10 findings (18 needs-piter-decision, 8 scope-mismatch, RWF-1 staging setup) remain unchanged.
