# AgentOps Staging Migration Validation

## Purpose
Staging validation for AgentOps Owner-only schema/RLS on project **aixia-staging** (`<STAGING_PROJECT_REF>`). Confirms tables, allowlist bootstrap, `agentops_is_owner()` helper, RLS policies, indexes, and authenticated access simulation. No app/UI/API changes were made.

## Migration Applied
- **Migration file:** `supabase/migrations/20260527120000_agentops_owner_tables_rls.sql`
- **Project:** aixia-staging
- **Project ref:** `<STAGING_PROJECT_REF>`
- **Project URL:** `https://<STAGING_PROJECT_REF>.supabase.co`
- **Applied:** Yes
- **Remote migration record:** `20260527041433` — `agentops_owner_tables_rls`
- **Date/time (UTC):** 2026-05-27 ~04:14–04:20 (staging DB timestamps)

### Apply method note
`apply_migration` registered the migration and applied the **owner allowlist + `agentops_is_owner()`** portion. Remaining DDL (core tables, triggers, RLS enable, grants, policies) was applied via supplemental **`execute_sql`** calls on the same staging project in the same session. Schema end state matches the migration file. For future environments, apply the **full** migration file in one transaction (CLI `supabase db push` or single `apply_migration` with complete SQL).

## Tables Validation
All **11** expected `agentops_*` tables exist in `public`:

| Table | Expected | Found |
|-------|----------|-------|
| `agentops_agent_memory` | Yes | Yes |
| `agentops_agent_opinions` | Yes | Yes |
| `agentops_backlog_promotions` | Yes | Yes |
| `agentops_evidence_files` | Yes | Yes |
| `agentops_findings` | Yes | Yes |
| `agentops_focus_directives` | Yes | Yes |
| `agentops_owner_feedback` | Yes | Yes |
| `agentops_owners` | Yes | Yes |
| `agentops_prompt_library` | Yes | Yes |
| `agentops_runs` | Yes | Yes |
| `agentops_verifications` | Yes | Yes |

## Owner Bootstrap Validation
- **owner_count:** `1`
- **Owner rows:**

| user_id | active | email | full_name | role | status | notes |
|---------|--------|-------|-----------|------|--------|-------|
| `<BOOTSTRAP_OWNER_AUTH_UUID>` | true | `<OWNER_EMAIL>` | `<OWNER_DISPLAY_NAME>` | admin | active | Bootstrap AgentOps owner from active admin profile during initial migration |

- **More than one owner:** No (single bootstrap row)
- **Recommendation:** Correct for current staging (one active admin). If additional active `profiles.role = 'admin'` users are added later, they are **not** auto-added; add/deactivate rows in `agentops_owners` explicitly. Do not rely on `is_admin()` for AgentOps runtime access.

## Helper Function Validation
- **`agentops_is_owner` exists:** Yes
- **Schema:** `public`
- **Arguments:** none
- **Returns:** `boolean`
- **Implementation:** `SECURITY DEFINER`; checks `agentops_owners` where `user_id = auth.uid()` and `active = true` (does **not** call `is_admin()`)
- **Runtime access checks `agentops_owners` allowlist:** Yes (verified via JWT claim simulation below)

## RLS Validation
- **RLS enabled on all 11 tables:** Yes (`rowsecurity = true` on every `agentops_*` table)
- **Policies found:** Yes
- **Policy count:** **44** (4 per table: SELECT, INSERT, UPDATE, DELETE)
- **Policy summary:** All policies on `authenticated` role; `USING` / `WITH CHECK` expressions use `agentops_is_owner()` (or `public.agentops_is_owner()` equivalent in catalog). No table grants access to non-owners.

## Insert/Select Owner Validation
- **Performed:** Yes (SQL JWT simulation as bootstrap owner; transaction rolled back)
- **Result:** PASS
  - `agentops_is_owner()` → `true` for owner `user_id`
  - `INSERT` into `agentops_runs` succeeded under `authenticated` role with owner JWT `sub`
  - Row rolled back (`ROLLBACK`); `agentops_runs` count remains `0` at service-role level
- **Notes:** Validates RLS allow path for Owner. Repeat from staging app Supabase client when Stage 3 service layer exists (recommended sanity check, not blocking).

## Non-Owner Validation
- **Performed:** Yes (SQL JWT simulation as active employee `<NON_OWNER_TEST_AUTH_UUID>`)
- **Result:** PASS
  - `agentops_is_owner()` → `false`
  - `SELECT count(*)` on `agentops_runs` → `0` (no visible rows)
  - `INSERT` into `agentops_runs` → **ERROR 42501** — row-level security policy violation
- **Notes:** Admin role alone does not grant access unless listed in `agentops_owners`. App-level non-owner test still recommended when AgentOps client code exists.

## Index Validation
- **Indexes found:** 58 indexes across 11 tables (PKs, FK helpers, queue/backlog/verification indexes)
- **Active Top 10 support:** Yes
  - `idx_agentops_findings_queue_state_status`
  - `idx_agentops_findings_top10_rank`
  - `idx_agentops_findings_active_top10_rank_unique` (partial unique on `top10_rank` for active queue)
  - `idx_agentops_findings_priority_score_desc`
- **Verification support:** Yes
  - `idx_agentops_verifications_verification_status`
  - `idx_agentops_verifications_pending` (partial: `pending`, `running`)
  - `idx_agentops_verifications_finding_id`, `verified_at_desc`, `created_at_desc`
- **Backlog support:** Yes
  - `idx_agentops_findings_backlog_priority` (partial: `queue_state = 'backlog'`)
  - `idx_agentops_backlog_promotions_*` (finding, run, slot, created_at)

## Issues Found
1. **Split apply:** Initial `apply_migration` payload contained only section 1–2 (owners + function); remaining sections applied via `execute_sql`. Staging schema is complete; document for production apply to use one full migration transaction.
2. **No persistent validation row:** Owner insert test used `ROLLBACK` by design; no test data left in DB.

## Required Follow-Up
1. **Piter:** Confirm `agentops_owners` row for `<BOOTSTRAP_OWNER_AUTH_UUID>` is the intended sole Owner on staging.
2. **Stage 3:** Implement TypeScript types + read-only AgentOps service layer (no UI) against staging with real authenticated Supabase session.
3. **Production:** Do **not** apply until explicitly approved; use full migration file in one apply.
4. **Hermes:** Remains Cursor-only (8/100 Learning); no app automation in this validation.

## Final Status
**PASS WITH FOLLOW-UP**

Schema, allowlist, helper, RLS, policies, and indexes are correct on staging. Follow-up is operational (full-file migration apply on next environment, optional app JWT smoke test when client exists)—not a schema defect.
