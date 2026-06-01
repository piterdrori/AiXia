# AgentOps Stage 17 Focus Directives Engine Report

## Purpose

Use Piter remarks and focus directives to influence future QA ranking and agent behavior.

## Files Created

- `qa-agent/focus-directives/focus-directive-schema.json`
- `qa-agent/focus-directives/focus-ranking-rules.json`
- `qa-agent/focus-directives/focus-directive-examples.md`
- `qa-agent/agentops/AGENTOPS_STAGE_17_FOCUS_DIRECTIVES_ENGINE_REPORT.md`

## Files Modified

- `src/lib/agentops/types.ts`
- `src/lib/agentops/service.ts`
- `src/lib/agentops/index.ts`
- `src/app/system/agent-ops/page.tsx`

## Service Functions Added

- `getAgentOpsFocusDirectives()`
- `createAgentOpsFocusDirective(input)`
- `updateAgentOpsFocusDirective(input)`
- `getAgentOpsFocusRankingPreview()`
- `recordAgentOpsFocusRankingDecision(input)`

## UI Added

Added two new sections in the existing `Agents` tab:

1. **Focus Directives**
   - shows active directives with type, target, weight, source, status
   - supports:
     - Add Focus Directive
     - Deactivate Directive
     - Edit/Activate Directive
   - actions are metadata-only, no automation

2. **Ranking Preview**
   - shows issue-level preview rows:
     - issue code/title
     - current priority
     - focus boost/penalty
     - recommended rank
     - recommended agent
     - recommended scan mode/validation command
     - explanation
   - supports decisions:
     - Approve Preview
     - Needs Adjustment
     - Hold
     - Copy Recommendation
   - decisions are feedback metadata only

## Ranking Behavior

Preview-only logic:

- reads active directives and current findings
- applies configured boost/penalty rules from `focus-ranking-rules.json`
- returns recommendations only
- does **not** auto-apply ranking, promote backlog, run scans, import findings, or execute commands

## Agent Matching

Configured mapping in `focus-ranking-rules.json`:

- Design and UX Agent → UI/layout/readability/table/card
- Business Logic and Operations Agent → workflow/process/logic/routing/state
- Security, Permissions, and Tenant Isolation Agent → access/permission/RLS/role/tenant
- Finance Workflow Agent → finance transactions/master data/reporting/payments/quotations
- HR and People Operations Agent → HR/payroll/employee workflows
- Personal AI Productivity Agent → AI management/notes/memory/productivity
- Final Council Chair and Implementation Planner → cross-module conflict/final priority

## What Was Not Implemented

- no automatic ranking apply
- no automatic import
- no scheduler activation
- no shell execution from UI
- no Hermes automation
- no CodeGraph automation
- no final rulebooks
- no production/main
- no schema/RLS/API changes

## Validation Results

1. `npm run build` — PASS
2. `npm run qa:validate-foundation` — PASS
3. `npm run qa:static-design-guardrails` — PASS
4. `npm run qa:guardrail-action-plan` — PASS

## Next Recommended Stage

Stage 17B — owner-approved ranking apply workflow.
or Stage 18 — Hermes adapter / memory integration.
