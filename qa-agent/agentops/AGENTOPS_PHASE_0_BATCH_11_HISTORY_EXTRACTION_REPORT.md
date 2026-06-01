# AgentOps Phase 0 Batch 11 - History Extraction Report

## Problem found

Run history and other backward-looking records were still anchored to Control Center legacy tabs, which kept historical review mixed with daily operations.

## Route created

- `/system/agent-ops/history`

## Files created

- `src/app/system/agent-ops/history/page.tsx`
- `qa-agent/agentops/AGENTOPS_PHASE_0_BATCH_11_HISTORY_EXTRACTION_REPORT.md`

## Files modified

- `src/App.tsx`
- `src/app/system/agent-ops/page.tsx`

## History page sections

Route: `/system/agent-ops/history`

1. **Hero**
   - Title: AgentOps History
   - Subtitle: runs, owner decisions, verification history, and reports
   - Back link to Control Center
   - Staging-only + read-only badges

2. **Summary cards**
   - Recent runs
   - Owner decisions
   - Verification records
   - Cursor handoffs/reports
   - Archived/verified issues
   - Follow-up/blocked history

3. **Recent activity**
   - Timeline rows composed from existing read services:
     - run history
     - verification request/result snapshots
     - automation control requests
     - import decision history
     - latest scheduler decision
     - latest queue/orchestrator report marker
   - Simple filters: issue code, action type, recent range, status
   - Read-only actions only: open issue, copy path
   - Placeholder behavior preserved when timeline has no records

4. **Reports** (collapsed by default)
   - Stage/browser QA report path group
   - Verification report-path group
   - Cursor handoff/fix-plan artifact group
   - Latest orchestrator report marker

## Control Center link update

Updated Navigate card:

- **History** now links to `/system/agent-ops/history`

## Legacy dependency reduced

- History data now has a dedicated route.
- Legacy History tab in Control Center was reduced to a fallback pointer with link to the new route, removing duplicate dense run table from default legacy display.

## Read-only behavior

- History page is read-only by default.
- No destructive actions.
- No runtime activation.
- Actions limited to open issue, copy path, refresh.

## History/report access preserved

Preserved with existing service data:

- `getAgentOpsRunHistory`
- `getAgentOpsVerificationRequests`
- `getAgentOpsAutomationControlRequests`
- `getAgentOpsImportDecisionHistory`
- `getAgentOpsSchedulerPreparationStatus`
- `getAgentOpsGeneratedFixPlans`
- `getAgentOpsDashboardSummary`

No new backend/history table introduced.

## Logic preserved

- No business logic rewrites.
- No Supabase query contract changes.
- No schema/RLS/migration changes.
- No runtime services activated.

## Validation results

Required:

- `npm run build` -> **PASS** (with pre-existing unrelated AiXia standards warnings)
- `npm run qa:validate-foundation` -> **PASS**
- `npm run qa:static-design-guardrails` -> **PASS**
- `npm run qa:guardrail-action-plan` -> **PASS**

Optional smokes:

- `npm run qa:agentops-issue-workspace-smoke` -> **PASS**
- `npm run qa:agentops-agent-clarification-smoke` -> **FAIL** (pre-existing flake: Ask Agent button remains disabled in helper wait)
- `npm run qa:agentops-codegraph-discovery-smoke` -> **PASS**

## Remaining concerns

- Agent clarification smoke currently fails due to an existing Ask Agent enablement flake in Issue Workspace smoke flow; this was not introduced by History extraction and occurred after retries.
- Control Center still retains legacy fallback structure intentionally until all extraction batches complete.

## Next recommended batch

Phase 0 Batch 12:

- Continue slimming Control Center legacy fallback and align remaining cross-route navigation polish (History/Advanced/Automation/Knowledge) while keeping read-only vs action surfaces clearly separated.
