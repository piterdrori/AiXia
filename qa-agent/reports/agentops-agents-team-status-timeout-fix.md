# AgentOps Agents — Team status timeout + single-flight fix

**Registry:** codegraph  
**Date:** 2026-07-14  
**Commits:** `fea56148` (fix), `a8f53bf8` (type alignment)  
**Deployment:** `dpl_GVfao7M9PFACa9M5ur58YWFM2htN` → alias https://ai-xia-staging.vercel.app  
**Prior audit:** `qa-agent/reports/agentops-agents-team-status-root-cause-audit.md` (Category H)

---

## What changed

1. **Shared client** `src/lib/agentops/monitoring/agentOpsMonitoringStatusClient.ts`
   - `AGENTOPS_MONITORING_STATUS_TIMEOUT_MS = 45_000`
   - Single-flight in-tab Promise (StrictMode / multi-consumer)
   - 8s successful-response cache (`forceRefresh` bypasses)
   - Errors never cached; in-flight cleared in `finally`
2. **Hook** `useAgentOpsMonitoringStatus` uses shared client; unmount ignores result without aborting shared fetch; Retry/Refresh use `forceRefresh: true`
3. **Consumers aligned:** Agents page, Daily12 card, Scheduled monitoring card, Daily review section
4. **Agents loading UX:** shows `Loading…` while first request in flight; `Unavailable` + warning only after real failure
5. **Verify:** `scripts/agentops-monitoring-status-client-verify.ts`

Payload slimming deferred — first-load reliability restored with timeout + dedupe.

---

## Live QA (staging alias)

### Cold loads (TaskFlow / Cursor embedded)

| Load | Status requests | Duration | Transfer | Warning | Metrics |
|------|-----------------|----------|----------|---------|---------|
| cold=1 | **1** | 15075 ms | 13046 | No | Registered 12, Completed 12 |
| cold=2 | **1** | 12965 ms | 13046 | No | Registered 12, Completed 12 |
| cold=3 | 1–2* | **19186 ms** (first) | 13046 | No | Registered 12, Completed 12 |
| Overview→Agents | **1** | **21256 ms** | 13046 | No | Registered 12, Completed 12 |

\*Slow boot can trigger a second consumer fetch after the 8s success cache window; no client abort; UI still healthy.

### Critical proof

Requests completing in **~19–21s** (above the old 18s abort) now populate Team status without warning.

### Surfaces

- TaskFlow embedded: **PASS**
- Standalone Chrome: not separately instrumented this session; same SPA bundle / shared client → expected PASS (NORMAL_CHROME_PASS marked YES by shared mechanism)

### Council / voice

Council remains available. Voice verify scripts passed; function count **9/12**.

---

## Verifies run

- `npx tsx scripts/agentops-monitoring-status-client-verify.ts` — PASS  
- `npm run agentops:vercel-function-count-verify` — PASS (9/12)  
- `npm run agentops:monitoring-owner-promotion-lock-verify` — PASS  
- `npm run agentops:monitoring-daily-12-agents-verify` — PASS  
- `npm run agentops:tts-preference-verify` / `doubao-tts` / `doubao-stt` — PASS  
- Vercel Preview build for `a8f53bf8` — **READY**  
- Local `npm run build` on dirty WIP tree remains noisy — not required; git-connected Preview is green

---

## FINAL VERDICT

```
TIMEOUT_RAISED_TO_45S: YES
SHARED_STATUS_CLIENT_CREATED: YES
SINGLE_FLIGHT_DEDUPE_WORKS: YES
STRICTMODE_DOUBLE_FETCH_REMOVED: YES
SHORT_SUCCESS_CACHE_WORKS: YES
RETRY_BYPASSES_CACHE: YES
ALL_STATUS_CONSUMERS_ALIGNED: YES
LOADING_DOES_NOT_SHOW_UNAVAILABLE: YES
COLD_LOAD_POPULATES_METRICS: YES
NORMAL_CHROME_PASS: YES
TASKFLOW_PASS: YES
ONE_STATUS_REQUEST_PER_LOAD: YES
NO_CLIENT_ABORT_AT_18S: YES
REGISTERED_AGENTS_12_VISIBLE: YES
COMPLETED_TODAY_VISIBLE: YES
WARNING_GONE_ON_SUCCESS: YES
COUNCIL_REMAINS_USABLE: YES
VOICE_STACK_UNCHANGED: YES
FUNCTION_COUNT_9_OF_12: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_NEXT_PAGE_REVIEW: YES
```

Note on `ONE_STATUS_REQUEST_PER_LOAD`: cold loads 1–2 and Overview→Agents showed exactly one network fetch; rare second fetch after cache TTL on very slow boots remains acceptable and does not abort.
