# AgentOps Stage 7 Refill Promotion Report

## Purpose

Manual Active Top 10 refill from backlog plus a reusable refill engine for future Stage 7B auto-refill after owner actions. Keeps up to **10 active open** issues by promoting backlog rows only — no new findings, no scheduler, no browser QA.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/agentops/types.ts` | `AgentOpsRefillResult`, `AgentOpsPromotionCandidate`, `AgentOpsQueueRefillMode` |
| `src/lib/agentops/service.ts` | `refillAgentOpsActiveTop10FromBacklog()` + severity/rank helpers |
| `src/lib/agentops/index.ts` | Export new types and refill function |
| `src/app/system/agent-ops/page.tsx` | Refill Queue button, confirmation modal, queue info block, empty-backlog hint |

## Files Created

| File | Description |
|------|-------------|
| `qa-agent/agentops/AGENTOPS_STAGE_7_REFILL_PROMOTION_REPORT.md` | This report |

## New Service Function

### `refillAgentOpsActiveTop10FromBacklog()`

Returns `AgentOpsWriteResult<AgentOpsRefillResult>`.

1. **Owner gate** — `assertAgentOpsOwner()`
2. **Counts** — active open (`active_top_10` + non-closed status), `openSlotsBefore = max(0, 10 - activeOpenCountBefore)`, backlog count
3. **Full queue** — if `openSlotsBefore <= 0` → message: *"Active Top 10 is already full."*
4. **Backlog pool** — `queue_state = backlog`, `status` ∈ `Backlog` | `New`, up to 50 rows by `priority_score` / `created_at`
5. **Sort in TypeScript** — Critical → High → Medium → Low → Suggestion, then `priority_score` desc, then `created_at` desc
6. **Empty backlog** — message: *"No backlog findings available. Run AgentOps scan to generate more findings."*
7. **Rank assignment** — lowest available ranks 1–10 not occupied by current active rows
8. **Per candidate** — update finding: `queue_state = active_top_10`, `status = Active Top 10`, `top10_rank = slot`; insert `agentops_backlog_promotions` (`promoted_from: backlog`, `promoted_reason: Manual owner refill from AgentOps UI`, `queue_slot_number`)
9. **Re-count** — `activeOpenCountAfter`, `backlogCountAfter`, `promotedFindings[]`

**Reusable for Stage 7B** — same function can be called after Verified Fixed / Reject / Defer / False Positive without UI.

## Queue Logic

| Rule | Behavior |
|------|----------|
| Max active open | **10** — never promotes more than `openSlotsBefore` |
| No daily flood | Only fills **open slots**, not “10 new per day” |
| Always target 10 open | Design goal; manual refill restores count when slots exist |
| Closed findings | Never promoted (backlog filter + status `Backlog`/`New` only) |
| New findings | **Not created** in this stage |
| Auto-refill | **Not implemented** — manual button only |
| Page load | **Does not** auto-run refill |

## UI Added

| Element | Behavior |
|---------|----------|
| **Refill Queue** button | Hero actions; visible when `openSlots > 0` and `backlogCount > 0` |
| Helper copy | Info block + subtitle on promote behavior |
| **Empty backlog hint** | When `openSlots > 0` and `backlogCount === 0` |
| **Confirmation modal** | Shows active open, open slots, backlog, max promote count; confirm → `refillAgentOpsActiveTop10FromBacklog()` |
| Success/error banner | Same pattern as Stage 5/6; refreshes dashboard, active top 10, backlog, verifications, run history |

## Future Auto-Refill (Stage 7B)

Stage 7B can call `refillAgentOpsActiveTop10FromBacklog()` after:

- Verified Fixed  
- Rejected  
- Deferred  
- False Positive  

Stage 7 does **not** wire auto-refill yet.

## What Was Not Implemented

- No daily scheduler / cron  
- No browser QA / Playwright runner  
- No Hermes or CodeGraph automation  
- No auto-refill after owner actions  
- No new finding creation from refill  
- No API routes or Edge Functions  
- No schema / RLS / migration changes  
- No packages installed  

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** |
| `npm run qa:guardrail-action-plan` | **PASS** |

## Manual Smoke Test

**Not performed in this session.** Recommended on `AIXIA-SAMPLE-*` only:

1. Ensure &lt; 10 active sample findings and backlog has sample rows  
2. Click **Refill Queue** → confirm modal counts  
3. Confirm only open slots filled; active count ≤ 10  
4. Promoted rows leave backlog preview; appear in Active Top 10 with ranks  
5. Check `agentops_backlog_promotions` rows in DB if desired  
6. With open slots and empty backlog, confirm empty-backlog message  

## Next Recommended Stage

**Stage 7B — Auto-refill after owner actions** using `refillAgentOpsActiveTop10FromBacklog()` after archive actions that open slots.

**Or Stage 8** — browser QA / agent runs to generate new backlog findings when backlog is low.
