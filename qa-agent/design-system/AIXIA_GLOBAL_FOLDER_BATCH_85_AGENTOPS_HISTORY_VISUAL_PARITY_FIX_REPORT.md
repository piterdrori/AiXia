# AiXia Global Design System — Batch 85 — AgentOps History Visual Parity Fix Report

**Date:** 2026-05-30  
**Type:** Design-only visual parity fix — one route  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/history`  
**File:** `src/app/system/agent-ops/history/page.tsx`

---

## 1. Purpose

Fix Batch 84 visual parity gaps on AgentOps History: remove floating hero badges, align hero hierarchy with Finance/Council command pages, improve meta strip and section/card rhythm, preserve all logic.

---

## 2. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/history/page.tsx` | Visual parity fixes |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 40 status only |

No other routes, shared components, or CSS files changed.

---

## 3. Visual issues found (Batch 84 / browser)

| Issue | Symptom |
|-------|---------|
| Floating hero badges | `Staging only` and `Read-only history` sat between parent pill and title |
| Weak hero hierarchy | No hero KPI row like Finance Transactions |
| Meta strip duplicated KPIs | Meta strip repeated summary counts instead of contextual status |
| Duplicate summary section | KPI grid in scroll body duplicated hero intent |
| Flat read-only block | Read-only rule not in command section rhythm |
| Loading state | Empty-state not inside section wrapper |
| Reports block | Top-level `<details>` outside section system |

---

## 4. Hero fixes

- **Removed** `badges` prop from `AixiaHero`
- **Added** `AixiaCommandMetrics` as hero children (Finance Transactions pattern)
- **Kept** parent pill → kicker (`AgentOps`) → title → subtitle → actions
- Six KPI cards now render in hero glass metric row with icons and footnotes

---

## 5. Badge / status relocation

| Former location | New location |
|-----------------|--------------|
| Hero badge: Staging only | Meta strip: Environment → Staging only |
| Hero badge: Read-only history | Meta strip: History access → Read-only |

No floating pills remain in the hero title area.

---

## 6. Meta strip fixes

Meta strip now carries **contextual status only** (not hero KPI duplicates):

| Item | Value | Role |
|------|-------|------|
| Environment | Staging only | Replaces hero badge |
| History access | Read-only | Replaces hero badge |
| Timeline scope | Timeline count | Contextual scope |
| Report artifacts | Fix-plan count | Contextual scope |

Uses `AixiaCommandHubMetaStrip variant="command"` below hero in scroll lead.

---

## 7. Card / section rhythm fixes

| Change | Component |
|--------|-----------|
| Removed duplicate scroll KPI section | — |
| Read-only rule | `AixiaSection surface="command"` + `AixiaInfoBlock` |
| Loading fallback | Wrapped in `AixiaSection` + `AixiaEmptyState` |
| Recent activity | Unchanged logic; already `AixiaSection surface="command"` |
| Reports | Wrapped in `AixiaSection surface="command"` (replaced top-level `<details>` wrapper) |

Page sequence now: **Hero + hero KPIs → meta strip → read-only section → activity → reports**.

---

## 8. Logic preserved

All hooks, API calls, timeline/filter useMemos, `loadData`, `copyPath`, navigation, owner gate, filter handlers, tables, nested report details, and `data-testid="agentops-history"` unchanged.

---

## 9. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter (changed file) | **No errors** |

---

## 10. Browser check result

**PASS** — page opened at `http://127.0.0.1:5173/system/agent-ops/history`

Verified:
- Hero hierarchy: parent pill, kicker, title, subtitle, actions
- Hero KPI metric cards visible (6 metrics)
- No floating badges in hero
- Meta strip shows Environment / History access / Timeline scope / Report artifacts
- Read-only section, filters, timeline rows, Reports section render
- No console errors observed in snapshot
- Filters and action buttons present

Compared structurally to Finance Transactions (`AixiaCommandMetrics` in hero + meta strip below) and Council (no hero badges, meta strip for context).

---

## 11. Remaining polish items

| Item | Recommendation |
|------|----------------|
| Filter row raw `<input>`/`<select>` | Owner-file proposal — shared field components |
| Timeline row local Tailwind cards | Future batch or shared list-row pattern |
| Nested `<details>` inside Reports section | Optional `AixiaProgressiveDisclosureGroup` later |
| Guardrail debt list entry for History | Remove in guardrail-alignment batch after sign-off |

---

## 12. Recommended next batch

**Batch 86 — AgentOps Issues queue migration**

- Route: `/system/agent-ops/issues`
- Replace local h1 header with command hero + meta strip + `AixiaCommandPageLayout`
- Use History/Council/Finance rhythm proven in Batches 84–85
- **Gate:** Piter visual approval of History before Issues implementation

---

## 13. No other routes changed

Confirmed. Only History page edited.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `history/page.tsx`, `16-design-file-cleanup-map.md` (status) |
| 2 | History page fixed | **Yes** |
| 3 | Floating hero badges removed/repositioned | **Yes** |
| 4 | Missing card rhythm improved | **Yes** |
| 5 | Meta strip aligned | **Yes** |
| 6 | Finance/Council visual comparison done | **Yes** |
| 7 | Other routes changed | **No** |
| 8 | CSS changed | **No** |
| 9 | Shared components changed | **No** |
| 10 | Business logic changed | **No** |
| 11 | API/Supabase changed | **No** |
| 12 | Filters/search/sort/actions preserved | **Yes** |
| 13 | Loading/error/empty states preserved | **Yes** |
| 14 | `npm run qa:validate-foundation` | **PASS** |
| 15 | `npm run build` | **PASS** |
| 16 | Browser check | **PASS** |
| 17 | Final status | **COMPLETE** |
| 18 | Recommended next batch | **Batch 86** — Issues queue migration |

---

## Related

- Batch 84: `AIXIA_GLOBAL_FOLDER_BATCH_84_AGENTOPS_HISTORY_MIGRATION_REPORT.md`
- Reference: `src/app/finance/transactions/page.tsx`, `src/app/system/agent-ops/council/page.tsx`
