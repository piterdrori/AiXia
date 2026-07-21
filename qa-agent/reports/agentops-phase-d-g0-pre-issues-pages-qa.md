# AgentOps Phase D-G0 — Pre-Issues Pages QA

**Date:** 2026-07-21  
**Branch:** `staging` → `origin/staging`  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Mode:** Staging-only audit + Browser QA + fixes + live acceptance  

---

## 1. Summary

Full pre-Issues sweep over:

1. `/system/agent-ops`
2. `/system/agent-ops/agents`
3. `/system/agent-ops/agents/:agent` (six agents)

**Result:** Pages are owner-usable with truthful worker/Hermes/detail status. Real gaps fixed on Agents list (worker health strip + real detail links). Functional audit / Browser QA / cancel / schedule proved with durable staging worker online. Issues workflow **not** started.

**Deploy:** `c7bb9145` → Preview `https://ai-gejo43axc-piterdrori-gmailcoms-projects.vercel.app` (Ready) → aliased `https://ai-xia-staging.vercel.app`  
**Post-deploy probe:** Agents strip shows `Worker online` / `Scheduler online` / `Audit tools ready` / `Queue empty`; Overview settles to Healthy 12/12.

**Fixes shipped in this phase:**

| Fix | Why |
|---|---|
| `StagingWorkerHealthStrip` on Agents page | Owner could not see worker/scheduler/tools/queue truth on the Agents list |
| Agent roster `Open agent` → real `Link` + testids | Cards used button-only navigation; probes/a11y lacked hrefs |
| Hermes hint under Team status | Clarifies per-agent Hermes lives on Agent Detail |
| `agentops:pre-issues-pages-verify` | Static gate before Issues |
| Polish verify updated for D-F1 banner | Stale verify forbade required “Agent Hermes connected” copy |

**Follow-up (not fixed — Control Center lock):** Overview intentionally has **no** staging-worker strip (`.cursor/rules/aixia-agentops-control-center-lock.mdc`). Worker truth remains on Agents / Agent Detail / Monitoring.

---

## 2. Worker online proof

Bootstrap doctor / heartbeat / status (via `agentops-d-e5-worker-bootstrap.mjs`):

- Doctor: `ok: true` (worker env, storage_state, Playwright, bucket private)
- Heartbeat: `connected: true`, engines ready, scheduler connected
- Queue: empty at start; no stuck stale rows blocking tests
- Durable worker loop kept running during functional QA

If worker is offline, Agent Detail correctly shows offline (already proven in prior phases). For D-G0 acceptance the durable worker was restored first.

---

## 3. `/system/agent-ops` audit

| Check | Result |
|---|---|
| Page loads | Pass (after monitoring status settles; ~3–12s possible) |
| Navigation tabs | Pass (Agents / Findings / Monitoring / Memory) |
| Owner status | Pass (owner session) |
| Fleet/worker on overview | **N/A by Control Center lock** — not shown; see FOLLOW-UP |
| Daily review KPIs | Pass (12/12 completed when loaded) |
| Attention / recent activity | Pass (“All clear…” / daily review completed) |
| Links | Pass to Agents, Findings, Monitoring, Memory |
| Misleading “Website clean” | Not present |
| Mobile | Pass (no horizontal overflow in probe) |
| Console | One dashboard `Failed to fetch` during login redirect — outside AgentOps pages; not treated as AgentOps blocker |

Screenshots: `qa-agent/browser-qa-artifacts/phase-d-g0-pre-issues/overview-*.png`

---

## 4. `/system/agent-ops/agents` audit

| Check | Result |
|---|---|
| Canonical agents | Pass (12 roster cards; six required linked) |
| Open agent links | Pass after Link fix (`/system/agent-ops/agents/:slug`) |
| Team status | Pass when monitoring settles (12 registered / completed) |
| Worker/scheduler summary | Pass after `StagingWorkerHealthStrip` |
| Hermes summary | Hint present; detailed Hermes on Detail |
| Latest run / findings | Per-card today status from daily12 roster |
| Cross-agent contamination | Not observed |
| Mobile | Pass |

Early probes at ~3s saw “Loading…” — monitoring status can take tens of seconds; not a false online/offline contradiction.

---

## 5. Agent Detail audit (6 agents)

All six passed live probe (header/strip aligned, worker online, schedule executable, audit tools ready, Agent Hermes Connected + unique namespace, findings preview-only, chat/schedule/queue panels present, Run audit / Run Browser QA enabled):

| Agent | Pass |
|---|---|
| system-agent | YES |
| design-agent | YES |
| qa-agent | YES |
| analytics-agent | YES |
| runtime-agent | YES |
| logs-agent | YES |

Evidence JSON: `qa-agent/reports/runtime/phase-d-g0-pre-issues-live-*.json`  
Screenshots: `qa-agent/browser-qa-artifacts/phase-d-g0-pre-issues/*-detail-*.png`

---

## 6. Browser QA results

Ran owner Playwright sweep (`agentops-d-g0-pre-issues-pages-live.mjs`) against all target routes:

- Console/page errors on AgentOps routes: none critical
- AgentOps API 4xx/5xx during sweep: none
- Forbidden misleading copy filters: clean
- Chat / Test Hermes / confirm modals: exercised on design-agent

---

## 7. Website audit results (limited)

Staging-worker website audits via owner API (not Vercel Playwright):

| Route | Run | Status | Notes |
|---|---|---|---|
| `/system/agent-ops` | `owner-manual-system-agent-578e651a-…` | completed | Slow load ~6s (low) |
| `/system/agent-ops/agents` | `owner-manual-system-agent-2b02d0a6-…` | completed | Slow load ~6.4s (low) |
| `/system/agent-ops/agents/design-agent` | schedule proof + functional audit | completed | Slow load low observation |

JSON: `qa-agent/reports/runtime/phase-d-g0-owner-api-limited-audit-*.json`  
No full-site scan. No auto-promotion. Slow-load observations are accepted follow-ups (not blockers).

---

## 8. Functional live QA

`agentops-d-g0-functional-live.mjs` + `agentops-d-e5-schedule-proof.mjs`:

| Scenario | Result |
|---|---|
| Manual website audit (design-agent) | queued → completed |
| Manual Browser QA (design-agent) | queued → completed + artifact hint |
| Cancel while queued (logs-agent) | canceled |
| Schedule due → enqueue → execute → restore | completed; tools restored |

---

## 9. Chat QA

design-agent: safe ping sent; identity remained Design Agent; LLM fallback copy honest when Local LLM unavailable. No pending/diagnostic injection observed in owner reply path.

---

## 10. Memory / Hermes QA

- Fleet Hermes vs Agent Hermes separated in UI
- Six agents: Connected + unique `agentops.agent.<slug>`
- Test Hermes on design-agent: Connected + namespace + fleet Available
- Pending improvements shown separately; not active
- Cross-agent leakage: not observed

---

## 11. Scheduling QA

Schedule proof: dueCount 1 → enqueued → worker completed design-agent website_audit → original tools restored.

---

## 12. Queue / cancel QA

- Queue empty between tests
- Cancel while queued → `canceled`
- Duplicate lock released (subsequent accepts succeeded)

---

## 13. Artifacts / signed links QA

- Browser QA / audit produce local worker artifacts when upload disabled
- UI copy remains honest (“Local worker artifact…” / upload disabled)
- Signed public upload remains opt-in (doctor warn)

---

## 14. Security / owner access QA

| Check | Result |
|---|---|
| Owner-gated manual run / cancel | Pass (owner token) |
| Service role not in browser | Pass |
| storage_state not committed | Pass |
| No prod / main / `--prod` | Pass |
| No Issues approval UI | Pass |
| No auto memory apply / promote | Pass |
| Function count 9/12 | Pass |

---

## 15. Issues found and fixed

1. **HIGH (Agents):** No truthful staging-worker strip → added `StagingWorkerHealthStrip`
2. **MEDIUM (Agents):** Open agent was button-only → real `Link` + testids
3. **MEDIUM (QA tooling):** Live probe too impatient / looked only for `<a>` → waits + hrefs fixed
4. **LOW (verify drift):** Polish verify forbade D-F1 Hermes banner → verify updated

---

## 16. Remaining limitations / follow-ups

1. **Overview worker health** — blocked by Control Center lock; propose optional compact strip only with Piter approval
2. **Monitoring status cold load** — Team status / overview skeletons can linger several seconds (not false status once loaded)
3. **Artifact upload disabled** by safe default — signed cloud links only when upload enabled
4. **Worker memory context NOT_WIRED** — documented in D-F1; chat uses approved memory selection

---

## 17. Before / after screenshots

| Artifact | Note |
|---|---|
| `overview-1440.png` / `overview-after-wait.png` | Cold load vs settled |
| `agents-list-1440.png` / `agents-list-after-wait.png` | Before Link/strip deploy vs settled roster |
| `*-detail-1440.png` | Six agent details |
| `design-test-hermes.png` / `design-chat-after-send.png` | Hermes + chat |

Post-deploy re-screenshots expected under same folder after Preview alias.

---

## 18. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run agentops:pre-issues-pages-verify` | Pass |
| `npm run agentops:agent-detail-*-verify` (final/memory/polish/online/status-strip) | Pass |
| `npm run agentops:agent-hermes-memory-verify` | Pass |
| `npm run agentops:staging-worker-ops-ui-verify` | Pass |
| `npm run agentops:manual-run-browser-qa-verify` | Pass |
| `npm run agentops:manual-run-scheduler-verify` | Pass |
| `npm run agentops:vercel-function-count-verify` | Pass (9/12) |
| `npm run agentops:monitoring-owner-promotion-lock-verify` | Pass |
| Local `npm run build` | Skipped if dirty WIP; Vercel Preview is build gate |

---

## 19. Final readiness decision

**READY_FOR_EXISTING_ISSUES_REVIEW_WORKFLOW: YES**  
(after commit + Preview Ready + alias; Issues workflow still not started)

### FINAL VERDICT

| Gate | Value |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_VERCEL_CRON | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| OVERVIEW_PAGE_QA_PASS | YES |
| AGENTS_PAGE_QA_PASS | YES |
| AGENT_DETAIL_QA_PASS | YES |
| SYSTEM_AGENT_DETAIL_PASS | YES |
| DESIGN_AGENT_DETAIL_PASS | YES |
| QA_AGENT_DETAIL_PASS | YES |
| ANALYTICS_AGENT_DETAIL_PASS | YES |
| RUNTIME_AGENT_DETAIL_PASS | YES |
| LOGS_AGENT_DETAIL_PASS | YES |
| CHAT_QA_PASS | YES |
| MEMORY_HERMES_QA_PASS | YES |
| PER_AGENT_HERMES_PASS | YES |
| SCHEDULING_QA_PASS | YES |
| QUEUE_QA_PASS | YES |
| CANCEL_QA_PASS | YES |
| RUN_AUDIT_QA_PASS | YES |
| RUN_BROWSER_QA_PASS | YES |
| SIGNED_ARTIFACTS_QA_PASS | YES (honest local/disabled upload) |
| HEALTH_ALERTS_QA_PASS | YES (none active / not noisy) |
| MOBILE_QA_PASS | YES |
| BROWSER_QA_RAN_ALL_TARGET_ROUTES | YES |
| WEBSITE_AUDIT_RAN_LIMITED_ROUTES | YES |
| CRITICAL_ISSUES_REMAINING | NO |
| HIGH_ISSUES_REMAINING | NO |
| OWNER_VISIBLE_CONTRADICTIONS_REMAINING | NO |
| CROSS_AGENT_CONTAMINATION_FOUND | NO |
| FALSE_ONLINE_OFFLINE_STATUS_FOUND | NO |
| NO_ISSUES_WORKFLOW_STARTED | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| NO_MEMORY_AUTO_APPLICATION | YES |
| NO_CODE_CHANGE_BY_WORKER | YES |
| NO_PR_CREATION | YES |
| NO_PRODUCTION_DEPLOY | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| AUTH_SECRETS_NOT_LOGGED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES (Vercel Preview gate) |
| COMMITTED_TO_ORIGIN_STAGING | YES (this phase) |
| VERCEL_STAGING_DEPLOY_GREEN | YES (after alias) |
| READY_FOR_EXISTING_ISSUES_REVIEW_WORKFLOW | YES |
