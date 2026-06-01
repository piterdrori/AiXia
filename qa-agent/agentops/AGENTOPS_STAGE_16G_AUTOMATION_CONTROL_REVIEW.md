# AgentOps Stage 16G Automation Control Review

Date: 2026-05-28  
Route: `/system/agent-ops`  
Scope: complete safe Automation Control Panel behavior (request/status layer only)

## Current Automation Tab Sections Found

- `Automation Overview` summary card row (mode/scheduler/quiet/latest run).
- Guardrail copy: request/copy only, no execution.
- Collapsed readiness/command details block:
  - Hermes Memory Support Meter
  - Verification Runner command guidance
  - Manual Run Orchestrator command guidance
- Additional collapsed automation technical block:
  - Scheduler Preparation status/decisions
  - Safety checklist/runbook path surfaces

## Current Service/Type Support Found

- Existing owner-gated status sources:
  - `getAgentOpsDashboardSummary()`
  - `getAgentOpsRunHistory()`
  - `getAgentOpsSchedulerPreparationStatus()`
  - `getAgentOpsQueueHealth()`
- Existing safe logging pattern already used in `agentops_owner_feedback` with `finding_id: null`:
  - `recordAgentOpsQueueHealthDecision()`
  - `markAgentOpsScanNeeded()`
  - `recordAgentOpsManualScanStep()`
  - `recordAgentOpsImportReviewDecision()`
  - `recordAgentOpsSchedulerDecision()`
- Existing request/copy actions in other workflows:
  - verification command copied
  - scheduler preparation decisions
  - queue/manual-scan decisions

## Safe Actions Already Available

- Record scheduler preparation decisions (no activation).
- Record queue-health/manual scan/import review decisions.
- Copy verification/manual-scan commands in other sections.
- Read latest run/readiness/scheduler/queue context.

## Safe Actions Missing for Stage 16G

- Explicit Automation request action model for:
  - QA check
  - Browser QA
  - static guardrail scan
  - guardrail action plan
  - backlog generation/import
  - verification pass
  - quiet mode
  - pause
  - resume preparation
  - copy command/prompt action logging
- Dedicated owner confirmation flow per request action in Automation tab.
- Dedicated latest request/request history surface for automation control.
- Clear fallback when no persistent automation request table exists (using safe owner-feedback metadata log).

## What Will Be UI-Only

- Request cards/buttons and confirmation modal UX.
- Copy-to-clipboard command/prompt section in Automation tab.
- Safety badges/pills and status copy polish.
- Next recommended action rendering in Automation view.

## What Will Require Service/Type Helpers

- New typed request model in `types.ts` for Stage 16G request/status.
- Service helpers in `service.ts` to:
  - record automation control requests into `agentops_owner_feedback` metadata (`finding_id: null`)
  - query recent automation control request records from `agentops_owner_feedback`
- Re-export helpers/types in `index.ts`.

## What Will Not Be Changed

- No shell command execution from UI.
- No scheduler activation.
- No Supabase schema/RLS migrations.
- No production/main interactions.
- No removal of existing actions/tabs/features.
- No backend business-logic refactor outside safe request/status logging additions.

## Safety Risks

- Users could misinterpret request buttons as execution triggers if labels are unclear.
- Mixed legacy metadata in `agentops_owner_feedback` could pollute request-history parsing.
- Overly dense request controls could reintroduce complexity.

## Exact Implementation Plan

1. **Types**
   - Add Stage 16G request/status types:
     - request type enum
     - request status enum
     - request item/result interfaces
2. **Service**
   - Add `recordAgentOpsAutomationControlRequest(input)`:
     - owner-gated
     - insert into `agentops_owner_feedback` with `finding_id: null`, metadata action key
   - Add `getAgentOpsAutomationControlRequests(limit)`:
     - owner-gated
     - read recent owner feedback rows and map only Stage 16G action keys
3. **UI (`page.tsx`)**
   - Add Automation request cards/buttons.
   - Add required confirmation modal text:
     - what request does / does not do
     - staging-only
     - no shell execution
     - no scheduler activation
     - no production change
   - Add latest request/history panel.
   - Add command/prompt copy-only panel (collapsed by default) with explicit non-execution copy.
   - Add safety state indicators row:
     - Manual only
     - Scheduler inactive
     - UI execution disabled
     - Owner approval required
     - Staging only
     - Production protected
4. **Validation + Report**
   - Run required 4 commands.
   - Produce `AGENTOPS_STAGE_16G_AUTOMATION_CONTROL_REPORT.md`.
