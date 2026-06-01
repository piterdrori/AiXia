# Archive / Learning Flow (Phase 7A Plan)

## Purpose

Define the safe lifecycle for transforming verified fixed issues into reusable lesson memory with explicit owner approval.

## End-to-End Lifecycle

1. Issue is found.
2. Issue gets fix plan and Cursor prompt.
3. Piter approves prompt.
4. Cursor fixes.
5. Cursor report is recorded.
6. AgentOps verifies.
7. Issue is marked Verified Fixed.
8. Lesson candidate is generated.
9. Piter reviews lesson.
10. Piter approves/rejects/edits lesson.
11. Approved lesson is saved as durable memory in Supabase.
12. Later, lesson is exported/indexed into agentmemory-style retrieval.
13. Hermes uses approved lessons to improve reasoning.
14. Future similar issues can retrieve the lesson.
15. Future Cursor prompts can reference the lesson.

## Mandatory Guardrails

- No automatic lesson approval.
- No durable memory write without Piter approval.
- No secrets in lesson content.
- No production credentials/tokens/keys.
- No raw private unrelated personal data.
- Lesson text must be plain and understandable.
- Lesson must explicitly state where it applies.
- Lesson must explicitly state what not to repeat.

## Approval Branching

- **Approved**
  - candidate is promoted to durable lesson memory
  - candidate may be indexed into retrieval layer later
  - Hermes can use it as approved reasoning context later.

- **Rejected**
  - no durable memory write
  - candidate remains non-authoritative artifact with rejection reason.

- **Needs cleanup**
  - remains draft/pending cleanup
  - not indexed as approved memory.

## Scope Strategy

- Agent-specific lessons stay scoped unless explicit shared approval.
- Issue-specific lessons can remain tied to originating issue when not broadly reusable.
- Shared lessons require explicit owner shared-memory intent.
- Design system lessons should reference source-of-truth components/CSS targets.

## Architecture Position

- Supabase remains source of truth for approved lessons.
- Retrieval/indexing layer is non-authoritative and downstream.
- Hermes reasoning is advisory/strengthening layer using approved lessons.
