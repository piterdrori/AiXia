# AgentOps Synthetic Users Creation Report

## Run summary
| Field | Value |
|-------|--------|
| Script | `qa-agent/scripts/create-agentops-synthetic-users.mjs` |
| Command | `npm run qa:create-synthetic-users` |
| Staging ref | `<STAGING_PROJECT_REF>` |
| Ran successfully | **Yes** |
| Users defined | **12** |
| Auth users created | **11** |
| Auth users skipped (already existed) | **1** (`qa+agentops-owner@aixia.local`) |
| Profiles updated | **12** |
| `agentops_owners` rows granted (synthetic) | **1** |
| `agentops_owners` rows deactivated (non-owner) | **0** |
| Passwords printed | **No** |
| Passwords committed | **No** |

## Password env at run time
- `AGENTOPS_QA_SYNTHETIC_PASSWORD`: not set
- Fallback used: existing `AGENTOPS_QA_OWNER_PASSWORD` from gitignored `.env.owner.local` (applied as shared staging QA password for all 12 users)
- Recommendation: set `AGENTOPS_QA_SYNTHETIC_PASSWORD` in `qa-agent/browser-qa/.env.synthetic-users.local` for explicit shared-password semantics

## Synthetic users created (auth user ids)

| qaUserId | Email | user_id | Role | AgentOps owner |
|----------|-------|---------|------|----------------|
| agentops-owner | qa+agentops-owner@aixia.local | `<SYNTHETIC_AUTH_UUID>` | admin | Yes |
| platform-admin | qa+agentops-admin@aixia.local | `<SYNTHETIC_AUTH_UUID>` | admin | No |
| finance-admin | qa+agentops-finance-admin@aixia.local | `<SYNTHETIC_AUTH_UUID>` | admin | No |
| finance-viewer | qa+agentops-finance-viewer@aixia.local | `<SYNTHETIC_AUTH_UUID>` | employee | No |
| employee | qa+agentops-employee@aixia.local | `<SYNTHETIC_AUTH_UUID>` | employee | No |
| hr-admin | qa+agentops-hr-admin@aixia.local | `<SYNTHETIC_AUTH_UUID>` | manager | No |
| hr-employee | qa+agentops-hr-employee@aixia.local | `<SYNTHETIC_AUTH_UUID>` | employee | No |
| manager | qa+agentops-manager@aixia.local | `<SYNTHETIC_AUTH_UUID>` | manager | No |
| ai-user | qa+agentops-ai-user@aixia.local | `<SYNTHETIC_AUTH_UUID>` | employee | No |
| guest | qa+agentops-guest@aixia.local | `<SYNTHETIC_AUTH_UUID>` | guest | No |
| vendor-external | qa+agentops-vendor-external@aixia.local | `<SYNTHETIC_AUTH_UUID>` | guest | No |
| tenant-admin | qa+agentops-tenant-admin@aixia.local | `<SYNTHETIC_AUTH_UUID>` | admin | No |

## Role mapping compromises
- **Finance viewer:** `employee` + read-only finance flags in `profiles.permissions` (no separate finance-viewer enum).
- **HR admin:** `manager` + payroll/employee directory permission overrides (not full platform `manageUsers`).
- **Vendor external:** `guest` + `member_type = supplier`, company = Synthetic External Vendor QA.
- **Tenant admin:** `admin` + `member_type = operations_manager`, company = Synthetic Tenant QA Org — **not** on `agentops_owners`.
- **Platform admin vs finance admin:** both `admin`; differentiated by intended browser QA modules in JSON plan.
- **`member_type`:** must match `profiles_member_type_check` allowed values; `synthetic_qa` is invalid — omitted or set to allowed values only.

## AgentOps allowlist validation (SQL)
Among `qa+agentops-*@aixia.local` emails, only one active `agentops_owners` row:
- `qa+agentops-owner@aixia.local` — `active = true`
- All other 11 synthetic emails — **no** active allowlist row

Bootstrap owner `<OWNER_EMAIL>` may still exist separately from migration (outside synthetic 12).

## Local env files written (gitignored)
- `qa-agent/browser-qa/.env.synthetic-users.local` — all 12 emails + password variable names/values
- `qa-agent/browser-qa/.env.owner.local` — Owner email/password for smoke

## Owner smoke after creation
- `npm run qa:agentops-owner-smoke` — **PASS** (Playwright runner; report `status: passed`)
- See `qa-agent/reports/browser-qa/owner-agentops-smoke-report.json` for latest run

## Safety
- Staging only; production not touched
- No schema/RLS/migration/API changes
- No app source/UI modifications
- No employee/customer business records created (auth + profile rows only)

## Employee records
- QA users use **auth + profiles** only; no `employees` table rows were created (not required for login with `profile_completed = true`).
