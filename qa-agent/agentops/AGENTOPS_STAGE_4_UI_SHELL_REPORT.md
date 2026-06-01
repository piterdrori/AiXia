# AgentOps Stage 4 UI Shell Report

## Purpose
Read-only Owner-gated AgentOps UI shell at `/system/agent-ops` for staging review of dashboard metrics, Active Top 10, backlog preview, run history, and Hermes MVP status. No writes, automation, or API routes.

## Files Created
| File | Description |
|------|-------------|
| `src/app/system/agent-ops/page.tsx` | Read-only AgentOps Control Center page |
| `qa-agent/agentops/AGENTOPS_STAGE_4_UI_SHELL_REPORT.md` | This report |

## Files Modified
| File | Change |
|------|--------|
| `src/App.tsx` | Import `AgentOpsPage`; register `path="/system/agent-ops"` with `ProtectedRoute` + `DashboardLayout` |
| `src/components/layout/DashboardLayout.tsx` | `getAgentOpsOwnerStatus()` check; conditional **AgentOps** nav item (`ShieldCheck` icon) |

## Route
**`/system/agent-ops`**

Registered in `src/App.tsx` using the same pattern as `/ai-management` and `/settings`.

## Access Control
| Layer | Implementation |
|-------|----------------|
| Auth | `ProtectedRoute` — must be logged in |
| Sidebar | `DashboardLayout` calls `getAgentOpsOwnerStatus()` when `userProfile.userId` is set; shows **AgentOps** link only when `isOwner === true` |
| Page | `AgentOpsPage` calls `getAgentOpsOwnerStatus()` on mount; non-owners see `AixiaEmptyState` access denied |
| Database | RLS + `agentops_owners` allowlist (final enforcement) |

**Not used:** `role === "admin"`, finance permissions, `isAdminRole()`, service role, RLS bypass.

## Data Loaded (read-only)
| Service function | UI section |
|------------------|------------|
| `getAgentOpsDashboardSummary()` | Command hero metrics, Hermes snapshot |
| `getAgentOpsActiveTop10()` | Active Top 10 table |
| `getAgentOpsBacklogSummary()` | Backlog count + preview table |
| `getAgentOpsRunHistory(10)` | Run history table |

## Hermes Status
- **Default:** 8 / 100 — **Learning** — **Database-only**
- **App callable:** No
- **CodeGraph callable:** No
- **UI:** Progress meter + info blocks; uses `latestRun.metadata.hermes` when dashboard summary provides it
- **Copy:** Hermes is project-tooling only; MVP uses database-only memory

## UI Sections Implemented
1. Command Hero — `AixiaHero` + `AixiaCommandMetrics`
2. Hermes Memory Support Meter — score, label, mode, callable flags
3. Active Top 10 Queue — `AixiaTableShell` or empty state
4. Backlog Preview — count + preview table
5. Run History — latest 10 runs
6. MVP Safety Notice — read-only boundaries

## What Was Not Implemented
- Write actions (insert/update/delete)
- Owner feedback
- Mark fixed / verification runner
- Finding detail route
- Browser QA automation
- Hermes or CodeGraph runtime automation
- API routes, Edge Functions, Vercel Cron
- SQL, migrations, schema changes
- `DashboardWorkspaceRail` shortcut (deferred per inspection)
- Package installs

## Next Recommended Stage
**Stage 4B — Seed/import sample findings for UI testing** if staging tables are empty and Piter wants realistic queue/backlog visuals before write flows.

**Or Stage 5 — Owner feedback actions and Mark Fixed flow** once UI shell is validated in-browser as Owner on staging.

## Validation
Run after merge:
- `npm run qa:validate-foundation`
- `npm run qa:static-design-guardrails`
- `npm run qa:guardrail-action-plan`
- `npm run build`

Manual smoke test (staging, as bootstrap Owner):
1. Confirm **AgentOps** appears in sidebar.
2. Open `/system/agent-ops` — dashboard loads.
3. Sign in as non-owner employee — link hidden; direct URL shows access denied.
