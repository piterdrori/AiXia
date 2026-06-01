<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-memory-mirror-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Memory mirror only — not active design law**
>
> This memory file is a **mirror/context/agent briefing file only**. It is **not** active AiXia design authority.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This memory file is **not current law**.
>
> - If this mirror conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - Memory may record lessons, proposals, status, and history — **not** law.
> - Memory must route approved rule changes into the correct owner file (per `00` §0.2).
> - Memory must **not** silently change law or implementation.
> - **Do not add new design rules here.** Proposed improvements require Piter approval before owner files, guardrails, code, CSS, schemas, workflows, or page behavior change.
> - Archive or delete requires dependency checks and **Piter approval** (see `16-design-file-cleanup-map.md`).
>
> **Role:** operational memory mirror — continuity and agent briefing, not a second law book.

# AiXia Design System Master Memory

## Current authority (Batch 53 — read `aixia-global/` first)

**Active design law:** `src/design-system/aixia-global/` owner files **`00`–`16` only.**

Memory mirrors law; it does **not** override owner files. Hermes export context (`scripts/export-analytics-for-hermes.mjs`) now prioritizes `aixia-global/00–16` (Batch 44).

**Living law (Batch 51):** Source of truth evolves through an approved loop — agents follow current owners, report gaps with evidence, propose exact owner-file updates; Piter approves before law/guardrail/implementation changes. Memory records proposals — not law. Canonical rule: `00-README-SOURCE-OF-TRUTH.md` §0.4.

**AgentMemory (Batch 43):** standalone local seed/recall **6/6 PASS**; full REST `:3111` blocked on Windows iii-engine crash; Cursor MCP deferred.

**Post-memory resume:** continue design cleanup / archive-readiness gates (through Batch 53); **do not jump into page migration.**

**Paused:** page migrations, Batch 9 finance proofs, command-surface context, CSS split, archive/delete.

**Silent refresh (mandatory):** See `AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` — owners `11`, `13`, `14`, `15`.

**12 agents:** Use Hermes/memory to report issues and propose owner-file upgrades — **not** silent law or implementation changes (`00` §0.4).

## Why This Exists

This memory anchors the global unified AiXia design-system program so future work does not drift into random page-by-page styling.

## Non-Negotiable Rules

1. **`src/design-system/aixia-global/`** owner files `00`–`16` are the only active design law.
2. No page-by-page visual drift.
3. Finance-approved visual rhythm is the baseline reference.
4. AgentOps must conform to the same shared standard.
5. Every module must consume shared components and shared CSS patterns.
6. No persistent page-local visual systems for repeated patterns.
7. During design-only phases, business logic must not change.
8. During design-only phases, preserve Supabase/API/routing/permissions/validation/handlers.
9. Migration order is module-based, not random page hopping.
10. Any missing pattern must be implemented in shared components first.

## Safety Boundaries

- No production/main changes in this design foundation stream.
- No runtime activation (Hermes, CodeGraph runtime, local LLM, agentmemory runtime, scheduler, auto Cursor execution).
- No schema/RLS/migration edits for design-only phases.

## Operating Discipline

- Each design-system phase must update at least one file in `qa-agent/design-system/memory/`.
- Every migration batch must record:
  - shared patterns used
  - shared gaps discovered
  - newly added shared components
  - remaining high-risk pages

## Foundation Status Update

*The qa-agent docs below are **Stage 3 bannered authority-input reports** (Tier 1–2 + Wave A, bannered Batches 47–50) — **historical merged inputs**, not current law. Active law: `aixia-global/00`–`16`.*

- **Tier 2 global patterns (4):** rulebook, page patterns, AI page-building rules — content merged into `aixia-global/` owners
- **Wave A planning/audit inputs (12):** migration plan, component gap/audit, visual QA checklist, parity/shell/finance plans — content merged into owners + `14`/`15`/`16`

## Confirmed Next Step

**PAUSED:** Page-by-page migration remains frozen.

**Current safe work:** design cleanup sequence, Hermes manifest/memory alignment (Batch 44 done), archive-readiness gates — not page migration.

**Authoritative references (current law):**

- `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md`
- `src/design-system/aixia-global/16-design-file-cleanup-map.md`
- `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md`

**Historical planning only (not current law):**

- **Stage 3 Tier 1 authority inputs (8)** — conflict audit, unified plans, shell/hero/P0 docs — superseded by `aixia-global/` owners; archive candidates after Batch 75 trim + Piter approval

## Migration Freeze

- No page migrations until Piter approves after cleanup gates.
- When migration unfreezes, browser proof must match `/finance` rhythm per owners `03`–`05` — not old qa-agent shell-law docs.

## P0 Batch 1 — Design Authority Consolidation (2026-05-29)

**Started/completed in Batch 1:**

| Item | Status |
|------|--------|
| P0-08 docs authority | **Done (historical)** — superseded by `aixia-global/00–16` (Batch 26+); `AIXIA_STANDARD.md` thinned legacy reference only (Batch 41) |
| P0-04 finance CSS | **Partial** — global `@import` removed; `register-finance-bridge-styles.ts` on Finance shells; selectors scoped under `.aixia-finance-page` |
| P0-05 meta strip | **Partial** — `AixiaCommandHubMetaStrip` alias + Stage 3 Tier 1 P0 meta strip authority (historical merged input → `05`) |
| P0-01/02/03 shell/hero | **Plan only** — Stage 3 Tier 1 P0 shell/hero enforcement plan (historical merged input → `03`/`04`/`15`) |

**Evidence:** Wave B historical P0 batch report — historical evidence only; may be archived after Stage 2 approval; current law in `src/design-system/aixia-global/` owners `14`, `15`, `16` and `14-page-migration-rules.md`, `15-guardrail-rules.md`.

**Next P0 batch:** Legacy finance `AixiaPage` bridge loading, `hub-meta` removal, P0-06 scroll unification, then hero/page defaults + guardrails. **Do not** unfreeze Council/History page migration.

## P0 Batch 2 — Shared Authority Cleanup (2026-05-29)

| Item | Status |
|------|--------|
| P0-04 legacy finance bridge | **Partial** — `FinanceModuleBridgeLoader` on `/finance` in DashboardLayout; 13 legacy routes still lack `FinancePage` shell class |
| P0-05 meta strip | **Partial** — `AixiaCommandHubMetaStrip.tsx` canonical; finance wrapper; runtime `hub-meta` delegates |
| P0-06 scroll | **Partial** — scroll aliases in `layout.css`; module overrides deferred |
| P0-01/P0-03 guardrails | **Plan** — Stage 3 Tier 1 P0 guardrail enforcement proposal (historical merged input → `15`) |

**Evidence:** Wave B historical P0 batch report — historical evidence only; current law in `aixia-global/` + `14`/`15`.  
**Page migrations:** still frozen.

## P0 Batch 3 — Guardrails & Boundary (2026-05-29)

| Item | Status |
|------|--------|
| P0-01 shell guardrail | **Partial** — 19 warn-only orb `AixiaPage` detections |
| P0-03 hero guardrail | **Partial** — 15 warn-only non-command `AixiaHero` |
| P0-07 shadcn boundary | **Partial** — audit + 1 AgentOps `Progress` warning |
| P0-05 meta CSS | **Partial** — hub meta grid deduped in design-system |
| P0-06 scroll | **Partial** — documented; no class removals |

**Evidence:** Wave B historical P0 batch report — historical evidence only; current law in `aixia-global/` + `14`/`15`.  
**Page migrations:** still frozen.

## P0 Batch 4 — Meta, Scroll & Boundary (2026-05-29)

| Item | Status |
|------|--------|
| P0-05 runtime meta CSS | **Done** — removed `.aixia-runtime-status-strip--command-meta` (zero TSX call sites) |
| P0-05 hub meta cell chrome | **Done** — unified signal-row typography/chrome in `aixia-design-system.css`; finance duplicates removed |
| P0-07 shadcn boundary | **Done** — `AixiaProgressBar` shared component; AgentOps hub `Progress` replaced |
| P0-06 scroll | **Partial** — projects/tasks `--new` no longer duplicate overflow-y; calendar documented deferred |
| Guardrail escalation | **Plan** — path-scoped error promotion in Stage 3 Tier 1 guardrail proposal (historical merged input → `15`; not enabled) |

**Evidence:** Wave B historical P0 batch report — historical evidence only; current law in `aixia-global/` + `14`/`15`.  
**Page migrations:** still frozen.

## P0 Batch 5 — Async, Boundary & Guardrails (2026-05-29)

| Item | Status |
|------|--------|
| P0-07 AixiaAsyncState | **Done** — shared wrapper; 11 PageLoader replacements |
| P0-07 shadcn hard error | **Done** — finance + agent-ops paths fail build on ui imports |
| P0-04 finance shell bridge | **Plan** — Stage 3 Wave A finance shell bridge plan (historical merged input → `13`/`14`) |
| P0-06 calendar scroll | **Audit** — Stage 3 Wave A calendar scroll audit (historical merged input → `11`); no alias change |
| P0-01/03 new-file enforcement | **Partial** — legacy debt warn-only; non-legacy routes hard error |

**Evidence:** Wave B historical P0 batch report — historical evidence only; current law in `aixia-global/` + `14`/`15`.  
**Page migrations:** still frozen.

## P0 Batch 6 — Async Allowlist & Finance Proof (2026-05-29)

| Item | Status |
|------|--------|
| Council/History PageLoader | **Done** → `AixiaAsyncState` (layout preserved) |
| PageLoader allowlist | **Removed** (empty set; 0 app usages) |
| Finance shell proof | **Done** — `invoices/[id]` loading/not-found → `FinancePage` |
| Shell warnings | **18** (was 19; invoices orb removed) |
| Static findings | **187** (was 190) |

**Evidence:** Wave B historical P0 batch report — historical evidence only; current law in `aixia-global/` + `14`/`15`.  
**Page migrations:** still frozen.

## P0 Batch 7 — Finance Shell Proof (2026-05-29)

| Item | Status |
|------|--------|
| Finance shell proof | **Done** — `purchase-orders/[id]` loading/not-found → `FinancePage` |
| Shell warnings | **17** (was 18; purchase-orders orb removed) |
| Hero warnings | **15** (unchanged) |
| PageLoader app usages | **0** |
| shadcn boundary | **Clean** (0 errors) |
| Static findings | **186** (was 187) |

**Evidence:** Wave B historical P0 batch report — historical evidence only; current law in `aixia-global/` + `14`/`15`.  
**Page migrations:** still frozen.

## P0 Batch 8 — Finance Shell Proof (2026-05-29)

| Item | Status |
|------|--------|
| Finance shell proof | **Done** — `proforma-invoices/[id]` loading/not-found → `FinancePage` |
| Shell warnings | **16** (was 17; proforma-invoices orb removed) |
| Hero warnings | **15** (unchanged) |
| PageLoader app usages | **0** |
| shadcn boundary | **Clean** (0 errors) |
| Static findings | **185** (was 186) |

**Evidence:** Wave B historical P0 batch report — historical evidence only; current law in `aixia-global/` + `14`/`15`.  
**Page migrations:** still frozen.
