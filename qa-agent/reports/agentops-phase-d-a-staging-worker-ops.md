# AgentOps Phase D-A — Staging Worker Operations Hardening

**Date:** 2026-07-20  
**Branch:** `staging`  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app

---

## 1. Summary

Phase D-A hardens the external staging worker into a persistent operations loop with clear queue/retry/cancel/stale policy, artifact labeling, health/UI honesty, a runbook, and a verify script. Manual and scheduled `website_audit` / `browser_qa` runs were processed end-to-end by `npm run agentops:staging-worker -- --once` (via `staging-worker --once`).

## 2. Persistent worker command

```bash
npm run agentops:staging-worker          # loop
npm run agentops:staging-worker:once     # one cycle
```

Each cycle: validate staging env → heartbeat → scheduler tick → pick/claim/execute one run → stale report (dry-run) → write ops health.

Guards:

- `AGENTOPS_ENVIRONMENT === staging`
- `STAGING_APP_URL === https://ai-xia-staging.vercel.app`
- `AGENTOPS_PRODUCTION_BLOCKED === true`
- blocked when `CI` / `GITHUB_ACTIONS`
- interval default 60s, min 30s (`AGENTOPS_STAGING_WORKER_INTERVAL_MS`)

## 3. Queue policy

- One run at a time
- Priority: `owner_manual` then `schedule`
- Oldest first within priority
- Anti-starvation: scheduled waiting ≥ 10 minutes wins over newer manuals
- No parallel Playwright in D-A

## 4. Retry policy

- Default: no automatic retry
- Transient network errors only, max 1
- Metadata: `summary.retryCount`, `summary.lastRetryAt`, `summary.retryReason`
- Never retry auth / production / invalid config / unsupported scope

## 5. Cancel / stale policy

- States: `queued` | `running` | `completed` | `failed` | `canceled`
- Owner cancel API: `POST /api/agentops/monitoring/manual-run/cancel` (same monitoring function)
- Queued → `canceled`; running → `cancelRequested` (worker honors before engine spawn)
- Stale cleanup: dry-run by default; `--mutate` marks stale running as `failed` (no deletion)

## 6. Artifact / evidence handling

- Refs remain on monitoring summary for Agent Detail
- Labeled `local_worker_only` with honest note
- Sensitive paths (`storage_state`, tokens) redacted
- No artifact commit; no secrets in reports

## 7. Worker health / UI changes

Capability + Agent Detail header now expose:

- Worker connected / stale / offline (heartbeat freshness)
- Scheduler executable / not executable (tick freshness)
- Engines ready / not ready
- Active run id / type / trigger
- Queue length, oldest queued age
- Last completed / failed / error
- Next scheduler tick estimate

## 8. Runbook link

`qa-agent/reports/agentops-staging-worker-runbook.md`

## 9. Live operations test

Script: `qa-agent/scripts/agentops-d-a-ops-live.mjs`

| Step | Result | Run id |
|---|---|---|
| Ops once heartbeat | PASS | — |
| Manual website_audit | PASS | `owner-manual-system-agent-website_audit-d-a-1784525289559` |
| Manual browser_qa | PASS | `owner-manual-qa-agent-browser_qa-d-a-1784525354017` |
| Scheduled website_audit | PASS (fresh enqueue + ops process) | `scheduled-logs-agent-website_audit-f4a768fe` |
| Scheduled browser_qa | PASS (fresh enqueue + ops process) | `scheduled-runtime-agent-browser_qa-f17a82ea` |
| Queue drains | PASS | — |
| No GitHub run ids | PASS | — |

## 10. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `agentops:vercel-function-count-verify` | PASS (9/12) |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:monitoring-daily-12-agents-verify` | PASS |
| `agentops:tts-preference-verify` | PASS |
| `agentops:doubao-tts-voice-verify` | PASS |
| `agentops:doubao-stt-voice-verify` | PASS |
| `agentops:agent-detail-manual-run-verify` | PASS |
| `agentops:manual-run-browser-qa-verify` | PASS |
| `agentops:manual-run-scheduler-verify` | PASS |
| `agentops:manual-run-scheduler-hardening-verify` | PASS |
| `agentops:staging-worker-ops-verify` | PASS |

Local `npm run build` may be blocked by unrelated WIP; Vercel Preview build of committed tree is the deploy gate.

## 11. Known limitations

- Persistent worker must keep running on an approved host (not Vercel)
- Same-hour scheduled idempotency still blocks duplicate enqueue by design
- Cancel of a mid-Playwright run does not hard-kill the OS process
- Local artifact paths are not browser-reachable
- No automatic promotion / fix / PR / deploy

## 12. Next recommended phase

D-B: durable host supervisor + optional cancel UX button on Agent Detail + richer queue dashboard (still staging-only, no GitHub/Vercel cron).

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_VERCEL_CRON | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| PERSISTENT_WORKER_COMMAND_CREATED | YES |
| WORKER_LOOP_CI_BLOCKED | YES |
| WORKER_ENV_GUARDS_PASS | YES |
| QUEUE_POLICY_DEFINED | YES |
| MANUAL_WEBSITE_AUDIT_PROCESSED_BY_WORKER | YES |
| MANUAL_BROWSER_QA_PROCESSED_BY_WORKER | YES |
| SCHEDULED_WEBSITE_AUDIT_PROCESSED_BY_WORKER | YES |
| SCHEDULED_BROWSER_QA_PROCESSED_BY_WORKER | YES |
| QUEUE_DRAINS | YES |
| RETRY_POLICY_DEFINED | YES |
| CANCEL_OR_STALE_POLICY_DEFINED | YES |
| ARTIFACT_EVIDENCE_HANDLING_DEFINED | YES |
| WORKER_HEALTH_UI_IMPROVED | YES |
| RUNBOOK_CREATED | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| AUTH_SECRETS_NOT_LOGGED | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| NO_CODE_CHANGE | YES (worker does not modify app code) |
| NO_PR_CREATION | YES |
| NO_DEPLOY | YES (worker never deploys; Preview deploy is this phase’s release step) |
| STAGING_ONLY_ENFORCED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | PENDING (Vercel Preview) |
| COMMITTED_TO_ORIGIN_STAGING | PENDING |
| VERCEL_STAGING_DEPLOY_GREEN | PENDING |
| READY_FOR_AGENTOPS_NEXT_PHASE | PENDING until commit/deploy green |
