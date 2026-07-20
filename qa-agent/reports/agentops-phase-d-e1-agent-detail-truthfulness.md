# AgentOps Phase D-E1 — Agent Detail Truthfulness

**Date:** 2026-07-20  
**Branch:** `staging` (`origin/staging`)  
**Commits:** `15b3cc56` Fix AgentOps agent detail truthfulness · `8fe5f6ca` Fix Agent Detail drawer artifact type for staging build  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Preview deploy:** `dpl` → https://ai-9r12gi1eb-piterdrori-gmailcoms-projects.vercel.app (Ready)  
**Source audit:** `qa-agent/reports/agentops-phase-d-e0-agent-detail-audit-browser-qa.md`  
**Registry:** codegraph  

## 1. Summary

D-E1 fixes the first batch of Agent Detail truthfulness issues from D-E0: latest-run source of truth prefers staging-worker runs; oldest queued age uses live queue rows; header/panel metrics are labeled global vs this-agent; schedule/activity copy is reconciled when queued or scheduler-stale; legacy GitHub/daily-agent wording is removed from the normal Agent Detail flow; queued scheduled rows show cancel + waiting reason.

Memory/Hermes redesign was **not** done (D-E2). Only light strip/panel copy safety.

## 2. DE0 issue mapping

| ID | Fix |
|---|---|
| DE0-01 | Latest run drawer prefers active → owner_manual → scheduled → any worker; fleet only as labeled fallback |
| DE0-02 | Live `oldestQueuedAgeMs` from queued rows; ops age diagnostic/fallback only |
| DE0-03 | Header “Global queue…”, panel “This agent queue…” |
| DE0-04 | Header “Latest global completed” vs panel “Latest completed for this agent” |
| DE0-05 / DE0-08 | Schedule status “Queued · waiting…”, activity not Idle when queued; stale tick labeled |
| DE0-09/10/11 | Removed normal-path GitHub Actions / daily-agent / Fleet monitoring wording |
| + | Queued scheduled cancel visible; Memory/Hermes copy safer |

## 3. Latest run source fix

- New helper: `src/lib/agentops/agents/agentDetailLatestRun.ts` (`selectLatestAgentRun`, `drawerFromWorkerRunResult`, `buildFleetFallbackDrawer`, `drawerFieldRows`).
- Agent Detail `openLatestRunDrawer` loads agent-scoped queue, selects worker run, fetches status, opens drawer.
- Fleet fallback banner: *“Fleet daily review fallback — no newer staging-worker run exists for this agent.”*
- Drawer hides empty / “Not recorded” fields via `drawerFieldRows`.
- Live QA (system-agent): drawer showed `scheduled-system-agent-browser_qa-0a651b2f`, trigger `schedule`, work type `browser_qa` — not GitHub/Daily agent review.

## 4. Live queue age fix

- API: `computeLiveOldestQueuedAgeMs` in `manualRunWorkerHealth.ts`.
- Capability + queue handlers prefer live age; `opsOldestQueuedAgeMs` kept as diagnostic with stale flag.
- Live QA: panel showed `This agent oldest queued: 1h (ops diagnostic 48s · stale)` matching ~1h row age (ops 48s no longer primary).

## 5. Global vs agent metric scoping

- Header: Global queue / Global oldest queued / Latest global completed / Active global run.
- Compact queue panel (agentSlug): This agent queue / This agent oldest queued / Latest completed for this agent.
- Queue API: `metricScope: "agent" | "global"`; agent-scoped last completed does not fall back to global ops ids.

## 6. Schedule / activity honesty

- `resolveAgentScheduleRuntimeStatus` adds queued / paused / offline / existing-run statuses.
- When `hasQueuedScheduledRun`: status = `Queued · waiting for staging worker`; next due = `Next due after queued run`; last skipped reason suppressed.
- Activity: `Queued for staging worker` / strip `Preparing` when agent has queued/running worker runs (not Idle).
- Stale scheduler/worker: `Next tick unknown — scheduler offline/stale` (no past tick as upcoming).

## 7. Legacy copy cleanup

- Removed EMPTY_DRAWER defaults: Daily agent review / Fleet monitoring / GitHub Actions.
- B1 helpers rewritten away from GitHub schedule wording.
- Failed runs scope: “Recorded staging-worker / review failures”.
- Schedule editor: no “fleet GHA” pause copy.
- Allowed “No GitHub dependency” / “No GitHub dispatch” as honesty badges (not GHA execution claims).

## 8. Queued scheduled cancel visibility

- Queue panel shows waiting reason (`Worker offline/stale` / `Waiting for staging worker`).
- Cancel on queued/running rows (owner cancel API), including scheduled rows.
- Live QA: system-agent queued scheduled row with Cancel; drawer Cancel run visible.

## 9. Light Memory/Hermes copy safety

- Strip: “N runtime memory records · M enabled” + detail that not all are active/approved.
- Panel label: “Runtime memory records”; Fleet Hermes kept; no “Agent Hermes connected”.
- Full Memory/Hermes cleanup deferred to D-E2.

## 10. Live QA

Target: https://ai-xia-staging.vercel.app (after alias).

| Agent | Checks |
|---|---|
| system-agent | Global vs this-agent labels; live age vs ops diagnostic; schedule Queued; activity Preparing; latest run = scheduled worker; cancel visible; no GitHub Actions |
| logs-agent | Global + this-agent metrics; schedule queued; chat usable; no Daily agent review |
| qa-agent | Global + this-agent metrics; chat usable; no GitHub Actions |
| design-agent | Global + this-agent; stale tick label; chat usable; run buttons disabled while worker stale |

Worker was stale during QA → Run audit / Browser QA correctly disabled.

## 11. Regression checks (light)

- Manual website_audit / browser_qa contracts + prior verify scripts: PASS
- Scheduler + hardening verifies: PASS
- Queue dashboard / cancel UX / artifacts / alerts / retention verifies: PASS
- Function count remains 9/12: PASS
- Local `npm run build` fails on **unrelated untracked WIP** under `src/`; Vercel Preview build for git tree: Ready (green)

## 12. Security checks

- Owner-gated cancel / signed artifacts unchanged
- No service-role exposure to browser
- No auth secrets logged; no storage_state commit
- No automatic promotion / code mutation / PR / production deploy / memory apply

## 13. Safety checks

Ran:

- `npx tsc --noEmit` — D-E1 paths clean (unrelated WIP noise locally)
- `npm run agentops:vercel-function-count-verify` — 9/12 PASS
- `npm run agentops:monitoring-owner-promotion-lock-verify` — PASS
- `npm run agentops:monitoring-daily-12-agents-verify` — PASS
- voice verifies — PASS
- manual-run / scheduler / staging-worker ops|ui|artifacts|alerts|retention — PASS
- `npm run agentops:agent-detail-final-verify` — PASS (new)
- phase-b1 / control-center verifies — PASS

## 14. Known limitations

- Worker was stale during live QA; end-to-end new manual claim/execute not re-proven in this pass (buttons correctly disabled).
- Findings panel “Latest run result” still can show fleet review status while drawer prefers active worker run — intentional split until a follow-up aligns the compact summary with the same selector.
- Full Memory/Hermes presentation cleanup is D-E2.
- Issues / Draft Issue approval workflow not started.

## 15. Next recommended phase

**D-E2 — Memory/Hermes presentation cleanup** on Agent Detail (connection model, counts, drafts vs runtime), still staging-only.  
**Not ready** for existing Issues review workflow.

---

## FINAL VERDICT

```
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
NO_GITHUB_DISPATCH: YES
NO_VERCEL_CRON: YES
NO_PLAYWRIGHT_ON_VERCEL: YES
DE0_01_LATEST_RUN_SOURCE_FIXED: YES
DE0_02_LIVE_QUEUE_AGE_FIXED: YES
DE0_03_QUEUE_SCOPE_LABELS_FIXED: YES
DE0_04_LAST_COMPLETED_SCOPE_FIXED: YES
DE0_05_SCHEDULE_ACTIVITY_HONESTY_FIXED: YES
DE0_08_STALE_TICK_HIDDEN_OR_LABELED: YES
LEGACY_GITHUB_COPY_REMOVED_FROM_NORMAL_FLOW: YES
QUEUED_SCHEDULED_RUN_VISIBLE: YES
QUEUED_SCHEDULED_CANCEL_VISIBLE: YES
LATEST_RUN_DRAWER_TRUTHFUL: YES
NO_EXCESS_NOT_RECORDED_FIELDS: YES
MEMORY_HERMES_COPY_SAFER: YES
CHAT_USABLE: YES
MANUAL_WEBSITE_AUDIT_REGRESSION_PASS: YES
MANUAL_BROWSER_QA_REGRESSION_PASS: YES
SCHEDULED_EXECUTION_REGRESSION_PASS: YES
QUEUE_DASHBOARD_REGRESSION_PASS: YES
CANCEL_UX_REGRESSION_PASS: YES
OWNER_GATE_ENFORCED: YES
SERVICE_ROLE_NOT_EXPOSED: YES
NO_AUTOMATIC_PROMOTION: YES
NO_CODE_CHANGE_BY_WORKER: YES
NO_PR_CREATION: YES
NO_PRODUCTION_DEPLOY: YES
NO_MEMORY_APPLICATION: YES
FUNCTION_COUNT_WITHIN_BUDGET: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
READY_FOR_D_E2_MEMORY_HERMES_CLEANUP: YES
READY_FOR_EXISTING_ISSUES_REVIEW_WORKFLOW: NO
```
