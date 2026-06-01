# AgentOps Stage 7B Auto-Refill Report

## Purpose

Auto-refill Active Top 10 from backlog after owner actions open slots, and show a clear “new AgentOps scan needed” state when backlog is empty. Stage 7B does not create new findings, run browser QA, or add schedulers.

## Files Modified

- `src/lib/agentops/types.ts` — `refillResult` and `needsNewAgentOpsScan` on action result types (when not already present)
- `src/lib/agentops/service.ts` — `maybeRefillAgentOpsAfterSlotOpened`, auto-refill wiring, composed success messages
- `src/lib/agentops/index.ts` — export `maybeRefillAgentOpsAfterSlotOpened`
- `src/app/system/agent-ops/page.tsx` — auto-refill feedback, scan-needed notice, updated queue copy

## Files Created

- `qa-agent/agentops/AGENTOPS_STAGE_7B_AUTO_REFILL_REPORT.md`

## Auto-Refill Triggers

Auto-refill runs after these actions succeed (slot opened):

- Reject finding
- Defer finding
- Mark false positive
- Record verification result = **Verified Fixed**

## Non-Triggers

Auto-refill does **not** run after:

- Add remark
- Approve
- In progress
- Mark fixed by Piter
- Request verification
- Verification result = Still Broken
- Verification result = Needs Follow-Up Fix
- Verification result = Verification Blocked

## Refill Behavior

- Uses existing `refillAgentOpsActiveTop10FromBacklog()` via `maybeRefillAgentOpsAfterSlotOpened({ enabled: true })`
- Promotes only enough backlog items (`Backlog` / `New`) to fill open slots (max 10 active open)
- Never exceeds 10 active open issues
- Does not create new findings
- No auto-refill on page load
- No scheduler / cron

## Empty Backlog Behavior

When a slot opens and refill finds no promotable backlog candidates:

- `needsNewAgentOpsScan: true` on the action result
- User-facing message includes: “No backlog findings were available. New AgentOps scan needed to create more tasks.”
- Persistent dashboard notice when `openSlots > 0` and `backlogCount === 0`: “Open slots are available, but the backlog is empty. New AgentOps scan needed to create more tasks.”
- Stage 8 will generate/import backlog findings

## UI Feedback

- Success banner uses service-composed messages (promoted count, already full, or scan needed)
- Warning (gold) tone when `needsNewAgentOpsScan` is true
- Manual **Refill Queue** button unchanged
- Dashboard refresh after slot-opening actions (summary, active top 10, backlog, verifications, run history)

## What Was Not Implemented

- No new finding generation
- No daily scheduler
- No browser QA runner
- No Hermes automation
- No CodeGraph automation
- No API routes
- No SQL/schema/RLS changes
- No packages installed

## Next Recommended Stage

**Stage 8** — Generate/import new backlog findings when backlog is empty (browser QA, static report import, agent council scans).
