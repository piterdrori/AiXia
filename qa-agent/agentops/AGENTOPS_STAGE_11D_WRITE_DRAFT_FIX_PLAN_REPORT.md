# AgentOps Stage 11D Write/Draft Fix Plan Report

## Purpose

Create Piter-readable issue summaries and detailed Cursor fix prompts for approved Stage 11C backlog items **AIXIA-WRITE-WDS-1** and **AIXIA-WRITE-WDS-2** (quotation create-shell permission). Planning only—no code, DB, or permission changes.

## Files Created

| File | Purpose |
| --- | --- |
| `qa-agent/agentops/fix-plans/AIXIA-WRITE-WDS-1_FIX_PLAN.md` | Issue summary + fix plan + Cursor prompt (finance-viewer) |
| `qa-agent/agentops/fix-plans/AIXIA-WRITE-WDS-2_FIX_PLAN.md` | Issue summary + fix plan + Cursor prompt (guest) |
| `qa-agent/agentops/fix-plans/QUOTATION_CREATE_SHELL_PERMISSION_FIX_PLAN_SUMMARY.md` | Combined summary, approval checklist, validation set |
| `qa-agent/agentops/AGENTOPS_STAGE_11D_WRITE_DRAFT_FIX_PLAN_REPORT.md` | This report |

## Files Modified

**None** (no app, QA config, or DB changes).

## Issues Covered

| Issue | User | Finding |
| --- | --- | --- |
| **AIXIA-WRITE-WDS-1** | finance-viewer | Can open `/finance/transactions/quotations/new` create shell; list create hidden; Save Draft not enabled in Stage 11 |
| **AIXIA-WRITE-WDS-2** | guest | Can open same create shell; Save Draft not enabled in Stage 11 |

## Held Issue

**AIXIA-WRITE-WDS-3** — finance-admin “New Quotation” selector/testability on list page. **Not** included in fix plans except as a held note in the combined summary. Not imported to AgentOps backlog (Stage 11C).

## Recommended Fix Strategy

1. **Route-level:** Enforce existing `ROUTE_PERMISSIONS` — `/finance/transactions/quotations/new` requires `createInvoices`; guest denied via `isGuestFinanceRouteBlocked()` for all `/finance/*`.
2. **Verify staging profiles** have no erroneous `createInvoices` overrides for viewer/guest.
3. **Page-level (defense-in-depth):** Add `fetchFinanceEffectivePermissions` + `resolveFinancePagePermissionState` to `quotations/new/page.tsx` (same config as list); `AixiaAccessDeniedState` when `!canCreate`; gate Save Draft on `canCreate`.
4. **Fix WDS-1 and WDS-2 together** in one Stage 11E change set.

## Inspection Highlights (read-only)

| Area | Finding |
| --- | --- |
| `src/App.tsx` | `quotations/new` uses `ProtectedRoute` only |
| `src/lib/permissions.ts` | List `viewInvoices`, new `createInvoices`; guest finance block present |
| `quotations/page.tsx` | `PAGE_ACCESS_CONFIG` + `permissionState.canCreate` gates create UI |
| `quotations/new/page.tsx` | No pageAccess; Save Draft `disabled={isSaving}` only |
| Stage 11 QA | `write-draft-safe-1779924187706` — both users `loaded` on `/new` |

## Ready For Piter Approval

**Yes** — fix plans and copy-paste Cursor prompts are complete. Implementation blocked until checklist in `QUOTATION_CREATE_SHELL_PERMISSION_FIX_PLAN_SUMMARY.md` is approved.

## What Was Not Done

- No app fix or permission change
- No workflow-scope.json change
- No DB import/apply or backlog status change
- No production/main Supabase or GitHub
- No scheduler / Hermes / CodeGraph automation
- No write/destructive browser QA re-run (not required for report-only stage)
- No WDS-3 investigation or import

## Command Results

| Command | Result |
| --- | --- |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** (existing guardrail warnings only) |

## Final Status

**PASS** — Stage 11D deliverables complete; ready for Piter review and Stage 11E approval.

## Next Recommended Stage

1. **Piter:** Review combined summary checklist and approve fix approach.
2. **Stage 11E** — Implement quotation create-shell permission fix (staging only) using Cursor prompts in WDS-1/WDS-2 fix plan files.
3. **Stage 11F** — Re-run write-draft + role-workflow browser QA; mark WDS-1/WDS-2 verified fixed in AgentOps if passed.
4. **Separate:** Investigate **WDS-3** (selector/UX) before any import or fix.

### Suggested next prompt for Cursor (after Piter approval)

> Implement Stage 11E: apply the approved quotation create-shell permission fix for AIXIA-WRITE-WDS-1 and AIXIA-WRITE-WDS-2 per `qa-agent/agentops/fix-plans/QUOTATION_CREATE_SHELL_PERMISSION_FIX_PLAN_SUMMARY.md`. Staging only. Use shared route + pageAccess patterns. Do not change RLS/schema or fix WDS-3. Validate with build and `npm run qa:agentops-write-draft-safe`.
