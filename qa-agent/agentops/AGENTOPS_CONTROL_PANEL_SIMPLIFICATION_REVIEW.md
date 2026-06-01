# AgentOps Control Panel Simplification Review

Date: 2026-05-28  
Route: `/system/agent-ops`  
Scope: UI/UX information architecture simplification with progressive disclosure only

## Current Sections Found

- Hero with broad metrics and mixed operational actions.
- Tabs: Today's Work, Generate Issues, Fix Workflow, Agents, System & Readiness, History.
- Large visible surfaces across tabs:
  - Queue and verification tables
  - Import tools and candidate review
  - Fix plan review and cursor handoff workflow
  - Scheduler/readiness and command blocks
  - Agent memory/status/timeline/focus/ranking sections
  - Run/report/history tables and cards

## What Is Visible by Default Today (Problem)

- Too many technical sections render immediately per tab.
- Daily-operational and advanced/technical workflows are mixed.
- Multiple full-width tables are shown before user intent is clear.
- Many warnings/instructions compete with priority actions.

## What Should Remain Visible by Default

- Top control-center summary (attention now, queue health, next action, readiness).
- One clear “Today’s Priority” card.
- Small daily summaries in Today tab:
  - verification pending summary
  - compact active queue preview
  - backlog summary
- Agent quick status + needs-attention filter in Agents tab.
- Automation high-level state (manual/prep-only, scheduler off, quiet mode, latest run, suggested command).

## What Should Move Behind Collapsibles / Advanced

- Import tools and candidate review technical details.
- Detailed workflow/fix-plan/cursor handoff flows.
- Large technical command lists and runbook guidance.
- Memory file review, refresh plans, timeline detail tables, and sync-plan technical notes.
- Ranking preview/focus directive operational details when not needed for daily decisions.

## Proposed Final Tab Structure

- `Today`: daily priorities and compact queue view.
- `Issues`: full queue management + verification + import tooling (with collapsibles).
- `Agents`: attention-first agent status; advanced agent/memory/timeline areas collapsed.
- `Automation`: operational posture and safe controls summary; scheduler/runbook details collapsed.
- `Advanced`: rare/technical workflows (fix plans, cursor handoff details, technical command/report surfaces).
- `History`: reports/logs/decision history with compact summaries first.

## Risks

- Large single-file page architecture means section movement can introduce regression in conditional rendering.
- Existing action handlers are extensive; must preserve all button paths and modal triggers.
- UX simplification must avoid accidentally hiding critical alerts that users rely on.

## What Will Not Change

- No changes to AgentOps business logic.
- No service function logic changes unless UI grouping requires minor wiring only.
- No Supabase query/RLS/schema/data changes.
- No scheduler activation or command execution from UI.
- No feature/functionality removal; only reorganization and disclosure strategy.
