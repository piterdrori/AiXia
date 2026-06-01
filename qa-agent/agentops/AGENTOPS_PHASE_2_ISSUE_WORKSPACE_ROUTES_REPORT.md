# AgentOps Phase 2 Issue Workspace Routes Report

## Purpose

Implement dedicated staging-safe Issue Workspace routing using existing AgentOps services and tables only.

Target routes implemented:
- `/system/agent-ops/issues`
- `/system/agent-ops/issues/[issueCode]`

No schema changes, no RLS changes, no migrations, no scheduler activation, no automatic Cursor execution.

---

## Files Created

1. `src/app/system/agent-ops/issues/page.tsx`
2. `src/app/system/agent-ops/issues/[issueCode]/page.tsx`
3. `qa-agent/agentops/AGENTOPS_PHASE_2_ISSUE_WORKSPACE_ROUTES_REPORT.md`
4. `qa-agent/prompt-standards/cursor-prompt-style-standard.md` (Phase 2 add-on)
5. `qa-agent/prompt-standards/cursor-prompt-template.md` (Phase 2 add-on)
6. `src/app/system/agent-ops/issues/normalizeCursorPrompt.ts` (Phase 2 add-on)

---

## Files Modified

1. `src/app/system/agent-ops/page.tsx`
2. `src/App.tsx`
3. `src/app/system/agent-ops/issues/[issueCode]/page.tsx` (Phase 2 add-on — Cursor Prompt Editor)
4. `qa-agent/agentops/AGENTOPS_PHASE_2_ISSUE_WORKSPACE_ROUTES_REPORT.md` (this file)

No changes were required in:
- `src/lib/agentops/types.ts`
- `src/lib/agentops/service.ts`
- `src/lib/agentops/index.ts`

---

## Routes Created

1. `/system/agent-ops/issues`
2. `/system/agent-ops/issues/:issueCode` (route form used by router; equivalent to `[issueCode]`)

---

## Service Functions Reused

### Issues list page
- `getAgentOpsOwnerStatus`
- `getAgentOpsActiveTop10`
- `getAgentOpsBacklogSummary`
- `getAgentOpsVerificationRequests`

### Issue workspace page
- `getAgentOpsOwnerStatus`
- `getAgentOpsActiveTop10`
- `getAgentOpsBacklogSummary`
- `getAgentOpsGeneratedFixPlans`
- `getAgentOpsFindingDetail`
- `getAgentOpsFixPlanDecisionHistory`
- `getAgentOpsCursorHandoffHistory`
- `getAgentOpsVerificationRequests`
- `recordAgentOpsFixPlanDecision`
- `createAgentOpsCursorHandoff`
- `recordAgentOpsCursorFixReport`
- `approveAgentOpsVerificationRequest`
- `recordAgentOpsVerificationCommandCopied`
- `markAgentOpsVerificationRunning`
- `recordAgentOpsManualVerificationResult`
- `requestAgentOpsFollowUpFix`
- `rejectAgentOpsVerificationRequest`
- `markAgentOpsFalsePositive`
- `deferAgentOpsFinding`
- `markAgentOpsInProgress`

---

## Service Functions Changed

None.

---

## Lifecycle Panels Implemented (Issue Workspace)

1. Issue Summary
2. Evidence / Source
3. Reporting Agent
4. Fix Plan (approve/reject/needs better/manual-used actions)
5. Cursor Prompt / Execution Request
   - **Cursor Prompt Editor** (12-section structured format per `qa-agent/prompt-standards/cursor-prompt-style-standard.md`)
   - Legacy fix-plan prompts normalized on display via `normalizeCursorPrompt`
   - Editable textarea for Piter before approval; approved text passed to `createAgentOpsCursorHandoff`
   - copy prompt
   - Approve & Prepare Execution Request
   - Mark Prompt Copied
   - Mark Cursor Working
   - Record Cursor Fix Report
6. Verification
   - Approve Verification Run
   - Copy Command
   - Mark Running
   - Record Verification Result
   - Request Follow-up Fix
   - Reject Verification Request
7. Closure / Archive
   - Verified Fixed
   - Still Broken
   - Follow-up Needed
   - Blocked
   - False Positive
   - Deferred
   - Reopen
8. Timeline (available owner feedback/handoff/verification events)
9. Future Intelligence Placeholders

---

## Phase 2 Add-on: Cursor Prompt Style Standard

### Spec and template

- `qa-agent/prompt-standards/cursor-prompt-style-standard.md` — required 12 sections (TASK through FINAL CHECK), quality rules, full example
- `qa-agent/prompt-standards/cursor-prompt-template.md` — reusable placeholder template for future agent-generated prompts

### Issue Workspace behavior

- Displays prompts in approved structured format
- Normalizes legacy `generate-agentops-fix-plans` prompts (and similar) into 12 sections when missing PURPOSE/READ FIRST/etc.
- Piter edits in textarea; handoff uses edited prompt as source of truth
- Manual-first language preserved; no automatic Cursor execution

### Constraints honored (add-on)

- No schema/migrations/RLS changes
- No auto Cursor execution
- No Hermes/CodeGraph runtime
- Staging-only language in spec and normalized prompts
- Reused existing services only (`createAgentOpsCursorHandoff`, fix plan/finding reads)

---

## Placeholder-Only (Not Implemented in Phase 2)

- Live agent chat runtime
- Hermes runtime integration
- CodeGraph runtime integration
- Similar past issues intelligence engine
- Automatic Cursor execution bridge

---

## Control Center Linking (Minimal)

`/system/agent-ops` was preserved and minimally linked:
- Added hero action button: `Open Issues Workspace`
- Added row action in existing issue table menus: `Open Workspace`

No existing tab workflows were removed.

---

## Safety Confirmations

- Existing services/tables only: **Yes**
- New schema created: **No**
- Migration files created/changed: **No**
- RLS changes: **No**
- UI shell command execution added: **No**
- Automatic Cursor execution added: **No**
- Scheduler activated: **No**
- Hermes runtime called/added: **No**
- CodeGraph runtime called/added: **No**
- Production/main touched: **No**

---

## Validation Results

1. `npm run build` — **PASS**  
   (Existing repository-wide guardrail warnings remain; build completed successfully.)
2. `npm run qa:validate-foundation` — **PASS**
3. `npm run qa:static-design-guardrails` — **PASS**
4. `npm run qa:guardrail-action-plan` — **PASS**

Re-run after Phase 2 Cursor prompt add-on (2026-05-28): all four commands **PASS** again.

---

## Next Recommended Phase 3 Prompt

`TASK: Implement AgentOps Staging Workflow Phase 3 — manual-first execution bridge hardening within Issue Workspace. Keep existing schema/services unless strictly required. Add explicit execution request states and stronger timeline/status normalization per issue, but do not enable automatic Cursor execution, scheduler activation, Hermes runtime, or CodeGraph runtime.`

