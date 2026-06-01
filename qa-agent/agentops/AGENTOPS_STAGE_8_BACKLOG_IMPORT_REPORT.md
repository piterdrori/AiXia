# AgentOps Stage 8 Backlog Import Report

## Purpose

Generate and import new backlog findings when backlog is low or empty, using existing QA static outputs as the first safe backlog source. No browser automation, scheduler, or schema changes.

## Files Modified

- `src/lib/agentops/types.ts` — static import plan/result types
- `src/lib/agentops/service.ts` — preview + owner import from `public/agentops/static-import-plan.json`
- `src/lib/agentops/index.ts` — exports
- `src/app/system/agent-ops/page.tsx` — Import Static Findings UI, low-backlog notices
- `package.json` — `qa:agentops-static-import-plan` script

## Files Created

- `qa-agent/scripts/import-agentops-static-findings.mjs`
- `qa-agent/reports/agentops-static-findings-import.sql` (generated)
- `qa-agent/reports/agentops-static-findings-import.md` (generated)
- `public/agentops/static-import-plan.json` (generated for UI fetch)
- `qa-agent/agentops/AGENTOPS_STAGE_8_BACKLOG_IMPORT_REPORT.md`

## Import Source

`qa-agent/reports/guardrail-action-plan.json`

## Imported Candidate Types

- Actionable findings (`actionableFindings`)
- Review-needed findings (`reviewNeededFindings`)

## Skipped

- Out-of-scope findings
- False positive likely
- Positive/shared usage only
- Rows with `metadata.sample = true` (never touched)

## Import Method

**Dual path (SQL generated only — not auto-applied):**

1. **Node script** — `npm run qa:agentops-static-import-plan` reads the guardrail action plan and writes:
   - `qa-agent/reports/agentops-static-findings-import.sql` (`ON CONFLICT (issue_code) DO NOTHING`)
   - `qa-agent/reports/agentops-static-findings-import.md` (summary)
   - `public/agentops/static-import-plan.json` (for Owner UI import)

2. **Owner UI** — **Import Static Findings** on `/system/agent-ops` fetches the JSON plan and inserts backlog rows via authenticated Supabase client (RLS). Duplicates skipped by `issue_code`. **No auto-import on page load.**

SQL is **not** applied automatically in this stage. Apply on **staging only** with explicit approval.

## UI Behavior

- **Import Static Findings** button + confirmation modal (manual only)
- Empty backlog: guidance to run static import or future browser QA
- Low backlog (`backlogCount < openSlots`): warns refill cannot fill all slots
- After import: refresh dashboard, backlog, active top 10; use Refill Queue or auto-refill

## What Was Not Implemented

- No browser QA runner
- No daily scheduler / cron
- No Hermes runtime automation
- No CodeGraph runtime automation
- No production data changes
- No schema / RLS / migration changes
- No API routes or Edge Functions
- No auto-import on page load
- No service-role usage in frontend or script

## Next Recommended Stage

**Stage 8B** — Apply static import SQL to staging (if not using UI import), verify backlog count, run Refill Queue / slot-opening auto-refill to reach 10 active.

**Stage 9** — Browser QA runner foundation (generates backlog from live flows).
