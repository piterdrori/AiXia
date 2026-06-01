# AiXia Global Design System — Batch 42 — Hermes + Persistent Memory Integration Report

**Date:** 2026-05-30  
**Scope:** Architecture/planning only — no install, no runtime changes, no code  
**Predecessor:** Batch 41 Stage 4 AIXIA_STANDARD thinning complete

---

## 1. Purpose

Define Hermes as AiXia's essential operational memory and agent coordination layer; plan persistent memory integration (including evaluation of `agentmemory`); create context manifest and seed plan; capture silent refresh as hard Hermes memory rule — **without installing agentmemory, changing Hermes runtime config, or modifying application code.**

Strategic requirement from Piter: Hermes and persistent memory are not optional long-term; they must know `aixia-global/` as canonical law, understand guardrails/QA/status, and support everlasting improvement memory — while **never becoming a competing design authority**.

---

## 2. Files created

| File | Role |
|------|------|
| `qa-agent/hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md` | Full integration plan (Parts 1–8) |
| `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` | Short Hermes memory mirror for agents |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_42_HERMES_MEMORY_INTEGRATION_REPORT.md` | This report |

---

## 3. Files modified

| File | Change |
|------|--------|
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §4.4 Batch 42 Hermes plan note; §7 step 14 added; steps renumbered |

**Not modified:** `.hermes.md`, `scripts/export-analytics-for-hermes.mjs`, guardrail scripts, `package.json`, code, CSS, pages, components, Supabase, existing memory files (stale pointers documented — refresh planned Batch 43 alt).

---

## 4. Hermes role definition

See `qa-agent/hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md` Part 1.

**Summary:** AiXia Hermes = operational memory + agent coordination (design awareness, migration pause state, guardrails, QA, batch history, briefing, mistake prevention, continuity). Must route agents to `aixia-global/` owner files. Must not override owners, invent law, silently migrate, bypass guardrails, or disrupt user state (silent refresh rule).

**Distinction documented:** AiXia `.hermes.md` (Cursor project rules) vs **Hermes Agent** product (agentmemory `~/.hermes/config.yaml` integration).

---

## 5. Memory model

Six layers defined (A–F):

| Layer | Source | Purpose |
|-------|--------|---------|
| A Canonical law | `aixia-global/00`–`16` | Always first — law |
| B Implementation | components, CSS, guardrails, thinned `AIXIA_STANDARD.md` | How law is built |
| C Batch history | Batch 10–42 reports, P0 reports | What was done and why |
| D Current status | cleanup map, latest batch, paused states | What is safe next |
| E Lessons/mistakes | Piter locked rules, recurring violations | Prevent repeats |
| F Runtime/analytics | analytics export, guardrails JSON, AgentOps | Usage/QA learning |

Conflict rule: **Layer A wins.**

---

## 6. Hermes context manifest recommendation

Planned manifest tiers:

1. **Design authority** — all owner files `00`–`16`
2. **Implementation** — `index.ts`, CSS, guardrail scripts, thinned `AIXIA_STANDARD.md` (legacy only)
3. **Status** — cleanup map, Batch 41/42 reports, collision audit, guardrail reports
4. **Behavior** — refresh rules via owners `11`/`13`/`14`/`15` + mirror file

**Downgrade/remove as active law:** `AIXIA_PAGE_SHELL_HERO_STANDARD.md`, old shell reports, bannered `aixia-*-rules.md`, `AIXIA_STANDARD.md` as law.

**Planned script update (not Batch 42):** `export-analytics-for-hermes.mjs` → add `aixia-global/` paths; demote `AIXIA_STANDARD.md`.

---

## 7. Silent refresh memory rule

Locked text captured in:

- `qa-agent/hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md` Part 4
- `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md`

Mapped to owners: `11-scroll-responsive-standard.md`, `13-module-wrapper-rules.md`, `14-page-migration-rules.md`, `15-guardrail-rules.md`.

---

## 8. AgentMemory evaluation

**Repository inspected:** `https://github.com/rohitg00/agentmemory` (public README, no install).

| Fact | Verified value |
|------|----------------|
| Install | `npm install -g @agentmemory/agentmemory` or `npx @agentmemory/agentmemory` |
| Global required | **No** (optional; npx supported) |
| Server | **Yes** — local memory server required for full MCP |
| Default port | **3111** (+ 3112 WS, 3113 viewer, 49134 iii bridge) |
| Storage | **`~/.agentmemory/`** (`AGENTMEMORY_EXPORT_ROOT`) |
| MCP | **Yes** — `@agentmemory/mcp` (53 tools with server) |
| REST | **Yes** — `:3111` |
| Hermes Agent | **Yes** — documented plugin + `memory.provider: agentmemory` |
| Cursor | **Yes** — MCP merge into `~/.cursor/mcp.json` |
| Uninstall | `agentmemory remove`; governance delete; delete `~/.agentmemory/` |

**Recommendation:** Do not install in Batch 42. Batch 43 local/staging test after Piter approval. Full evaluation table in integration plan Part 5.

---

## 9. Installation readiness checklist

10-item checklist created in integration plan Part 6. All items **pending** except draft security/seed categories in plan. **Piter approval required** before Batch 43.

---

## 10. Memory seed plan

12 seed categories (S1–S12) defined in integration plan Part 7:

- Owner summaries + pointers (not full copies)
- Paused states, cleanup status, Hermes role
- Silent refresh, no local design law, no migration without approval
- AgentOps advisory status, archive gates

**Exclusions:** secrets, service keys, PII, production credentials, guesses as facts, outdated reports as current law.

---

## 11. Security/privacy rules

- No secrets, service role keys, or `.env` values in memory
- No raw customer/vendor PII from analytics
- Sanitized aggregates only for Layer F
- Local server default bind `127.0.0.1`; optional `AGENTMEMORY_SECRET`
- agentmemory docs claim secret stripping pre-storage — still treat as untrusted until Batch 43 validation
- No team mesh/sync until security review
- Memory entries must include `if_conflict_owner_wins` + owner path

---

## 12. What was not installed or changed

| Item | Status |
|------|--------|
| agentmemory package | **Not installed** |
| `npm install -g` | **Not run** |
| `npx @agentmemory/agentmemory` | **Not run** |
| Memory server | **Not started** |
| Hermes MCP connection | **Not connected** |
| `.hermes.md` | **Not modified** |
| `export-analytics-for-hermes.mjs` | **Not modified** |
| Guardrail scripts | **Not modified** |
| package.json / npm scripts | **Not modified** |
| Code, CSS, pages, components | **Not modified** |
| Archive/delete | **Not executed** |

---

## 13. Recommended next batch

**Primary (after Piter approves this plan):**

**Batch 43 — Install and test `agentmemory` locally/staging only**

- Install via npx (local/staging); no production
- Seed from `aixia-global/` summaries + silent refresh rule + paused states
- Recall tests; verify memory does not override owners
- Document ports, storage, backup, reset, rollback
- Connect Cursor MCP test mode only if approved

**Alternative Batch 43 (if install not approved):**

- Hermes manifest/context script update (`export-analytics-for-hermes.mjs`)
- qa-agent memory mirror refresh (remove stale `AIXIA_PAGE_SHELL_HERO_STANDARD.md` citations)

**Do not recommend yet:** page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, archive/delete, guardrail hard-error escalation.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |

Build not run (no code changes).

---

## FINAL CHECK

| # | Item | Result |
|---|------|--------|
| 1 | Files created | 3 (plan, mirror, this report) |
| 2 | Files modified | 1 (`16-design-file-cleanup-map.md`) |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Components changed | **No** |
| 7 | Guardrail scripts changed | **No** |
| 8 | Package scripts changed | **No** |
| 9 | Hermes runtime config changed | **No** |
| 10 | AgentMemory installed | **No** |
| 11 | Memory server started | **No** |
| 12 | AIXIA_STANDARD archived/deleted | **No** |
| 13 | Hermes integration plan created | **Yes** |
| 14 | Memory source-of-truth mirror created/updated | **Yes** |
| 15 | Silent refresh rule captured in Hermes memory plan | **Yes** |
| 16 | AgentMemory evaluated | **Yes** (public docs only) |
| 17 | Install-readiness checklist created | **Yes** |
| 18 | Page migrations remain paused | **Yes** |
| 19 | Batch 9 finance proofs paused | **Yes** |
| 20 | Command-surface context paused | **Yes** |
| 21 | Command results | `qa:validate-foundation` PASS |
| 22 | Final status | **BATCH 42 COMPLETE — planning only; install blocked** |
| 23 | Recommended next batch | **Batch 43 — local/staging agentmemory install + recall test (after Piter approval)** |

---

## Key deliverable locations

- Full plan: [`qa-agent/hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md`](../hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md)
- Agent mirror: [`qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md`](memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md)

**End state unchanged:** ONE STANDARD. ONE OWNER PER ASPECT. ONE GLOBAL DESIGN FOLDER. NO COMPETING DESIGN AUTHORITIES. Memory serves continuity — not a second law book.
