# AiXia Global Folder — Batch 12 Typography Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create the second real owner file `02-typography-standard.md` as the single source-of-truth for all AiXia typography, grounded in the actual type values in the current CSS/components, and lock the one-typography-owner rule.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/02-typography-standard.md` | Canonical owner for font family, type scale, hero/section/card titles, labels, body, helper, table, button, form, modal, badge typography, uppercase/tracking, responsive type, accessibility |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_12_TYPOGRAPHY_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmations

| Item | Result |
|------|--------|
| Only `02-typography-standard.md` created | **Yes** |
| Files `03`–`15` created | **No** |
| Old files moved/deleted | **No** |
| Deprecation banners added | **No** |
| CSS changed | **No** |
| Components changed | **No** |
| Pages changed | **No** |
| Guardrails changed | **No** |
| Finance / AgentOps patched | **No** |
| Business logic / Supabase / RLS / schema changed | **No** |
| Production/main touched | **No** |

---

## Typography sources audited

- `src/index.css` — `antialiased`, `font-feature-settings`, `data-font-size` 14/16/18px, gradient `bg-clip-text` → **shadcn/chrome only**
- `src/styles/dashboard/tokens.css` — `--aixia-typography-*`, `--aixia-btn-font-size`, `--aixia-card-title-size`, tabular-nums → **canonical input**
- `src/styles/dashboard/visual.css` — kicker (0.65/700/0.2em/uppercase), hero title (clamp 1.35–1.75/650/-0.03em), subtitle (0.8125rem), metric label/value → **canonical input**
- `src/styles/aixia-design-system.css` — section/card titles, uppercase labels, `.aixia-title-xl` gradient (deprecated default hero), button/input font vars, `!important` sizes → **canonical input / deprecated**
- `src/styles/dashboard/layout.css`, `finance/finance-visual.css` → **wrapper implementation** (finance must equal global)
- `calendar/chat/inbox/tasks/projects` visual CSS, inline Tailwind text classes → **migrate later**
- `AixiaHero/Section/Button/Table.tsx` → **wrapper implementation** (default hero branch deprecated)
- `aixia-design-principles.md`, `aixia-component-rules.md` → **canonical input**
- `AIXIA_STANDARD.md` type prose → **deprecated**

## Typography collisions identified

1. Default gradient hero (`aixia-title-xl`) vs command hero (`aixia-dash-title--hero`)
2. Finance scoped hero type vs global command type (must stay equal)
3. Command type defined in both `dashboard/visual.css` and `aixia-design-system.css`
4. Local Tailwind text sizes in pages (`text-2xl`, etc.)
5. shadcn typography risk in product content
6. Module CSS text overrides
7. Table/header uppercase size + tracking inconsistency (0.58/0.6875rem; 0.06–0.22em)
8. Oversized/`!important` font sizes (2.4rem clamp; 0.95/0.84/0.72rem)

## Canonical typography categories created

A. Font family · B. Hero/title · C. Section/card headings · D. Body/content · E. Labels/metadata · F. Buttons/actions · G. Tables/lists · H. Forms · I. Badges/status · J. Navigation/workspace · K. Modal/drawer · L. Responsive · M. Accessibility

## Forbidden typography patterns documented

No hardcoded page font sizes · no module type scale · no local hero/table/button/uppercase rules · no oversized KPI/title (hero ≤1.75rem) · no shadcn type for product rhythm · no duplicate typography docs outside `aixia-global/`. Exceptions: print, external chrome, shadcn auth/chrome, monospace, documented module data-viz labels.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only) |

---

## Next recommended batch

After Piter reviews and approves `02-typography-standard.md`, create **`03-page-shell-standard.md`** (authenticated app shell, page background, padding, max width, vertical rhythm, wrapper shell rules, atmosphere).

**Not recommended yet:** page migration, command-surface context, finance route shell proofs, CSS split, old-file deletion, deprecation banners, guardrail changes.
