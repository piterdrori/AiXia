# AgentOps UI Cleanup Report

## Purpose

Clean and organize `/system/agent-ops` for daily Owner use: clearer hierarchy, grouped workflows, fewer duplicate controls, and tabbed navigation — **without** changing AgentOps service logic, Supabase, or safety boundaries.

## Files Created

- `qa-agent/agentops/AGENTOPS_UI_CLEANUP_REVIEW.md` — pre-implementation UI review and recommended structure
- `qa-agent/agentops/AGENTOPS_UI_CLEANUP_REPORT.md` — this report

## Files Modified

- `src/app/system/agent-ops/page.tsx` — layout, tabs, command snapshot, hero actions, duplicate import removal

## Before

- Single long scroll: Hermes, CLI guidance, queue health, import review, scheduler, fix workflow, then daily queues at the bottom
- Hero had six actions (refill + four imports + refresh)
- Manual Scan workflow repeated four import buttons at the footer
- Stage labels and many info blocks appeared before Active Top 10 / backlog work
- Hard to see what to do first each day

## After

- **Command center snapshot** (always visible): queue health one-liner, Hermes score, scheduler status, active/verification counts
- **Five tabs** with badge hints on Today (pending verifications) and Fix (verification requests):
  1. **Today's Work** (default) — Active Top 10 info, backlog hints, Verification Queue, Active Top 10 table, Backlog preview; banner to Fix tab when verification requests exist
  2. **Generate Issues** — Manual import toolbar, Queue Health & Scan Trigger, Manual Scan workflow (no duplicate import row), Import Candidate Review
  3. **Fix Workflow** — Fix Plan Review (incl. Cursor handoff), Verification Requests
  4. **System & Readiness** — Hermes meter, verification runner + orchestrator CLI guidance, Fix Plan Generator CLI hint, Scheduler Preparation, MVP Safety Notice
  5. **History** — Run History
- **Hero** — Refill Queue (when applicable) + Refresh only; imports moved to Generate tab
- Clearer subtitle: UI does not run shell commands

## Sections Preserved

- Owner gate
- Hero metrics (`AixiaCommandMetrics`)
- Hermes Memory Support Meter
- Verification Runner guidance
- Orchestrator guidance
- Queue Health & Scan Trigger (decisions, scan needed, commands copy)
- Manual Scan / Import Workflow (steps, shortcuts, 14B review actions)
- Import Candidate Review (14C per-source / per-issue)
- Scheduler Preparation (inactive, feedback only)
- Fix Plan Generator info
- Fix Plan Review + decisions
- Cursor Handoff + fix report intake (on plans / modals)
- Verification Requests workflow
- Active Top 10 queue actions
- Verification Queue (pending manual verification)
- Backlog preview + resolve actions
- Refill Queue modal
- All import modals (static, browser, workflow, write/draft)
- Run History
- MVP Safety Notice
- All modals at page bottom (unchanged handlers)

## Logic Preserved

- **No changes** to `src/lib/agentops/service.ts`, `types.ts`, Supabase queries, RLS, schema, migrations, or API routes
- All existing service calls and handler functions unchanged
- Only JSX structure, labels, tab visibility, and control placement changed

## Safety Preserved

- Scheduler remains **not active** (`scheduler-prep-rules.json` unchanged; UI shows “Not active (prep only)”)
- **No command execution** from UI (copy-only / feedback recording)
- **No auto-import** on page load
- **No auto-fix** / no Cursor execution from UI
- **Staging only** — no production/main folder or Supabase touched

## Validation Results

| Command | Result |
| --- | --- |
| `npm run build` | Passed (exit 0) |
| `npm run qa:validate-foundation` | See run output below |
| `npm run qa:static-design-guardrails` | See run output below |
| `npm run qa:guardrail-action-plan` | See run output below |

Browser smoke on `/system/agent-ops` as Owner: optional (not run in this session).

## Next Recommended Stage

**Stage 16 — Agent Management UI** — dedicated agent roster/config surface if needed.

Alternative: **Stage 15B — Scheduler activation design** (still disabled until explicit Owner approval and separate safety review).
