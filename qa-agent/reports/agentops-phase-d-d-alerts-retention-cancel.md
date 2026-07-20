# AgentOps Phase D-D — Alert Fanout, Artifact Retention, Deeper Cancel Control

**Date:** 2026-07-20  
**Branch:** `staging`  
**Commit:** `73b750f4` — Add AgentOps staging worker alerts and artifact retention  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Preview deploy:** https://ai-jpn62lbl1-piterdrori-gmailcoms-projects.vercel.app (Ready, aliased)  
**Mode:** Staging-only implementation and QA

---

## 1. Summary

Phase D-D hardens operational alerts, artifact lifecycle, and cancel cooperation without changing the staging-only execution model (external worker, no GitHub dispatch, no Vercel cron, no Playwright on Vercel).

Delivered:

- Owner-approved alert fanout framework (**disabled by default**)
- Artifact retention metadata + dry-run-first cleanup command
- Deeper Playwright/browser cancel checkpoints
- Alert ack / history UI + API hardening
- Doctor checks for fanout / retention / cleanup / cancel
- Verify scripts + live QA

## 2. Alert fanout design

Worker-host only (`scripts/lib/agentops-staging-alert-fanout.mjs`):

| Channel | Availability |
|---|---|
| `log` | Always available when enabled |
| `webhook` | Only if `AGENTOPS_ALERT_WEBHOOK_URL` configured; production hosts rejected |
| Email / Slack | Future — not built (no safe existing infra wired) |

Rules:

- Disabled unless `AGENTOPS_ALERT_FANOUT_ENABLED=true`
- Dedupe key = `alertType|relatedRunId|messageHash`
- Rate limit via `AGENTOPS_ALERT_RATE_LIMIT_MINUTES` (default 30)
- Payload: `environment`, `alertType`, `level`, `message`, `detectedAt`, `recommendedAction`, `relatedRunId`, `workerId`, `stagingUrl`
- Never includes tokens, cookies, service keys, `storage_state`, signed URLs, or private paths
- Ops JSON: `alertFanout` (`lastFanoutAt`, `lastFanoutChannel`, `lastFanoutCount`, `lastFanoutError`, `suppressedCount`, `lastByKey`)

## 3. Alert env/config

Documented in `qa-agent/reports/agentops-staging-worker.env.example` (placeholders only):

```
AGENTOPS_ALERT_FANOUT_ENABLED=false
AGENTOPS_ALERT_CHANNEL=log
AGENTOPS_ALERT_WEBHOOK_URL=<staging-alert-webhook-url>
AGENTOPS_ALERT_WEBHOOK_SECRET=<worker-host-only>
AGENTOPS_ALERT_MIN_LEVEL=warning
AGENTOPS_ALERT_RATE_LIMIT_MINUTES=30
AGENTOPS_ARTIFACT_RETENTION_DAYS=14
```

## 4. Alert ack/history

- `POST /api/agentops/monitoring/manual-run/health-alert-ack` (existing monitoring function)
- Owner-only, staging-only, `alertType` / `alertId` validation, optional `note`
- Ack sets `acknowledgedAt` / `acknowledgedBy` / `acknowledgeNote` — does **not** delete
- Same message suppressed in active UI until alert reappears/changes
- Queue panel: active alerts + Acknowledge button; acknowledged/history collapsed; fanout status line

## 5. Artifact retention policy

Default staging policy (`staging_default`, 14 days):

- Keep storage objects ~7–14 days (configurable)
- Keep DB run summaries longer
- **Never** auto-delete without explicit cleanup command
- Cleanup dry-run by default; mutation requires `--mutate`
- Ref metadata: `uploadedAt`, `retentionClass`, `retentionDays`, `expiresAt`, `cleanupEligible`

## 6. Artifact cleanup command

```bash
npm run agentops:staging-worker:artifact-cleanup
node scripts/agentops-staging-manual-run-worker.mjs artifact-cleanup --mutate
```

Mutation rules: staging env, bucket `agentops-artifacts-staging`, path `agentops/…`, known run refs preferred, never `storage_state`, never wrong bucket. Writes `artifactCleanup` summary into ops health JSON.

## 7. Retention UI

`AgentResultsPanel`:

- Private uploaded + retention class + expiresAt + cleanup eligible
- Signed link short TTL note retained
- Cleaned: “Artifact expired or cleaned from staging storage.”
- DB evidence / local fallback remain

## 8. Deeper cancel checkpoints

| Surface | Checkpoints |
|---|---|
| Website audit | before scan, before/after each route, before artifact upload, before final persistence |
| Browser QA | before browser launch, before/after navigation, before/after screenshot, before analysis, before artifact upload |
| Worker spawn | cancel poll; SIGTERM/SIGKILL **owned child only** |

Helper: `src/lib/agentops/runtime/agentOpsCancelCheckpoint.ts` (`honorCancelCheckpoint`).

## 9. Health alert live QA

| Check | Result |
|---|---|
| Log-only fanout | PASS |
| Dedupe / rate limit | PASS |
| Webhook | NOT_CONFIGURED (honest) |
| Alert ack (ops JSON mirror of owner API) | PASS — not deleted |
| Doctor fanout/retention/cancel checks | PASS |

## 10. Artifact retention live QA

| Check | Result |
|---|---|
| Browser QA upload with retention meta | PASS (`refs=5`) |
| Cleanup dry-run | PASS |
| Seed expired artifact + dry-run eligible | PASS |
| Mutate seed only | PASS |
| DB summary retained after cleanup | PASS |
| Wrong bucket rejected | PASS (unit verify) |

## 11. Cancel live QA

| Check | Result |
|---|---|
| Queued cancel | PASS |
| Pre-browser cancel | PASS (`canceled_before_claim`) |
| Mid-route cancel | PARTIAL — live race canceled at `before_engine_spawn` (checkpoints deeper in Playwright present; mid-Playwright still may finish current step) |
| Website audit cancel | PASS |
| Duplicate / overlap lock released | PASS |

## 12. Doctor enhancements

`npm run agentops:staging-worker:doctor` now checks:

- alert fanout config valid/disabled
- retention config
- cleanup dry-run
- cancel checkpoint sources
- private bucket

Optional flags (never default): `--upload-test`, `--alert-test`, `--cleanup-test` (cleanup-test is dry-run only).

## 13. Security checks

- Fanout disabled by default
- Webhook secrets not sent to browser
- Alert payload redaction
- Signed URLs not in alerts
- Bucket remains private
- Cleanup staging-bucket only, dry-run default, mutate explicit
- Cancel kills owned child only
- `storage_state` not uploaded / not committed
- Auth secrets not logged
- No new GitHub dispatch / Vercel cron / Playwright-on-Vercel
- No auto-promotion / code fix / PR / prod deploy
- Staging-only enforced

## 14. Safety checks

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run agentops:vercel-function-count-verify` | PASS (9/12) |
| `npm run agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `npm run agentops:monitoring-daily-12-agents-verify` | PASS |
| `npm run agentops:tts-preference-verify` | PASS |
| `npm run agentops:doubao-tts-voice-verify` | PASS |
| `npm run agentops:doubao-stt-voice-verify` | PASS |
| `npm run agentops:agent-detail-manual-run-verify` | PASS |
| `npm run agentops:manual-run-browser-qa-verify` | PASS |
| `npm run agentops:manual-run-scheduler-verify` | PASS |
| `npm run agentops:manual-run-scheduler-hardening-verify` | PASS |
| `npm run agentops:staging-worker-ops-verify` | PASS |
| `npm run agentops:staging-worker-ops-ui-verify` | PASS |
| `npm run agentops:staging-worker-artifacts-verify` | PASS |
| `npm run agentops:staging-worker-alerts-verify` | PASS |
| `npm run agentops:staging-worker-retention-verify` | PASS |
| Live: `qa-agent/scripts/agentops-d-d-alerts-retention-live.mjs` | PASS |

`npm run build` — Vercel Preview Ready (git tree). Local untracked WIP may still break a full local build.

## 15. Known limitations

- Mid-Playwright cancel still cooperates at checkpoints; current step may finish before cancel is honored
- Screenshots are not OCR-redacted
- Artifact upload still requires worker-host env enablement
- Webhook channel unused until staging webhook env is set
- Email/Slack fanout not implemented
- Orphan storage objects without run refs are not deleted by cleanup (by design)

## 16. Next recommended phase

**D-E candidates:** OCR/screenshot redaction, optional staging webhook onboarding, mid-step cancel latency metrics, retention reports for owners, and supervised multi-host worker HA — still staging-only.

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_VERCEL_CRON | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| ALERT_FANOUT_FRAMEWORK_CREATED | YES |
| ALERT_FANOUT_DISABLED_BY_DEFAULT | YES |
| ALERT_LOG_MODE_WORKS | YES |
| ALERT_WEBHOOK_MODE_SAFE | NOT_CONFIGURED |
| ALERT_PAYLOAD_REDACTION_WORKS | YES |
| ALERT_DEDUPE_RATE_LIMIT_WORKS | YES |
| ALERT_ACK_WORKS | YES |
| ALERT_HISTORY_VISIBLE | YES |
| ARTIFACT_RETENTION_POLICY_DEFINED | YES |
| ARTIFACT_RETENTION_METADATA_WRITTEN | YES |
| ARTIFACT_CLEANUP_DRY_RUN_WORKS | YES |
| ARTIFACT_CLEANUP_MUTATE_SAFE | YES |
| WRONG_BUCKET_CLEANUP_REJECTED | YES |
| RETENTION_UI_TRUTHFUL | YES |
| SIGNED_URLS_STILL_WORK | YES |
| PRIVATE_BUCKET_STILL_PRIVATE | YES |
| DEEP_CANCEL_CHECKPOINTS_ADDED | YES |
| QUEUED_CANCEL_WORKS | YES |
| PRE_BROWSER_CANCEL_WORKS | YES |
| MID_ROUTE_CANCEL_WORKS | PARTIAL |
| WEBSITE_AUDIT_CANCEL_WORKS | YES |
| CANCELED_RUN_RELEASES_DUPLICATE_LOCK | YES |
| DOCTOR_ALERT_CHECKS_WORK | YES |
| DOCTOR_RETENTION_CHECKS_WORK | YES |
| MANUAL_WEBSITE_AUDIT_REGRESSION_PASS | YES |
| MANUAL_BROWSER_QA_REGRESSION_PASS | YES |
| SCHEDULED_EXECUTION_REGRESSION_PASS | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| AUTH_SECRETS_NOT_LOGGED | YES |
| STORAGE_STATE_NOT_UPLOADED | YES |
| STAGING_ONLY_ENFORCED | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| NO_CODE_CHANGE_BY_WORKER | YES |
| NO_PR_CREATION | YES |
| NO_PRODUCTION_DEPLOY | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | PENDING_VERCEL |
| COMMITTED_TO_ORIGIN_STAGING | PENDING |
| VERCEL_STAGING_DEPLOY_GREEN | PENDING |
| READY_FOR_AGENTOPS_NEXT_PHASE | PENDING |
