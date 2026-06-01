# AgentOps Phase 5A Hermes Adapter Contract Report

## Purpose

Prepare the Hermes adapter contract, safety/fallback policies, and read-only UI readiness indicators **without** Hermes runtime execution, external LLM calls, or schema changes.

Phase 4B verified mock Agent Clarification. Phase 5A defines how a future app-callable Hermes adapter can replace or strengthen mock responses while preserving manual-first safety.

## Files Created

| File | Role |
|------|------|
| `qa-agent/hermes/hermes-adapter-contract.json` | Request/response contract, modes, mode→mock mapping, UI readiness snapshot |
| `qa-agent/hermes/hermes-adapter-design.md` | Architecture, allowed/disallowed modes, data boundaries, owner approval |
| `qa-agent/hermes/hermes-safety-policy.md` | Staging-only, no secrets, no autonomous execution |
| `qa-agent/hermes/hermes-fallback-policy.md` | When to use mock layer instead of Hermes |
| `qa-agent/agentops/AGENTOPS_PHASE_5A_HERMES_ADAPTER_CONTRACT_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/agentops/types.ts` | `AgentOpsHermesAdapterMode`, `AgentOpsHermesAdapterReadiness`, `AGENTOPS_HERMES_ADAPTER_READINESS` constant |
| `src/lib/agentops/index.ts` | Export new types + readiness constant |
| `src/app/system/agent-ops/issues/[issueCode]/page.tsx` | Read-only Hermes adapter readiness block in Agent Clarification panel |

**Not modified:** `service.ts` (no runtime), schema, RLS, API routes.

## Contract Summary

### Request (future)

- `requestId`, `mode` (6 allowed modes)
- `issueContext` — issueCode, title, severity, category, route, summary, evidence, root cause, fix strategy
- `agentContext` — agentId, specialty, focus, relevantMemory[]
- `promptContext` — currentPrompt, promptStyleStandard, approvedPromptRequired
- `lifecycleContext` — executionState, latestCursorReport, verificationStatus, timelineSummary[]
- `safety` — stagingOnly, noAutoCursor, noProduction, noSecrets, ownerApprovalRequired
- `requestedOutput` — clarification, promptSuggestions, riskNotes, nextAction, lessonSummary flags

### Response (future)

- `answer`, `promptSuggestions`, `riskNotes`, `nextRecommendedAction`
- `confidence`, `limitations`, `safetyFlags`
- `memoryWriteSuggestions[]` (owner approval required on each)
- `requiresOwnerApproval: true`, `shouldFallbackToMock`

### Mode mapping to mock layer

| Hermes mode | Mock intent |
|-------------|-------------|
| issue_clarification | clarification |
| prompt_refinement | prompt_improvement |
| risk_review | risk_review |
| next_step_recommendation | next_step |

## Safety Policy

Summary (`hermes-safety-policy.md`):

- Staging/local/preview only; no production/main
- No secrets, no autonomous Cursor/shell/scheduler
- No auto prompt approval or issue closure
- No CodeGraph mutation; no direct Supabase writes from Hermes
- Memory writeback proposals only — owner must approve
- Unsafe output blocked → fallback

## Fallback Policy

Summary (`hermes-fallback-policy.md`):

- **Default:** mock/status-based (`generateAgentOpsMockResponse`)
- Fallback when Hermes unavailable, not app-callable, low confidence, unsafe output, or prompt style non-compliant
- Forbidden action suggestions blocked and logged (future metadata)
- UI must label mock vs Hermes advisory vs fallback

## UI Readiness Indicator

Added read-only block in **Agent Clarification** panel:

| Field | Current value |
|-------|---------------|
| Hermes | Not active |
| Current response mode | Mock/status-based |
| Future adapter contract | Prepared (v1.0.0) |
| Fallback | Mock response layer |
| Owner approval required | Yes |
| App-callable Hermes | No |

No "Run Hermes" button. No runtime call.

## What Was Not Implemented

- no Hermes runtime
- no external LLM
- no CodeGraph runtime
- no auto Cursor
- no shell execution from UI
- no scheduler activation
- no schema/RLS/migration changes
- no API route that executes Hermes
- no production/main changes

## Validation Results

| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `npm run qa:validate-foundation` | PASS |
| `npm run qa:static-design-guardrails` | PASS |
| `npm run qa:guardrail-action-plan` | PASS |

## Next Recommended Phase

**Phase 5B** — Hermes adapter mock-interface wrapper (implements contract shape, still no Hermes runtime)

**or Phase 6A** — CodeGraph discovery contract design (read-only structural context for prompts)

## Final Check

1. Files created: contract JSON, 3 policy/design docs, this report
2. Files modified: types.ts, index.ts, page.tsx
3. Hermes contract created: **Yes**
4. Safety policy created: **Yes**
5. Fallback policy created: **Yes**
6. UI readiness indicator added: **Yes**
7. Hermes runtime called: **No**
8. External LLM called: **No**
9. CodeGraph runtime called: **No**
10. Auto Cursor execution added: **No**
11. Scheduler activated: **No**
12. Schema/RLS/migrations/API route changed: **No**
13. Production/main touched: **No**
14. Command results: build + 3 QA scripts PASS
15. Final status: **Phase 5A complete — contract and policies ready, mock layer remains default**
16. Next recommended prompt: **Phase 5B — Hermes adapter mock-interface wrapper**
