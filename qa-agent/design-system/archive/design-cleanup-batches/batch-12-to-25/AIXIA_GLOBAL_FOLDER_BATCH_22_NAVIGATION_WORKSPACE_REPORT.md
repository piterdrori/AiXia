# AiXia Global Folder — Batch 22 Navigation/Workspace Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `12-navigation-workspace-standard.md` as the single source-of-truth for all AiXia navigation cards, navigation grids, workspace cards, workspace shells, hub pages, module cards, side panels, info panels, stat blocks, feature panels, equal-height card behavior, hub rhythm, and navigation/workspace migration/deprecation rules.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/12-navigation-workspace-standard.md` | Canonical owner for app chrome vs hub navigation, navigation grid/card, workspace card/shell, info panel, stat blocks, feature panels, responsive hub behavior, collisions, consolidation plan |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_22_NAVIGATION_WORKSPACE_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmation scope

| Item | Result |
|------|--------|
| Only `12-navigation-workspace-standard.md` created as owner file in this batch | **Yes** |
| Files `13`–`15` created | **No** |
| Code changed | **No** |
| CSS changed | **No** |
| Components changed | **No** |
| Pages changed | **No** |
| Finance patched | **No** |
| AgentOps patched | **No** |
| Guardrails changed | **No** |
| Old files moved/deleted | **No** |
| Deprecation banners added | **No** |

---

## Navigation/workspace sources audited

- `src/components/aixia/AixiaNavigationCard.tsx` (exports Grid, Card, InfoPanel, StatBlock)
- `src/components/aixia/AixiaWorkspaceCard.tsx`
- `src/components/aixia/AixiaWorkspaceShell.tsx`
- `src/components/aixia/AixiaFeaturePanel.tsx`
- `src/components/aixia/AixiaSection.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/styles/aixia-design-system.css` (navigation grid/card, info panel, stat blocks, workspace card, feature panel, workspace shell)
- `src/styles/dashboard/layout.css`
- `src/styles/dashboard/visual.css`
- `src/styles/finance/finance-visual.css` (hub summary grids)
- `src/styles/calendar/calendar-visual.css`
- `src/design-system/aixia-navigation-rules.md`
- `src/design-system/aixia-page-patterns.md`
- Usage scan: finance master-data (shared nav), AgentOps local Tailwind hub cards
- `16-design-file-cleanup-map.md` navigation row

---

## Navigation/workspace collisions identified

1. Shared `AixiaNavigation*` layer vs local module hub cards (AgentOps).
2. Finance hub summary grids vs global navigation stat blocks.
3. AgentOps hub local layout vs shared navigation/workspace rhythm.
4. Master Data navigation card sizing/gutter historical drift.
5. Side panel dead gaps without smart layout alignment.
6. Cards touching section/sidebar walls on local layouts.
7. Text length causing uneven card heights outside navigation grid.
8. Local Tailwind navigation card systems.
9. Dashboard visual CSS confused with navigation law.
10. Finance create vs hub hero/meta/KPI rhythm drift.
11. Direct `AixiaWorkspaceCard` usage bypassing navigation shell.
12. Old docs/reports still interpretable as navigation authority.

---

## Canonical navigation/workspace model created

`12-navigation-workspace-standard.md` now defines:

- **A.** App chrome navigation (DashboardLayout — not page law).
- **B.** Module hub page structure (hero → meta → grid → side panel).
- **C.** Navigation grid (equal height, gutters, auto-fit, 252px min).
- **D.** Navigation card (clamped text, meta row, disabled states).
- **E.** Workspace card (base primitive, when to use directly).
- **F.** Info panel / side panel (stat placement, alignment).
- **G.** Stat blocks (vs hero KPIs vs meta strip).
- **H.** Feature panels (not navigation card substitute).
- **I.** Responsive behavior across breakpoints.

---

## Wrapper/component strategy documented

- `AixiaNavigationGrid/Card/InfoPanel/StatBlock` — canonical navigation primitives.
- `AixiaWorkspaceCard` — base card; navigation card wraps with equal-height shell.
- `AixiaWorkspaceShell` — multi-region hub composition.
- `AixiaFeaturePanel` — feature content, not nav law.
- Module wrappers pass data only; local hub systems migrate later.

---

## Forbidden navigation/workspace patterns documented

- No module-specific navigation law.
- No local hub card/grid systems.
- No uneven card heights in same grid.
- No cards touching walls; no side-panel dead gaps.
- No local spacing/radius rules.
- No inline Tailwind hub grids when shared components exist.

---

## One-navigation/workspace-owner rule confirmed

**Yes.** All navigation/workspace/hub/module-card/side-panel rules owned exclusively by `12-navigation-workspace-standard.md` per `00` §0.2.

---

## Page migrations remain paused

**Yes** — per `00` §7.

---

## Batch 9 finance proofs paused

**Yes** — unchanged.

---

## Command-surface context paused

**Yes** — unchanged.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only batch) |

---

## Next recommended batch

After Piter reviews and approves `12-navigation-workspace-standard.md`, create:

`src/design-system/aixia-global/13-module-wrapper-rules.md`

Not recommended yet: page migration, command-surface context, finance route proof work, CSS split, old-file deletion.
