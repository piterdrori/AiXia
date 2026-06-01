# AgentOps Stage 14C Import Review Workflow Report

## Purpose

Richer import candidate review and approval before manual import. Each import source shows candidate counts, issue codes, severity/category summaries, DB import status, Owner review decisions, duplicate risk, and readiness for manual import — without auto-import or UI shell execution.

## Files Created

| File | Description |
| --- | --- |
| `qa-agent/agentops/AGENTOPS_STAGE_14C_IMPORT_REVIEW_WORKFLOW_REPORT.md` | This report |

## Files Modified

| File | Change |
| --- | --- |
| `src/lib/agentops/types.ts` | `AgentOpsImportCandidateSource`, review statuses, decision types, summary/history types |
| `src/lib/agentops/service.ts` | `getAgentOpsImportReviewSummary`, `recordAgentOpsImportCandidateDecision`, `getAgentOpsImportDecisionHistory` |
| `src/lib/agentops/index.ts` | Exports |
| `src/app/system/agent-ops/page.tsx` | **Import Candidate Review** panel with per-source and per-issue actions |

## Service Functions Added

| Function | Role |
| --- | --- |
| `getAgentOpsImportReviewSummary()` | Reads public import plans, matches `agentops_findings` by `issue_code`, merges Owner feedback decisions |
| `recordAgentOpsImportCandidateDecision()` | Feedback `import_candidate_decision` — source or issue level; no import |
| `getAgentOpsImportDecisionHistory(sourceId?, issueCode?)` | Reads prior import/candidate review feedback |

## UI Added

**Import Candidate Review** section on `/system/agent-ops`:

- Per source: counts, severity/category summary, recommended decision, warnings
- Source actions: Approve Source, Review Later, Reject Source, Needs Regeneration, Open Import Modal (primary plans)
- Per-issue table: review status, DB status, Approve / Later / Reject
- Global warnings for held findings and already-resolved approved subsets
- Label: *Manual import only. Approval recommended before import.*

Stage 14B Manual Scan / Import Workflow section is unchanged.

## Import Sources Supported

| sourceId | Plan path |
| --- | --- |
| `static` | `public/agentops/static-import-plan.json` |
| `browser` | `public/agentops/browser-findings-import-plan.json` |
| `role_workflow` | `public/agentops/role-workflow-import-plan.json` |
| `role_workflow_approved` | `public/agentops/role-workflow-approved-import-plan.json` |
| `write_draft` | `public/agentops/write-draft-findings-import-plan.json` |
| `write_draft_approved` | `public/agentops/write-draft-approved-import-plan.json` |

## Safety Warnings

Built-in and dynamic warnings include:

- **WDS-3 held:** Full write-draft plan includes `AIXIA-WRITE-WDS-3` (held Stage 11C) — use approved plan only
- **Write-draft approved resolved:** WDS-1/WDS-2 may already be Verified Fixed/archived — import skips duplicates
- **Role-workflow full vs approved:** Full plan has held needs-piter-decision items — prefer approved subset
- **RWF-28/RWF-29 resolved:** Approved role-workflow targets may already be archived
- Missing plan file, zero candidates, all already imported, unreviewed candidates

## What Was Not Implemented

- No auto-import
- No shell execution from UI
- No scheduler / cron
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

**Stage 15** — scheduler preparation only after explicit Owner approval.

**Stage 14D** — import review drill (optional) to walk through approve → manual import → refill on staging.
