# AiXia Global Folder — Batch 16 Card/Section Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `06-card-section-standard.md` as the single source-of-truth for all card, section, KPI, summary, overview-grid, smart-layout, and content-rhythm rules, grounded in the actual components, and lock the one-card-owner rule.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/06-card-section-standard.md` | Canonical owner for section shell, KPI/metric cards, status/rule cards, summary/value blocks, action cards, overview grids, smart-layout two-column rhythm, lists-in-cards, empty/error/loading states |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_16_CARD_SECTION_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmations

| Item | Result |
|------|--------|
| Only `06-card-section-standard.md` created | **Yes** |
| Files `07`–`15` created | **No** |
| Old files moved/deleted | **No** |
| Deprecation banners added | **No** |
| CSS changed | **No** |
| Components changed | **No** |
| Pages changed | **No** |
| Guardrails changed | **No** |
| `AixiaHero` default flipped | **No** |
| Finance / AgentOps patched | **No** |
| Business logic / Supabase / RLS / schema changed | **No** |
| Production/main touched | **No** |

---

## Card/section sources audited

- `AixiaSection` (surface, `smartScroll`, `visibleCards` default **8**, `matchOpposite`, `fill`) — **implementation** (canonical section)
- `AixiaDetailSection`, `AixiaContentBlocks`, `AixiaValueBlock` — **implementation**
- `AixiaCommandMetrics` (canonical metric path), `AixiaMetricCard`, `AixiaMetricGrid` (not for hero KPIs) — **implementation / migrate later**
- `AixiaStatusCard`, `AixiaActionCard`, `AixiaFeaturePanel`, `AixiaWorkspaceCard` — **implementation**
- `FinanceHubMetrics` — **deprecated** (`@deprecated` re-export of `AixiaCommandMetrics`)
- `AixiaSmartLayout` (main/side, balance, matchColumns, bottomSpan) — **implementation** (canonical two-column)
- `AixiaFinanceCommandDetailPage`/`CreatePage` — **wrapper / migrate later**
- `aixia-design-system.css` (`.aixia-card-shell`), `dashboard/visual.css` (`.aixia-dash-metric*`/`.aixia-dash-panel*`), `dashboard/layout.css` — **canonical input**
- `finance/finance-visual.css` — **wrapper implementation**; `calendar/calendar-visual.css` — **migrate later**
- AgentOps local `rounded-xl border bg-white/[0.03]` grids — **local page debt → migrate later**
- `AIXIA_SHARED_COMPONENT_GAP_LIST.md`, `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md` — **canonical input**

## Card/section collisions identified

1. Finance overview/KPI vs shared command metrics
2. `FinanceHubMetrics` vs `AixiaCommandMetrics` (deprecated alias)
3. `AixiaMetricGrid` vs `AixiaCommandMetrics` (two paths; MetricGrid not for hero)
4. Local Tailwind glass cards in pages
5. AgentOps hub KPIs in scroll instead of hero
6. AgentOps History local card grids
7. Calendar/module card systems
8. Dashboard metric styles vs global card styles
9. Old reports as card authority
10. Inconsistent per-module placement/spacing
11. Oversized KPI/card text
12. Empty gaps / cramped boxes

## Canonical card/section model created

A. Section shell · B. KPI/metric cards (hero vs content) · C. Status/rule cards (≠ meta strip) · D. Summary/value blocks · E. Action cards · F. Overview grids (presets, wrap rules) · G. Smart layout two-column (≥8 visible before scroll) · H. Lists in cards · I. Empty/error/loading states.

## Wrapper/component strategy documented

`AixiaSection` canonical section; `AixiaCommandMetrics`/`AixiaMetricCard` canonical metric path; `FinanceHubMetrics` deprecated alias → migrate; finance command pages are wrappers; module wrappers pass data only; local Tailwind cards migrate later.

## Forbidden card/section patterns documented

No Finance/AgentOps/Calendar card law · no page-local glass cards · no local spacing/radius/padding law · no random KPI placement · no per-module drift without approval · no oversized values · no empty gaps / cramped cards · no card rules in reports/memory/old docs · no per-page local redesign.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only) |

---

## Next recommended batch

After Piter reviews and approves `06-card-section-standard.md`, create **`07-button-action-standard.md`** (button variants, primary/secondary/danger meaning, action location, row/header/footer/confirmation actions, archive/delete/restore meanings).

**Not recommended yet:** page migration, command-surface context, finance route shell proofs, CSS split, old-file deletion, deprecation banners, guardrail changes, hero default flip.
