# AgentOps Stage 16F Agent Memory Refresh Workflow Report

## Purpose

Reviewed memory update workflow from DB to draft export plan.

## Files Created

- `qa-agent/memory-sync/agent-memory-refresh-plan-schema.json`
- `qa-agent/scripts/agentops-agent-memory-refresh-plan.mjs`
- `qa-agent/memory-sync/agent-memory-refresh-plan.json`
- `qa-agent/memory-sync/agent-memory-refresh-plan.md`
- `qa-agent/agentops/AGENTOPS_STAGE_16F_AGENT_MEMORY_REFRESH_WORKFLOW_REPORT.md`

## Files Modified

- `package.json`
- `src/lib/agentops/types.ts`
- `src/lib/agentops/service.ts`
- `src/lib/agentops/index.ts`
- `src/app/system/agent-ops/page.tsx`

## Package Scripts Added

- `qa:agentops-agent-memory-refresh-plan`
- `qa:agentops-agent-memory-refresh-drafts`

## Refresh Plan Output

- JSON: `qa-agent/memory-sync/agent-memory-refresh-plan.json`
- Markdown: `qa-agent/memory-sync/agent-memory-refresh-plan.md`
- Current run summary:
  - totalAgents: `12`
  - agentsWithChanges: `0`
  - sensitiveWarningsCount: `0`
  - skippedItemsCount: `0`
  - sourceDbRead.enabled: `true`
  - recommendedAction: `No draft refresh changes detected.`

## Draft Files

- Draft generation command executed: Yes
- Draft output folder: `qa-agent/agent-memory-drafts`
- Draft files created in current run: `0`

## Safety

Confirmed:

- no overwrite of reviewed memory files
- no live sync
- no final rulebooks
- no Hermes automation
- no CodeGraph automation
- no scheduler
- no production/main
- no schema/RLS/API changes

## UI Added

Added a new **Memory Refresh Plan** section under **Agent Memory Files Review** in the existing `Agents` tab:

- shows latest plan metadata
- DB read status
- per-agent proposed change count and refresh status
- sensitive warnings and draft path
- decision actions:
  - Review Later
  - Needs Cleanup
  - Approve Draft Generation
  - Reject Refresh
  - Approve Future Manual Export

These actions record owner feedback metadata only and do not run scripts or write files.

## Validation Results

1. `npm run qa:agentops-agent-memory-refresh-plan` — PASS
2. `npm run qa:agentops-agent-memory-refresh-drafts` — PASS
3. `npm run build` — PASS
4. `npm run qa:validate-foundation` — PASS
5. `npm run qa:static-design-guardrails` — PASS
6. `npm run qa:guardrail-action-plan` — PASS

## Next Recommended Stage

Stage 17 — agent status/reporting improvements.
or Stage 16G — owner-approved replace reviewed memory files from drafts, only if Piter explicitly approves.
