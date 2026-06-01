# AgentOps Synthetic Owner QA User Report

## Purpose
Staging-only synthetic Owner account for authenticated read-only AgentOps browser smoke (`qa:agentops-owner-smoke`). Does not use Piter’s personal credentials.

## Staging Project
- **Name:** aixia-staging
- **Ref:** `<STAGING_PROJECT_REF>`
- **URL:** `https://<STAGING_PROJECT_REF>.supabase.co`

## Synthetic User
| Field | Value |
|-------|--------|
| Synthetic user created | **Yes** |
| Email | `qa+agentops-owner@aixia.local` |
| Auth user id | `<SYNTHETIC_OWNER_AUTH_UUID>` |
| Display name | AgentOps Owner QA |
| Profile row created/updated | **Yes** |
| Profile role | `admin` |
| Profile status | `active` |
| Profile completed | `true` |
| Added to `agentops_owners` | **Yes** (`active = true`) |
| Owner notes | Synthetic AgentOps Owner QA user for readonly browser smoke testing |

## Creation Method
- **Tool:** `qa-agent/scripts/provision-synthetic-agentops-owner-qa.mjs`
- **API:** Supabase Auth Admin (`auth.admin.createUser`) with `email_confirm: true`
- **Profile:** Updated via service role after `handle_new_user` trigger created base row
- **Allowlist:** `agentops_owners` upsert on `user_id`
- **Staging guard:** Script refuses to run if `.env.local` URL is not `<STAGING_PROJECT_REF>`

## Profile / Login Conventions (confirmed)
- `profiles.user_id` = `auth.users.id` (trigger `on_auth_user_created` → `handle_new_user()`)
- Login requires `status = active` and `profile_completed = true` (`src/app/login/page.tsx`)
- AgentOps runtime access requires `agentops_owners.active = true` (not `role = admin` alone)

## Local Credentials
| Item | Status |
|------|--------|
| Local env configured | **Yes** (values not stored in this report) |
| File | `qa-agent/browser-qa/.env.owner.local` (gitignored) |
| Variables | `AGENTOPS_QA_OWNER_EMAIL`, `AGENTOPS_QA_OWNER_PASSWORD` |
| Password printed in reports | **No** |
| Password committed | **No** |

## Owner Smoke (latest passed run)
| Check | Result |
|-------|--------|
| Run ID | `owner-agentops-smoke-1779867528235` |
| Owner smoke | **passed** |
| Env vars present | Yes |
| Login attempted / successful | Yes / Yes |
| `/system/agent-ops` reached | Yes |
| Access denied | No |
| AgentOps Control Center | Yes |
| Hermes meter | Yes |
| Active Top 10 | Yes (command metric + row actions visible) |
| Screenshot | `qa-agent/reports/browser-qa/screenshots/owner-agentops-smoke-1779867543114.png` |
| Console / network errors | 0 / 0 |

## Safety
- Staging only — no production users created
- No schema, RLS, migrations, or API routes changed
- Smoke test is read-only; no AgentOps write buttons clicked

## Re-provision (if needed)
```bash
node qa-agent/scripts/provision-synthetic-agentops-owner-qa.mjs
```
Regenerates password in gitignored `.env.owner.local` only. Output JSON includes `userId` but never the password.
