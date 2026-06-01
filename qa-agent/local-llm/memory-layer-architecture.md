# Memory Layer Architecture (Phase 5/6)

## Goal

Define a multi-layer memory model that improves agent recall and learning while preserving Supabase as the durable authority and keeping owner approval in control of writes.

## Three Memory Levels

## 1) Supabase Source-of-Truth Memory (Durable)

Authoritative storage for:

- approved agent memory items
- issue-linked memory and verification outcomes
- approval/audit logs (Yes/No decisions)
- archived lessons from verified issues
- memory ownership and scope metadata

Rules:

- durable memory must be approved by Piter
- no runtime component can bypass this authority
- this layer is the canonical state for UI and reporting.

## 2) agentmemory-style Retrieval Runtime (Non-Authoritative)

Working retrieval layer for:

- semantic recall
- hybrid search (keyword + vector + graph style)
- session timeline playback/replay
- recurrence/pattern detection signals
- cross-agent recall candidates (proposal only)

Rules:

- retrieval supports response quality but does not become final authority
- outputs become suggestions for Supabase-approved memory writes
- can be isolated by agent scope to reduce leakage.

## 3) Static Memory Files (Export/Review Artifacts)

Human-readable/export artifacts:

- snapshot files for review
- sharing and offline audit
- operational handoff references

Rules:

- treated as artifacts, not authority
- regenerated from authoritative state
- useful for diffing and review processes.

## Memory Scopes

- **Agent-specific memory (default):** tied to one agent identity.
- **Issue-specific memory:** tied to an issue and its lifecycle context.
- **Shared/cross-agent memory:** only written when explicitly approved as shared by Piter.
- **Archived lesson memory:** created after verified issue closure and explicit approval.

## Write Approval Flow

1. Chat response detects explicit memory intent language.
2. Agent asks: "Do you want me to update my memory with this?"
3. Owner decision:
   - **Yes:** create write request -> validate policy -> persist to Supabase.
   - **No:** continue conversation, no durable write.
4. Audit event is recorded with scope and target.

No automatic memory write path exists.

## Recurrence Detection

Retrieval layer can flag repeated patterns:

- repeated issue types
- repeated fixes or prompt edits
- repeated operational rules

These are advisory signals that can propose lesson candidates for owner review.

## Hermes Essential Role

Hermes improves memory quality by:

- interpreting ambiguous memory candidates
- summarizing lessons into reusable guidance
- linking related issues and prior outcomes
- ranking which memory signals matter for current response
- improving prompt quality from historical behavior.

Hermes remains essential but is activated in a later controlled phase.

## Governance + Safety

- No secrets/credentials in memory.
- No production credentials or sensitive tokens.
- No automatic cross-agent propagation.
- No runtime activation in this phase.

## Phase Impact

- Enables Phase 7 archive/learning memory design.
- Establishes boundaries for Phase 8/9 local chat runtime.
- Prepares Hermes and CodeGraph integration contracts for later controlled activation.
