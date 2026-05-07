
# AiXia React Design + Implementation Standard

This is the official AiXia page-building standard.

This standard is mandatory for all AiXia pages, especially Finance pages, master-data pages, registry/list pages, new/create pages, detail/ID pages, review pages, approval pages, archive/delete pages, and pages connected to Supabase.

The goal is to make every page feel like it was built by the same designer, follows the same workflow rules, preserves backend/business logic, and avoids repeated small mistakes.

---

## 1. Do not edit base UI primitives directly

Do not rewrite or globally redesign files inside:

````md
```txt
src/components/ui/
```

These are low-level primitives. Keep them stable.

Official AiXia design components live in:

```txt
src/components/aixia/
```

Official shared design classes live in:

```txt
src/styles/aixia-design-system.css
```

The `src/components/ui/` files can still be used internally, but pages should prefer the official AiXia components and classes when being standardized.

---

## 2. Do not paste raw HTML templates into React pages

Never add the following inside React page components:

```html
<html>
<head>
<body>
<script src="https://cdn.tailwindcss.com">
<style type="text/tailwindcss">
```

The uploaded HTML design files are visual references only.

AiXia pages must be React/TypeScript components using the existing project structure.

Correct structure:

```txt
index.html
  root document only

src/main.tsx
  mounts React into #root

src/App.tsx
  routes/layout only

src/app/...
  page components

src/styles/aixia-design-system.css
  shared visual classes

src/components/aixia/
  reusable AiXia design components
```

Do not inject Tailwind CDN, `<head>`, `<body>`, or page-level `<script>` refresh logic into React pages.

---

## 3. Required page structure

Every AiXia page should use the official AiXia design system.

Preferred structure:

```tsx
AixiaPage
  AixiaHero
  metric cards where relevant
  AixiaSection
  AixiaTableShell where relevant
  AixiaModal where relevant
```

Use this import when possible:

```tsx
import {
  AixiaBadge,
  AixiaButton,
  AixiaHero,
  AixiaMetricCard,
  AixiaModal,
  AixiaPage,
  AixiaSection,
  AixiaSortableHeader,
  AixiaTableShell,
} from "@/components/aixia";
```

The page should not create a new visual language unless the user explicitly asks.

---

## 4. Parent navigation rule

Internal child pages must have a parent pill inside the hero.

Examples:

```txt
/finance/master-data/payment-terms
Parent label: Master Data
Parent path: /finance/master-data

/finance/transactions/invoices
Parent label: Transactions
Parent path: /finance/transactions

/finance/transactions/invoices/[id]
Parent label: Invoices
Parent path: /finance/transactions/invoices

/finance/transactions/quotations/new
Parent label: Quotations
Parent path: /finance/transactions/quotations
```

Do not label this button “Back”.

Use the parent destination name.

Top-level hub pages do not need a parent pill.

Examples of top-level or hub pages:

```txt
/finance
/finance/master-data
/finance/transactions
/finance/reports
/finance/settings
```

---

## 5. Preserve logic rule

When redesigning a page, preserve all existing:

* Supabase queries
* RPC calls
* backend functions
* Edge Function calls
* route paths
* permissions
* validation
* business logic
* handlers
* state meaning
* archive/delete behavior
* document lifecycle logic
* file upload logic
* storage bucket logic
* print/export logic
* currency conversion logic
* linked-record logic
* existing table/field relationships

Only change design/layout unless the user explicitly asks to change logic.

Do not remove working logic because it looks unused.

Do not shorten a large working page into a smaller page by accidentally deleting behavior.

If a field, table, RPC, or backend relationship is uncertain, do not guess. Ask for a schema/test SQL result first.

---

## 6. Soft Refresh Rule — Mandatory on All AiXia Pages

Every AiXia page must use soft refresh behavior.

Soft refresh means:

* Initial page load may show a full loading state.
* After initial load, refresh must happen silently.
* Never reload the full page.
* Never replace the whole page with a loading screen after initial load.
* Never call `window.location.reload()`.
* Never call `window.scrollTo(0, 0)` during data refresh.
* Never reset scroll position.
* Never reset search input.
* Never reset filters.
* Never reset sorting.
* Never reset selected tabs.
* Never close open modals.
* Never collapse expanded sections.
* Never reset edit forms.
* Never clear selected rows unless the selected row was deleted or access was removed.
* Only update data state in place.
* Use Supabase realtime where useful.
* Use a 60-second fallback interval where useful.
* Show only small inline “updating” indicators when needed.

Required behavior:

```txt
loadPage("initial")
  may set initialLoading

loadPage("silent")
  must not reset UI state

Realtime callbacks
  must call loadPage("silent")

60-second fallback interval
  must call loadPage("silent")

Unmount cleanup
  must remove Supabase channels and clear intervals
```

### 6.1 Required soft refresh code pattern

Use this pattern as the baseline for pages that load Supabase data:

```tsx
type LoadMode = "initial" | "silent";

const [initialLoading, setInitialLoading] = useState(true);
const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);

const loadPage = useCallback(async (mode: LoadMode = "initial") => {
  if (mode === "initial") {
    setInitialLoading(true);
  } else {
    setBackgroundRefreshing(true);
  }

  try {
    // Load page data here.
    // Do not reset search.
    // Do not reset filters.
    // Do not reset sort.
    // Do not reset selected tabs.
    // Do not close modals.
    // Do not scroll to top.
    // Only update data state.
  } catch (error) {
    console.error("Failed to load page:", error);
  } finally {
    if (mode === "initial") {
      setInitialLoading(false);
    } else {
      setBackgroundRefreshing(false);
    }
  }
}, []);

useEffect(() => {
  void loadPage("initial");
}, [loadPage]);

useEffect(() => {
  const channel = supabase
    .channel("unique-page-channel-name")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "table_name" },
      () => void loadPage("silent")
    )
    .subscribe();

  const intervalId = window.setInterval(() => {
    void loadPage("silent");
  }, 60000);

  return () => {
    window.clearInterval(intervalId);
    void supabase.removeChannel(channel);
  };
}, [loadPage]);
```

Every page rewrite must be checked against this rule before code is delivered.

---

## 7. Registry/list page rule

Registry/list pages must use:

* `AixiaPage`
* `AixiaHero`
* metric cards where useful
* `AixiaSection`
* search
* filters
* sortable table headers
* sticky table header
* horizontal scroll for wide tables
* vertical scroll after about 10 visible rows
* actions aligned on the far right
* archive popup when archive/delete exists
* soft refresh
* permission-aware action buttons

Default sort should be newest first when the data has `created_at` or `updated_at`.

Recommended registry structure:

```tsx
AixiaPage
  AixiaHero
    parent pill if internal child page
    badges
    title
    description
    primary actions

  metric cards

  AixiaSection
    search/filter toolbar
    AixiaTableShell
      sticky header
      sortable headers
      rows
      right-aligned actions

  AixiaModal
    archive/delete modal where relevant
```

Registry rows should not become cramped. Wide tables should scroll horizontally.

Long tables should show around 10 visible rows and then scroll vertically inside the table body.

---

## 8. Detail/ID page rule

Detail pages must use:

* hero with parent pill
* document identity
* status badges
* main actions
* overview section
* financial/settings section where relevant
* parties/details section where relevant
* line items section where relevant
* attachments/activity section where relevant

Editing should happen in the same visual position when possible.

Do not move fields to a totally different layout during edit mode unless required.

Preferred detail-page behavior:

```txt
View mode:
  readable summary sections

Edit mode:
  same section, same position, fields become inputs

Save/cancel:
  action stays inside the section or section header
```

Line-item detail/edit pages should use readable card-based line items where inline editing is needed.

Registry/list pages use tables. Detail pages with editable line items can use card blocks.

---

## 9. New/create page rule

Create pages must use:

* parent pill to registry page
* hero describing draft/create mode
* left main form column
* right summary column where useful
* Save Draft or Create action as primary
* readable form cards
* no cramped fields
* soft refresh for supporting dropdown/master-data data
* no manual page reload after save unless route navigation is intentional

Preferred create-page structure:

```tsx
AixiaPage
  AixiaHero
    parent pill
    create/draft badges
    title
    description
    primary action

  grid:
    left column:
      form sections
      line items if relevant

    right column:
      live summary
      selected company/client/vendor/bank details
      totals/status preview
```

New/create pages must preserve backend/RPC flows. Do not replace server-side creation logic with frontend-only logic.

---

## 10. Archive / Delete Rule — Official AiXia Registry Pattern

Archive/delete behavior is mandatory for most registry/list pages where the backend supports long-term record lifecycle states.

This rule applies to business records, finance documents, master data, transaction records, approvals, requests, payments, expenses, payroll records, vendors, clients, companies, items, terms, categories, and similar entities.

The official reference behavior is the Quotations Registry pattern.

### 10.1 Backend support must be confirmed first

Before adding archive/delete behavior to any page, confirm what the backend supports.

Check the table, functions, and status rules for:

* `archived` status support
* `deleted` status support
* existing archive function
* existing soft-delete function
* existing restore function
* existing hard-delete function
* status check constraints
* metadata storage for `previous_status`
* permission requirements
* whether hard delete is allowed at all

Never invent frontend-only archive/delete behavior that is not backed by the database.

If the backend only supports `archived`, the page must show only archived behavior.

If the backend supports both `archived` and `deleted`, the page must use the full archive/delete pattern.

### 10.2 Active registry rule

The normal registry/list page must show active/current records only.

The active registry must exclude:

* archived records
* deleted records, if the backend supports deleted status

For tables that support both statuses, the active query should use this pattern or equivalent:

```tsx
.not("status", "in", '("archived","deleted")')
```

For frontend filtering, use equivalent logic:

```tsx
const activeRows = rows.filter(
  (row) => row.status !== "archived" && row.status !== "deleted"
);
```

The active registry may show these row actions:

* Open / View
* Edit, if allowed
* Archive, if backend supports archive and user has permission
* Delete, if backend supports soft delete and user has permission

The active registry must never show Hard Delete.

Hard Delete belongs only inside the Deleted tab of the Archive modal.

### 10.3 Archive action rule

Archive is a soft lifecycle action.

Archive means the record is hidden from the active registry but kept historically.

Use the existing backend archive function if one exists.

If no function exists and direct status update is the established backend pattern, update:

```tsx
status: "archived"
```

Archive action must:

* check permission before running
* set an action loading state for the affected row
* keep the page stable
* keep search/filter/sort state unchanged
* keep selected tabs unchanged
* keep modals open
* refresh data silently after completion
* never call `window.location.reload()`
* never call `window.scrollTo(0, 0)`

Required post-action refresh:

```tsx
await loadPage("silent");
```

or, if archive modal data is loaded separately:

```tsx
await Promise.all([
  loadPage("silent"),
  isArchiveModalOpen ? loadArchiveRows("silent") : Promise.resolve(),
]);
```

### 10.4 Delete action rule

Delete means soft delete, not permanent delete.

Delete should move the record to the Deleted tab inside the Archive modal.

Use the existing backend soft-delete function if one exists.

If no function exists and direct status update is the established backend pattern, update:

```tsx
status: "deleted"
```

Delete action must:

* check permission before running
* set an action loading state for the affected row
* hide the record from the active registry
* move it to Deleted tab data
* refresh silently after completion
* never hard delete from the active registry
* never reset search/filter/sort/tabs/modals/scroll

Required post-action refresh:

```tsx
await loadPage("silent");
```

or:

```tsx
await Promise.all([
  loadPage("silent"),
  isArchiveModalOpen ? loadArchiveRows("silent") : Promise.resolve(),
]);
```

If the backend does not support `deleted`, do not create a Deleted tab and do not add a Delete button.

### 10.5 Archive modal rule

Pages with archive/delete behavior must use an Archive modal/popup.

The archive modal must use the official AiXia design system:

* `AixiaModal`
* `AixiaTableShell`
* sticky table header
* horizontal scroll for wide tables
* vertical scroll after about 10 visible rows
* dark glass styling
* standard badges
* standard buttons
* right-aligned actions

When the backend supports both `archived` and `deleted`, the modal must have two tabs:

* Archived
* Deleted

Use this state pattern:

```tsx
const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">("archived");
```

The modal should load both archived and deleted records:

```tsx
.in("status", ["archived", "deleted"])
```

Then filter visible modal rows by selected tab:

```tsx
const visibleArchiveRows = archiveRows.filter(
  (row) => String(row.status) === archiveTab
);
```

The archive modal must remain open after archive/delete/restore/hard-delete actions unless the user closes it manually.

### 10.6 Archived tab rule

The Archived tab shows records with:

```tsx
status === "archived"
```

Archived tab row actions should normally include:

* Open / View, if useful
* Restore

Archived tab must not show:

* Edit
* Archive
* Delete
* Hard Delete, unless the backend/business rules explicitly allow permanent delete from archived records

The preferred standard is:

```txt
Archived tab = Open/View + Restore
```

### 10.7 Deleted tab rule

The Deleted tab shows records with:

```tsx
status === "deleted"
```

Deleted tab row actions should include:

* Open / View, if useful
* Restore
* Hard Delete, only if the user has the correct delete/admin permission and the backend allows it

The standard is:

```txt
Deleted tab = Open/View + Restore + Hard Delete
```

Hard Delete must only appear when:

```tsx
archiveTab === "deleted"
```

Pattern:

```tsx
{archiveTab === "deleted" ? (
  <HardDeleteButton />
) : null}
```

Hard Delete must never appear on the active registry.

### 10.8 Restore action rule

Restore moves an archived or deleted record back to its previous business status.

Use the existing backend restore function if one exists.

If no restore function exists and direct status update is the established backend pattern, restore should use `metadata.previous_status` when available.

Preferred restore logic:

```tsx
const previousStatus =
  typeof metadata.previous_status === "string" &&
  metadata.previous_status.trim() !== ""
    ? metadata.previous_status
    : "draft";
```

Then update:

```tsx
status: previousStatus
```

Fallback to `draft` only if no previous status exists.

Restore action must:

* check permission before running
* keep archive modal open
* keep selected archive tab unchanged
* refresh active list silently
* refresh archive modal rows silently
* never reset page search/filter/sort/scroll
* never reload the full page

Required refresh:

```tsx
await Promise.all([
  loadPage("silent"),
  loadArchiveRows("silent"),
]);
```

### 10.9 Hard delete action rule

Hard Delete means permanent database deletion.

Hard Delete is destructive and must be treated differently from soft delete.

Hard Delete must:

* only appear inside the Deleted tab
* never appear in the active registry
* require the correct delete/admin permission
* use existing backend hard-delete function if one exists
* otherwise use direct `.delete()` only if allowed by backend/RLS/business rules
* set action loading state
* refresh silently after completion
* keep the modal open
* keep the selected archive tab unchanged

Direct hard-delete pattern, only when allowed:

```tsx
await supabase
  .from("table_name")
  .delete()
  .eq("id", id);
```

Then:

```tsx
await Promise.all([
  loadPage("silent"),
  loadArchiveRows("silent"),
]);
```

### 10.10 Permission rule for archive/delete actions

Every archive/delete/restore/hard-delete action must check permissions before running.

Permission checks must happen before the action executes.

If the user lacks permission:

* disable the button
* do not run the handler
* keep the row visible
* keep UI stable
* show clear permission messaging where needed
* never bypass permissions for convenience

Typical permission mapping:

```txt
Open/View        → read/view permission
Edit             → update/edit permission
Archive          → archive/delete permission
Soft Delete      → archive/delete permission
Restore          → archive/delete or admin permission, depending on backend rule
Hard Delete      → delete/admin permission only
```

Use the existing project permission system.

Do not create a separate permission system inside the page.

### 10.11 Previous status preservation rule

If a page uses direct update to archive/delete, preserve the previous business status before changing status whenever the backend supports metadata.

Preferred metadata pattern:

```tsx
metadata: {
  ...existingMetadata,
  previous_status: row.status,
}
```

Then archive:

```tsx
status: "archived"
```

or delete:

```tsx
status: "deleted"
```

Restore should read `metadata.previous_status`.

If the backend already handles previous status in a trigger or function, do not duplicate it in frontend.

### 10.12 Soft refresh requirement for archive/delete

All archive/delete/restore/hard-delete actions must follow the Soft Refresh Rule.

After these actions:

* do not reload the page
* do not scroll to top
* do not reset filters
* do not reset search
* do not reset sorting
* do not reset selected tabs
* do not close modals
* do not clear edit forms unless the edited record was affected
* do not replace the page with a full loading screen
* update only the affected data state
* show only row-level or small inline loading indicators

Use:

```tsx
loadPage("silent")
```

and, when the archive modal has separate data:

```tsx
loadArchiveRows("silent")
```

### 10.13 Required state pattern for archive/delete pages

Pages with archive/delete should normally include:

```tsx
type LoadMode = "initial" | "silent";

const [initialLoading, setInitialLoading] = useState(true);
const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
const [archiveTab, setArchiveTab] = useState<"archived" | "deleted">("archived");
const [archiveRows, setArchiveRows] = useState<RowType[]>([]);
const [archiveLoading, setArchiveLoading] = useState(false);
```

For pages that only support archived records and not deleted records:

```tsx
const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
const [archiveRows, setArchiveRows] = useState<RowType[]>([]);
const [archiveLoading, setArchiveLoading] = useState(false);
```

Do not create `archiveTab` if the backend does not support deleted records.

### 10.14 Required active query pattern

For tables supporting both archived and deleted:

```tsx
const { data, error } = await supabase
  .from("table_name")
  .select("...")
  .not("status", "in", '("archived","deleted")')
  .order("created_at", { ascending: false });
```

For tables supporting only archived:

```tsx
const { data, error } = await supabase
  .from("table_name")
  .select("...")
  .neq("status", "archived")
  .order("created_at", { ascending: false });
```

If the table does not use a `status` column, use the existing backend lifecycle fields. Do not invent status values.

### 10.15 Required archive modal query pattern

For tables supporting both archived and deleted:

```tsx
const { data, error } = await supabase
  .from("table_name")
  .select("...")
  .in("status", ["archived", "deleted"])
  .order("created_at", { ascending: false });
```

For tables supporting only archived:

```tsx
const { data, error } = await supabase
  .from("table_name")
  .select("...")
  .eq("status", "archived")
  .order("created_at", { ascending: false });
```

### 10.16 Required UI behavior checklist

Before delivering any rewritten registry/list page with archive/delete, verify:

* Active registry excludes archived records.
* Active registry excludes deleted records when deleted is supported.
* Active registry has Open/View action.
* Active registry has Archive action where supported.
* Active registry has Delete action only where soft delete is supported.
* Active registry does not show Hard Delete.
* Archive modal exists where archive/delete behavior exists.
* Archive modal has Archived and Deleted tabs when backend supports both.
* Archive modal has only Archived view when backend supports only archived.
* Archived tab shows archived records only.
* Deleted tab shows deleted records only.
* Archived tab has Restore.
* Deleted tab has Restore + Hard Delete.
* Hard Delete appears only in Deleted tab.
* Restore returns record to previous business status where possible.
* All archive/delete actions check permissions.
* All archive/delete actions use row-level/action loading.
* All archive/delete actions use silent refresh.
* Archive modal stays open after restore/delete/hard-delete.
* Search/filter/sort/tabs/modals/scroll are not reset.
* No fake frontend-only deleted behavior is added without backend support.

---

## 11. Permission rule

Every action must check permissions before running.

If user lacks permission:

* disable the action
* keep UI stable
* show clear permission message where needed
* never bypass permission checks for convenience

Permission logic must use the existing project permission system.

Typical permission requirements:

```txt
Read/View        → view/read permission
Create           → create permission
Update/Edit      → update/edit permission
Archive          → archive/delete permission
Soft Delete      → archive/delete permission
Restore          → archive/delete or admin permission depending on backend
Hard Delete      → delete/admin permission only
Approve/Execute  → approve/execute permission
```

Never create a separate page-specific permission system if the shared project permission system already supports the action.

---

## 12. Code delivery rule

When rewriting pages:

* identify exact file path
* preserve logic
* provide full file or full replaceable section
* no vague “paste below”
* no raw snippets that appear more than once
* if code is long, split into large continuous parts
* do not remove existing logic unless explicitly requested
* do not guess backend tables/columns/functions
* ask for SQL test results when backend structure is uncertain
* provide exact SQL test queries when needed

---

## 13. Visual rule

Use the official classes from:

```txt
src/styles/aixia-design-system.css
```

Prefer:

* `aixia-page`
* `aixia-shell`
* `aixia-hero`
* `aixia-section`
* `aixia-glass`
* `aixia-btn-primary`
* `aixia-btn-secondary`
* `aixia-badge`
* `aixia-input`
* `aixia-select`
* `aixia-table`
* `aixia-modal`

Do not create random new visual languages per page.

---

## 14. Execution workflow rule

The user works in this project with the following workflow:

```txt
Frontend/page/code changes:
  done directly in GitHub

Vercel:
  automatically builds after GitHub changes

Backend SQL/table/function/RLS changes:
  done directly in Supabase

Supabase Edge Functions:
  managed directly in Supabase, not GitHub

Backend workflow:
  AI sends test SQL first
  user pastes SQL result
  then AI decides exact backend changes
```

Do not assume backend changes can be made in GitHub.

Do not include Supabase Edge Function code as if it should be committed to GitHub unless the user explicitly says the function is managed in the repository.

When backend/table/column/function details are uncertain, first provide test SQL and wait for the user’s pasted result.

After frontend code changes, Vercel build result is the source of truth for frontend compile errors.

If the Vercel build fails, fix only the reported frontend error unless a deeper related issue is clearly proven.

---

## 15. Soft Refresh Rule — Mandatory on All AiXia Pages

Every AiXia page must use soft refresh behavior.

Soft refresh means:

* Initial page load may show a full loading state.
* After initial load, refresh must happen silently.
* Never reload the full page.
* Never replace the whole page with a loading screen after initial load.
* Never call `window.location.reload()`.
* Never call `window.scrollTo(0, 0)` during data refresh.
* Never reset scroll position.
* Never reset search input.
* Never reset filters.
* Never reset sorting.
* Never reset selected tabs.
* Never close open modals.
* Never collapse expanded sections.
* Never reset edit forms.
* Never clear selected rows unless the selected row was deleted or access was removed.
* Only update data state in place.
* Use Supabase realtime where useful.
* Use a 60-second fallback interval where useful.
* Show only small inline “updating” indicators when needed.

Required pattern:

* `loadPage("initial")` may set `initialLoading`.
* `loadPage("silent")` must not reset UI state.
* Realtime callbacks must call `loadPage("silent")`.
* 60-second fallback interval must call `loadPage("silent")`.
* Cleanup must remove Supabase channels and clear intervals on unmount.

### 15.1 Required soft refresh code pattern

```tsx
type LoadMode = "initial" | "silent";

const [initialLoading, setInitialLoading] = useState(true);
const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);

const loadPage = useCallback(async (mode: LoadMode = "initial") => {
  if (mode === "initial") {
    setInitialLoading(true);
  } else {
    setBackgroundRefreshing(true);
  }

  try {
    // Load page data here.
    // Do not reset search.
    // Do not reset filters.
    // Do not reset sort.
    // Do not reset selected tabs.
    // Do not close modals.
    // Do not scroll to top.
    // Only update data state.
  } catch (error) {
    console.error("Failed to load page:", error);
  } finally {
    if (mode === "initial") {
      setInitialLoading(false);
    } else {
      setBackgroundRefreshing(false);
    }
  }
}, []);

useEffect(() => {
  void loadPage("initial");
}, [loadPage]);

useEffect(() => {
  const channel = supabase
    .channel("unique-page-channel-name")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "table_name" },
      () => void loadPage("silent")
    )
    .subscribe();

  const intervalId = window.setInterval(() => {
    void loadPage("silent");
  }, 60000);

  return () => {
    window.clearInterval(intervalId);
    void supabase.removeChannel(channel);
  };
}, [loadPage]);
```

Every page rewrite must be checked against this rule before code is delivered.

---

## 16. AI Working / Code Delivery Rule — Mandatory for Every New Chat Window

This section is a hard instruction for any AI/developer working on AiXia.

The user frequently changes AI windows. Every new AI must follow this working method exactly.

### 16.1 No vague instructions

Never give vague instructions such as:

- “find this”
- “paste below”
- “add after”
- “place it under”
- “replace the function”
- “change this part”
- “update the section”
- “insert near”
- “look for something like this”

The user must never be expected to guess what to select or where to paste.

Every change must clearly define:

- exact file path
- exact change type
- exact unique section/block/line to select
- exact replacement to paste in the same place

### 16.2 Required delivery format

Every code change must use this exact format:

```txt
FILE:
exact/path/to/file.tsx

CHANGE TYPE:
FULL FILE / SECTION / BLOCK / LINE

SELECT THIS EXACT SECTION:
[paste the exact unique section from the user’s file]

PASTE THIS EXACT SECTION IN THE SAME PLACE:
[paste the complete replacement section]
```

Use `FULL FILE` only when replacing the entire file.

Use `SECTION` for large page areas or multi-function areas.

Use `BLOCK` for a smaller unique JSX/function/object block.

Use `LINE` only when the line is unique and appears one time only.

If a line appears more than once, do not use a line change. Use a larger block or section with unique anchors.

### 16.3 Unique anchor rule

Every selected section/block/line must be uniquely identifiable.

A valid selected section must include enough surrounding code so the user can select it without confusion.

Bad:

```txt
SELECT THIS:
<div>
```

Good:

```tsx
<section className="aixia-section aixia-glass-hover">
  <div className="aixia-section-header">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      ...
    </div>
  </div>
</section>
```

If uniqueness is not certain, ask the user to upload the file before writing code.

### 16.4 Prefer large sections over many small edits

When changes are close together, use one large section replacement.

Do not give 10 small edits when one larger section replacement can safely cover the same area.

Preferred:

```txt
one large SECTION replacement
```

Avoid:

```txt
many small LINE/BLOCK replacements near each other
```

Large sections reduce mistakes and are easier for the user to copy/paste.

### 16.5 Long file delivery rule

For long files, deliver continuous sections of 600–700 lines minimum.

Less than 600 lines for a long-file section is a fatal mistake unless the file ends.

Rules:

- 600–700 lines per part is preferred.
- More than 700 lines is acceptable if needed.
- Less than 600 lines is only acceptable when it is the final part and the file ends.
- Each part must be continuous.
- Do not skip around the file.
- Do not send fragmented snippets from different places unless explicitly requested.
- After each long part, stop and wait for the user to confirm before continuing.

### 16.6 No guessing rule

Do not guess file structure, backend schema, table columns, function names, route names, storage buckets, permissions, or business logic.

If uncertain:

- ask the user to upload the relevant file
- or provide exact SQL test queries
- or ask for the Vercel/Supabase error result

Do not write code based on assumptions.

### 16.7 Preserve existing logic rule

When rewriting or redesigning a page, preserve all existing working logic unless the user explicitly asks to change it.

Do not remove:

- Supabase queries
- RPC calls
- Edge Function calls
- permissions
- validation
- route paths
- handlers
- archive/delete logic
- soft refresh logic
- modals
- filters
- sorting
- selected tabs
- file upload logic
- print/export logic
- currency conversion logic
- linked-record logic
- backend-controlled workflow logic

Design changes must not silently remove business logic.

### 16.8 Minimal explanation rule

The user does not want long explanations unless they ask.

Default response style for code work:

- exact file path
- change type
- exact selected section
- exact replacement section
- short note only if necessary

Do not over-explain.

### 16.9 No images unless explicitly requested

Do not generate images unless the user explicitly asks for an image.

For UI/code work, provide code or copy-paste instructions only.

Do not use image generation for design/code tasks.

### 16.10 If unsure, ask for the file

If the AI cannot identify the exact unique section, it must ask the user to upload the file.

Do not provide approximate edits.

Do not say “find the similar section.”

Do not assume the user knows what to do.

### 16.11 Required behavior before delivering code

Before delivering code, check:

- Is the file path exact?
- Is the change type clearly labeled?
- Is the selected text unique?
- Is the replacement complete?
- Are nearby edits grouped into one large section where possible?
- Is existing logic preserved?
- Are archive/delete rules preserved where relevant?
- Are soft refresh rules preserved?
- Are permissions preserved?
- Are there no vague placement instructions?
- Are there no generated images?
- If the file is long, is the part at least 600 lines unless it ends?

If any answer is no, fix the response before sending it.
