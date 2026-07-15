# AgentOps Agent Detail — Final Control Center

**Date:** 2026-07-15  
**Branch:** `staging` → `origin/staging`  
**Mode:** Staging-only  
**Registry:** codegraph  
**Route:** `/system/agent-ops/agents/:agentId`

---

## 1. Architecture

One shared React page drives all 12 canonical agents. Identity and behavior differences come from `CANONICAL_AGENTS`, roster/monitoring data, managed agent records, schedule tools tags, and per-agent memory rows — not separate page forks.

Primary weight: **Chat → Schedule → Memory/Hermes**.  
Supporting: Results, Permissions (collapsed), Activity (collapsed).

## 2. Shared component tree

```
AgentOpsAgentDetailPage
├── AgentControlHeader
├── AgentStatusStrip
├── AgentChatWorkspace → AgentOpsAgentChatCard
├── AgentSchedulePanel
├── AgentMemoryHermesPanel
├── AgentResultsPanel (+ run drawer)
├── AgentPermissionsPanel (collapsed)
└── AgentActivityPanel (collapsed)
```

Location: `src/components/agentops/owner/agent-detail/`

## 3. Status data sources

| Strip field | Source |
|---|---|
| Agent status | Managed agent owner status + roster review status |
| Hermes | `GET /api/agentops/hermes` via `getAgentOpsHermesRuntimeHealth` (fleet transport) |
| Memory | `getAgentOpsAgentMemory(agentId)` counts |
| Last scan | Daily-12 roster `lastDailyRunAt` + review mapping |
| Next run | Computed from saved schedule (manual / pending scheduler labeled) |
| Current activity | Review status mapping (Idle / Auditing / Failed / …) |

Missing data uses **Unknown / Not recorded / Not configured / Unavailable** — no fake green.

## 4. Hermes connection model

Owner model fields: `agentId`, `connectionStatus`, `lastHealthCheckAt`, `lastSuccessfulRetrievalAt`, `assignedMemoryCount`, `enabledMemoryCount`, `pendingApprovalCount`, `retrievalStatus`, `lastError`.

**Facts:**
- Fleet Hermes advisory transport health exists (`/api/agentops/hermes`).
- **No per-agent Hermes connection row** exists today.
- UI states this explicitly; Test Hermes connection performs safe read-only health + memory query.

## 5. Schedule model

Extended `aixia:schedule:<json>` on agent tools (v2 fields + legacy compatibility).

Fields: enablement, work types, frequency (manual / hours / days / weeks / days+time), timezone, scope, overlap rules, notify flags, max duration, owner approval required.

Minimum recurrence: **1 hour**.

## 6. Scheduler connection

**PENDING.** No hourly Option C tick exists today. Fleet GHA remains `*/6` + daily 12-agent review. UI labels **Pending scheduler connection** and does not edit GitHub cron per agent.

## 7. Memory model

Table: `agentops_agent_memory` (+ metadata for title, ownerFacingType, scope, approvalStatus, file path).

Owner types: Instruction, Approved fact, Procedure, Preference, Website architecture note, QA rule, Known issue, Lesson learned, Reference file.

Scopes: private / shared / global (stored in metadata).

## 8. File management

Upload via existing `uploadAgentOpsChatAttachment` → pending memory row (`approvalStatus: pending_approval`, `active: false`). Path stored; no auto-Hermes activation.

## 9. Owner approval flow

- Save draft → pending, inactive  
- Approve and activate → active only after owner action  
- Enable / Disable via `setAgentOpsAgentMemoryActive`  
- Agents/Hermes may propose; owner gates permanent use

## 10. Results / run drawer

Compact findings slice (Top 10 scoped to agent) + drawer with honest **Not recorded** fields when absent. Links to Issues + Monitoring.

## 11. Permissions

Collapsed read-only matrix: inspect/propose allowed; modify code / PR / deploy **Blocked**. No permission write API on this page.

## 12. Activity

Operational filter, latest 5. Chat messages excluded.

## 13. Responsive QA

Layout: header/status full width; chat full width; schedule + memory 2-col on desktop (`lg`); stack on tablet/mobile; drawer full-width sheet on small screens.  
Live viewport matrix: fill after staging Preview QA.

## 14. Live functional QA

Fill after Preview alias QA on: system-agent, memory-agent, qa-agent, design-agent, analytics-agent.

## 15. Security and governance

- Staging-only policy preserved  
- Owner gate required  
- No auto memory apply / PR / deploy  
- Run audit / Browser QA buttons disabled and labeled Not connected yet  
- Chat TTS/STT paths unchanged  
- Vercel function count unchanged (9/12)

## 16. Migrations

**None.** Schedule persists in tools tags; memory uses existing `agentops_agent_memory` + metadata. Future Option C hourly tick + dedicated schedule table deferred.

## 17. Commits

| Commit | Message | Notes |
|---|---|---|
| `ccd1473e` | Rebuild AgentOps agent detail foundation | C1–C4 co-shipped (shared page requires schedule/memory/results panels wired together) |
| (follow-up) | Document AgentOps agent detail control center | Verify scripts + this report |

## 18. Deployment

Push `origin/staging` → Vercel Preview → alias `https://ai-xia-staging.vercel.app` when Ready. No `--prod`, main untouched.

## 19. Known limitations

- Scheduler execution not connected (config + next-run only)  
- Hermes not agent-specific  
- Single-agent Run audit / Browser QA not connected  
- Local `npm run build` may fail while unrelated untracked WIP exists; Preview builds from clean git  
- Shared/global memory scope is metadata-tagged (no multi-agent assignment picker backend yet)  
- File replace/remove UX partial (pending + disable supported)

## 20. Next work

1. Hourly staging scheduler tick reading saved schedules  
2. Dedicated schedule table if tools-tag capacity becomes limiting  
3. Wire Run audit / Browser QA to real owner-gated paths  
4. Agent-scoped Hermes health probe if product requires it  
5. Richer file lifecycle (replace/remove + signed download)  
6. Owner live QA sign-off

---

## FINAL VERDICT

| Check | Result |
|---|---|
| ALL_12_AGENTS_USE_SHARED_PAGE | YES |
| PAGE_SIMPLE_AND_CONTROL_FOCUSED | YES |
| OLD_REPORT_SECTIONS_REMOVED | YES |
| AGENT_STATUS_VISIBLE | YES |
| HERMES_STATUS_VISIBLE | YES |
| HERMES_STATUS_REAL | YES (fleet transport) / agent-specific NOT_MEASURABLE |
| MEMORY_STATUS_VISIBLE | YES |
| LAST_SCAN_VISIBLE | YES |
| NEXT_RUN_VISIBLE | YES |
| CURRENT_ACTIVITY_VISIBLE | YES |
| AGENT_CHAT_WORKS | PENDING (live QA) |
| CHAT_TTS_WORKS | PENDING (live QA; regression scripts PASS) |
| CHAT_STT_WORKS | PENDING (live QA; regression scripts PASS) |
| TAB_SWITCH_DRAFT_PRESERVED | PENDING (live QA) |
| SCHEDULE_PANEL_VISIBLE | YES |
| AUDIT_SCHEDULING_CONFIGURABLE | YES |
| BROWSER_QA_SCHEDULING_CONFIGURABLE | YES |
| HOURLY_DAILY_WEEKLY_SUPPORTED | YES |
| SCHEDULE_PERSISTS | YES |
| SCHEDULER_EXECUTION_CONNECTED | PENDING |
| SCHEDULE_CONNECTION_HONEST | YES |
| OVERLAP_PREVENTION_CONFIGURED | YES |
| MEMORY_PANEL_VISIBLE | YES |
| TEXT_MEMORY_CREATE_EDIT_REMOVE | YES (create/edit/disable; delete not unbounded) |
| FILE_MEMORY_ADD_REMOVE_REPLACE | PARTIAL (add + pending; replace/remove later) |
| MEMORY_ENABLE_DISABLE | YES |
| AGENT_PRIVATE_MEMORY_SUPPORTED | YES |
| SHARED_MEMORY_SUPPORTED | YES (metadata scope) |
| GLOBAL_APPROVED_MEMORY_SUPPORTED | YES (metadata scope) |
| PENDING_APPROVAL_SUPPORTED | YES |
| NO_AUTOMATIC_MEMORY_APPLICATION | YES |
| HERMES_TEST_CONNECTION_WORKS | YES (safe read) |
| RESULTS_PANEL_COMPACT | YES |
| LATEST_RUN_DRAWER_WORKS | YES |
| FINDINGS_LINKS_WORK | YES |
| PERMISSIONS_VISIBLE | YES |
| AUTOMATIC_CODE_CHANGE_BLOCKED | YES |
| ACTIVITY_OPERATIONAL_ONLY | YES |
| PANEL_ERRORS_ISOLATED | YES |
| NO_FAKE_STATUS_VALUES | YES |
| RESPONSIVE_DESKTOP_PASS | PENDING |
| RESPONSIVE_TABLET_PASS | PENDING |
| RESPONSIVE_MOBILE_PASS | PENDING |
| FUNCTION_COUNT_WITHIN_BUDGET | YES (9/12) |
| BUILD_GREEN | PENDING (Preview; local WIP can fail tsc) |
| COMMITTED_TO_ORIGIN_STAGING | PENDING |
| VERCEL_STAGING_DEPLOY_GREEN | PENDING |
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| OWNER_ACCEPTS_AGENT_DETAIL_PAGE | PENDING |
