# AgentOps Fix B2-B — Staging worker heartbeat and claim loop

**Date:** 2026-07-20  
**Branch:** `origin/staging` only  
**Registry:** codegraph  
**Prior:** Fix B2-A queue-only accept  
**Commits:** `18105ca9` (worker foundation), `7bc3f8c8` (TS build fix)  
**Deploy:** `dpl_9tWk21QMfGUmKM78zzJPhCHUE2tF` → aliased to https://ai-xia-staging.vercel.app  

## Summary

External staging worker can heartbeat into staging DB, Agent Detail capability reads worker health, and the worker can atomically claim one queued owner manual run then safely close it without executing Playwright / audit / Browser QA.

## 1. Worker architecture

| Piece | Path |
|---|---|
| CLI | `scripts/agentops-staging-manual-run-worker.mjs` |
| Pure helpers | `scripts/lib/agentops-manual-run-worker-core.mjs` |
| API health reader | `api/agentops/_lib/manualRunWorkerHealth.ts` |
| Capability/status | `api/agentops/_lib/monitoringManualRun.ts` |

Commands:

- `heartbeat` / `once` — write health + report queue
- `queue-status` — list queued/running
- `claim-test --run-id <id>` — atomic claim then close

Design: **direct Supabase service-role writes** (no new Vercel function, no worker secret in browser).

## 2. Worker env

Required:

- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_APP_URL=https://ai-xia-staging.vercel.app`
- `AGENTOPS_WORKER_SECRET`
- `AGENTOPS_ENVIRONMENT=staging`
- `AGENTOPS_PRODUCTION_BLOCKED=true`

Production hosts / non-staging environment rejected by `validateWorkerEnv`.

## 3. Health model

Stored in existing `agentops_system_config.tools_enabled.manualRunWorker` (no new table).

Fields: connected, lastHeartbeatAt, workerId, workerVersion, activeRunId, queueLength, lastClaimedRunId, lastError, environment, websiteAuditEngine, browserQaEngine.

Freshness threshold: **3 minutes**.

Statuses: `connected` | `stale` | `offline` | `unknown`.

## 4. Claim model

Filter queued rows:

- mode `owner_manual_single_agent`
- status `queued`
- summary.trigger `owner_manual`
- summary.schedulerConnection `staging_worker_pending`

Atomic update: `queued → running` only if still queued, then write claim metadata (`workerId`, `workerVersion`, `claimedAt`, `lockExpiresAt`, `workerPhase=b2-b`, `executionEngine=not_connected`).

B2-B preferred close: immediately `failed` with:

“Worker claim verified. Execution engine not connected in B2-B.”

## 5. Lock / stale behavior

- `lockExpiresAt` = claimedAt + 5 minutes
- Status endpoint marks `stale: true` when running + lock expired and/or heartbeat stale
- Message: “Run is running but worker heartbeat is stale.”
- No automatic duplicate restart in B2-B

## 6. Capability behavior

When heartbeat fresh (proven live):

- `queueAvailable: true`
- `workerConnected: true`
- `workerStatus: connected`
- websiteAudit / browserQa **available: false**
- reasons: engine not connected in this phase

CTAs remain disabled until B2-C / B2-D.

## 7. UI behavior

- Offline: Execution worker Offline · “Staging worker not connected.”
- Connected: Execution worker Connected · engine-not-connected reasons
- Shows last heartbeat, queue length, active run id
- Staging queue badge tone uses `workerConnected` (emerald when connected)

## 8. DB rows / health records

Health: `agentops_system_config.tools_enabled.manualRunWorker`

Live claim-test run (post-deploy):

`owner-manual-system-agent-44c7c7cf-cb59-4226-b8f8-017150a1b1e9`

- claimed running then closed `failed`
- `summary.b2bClaimOnly: true`
- `summary.workerPhase: b2-b`
- `summary.executionEngine: not_connected`
- `github_run_id: null`
- `findings_count: 0`

Leftover queued design-agent row may remain until cleaned:

`owner-manual-design-agent-b9829d1e-e364-457d-9e03-5d64597adf73`

## 9. Live worker heartbeat proof

Local worker heartbeat wrote health; staging capability returned:

- `workerConnected: true`
- `workerStatus: connected`
- `lastHeartbeatAt: 2026-07-20T03:18:25.785Z`
- `queueLength: 1`
- engines available: false with B2-B reasons

## 10. Live claim-test proof

1. Owner API queued system-agent run (`ACCEPT 200`)
2. `claim-test` atomically claimed then closed failed with B2-B engine message
3. Status endpoint: `failed` + message “Worker claim verified. Execution engine not connected in B2-B.”
4. `githubRunId: null`, `evidenceAvailable: false`
5. No Playwright / GitHub dispatch / audit / Browser QA execution

## 11. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (local) / Vercel READY |
| `agentops:manual-run-worker-verify` | PASS |
| `agentops:agent-detail-manual-run-verify` | PASS |
| `agentops:vercel-function-count-verify` | PASS (9/12) |
| monitoring owner promotion lock | PASS |
| monitoring daily-12 / TTS / STT verifies | PASS |

## 12. Known limitations

- Engines not connected (B2-C / B2-D)
- CTAs stay disabled while worker is connected
- Worker must be run locally / on approved host (not Vercel)
- Heartbeat must be refreshed within 3 minutes to stay connected
- Leftover pre-B2-B queued rows may remain until cleaned

## 13. Next step

**Fix B2-C** — website audit execution engine on the staging worker.

## FINAL VERDICT

| Gate | Value |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| WORKER_SCRIPT_CREATED | YES |
| WORKER_ENV_VALIDATED | YES |
| WORKER_HEARTBEAT_WORKS | YES |
| WORKER_HEALTH_VISIBLE_IN_CAPABILITY | YES |
| WORKER_HEALTH_VISIBLE_IN_UI | YES |
| QUEUE_LENGTH_VISIBLE | YES |
| ATOMIC_CLAIM_WORKS | YES |
| CLAIM_TEST_CLOSES_RUN_SAFELY | YES |
| STALE_LOCK_DETECTION_WORKS | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_PLAYWRIGHT_EXECUTED | YES |
| NO_AUDIT_EXECUTED | YES |
| NO_BROWSER_QA_EXECUTED | YES |
| CTAS_STILL_DISABLED_UNTIL_ENGINES_CONNECTED | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| OWNER_GATE_STILL_ENFORCED | YES |
| STAGING_ONLY_ENFORCED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_FIX_B2_C_WEBSITE_AUDIT_WORKER | YES |
| READY_FOR_FIX_C_SCHEDULER | NO |
