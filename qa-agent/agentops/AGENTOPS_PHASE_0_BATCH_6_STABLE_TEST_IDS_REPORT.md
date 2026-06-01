# AgentOps Phase 0 Batch 6 - Stable Test IDs Report

## Problem found

Phase 0 Batch 5 made the smoke tests pass, but selectors still depended on visible labels and wording. Minor UI copy/layout polish could break smoke tests even when behavior remained correct.

## Files modified

- `src/app/system/agent-ops/issues/[issueCode]/page.tsx`
- `qa-agent/browser-qa/tests/agentops-issue-workspace-phase-3b-smoke.spec.mjs`
- `qa-agent/browser-qa/tests/agentops-agent-clarification-phase-4b-smoke.spec.mjs`
- `qa-agent/browser-qa/tests/agentops-codegraph-discovery-phase-6c-smoke.spec.mjs`

## Files created

- `qa-agent/agentops/AGENTOPS_PHASE_0_BATCH_6_STABLE_TEST_IDS_REPORT.md`

## Test IDs added

Added stable anchors in Issue Workspace:

- `agentops-issue-workspace`
- `agentops-issue-header`
- `agentops-lifecycle-rail`
- `agentops-issue-workbench`
- `agentops-issue-context`
- `agentops-agent-chat`
- `agentops-agent-chat-input`
- `agentops-cursor-prompt-editor`
- `agentops-prompt-actions`
- `agentops-post-cursor-review`
- `agentops-cursor-report-form`
- `agentops-verification-area`
- `agentops-evidence-disclosure`
- `agentops-fix-plan-disclosure`
- `agentops-codegraph-details`
- `agentops-technical-status`
- `agentops-timeline-disclosure`
- `agentops-workspace-secondary-details`

## Tests migrated

### Issue Workspace smoke

- Migrated core workspace checks to `getByTestId(...)` for shell/header/lifecycle/workbench/context/prompt actions/editor/post-cursor/secondary disclosures.
- Kept text assertions only for semantic content checks (e.g., runtime inactive lines).
- Preserved progressive-disclosure behavior checks using `details[open]` state via test-id anchored sections.

### Agent Clarification smoke

- Migrated route readiness, chat panel, chat input, prompt editor/actions, and technical status selectors to test IDs.
- Kept intent chip and response-content checks text-based where behavior/content must be validated.

### CodeGraph Discovery smoke

- Migrated CodeGraph details disclosure and prompt editor selectors to test IDs.
- Continued collapsed-by-default expand-and-assert flow, now anchored by `agentops-codegraph-details`.

## App behavior changed

No.

Only `data-testid` attributes and non-behavioral wrappers were added for test anchoring.

## Smoke results

- `npm run qa:agentops-issue-workspace-smoke` -> PASS
- `npm run qa:agentops-agent-clarification-smoke` -> PASS
- `npm run qa:agentops-codegraph-discovery-smoke` -> PASS

## Validation results

- `npm run build` -> PASS (with existing unrelated AiXia standards warnings)
- `npm run qa:validate-foundation` -> PASS
- `npm run qa:static-design-guardrails` -> PASS
- `npm run qa:guardrail-action-plan` -> PASS

## Remaining selector risks

- Intent chip selection in Agent Chat remains text-based because these are dynamic UX controls where intent wording itself is part of expected behavior.
- Some safety/content assertions still rely on meaningful user-visible text (intentional).

## Next recommended batch

Phase 0 Batch 7: normalize smoke utilities into shared helpers (`getWorkspaceByTestId`, `openDisclosureByTestId`, `assertRuntimeInactive`) to reduce duplication and keep future smoke maintenance faster.
