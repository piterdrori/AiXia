<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md, src/design-system/aixia-global/16-design-file-cleanup-map.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file records a **pre–`aixia-global/` authority consolidation audit**. The problem statement may be **historically dated** — active law is now in owner files `00`–`16`.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`00-README-SOURCE-OF-TRUTH.md`](../../src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md) — authority root
> - [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md) — cleanup disposition
>
> - If this report conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AiXia Design Authority Consolidation Report

**Date:** 2026-05-29  
**Type:** Audit & documentation only (no app source changes)  
**Staging only** — production/main untouched

---

## Problem Statement

The website lacks one unified design authority. Shared components exist, but **multiple CSS layers, shell wrappers, hero modes, parallel shadcn/ui usage, and conflicting docs** cause every page migration to fight the rest of the system. Council vs Finance mismatch was a **symptom**, not the disease.

---

## Files Scanned

| Category | Count | Method |
|----------|------:|--------|
| Global/module CSS (`src/styles/**`) | 18 | Glob + import trace from `main.tsx` / `aixia-design-system.css` |
| `src/components/aixia/**` | 87 | Glob |
| `src/components/ui/**` | 55 | Glob |
| `src/components/finance/**` | 31 | Glob |
| `src/app/chat/components/**` | 7 | Glob |
| `src/design-system/**` | 14 | Glob |
| `qa-agent/design-system/**` | 27+ | Glob |
| Page shell usage | 100+ routes | Grep `FinancePage` / `AixiaPage` / `AixiaCommandPage` |
| shadcn ui imports in app | 40+ files | Grep `@/components/ui/` |
| `tailwind.config.js`, `index.css` | 2 | Read |

---

## Design Owner Files Found

See full inventory: `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md`

**Summary tiers:**

- **Real SOT (target):** `aixia-design-system.css` (after scoping), `dashboard/{tokens,layout,visual}.css`, `src/components/aixia/*`
- **Partial SOT:** `finance-visual.css`, command layout aliases, process-book CSS
- **Competing:** `AixiaHero` default surface, `AixiaPage` default surface, `src/components/ui/*`
- **Page-local:** `app/chat/components/*`, AgentOps inline layouts

---

## Conflicts Found

| # | Conflict | Severity |
|---|----------|----------|
| 1 | Four page shell entry points | P0 |
| 2 | Dual `AixiaHero` surfaces (command vs gradient default) | P0 |
| 3 | Finance CSS imported globally inside design-system | P0 |
| 4 | Meta strip triple implementation (Finance / Runtime / command-hub CSS) | P0 |
| 5 | shadcn ui used in dashboard shell + many pages | P0 |
| 6 | Module CSS per route (calendar, chat, inbox, tasks) | P1 |
| 7 | Dual chat systems (app/chat vs AixiaChat*) | P1 |
| 8 | Metric components overlap (CommandMetrics vs MetricGrid) | P1 |
| 9 | Triple documentation authority | P0 |

---

## Contradictions Documented

- `AIXIA_STANDARD.md` vs locked finance header vs Phase 2A reports  
- Hero badges allowed vs forbidden  
- `AixiaRuntimeStatusStrip` promoted vs Finance meta strip required  
- “Migration complete” reports vs browser failure on Council  

Details in conflict audit §5.

---

## Proposed One-Source Structure

Documented in: `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md`

1. **CSS:** primitives in `aixia-design-system.css`; command chrome in `dashboard/*`; module bridges scoped  
2. **Components:** single shell, single command hero default, single meta strip  
3. **Human docs:** `src/design-system/`  
4. **Agent docs:** `qa-agent/design-system/` + memory  

---

## P0 / P1 Blockers (Must Fix Before Migration)

### P0 (8 items)

P0-01 through P0-08 in `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` — shells, hero default, finance global CSS, meta strip unification, scroll aliases, shadcn boundary, doc merge.

### P1 (8 items)

Metrics lint, section default surface, chat unification, finance detail shell generalization, module CSS deprecation, AgentOps table CSS scope, workspace vs layout doc, guardrail enforcement.

---

## What Must Be Fixed Before More Migration

1. Scope finance bridge CSS to `.aixia-finance-page` only  
2. Unify meta strip → `AixiaCommandHubMetaStrip` (rename)  
3. Enforce command `AixiaHero` + `AixiaCommandPage` via guardrails (fail default surface in app routes)  
4. Merge documentation → `AIXIA_PAGE_SHELL_HERO_STANDARD.md`  
5. **Do not** migrate Council, History, or any page until P0 complete  
6. Verify with **template page** + Finance hub — not one-off Council patches  

---

## Memory Files Updated

- `qa-agent/design-system/memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md`  
- `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md`  
- `qa-agent/design-system/memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md`  

---

## App Source Changed

**No.** This task created/updated documentation and memory only.

---

## Validation Results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |

Not run (no app source changes): `npm run build`, `qa:static-design-guardrails`, `qa:guardrail-action-plan`.

---

## Files Created

1. `qa-agent/design-system/AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md`  
2. `qa-agent/design-system/AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md`  
3. `qa-agent/design-system/AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md`  
4. `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md`  
5. `qa-agent/design-system/AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md`  

## Files Modified

1. `qa-agent/design-system/memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md`  
2. `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md`  
3. `qa-agent/design-system/memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md`  

---

## Final Status

**Design authority consolidation audit complete. All page migrations paused.**

Phase 2A Council proof: **not approved** — blocked pending P0 consolidation.  
Phase 2B History: **not started** — blocked.

---

## Next Recommended Step

Execute **P0 consolidation backlog** in order (CSS scoping → hero/page defaults → meta strip rename/unify → doc merge into `src/design-system`) — **shared code only**, no page migrations. Re-run browser comparison using `AIXIA_PAGE_SHELL_HERO_STANDARD.md` against Finance hub and a **blank command template page** before touching AgentOps again.
