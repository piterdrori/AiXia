# Guest Finance Access — Combined Fix Plan Summary

**Stage:** 10E (planning only)  
**Environment:** Staging only (`ydppcpbxrvvardeslzrk`, local `http://localhost:5173`)  
**Status:** Awaiting Piter approval before implementation (Stage 10F)

## Issues covered

| Issue code | Route | Backlog |
| --- | --- | --- |
| `AIXIA-WORKFLOW-RWF-28` | `/finance/master-data` | Staging AgentOps backlog (imported Stage 10D) |
| `AIXIA-WORKFLOW-RWF-29` | `/finance/reports` | Staging AgentOps backlog (imported Stage 10D) |

**Synthetic user:** `qa+agentops-guest@aixia.local` (`guest`)

**Per-issue plans:**

- `qa-agent/agentops/fix-plans/AIXIA-WORKFLOW-RWF-28_FIX_PLAN.md`
- `qa-agent/agentops/fix-plans/AIXIA-WORKFLOW-RWF-29_FIX_PLAN.md`

## Shared root concern

Both routes are registered in `src/App.tsx` behind the same **`ProtectedRoute`** wrapper, which enforces access via **`canAccessRoute(role, pathname, getEffectivePermissions(...))`** in `src/lib/permissions.ts`.

| Route | `ROUTE_PERMISSIONS` requirement |
| --- | --- |
| `/finance/master-data` | `manageFinanceMasterData` |
| `/finance/reports` | `exportFinanceReports` |

Guest role defaults set both permissions to **false**. Stage 10 browser QA showed **final URLs on `/dashboard`** for both routes, which indicates the route guard likely **does** deny access but redirects instead of showing explicit access-denied—and QA may classify a brief finance navigation as “loaded” before redirect.

**Gap:** `FinanceReportsPage` does not use `AixiaAccessDeniedState` or `pageAccess` before loading report data; master-data has page-level denial but can still show finance shell. Fixing both together avoids inconsistent guest behavior.

## Recommended fix order

1. **Inspect staging guest profile** in Supabase (read-only): confirm `role = guest`, no finance permission overrides.
2. **Route guard (shared):** Verify/fix `canAccessRoute` + `ProtectedRoute` behavior for all `/finance/*` paths guests must not use (at minimum master-data + reports + child report routes).
3. **Optional UX:** Use consistent access-denied handling instead of silent dashboard redirect for permission failures (product decision).
4. **Defense in depth:** Add reports page permission gate; audit master-data fetch timing if flash content is confirmed.
5. **Verify** with browser QA; close backlog items in Stage 10G if passed.

## Fix together or separately?

**Recommended: fix together in one staging change set.**

- Same root mechanism (`ProtectedRoute` + `ROUTE_PERMISSIONS` + guest role).
- Same validation commands.
- Reports page needs extra in-page guard; master-data may need fetch-order hardening—still one PR is easier to review.

Separate PRs only if implementation discovers unrelated root causes (unlikely).

## Risk

| Risk | Mitigation |
| --- | --- |
| Breaking finance access for authorized roles | Test owner, finance-admin, finance-viewer after change; do not broaden guest permissions |
| Silent redirect hides issues in QA | Re-run `qa:agentops-role-workflow-safe`; guest should be `access-denied` or `redirected`, not `loaded` on finance URL |
| Reports data leak if route guard races | Page-level gate on `FinanceReportsPage` |
| Production drift | Staging-only until Piter promotes |

## Validation command set

```bash
npm run build
npm run qa:agentops-role-workflow-safe
npm run qa:agentops-synthetic-users-smoke
npm run qa:validate-foundation
```

Prerequisite: Vite dev server on `http://localhost:5173`, synthetic QA credentials in env (see `qa-agent/browser-qa/README.md`).

## Piter approval checklist

- [ ] Approve fixing guest finance route access (RWF-28 + RWF-29)
- [ ] Fix both issues together (same guard root cause)
- [ ] Preserve authorized finance access (owner, finance-admin, finance-viewer, etc.)
- [ ] No RLS/schema changes
- [ ] Staging only (no production/main Supabase/GitHub)
- [ ] Run browser verification after fix (Stage 10G)

## Next stage

**Stage 10F** — Piter approves; run Cursor fix prompt from per-issue fix plans.  
**Stage 10G** — Re-run role workflow QA; mark AgentOps findings fixed if validation passes.
