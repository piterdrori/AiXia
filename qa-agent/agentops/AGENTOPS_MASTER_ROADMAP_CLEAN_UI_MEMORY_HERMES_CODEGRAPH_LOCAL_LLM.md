# AgentOps Master Roadmap — Clean UI/UX + Local LLM + Memory + Hermes + CodeGraph + Cursor

**Status:** Source-of-truth planning document (staging only)  
**Authority:** Product/architecture planning — not implementation law  
**Last updated:** 2026-05-30  
**Scope:** Staging AgentOps until Piter approves production/main migration

---

## Document role

This file is the **master roadmap** for AgentOps evolution. It describes phases 0–15 in order. It does **not** authorize automatic implementation. Each phase requires explicit review and approval before code/runtime work begins.

**Do not:**

- Implement phases automatically
- Activate Hermes, CodeGraph, local LLM, agentmemory, OpenMonoAgent, Supertonic, or scheduler without separate approval
- Trigger Cursor automatically
- Modify Supabase schema/RLS/migrations
- Touch production/main

---

## Current foundation — already built

AgentOps already has:

- Control Center route: `/system/agent-ops`
- Issues list route: `/system/agent-ops/issues`
- Issue Workspace route: `/system/agent-ops/issues/[issueCode]`
- Manual-first Cursor workflow
- Structured Cursor prompt editor
- Cursor handoff / execution request tracking
- Cursor report intake
- Verification workflow
- Backlog / Active Top 10 workflow
- Agent clarification mock layer
- Hermes contract, readiness gate, health stub, endpoint design
- CodeGraph contract, mock discovery, browser smoke
- 12 synthetic QA agents
- Agent memory foundation
- Static memory files
- Agent interaction/status foundation
- Verification and backlog flow
- Dedicated routes: Agents, Agent Detail, Council, Automation, Knowledge, Advanced, History
- Global design-system command shell on all AgentOps routes (AiXia Global Batches 84–92)
- No real Hermes runtime yet
- No real CodeGraph runtime yet
- No local LLM runtime yet
- No agentmemory runtime yet
- No voice runtime yet
- No automatic Cursor execution yet
- No production/main deployment

---

## Core product goal

AgentOps must become a clean issue-management and agent-intelligence system.

**Main lifecycle:**

Find issue → summarize issue → create fix plan → create Cursor prompt → Piter reviews and approves → Cursor fixes → Cursor reports back → AgentOps verifies → issue closes or stays active → fixed issues become learning memory → future agents become smarter

**The system must support:**

- one clear issue lifecycle
- one clean Issue Workspace per issue
- one agent memory system
- one approved prompt standard
- one owner approval path
- one verification/closure path
- one archive/learning system
- one clean UI/UX structure
- one staging-first safety model

---

## Main UI/UX principle

The system must feel like Cursor AI / ChatGPT / OpenAI product design:

- simple main screen
- clear next action
- no wall of tables
- no raw technical panels in the user's face
- no "everything thrown on one page"
- advanced/rare tools hidden under collapsibles or Advanced pages
- full workflows get dedicated pages, not overloaded tabs
- default screens show only what is needed now
- rare/technical details remain available but hidden
- clear hierarchy
- minimal friction
- readable language
- calm visual system
- strong organization

### UI/UX rule

Default visible UI should answer only:

1. What needs my attention now?
2. What issue should I open?
3. What is the next action?
4. Are agents/system ready?
5. Is anything blocked?

Everything else goes to:

- dedicated pages
- collapsed sections
- Advanced
- History
- Knowledge
- Automation
- individual Issue Workspace
- individual Agent Workspace

**Do not keep building one giant page.**

---

## Staging / production rule

AgentOps work stays on staging until Piter decides staging is stable for weeks.

**Do not touch:**

- production Supabase
- main Supabase
- production GitHub
- main GitHub
- production Vercel

Production/main migration comes only later, after staging works reliably for a few weeks and Piter explicitly approves.

---

## Phase 0 — UI/UX consolidation plan first, then cleanup in small batches

**Purpose:** Clean the current AgentOps UI before adding more functionality.

**Problem:** We already built a lot. The system is becoming messy, too dense, and too technical. Some information is needed daily, some rarely, some only for debugging, and some should be hidden. The current design must be simplified and organized before more runtime systems are added.

**Goal:** Make AgentOps clean, minimal, organized, and usable.

**What to do first:**

- Audit every panel, table, tab, button, route, and section on `/system/agent-ops`.
- Decide what is primary, secondary, rare, technical, redundant, or historical.
- Decide what stays visible by default.
- Decide what moves to dedicated pages.
- Decide what collapses.
- Decide what moves to Advanced.
- Decide what becomes History.
- Decide what belongs in Knowledge.
- Decide what belongs in Automation.
- Decide what belongs in Issue Workspace.
- Decide what belongs in Agent Workspace.
- Create the UI/UX consolidation plan before coding.

**Do not rewrite UI code until the plan is reviewed.**

**Deliverable:** `qa-agent/agentops/AGENTOPS_PHASE_0_UI_UX_CONSOLIDATION_PLAN.md`

**Final target pages:**

| # | Route | Purpose |
|---|-------|---------|
| 1 | `/system/agent-ops` | Simple Control Center only |
| 2 | `/system/agent-ops/issues` | Clean issue queue |
| 3 | `/system/agent-ops/issues/[issueCode]` | Full Issue Workspace |
| 4 | `/system/agent-ops/agents` | 12-agent overview |
| 5 | `/system/agent-ops/agents/[agentId]` | Individual Agent Workspace |
| 6 | `/system/agent-ops/council` | General Agent Council Chat |
| 7 | `/system/agent-ops/automation` | Run modes, queue health, scheduler prep, quiet mode |
| 8 | `/system/agent-ops/knowledge` | Lessons, archive, memory, repeated issues |
| 9 | `/system/agent-ops/advanced` | Technical tools, import plans, raw reports, command examples |
| 10 | `/system/agent-ops/history` | Runs, decisions, reports, verification history |

**Cleanup batches after plan approval:**

1. Control Center cleanup
2. Issues list cleanup
3. Issue Workspace cleanup
4. Agents page/workspace separation
5. Automation page cleanup
6. Advanced/History separation
7. Knowledge page creation
8. Council page creation only after architecture is ready

**Rules:**

- Do not remove functionality.
- Do not change business logic.
- Do not change Supabase.
- Do not activate runtime integrations.
- Do not touch production/main.

---

## Phase 1 — Route and page cleanup

**Purpose:** Convert AgentOps from one overloaded page into clean dedicated pages.

**Deliverables:**

- Control Center simplified.
- Issues page becomes main daily work entry.
- Issue Workspace handles one issue lifecycle.
- Agents overview page shows all 12 agents clearly.
- Individual Agent Workspace page is planned or created.
- Advanced tools are removed from primary view.
- History/reporting is separated.
- Knowledge/archive area is planned.

**Rules:**

- No business logic changes unless required for navigation.
- No schema changes.
- No production/main.
- Preserve existing functions.
- Keep all existing workflows accessible.

---

## Phase 2 — Issue Workspace refinement

**Purpose:** Make the Issue Workspace the main place where Piter fixes one issue.

**Issue Workspace must include:**

- issue summary
- evidence
- reporting agent
- issue-specific chat
- CodeGraph hints
- Hermes/local reasoning status
- fix plan
- Cursor prompt editor
- approval controls
- Cursor execution request
- Cursor report
- verification
- closure/archive
- timeline
- related lessons
- similar past issues

**Rules:**

- No popup as the main workflow.
- Popup only for quick preview.
- Full workflow belongs on `/system/agent-ops/issues/[issueCode]`.
- Cursor prompt remains manually approved.
- No auto Cursor yet.

---

## Phase 3 — Prompt standard lock

**Purpose:** All agent-generated Cursor prompts must follow Piter's approved prompt style.

**Required structure:**

- TASK
- PURPOSE
- IMPORTANT
- STAGING ONLY
- CURRENT ISSUE
- READ FIRST
- DO NOT
- FILES LIKELY TO MODIFY
- IMPLEMENTATION PARTS
- VALIDATION
- REPORT
- FINAL CHECK

**Rules:**

- Prompt must be issue-specific.
- Prompt must not be vague.
- Prompt must include exact route/issue/evidence where known.
- Prompt must include no-change rules.
- Prompt must include validation.
- Prompt must include final checklist.
- Piter can edit before approval.
- Approved prompt becomes the source of truth for Cursor execution.

---

## Phase 4 — Agent chat system architecture

**Purpose:** Create the 3 required chat systems.

### System 1 — General Agent Council Chat

**Route:** `/system/agent-ops/council`

**Purpose:** Piter talks to all 12 agents together.

**Use cases:** focus, priorities, staging health, plans, product direction, shared directives.

### System 2 — Individual Agent Chat

**Route:** `/system/agent-ops/agents/[agentId]`

**Purpose:** Piter talks to one agent (memory, focus, corrections, domain rules).

### System 3 — Specific Issue Chat

**Route:** `/system/agent-ops/issues/[issueCode]`

**Purpose:** Piter discusses one issue with the reporting agent.

**Rules:**

- Chat can suggest memory updates.
- Durable memory requires Piter approval.
- Chat cannot trigger Cursor directly.
- Chat cannot close issues directly.
- Chat cannot modify production.
- Chat cannot write permanent memory without approval.

---

## Phase 5 — Local LLM + memory + voice architecture

**Purpose:** Design the local low-cost conversation system (architecture only).

**Candidate repositories:**

1. **OpenMonoAgent.ai** — local LLM / agent runtime inspiration, playbooks, sub-agents; not immediate Cursor replacement.
2. **agentmemory** — persistent searchable memory, recurrence, lessons; **high priority** before Phase 7.
3. **Supertonic** — local TTS/voice; **later** priority.

**Architecture layers:**

- Local LLM / OpenMonoAgent-style runtime
- agentmemory-style memory
- Supabase (source of truth)
- Hermes (stronger reasoning)
- CodeGraph (discovery)
- Supertonic-style TTS (future)
- STT (future)

**Deliverable:** Architecture/design only. No installs. No runtimes. No schema changes.

---

## Phase 6 — External tool technical evaluation

**Purpose:** Evaluate OpenMonoAgent.ai, agentmemory, and Supertonic before integrating.

**Decision needed:** influence vs integrate vs inspiration vs defer vs risk.

---

## Phase 7 — Archive / learning memory integration

**Purpose:** Fixed issues become searchable lessons.

**Workflow:** verified fixed → lesson candidate → Piter review → Supabase → memory index later.

**Must support Hermes and agentmemory-style layer.**

**Rules:** no automatic durable memory; no secrets; no production/main; no real agentmemory runtime unless separately approved.

---

## Phase 8 — Local LLM chat contract and mock runtime

**Purpose:** Adapter contracts for Council, Individual Agent, and Issue chat. Mock/local structured response only.

---

## Phase 9 — Local LLM runtime readiness and staging connection

**9A:** Endpoint, modes, memory access, safety gate.  
**9B:** One safe chat scope on staging.  
**9C:** Browser verify chat + memory retrieval + no unauthorized writes.

---

## Phase 10 — CodeGraph real integration

**10A:** Readiness / endpoint design.  
**10B:** Read-only staging connection for one sample issue.  
**10C:** Browser verification — advisory hints only.

---

## Phase 11 — Hermes real staging connection

Hermes is essential for memory strengthening and reasoning.

**11A–11D:** Readiness → staging connection → CodeGraph refinement → memory layer refinement.

**Rules:** advisory only; Piter approves prompt and durable memory; no Cursor trigger; no issue closure; production disabled until weeks of staging stability.

---

## Phase 12 — Controlled Cursor execution bridge

**Purpose:** After local LLM, memory, Hermes, and CodeGraph are stable, connect approved "Fix It" to Cursor.

**Rules:** staging only; approved prompt only; every action logged; no execution without owner action.

---

## Phase 13 — Recurring staging AgentOps mode

**Purpose:** AgentOps works repeatedly on staging (scheduled QA loop).

**Rules:** staging only; weeks of runs; no production until Piter approves.

---

## Phase 14 — Voice interaction

**Purpose:** STT → LLM/Hermes → memory → TTS pipeline.

**Rules:** voice cannot trigger Cursor, close issues, modify production, save memory, or approve prompts without explicit confirmation.

---

## Phase 15 — Final 12-agent source-of-truth rulebooks

**Purpose:** Final rulebooks for all 12 agents after system stability.

**This is the final step, not now.**

---

## Immediate next step

**Last updated:** 2026-05-30 (Full roadmap execution Phase 0B → Phase 15 — documentation + Phase 0 complete)

### Completed batches (Phase 0)

| Batch | Phase | Status |
|-------|-------|--------|
| 93 | Page migration completion | **Complete** |
| 94 | 0A Hub legacy parity audit | **Complete** |
| 95 | 0B-prep G1–G9 operator parity | **Complete** |
| 96-prep | Roadmap sync | **Complete** |
| 96b | G10–G14 operator parity | **Complete** |
| 96 | 0B inner legacy removal | **Complete** |
| 97–101 | 0C–0G polish | **Complete** |
| 102 | 0H full browser QA | **Complete** |

### Completed batches (Phases 1–15 — architecture & gates)

| Batch range | Phase | Status |
|-------------|-------|--------|
| 103 | Route ownership sign-off | **Complete** — `AGENTOPS_PHASE_1_ROUTE_OWNERSHIP_SIGNOFF_REPORT.md` |
| 103b | Pre-Phase 2 data review | **Complete** — `AGENTOPS_PRE_PHASE_2_ISSUE_LIFECYCLE_DATA_REVIEW.md` |
| 104–106 | Issue Workspace refinement | **Complete** |
| 107 | Prompt standard lock | **Complete** |
| 108–110 | Three chat systems | **Complete** |
| 111–112 | LLM/memory/voice architecture | **Complete** |
| 113–114 | Lessons integration | **Complete** |
| 115–118 | Local LLM mock/staging gates | **Complete** (runtime gated) |
| 119–121 | CodeGraph integration | **Complete** (runtime gated) |
| 122–125 | Hermes staging | **Complete** (runtime gated) |
| 126–127 | Cursor bridge | **Complete** (manual-only) |
| 128–131 | Staging mode, voice, rulebooks | **Complete** (design/process) |

### G10–G14 decision (approved)

| Field | Value |
|-------|-------|
| Decision | **Option B** — Batch 96b before legacy removal |
| Approved by | Piter |
| Date | 2026-05-30 |

### Runtime activation

Phases 8–15 **runtime** activations (LLM endpoint, CodeGraph live, Hermes live, Cursor auto-bridge, voice, production) remain **gated** — require explicit Piter approval per batch. Phase 0 UI consolidation is **complete**.

**Do not activate runtime without separate approval batches.**

---

## Related documents

| Document | Role |
|----------|------|
| `qa-agent/agentops/AGENTOPS_PHASE_0_UI_UX_CONSOLIDATION_PLAN.md` | Phase 0 inventory + cleanup plan |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_*` | Completed design-system route migrations (84–92) |
| `src/design-system/aixia-global/` | Visual shell source of truth (separate from product roadmap) |
