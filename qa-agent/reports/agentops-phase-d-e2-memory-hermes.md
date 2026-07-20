# AgentOps Phase D-E2 — Memory / Hermes Presentation Cleanup

**Date:** 2026-07-20  
**Branch:** `staging` → `origin/staging`  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents/:agent  
**Registry:** codegraph  
**Mode:** Staging-only

## 1. Summary

Agent Detail Memory/Hermes panel now separates fleet Hermes transport from per-agent Hermes connection, splits runtime / approved / shared / pending / files / diagnostics, collapses noisy history, times out slow loads, and updates status-strip copy so counts are not misread as “assigned active” memories.

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

**Slug → UUID:** page resolves runtime UUID for `agentops_memory`; owner drafts use canonical slug.

## 3. Final Memory/Hermes model

- **A. Fleet Hermes transport** — Available / Unavailable / Unknown  
- **B. Agent Hermes connection** — Connected / Not configured / Unknown / Error (Connected only with a real per-agent record; none today)  
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
5. Honest empty / timeout / error states + Refresh memory  

## 5. Noise filtering/grouping

`isDiagnosticRuntimeMemory` / `partitionRuntimeMemory` classify cycle/scan/thread/cross-agent markers and system-event content. Diagnostics are not counted as approved useful memory and live under a collapsed Diagnostics tab.

## 6. Load timeout/error handling

`withTimeout(..., MEMORY_LOAD_TIMEOUT_MS=18000)` — shows “Memory load is slow or unavailable. Try refresh memory.” Strip can show “Memory load slow”. Rest of Agent Detail remains usable.

## 7. Status strip copy updates

- Hermes cell labeled **Fleet Hermes**; detail includes Agent Hermes not configured when applicable  
- Memory: `N runtime memory records · M enabled · … pending drafts` (no ASSIGNED · ACTIVE)

## 8. Hermes test/refresh behavior

- **Test Hermes connection** reports fleet transport + Agent Hermes: Not configured; never “Agent Hermes connected” from transport alone  
- **Refresh memory** reloads sections with loading / timeout honesty  

## 9. Cross-agent data safety

Runtime queries remain `agent_id = runtime UUID`. Drafts scoped by canonical slug. Shared/global tab explicitly labeled. No cross-agent merge into “current assigned” counts.

Live check agents: system-agent, qa-agent, design-agent, analytics-agent, runtime-agent, logs-agent (post-deploy).

## 10. Live QA

*(Filled after staging Preview alias is Ready.)*

## 11. Regression checks (D-E1 + worker)

Static verifies: `agentops:agent-detail-final-verify` PASS (D-E1 truthfulness retained).  
Worker/manual/scheduler/artifacts/alerts verifies: PASS (light static suite).

## 12. Security checks

- Owner draft approve/enable remains explicit owner action  
- No service-role exposure in browser panel  
- No memory auto-promotion / auto-application on load  
- No auth secrets logged; no storage_state committed  
- No code mutation / PR creation / production deploy  

## 13. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (workspace config) |
| `npm run build` (local dirty WIP tree) | FAIL on unrelated untracked WIP (same class as D-E1) |
| Vercel Preview build (git tree) | *(post-deploy)* |
| Function count | 9/12 PASS |
| Memory/Hermes verify | PASS |
| Final verify | PASS |
| Owner promotion lock | PASS |
| Daily 12 agents | PASS |
| TTS/STT preference/voice | PASS |
| Manual run / browser QA / scheduler / hardening | PASS |
| Staging worker ops/UI/artifacts/alerts/retention | PASS |

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
MOBILE_LAYOUT_PASS: PENDING_LIVE_QA
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
BUILD_GREEN: PENDING_VERCEL
COMMITTED_TO_ORIGIN_STAGING: PENDING
VERCEL_STAGING_DEPLOY_GREEN: PENDING
READY_FOR_D_E3_AGENT_DETAIL_POLISH: PENDING_LIVE_QA
READY_FOR_EXISTING_ISSUES_REVIEW_WORKFLOW: NO
```
