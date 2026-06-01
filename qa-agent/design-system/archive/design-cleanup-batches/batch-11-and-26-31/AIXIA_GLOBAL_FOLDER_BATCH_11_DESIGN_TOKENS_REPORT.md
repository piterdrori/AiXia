# AiXia Global Folder — Batch 11 Design Tokens Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create the first real owner file `01-design-tokens.md` as the single source-of-truth for all AiXia visual tokens, grounded in the actual token values found in the current CSS, and lock the one-token-owner rule.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/01-design-tokens.md` | Canonical owner for colors, surfaces, glass, borders, text, accents, status, radius, shadow/glow, spacing, z-index, motion, breakpoints, gradients |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_11_DESIGN_TOKENS_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmations

| Item | Result |
|------|--------|
| Only `01-design-tokens.md` created | **Yes** |
| Files `02`–`15` created | **No** |
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

## Token sources audited

- `src/index.css` — shadcn HSL tokens (`--background 222 47% 4%`, `--card`, `--primary 217 91% 60%`, `--destructive 0 84% 60%`, `--border`, `--input`, `--ring`, `--radius 0.75rem`), `--surface-0..3`, `--text-1..3`, `--shadow-color`, `--app-gradient`, accent themes (`data-accent` blue/teal/emerald/violet/rose) → **shadcn/chrome compatibility only**
- `src/styles/dashboard/tokens.css` — `--aixia-dash-radius` (12px), `--aixia-dash-radius-sm` (8px), `--aixia-card-*`, `--aixia-btn-*` (radius 999px), `--aixia-table-row-*`, `--aixia-bento-gap`, `--aixia-stack-gap`, `--aixia-typography-*` → **canonical input**
- `src/styles/aixia-design-system.css :root` — `--aixia-responsive-*`, `--aixia-fab-*`, radius/shadow literals → **canonical input / wrapper**
- `src/styles/dashboard/visual.css` — accent tone classes (violet/teal/amber/rose) → **canonical input** (tones)
- `src/styles/dashboard/layout.css` — consumes tokens → **wrapper implementation**
- `src/styles/finance/finance-visual.css`, `finance/master-data-visual.css` — consume globals, scoped `--aixia-process-*` → **wrapper implementation**
- `calendar/chat/inbox/tasks/projects` visual CSS → **migrate later**
- `aixia-process-book.css` (scoped) → wrapper; `aixia-finance-print.css` → approved print exception
- Inline Tailwind literals in pages/components → **migrate later**

## Token collisions identified

1. AiXia tokens vs shadcn HSL tokens (two coexisting systems)
2. Dashboard tokens vs global CSS `:root` tokens (split across two files)
3. Finance scoped `--aixia-process-*` token-like values (mapped to globals)
4. Module CSS token-like literals (calendar/chat/inbox/tasks/projects)
5. Local Tailwind literals (`bg-white/[0.03]`, `rounded-xl`, `border-white/10`, `text-slate-400`)
6. Duplicated radius/shadow/glass values (hardcoded `1rem`/`1.5rem`/`1.75rem` alongside `--aixia-card-radius`)

## Canonical token categories created

A. Base surfaces · B. Glass system · C. Borders · D. Text colors · E. Accent colors · F. Status colors · G. Radius · H. Shadows & glow · I. Spacing scale · J. Z-index · K. Motion · L. Breakpoints/responsive · M. Gradients

## Forbidden token patterns documented

No hardcoded page colors · no module glass systems · no page-local radius/shadow/glow/spacing/breakpoint systems · no shadcn tokens for product rhythm · no duplicate token docs outside `aixia-global/`. Approved exceptions: print, external chrome, shadcn auth/chrome, documented module data-viz colors.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only) |

---

## Next recommended batch

After Piter reviews and approves `01-design-tokens.md`, create **`02-typography-standard.md`** (fonts, sizes, weights, line heights, letter spacing, headings, labels, body, helper, table text, button text).

**Not recommended yet:** page migration, command-surface context, finance route shell proofs, CSS split, old-file deletion, deprecation banners, guardrail changes.
