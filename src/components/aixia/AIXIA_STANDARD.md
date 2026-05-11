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
