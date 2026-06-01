# AiXia Global Folder — Batch 17 Button/Action Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `07-button-action-standard.md` as the single source-of-truth for all AiXia button, action, action-placement, row-action, confirmation-action, archive/delete/restore, and dangerous-action rules.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/07-button-action-standard.md` | Canonical owner for button variants/sizes/hierarchy, header/section/row/modal/sticky-footer actions, dangerous-action semantics, copy/request-only labeling, accessibility, migration gates |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_17_BUTTON_ACTION_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmation scope

| Item | Result |
|------|--------|
| Only `07-button-action-standard.md` created as owner file in this batch | **Yes** |
| Files `08`–`15` created | **No** |
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

## Button/action sources audited

- `src/components/aixia/AixiaButton.tsx`
- `src/components/aixia/AixiaActionSystem.tsx`
- `src/components/aixia/AixiaActionCard.tsx`
- `src/components/aixia/AixiaRowActionMenu.tsx`
- `src/components/aixia/AixiaLifecycleRowActions.tsx`
- `src/components/aixia/AixiaArchiveRowActions.tsx`
- `src/components/aixia/AixiaTableCells.tsx` (`AixiaTableActionsCell`)
- `src/components/aixia/AixiaStickyActionFooter.tsx`
- `src/components/aixia/AixiaArchiveManagerModal.tsx`
- `src/components/aixia/AixiaModal.tsx`
- `src/components/ui/button.tsx` (shadcn)
- `src/styles/aixia-design-system.css`
- `src/styles/dashboard/visual.css`
- `src/styles/finance/finance-visual.css`
- `src/design-system/aixia-archive-rules.md`
- `src/design-system/aixia-component-rules.md`
- Related shared action wrappers (`AixiaRegistryToolbar`, `AixiaWorkflowRegistryControlRow`)
- Local page-level Tailwind/action debt discovery pass in `src/app/**` (not modified)

---

## Button/action collisions identified

1. `AixiaButton` vs shadcn `Button` authority split.
2. `AixiaActionSystem` vs local action-row/page-level layouts.
3. `AixiaTableActionsCell` wrapped or bypassed by local table action patterns.
4. Row-action inconsistency across finance/AgentOps/pages.
5. Archive/delete/restore behavior and labeling variations.
6. "Delete" vs "Delete permanently" ambiguity risk.
7. Action buttons clipped/unreachable in some table scroll contexts.
8. Hero/card/table action placement drift between pages.
9. Local Tailwind button/action systems in product pages.
10. Legacy docs/reports still interpretable as action authority.

---

## Canonical button/action model created

`07-button-action-standard.md` now defines:

- Canonical button primitive, variants, sizes, icon/disabled/loading/accessibility rules.
- Action hierarchy semantics (primary/secondary/tertiary/danger/archive/restore/hard delete/cancel/copy-request).
- Header/hero action placement and grouping limits.
- Section/card/inline/footer action placement.
- Table/list row-action ownership and action-cell relationship notes.
- Modal/confirmation action structure and destructive confirmation requirements.
- Sticky/process footer action rules.
- Dangerous-action semantics and explicit irreversible labeling.
- Copy/request-only action labeling (no false execution implication).
- Accessibility rules for labels, focus, keyboard order, disabled clarity, touch targets.

---

## Wrapper/component strategy documented

Documented and locked:

- `AixiaButton` is canonical.
- Action-layout components own placement.
- `AixiaTableActionsCell` owns row-action layout and should not be locally wrapped.
- `AixiaArchiveRowActionButtons` + `AixiaLifecycleRowActions` own recurring lifecycle row patterns.
- `AixiaArchiveManagerModal` owns archive/restore/delete modal action pattern.
- Module wrappers pass action data/handlers only.
- shadcn buttons remain chrome/auth only.

---

## Forbidden button/action patterns documented

- No module-specific action law (Finance/AgentOps/Calendar).
- No local Tailwind button systems in product pages.
- No local row-action layouts when shared row components exist.
- No ambiguous destructive labels.
- No hidden/unreachable/clipped action columns.
- No action law in reports/memory/legacy docs.
- No one-page local action redesign as global rule.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only batch) |

---

## Next recommended batch

After Piter reviews and approves `07-button-action-standard.md`, create:

`src/design-system/aixia-global/08-table-list-standard.md`

Not recommended yet: page migration, command-surface context, finance route proof work, CSS split, old-file deletion.

