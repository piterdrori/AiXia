# Hermes Adapter Design

## Current State

- **Agent Clarification** in Issue Workspace uses **mock/status-based** responses only (`generateAgentOpsMockResponse` in `src/lib/agentops/agentResponseMock.ts`).
- Phase 4B browser smoke verified the panel on staging/local.
- **Hermes is not active** in the app — discovery score ~8/100, **Database-only** memory mode (`AGENTOPS_HERMES_CONNECTION_DISCOVERY.md`).
- **CodeGraph is not active** in the app — Cursor MCP tooling only.
- Cursor execution remains **manual-first**; owner feedback is the durable audit trail.

## Future Purpose

Strengthen agent reasoning for Issue Workspace workflows **without giving autonomous control**. Hermes becomes an **advisory reasoning layer** that can replace or augment mock responses when:

1. An app-callable adapter exists and passes safety gates.
2. Piter has approved Hermes readiness per connection checklist.
3. Fallback to mock layer remains available on any failure or unsafe output.

Hermes must **assist** clarification, prompt refinement, risk review, next-step guidance, Cursor report synthesis, and archive lesson extraction — never execute them.

## Allowed Future Modes

| Mode | Purpose | Maps to mock intent |
| --- | --- | --- |
| `issue_clarification` | Explain issue understanding from stored context | `clarification` |
| `prompt_refinement` | Suggest 12-section prompt blocks | `prompt_improvement` |
| `risk_review` | Pre-handoff risk notes | `risk_review` |
| `next_step_recommendation` | Manual workflow next action | `next_step` |
| `cursor_report_synthesis` | Structure Cursor report intake | *(mock TBD in 5B)* |
| `archive_lesson_extraction` | Post-verification lessons for memory | *(mock TBD in 5B)* |

Contract: `qa-agent/hermes/hermes-adapter-contract.json`

## Disallowed Modes

Hermes adapter must **reject or block** requests that imply:

- Auto Cursor execution or shell from UI
- Direct code edits or file writes
- Production/main Supabase or GitHub actions
- Secret, password, or service-role access
- Schema/RLS/migration changes without explicit owner approval
- Automatic issue closure or verification pass
- Scheduler activation
- Memory writeback without owner approval record

## Data Hermes May Read

When adapter is implemented (future phase), request payload may include:

- Issue summary, evidence, severity, category, route, module
- Likely root cause and recommended fix strategy (stored fields only)
- Generated fix plan text (if present)
- Current Cursor prompt draft and prompt style standard reference
- Reporting agent id, specialty, focus, **redacted** relevant memory snippets
- Execution state, timeline summary, latest Cursor report, verification status
- Safety envelope (`stagingOnly`, `noAutoCursor`, etc.)

All reads are **Owner-gated** and **issue-scoped** — no cross-tenant or Personal AI namespace access.

## Data Hermes Must Not Read

- Secrets, API keys, passwords, tokens
- Supabase service role key or private env vars
- Production credentials or production database endpoints
- Unrelated personal/private user data
- Raw customer/vendor PII unless explicitly redacted and approved for the issue
- Full codebase without CodeGraph contract (separate adapter)

## Owner Approval Rules

| Output type | Rule |
| --- | --- |
| Hermes answer / clarification | Advisory — display only |
| Prompt suggestions | Piter edits and approves before handoff |
| Memory write suggestions | Never auto-applied; owner feedback record required |
| Execution / Cursor | Never triggered by Hermes |
| Issue closure | Never triggered by Hermes |
| Verification result | Never recorded by Hermes |

Hermes suggestions are **advisory**. Piter approves before prompt changes, memory writeback, execution request, or closure.

## Fallback

If Hermes is unavailable, returns low confidence, violates prompt style, or suggests forbidden actions:

1. Set `shouldFallbackToMock: true` on response (or skip Hermes call).
2. Call `generateAgentOpsMockResponse` with mapped intent.
3. Label UI as mock/status-based.
4. Log adapter decision in owner feedback metadata (future 5B).

See `hermes-fallback-policy.md`.

## Adapter Architecture (Future — Not Implemented in 5A)

```
Issue Workspace UI
  → AgentOps service (owner-gated)
    → HermesAdapterClient (interface only in 5A)
      → [Future] Edge function / internal service
        → Hermes reasoning (external or internal)
  → on failure: agentResponseMock.ts
```

**Phase 5A delivers:** contract JSON, policies, UI readiness indicator. **No client implementation, no API route, no runtime call.**

## Alignment with Existing Specs

- `AGENTOPS_HERMES_READINESS_SPEC.md` — meter labels, Database-only default
- `AGENTOPS_HERMES_CONNECTION_DISCOVERY.md` — app not callable today
- `AGENTOPS_HERMES_CODEGRAPH_SPEC.md` — CodeGraph separate from Hermes adapter
- `cursor-prompt-style-standard.md` — prompt suggestions must preserve 12-section format

## Next Implementation Steps (After 5A)

1. **Phase 5B** — Mock-interface wrapper implementing contract shape without Hermes runtime
2. **Phase 6A** — CodeGraph discovery contract (read-only structural context)
3. **Stage 9** — App-callable Hermes adapter after Piter checklist sign-off
