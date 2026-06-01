# agentmemory Indexing Plan (Phase 7A)

## Purpose

Define future indexing behavior for approved lessons without enabling runtime integration now.

## Planned Role

- agentmemory-style layer indexes **approved** lessons.
- Supports recall/search for future issue handling.
- Supports timeline/replay context for learning history.
- Supports recurrence detection and repeated-pattern lookup.
- Supports future Cursor/Hermes/MCP memory bridge behavior.

## Authority Model

- Supabase remains source of truth for approved lessons.
- agentmemory-style index is a retrieval projection, not durable authority.
- Static memory files remain export/review artifacts.

## Indexing Scope (Future)

- Agent-specific approved lessons -> agent-scoped index entries.
- Issue-specific approved lessons -> issue-scoped recall entries.
- Shared approved lessons -> cross-agent index entries (only with explicit shared approval).
- Design-system and prompt-memory lessons -> tagged for route/component/prompt retrieval.

## Proposed Index Pipeline (Future)

1. Read approved lesson from Supabase.
2. Validate safety/redaction markers.
3. Build retrieval record with scope tags and applicability metadata.
4. Upsert into agentmemory-style index.
5. Mark index status in tracking fields.

## Safety Rules

- Never index secrets/credentials/private sensitive payloads.
- Never index unapproved draft/rejected lessons as approved memory.
- Preserve approval status and source provenance in indexing metadata.

## Non-Goals (Phase 7A)

- No agentmemory runtime activation.
- No retrieval service enablement.
- No schema or application behavior changes.
