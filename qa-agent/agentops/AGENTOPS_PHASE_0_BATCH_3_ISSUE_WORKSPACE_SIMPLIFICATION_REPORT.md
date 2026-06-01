# AgentOps Phase 0 Batch 3 — Issue Workspace Simplification Report

## Purpose

Simplify `/system/agent-ops/issues/[issueCode]` into a clean issue-solving workbench while preserving all existing backend actions and manual-first workflow logic.

## Problem found

The workspace was functionally complete but visually overloaded: many stacked cards (summary, evidence, reporting agent, fix plan, agent clarification, CodeGraph, prompt, report, verification, closure, timeline, placeholders, owner note) created a technical wall and pushed the real flow (chat + prompt + execution decisions) apart.

## Files modified

- `src/app/system/agent-ops/issues/[issueCode]/page.tsx`

## Files created

- `qa-agent/agentops/AGENTOPS_PHASE_0_BATCH_3_ISSUE_WORKSPACE_SIMPLIFICATION_REPORT.md`

## Sections merged into main workbench

The new **Issue-solving workbench** now combines:

- compact issue context (what is wrong, expected behavior, why it matters)
- agent chat (conversation + ask controls)
- Cursor prompt editor and main prompt/execution actions
- optional action note input (folded into workbench details)

## Sections collapsed

Moved behind collapsible `<details>` blocks:

- Evidence / Source
- Fix plan details
- CodeGraph technical details
- Post-Cursor Review (report + verification + closure actions)
- Timeline
- Technical status

## Sections removed from default view

Removed as always-visible standalone cards:

- Reporting Agent card (moved into hero/workbench)
- Agent Clarification technical wall (Hermes/runtime details no longer front-and-center)
- CodeGraph large suggestion-card wall
- Separate Cursor Report card
- Separate Verification card
- Future Intelligence Placeholders card
- Owner note card

## CodeGraph handling

- CodeGraph is now treated as background support in a collapsed technical section.
- Default view shows no large suggestion review wall.
- Hints can still be appended explicitly to prompt draft via one button.
- Runtime remains inactive/mock-safe; no MCP/browser/repo scan activation added.

## Hermes/chat handling

- Chat is now central in the workbench.
- UI status line simplified: Hermes planned, mock/local active, memory planned.
- Existing mock adapter flow and message recording remain unchanged.
- Technical Hermes gate details moved into collapsed technical status.

## Cursor Prompt handling

- Prompt editor is integrated directly into the workbench.
- Main actions are in one area: Ask Agent, Improve Prompt, Append Suggestion, Copy Prompt, Approve Prompt, Prepare Execution Request, Mark Prompt Copied.
- Manual-first behavior preserved.

## Cursor Report / Verification handling

- Unified into one collapsed **Post-Cursor Review** section.
- Auto-open behavior is state-aware via existing execution state:
  - opens when execution/report/verification states are active.
- Verification controls and closure actions are nested under this section.

## Future placeholders handling

- Removed from visible primary flow.
- Replaced with a compact collapsed technical status section.

## Owner note handling

- Removed as standalone card.
- Preserved as optional input inside workbench details; same `note` variable still feeds existing actions.

## Actions preserved

All core actions remain available (same service calls):

- fix plan decisions
- execution request prep
- cursor handoff status updates
- cursor report recording
- verification request/command/result actions
- follow-up, reject, false positive, defer, reopen

## Logic preserved

- No service-function deletion or rewrite.
- No Supabase query/schema/RLS/migration changes.
- Existing lifecycle derivation and rail logic preserved.
- Existing state-driven execution workflow preserved.

## Validation results

- `npm run build` -> **PASS**
- `npm run qa:validate-foundation` -> **PASS**
- `npm run qa:static-design-guardrails` -> **PASS**
- `npm run qa:guardrail-action-plan` -> **PASS**

Optional smoke commands attempted:

- `npm run qa:agentops-issue-workspace-smoke`
- `npm run qa:agentops-agent-clarification-smoke`
- `npm run qa:agentops-codegraph-discovery-smoke`

Result: all three exited because local dev server at `http://127.0.0.1:5173` was not running.

## Remaining concerns

- `Approve Prompt` and `Prepare Execution Request` currently call the same prepare action (explicit by design here); future batch can separate labels/intent if needed.
- Workbench is much cleaner, but post-cursor controls are still extensive when expanded; Batch 4 can further streamline action grouping text.

## Next recommended batch

**Phase 0 Batch 4 — post-cursor review polish:**

- streamline Post-Cursor Review controls and wording
- tighten verification/closure action hierarchy
- add smaller progressive disclosure for low-frequency actions
