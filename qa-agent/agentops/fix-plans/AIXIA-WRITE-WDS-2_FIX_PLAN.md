# Issue Summary

## Issue Code

`AIXIA-WRITE-WDS-2`

## Title

Guest can access quotation create shell.

## Severity

Medium (no enabled Save Draft in Stage 11; route shell exposure on finance create URL).

## Category

Security/Permission

## Affected Route

`/finance/transactions/quotations/new`

## Affected Synthetic User

`qa+agentops-guest@aixia.local` (`guest` — profile role `guest`, no permission overrides).

## What Happened

During Stage 11 write/draft safe QA (`write-draft-safe-1779924187706`):

- Guest navigated directly to `/finance/transactions/quotations/new`.
- **Outcome:** `accessStatus: loaded`, `blocked: false`, `finalUrl` stayed on the create route.
- **Save Draft:** not enabled per QA (hidden or disabled).
- **Screenshot:** `qa-agent/reports/browser-qa/screenshots/write-draft-safe/guest-quotations-new-1779924216220.png`

Stage 10F added `isGuestFinanceRouteBlocked()` in `src/lib/permissions.ts` to deny **all** `/finance` and `/finance/*` paths for `role === "guest"`. Stage 11 still recorded this finding—either the guard did not deny in the test environment, redirect timing differed from master-data/reports, or guest reached the shell before redirect. Stage 11D inspection confirms the helper exists and should cover `/finance/transactions/quotations/new`.

Stage 11C imported this finding as `AIXIA-WRITE-WDS-2`.

## What Should Happen

Guest users must **not** access any finance route, including quotation create. They should be blocked at `canAccessRoute` (redirect to `/dashboard` or explicit access-denied) **before** finance create UI renders.

## Why It Matters

Guest is the lowest-trust role. Any finance create shell violates tenant boundaries and repeats the class of issues fixed for `/finance/master-data` and `/finance/reports` (RWF-28/29). Deep links to `/new` must not bypass guest finance policy.

## Evidence

| Source | Detail |
| --- | --- |
| Stage 11 report | `qa-agent/agentops/AGENTOPS_STAGE_11_SYNTHETIC_WRITE_DRAFT_QA_REPORT.md` |
| Safe QA JSON | `qa-agent/reports/browser-qa/write-draft-safe-report.json` — finding `WDS-2` |
| Stage 11C import | `qa-agent/agentops/AGENTOPS_STAGE_11C_WRITE_DRAFT_APPROVED_IMPORT_REPORT.md` |
| Stage 10F guest finance fix | `qa-agent/agentops/AGENTOPS_STAGE_10F_GUEST_FINANCE_FIX_REPORT.md` — `isGuestFinanceRouteBlocked` |
| Scope expectation | `write-workflow-scope.json` — guest expected **blocked** on `finance-quotations-new` |
| Screenshot | `qa-agent/reports/browser-qa/screenshots/write-draft-safe/guest-quotations-new-1779924216220.png` |

## Risk

Guest quotation create shell is a **role-boundary failure**. If combined with future Save Draft or API permissiveness, impact escalates to unauthorized draft records.

---

# Fix Plan

## Fix Goal

Ensure guest users cannot access `/finance/transactions/quotations/new` (consistent with all other `/finance/*` denial).

## Preferred Fix Strategy

1. **Verify `isGuestFinanceRouteBlocked`** in `canAccessRoute()` applies to `/finance/transactions/quotations/new` (prefix `/finance/` — should return `false` before permission lookup).
2. **If guest still reaches shell:** inspect `ProtectedRoute` redirect timing; align with Stage 10F/10G patterns (settle URL in QA, no finance RPCs before deny).
3. **Defense-in-depth on new page:** early return with `AixiaAccessDeniedState` when role is `guest` or `!canCreate` (same shared `pageAccess` as quotations list)—only if route guard race is confirmed.
4. **Do not** grant guest any finance permissions in profile overrides.

Fix together with **WDS-1** in one staging PR (shared route + new page guards).

## Files To Inspect Before Fix

| File | Why |
| --- | --- |
| `src/lib/permissions.ts` | `isGuestFinanceRouteBlocked`, `canAccessRoute`, guest `ROLE_PERMISSIONS` (`createInvoices: false`, `accessFinance: false`) |
| `src/App.tsx` | `ProtectedRoute` on quotations/new |
| `src/app/finance/transactions/quotations/new/page.tsx` | No guest/pageAccess check today |
| `src/app/finance/transactions/quotations/page.tsx` | Reference for `pageAccess` pattern |
| `qa-agent/agentops/AGENTOPS_STAGE_10F_GUEST_FINANCE_FIX_REPORT.md` | Prior guest finance guard work |
| Staging `profiles` (read-only) | Confirm guest `role = guest`, `permissionOverrides` null |

## Likely Fix Location

| Option | Assessment |
| --- | --- |
| **1. `isGuestFinanceRouteBlocked` in `canAccessRoute`** | **Primary** — should already block; verify execution order and role from auth context. |
| **2. `ProtectedRoute` redirect** | Ensure guest never stabilizes on finance URL (same issue class as RWF-28 QA misclassification). |
| **3. Page-level deny on new page** | Secondary if mount flash or deep-link race persists. |
| **4. Separate guest-only route entry** | **Avoid** — use shared guest finance block, not per-route exceptions. |

## Inspection Notes (Stage 11D — read-only)

- Guest catalog: `profileRole: guest`, `permissionOverrides: null`, finance module blocked in synthetic catalog.
- `ROUTE_PERMISSIONS` for `/new` requires `createInvoices` (guest false) **and** guest finance block should short-circuit.
- Quotations **new** page has no `AixiaAccessDeniedState` and no role check.
- Stage 11 QA `classifyWriteRoute` marks `loaded` when final pathname equals requested path—guest remained on `/finance/transactions/quotations/new` in report JSON.

## Do Not Change

- Do not change RLS/schema.
- Do not broaden guest permissions.
- Do not change quotation business logic.
- Do not weaken finance-admin/owner access.
- Do not modify unrelated routes unless audit finds guest can reach other `/finance/*/new` shells with same gap.
- Do not import or fix WDS-3 in this change set.
- Do not touch production/main.

## Validation Plan

After fix:

```bash
npm run build
npm run qa:agentops-write-draft-safe
npm run qa:agentops-role-workflow-safe
npm run qa:agentops-synthetic-users-smoke
npm run qa:validate-foundation
```

**Expected for guest:**

- `/finance/transactions/quotations/new` → `redirected` or `access-denied`, **not** `loaded` on finance create URL.
- No finance create shell screenshot with guest session.
- RWF-28/29-style guest finance routes remain blocked.

---

# Cursor Fix Prompt (copy when Piter approves Stage 11E)

```markdown
TASK: Fix AIXIA-WRITE-WDS-2 — block guest from quotation create shell (staging only).

CONTEXT:
- AgentOps backlog: AIXIA-WRITE-WDS-2 (imported Stage 11C).
- Route: /finance/transactions/quotations/new
- Synthetic user: guest (qa+agentops-guest@aixia.local); no permission overrides.
- Stage 11 QA: guest reached quotation new shell; Save Draft not enabled.
- Stage 10F added isGuestFinanceRouteBlocked for all /finance/* — verify it works for quotations/new.
- Fix plan: qa-agent/agentops/fix-plans/AIXIA-WRITE-WDS-2_FIX_PLAN.md
- Combined summary: qa-agent/agentops/fix-plans/QUOTATION_CREATE_SHELL_PERMISSION_FIX_PLAN_SUMMARY.md

CONSTRAINTS (mandatory):
- Staging only; no production/main.
- Fix guest (and unauthorized) access to quotation create shell only.
- Prefer existing isGuestFinanceRouteBlocked + canAccessRoute + ProtectedRoute; do not add guest-only hacks on unrelated pages.
- Add shared pageAccess defense on quotations/new if route guard race confirmed.
- Do NOT change RLS, schema, migrations, quotation logic, or AgentOps.
- Do NOT modify workflow-scope.json.
- Implement together with WDS-1 (finance-viewer) in one PR when possible.
- Preserve finance-admin/owner create access.

STEPS:
1. Read src/lib/permissions.ts (isGuestFinanceRouteBlocked, canAccessRoute, ROUTE_PERMISSIONS for quotations/new).
2. Read ProtectedRoute in src/App.tsx and FinanceNewQuotationPage.
3. Confirm guest canAccessRoute("/finance/transactions/quotations/new") is false; fix if not.
4. Add page-level canCreate/guest deny on new page if needed (match quotations list PAGE_ACCESS_CONFIG).
5. npm run build && npm run qa:agentops-write-draft-safe && npm run qa:agentops-role-workflow-safe

RETURN:
- Why guest reached shell (guard bug, profile override, or QA timing).
- Files changed.
- QA outcomes: guest blocked; finance-admin still loads; finance-viewer blocked (WDS-1).
- Confirm no RLS/schema changes.
```
