# AgentOps Phase 0 Batch 2 — Issues Queue Cleanup Report

## Purpose

Polish `/system/agent-ops/issues` as the **canonical daily issue queue** after Batch 1 simplified the Control Center. The page now answers what needs attention, what is active, what awaits verification, what is in backlog, and which issue to open next — without technical clutter.

## Problem found

The Issues page had the right route and a workable table, but it underplayed its role as the daily entry point: weak header copy (“Issues Workspace List”), only four summary cards, no recommended next action, filters always fully expanded, and no quick focus grouping. Refill was only available from Control Center.

## Files modified

| File | Change |
|------|--------|
| `src/app/system/agent-ops/issues/page.tsx` | Full UI polish — layout, metrics, focus chips, recommended action, refill, table readability |

## Files created

| File | Role |
|------|------|
| `qa-agent/agentops/AGENTOPS_PHASE_0_BATCH_2_ISSUES_QUEUE_CLEANUP_REPORT.md` | This report |

**Not modified:** Control Center (except link target `#agentops-legacy-tools` used from Issues), Issue Workspace, `service.ts` (only existing `refillAgentOpsActiveTop10FromBacklog` import), schema/RLS.

## Default visible sections (after cleanup)

1. **Header / command bar** — AgentOps Issues, canonical daily queue subtitle, Staging only + Manual-first badges, Control Center back link, Refresh, Refill Queue (when slots + backlog allow)  
2. **Queue summary** — 6 clickable compact cards  
3. **Recommended next action** — single focus card with primary button  
4. **Find issues** — focus chips + search + primary filters + collapsed “More filters”  
5. **Issue list** — compact table with Open Workspace per row  
6. **Banners** — owner gate, load error, refill feedback  

## Summary cards used

| Card | Data source |
|------|-------------|
| Active Top 10 | `activeItems.length` + open slots |
| Verification pending | `verificationPending.length` |
| Backlog | `backlogTotalCount` (full count from API) |
| Verified / archived | count in merged list |
| Needs attention | items matching attention heuristics |
| Follow-up / blocked | Still Broken, Needs Follow-Up, Verification Blocked |

Clicking a card sets the matching **focus chip** filter.

## Filters kept / changed

| Filter | Status |
|--------|--------|
| Search (code/title/route) | Kept — prominent |
| Status, queue | Kept — always visible |
| Severity, category, route, agent | Kept — inside collapsed **More filters** |
| Focus chips | **Added** — All, Needs attention, Active, Verification, Backlog, Archived |

Queue dropdown labels humanized (Active Top 10, Backlog, Archived).

## Issue list layout

- **Compact registry table** inside `aixia-scrollbar` wrapper (`min-w-[1080px]`) — scroll contained, not page-level  
- Truncated title/route with `title` tooltips  
- **Open Workspace** primary button per row (unchanged route)  
- Combined Issue column (code in mono)  

## Grouping approach

**Focus chips** instead of a second tab system — works with existing dropdown filters. No cluttered multi-tab UI.

## Actions preserved

| Action | Location |
|--------|----------|
| Open Workspace | Each row → `/system/agent-ops/issues/[issueCode]` |
| Refresh | Header — reloads same four Supabase reads |
| Refill Queue | Header + recommended action — `refillAgentOpsActiveTop10FromBacklog()` |
| Control Center | Back link + import tools deep link |

No import tables, scheduler, memory tools, or fix-plan review on this page.

## Open Workspace behavior

Unchanged navigation:

`/system/agent-ops/issues/${encodeURIComponent(issueCode)}`

Button label: **Open Workspace** (primary variant).

## Logic preserved

Same data loading:

- `getAgentOpsOwnerStatus`
- `getAgentOpsActiveTop10`
- `getAgentOpsBacklogSummary` (now uses `count` for backlog total)
- `getAgentOpsVerificationRequests`

Same merge/dedupe rules for active + backlog + verification rows.

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** |
| `npm run qa:guardrail-action-plan` | **PASS** |

**Manual browser:** `/system/agent-ops`, `/system/agent-ops/issues`, sample issue workspace — recommended when dev server is up.

## Next recommended batch

**Phase 0 Batch 3 — Issue Workspace cleanup:** collapse Future Intelligence placeholders, group sections (Overview / Plan & Prompt / Execution), reduce vertical scroll without removing lifecycle panels.

## Phase 0 Batch 2 final check

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | Report only |
| 2 | Files modified | `issues/page.tsx` |
| 3 | Issues page simplified | **Yes** |
| 4 | Queue summary cards visible | **Yes** (6) |
| 5 | Recommended next action visible | **Yes** |
| 6 | Filters preserved and cleaned | **Yes** |
| 7 | Issue list readable | **Yes** |
| 8 | Open Workspace preserved | **Yes** |
| 9 | Technical tools hidden | **Yes** |
| 10 | Control Center preserved | **Yes** |
| 11 | Issue Workspace preserved | **Yes** |
| 12 | Service logic changed | **No** (existing refill export only) |
| 13 | Supabase/RLS/schema changed | **No** |
| 14 | Hermes/CodeGraph/local LLM/voice activated | **No** |
| 15 | Scheduler activated | **No** |
| 16 | Cursor auto-execution added | **No** |
| 17 | Production/main touched | **No** |
| 18 | Command results | All **PASS** |
| 19 | Final status | **PASS — Batch 2 complete** |
| 20 | Next prompt | *Phase 0 Batch 3 — Issue Workspace section grouping and placeholder cleanup.* |
