# AgentOps Staging Worker Runbook (Phase D-A / D-B / D-C / D-D)

Staging-only operations for the external worker that heartbeats, ticks the scheduler, and executes queued `website_audit` / `browser_qa` runs.

**Alias:** https://ai-xia-staging.vercel.app  
**Command:** `npm run agentops:staging-worker`  
**Doctor:** `npm run agentops:staging-worker:doctor`  
**Status:** `npm run agentops:staging-worker:status`  
**Never:** production, main, GitHub dispatch, Vercel cron, Playwright on Vercel, auto-promote, auto-fix, PR, deploy.

**Env template (placeholders only):** `qa-agent/reports/agentops-staging-worker.env.example`

---

## 1. Required environment variables

Load from `.env.local` and optionally `qa-agent/browser-qa/.env.owner.local`.

| Variable | Required | Notes |
|---|---|---|
| `AGENTOPS_ENVIRONMENT` | yes | Must be `staging` |
| `AGENTOPS_PRODUCTION_BLOCKED` | yes | Must be `true` |
| `STAGING_APP_URL` | yes | Must be exactly `https://ai-xia-staging.vercel.app` for persistent ops |
| `STAGING_SUPABASE_URL` | yes | Staging project URL |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | yes | Service role — worker host only, never browser |
| `AGENTOPS_WORKER_SECRET` | yes | Shared worker secret |
| `AGENTOPS_WORKER_ID` | optional | Stable id for this host |
| `AGENTOPS_STAGING_WORKER_INTERVAL_MS` | optional | Default `60000`, minimum `30000` |
| `AGENTOPS_BROWSER_QA_STORAGE_STATE` | for Browser QA | Path to Playwright storage state file |

---

## 2. Start the worker locally

```bash
# From repo root, with staging env loaded
npm run agentops:staging-worker
```

Safe single cycle (no loop):

```bash
npm run agentops:staging-worker:once
```

Blocked in CI (`CI=true` / `GITHUB_ACTIONS=true`).

---

## 3. Start on an approved staging host

1. Clone/checkout `staging` on a non-production machine with Node + Playwright installed.
2. Place env files (never commit secrets).
3. Ensure Browser QA storage state exists if Browser QA is required.
4. Run `npm run agentops:staging-worker` under a process supervisor (pm2/systemd/tmux).
5. Confirm heartbeat freshness in Agent Detail.

---

## 4. Refresh auth / storage_state safely

1. Sign in to staging as the owner QA user in a local Playwright/browser session.
2. Export storage state to a local path (default `qa-agent/browser-qa-auth/storage-state.json`).
3. Point `AGENTOPS_BROWSER_QA_STORAGE_STATE` at that path.
4. **Never commit** `storage_state` or session tokens.
5. **Never log** auth secrets, service-role keys, or storage-state contents.

---

## 5. Verify heartbeat

```bash
npm run agentops:manual-run-worker:heartbeat
```

Or open Agent Detail and confirm:

- Execution worker: **Worker connected** (fresh heartbeat only)
- Last heartbeat timestamp recent (< ~3 minutes)

---

## 6. Run scheduler tick manually

```bash
npm run agentops:manual-run-worker:scheduler-tick
# dry-run:
node scripts/agentops-staging-manual-run-worker.mjs scheduler-tick --dry-run
```

Tick only enqueues due scheduled runs. It does not execute Playwright.

---

## 7. Run once commands

```bash
npm run agentops:manual-run-worker:website-audit-once
npm run agentops:manual-run-worker:browser-qa-once
```

Dev loops (CI-blocked):

```bash
npm run agentops:manual-run-worker:website-audit-dev
npm run agentops:manual-run-worker:browser-qa-dev
npm run agentops:manual-run-worker:scheduler-dev
```

Prefer the persistent ops loop for normal staging operations.

---

## 8. Inspect queue

```bash
npm run agentops:manual-run-worker:queue-status
```

Queue policy (ops):

1. `owner_manual` before `schedule`
2. Oldest first within priority
3. Scheduled anti-starvation after 10 minutes
4. One run at a time (no parallel Playwright in D-A)

---

## 9. Cancel queued runs

Owner-gated API (same monitoring function, no new Vercel function):

`POST /api/agentops/monitoring/manual-run/cancel`  
Body: `{ "runId": "..." }`  
Auth: Owner Bearer token

Rules:

- Staging only, owner only
- `queued` → status `canceled`
- `running` → `summary.cancelRequested=true`; worker honors before engine spawn

Client helper: `cancelOwnerManualRun(runId)` in `agentManualRunClient.ts`.

---

## 10. Detect stale runs

```bash
npm run agentops:manual-run-worker:scheduler-cleanup-stale
```

Default is **dry-run / report-only**. Stale = running + expired lock (and related classifiers).

---

## 11. Clean stale runs safely

Report only (default):

```bash
npm run agentops:manual-run-worker:scheduler-cleanup-stale
```

Explicit mutation (marks stale **running** rows `failed` — **never deletes**):

```bash
node scripts/agentops-staging-manual-run-worker.mjs scheduler-cleanup-stale --mutate
```

---

## 12. Read evidence

- Evidence lives on `agentops_monitoring_runs.summary` (`artifactRefs`, `screenshotRefs`, `rawObservations`, `evidenceSummary`).
- Paths are labeled `local_worker_only` — may not open from the browser.
- Sensitive paths (`storage_state`, tokens) are redacted.
- Agent Detail run drawer shows refs when present; drafts are never auto-promoted.

---

## 13. What not to do

- Do not target production or change `main`
- Do not use `--prod`
- Do not create GitHub `workflow_dispatch` or cron for AgentOps execution
- Do not create Vercel cron for Playwright / monitoring execution
- Do not run Playwright inside Vercel
- Do not put secrets in reports, commits, or browser bundles
- Do not auto-promote findings, auto-fix code, open PRs, or deploy from the worker
- Do not bypass `agentops_monitoring_runs`

---

## Command audit (quick)

| Command | Loops? | CI blocked? | Windows | Linux worker |
|---|---|---|---|---|
| `heartbeat` / `once` | no | no | yes | yes |
| `website-audit-once` | no | no | yes | yes |
| `browser-qa-once` | no | no | yes* | yes* |
| `*-dev` loops | yes | yes | yes | yes |
| `scheduler-tick` | no | no | yes | yes |
| `scheduler-dev` | yes | yes | yes | yes |
| `scheduler-cleanup-stale` | no | no | yes | yes |
| `staging-worker` / `ops` | yes (unless `--once`) | yes | yes | yes |

\* Browser QA requires Playwright + valid storage state on the host.

---

## 14. Durable host supervisor (staging-only)

The worker host must be a **staging-only** machine. Never point it at production URLs or production Supabase.

Sanitized env file example: `qa-agent/reports/agentops-staging-worker.env.example`  
Copy to a host-local path such as `/etc/aixia/staging-worker.env` or `~/aixia-staging-worker.env` — **never commit real values**.

### A. PM2 example

```bash
# Install PM2 (host)
npm i -g pm2

# From repo root on the staging worker host
# Load env from a host-local file (placeholders only in repo)
set -a
source /path/to/staging-worker.env
set +a

pm2 start npm --name aixia-staging-worker -- run agentops:staging-worker
pm2 save
pm2 startup   # follow printed instructions for boot persistence
```

Restart policy: PM2 restarts crashed processes by default (`autorestart: true`).

Logs:

```bash
pm2 logs aixia-staging-worker
# or
~/.pm2/logs/aixia-staging-worker-out.log
~/.pm2/logs/aixia-staging-worker-error.log
```

Status / stop:

```bash
pm2 status
pm2 stop aixia-staging-worker
pm2 delete aixia-staging-worker
```

### B. systemd example

Service file template (`/etc/systemd/system/aixia-staging-worker.service`):

```ini
[Unit]
Description=AiXia AgentOps staging worker (staging-only)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=aixia
WorkingDirectory=/opt/aixia/AiXia-github
EnvironmentFile=/etc/aixia/staging-worker.env
ExecStart=/usr/bin/npm run agentops:staging-worker
Restart=always
RestartSec=10
# Staging safety: refuse if env file missing
Environment=AGENTOPS_ENVIRONMENT=staging
Environment=AGENTOPS_PRODUCTION_BLOCKED=true

[Install]
WantedBy=multi-user.target
```

Commands:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now aixia-staging-worker
sudo systemctl status aixia-staging-worker
sudo systemctl restart aixia-staging-worker
sudo systemctl stop aixia-staging-worker
journalctl -u aixia-staging-worker -f
```

### C. tmux / manual fallback (temporary staging only)

```bash
tmux new -s aixia-staging-worker
cd /path/to/AiXia-github
set -a; source /path/to/staging-worker.env; set +a
npm run agentops:staging-worker
# Detach: Ctrl-b then d
# Reattach: tmux attach -t aixia-staging-worker
```

Use tmux only for short staging experiments. Prefer PM2 or systemd for durable hosts.

---

## 15. Doctor and status

```bash
npm run agentops:staging-worker:doctor
npm run agentops:staging-worker:status
```

Doctor checks staging env, staging URL, Supabase reachability, heartbeat writability, Playwright install, storage_state presence (if Browser QA expected), private artifact bucket (exists/private), upload flag, alert fanout config, artifact retention config, cleanup dry-run, and cancel checkpoint sources. It does **not** run audits by default and **never** deletes artifacts.

Optional probes (never default):

```bash
npm run agentops:staging-worker:doctor -- --upload-test
npm run agentops:staging-worker:doctor -- --alert-test
npm run agentops:staging-worker:doctor -- --cleanup-test
```

- `--upload-test` requires `AGENTOPS_ARTIFACT_UPLOAD_ENABLED=true`
- `--alert-test` requires `AGENTOPS_ALERT_FANOUT_ENABLED=true` (sends one safe staging payload via configured channel)
- `--cleanup-test` re-runs cleanup **dry-run only** (doctor never mutates)

---

## 16. Owner cancel UX (D-B / D-C)

- Agent Detail: **Cancel run** on the control header and run drawer (owner session, staging, queued/running only).
- Queued → immediate `canceled` (duplicate lock released).
- Running → `cancelRequested`; worker/engine stop at checkpoints (`before_engine_spawn`, `before_route_scan`, `before_browser_launch`, mid-phase). Owned child may receive SIGTERM after cancel poll.
- UI copy: “Cancel requested. The worker will stop at the next safe checkpoint.”
- After ack: “Canceled by owner.”
- API: `POST /api/agentops/monitoring/manual-run/cancel`

---

## 17. Queue dashboard (D-B / D-C)

- Monitoring page: full staging worker queue panel (+ health alerts).
- Agent Detail: compact agent-filtered queue panel.
- API: `GET /api/agentops/monitoring/manual-run/queue` (owner-gated, same monitoring function).

---

## 18. Private staging artifacts (D-C)

- Bucket: `agentops-artifacts-staging` (private). Service-role upload from worker only.
- Enable on worker host: `AGENTOPS_ARTIFACT_UPLOAD_ENABLED=true`
- Object path: `agentops/{runId}/{artifactType}/{safeFilename}`
- Owner signed URL: `GET /api/agentops/monitoring/manual-run/artifact-url?runId=...&artifactPath=...`
- Never upload `storage_state`, `.env`, cookies, or secrets.
- Upload failure does not fail the run; local fallback retained.

---

## 19. Alert fanout (D-D)

Disabled by default. Worker-host only. Never sends secrets, signed URLs, or `storage_state`.

| Variable | Default | Notes |
|---|---|---|
| `AGENTOPS_ALERT_FANOUT_ENABLED` | `false` | Must be `true` to send |
| `AGENTOPS_ALERT_CHANNEL` | `log` | `log` or `webhook` |
| `AGENTOPS_ALERT_WEBHOOK_URL` | unset | Staging webhook only; production hosts rejected |
| `AGENTOPS_ALERT_WEBHOOK_SECRET` | unset | Worker-host header only; never browser |
| `AGENTOPS_ALERT_MIN_LEVEL` | `warning` | `info` / `warning` / `critical` |
| `AGENTOPS_ALERT_RATE_LIMIT_MINUTES` | `30` | Dedupe + rate limit by type/run/message hash |

Ops JSON stores `alertFanout` (`lastFanoutAt`, channel, count, error, `suppressedCount`) and `alertHistory`. Owner ack via queue **Acknowledge** → `POST .../health-alert-ack` (does not delete alert).

Email/Slack: future — only if safe existing infra is approved later.

---

## 20. Artifact retention / cleanup (D-D)

- Default retention: **14 days** (`AGENTOPS_ARTIFACT_RETENTION_DAYS`, class `staging_default`)
- Uploaded refs include `uploadedAt`, `retentionClass`, `retentionDays`, `expiresAt`, `cleanupEligible`
- DB run summaries are retained; storage objects may be cleaned later
- **Never auto-delete** — explicit command only

```bash
# Dry-run (default)
npm run agentops:staging-worker:artifact-cleanup

# Mutate only after reviewing dry-run output
node scripts/agentops-staging-manual-run-worker.mjs artifact-cleanup --mutate
```

Mutation rules: staging only, bucket `agentops-artifacts-staging`, path `agentops/…`, never `storage_state`, never unknown buckets. UI shows cleaned copy: “Artifact expired or cleaned from staging storage.”

---

## 21. Deeper cancel checkpoints (D-D)

Website audit: before scan, before/after each route, before artifact upload, before final persistence.  
Browser QA: before browser launch, before/after navigation, before/after screenshot, before analysis, before artifact upload, before final persistence.  
Owned child only may receive SIGTERM/SIGKILL after cancel poll timeout — never arbitrary PIDs.
