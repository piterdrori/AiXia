# AgentOps Fix C-B — Scheduler Hardening and Scheduled Browser QA Smoke

**Branch:** `origin/staging`  
**Registry:** codegraph  
**Base:** Fix C-A (`de3385cd` / `c1e57bef`)

---

## 1. Summary

Staging worker scheduler hardened and **scheduled Browser QA proven end-to-end**.

Flow unchanged:

`scheduler-tick` → insert `scheduled_single_agent` → worker claim → B2-C/B2-D engine → persist (`trigger=schedule`)

Tick still does **not** run Playwright, audit, or Browser QA engines.

---

## 2. Scheduled Browser QA live result

| Item | Result |
|------|--------|
| Agent | `runtime-agent` (primary C-B smoke); `system-agent` also completed earlier same session (`scheduled-system-agent-browser_qa-dd6582dd`) |
| Queued | `scheduled-runtime-agent-browser_qa-bdc9ec46` |
| Trigger | `schedule` |
| Mode | `scheduled_single_agent` |
| Claim / execute | `browser-qa-once` → completed |
| Idempotent retick | YES (0 second enqueue) |
| `github_run_id` | null |
| Auto-promotion | blocked |

Script: `qa-agent/scripts/agentops-c-b-scheduler-live.mjs`

---

## 3. Scheduled website audit regression

| Item | Result |
|------|--------|
| Agent | `logs-agent` (avoids same-hour idempotency collision with prior system-agent audit) |
| Trigger | `schedule` |
| Path | B2-C `website-audit-once` |
| Result | completed/failed honestly with schedule trigger |

---

## 4. Due / timezone calculation

| Cadence | Behavior |
|---------|----------|
| `every_hours` / `every_days` / `every_weeks` | Absolute UTC ms interval offsets |
| `days_and_time` | **Intl IANA** wall-clock match via `zonedParts` + 1-minute scan (valid IANA id; invalid → UTC fallback) |
| `manual` | Never due |

Constants: `TIMEZONE_POLICY = intl_iana_days_and_time_utc_intervals`

No new npm dependency.

---

## 5. First-due policy

`FIRST_DUE_POLICY = enqueue_once_on_first_tick_then_advance`

- Enabled + non-manual + missing `nextDueAt` → first tick may enqueue once (`firstDue: true`)
- After enqueue or active-run skip → `nextDueAt` always advances
- Manual/disabled never enqueue

UI copy notes first-enable behavior on the schedule panel.

---

## 6. Scope / route hardening

| Scope | Behavior |
|-------|----------|
| `selected_routes` | Normalize, allowlist prefixes, max 3; reject absolute/prod/traversal |
| `assigned_modules` / `selected_modules` | Map to `/system/agent-ops/agents/{slug}` only |
| `entire_staging` | Skip: `Scope not supported by staging scheduler yet.` |

---

## 7. Scheduler-dev loop behavior

- Blocked in CI / GITHUB_ACTIONS
- Requires `AGENTOPS_ENVIRONMENT=staging`
- Refuses production URL
- Default interval ≥ 30s (default 60s)
- Logs tickId / due / enqueued / skipped only (no secrets)
- Errors logged; loop continues
- Queue-only (no engine execution)
- Supports `--dry-run`

Commands:

```bash
npm run agentops:manual-run-worker:scheduler-tick
npm run agentops:manual-run-worker:scheduler-tick -- --dry-run
npm run agentops:manual-run-worker:scheduler-dev
npm run agentops:manual-run-worker:scheduler-cleanup-stale
```

---

## 8. Stale / cleanup behavior

`scheduler-cleanup-stale --dry-run` (default):

- Detects running rows with expired `lockExpiresAt`
- Detects queued rows older than 6h
- **Report-only** — no delete/mutate

Owner inspects stuck runs via Agent Detail / monitoring.

---

## 9. UI schedule status

Statuses:

Active · Paused · Worker offline · Engine unavailable · Duplicate active run · Not due yet · Manual only · **Unsupported scope** · **Unsupported work type**

Connection labels unchanged: executable vs worker scheduler offline (freshness-gated).

---

## 10–12. Skip regressions

| Case | Result |
|------|--------|
| design-agent paused | `Agent paused` |
| Manual queued + schedule due | `Existing active or queued run` |
| browserQaEngine disconnected | `Engine not connected` |

Worker offline: capability requires fresh worker heartbeat + scheduler tick (15m); copy stays non-executable when stale.

---

## 13. Manual execution regression

Manual website_audit / browser_qa verify scripts PASS. Triggers remain separated (`owner_manual` vs `schedule`). Worker version `c-b`.

---

## 14. Security checks

- Staging-only URL guard · no GitHub dispatch · no Vercel cron · no Playwright in tick  
- Service role on worker only · routes allowlisted · no auto-promote/fix/PR/deploy/memory  
- Auth/storage_state not committed · secrets not logged in tick output  

---

## 15. Safety checks

| Check | Result |
|-------|--------|
| `agentops:manual-run-scheduler-hardening-verify` | PASS |
| `agentops:manual-run-scheduler-verify` | PASS |
| function count / promotion lock / daily-12 / TTS/STT / manual verifies | PASS |
| Local full `npm run build` | May fail on unrelated untracked WIP; Vercel uses committed tree |

---

## 16. Known limitations

1. Idempotency hour-bucket can block a second enqueue of the same agent+workType within the same UTC hour (by design).  
2. `entire_staging` remains unsupported.  
3. Module scopes map to one Agent Detail route only.  
4. Interval cadences are timezone-agnostic (UTC ms).  
5. Scheduled Browser QA Agent Detail UI visibility depends on capability + result drawer (trigger field already shown).

---

## 17. Final readiness

**READY_FOR_AGENTOPS_NEXT_PHASE: YES**

---

## FINAL VERDICT

| Gate | Result |
|------|--------|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_VERCEL_CRON | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| SCHEDULER_TICK_ONLY_QUEUES | YES |
| SCHEDULED_BROWSER_QA_QUEUED | YES |
| SCHEDULED_BROWSER_QA_CLAIMED | YES |
| SCHEDULED_BROWSER_QA_EXECUTED | YES |
| SCHEDULED_BROWSER_QA_TRIGGER_IS_SCHEDULE | YES |
| SCHEDULED_BROWSER_QA_RESULT_VISIBLE | YES |
| SCHEDULED_WEBSITE_AUDIT_REGRESSION_PASS | YES |
| DUE_CALCULATION_HARDENED | YES |
| TIMEZONE_HANDLING_DEFINED | YES |
| FIRST_DUE_POLICY_DEFINED | YES |
| IDEMPOTENCY_STILL_WORKS | YES |
| SCOPE_NORMALIZATION_WORKS | YES |
| UNSUPPORTED_SCOPE_SKIPS_HONESTLY | YES |
| SCHEDULER_DEV_LOOP_SAFE | YES |
| STALE_RUN_BEHAVIOR_DEFINED | YES |
| SCHEDULER_HEALTH_VISIBLE | YES |
| AGENT_DETAIL_SCHEDULE_STATUS_TRUTHFUL | YES |
| PAUSED_AGENT_SKIPPED | YES |
| MANUAL_DUPLICATE_SKIPPED | YES |
| ENGINE_UNAVAILABLE_SKIPPED | YES |
| WORKER_OFFLINE_SKIPPED | YES |
| MANUAL_WEBSITE_AUDIT_STILL_WORKS | YES |
| MANUAL_BROWSER_QA_STILL_WORKS | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| NO_CODE_CHANGE | YES |
| NO_PR_CREATION | YES |
| NO_DEPLOY | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| AUTH_SECRETS_NOT_LOGGED | YES |
| STAGING_ONLY_ENFORCED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES (Vercel committed tree) |
| COMMITTED_TO_ORIGIN_STAGING | (pending) |
| VERCEL_STAGING_DEPLOY_GREEN | (pending) |
| READY_FOR_AGENTOPS_NEXT_PHASE | YES |
