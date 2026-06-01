# AiXia Global Folder — Batch 13 Page Shell Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `03-page-shell-standard.md` as the single source-of-truth for all authenticated AiXia app shell / page wrapper rules, grounded in the actual shell components and CSS, and lock the one-shell-owner rule.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/03-page-shell-standard.md` | Canonical owner for app chrome vs page shell, command shell model, module wrapper layer, page content layer, background/atmosphere, max width, padding, vertical rhythm, scroll relationship, shell migration gates |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_13_PAGE_SHELL_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmations

| Item | Result |
|------|--------|
| Only `03-page-shell-standard.md` created | **Yes** |
| Files `04`–`15` created | **No** |
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

## Shell sources audited

- `AixiaPage` — default (marketing-blur orbs + `aixia-shell`) **deprecated** under authenticated routes; command (`aixia-dash-page--command` + `aixia-dash-3d-stack`) **implementation**
- `AixiaCommandPage` — canonical command shell **implementation**
- `AixiaCommandPageLayout` — canonical command layout **implementation**
- `FinancePage` — **wrapper only** (scope class `aixia-finance-page`)
- `AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage` — **wrapper only / migrate later** (generalize, P1-04)
- `DashboardLayout` — **app chrome only**
- `dashboard/layout.css`, `dashboard/visual.css`, `aixia-design-system.css` — **canonical input** (shell/atmosphere/scroll)
- `finance/finance-visual.css` — **wrapper implementation**; `calendar/calendar-visual.css` — **migrate later**
- `AIXIA_PAGE_SHELL_HERO_STANDARD.md`, `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md`, `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` — **canonical input**

## Shell collisions identified

1. `AixiaPage` default/orb vs command surface
2. `AixiaCommandPage` vs `AixiaCommandPageLayout` (two entry points)
3. `FinancePage` perceived as separate finance shell (it is a thin wrapper)
4. AgentOps History still on orb shell (largest gap)
5. AgentOps Council closest to target (command layout + meta strip)
6. AgentOps hub partial parity (metrics in scroll, no hub meta strip)
7. Finance legacy routes loading/not-found shell debt
8. Module CSS defining shell/scroll behavior
9. Old reports acting as shell authority

## Canonical shell model created

A. App chrome layer (`DashboardLayout`) · B. Authenticated page shell layer (command shell + scroll) · C. Module wrapper layer (delegate-only) · D. Page content layer (compose primitives; no local shell). Plus canonical shell rules (command atmosphere, no orb/default, same shell for loading/empty/not-found/error, no page-level horizontal scroll).

## Forbidden shell patterns documented

No new default/orb `AixiaPage` on authenticated pages · no page-local shell wrappers · no module background atmosphere · no local max-width/padding/full-page-scroll systems · no module CSS redefining shell · no Finance/AgentOps/Calendar shell law outside this file · no shell rules in reports/memory/old docs · no page-level horizontal scroll.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only) |

---

## Next recommended batch

After Piter reviews and approves `03-page-shell-standard.md`, create **`04-hero-header-standard.md`** (hero/header layout, title/eyebrow/subtitle/actions, KPI/status placement, command/default behavior, `AixiaHero`).

**Not recommended yet:** page migration, command-surface context, finance route shell proofs, CSS split, old-file deletion, deprecation banners, guardrail changes.
