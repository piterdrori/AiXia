# AgentOps Stage 10F Guest Finance Fix Report

## Purpose

Fix approved guest finance route access issues on staging (`AIXIA-WORKFLOW-RWF-28`, `AIXIA-WORKFLOW-RWF-29`) using the existing route guard and finance page-access patterns—without RLS/schema/UI redesign changes.

## Issues Fixed

| Issue code | Route | Fix |
| --- | --- | --- |
| `AIXIA-WORKFLOW-RWF-28` | `/finance/master-data` | Guest blocked at `canAccessRoute`; master-data Supabase counts skipped when user lacks read access |
| `AIXIA-WORKFLOW-RWF-29` | `/finance/reports` | Guest blocked at `canAccessRoute`; reports hub permission gate + no report RPCs without `canRead` |

## Root Cause (Stage 10 re-analysis)

| Scenario | Finding |
| --- | --- |
| **A — Guest sees finance content** | Stage 10 `finalUrl` was `/dashboard` for guest on both routes → route guard was already redirecting in many cases |
| **B — Brief route hit then redirect** | `ProtectedRoute` renders `<Navigate to="/dashboard" />` after auth ready; `domcontentloaded` could fire on finance URL before redirect completed |
| **C — QA misclassification** | `classifyRoute` used first URL segment (`finance`) only; it could mark **loaded** while URL was still finance, then record `finalUrl` as dashboard |

Stage 10F addresses **B** (no master-data/report RPCs without permission) and **C** (pathname mismatch → `redirected`), plus explicit **guest `/finance/*` deny** in `canAccessRoute`.

## Files Modified

| File | Change |
| --- | --- |
| `src/lib/permissions.ts` | `isGuestFinanceRouteBlocked()` — guest role cannot access any `/finance` path |
| `src/lib/finance/pageAccess.ts` | `FINANCE_REPORTS_HUB_ACCESS_CONFIG` for shared reports permission resolution |
| `src/app/finance/reports/page.tsx` | Permission load, `AixiaAccessDeniedState`, gated `loadReportsData` and realtime subscriptions |
| `src/app/finance/master-data/page.tsx` | `loadPage` loads profile first; skips `loadMasterData` when user lacks master-data read access |
| `qa-agent/browser-qa/tests/agentops-role-workflow-safe.spec.mjs` | Classify **redirected** when final pathname ≠ requested pathname (fixes false “loaded” for dashboard redirect) |

## Fix Summary

### Route-level guard

- `canAccessRoute()` now returns `false` for `role === "guest"` on `/finance` and all `/finance/*` routes before permission-map lookup.
- Existing `ProtectedRoute` behavior unchanged: failed access → `<Navigate to="/dashboard" replace />`.
- Authorized roles (admin, manager, employee, finance-admin, finance-viewer, owner paths) unchanged.

### Page-level defense-in-depth

- **Reports:** Resolves permissions via `FINANCE_REPORTS_HUB_ACCESS_CONFIG`; does not call finance report RPCs unless `permissionState.canRead`; shows `AixiaAccessDeniedState` when denied.
- **Master-data:** Does not run master-data table count queries until profile permissions confirm read/master-data access.

### QA classifier

- After navigation, if `page.url()` pathname is not the requested route (and not a child path), status is **redirected** (counts as access-denied per `expectedMatches`).

## Authorized Access Preserved

- No broadening of guest permissions.
- Finance route map (`ROUTE_PERMISSIONS`) unchanged for non-guest roles.
- Finance report calculations and master-data business logic unchanged.
- **Build:** TypeScript compile passes (`npm run build`).

**Browser re-verification** (guest redirect + owner/finance access) must be run locally with dev server on `http://localhost:5173` (see Validation).

## Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run build` | **PASS** | Exit 0 |
| `npm run qa:validate-foundation` | **PASS** | |
| `npm run qa:static-design-guardrails` | **PASS** | |
| `npm run qa:guardrail-action-plan` | **PASS** | |
| `npm run qa:agentops-role-workflow-safe` | **Not completed in agent session** | `ERR_CONNECTION_REFUSED` — dev server not reachable from agent shell; run locally |
| `npm run qa:agentops-synthetic-users-smoke` | **Not run** | Requires local dev server + credentials |
| `npm run qa:agentops-owner-smoke` | **Not run** | Requires local dev server + credentials |

### Expected results after local browser QA

| Check | Expected |
| --- | --- |
| Guest `/finance/master-data` | `redirected` or `access-denied`; `finalUrl` not finance |
| Guest `/finance/reports` | `redirected` or `access-denied`; no report metrics |
| Owner / finance-admin | Finance routes still **loaded** where scope expects |
| AgentOps | Owner-only; non-owner blocked |

**Local run:**

```bash
npm run dev
npm run qa:agentops-role-workflow-safe
npm run qa:agentops-synthetic-users-smoke
npm run qa:agentops-owner-smoke
```

## What Was Not Changed

- No RLS / schema / migrations / database policies
- No production or main Supabase / main GitHub
- No finance business logic or report calculation changes
- No UI redesign (only existing `AixiaAccessDeniedState` / loading patterns)
- No AgentOps backlog status updates (Stage 10G)
- No scheduler / Hermes / CodeGraph automation
- No `workflow-scope.json` changes

## Next Recommended Stage

**Stage 10G** — With dev server running, re-run role workflow QA; confirm guest RWF-28/29 clear; mark `AIXIA-WORKFLOW-RWF-28` and `AIXIA-WORKFLOW-RWF-29` fixed/verified in staging AgentOps backlog.
