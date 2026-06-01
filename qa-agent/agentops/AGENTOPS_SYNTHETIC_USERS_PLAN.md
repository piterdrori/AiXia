# AgentOps Synthetic Users Plan (12 accounts)

## Purpose
Dedicated **staging-only** browser QA accounts for Playwright and the 12 AgentOps agents. Replaces use of Piter’s personal credentials. Supports role visibility, workflow testing, and objective evidence collection.

## Staging project
- **Name:** aixia-staging
- **Ref:** `ydppcpbxrvvardeslzrk`

## Creation method
- Script: `qa-agent/scripts/create-agentops-synthetic-users.mjs`
- Command: `npm run qa:create-synthetic-users`
- API: Supabase Auth Admin + `profiles` update via service role (local/gitignored env only)

## Password env vars (no values in this doc)
| Variable | Use |
|----------|-----|
| `AGENTOPS_QA_SYNTHETIC_PASSWORD` | Recommended shared password for all 12 users |
| `AGENTOPS_QA_OWNER_PASSWORD` | Optional per-user override |
| `AGENTOPS_QA_ADMIN_PASSWORD` | … |
| (see `synthetic-browser-users.json` for full list) | |

Also required to run script:
- `SUPABASE_URL` or `VITE_SUPABASE_URL` (must contain `ydppcpbxrvvardeslzrk`)
- `SUPABASE_SERVICE_ROLE_KEY`

Gitignored files:
- `qa-agent/browser-qa/.env.synthetic-users.local`
- `qa-agent/browser-qa/.env.owner.local`

## The 12 users (summary)

| # | Email | Display name | Platform role | AgentOps owner |
|---|-------|--------------|---------------|----------------|
| 1 | qa+agentops-owner@aixia.local | AgentOps Owner QA | admin | **Yes** |
| 2 | qa+agentops-admin@aixia.local | Platform Admin QA | admin | No |
| 3 | qa+agentops-finance-admin@aixia.local | Finance Admin QA | admin | No |
| 4 | qa+agentops-finance-viewer@aixia.local | Finance Viewer QA | employee + finance read overrides | No |
| 5 | qa+agentops-employee@aixia.local | Employee QA | employee | No |
| 6 | qa+agentops-hr-admin@aixia.local | HR Admin QA | manager + HR/payroll overrides | No |
| 7 | qa+agentops-hr-employee@aixia.local | HR Employee QA | employee + expense/paycheck overrides | No |
| 8 | qa+agentops-manager@aixia.local | Manager QA | manager | No |
| 9 | qa+agentops-ai-user@aixia.local | AI User QA | employee | No |
| 10 | qa+agentops-guest@aixia.local | Guest QA | guest | No |
| 11 | qa+agentops-vendor-external@aixia.local | Vendor External QA | guest | No |
| 12 | qa+agentops-tenant-admin@aixia.local | Tenant Admin QA | admin | No |

Canonical definition: `qa-agent/browser-qa/synthetic-browser-users.json`  
Interaction plan: `qa-agent/browser-qa/synthetic-user-interaction-plan.md`

## Role mapping notes
- Allowed DB roles: `admin`, `manager`, `employee`, `guest` (`user_role` enum).
- Finance viewer uses **employee** + `profiles.permissions` read-only finance flags.
- HR admin uses **manager** + payroll/employee directory overrides (not full `manageUsers`).
- Vendor external uses **guest** + `company` = synthetic external vendor.
- Tenant admin uses **admin** but is **not** on `agentops_owners`.
- No separate “finance admin” enum — finance admin uses **admin** defaults.

## AgentOps access
- **Only** `qa+agentops-owner@aixia.local` is inserted/kept active in `public.agentops_owners`.
- Other 11 users: script sets `agentops_owners.active = false` if a row exists.
- Bootstrap owner (Piter) may remain on staging from migration — that is outside the synthetic 12.

## What each user tests (high level)
See `synthetic-user-interaction-plan.md` for module lists and phased rollout.

## Safety rules
- Staging only; refuse non-`ydppcpbxrvvardeslzrk` URLs.
- Never print or commit passwords.
- Never delete auth users.
- No schema/RLS/migration/API/cron changes from this plan.
- No browser write tests until a later approved stage.

## Related reports
- `AGENTOPS_SYNTHETIC_USERS_CREATION_REPORT.md` — output after script run
- `AGENTOPS_SYNTHETIC_OWNER_QA_USER_REPORT.md` — Owner smoke user detail
- `AGENTOPS_STAGE_9C_OWNER_AUTH_SMOKE_REPORT.md` — Owner authenticated smoke
