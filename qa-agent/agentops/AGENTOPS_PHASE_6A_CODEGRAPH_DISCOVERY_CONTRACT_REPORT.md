# AgentOps Phase 6A CodeGraph Discovery Contract Report

## Purpose

Prepare **read-only CodeGraph discovery** integration for AgentOps Issue Workspace. CodeGraph is **essential** for identifying likely files, components, routes, shared source-of-truth, and related past fixes before Cursor work — Phase 6A defines contract and policies only.

**No CodeGraph runtime, no MCP from app, no browser file scan, no prompt auto-mutation.**

## Files Created

| File | Role |
|------|------|
| `qa-agent/codegraph/codegraph-discovery-contract.json` | Request/response contract, modes, suggestion item shape |
| `qa-agent/codegraph/codegraph-discovery-design.md` | Purpose, allowed/disallowed modes, data boundaries |
| `qa-agent/codegraph/codegraph-safety-policy.md` | Read-only, no mutation, no secrets, owner approval |
| `qa-agent/codegraph/codegraph-fallback-policy.md` | Manual inspection fallback rules |
| `qa-agent/agentops/AGENTOPS_PHASE_6A_CODEGRAPH_DISCOVERY_CONTRACT_REPORT.md` | This report |
| `src/lib/agentops/codegraphDiscovery.ts` | `getAgentOpsCodeGraphDiscoveryReadiness()` (read-only) |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/agentops/types.ts` | CodeGraph discovery types + `AGENTOPS_CODEGRAPH_DISCOVERY_READINESS` |
| `src/lib/agentops/index.ts` | Exports |
| `src/app/system/agent-ops/issues/[issueCode]/page.tsx` | CodeGraph Discovery panel; Future Intelligence wording |

**Not modified:** `service.ts`, Supabase schema, RLS, migrations, API routes, Hermes runtime, production/main.

## Contract Summary

### Request

- `requestId`, `mode` (8 discovery modes), `issueContext`, `searchHints`, `safety` (readOnly, stagingOnly, noFileMutation, noPromptAutoMutation, ownerApprovalRequired)

### Response

- `responseId`, `mode`, `suggestions` (likelyFiles, likelyComponents, routes, shared components/styles, services, types, tests, relatedPastIssues, recurrenceCandidates, promptContextHints)
- Each suggestion: `label`, optional `path`, `reason`, `confidence`, `evidence`, `source`, `safeToIncludeInPrompt`
- `confidence`, `limitations`, `safetyFlags`, `requiresOwnerReview`, `shouldFallbackToManualInspection`

### Modes

`issue_context_discovery`, `likely_files`, `route_ownership`, `component_impact`, `shared_source_of_truth`, `related_fix_lookup`, `recurrence_lookup`, `prompt_context_suggestions`

## Safety Policy

- Read-only; no file/prompt mutation; no Cursor trigger; staging only; no secrets; no env secret output in UI; owner approval before prompt inclusion; no MCP from browser.

## Fallback Policy

- Unavailable → manual inspection; low confidence → advisory only; unsafe/sensitive paths excluded; no route → page search; no component → shared AiXia inspection; no prior fix → no invented recurrence.

## UI Readiness Panel

**CodeGraph Discovery** section (before Cursor Prompt):

- Status: Not active
- Mode: Read-only discovery planned
- Runtime: Not connected
- Suggestions: Not available yet
- Fallback: Manual inspection instructions
- Owner approval: Required before adding suggestions to prompt

No **Run CodeGraph** button.

## What Was Not Implemented

- No CodeGraph runtime
- No MCP call from app
- No file scan from browser
- No prompt auto-mutation
- No auto Cursor
- No Hermes runtime
- No scheduler
- No schema/RLS/API route
- No production/main
- No secrets committed

## Validation Results

| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `npm run qa:validate-foundation` | PASS |
| `npm run qa:static-design-guardrails` | PASS |
| `npm run qa:guardrail-action-plan` | PASS |

## Next Recommended Phase

**Phase 6B — CodeGraph mock discovery adapter** using static hints from issue route/module only (no CodeGraph MCP, no network).

Suggested owner prompt:

> Implement AgentOps Phase 6B — CodeGraph mock discovery adapter. Add `runAgentOpsCodeGraphDiscoveryMock()` returning manual-inspection fallback hints from stored issue route/category only. No MCP, no browser scan, no prompt auto-mutation.
