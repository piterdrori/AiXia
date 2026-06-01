# AgentOps Phase 7A - Archive / Learning Memory Plan Report

## Purpose

Design the archive/learning memory flow and lesson candidate contract so verified fixes can become reviewable, approval-gated lessons and later reusable memory.

## Files created

- `qa-agent/memory-learning/lesson-candidate-contract.json`
- `qa-agent/memory-learning/archive-learning-flow.md`
- `qa-agent/memory-learning/lesson-approval-policy.md`
- `qa-agent/memory-learning/hermes-memory-strengthening-role.md`
- `qa-agent/memory-learning/agentmemory-indexing-plan.md`
- `qa-agent/agentops/AGENTOPS_PHASE_7A_ARCHIVE_LEARNING_MEMORY_PLAN_REPORT.md`

## Files modified

- None

## Lesson candidate contract summary

- Added a planning contract for lesson candidates with required source metadata, classification (`lessonType`), applicability (`appliesTo`), memory scope (`memoryScope`), approval state, and indexing flags.
- Contract enforces explicit approval state tracking and retains provenance fields for agent/Hermes/Piter/verification/Cursor-report proposal origins.

## Archive learning flow summary

- Documented full lifecycle from issue discovery to verified-fix to lesson candidate to owner approval.
- Explicitly defined downstream indexing and future retrieval use, with approval gating preserved at each durable-memory step.

## Approval policy summary

- Every candidate requires Piter decision.
- Reject blocks memory write.
- Needs cleanup keeps candidate in draft/pending state.
- Shared lesson propagation requires explicit shared approval.
- Design-system and prompt-quality lessons have dedicated policy boundaries.

## Hermes role summary

- Hermes is defined as essential for lesson interpretation, deduplication, contradiction detection, scope recommendations, and prompt/memory quality strengthening.
- Hermes remains advisory for durable memory decisions; owner approval remains mandatory.

## agentmemory plan summary

- Documented future indexing plan for approved lessons only.
- Clarified that agentmemory-style layer is retrieval/search/timeline projection and not the durable source of truth.
- Kept static files as review/export artifacts.

## Knowledge page placement

Future placement in `/system/agent-ops/knowledge`:

1. Lesson Candidates
2. Approved Lessons
3. Rejected / Needs Cleanup
4. Agent Memory Impact
5. Hermes Memory Strengthening
6. agentmemory Index Status
7. Similar Issue Recall

No UI implementation was added in this phase.

## What was not implemented

- no runtime memory integration
- no agentmemory activation
- no Hermes runtime
- no local LLM runtime
- no CodeGraph runtime
- no automatic lesson generation
- no automatic memory write
- no schema/RLS/migration
- no app behavior change
- no production/main changes

## Validation results

- `npm run qa:validate-foundation` -> **PASS**

## Next recommended phase

- Phase 7B: controlled implementation plan for lesson-candidate generation triggers and review queue wiring (still manual-first, approval-gated, staging-only), before any runtime indexing activation.
