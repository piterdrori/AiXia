# AgentOps Phase D-E0 — Agent Detail Audit + Browser QA Evidence (NO FIXES)

**Date:** 2026-07-20  
**Branch:** `staging` @ `536c9b4c` (audit-only; no product code changes)  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents/:agent  
**Mode:** Staging-only audit + external-worker Browser QA / website audit evidence  
**Artifacts:** `qa-agent/browser-qa-artifacts/phase-d-e0-agent-detail-audit/`

---

## 1. Summary

Owner-visible Agent Detail problems are real and reproducible. Pre-worker capture on **system-agent** showed worker stale, scheduler not executable, engines not ready, run buttons disabled, schedule/memory/Hermes confusion, queue age contradictions, and a latest-run drawer still dominated by **fleet / daily-agent / GitHub Actions** copy despite newer staging-worker runs existing.

Root themes:

1. **Truthfulness gaps** between header, queue panel, schedule panel, and frozen ops heartbeat JSON  
2. **Latest run drawer** still defaults to fleet/daily-12 model (`EMPTY_DRAWER`)  
3. **Memory/Hermes** mix fleet transport health with agent-assigned runtime memory poorly  
4. **Worker offline** (~32+ min heartbeat gap) left scheduled runs legitimately queued/stuck waiting  
5. **Oldest queued age** UI shows frozen ops value (`48s`) while real queued age was ~26–33 minutes  

No UI/API/worker fixes were implemented in this pass.

---

## 2. Current visual-state findings (system-agent, BEFORE worker refresh)

Captured via authenticated Cursor browser + CDP text extract on  
https://ai-xia-staging.vercel.app/system/agent-ops/agents/system-agent

### Header
| Field | Observed |
|---|---|
| Owner work status | Active |
| Execution worker | **Worker stale** |
| Last heartbeat | 7/20/2026, 3:10:29 PM |
| Scheduler | **Scheduler not executable** |
| Engines | **Engines not ready** |
| Queue length | **2** |
| Oldest queued age | **48s** (false — see §5) |
| Last completed | `owner-manual-system-agent-website_audit-d-b-1784526479555` |
| Next scheduler tick (est.) | 7/20/2026, 3:11:04 PM (stale estimate) |
| Run audit / Browser QA | **Disabled** |
| Badges | `STAGING WORKER · NO GITHUB DEPENDENCY` · `RUN AUDIT: STAGING WORKER NOT CONNECTED` · `BROWSER QA NOT READY` |

### Status strip
| Cell | Observed |
|---|---|
| Owner status | ACTIVE |
| Hermes | FLEET AVAILABLE — “Hermes transport is available. This agent does not yet have a dedicated connection record.” |
| Memory | **120 ASSIGNED · 12 ACTIVE** — “Runtime memory (agentops_memory)” |
| Last scan | COMPLETED · 7/20/2026, 12:37:14 PM |
| Schedule | SAVED · WORKER SCHEDULER OFFLINE |
| Current activity | IDLE |

### Queue panel
| Field | Observed |
|---|---|
| Badges | WORKER STALE · SCHEDULER NOT EXECUTABLE · ENGINES NOT READY · **QUEUE: 1** |
| Active | None |
| Oldest queued age | **48s** (same false value) |
| Heartbeat | 7/20/2026, 3:10:29 PM |
| Scheduler tick | 7/20/2026, 3:10:04 PM |
| Last completed | `…website_audit-dc-1784528489220` (**differs from header**) |
| Queued row | `scheduled-system-agent-browser_qa-0a651b2f` · system-agent · browser_qa · schedule · **age 26m** |
| Running | none |
| Health alerts | Acknowledged / history present (D-D probe ack) |

### Schedule panel
| Field | Observed |
|---|---|
| Preference | Enabled preference |
| Work type | Browser QA |
| Frequency | every hours · 1 hours |
| Scope | Selected routes |
| Schedule status | **Worker offline** |
| Next due | 7/20/2026, 4:09:25 PM |
| Execution connection | Saved · worker scheduler offline |
| Last scheduler tick | 7/20/2026, 3:10:04 PM |
| Last scheduled run | `scheduled-system-agent-browser_qa-0a651b2f` |
| Last skipped reason | **Not due yet** |
| Latest result | Completed |
| Current activity | Idle |

### Memory / Hermes
- Fleet Hermes emphasized; no dedicated per-agent Hermes connection  
- Assigned 120 / enabled 12  
- Runtime memory list dominated by old chat markers + many “Cycle scanned N finding(s)…” inactive rows  
- Shared/global and pending drafts tabs exist; presentation still feels like a dump, not agent-work memory  

### Latest run drawer (View latest run)
| Field | Observed |
|---|---|
| Execution status | Completed |
| Run id | **Not recorded** |
| Work type | **Daily agent review** |
| Trigger | **Fleet monitoring / GitHub Actions** |
| Started / Ended | 12:34:02 PM / 12:37:14 PM |
| Duration | 3m 12s |
| Lock expires / Review depth / Auth depth / Browser usage | **Not recorded** |
| Routes | fleet route list |
| Raw observations | “Open Monitoring for fleet raw observations” |
| Evidence | “Open Monitoring for fleet evidence” |
| Limitations | “Latest fleet/daily execution…” |

Activity feed also says: **“Latest daily-agent execution: completed · 3m 12s”**.

### Contradictions recorded (pre-refresh)
1. Header queue length **2** vs panel **QUEUE: 1** (global vs agent-filtered — unlabeled)  
2. Oldest age **48s** vs queued row **age 26m**  
3. Header last-completed ≠ panel last-completed  
4. Activity **IDLE** while a scheduled run is queued for this agent  
5. Schedule **Enabled** + last scheduled run queued + last skipped **Not due yet**  
6. Badge “NO GITHUB DEPENDENCY” vs drawer trigger **GitHub Actions**  
7. Next scheduler tick in the past while worker stale  

Screenshots / extracts: Cursor browser captures under `qa-agent/browser-qa-artifacts/phase-d-e0-agent-detail-audit/` (and temp Cursor screenshot paths for drawer/header).

---

## 3. Per-agent page audit

| Agent | Loads | Correct name | Owner status | Worker/queue notes | Schedule | Memory/Hermes | Cross-agent contamination | Chat |
|---|---|---|---|---|---|---|---|---|
| system-agent | YES | YES | Active | Pre: stale; post-heartbeat: connected; queued scheduled BQ row | Enabled BQ hourly; offline connection copy | 120/12; fleet Hermes | Queue filtered to agent when compact | Usable; older LLM fallback history present |
| qa-agent | YES | YES | **Unknown** | Post-refresh: header connected/engines ready; brief panel lag to offline then connected | **NOT CONFIGURED** | Hermes UNKNOWN / memory slow-load | QUEUE: 0 (no qa queued) | Loads |
| design-agent | YES | YES | Unknown | Connected after refresh | SAVED · scheduler offline; status Worker offline; skipped “Schedule disabled”; next due present | Fleet Hermes; memory often stuck “Loading…” | QUEUE: 0 | Loads |
| analytics-agent | YES | YES | Unknown | Connected | MANUAL ONLY | Hermes UNKNOWN initially | QUEUE: 0 | Loads |
| runtime-agent | YES | YES | Unknown | Connected | SAVED · scheduler offline | Fleet Hermes; memory slow | QUEUE: 0 | Loads |
| logs-agent | YES | YES | Active | Connected; **QUEUE: 1** `scheduled-logs-agent-website_audit-b6b6dda8` | SAVED · scheduler offline | Fleet Hermes | Agent-filtered queue shows logs scheduled row | Loads |

Notes:
- No hard cross-agent data mix in queue rows when panel `agentSlug` filter applies.  
- Global worker metrics (queue length 2, oldest 48s, last completed ids) still appear on **every** Agent Detail header — easy to misread as agent-local.  
- Playwright probe with local `storage-state` was **partially stale** (first navigation hit TaskFlow); owner Cursor session was authoritative for visual truth. Report that honestly.

---

## 4. Code / data model audit

| Area | Source | Reads | Per-agent vs global | Risks |
|---|---|---|---|---|
| Page shell | `src/app/system/agent-ops/agents/[agentId]/page.tsx` | monitoring daily12, manual capability, identity, findings Top10, timeline, latest daily execution | Mix: agent slug + fleet daily12 roster | Opens drawer from fleet/daily when no manual result |
| Control header | `…/AgentControlHeader.tsx` | props from page | Displays global worker metrics | No agent-scope label on queue length |
| Status strip | `…/AgentStatusStrip.tsx` + `agentDetailControlCenter.ts` | owner/hermes/memory/schedule/activity | Hermes can be fleet-level | “Fleet available” reads as agent-ready |
| Queue panel | `…/StagingWorkerQueuePanel.tsx` | `GET …/manual-run/queue?agentSlug=` | Filtered rows; global badges/heartbeat | Can briefly disagree with header while loading |
| Schedule | `…/AgentSchedulePanel.tsx` + `agentDetailScheduleModel.ts` | runtime agent tools schedule | Per-agent preference | Copy still mentions fleet GHA in editor pause helper |
| Memory/Hermes | `…/AgentMemoryHermesPanel.tsx` | agentops_memory / drafts | Runtime memory + fleet Hermes | High assigned counts include noise rows |
| Results / drawer | `…/AgentResultsPanel.tsx` | findings + drawer model | Drawer often fleet | Many “Not recorded” fields |
| Manual run client | `agentManualRunClient.ts` | capability/status/queue/artifact URL | Staging APIs | — |
| Capability / queue API | `api/agentops/_lib/monitoringManualRun.ts` | worker ops + runs table | **Prefers `ops.oldestQueuedAgeMs` over live age** | Frozen age bug |
| Latest daily selection | `fetchLatestDailyExecutionForSlug` / daily12 helpers | fleet executions | Fleet | Dominates “View latest run” |
| EMPTY_DRAWER defaults | page.tsx lines 86–105 | static | Global wording | **Daily agent review / GitHub Actions** |

---

## 5. Worker / scheduler / queue audit (DB, read-only)

Evidence: `worker-queue-db-audit.json` @ 2026-07-20T07:42:57Z

| Signal | Value | Interpretation |
|---|---|---|
| `worker.connected` | `true` | Flag not cleared when loop stopped |
| `lastHeartbeatAt` | 07:10:29Z | **~32 min stale** at audit time → UI correctly shows stale |
| `workerVersion` | `d-a` | Behind ops version `d-d` |
| `ops.enginesReady` | `true` | UI hides ready while stale (good) but ops JSON still “ready” |
| `ops.oldestQueuedAgeMs` | **48018** | Frozen from last ops cycle — **not live** |
| `schedulerHeartbeatAt` | null | Scheduler not executable |
| Queued | `scheduled-system-agent-browser_qa-0a651b2f`, `scheduled-logs-agent-website_audit-b6b6dda8` | Real waiting rows (~33m), cancelable, not running |
| Running | none | Not stuck in running |

**Why worker stale:** external staging worker loop not heartbeating (process stopped / host idle).  
**Why scheduler not executable:** no fresh scheduler heartbeat / ops tick.  
**Why engines not ready (UI):** capability gates engines on fresh worker connection even if ops says ready.  
**Why queue length 1 on panel:** agent filter; global header shows 2.  
**Queued runs:** genuine waiting — worker offline; should remain cancelable for owner.

API preference bug (inspect for D-E1):

```ts
// monitoringManualRun.ts ~1047
oldestQueuedAgeMs: ops?.oldestQueuedAgeMs ?? oldestQueuedAgeMs
```

Live computed age is discarded whenever stale ops value exists.

---

## 6. Browser QA results (external staging worker)

Runs (auth OK, real browser, no Playwright on Vercel):

| Run | Status | Notes |
|---|---|---|
| `…-system-agent-browser_qa-de0-…` | completed | findings_found; disabled button; 2 aborted HEAD requests (calendar_events/tasks); 1 screenshot; 1 draft created |
| `…-qa-agent-browser_qa-de0-…` | completed | same pattern; draft skipped duplicate |
| `…-design-agent-browser_qa-de0-…` | completed | completed |
| `…-analytics-agent-browser_qa-de0-…` | completed | completed |

Network noise appears to be shell/calendar HEAD probes aborted on AgentOps routes — medium severity observation, not Agent Detail-specific necessarily.

Local Playwright multi-page probe: storage_state partially stale (TaskFlow on first load). Owner Cursor session used for truth. **Do not treat local probe field extraction as authoritative for system-agent pre-state.**

---

## 7. Website audit results (limited route)

Run: `owner-manual-system-agent-website_audit-de0-1784533594868`  
Scope: `/system/agent-ops/agents/system-agent` only  

Finding:
- **Slow page load detected (9037ms)** — severity low  
- No qualifying promoted findings  
- Confirms Agent Detail is heavy on first paint  

---

## 8. Manual functional QA

| Case | Result |
|---|---|
| A. Worker stale | PASS — buttons disabled; engines not ready; badges honest; queue shows waiting row |
| B. Worker connected (heartbeat refresh) | PASS — heartbeat updated (~3:46 PM); Run audit / Browser QA enabled when engines ready; brief header vs queue panel lag observed then reconciled |
| C. Schedule | FAIL/ISSUE — offline connection correct, but “Not due yet” vs queued last scheduled run; next due vs skipped reason confuse; editor still mentions fleet GHA on pause |
| D. Queue | PARTIAL — row shows agent/work/trigger/age; age label contradictory; cancel available on header when active manual run, scheduled row cancel UX needs D-E1 confirmation in panel |
| E. Memory/Hermes | FAIL/ISSUE — fleet Hermes looks like agent readiness; 120 assigned noisy; loading often stuck |
| F. Latest run drawer | FAIL — prefers fleet/daily; GitHub Actions wording; many Not recorded; ignores newer worker manual/scheduled runs unless `manualRunResult` in session |

---

## 9. Prioritized issue list

| ID | Sev | Area | Symptom | Evidence | Likely cause | Inspect | Recommended fix (D-E1+) | Risk | Type |
|---|---|---|---|---|---|---|---|---|---|
| DE0-01 | Critical | Latest run | Drawer shows Daily agent / GitHub Actions; run id Not recorded | Drawer screenshot + EMPTY_DRAWER | `onViewLatestRun` falls back to fleet daily | `[agentId]/page.tsx` | Prefer latest worker manual/scheduled run for slug; hide fleet defaults | Medium | UI + data |
| DE0-02 | Critical | Worker/Queue | Oldest queued age 48s vs row age 26m | Pre-state CDP + DB | API prefers frozen `ops.oldestQueuedAgeMs` | `monitoringManualRun.ts` | Always compute live age; treat ops value as hint only | Low | API |
| DE0-03 | High | Header/Queue | Queue length 2 vs QUEUE: 1 unlabeled | Pre-state | Global vs filtered metrics | Header + QueuePanel | Label “Global queue” vs “This agent” | Low | UI |
| DE0-04 | High | Header/Queue | Last completed ids disagree | Pre-state | Different sources | page + queue API | Single source or label scopes | Low | UI/API |
| DE0-05 | High | Schedule | Enabled + queued scheduled run + “Not due yet” + Idle | Schedule panel | Skip reason / activity not tied to queued scheduled row | SchedulePanel + schedule model | Surface “Queued awaiting worker” as activity; reconcile skip reasons | Medium | UI/data |
| DE0-06 | High | Worker | `connected:true` with 32m stale heartbeat | DB audit | Heartbeat flag not expired in write path | worker ops core / capability | Derive connected only from freshness | Medium | Worker/API |
| DE0-07 | High | Memory/Hermes | Fleet Hermes green vs no agent connection; 120 assigned noise | system-agent memory | Fleet transport ≠ agent Hermes; memory list includes chat/cycle noise | MemoryHermesPanel | Split Fleet vs Agent Hermes; filter noise types | Medium | UI/data |
| DE0-08 | Medium | Header | Next scheduler tick in past while stale | Header | Stale ops estimate still shown | page capability mapping | Hide tick estimate when worker/scheduler stale | Low | UI |
| DE0-09 | Medium | Activity | “daily-agent execution” wording | Activity feed | `pushLocalActivity` uses daily-agent copy | page.tsx | Rename to fleet/daily review; add worker run events | Low | UI |
| DE0-10 | Medium | Schedule | Pause helper mentions fleet GHA | Schedule editor copy | Leftover copy | AgentSchedulePanel | Remove GHA implication | Low | UI |
| DE0-11 | Medium | Results | “Recorded daily-agent execution failures” | Results panel | Old naming | AgentResultsPanel / B1 copy | Staging-worker-era labels | Low | UI |
| DE0-12 | Medium | Perf | Agent Detail ~9s load | Website audit | Heavy page | page composition | Lazy panels / defer memory | Medium | UI |
| DE0-13 | Medium | Browser QA | Aborted HEAD calendar/tasks on AgentOps pages | BQ summaries | Shell probes on agent routes | shell/network | Ignore or scope probes | Low | Data/shell |
| DE0-14 | Medium | Memory | Strip stuck on “Loading agent details…” | multi-agent browse | Slow/failed memory load | MemoryHermesPanel | Timeout + honest error | Low | UI |
| DE0-15 | Low | Mobile | No horizontal overflow at 390 | probe | — | — | Keep watching drawer/mobile | Low | — |
| DE0-16 | Low | Chat | Old Ollama fallback replies in history | system-agent chat | Historical | chat store | Optional cleanup later | Low | Data |
| DE0-17 | Low | Worker | workerVersion `d-a` vs ops `d-d` | DB | Host not restarted on new code | ops host | Restart worker on D-D/D-E builds | Low | Ops |

### Recommended fix order
1. DE0-01 latest-run source of truth  
2. DE0-02 live oldest-queued age  
3. DE0-03/04 metric scoping labels  
4. DE0-05/08 schedule + activity honesty  
5. DE0-06 connected freshness  
6. DE0-07/14 memory-Hermes presentation  
7. Copy cleanup DE0-09/10/11  
8. Perf DE0-12  

---

## 10. Recommended fix phases

| Phase | Scope |
|---|---|
| **D-E1** | Truthfulness: latest run selection, live queue age, header/panel scope labels, hide stale tick estimates |
| **D-E2** | Schedule/activity: queued scheduled runs as current activity; skip-reason honesty; remove GHA copy |
| **D-E3** | Memory/Hermes presentation split + noise filtering + load timeouts |
| **D-E4** | Perf + Browser QA shell noise + polish (mobile drawer, chat history) |

---

## 11. Safety checks

| Check | Result |
|---|---|
| `npm run agentops:agent-detail-final-verify` | **MISSING SCRIPT** — not invented |
| `npm run agentops:manual-run-browser-qa-verify` | PASS |
| `npm run agentops:staging-worker-ops-ui-verify` | PASS |
| `npm run agentops:vercel-function-count-verify` | PASS (9/12) |

No product code changes. No `--prod`. No GitHub dispatch / Vercel cron created. No Playwright on Vercel.

---

## 12. Evidence / artifact links

| Artifact | Path |
|---|---|
| DB worker/queue audit | `qa-agent/browser-qa-artifacts/phase-d-e0-agent-detail-audit/worker-queue-db-audit.json` |
| Engine runs index | `…/worker-engine-runs.json` |
| Engine summaries | `…/engine-run-summaries.json` |
| Per-agent Playwright probe | `…/per-agent-page-probe.json` (+ `*-1440.png`, `*-390.png`) |
| Website audit run | `owner-manual-system-agent-website_audit-de0-1784533594868` |
| Browser QA runs | `…-browser_qa-de0-…` for system/qa/design/analytics |
| Cursor drawer evidence | `system-agent-latest-run-drawer.png` (Cursor temp + report notes) |

Helper scripts used for audit only (not required product):  
`qa-agent/scripts/agentops-d-e0-worker-state-audit.mjs`,  
`agentops-d-e0-agent-detail-page-probe.mjs`,  
`agentops-d-e0-queue-detail-audits.mjs`

---

## 13. Final recommendation

Proceed to **D-E1 Agent Detail truthfulness fixes** with DE0-01 and DE0-02 first. Do not start Issues/Draft Issue workflow from this audit unless owner explicitly requests promotion of the Browser QA draft already created.

Keep worker host running (or document offline) so schedule/queue UI can be validated in the connected state without frozen ops metrics.

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| AUDIT_ONLY_NO_FIXES | YES |
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| NO_GITHUB_DISPATCH | YES |
| NO_VERCEL_CRON | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| SYSTEM_AGENT_AUDITED | YES |
| QA_AGENT_AUDITED | YES |
| DESIGN_AGENT_AUDITED | YES |
| ANALYTICS_AGENT_AUDITED | YES |
| RUNTIME_AGENT_AUDITED | YES |
| LOGS_AGENT_AUDITED | YES |
| BROWSER_QA_RAN | YES |
| WEBSITE_AUDIT_RAN | YES |
| WORKER_STATE_ISSUES_IDENTIFIED | YES |
| SCHEDULE_ISSUES_IDENTIFIED | YES |
| MEMORY_HERMES_ISSUES_IDENTIFIED | YES |
| LATEST_RUN_DRAWER_ISSUES_IDENTIFIED | YES |
| QUEUE_ISSUES_IDENTIFIED | YES |
| CHAT_STABILITY_CHECKED | YES |
| MOBILE_CHECKED | YES |
| PRIORITIZED_FIX_LIST_CREATED | YES |
| READY_FOR_D_E1_AGENT_DETAIL_FIXES | YES |
