# AgentOps Stage 8B Import and Refill Report

## Purpose
Import static findings into staging backlog and refill Active Top 10.

## Environment
- project: aixia-staging
- project ref: ydppcpbxrvvardeslzrk
- route: /system/agent-ops
- user: owner (Piter scope)

## Import Method
SQL import file (applied to staging via Supabase MCP `execute_sql`).

## Import Result
- candidates: 10
- inserted: 10
- skipped duplicates: 0
- errors: 0

## Refill Result
- active before: 2
- backlog before: 13
- open slots before: 8
- promoted: 8
- active after: 10
- backlog after: 5
- open slots after: 0

## Validation SQL Results
- imported_static_count: 10
- active_open_count: 10
- backlog count (queue_state/status aggregate):
  - active_top_10 / Active Top 10 = 9
  - active_top_10 / Marked Fixed by Piter = 1
  - archived / Deferred = 1
  - archived / False Positive = 1
  - archived / Verified Fixed = 1
  - backlog / Backlog = 5
- promotion_count: 8

## UI Result
- Active Top 10 visible: expected yes (data now present in staging)
- count: 10 open active rows by queue rule
- backlog visible: yes (5 backlog rows remain)
- Hermes meter visible: unchanged (no Hermes automation changes)
- low-backlog/new-scan notice behavior: should now depend on live `openSlots` and `backlogCount`; with 10 open active rows, empty/low-backlog notice should not show as “open slots” warning.

## Issues Found
- Refill summary query in one CTE execution returned stale aggregate values in the same statement, but follow-up validation queries confirmed correct final state (`active_open_count = 10`, `promotion_count = 8`, static rows promoted with ranks 2–9).

## Final Status
PASS

## Next Recommended Stage
Stage 9 — Browser QA runner foundation.
