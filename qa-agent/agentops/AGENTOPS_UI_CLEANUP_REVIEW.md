# AgentOps UI Cleanup Review

Review date: Stage UI cleanup (post–Stage 15). **No code changes in this document** — implementation follows in `page.tsx` only.

## Current sections found (load order)

| Order | Section / block | Type |
| --- | --- | --- |
| 1 | Hero + command metrics | Metrics, 6 hero actions (refill + 4 imports + refresh) |
| 2 | Action feedback banner | Global |
| 3 | Hermes Memory Support Meter | Full section |
| 4 | Verification Runner (Stage 12B) | Info block |
| 5 | AgentOps Manual Run Orchestrator (Stage 13) | Info block |
| 6 | Queue Health & Scan Trigger | Large section + nested Manual Scan / Import Workflow |
| 7 | Import Candidate Review | Large per-source tables |
| 8 | Scheduler Preparation | Full section |
| 9 | Fix Plan Generator (Stage 13B) | Info block |
| 10 | Fix Plan Review | Section + per-plan cards (includes Cursor handoff) |
| 11 | Verification Requests | Section (post–fix-report workflow) |
| 12 | Active Top 10 queue | Info block (after fix workflow) |
| 13 | Backlog empty / low hints | Conditional info blocks |
| 14 | Verification Queue | Section (pending verifications) |
| 15 | Active Top 10 Queue | Table |
| 16 | Backlog Preview | Section |
| 17 | Run History | Section |
| 18 | MVP Safety Notice | Section |

All modals remain at file bottom (unchanged behavior).

## Problems (crowding / confusion)

1. **Wrong visual priority** — Daily work (Active Top 10, backlog, verification queue) appears *below* queue health, import review, scheduler, and fix-plan panels.
2. **Hero action overload** — Six buttons (refill, four imports, refresh) compete for attention; imports belong with “generate issues” workflow.
3. **Duplicate import entry points** — Hero imports + Manual Scan / Import Workflow footer (four import buttons again) + Import Candidate Review per-source “Import…” buttons.
4. **CLI guidance scattered** — Orchestrator and verification runner sit between Hermes and operational panels; fix-plan generator info sits between scheduler and fix review.
5. **Queue Health is a wall** — Metrics, recommendation, commands, workflow steps, and import shortcuts stack in one scroll region.
6. **Stage labels everywhere** — “Stage 12B/13/14…” helpful for dev history but noisy for daily Owner use (keep safety text, soften stage IDs in titles).
7. **Scheduler preparation** — Important but not daily; should not sit mid-page above fix workflow.

## Duplicated or overlapping controls

| Control | Locations |
| --- | --- |
| Refill Queue | Hero, Queue Health panel, Manual workflow step |
| Import Static/Browser/Workflow/Write-Draft | Hero (×4), Manual workflow footer (×4) |
| Review / approve import | Import Candidate Review + legacy import review modal (14B) |
| Verification | “Verification Queue” vs “Verification Requests” (different flows — naming must stay clear) |

**Justified duplicates to keep:** Per-source “Open Import Modal” in Import Candidate Review; Refill in Queue Health when `canRefillNow` (same action, contextual).

**To remove:** Hero import quartet; Manual workflow footer import quartet (replace with pointer to Import Candidate Review + toolbar on Generate tab).

## Recommended grouping

### 1. Command Center (always visible below hero)

- Existing `AixiaCommandMetrics`
- Compact strip: queue health one-liner, scheduler “not active”, Hermes label
- Global action feedback + data error (unchanged)

### 2. Tab: Today’s Work (default)

- Active Top 10 info + backlog hints
- Active Top 10 table
- Verification Queue (pending)
- Backlog preview
- Optional banner: “N verification requests” → switch to Fix tab (no duplicate table)

### 3. Tab: Generate More Issues

- Import toolbar (four import buttons + manual-only label)
- Queue Health & Scan Trigger (trim nested duplicate imports)
- Manual Scan / Import Workflow
- Import Candidate Review

### 4. Tab: Fix Workflow

- Fix Plan Review (Cursor handoff stays on approved plans)
- Verification Requests

### 5. Tab: System & Automation Readiness

- Hermes Memory Support Meter
- Orchestrator + verification runner guidance (collapsed-style info blocks)
- Fix Plan Generator CLI hint
- Scheduler Preparation (de-emphasized, preparation-only badge)
- MVP Safety Notice

### 6. Tab: Reports & History

- Run History
- Paths to latest orchestrator / verification reports (short list from existing copy)

## Collapse / de-emphasize by default

| Panel | Treatment |
| --- | --- |
| Scheduler Preparation | Advanced tab only; “Not active” badge in command strip |
| Orchestrator / verification CLI examples | Advanced tab |
| Hermes details | Advanced tab; one-line in command strip |
| Manual Scan workflow steps | Generate tab; keep expandable feel via section spacing |
| MVP Safety | Advanced tab bottom |

## Recommended page structure (tabs)

Use simple tab buttons (AiXia design system — no new dependency). Default: **Today’s Work**.

```
[ Today’s Work | Generate Issues | Fix Workflow | System & Readiness | History ]
```

## What will not change

- All service calls and handlers
- All modals and confirmation flows
- Owner gate
- RLS / Supabase / schema
- Scheduler `active: false`
- No CLI execution from UI
- Safety warnings (manual only, no auto-import, no scheduler)

## Risks

| Risk | Mitigation |
| --- | --- |
| Missing a panel after tab move | Checklist in cleanup report; build + manual smoke |
| User expects imports in hero | Import toolbar prominent on Generate tab + subtitle on hero |
| Breaking JSX structure | Conditional wrappers only; no handler changes |
| File size | Still one file; future extract components optional |

## Implementation notes

- Modify only `src/app/system/agent-ops/page.tsx` unless compile requires otherwise.
- Softer section titles (drop “Stage N” from headings where redundant).
- Add `agentOpsActiveTab` state; preserve all existing state and callbacks.
