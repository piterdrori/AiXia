# Hermes Safety Policy (AgentOps Adapter)

**Status:** Design-only (Phase 5A). Applies to future Hermes adapter implementation.

## Scope

This policy governs any **app-callable Hermes reasoning adapter** used by AgentOps Issue Workspace and related owner-gated flows. It does **not** govern Cursor-side `.hermes.md` agent sessions (separate boundary).

## Core Principles

1. **Staging-only execution context** — Adapter requests must declare `safety.stagingOnly: true` and target local/staging/preview only.
2. **No production/main** — No production Supabase, production GitHub, or production deployment actions.
3. **No secrets** — Request/response payloads must not include or request passwords, tokens, service role keys, or private env vars.
4. **No autonomous execution** — Hermes output is advisory; no automatic side effects.
5. **Owner approval required** — All Hermes outputs require Piter review before prompt approval, handoff, memory writeback, or closure.

## Forbidden Actions

Hermes adapter must **never** trigger or suggest without explicit owner override:

| Action | Policy |
| --- | --- |
| Run Cursor | Block — manual-first only |
| Shell from UI | Block |
| Prepare execution request | Block — owner button only |
| Auto-approve prompt | Block |
| Auto-edit prompt in DB | Block |
| Close / verify issue | Block |
| Scheduler activation | Block |
| CodeGraph index mutation | Block |
| Direct Supabase writes | Block (except future approved memory writeback flow with owner record) |
| Schema/RLS/migration changes | Block unless explicit approved task |

## Data Boundaries

### May read (issue-scoped, owner-gated)

- AgentOps finding fields and metadata already visible in Issue Workspace
- Owner feedback timeline summaries (redacted)
- Agent memory snippets marked active and safe for export
- Cursor report and verification status summaries

### Must not read

- Secrets and credentials
- Unrelated tenant/user personal data
- Personal AI session history
- Full unredacted customer/vendor records
- Production connection strings

## Output Requirements

- Preserve **12-section Cursor prompt standard** for any prompt suggestions
- Never invent file paths — use CodeGraph contract when available; otherwise instruct inspect-first
- Include `limitations` and `safetyFlags` on every response
- Set `requiresOwnerApproval: true` always
- Low confidence or policy violation → `shouldFallbackToMock: true`

## Memory Writeback

Hermes may return `memoryWriteSuggestions` only as **proposals**:

- Each suggestion must include `requiresOwnerApproval: true`
- No automatic insert into `agentops_agent_memory`
- Owner must explicitly approve via existing AgentOps memory UI (future)

## CodeGraph

- Hermes adapter does **not** invoke CodeGraph runtime in Phase 5A
- Future CodeGraph context is a **separate read-only contract** (Phase 6A)
- Hermes must not mutate CodeGraph index

## Audit

Future adapter calls should log:

- `requestId`, `mode`, `issueCode`, `fallbackUsed`, `safetyFlags`
- Stored in `agentops_owner_feedback.metadata` — no new tables in Phase 5A

## Enforcement

| Layer | Mechanism |
| --- | --- |
| Contract | Required `safety` object on every request |
| Adapter client | Reject disallowed modes before call |
| Response validator | Block forbidden suggestions; trigger fallback |
| UI | No "Run Hermes" until explicit future phase + checklist |
| Database | AgentOps remains system of record |

## Violation Response

1. Do not display unsafe Hermes output to owner
2. Fall back to mock response layer
3. Log violation flags in metadata
4. Show owner-visible "Hermes blocked — mock fallback" (future)
