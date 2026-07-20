# AgentOps Fix B2-A — Queue-only manual run accept

**Date:** 2026-07-20  
**Branch:** `origin/staging` only  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents/:agentId  
**Registry:** codegraph  
**Plan:** `qa-agent/reports/agentops-staging-only-execution-redesign.md`

## Summary

Manual Agent Detail runs no longer call GitHub `workflow_dispatch`.  
Owner Accept now validates, enforces duplicate lock, inserts `agentops_monitoring_runs` with `status=queued`, and returns immediately.

No worker. No Playwright. No Browser QA execution. No scheduler.

## GHA dependency removed

Removed from `api/agentops/_lib/monitoringManualRun.ts`:

- `AGENTOPS_GITHUB_DISPATCH_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN` reads
- `dispatchDaily12Workflow`
- `maybeResolveGithubRunId`
- GitHub API calls
- Accept → `running` transition after dispatch

Accept response:

```json
{
  "ok": true,
  "accepted": true,
  "runId": "...",
  "status": "queued",
  "message": "Run queued for staging worker."
}
```

## Queue model

Reuses `agentops_monitoring_runs`:

| Field | Value |
|---|---|
| mode | `owner_manual_single_agent` |
| source | `owner_manual` |
| status | `queued` |
| trigger (summary) | `owner_manual` |

Summary extras:

- `agentSlug`, `runtimeAgentId`, `workType`, `scope`
- `selectedRoutes`, `selectedModules`, `maxDurationMinutes`
- `requestedBy`, `runOnceWhilePaused`, `createdByAgentDetail`
- `queueVersion = b2-a`
- `schedulerConnection = staging_worker_pending`
- `activity.event = manual_run_queued`

Migration committed (matches staging DB):

`supabase/migrations/20260717160000_agentops_monitoring_runs_owner_manual_statuses.sql`

Allows `queued` / `running` in `agentops_monitoring_runs_status_chk`.

## Capability model

```json
{
  "queueAvailable": true,
  "workerConnected": false,
  "workerStatus": "not_connected",
  "websiteAudit": { "available": false, "reason": "Staging worker not connected." },
  "browserQa": { "available": false, "reason": "Staging worker not connected." }
}
```

CTAs disabled while worker offline. Owner-gated POST accept remains testable.

## Worker offline UX

- Execution worker: Offline / Not connected
- Run audit / Browser QA disabled with “Staging worker not connected.”
- Badge: Staging queue · Worker required · No GitHub dependency
- No GHA Playwright badge / dispatch / missing-token copy

## Duplicate lock

Backend blocks second queued/running manual run for the same agent:

“This agent already has an active or queued run.”

Returns existing `runId` + status.

## Paused Run once

Unchanged: `runOnceWhilePaused=true` queues without activating.  
No silent unpause. Activate and run still requires explicit owner action.

## Status polling

GET `/api/agentops/monitoring/manual-run` reads DB only.

Queued:

- message: Waiting for staging worker / Queued. Worker not connected.
- no duration / evidence

UI stops polling when worker is offline after the first queued status read.

## Activity

Records “Owner manual run queued” with work type, scope, runId.  
Does not record audit/Browser QA completed or evidence (no worker).

## Safety results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `vite build` | PASS |
| `npm run build` (local dirty tree) | FAIL — untracked local WIP breaks `tsc -b`; not in commit |
| `agentops:vercel-function-count-verify` | PASS (9/12) |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:monitoring-daily-12-agents-verify` | PASS |
| `agentops:tts-preference-verify` | PASS |
| `agentops:doubao-tts-voice-verify` | PASS |
| `agentops:doubao-stt-voice-verify` | PASS |
| `agentops:agent-detail-manual-run-verify` | PASS |

## Live QA (2026-07-20)

Deploy: `dpl_HWfRBZQWCkBDfMb3aSzKTQhAahLx` → https://ai-xia-staging.vercel.app

### Capability

`queueAvailable: true` · `workerConnected: false` · engines disabled with “Staging worker not connected.”

### Owner API

- No auth → 401
- Invalid workType → 400
- Accept system-agent → 200 queued (`owner-manual-system-agent-56844dbd-…`)
- Duplicate → 409 “This agent already has an active or queued run.”
- Status → queued · “Queued. Worker not connected.” · no duration/evidence
- Paused without run-once → 409
- Paused Run once (design-agent) → 200 queued · `runOnceWhilePaused: true`

### DB

`agentops_monitoring_runs`: mode `owner_manual_single_agent`, source `owner_manual`, status `queued`, queueVersion `b2-a`, schedulerConnection `staging_worker_pending`, github fields null.

### UI (system-agent)

Execution worker Offline / Not connected · CTAs disabled · Staging queue badge · no GHA copy.

## Known limitations

- No staging worker yet (B2-B)
- CTAs remain disabled until worker heartbeat exists
- Queued rows wait until worker claims them (no cancel API in B2-A)
- Fleet daily-12 GHA path unchanged; only Detail manual accept changed

## Next step

**Fix B2-B** — external staging worker that claims `queued` rows and runs Playwright off Vercel.

## FINAL VERDICT

| Gate | Value |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| GITHUB_DISPATCH_REMOVED | YES |
| AGENTOPS_GITHUB_DISPATCH_TOKEN_NOT_REQUIRED | YES |
| QUEUE_ACCEPT_API_WORKS | YES |
| QUEUE_USES_AGENTOPS_MONITORING_RUNS | YES |
| RUN_STATUS_QUEUED_VISIBLE | YES |
| WORKER_HEALTH_STATUS_VISIBLE | YES |
| WORKER_OFFLINE_CTA_DISABLED | YES |
| NO_GHA_BADGE_OR_COPY | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| NO_AUDIT_EXECUTED | YES |
| NO_BROWSER_QA_EXECUTED | YES |
| DUPLICATE_QUEUED_RUN_BLOCKED | YES |
| PAUSED_RUN_ONCE_QUEUE_WORKS | YES |
| NO_SILENT_UNPAUSE | YES |
| OWNER_GATE_ENFORCED | YES |
| STAGING_ONLY_ENFORCED | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| NO_CODE_CHANGE | YES |
| NO_PR_CREATION | YES |
| NO_DEPLOY | YES (production untouched; staging Preview only) |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES (Vercel Preview Ready · 9 lambdas) |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_FIX_B2_B_WORKER | YES |
| READY_FOR_FIX_C_SCHEDULER | NO |
