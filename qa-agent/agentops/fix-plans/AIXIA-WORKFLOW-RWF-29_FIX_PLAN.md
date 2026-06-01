# Issue Summary

## Issue Code

`AIXIA-WORKFLOW-RWF-29`

## Title

Guest can access finance route: `/finance/reports`

## Severity

High

## Category

Security/Permission

## Affected Route

`/finance/reports`

## Affected Synthetic User

`qa+agentops-guest@aixia.local` (`guest` / profile role `guest`)

## What Happened

During Stage 10 role workflow QA, the guest user navigated to `http://localhost:5173/finance/reports`. The run classified the route as **loaded** with visible heading **"Welcome,"** (dashboard), while workflow-scope expected **access-denied**.

Stage 10 evidence:

- **Requested URL:** `/finance/reports`
- **Final URL:** `http://localhost:5173/dashboard`
- **Screenshot:** `qa-agent/reports/browser-qa/screenshots/role-workflow-safe/guest-finance_reports-1779879762569.png`

`ProtectedRoute` should deny guest via `canAccessRoute` because `ROUTE_PERMISSIONS` maps `/finance/reports` to permission `exportFinanceReports` (guest default: `false`). The issue is still valid because:

1. QA and product policy treat “redirect to dashboard” as insufficient vs explicit access denial for blocked finance modules.
2. **`FinanceReportsPage` has no page-level permission gate** (unlike master-data). If route guard ever fails or is slow, the page loads Supabase report overview data without `AixiaAccessDeniedState`.
3. QA classifier may mark “loaded” when `domcontentloaded` fires on the finance URL before React redirect completes.

## What Should Happen

Guest users must not reach finance reports UI or report data previews. Block or deny before protected content renders. Authorized users with `exportFinanceReports` (or cascaded finance read rights per product rules) keep access.

## Why It Matters

Finance reports expose aggregated financial metrics (revenue, expenses, payroll, AR/AP, trial balance previews). Guests must not see this layer.

## Evidence

| Source | Detail |
| --- | --- |
| Stage 10 role workflow report | `qa-agent/agentops/AGENTOPS_STAGE_10_ROLE_WORKFLOW_QA_REPORT.md` |
| Safe workflow JSON | `qa-agent/reports/browser-qa/role-workflow-safe-report.json` — finding `RWF-29` |
| Findings review | `qa-agent/reports/browser-qa/role-workflow-findings-review.md` |
| Piter decision table | `qa-agent/reports/browser-qa/role-workflow-piter-decision-table.md` — RWF-29 **real-permission-issue** |
| Stage 10D import | `qa-agent/agentops/AGENTOPS_STAGE_10D_APPROVED_ROLE_WORKFLOW_IMPORT_REPORT.md` |
| Screenshot | `qa-agent/reports/browser-qa/screenshots/role-workflow-safe/guest-finance_reports-1779879762569.png` |

## Risk

Guest finance access creates a role-boundary problem. Reports page lacks in-page denial—higher impact if route guard regresses.

---

# Fix Plan

## Fix Goal

Ensure guest users cannot access `/finance/reports` or load finance report data.

## Preferred Fix Strategy

1. **Route-level (primary):** Same `ProtectedRoute` + `canAccessRoute` + `ROUTE_PERMISSIONS` (`exportFinanceReports`) as other finance routes.
2. **Defense in depth (recommended for this route):** Add finance page access check on `FinanceReportsPage` using existing `src/lib/finance/pageAccess.ts` patterns (mirror master-data / other finance hubs)—**only** after confirming shared route fix; do not duplicate logic inconsistently.
3. **Fix together with RWF-28** in one staging PR: same `ProtectedRoute` / `permissions.ts` / optional denial UX.

Do not create a reports-only hack unrelated to shared guards.

## Files To Inspect Before Fix

| File | Why |
| --- | --- |
| `src/App.tsx` | `/finance/reports` route + `ProtectedRoute` |
| `src/lib/permissions.ts` | `"/finance/reports": { permission: "exportFinanceReports" }`; guest defaults; `canAccessRoute` |
| `src/app/finance/reports/page.tsx` | **No** `AixiaAccessDeniedState` today; loads report data in `loadReportsData` |
| `src/app/finance/reports/[reportKey]/page.tsx` | Child report runner routes |
| `src/lib/finance/pageAccess.ts` | Shared finance permission helpers |
| `src/components/layout/DashboardLayout.tsx` | Finance nav visibility |

## Likely Fix Location

1. **Route-level guard** — `ProtectedRoute` + `canAccessRoute` (same as RWF-28).
2. **Shared finance access** — Optional consistent “access denied” route/component for permission failures.
3. **Page-level guard** — `FinanceReportsPage`: gate `loadReportsData` and render `AixiaAccessDeniedState` when user lacks `exportFinanceReports` / finance read (if route-level race confirmed).

## Current Route / Guard Structure (inspection)

| Layer | Behavior for `/finance/reports` |
| --- | --- |
| `App.tsx` | `<Route path="/finance/reports" element={<ProtectedRoute>…<FinanceReportsPage /></ProtectedRoute>} />` |
| `ProtectedRoute` | `canAccessRoute`; failure → `<Navigate to="/dashboard" />` |
| `ROUTE_PERMISSIONS` | `exportFinanceReports` required |
| Guest role | `exportFinanceReports: false` |
| `FinanceReportsPage` | Fetches overview/trial balance/AR/AP/payroll previews via Supabase **without** upfront permission check |
| Sub-routes | e.g. `/finance/reports/trial-balance` — separate `ROUTE_PERMISSIONS` entries; fix must cover parent and children if guest can deep-link |

## Do Not Change

- Do not change RLS.
- Do not change Supabase schema.
- Do not change finance report calculation logic.
- Do not change authorized users’ access.
- Do not redesign reports UI.
- Do not modify unrelated routes or AgentOps (except post-verify close in 10G).
- Do not change production/main or `workflow-scope.json` without separate approval.

## Validation Plan

After fix (Stage 10F):

```bash
npm run build
npm run qa:agentops-role-workflow-safe
npm run qa:agentops-synthetic-users-smoke
npm run qa:validate-foundation
```

**Expected validation:**

- Guest: `/finance/reports` → denied/redirected; no report metrics visible.
- Finance-admin / owner / users with report export rights: still work.
- Spot-check `/finance/reports/trial-balance` for guest denial if deep-links exist.
- AgentOps owner isolation unchanged.

---

# Cursor Fix Prompt (copy when Piter approves Stage 10F)

```text
STAGING ONLY — AiXia guest finance route access fix (AIXIA-WORKFLOW-RWF-29)

Context:
- Backlog issue AIXIA-WORKFLOW-RWF-29: guest must not access /finance/reports.
- Fix plan: qa-agent/agentops/fix-plans/AIXIA-WORKFLOW-RWF-29_FIX_PLAN.md
- Fix together with RWF-28 (same guard system): AIXIA-WORKFLOW-RWF-28_FIX_PLAN.md

Rules:
- Staging only. No production/main Supabase/GitHub.
- Fix guest/unauthorized access to /finance/reports (and related report child routes if guest can reach them).
- Do NOT change RLS, schema, migrations, or report business logic.
- Do NOT redesign UI.
- Do NOT weaken authorized finance/report users.
- Use ProtectedRoute + canAccessRoute + ROUTE_PERMISSIONS first.
- Add page-level finance access gate on FinanceReportsPage only as defense-in-depth using src/lib/finance/pageAccess.ts patterns (not a one-off permission string scattered in the page).

Steps:
1. Inspect src/App.tsx, src/lib/permissions.ts, src/app/finance/reports/page.tsx, src/app/finance/reports/[reportKey]/page.tsx.
2. Confirm guest lacks exportFinanceReports and canAccessRoute("/finance/reports") is false.
3. Implement route-level fix (and pair with RWF-28). If reports page can mount before redirect, gate data fetch and show AixiaAccessDeniedState consistent with other finance pages.
4. Run:
   npm run build
   npm run qa:agentops-role-workflow-safe
   npm run qa:agentops-synthetic-users-smoke
   npm run qa:validate-foundation

Deliverables:
- Files changed + rationale.
- Verification results.
- Guest blocked on /finance/reports; authorized users OK.
- No RLS/schema/workflow-scope/production changes.
```
