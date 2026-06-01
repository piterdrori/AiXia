# AiXia Global Folder — Batch 19 Form/Input Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `09-form-input-standard.md` as the single source-of-truth for all AiXia inputs, selects, textareas, date fields, search fields, labels, helper text, placeholders, validation states, disabled/read-only states, form grids, form rows, inline edit fields, form section layout, form loading/empty/error states, accessibility, and form/input migration/deprecation rules.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/09-form-input-standard.md` | Canonical owner for field wrappers, text/select/textarea/date/search controls, form layout, validation states, form actions relationship, accessibility, collisions, consolidation plan |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_19_FORM_INPUT_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmation scope

| Item | Result |
|------|--------|
| Only `09-form-input-standard.md` created as owner file in this batch | **Yes** |
| Files `10`–`15` created | **No** |
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

## Form/input sources audited

- `src/components/aixia/AixiaFormFields.tsx` (full export set including `AixiaFormDateField`)
- `src/components/aixia/AixiaDatePicker.tsx`
- `src/components/aixia/AixiaSearchField.tsx`
- `src/components/aixia/AixiaWorkflowRegistryControlRow.tsx`
- `src/components/aixia/AixiaRegistryToolbar.tsx`
- `src/components/aixia/AixiaFinanceCommandCreatePage.tsx`
- `src/components/aixia/AixiaFinanceCommandDetailPage.tsx`
- `src/styles/aixia-design-system.css` (form inputs, labels, grids, date picker, search, checkbox, display blocks, dual input tracks)
- `src/styles/dashboard/tokens.css` (input/button sizing tokens)
- `src/styles/dashboard/visual.css`
- `src/styles/finance/finance-visual.css`
- `src/design-system/aixia-form-rules.md`
- `src/design-system/aixia-component-rules.md`
- `src/lib/dom/focusFirstInvalidField.ts`
- `src/components/ui/input.tsx`, `select.tsx`, `textarea.tsx`, `form.tsx`, `field.tsx` (shadcn)
- Native `type="date"` usage scan (tasks, projects, calendar, dashboard admin)
- shadcn `Input` leakage scan (tasks, projects pages)
- `16-design-file-cleanup-map.md` forms row

---

## Form/input collisions identified

1. Shared AiXia form fields vs local raw/shadcn inputs on product pages.
2. Native `type="date"` vs `AixiaDatePicker` / `AixiaFormDateField` (finance complete; tasks/projects/calendar/admin remain).
3. Finance create/detail shells vs global form rhythm (wrappers, not separate law).
4. Form fields inside table inline-edit cells (dual `08`/`09` ownership).
5. Local Tailwind input styles on pages.
6. shadcn `Input` in tasks/projects product pages.
7. Dual CSS tracks `.aixia-input` vs `.aixia-form-input` (height/focus mismatch).
8. Inconsistent label/helper/validation placement.
9. `.aixia-field-error` referenced in JS but no global CSS yet.
10. Same-place inline edit not consistently followed on detail pages.
11. Old docs (`aixia-form-rules.md`, MW-024 in component rules) still interpretable as form authority.
12. Parallel display/review/value block systems for read-only fields.
13. Two registry toolbar patterns (generic vs workflow) — pages inventing third variants.

---

## Canonical form/input model created

`09-form-input-standard.md` now defines:

- **A.** Field wrapper (label, control, helper, validation, required, disabled/read-only).
- **B.** Text input (dimensions, focus, placeholder, disabled).
- **C.** Select/dropdown.
- **D.** Textarea (min-height, resize).
- **E.** Date/time fields (`AixiaFormDateField` contract, native migration rule).
- **F.** Search/filter fields (toolbar relationship, widths).
- **G.** Form layout (grids, same-place edit, create/detail rhythm).
- **H.** Validation states (error through permission locked).
- **I.** Form actions (relationship to `07`).
- **J.** Accessibility (labels, keyboard, focus, errors, touch targets).

---

## Wrapper/component strategy documented

- `AixiaFormFields` exports are canonical for product forms.
- `AixiaFormDateField` + `AixiaDatePicker` own date entry.
- `AixiaSearchField` owns search inputs.
- `AixiaDisplayBlock` owns read-only same-place view.
- `AixiaWorkflowRegistryControlRow` owns workflow filter row.
- Finance command create/detail pages are wrappers only.
- Native/shadcn controls migrate later; not form law.

---

## Forbidden form/input patterns documented

- No module-specific form law.
- No local form systems in product pages.
- No local label/helper/error/focus token systems.
- No native date where shared date component applies.
- No page-local date picker styling.
- No shadcn inputs as product-page form law.
- No form rules in legacy docs/reports.

---

## One-form/input-owner rule confirmed

**Yes.** All form/input rules owned exclusively by `09-form-input-standard.md` per `00` §0.2.

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

After Piter reviews and approves `09-form-input-standard.md`, create:

`src/design-system/aixia-global/10-modal-drawer-standard.md`

Not recommended yet: page migration, command-surface context, finance route proof work, CSS split, old-file deletion.
