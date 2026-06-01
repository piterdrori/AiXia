# AiXia Global Folder — Batch 18 Table/List Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `08-table-list-standard.md` as the single source-of-truth for all AiXia registry tables, archive tables, detail tables, list rows, side lists, history rows, sticky headers, sortable headers, table scroll, horizontal scroll, action cells, row heights, cell alignment, density, empty/loading/error states, toolbar/search/filter relationship, archive manager patterns, and table/list migration/deprecation rules.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/08-table-list-standard.md` | Canonical owner for table/list/registry/archive/action-cell/scroll/density/responsive/state rules, collisions, consolidation plan, forbidden patterns, migration gates |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_18_TABLE_LIST_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmation scope

| Item | Result |
|------|--------|
| Only `08-table-list-standard.md` created as owner file in this batch | **Yes** |
| Files `09`–`15` created | **No** |
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

## Table/list sources audited

- `src/components/aixia/AixiaTable.tsx` (`AixiaTableShell`, `AixiaSortableHeader`)
- `src/components/aixia/AixiaTableCells.tsx` (`AixiaTableTextCell`, `Badge`, `Date`, `AixiaTableActionsCell`)
- `src/components/aixia/AixiaRegistryToolbar.tsx`
- `src/components/aixia/AixiaArchiveManagerModal.tsx`
- `src/components/aixia/AixiaArchiveRowActions.tsx` (`AixiaArchiveRowActionButtons`)
- `src/components/aixia/AixiaLifecycleRowActions.tsx`
- `src/components/aixia/AixiaSideList.tsx`
- `src/components/aixia/AixiaHistoryRow.tsx`
- `src/components/aixia/AixiaSection.tsx` (smartScroll, visibleCards, registry-toolbar integration)
- `src/styles/aixia-design-system.css` (table variants, sticky head, cells, archive modal, agentops-dense-table, side-list, history-row)
- `src/styles/dashboard/layout.css`
- `src/styles/dashboard/visual.css`
- `src/styles/finance/finance-visual.css` (employee expense registry, issued documents)
- `src/styles/finance/master-data-visual.css`
- `src/styles/calendar/calendar-visual.css`
- `src/design-system/aixia-table-rules.md`
- `src/design-system/aixia-archive-rules.md`
- `src/design-system/aixia-finance-workflow-registry-contract.md`
- `src/components/ui/table.tsx` (shadcn — chrome only)
- Local page usage scan: AgentOps pages (`agentops-dense-table`, custom min-widths), finance registry overrides
- `16-design-file-cleanup-map.md` table/list consolidation row

**Note:** User task listed `AixiaTableActionsCell.tsx` — that file does not exist; `AixiaTableActionsCell` is exported from `AixiaTableCells.tsx`. Documented in owner file.

---

## Table/list collisions identified

1. Finance registry tables vs global table shell (`finance-visual.css` employee expense overrides).
2. AgentOps dense table CSS (`.agentops-dense-table`) inside global `aixia-design-system.css`.
3. Archive modal tables overloaded with columns instead of secondary text.
4. Action columns clipped or unreachable under some scroll wrappers.
5. Header/body horizontal scroll mismatch risk (extra page-level `overflow-x-auto` wrappers).
6. Local Tailwind table/list systems on product pages.
7. Table row action cells bypassed or incorrectly wrapped.
8. Finance master-data visual density vs global compact density contract.
9. Calendar/list scroll exceptions in module CSS.
10. Old docs (`aixia-table-rules.md`, `aixia-archive-rules.md`, qa-agent reports) still interpretable as table authority.
11. `AixiaTableShell variant="default"` legacy guardrail vs registry/archive standard.
12. Per-page custom `minWidthClassName` drift across AgentOps/Finance routes.
13. shadcn `Table` vs `AixiaTableShell` dual primitives.

---

## Canonical table/list model created

`08-table-list-standard.md` now defines:

- **A.** Registry table (structure, sticky header, toolbar, sort, states).
- **B.** Archive table (tabs, restore/delete, compact columns, secondary text, modal).
- **C.** Detail/line-item table (when allowed vs cards, horizontal scroll).
- **D.** Action cell (ownership, reachability, `07` relationship).
- **E.** Sticky header / scroll container (alignment, vertical/horizontal containment, page scroll forbidden).
- **F.** Row and cell density (default/compact, padding, alignment, badges, secondary text).
- **G.** Lists and side lists (when to use, side list + history row patterns).
- **H.** Visible rows before scroll (8 default, 10-row target, `06` relationship).
- **I.** Responsive behavior (mobile through large desktop).
- **J.** Table/list states (loading, empty, error, permission, archived, disabled).

---

## Wrapper/component strategy documented

- `AixiaTableShell` — canonical table primitive.
- `AixiaTableCells` — canonical cell primitives including action cell.
- `AixiaSortableHeader` — sortable columns.
- `AixiaRegistryToolbar` — registry toolbar pattern.
- `AixiaArchiveManagerModal` — archive/deleted modal pattern.
- `AixiaArchiveRowActionButtons` / `AixiaLifecycleRowActions` — row action contracts.
- `AixiaSideList` / `AixiaHistoryRow` — list patterns.
- Module wrappers pass data only; dense variant migrates to shared `data-table-density`.

---

## Forbidden table/list patterns documented

- No module-specific table law (Finance/AgentOps/Calendar).
- No local table/list systems in product pages.
- No split header/body scroll mismatch.
- No unreachable/clipped action columns.
- No page-level horizontal scroll from tables.
- No overloaded archive tables.
- No local one-page table redesign.
- No table/list law in reports/memory/old docs.

---

## One-table/list-owner rule confirmed

**Yes.** All table/list/registry/archive/action-cell/scroll/density rules are owned exclusively by `08-table-list-standard.md` per `00` §0.2.

---

## Page migrations remain paused

**Yes** — per `00` §7. No page migration work in this batch.

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

After Piter reviews and approves `08-table-list-standard.md`, create:

`src/design-system/aixia-global/09-form-input-standard.md`

Not recommended yet: page migration, command-surface context, finance route proof work, CSS split, old-file deletion.
