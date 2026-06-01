# AgentOps Stage 17 Agent Status Reporting Report

## Purpose

Improve Agents tab status reporting and attention visibility.

## Files Created

- `qa-agent/agentops/AGENTOPS_STAGE_17_AGENT_STATUS_REPORTING_REPORT.md`

## Files Modified

- `src/lib/agentops/types.ts`
- `src/lib/agentops/service.ts`
- `src/lib/agentops/index.ts`
- `src/app/system/agent-ops/page.tsx`

## Service Functions Added

- `getAgentOpsAgentStatusDashboard()`
- `recordAgentOpsAgentStatusReview(input)`

## UI Added

Added **Agent Status Dashboard** inside the existing `Agents` tab:

- summary cards:
  - Total Agents
  - Active
  - Needs Memory
  - Blocked / Quiet
  - Memory Files OK
  - Needs Attention
- compact status table:
  - Agent
  - Skill
  - Status
  - Memory
  - Interactions
  - Memory File
  - Refresh Status
  - Needs Attention
  - Action
- filters:
  - All
  - Needs Attention
  - Active
  - Quiet
  - Blocked
  - Needs Memory
- kept existing full Agents table and existing actions.
- clicking **Open Agent** keeps using the existing Agent Interaction / Status Window.

## Agents Covered

All 12 synthetic agents are included.

## Attention Rules

Needs-attention is flagged when:

- status is `blocked`
- status is `needs_memory`
- `memoryCount` is `0`
- no current focus is set
- memory file is missing
- sensitive warnings are present
- refresh status is `blocked_sensitive_content`

Visual attention labels used:

- No Memory
- Needs Focus
- Blocked
- Memory File Missing
- Sensitive Warning
- Refresh Blocked
- Recently Updated
- OK

## What Was Not Implemented

- no live sync
- no final rulebooks
- no Hermes automation
- no CodeGraph automation
- no scheduler
- no production/main
- no schema/RLS/API changes
- no memory file overwrite

## Validation Results

1. `npm run build` — PASS
2. `npm run qa:validate-foundation` — PASS
3. `npm run qa:static-design-guardrails` — PASS
4. `npm run qa:guardrail-action-plan` — PASS

## Next Recommended Stage

Stage 17B — agent status drill / review workflow.
or Stage 18 — agent performance/reporting from QA runs.
