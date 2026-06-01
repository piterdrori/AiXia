# AgentOps MVP Decision Record

## Date

**2026-05-27**

## Decision Summary

AgentOps MVP will proceed with **database-only** memory mode.

**Hermes** and **CodeGraph** are currently available only through **Cursor/project tooling**, not through the AiXia app or backend runtime.

The future AgentOps UI will still show the **Hermes Memory Support Meter**, with an initial state of **8/100**, label **Learning**, and mode **Database-only**.

## Confirmed Discovery

| Item | Value |
| --- | --- |
| Hermes status | Cursor-only / project-tooling only |
| Hermes readiness | **8 / 100** |
| Hermes label | **Learning** |
| CodeGraph status | Cursor MCP / project-tooling only |
| App-callable Hermes | **No** |
| App-callable CodeGraph | **No** |

**Source:** `AGENTOPS_HERMES_CONNECTION_DISCOVERY.md`

## MVP Architecture Decision

### Use (durable system of record)

- Supabase **AgentOps tables** (`agentops_*`)
- **Database** focus directives (`agentops_focus_directives`)
- **Database** owner feedback (`agentops_owner_feedback`)
- **Database** active Top 10 queue (`agentops_findings` + promotion audit)
- **Database** verification records (`agentops_verifications`)
- **Database** agent memory table (`agentops_agent_memory`) — schema included; **light use** until Hermes adapter exists

### Do not use in MVP

- Live **Hermes** automation for ranking, focus, or memory writes
- Runtime **CodeGraph** calls from the AiXia app or scheduled runners
- Dependence on Cursor session memory as AgentOps system of record

## UI Decision

The future AgentOps UI at `/system/agent-ops` should show:

| Element | Initial MVP value |
| --- | --- |
| Hermes Memory Support Meter | Visible |
| Score | **8 / 100** |
| Label | **Learning** |
| Memory mode | **Database-only** |
| Last Hermes check | Set when discovery/checklist completed (2026-05-27) |
| Hermes limitation note | Hermes is Cursor-only; not app-callable; database is system of record |

## What Hermes Can Still Help With Now

Through **Cursor/project tooling** only:

- Planning and architecture notes
- Cursor/Hermes **fix prompt** generation (`qa-agent/templates/cursor-fix-prompt-template.md`)
- Remembering context inside a **Cursor workflow** when available (not durable AgentOps memory)
- Analyzing **CodeGraph** MCP outputs when Cursor provides them
- Read-only **analytics** via `npm run analytics:hermes` (developer machine; not AgentOps memory)

## What Hermes Cannot Do Yet

- Write **AgentOps DB** memory from the app
- Read **AgentOps DB** memory from the app
- Run **live daily ranking** inside the AiXia app
- Serve runtime **Personal User AI** or **Owner AI** AgentOps memory through the AiXia app
- Replace **owner approval**, **RLS**, or the Active Top 10 rules

## Approvals Linked

| Document | Status |
| --- | --- |
| `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` | Approved 2026-05-27 |
| `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md` | MVP path approved; app-callable items open |
| `AGENTOPS_IMPLEMENTATION_SEQUENCE.md` | Stage 1 + 1B complete; Stage 2 current |

## Safety

- AgentOps must **not** depend on live Hermes automation until Hermes is app-callable and Stage **9A/9** are approved.
- The **database** remains the durable **system of record**.

## Next Step

1. **Create AgentOps SQL/RLS implementation plan only** (Stage 2).  
2. **Actual SQL** migration files apply only after the plan is reviewed and Piter explicitly approves Stage **2B**.

**Suggested prompt:**

> Create AgentOps Stage 2 SQL/RLS implementation plan only: document migration outline, table definitions, indexes, and Owner-only RLS policies per AGENTOPS_DATA_MODEL_SPEC.md and approved checklist. Database-only MVP memory. No migration applied to Supabase, no UI, no API routes, no cron, no Hermes automation.
