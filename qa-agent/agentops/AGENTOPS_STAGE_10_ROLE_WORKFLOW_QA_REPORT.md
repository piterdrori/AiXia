# AgentOps Stage 10 Role Workflow QA Report

## Purpose

Role-based safe workflow browser QA on staging. Extends Stage 9 read-only route smoke with safe UI interactions (search type/clear, tabs, modal open/close, form field type/clear without submit, role visibility checks) across all 12 synthetic QA users and seven core routes.

## Files Created

| File | Role |
| --- | --- |
| `qa-agent/browser-qa/workflow-scope.json` | Staging-only workflow coverage matrix, modes, blocked/allowed actions, per-route expected access |
| `qa-agent/browser-qa/tests/agentops-role-workflow-safe.spec.mjs` | Playwright role workflow safe test (12 users × 7 routes) |
| `qa-agent/scripts/run-agentops-role-workflow-safe.mjs` | Runner (loads synthetic env, runs Playwright, exits on critical security only) |
| `qa-agent/reports/browser-qa/role-workflow-safe-report.json` | Machine-readable run output |
| `qa-agent/reports/browser-qa/role-workflow-safe-report.md` | Human-readable run output |
| `qa-agent/reports/browser-qa/screenshots/role-workflow-safe/` | Per-user per-route screenshots (84 in validation run) |

## Files Modified

| File | Change |
| --- | --- |
| `package.json` | Added `qa:agentops-role-workflow-safe` script |
| `qa-agent/browser-qa/safe-workflow-rules.md` | Stage 10 rules section |
| `qa-agent/browser-qa/route-workflow-map.md` | Stage 10 route/workflow coverage table |

## Scope

- **Environment:** staging-only (`ydppcpbxrvvardeslzrk`), local app at `http://localhost:5173`
- **Users:** 12 synthetic QA accounts from `synthetic-browser-users.json`
- **Modes enabled:** readonly-navigation, safe-ui-interaction, safe-form-open-no-submit, safe-search-filter-sort, safe-modal-open-close, safe-role-visibility
- **Modes disabled:** synthetic-draft-write-later (Stage 11+)
- **Routes:** `/dashboard`, `/system/agent-ops`, `/finance`, `/finance/master-data`, `/finance/transactions`, `/finance/reports`, `/ai-management`
- **Findings:** report-only; no AgentOps DB import in this stage

## Users Covered

1. agentops-owner  
2. platform-admin  
3. finance-admin  
4. finance-viewer  
5. employee  
6. hr-admin  
7. hr-employee  
8. manager  
9. ai-user  
10. guest  
11. vendor-external  
12. tenant-admin  

## Workflows Covered

| Route | Safe actions exercised |
| --- | --- |
| `/dashboard` | Navigate, search type/clear, role visibility |
| `/system/agent-ops` | Navigate, owner-only isolation, role visibility |
| `/finance` | Navigate, search, tabs (when present), modal open/close (when safe opener exists), role visibility |
| `/finance/master-data` | Navigate, search, tabs, role visibility |
| `/finance/transactions` | Navigate, search, tabs, role visibility |
| `/finance/reports` | Navigate, search, tabs, role visibility |
| `/ai-management` | Navigate, search, tabs, role visibility |

## Safety Boundaries

- No production deployment or production URLs
- No main Supabase project changes
- No main/production GitHub folder changes
- No real customer/vendor/employee data
- No create/edit/archive/delete/write actions executed
- No payments, emails, invites, or payroll execution
- No destructive button clicks
- No scheduler/cron
- No Hermes/CodeGraph runtime automation
- No schema/RLS/migrations/API routes created
- No credentials printed or committed

## Validation Run Summary

**Run ID:** `role-workflow-safe-1779878958735`  
**Timestamp:** 2026-05-27T10:49:18.735Z  

| Metric | Value |
| --- | --- |
| Users tested | 12 |
| Logins successful | 12/12 |
| Routes per user | 7 |
| Interactions attempted | 262 |
| Interactions skipped for safety | 27 |
| Findings (report-only) | 29 |
| Critical findings | 0 |
| AgentOps isolation | **passed** (owner loaded; 0 non-owner leaks) |
| Runner status | **passed** |
| Screenshots | 84 in `qa-agent/reports/browser-qa/screenshots/role-workflow-safe/` |

### Findings Summary

All 29 findings are **Medium** severity, **report-only**, category **Security/Permission**. They flag routes that **loaded** when `workflow-scope.json` expected `access-denied` or `redirected` (e.g. employee on `/finance`, finance-viewer on master-data/transactions, finance-admin on `/ai-management`). These may reflect **conservative scope expectations** vs actual staging RBAC (UI loads but write actions may still be restricted). **No Critical findings** — AgentOps remained owner-only.

Console noise (e.g. transient `Failed to fetch` during long runs) was collected but did not fail the run.

**Not auto-closed:** Stage 9F backlog login items (`AIXIA-BROWSER-LOGIN-finance-admin`, `AIXIA-BROWSER-LOGIN-ai-user`) remain for owner review.

## Command Results (post-implementation validation)

| Command | Result |
| --- | --- |
| `npm run qa:agentops-role-workflow-safe` | **PASS** (12/12 Playwright tests; 0 critical; report status passed) |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** (guardrail warnings only, build completed) |
| `npm run qa:agentops-synthetic-users-smoke` | **PASS** (12/12; re-run after dev server restart) |
| `npm run qa:agentops-owner-smoke` | **PASS** (after dev server restart; first attempt failed: connection refused — server had stopped) |
| `npm run qa:static-design-guardrails` | **PASS** |
| `npm run qa:guardrail-action-plan` | **PASS** |

## What Was Not Implemented

- No DB import of workflow findings
- No scheduler / 24×7 automation
- No Hermes/CodeGraph runtime automation
- No synthetic draft/write workflow tests (`synthetic-draft-write-later` disabled)
- No app source fixes for permission/UI findings (report-only per stage scope)

## Next Recommended Stage

**Stage 10B — Convert workflow QA findings into AgentOps backlog candidates**

- Review the 29 Medium access-scope findings; tune `workflow-scope.json` expectations vs staging RBAC truth.
- Generate import-plan JSON/SQL (report-only review first) without auto-insert until owner approves.
- Optionally close or update backlog login items only after owner review.

**Alternative (requires explicit approval): Stage 11 — controlled synthetic draft/write workflow QA** on staging-only synthetic data.
