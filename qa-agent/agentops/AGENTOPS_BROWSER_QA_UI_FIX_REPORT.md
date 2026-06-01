# AgentOps Browser QA UI Fix Report

## Scope

Browser QA on `http://127.0.0.1:5173/system/agent-ops` (staging, Owner session). UI-only fixes — no service/Supabase changes.

## QA run

| Check | Result |
| --- | --- |
| `npm run qa:agentops-owner-smoke` | Run after fixes (tab navigation assertions) |
| Console errors on page | None observed |
| Network 4xx on load | None observed |

## Issues found and fixed

### 1. Import review — stacked duplicate warning panels

**Problem:** Five identical-style `AixiaInfoBlock` cards for global warnings (wall of amber panels).

**Fix:** Single block with bulleted list (`Review warnings (N)`).

### 2. Tab content pushed below fold

**Problem:** Command center snapshot duplicated hero metrics on every tab; Generate/Fix content required long scroll.

**Fix:** Command center snapshot only on **Today's Work** tab. Sticky tab bar below hero.

### 3. Import candidate table — wide centered cells

**Problem:** Issue column ~665px wide, centered text, large vertical gaps (nested table + global center align).

**Fix:** `AixiaTableTextCell` / shared cells, `agentops-dense-table` CSS (left align, fixed layout, compact rows).

### 4. Manual Scan workflow too long

**Problem:** Many steps + import shortcuts always expanded.

**Fix:** `<details>` for workflow steps (open by default) and import shortcuts (collapsed by default).

### 5. Fix Plan Review — huge prompt textareas

**Problem:** Full-height readonly prompts dominated Fix tab.

**Fix:** Cursor prompt in collapsed `<details>` (shorter default height when opened).

### 6. All registry tables center-aligned

**Problem:** Global `.aixia-table td { text-align: center }` hurt AgentOps readability.

**Fix:** `agentops-dense-table` wrapper on all AgentOps registry tables + left-aligned headers/cells.

### 7. Smoke test out of date

**Problem:** Expected Hermes/import on initial paint; UI moved to tabs.

**Fix:** `agentops-owner-readonly-smoke.spec.mjs` clicks Generate / Fix / System tabs and asserts section visibility.

## Files modified

- `src/app/system/agent-ops/page.tsx`
- `src/styles/aixia-design-system.css` (`.agentops-dense-table` rules)
- `qa-agent/browser-qa/tests/agentops-owner-readonly-smoke.spec.mjs`

## Preserved

All actions, modals, service calls, safety boundaries (no scheduler, no CLI from UI).
