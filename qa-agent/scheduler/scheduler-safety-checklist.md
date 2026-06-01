# AgentOps Scheduler Safety Checklist

Use this checklist before any future decision to **activate** AgentOps scheduling on staging. Do not check boxes until you have personally verified each item.

**Current status:** Scheduler is **preparation only** and **not active**. No cron, no background worker, no automatic runs.

## Staging and environment

- [ ] Staging-only confirmed (`ydppcpbxrvvardeslzrk`)
- [ ] Main Supabase not used
- [ ] Production/main GitHub not used
- [ ] No production deploy

## Automation boundaries

- [ ] No auto-fix
- [ ] No auto-import without explicit Owner approval per run
- [ ] No Cursor execution from scheduler
- [ ] No verification apply without Owner approval (`--apply --owner-approved` remains manual)
- [ ] No payments, emails, payroll, or user invites from AgentOps automation

## Queue behavior

- [ ] Active Top 10 behavior understood (target 10 open; refill from backlog only when slots exist)
- [ ] Quiet mode understood (no new issues just because time passed; respect full queue and weekends)
- [ ] Duplicate-run avoidance understood (one run at a time; record orchestrator report)

## Operations

- [ ] Rollback/pause process understood (set `active: false` in rules; record Owner feedback; no silent runs)
- [ ] Owner approval required for turning scheduler on and changing cadence
- [ ] Import plans still require review before manual import even if scans run automatically in future

## References

- Preparation rules: `qa-agent/scheduler/scheduler-prep-rules.json`
- Runbook: `qa-agent/scheduler/scheduler-runbook.md`
- Queue health: AgentOps UI → Queue Health & Scan Trigger
- Orchestrator: `npm run qa:agentops-run` (manual today)
