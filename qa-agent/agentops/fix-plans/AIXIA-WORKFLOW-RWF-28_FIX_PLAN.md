# Issue Summary

## Issue Code

`AIXIA-WORKFLOW-RWF-28`

## Title

Guest can access finance route: `/finance/master-data`

## Severity

High

## Category

Security/Permission

## Affected Route

`/finance/master-data`

## Affected Synthetic User

`qa+agentops-guest@aixia.local` (`guest` / profile role `guest`)

## What Happened

During Stage 10 role workflow QA (`npm run qa:agentops-role-workflow-safe`), the guest user navigated to `http://localhost:5173/finance/master-data`. The run classified the route as **loaded** (expected **access-denied**). Stage 10 evidence shows:

- **Requested URL:** `/finance/master-data`
- **Final URL after navigation:** `http://localhost:5173/dashboard` (redirect away from finance)
- **Screenshot:** `qa-agent/reports/browser-qa/screenshots/role-workflow-safe/guest-finance_master-data-1779879733436.png`

The app **does** register this route behind `ProtectedRoute`, which calls `canAccessRoute()` and redirects unauthorized users to `/dashboard`. Guest role defaults have `manageFinanceMasterData: false`, so route access should be denied. The finding remains valid because:

1. Workflow policy expects an explicit **access-denied** outcome, not a silent dashboard redirect that QA can misclassify as “loaded.”
2. There may be a brief finance shell render before React redirect completes (`domcontentloaded` on the finance URL before `Navigate` runs).
3. The master-data page still mounts `FinancePage` chrome and only shows `AixiaAccessDeniedState` for inner content when permissions fail—defense-in-depth is page-level, not route-first for all users.

## What Should Happen

Guest users must not reach protected finance master-data UI. They should be blocked at the route guard (redirect or dedicated access-denied) **before** finance navigation chrome or master-data content is visible. Authorized finance users (owner, finance-admin, finance-viewer with rights, etc.) must retain access.

## Why It Matters

Guest users must not see finance areas, master data, reports, or finance navigation/content. Even a redirect to dashboard can leak that finance exists and may flash protected layout during navigation.

## Evidence

| Source | Detail |
| --- | --- |
| Stage 10 role workflow report | `qa-agent/agentops/AGENTOPS_STAGE_10_ROLE_WORKFLOW_QA_REPORT.md` |
| Safe workflow JSON | `qa-agent/reports/browser-qa/role-workflow-safe-report.json` — finding `RWF-28`, guest route entry |
| Piter decision table | `qa-agent/reports/browser-qa/role-workflow-piter-decision-table.md` — RWF-28 marked **real-permission-issue**, import recommended |
| Stage 10D import | `qa-agent/agentops/AGENTOPS_STAGE_10D_APPROVED_ROLE_WORKFLOW_IMPORT_REPORT.md` — backlog `AIXIA-WORKFLOW-RWF-28` |
| Screenshot | `qa-agent/reports/browser-qa/screenshots/role-workflow-safe/guest-finance_master-data-1779879733436.png` |

## Risk

Guest finance access creates a role-boundary problem and could become a tenant/security issue later if route guards regress, profile overrides are mis-set, or page-level checks are bypassed.

---

# Fix Plan

## Fix Goal

Ensure guest users cannot access `/finance/master-data` (no finance shell, no master-data hub, no misleading “loaded” access).

## Preferred Fix Strategy

Use the **existing shared** route protection in `ProtectedRoute` + `canAccessRoute()` / `ROUTE_PERMISSIONS` in `src/lib/permissions.ts`. Do **not** add a one-off guest check only on the master-data page.

Recommended approach (staging, single change set with RWF-29):

1. **Confirm** `canAccessRoute("guest", "/finance/master-data", …)` returns `false` with no profile overrides (catalog: `permissionOverrides: null`).
2. **Harden route denial UX** if product agrees: for permission failures on finance routes, prefer a clear access-denied state over silent `/dashboard` redirect (optional—coordinate with RWF-29).
3. **Defense in depth:** ensure master-data page denial runs before any sensitive counts/API calls if a race allows brief mount (audit `FinanceMasterDataPage` load order).
4. **Optional explicit role guard:** add `roles` exclusion or guest finance block in `ROUTE_PERMISSIONS` only if `canAccessRoute` is proven insufficient for staging guest profiles.

Do **not** change RLS, schema, or finance business logic.

## Files To Inspect Before Fix

| File | Why |
| --- | --- |
| `src/App.tsx` | Route registration; `ProtectedRoute` wrapper on `/finance/master-data` |
| `src/lib/permissions.ts` | `ROUTE_PERMISSIONS` entry `"/finance/master-data": { permission: "manageFinanceMasterData" }`; `canAccessRoute`, `getEffectivePermissions`, guest `ROLE_PERMISSIONS` |
| `src/components/layout/DashboardLayout.tsx` | Finance nav link gated by `effectivePermissions?.accessFinance` |
| `src/app/finance/master-data/page.tsx` | Page-level `AixiaAccessDeniedState`, `resolveFinancePagePermissionState`, data fetch timing |
| `src/lib/finance/pageAccess.ts` | Shared finance permission resolution |
| `src/lib/permissions.ts` → `ProtectedRoute` in `App.tsx` | Redirect-to-dashboard when `!canAccessRoute(...)` |

## Likely Fix Location

1. **Route-level guard (primary):** `ProtectedRoute` in `src/App.tsx` + `canAccessRoute` in `src/lib/permissions.ts` — guest should already fail `manageFinanceMasterData`; verify and fix if staging guest profile has unexpected overrides.
2. **Shared finance access (secondary):** Align denial behavior with other finance routes (same redirect/denied component).
3. **Page-level guard (only if route guard race confirmed):** Defer data fetch in `FinanceMasterDataPage` until `permissionState.canRead` is true; keep existing `AixiaAccessDeniedState`.

## Current Route / Guard Structure (inspection)

| Layer | Behavior for `/finance/master-data` |
| --- | --- |
| `App.tsx` | `<Route path="/finance/master-data" element={<ProtectedRoute><DashboardLayout><FinanceMasterDataPage /></DashboardLayout></ProtectedRoute>} />` |
| `ProtectedRoute` | Auth gates; then `canAccessRoute(role, location.pathname, getEffectivePermissions(role, permissions))`; on failure → `<Navigate to="/dashboard" />` |
| `ROUTE_PERMISSIONS` | Requires `manageFinanceMasterData` |
| Guest role defaults | `manageFinanceMasterData: false`, `accessFinance: false` |
| `DashboardLayout` | Finance sidebar item only if `accessFinance` |
| `FinanceMasterDataPage` | Uses `AixiaAccessDeniedState` when `!permissionState.canRead \|\| !hasMasterDataAccess` but still renders finance hero/shell above denial in some states |

## Do Not Change

- Do not change RLS.
- Do not change Supabase schema.
- Do not change finance business logic.
- Do not change authorized users’ access.
- Do not redesign page UI (except minimal access-denied/redirect behavior if required).
- Do not modify unrelated routes.
- Do not modify AgentOps backlog in this fix task unless closing after verification (Stage 10G).
- Do not change production/main.
- Do not modify `workflow-scope.json` unless Piter separately approves scope updates.

## Validation Plan

After fix (Stage 10F), run:

```bash
npm run build
npm run qa:agentops-role-workflow-safe
npm run qa:agentops-synthetic-users-smoke
npm run qa:validate-foundation
```

**Expected validation:**

- Guest: `/finance/master-data` → `access-denied` or `redirected` (not `loaded` with finance URL); final URL must not expose master-data content.
- Owner / finance-admin / authorized finance users: route still loads.
- AgentOps isolation: owner-only AgentOps unchanged.
- No write/destructive actions in QA runs.

---

# Cursor Fix Prompt (copy when Piter approves Stage 10F)

```text
STAGING ONLY — AiXia guest finance route access fix (AIXIA-WORKFLOW-RWF-28)

Context:
- Backlog issue AIXIA-WORKFLOW-RWF-28: guest (qa+agentops-guest@aixia.local) must not access /finance/master-data.
- Fix plan: qa-agent/agentops/fix-plans/AIXIA-WORKFLOW-RWF-28_FIX_PLAN.md
- Pair with RWF-29 if same root cause (recommended): qa-agent/agentops/fix-plans/AIXIA-WORKFLOW-RWF-29_FIX_PLAN.md

Rules:
- Staging only. Do not touch production, main Supabase, or main GitHub.
- Fix ONLY guest (and same-pattern unauthorized) access to protected finance routes.
- Do NOT change RLS, schema, migrations, or finance business logic.
- Do NOT redesign finance UI.
- Do NOT change permissions for authorized finance users.
- Do NOT modify workflow-scope.json or AgentOps unless asked.
- Use existing ProtectedRoute + canAccessRoute + ROUTE_PERMISSIONS in src/lib/permissions.ts.

Steps:
1. Read fix plans and inspect:
   - src/App.tsx (ProtectedRoute, /finance/master-data route)
   - src/lib/permissions.ts (ROUTE_PERMISSIONS, guest ROLE_PERMISSIONS, canAccessRoute)
   - src/app/finance/master-data/page.tsx (page-level denial and data fetch order)
   - src/components/layout/DashboardLayout.tsx (finance nav visibility)
2. Reproduce logically: guest has manageFinanceMasterData false; confirm canAccessRoute returns false.
3. If route guard already redirects to /dashboard, harden so guest never sees finance master-data shell (fix redirect timing or use consistent access-denied pattern). Coordinate with /finance/reports (RWF-29) in one PR if shared.
4. Do not add page-local one-off guards if shared route guard can be fixed once.
5. Run:
   npm run build
   npm run qa:agentops-role-workflow-safe
   npm run qa:agentops-synthetic-users-smoke
   npm run qa:validate-foundation
   (Dev server on http://localhost:5173 required for browser QA.)

Deliverables:
- List files changed and why.
- Exact verification command results (pass/fail).
- Confirm guest cannot access /finance/master-data; authorized users still can.
- Confirm no RLS/schema/workflow-scope/production changes.
```
