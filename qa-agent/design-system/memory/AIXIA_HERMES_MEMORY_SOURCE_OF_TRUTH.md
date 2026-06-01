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

# AiXia Hermes Memory — Source of Truth Mirror

**Status:** Active mirror (Batch 53 Template D banner) — **not** design law  
**Canonical law:** `src/design-system/aixia-global/` owner files `00`–`16` only  
**Full plan:** `qa-agent/hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md`

---

## Living source-of-truth (Batch 51 — mandatory)

The source of truth is **living law**, not frozen law.

| Rule | Statement |
|------|-----------|
| **Active law today** | `aixia-global/` owner files `00`–`16` govern implementation and QA until an approved update exists. |
| **AiXia evolves** | New pages, modules, workflows, QA findings, and design improvements will continue to appear. |
| **Hermes/memory role** | Help agents understand rules, history, mistakes, paused states — and **propose** improvements with evidence. |
| **Memory is not law** | Memory records lessons and **proposals**; it does **not** override owner files. |
| **12 agents** | Must use Hermes/memory to report issues and propose upgrades to the correct owner file — **not** silently change source-of-truth or implementation. |
| **Approval gate** | **Piter approval required** before owner files, guardrails, code, CSS, schemas, workflows, or page behavior change. |

**Improvement loop:** see `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md` §0.4 (10 steps). Cursor mirror: `.cursor/rules/aixia-living-source-of-truth.mdc` — owner file wins on conflict.

---

## Read order (mandatory)

1. **`src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md`** — authority root
2. **Relevant owner file `01`–`16`** for the task aspect
3. **Shared implementation** — `src/components/aixia/index.ts`, `src/styles/aixia-design-system.css`
4. **This mirror** — status, pauses, Hermes role, seed pointers
5. **Historical reports** — context only; never current law

If this mirror conflicts with any `aixia-global/` owner file, **`aixia-global/` wins.**

---

## Hermes role (summary)

Hermes is AiXia's **operational memory and agent coordination layer**. It helps future agents:

- find the correct owner file,
- understand paused/work-in-progress status,
- recall batch history and lessons,
- run analytics/QA context safely,
- avoid repeated mistakes.

Hermes **must not** invent design rules, override owner files, silently migrate pages, or bypass guardrails.

**agentmemory install:** **Batch 43 local/staging test executed** (standalone mode). Full iii-engine REST server **not running** on this Windows host (engine crash); see `qa-agent/hermes/AIXIA_AGENTMEMORY_LOCAL_STAGING_INSTALL_REPORT.md`.

### Batch 43 AgentMemory status (2026-05-30)

| Item | Status |
|------|--------|
| Package | `@agentmemory/agentmemory@0.9.24` via `npx -y` (npm cache — not added to repo `package.json`) |
| Full REST server `:3111` | **Not running** — `iii-engine v0.11.2` crashes on startup (Windows exit `3221225501`) |
| Standalone local mode | **Active for test** — documented fallback when server unreachable |
| Staging persist file | `qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json` |
| Seed source | `qa-agent/hermes/AIXIA_AGENTMEMORY_INITIAL_SEED.md` |
| Recall tests | **6/6 PASS** — see `qa-agent/hermes/batch43-recall-results.json` |
| Cursor/Hermes MCP merge | **Deferred** — no `~/.cursor/mcp.json` changes in Batch 43 |
| Secrets stored | **No** |

**Rollback:** delete staging persist file; `npx @agentmemory/agentmemory remove` if global state created; remove `qa-agent/hermes/bin/iii.exe` if no longer needed.

**Warning:** Memory does **not** override `aixia-global/`. Owner files win on conflict.

---

## Memory vs law

| Layer | Role | Competes with owners? |
|-------|------|------------------------|
| `aixia-global/00`–`16` | **Active design law** | N/A — source of truth |
| Shared components/CSS | Implementation | No — implements owners |
| `AIXIA_STANDARD.md` | Legacy implementation reference only | No — bannered bridge |
| qa-agent memory files | Mirrors + history + status | **No** — must cite owners |
| agentmemory (future) | Persistent recall server | **No** — summaries + pointers only |
| Old qa-agent shell reports | Historical | **Must not** be cited as current law |

New design rules go **only** into the correct owner file (`00` §0.2). Memory may summarize after the owner file is updated.

---

## Silent refresh rule (hard behavior — Hermes must enforce)

> Silent refresh is a hard AiXia behavior rule. Any realtime refresh, manual refresh, fallback refresh, data sync, browser QA rerun, AgentOps sync, or AI-driven update must **not** cause page jump, scroll reset, filter reset, sort reset, tab reset, modal close, form edit loss, section collapse, conversation interruption, or visible full-page reload after initial load. Refresh must preserve current user state and update only affected data in place unless Piter explicitly approves a different behavior.

**Owner mapping:**

| Owner | Topic |
|-------|-------|
| `11-scroll-responsive-standard.md` | Scroll preservation, silent refresh §I |
| `13-module-wrapper-rules.md` | Module wrapper silent refresh input |
| `14-page-migration-rules.md` | Migration must not break refresh/state |
| `15-guardrail-rules.md` | Guardrail expectation for silent refresh |

Input doc: `src/design-system/aixia-refresh-rules.md` (behavior reference — merged into owners above).

---

## Current paused states (locked)

| Workstream | Status |
|------------|--------|
| Page migrations | **PAUSED** |
| Batch 9 finance proofs | **PAUSED** |
| Command-surface context | **PAUSED** |
| CSS split | **PAUSED** |
| Archive/delete execution | **PAUSED** |
| Guardrail hard-error escalation | **PAUSED** |
| agentmemory full REST / MCP | **Deferred** — standalone local test done (Batch 43); Cursor MCP not merged |

---

## Cleanup status (Batch 41–44)

- **`AIXIA_STANDARD.md`:** thinned legacy implementation reference (Batch 41). **Not archive-ready.**
- **Batch 42:** Hermes + persistent memory integration plan.
- **Batch 43:** AgentMemory standalone local seed/recall 6/6 PASS; full REST blocked on Windows.
- **Batch 44:** Hermes export manifest + qa-agent memory mirrors refreshed; `export-analytics-for-hermes.mjs` prioritizes `aixia-global/00–16`.
- **Archive gate for `AIXIA_STANDARD.md`:** still blocked until dependency checks, stable validation, and **Piter approval** — manifest/mirror alignment done in Batch 44.
- **Post-memory resume:** return to design cleanup / archive-readiness gates; **do not jump into page migration.**

## Stale memory pointers (historical — do not use as current law)

These paths are **historical** — use `aixia-global/` owners instead:

| Stale reference | Replace with |
|-----------------|--------------|
| Stage 3 Tier 1 shell/hero authority (historical merged input) | `03-page-shell-standard.md`, `04-hero-header-standard.md`, `05-meta-status-strip-standard.md`, `11-scroll-responsive-standard.md` |
| `AIXIA_STANDARD.md` as layout/design law | `aixia-global/00`–`16` |
| P0 batch reports as active authority | Latest batch report + `16-design-file-cleanup-map.md` |
| `qa-agent/design-system/memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` read-first list (pre-Batch 44) | **Fixed Batch 44** — use this file + `00`–`16` |

**Batch 53:** all four design memory mirrors carry `AIXIA-QA-AGENT-AUTHORITY-BANNER` (Template D).

---

## No local design law (reminder)

- Finance and product pages must not define repeated local visual systems.
- Extend shared components and shared CSS first; pages consume only.
- Preserve business logic, Supabase, routing, permissions, validation, and handlers unless explicitly requested.

Owner refs: `00` §0, `13-module-wrapper-rules.md`, `15-guardrail-rules.md`.

---

## AgentOps / Hermes runtime status

- In-app Hermes adapter: **not active** — mock/advisory layer only (`qa-agent/hermes/hermes-adapter-design.md`).
- Analytics for Hermes: `npm run analytics:hermes` / `scripts/export-analytics-for-hermes.mjs` — manifest updated Batch 44 to prioritize `aixia-global/00–16` and Hermes memory docs (no raw `.agentmemory-local` DB).

---

## Future install gate (agentmemory)

Before any `@agentmemory/agentmemory` install:

1. Piter approval
2. Local/staging only
3. No secrets or production/customer data in seed
4. Seed from `aixia-global/` summaries + this mirror
5. Recall test proving memory does not override owners
6. Document storage path, ports, backup, reset, uninstall

See: `qa-agent/hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md` Parts 5–7.

---

## End state reminder

**ONE STANDARD. ONE OWNER PER ASPECT. ONE GLOBAL DESIGN FOLDER. NO COMPETING DESIGN AUTHORITIES.**

Memory serves continuity — not a second law book.
