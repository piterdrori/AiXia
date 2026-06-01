# AgentOps Stage 14 Low-Backlog Trigger Report

## Purpose

Queue health and scan/refill recommendation foundation for AgentOps. Monitors Active Top 10 and backlog capacity, then recommends the next Owner-controlled refill or scan/import action when the queue is low — without scheduler, cron, auto-import, or UI shell execution.

## Files Created

| File | Description |
| --- | --- |
| `qa-agent/orchestrator/low-backlog-trigger-rules.json` | Thresholds, recommended-action map, allowed manual CLI commands, blocked actions |
| `qa-agent/agentops/AGENTOPS_STAGE_14_LOW_BACKLOG_TRIGGER_REPORT.md` | This report |

## Files Modified

| File | Change |
| --- | --- |
| `src/lib/agentops/types.ts` | `AgentOpsQueueHealth`, backlog/active status types, recommended actions, decision input/record types |
| `src/lib/agentops/service.ts` | `getAgentOpsQueueHealth()`, `recordAgentOpsQueueHealthDecision()`, `markAgentOpsScanNeeded()` |
| `src/lib/agentops/index.ts` | Export new types and service functions |
| `src/app/system/agent-ops/page.tsx` | **Queue Health & Scan Trigger** panel with metrics, recommendations, and Owner actions |

## Queue Health Logic

Rules loaded from `qa-agent/orchestrator/low-backlog-trigger-rules.json`:

| Setting | Value |
| --- | --- |
| Active target | 10 |
| Low backlog threshold | &lt; 5 items → `low` |
| Empty backlog | 0 items → `empty` |
| Healthy backlog | ≥ 5 items |

| Active state | Backlog state | Recommended action |
| --- | --- | --- |
| Full (10 open) | Healthy | `no_action` |
| Full | Low | `generate_more_candidates` |
| Full or below target | Empty | `run_scan_import_plan` |
| Below target | Healthy | `refill_from_backlog` |
| Below target | Low | `refill_and_generate_more_candidates` |

- `canRefillNow` = `openSlots > 0` and `backlogCount > 0`
- `canImportCandidatesAvailable` = import-plan JSON files in `public/agentops/` have candidate rows (does not auto-import)
- Suggested CLI commands are copied only; never executed from the UI

## UI Added

**Queue Health & Scan Trigger** panel on `/system/agent-ops`:

- Active Open X / 10, Open Slots, Backlog Count, Backlog Status
- Recommended action badge + explanation
- Suggested commands list (when applicable)
- Latest run summary + orchestrator report path
- Actions: **Refill Queue** (existing refill), **Record Decision / Hold**, **Copy Suggested Scan Commands**, **Mark Scan Needed**

## Service Functions Added

| Function | Role |
| --- | --- |
| `getAgentOpsQueueHealth()` | Owner read — counts, status, recommendation, commands |
| `recordAgentOpsQueueHealthDecision()` | Owner write — `agentops_owner_feedback` metadata `queue_health_decision` |
| `markAgentOpsScanNeeded()` | Owner write — metadata `scan_needed` (no scan run) |

## What Was Not Implemented

- No scheduler or cron
- No shell execution from UI
- No auto-import of findings
- No auto-fix or auto-Cursor
- No production/main changes
- No schema, RLS, migrations, or API routes
- No Hermes or CodeGraph runtime automation

## Validation Results

| Command | Result |
| --- | --- |
| `npm run build` | **PASS** |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** |
| `npm run qa:guardrail-action-plan` | **PASS** |

## Next Recommended Stage

**Stage 14B** — manual scan/import workflow shortcuts from the Queue Health panel (preview import counts, deep links to import modals).

**Stage 15** — scheduler preparation only after explicit Owner approval.
