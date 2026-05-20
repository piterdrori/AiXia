# AIXIA FINANCE MODULE REWRITE STANDARD

This file is the locked shared-system standard for AiXia Finance page rewrites. It must stay aligned with the current Finance rewrite master prompt.

## 1. Source of truth

The shared AiXia component system is the source of truth. Approved pages are examples only. Do not copy a page layout as the standard. Inspect the shared components, shared CSS, and the target page before rewriting any Finance page.

Required first inspection files:

- `src/styles/aixia-design-system.css`
- `src/components/aixia/index.ts`
- all relevant shared components used by the target page
- the full target page file

If a needed visual pattern is not supported by the shared system, create or extend a shared component first. Do not solve it with page-local Tailwind design.

## 2. Zero local design rule

Finance pages must pass content, data, actions, route handlers, business logic, permissions, and state into shared components. Finance pages must not define their own visual language.

Do not leave local versions of page shell, hero/header, metric cards, status cards, section cards, value blocks, alerts, empty states, badges, search inputs, table shells, action cells, archive modals, registry toolbars, permission panels, or rounded glass wrappers.

## 3. Locked shared components

Use these shared components wherever their pattern appears:

- Page shell: `AixiaPage`
- Hero/header: `AixiaHero`
- Sections: `AixiaSection`, `AixiaDetailSection`
- Metrics: `AixiaMetricGrid`, `AixiaMetricCard`
- Hero/status cards: `AixiaStatusCard` through `AixiaHero statusCards`
- Buttons: `AixiaButton`
- Search/toolbar: `AixiaSearchField`, `AixiaRegistryToolbar`
- Alerts/states: `AixiaAlert`, `AixiaEmptyState`, `AixiaPageState`, `AixiaLoadingState`, `AixiaAccessDeniedState`, `AixiaNotFoundState`
- Badges: `AixiaBadge`, `AixiaStatusBadge`, `AixiaCurrencyBadge`, `AixiaDefaultBadge`
- Tables: `AixiaTableShell`, `AixiaSortableHeader`, `AixiaTableTextCell`, `AixiaTableBadgeCell`, `AixiaTableDateCell`, `AixiaTableActionsCell`
- Modals: `AixiaModal`, `AixiaArchiveManagerModal`
- Layout: `AixiaSmartGrid`, `AixiaSmartLayout`
- Review/content blocks: `AixiaReviewGrid`, `AixiaReviewBlock`, `AixiaValueBlock`, `AixiaDisplayBlock`, `AixiaInfoBlock`, `AixiaSignalRow`, `AixiaSideList`, `AixiaFeaturePanel`, `AixiaWorkspaceCard`, `AixiaSelectableTile`

## 4. Component responsibility map

Use each component for its intended job:

- `AixiaMetricCard`: KPI/summary numeric cards.
- `AixiaStatusCard`: hero/header operational status cards, normally passed through `AixiaHero statusCards`.
- `AixiaValueBlock`: compact label/value summary blocks.
- `AixiaDisplayBlock`: read-only/detail field display inside forms or detail pages.
- `AixiaReviewBlock`: review/checklist/approval blocks.
- `AixiaInfoBlock`: explanatory rules, guidance, warnings, or information panels.
- `AixiaSignalRow`: compact signal rows in side lists.
- `AixiaTableActionsCell`: table row actions only.
- `AixiaActionSystem`: general non-table action layouts only. Never wrap `AixiaTableActionsCell` with it.

## 5. Hero standard

`AixiaHero` owns all hero/header structure.

Newly standardized pages must use:

- `badges`
- `gradientTitle`
- `title`
- `subtitle`
- `description`
- `statusCards`
- `parentLabel` and `parentPath` for child pages
- `actions` only when needed

Do not use `rightContent` for newly standardized pages. It exists only as a legacy escape hatch for old pages that are not rewritten yet.

Do not create local hero markup, local header status cards, local badge rows inside hero children, or page-specific hero spacing patches. If two pages using `AixiaHero` look structurally different, fix `AixiaHero` or shared CSS.

Child page parent pill labels must be destination names, not “Back.” Examples: `Finance`, `Master Data`, `Transactions`, `Finance Access Approvals`.

## 6. Smart layout standard

`AixiaSmartLayout` owns two-column layout behavior.

Locked behavior:

- first main child stays in the left/top column
- side content stays in the right/top column
- when main has more than one child and side has content, the last main child becomes a full-width bottom span
- bottom span uses `.aixia-smart-bottom-span`
- bottom span covers both columns below the top row
- the right side box must not stretch to the bottom of the page
- do not patch this locally in pages

If another controlled behavior is needed, extend `AixiaSmartLayout` with a controlled prop after confirmation.

## 7. Registry toolbar standard

Registry/list pages must use `AixiaRegistryToolbar` for search, filters, secondary actions, create/new action, archive action, spacing, and responsive behavior.

Do not manually arrange registry controls with local control clusters or page-specific toolbar grids in newly standardized pages.

Legacy classes such as `aixia-control-cluster` may remain for old pages, but new standardized pages must not use them directly.

## 8. Archive manager standard

Archive popups must use `AixiaArchiveManagerModal`.

It owns the archive modal shell, title/description layout, badges, close/footer, max width, and optional archived/deleted tab controls.

Action meaning inside archive manager:

- Open = primary
- Restore = secondary
- Delete Permanently = danger

Do not label permanent delete as only “Delete.” Permanent delete belongs inside the archive manager unless explicitly approved otherwise.

If a backend supports archived and deleted lifecycle, use the archived/deleted tab pattern. Archived tab restores records. Deleted tab restores or permanently deletes records.

## 9. Button standard

Use `AixiaButton` for normal buttons.

Button meaning is locked:

- Primary: Create, New, Save, Open, View, Submit, Confirm main non-destructive action
- Secondary: Edit, Restore, Cancel, Close, neutral actions
- Danger: Archive, Delete, Delete Permanently, Remove, destructive actions

Do not create local button colors or local detail-section button styles. Shared detail sections must also use `AixiaButton`.

## 10. Table standard

Finance registry tables, archive tables, and modal tables must use:

- `AixiaTableShell`
- `AixiaSortableHeader`
- `AixiaTableTextCell`
- `AixiaTableBadgeCell`
- `AixiaTableDateCell`
- `AixiaTableActionsCell`
- `AixiaButton`

Active/list tables use `AixiaTableShell variant="registry"`.

Archive/modal archive tables use `AixiaTableShell variant="archive"`.

Table rules:

- headers centered unless a shared prop says otherwise
- body cells centered unless a shared prop says otherwise
- badges centered
- date cells centered
- action buttons centered as a group
- table can scroll horizontally when wide
- table body scrolls vertically after about 10 visible rows
- sticky header
- default sort newest first / `updated_at` descending unless page requires otherwise

Do not write page-specific cell padding, widths, alignment, or action wrappers in page table markup.

## 11. Table row safety

Every table row must match its header exactly. Count headers and row cells before and after editing.

If headers include Default, Status, or Updated, the row must include `AixiaDefaultBadge`, `AixiaStatusBadge`, and `AixiaTableDateCell` in the same order.

Changing a button variant must not remove cells. Do not fix unused imports by deleting required cells. Investigate why an import became unused first.

`AixiaTableActionsCell` must be used directly. Do not wrap it with `AixiaActionSystem`, local flex containers, or page-specific button groups.

## 12. Badge standard

Use shared badges only:

- currency: `AixiaCurrencyBadge`
- default: `AixiaDefaultBadge`
- status: `AixiaStatusBadge`
- general badges: `AixiaBadge`

Do not create local rounded badge spans.

## 13. GLOBAL AIXIA FONT / TYPOGRAPHY RULE

All AiXia pages must use the same shared font and shared text-size scale.

Typography belongs in `src/styles/aixia-design-system.css` and shared AiXia components only. Page files must not create local typography systems, local font stacks, local text-size scales, local tracking scales, local weight systems, or local print typography helper classes.

No page may create its own font family.

Forbidden page-level patterns include:

- local `font-family` declarations
- local `font-*` utility systems used as a page typography language
- local `text-[...]` sizing systems repeated across a page
- local print typography classes such as `*-text-xs`, `*-text-sm`, `*-text-title`, `*-weight-bold`, `*-tracking`, or `*-mono`
- inline style typography such as custom `fontSize`, `fontFamily`, `fontWeight`, `lineHeight`, or `letterSpacing`
- page-specific heading/label/body text scales

Allowed typography behavior:

- shared AiXia components may expose approved typography through their props and shared classes
- print documents must use shared `aixia-print-*` typography classes from the shared stylesheet
- normal pages must use shared AiXia components/classes for labels, headings, descriptions, values, badges, tables, forms, and buttons
- Large hero titles may stay large when rendered through `AixiaHero` or approved shared hero/title classes

If a page needs a new text treatment, extend the shared AiXia stylesheet or shared component first. Do not solve typography locally inside the page.

## 13. Silent refresh standard

Every loader that can run after initial load must support `mode: "initial" | "silent"`.

Initial mode may show loading, blocking errors, and empty states.

Silent mode must preserve current visible data and UI state on failure. It must never replace real visible data with fake empty arrays, zero counts, empty maps, or null profile data.

Do not write silent helpers that return `[]`, `0`, `{}`, or `null` on failure and then allow the page to recalculate from fake data.

Silent failure behavior:

- log warning/error only
- keep current rows
- keep current archived/deleted rows
- keep dashboard data
- keep profile and permissions
- keep reference maps
- keep filters/search/sort/tabs/modals/edit forms/scroll position

Realtime handlers and 60-second fallback intervals must call silent mode only and must clean up on unmount.

Every visible table/data source loaded by a page must have realtime coverage or a clear reason why fallback-only is acceptable.

## 14. AI workflow protection

Background refresh, realtime events, permission refresh, modal refresh, and fallback intervals must never interrupt AI chat, voice, microphone state, streamed responses, AI task execution, typed prompt, input focus, or active AI workflow state.

## 15. Finance permission standard

Finance access decisions must come from:

- base system role: admin / manager / employee / guest
- assigned Finance permission template
- user-specific overrides as exceptions only

Use the shared permission helpers already defined in the Finance module. Do not bypass permissions for convenience.

Hierarchy is cumulative: read → create → update → deleteArchive → approveExecute.

For admin-only Finance sections, the base role must be admin and the user must have `manageUsers`. Show a clear warning if a Finance Admin template is selected for a non-admin base role.

Normal users retain access to their own expense/paycheck records for personal ownership flows. Finance templates restrict company-level Finance/Admin access, not personal record ownership.

## 16. Rewrite process

Before code, confirm:

- page purpose
- files being changed
- logic preserved
- backend/Supabase preserved
- permissions preserved
- refresh behavior preserved/fixed
- archive/delete behavior preserved if relevant
- table standard applies if relevant
- hero uses `statusCards`, not `rightContent`
- smart layout uses `AixiaSmartLayout` when relevant
- registry toolbar uses `AixiaRegistryToolbar`
- archive manager uses `AixiaArchiveManagerModal`
- table shell uses the correct variant
- table rows match headers exactly
- which shared components/CSS must be created or extended

After code, verify no unused imports, no unused variables, no local visual components, no raw table styling, no local badges/buttons/alerts, no page-specific hero/layout patches, no wrapped table action cells, safe silent refresh, complete realtime coverage, and clean TypeScript structure.

## 17. Code delivery standard

Code instructions must be exact and copy-paste safe:

- exact file path
- change type: full file / full section / block / line
- exact full block to select
- exact full replacement
- no vague “paste below,” “add after,” or “find this” unless the full unique block is shown

For long files, deliver continuous sections of 600–700 lines minimum unless the file ends, then wait for confirmation.

Prefer a full-file rewrite when requested, otherwise use a few large replaceable sections. Do not make many tiny patches when sections are close together.

Do not guess database columns. Ask for schema/sample SQL if uncertain.

## 18. Final acceptance rule

A page is not finished just because the build passes. It must pass visual standard checks, logic-preservation checks, permission checks, silent-refresh checks, table/header alignment checks, archive/delete behavior checks, and TypeScript build checks.

## 19. Platform Visual Parity (command surface)

Golden reference modules: Dashboard, Projects, Tasks, Calendar, Chat, Inbox. Finance and all other app modules must converge to the same command-surface spec.

### Command surface API

- Page shell: `AixiaPage surface="command"` or `FinancePage` (finance wrapper)
- Hero: `AixiaHero surface="command"` — renders `aixia-dash-hero` DOM (kicker, title, subtitle, actions)
- Hero child order (fixed): **metrics → filter tabs → search/toolbar** (only include layers the page needs)
- Hub KPI row: `AixiaCommandMetrics` — icons, tone classes, `aixia-dash-metrics--auto` (Finance card chrome)
- Filter tabs: `aixia-command-tabs` / `aixia-command-tab` (Projects underline pattern; `aixia-projects-tabs` alias retained)
- List toolbar: `aixia-command-toolbar` (search, sort, view toggles; `aixia-projects-toolbar` alias retained)
- Buttons: `AixiaButton` only — maps to `aixia-dash-action` classes
- Section panels: `AixiaSection surface="command"` — `aixia-card-shell aixia-dash-panel`
- Registry metrics in scroll: migrate to `AixiaCommandMetrics` inside `AixiaHero` when they are page-level KPIs
- Tables/lists: `AixiaTableShell` + shared cells; inbox/task rows use same row tokens

### Layout fill (no dead empty space)

- Two-column detail pages: `AixiaSmartLayout` with `bottomSpan="auto"`, `sideRebalance="last-to-bottom"`, and `mainTopCount` when line-items or linked-docs must expand full width
- Tall table sections beside side column: `AixiaSection` with `smartScroll`, `fill`, and `visibleCards`
- Metric rows: `AixiaSmartGrid surface="command"` or `aixia-dash-bento` — no orphan half-width cards at breakpoints
- Hub pages: no local `min-h-screen` manual grids; use command page shell + shared layout components

### CSS source of truth

Global load via `main.tsx`: `dashboard/tokens.css`, `layout.css`, `visual.css`, `projects/projects-visual.css`. Module CSS files are layout extensions only (chat columns, calendar grid), not duplicate button/hero/card rules.

### Drift prevention

Do not use raw `aixia-dash-hero` HTML, shadcn `Button` with `aixia-dash-action`, or shadcn `Card` for new/edited standardized pages. Use shared AiXia components with `surface="command"`.

## 20. Workspace grid cards (hub + entity tiles)

Golden reference: Finance hub card on `/finance` (`AixiaWorkspaceCard`).

### Required shell

All hub navigation tiles and entity grid cards must use **`AixiaWorkspaceCard`** (or **`AixiaNavigationCard`**, which wraps it). Do not build local card shells with shadcn `Card`, inline Tailwind glass cards, or `.aixia-projects-grid-card*`.

### Fixed structure (order)

1. **Top** — icon (left), optional `topRightSlot` (pin/menu), status pill, arrow
2. **Body** — eyebrow, title, description
3. **Middle** (optional) — `children` preview slot (reports)
4. **Footer** — fixed **Access** label, summary, Open action pill

### API

- `size`: `default` | `compact` (entity grids) | `tall` (report previews)
- `as`: `button` for pure nav tiles; `div` when `topRightSlot` contains nested controls (pin, menu)
- `tone`: shared workspace tone classes only — no page-level color overrides

### Entity field mapping

| Slot | Projects | Tasks | Employees | Reports |
|------|----------|-------|-----------|---------|
| eyebrow | Status group | Column / lane | Role | Module category |
| label | Project name | Task title | Full name | Report title |
| description | Description | Description | Email / dept | Report blurb |
| statusLabel | ACTIVE / OVERDUE | Status | ACTIVE / RESTRICTED | Live |
| summary | Progress + due date | Priority + due | Access scope | Preview row count |
| children | — | — | — | Preview list |

Out of scope for this card: form panels, dashboard section panels, KPI rows (`AixiaCommandMetrics`), registry tables.

## 21. Finance hub scroll intro (meta strip + spacing)

Finance hub pages must use **`AixiaFinanceHubMetaStrip`** as the **first child** of `aixia-command-scroll` (after hero). Do not render raw `.aixia-finance-hub-meta` markup on hub pages.

### Block order in scroll body (canonical — do not reorder)

| Step | Block | Component |
|------|-------|-----------|
| 1 | Status meta row | `AixiaFinanceHubMetaStrip` |
| 2 | Access rule | `AixiaAccessRule` (when the page defines one) |
| 3 | Control signals strip | `AixiaFinanceHubControlPanel` → `AixiaNavigationInfoPanel` (standalone row, no nested overview tiles) |
| 4 | Overview metrics | `AixiaFinanceHubOverviewGrid` → `AixiaReviewGrid variant="metrics"` + `AixiaMetricCard` |
| 5 | Main hub content | Page-specific (`AixiaSmartLayout`, transaction flows, registries, report grids) |

Optional `AixiaAlert` blocks may appear after step 1.

**Forbidden in steps 1–4:** `AixiaValueBlock` for overview KPIs, `AixiaReviewGrid variant="cards"` for step 4, nesting overview metrics inside the control panel, placing overview metrics before `AixiaAccessRule`.

Hero `AixiaCommandMetrics` (Receivables/Payables totals) stays in the hero only — not duplicated in step 4.

### Spacing (single token)

All block-level gaps in the finance scroll intro zone use **`--aixia-stack-gap`**:

- Vertical gap between scroll direct children: `.aixia-finance-page .aixia-command-scroll { gap: var(--aixia-stack-gap) }`
- Horizontal and vertical gap between the three meta cards: `.aixia-finance-hub-meta { gap: var(--aixia-stack-gap) }`
- Nested stacks: `.aixia-stack { gap: var(--aixia-stack-gap) }`

Do not add ad-hoc Tailwind `gap-*`, `space-y-*`, or `pr-*` / `pb-*` on finance `aixia-command-scroll` — shared CSS owns rhythm.

## 22. Finance registry list scroll intro

Registry **list** pages (`/finance/transactions/*`, `/finance/master-data/*` list routes) use a shorter scroll intro than hub pages (§21). KPI counts live in the hero only — do not duplicate them in the scroll body.

### Hub vs registry

| | Hub (§21) | Registry list (§22) |
|---|-----------|---------------------|
| Hero | `AixiaCommandMetrics` (totals) | `AixiaCommandMetrics` (registry KPIs) |
| Scroll step 4 | `AixiaFinanceHubOverviewGrid` | Registry section (table) — no overview grid |

### Block order in scroll body (canonical — do not reorder)

| Step | Block | Component |
|------|-------|-----------|
| 1 | Status meta row | `AixiaFinanceHubMetaStrip` — System Status, Access, Active records |
| 2 | Access rule | `AixiaAccessRule` |
| 3 | Workflow / lifecycle strip | `AixiaFinanceHubControlPanel` — replaces ad-hoc hero badge pills |
| 4 | Registry body | `AixiaSection` + `AixiaRegistryToolbar` + table |

Optional `AixiaAlert` blocks may appear after step 1.

**Forbidden on registry list pages:**

- Ad-hoc `aixia-action-system` + `AixiaBadge` pill rows inside `AixiaHero`
- `AixiaFinanceHubOverviewGrid` or duplicate KPI rows in scroll (hero owns metrics)
- Placing `AixiaAccessRule` before `AixiaFinanceHubMetaStrip`

Reuse the same `--aixia-stack-gap` spacing rules from §21.
