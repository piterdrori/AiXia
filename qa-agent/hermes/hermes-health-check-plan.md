# Hermes Health Check Plan

Hermes is **essential** to AgentOps. This plan defines how staging health checks will run **before** Hermes runtime activation. Phase 5D adds a **stub only** — no network, no Hermes call.

Reference: `hermes-health-check-contract.json`, `checkHermesStagingHealth()` in `hermesAdapter.ts`

---

## Current State

- Hermes runtime **inactive** (`HERMES_RUNTIME_ACTIVE=false`, `HERMES_APP_CALLABLE=false`).
- App-callable Hermes endpoint **unknown**.
- Mock fallback **active** via `runAgentOpsHermesAdapter()`.
- Health check stub returns **`not_configured`** — reports not ready until endpoint exists.
- Gate state: `staging_ready_pending_owner`.
- Owner activation approval **pending**.

---

## Purpose

Allow safe staging readiness checks before Hermes runtime activation:

1. Prove the activation path is observable (status, blockers, next step).
2. Avoid silent or accidental Hermes enablement.
3. Keep fallback as default until health passes and owner approves.

---

## Future Health Check Steps

1. **Confirm endpoint configured** in staging environment (env / secret manager — not in repo).
2. **Confirm owner approval** on activation checklist.
3. **Confirm runtime feature flag** (`AGENTOPS_HERMES_STAGING_ENABLED` or equivalent).
4. **Send safe no-data ping** — no issue payload, no secrets, staging URL only.
5. **Confirm response format** matches `hermes-adapter-contract.json`.
6. **Confirm fallback still works** if ping fails or times out.
7. **Confirm no production/main** — environment guard in request/response.
8. **Record health result** in owner feedback metadata (global, no finding_id).
9. **Allow limited sample issue test** only after health passes (e.g. `AIXIA-SAMPLE-001`).

---

## Safety Rules

| Rule | Requirement |
|------|-------------|
| No secrets in report | Health metadata must not include API keys or tokens |
| No production endpoint | Staging/local/preview only until separate production policy |
| No issue data in first health check | First ping is endpoint/format only (`safeMode: true`) |
| No Cursor execution | Health check never triggers Cursor |
| Fallback remains active | Mock fallback default until `status: ready` and owner sign-off |

---

## Status meanings

| Status | Meaning |
|--------|---------|
| `not_configured` | Endpoint unknown — Phase 5D stub default |
| `blocked_by_gate` | Gate blockers prevent ping (owner, flags, policies) |
| `ready` | Ping passed; fallback still available |
| `unhealthy` | Ping failed or bad response |
| `timeout` | Ping exceeded `timeoutMs` |
| `disabled` | Rolled back or feature flag off |

---

## Phase 5D vs future phases

| Phase | Behavior |
|-------|----------|
| 5D (current) | `checkHermesStagingHealth()` — local stub, `not_configured` |
| 5E+ | Endpoint configuration design, env wiring |
| 6+ | Optional real ping behind flag after owner approval |

---

## Rollback

1. Disable feature flag / set `HERMES_RUNTIME_ACTIVE=false`.
2. Health status → `disabled`.
3. Verify Issue Workspace shows mock fallback and health **Not configured** or **Blocked by gate**.
4. Run `npm run qa:agentops-agent-clarification-smoke` if UI changed.
