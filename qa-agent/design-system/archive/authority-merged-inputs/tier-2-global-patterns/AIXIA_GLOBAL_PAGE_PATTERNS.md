<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/03-page-shell-standard.md, src/design-system/aixia-global/04-hero-header-standard.md, src/design-system/aixia-global/06-card-section-standard.md, src/design-system/aixia-global/12-navigation-workspace-standard.md, src/design-system/aixia-global/14-page-migration-rules.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged into:
>
> - [`03-page-shell-standard.md`](../../src/design-system/aixia-global/03-page-shell-standard.md) — page shell
> - [`04-hero-header-standard.md`](../../src/design-system/aixia-global/04-hero-header-standard.md) — hero / header
> - [`06-card-section-standard.md`](../../src/design-system/aixia-global/06-card-section-standard.md) — cards / sections
> - [`12-navigation-workspace-standard.md`](../../src/design-system/aixia-global/12-navigation-workspace-standard.md) — navigation / workspace
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — page migration
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# AiXia Global Page Patterns

## Purpose

Define the canonical page patterns every module must use so UI structure stays consistent across the full application.

## Shared Pattern Contract (Applies to All Patterns)

- Use shared AiXia components from `src/components/aixia/*`
- Use shared style rhythm from `src/styles/aixia-design-system.css`
- Keep scroll behavior intentional (internal scroll containers for dense data)
- Include loading/empty/error/access states through shared state components
- Keep responsive behavior valid across desktop, 14-inch laptop, tablet, mobile

---

## 1) Auth/Public Pattern

- **Purpose:** unauthenticated entry and account recovery flows
- **Required sections:** brand header, auth form shell, helper links, status/error block
- **Allowed components:** `AixiaPage` (or approved auth shell), shared form fields/buttons, shared alerts
- **Forbidden:** local repeated auth shell framework; custom button/badge systems
- **Expected actions:** sign-in, register, reset flow actions
- **Responsive:** centered, single-column, no overflow clipping
- **Scroll behavior:** page-level minimal; avoid nested scroll where unnecessary
- **States:** loading submit state, inline validation, auth failure state
- **Examples:** `/login`, `/register`, `/forgot-password`, `/reset-password`
- **Migration notes:** normalize to shared `AixiaAuthShell` once available

## 2) Dashboard / Command Center Pattern

- **Purpose:** module overview and next actions
- **Required sections:** hero, KPI row, status/meta strip, navigation/action cards
- **Allowed components:** `AixiaHero`, `AixiaCommandMetrics`, `AixiaNavigationCard`, `AixiaSection`
- **Forbidden:** giant unstructured technical walls on default view
- **Expected actions:** open module areas, start workflows, review system status
- **Responsive:** KPI and card rows wrap cleanly
- **Scroll behavior:** vertical command scroll only
- **States:** loading dashboard, empty dashboard, warning/info states
- **Examples:** `/dashboard`, `/finance`, `/system/agent-ops`, `/ai-management`
- **Migration notes:** enforce one consistent command-surface rhythm globally

## 3) Registry / List Pattern

- **Purpose:** discover/filter/sort/manage records
- **Required sections:** hero/meta, toolbar, table/list surface, archive access path
- **Allowed components:** `AixiaRegistryToolbar`, `AixiaTableShell`, shared table cells, row action components
- **Forbidden:** local table skeletons and local action-cell styling
- **Expected actions:** search, filter, sort, open, archive, create
- **Responsive:** controls wrap predictably; table readable on narrow screens
- **Scroll behavior:** internal table horizontal/vertical scroll only where needed
- **States:** loading rows, empty list, error fetch, filtered empty
- **Examples:** `/projects`, `/tasks`, `/finance/master-data/*`, `/finance/transactions/*`
- **Migration notes:** retire duplicated local list bars and table wrappers

## 4) Detail / Workspace Pattern

- **Purpose:** operate one entity/issue/record with full context
- **Required sections:** hero context, lifecycle/status, primary work area, supporting context panels
- **Allowed components:** `AixiaFinanceCommandDetailPage`, `AixiaSection`, `AixiaContextSummarySection`, `AixiaValueBlock`
- **Forbidden:** per-page custom detail shells for repeated workflow types
- **Expected actions:** update, review, route to downstream actions
- **Responsive:** maintain hierarchy and action reachability
- **Scroll behavior:** primary vertical flow; internal scroll only in bounded lists/panels
- **States:** not found, access denied, loading detail, stale/empty related data
- **Examples:** `/projects/:id`, `/tasks/:id`, `/system/agent-ops/issues/:issueCode`, finance `/:id` pages
- **Migration notes:** unify detail shell variants across non-finance modules

## 5) Create / Edit Pattern

- **Purpose:** structured data input and submission
- **Required sections:** hero intent, form sections, optional summary block, action footer
- **Allowed components:** `AixiaFinanceCommandCreatePage`, `AixiaFormFields`, `AixiaStickyActionFooter`, shared alerts
- **Forbidden:** local form layout systems replacing shared form components
- **Expected actions:** save draft, submit, cancel, validate
- **Responsive:** fields collapse gracefully; action footer remains reachable
- **Scroll behavior:** single-page vertical flow; avoid hidden required controls
- **States:** loading form dependencies, validation errors, submit success/fail
- **Examples:** `/projects/new`, `/tasks/new`, finance `*/new`, `/projects/:id/edit`
- **Migration notes:** standardize non-finance create/edit pages to shared shell

## 6) Chat / Workbench Pattern

- **Purpose:** conversational or operator workbench interactions
- **Required sections:** context header, thread area, composer/actions, optional side context
- **Allowed components:** shared chat/workbench shell (gap to implement), existing AiXia sections/states
- **Forbidden:** local repeated chat layout systems per module
- **Expected actions:** ask/respond, apply suggestions, open linked context
- **Responsive:** thread readable on mobile; composer always accessible
- **Scroll behavior:** thread scroll internal, page scroll stable
- **States:** loading history, no messages, send failure, permission block
- **Examples:** `/chat`, `/chat/:id`, `/system/agent-ops/council`, AgentOps issue/agent workspaces
- **Migration notes:** introduce shared chat primitives before broad migration

## 7) Knowledge / Learning Pattern

- **Purpose:** review lessons, memory artifacts, knowledge candidates
- **Required sections:** summary counts, candidate/list cards, decision actions, policy/safety notes
- **Allowed components:** shared cards/sections, status badges, action buttons
- **Forbidden:** unstructured technical dumps in primary knowledge view
- **Expected actions:** review, approve/reject, defer, open source context
- **Responsive:** card/list readability and action clarity
- **Scroll behavior:** vertical; card internals scroll only when needed
- **States:** no candidates, pending review, blocked access
- **Examples:** `/system/agent-ops/knowledge`, `/ai-management/knowledge`
- **Migration notes:** add shared learning-candidate component family

## 8) Advanced / Operator Pattern

- **Purpose:** expose technical controls with progressive disclosure
- **Required sections:** operator status strip, grouped advanced controls, guarded action areas
- **Allowed components:** `AixiaInfoBlock`, shared disclosure groups, action controls
- **Forbidden:** showing all technical controls as one dense wall by default
- **Expected actions:** inspect status, run manual operator tasks, open references
- **Responsive:** collapse/disclose sections cleanly at smaller widths
- **Scroll behavior:** vertical; keep action controls visible and grouped
- **States:** disabled controls, not-ready states, blocked permissions
- **Examples:** `/system/agent-ops/advanced`, parts of `/ai-management/*`
- **Migration notes:** introduce shared progressive disclosure wrapper

## 9) History / Timeline Pattern

- **Purpose:** show chronological events and decisions
- **Required sections:** summary strip, timeline feed, filter controls
- **Allowed components:** shared timeline rows/cards, status badges, date cells
- **Forbidden:** ad-hoc history row rendering repeated across pages
- **Expected actions:** filter events, inspect event detail, trace state changes
- **Responsive:** timeline remains readable in one-column mode
- **Scroll behavior:** vertical list; internal row expansion optional
- **States:** no history, partial history, loading history
- **Examples:** `/system/agent-ops/history`, `/ai-management/activity`
- **Migration notes:** build shared audit timeline components first

## 10) Settings / Admin Pattern

- **Purpose:** configure system/module behavior with guarded controls
- **Required sections:** settings categories, control forms, access policy/status
- **Allowed components:** shared settings sections/forms/alerts
- **Forbidden:** custom admin shell patterns per route family
- **Expected actions:** update configuration, save/revert, review status
- **Responsive:** category layout collapses predictably
- **Scroll behavior:** vertical category flow
- **States:** loading settings, missing permissions, save errors
- **Examples:** `/settings`, `/finance/access-approvals`, `/employees/:id/permissions`
- **Migration notes:** define global `AiXiaSettingsShell`

## 11) Report / Export Pattern

- **Purpose:** run, inspect, and export reporting datasets
- **Required sections:** report selector/context, parameter controls, output surface, export actions
- **Allowed components:** shared report shell, tables, status/info blocks
- **Forbidden:** bespoke report shells for each report type
- **Expected actions:** run report, adjust filters, export output
- **Responsive:** parameter controls and output areas remain usable
- **Scroll behavior:** report output internal scroll where appropriate
- **States:** no data, report error, export error, long-running state
- **Examples:** `/finance/reports`, `/finance/reports/:reportKey`, `/finance/reports/export`
- **Migration notes:** add `AiXiaReportShell` before full report migrations

## 12) Process / Wizard / Process Book Pattern

- **Purpose:** guided staged workflows with explicit step progression
- **Required sections:** stage intro, stage body, validation guidance, navigation footer
- **Allowed components:** process-book shared components, shared form fields, action footer
- **Forbidden:** route-specific wizard framework clones
- **Expected actions:** next/back, save draft, submit/complete
- **Responsive:** stage controls accessible in all viewport classes
- **Scroll behavior:** page vertical + optional stage-local scrolling
- **States:** stage blocked, missing required fields, submission errors
- **Examples:** `/finance/transactions/expenses/process`, `/finance/transactions/paycheck-requests/process`
- **Migration notes:** centralize into global `AiXiaProcessWizardShell`

---

## Global Pattern Migration Notes

1. Migrate by module waves, not ad-hoc pages.
2. Build missing shared components before consumer-page rewrites.
3. Preserve business logic and data contracts in design-only phases.
4. Record memory updates after every major pattern decision.
