# AgentOps Stage 10B Role Workflow Findings Review Report

## Purpose

Classify Stage 10 role-workflow-safe findings (29 Medium “unexpected access allowed” vs `workflow-scope.json`) and generate AgentOps backlog **candidates** without blind import. No permission fixes, no schema changes, no automatic DB apply.

## Source Report

- `qa-agent/reports/browser-qa/role-workflow-safe-report.json`
- Run ID: `role-workflow-safe-1779878958735`
- AgentOps isolation: **passed** (0 non-owner leaks, 0 critical)

## Classification Counts

| Classification | Count |
| --- | ---: |
| real-permission-issue | 2 |
| scope-expectation-mismatch | 8 |
| staging-role-setup-issue | 1 |
| acceptable-current-behavior | 0 |
| needs-piter-decision | 18 |

## Import Candidates

**20** backlog candidates generated (not applied automatically).

| Severity | Count (approx.) |
| --- | ---: |
| High | 2 (guest finance) |
| Medium | 18 (Piter decision + finance-viewer / HR / AI routes) |

### Issue codes

`AIXIA-WORKFLOW-RWF-2`, `RWF-3`, `RWF-4`, `RWF-9`, `RWF-10`–`RWF-19`, `RWF-24`–`RWF-29`

**Excluded from import:** `RWF-1` (staging-role-setup), `RWF-5`–`RWF-8` (employee finance scope mismatch), `RWF-20`–`RWF-23` (manager finance scope mismatch).

## Skipped Findings (9)

Not imported because classification is **scope-expectation-mismatch** or **staging-role-setup-issue**:

- **RWF-1** — finance-admin on `/ai-management`: admin `profileRole` broader than workflow persona.
- **RWF-5–8** — employee on finance routes: catalog blocks finance; Stage 10 saw route shell load only.
- **RWF-20–23** — manager on finance routes: same navigation-vs-scope pattern.

## Piter Decisions Needed (18)

Roles/routes where intended RBAC is unclear before code changes:

- **finance-viewer** — `/finance/master-data`, `/finance/transactions`, `/ai-management`
- **hr-admin** — all finance hub routes in Stage 10 findings
- **hr-employee** — finance + `/ai-management`
- **ai-user** — finance routes
- **employee** — `/ai-management` only (finance routes classified as scope mismatch)

Guest finance (**RWF-28**, **RWF-29**) classified **real-permission-issue** (High) — still import candidates for owner review, not auto-fixed.

## Workflow Scope Updates Recommended

See `qa-agent/reports/browser-qa/role-workflow-findings-review.json` → `workflowScopeUpdatesRecommended`:

- Relax `expectedAccess` where catalog allows module (e.g. finance-admin `/ai-management` if admin nav is intentional).
- Clarify navigation-only vs hard-redirect for employee/manager finance routes.
- Align finance-viewer master-data/transactions expectations with read-only overrides.

## Files Created

| File | Purpose |
| --- | --- |
| `qa-agent/scripts/review-agentops-role-workflow-findings.mjs` | Review/classification generator |
| `qa-agent/reports/browser-qa/role-workflow-findings-review.json` | Full review payload |
| `qa-agent/reports/browser-qa/role-workflow-findings-review.md` | Human summary |
| `qa-agent/reports/browser-qa/agentops-role-workflow-import.sql` | Staging SQL (ON CONFLICT DO NOTHING) |
| `public/agentops/role-workflow-import-plan.json` | Owner UI import plan |

## Files Modified

| File | Change |
| --- | --- |
| `package.json` | `qa:agentops-role-workflow-review` script |
| `src/lib/agentops/types.ts` | Workflow import plan types |
| `src/lib/agentops/service.ts` | Preview + manual import from plan |
| `src/lib/agentops/index.ts` | Exports |
| `src/app/system/agent-ops/page.tsx` | Owner **Import Workflow Findings** button + modal |

## What Was Not Done

- No app permission/route guard fixes
- No Supabase RLS/schema/migration changes
- No automatic SQL apply in this stage
- No production or main Supabase/GitHub changes
- No scheduler / Hermes / CodeGraph automation
- Did not import all 29 findings (9 skipped by classification rules)

## Next Recommended Stage

**Stage 10C** — Piter approves role access decisions and updates `workflow-scope.json` (and optionally synthetic user catalog notes).

**Stage 10D** — Import **approved** workflow candidates only (Owner UI or reviewed SQL on staging).
