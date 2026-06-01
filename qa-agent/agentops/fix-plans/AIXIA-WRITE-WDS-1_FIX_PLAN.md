# Issue Summary

## Issue Code

`AIXIA-WRITE-WDS-1`

## Title

Finance viewer can access quotation create shell.

## Severity

Medium (no enabled Save Draft observed in Stage 11; route shell exposure only).

## Category

Security/Permission

## Affected Route

`/finance/transactions/quotations/new`

## Affected Synthetic User

`qa+agentops-finance-viewer@aixia.local` (`finance-viewer` — profile role `employee`, read-only finance overrides).

## What Happened

During Stage 11 controlled write/draft QA (`npm run qa:agentops-write-draft-safe`, run `write-draft-safe-1779924187706`):

- User navigated directly to `/finance/transactions/quotations/new`.
- **Outcome:** `accessStatus: loaded`, `finalUrl` remained on the create route (not redirected).
- **List page:** create action correctly **hidden** on `/finance/transactions/quotations` (`create-hidden`).
- **Save Draft:** not treated as enabled (button hidden or disabled in QA window).
- **Screenshot:** `qa-agent/reports/browser-qa/screenshots/write-draft-safe/finance-viewer-quotations-new-1779924202613.png`

Stage 11C imported this finding to staging AgentOps backlog as `AIXIA-WRITE-WDS-1`.

## What Should Happen

Finance viewer is intended as **read-only** finance access. They may view permitted finance areas but must **not** reach quotation **create/write** shells unless Piter explicitly approves draft creation for viewers.

Authorized **finance-admin**, **owner**, and **platform-admin** users must retain quotation create access.

## Why It Matters

Create shells expose draft quotation workflow, client/company selectors, line items, bank/currency fields, and internal finance metadata. Even without Save Draft enabled today, unauthorized shell access:

- Confuses role boundaries (viewer vs creator).
- Risks future regression if Save Draft or API writes become enabled without a separate guard.
- Weakens parity with list-page create-button hiding (list hides create; deep link still opens form).

## Evidence

| Source | Detail |
| --- | --- |
| Stage 11 write/draft report | `qa-agent/agentops/AGENTOPS_STAGE_11_SYNTHETIC_WRITE_DRAFT_QA_REPORT.md` |
| Safe QA JSON | `qa-agent/reports/browser-qa/write-draft-safe-report.json` — finding `WDS-1` |
| Stage 11C import | `qa-agent/agentops/AGENTOPS_STAGE_11C_WRITE_DRAFT_APPROVED_IMPORT_REPORT.md` |
| Import plan | `qa-agent/reports/browser-qa/write-draft-approved-import.md` |
| Scope expectation | `qa-agent/browser-qa/write-workflow-scope.json` — `finance-viewer` expected **blocked** on `finance-quotations-new` |
| Screenshot | `qa-agent/reports/browser-qa/screenshots/write-draft-safe/finance-viewer-quotations-new-1779924202613.png` |

## Risk

If `createInvoices` (or page-level `canCreate`) is granted via profile overrides or a guard gap, finance-viewer could save draft quotations later. Medium severity today; could become High if write actions become enabled without re-testing.

---

# Fix Plan

## Fix Goal

Block `finance-viewer` (and other read-only finance roles) from `/finance/transactions/quotations/new` while preserving create access for authorized finance admins/owners.

## Preferred Fix Strategy

Use the **existing shared** stack—do not add a quotations-only hack:

1. **Route-level (primary):** `ProtectedRoute` → `canAccessRoute()` → `ROUTE_PERMISSIONS["/finance/transactions/quotations/new"]` requires **`createInvoices`** (`src/lib/permissions.ts` line ~746).
2. **Verify effective permissions** for staging `finance-viewer`: catalog overrides grant `viewInvoices` but **not** `createInvoices` / `createFinanceRecords` (`qa-agent/browser-qa/synthetic-browser-users.json`). If staging profile DB overrides grant `createInvoices`, fix profile data (staging only)—not a code bypass.
3. **Page-level defense-in-depth (secondary):** Mirror `FinanceQuotationsPage` — use `fetchFinanceEffectivePermissions` + `resolveFinancePagePermissionState` with the same `PAGE_ACCESS_CONFIG` (`incomingMoneyFlow`, `createPermissions: ["createFinanceRecords", "createInvoices"]`) and show `AixiaAccessDeniedState` / redirect when `!permissionState.canCreate`.
4. **Save Draft footer:** Gate `Save Draft` on `permissionState.canCreate` (quotations/new currently only disables while `isSaving`).

Do **not** change RLS, schema, quotation business logic, or unrelated transaction routes.

## Files To Inspect Before Fix

| File | Why |
| --- | --- |
| `src/App.tsx` | Route `path="/finance/transactions/quotations/new"` wrapped in `ProtectedRoute` only (~1427–1435) |
| `src/lib/permissions.ts` | `ROUTE_PERMISSIONS` for quotations list vs `/new`; `canAccessRoute`, `getEffectivePermissions`, cascades |
| `src/lib/finance/pageAccess.ts` | `resolveFinancePagePermissionState`, `fetchFinanceEffectivePermissions` |
| `src/app/finance/transactions/quotations/page.tsx` | `PAGE_ACCESS_CONFIG`, `permissionState.canCreate` gates registry create button (~85–98, ~850) |
| `src/app/finance/transactions/quotations/new/page.tsx` | **No** `pageAccess` usage today; renders full create shell + Save Draft (~244+, ~1013–1020) |
| `src/app/finance/transactions/invoices/new/page.tsx` | Compare pattern for other receivables create routes |
| Staging profile (read-only) | Confirm `finance-viewer` has no `createInvoices` override in `profiles` permissions JSON |

## Likely Fix Location

| Option | Assessment |
| --- | --- |
| **1. Route-level guard** | **Primary.** `/new` already maps to `createInvoices`; viewer should fail `canPerform`. If QA shows `loaded`, debug why `canAccessRoute` returns true (wrong role, DB overrides, or redirect race). |
| **2. Shared finance page access config** | **Recommended secondary.** Reuse quotations list `PAGE_ACCESS_CONFIG` on new page. |
| **3. Page-level defense-in-depth** | **Required if route guard race or deep-link flash confirmed.** Deny before Supabase option loads on new page. |
| **4. Registry create button** | **Already correct** for viewer (hidden on list); not sufficient alone because deep links bypass list. |

## Inspection Notes (Stage 11D — read-only)

- **Routing:** Registered in `src/App.tsx` with `ProtectedRoute` + `DashboardLayout` + `FinanceNewQuotationPage` (no extra finance wrapper).
- **Route permission map:** List `/finance/transactions/quotations` → `viewInvoices`; New `/finance/transactions/quotations/new` → `createInvoices`.
- **Finance-viewer synthetic overrides:** `accessFinance`, `viewFinance`, `viewInvoices`, `viewReceivables` = true; `createFinanceRecords` = false; no `createInvoices`.
- **List vs new:** List page hides create when `!permissionState.canCreate`; new page does not check permissions.
- **Save Draft:** Rendered in footer with `disabled={isSaving}` only—not permission-gated.

## Do Not Change

- Do not change RLS or Supabase schema.
- Do not change quotation save/submit business logic or RPC payloads.
- Do not change authorized finance-admin/owner/platform-admin create flows.
- Do not redesign quotation UI layout.
- Do not modify unrelated finance transaction routes (bills, payroll, etc.) unless same guard gap is proven.
- Do not modify AgentOps tables or import WDS-3.
- Do not change production/main.

## Validation Plan

After fix (Stage 11E), run:

```bash
npm run build
npm run qa:agentops-write-draft-safe
npm run qa:agentops-role-workflow-safe
npm run qa:agentops-synthetic-users-smoke
npm run qa:validate-foundation
```

**Expected:**

| User | `/finance/transactions/quotations/new` |
| --- | --- |
| finance-viewer | `redirected`, `access-denied`, or stable non-create shell — **not** `loaded` with full create form |
| guest | blocked (see WDS-2; guest finance block should also apply) |
| finance-admin / owner | `loaded`; Save Draft behavior unchanged for authorized roles |
| No write/destructive QA | No Save Draft click unless explicitly approved |

---

# Cursor Fix Prompt (copy when Piter approves Stage 11E)

```markdown
TASK: Fix AIXIA-WRITE-WDS-1 — block finance-viewer from quotation create shell (staging only).

CONTEXT:
- AgentOps backlog: AIXIA-WRITE-WDS-1 (imported Stage 11C).
- Route: /finance/transactions/quotations/new
- Synthetic user: finance-viewer (employee + read-only finance overrides; viewInvoices yes, createInvoices no).
- Stage 11 QA: finance-viewer reached create shell; list page correctly hid "New Quotation"; Save Draft not enabled in QA.
- Fix plan: qa-agent/agentops/fix-plans/AIXIA-WRITE-WDS-1_FIX_PLAN.md
- Combined summary: qa-agent/agentops/fix-plans/QUOTATION_CREATE_SHELL_PERMISSION_FIX_PLAN_SUMMARY.md

CONSTRAINTS (mandatory):
- Staging codebase only; no production/main Supabase or GitHub.
- Fix ONLY quotation create-shell permission for unauthorized roles (finance-viewer read-only).
- Use existing ProtectedRoute + canAccessRoute + ROUTE_PERMISSIONS patterns in src/lib/permissions.ts.
- Add page-level defense using src/lib/finance/pageAccess.ts (same PAGE_ACCESS_CONFIG as quotations list) if route guard alone is insufficient.
- Gate Save Draft on canCreate on quotations/new page.
- Do NOT change RLS, schema, migrations, quotation business logic, or unrelated transaction routes.
- Do NOT redesign UI; preserve finance-admin/owner create access.
- Do NOT modify AgentOps, workflow-scope.json, or WDS-3.
- Coordinate with WDS-2 guest fix in same change set if shared root cause (see combined summary).

STEPS:
1. Read src/App.tsx route for /finance/transactions/quotations/new, src/lib/permissions.ts ROUTE_PERMISSIONS, src/app/finance/transactions/quotations/page.tsx (PAGE_ACCESS_CONFIG), src/app/finance/transactions/quotations/new/page.tsx.
2. Reproduce mentally: why canAccessRoute might allow finance-viewer (check getEffectivePermissions + staging profile overrides).
3. Implement minimal fix: ensure canAccessRoute denies employee/viewer without createInvoices; add pageAccess + AixiaAccessDeniedState and canCreate-gated Save Draft on new page.
4. npm run build
5. npm run qa:agentops-write-draft-safe (dev server on http://127.0.0.1:5173)
6. npm run qa:validate-foundation

RETURN:
- Root cause (route vs page vs profile override).
- Files changed.
- Browser QA outcomes for finance-viewer, guest, finance-admin on quotations/new.
- Confirm no RLS/schema changes.
```
