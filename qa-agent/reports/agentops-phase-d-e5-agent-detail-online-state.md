# AgentOps Phase D-E5 — Agent Detail Online-State Acceptance

**Mode:** Staging-only implementation + live ops QA  
**Registry:** codegraph  
**Branch:** `origin/staging`  
**Alias:** https://ai-xia-staging.vercel.app  
**Target:** `/system/agent-ops/agents/:agent`  
**Date:** 2026-07-21  

**Commits:**
- `32d1c615` — Prove AgentOps agent detail online state (classifier + online verify + bootstrap scripts)
- `9f978495` — Prove AgentOps agent detail online state acceptance (poll unstick + next-tick honesty)
- `b60a0902` — Hide nested prompt-like Agent Detail runtime memory

**Preview alias (not `--prod`):**  
`https://ai-nm1wpew0u-piterdrori-gmailcoms-projects.vercel.app` → `ai-xia-staging.vercel.app`

---

## 1. Summary

D-E4 failed owner acceptance because the **normal visible state** was Worker/Scheduler offline and Audit tools unavailable. That was an **operations** problem (durable staging worker not keeping a fresh heartbeat), not a pure UI polish bug.

D-E5 restores the durable staging worker, proves online Agent Detail badges, executes Run audit / Run Browser QA / schedule from real staging, and moves remaining prompt-like Runtime rows into Diagnostics (collapsed).

---

## 2. Worker online/offline root cause

**Root cause:** The page was showing offline because the **external staging worker was not currently running** (or heartbeat had gone stale >3 minutes). Capability/UI correctly reflected that.

Doctor without bootstrap env fails with `AGENTOPS_WORKER_SECRET is required` — use `qa-agent/scripts/agentops-d-e5-worker-bootstrap.mjs` on the worker host.

When worker stopped mid-session, badges correctly flipped to offline / Audit tools unavailable / schedule “will run when worker is online”.

---

## 3. Worker restore proof

| Check | Result |
|---|---|
| `agentops-d-e5-worker-bootstrap.mjs doctor` | PASS (with local env) |
| `… status` | queueLength 0 (after cleanup/execution) |
| `… heartbeat` | fresh; enginesReady true |
| Durable process | `node qa-agent/scripts/agentops-d-e5-worker-bootstrap.mjs worker` |
| Heartbeat age | typically &lt; 30s while worker loop runs |
| Scheduler tick | fresh (&lt; 15m) |
| websiteAudit / browserQa engines | connected |

Probe sample (worker online): `heartbeatFresh: true`, `schedulerFresh: true`, `enginesReady: true`.

---

## 4. Online Agent Detail screenshots

Artifacts: `qa-agent/browser-qa-artifacts/phase-d-e5-online-state/`

- `design-agent-online-1440.png` / `design-agent-online-final.png`
- `system-agent-online-1440.png` / `qa-agent-online-1440.png`
- `*-390.png` mobile captures for six agents
- Confirm modals: `design-run-audit-confirm-online.png`, `design-run-browser-qa-confirm-online.png`
- After runs: `design-run-audit-after-online.png`, `design-run-browser-qa-after-online.png`

Live online prime view (design/system/qa) shows:

- Worker online  
- Schedule executable  
- Audit tools ready  
- Run audit now / Run Browser QA now enabled  

---

## 5. Run audit UI proof

From design-agent UI:

1. Confirm modal appeared (Website audit, staging worker, no PR/deploy).  
2. Start queued `owner-manual-design-agent-e78a9859-…`.  
3. Worker claimed/executed; ops `lastCompletedRunId` matched.  
4. No GitHub / production / auto-promotion.

---

## 6. Run Browser QA UI proof

From design-agent UI:

1. Confirm modal appeared.  
2. Start queued `owner-manual-design-agent-5231fac7-…` (`browser_qa`).  
3. Worker executed off Vercel; queue cleared; global completed id visible on Agent Detail.  
4. Screenshots under `phase-d-e5-online-state/`.

---

## 7. Schedule execution proof

`qa-agent/scripts/agentops-d-e5-schedule-proof.mjs` →  
`qa-agent/reports/runtime/phase-d-e5-schedule-proof-1784604218869.json`

- Scheduler tick enqueued `scheduled-design-agent-website_audit-c0de057c`  
- `finalStatus: completed`  
- Schedule restored after proof  
- Page copy: Schedule executable · next due · last tick shown  

---

## 8. Stale queue cleanup / handling

- Inspected queue via bootstrap `status`  
- No row deletes  
- Empty queue after executions; no stuck queued row left making the page look broken  
- UI unstick: poll no longer freezes on a single false “worker offline” status read; queue reconcile clears finished `activeManualRunId`

---

## 9. Memory prompt-like record cleanup

Classifier (`agentDetailMemoryModel.ts`):

- Expanded prompt/anywhere patterns (inspect/remember/hello/localhost/etc.)  
- Nested content fields (`message`, `prompt`, `body`, …) classified even when `title` is non-prompt  
- Main Runtime uses `usefulAgentRows` only; Diagnostics collapsed by default  

Live after `b60a0902` alias:

- design-agent: Runtime useful empty (“No runtime memory records…”) · Diagnostics (61)  
- qa-agent: same pattern · Diagnostics (59)  
- Counts remain truthful (61/59 total)

---

## 10. Offline state regression

Observed when worker heartbeat went stale:

- Worker offline  
- Scheduler offline / schedule will run when worker online  
- Audit tools unavailable  
- Run buttons disabled  

Acceptance screenshots are the **online** state.

---

## 11. Live QA on 6 agents

| Agent | Loads | Online badges match heartbeat | Memory readable | Prompt-like off main Runtime | Diagnostics collapsed | Chat shell | Mobile artifact |
|---|---|---|---|---|---|---|---|
| system-agent | YES | YES | YES | YES | YES | YES | `system-agent-390.png` |
| design-agent | YES | YES | YES | YES | YES | YES | `design-agent-390.png` |
| qa-agent | YES | YES | YES | YES | YES | YES | `qa-agent-390.png` |
| analytics-agent | YES | YES* | YES | YES* | YES | YES | `analytics-agent-390.png` |
| runtime-agent | YES | YES* | YES | YES* | YES | YES | `runtime-agent-390.png` |
| logs-agent | YES | YES* | YES | YES* | YES | YES | `logs-agent-390.png` |

\*Same capability source; confirmed online while worker fresh. Chat may show local Ollama fallback text — unrelated to staging worker engines.

---

## 12. Regression checks

| Area | Result |
|---|---|
| D-E1 truthfulness | PASS (verify + live) |
| D-E2 Memory/Hermes | PASS |
| D-E4 owner readability | PASS (online badges) |
| Manual website_audit | PASS (UI) |
| Manual browser_qa | PASS (UI) |
| Scheduled website_audit | PASS (schedule-proof) |
| Queue / cancel contracts | PASS (verifies) |
| Signed artifacts / health | PASS (ops verifies; upload optional) |

---

## 13. Safety checks

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run agentops:vercel-function-count-verify` | 9/12 PASS |
| `npm run agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `npm run agentops:agent-detail-final-verify` | PASS |
| `npm run agentops:agent-detail-memory-hermes-verify` | PASS |
| `npm run agentops:agent-detail-polish-verify` | PASS |
| `npm run agentops:agent-detail-online-verify` | PASS |
| `npm run agentops:staging-worker-ops-verify` | PASS |
| `npm run agentops:staging-worker-ops-ui-verify` | PASS |
| `npm run agentops:manual-run-browser-qa-verify` | PASS |
| `npm run agentops:manual-run-scheduler-verify` | PASS |

Local dirty WIP may still break `npm run build`; Vercel Preview on git tree is the build gate (Ready).

---

## 14. Known limitations

1. Durable worker must keep running on an approved host — stopping it honestly shows offline.  
2. Local chat LLM (Ollama) can still show fallback replies; that is not staging worker readiness.  
3. “Last scan / Latest result Failed” can still reflect older fleet daily review fallback until a newer successful agent-scoped result is selected.  
4. Artifact upload remains optional (`AGENTOPS_ARTIFACT_UPLOAD_ENABLED`).  
5. Issues / Draft Issue approval workflow was **not** started (owner decision).

---

## 15. Final readiness decision

Agent Detail is owner-ready for the **working online state** on staging when the durable worker is running. Safe to proceed to existing Issues review workflow next — **not** auto-approval / auto-fix.

### FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| WORKER_ROOT_CAUSE_IDENTIFIED | YES |
| STAGING_WORKER_RUNNING | YES |
| WORKER_HEARTBEAT_FRESH | YES |
| SCHEDULER_HEARTBEAT_FRESH | YES |
| AUDIT_TOOLS_READY_ON_PAGE | YES |
| RUN_AUDIT_NOW_ENABLED_ONLINE | YES |
| RUN_BROWSER_QA_NOW_ENABLED_ONLINE | YES |
| RUN_AUDIT_FROM_UI_WORKS | YES |
| RUN_BROWSER_QA_FROM_UI_WORKS | YES |
| SCHEDULE_ENQUEUE_AND_EXECUTE_WORKS | YES |
| SCHEDULE_ONLINE_STATE_CLEAR | YES |
| STALE_QUEUED_RUN_HANDLED | YES |
| OFFLINE_STATE_STILL_HONEST | YES |
| PROMPT_LIKE_MEMORY_HIDDEN_FROM_MAIN_RUNTIME | YES |
| DIAGNOSTICS_COLLAPSED | YES |
| MEMORY_SUMMARY_OWNER_READABLE | YES |
| SIX_AGENT_LIVE_QA_PASS | YES |
| MOBILE_LAYOUT_PASS | YES |
| D_E1_TRUTHFULNESS_REGRESSION_PASS | YES |
| D_E2_MEMORY_HERMES_REGRESSION_PASS | YES |
| D_E4_OWNER_READABILITY_REGRESSION_PASS | YES |
| MANUAL_WORKER_REGRESSION_PASS | YES |
| SCHEDULED_WORKER_REGRESSION_PASS | YES |
| QUEUE_DASHBOARD_REGRESSION_PASS | YES |
| CANCEL_UX_REGRESSION_PASS | YES |
| SIGNED_ARTIFACTS_REGRESSION_PASS | YES |
| FULL_ISSUE_APPROVAL_NOT_STARTED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES (Vercel Preview) |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_EXISTING_ISSUES_REVIEW_WORKFLOW | YES |
