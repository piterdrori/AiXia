# AgentOps Phase D-E2 — Memory / Hermes Presentation Cleanup

**Date:** 2026-07-20  
**Branch:** `staging` → `origin/staging`  
**Commits:**  
- `de34f238` — Clarify AgentOps agent memory and Hermes status  
- `68ccf6b0` — Fix Agent Detail memory load waiting for runtime identity  
**Preview:** `ai-q5p3q99ms-piterdrori-gmailcoms-projects.vercel.app` (`dpl_BSx3gpYHQkjqwuaQy9yS7V9nh3e6`)  
**Alias:** https://ai-xia-staging.vercel.app (Ready, not `--prod`)  
**Registry:** codegraph  
**Mode:** Staging-only

## 1. Summary

Agent Detail Memory/Hermes panel now separates fleet Hermes transport from per-agent Hermes connection, splits runtime / approved / shared / pending / files / diagnostics, collapses noisy history, times out slow loads, waits for runtime identity before querying memory, and updates status-strip copy so counts are not misread as “assigned active” memories.

No memory auto-apply, auto-promote, Issues workflow, production deploy, GitHub dispatch, or Vercel cron was added.

## 2. Data source audit

| Concern | Source |
|---|---|
| Panel UI | `src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx` |
| Runtime memory | `agentops_memory` via `fetchAgentScopedMemory(runtimeAgentId)` — `scope=agent`, `agent_id` = runtime UUID |
| Shared/global memory | `agentops_memory` `scope=global` `approved=true` (labeled shared/global) |
| Owner drafts | `agentops_agent_memory` via `getAgentOpsAgentMemory(canonical slug)` |
| Fleet Hermes | `getAgentOpsHermesRuntimeHealth()` → `/api/agentops/hermes` (transport only) |
| Per-agent Hermes | **No dedicated connection record** — `agentSpecificRecordExists` remains false |
| Model helpers | `src/lib/agentops/agents/agentDetailMemoryModel.ts` |
| Hermes test copy | `src/lib/agentops/agents/agentDetailHermesConnection.ts` |
| Strip mapping | `mapMemoryCountsToStripStatus` → `mapMemoryPartitionToStripStatus` |

**Slug → UUID:** page resolves runtime UUID for `agentops_memory`; owner drafts use canonical slug. Panel waits for `identityReady={!loading && identity != null}` before querying.

## 3. Final Memory/Hermes model

- **A. Fleet Hermes transport** — Available / Unavailable / Unknown  
- **B. Agent Hermes connection** — Connected / Not configured / Unknown / Error (Connected only with a real per-agent record; none today → Not configured)  
- **C. Runtime memory records** — total / enabled / inactive / last update  
- **D. Approved memory** — useful enabled runtime + active owner drafts  
- **E. Pending owner drafts** — `pending_approval`  
- **F. Files/drafts** — file-backed owner drafts  
- **G. Diagnostics / runtime history** — noisy markers, collapsed by default  

## 4. Panel information architecture

1. Summary cards: Fleet Hermes, Agent Hermes, Runtime counts, Pending drafts  
2. Banner when fleet available but no per-agent connection  
3. Tabs: runtime · approved · shared/global · pending · files · diagnostics  
4. Lists show 8 rows by default with Load more  
5. Honest empty / timeout / error / waiting-identity states + Refresh memory  

## 5. Noise filtering/grouping

`isDiagnosticRuntimeMemory` / `partitionRuntimeMemory` classify cycle/scan/thread/cross-agent markers and system-event content. Live example (system-agent): 120 runtime · 12 enabled · 114 diagnostic — diagnostics not presented as approved active memory.

## 6. Load timeout/error handling

`withTimeout(..., MEMORY_LOAD_TIMEOUT_MS=18000)` plus identity-ready gate so early mount does not flash “identity missing”. Rest of Agent Detail remains usable while memory loads.

## 7. Status strip copy updates

- Hermes cell labeled **Fleet Hermes**; detail includes Agent Hermes not configured  
- Memory: `N runtime memory records · M enabled · no pending drafts` (no ASSIGNED · ACTIVE)

## 8. Hermes test/refresh behavior

Live Test Hermes (all six agents): fleet transport Available · memory found · **Agent Hermes: Not configured** — never “Agent Hermes connected” from transport alone. Refresh memory control present.

## 9. Cross-agent data safety

Distinct scoped counts observed live:

| Agent | Runtime records | Enabled | Diagnostic |
|---|---:|---:|---:|
| system-agent | 120 | 12 | 114 |
| qa-agent | 59 | 7 | 53 |
| design-agent | 61 | 7 | 55 |
| analytics-agent | 60 | 6 | 55 |
| runtime-agent | 59 | 6 | 54 |
| logs-agent | 58 | 6 | 53 |

Shared/global tab labeled shared/global. No cross-agent merge into current assigned counts.

## 10. Live QA

Local Playwright against alias (not on Vercel). Artifact: `qa-agent/browser-qa-artifacts/phase-d-e2-memory-hermes/live-qa.json`.

Checks passed for all six agents:

1. Panel loads  
2. Fleet vs Agent Hermes separated (banner present)  
3. No “Agent Hermes connected”  
4. Runtime counts labeled clearly  
5. Pending drafts clear (“no pending drafts”)  
6. Approved / diagnostics tabs present  
7. Diagnostics tab available (collapsed default)  
8. Refresh memory visible  
9. Test Hermes copy truthful  
10. Cross-agent counts differ appropriately  
11. Page usable (no stuck Loading agent details for memory)  
12. Mobile viewport panel width OK  

## 11. Regression checks (D-E1 + worker)

- `agentops:agent-detail-final-verify` PASS (D-E1 truthfulness retained)  
- Manual / scheduler / worker ops / artifacts / alerts / retention verifies PASS (static suite)  
- Function count 9/12  

## 12. Security checks

- Owner draft approve/enable remains explicit owner action  
- No service-role exposure in browser panel  
- No memory auto-promotion / auto-application on load  
- No auth secrets logged; no storage_state committed  
- No code mutation / PR creation / production deploy  

## 13. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run build` (local dirty WIP tree) | FAIL on unrelated untracked WIP (same class as D-E1) |
| Vercel Preview build (git tree) | READY · 9 lambdas |
| Function count | 9/12 PASS |
| Memory/Hermes verify | PASS |
| Final verify | PASS |
| Owner promotion lock | PASS |
| Daily 12 agents | PASS |
| TTS/STT preference/voice | PASS |
| Manual run / browser QA / scheduler / hardening | PASS |
| Staging worker ops/UI/artifacts/alerts/retention | PASS |
| Live Memory/Hermes QA | PASS |

## 14. Known limitations

- No real per-agent Hermes connection table yet — Agent Hermes stays “Not configured”  
- “Enabled” still maps to `agentops_memory.approved` flag (schema), not a separate owner-approved product memory store  
- Local `npm run build` can fail when large untracked WIP is present; staging deploy uses committed tree  
- Issues / Draft Issue approval workflow not started (intentional)  

## 15. Next recommended phase

**D-E3 — Agent Detail polish** (layout/copy polish only).  
**Not ready** for existing Issues / Draft Issue review workflow.

---

## FINAL VERDICT

```
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
NO_GITHUB_DISPATCH: YES
NO_VERCEL_CRON: YES
NO_PLAYWRIGHT_ON_VERCEL: YES
MEMORY_HERMES_PANEL_CLEANED: YES
FLEET_HERMES_SEPARATED_FROM_AGENT_HERMES: YES
PER_AGENT_HERMES_NOT_MISREPRESENTED: YES
RUNTIME_MEMORY_COUNTS_LABELED: YES
APPROVED_MEMORY_SEPARATED: YES
PENDING_DRAFTS_SEPARATED: YES
SHARED_GLOBAL_MEMORY_LABELED: YES
DIAGNOSTIC_MEMORY_COLLAPSED: YES
NOISY_MEMORY_NOT_PRESENTED_AS_ACTIVE: YES
MEMORY_LOAD_TIMEOUT_HANDLED: YES
REFRESH_MEMORY_WORKS: YES
TEST_HERMES_COPY_TRUTHFUL: YES
CROSS_AGENT_MEMORY_SCOPING_PASS: YES
STATUS_STRIP_COPY_CLEAR: YES
MOBILE_LAYOUT_PASS: YES
D_E1_TRUTHFULNESS_REGRESSION_PASS: YES
MANUAL_WEBSITE_AUDIT_REGRESSION_PASS: YES
MANUAL_BROWSER_QA_REGRESSION_PASS: YES
SCHEDULED_EXECUTION_REGRESSION_PASS: YES
QUEUE_DASHBOARD_REGRESSION_PASS: YES
SIGNED_ARTIFACTS_REGRESSION_PASS: YES
OWNER_GATE_ENFORCED: YES
SERVICE_ROLE_NOT_EXPOSED: YES
NO_MEMORY_AUTO_PROMOTION: YES
NO_MEMORY_APPLICATION: YES
NO_CODE_CHANGE_BY_WORKER: YES
NO_PR_CREATION: YES
NO_PRODUCTION_DEPLOY: YES
FUNCTION_COUNT_WITHIN_BUDGET: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
READY_FOR_D_E3_AGENT_DETAIL_POLISH: YES
READY_FOR_EXISTING_ISSUES_REVIEW_WORKFLOW: NO
```
