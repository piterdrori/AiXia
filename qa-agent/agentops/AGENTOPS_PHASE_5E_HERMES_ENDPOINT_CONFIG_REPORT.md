# AgentOps Phase 5E Hermes Endpoint Configuration Report

## Purpose

Design staging endpoint configuration for future Hermes runtime activation. Hermes remains **essential and planned**; runtime stays **inactive** until endpoint env, health check, and owner signoff are complete outside the repo.

Phase 5E is **configuration planning only** — no API route, no network call, no runtime enablement.

## Files Created

| File | Role |
|------|------|
| `qa-agent/hermes/hermes-endpoint-config-design.md` | Endpoint options, env vars, security, activation flow |
| `qa-agent/hermes/hermes-env-template.example` | Safe env var names (example only, no secrets) |
| `qa-agent/hermes/hermes-owner-signoff-template.md` | Owner signoff fields before runtime |
| `qa-agent/agentops/AGENTOPS_PHASE_5E_HERMES_ENDPOINT_CONFIG_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `qa-agent/hermes/hermes-staging-activation-plan.md` | Step 2.5 endpoint design; Step 3 health stub note |
| `qa-agent/hermes/hermes-activation-checklist.md` | Endpoint config, env, signoff requirements |
| `qa-agent/hermes/hermes-readiness-gate.json` | Endpoint/env/signoff checks; updated blockers |
| `src/lib/agentops/hermesAdapter.ts` | `endpointConfigured`, `endpointSource`, env/signoff fields |
| `src/lib/agentops/types.ts` | `AgentOpsHermesEndpointSource`; extended status/gate types |
| `src/lib/agentops/index.ts` | Export `AgentOpsHermesEndpointSource` |
| `src/app/system/agent-ops/issues/[issueCode]/page.tsx` | Endpoint / runtime / signoff / next step UI |

**Not modified:** Supabase schema, RLS, migrations, API routes, production/main.

## Endpoint Design

**Recommended staged path:**

1. **Local dev** — Option C: `http://127.0.0.1:<port>/hermes`
2. **Staging** — Option A: server-side `/api/agentops/hermes` proxy (keeps API key off browser)
3. **Production** — disabled until weeks of staging success

Options documented; none implemented in Phase 5E.

## Env Vars (names only)

| Variable | Phase 5E default |
|----------|------------------|
| `HERMES_RUNTIME_ACTIVE` | `false` |
| `HERMES_STAGING_ENDPOINT` | empty |
| `HERMES_API_KEY` | empty (server-side only when implemented) |
| `HERMES_TIMEOUT_MS` | `15000` |
| `HERMES_ALLOWED_MODES` | all six contract modes |
| `HERMES_OWNER_APPROVED` | `false` |

Template: `qa-agent/hermes/hermes-env-template.example`

## Owner Signoff

Required fields in `hermes-owner-signoff-template.md`:

- Date, approved by, environment
- Endpoint configured, health check passed, fallback verified
- Sample issue, allowed modes, runtime activation approved
- Scope (one issue vs all staging), rollback confirmed, notes

**Approval required before `HERMES_RUNTIME_ACTIVE` can be true.**

## Current State

| Field | Value |
|-------|--------|
| `endpointConfigured` | `false` |
| `endpointSource` | `not_configured` |
| `runtimeActive` | `false` |
| `appCallable` | `false` |
| `canEnableInStaging` | `false` |
| Health status | `not_configured` |
| Fallback | Mock response active |

## What Was Not Implemented

- No Hermes runtime
- No network call
- No API route
- No external LLM
- No CodeGraph
- No auto Cursor
- No scheduler
- No secrets committed
- No schema/RLS/migration
- No production/main
- No Connect/Run Hermes UI buttons

## Validation Results

| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `npm run qa:validate-foundation` | PASS |
| `npm run qa:static-design-guardrails` | PASS |
| `npm run qa:guardrail-action-plan` | PASS |

## Next Recommended Phase

**Phase 6A — CodeGraph discovery contract design** (parallel track, design only).

Or **Phase 5F — Hermes local adapter stub** after owner chooses Option A/B/C for first dev endpoint.

Suggested owner prompt:

> Implement AgentOps Phase 6A — CodeGraph discovery contract design. Define read-only contract for future issue context discovery. No CodeGraph runtime, no MCP calls from app, staging only.
