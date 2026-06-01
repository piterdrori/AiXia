# AgentOps Scheduler Runbook (Future)

## Current status

**Not active. Preparation only.**

Stage 15 defines rules, safety gates, and UI for Owner planning decisions. No cron job, no background worker, and no 24/7 automation exists in this repository yet.

## Future scheduler flow (when explicitly approved)

1. **Check queue health** — read Active open count, open slots, backlog count, and recommended action (same logic as Stage 14 Queue Health).
2. **If Active Top 10 is full** — do nothing (no new scan flood).
3. **If open slots and backlog has promotable items** — suggest or perform refill **only if** future Owner-approved rules allow auto-refill on staging.
4. **If backlog is low or empty** — run scan candidates **only if** future Owner-approved (e.g. orchestrator `foundation`, `browser-smoke`, `workflow-safe`, `verification-dry-run`, `low-backlog-check`).
5. **Generate import plans** — CLI or orchestrator; never auto-import to Supabase.
6. **Wait for Owner review** — Import Candidate Review panel; approve sources/candidates before manual import.
7. **Never auto-fix** — no Cursor execution, no code changes from scheduler.
8. **Never production/main** — staging project and staging GitHub only.
9. **Record run report** — append to `qa-agent/reports/orchestrator/` and optional `agentops_runs` metadata.
10. **Pause/resume** — Owner sets `active: false` in prep rules or records `scheduler_paused` feedback; no runs while paused.

## Quiet mode

- **Quiet days:** Saturday, Sunday (configurable in `scheduler-prep-rules.json`).
- **Quiet rule:** Time alone does not create new issues. If Piter has not resolved items, do not open new findings just because a schedule tick occurred.
- **Full queue:** If Active Top 10 is full, skip new scans.
- **Refill vs scan:** Open slots + backlog → refill suggestion; open slots + empty/low backlog → scan/import suggestion.

## Allowed future run modes (candidates only)

| Mode | Purpose |
| --- | --- |
| `foundation` | Validate + static discovery/guardrails |
| `browser-smoke` | Browser QA (dev server required) |
| `workflow-safe` | Role workflow safe checks |
| `verification-dry-run` | Report-only verification orchestration |
| `low-backlog-check` | Queue health evaluation only (no shell side effects until approved) |

## Never auto-run

See `neverAutoRun` in `scheduler-prep-rules.json` — includes production deploy, main Supabase, migrations, RLS, Cursor fixes, destructive actions, verification apply, and unapproved DB imports.

## Owner approval required before activation

- Turning scheduler on
- Changing cadence
- Importing findings
- Applying verification results
- Cursor execution
- Any production/main migration

## Manual operations today (unchanged)

```bash
npm run qa:agentops-run -- --mode foundation
npm run qa:agentops-run -- --mode browser-smoke --continue-on-failure
```

Use AgentOps UI for refill, import review, fix plans, handoff, and verification — all Owner-controlled.

## Pause / resume (future)

1. **Pause:** Set `active: false` in approved config; record `scheduler_preparation_decision` or future `scheduler_paused` in Owner feedback.
2. **Resume:** Owner explicitly approves activation after checklist; cadence must be chosen; first run is manual observation recommended.
3. **Duplicate runs:** Enforce single in-flight run via lock file or `agentops_runs` status check before starting.

## Related documents

- `qa-agent/scheduler/scheduler-prep-rules.json`
- `qa-agent/scheduler/scheduler-safety-checklist.md`
- `qa-agent/orchestrator/orchestrator-config.json`
- `qa-agent/orchestrator/low-backlog-trigger-rules.json`
