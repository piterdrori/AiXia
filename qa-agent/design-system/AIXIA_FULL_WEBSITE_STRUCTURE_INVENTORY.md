# AiXia Full Website Structure Inventory

## Scope and Method

- Source scan baseline:
  - `src/App.tsx` (registered router paths and route wiring)
  - `src/app/**` (`page.tsx` route candidates + non-wired pages)
  - `src/components/aixia/**` (shared component surface)
  - `src/styles/aixia-design-system.css` (shared visual system owner)
  - `src/design-system/**` (existing design governance docs)
  - AgentOps planning docs listed in request
- Route inventory source of truth for active routing: `src/App.tsx`
- Status definitions:
  - `active/current`: route is registered in `App.tsx`
  - `legacy-alias`: route registered but redirects to canonical route
  - `filesystem-only`: `src/app/**/page.tsx` exists but not currently wired in `App.tsx`

## Inventory Totals

- Registered route paths in `App.tsx`: **170** (includes aliases and wildcard)
- Imported app page components in `App.tsx`: **136**
- `src/app/**/page.tsx` files found: **146**
- Access profile by route intent:
  - Public/auth: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`
  - Protected/internal: all business routes under dashboard layout
  - System/admin style: `/system/agent-ops/**`, `/ai-management/**`, `/finance/access-approvals/**`

---

## Module Map (Detected)

1. Auth/Public
2. Onboarding/Profile
3. Dashboard/Home
4. Projects
5. Tasks
6. Calendar
7. Chat/Comms
8. Inbox/Mail
9. Employees/People
10. Global Settings
11. AI Management
12. System/AgentOps
13. Finance Hub
14. Finance Master Data
15. Finance Transactions
16. Finance Reports
17. Finance Access Approvals
18. Legacy Alias/Redirect layer

---

## Route Tree Summary (Grouped by Module)

### Auth/Public

- `/` -> `src/app/page.tsx`
- `/login` -> `src/app/login/page.tsx`
- `/register` -> `src/app/register/page.tsx`
- `/forgot-password` -> `src/app/forgot-password/page.tsx`
- `/reset-password` -> `src/app/reset-password/page.tsx`

### Onboarding

- `/onboarding` -> `src/app/onboarding/page.tsx`

### Dashboard / Core Work

- `/dashboard` -> `src/app/dashboard/page.tsx`
- `/projects` -> `src/app/projects/page.tsx`
- `/projects/new` -> `src/app/projects/new/page.tsx`
- `/projects/:id` -> `src/app/projects/[id]/page.tsx`
- `/projects/:id/edit` -> `src/app/projects/[id]/edit/page.tsx`
- `/projects/:id/task-fields` -> `src/app/projects/[id]/task-fields/page.tsx`
- `/projects/:id/reports/:reportId` -> `src/app/projects/[id]/reports/[reportId]/page.tsx`
- `/tasks` -> `src/app/tasks/page.tsx`
- `/tasks/new` -> `src/app/tasks/new/page.tsx`
- `/tasks/:id` -> `src/app/tasks/[id]/page.tsx`
- `/tasks/:id/edit` -> `src/app/tasks/[id]/edit/page.tsx`
- `/calendar` -> `src/app/calendar/page.tsx`
- `/calendar/new` -> `src/app/calendar/new/page.tsx`
- `/calendar/day/:date` -> `src/app/calendar/day/page.tsx`
- `/calendar/:id/edit` -> `src/app/calendar/[id]/edit/page.tsx`
- `/chat` -> `src/app/chat/page.tsx`
- `/chat/:id` -> `src/app/chat/page.tsx`
- `/inbox` -> `src/app/inbox/page.tsx`
- `/mail` -> `src/app/mail/page.tsx`
- `/employees` -> `src/app/employees/page.tsx`
- `/employees/:id` -> `src/app/employees/[id]/page.tsx`
- `/employees/:id/permissions` -> `src/app/employees/[id]/permissions/page.tsx`
- `/settings` -> `src/app/settings/page.tsx`

### AI Management

- `/ai-management` -> `src/app/ai-management/page.tsx`
- `/ai-management/knowledge` -> `src/app/ai-management/knowledge/page.tsx`
- `/ai-management/cache-review` -> `src/app/ai-management/cache-review/page.tsx`
- `/ai-management/approved-answers` -> `src/app/ai-management/approved-answers/page.tsx`
- `/ai-management/core-settings` -> `src/app/ai-management/core-settings/page.tsx`
- `/ai-management/activity` -> `src/app/ai-management/activity/page.tsx`
- `/ai-management/guardrails` -> `src/app/ai-management/guardrails/page.tsx`
- `/ai-management/memory` -> `src/app/ai-management/memory/page.tsx`
- `/ai-management/character` -> `src/app/ai-management/character/page.tsx`
- `/ai-management/state-of-mind` -> `src/app/ai-management/state-of-mind/page.tsx`
- `/ai-management/voice` -> `src/app/ai-management/voice/page.tsx`
- `/ai-management/animation` -> `src/app/ai-management/animation/page.tsx`

### System / AgentOps

- `/system/agent-ops` -> `src/app/system/agent-ops/page.tsx`
- `/system/agent-ops/issues` -> `src/app/system/agent-ops/issues/page.tsx`
- `/system/agent-ops/issues/:issueCode` -> `src/app/system/agent-ops/issues/[issueCode]/page.tsx`
- `/system/agent-ops/agents` -> `src/app/system/agent-ops/agents/page.tsx`
- `/system/agent-ops/agents/:agentId` -> `src/app/system/agent-ops/agents/[agentId]/page.tsx`
- `/system/agent-ops/council` -> `src/app/system/agent-ops/council/page.tsx`
- `/system/agent-ops/advanced` -> `src/app/system/agent-ops/advanced/page.tsx`
- `/system/agent-ops/knowledge` -> `src/app/system/agent-ops/knowledge/page.tsx`
- `/system/agent-ops/automation` -> `src/app/system/agent-ops/automation/page.tsx`
- `/system/agent-ops/history` -> `src/app/system/agent-ops/history/page.tsx`

### Finance Hub + Master Data + Transactions + Reports + Access

- Hub:
  - `/finance` -> `src/app/finance/page.tsx`
  - `/finance/settings` -> **legacy-alias redirect** (to `/finance/access-approvals`)
- Master Data:
  - `/finance/master-data` -> `src/app/finance/master-data/page.tsx`
  - `/finance/master-data/projects` -> `src/app/finance/master-data/projects/page.tsx`
  - `/finance/master-data/employees` -> `src/app/finance/master-data/employees/page.tsx`
  - `/finance/master-data/clients` -> `src/app/finance/master-data/clients/page.tsx`
  - `/finance/master-data/clients/new` -> `src/app/finance/master-data/clients/new/page.tsx`
  - `/finance/master-data/clients/:id` -> `src/app/finance/master-data/clients/[id]/page.tsx`
  - `/finance/master-data/vendors` -> `src/app/finance/master-data/vendors/page.tsx`
  - `/finance/master-data/vendors/new` -> `src/app/finance/master-data/vendors/new/page.tsx`
  - `/finance/master-data/vendors/:id` -> `src/app/finance/master-data/vendors/[id]/page.tsx`
  - `/finance/master-data/companies` -> `src/app/finance/master-data/companies/page.tsx`
  - `/finance/master-data/companies/new` -> `src/app/finance/master-data/companies/new/page.tsx`
  - `/finance/master-data/companies/:id` -> `src/app/finance/master-data/companies/[id]/page.tsx`
  - `/finance/master-data/payment-methods` -> `src/app/finance/master-data/payment-methods/page.tsx`
  - `/finance/master-data/expense-categories` -> `src/app/finance/master-data/expense-categories/page.tsx`
  - `/finance/master-data/revenue-categories` -> `src/app/finance/master-data/revenue-categories/page.tsx`
  - `/finance/master-data/items` -> `src/app/finance/master-data/items/page.tsx`
  - `/finance/master-data/currencies` -> `src/app/finance/master-data/currencies/page.tsx`
  - `/finance/master-data/vendor-bank-accounts` -> `src/app/finance/master-data/vendor-bank-accounts/page.tsx`
  - `/finance/master-data/vendor-bank-accounts/new` -> `src/app/finance/master-data/vendor-bank-accounts/new/page.tsx`
  - `/finance/master-data/vendor-bank-accounts/:id` -> `src/app/finance/master-data/vendor-bank-accounts/[id]/page.tsx`
  - `/finance/master-data/bank-accounts` -> `src/app/finance/master-data/bank-accounts/page.tsx`
  - `/finance/master-data/bank-accounts/new` -> `src/app/finance/master-data/bank-accounts/new/page.tsx`
  - `/finance/master-data/bank-accounts/:id` -> `src/app/finance/master-data/bank-accounts/[id]/page.tsx`
  - `/finance/master-data/payment-terms` -> `src/app/finance/master-data/payment-terms/page.tsx`
  - `/finance/master-data/shipping-terms` -> `src/app/finance/master-data/shipping-terms/page.tsx`
  - `/finance/master-data/units-of-measure` -> `src/app/finance/master-data/units-of-measure/page.tsx`
  - `/finance/master-data/tax-codes` -> `src/app/finance/master-data/tax-codes/page.tsx`
  - `/finance/master-data/numbering-sequences` -> `src/app/finance/master-data/numbering-sequences/page.tsx`
- Reports:
  - `/finance/reports` -> `src/app/finance/reports/page.tsx`
  - `/finance/reports/export` -> `src/app/finance/reports/export/page.tsx`
  - `/finance/reports/:reportKey` -> `src/app/finance/reports/[reportKey]/page.tsx`
  - Preset keys routed to same report runner:
    - `/finance/reports/trial-balance`
    - `/finance/reports/ar-aging`
    - `/finance/reports/ap-aging`
    - `/finance/reports/ledger`
    - `/finance/reports/categories`
    - `/finance/reports/payroll`
    - `/finance/reports/project`
- Access:
  - `/finance/access-approvals` -> `src/app/finance/access-approvals/page.tsx`
  - `/finance/access-approvals/:userId` -> `src/app/finance/access-approvals/[userId]/page.tsx`
- Transactions:
  - `/finance/transactions` -> `src/app/finance/transactions/page.tsx`
  - Customer PO:
    - `/finance/transactions/customer-pos`
    - `/finance/transactions/customer-pos/new`
    - `/finance/transactions/customer-pos/:id`
  - Invoices:
    - `/finance/transactions/invoices`
    - `/finance/transactions/invoices/new`
    - `/finance/transactions/invoices/:id`
  - Proforma invoices:
    - `/finance/transactions/proforma-invoices` (**legacy-alias redirect** to invoices)
    - `/finance/transactions/proforma-invoices/new` (**legacy-alias redirect** helper)
    - `/finance/transactions/proforma-invoices/:id`
  - Quotations:
    - `/finance/transactions/quotations`
    - `/finance/transactions/quotations/new`
    - `/finance/transactions/quotations/:id`
  - Vendor quotations:
    - `/finance/transactions/vendor-quotations`
    - `/finance/transactions/vendor-quotations/new`
    - `/finance/transactions/vendor-quotations/:id`
  - Purchase orders:
    - `/finance/transactions/purchase-orders`
    - `/finance/transactions/purchase-orders/new`
    - `/finance/transactions/purchase-orders/:id`
  - Bills:
    - `/finance/transactions/bills`
    - `/finance/transactions/bills/new`
    - `/finance/transactions/bills/:id`
  - Payments made:
    - `/finance/transactions/payments-made`
    - `/finance/transactions/payments-made/new`
    - `/finance/transactions/payments-made/:id`
  - Payments received:
    - `/finance/transactions/payments-received`
    - `/finance/transactions/payments-received/new`
    - `/finance/transactions/payments-received/:id`
  - Expense flow:
    - `/finance/transactions/expense-review`
    - `/finance/transactions/expense-review/:id`
    - `/finance/transactions/expense-funding`
    - `/finance/transactions/expense-funding/new`
    - `/finance/transactions/expense-funding/:id`
    - `/finance/transactions/expense-payments`
    - `/finance/transactions/expense-payments/new`
    - `/finance/transactions/expense-payments/:id`
    - `/finance/transactions/expenses`
    - `/finance/transactions/expenses/new` (**legacy-alias redirect** to process)
    - `/finance/transactions/expenses/process/form` (**legacy-alias redirect**)
    - `/finance/transactions/expenses/process`
    - `/finance/transactions/expenses/process/:id`
    - `/finance/transactions/expenses/:id`
    - Legacy expense alias routes:
      - `/finance/transactions/expenses-payments-made`
      - `/finance/transactions/expenses-payments-made/process-book-template`
      - `/finance/transactions/expenses-payments-made/new`
      - `/finance/transactions/expenses-payments-made/review/:id`
      - `/finance/transactions/expenses-payments-made/funding-batches/new`
      - `/finance/transactions/expenses-payments-made/funding-batches/:id`
      - `/finance/transactions/expenses-payments-made/:id`
  - Paycheck/payroll flow:
    - `/finance/transactions/paycheck-requests`
    - `/finance/transactions/paycheck-requests/new`
    - `/finance/transactions/paycheck-requests/process`
    - `/finance/transactions/paycheck-requests/process/:id`
    - `/finance/transactions/paycheck-requests/:id`
    - `/finance/transactions/paycheck-review`
    - `/finance/transactions/paycheck-review/:id`
    - `/finance/transactions/paycheck-funding`
    - `/finance/transactions/paycheck-funding/new`
    - `/finance/transactions/paycheck-funding/:id`
    - `/finance/transactions/paycheck-payments`
    - `/finance/transactions/paycheck-payments/new`
    - `/finance/transactions/paycheck-payments/:id`
    - Paycheck legacy alias routes:
      - `/finance/transactions/paycheck-requests/review`
      - `/finance/transactions/paycheck-requests/review/:id`
      - `/finance/transactions/paycheck-requests/allocations`
      - `/finance/transactions/paycheck-requests/allocations/new`
      - `/finance/transactions/paycheck-requests/allocations/:id`
      - `/finance/transactions/paycheck-requests/payments`
      - `/finance/transactions/paycheck-requests/payments/new`
      - `/finance/transactions/paycheck-requests/payments/:id`
    - Payroll namespace compatibility:
      - `/finance/transactions/payroll`
      - `/finance/transactions/payroll/new` (**legacy-alias redirect**)
      - `/finance/transactions/payroll/review/:id` (**legacy-alias redirect helper**)
      - `/finance/transactions/payroll/funding-batches/new` (**legacy-alias redirect**)
      - `/finance/transactions/payroll/funding-batches/:id` (**legacy-alias redirect helper**)
      - `/finance/transactions/payroll/:id` (**legacy-alias redirect helper**)

### Wildcard

- `*` -> redirect to `/`

---

## Route Classification Matrix (Pattern-Level, Applies to All Listed Routes)

| Route family | Module/domain | Page type | Parent/child relation | Access | Active/current vs placeholder | Design status | Risk | Required future page pattern |
|---|---|---|---|---|---|---|---|---|
| `/`, `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth/Public | auth/public | root | public | active/current | partially local visual system | medium | Auth/Public |
| `/onboarding` | Onboarding | create/edit onboarding | child of auth flow | internal protected | active/current | partially local visual system | medium | Create/Edit |
| `/dashboard` | Core | dashboard/command center | top-level | internal protected | active/current | partially shared, partially local | medium | Dashboard/Command Center |
| `/projects*` | Projects | registry + detail + create/edit | parent `/projects` | internal protected | active/current | partially local visual system | medium/high | Registry/List + Detail/Workspace + Create/Edit |
| `/tasks*` | Tasks | registry + detail + create/edit | parent `/tasks` | internal protected | active/current | partially local visual system | medium/high | Registry/List + Detail/Workspace + Create/Edit |
| `/calendar*` | Calendar | registry/day + create/edit | parent `/calendar` | internal protected | active/current | heavily local visual system in parts | high | Registry/List + Detail/Workspace + Create/Edit |
| `/chat*` | Chat | chat/workbench | parent `/chat` | internal protected | active/current | partially local visual system | medium/high | Chat/Workbench |
| `/inbox`, `/mail` | Messaging | registry/workbench | top-level | internal protected | active/current | partially local visual system | medium | Registry/List / Workbench |
| `/employees*` | HR/People | registry + detail/admin | parent `/employees` | internal protected | active/current | partially local visual system | medium | Registry/List + Detail/Workspace + Settings/Admin |
| `/settings` | Global settings | settings/admin | top-level | internal protected | active/current | partially local visual system | medium | Settings/Admin |
| `/ai-management*` | AI Management | dashboard + operator/settings/knowledge/history | parent `/ai-management` | internal/admin-like | active/current | mixed shared + local | high | Dashboard + Advanced/Operator + Knowledge + Settings/Admin + History/Timeline |
| `/system/agent-ops*` | System/AgentOps | command center + queue + workspace + chat + advanced + knowledge + automation + history | parent `/system/agent-ops` | internal/system | active/current | mostly shared AiXia components | medium | Dashboard, Registry, Detail/Workspace, Chat/Workbench, Advanced, Knowledge, History, Settings/Admin |
| `/finance` | Finance hub | dashboard/command center | top-level | internal protected | active/current | mostly shared AiXia components | medium | Dashboard/Command Center |
| `/finance/master-data*` | Finance master data | registry + detail + create/edit | parent `/finance/master-data` | internal protected | active/current | mostly shared but mixed legacy surfaces | medium | Registry/List + Detail/Workspace + Create/Edit |
| `/finance/transactions*` canonical routes | Finance transactions | registry + detail + create/process/review/workbench | parent `/finance/transactions` | internal protected | active/current | mixed (many standardized; some local legacy remnants) | medium/high | Registry/List + Detail/Workspace + Create/Edit + Chat/Workbench (where needed) + History/Timeline |
| `/finance/reports*` | Finance reports | dashboard/list + runner + export | parent `/finance/reports` | internal protected | active/current | partially local visual system | medium/high | Dashboard + Registry/List + Advanced/Operator |
| `/finance/access-approvals*` | Finance admin | settings/admin + detail | parent `/finance/access-approvals` | internal/admin-style | active/current | mostly shared components | medium | Settings/Admin + Detail/Workspace |
| finance/paycheck & expense alias routes | Legacy compatibility | redirect alias | child alias of canonical finance routes | internal protected | active/current (legacy-alias) | n/a (router alias only) | low (functional), medium (maintenance complexity) | Registry/List + Detail/Workspace (canonical targets) |
| `*` | global fallback | redirect | catch-all | mixed | active/current | n/a | low | Auth/Public redirect |

---

## Design Status and Risk Notes by Domain

### Low Risk

- AgentOps route family has consolidated shared AiXia structure and explicit finance-aligned rules.
- Many standardized finance transaction registries use shared workflow registry components.

### Medium Risk

- Finance pages with mixed old/new shells (shared + local remnants).
- Core app modules (`projects`, `tasks`, `employees`, `settings`) with mixed shared adoption.

### High Risk

- Calendar module (noted styling/spacing legacy complexity).
- AI management surfaces with technical-panel density and pattern drift.
- Legacy alias volume in finance transactions (high maintenance/consistency risk even if functional).

Risk drivers:
- local cards/tables/heroes
- duplicated patterns across modules
- inconsistent spacing rhythm
- custom per-page visual rules
- technical-wall density on operational pages
- horizontal scroll risk outside intended table wrappers

---

## Filesystem-Only Pages (Not Clearly Wired in `App.tsx`, Needs Manual Review)

- `src/app/activity/page.tsx`
- `src/app/complete-profile/page.tsx`
- `src/app/finance/settings/page.tsx` (finance route currently redirects in `App.tsx`)
- `src/app/finance/transactions/proforma-invoices/page.tsx` (route redirects to invoices list)
- `src/app/finance/transactions/payroll/review/[id]/page.tsx` (router currently uses redirect helper)
- Additional process/support page files under module folders may be internal components rather than route roots; review required before migration planning.

---

## Unknowns / Needs Manual Review

1. Some route files appear present but are currently bypassed by redirect routes.
2. Exact visual maturity per individual route needs screenshot/manual pass (this inventory is source scan only).
3. Role-level route gating is enforced via permissions and `ProtectedRoute`; per-route admin/system flags should be finalized with business owners before migration waves.
4. Legacy compatibility routes should be tagged for eventual deprecation planning after canonical route stability is confirmed.
