# AgentOps Phase 5C — Hermes Readiness Gate Report

## Purpose

Hermes is **essential** to AgentOps — not optional. Phase 5C defines when Hermes can be safely enabled in staging so the team does not accidentally trigger silent, uncontrolled, or production-bound Hermes calls before the real app-callable adapter is connected.

**This phase does not activate Hermes runtime.** Mock fallback remains the only execution path.

## Hermes is essential / planned

- Hermes provides issue clarification, prompt refinement, risk review, next-step guidance, Cursor report synthesis, and archive lesson extraction.
- Phase 5A defined the contract; Phase 5B wired the Hermes-shaped wrapper with mock fallback.
- Phase 5C adds the **readiness gate**, **activation checklist**, and **staging activation plan** so future enablement is intentional and reversible.

## Deliverables created

| Artifact | Role |
|----------|------|
| `qa-agent/hermes/hermes-readiness-gate.json` | Machine-readable gate: checks, states, blockers |
| `qa-agent/hermes/hermes-activation-checklist.md` | Owner sign-off checklist before staging enable |
| `qa-agent/hermes/hermes-staging-activation-plan.md` | Eight-step future activation sequence |
| `qa-agent/agentops/AGENTOPS_PHASE_5C_HERMES_READINESS_GATE_REPORT.md` | This report |

## Code changes

| File | Change |
|------|--------|
| `src/lib/agentops/hermesAdapter.ts` | `getAgentOpsHermesReadinessGate()` |
| `src/lib/agentops/types.ts` | `AgentOpsHermesReadinessGate`, `AgentOpsHermesReadinessGateState`; updated readiness notes |
| `src/lib/agentops/index.ts` | Export gate function and types |
| `src/app/system/agent-ops/issues/[issueCode]/page.tsx` | Agent Clarification Hermes wording — essential, contract ready, mock fallback, next step |

**Not modified:** `service.ts`, Supabase schema, RLS, migrations, API routes, production/main.

## Current readiness state

| Field | Value |
|-------|--------|
| `currentState` | `staging_ready_pending_owner` |
| `contractReady` | `true` |
| `safetyPolicyReady` | `true` |
| `fallbackReady` | `true` |
| `appCallable` | `false` |
| `runtimeActive` | `false` |
| `stagingOnly` | `true` |
| `ownerApprovalRequired` | `true` |
| `canEnableInStaging` | `false` |
| `nextStep` | Identify app-callable Hermes adapter endpoint and complete activation checklist with owner approval |

Gate JSON `currentActivationState`: `staging_ready_pending_owner` (not `staging_enabled`).

## Blockers before real Hermes activation

1. App-callable Hermes adapter endpoint not identified in repo
2. Staging health check not implemented
3. Owner staging activation approval pending
4. `HERMES_RUNTIME_ACTIVE` / `HERMES_APP_CALLABLE` remain hardcoded `false`

## Safety confirmations

| Constraint | Status |
|------------|--------|
| Hermes runtime activated | No |
| External LLM called | No |
| CodeGraph called | No |
| Auto Cursor execution | No |
| Scheduler activated | No |
| Production/main touched | No |
| Schema/RLS/migrations changed | No |
| Mock fallback default | Yes |
| Owner approval required on outputs | Yes |
| Advisory-only UI | Yes |
| Instant disable via flags | Yes |

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `npm run qa:validate-foundation` | PASS |
| `npm run qa:static-design-guardrails` | PASS |
| `npm run qa:guardrail-action-plan` | PASS |

## Next recommended phase

**Phase 5D — Hermes staging health check (read-only probe, mock fallback default)**  
Or **Phase 6A — CodeGraph adapter contract** (design-only, parallel track).

Suggested owner prompt:

> Implement AgentOps Phase 5D — Hermes staging health check stub. Add `checkHermesStagingHealth()` that returns not-ready while endpoint unknown; keep `HERMES_RUNTIME_ACTIVE=false`; no external LLM; staging only.
