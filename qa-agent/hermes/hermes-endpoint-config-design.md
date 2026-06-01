# Hermes Endpoint Configuration Design

Hermes is **essential** to AgentOps. This document defines how AgentOps will **later** connect to an app-callable Hermes staging endpoint. Phase 5E is **design only** — no API route, no network calls, no runtime enablement.

Reference: `hermes-env-template.example`, `hermes-owner-signoff-template.md`, `hermes-readiness-gate.json`

---

## Purpose

Define how AgentOps will later connect to an app-callable Hermes staging endpoint:

- Where the adapter endpoint will live (planned options)
- Required environment variable **names** (no values in repo)
- Safe secret storage
- Owner sign-off fields before runtime activation
- How health check will use the endpoint safely when implemented

---

## Current State

| Item | Status |
|------|--------|
| Endpoint configured | **No** |
| Runtime | **Inactive** (`HERMES_RUNTIME_ACTIVE=false`, hardcoded in adapter) |
| App callable | **No** |
| Mock fallback | **Active** |
| Health check | Stub returns `not_configured` |
| Gate state | `staging_ready_pending_owner` |

---

## Proposed Endpoint Location

Three planned options — **not implemented in Phase 5E**:

| Option | Location | When to use |
|--------|----------|-------------|
| **A** | Internal app API route (future) `/api/agentops/hermes` | Server-side proxy; API key never in browser |
| **B** | External staging Hermes service `HERMES_STAGING_ENDPOINT` | Dedicated Hermes service on staging infra |
| **C** | Local development adapter `http://127.0.0.1:<port>/hermes` | Local dev and smoke before staging |

### Recommended staged path

1. **Local adapter endpoint** for development (Option C) — validate contract and health check shape.
2. **Staging endpoint** (Option A or B) — owner sign-off, one sample issue only.
3. **Production disabled** until weeks of stable staging success — no production env vars until separate approval.

**Phase 5E recommendation:** Start with **Option C** for local dev, then **Option A** (server-side proxy) for Vercel staging so `HERMES_API_KEY` never reaches the browser.

---

## Required Env Vars

Safe names only — see `hermes-env-template.example`. **Do not commit real values.**

| Variable | Purpose | Phase 5E default |
|----------|---------|------------------|
| `HERMES_RUNTIME_ACTIVE` | Master runtime switch | `false` |
| `HERMES_STAGING_ENDPOINT` | Staging/local Hermes URL | empty |
| `HERMES_API_KEY` | Server-side auth (never in browser) | empty |
| `HERMES_TIMEOUT_MS` | Health check / request timeout | `15000` |
| `HERMES_ALLOWED_MODES` | Comma-separated contract modes | all six modes |
| `HERMES_OWNER_APPROVED` | Owner sign-off gate | `false` |

Runtime activation requires **all** of:

- `HERMES_STAGING_ENDPOINT` set in staging env (not repo)
- `HERMES_OWNER_APPROVED=true` after signed checklist
- Health check passing (`checkHermesStagingHealth` → `ready`, future phase)
- Code flags / feature gate aligned (still hardcoded off until explicit later phase)

---

## Where Env Vars Live

| Environment | Storage | Notes |
|-------------|---------|-------|
| Local development | `.env.local` (gitignored) | Copy from `hermes-env-template.example` |
| Vercel staging | Project env (staging only) | Never commit values |
| Vercel production | **Disabled** | No Hermes vars until separate production policy |
| Git repository | **Never** | Example template only, no secrets |

---

## Security Rules

1. **Never expose API key to browser** — Hermes calls server-side only when runtime is later implemented.
2. **Server-side only** when runtime is implemented — Issue Workspace continues to call `runAgentOpsHermesAdapter()` locally; future server route proxies to Hermes.
3. **Redact issue data** where needed in logs and health metadata.
4. **No secrets in request payloads** — per `hermes-safety-policy.md`.
5. **Owner approval required** for all Hermes outputs and before `HERMES_RUNTIME_ACTIVE=true`.
6. **No production/main** targets until explicit separate approval.

---

## Activation Flow

1. Configure endpoint in staging env (outside repo) using `hermes-env-template.example`.
2. Run health check (future: safe no-data ping only).
3. Owner completes `hermes-owner-signoff-template.md`.
4. Enable for **one sample issue** only (`AIXIA-SAMPLE-001`).
5. Compare mock vs Hermes responses on same questions.
6. Expand to all staging issues only after stability criteria in `hermes-staging-activation-plan.md`.

---

## How Health Check Will Use Endpoint (future)

When endpoint is configured and owner approves (post–Phase 5E):

1. `checkHermesStagingHealth()` reads **server-side only** whether `HERMES_STAGING_ENDPOINT` is set (never expose URL/key to client).
2. Sends **safe no-data ping** (`safeMode: true` per `hermes-health-check-contract.json`).
3. On success → `status: ready`; on failure → `unhealthy` or `timeout`, mock fallback remains default.
4. Health result recorded in owner feedback metadata (no secrets, no issue payload).

Phase 5D stub does **not** ping — returns `not_configured` until endpoint wiring phase after owner decision.

---

## Related Artifacts

| Artifact | Path |
|----------|------|
| Env template | `qa-agent/hermes/hermes-env-template.example` |
| Owner signoff | `qa-agent/hermes/hermes-owner-signoff-template.md` |
| Health check contract | `qa-agent/hermes/hermes-health-check-contract.json` |
| Activation checklist | `qa-agent/hermes/hermes-activation-checklist.md` |
| Adapter wrapper | `src/lib/agentops/hermesAdapter.ts` |
