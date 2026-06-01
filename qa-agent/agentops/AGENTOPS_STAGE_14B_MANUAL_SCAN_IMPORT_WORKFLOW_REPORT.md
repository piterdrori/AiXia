# AgentOps Stage 14B Manual Scan Import Workflow Report

## Purpose

Manual scan/import workflow shortcuts from the Queue Health panel. Helps the Owner generate and import more candidate issues when backlog is low or Active Top 10 needs items — without running CLI from the UI, without auto-import, and without scheduler automation.

## Files Created

| File | Description |
| --- | --- |
| `qa-agent/agentops/AGENTOPS_STAGE_14B_MANUAL_SCAN_IMPORT_WORKFLOW_REPORT.md` | This report |

## Files Modified

| File | Change |
| --- | --- |
| `src/lib/agentops/types.ts` | Manual scan workflow, step, import shortcut, step/import review input types |
| `src/lib/agentops/service.ts` | `getAgentOpsManualScanWorkflow`, `recordAgentOpsManualScanStep`, `recordAgentOpsImportReviewDecision` |
| `src/lib/agentops/index.ts` | Exports for new types and functions |
| `src/app/system/agent-ops/page.tsx` | **Manual Scan / Import Workflow** section under Queue Health |

## Service Functions Added

| Function | Role |
| --- | --- |
| `getAgentOpsManualScanWorkflow()` | Builds step list from queue health + rules; loads step statuses from feedback; import shortcut previews |
| `recordAgentOpsManualScanStep()` | Feedback `manual_scan_workflow_step` with queue snapshot |
| `recordAgentOpsImportReviewDecision()` | Feedback `import_review_decision` — no import |

## UI Added

Under **Queue Health & Scan Trigger**:

- **Manual Scan / Import Workflow** — workflow title, step list with command, expected output, status badge
- Per step: Copy Command, Mark Running, Mark Completed, Blocked, Add Note; Open Refill / Open Import when applicable
- **Manual import shortcuts** — plan path, candidate count, review decisions (Review Later, Approve for Import, Reject, Needs Regeneration)
- Duplicate import buttons with “Manual import only” warning
- Safety block: no CLI from UI, no auto-import, dev server required for browser modes

## Workflow Variants (by Stage 14 recommendation)

| Recommendation | Workflow focus |
| --- | --- |
| `no_action` | Optional foundation + verification dry-run |
| `refill_from_backlog` | Refill → generate plans if backlog runs low |
| `generate_more_candidates` | Orchestrator → browser/workflow scans → import plans → review → manual import |
| `refill_and_generate_more_candidates` | Refill → orchestrator → plans → review → import |
| `run_scan_import_plan` | Full scan → plans → review → import → refill |

## Safety

Confirmed:

- UI does **not** run shell commands
- No auto-import
- No scheduler / cron / 24×7 automation
- No production/main
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

**Stage 15** — scheduler preparation only after explicit Owner approval.

**Stage 14C** — richer import review UI (diff preview, per-candidate approve) before any scheduler work.
