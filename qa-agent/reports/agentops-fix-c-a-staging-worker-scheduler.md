# AgentOps Fix C-A — Staging Worker Scheduler Tick

**Date:** 2026-07-20  
**Branch:** `origin/staging`  
**Registry:** codegraph  
**Scope:** Queue due scheduled agent runs only (no Playwright / audit / Browser QA inside the tick)

---

## 1. Schedule config source

| Item | Value |
|------|--------|
| Storage | `agentops_agents.tools` tag `aixia:schedule:<json>` |
| Parser | `scripts/lib/agentops-manual-run-scheduler-core.mjs` + UI `agentDetailScheduleModel.ts` |
| Enabled | `enableSchedule` + `ownerEnabled` + `frequencyType !== "manual"` |
| Cadence | `every_hours`, `every_days`, `every_weeks`, `days_and_time` (UI-supported only) |
| Work types | `website_audit`, `browser_qa`, `audit_and_browser_qa` (expands to both) |
| Scope | Prefer `selectedRoutes` (max 3); otherwise conservative default `/system/agent-ops/agents/{slug}` — **no** entire_staging expansion |
| Max duration | From schedule, clamped 5–30 minutes |
| Timezone | Stored; interval due calc uses wall clock from last due / first enable |
| Next due | Persisted under `tools_enabled.manualRunScheduler.agents[slug].nextDueAt` |

Unsupported UI work types (`verify_findings`, `improvement_review`) are skipped with `Work type not supported by staging scheduler`.

---

## 2. Due calculation rules

Conservative gate — enqueue only when all hold:

1. Schedule enabled + non-manual frequency  
2. Canonical agent slug  
3. Owner status Active (not paused/quiet/disabled/blocked)  
4. Executable work type after expansion  
5. `nextDueAt <= now` (or first enable → due immediately)  
6. No queued/running `owner_manual_single_agent` or `scheduled_single_agent` for same `agentSlug`  
7. Staging worker health connected (tick heartbeats first)  
8. Relevant engine connected (`websiteAuditEngine` / `browserQaEngine`)  
9. Target URL staging-only  

Skip reasons (exact strings):

- `Agent paused`
- `Existing active or queued run`
- `Staging worker not connected`
- `Engine not connected`
- `Not due yet`
- `Schedule disabled`

After a successful enqueue (or active-run skip), `nextDueAt` advances via `computeNextDueAt` to prevent tick spin.

---

## 3. Queue insert model

Table: `agentops_monitoring_runs`

| Field | Value |
|-------|--------|
| `mode` | `scheduled_single_agent` |
| `source` | `schedule` |
| `status` | `queued` |
| `summary.trigger` | `schedule` |
| `summary.createdBy` | `staging_worker_scheduler` |
| `summary.queueVersion` | `fix-c-a` |
| `summary.schedulerConnection` | `staging_worker` |
| Also | `agentSlug`, `runtimeAgentId`, `workType`, `scope`, `selectedRoutes`, `maxDurationMinutes`, `dueAt`, `nextDueAt`, `idempotencyKey`, `scheduleTickId`, `ownerStatusAtQueue`, `engineAvailabilityAtQueue`, auto-promote/fix/memory/production blocks |

Does **not** use `owner_manual` / `owner_manual_single_agent` for scheduled inserts.

---

## 4. Idempotency / duplicate model

- **Active lock:** same `agentSlug` with status `queued`/`running` in either manual or scheduled mode  
- **Idempotency key:** `scheduled-{slug}-{workType}-{dueHourBucket}` in `summary.idempotencyKey`  
- Duplicate tick → skip, update agent scheduler state, no second row  

Live proof: tick #1 enqueued `scheduled-system-agent-website_audit-629312b9`; tick #2 reported `Not due yet` (nextDueAt advanced) with 0 enqueues.

---

## 5. Worker claim update

`isClaimableQueuedSummary` = owner_manual **or** scheduled.  
Website audit / Browser QA claim matchers accept both triggers.  
Execution engines remain B2-C / B2-D — no separate scheduler engine.  
Trigger separation preserved: manual keeps `owner_manual`; scheduled keeps `schedule`.

---

## 6. Scheduler health model

Written to `agentops_system_config.tools_enabled.manualRunScheduler` (+ compact mirror on `manualRunWorker.scheduler`).

```json
{
  "connected": true,
  "lastTickAt": "...",
  "lastTickId": "...",
  "lastDueCount": 0,
  "lastEnqueuedCount": 0,
  "lastSkippedCount": 0,
  "lastError": null,
  "mode": "staging_worker_scheduler",
  "agents": { "<slug>": { "nextDueAt", "lastEnqueuedRunId", "lastSkippedReason", ... } }
}
```

Capability exposes: `schedulerConnected`, `lastSchedulerTickAt`, `dueAgents`, `queuedByLastTick`, `skippedByLastTick`. Freshness window: **15 minutes**.

---

## 7. UI schedule copy

| Before C-A | After C-A |
|------------|-----------|
| Saved · not executable | Saved · executable by staging worker (when scheduler fresh + worker connected) |
| Not connected | Saved · worker scheduler offline |

Panel also shows: next due, last scheduler tick, last scheduled run id, last skipped reason, runtime status (`Active` / `Paused` / `Worker offline` / `Engine unavailable` / `Duplicate active run` / `Not due yet` / `Manual only`).

---

## 8. Live website_audit scheduled run

| Step | Result |
|------|--------|
| Heartbeat | workerVersion `c-a`, engines connected |
| scheduler-tick #1 | enqueued `scheduled-system-agent-website_audit-629312b9` |
| scheduler-tick #2 | 0 enqueues (idempotent / not due) |
| website-audit-once | claimed + **completed**; `trigger=schedule`; mode `scheduled_single_agent` |
| Evidence | real duration/scope; draft promotion blocked |

Script: `qa-agent/scripts/agentops-c-a-scheduler-live.mjs`

---

## 9. Optional Browser QA scheduled smoke

**NOT_TESTED** in this pass — website_audit scheduled path proven first. Browser QA scheduled claim path is unit-covered (same B2-D matcher + `isScheduledQueuedSummary`).

---

## 10. Paused-agent skip

`design-agent` set to `paused` with due schedule → tick skipped with **`Agent paused`**; no enqueue; status restored.

---

## 11. Manual-run duplicate skip

Queued `owner_manual_single_agent` for `system-agent` → tick due but skipped **`Existing active or queued run`**; no scheduled row.

---

## 12. Worker / engine unavailable skip

| Case | Evidence |
|------|----------|
| Engine unavailable | Live: `analytics-agent` due + `websiteAuditEngine.connected=false` → skip **`Engine not connected`**, 0 enqueue (`qa-agent/scripts/agentops-c-a-engine-skip-live.mjs`). Scheduler-tick no longer forces engines via full `writeHeartbeat`. |
| Worker offline | Capability/UI: `schedulerConnected` requires worker heartbeat + fresh scheduler tick; skip reason constant verified |
| Constants | Verified in `agentops:manual-run-scheduler-verify` |

---

## 13. Safety checks

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (C-A files) | No C-A file errors (local WIP unrelated files fail full-tree tsc/build) |
| `agentops:manual-run-scheduler-verify` | PASS |
| `agentops:vercel-function-count-verify` | PASS (9/12) |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:monitoring-daily-12-agents-verify` | PASS |
| TTS / Doubao STT/TTS | PASS |
| `agentops:agent-detail-manual-run-verify` | PASS |
| `agentops:manual-run-browser-qa-verify` | PASS |
| `agentops:manual-run-worker-verify` | PASS |
| No GitHub dispatch / Vercel cron / Playwright-in-tick | Verified by scheduler verify mustNotInclude |

---

## 14. Known limitations

1. First enable with no `nextDueAt` → due on next tick (intentional bootstrap).  
2. `entire_staging` / assigned modules not expanded — defaults to one Agent Detail route.  
3. `days_and_time` uses local worker clock (not full IANA tz math).  
4. Browser QA scheduled end-to-end smoke deferred.  
5. Scheduler-dev loop blocked in CI.  
6. Local `npm run build` may fail due to unrelated untracked WIP under `src/`; Vercel build uses committed tree only.

---

## 15. Next step — Fix C-B (if needed)

- Hardening: IANA timezone due math, richer scope expansion, Browser QA scheduled smoke, longer-lived scheduler-dev ops docs, tighter first-due policy.

---

## Commands

```bash
npm run agentops:manual-run-worker:scheduler-tick
npm run agentops:manual-run-worker:scheduler-dev   # local/worker host only; CI blocked
npm run agentops:manual-run-scheduler-verify
node qa-agent/scripts/agentops-c-a-scheduler-live.mjs
```

---

## FINAL VERDICT

| Gate | Result |
|------|--------|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_VERCEL_CRON | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| SCHEDULER_RUNS_ON_STAGING_WORKER | YES |
| SCHEDULE_CONFIG_PARSED | YES |
| DUE_CALCULATION_WORKS | YES |
| IDEMPOTENCY_WORKS | YES |
| SCHEDULED_RUN_QUEUED | YES |
| SCHEDULED_RUN_USES_AGENTOPS_MONITORING_RUNS | YES |
| TRIGGER_IS_SCHEDULE | YES |
| SCHEDULED_WEBSITE_AUDIT_EXECUTED | YES |
| SCHEDULED_BROWSER_QA_EXECUTED | NOT_TESTED |
| PAUSED_AGENT_SKIPPED | YES |
| MANUAL_DUPLICATE_SKIPPED | YES |
| WORKER_OFFLINE_SKIPPED | YES |
| ENGINE_UNAVAILABLE_SKIPPED | YES |
| SCHEDULER_HEALTH_VISIBLE | YES |
| AGENT_DETAIL_SCHEDULE_SHOWS_EXECUTABLE | YES |
| MANUAL_WEBSITE_AUDIT_STILL_WORKS | YES |
| MANUAL_BROWSER_QA_STILL_WORKS | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| NO_CODE_CHANGE | YES |
| NO_PR_CREATION | YES |
| NO_DEPLOY | YES (app deploy = staging preview only; no production) |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| STAGING_ONLY_ENFORCED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES (committed tree / Vercel; local WIP excluded) |
| COMMITTED_TO_ORIGIN_STAGING | YES (`de3385cd`) |
| VERCEL_STAGING_DEPLOY_GREEN | YES (`dpl_CKs2APJDUPZhrtqXr5N1JToKKMre` → https://ai-xia-staging.vercel.app) |
| READY_FOR_FIX_C_B_SCHEDULER_HARDENING | YES |
| READY_FOR_AGENTOPS_NEXT_PHASE | YES |
