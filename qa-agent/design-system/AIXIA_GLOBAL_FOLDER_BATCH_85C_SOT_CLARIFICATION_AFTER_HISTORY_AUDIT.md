# AiXia Global Design System — Batch 85C — SOT Clarification After History Audit

**Date:** 2026-05-30  
**Type:** Approved owner-file clarification — documentation only  
**Status:** COMPLETE  
**Trigger:** Batch 85B root-cause audit (AgentOps History Batch 84–85 incident)

---

## 1. Purpose

Clarify active design law in owner files `04`, `05`, and `14` so future page migrations do not repeat the History visual mistake (floating hero badges, scroll KPIs, meta-strip KPI duplication). No page, code, CSS, or shared component changes.

---

## 2. Root-cause summary from Batch 85B

| Layer | Finding |
|-------|---------|
| Primary | Batch 84 page implementation misapplied hero badges, scroll KPIs, and KPI-in-meta-strip |
| Secondary | Owner files had rules but ambiguous page-type and badge-type guidance |
| Contributing | Batch 83/84 prompts over-weighted Council; skipped mandatory browser QA |
| Contributing | `AixiaHero badges` API permits misuse |
| Batch 85 | Fixed History page only — did not update law |

This batch closes the **secondary** gap without re-editing History.

---

## 3. Files updated

| File | Change |
|------|--------|
| `src/design-system/aixia-global/04-hero-header-standard.md` | §4B badges rule tightened; §4D history page type + equivalent rhythm; new §4G command hero sequence/badge placement; §7/§10 updates |
| `src/design-system/aixia-global/05-meta-status-strip-standard.md` | Meta vs hero KPI vs rule/status vs badges table; forbidden duplicate KPI/metric styling; §7 collision update |
| `src/design-system/aixia-global/14-page-migration-rules.md` | §12.1 visual parity checklist; §12.2 dual-reference browser compare; §12.3 page-type table; §13/§14 updates |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 42 status only |

**Not updated:** `06` (referenced but not required — clarifications cross-link to it), History page, shared components, guardrails, CSS.

---

## 4. Hero/header clarification summary (`04`)

- **Fixed command hero sequence:** parent pill → kicker → title → subtitle → actions → optional hero metrics (when page type requires)
- **Forbidden:** floating badges between parent pill and title; staging/read-only/access/runtime badges in hero
- **Default:** no `AixiaHero badges` on new/migrated command pages unless explicitly allowed for page type
- **Relocate removed hero badges to:** meta strip (`05`) or rule/status section (`06`)
- **History/review/audit pages with summary counts:** hero metrics required (same as hub/dashboard)
- **Equivalent rhythm rule:** do not move KPIs to scroll when approved reference (Finance Transactions) uses hero metrics
- **New §4G** documents full rule set and reference examples

---

## 5. Meta/status clarification summary (`05`)

- Added comparison table: hero metrics vs meta strip vs rule/status section vs hero badges
- Meta strip: environment, access mode, read-only, scope, sync, owner state, artifact count — **signal rows only**
- Meta strip must **not** duplicate hero KPIs or use metric-card styling
- Hero badges removed during migration → meta strip or rule section, not floating hero pills
- Top-level business KPIs → hero metrics; page mode/context counts → meta strip when appropriate

---

## 6. Migration QA clarification summary (`14`)

- **§12.1** — Mandatory 7-item command-page visual parity checklist before batch close
- **§12.2** — Dual-reference browser compare: module reference (Council) **+** global rhythm reference (Finance Transactions for KPI/meta/card rhythm)
- **§12.3** — Page-type classification table determines hero metrics expectation; ambiguous type → pause and report clarification need
- **Stop rule:** if shell passes but visual parity fails, fix current page before next route
- **Forbidden:** Council-only approval for KPI pages; build-only approval

---

## 7. Cleanup map note summary

Step 42 records Batch 85C complete; History incident used to improve source-of-truth; page migrations remain paused until Issues scope approved.

---

## 8. Confirmation — no page/code/shared component changes

| Area | Changed? |
|------|----------|
| App pages | **No** |
| Shared components | **No** |
| CSS | **No** |
| Guardrails | **No** |
| Business logic / Supabase | **No** |
| Hermes / AgentMemory | **No** |
| Owner files `04`/`05`/`14` | **Yes** — approved clarification only |

Living source-of-truth rule preserved: changes went only to correct owner files per `00` §0.2. Silent refresh rule preserved via cross-references to `aixia-refresh-rules.md`.

---

## 9. Validation result

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |

Build not run — documentation-only batch (expected).

---

## 10. Remaining risk

| Risk | Mitigation |
|------|------------|
| `AixiaHero badges` prop still enables misuse | Owner `04` §4G now forbids default use; future optional component warning/guard deferred |
| AgentOps Hub KPIs still in scroll | Not migrated; Batch 86+ must apply §4D + §12.1 |
| Guardrails not yet enforcing new phrases | Owner `15` alignment deferred; warn-only list unchanged |
| Issues queue local h1 | Batch 86 must follow clarified law + dual browser gate |

---

## 11. Recommended next batch

**Batch 86 — AgentOps Issues queue migration (scope + implementation)**

Batch 86 prompt must require:

1. Classify page type per `14` §12.3 (likely registry/list with optional queue summary KPIs — classify explicitly in scope doc)
2. Compare browser against **History (fixed)**, **Council**, and **Finance Transactions**
3. Apply `04` §4G — no hero badges; meta strip for staging/access if needed
4. Complete `14` §12.1 checklist before batch close
5. Piter approval before code edit

**Do not recommend Hub migration yet.**

---

## 12. Page migrations remain paused

Confirmed. Batch 85C edited owner files only. No Issues or Hub migration authorized by this batch.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_85C_SOT_CLARIFICATION_AFTER_HISTORY_AUDIT.md` |
| 2 | Files modified | `04-hero-header-standard.md`, `05-meta-status-strip-standard.md`, `14-page-migration-rules.md`, `16-design-file-cleanup-map.md` (status) |
| 3 | Hero owner clarified | **Yes** |
| 4 | Meta/status owner clarified | **Yes** |
| 5 | Migration QA owner clarified | **Yes** |
| 6 | Cleanup map status updated | **Yes** |
| 7 | Page code changed | **No** |
| 8 | Shared components changed | **No** |
| 9 | CSS changed | **No** |
| 10 | Business logic changed | **No** |
| 11 | Guardrails changed | **No** |
| 12 | `npm run qa:validate-foundation` | **PASS** |
| 13 | Page migrations remain paused | **Yes** |
| 14 | Final status | **COMPLETE** |
| 15 | Recommended next batch | **Batch 86** — Issues migration with dual-reference browser QA |

---

## Related

- Root-cause audit: `AIXIA_GLOBAL_FOLDER_BATCH_85B_HISTORY_VISUAL_FIX_ROOT_CAUSE_AUDIT.md`
- History fix: `AIXIA_GLOBAL_FOLDER_BATCH_85_AGENTOPS_HISTORY_VISUAL_PARITY_FIX_REPORT.md`
