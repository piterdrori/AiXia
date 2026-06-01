# AiXia Global Folder — Batch 14 Hero/Header Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `04-hero-header-standard.md` as the single source-of-truth for all authenticated AiXia hero/header rules, grounded in the actual `AixiaHero` component and hero CSS, and lock the one-hero-owner rule.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/04-hero-header-standard.md` | Canonical owner for hero container, title group, action group, KPI/status placement, meta-strip relationship, responsive hero, command/default behavior, `AixiaHero` default strategy |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_14_HERO_HEADER_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmations

| Item | Result |
|------|--------|
| Only `04-hero-header-standard.md` created | **Yes** |
| Files `05`–`15` created | **No** |
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

## Hero sources audited

- `AixiaHero` — command branch (`aixia-dash-hero`/glass/3d-hero; kicker/title/subtitle; `aixia-dash-actions`; `aixia-dash-metrics aixia-dash-bento`; parent pill) **implementation**; default branch (`aixia-title-xl`+`aixia-gradient-text`; status grid; `rightContent`) **deprecated under authenticated routes**
- `AixiaCommandPage`/`AixiaCommandPageLayout` — hero placement **implementation**
- `FinancePage`, finance command detail/create — **wrapper only / migrate later**
- `dashboard/visual.css` — command hero visuals **canonical input**; `dashboard/layout.css` — placement **canonical input**; `aixia-design-system.css` — gradient XL **deprecated**, command **canonical input**
- `finance/finance-visual.css` — scoped hero (must equal global) **wrapper**; `calendar/calendar-visual.css` — **migrate later**
- `AIXIA_PAGE_SHELL_HERO_STANDARD.md`, `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md`, `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` — **canonical input**

## Hero collisions identified

1. `AixiaHero` default vs command surface
2. Gradient/default XL typography vs command hero typography
3. Finance scoped hero vs global command hero (must stay equal)
4. AgentOps History default/gradient hero (largest gap)
5. AgentOps hub KPIs in scroll instead of hero
6. Council closest to standard (command hero + meta strip)
7. Calendar hero overrides
8. Local page `h1` headers without `AixiaHero` (e.g. AgentOps issues)
9. Old reports acting as hero authority

## Canonical hero model created

A. Hero container (command surface, fixed header in shell) · B. Title group (parent pill, kicker, title ≤1.75rem, subtitle, badge limits) · C. Action group (`aixia-dash-actions`, right-aligned, shared buttons) · D. KPI/status group (hub = metrics in hero; registry/council = none; no `AixiaMetricGrid` in hero) · E. Meta-strip relationship (hero ≠ meta strip) · F. Responsive hero.

## `AixiaHero` default strategy documented

- Current default `surface="default"`; global flip to `command` **not safe yet** (~35–40 implicit call sites; finance legacy `statusCards` layout shift).
- Command-surface context proposed but **paused** until owner files exist.
- Strategy: document hero law now; decide implementation after `04`/`05`/`06`/`11`/`13`/`14` + approval; **no flip this batch**.

## Forbidden hero patterns documented

No default/gradient/orb hero on authenticated pages · no page-local hero/h1 systems · no module hero styling · no hero typography outside `02` · no hero gradients outside `01` · no locally invented KPI placement · no Finance/AgentOps/Calendar hero law outside this file · no hero rules in reports/memory/old docs.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only) |

---

## Next recommended batch

After Piter reviews and approves `04-hero-header-standard.md`, create **`05-meta-status-strip-standard.md`** (page meta strips, hub meta rows, runtime status separation, strip layout).

**Not recommended yet:** page migration, command-surface context, finance route shell proofs, CSS split, old-file deletion, deprecation banners, guardrail changes, hero default flip.
