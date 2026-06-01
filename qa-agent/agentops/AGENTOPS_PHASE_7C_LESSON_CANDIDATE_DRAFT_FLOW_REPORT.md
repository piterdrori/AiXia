# AgentOps Phase 7C - Lesson Candidate Draft Flow Report

## Purpose

Implement a controlled, owner-triggered draft lesson-candidate creation flow from verified-fixed issue lifecycle state, without enabling durable memory writes or runtime indexing.

## Files created

- `qa-agent/agentops/AGENTOPS_PHASE_7C_LESSON_CANDIDATE_DRAFT_FLOW_REPORT.md`

## Files modified

- `src/lib/agentops/types.ts`
- `src/lib/agentops/service.ts`
- `src/lib/agentops/index.ts`
- `src/app/system/agent-ops/issues/[issueCode]/page.tsx`
- `src/app/system/agent-ops/knowledge/page.tsx`

## Storage approach used

- Reused existing `agentops_owner_feedback` metadata pattern.
- Draft creation writes `metadata.action = "lesson_candidate_draft"`.
- Review decisions write `metadata.action = "lesson_candidate_decision"`.
- No new table was introduced.
- No schema/RLS migration was introduced.

## Service functions added

- `prepareAgentOpsLessonCandidateDraft(input)`
  - owner-requested gate (`ownerRequested: true`)
  - requires verified-fixed lifecycle state
  - builds contract-shaped draft metadata from issue context
  - stores draft in `agentops_owner_feedback`
  - stores pending-review status only
- `getAgentOpsLessonCandidateDrafts()`
  - reads draft + decision metadata rows
  - returns reviewable draft summaries for Knowledge page
  - overlays latest decision status on draft rows
- `recordAgentOpsLessonCandidateDecision(input)`
  - supports:
    - `approve_for_future_memory`
    - `reject_lesson`
    - `needs_cleanup`
    - `review_later`
  - records metadata only
  - does not write durable memory

## Issue Workspace UI changes

- Added compact lesson area in closure section.
- Shows guidance text:
  - "Learning lesson will be created after verified fix in Phase 7."
- When verified fixed and no draft:
  - shows `Prepare Lesson Candidate` action.
- If draft already exists:
  - shows status badge and `Open Knowledge` link.
- No large lesson form added.

## Knowledge page UI changes

- Lesson Candidates section now loads real draft candidates from service layer.
- Status counters now use loaded draft data.
- Empty state remains when no drafts exist.
- Per-draft review card shows:
  - source issue
  - lesson/problem/fix summary fields
  - approval status
  - memory scope
  - target agents
  - created date
- Added metadata-only actions:
  - Review Later
  - Needs Cleanup
  - Reject
  - Approve for Future Memory

## Approval decision behavior

- Decisions are recorded as review metadata in `agentops_owner_feedback`.
- `approve_for_future_memory` records intent only in this phase.
- No durable memory persistence is triggered.
- No retrieval/runtime indexing is triggered.

## Memory write status

- Durable memory writes: **disabled / not implemented**
- Draft/decision rows are metadata records only.

## Hermes / agentmemory runtime status

- Hermes runtime: **inactive**
- agentmemory runtime/indexing: **inactive**
- Local LLM runtime: **inactive**

## Schema / RLS status

- Schema changes: **none**
- RLS changes: **none**
- Migrations: **none**

## Validation results

- `npm run build` -> **PASS**
- `npm run qa:validate-foundation` -> **PASS**
- `npm run qa:static-design-guardrails` -> **PASS**
- `npm run qa:guardrail-action-plan` -> **PASS**
- `npm run qa:agentops-issue-workspace-smoke` -> **PASS**
- `npm run qa:agentops-agent-clarification-smoke` -> **PASS**
- `npm run qa:agentops-codegraph-discovery-smoke` -> **PASS**

## Remaining concerns

- Draft quality is intentionally conservative and placeholder-friendly when context is incomplete.
- Approval still remains metadata-only in this phase by design.
- Durable memory promotion flow is intentionally deferred.

## Next recommended phase

- Phase 7D: implement explicit owner-reviewed lesson detail editing and a separate controlled promotion step from approved intent to durable Supabase memory (still no automatic runtime indexing).
