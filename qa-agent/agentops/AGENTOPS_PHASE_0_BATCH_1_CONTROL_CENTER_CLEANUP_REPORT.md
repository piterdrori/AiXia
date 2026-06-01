# AgentOps Phase 0 Batch 1 — Control Center Cleanup Report

## Purpose

Simplify `/system/agent-ops` into a daily command center with no full tables on the default view. All existing workflows remain accessible in a collapsed **Legacy tools** section until dedicated routes are extracted in later batches.

## Problem found

The Control Center (`page.tsx`, ~8,300 lines) exposed six tabs with dense tables, import review, agent management, automation, advanced fix-plan/verification panels, and stage-labeled technical copy on the default scroll path. Daily use required answering five simple questions, but the UI presented a wall of registries first.

## Files modified

| File | Change |
|------|--------|
| `src/app/system/agent-ops/page.tsx` | Simplified default view; legacy tab content wrapped in collapsed `<details>` |

## Files created

| File | Role |
|------|------|
| `qa-agent/agentops/AGENTOPS_PHASE_0_BATCH_1_CONTROL_CENTER_CLEANUP_REPORT.md` | This report |

**Not modified:** `issues/page.tsx`, `issues/[issueCode]/page.tsx`, `service.ts`, Supabase, schema/RLS, shared CSS (unless via existing AiXia classes only).

## Default visible sections (after cleanup)

1. **Hero** — AgentOps Control Center, staging-only / manual-first subtitle, primary **Open issue queue**, optional Refill Queue, Refresh  
2. **Today's Priority** — single recommended action card with contextual primary button  
3. **Command metrics** — 6 compact metrics (Active Top 10, Backlog, Pending Verification, Queue Health, Agents Needing Attention, Automation)  
4. **System readiness** — Hermes, CodeGraph, Local LLM, Scheduler, Cursor execution status cards  
5. **Navigate** — link cards: Issues (route), Agents / Automation / Advanced / History (open legacy tab), Knowledge (disabled coming soon)  
6. **Action feedback / data error banners** — unchanged  

## Sections hidden / collapsed

All former tab content is inside:

**Legacy tools — temporary until Advanced / Automation / Agents pages are extracted** (`<details>`, collapsed by default)

Includes:

- Tab nav (Today, Issues, Agents, Automation, Advanced, History)
- Command center snapshot (Today tab)
- Automation overview, safe request controls, scheduler prep, Hermes memory meter, stage info blocks
- Issues tab: import plans, queue health, scan workflow, import candidate review
- Today/Issues: verification queue, Active Top 10, backlog preview tables
- Agents tab: full agent management tables and tools
- Advanced: fix plan review, verification requests, MVP safety notice
- History: run history table

## Tables removed from default view

| Table (formerly visible by default) | Now |
|--------------------------------------|-----|
| Active Top 10 Queue | Legacy → Issues tab |
| Verification Queue | Legacy → Today/Issues |
| Backlog Preview | Legacy → Today/Issues |
| Import Candidate Review | Legacy → Issues |
| Fix Plan Review | Legacy → Advanced |
| Verification Requests | Legacy → Advanced |
| Agent registry / status / memory tables | Legacy → Agents |
| Run History | Legacy → History |

**Default Control Center:** zero full data tables.

## Links preserved

| Link | Target |
|------|--------|
| Open issue queue (hero) | `/system/agent-ops/issues` |
| Today's Priority actions | Issue queue, refill modal, or legacy Issues tab |
| Navigate → Issues | `/system/agent-ops/issues` |
| Navigate → Agents / Automation / Advanced / History | Legacy tools + correct tab |
| Row actions in legacy tables | Unchanged (still navigate to issue workspace) |

## Actions preserved

Refill Queue, Refresh, all import modals, verification actions, agent modals, queue health decisions, automation requests, fix plan decisions, handoff/report modals — all remain in legacy section and modal layer. No service functions removed.

## Functionality / logic preserved

* `loadDashboardData` and all Supabase calls unchanged  
* Tab state and workflows unchanged inside legacy block  
* Modals at page bottom unchanged  
* Issue routes untouched  

## Remaining legacy content

Entire pre-batch Control Center UI lives in collapsed `<details id="agentops-legacy-tools">`. Will be split into `/automation`, `/agents`, `/advanced`, `/history`, `/knowledge` in Phase 0 batches 4–9 per consolidation plan.

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** |
| `npm run qa:guardrail-action-plan` | **PASS** |

**Manual browser check (recommended):** `/system/agent-ops`, `/system/agent-ops/issues`, sample issue workspace — confirm no default tables, issue queue link works, legacy expands on demand.

## Next recommended batch

**Phase 0 Batch 2 — Issues list cleanup:** polish `/system/agent-ops/issues` as the canonical daily queue; align copy with Control Center; avoid duplicating metrics already on Control Center.

## Phase 0 Batch 1 final check

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | Report only |
| 2 | Files modified | `src/app/system/agent-ops/page.tsx` |
| 3 | Control Center simplified | **Yes** |
| 4 | Default full tables removed | **Yes** |
| 5 | Today's Priority preserved | **Yes** |
| 6 | Command metrics preserved | **Yes** (6 compact metrics) |
| 7 | System readiness row added | **Yes** |
| 8 | Navigation cards added | **Yes** |
| 9 | Legacy tools collapsed | **Yes** |
| 10 | Existing actions preserved | **Yes** |
| 11 | Existing issue routes preserved | **Yes** |
| 12 | Service logic changed | **No** |
| 13 | Supabase/RLS/schema changed | **No** |
| 14 | Hermes/CodeGraph/local LLM/voice activated | **No** |
| 15 | Scheduler activated | **No** |
| 16 | Cursor auto-execution added | **No** |
| 17 | Production/main touched | **No** |
| 18 | Command results | All **PASS** |
| 19 | Final status | **PASS — Batch 1 complete** |
| 20 | Next prompt | *Phase 0 Batch 2 — Issues list cleanup as canonical daily entry.* |
