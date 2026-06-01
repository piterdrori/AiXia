# AgentOps Phase 0 Batch 14 - Council Chat Layout Correction Report

## Problem found

The Council page default layout was dominated by a large 12-agent card grid, making it feel like a dashboard instead of a group-chat room.

## Files modified

- `src/app/system/agent-ops/council/page.tsx`

## Files created

- `qa-agent/agentops/AGENTOPS_PHASE_0_BATCH_14_COUNCIL_CHAT_LAYOUT_CORRECTION_REPORT.md`

## Old layout issue

- The main visual was a heavy roster/card wall.
- Individual reply placeholders were represented as large agent cards instead of chat messages.
- Participants occupied primary space rather than being secondary.

## New group-chat layout

The page now follows a chat-room structure:

1. Hero/header remains (Council identity + inactive/runtime badges)
2. Compact Council status strip (pills/badges)
3. Main conversation thread container as primary content
4. Chat composer at bottom of thread (disabled)
5. Participants moved to collapsed compact disclosure

## How individual agent replies are represented

- Agents appear as compact conversation bubbles in one shared thread.
- Each reply includes:
  - initials/avatar
  - agent name
  - role/specialty text
  - status/attention badges
  - message content placeholder
- No large per-agent dashboard cards in the default view.

## How memory Yes/No scaffold is represented

- Each agent message bubble contains an inline planned memory-learning block:
  - `Suggested memory update: ...`
  - disabled `Yes`
  - disabled `No`
- This keeps memory approval inside conversation context instead of separate dashboard widgets.

## How participants are minimized/collapsed

- The 12-agent roster is now secondary via collapsed `Council participants (compact)` disclosure.
- Each participant row is compact (name, role/specialty, status badge, open-agent link).

## Confirmation no combined summary

- No combined Council Summary card added.

## Confirmation no system-level next action

- No system-level next action card added.
- Individual agent messages remain the unit of future recommendation.

## Runtime systems inactive

- Real chat runtime: inactive
- Local LLM runtime: inactive
- Hermes runtime: inactive
- CodeGraph runtime: inactive
- agentmemory/OpenMonoAgent/Supertonic/voice runtime: inactive
- Scheduler: inactive
- Cursor auto-execution: not added

## Logic preserved

- No service logic changes
- No Supabase schema/RLS/migration changes
- No production/main interaction

## Validation results

Required:

- `npm run build` -> PASS (with pre-existing unrelated AiXia standards warnings)
- `npm run qa:validate-foundation` -> PASS
- `npm run qa:static-design-guardrails` -> PASS
- `npm run qa:guardrail-action-plan` -> PASS

Optional smokes:

- `npm run qa:agentops-issue-workspace-smoke` -> PASS
- `npm run qa:agentops-agent-clarification-smoke` -> PASS
- `npm run qa:agentops-codegraph-discovery-smoke` -> PASS

## Remaining concerns

- Thread content remains placeholder-only until runtime phases are explicitly approved.
- Manual browser walkthrough was not executed in this report run.

## Follow-up correction note

- Memory approval prompt behavior was later tightened to be intent-gated in placeholder behavior:
  - do not show Yes/No after every reply
  - show Yes/No only when Piter clearly asks to remember/apply/learn for future use.
