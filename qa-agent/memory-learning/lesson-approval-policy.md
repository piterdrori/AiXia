# Lesson Approval Policy (Phase 7A)

## Core Policy

Every lesson candidate requires explicit Piter approval before durable memory persistence.

## Approval Rules

1. Every lesson candidate requires Piter approval.
2. Lesson can be edited before approval.
3. Reject means no durable memory write.
4. Needs cleanup means candidate stays draft/pending.
5. Approved lessons become durable memory.

## Scope Rules

- Agent-specific lessons update only target agent memory scope.
- Shared lessons require explicit shared approval.
- Issue-specific lessons stay attached to issue context if not approved for reusable memory.

## Content Rules

- Lesson must be plain-language and actionable.
- Lesson must include applicability scope.
- Lesson must include do-not-repeat guidance.
- No secrets/credentials/private sensitive data.

## Domain-Specific Rules

- Design-system lessons must point to design source of truth (shared component/CSS ownership).
- Prompt-quality lessons affect future Cursor prompt style and review workflow guidance.

## Status Definitions

- **draft:** initial candidate, not ready for final decision
- **pending_review:** owner review queue
- **approved:** durable memory allowed
- **rejected:** blocked from durable memory
- **needs_cleanup:** requires edits before decision

## Non-Goals (Phase 7A)

- No automatic candidate generation runtime.
- No automatic approval flow.
- No schema/runtime activation in this phase.
