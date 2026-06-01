# AgentOps Hermes Connection Discovery

**Date:** 2026-05-27  
**Scope:** Repository read-only search (no code changes, no runtime Hermes tests executed in this pass).  
**Specs referenced:** `AGENTOPS_HERMES_READINESS_SPEC.md`, `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md`, `AGENTOPS_HERMES_CODEGRAPH_SPEC.md`

---

## Purpose

This report records what exists **today** in the AiXia repo for **Hermes** and **CodeGraph**, and whether AgentOps can depend on them for memory, focus directives, agent coordination, or the **Hermes Memory Support Meter** before SQL/RLS and in-app UI are built.

**Hermes** in AgentOps specs means an Owner-only memory/coordination layer. **This discovery distinguishes** that product concept from unrelated names (e.g. Meta’s `hermes-parser` npm package used by dev tooling).

---

## Discovery Result

### **Cursor-Only / Project-Tooling Only**

Hermes is **present** as a **Cursor/agent workflow layer** (master prompt + analytics CLI scripts + documentation). It is **not** implemented as an app-callable service, API, library, or persistent AgentOps memory store in this repository.

CodeGraph is **present** as a **Cursor MCP server** configuration with a local index directory; it is **not** integrated into the React app or qa-agent Node scripts.

AgentOps must treat **database-only** memory as MVP until a deliberate Hermes adapter is designed and built (Stage 9 in `AGENTOPS_IMPLEMENTATION_SEQUENCE.md`).

---

## Files / References Found

| File path | Match / role | What it suggests | Callable from |
| --- | --- | --- | --- |
| `.hermes.md` | Root **Hermes master prompt** for Cursor agents | Design rules, analytics auto-run, CodeGraph usage, build-agent prompt standards | **Cursor / agent only** — not imported by app |
| `scripts/query-analytics-for-hermes.mjs` | `npm run analytics:hermes` | Read-only Supabase analytics JSON for agents answering product/UX questions | **CLI / agent terminal** — not app runtime |
| `scripts/export-analytics-for-hermes.mjs` | `npm run export:analytics` | Exports analytics tables to `analytics-exports/` | **CLI / agent terminal** |
| `package.json` | Scripts `analytics:hermes`, `export:analytics` | Hermes = agent-side analytics access, not AgentOps memory API | **npm scripts** |
| `.cursor/mcp.json` | `codegraph` MCP server (`@colbymchenry/codegraph serve --mcp`) | CodeGraph available in Cursor when MCP enabled | **Cursor MCP only** |
| `.cursor/rules/codegraph.mdc` | CodeGraph tool usage rules | Agents should use `codegraph_*` MCP tools | **Documentation for Cursor** |
| `.cursor/rules/aixia-major-workflow.mdc` | AiXia workflow rules | No Hermes MCP entry; general project rules | **Cursor rules** |
| `.codegraph/.gitignore` | Ignores CodeGraph DB artifacts | Local index may exist (`codegraph.db` on disk) | **Tooling index** — not app |
| `qa-agent/agentops/*.md` | AgentOps specs (Hermes meter, checklist, memory) | **Planned** behavior — not implemented | **Documentation only** |
| `qa-agent/README.md`, `FOUNDATION_INDEX.md`, `NEXT_PHASES.md` | Hermes + CodeGraph in QA foundation | Planning layer; no runtime | **Documentation only** |
| `qa-agent/ai-access-boundary.md` | Owner AI vs Personal AI; Cursor/Hermes prompts | Boundary **specified**; no AgentOps Hermes store | **Documentation only** |
| `qa-agent/personal-ai-memory-and-tools.md` | Personal AI memory types | Separate from AgentOps Owner memory | **Documentation only** |
| `qa-agent/templates/cursor-fix-prompt-template.md` | “Cursor/Hermes Fix Prompt” | Prompt format for fixes | **Documentation only** |
| `qa-agent/scripts/generate-guardrail-action-plan.mjs` | Drafts “Cursor/Hermes” prompts in reports | Static report output | **qa-agent script** |
| `src/design-system/*.md`, `src/components/aixia/AIXIA_STANDARD.md` | “Use CodeGraph”, “Hermes must confirm…” | Human/agent process rules | **Documentation only** |
| `src/app/ai-management/memory/page.tsx` | AI session/message UI (`ai_sessions`, etc.) | **In-app AI memory UI** for sessions — **not** Hermes AgentOps memory | **App** — different product surface |
| `src/components/ai/FloatingAIChat.tsx` | Personal/tenant AI chat (exists) | No `agentops` or Hermes namespace found | **App** — unrelated to AgentOps spec |
| `package-lock.json` → `hermes-parser` | Transitive dev dependency (e.g. React inspect plugin) | **Unrelated** to AiXia “Hermes” agent | **Build tooling** |

**Not found in `src/`:** `agentops`, `agent-ops`, `Hermes` service imports, Hermes API routes, `agentops_agent_memory` usage, focus-directive runtime code.

---

## Package / Script Evidence

| Question | Answer |
| --- | --- |
| Any **Hermes** script found? | **Yes** — `analytics:hermes`, `export:analytics` (analytics only) |
| Any **CodeGraph** script found? | **No** in `package.json` — CodeGraph runs via **npx MCP** in `.cursor/mcp.json`, not npm script |
| Any **AgentOps/Hermes** command found? | **No** — no `qa:agentops` or Hermes memory CLI |
| Any **Hermes** npm dependency (AgentOps)? | **No** — only unrelated `hermes-parser` (dev transitive) |
| Any **CodeGraph** npm dependency in app? | **No** — MCP pulls `@colbymchenry/codegraph` at Cursor runtime |

### `package.json` scripts (relevant excerpt)

| Script | Purpose |
| --- | --- |
| `analytics:hermes` | `node scripts/query-analytics-for-hermes.mjs` |
| `export:analytics` | `node scripts/export-analytics-for-hermes.mjs` |
| `qa:validate-foundation` | QA foundation validation (no Hermes) |
| `qa:static-design-guardrails` | Static scan (no Hermes) |
| `qa:guardrail-action-plan` | Report generator (mentions Hermes in prompt **text** only) |

### Environment variable names (analytics scripts only — **names only**)

Scripts may read from `.env` / `.env.local`:

- `VITE_SUPABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No `HERMES_*` or `CODEGRAPH_*` env vars found in repo.

---

## App-Callable Hermes Check

| Question | Answer |
| --- | --- |
| Can the AiXia **app** call Hermes directly today? | **No** |
| Existing service/API/client for Hermes? | **No** |
| Hermes only through Cursor/project tooling? | **Yes** — primarily `.hermes.md` + agent terminal scripts + Cursor agent session |
| Backend endpoint or library wrapper? | **No** |
| Evidence Hermes can read/write **AgentOps** memory from the app? | **No** — no AgentOps tables, routes, or memory API exist yet |

**What *is* callable from a developer machine (not production app):**

- `npm run analytics:hermes` — Supabase analytics summary for agent Q&A  
- Cursor agent following `.hermes.md` rules  
- Future: AgentOps DB via Supabase after Stage 2 SQL (not Hermes)

---

## Hermes Memory Capability Check

Capabilities required by `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md` for **AgentOps** (not general Cursor chat memory):

| Capability | Status | Notes |
| --- | --- | --- |
| Store owner remarks (AgentOps) | **Not Found** | No `agentops_owner_feedback` or Hermes store |
| Retrieve previous owner remarks | **Not Found** | |
| Store false-positive patterns | **Not Found** | Spec + future `agentops_agent_memory` only |
| Store approved prompt patterns | **Partial** | `qa-agent/templates/*`, guardrail JSON drafts — **files**, not Hermes memory API |
| Store sprint/focus directives | **Not Found** | Spec only (`agentops_focus_directives` planned) |
| Persistent storage visible in project | **Partial** | Supabase **AI session** tables used by `ai-management/memory` — **not** documented as AgentOps Owner memory |

**Cursor session memory:** Cursor may retain conversation context per project/user outside this repo; that is **not** discoverable or enforceable from the codebase and is **not** a substitute for AgentOps durable memory or Owner-only boundaries.

---

## CodeGraph Capability Check

| Question | Status | Notes |
| --- | --- | --- |
| Is CodeGraph present? | **Confirmed** | `.cursor/mcp.json` + `.cursor/rules/codegraph.mdc` + `.codegraph/` |
| Map routes to files? | **Partial** | MCP tools (`codegraph_files`, `codegraph_search`, etc.) when index built — **agent session** |
| Search source ownership / callers? | **Partial** | Same — MCP when Cursor connected |
| App-callable or tooling-only? | **Tooling-only** | No `src/` imports; no qa-agent script wrapper |
| Can AgentOps rely on CodeGraph now? | **Only later** | Stage 10 — evidence notes via agent runs or manual import; not in-app |

---

## Hermes Readiness Score Estimate

Per `AGENTOPS_HERMES_READINESS_SPEC.md` component breakdown:

| Component | Max | Score | Rationale |
| --- | ---: | ---: | --- |
| Connection available | 10 | **4** | `.hermes.md` + analytics scripts exist; no AgentOps health check or service |
| Read AgentOps context | 10 | **0** | No AgentOps DB/UI/runner |
| Write/retrieve owner remarks memory | 15 | **0** | No AgentOps memory integration |
| Generate focus directives | 15 | **0** | Spec only |
| Remember false-positive/rejected patterns | 10 | **0** | |
| Remember approved prompt styles | 10 | **1** | Static qa-agent templates; not Hermes-backed memory |
| Support ranking/prioritization | 10 | **0** | |
| Support verification learning | 10 | **0** | |
| Owner-only boundary confirmed | 10 | **3** | Documented in `ai-access-boundary.md` + AgentOps specs; **not** technically enforced for Hermes AgentOps namespace |

### Final score: **8 / 100**

### Label: **Learning**

Hermes-related **project tooling** exists, but **AgentOps memory support is not connected**. The meter should show **Database-only** memory mode until Piter confirms Cursor-side behavior and an adapter plan exists.

---

## Recommended MVP Memory Mode

### **Database-only**

- All owner feedback, focus directives, and memory patterns should use **planned** `agentops_*` tables (after SQL/RLS).  
- Hermes UI meter may show **manual** score/label (0–20, Learning) until Stage 9.  
- Cursor agents may **assist** Piter using `.hermes.md` and CodeGraph MCP during development — that does **not** count as in-app AgentOps memory.

---

## Missing Information

Items **not** discoverable from the repo alone (need **Piter** input):

| # | Item |
| --- | --- |
| 1 | Whether Cursor is configured to load `.hermes.md` automatically for this workspace (User Rules vs project file) |
| 2 | Whether Piter treats **Cursor chat history** as acceptable interim “Hermes memory” for AgentOps |
| 3 | Whether an **external Hermes service** exists outside this repo (not referenced in code) |
| 4 | Whether **Supabase** should store Hermes readiness snapshots (`agentops_hermes_readiness` — optional future table) |
| 5 | Whether **qa-agent Node scripts** should invoke CodeGraph CLI in CI (no wrapper exists today) |
| 6 | Whether `ai-management/memory` session data should ever **feed** AgentOps (recommended: **no** — separate namespaces per specs) |
| 7 | Target architecture for Stage 9: Edge Function, background job, or Cursor-only with DB sync |

---

## Required Next Step

### **A. Proceed to AgentOps SQL/RLS planning with database-only memory mode.**

SQL/RLS and MVP UI do **not** require live Hermes. Include optional columns or a small readiness table only if approved in `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md`.

**In parallel (recommended, not blocking SQL):**

### **C. Ask Piter for Hermes configuration/details** — complete `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md` with answers from this discovery plus Piter’s Cursor setup.

**Optional:**

### **D. Confirm Hermes manually in Cursor** — run a short AgentOps memory test in chat (store/recall a test remark) and record whether that satisfies “connected” for the meter until automation exists.

---

## Safety Decision

**AgentOps must not depend on live Hermes automation** until:

1. Piter approves `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md`, and  
2. An explicit **Hermes adapter plan** exists (who calls whom, where memory is stored, Owner-only enforcement).

The **AgentOps database** remains the **durable system of record** for findings, feedback, focus directives, verifications, and audit. Hermes may **assist** Cursor-side development and future ranking only after integration; it must **not** bypass permissions, RLS, or Owner approval.

---

## Appendix — Search coverage

Searched (representative): `hermes`, `Hermes`, `codegraph`, `CodeGraph`, `agentops`, `agent memory`, `focus directive`, `MCP`, `personal-ai-memory`, `package.json`, `.cursor/*`, `scripts/*`, `qa-agent/**`, `src/**` (no AgentOps routes), `ai-management/memory`.

**Not executed in this pass:** live MCP `codegraph_status` call, `npm run analytics:hermes` (would require local `.env.local` with service role — read-only discovery avoided touching secrets).

---

## Related documents

| Document | Use |
| --- | --- |
| `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md` | Piter sign-off after reviewing this discovery |
| `AGENTOPS_HERMES_READINESS_SPEC.md` | Meter labels and scoring when UI is built |
| `AGENTOPS_IMPLEMENTATION_SEQUENCE.md` | Stage 1B + database-first Stage 2 |
