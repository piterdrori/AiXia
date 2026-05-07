# AiXia React Design + Implementation Standard

This is the official AiXia page-building standard.

## 1. Do not edit base UI primitives directly

Do not rewrite or globally redesign files inside:

src/components/ui/

These are low-level primitives. Keep them stable.

Official AiXia design components live in:

src/components/aixia/

Official shared design classes live in:

src/styles/aixia-design-system.css

## 2. Do not paste raw HTML templates into React pages

Never add the following inside React page components:

<html>
<head>
<body>
<script src="https://cdn.tailwindcss.com">
<style type="text/tailwindcss">

The uploaded HTML design files are visual references only.

AiXia pages must be React/TypeScript components using the existing project structure.

## 3. Required page structure

Every AiXia page should use:

AixiaPage
  AixiaHero
  metric cards where relevant
  AixiaSection
  AixiaTableShell where relevant
  AixiaModal where relevant

Use:

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

## 4. Parent navigation rule

Internal child pages must have a parent pill inside the hero.

Examples:
- /finance/master-data/payment-terms → parent label: Master Data, parent path: /finance/master-data
- /finance/transactions/invoices → parent label: Transactions, parent path: /finance/transactions
- /finance/transactions/invoices/[id] → parent label: Invoices, parent path: /finance/transactions/invoices

Do not label this button “Back”.

Top-level hub pages do not need a parent pill.

## 5. Preserve logic rule

When redesigning a page, preserve all existing:
- Supabase queries
- RPC calls
- backend functions
- route paths
- permissions
- validation
- business logic
- handlers
- state meaning
- archive/delete behavior
- document lifecycle logic

Only change design/layout unless the user explicitly asks to change logic.

## 6. Soft refresh rule

After initial load:
- never reload the full page
- never reset scroll position
- never reset filters
- never reset search
- never reset sorting
- never reset selected tabs
- never close modals
- never collapse sections
- never replace the whole page with a loading screen
- update data silently in state
- use Supabase realtime where useful
- use a 60-second fallback interval where useful
- show only small inline loading indicators when needed

Allowed pattern:

loadPage("initial") may set initialLoading.
loadPage("silent") must not reset UI state.

## 7. Registry/list page rule

Registry pages must use:
- AixiaPage
- AixiaHero
- metric cards
- AixiaSection
- search
- filters
- sortable table headers
- sticky table header
- horizontal scroll for wide tables
- vertical scroll after about 10 visible rows
- actions aligned on the far right
- archive popup when archive/delete exists

Default sort should be newest first when the data has created_at or updated_at.

## 8. Detail/ID page rule

Detail pages must use:
- hero with parent pill, document identity, status badges, and main actions
- overview section
- financial/settings section where relevant
- parties/details section where relevant
- line items section where relevant
- attachments/activity section where relevant

Editing should happen in the same visual position when possible.

Do not move fields to a totally different layout during edit mode unless required.

## 9. New/create page rule

Create pages must use:
- parent pill to registry page
- hero describing draft/create mode
- left main form column
- right summary column where useful
- Save Draft or Create action as primary
- readable form cards
- no cramped fields

## 10. Archive/delete rule

Where supported by backend:
- active registry shows active/current records only
- archive action moves record to archived status
- delete action moves record to deleted status when backend supports deleted
- archive modal has Archived and Deleted tabs when backend supports both
- Archived tab: restore only
- Deleted tab: restore + hard delete only
- hard delete never appears on normal active registry

If backend only supports archived, do not invent deleted in frontend.

## 11. Permission rule

Every action must check permissions before running.

If user lacks permission:
- disable the action
- keep UI stable
- show clear permission message where needed
- never bypass permission checks for convenience

Permission logic must use the existing project permission system.

## 12. Code delivery rule

When rewriting pages:
- identify exact file path
- preserve logic
- provide full file or full replaceable section
- no vague “paste below”
- no raw snippets that appear more than once
- if code is long, split into large continuous parts
- do not remove existing logic unless explicitly requested

## 13. Visual rule

Use the official classes from:

src/styles/aixia-design-system.css

Prefer:
- aixia-page
- aixia-shell
- aixia-hero
- aixia-section
- aixia-glass
- aixia-btn-primary
- aixia-btn-secondary
- aixia-badge
- aixia-input
- aixia-select
- aixia-table
- aixia-modal

Do not create random new visual languages per page.

## 14. Build rule

After every standard/component/page change, run:

npm run build

Fix TypeScript and build errors before continuing.



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
    // IMPORTANT:
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


## Soft Refresh Rule — Mandatory on All AiXia Pages

Every AiXia page must use soft refresh behavior.

Soft refresh means:
- Initial page load may show a full loading state.
- After initial load, refresh must happen silently.
- Never reload the full page.
- Never replace the whole page with a loading screen after initial load.
- Never call `window.location.reload()`.
- Never call `window.scrollTo(0, 0)` during data refresh.
- Never reset scroll position.
- Never reset search input.
- Never reset filters.
- Never reset sorting.
- Never reset selected tabs.
- Never close open modals.
- Never collapse expanded sections.
- Never reset edit forms.
- Never clear selected rows unless the selected row was deleted or access was removed.
- Only update data state in place.
- Use Supabase realtime where useful.
- Use a 60-second fallback interval where useful.
- Show only small inline “updating” indicators when needed.

Required pattern:
- `loadPage("initial")` may set `initialLoading`.
- `loadPage("silent")` must not reset UI state.
- Realtime callbacks must call `loadPage("silent")`.
- 60-second fallback interval must call `loadPage("silent")`.
- Cleanup must remove Supabase channels and clear intervals on unmount.

Every page rewrite must be checked against this rule before code is delivered.

