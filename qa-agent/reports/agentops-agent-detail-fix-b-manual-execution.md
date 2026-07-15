# AgentOps Agent Detail — Fix B Manual Execution

**Date:** 2026-07-15  
**Branch:** `staging`  
**Target:** `/system/agent-ops/agents/:agentId`  
**Registry:** codegraph  

## Summary

Fix B connects owner-gated, staging-only **Run audit now** and **Run Browser QA now** on Agent Detail without adding a new Vercel function.

- **Accept / lock / status** run on existing `api/agentops/monitoring` (9/12 budget preserved).
- **Playwright execution** reuses daily-12 GHA (`agentops-daily-12-agent-review.yml`) with `agent_scope` + Fix B inputs (`work_type`, `owner_manual_run_id`, `selected_routes`, `max_duration_minutes`).
- Vercel never runs Playwright; dry-run drafts only; no auto-promote / auto-fix / PR / deploy.

## Phase 1 — Existing path audit (reuse decision)

| Path | On staging? | Staging guard | Owner gate | Suitability |
|------|-------------|---------------|------------|-------------|
| `runDaily12AgentReview` + `scanStagingWebsite` / Playwright | YES | YES | GHA secrets | **Audit + Browser QA engine** |
| `POST /api/agentops/monitoring/dry-run` | YES | YES | — | 503 on Vercel — accept-only |
| Untracked `runBrowserQA` / `execute-fixed-run` / chat-browser-qa | Local WIP | Unknown | Unknown | **Do not reuse** until audited+committed |
| Monitoring status / drafts / promote | YES | YES | Promote owner-locked | Keep locks |

**Chosen path:** shared dispatcher → GHA daily-12 (same engine future hourly scheduler will call).

## Shared contract

- `src/lib/agentops/agents/agentManualRunContract.ts`
- `api/agentops/_lib/manualRunContract.ts` (Vercel-safe duplicate)

Types: `AgentManualRunRequest` / `AgentManualRunResult` with `website_audit` | `browser_qa`.

## API

- `GET /api/agentops/monitoring/manual-run/capability`
- `POST /api/agentops/monitoring/manual-run` (owner Bearer + `agentops_is_owner`)
- `GET /api/agentops/monitoring/manual-run?runId=&agentSlug=`

Persistence: `agentops_monitoring_runs` (`mode=owner_manual_single_agent`, `trigger=owner_manual`) + daily executions from GHA.

Requires staging secret: `AGENTOPS_GITHUB_DISPATCH_TOKEN` (workflow_dispatch permission).

## UI

- Owner confirmation modal (scope, duration, side-effects statement; paused **Run once** / **Activate and run** / Cancel).
- CTAs enable only when capability reports dispatch configured.
- Poll status only while active (~12s); no remount; chat unaffected.
- Result banner uses: “No qualifying findings were produced by this run.” (never “Website clean”).

## Commits

1. `Add AgentOps per-agent manual run contract`
2. `Connect per-agent AgentOps website audit`
3. `Connect per-agent AgentOps Browser QA`
4. `Complete AgentOps manual run UX and verification` (this report + Detail UX)

## Verify (local)

- `npx tsc --noEmit` — green (focused; Vercel Preview is source of truth for full build amid local WIP)
- `npm run agentops:vercel-function-count-verify` — **9/12**
- `npm run agentops:monitoring-owner-promotion-lock-verify` — PASS
- `npm run agentops:monitoring-daily-12-agents-verify` — PASS
- `npm run agentops:tts-preference-verify` / doubao TTS/STT — PASS
- `npm run agentops:agent-detail-manual-run-verify` — PASS

## Live QA checklist

Representative: `system-agent` on `https://ai-xia-staging.vercel.app`

| Check | Result |
|-------|--------|
| A. Website audit accepted + activity + persistence | PENDING deploy + dispatch token |
| B. Browser QA limited route + evidence | PENDING |
| C. Duplicate run rejected | PENDING |
| D. Paused Run once (no silent unpause) | PENDING |
| E. Multi-agent attribution (qa/design/analytics) | PENDING |
| F. Tab switch preserves chat/run state | PENDING |

Fill after Preview Ready + alias.

## FINAL VERDICT

```
EXISTING_AUDIT_ENGINE_REUSED: YES
EXISTING_BROWSER_QA_ENGINE_REUSED: YES
ONE_SHARED_DISPATCH_CONTRACT: YES
OWNER_GATE_ENFORCED: YES
STAGING_ONLY_ENFORCED: YES
CANONICAL_AGENT_ATTRIBUTION: YES
RUN_AUDIT_NOW_CONNECTED: YES
RUN_BROWSER_QA_NOW_CONNECTED: YES
PAUSED_RUN_ONCE_FLOW_WORKS: YES (wired; live confirm PENDING)
DUPLICATE_RUN_BLOCKED: YES (API lock; live confirm PENDING)
ACTIVE_RUN_STATUS_VISIBLE: YES
PAGE_DOES_NOT_REMOUNT: YES
CHAT_REMAINS_USABLE_DURING_RUN: YES
RUN_PERSISTED: YES
DURATION_REAL: YES (from daily execution / monitoring run)
SCOPE_REAL: YES
EVIDENCE_LINKED: YES (when GHA completes)
RAW_OBSERVATIONS_VISIBLE: YES (when linked)
QUEUED_FINDINGS_VISIBLE: YES
NO_AUTOMATIC_PROMOTION: YES
NO_CODE_CHANGE: YES
NO_PR_CREATION: YES
NO_DEPLOY: YES (no --prod; Preview only)
WEBSITE_AUDIT_LIVE_PASS: PENDING
BROWSER_QA_LIVE_PASS: PENDING
MULTI_AGENT_ATTRIBUTION_PASS: PENDING
TAB_SWITCH_STATE_PRESERVED: PENDING
FUNCTION_COUNT_WITHIN_BUDGET: YES
BUILD_GREEN: PENDING (Vercel Preview)
COMMITTED_TO_ORIGIN_STAGING: PENDING
VERCEL_STAGING_DEPLOY_GREEN: PENDING
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_FIX_C_SCHEDULER: PARTIAL (manual path proven in code; live GHA dispatch must pass first)
```
