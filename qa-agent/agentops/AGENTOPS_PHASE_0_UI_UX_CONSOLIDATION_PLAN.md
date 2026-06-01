# AgentOps Phase 0 — UI/UX Consolidation Plan

**Date:** 2026-05-30  
**Status:** PLAN ONLY — awaiting Piter review before any UI rewrite  
**Authority:** Implements Phase 0 of `AGENTOPS_MASTER_ROADMAP_CLEAN_UI_MEMORY_HERMES_CODEGRAPH_LOCAL_LLM.md`  
**Scope:** Staging AgentOps UI inventory, classification, target navigation, and small-batch cleanup sequence

---

## 1. Purpose

Before Phases 1–15 (runtime, memory, Hermes, CodeGraph, Cursor bridge, voice), AgentOps needs a **clean, minimal, organized UI**. Phase 0 produces the inventory and decisions only. **No UI code rewrite starts until this plan is approved.**

---

## 2. Executive summary

| Area | State today | Phase 0 decision |
|------|-------------|------------------|
| Route split | **Done** — all 10 target routes exist and are wired | Keep routes; simplify content per route |
| Global command shell | **Done** — AiXia Global Batches 84–92 | Keep shell; reduce page-level density |
| Control Center hub | **Partial** — primary surface clean; **~8,500-line legacy fallback** still embedded | **Highest cleanup priority** — remove duplicate workflows from hub |
| Issue Workspace | **Built** — full lifecycle; dense workbench | Phase 0 inventory + Phase 2 refinement queue |
| Product UI principle | **Not met** — hub legacy violates "one giant page" rule | Consolidation required before new features |

---

## 3. What is already done (roadmap vs reality)

### 3.1 Foundation — complete

| Capability | Status | Evidence |
|------------|--------|----------|
| Control Center route | ✅ Exists | `/system/agent-ops` |
| Issues list | ✅ Exists + command shell | Batch 86/86B |
| Issue Workspace | ✅ Exists + command shell | `[issueCode]/page.tsx`, Batch 92 issue detail |
| Agents registry | ✅ Exists + command shell | Batch 90 |
| Agent Workspace | ✅ Exists + command shell | `[agentId]/page.tsx`, Batch 91 |
| Council chat shell | ✅ Exists + command shell | Batch 92 alignment |
| Automation | ✅ Exists + command shell | Batch 89 |
| Knowledge | ✅ Exists + command shell | Batch 88 |
| Advanced | ✅ Exists + command shell | Batch 87 |
| History | ✅ Exists + command shell | Batch 84–85 |
| Manual-first Cursor workflow | ✅ Built | Issue Workspace handoff, prompt, report, verification |
| Backlog / Active Top 10 | ✅ Built | Issues + Hub data hooks |
| Agent clarification mock | ✅ Built | Issue Workspace + Hermes adapter mock |
| Hermes contract / gate / health stub | ✅ Design only | No runtime |
| CodeGraph contract / mock discovery | ✅ Design only | No runtime |
| 12 synthetic QA agents | ✅ Built | Agents + Council |
| Agent memory foundation | ✅ Built | Agent Workspace forms + Supabase reads |
| Static memory files / lessons prep | ✅ Partial | Knowledge page |
| Global design-system migration | ✅ All routes | Batches 84–92 reports |

### 3.2 Roadmap phases — not started (by design)

| Phase | Topic | Status |
|-------|-------|--------|
| 0 | UI/UX consolidation **plan** | **This document** |
| 0 impl | UI cleanup batches | ⏸ Blocked until plan approval |
| 1 | Route/page cleanup implementation | ⏸ After Phase 0 approval |
| 2 | Issue Workspace refinement | ⏸ |
| 3 | Prompt standard lock | ⏸ Partially exists in `normalizeCursorPrompt.ts` — needs formal lock |
| 4 | Chat architecture (3 systems) | ⏸ Shells exist; runtime architecture pending |
| 5 | Local LLM + memory + voice **architecture doc** | ⏸ |
| 6 | External tool evaluation | ⏸ |
| 7 | Archive / learning memory integration | ⏸ |
| 8–15 | LLM, CodeGraph, Hermes runtime, Cursor bridge, staging mode, voice, rulebooks | ⏸ Explicitly not started |

---

## 4. UI inventory by route

Classification key:

- **P** — Primary (visible by default on daily route)
- **S** — Secondary (section or collapsed on same route)
- **R** — Rare (Advanced / deep disclosure)
- **T** — Technical / debug (Advanced or History)
- **H** — Historical / audit (History)
- **X** — Redundant (duplicate of another route — candidate to remove from hub)
- **K** — Knowledge / learning (Knowledge)

### 4.1 `/system/agent-ops` — Control Center

**File:** `src/app/system/agent-ops/page.tsx` (~8,550 lines — largest debt)

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero + 6 command KPIs | P | Visible | **Keep** |
| Meta strip (staging, mode, scope, legacy) | P | Visible | **Keep** |
| Today's Priority card | P | Visible | **Keep** |
| System readiness (Hermes, CodeGraph, LLM, Scheduler, Cursor) | S | Visible | **Keep** — calm status only |
| Navigate grid (7 route cards) | P | Visible | **Keep** |
| Action feedback / data error blocks | P | Conditional | **Keep** |
| Refill Queue modal + import flows | S | Hero action | **Keep action** — logic stays; ensure not duplicated in legacy |
| **Legacy tools fallback `<details>`** | X | Collapsed but huge | **Remove from hub after parity check** — content already on dedicated routes |
| Legacy tab nav: Today / Issues / Agents / Automation / Advanced / History | X | Inside legacy panel | **Remove** — routes exist |
| Legacy queue tables, import previews, verification panels | X | Inside legacy panel | **Move access** → Issues, Advanced, Automation, History only |
| Legacy agent management dense tables | X | Inside legacy panel | **Move access** → Agents, Agent Detail |
| Legacy automation request log | X | Duplicated | **Automation route only** |
| Local Tailwind stat grids inside legacy | T | Legacy only | **Delete with legacy panel** |

**Phase 0 verdict:** Primary hub surface (post Batch 92) is **aligned**. Legacy fallback is the **#1 consolidation blocker**.

---

### 4.2 `/system/agent-ops/issues` — Issue queue

**File:** `src/app/system/agent-ops/issues/page.tsx`

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero KPIs (queue capacity, attention, etc.) | P | Visible | **Keep** |
| Meta strip | P | Visible | **Keep** |
| Queue guardrails info | S | Section | **Keep** — short |
| Recommended next action | P | Section | **Keep** |
| Filters + search | P | Section | **Keep** |
| Issue registry table | P | Section | **Keep** — main daily entry |
| Refill Queue action | P | Header | **Keep** |

**Phase 0 verdict:** **Mostly clean.** Minor cleanup: ensure no duplicate KPIs in sections.

---

### 4.3 `/system/agent-ops/issues/[issueCode]` — Issue Workspace

**File:** `src/app/system/agent-ops/issues/[issueCode]/page.tsx` (~1,700 lines)

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero KPIs (severity, status, execution, timeline, messages, fix plan) | P | Visible | **Keep** |
| Meta strip | P | Visible | **Keep** |
| Lifecycle rail | P | Section | **Keep** — core lifecycle |
| Issue context (problem, expected, impact) | P | Workbench | **Keep** |
| Agent chat + intent chips | P | Workbench | **Keep** — Phase 4 issue chat |
| Cursor prompt editor + actions | P | Workbench | **Keep** — core workflow |
| Evidence / fix plan disclosures | S | `<details>` | **Keep collapsed** |
| CodeGraph hints disclosure | R | `<details>` | **Keep collapsed** — advisory |
| Post-Cursor review / verification | S | `<details>` | **Keep** — show when relevant |
| Secondary / exceptional actions | R | `<details>` | **Keep collapsed** |
| Timeline disclosure | H | `<details>` | **Keep** — or link to History later |
| Technical status (Hermes/CodeGraph gates) | T | `<details>` | **Move toward Advanced** or keep collapsed |

**Phase 0 verdict:** **Functionally complete** but dense. Phase 2 refines order/visibility; Phase 0 = no rewrite, only document default-visible vs collapsed rules.

---

### 4.4 `/system/agent-ops/agents` — Agent registry

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero KPIs + meta | P | Visible | **Keep** |
| Council promo + Open Council | S | Section | **Keep** |
| Filter chips | P | Section | **Keep** |
| Agent roster table | P | Section | **Keep** |
| Advanced agent tools disclosure | R | Section | **Keep collapsed** — links to Knowledge/Advanced |

**Phase 0 verdict:** **Clean enough** for daily use.

---

### 4.5 `/system/agent-ops/agents/[agentId]` — Agent Workspace

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero KPIs + meta | P | Visible | **Keep** |
| Status controls | P | Section | **Keep** |
| Agent Chat (notes) | P | Section | **Keep** — Phase 4 individual chat |
| Memory forms + list | P | Section | **Keep** |
| Focus shortcut | S | Section | **Consider merge** with Memory (Phase 1 batch 4) |
| Timeline | S | Section | **Keep** |
| Issues linked | S | Section | **Keep** |
| Batch 8 guardrail | T | Section | **Keep** — short |

**Phase 0 verdict:** **Acceptable.** Optional merge Focus into Memory in cleanup batch 4.

---

### 4.6 `/system/agent-ops/council` — Agent Council

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Command hero (no KPIs — chat page type) | P | Visible | **Keep** |
| Meta strip | P | Visible | **Keep** |
| Group chat thread + composer (disabled) | P | Section | **Keep** — Phase 4/8 runtime later |
| Participants disclosure | S | Progressive disclosure | **Keep collapsed** |
| Future integration readiness | T | Progressive disclosure | **Move to Advanced** or keep collapsed |
| Safety guardrails | S | Section | **Keep** |

**Phase 0 verdict:** **Shell ready.** No expansion until Phase 4 architecture approved.

---

### 4.7 `/system/agent-ops/automation`

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero KPIs + meta | P | Visible | **Keep** |
| Safety boundaries | S | Section | **Keep** |
| Primary manual controls | P | Section | **Keep** |
| Queue health / scan workflow | P | Section | **Keep** |
| Scheduler preparation | S | Section | **Keep** |
| Manual run tools (copy-only commands) | R | Section | **Keep** — could trim copy-only list later |
| Quiet mode controls | S | Section | **Keep** |

**Phase 0 verdict:** **Good separation** from hub. Hub legacy automation tab is **redundant (X)**.

---

### 4.8 `/system/agent-ops/knowledge`

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero KPIs + meta | P | Visible | **Keep** |
| Memory safety boundaries | S | Section | **Keep** |
| Lesson candidates | P | Section | **Keep** — Phase 7 target |
| Lesson approval policy | S | Section | **Keep** |
| Readiness (Hermes, agentmemory, Supabase) | S | Section | **Keep** |
| Memory file review / refresh plan | R | Collapsed | **Keep collapsed** |
| Learning queue / Hermes / agentmemory role | T | Collapsed | **Keep collapsed** |

**Phase 0 verdict:** **Correct home** for Phase 7 learning work.

---

### 4.9 `/system/agent-ops/advanced`

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero KPIs + meta | P | Visible | **Keep** |
| Import / fix-plan / verification operator tools | R/T | Sections | **Keep** — primary home for technical work |
| Dense tables and import previews | T | Sections | **Keep here** — not on hub |

**Phase 0 verdict:** **Correct sink** for technical UI. Hub legacy Advanced tab is **redundant (X)**.

---

### 4.10 `/system/agent-ops/history`

| UI element | Class | Today | Target |
|------------|-------|-------|--------|
| Hero KPIs + meta | P | Visible | **Keep** |
| Read-only guardrails | S | Section | **Keep** |
| Recent activity + filters | P | Section | **Keep** |
| Reports / artifact paths | H | Section | **Keep** |

**Phase 0 verdict:** **Clean.** Hub legacy History tab is **redundant (X)**.

---

## 5. Redundancy map (hub legacy → dedicated route)

| Legacy hub content | Dedicated route | Action after approval |
|--------------------|-----------------|------------------------|
| Issues queue tables / filters | `/issues` | Remove from hub |
| Agent roster / status dashboard | `/agents` | Remove from hub |
| Automation controls / request log | `/automation` | Remove from hub |
| Import / fix-plan / verification tools | `/advanced` | Remove from hub |
| History / reports | `/history` | Remove from hub |
| Today's snapshot duplicate KPIs | Hub primary (already) | Remove legacy duplicate grids |

**Rule:** Every workflow must remain reachable via navigation grid or dedicated route **before** legacy panel removal.

---

## 6. Target clean navigation structure

```
AgentOps (app chrome)
└── Control Center          → attention, readiness, navigate
    ├── Issues              → daily queue (primary work entry)
    │   └── [issueCode]     → full issue lifecycle
    ├── Agents              → 12-agent overview
    │   └── [agentId]       → individual agent workspace
    ├── Council             → group chat (staging shell)
    ├── Automation          → queue, manual runs, scheduler prep
    ├── Knowledge           → lessons, memory, learning
    ├── Advanced            → imports, fix plans, technical tools
    └── History             → runs, decisions, reports
```

**Daily path for Piter:**

1. Open **Control Center** → read Today's Priority + KPIs  
2. Open **Issues** → pick issue  
3. Work in **Issue Workspace** until verify/close  
4. Use **Agents / Council / Automation / Knowledge / Advanced / History** only when needed  

---

## 7. What stays visible by default (global rule)

| Route | Default visible |
|-------|-----------------|
| Control Center | Priority, KPIs, readiness summary, navigation |
| Issues | KPIs, recommended action, filters, table |
| Issue Workspace | KPIs, lifecycle rail, context, chat, prompt editor |
| Agents | KPIs, filters, roster table |
| Agent Workspace | KPIs, status, chat, memory |
| Council | Chat thread only (+ collapsed participants) |
| Automation | KPIs, primary controls, queue health |
| Knowledge | KPIs, lesson candidates, policy |
| Advanced | KPIs, operator sections (technical OK here) |
| History | KPIs, activity feed |

Everything marked **R/T/H** in inventory stays collapsed or on Advanced/History/Knowledge.

---

## 8. Small-batch implementation plan (after Piter approval)

**Do not start these batches until Phase 0 plan is explicitly approved.**

| Batch | Name | Scope | Files (expected) | Risk | Status |
|-------|------|-------|------------------|------|--------|
| **93** | Page migration completion | All 10 routes migrated | Reports | Low | **Complete** |
| **94 / 0A** | Hub legacy audit + parity checklist | 40-row matrix, G1–G17 | Checklist doc | Low | **Complete** |
| **95 / 0B-prep** | Operator parity G1–G9 | Advanced, Issues, Automation surfaces | `operators/*`, route pages | Medium | **Complete** |
| **96-prep** | Roadmap status sync | Docs only; Option B recorded | Master roadmap | Low | **Complete** |
| **96b / 0B-prep-2** | G10–G14 parity (**Option B required**) | Agents, Agent Workspace, Knowledge | `operators/*`, route pages | Medium | **Complete** |
| **96 / 0B** | Inner legacy panel removal | Hub `page.tsx` inner panel only | `agent-ops/page.tsx` | **High** | **Complete** |
| **0C** | Issues list polish | Duplicate KPI/guardrail noise | `issues/page.tsx` | Low | **Complete** |
| **0D** | Issue Workspace visibility pass | Reorder disclosures | `issues/[issueCode]/page.tsx` | Medium | **Complete** |
| **0E** | Agents + Agent Workspace polish | UI polish (G10–G14 in 96b) | `agents/*` | Low | **Complete** |
| **0F** | Cross-link pass | Nav after legacy removal | Multiple routes | Low | **Complete** |
| **0G** | Knowledge + Council trim | Collapsed technical cards | `knowledge`, `council` | Low | **Complete** |
| **0H** | Full browser QA | After 0C–0G | QA report | Required | **Complete** |

**G10–G14 gate:** Option B approved (2026-05-30). Batch 96b required before Batch 96.

**Recommended order:** 96-prep → 96b → 96 + post-0B QA → 0C–0G → 0H → Phase 1+

**After Phase 0 batches complete → start Roadmap Phase 1** (formal route cleanup sign-off) and **Phase 2** (Issue Workspace refinement).

---

## 9. Explicit non-goals (Phase 0)

- ❌ No Hermes, CodeGraph, local LLM, agentmemory, Supertonic, OpenMonoAgent activation  
- ❌ No automatic Cursor execution  
- ❌ No scheduler activation  
- ❌ No Supabase schema/RLS/migration changes  
- ❌ No service logic rewrites  
- ❌ No feature removal without parity proof  
- ❌ No production/main touches  
- ❌ No new runtime systems  

---

## 10. Open questions for Piter review

1. **Hub legacy panel:** Approve complete removal after batch 0A parity checklist?  
2. **Issue Workspace technical status block:** Stay collapsed on issue page or move to Advanced only?  
3. **Council integration readiness cards:** Move to Advanced/Knowledge?  
4. **Prompt standard (Phase 3):** Formalize existing `normalizeCursorPrompt.ts` as owner-file now or after Phase 0 cleanup?  
5. **Phase 0 batch 0B timing:** Proceed immediately after approval or wait for additional staging QA weeks?

---

## 11. Success criteria for Phase 0 approval

Phase 0 planning is **complete** when Piter confirms:

- [ ] Inventory accurately reflects current UI  
- [ ] Redundancy map (hub → routes) is acceptable  
- [ ] Small-batch sequence (0A–0H) is approved  
- [ ] No objection to hub legacy removal plan (0B)  
- [ ] Ready to authorize **Batch 0A parity checklist** as first implementation step  

Phase 0 **implementation** is complete when Batch 0H browser QA passes and hub no longer contains duplicate legacy workflows.

---

## 12. Related documents

| Document | Role |
|----------|------|
| `AGENTOPS_MASTER_ROADMAP_CLEAN_UI_MEMORY_HERMES_CODEGRAPH_LOCAL_LLM.md` | Master roadmap Phases 0–15 |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_84–92_*` | Completed visual shell migrations |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | Design-system cleanup tracker (step 49: hub legacy debt noted) |

---

## FINAL CHECK (Phase 0 planning deliverable)

| Item | Status |
|------|--------|
| UI inventory | ✅ Complete (§4) |
| Primary/secondary/rare classification | ✅ Complete |
| Redundancy identified | ✅ Hub legacy panel |
| Target navigation | ✅ §6 |
| Small-batch plan | ✅ §8 (blocked until approval) |
| UI code rewritten | ❌ Not started (by design) |
| Routes moved | ❌ Not started |
| Functionality removed | ❌ Not started |

**Next step after approval:** Run **Batch 0A — Hub legacy parity checklist** (documentation + link/action audit only, no code).
