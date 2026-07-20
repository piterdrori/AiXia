# AgentOps Agent Detail Fix B2-D — Browser QA on Staging Worker

**Date:** 2026-07-20  
**Branch:** `origin/staging`  
**Implementation commit:** `e4909fcb` — Connect AgentOps Browser QA to staging worker  
**Registry:** codegraph  
**Mode:** Staging-only (NO scheduler, NO main, NO production, NO `--prod`)  
**Deploy:** `dpl_H2wW8W6PDUiaszZ9X14YBNJ8XaNV`  
**Preview:** `ai-llci5tps6-piterdrori-gmailcoms-projects.vercel.app`  
**Alias:** https://ai-xia-staging.vercel.app  

---

## 1. Summary

Fix B2-D connects AgentOps Browser QA execution to the external staging worker.

Proven on staging:

- Capability shows `websiteAudit.available: true` and `browserQa.available: true`
- Agent Detail enables **Run audit now** and **Run Browser QA now**
- Owner-gated Browser QA queues into `agentops_monitoring_runs`
- Staging worker claims and runs Browser QA off Vercel
- Evidence/screenshots/draft findings persist
- Website audit (B2-C) remains available
- No GitHub dispatch, no Playwright on Vercel, no scheduler, no main/production

---

## 2. Browser QA engine entrypoint

**Selected (no fork):**

- `runPlaywrightBrowserQA` in `src/lib/agentops/browserQa/playwrightBrowserQaRunner.ts`
- Worker wrapper: `scripts/agentops-manual-run-browser-qa-engine.ts`
- Claim/execute: `scripts/agentops-staging-manual-run-worker.mjs` (`browser-qa-once`)

Safe default route: `/system/agent-ops/agents/{slug}` (one route; not full-site).

---

## 3. Worker commands

```bash
npm run agentops:manual-run-worker:heartbeat
npm run agentops:manual-run-worker:browser-qa-once
npm run agentops:manual-run-browser-qa-verify
```

Also retained:

```bash
npm run agentops:manual-run-worker:website-audit-once
```

`browser-qa-dev` exists as a local loop and is blocked in CI.

---

## 4. Capability result

With a fresh worker heartbeat:

| Field | Value |
|---|---|
| `queueAvailable` | `true` |
| `workerConnected` | `true` |
| `websiteAudit.available` | `true` |
| `websiteAudit.reason` | `null` |
| `browserQa.available` | `true` |
| `browserQa.reason` | `null` |
| `browserQa.engine` | `staging_worker + browser_qa (runPlaywrightBrowserQA)` |

Notes include: Staging worker connected; Website audit and Browser QA engines ready; No GitHub dispatch; No Playwright on Vercel.

---

## 5. UI result

Agent Detail (after heartbeat):

- Execution worker: **Connected**
- **Run audit now:** enabled
- **Run Browser QA now:** enabled
- Badges: Staging worker · Website audit ready · Browser QA ready · No GitHub dependency
- No GHA / workflow_dispatch / GitHub token / Missing token copy

---

## 6. Live Browser QA result

| Field | Value |
|---|---|
| Agent | `system-agent` |
| Run id | `owner-manual-system-agent-09f8ad2a-1a7d-4348-b4ed-059872703102` |
| Status | `completed` |
| Duration | ~9s (`duration_ms=8948`) |
| Route | `/system/agent-ops/agents/system-agent` |
| `workerPhase` | `b2-d` |
| `executionEngine` | `browser_qa` |
| Authenticated | `true` |
| Real browser | `true` |
| Screenshot / evidence | produced (`screenshotRefs` / `artifactRefs`) |
| Draft findings | 1 — `missing_h1` (draft only) |
| `github_run_id` | `null` |
| Auto-promotion | blocked |

Earlier honest failures (Playwright browser missing; stale auth → login redirect) also persisted as `failed` with real reasons — no fake pass.

---

## 7. Duplicate lock

While Browser QA was queued/running for the same agent, a second start returned **409** with:

> This agent already has an active or queued run.

Existing run id returned; View current run path remains valid.

---

## 8. Paused Run once

| Field | Value |
|---|---|
| Agent | `design-agent` |
| Without `runOnceWhilePaused` | 409 — paused confirm required |
| With `runOnceWhilePaused=true` | queued → claimed → **completed** |
| Owner status after run | remained **paused** |
| Silent unpause | **NO** |
| After test | restored to original active |

`Activate and run`: NOT_TESTED (safe skip; Run once fully proven).

---

## 9. Multi-agent attribution

- `analytics-agent` limited Browser QA completed
- `agentSlug=analytics-agent`
- Route: `/system/agent-ops/agents/analytics-agent`
- No cross-agent contamination observed
- Design-agent paused once also attributed correctly

---

## 10. Website audit regression

B2-C path still works after B2-D:

- `websiteAudit.available: true`
- system-agent website_audit queued → `website-audit-once`
- `workerPhase=b2-c`, `executionEngine=website_audit`
- `completed` (~38s)

---

## 11. Security

| Control | Result |
|---|---|
| No GitHub `workflow_dispatch` | YES |
| No Playwright on Vercel | YES |
| Service role server-side only | YES |
| Owner gate required to queue | YES |
| Staging-only URL / env guards | YES |
| Auth secrets not logged | YES |
| `storage_state` not committed | YES |
| No auto code change / PR / prod deploy | YES |
| Draft findings only; no auto-promotion | YES |

---

## 12. Known limitations

- External staging worker must keep heartbeating for engines to stay available
- Worker host needs Playwright browsers + fresh `storage-state` for authenticated routes
- Browser QA is limited-route (not full-site)
- Screenshots are local worker paths (not CDN-uploaded)
- Scheduler / hourly tick is **not** built yet (Fix C)

---

## 13. Next step

**Fix C — scheduler**, only after this report is committed and manual execution gates remain green.

Manual gates for website audit + Browser QA on the staging worker are proven.

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| BROWSER_QA_ENGINE_CONNECTED | YES |
| WORKER_HEARTBEAT_WORKS | YES |
| WEBSITE_AUDIT_REMAINS_AVAILABLE | YES |
| BROWSER_QA_AVAILABLE_IN_CAPABILITY | YES |
| RUN_AUDIT_NOW_ENABLED | YES |
| RUN_BROWSER_QA_ENABLED | YES |
| BROWSER_QA_QUEUED_FROM_UI | YES |
| BROWSER_QA_CLAIMED_BY_WORKER | YES |
| BROWSER_QA_RAN_OFF_VERCEL | YES |
| BROWSER_QA_COMPLETED_OR_FAILED_HONESTLY | YES |
| RUN_PERSISTED | YES |
| DURATION_REAL | YES |
| ROUTE_SCOPE_REAL | YES |
| EVIDENCE_LINKED | YES |
| SCREENSHOTS_LINKED | YES |
| RAW_OBSERVATIONS_VISIBLE | YES |
| DRAFT_FINDINGS_ONLY | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| DUPLICATE_RUN_BLOCKED_DURING_BROWSER_QA | YES |
| PAUSED_RUN_ONCE_WORKS | YES |
| NO_SILENT_UNPAUSE | YES |
| MULTI_AGENT_ATTRIBUTION_PASS | YES |
| WEBSITE_AUDIT_REGRESSION_PASS | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| NO_CODE_CHANGE | YES |
| NO_PR_CREATION | YES |
| NO_DEPLOY | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| OWNER_GATE_ENFORCED | YES |
| STAGING_ONLY_ENFORCED | YES |
| AUTH_SECRETS_NOT_LOGGED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_FIX_C_SCHEDULER | YES |
