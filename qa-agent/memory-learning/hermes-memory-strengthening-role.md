# Hermes Memory Strengthening Role (Phase 7A)

## Position

Hermes is essential in AgentOps memory-learning architecture.

Hermes does not override owner approval and does not auto-write durable memory.

## Hermes Responsibilities

- Interpret lessons into cleaner reusable guidance.
- Connect related lessons across issue families.
- Summarize repeated issue patterns.
- Improve agent memory quality over time.
- Improve future Cursor prompt quality using approved lessons.
- Help decide whether a lesson is agent-specific or shared.
- Detect contradictions between lessons.
- Reduce duplicate lessons and near-duplicate memory noise.
- Strengthen reasoning quality over time through approved memory.

## Governance Boundary

- Hermes can propose improvements and scope adjustments later.
- Piter approves all durable memory outcomes.
- Supabase remains the durable source of truth.
- Hermes remains advisory until runtime activation is explicitly approved in later phases.

## Future Integration Notes

- Inputs: approved lessons, issue outcomes, verification trends, prompt outcomes.
- Outputs: suggested refinements, deduplication candidates, conflict warnings, scope recommendations.
- Safety: no production mutation, no auto Cursor execution, no autonomous memory writes.
