# Quotation Create Shell — Combined Fix Plan Summary

**Stage:** 11D (planning only)  
**Environment:** Staging only (`ydppcpbxrvvardeslzrk`, local `http://127.0.0.1:5173`)  
**Status:** Awaiting Piter approval before implementation (Stage 11E)

## Issues covered

| Issue code | User | Route | Backlog |
| --- | --- | --- | --- |
| `AIXIA-WRITE-WDS-1` | finance-viewer | `/finance/transactions/quotations/new` | Staging AgentOps backlog (imported Stage 11C) |
| `AIXIA-WRITE-WDS-2` | guest | `/finance/transactions/quotations/new` | Staging AgentOps backlog (imported Stage 11C) |

**Per-issue plans:**

- `qa-agent/agentops/fix-plans/AIXIA-WRITE-WDS-1_FIX_PLAN.md`
- `qa-agent/agentops/fix-plans/AIXIA-WRITE-WDS-2_FIX_PLAN.md`

## Held issue (not in fix scope)

| Issue code | Summary | Action |
| --- | --- | --- |
| `AIXIA-WRITE-WDS-3` | finance-admin “New Quotation” not matched on list (selector/UX/testability) | **Hold** — investigate separately; do not import or fix in 11E |

## Shared root concern

Both WDS-1 and WDS-2 share the **same route and page surface**:

| Layer | Current behavior (inspection) |
| --- | --- |
| **Route registration** | `src/App.tsx` — `/finance/transactions/quotations/new` behind `ProtectedRoute` only |
| **Route permission map** | `ROUTE_PERMISSIONS`: list → `viewInvoices`; **new → `createInvoices`** |
| **Guest policy** | `isGuestFinanceRouteBlocked()` should deny all `/finance/*` for `guest` (Stage 10F) |
| **Finance-viewer** | Synthetic overrides: read finance + `viewInvoices`; **no** `createInvoices` / `createFinanceRecords` |
| **List page** | `FinanceQuotationsPage` uses `pageAccess` — create button hidden when `!canCreate` |
| **New page** | `FinanceNewQuotationPage` — **no** `pageAccess` / `AixiaAccessDeniedState`; Save Draft only gated by `isSaving` |
| **Stage 11 QA** | Both users **loaded** create shell; Save Draft not enabled; list create hidden for viewer |

**Gap:** Deep link to `/new` bypasses list-level create visibility. Route guard *should* block guest and viewer (`createInvoices` + guest finance block) but Stage 11 observed stable `loaded` on the create URL—fix must verify `canAccessRoute` and add page-level `canCreate` defense.

**Related prior work:** Guest finance hub denial (RWF-28/29, Stage 10F) — quotations/new must follow the same policy as master-data/reports.

## Recommended fix order

1. **Read-only staging check:** Guest and finance-viewer profiles — no `createInvoices` / finance write overrides in DB.
2. **Route guard:** Confirm `canAccessRoute` returns `false` for guest (finance block) and finance-viewer (`createInvoices`) on `/finance/transactions/quotations/new`; fix logic or auth role resolution if not.
3. **Page defense-in-depth:** Add `PAGE_ACCESS_CONFIG` (same as quotations list) to `quotations/new/page.tsx`; deny before data load; gate Save Draft on `canCreate`.
4. **Optional audit:** Other receivables `/new` routes (`invoices/new`, `proforma-invoices/new`, etc.) use same `createInvoices` map—spot-check only if regression scope approved (out of WDS-1/2 unless Piter expands).
5. **Verify** with write-draft + role-workflow QA; close backlog in Stage 11F if passed.

## Fix together or separately?

**Recommended: fix WDS-1 and WDS-2 together in one staging change set.**

- Same route, same page component, same `PAGE_ACCESS_CONFIG` pattern.
- Same validation commands.
- Guest block and viewer `createInvoices` denial are complementary, not conflicting.

Separate changes only if investigation shows unrelated root causes (unlikely).

## Risk

| Risk | Mitigation |
| --- | --- |
| Breaking finance-admin/owner create | Test finance-admin + agentops-owner on `/new` after change; admin role retains full access |
| Silent `/dashboard` redirect hides QA signal | Re-run `qa:agentops-write-draft-safe`; expect `redirected`/`access-denied`, not `loaded` |
| Save Draft enabled for unauthorized users later | Gate footer on `canCreate`; keep route guard |
| Production drift | Staging-only until Piter promotes |
| Scope creep to WDS-3 | Exclude selector/test fixes from 11E |

## Validation command set

```bash
npm run build
npm run qa:agentops-write-draft-safe
npm run qa:agentops-role-workflow-safe
npm run qa:agentops-synthetic-users-smoke
npm run qa:validate-foundation
```

**Dev server:** `http://127.0.0.1:5173` required for browser QA.

**Expected outcomes:**

| User | `/finance/transactions/quotations/new` |
| --- | --- |
| guest | Blocked |
| finance-viewer | Blocked |
| finance-admin | Loaded; create workflow unchanged |
| agentops-owner | Loaded |

## Piter approval checklist

- [ ] Approve blocking **guest** from quotation create shell
- [ ] Approve blocking **finance-viewer** from quotation create shell (read-only viewer; no draft create unless explicitly changed)
- [ ] Preserve **finance-admin / owner** quotation create access
- [ ] No RLS/schema changes in this fix
- [ ] Staging only until verified
- [ ] Run **write-draft QA** after fix (`npm run qa:agentops-write-draft-safe`)
- [ ] **WDS-3** remains held (no import/fix in 11E)

When all boxes are checked, proceed to **Stage 11E** using the Cursor prompts in the per-issue fix plan files.
