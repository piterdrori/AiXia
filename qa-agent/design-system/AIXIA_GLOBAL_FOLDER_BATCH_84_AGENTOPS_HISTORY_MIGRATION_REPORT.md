# AiXia Global Design System — Batch 84 — AgentOps History Migration Report

**Date:** 2026-05-30  
**Type:** Design-only page migration — one route  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/history`  
**File:** `src/app/system/agent-ops/history/page.tsx`  
**Reference:** `/system/agent-ops/council` (Council command-shell pattern)

---

## 1. Purpose

Migrate AgentOps History from legacy orb/default shell to the global command shell pattern using existing shared AiXia components. Design-only — no business logic, data, API, or workflow changes.

---

## 2. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/history/page.tsx` | Command-shell migration |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 39 status only |

**No other files changed** — Council, Issues, Hub, orb routes, shared components, CSS, guardrails, package scripts, Hermes config untouched.

---

## 3. Before migration summary

| Aspect | Before |
|--------|--------|
| **Imports** | `AixiaPage`, `AixiaHero`, `AixiaSection`, `AixiaTableShell`, … |
| **Shell** | `AixiaPage` (default/orb — no `surface="command"`) |
| **Hero** | `AixiaHero` without `surface="command"` |
| **Meta strip** | None |
| **Layout wrapper** | `<div className="space-y-6">` inside `AixiaPage` |
| **KPI summary** | Local Tailwind 6-col grid (`rounded-xl border …`) |
| **Sections** | `AixiaSection` without `surface="command"` |
| **Loading fallback** | Local Tailwind div |
| **Access denied** | `AixiaPage` + manual scroll div |

**Logic preserved unchanged:** all hooks, state, `loadData`, timeline/filter useMemos, `copyPath`, API calls, filter handlers, tables, reports disclosure, navigation.

---

## 4. Components / patterns used

| Component | Usage |
|-----------|--------|
| `AixiaCommandPageLayout` | Command shell wrapper (hero + scroll region) |
| `AixiaHero` | `surface="command"`, gradient title, badges, actions |
| `AixiaCommandHubMetaStrip` | `variant="command"` scroll-lead meta row |
| `AixiaSection` | `surface="command"` on summary + activity sections |
| `AixiaSmartGrid` | `mode="metrics" surface="command"` for summary KPIs |
| `AixiaValueBlock` | Six summary metrics |
| `AixiaEmptyState` | Loading fallback (Council-aligned) |
| `AixiaAsyncState` | Unchanged loading gate |
| `AixiaTableShell` | Unchanged report tables |
| `AixiaInfoBlock`, `AixiaBadge`, `AixiaButton` | Unchanged behavior |

---

## 5. What changed visually

- Page uses **locked command shell** (`AixiaCommandPage` via layout) instead of default `AixiaPage`
- Hero uses **command surface** rhythm matching Council
- **Meta strip** added below hero with runs / verification / decisions / read-only context
- Summary KPIs use **shared metrics grid** (`AixiaSmartGrid` + `AixiaValueBlock`) instead of local Tailwind cards
- Sections use **`surface="command"`**
- Loading state uses **`AixiaEmptyState`** instead of raw Tailwind placeholder
- Refresh button shows **spin animation** while loading (Council parity)

**Unchanged visually (deferred):** filter row raw `<input>`/`<select>`, timeline row cards, Reports `<details>` blocks — same markup/handlers; owner-file proposal below.

---

## 6. What logic was preserved

- All `useState` / `useCallback` / `useEffect` / `useMemo` blocks
- `loadData` — same API calls, error handling, `setFeedback(null)` on refresh
- Timeline construction and `classifyStatus`
- Filters: `actionFilter`, `statusFilter`, `rangeFilter`, `issueFilter` — same state keys and handlers
- `filteredTimeline` logic unchanged
- `summary` calculations unchanged
- `copyPath`, navigate to issues, copy report paths
- Owner access gate logic
- `data-testid="agentops-history"` preserved

---

## 7. What was not changed

- Business logic, Supabase, API signatures, route paths, permissions
- Filter/search/sort behavior
- Modals/actions (none added/removed)
- Hermes/memory/AgentMemory logic
- CSS files
- Shared components
- Guardrail scripts (History still on `LEGACY_SHELL_HERO_DEBT_FILES` — remove in separate guardrail-alignment batch)
- All other AgentOps routes
- Finance proofs, command-surface context, CSS split, deletion, production/main

---

## 8. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** (built in ~1m 11s) |
| TypeScript / linter on changed file | **No errors** |

---

## 9. Browser QA

**Not run** — dev server not started in this batch.

### Manual QA checklist

1. Open `/system/agent-ops/history` as AgentOps owner
2. Compare shell/hero/meta rhythm to `/system/agent-ops/council`
3. Confirm meta strip shows four items below hero
4. Confirm six summary value blocks in History summary section
5. Change filters — list updates; scroll position stable
6. Click Refresh — data reloads; filters preserved; no full-page flash
7. Copy path on timeline row — clipboard feedback appears
8. Open issue from timeline — navigation works
9. Expand Reports `<details>` — tables and copy actions work
10. Test at 1280×800 and normal desktop — no horizontal page overflow
11. Console — no new errors

---

## 10. Owner-file improvement proposals

| Gap | Proposal | Route to |
|-----|----------|----------|
| Filter row uses raw `<input>`/`<select>` | Standardize on shared field components when approved | Owner `07`/`08` |
| Timeline list rows use local Tailwind cards | Shared list-row pattern if one exists globally | Owner `06`/`08` |
| Reports block uses nested `<details>` | Consider `AixiaProgressiveDisclosureGroup` in future batch | Owner `06` |
| Guardrail debt list still includes History path | Remove from `LEGACY_SHELL_HERO_DEBT_FILES` after visual sign-off | Owner `15` + guardrail batch |

**Do not implement these locally without Piter approval.**

---

## 11. Recommended next batch

**Batch 85 — AgentOps Issues queue migration**

- **Route:** `/system/agent-ops/issues`
- **File:** `src/app/system/agent-ops/issues/page.tsx`
- **Pattern:** Same as History/Council — replace local h1 with command hero + meta strip + `AixiaCommandPageLayout`
- **Gate:** Scope confirmation or direct implementation per Piter choice
- **Do not:** Hub migration, finance proofs, command-surface, CSS split, guardrail escalation, deletion

Optional parallel follow-up: guardrail allowlist trim for History (warn-only shrink).

---

## 12. No other routes migrated

Confirmed. Only `/system/agent-ops/history` was edited.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `history/page.tsx`, `16-design-file-cleanup-map.md` (status only) |
| 2 | History route migrated | **Yes** |
| 3 | Council route changed | **No** |
| 4 | Other AgentOps routes changed | **No** |
| 5 | Shared components changed | **No** |
| 6 | CSS changed | **No** |
| 7 | Business logic changed | **No** |
| 8 | Data loading/API/Supabase changed | **No** |
| 9 | Filters/search/sort/actions preserved | **Yes** |
| 10 | Modals/loading/error/empty states preserved | **Yes** |
| 11 | Command shell used | **Yes** — `AixiaCommandPageLayout` |
| 12 | Hero aligned | **Yes** — `AixiaHero surface="command"` |
| 13 | Meta strip added/aligned | **Yes** — `AixiaCommandHubMetaStrip` |
| 14 | Local orb/default shell removed from History | **Yes** — `AixiaPage` removed |
| 15 | Silent refresh/no-jump preserved | **Yes** — no remount keys; filter state unchanged on refresh |
| 16 | `npm run qa:validate-foundation` | **PASS** |
| 17 | `npm run build` | **PASS** |
| 18 | Browser QA | **Not run** — manual checklist §9 |
| 19 | Page migrations limited to History only | **Yes** |
| 20 | Finance proofs paused | **Yes** |
| 21 | Command-surface context paused | **Yes** |
| 22 | CSS split paused | **Yes** |
| 23 | Final status | **COMPLETE** |
| 24 | Recommended next batch | **Batch 85** — Issues queue migration |

---

## Related

- Scope plan: `AIXIA_GLOBAL_FOLDER_BATCH_83_AGENTOPS_MIGRATION_SCOPE_PLAN.md`
- Reference: `src/app/system/agent-ops/council/page.tsx`
