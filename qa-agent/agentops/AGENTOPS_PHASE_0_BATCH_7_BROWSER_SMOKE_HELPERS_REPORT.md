# AgentOps Phase 0 Batch 7 - Browser Smoke Helpers Report

## Problem found

After Batch 6, the three Issue Workspace smoke specs were stable with `data-testid` anchors, but still duplicated readiness, disclosure, and safety-check logic. This increased maintenance overhead and regression risk when selectors changed in one test but not others.

## Helpers created

Created shared helper module:

- `qa-agent/browser-qa/helpers/agentops-issue-workspace-helpers.mjs`

Included helpers:

- `getIssueWorkspace(page)`
- `expectIssueWorkspaceReady(page, options?)`
- `openDisclosureByTestId(page, testId, options?)`
- `expectProgressiveDisclosureReachable(page, testId, options?)`
- `expectRuntimeInactiveSafety(page)`
- `expectNoAutoExecutionLabels(page)`
- `appendCodeGraphHintsIfAvailable(page)`
- `askAgentIfAvailable(page, message, intent?)`

## Tests migrated

- `qa-agent/browser-qa/tests/agentops-issue-workspace-phase-3b-smoke.spec.mjs`
- `qa-agent/browser-qa/tests/agentops-agent-clarification-phase-4b-smoke.spec.mjs`
- `qa-agent/browser-qa/tests/agentops-codegraph-discovery-phase-6c-smoke.spec.mjs`

Migration details:

- Removed duplicated workspace-ready checks and replaced with `expectIssueWorkspaceReady`.
- Replaced repeated disclosure-opening code with `openDisclosureByTestId` / `expectProgressiveDisclosureReachable`.
- Centralized runtime-inactive and forbidden auto-execution checks via helper functions.
- Reused explicit CodeGraph append behavior through `appendCodeGraphHintsIfAvailable`.
- Reused Agent chat send flow through `askAgentIfAvailable`.

## Duplicated logic removed

- Workspace shell/header/lifecycle/workbench readiness assertions
- Repeated `<details>` open-state handling and summary-click patterns
- Runtime-inactive safety checks repeated across specs
- CodeGraph append boilerplate
- Agent chat send/retry boilerplate

## App files changed

None.

No app source files were modified for Batch 7.

## Smoke command results

- `npm run qa:agentops-issue-workspace-smoke` -> PASS
- `npm run qa:agentops-agent-clarification-smoke` -> PASS
- `npm run qa:agentops-codegraph-discovery-smoke` -> PASS

## Build/QA results

- `npm run build` -> PASS (with pre-existing unrelated AiXia standards warnings)
- `npm run qa:validate-foundation` -> PASS
- `npm run qa:static-design-guardrails` -> PASS
- `npm run qa:guardrail-action-plan` -> PASS

## Remaining helper risks

- A subset of assertions still intentionally rely on user-visible content text (e.g., runtime wording), because these checks validate user-facing safety messaging.
- Agent chat helper waits for enabled state and response markers; if response messaging changes significantly, this helper may need one small update used by all specs.

## Next recommended batch

Phase 0 Batch 8: add shared helper unit-style checks (lightweight self-test script) for helper edge cases (missing test-id, already-open disclosure, unavailable append button) to harden smoke infrastructure before next UI cleanup.
