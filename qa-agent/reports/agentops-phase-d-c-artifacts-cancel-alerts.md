# AgentOps Phase D-C — Signed Staging Artifacts, Cancel Cooperation, Health Alerts

**Date:** 2026-07-20  
**Branch:** `staging`  
**Commit:** `4d19756c` — Add AgentOps staging worker artifact links and alerts  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Preview deploy:** https://ai-1q4n3czci-piterdrori-gmailcoms-projects.vercel.app (Ready, aliased)

---

## 1. Summary

Phase D-C improves operational quality without changing the execution model: private Supabase Storage uploads from the staging worker, owner-only short-lived signed URLs, stronger cancel checkpoints (engine + owned-child SIGTERM), durable health alerts in worker ops JSON / queue UI / doctor, and honest local-fallback artifact copy.

## 2. Artifact storage design

- **Bucket:** `agentops-artifacts-staging` (private, staging Supabase `ydppcpbxrvvardeslzrk`)
- **Path:** `agentops/{runId}/{artifactType}/{safeFilename}`
- **RLS:** never-grant policies scoped with `bucket_id = '…' AND false` (no not-equal policies)
- **Migrations:**
  - `20260720150000_agentops_artifacts_staging_private_bucket.sql`
  - `20260720151000_agentops_artifacts_staging_fix_deny_policies.sql` (fixes incorrect first deny pattern)

### Audit (pre-implement)

| Area | Finding |
|---|---|
| website_audit writes | `scripts/agentops-manual-run-website-audit-engine.ts` → local `artifactRefs` + `rawObservations` |
| browser_qa writes | `scripts/agentops-manual-run-browser-qa-engine.ts` → local `screenshotRefs` / `artifactRefs` |
| UI read | Agent Detail drawer via `formatLocalArtifactEvidence` |
| Existing signed URL pattern | Finance private buckets + `createSignedUrl` |
| Bucket before D-C | Not present → created private |

**Safe to upload:** screenshots, sanitized JSON evidence/summary, console/network/a11y observations.  
**Never upload:** `storage_state`, cookies, tokens, `.env`, service-role keys, filesystem dumps.

## 3. Upload behavior

- Worker-only via `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- Env: `AGENTOPS_ARTIFACT_UPLOAD_ENABLED` (default false), `AGENTOPS_ARTIFACT_BUCKET`
- Success → `provider: supabase_storage` refs + `artifactUploadStatus=uploaded`
- Failure → run still completes; `artifactUploadStatus=failed` + local fallback note
- Helper: `scripts/lib/agentops-staging-artifact-storage.mjs`

## 4. Signed URL access

- `GET /api/agentops/monitoring/manual-run/artifact-url` (same monitoring function)
- Owner gate + staging guard
- Path must belong to run summary storage refs; traversal / cross-run / non-staging bucket rejected
- TTL: 10 minutes
- UI: **Open signed link** on storage-backed refs

## 5. Redaction / security

- Redacts bearer tokens, cookies, service keys, storage_state paths, home dirs, secret query params
- Forbidden local paths blocked before upload
- No service-role to browser; no public bucket

## 6. Result drawer / dashboard UI

- Private uploaded badge + signed open + expiration note
- Local-only honest copy retained
- Upload-failed warning copy
- Queue panel shows health alerts

## 7. Cancel cooperation

- Checkpoints: before engine spawn, before route scan, before browser launch, after BQ before analysis
- Worker polls `cancelRequested` during spawn; SIGTERM/SIGKILL only owned child PID
- Summary: `cancelAcknowledgedAt`, `cancelPhase`, optional `killAttempted` / `killResult`
- UI: checkpoint copy (not instant kill)

## 8. Health alerts

Types: worker_stale, scheduler_stale, queue_backlog, oldest_queued_too_old, running_lock_expired, repeated_failures, artifact_upload_failed, browser_auth_stale, engine_unavailable  
Stored under worker `ops.alerts`; optional owner ack via `POST .../health-alert-ack`

## 9. Doctor enhancements

```bash
npm run agentops:staging-worker:doctor
npm run agentops:staging-worker:doctor -- --upload-test
```

Bucket exists/private, upload flag, optional upload probe, health alert presence. No audits by default.

## 10. Live QA

Script: `qa-agent/scripts/agentops-d-c-artifacts-live.mjs` — **PASS**

| Check | Result |
|---|---|
| Doctor | PASS |
| Doctor --upload-test | PASS |
| Browser QA complete + upload | PASS (paths=2) |
| storage_state not uploaded | PASS |
| Signed URL created | PASS |
| Website audit complete + upload | PASS |
| Queued cancel | PASS |
| Cancel cooperation | PASS |
| Health alerts doctor check | PASS |

## 11. Security checks

- Private bucket + owner-only signed URLs + path validation
- No arbitrary path signing; no production bucket
- Service role never to browser; storage_state not uploaded/committed
- No GitHub dispatch / Vercel cron / Playwright on Vercel
- No auto-promotion / PR / production deploy

## 12. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `agentops:vercel-function-count-verify` | PASS (9/12) |
| promotion / daily-12 / TTS / STT | PASS |
| manual-run / browser-qa / scheduler verifies | PASS |
| staging-worker-ops + ops-ui verify | PASS |
| `agentops:staging-worker-artifacts-verify` | PASS |
| Local `npm run build` | Blocked by pre-existing untracked WIP (not committed); Vercel builds git tree only |

## 13. Known limitations

- Screenshots are not OCR-redacted
- Mid-Playwright cancel may finish current step before checkpoint/SIGTERM
- Artifact upload disabled unless host env enables it
- No email/Slack alert fan-out in D-C

## 14. Next recommended phase

D-D: optional owner alert webhooks (approved channel), richer mid-route cancel inside Playwright runner, and artifact retention/TTL cleanup policy.

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_VERCEL_CRON | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| PRIVATE_STAGING_ARTIFACT_BUCKET_USED | YES |
| ARTIFACT_UPLOAD_WORKS | YES |
| LOCAL_ARTIFACT_FALLBACK_WORKS | YES |
| SIGNED_ARTIFACT_URLS_WORK | YES |
| SIGNED_URL_OWNER_GATE_ENFORCED | YES |
| SIGNED_URL_PATH_VALIDATION_WORKS | YES |
| ARTIFACT_REDACTION_WORKS | YES |
| STORAGE_STATE_NOT_UPLOADED | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| RESULT_DRAWER_ARTIFACTS_TRUTHFUL | YES |
| QUEUE_DASHBOARD_ARTIFACTS_TRUTHFUL | YES |
| RUNNING_CANCEL_COOPERATION_IMPROVED | YES |
| CANCEL_ACKNOWLEDGED_BY_WORKER | YES |
| CANCELED_RUN_RELEASES_DUPLICATE_LOCK | YES |
| HEALTH_ALERTS_CREATED | YES |
| WORKER_STALE_ALERT_WORKS | YES (derive + verify) |
| SCHEDULER_STALE_ALERT_WORKS | YES (derive + verify) |
| QUEUE_BACKLOG_ALERT_WORKS | YES (derive + verify) |
| ARTIFACT_UPLOAD_FAILED_ALERT_WORKS | YES (derive + verify) |
| DOCTOR_ARTIFACT_CHECKS_WORK | YES |
| MANUAL_WEBSITE_AUDIT_REGRESSION_PASS | YES |
| MANUAL_BROWSER_QA_REGRESSION_PASS | YES |
| SCHEDULED_EXECUTION_REGRESSION_PASS | YES (static verifies) |
| NO_AUTOMATIC_PROMOTION | YES |
| NO_CODE_CHANGE_BY_WORKER | YES |
| NO_PR_CREATION | YES |
| NO_PRODUCTION_DEPLOY | YES |
| AUTH_SECRETS_NOT_LOGGED | YES |
| STAGING_ONLY_ENFORCED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES (Vercel Preview Ready) |
| COMMITTED_TO_ORIGIN_STAGING | YES (`4d19756c`) |
| VERCEL_STAGING_DEPLOY_GREEN | YES (Preview Ready + alias) |
| READY_FOR_AGENTOPS_NEXT_PHASE | YES |
