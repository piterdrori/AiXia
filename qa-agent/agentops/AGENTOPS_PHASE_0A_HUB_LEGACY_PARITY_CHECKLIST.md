# AgentOps Phase 0A — Hub Legacy Parity Checklist and Control Center Cleanup Audit

**Date:** 2026-05-30  
**Type:** Audit / checklist only — no app code changes  
**Status:** COMPLETE  
**Route audited:** `/system/agent-ops`  
**File audited:** `src/app/system/agent-ops/page.tsx` (~8,575 lines total)  
**Authority:** `AGENTOPS_PHASE_0_UI_UX_CONSOLIDATION_PLAN.md`, Batch 93 completion checkpoint

---

## 1. Purpose

AgentOps visible page migration is complete (Batch 93). Phase 0A audits the Hub **legacy fallback panel** before any removal, hide, or consolidation work (Batch 0B).

This document proves — item by item — whether each legacy fallback link, action, table, panel, workflow, and data surface is:

1. Already on the correct dedicated route  
2. Still needed on the Hub **primary** surface (outside legacy)  
3. Should move/collapse later  
4. Should remain temporarily (no equivalent yet)  
5. Requires Piter approval before removal  

**No code, UI, routes, logic, Supabase, or runtime changes were made in this batch.**

---

## 2. Scope

| In scope | Out of scope |
|----------|----------------|
| Legacy fallback location and inventory | Removing/hiding legacy panel |
| Parity matrix vs dedicated routes | Business logic rewrites |
| Gap classification | Supabase / API changes |
| 0B readiness verdict | Runtime activation |
| Hub primary surface inventory (preserve list) | Production/main |

**Dedicated routes compared:**

| Route | File |
|-------|------|
| `/system/agent-ops/issues` | `issues/page.tsx` |
| `/system/agent-ops/issues/[issueCode]` | `issues/[issueCode]/page.tsx` |
| `/system/agent-ops/agents` | `agents/page.tsx` |
| `/system/agent-ops/agents/[agentId]` | `agents/[agentId]/page.tsx` |
| `/system/agent-ops/automation` | `automation/page.tsx` |
| `/system/agent-ops/advanced` | `advanced/page.tsx` |
| `/system/agent-ops/history` | `history/page.tsx` |
| `/system/agent-ops/knowledge` | `knowledge/page.tsx` |
| `/system/agent-ops/council` | `council/page.tsx` |

---

## 3. Hub legacy fallback location summary

### 3.1 File structure (three layers)

| Layer | Lines (approx.) | DOM / ID | Description |
|-------|-----------------|----------|-------------|
| **Hub primary surface** | ~3211–3378 | N/A (visible by default) | Command hero, meta strip, Today's Priority, System readiness, Navigate grid — **not legacy** |
| **Outer legacy shell** | 3388–3412, closes 6595 | `#agentops-legacy-tools` | Collapsed `<details>` “Legacy tools fallback (minimal)” + 4 shortcut buttons (Issues, Automation, Advanced, History) |
| **Inner legacy panel** | 3413–6594 | Nested `<details>` | “Open full legacy panel (temporary)” — **full tab system and operator UI** |
| **Page-level modals** | 6599–8571 | N/A | Shared modals/handlers **outside** legacy JSX but **triggered only from legacy (or hub hero Refill)** today |

### 3.2 Legacy panel boundaries

- **Begins:** line 3388 — `<details ref={legacyToolsRef} id="agentops-legacy-tools">`
- **Full tab content begins:** line 3417 — inside nested `<details>` summary “Open full legacy panel”
- **Tab navigation:** lines 3471–3478 — `AgentOpsTabNav` (sticky)
- **Ends:** line 6594–6595 — closing nested + outer `</details>`
- **State:** `agentOpsTab` (`useState`, default `"today"`), `openLegacyTools(tab?)` opens outer details + optional tab

### 3.3 Legacy tabs

| Tab ID | Label | Primary content lines (approx.) |
|--------|-------|----------------------------------|
| `today` | Today | 3418–3468 snapshot; 5083–5133 Daily Operating View |
| `issues` | Issues | 3766–4521 import/queue; 5136–5427 queue management |
| `agents` | Agents | 5431–6538 agent management dense UI |
| `automation` | Automation | 3480–3763 overview/requests; 4524–4733 scheduler |
| `advanced` | Advanced | 4736–5078 fix plans + verification requests; 6561–6591 MVP notice |
| `history` | History | 6541–6558 redirect-only stub |

**Note:** `automation` and `issues` tab blocks appear in **two** JSX regions (disclosures split across file order). All are gated by `agentOpsTab === "<tab>"`.

### 3.4 Shared data dependencies (`loadDashboardData`)

Legacy tabs consume the same hub page data hooks/APIs (no separate legacy fetch):

- Dashboard summary, Active Top 10, backlog preview/count  
- Pending verifications, verification requests, fix plans  
- Queue health, manual scan workflow, import review summary  
- Scheduler prep, automation requests  
- Managed agents, status dashboard, focus directives, focus ranking  
- Memory file review, memory refresh plan  
- Hermes status (mock)  

### 3.5 Shared handlers (page-level, not route-local)

Key handlers/modals live on `AgentOpsPage` regardless of legacy visibility:

- Finding row actions → `actionModal` (approve, reject, defer, mark fixed, etc.)  
- Refill → `refillModalOpen` (also on **hub hero**)  
- Import modals → static / browser / workflow / write-draft  
- Import candidate / review decisions  
- Queue health decisions, manual scan step notes  
- Scheduler decisions, automation request modal  
- Fix plan decisions, Cursor handoff, fix report, verification request actions  
- Agent window, memory, interaction modals  
- Focus directive CRUD, ranking decisions, memory refresh decisions  

**Critical 0B implication:** Removing legacy JSX without relocating triggers **orphans** these modals unless equivalent buttons exist on dedicated routes.

---

## 4. Legacy tabs/sections inventory

### 4.1 Outer shell (minimal)

| Item | Type |
|------|------|
| Summary “Legacy tools fallback (minimal)” | disclosure |
| Shortcut: Open Issues | link/action |
| Shortcut: Open Automation | link/action |
| Shortcut: Open Advanced | link/action |
| Shortcut: Open History | link/action |
| Nested “Open full legacy panel (temporary)” | disclosure |

### 4.2 Today tab

| Section | Items |
|---------|-------|
| Command center snapshot | 4 KPI cards (queue health, Hermes, scheduler, today's queues) |
| Daily Operating View | 4 stat cards + top-5 active queue preview list |

### 4.3 Issues tab

| Section | Items |
|---------|-------|
| Import tools disclosure | 4 import buttons, queue health panel, manual scan workflow, import candidate review table |
| Queue management disclosure | Verification waiting banner, guardrails, verification queue table, Active Top 10 table + row actions, backlog preview + Mark Verified Fixed |

### 4.4 Automation tab

| Section | Items |
|---------|-------|
| Automation Overview | 5 stat cards + safety info |
| Safe Request Controls | `automationControlActions` grid → Create Request |
| Latest Request / Status | Request log summary |
| Copy commands disclosure | `automationCopyActions` Copy Only |
| Readiness disclosure | Hermes meter, verification runner info, orchestrator info |
| Scheduler disclosure | Full scheduler prep + decision buttons |

### 4.5 Advanced tab

| Section | Items |
|---------|-------|
| Fix Plan Review | Full plan cards + approve/reject/handoff/report actions |
| Verification Requests | Full table + row action menu |
| MVP Safety Notice | Informational guardrails list |

### 4.6 Agents tab

| Section | Items |
|---------|-------|
| Agent Overview | 4 summary cards |
| Detailed disclosure | Agent Management, Status Dashboard (filters + wide table), Focus Directives (form + table), Ranking Preview, Memory Files Review, Memory Refresh Plan, Managed Agents roster table + row menus |

### 4.7 History tab

| Section | Items |
|---------|-------|
| Redirect stub | Info block + “Open AgentOps History” button |

### 4.8 Page modals (triggered from legacy / hero)

| Modal | Typical trigger |
|-------|-----------------|
| Refill Active Top 10 | Hub hero, legacy queue health, workflow steps |
| Import static/browser/workflow/write-draft | Legacy Issues import buttons |
| Import candidate/review decisions | Legacy import review tables |
| Queue health decision / scan needed | Legacy Issues queue health |
| Manual scan step note | Legacy workflow steps |
| Scheduler decision | Legacy Automation scheduler |
| Automation request confirm | Legacy Automation Create Request |
| Finding row action | Legacy Active Top 10 |
| Verification result (pending queue) | Legacy Verification Queue |
| Backlog verified fixed | Legacy Backlog Preview |
| Fix plan / handoff / fix report / verification request | Legacy Advanced tab |
| Agent window / memory / interaction | Legacy Agents tab |
| Focus directive / ranking / refresh decisions | Legacy Agents tab |

---

## 5. Full parity matrix

**Legend — Equivalent exists:** Yes = full interactive parity; Partial = read-only, link-back, or subset; No = hub legacy only.

| # | Legacy tab / section | Legacy item name | Item type | Current function / purpose | Dedicated route equivalent | Eq exists | Equivalent route/file | Same action | Same data | Same workflow | Remove later | Risk | Follow-up | Notes |
|---|----------------------|------------------|-----------|----------------------------|----------------------------|-----------|----------------------|-------------|-----------|---------------|--------------|------|-----------|-------|
| 1 | Outer shell | Open Issues shortcut | link | Navigate to Issues route | Issues list | Yes | `issues/page.tsx` | Yes | Yes | Yes | Yes | low | none | Redundant with Navigate grid |
| 2 | Outer shell | Open Automation shortcut | link | Navigate to Automation | Automation controls | Yes | `automation/page.tsx` | Yes | Partial | Yes | Yes | low | none | Redundant with Navigate grid |
| 3 | Outer shell | Open Advanced shortcut | link | Navigate to Advanced | Advanced tools | Yes | `advanced/page.tsx` | Yes | Partial | Yes | Yes | low | none | Redundant with Navigate grid |
| 4 | Outer shell | Open History shortcut | link | Navigate to History | History feed | Yes | `history/page.tsx` | Yes | Yes | Yes | Yes | low | none | Redundant with Navigate grid |
| 5 | Today | Command center snapshot (4 cards) | KPI/card | Compact queue/Hermes/scheduler stats | Hub hero KPIs + System readiness | Partial | Hub primary | N/A | Partial | Partial | Yes | low | preserve on Hub | Duplicates hero/readiness |
| 6 | Today | Daily Operating View stats | KPI/card | Active/slots/backlog/verify counts | Issues hero KPIs | Partial | `issues/page.tsx` | N/A | Yes | Partial | Yes | low | move to Issues | Counts on Issues route |
| 7 | Today | Active queue preview (top 5) | table/list | Read-only top-5 active findings | Issues filtered list | Partial | `issues/page.tsx` | N/A | Partial | Partial | Yes | low | move to Issues | Issues list is canonical; preview optional |
| 8 | Issues | Import Static Findings | import tool | Open static import modal + confirm import | Advanced import summary + hub link-back | Partial | `advanced/page.tsx` | No | Partial | No | Not yet | **high** | move to Advanced | Advanced says “Open legacy import operators” |
| 9 | Issues | Import Browser Findings | import tool | Browser import modal | Same as row 8 | Partial | `advanced/page.tsx` | No | Partial | No | Not yet | **high** | move to Advanced | Interactive import only on hub |
| 10 | Issues | Import Workflow Findings | import tool | Workflow import modal | Same as row 8 | Partial | `advanced/page.tsx` | No | Partial | No | Not yet | **high** | move to Advanced | |
| 11 | Issues | Import Write/Draft Findings | import tool | Write-draft import modal | Same as row 8 | Partial | `advanced/page.tsx` | No | Partial | No | Not yet | **high** | move to Advanced | |
| 12 | Issues | Queue Health & Scan Trigger | workflow control | Metrics, recommendation, Refill, Record Hold, Copy commands, Mark Scan Needed | Automation queue health + primary controls | Partial | `automation/page.tsx` | Partial | Yes | Partial | Not yet | medium | move to Automation | Automation has refill/hold/scan; hub legacy has richer copy UI |
| 13 | Issues | Manual Scan / Import Workflow | workflow control | Step list, copy/mark running/blocked, import shortcuts | Automation manual scan section | Partial | `automation/page.tsx` | Partial | Yes | Partial | Not yet | medium | move to Automation | Automation has steps; legacy has import shortcut modals wired |
| 14 | Issues | Import Candidate Review table | table/list | Per-candidate approve/reject/review actions | Advanced import sources table (read-only) | Partial | `advanced/page.tsx` | No | Partial | No | Not yet | **high** | move to Advanced | No candidate row actions on Advanced |
| 15 | Issues | Verification Queue (pending) | table/list | Record verified fixed / still broken / follow-up / blocked | Issues list (verification filter) — view only | Partial | `issues/page.tsx` | No | Partial | No | Not yet | **high** | move to Issues | No pending-verification action UI on Issues route |
| 16 | Issues | Active Top 10 Queue table | table/list | Full row menu: workspace, remark, approve, in progress, mark fixed, reject, defer, false positive | Issues list → Open Workspace per row | Partial | `issues/page.tsx` + `[issueCode]` | Partial | Yes | Partial | Not yet | **high** | move to Issues | Bulk queue ops only in legacy; workspace has per-issue lifecycle |
| 17 | Issues | Backlog Preview + Mark Verified Fixed | action | Resolve backlog finding from preview | Issues backlog filter — no mark verified | Partial | `issues/page.tsx` | No | Partial | No | Not yet | **high** | move to Issues | Backlog resolution action hub-only |
| 18 | Automation | Automation Overview cards | KPI/card | Mode/scheduler/quiet/latest run | Automation hero KPIs + sections | Yes | `automation/page.tsx` | N/A | Yes | Yes | Yes | low | none | |
| 19 | Automation | Safe Request Controls (Create Request grid) | workflow control | Modal → `recordAgentOpsAutomationControlRequest` | Automation primary controls (simplified `recordRequest`) | Partial | `automation/page.tsx` | Partial | Yes | Partial | Not yet | medium | move to Automation | Legacy has full action grid + modal; Automation has subset buttons |
| 20 | Automation | Latest automation request log | table/list | Shows latest request | Automation manual run tools disclosure | Partial | `automation/page.tsx` | N/A | Partial | Partial | Yes | low | move to Automation | |
| 21 | Automation | Copy commands/prompts disclosure | action | Copy-only CLI prompts | Automation manual run tools Copy Only | Yes | `automation/page.tsx` | Yes | Yes | Yes | Yes | low | none | |
| 22 | Automation | Hermes Memory Support Meter | KPI/card | Hermes readiness display | Knowledge readiness + Hub System readiness | Partial | `knowledge/page.tsx`, Hub primary | N/A | Partial | Partial | Yes | low | move to Knowledge | Advisory only |
| 23 | Automation | Verification Runner / Orchestrator info | disclosure | CLI documentation blocks | Advanced reports section | Partial | `advanced/page.tsx` | N/A | Partial | Partial | Yes | low | move to Advanced | Informational |
| 24 | Automation | Scheduler Preparation (full) | workflow control | Prep snapshot + Keep Manual / Approve Prep / Request Changes / Reject buttons | Automation scheduler section (read-only snapshot) | Partial | `automation/page.tsx` | **No** | Yes | **No** | Not yet | **high** | move to Automation | Scheduler **decision buttons** hub-only |
| 25 | Advanced | Fix Plan Review (interactive) | workflow control | Approve/reject/handoff/report/verification per plan | Advanced fix plan table (read-only) + Issue Workspace fix plan actions | Partial | `advanced/page.tsx`, `[issueCode]/page.tsx` | Partial | Yes | Partial | Not yet | **high** | move to Advanced | Per-issue workspace covers one issue; legacy lists all plans with full actions |
| 26 | Advanced | Verification Requests table (interactive) | verification tool | Approve/copy/running/manual result row actions | Advanced verification table (read-only) + Issue Workspace verification | Partial | `advanced/page.tsx`, `[issueCode]/page.tsx` | Partial | Yes | Partial | Not yet | **high** | move to Advanced | Full request queue actions hub-only |
| 27 | Advanced | MVP Safety Notice | disclosure | Informational guardrails | Issues/Automation guardrail sections | Partial | multiple | N/A | N/A | N/A | Yes | low | none | Safe to drop with legacy |
| 28 | Agents | Agent Overview cards | KPI/card | Agent counts summary | Agents hero KPIs | Yes | `agents/page.tsx` | N/A | Yes | Yes | Yes | low | none | |
| 29 | Agents | Agent Status Dashboard (wide table + filters) | table/list | Dense status, Mark Reviewed, Needs Focus, Open Agent | Agents roster table (simpler) | Partial | `agents/page.tsx` | Partial | Partial | Partial | Not yet | medium | move to Agents | Legacy table much wider; roster links to workspace |
| 30 | Agents | Focus Directives form + table | workflow control | Create/edit/activate directives | Not on Agents or Knowledge routes | No | — | No | No | No | Not yet | **high** | needs Piter decision | Preview-only ranking system; hub-only |
| 31 | Agents | Ranking Preview + decisions | workflow control | Preview ranking + record decision | Not on dedicated routes | No | — | No | No | No | Not yet | **high** | needs Piter decision | Hub-only |
| 32 | Agents | Agent Memory Files Review table | table/list | Per-agent file review + decisions | Knowledge memory file review (read-only subset) | Partial | `knowledge/page.tsx` | No | Partial | No | Not yet | medium | move to Knowledge | Knowledge lacks review decision actions |
| 33 | Agents | Memory Refresh Plan + decisions | workflow control | Refresh plan actions | Knowledge memory refresh (read-only) | Partial | `knowledge/page.tsx` | No | Partial | No | Not yet | medium | move to Knowledge | Decision actions hub-only |
| 34 | Agents | Managed Agents roster + row menus | table/list | Memory/interaction/status actions inline | Agents roster → Agent Workspace | Partial | `agents/page.tsx`, `[agentId]/page.tsx` | Partial | Yes | Partial | Not yet | medium | move to Agents | Workspace has memory/chat; legacy has modals + extra menus |
| 35 | Agents | Agent Interaction Window modal | modal | Full agent window (status, focus, memory, timeline, add interaction) | Agent Workspace sections | Partial | `[agentId]/page.tsx` | Partial | Yes | Partial | Not yet | medium | move to Agents | Overlap with workspace; legacy modal richer |
| 36 | History | Redirect stub | link | Open History route | Full History page | Yes | `history/page.tsx` | Yes | Yes | Yes | Yes | low | none | Legacy History tab is already a stub |
| 37 | Hub primary (not legacy) | Refill Queue (hero) | action | Opens refill modal | Issues + Automation refill | Yes | Hub primary + `issues/page.tsx`, `automation/page.tsx` | Yes | Yes | Yes | N/A | low | **preserve on Hub** | Must keep on hub primary through 0B |
| 38 | Hub primary | Today's Priority action | workflow control | May open legacy Issues tab or navigate | Issues recommended action | Partial | `issues/page.tsx` | Partial | Yes | Partial | N/A | medium | preserve on Hub | `openLegacyTools("issues")` used for some priorities |
| 39 | Hub primary | Navigate grid (7 cards) | link | Route navigation | Same routes | Yes | all dedicated routes | Yes | N/A | Yes | N/A | low | **preserve on Hub** | Primary navigation — keep |
| 40 | Council | (none in legacy tabs) | — | Council not in legacy tab nav | Council route | Yes | `council/page.tsx` | Yes | Yes | Yes | N/A | low | none | No legacy Council tab |

---

## 6. Dedicated route mapping (verified, not assumed)

| Legacy tab content | Expected dedicated route | Verified parity |
|--------------------|--------------------------|-----------------|
| Today snapshot / daily view | Hub primary + `/issues` | **Partial** — counts duplicated; queue ops not on Issues |
| Issues import / queue / verification / Active Top 10 / backlog | `/issues`, `/issues/[issueCode]` | **Partial** — list + workspace exist; **import modals, queue tables, pending verification actions hub-only** |
| Agents dense management | `/agents`, `/agents/[agentId]` | **Partial** — roster + workspace exist; **focus directives, ranking, refresh decisions hub-only** |
| Automation controls / scheduler | `/automation` | **Partial** — core controls exist; **scheduler decision buttons + full Create Request grid hub-only** |
| Advanced fix plans / verification requests | `/advanced`, `/issues/[issueCode]` | **Partial** — read-only Advanced + per-issue workspace; **full multi-plan / request-queue actions hub-only** |
| History | `/history` | **Yes** — legacy tab is redirect stub; History route is complete |
| Knowledge / lessons / memory review | `/knowledge` | **Partial** — lessons + read-only memory; **interactive refresh/review decisions hub-only** |
| Council / chat | `/council` | **Yes** — not in legacy tabs; dedicated route complete |

**Explicit link-back evidence (dedicated routes acknowledge hub gap):**

- `advanced/page.tsx` — “Open legacy import operators”, “Open legacy fix-plan actions”, “Open Control Center legacy tools”  
- `agents/page.tsx` — “Open Control Center legacy tools” for dense agent tools  

---

## 7. Gap list

Items with **no complete equivalent** on dedicated routes. Classification per Phase 0A spec:

| ID | Gap | Class | Priority |
|----|-----|-------|----------|
| G1 | Four import modals + confirm import flows | **B** — add to Advanced | P0 |
| G2 | Import candidate review row actions | **B** — add to Advanced | P0 |
| G3 | Active Top 10 row actions (reject/defer/approve/mark fixed/etc.) | **G** — add to Issues or Issue Workspace | P0 |
| G4 | Pending verification queue record-result actions | **G** — add to Issues | P0 |
| G5 | Backlog Mark Verified Fixed | **G** — add to Issues | P1 |
| G6 | Scheduler preparation decision buttons | **F** — add to Automation | P1 |
| G7 | Full automation Create Request grid + modal | **F** — add to Automation | P1 |
| G8 | Fix Plan Review multi-plan interactive actions | **C** — add to Advanced | P0 |
| G9 | Verification Requests queue interactive actions | **C** — add to Advanced | P0 |
| G10 | Focus Directives CRUD + table | **H** or **I** — Agents or defer | P2 |
| G11 | Focus Ranking Preview + decisions | **I** — needs Piter decision | P2 |
| G12 | Memory file review decision actions | **E** — add to Knowledge | P2 |
| G13 | Memory refresh plan decision actions | **E** — add to Knowledge | P2 |
| G14 | Agent Interaction Window modal (legacy path) | **H** — merge with Agent Workspace | P2 |
| G15 | Today's Priority → `openLegacyTools("issues")` | **A** — preserve hub primary behavior | P1 |
| G16 | Hub hero Refill Queue + refill modal | **A** — preserve on Hub primary | P0 |
| G17 | Page-level modals without dedicated triggers if legacy removed | **B–H** — relocate triggers before 0B | P0 |

**Summary counts:**

| Class | Meaning | Count |
|-------|---------|-------|
| A | Must stay on Hub primary | 2 |
| B | Must add to dedicated route (Advanced) | 3 |
| C | Must move to Advanced | 2 |
| E | Must move to Knowledge | 2 |
| F | Must move to Automation | 2 |
| G | Must move to Issues / Issue Workspace | 3 |
| H | Must move to Agents / Agent Workspace | 2 |
| I | Piter approval before removal | 1 |
| J | Unclear | 0 |

---

## 8. Risk classification (future Batch 0B)

| Risk tier | Legacy areas | Impact if removed without prep |
|-----------|--------------|--------------------------------|
| **Low** | Outer shortcut buttons, History stub, duplicated Today KPIs, MVP safety notice, Navigate redundancy | No workflow loss |
| **Medium** | Automation copy/readiness info, agent overview cards, simplified queue health overlap | Documentation/readability loss only |
| **High** | Import modals, import candidate review, Active Top 10 actions, verification queues, fix plan + verification request operators, scheduler decisions, focus directives/ranking, memory refresh decisions | **Direct owner workflow loss** — modals become unreachable |

**Modals orphan risk:** ~20 modals at lines 6599–8571 remain in `AgentOpsPage` but lose UI triggers if legacy panel is deleted without relocation.

---

## 9. 0B readiness verdict

### Verdict: **Not ready — missing equivalents**

Batch 0B (remove or hide Hub legacy fallback) **must not proceed** until interactive parity is established on dedicated routes (or explicitly approved exceptions documented).

**Supporting sub-verdicts:**

| Sub-verdict | Applies |
|-------------|---------|
| Ready for 0B removal/hide | **No** |
| Not ready: missing equivalents | **Yes** — 13+ high-risk gaps (G1–G9, G17) |
| Ready only after adding links | **Partial** — links exist but point **back to hub** (Advanced/Agents), proving gap |
| Ready only after preserving specific controls | **Yes** — Hub hero Refill Queue, Today's Priority, Navigate grid, refill modal wiring |
| Needs Piter decision | **Yes** — Focus Directives / Ranking Preview (G10, G11): remove vs migrate vs keep hub-only |

**Recommended path:**

1. **Batch 95 / Phase 0B-prep** — Extract or re-home operator triggers (no legacy deletion yet)  
2. Piter approval on focus/ranking disposition  
3. **Batch 0B** — Remove inner legacy panel only after parity sign-off + Batch 0H browser QA plan  

**Safe to remove in 0B without prep (only after parity elsewhere):** History stub tab, outer duplicate shortcut row, Today tab duplicate KPI blocks, Advanced MVP notice — **not** the full inner panel wholesale.

---

## 10. What was not changed

- No edits to `src/app/system/agent-ops/page.tsx` or any app source  
- No legacy panel removal, hide, or collapse changes  
- No route, UI, business logic, Supabase, API, or runtime changes  
- No production/main touches  

---

## 11. Validation result

```text
npm run qa:validate-foundation
Result: PASS
```

| Check | Result |
|-------|--------|
| Markdown files | OK |
| Template files | OK |
| Registry JSON parse | OK |
| Registry schema | OK |
| Cross-reference checks | OK |
| Important content checks | OK |

**Build:** Not run — no code changed.

---

## 12. Recommended next batch

Because parity is **not complete**, use **0B-prep**, not raw 0B:

### Recommended next prompt — Batch 95 / Phase 0B-prep

```
Batch 95 / Phase 0B-prep — Add missing operator parity before Hub legacy removal.

Purpose:
Close Phase 0A gaps G1–G9 (minimum) by adding interactive controls to dedicated routes
(Advanced, Issues, Automation) OR extracting shared operator components — without
deleting the Hub legacy fallback yet.

Priority order:
1. Advanced — import modals + import candidate review actions (replace link-back buttons)
2. Issues — Active Top 10 row actions OR explicit queue-action section; pending verification actions; backlog Mark Verified Fixed
3. Automation — scheduler preparation decision buttons; full Create Request grid parity
4. Preserve Hub primary: Refill Queue, Today's Priority, Navigate grid

No legacy panel removal in this batch.
No feature removal.
No logic change beyond relocating UI triggers.
No runtime activation.
No Supabase changes.
```

**Do not recommend yet:** Hermes, CodeGraph, local LLM, AgentMemory, scheduler activation, Supabase changes, or runtime integration.

After 0B-prep + Piter sign-off on G10/G11 → **Batch 96 / Phase 0B** — hide/remove inner legacy panel, keep hub primary + modals until triggers fully migrated.

---

## FINAL CHECK (Phase 0A)

| # | Item | Answer |
|---|------|--------|
| 1 | Report created | **Yes** |
| 2 | App source changed | **No** |
| 3 | Hub page changed | **No** |
| 4 | Routes changed | **No** |
| 5 | Features removed | **No** |
| 6 | Runtime systems activated | **No** |
| 7 | Supabase/RLS/schema changed | **No** |
| 8 | Production/main touched | **No** |
| 9 | Legacy fallback inventoried | **Yes** |
| 10 | Parity matrix created | **Yes** (40 rows) |
| 11 | Gaps identified | **Yes** (17 gaps, G1–G17) |
| 12 | 0B readiness verdict provided | **Yes** — **Not ready** |
| 13 | Command results | `npm run qa:validate-foundation` — **PASS** |
| 14 | Final status | Phase 0A audit complete; 0B blocked on parity prep |
| 15 | Next recommended prompt | **Batch 95 / Phase 0B-prep** (see §12) |

---

## Related documents

| Document | Role |
|----------|------|
| `AGENTOPS_BATCH_93_FINAL_PAGE_MIGRATION_COMPLETION_AND_PHASE_0_ALIGNMENT.md` | Migration complete checkpoint |
| `AGENTOPS_PHASE_0_UI_UX_CONSOLIDATION_PLAN.md` | Phase 0 batches 0A–0H plan |
| `AGENTOPS_MASTER_ROADMAP_CLEAN_UI_MEMORY_HERMES_CODEGRAPH_LOCAL_LLM.md` | Master roadmap |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | Step 49 — hub legacy debt |
