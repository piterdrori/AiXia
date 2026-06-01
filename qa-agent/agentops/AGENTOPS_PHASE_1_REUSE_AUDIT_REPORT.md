# AgentOps Phase 1 Reuse Audit Report

## 1) Executive Summary

This Phase 1 audit confirms the current AgentOps implementation already covers large parts of the approved staging lifecycle with owner-gated, metadata-first controls and strong staging safety boundaries.

Current state is **workflow-capable but execution-manual**:
- Discovery, queueing, fix-plan generation, prompt review, owner approvals, cursor handoff logging, cursor report intake, verification recording, and closure status mapping are present.
- Missing pieces for future phases are mainly runtime orchestration surfaces: dedicated Issue Workspace routes, live agent chat runtime, app-callable Hermes adapter, app-callable CodeGraph discovery, and automatic Cursor execution bridge.

Key conclusion for reuse-before-schema:
- Existing data model (`agentops_findings`, `agentops_owner_feedback`, `agentops_verifications`, `agentops_agent_memory`, plus metadata fields) can support **initial Issue Workspace** and **manual-first execution states** without immediate new tables.
- New schema should be deferred until Phase 2/3 evidence proves hard limitations (high-volume run-tracking, message threading performance, strict version histories).

Status: **Staging-safe foundation ready for Phase 2 route/UI consolidation and Issue Workspace implementation planning.**

---

## 2) Lifecycle Reuse/Gap Matrix

| # | Lifecycle stage | Existing support (tables/services/UI/artifacts) | Current status | Reuse now | Move to future Issue Workspace | New schema later? | Risk | Recommended next step |
|---|---|---|---|---|---|---|---|---|
| 1 | Find issue | `agentops_findings`, `agentops_runs`; services `getAgentOpsActiveTop10`, `getAgentOpsBacklogSummary`, import preview/import functions; Issues tab import + queue health sections; artifacts in `qa-agent/reports/browser-qa`, `qa-agent/orchestrator` | ready | Reuse fully | Show richer issue filters and assignment history in issue page | not required now | medium | Keep existing discovery/import services; expose as Issue list data source |
| 2 | Summarize issue | finding fields (`problem`, `evidence_summary`, `likely_root_cause`, `recommended_fix_strategy`), `getAgentOpsFindingDetail`, fix-plan summary files | partial | Reuse fields + detail fetch | Add issue-centric summary panel and timeline context | optional later | low | Compose summary card from existing finding + latest plan metadata |
| 3 | Create fix plan | `getAgentOpsGeneratedFixPlans`, fix-plan artifacts under `qa-agent/reports/fix-plans`, decision metadata in owner feedback | ready | Reuse fully | Embed plan selection/version history in issue page | optional later | low | Keep plan generator output as source-of-truth for first workspace version |
| 4 | Create Cursor prompt | prompt text already carried in findings/fix-plan + handoff payload (`createAgentOpsCursorHandoff`) | partial | Reuse prompt fields and handoff flow | Add editable prompt workspace with audit trail | optional later for prompt versions table | medium | Start with owner-feedback metadata version stamps before creating dedicated table |
| 5 | Piter approves | owner-gated writes + decision functions (`recordAgentOpsFixPlanDecision`, action modals), owner status check | ready | Reuse fully | Centralize all approvals in issue page action rail | not required now | low | Consolidate approval UI, keep service layer unchanged |
| 6 | Cursor fixes | handoff statuses exist (`ready_for_cursor`, `cursor_working`) and manual copy/request controls | partial (manual-first only) | Reuse status model + handoff history | Add explicit `Approve & Prepare Execution Request` flow in issue page | possible later for run-executor table | medium | Add staged manual execution request state using existing metadata first |
| 7 | Cursor reports back | `recordAgentOpsCursorFixReport`, `getAgentOpsCursorHandoffHistory`, verification request linkage | ready (manual intake) | Reuse fully | Show structured report panel and changed-files view in issue page | not required now | low | Normalize report rendering with existing metadata payload |
| 8 | AgentOps verifies | `getAgentOpsVerificationRequests`, `approve...`, `record...Result`, `requestAgentOpsFollowUpFix`; verification report artifacts | ready (manual execution) | Reuse fully | Move command recommendation + outcome logging into issue page | not required now | low | Keep CLI-driven verification; improve issue-scoped UX only |
| 9 | Issue closes or stays active | status mapping in types (`mapVerificationStatusToFindingStatus`, queue state mapping), status update services | partial | Reuse status logic fully | Add explicit close/reopen decision card per issue | optional later for closure policy table | medium | Add policy checks in UI first, defer schema |
| 10 | Archive / knowledge memory | archived queue state + agent memory files/reports (`qa-agent/memory-sync`, `qa-agent/agent-memory`) | partial / dry-run-heavy | Reuse archive status + memory artifacts | Add issue-to-memory references and category links in issue page | likely later for recurrence index | medium | Start by writing recurrence metadata into `owner_feedback.metadata` |
| 11 | Agent chat / memory | agent interactions + memory inputs via `agentops_owner_feedback` + `agentops_agent_memory`; Agents tab modals | partial (logging-only) | Reuse memory/interaction services | Issue-level chat thread should live in issue page | possible later for message thread table | high | Build mock-response chat layer over existing records first |
| 12 | Hermes adapter | readiness meter + status fields (`Database-only`, `appCallable=false`) and specs (`AGENTOPS_HERMES_CODEGRAPH_SPEC.md`) | planning only | Reuse readiness display/contracts | Show adapter readiness context in issue page | yes, only after adapter runtime exists | medium | Keep DB-only mode; implement adapter interface before runtime switch |
| 13 | CodeGraph integration | spec/docs only, not app-callable runtime | planning only | Reuse spec and evidence-note format | Add read-only “suggested files/components” slot in issue page | maybe later for persisted codegraph snapshots | medium | Discovery-first read-only suggestions, no prompt mutation |
| 14 | Recurring staging run every 2 hours | scheduler prep rules exist but `active=false`; orchestrator config allows safe modes only | dry-run/prep only | Reuse scheduler prep and orchestrator config | Add schedule status monitor in Automation/Advanced, not issue page core | not required now | high | Keep manual cadence now; add readiness gates before any 2-hour activation |

---

## 3) Existing Table Reuse Audit

### 3.1 Core tables requested

| Table | Observed usage | Reuse verdict | Notes |
|---|---|---|---|
| `agentops_findings` | Primary issue store: status, queue_state, severity, route/module, evidence/problem/root cause/prompt/metadata | strong reuse | Sufficient for Issue list + Issue Workspace base model |
| `agentops_owner_feedback` | Multi-purpose action/event log: approvals, decisions, handoff status, verification commands, agent interaction/status, scheduler/automation decisions | strong reuse (with discipline) | Heavy metadata polymorphism; workable now, may need normalization later |
| `agentops_verifications` | Verification records and outcomes, links to finding and expected/actual results | strong reuse | Already supports verify/close loop |
| `agentops_agent_memory` | Durable per-agent memory entries and memory review sources | reuse for memory foundation | Good for memory system baseline; no live runtime chat engine yet |
| `agentops_focus_directives` | Focus rules and ranking preview source | reuse for prioritization preview | Works for non-executing ranking recommendations |
| `agentops_backlog_promotions` | Promotion tracking during refill flow | reuse where relevant | Supports queue/refill history, helpful for issue lifecycle provenance |

### 3.2 Additional discovered AgentOps tables

| Table | Purpose | Reuse relevance |
|---|---|---|
| `agentops_runs` | Run metadata and summary snapshots | high (find/summarize/history) |
| `agentops_agent_opinions` | Agent opinions per finding | medium (future issue deliberation context) |
| `agentops_prompt_library` | Prompt artifacts and usage metadata | medium (future prompt versioning) |
| `agentops_evidence_files` | Evidence references including markdown/json/codegraph-note types | high (issue context and verification evidence) |

### 3.3 Reuse-first conclusion

No immediate schema change is required to start Phase 2 workspace routing and lifecycle consolidation.
Use existing tables plus `metadata` expansion first; revisit schema only after operational limits are observed.

---

## 4) Existing Service Function Map (from `src/lib/agentops/service.ts`)

### 4.1 Discovery / import
- `getAgentOpsActiveTop10`
- `getAgentOpsBacklogSummary`
- `getAgentOpsLatestRun`
- `getAgentOpsRunHistory`
- `getAgentOpsStaticImportPreview`
- `importAgentOpsStaticFindingsFromPlan`
- `getAgentOpsBrowserImportPreview`
- `importAgentOpsBrowserFindingsFromPlan`
- `getAgentOpsWorkflowImportPreview`
- `importAgentOpsWorkflowFindingsFromPlan`
- `getAgentOpsWriteDraftImportPreview`
- `importAgentOpsWriteDraftFindingsFromPlan`

### 4.2 Queue / refill
- `getAgentOpsQueueHealth`
- `recordAgentOpsQueueHealthDecision`
- `markAgentOpsScanNeeded`
- `getAgentOpsManualScanWorkflow`
- `recordAgentOpsManualScanStep`
- `refillAgentOpsActiveTop10FromBacklog`
- `maybeRefillAgentOpsAfterSlotOpened`
- `resolveAgentOpsBacklogFinding`

### 4.3 Fix plan / prompt
- `getAgentOpsGeneratedFixPlans`
- `recordAgentOpsFixPlanDecision`
- `getAgentOpsFixPlanDecisionHistory`
- `getAgentOpsFindingDetail`

### 4.4 Approval / owner actions
- `getAgentOpsOwnerStatus`
- `addAgentOpsOwnerFeedback`
- `approveAgentOpsFinding`
- `rejectAgentOpsFinding`
- `deferAgentOpsFinding`
- `markAgentOpsFalsePositive`
- `markAgentOpsInProgress`
- `markAgentOpsFixed`
- `addAgentOpsRemark`

### 4.5 Cursor handoff / report
- `createAgentOpsCursorHandoff`
- `recordAgentOpsCursorFixReport`
- `getAgentOpsCursorHandoffHistory`

### 4.6 Verification
- `getAgentOpsVerificationRequests`
- `approveAgentOpsVerificationRequest`
- `recordAgentOpsVerificationCommandCopied`
- `markAgentOpsVerificationRunning`
- `recordAgentOpsManualVerificationResult`
- `recordAgentOpsVerificationResult`
- `rejectAgentOpsVerificationRequest`
- `requestAgentOpsFollowUpFix`
- `requestAgentOpsVerification`
- `getAgentOpsPendingVerifications`

### 4.7 Backlog / archive
- `resolveAgentOpsBacklogFinding`
- status mapping via type helpers in `types.ts` (`mapVerificationStatusToFindingStatus`, `mapVerificationStatusToQueueState`)

### 4.8 Agent memory / interaction / timeline
- `getAgentOpsManagedAgents`
- `addAgentOpsAgentMemory`
- `getAgentOpsAgentMemory`
- `recordAgentOpsAgentInteraction`
- `getAgentOpsAgentInteractions`
- `getAgentOpsAgentStatusSummary`
- `updateAgentOpsAgentStatus`
- `getAgentOpsAgentStatusDashboard`
- `recordAgentOpsAgentStatusReview`
- `getAgentOpsAgentTimeline`
- `recordAgentOpsAgentTimelineReview`
- `getAgentOpsAgentTimelineOverview`
- `getAgentOpsAgentMemoryFileReview`
- `getAgentOpsAgentMemoryRefreshPlan`
- `recordAgentOpsMemoryRefreshDecision`

### 4.9 Focus directives
- `getAgentOpsFocusDirectives`
- `createAgentOpsFocusDirective`
- `updateAgentOpsFocusDirective`
- `getAgentOpsFocusRankingPreview`
- `recordAgentOpsFocusRankingDecision`

### 4.10 Scheduler / automation control
- `getAgentOpsSchedulerPreparationStatus`
- `recordAgentOpsSchedulerDecision`
- `recordAgentOpsAutomationControlRequest`
- `getAgentOpsAutomationControlRequests`

### 4.11 Reporting / history
- `getAgentOpsDashboardSummary`
- `getAgentOpsRunHistory`
- `getAgentOpsImportReviewSummary`
- `recordAgentOpsImportReviewDecision`
- `recordAgentOpsImportCandidateDecision`
- `getAgentOpsImportDecisionHistory`

Service map verdict: **broad lifecycle coverage already exists; main gap is orchestration mode (manual/request-only vs runtime execution).**

---

## 5) Current UI Section Map (`/system/agent-ops`)

Current tabs already match the simplified structure:
- `Today`
- `Issues`
- `Agents`
- `Automation`
- `Advanced`
- `History`

### 5.1 Mapping to future structure

| Future structure | Current support | Keep / move / hide |
|---|---|---|
| Control Center | Hero + Today Priority + command metrics + snapshots | keep in Today |
| Issues list | Issues tab has imports, queue health, scan workflow, fix plan review, top10/backlog controls | keep list-level controls; move issue-specific deep actions into Issue Workspace route |
| Issue Workspace page | not implemented as dedicated route | move fix-plan decision, prompt refinement, handoff/report/verification actions into future `/issues/[issueCode]` |
| Agents | Agents table, memory/interaction/timeline/focus panels present | keep; move issue-specific conversation context out of agent modal into issue workspace |
| Automation | Request-only panel + scheduler prep status + copy commands | keep; retain manual/request-only until staged bridge ready |
| Advanced | readiness/disclosures/manual-scan internals | keep but progressively disclosed |
| History | run/import decision histories present | keep; expose issue-scoped history in issue workspace too |

### 5.2 UI consolidation notes

- Current page is functionally rich but dense; many lifecycle actions are still distributed across tab sections and modals.
- For Phase 2, keep existing data sources but centralize issue-lifecycle actions in dedicated issue route instead of adding more modal depth.

---

## 6) What Can Be Reused Immediately

1. **Core issue model and queue logic** from `agentops_findings`.
2. **Owner decision and audit log pipeline** via `agentops_owner_feedback`.
3. **Cursor handoff/report functions** as manual-first execution bridge baseline.
4. **Verification request/result stack** and status-to-closure mapping.
5. **Fix-plan artifact ingestion** (`qa-agent/reports/fix-plans/*`) and fix-plan decision workflow.
6. **Agent memory foundations** (`agentops_agent_memory` + memory-sync artifacts).
7. **Scheduler prep safety framework** (`qa-agent/scheduler/*`, `qa-agent/orchestrator/orchestrator-config.json`).
8. **Focus directives preview engine** for ranking recommendations (non-executing).

---

## 7) What Needs New Schema Later (Only if proven necessary)

Not for immediate Phase 2. Candidate future additions only after reuse saturation evidence:

- Dedicated execution run table if owner-feedback metadata becomes insufficient for concurrency/idempotency/report callbacks.
- Dedicated prompt version table if prompt revisions per issue become too complex for metadata audit.
- Dedicated issue chat thread table if agent-owner conversation volume requires query/index optimization.
- Dedicated recurrence/knowledge index if archive search quality is inadequate with existing metadata tags.

Current recommendation: **defer all new schema proposals until after Issue Workspace adoption metrics.**

---

## 8) What Should Not Be Built Yet

1. Automatic Cursor execution trigger in UI (before manual-first staged bridge hardening).
2. Scheduler/cron activation (scheduler remains `preparation-only`, `active=false`).
3. Runtime Hermes execution (current mode remains database-only / appCallable false).
4. Runtime CodeGraph automation (discovery-first, read-only suggestion mode only in future phase).
5. Production/main deployments, schema migrations, RLS changes.
6. Any auto-close logic without explicit recorded verification outcomes.

---

## 9) Recommended Phase 2 Implementation Scope (Staging-safe)

Phase 2 should focus on **route and UX consolidation only**, reusing current services/tables:

1. Introduce issue routes:
   - `/system/agent-ops/issues`
   - `/system/agent-ops/issues/[issueCode]`
2. Keep popup/modal as preview only; move full issue lifecycle actions to issue page.
3. Wire existing services into issue workspace:
   - finding detail
   - fix plan + prompt decision
   - cursor handoff/report
   - verification request/result
4. Add manual-first execution states in UI language only (prepare request / pending / manual run) using existing metadata.
5. Keep scheduler, Hermes, and CodeGraph runtime disabled.
6. Preserve all owner gates and staging-only guardrails.

---

## 10) Do-Not-Change Guardrails (Confirmed)

- Staging only.
- No production/main changes.
- No schema migrations.
- No RLS changes.
- No scheduler or cron activation.
- No UI shell execution.
- No automatic Cursor fixing.
- No Hermes runtime automation.
- No CodeGraph runtime automation.
- Owner approval required for sensitive state transitions.

Evidence references:
- `qa-agent/agentops/AGENTOPS_STAGE_13D_CURSOR_HANDOFF_REPORT.md`
- `qa-agent/agentops/AGENTOPS_STAGE_13E_VERIFICATION_REQUEST_WORKFLOW_REPORT.md`
- `qa-agent/agentops/AGENTOPS_STAGE_15_SCHEDULER_PREPARATION_REPORT.md`
- `qa-agent/agentops/AGENTOPS_STAGE_16B_AGENT_INTERACTION_WINDOW_REPORT.md`
- `qa-agent/agentops/AGENTOPS_STAGE_16F_AGENT_MEMORY_REFRESH_WORKFLOW_REPORT.md`
- `qa-agent/agentops/AGENTOPS_STAGE_17_FOCUS_DIRECTIVES_ENGINE_REPORT.md`
- `qa-agent/agentops/AGENTOPS_HERMES_CODEGRAPH_SPEC.md`
- `qa-agent/orchestrator/orchestrator-config.json`
- `qa-agent/scheduler/scheduler-prep-rules.json`

