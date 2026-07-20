# AgentOps Staging Worker Runbook (Phase D-A)

Staging-only operations for the external worker that heartbeats, ticks the scheduler, and executes queued `website_audit` / `browser_qa` runs.

**Alias:** https://ai-xia-staging.vercel.app  
**Command:** `npm run agentops:staging-worker`  
**Never:** production, main, GitHub dispatch, Vercel cron, Playwright on Vercel, auto-promote, auto-fix, PR, deploy.

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
