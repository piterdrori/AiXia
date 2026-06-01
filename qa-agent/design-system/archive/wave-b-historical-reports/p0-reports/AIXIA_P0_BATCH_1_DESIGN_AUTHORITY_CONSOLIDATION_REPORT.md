<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-historical-report-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Historical report only — not current design law**
>
> This qa-agent file is **batch/phase execution evidence or audit history**. It is **not** active AiXia design authority.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this report conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval** (see `16-design-file-cleanup-map.md`).
>
> **Role:** historical report / execution evidence.

# P0 Batch 1 — Design Authority Consolidation Report

**Date:** 2026-05-29  
**Branch:** staging (workspace)  
**Scope:** Shared design authority only — no page migrations, no Council/Finance/History patches, no Supabase/RLS, no production/main.

---

## Purpose

Start resolving P0 blockers from `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` by merging documentation authority, scoping finance CSS away from global load, deciding meta-strip ownership, and documenting shell/hero enforcement — without unfreezing page migrations.

---

## Files created

| File | Role |
|------|------|
| `src/styles/finance/register-finance-bridge-styles.ts` | Side-effect entry for finance bridge CSS |
| `qa-agent/design-system/AIXIA_P0_META_STRIP_AUTHORITY.md` | P0-05 authority |
| `qa-agent/design-system/AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` | P0-01/02/03 plan |
| `qa-agent/design-system/AIXIA_P0_BATCH_1_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `src/styles/aixia-design-system.css` | Removed global `@import` of finance bridge CSS |
| `src/styles/finance/finance-visual.css` | Scoped previously global finance selectors under `.aixia-finance-page` |
| `src/components/aixia/FinancePage.tsx` | Import finance bridge register |
| `src/components/aixia/AixiaFinanceCommandCreatePage.tsx` | Import finance bridge register |
| `src/components/aixia/AixiaFinanceCommandDetailPage.tsx` | Import finance bridge register |
| `src/components/aixia/AixiaFinanceHubMetaStrip.tsx` | JSDoc + `AixiaCommandHubMetaStrip` alias |
| `src/components/aixia/AixiaRuntimeStatusStrip.tsx` | Deprecate `hub-meta` for page meta |
| `src/components/aixia/index.ts` | Export command hub meta aliases |
| `src/components/aixia/AIXIA_STANDARD.md` | Deprecated index; points to locked authorities |
| `src/design-system/README.md` | Locked standard link; finance register SOT |
| `src/design-system/aixia-page-patterns.md` | Override pointer to PAGE_SHELL_HERO |
| `qa-agent/design-system/memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md` | Batch 1 status |
| `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md` | Batch 1 status |
| `qa-agent/design-system/memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | Batch 1 status |

---

## P0 items addressed

| ID | Batch 1 outcome |
|----|-----------------|
| **P0-08** | **Done (docs)** — `AIXIA_STANDARD.md` deprecated; `README.md` + `aixia-page-patterns.md` point to `AIXIA_PAGE_SHELL_HERO_STANDARD.md` |
| **P0-04** | **Partial (code)** — Global import removed; bridge via register on Finance shells; unscoped finance selectors scoped under `.aixia-finance-page` |
| **P0-05** | **Partial (docs + alias)** — Authority doc + `AixiaCommandHubMetaStrip` export; `hub-meta` deprecated in JSDoc |
| **P0-01** | **Plan only** — `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` |
| **P0-02** | **Plan only** — same |
| **P0-03** | **Plan only** — same |

---

## P0 items not addressed yet

| ID | Reason |
|----|--------|
| P0-06 | Competing scroll class families — Batch 2 |
| P0-07 | shadcn vs AiXia shell boundary — Batch 2+ |
| P0-01/02/03 code | Default prop / guardrail enforcement deferred (risk to auth + legacy finance) |
| P0-05 code | Remove `hub-meta` implementation + migrate call sites — Batch 2 |
| P0-04 legacy | ~13 finance routes use raw `AixiaPage` without `FinancePage` — no bridge CSS until wrapped or finance layout import |

---

## Docs authority result

- **Locked law:** `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md`
- **Governance hub:** `src/design-system/README.md` links locked standard and P0 plans
- **Deprecated:** `src/components/aixia/AIXIA_STANDARD.md` (component index only; contradictory hero/shell rules removed)
- **Aligned:** `aixia-page-patterns.md` defers to locked standard on conflict

---

## Finance CSS import result

| Action | Status |
|--------|--------|
| Remove `@import` from `aixia-design-system.css` | Done |
| `register-finance-bridge-styles.ts` | Created |
| Import on `FinancePage`, `AixiaFinanceCommandCreatePage`, `AixiaFinanceCommandDetailPage` | Done |
| Scope `.aixia-finance-hub-meta`, hub-summary, module-section, registries, metric emphasis | Done |
| AgentOps/Council no longer load finance bridge at app boot | **Yes** (primary P0-04 win) |

**Deferred:** Legacy finance pages on plain `<AixiaPage>` without `aixia-finance-page` never received scoped finance hero rules; they remain on default orb shell until Finance shell migration (Batch 2). No regression for command Finance routes using `FinancePage` / finance command shells.

---

## Meta strip authority result

- Preferred component: **`AixiaCommandHubMetaStrip`** (alias)
- Compatibility: **`AixiaFinanceHubMetaStrip`**
- Runtime: **`AixiaRuntimeStatusStrip`** — diagnostics only; `hub-meta` deprecated for new page meta
- CSS: finance meta under `.aixia-finance-page`; command meta under `.aixia-command-page` in global CSS

---

## Shell/hero enforcement plan

See `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md`. Batch 1 does not change `AixiaPage` / `AixiaHero` defaults.

---

## App source changes

Shared components and CSS only (listed above). No `src/app/**` route edits.

---

## Risk notes

1. **Legacy finance `AixiaPage` routes** — Do not use `FinancePage`; finance bridge CSS not loaded on those routes after P0-04 (most finance-visual rules already required `.aixia-finance-page`).
2. **Duplicate finance register import** — FinancePage + command shells may load CSS twice when nested; Vite dedupes side-effect imports (acceptable).
3. **Phase 2A Council** — Not re-validated in this batch; consolidation does not claim Council browser approval.

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** (tsc + vite; prebuild guardrails warn on legacy page violations — unchanged scope) |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (164 findings; 4 actionable — pre-existing) |
| `npm run qa:guardrail-action-plan` | **PASS** |

**Manual browser spot-check (recommended):** `/finance`, `/system/agent-ops/council`, `/system/agent-ops`, `/system/agent-ops/agents` — confirm AgentOps no longer inherits finance bridge typography; Finance command routes unchanged.

---

## Next recommended P0 batch (Batch 2)

1. **P0-04 completion** — Finance route layout or wrap legacy 13 `AixiaPage` finance routes with `FinancePage` (minimal shell-only change) OR single `import register` in a finance-only app wrapper
2. **P0-05 completion** — Remove `hub-meta` from runtime strip; migrate call sites; optional CSS dedupe
3. **P0-06** — Unify `.aixia-command-scroll`; remove module scroll duplicates
4. **P0-03** — `AixiaHero` default `surface="command"` after usage audit
5. **P0-01 / P0-02** — Guardrails + deprecate raw command `AixiaPage` under dashboard

**Do not** resume page-by-page Council/History migration until Batch 2 P0 items are closed in backlog.
