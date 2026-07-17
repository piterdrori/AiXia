# AgentOps Agent Detail — Fix B Manual Execution

**Date:** 2026-07-15 (implementation) · **Live dispatch re-check:** 2026-07-17  
**Branch:** `staging`  
**Target:** `/system/agent-ops/agents/:agentId`  
**Registry:** codegraph  
**Staging URL:** https://ai-xia-staging.vercel.app  

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

Requires staging secret: `AGENTOPS_GITHUB_DISPATCH_TOKEN` (workflow_dispatch permission). **Do not put the token value in this report.**

## UI

- Owner confirmation modal (scope, duration, side-effects statement; paused **Run once** / **Activate and run** / Cancel).
- CTAs enable only when capability reports dispatch configured.
- Poll status only while active (~12s); no remount; chat unaffected.
- Result banner uses: “No qualifying findings were produced by this run.” (never “Website clean”).

## Commits

1. `Add AgentOps per-agent manual run contract`
2. `Connect per-agent AgentOps website audit`
3. `Connect per-agent AgentOps Browser QA`
4. `Complete AgentOps manual run UX and verification`
5. Report updates for capability / deploy / live dispatch verification

## Verify (local) — 2026-07-17

- `npm run agentops:vercel-function-count-verify` — **9/12 PASS**
- `npm run agentops:monitoring-owner-promotion-lock-verify` — PASS
- `npm run agentops:agent-detail-manual-run-verify` — PASS
- `npm run agentops:tts-preference-verify` / doubao TTS/STT — PASS
- Scheduler / cron / memory systems — unchanged (not modified in this verification)

## Live dispatch verification (2026-07-17)

### Task 1 — Capability + env + alias

| Check | Result |
|-------|--------|
| `GET https://ai-xia-staging.vercel.app/api/agentops/monitoring/manual-run/capability` | `ok: true` but **both** `websiteAudit.available` and `browserQa.available` = **false** |
| Reason returned | `Missing AGENTOPS_GITHUB_DISPATCH_TOKEN — …` |
| `vercel env ls` on project `ai-xia` (Preview/staging) | **`AGENTOPS_GITHUB_DISPATCH_TOKEN` is not listed** (also no `GITHUB_TOKEN` / `GH_TOKEN` fallback) |
| Staging alias target | `ai-xia-staging.vercel.app` → `dpl_EuEmPLR8KJVfhv6hDmse1QmFauBm` (`ai-o31ke2hev-…`, Fix B Preview from 2026-07-15) |
| Latest Preview probe | `dpl_M88r22XN7pGrPxSToYqWL8SWWgAf` (`ai-mqdxhxwvh-…`) — **same missing-token capability** |
| Post-token redeploy visible in Vercel deployment list | **NO** — newest staging deploy is still the 2026-07-15 report update commit |

**Stop condition hit:** Task 1 requires capability unlocked before Tasks 2–10 live runs. Live website audit / Browser QA / duplicate lock / paused flow / multi-agent / tab-switch were **not executed**.

### Owner unblock (exact)

1. In Vercel project **`ai-xia`** → Settings → Environment Variables  
2. Add **`AGENTOPS_GITHUB_DISPATCH_TOKEN`** (GitHub PAT with `actions:write` / workflow_dispatch on `piterdrori/AiXia`)  
3. Scope: **Preview**, optionally limited to git branch **`staging`** (match other AgentOps Preview vars)  
4. **Redeploy** a staging Preview (push or Redeploy) so serverless functions pick up the env  
5. Point alias:  
   `npx vercel alias set <new-preview-host> ai-xia-staging.vercel.app --scope piterdrori-gmailcoms-projects`  
6. Re-check capability until both engines report `available: true`  
7. Re-run this live verification checklist

### Live QA checklist (blocked)

| Check | Result |
|-------|--------|
| A. Website audit | **BLOCKED** — token not on Vercel project |
| B. Browser QA | **BLOCKED** — same |
| C. Duplicate run | **BLOCKED** — needs accept path |
| D. Paused Run once | **BLOCKED** — needs accept path |
| E. Multi-agent attribution | **BLOCKED** — needs accept path |
| F. Tab switch | **NOT RUN** |
| GHA workflow_dispatch confirmation | **NOT RUN** |
| DB run persistence / evidence | **NOT RUN** |

### Safety (no secret exposure)

- Capability response never returns the token value — only presence via `available` / reason string.
- No token/secret values recorded in this report.
- No `--prod`, no main, no production URL runs.

### Known limitations

- Manual path cannot dispatch until Preview env var exists **and** a new Preview is deployed **and** staging alias points at that Preview.
- Alias can lag the latest Preview; after redeploy, re-alias explicitly.

## FINAL VERDICT — Live dispatch re-check 2026-07-17

```
AGENTOPS_GITHUB_DISPATCH_TOKEN_PRESENT: NO
CAPABILITY_UNLOCKED: NO
RUN_AUDIT_NOW_ENABLED: NO
RUN_BROWSER_QA_NOW_ENABLED: NO
OWNER_CONFIRMATION_MODAL_WORKS: NOT_TESTED
PAUSED_RUN_ONCE_FLOW_WORKS: NOT_TESTED
ACTIVATE_AND_RUN_FLOW_WORKS: NOT_TESTED
WEBSITE_AUDIT_DISPATCHED_TO_GHA: NO
WEBSITE_AUDIT_LIVE_PASS: NO
BROWSER_QA_DISPATCHED_TO_GHA: NO
BROWSER_QA_LIVE_PASS: NO
DUPLICATE_RUN_BLOCKED: NOT_TESTED
ACTIVE_RUN_STATUS_VISIBLE: NOT_TESTED
RUN_PERSISTED: NOT_TESTED
DURATION_REAL: NOT_TESTED
SCOPE_REAL: NOT_TESTED
EVIDENCE_LINKED: NOT_TESTED
RAW_OBSERVATIONS_VISIBLE: NOT_TESTED
QUEUED_FINDINGS_VISIBLE: NOT_TESTED
MULTI_AGENT_ATTRIBUTION_PASS: NOT_TESTED
TAB_SWITCH_STATE_PRESERVED: NOT_TESTED
OWNER_GATE_ENFORCED: YES (code path; live CTA unlock blocked)
STAGING_ONLY_ENFORCED: YES
TOKEN_NOT_EXPOSED_TO_CLIENT: YES
NO_AUTOMATIC_PROMOTION: YES
NO_CODE_CHANGE: YES
NO_PR_CREATION: YES
NO_DEPLOY: YES
FUNCTION_COUNT_WITHIN_BUDGET: YES
BUILD_GREEN: YES (Preview Ready; local WIP may still fail npm run build)
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES (existing Preview Ready; not a post-token redeploy)
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_FIX_C_SCHEDULER: NO
```
