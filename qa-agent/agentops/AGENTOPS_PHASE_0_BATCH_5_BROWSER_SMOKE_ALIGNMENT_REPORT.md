# AgentOps Phase 0 Batch 5 - Browser Smoke Alignment Report

## Problem found

After Phase 0 Batch 3 and Batch 4 UI simplification, three optional browser smokes were still asserting old layout assumptions:

- old section names and button labels
- old always-visible panel expectations
- old CodeGraph placement/locator assumptions
- old Future Intelligence placeholder checks

This caused failures/hangs despite the current UI working as intended.

## Tests modified

- `qa-agent/browser-qa/tests/agentops-issue-workspace-phase-3b-smoke.spec.mjs`
- `qa-agent/browser-qa/tests/agentops-agent-clarification-phase-4b-smoke.spec.mjs`
- `qa-agent/browser-qa/tests/agentops-codegraph-discovery-phase-6c-smoke.spec.mjs`

## Selectors updated

### Issue Workspace smoke

- Updated readiness checks from old copy to `Issue-solving workbench`.
- Updated issue-list heading expectation to `Issues`.
- Updated route-open checks to current `Issues` back button / workbench markers.
- Updated prompt controls to current labels (`Copy Prompt`, `Prepare Execution Request`, `Cursor prompt / execution`).

### Agent Clarification smoke

- Updated panel target from old `Agent clarification` to current `Agent chat`.
- Updated textarea selector to `Ask the issue-solving agent…`.
- Updated intent chips (`Clarify issue`, `Review risks`, `Recommend next step`, `Improve prompt`).
- Fixed duplicate `Improve Prompt` strict-selector conflict by scoping intent chip selector to non-`AixiaButton` chip buttons.

### CodeGraph Discovery smoke

- Updated locator from old visible section assumptions to current collapsed summary:
  - `CodeGraph technical details`
- Updated panel handling from old section-card shape to current `<details>` disclosure structure.
- Updated append-action selector to current `Append CodeGraph Hints to Prompt`.

## Collapsed / progressive disclosure handling

Implemented explicit progressive-disclosure-aware checks:

- Validate collapsed sections are reachable (not necessarily visible by default).
- For `Post-Cursor Review`, check default collapsed state before relevant state and expand only for inspection.
- For CodeGraph technical details, assert collapsed-by-default then expand before checking hints/status.
- Removed assumptions that technical cards are always expanded.

## App files changed

None.

No application source file was modified for Batch 5.

## Smoke test results

- `npm run qa:agentops-issue-workspace-smoke` -> PASS
- `npm run qa:agentops-agent-clarification-smoke` -> PASS
- `npm run qa:agentops-codegraph-discovery-smoke` -> PASS

## Validation results

- `npm run build` -> PASS (with pre-existing unrelated AiXia standards warnings)
- `npm run qa:validate-foundation` -> PASS
- `npm run qa:static-design-guardrails` -> PASS
- `npm run qa:guardrail-action-plan` -> PASS

## Remaining concerns

- Build emits many pre-existing guardrail warnings in unrelated Finance areas; not part of this batch.
- Smoke tests now align with current simplified UX, but future UI text changes should continue using stable section summaries/labels to avoid brittle regressions.

## Next recommended batch

Phase 0 Batch 6: add lightweight `data-testid` anchors for key AgentOps smoke checkpoints (workbench, post-cursor summary, technical status, codegraph details) to make future smoke maintenance resilient to wording tweaks while preserving current UI.
