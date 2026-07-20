# AgentOps Phase D-B — Worker Dashboard + Cancel UX

**Date:** 2026-07-20  
**Branch:** `staging`  
**Commit:** `817ce4a5` — Add AgentOps staging worker operations dashboard  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Preview deploy:** https://ai-mdefnirhu-piterdrori-gmailcoms-projects.vercel.app (`dpl_HfNtrje4MkqrEJwzSUaPN91nEYVD`, Ready, aliased)

---

## 1. Summary

Phase D-B makes staging worker operations durable and operator-friendly: host supervisor docs, env template, owner cancel UX, queue dashboard, stale visibility, worker doctor/status commands, and honest local-artifact copy. Cancel required a staging DB constraint update to allow status `canceled`. Deployed to git-connected Vercel Preview and aliased to staging (no `--prod`).

## 2. Durable host supervisor docs

Updated `qa-agent/reports/agentops-staging-worker-runbook.md` with:

- PM2 start/restart/logs/stop
- systemd unit template + journalctl
- tmux temporary fallback
- staging-only warnings; placeholders only

## 3. Env template

`qa-agent/reports/agentops-staging-worker.env.example` — placeholders only, no secrets.

## 4. Cancel UX

- Control header **Cancel run** + drawer cancel
- Confirm modal (`AgentRunCancelConfirmModal`)
- Queued → `canceled` (lock released)
- Running → `cancelRequested` (honest “not instant kill” copy)
- Optional `agentSlug` mismatch rejected (403)
- Owner-gated; staging guard on API

DB migration (staging applied): `20260720140000_agentops_monitoring_runs_canceled_status.sql`

## 5. Queue dashboard

- Component: `StagingWorkerQueuePanel`
- Monitoring page (full) + Agent Detail (compact, agent-filtered)
- API: `GET /api/agentops/monitoring/manual-run/queue` (same monitoring function)

Shows active run, queue length, oldest age, queued/running/stale/terminal, heartbeats, engines ready, last completed/failed/error.

## 6. Stale visibility

- Stale badge on running rows with expired lock / stale worker
- `lockExpiresAt` + suggested action copy
- Cleanup remains dry-run by default on worker

## 7. Worker doctor / status commands

```bash
npm run agentops:staging-worker:doctor
npm run agentops:staging-worker:status
```

Doctor: staging env, URL, Supabase read/write probe, Playwright, storage_state. No audits by default.

## 8. Artifact / evidence copy

`formatLocalArtifactEvidence` labels local worker artifacts and redacts sensitive paths.

## 9. Live QA

Script: `qa-agent/scripts/agentops-d-b-ops-ui-live.mjs`

| Check | Result |
|---|---|
| Doctor | PASS |
| Heartbeat/status | PASS |
| Queued cancel | PASS |
| Duplicate lock released | PASS |
| cancelRequested | PASS |
| Manual website_audit complete | PASS |
| Manual browser_qa complete | PASS |
| Stale dry-run visibility | PASS |
| Queue drained | PASS |

## 10. Security checks

- Owner gate on cancel + queue APIs
- Non-owner rejected (assertOwnerFromRequest)
- Staging execution guard
- Wrong-agent cancel rejected when agentSlug provided
- Modes limited to owner_manual / scheduled
- No service-role to browser
- No auth secrets logged
- No GitHub dispatch / Vercel cron / Playwright on Vercel
- No auto-promotion / PR / production deploy

## 11. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `agentops:vercel-function-count-verify` | PASS (9/12) |
| promotion / daily-12 / TTS / STT verifies | PASS |
| manual-run / browser-qa / scheduler verifies | PASS |
| `agentops:staging-worker-ops-verify` | PASS |
| `agentops:staging-worker-ops-ui-verify` | PASS |

## 12. Known limitations

- Cancel of mid-Playwright run is cooperative (`cancelRequested`), not OS kill
- Local artifacts remain host-local
- Scheduled smoke not re-run in D-B live (manual regressions covered; scheduler verifies still pass)
- Doctor still requires `AGENTOPS_WORKER_SECRET` on the host

## 13. Next recommended phase

D-C: optional signed artifact upload to staging storage + richer cancel-during-engine cooperation + durable host health alerts.

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_VERCEL_CRON | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| DURABLE_HOST_DOCS_CREATED | YES |
| ENV_TEMPLATE_CREATED | YES |
| CANCEL_UX_CREATED | YES |
| QUEUED_CANCEL_WORKS | YES |
| RUNNING_CANCEL_REQUEST_WORKS | YES |
| NON_OWNER_CANCEL_REJECTED | YES (API owner gate) |
| DUPLICATE_LOCK_RELEASED_AFTER_CANCEL | YES |
| QUEUE_DASHBOARD_CREATED | YES |
| QUEUE_DASHBOARD_SHOWS_ACTIVE_RUN | YES |
| QUEUE_DASHBOARD_SHOWS_QUEUE_LENGTH | YES |
| QUEUE_DASHBOARD_SHOWS_STALE_RUNS | YES |
| WORKER_STATUS_VISIBLE | YES |
| SCHEDULER_STATUS_VISIBLE | YES |
| ENGINE_STATUS_VISIBLE | YES |
| WORKER_DOCTOR_CREATED | YES |
| ARTIFACT_COPY_HONEST | YES |
| MANUAL_WEBSITE_AUDIT_REGRESSION_PASS | YES |
| MANUAL_BROWSER_QA_REGRESSION_PASS | YES |
| SCHEDULED_EXECUTION_REGRESSION_PASS | YES (static/hardening verifies; prior D-A live) |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| AUTH_SECRETS_NOT_LOGGED | YES |
| STAGING_ONLY_ENFORCED | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| NO_CODE_CHANGE_BY_WORKER | YES |
| NO_PR_CREATION | YES |
| NO_PRODUCTION_DEPLOY | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES |
| COMMITTED_TO_ORIGIN_STAGING | YES (`817ce4a5`) |
| VERCEL_STAGING_DEPLOY_GREEN | YES (Preview Ready + alias) |
| READY_FOR_AGENTOPS_NEXT_PHASE | YES |
