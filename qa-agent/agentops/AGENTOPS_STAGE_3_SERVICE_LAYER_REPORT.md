# AgentOps Stage 3 Service Layer Report

## Purpose
Introduce a **read-only** TypeScript service layer for AgentOps so a future Owner-only UI can load dashboard data through the normal authenticated Supabase client. Respects staging RLS and `agentops_is_owner()` allowlist. No writes, routes, or automation in this stage.

## Files created
| File | Role |
|------|------|
| `src/lib/agentops/types.ts` | Domain unions, row interfaces, `AgentOpsReadResult`, Hermes status, closed-status constant |
| `src/lib/agentops/service.ts` | Read-only Supabase queries and RPC owner check |
| `src/lib/agentops/index.ts` | Public exports |
| `qa-agent/agentops/AGENTOPS_STAGE_3_SERVICE_LAYER_REPORT.md` | This report |

## Files modified
None (no global barrel or app wiring required yet).

## Read-only functions created
| Function | Purpose |
|----------|---------|
| `getAgentOpsOwnerStatus()` | `rpc('agentops_is_owner')` — allowlist gate for UI |
| `getAgentOpsActiveTop10()` | Open `active_top_10` findings (excludes closed statuses), ordered, limit 10 |
| `getAgentOpsBacklogSummary()` | Backlog count + top 10 preview by priority |
| `getAgentOpsLatestRun()` | Latest run by `started_at` |
| `getAgentOpsRunHistory(limit?)` | Recent runs |
| `getAgentOpsFindingDetail(findingId)` | Finding + opinions, feedback, verifications, prompts, evidence |
| `getAgentOpsDashboardSummary()` | Active queue, backlog, critical open, verification pending, latest run, Hermes |

Helpers (exported for UI reuse): `getDefaultAgentOpsHermesStatus`, `parseHermesStatusFromMetadata`, `resolveAgentOpsHermesStatus`.

## Security model
- Uses `supabase` from `src/lib/supabase.ts` (anon key + authenticated session).
- **No** service role, admin client, or RLS bypass.
- **No** new SQL, RPCs, or policies.
- Non-owners: RLS returns empty data or errors; service returns safe `{ data, error }` without throwing.
- Owner access is **not** `is_admin()` — only `agentops_owners` + `agentops_is_owner()`.

## Hermes status handling
- Default: **8 / 100**, label **Learning**, mode **Database-only**, `appCallable: false`, `codegraphCallable: false`, MVP notes string.
- If `latestRun.metadata.hermes` is a well-formed object, dashboard uses that snapshot instead.
- Hermes remains **Cursor-only**; no runtime Hermes or CodeGraph calls from this layer.

## What was not implemented
- UI pages or `/system/agent-ops` route
- Insert/update/delete or promotion workflows
- API routes, Edge Functions, Vercel Cron
- Playwright / browser automation
- Hermes or CodeGraph runtime automation
- Finance local-glass batch
- Database migrations or schema changes
- Package installs

## Next recommended stage
**Stage 4 — AgentOps UI shell (read-only):** Owner-gated route, Command Hero + dashboard panels wired to these service functions only (no writes). Confirm staging JWT smoke test for Owner vs non-owner in the real app.
