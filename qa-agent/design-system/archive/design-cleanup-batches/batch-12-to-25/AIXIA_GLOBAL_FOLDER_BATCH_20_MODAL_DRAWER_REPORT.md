# AiXia Global Folder — Batch 20 Modal/Drawer Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `10-modal-drawer-standard.md` as the single source-of-truth for all AiXia modals, drawers, archive manager, confirmation dialogs, popovers, floating panels, overlays/backdrops, portal/layer behavior, modal headers/bodies/footers, modal scroll, close/cancel behavior, dangerous confirmation behavior, accessibility, and modal/drawer migration/deprecation rules.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/10-modal-drawer-standard.md` | Canonical owner for overlay/modal/drawer/popover/archive-manager/confirmation rules, collisions, consolidation plan |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_20_MODAL_DRAWER_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmation scope

| Item | Result |
|------|--------|
| Only `10-modal-drawer-standard.md` created as owner file in this batch | **Yes** |
| Files `11`–`15` created | **No** |
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

## Modal/drawer sources audited

- `src/components/aixia/AixiaModal.tsx`
- `src/components/aixia/AixiaArchiveManagerModal.tsx`
- `src/components/aixia/AixiaPopoverPanel.tsx`
- `src/components/aixia/AixiaArchiveRowActions.tsx`
- `src/components/aixia/AixiaButton.tsx`
- `src/components/aixia/AixiaRowActionMenu.tsx`
- `src/components/aixia/AixiaDatePicker.tsx` (popover exception)
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/styles/aixia-design-system.css` (modal, archive-manager, popover-panel, date-picker popover)
- `src/styles/dashboard/visual.css`
- `src/styles/finance/finance-visual.css`
- `src/design-system/aixia-archive-rules.md`
- `src/design-system/aixia-component-rules.md`
- Product-page usage scan: AgentOps `AixiaModal` flows, projects/tasks shadcn `Dialog`, chat dialog, `window.confirm` debt
- `16-design-file-cleanup-map.md` modals row

---

## Modal/drawer collisions identified

1. `AixiaModal` vs shadcn `Dialog` dual modal systems.
2. Archive popup/table variations vs global archive manager contract.
3. Finance archive routes + `window.confirm` alongside shared archive modal.
4. Local confirmation via `window.confirm` (tasks/projects/finance master-data).
5. Local shadcn dialogs with page-local Tailwind styling (projects, tasks).
6. Modal action placement inconsistencies (AgentOps multi-modal page).
7. Destructive confirmation copy differences across routes.
8. Hard delete wording inconsistency risk.
9. Z-index layer mismatch (AiXia modal z-120 vs shadcn z-50).
10. `AixiaModal` lacks Radix focus trap (accessibility gap).
11. No shared AiXia drawer — Sheet is chrome-only.
12. Two popover paths (`AixiaPopoverPanel` vs date-picker popover).
13. Old docs/reports still interpretable as modal authority.

---

## Canonical modal/drawer model created

`10-modal-drawer-standard.md` now defines:

- **A.** Overlay/backdrop (tone, blur, z-index, click-outside).
- **B.** Modal container (sizing, glass, radius, shadow).
- **C.** Modal header (title, description, close, badges).
- **D.** Modal body (spacing, scroll, form/table containment).
- **E.** Modal footer/actions (relationship to `07`).
- **F.** Confirmation dialogs (safe/destructive/irreversible/copy-request).
- **G.** Archive manager modal (tabs, table, row actions — global).
- **H.** Drawer/panel (current gap + target law).
- **I.** Popover/floating panel (when allowed, z-index).
- **J.** Accessibility (focus, keyboard, ARIA, scroll lock).

---

## Wrapper/component strategy documented

- `AixiaModal` — canonical modal primitive.
- `AixiaArchiveManagerModal` — global archive/deleted pattern.
- `AixiaPopoverPanel` — floating panel wrapper.
- shadcn dialog/sheet — chrome or wrapped implementation only.
- Future shared drawer primitive noted.
- Confirmation modals use `07` action semantics.

---

## Forbidden modal/drawer patterns documented

- No module-specific modal law.
- No local modal/drawer systems in product pages.
- No shadcn dialog/sheet as product-page visual law.
- No ambiguous delete wording.
- No local overlay/z-index systems.
- No popover substitutes for destructive modals.
- No modal rules in legacy docs/reports.

---

## One-modal/drawer-owner rule confirmed

**Yes.** All modal/drawer/overlay/archive-manager/confirmation rules owned exclusively by `10-modal-drawer-standard.md` per `00` §0.2.

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

After Piter reviews and approves `10-modal-drawer-standard.md`, create:

`src/design-system/aixia-global/11-scroll-responsive-standard.md`

Not recommended yet: page migration, command-surface context, finance route proof work, CSS split, old-file deletion.
