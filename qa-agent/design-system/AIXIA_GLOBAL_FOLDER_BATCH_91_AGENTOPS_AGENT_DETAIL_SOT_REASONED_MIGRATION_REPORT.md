# AiXia Global Design System — Batch 91 — AgentOps Agent Detail SOT-Reasoned Migration Report

**Date:** 2026-05-30  
**Type:** Design-only command-pattern migration — one route, source-of-truth reasoning  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/agents/[agentId]` (task spec referenced `[id]`; actual param folder is `[agentId]`)  
**File:** `src/app/system/agent-ops/agents/[agentId]/page.tsx`

---

## 1. Purpose

Migrate the AgentOps Agent Detail / workspace route using active owner-file reasoning. Seventh AgentOps orb route after History, Issues, Advanced, Knowledge, Automation, and Agents registry. Hub remains not approved.

---

## 2. Source-of-truth files read

| File | Applied for |
|------|-------------|
| `00-README-SOURCE-OF-TRUTH.md` | Authority hierarchy |
| `03-page-shell-standard.md` | `AixiaCommandPageLayout`, scroll lead |
| `04-hero-header-standard.md` §4G, §4H | Command hero sequence; operational metrics → hero KPI row |
| `05-meta-status-strip-standard.md` | Context-only meta; no KPI substitution |
| `06-card-section-standard.md` §4J | KPI placement A; command sections for workspace blocks |
| `08-table-list-standard.md` | Card/list rhythm for interaction, memory, timeline, issues blocks |
| `11-scroll-responsive-standard.md` | Shell scroll; section stacking preserved |
| `13-module-wrapper-rules.md` | Shared components only |
| `14-page-migration-rules.md` §12.1–12.3 | Page-type + operational override + browser QA |
| `15-guardrail-rules.md` | Build/validation gate awareness |

Reference routes (comparison only): Agents registry, Automation, Knowledge, Issues, History, Finance Transactions.

---

## 3. Page-type classification

| Attribute | Classification (`14` §12.3) |
|-----------|----------------------------|
| Route | `/system/agent-ops/agents/[agentId]` |
| Primary type | **Detail / workspace** (single-agent owner workspace) |
| Secondary traits | Status controls; memory/chat forms; timeline; linked issues |
| Hub? | **No** |
| Registry? | **No** (parent registry migrated Batch 90; not edited here) |

Detail/workspace type does **not** skip KPI cards when operational metrics exist (`04` §4H override — same rule applied on Issues, Advanced, Knowledge, Automation, Agents).

---

## 4. Pre-edit reasoning

### Agent metrics / indicators on page

| Signal | Source |
|--------|--------|
| Memory count (reported total) | `statusSummary?.memoryCount ?? agent.memoryCount` |
| Memory records loaded | `memoryItems.length` |
| Active issues linked | `issuesFound.length` |
| Timeline events | `timelineItems.length` |
| Interaction notes | `interactionItems.length` |
| Latest findings / run status | `agent.latestFindingsCount`, `agent.lastRunStatus` |
| Agent status | `statusSummary?.currentStatus ?? agent.status` |
| Current focus | `statusSummary?.currentFocus ?? agent.currentFocus` |
| Workspace quick mode | URL `panel` / `mode` search params → `workspaceModeLabel` |
| Owner gate | `getAgentOpsOwnerStatus` |
| Status action buttons | `updateStatus` → active / quiet / blocked / needs_memory |
| Memory / interaction forms | `submitMemory`, `submitInteraction` |
| Issue navigation | `navigate` to issue workspace by `issue_code` |

### What belongs where (SOT-derived)

| Surface | Content |
|---------|---------|
| **Hero** | Agent display name; role · specialty subtitle; parent link to Agents; Back + Refresh actions; **6 hero KPI metrics** |
| **Meta strip** | Environment (Staging only); Runtime mode (No runtime chat); Agent status (context label); Workspace scope |
| **KPI cards** | Memory count, Memory records, Active issues, Timeline events, Interaction notes, Latest findings |
| **Sections** | Status controls; Agent Chat; Memory; Focus; Timeline; Issues Found; Workspace guardrails; action feedback |
| **Removed local patterns** | `AixiaPage`; hero floating badges; local hero border class; duplicate 5-cell status summary grid |

### Logic/actions/links preserved

- `loadWorkspace`, all API calls (`getAgentOps*`, `addAgentOpsAgentMemory`, `recordAgentOpsAgentInteraction`, `updateAgentOpsAgentStatus`)
- URL params: `agentId`, `searchParams` (`panel`, `mode`)
- `updateStatus`, `submitMemory`, `submitInteraction`
- All form state, loading/error/owner gate, navigation links
- `data-testid="agentops-agent-workspace"`

---

## 5. Safe-to-migrate decision and why

**Decision:** **Yes — migrate in Batch 91.**

**Why:** Owner files clearly classify this as a detail/workspace page with operational counts. Migration is a design-only shell wrap using the same proven command pattern from Batches 86–90. No shared component or CSS changes required. No business logic, API, or workflow changes needed.

---

## 6. KPI/card decision and why

**Required:** Yes — `04` §4H placement **A** (hero `AixiaCommandMetrics`).

**Why:** Page exposes six numeric operational signals from existing loaded data. The pre-migration local 5-cell Tailwind status summary grid duplicated counts and violated §4J placement. Meta strip cannot substitute per `05`.

**Hero metrics (6):**

1. Memory count — reported total  
2. Memory records — loaded entries  
3. Active issues — linked top-10 issues  
4. Timeline events — recent workspace events  
5. Interaction notes — logged owner interactions  
6. Latest findings — count with run status subtitle  

**Removed:** Local status summary KPI grid (role/specialty/focus/memory count/latest activity cells).

**Kept in sections:** Current focus info block in Status controls; role/specialty remain in hero subtitle.

---

## 7. Meta strip decision and why

**Required:** Yes — context/mode/scope only (`05`).

| Item | Role |
|------|------|
| Environment: Staging only | Replaces hero badge |
| Runtime mode: No runtime chat | Replaces hero badge |
| Agent status: current status label | Replaces dynamic hero status badge (context, not KPI) |
| Workspace scope: Memory, notes, timeline | Scope label |

Former floating badges (`Staging only`, `No runtime chat`, dynamic status badge) relocated to meta — not hero KPIs.

---

## 8. Detail/table/list/card decision and why

**Decision:** Keep **section + card/list blocks** pattern (`06` + `08` list/card rhythm) — not a registry table.

| Element | Pattern | Why |
|---------|---------|-----|
| Status controls | Command section + info block + action buttons | Owner status workflow preserved |
| Agent Chat | Section + form + interaction card list | Workspace note logging — not tabular registry |
| Memory | Section + form + memory card list / empty state | Same |
| Focus | Section + input + save button | Quick focus directive preserved |
| Timeline | Section + event cards / empty state | Event feed, not table |
| Issues Found | Section + issue cards + navigate button | Linked issue shortcuts |
| Guardrails | Section + info block | Batch scope notice |

Sequence: **Hero KPIs → meta strip → status → chat → memory → focus → timeline → issues → guardrails → feedback**.

---

## 9. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/agents/[agentId]/page.tsx` | SOT-reasoned command migration |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 48 status |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_91_AGENTOPS_AGENT_DETAIL_SOT_REASONED_MIGRATION_REPORT.md` | This report |

No other routes, shared components, or CSS changed.

---

## 10. What changed visually

- `AixiaPage` → `AixiaCommandPageLayout` + command hero + meta strip
- Removed local hero `className` border styling and floating badges
- Hero title uses agent **display name** (detail identity); subtitle keeps role · specialty
- Added hero `AixiaCommandMetrics` (6 cards from existing data)
- Removed duplicate local status summary 5-cell grid
- All major areas use `AixiaSection surface="command"`
- Batch 8 guardrail wrapped in command section
- Loading wrapped in section + `AixiaEmptyState`
- Access denied uses command shell early return
- Refresh with spinner icon

---

## 11. What logic was preserved

Unchanged: all hooks, API calls, memos, form state/handlers, status update actions, memory/interaction submit flows, timeline/issue rendering, URL param handling (`panel`, `mode`), owner gate, empty/error states, issue workspace navigation, test ID, action feedback info block.

---

## 12. Browser comparison results

**PASS**

| Route | Result |
|-------|--------|
| `/system/agent-ops/agents` | Loads; registry table; hero KPIs; no regression |
| `/system/agent-ops/agents/agentops-owner` | Loads; `data-testid="agentops-agent-workspace"` present; hero title `AgentOps Owner QA`; 6 KPI subtitles visible; 0 hero badges; sections: Status controls, Agent Chat, Memory, Focus, Timeline, Issues Found, Workspace guardrails; Back to Agents + Refresh + status buttons + forms present |
| `/system/agent-ops/automation` | Loads; command rhythm intact |
| `/system/agent-ops/knowledge` | Loads; command rhythm intact |
| `/system/agent-ops/issues` | Loads; command rhythm intact |
| `/system/agent-ops/history` | Loads; command rhythm intact |
| `/finance/transactions` | Loads; finance hub rhythm intact |

No console errors observed during Agent Detail visit. No scroll reset, filter reset, or visible reload on navigation from Agents → Agent Detail.

---

## 13. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter | **No errors** |

---

## 14. Source-of-truth gaps found

**No new gaps.** `04` §4H, `05`, `06` §4J, `08`, and `14` §12.3 were sufficient to classify detail/workspace + operational metrics → hero KPIs + meta context + section/card rhythm without hand-written layout instructions.

---

## 15. Recommended next batch

**Batch 92 — AgentOps Hub readiness review (scope gate only; not implementation)**

- All seven AgentOps orb/control routes (History, Issues, Advanced, Knowledge, Automation, Agents registry, Agent Detail) now pass SOT-reasoned migration.
- **Hub migration still not recommended for implementation** until explicit Piter approval after Hub readiness review.
- Hub requires separate page-type analysis (hub vs dashboard per `14` §12.3) before any code migration.
- Paused items unchanged: finance shell proofs, command-surface context, CSS split, guardrail hard-error escalation, production/main.

---

## 16. Confirmation — no other routes migrated

Confirmed. Only `/system/agent-ops/agents/[agentId]` edited in this batch.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `[agentId]/page.tsx`, cleanup map, this report |
| 2 | Agent Detail route migrated | **Yes** |
| 3 | Exact report filename used | **Yes** — `AIXIA_GLOBAL_FOLDER_BATCH_91_AGENTOPS_AGENT_DETAIL_SOT_REASONED_MIGRATION_REPORT.md` |
| 4 | Source-of-truth reasoning documented | **Yes** |
| 5 | Page type classified from owner files | **Yes** — detail/workspace |
| 6 | Safe-to-migrate decision documented | **Yes** |
| 7 | KPI/card decision derived from owner files | **Yes** — §4H placement A |
| 8 | Meta strip decision derived from owner files | **Yes** |
| 9 | Detail/table/list/card decision derived from owner files | **Yes** — section + card/list blocks |
| 10 | Other AgentOps routes changed | **No** |
| 11 | Shared components changed | **No** |
| 12 | CSS changed | **No** |
| 13 | Business logic changed | **No** |
| 14 | API/Supabase changed | **No** |
| 15 | Actions/links/modals preserved | **Yes** |
| 16 | Loading/error/empty states preserved | **Yes** |
| 17 | `npm run qa:validate-foundation` | **PASS** |
| 18 | `npm run build` | **PASS** |
| 19 | Browser QA | **PASS** |
| 20 | Source-of-truth gaps found | **No** |
| 21 | Final status | **COMPLETE** |
| 22 | Recommended next batch | **Batch 92 — Hub readiness review (gate only; Hub not auto-approved)** |
