# AgentOps Pre-SQL Schema Inspection

**Date:** 2026-05-27  
**Stage:** Pre-SQL inspection (before Stage 2B migration)  
**Database inspected:** Supabase project `aixia-staging` (`ydppcpbxrvvardeslzrk`, ap-northeast-1)

---

## Purpose

This report inspects **existing project and database conventions** so AgentOps SQL/RLS can match the real AiXia stack. It supports `AGENTOPS_SQL_RLS_IMPLEMENTATION_PLAN.md` and does **not** create migrations, tables, policies, or functions.

---

## Inspection Method

| Source | Used? | Notes |
| --- | --- | --- |
| **Repository** | **Yes** | `supabase/migrations/*`, `src/App.tsx`, `src/lib/permissions.ts`, `src/app/ai-management/*` |
| **Supabase read-only SQL** | **Yes** | MCP `execute_sql` on staging (`SELECT` / catalog queries only) |
| **Blocked** | **No** | Live DB accessible |

**Not executed:** DDL, `apply_migration`, or any write SQL.

---

## Summary Decision

| Question | Recommendation |
| --- | --- |
| **Owner-check strategy** | Create **`public.agentops_is_owner()`** as a thin, documented wrapper around existing admin detection — default implementation: **`public.is_admin()`** (active admin only). Do **not** use `finance_user_has_permission`. |
| **Profile/role source** | **`public.profiles`** — PK/join column **`user_id`** (uuid), role column **`role`** (enum **`user_role`**) |
| **New helper required?** | **Yes** — `agentops_is_owner()` for clear policy names and future allowlist; can delegate to `is_admin()` initially |
| **Reuse `updated_at` trigger?** | **Yes** — `public.finance_set_updated_at()` with triggers named `trg_agentops_<table>_set_updated_at` |
| **`gen_random_uuid()` safe?** | **Yes** — widely used (111+ columns on staging); extensions **`pgcrypto`** and **`uuid-ossp`** installed |
| **Schema** | **`public`** only (matches project) |
| **`company_id` on AgentOps MVP tables?** | **No** on core `agentops_*` tables — global Owner-only QA; optional `company_id` in `metadata` later for cross-reference |
| **Can AgentOps SQL proceed?** | **Yes** — after Piter confirms **admin = AgentOps owner** (or supplies allowlist) |

---

## Profile / Role Findings

### Table: `public.profiles`

Confirmed on staging and in app code (`src/App.tsx` loads `profiles` by `auth.uid()`).

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` NOT NULL | Join to `auth.users`; FK target for `owner_user_id`, `triggered_by`, `created_by` |
| `role` | **`user_role`** enum | Default `'employee'` |
| `status` | **`user_status`** enum | Default `'pending_verification'`; access gating in app |
| `permissions` | `jsonb` | Default `'{}'`; app-level permission map |
| `profile_completed` | `boolean` | Used in access bootstrap |
| `full_name`, `display_name`, `email`, … | text | Standard profile fields |

**No column named `owner` or `platform_owner`.**

### Enum: `user_role`

Staging values (distinct counts):

| Role | Count (staging snapshot) |
| --- | ---: |
| `employee` | 10 |
| `manager` | 5 |
| `guest` | 2 |
| `admin` | 1 |

Matches app types in `src/lib/permissions.ts` and `src/app/chat/types.ts`:  
`admin` \| `manager` \| `employee` \| `guest`.

### Admin / owner convention

| Concept | In codebase/DB |
| --- | --- |
| **Platform “owner” (Piter)** | Documented as Owner AI / AgentOps — **no separate DB role** |
| **Admin** | `profiles.role = 'admin'` |
| **`is_admin()`** | `role = 'admin'` **and** `status = 'active'` |
| **`is_admin_user()`** | `role = 'admin'` only (no status check) |
| **`_app_analytics_is_admin()`** | `lower(trim(role::text)) = 'admin'` (no status check) |

**Code references:**

- `src/App.tsx` — `from("profiles").select("status, profile_completed, role, permissions")`  
- `src/lib/permissions.ts` — `isAdminRole()` → `role === "admin"`  
- `supabase/migrations/20260521120000_app_analytics.sql` — admin SELECT policies + `_app_analytics_is_admin()`  
- `supabase/migrations/20260517120000_user_daily_platform_usage.sql` — admin OR own row  

### Piter input required

Confirm one of:

1. **Option A (recommended default):** Any **active** `profiles.role = 'admin'` may access AgentOps → use **`is_admin()`** inside `agentops_is_owner()`.  
2. **Option B (stricter):** Only specific `user_id`(s) in an allowlist table or hardcoded check → `agentops_is_owner()` checks allowlist **and** active admin.  
3. **Option C:** Reuse **`is_admin_user()`** if inactive admins should retain AgentOps access (not recommended).

Staging currently has **one** admin user — verify that account is Piter before production.

---

## Permission Helper Findings

### Functions found (staging, relevant subset)

| Function | Arguments | Reusable for AgentOps? |
| --- | --- | --- |
| `public.is_admin()` | none | **Delegate only** — good default inside `agentops_is_owner()` |
| `public.is_admin_user()` | none | Possible; weaker (no `active` status) |
| `public._app_analytics_is_admin()` | none | Pattern reference; prefer `is_admin()` for AgentOps |
| `public.finance_get_effective_permissions(target_user_id uuid)` | uuid | **No** — finance JSON permissions |
| `public.finance_user_has_permission(permission_name text)` | text | **No** — calls `is_admin_user()`, `is_admin()`, finance JSON |
| `public.admin_delete_user(target_user_id uuid)` | uuid | **No** — user admin RPC |
| `agentops_*` | — | **None exist** |

`finance_user_has_permission` definition (staging):

```sql
-- Simplified: admin bypass OR finance_get_effective_permissions(auth.uid()) ->> permission_name
public.is_admin_user() OR public.is_admin() OR (finance_get_effective_permissions(...) ->> permission_name)::boolean
```

**Conclusion:** **New helper required** for clarity and isolation: **`public.agentops_is_owner()`**.

Suggested sketch (for migration prompt only — **not created in this inspection**):

```sql
CREATE OR REPLACE FUNCTION public.agentops_is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin();
$$;
```

Adjust if Piter chooses allowlist (Option B).

---

## RLS Policy Findings

### Patterns observed

| Pattern | Example | AgentOps use |
| --- | --- | --- |
| **Admin via `profiles` + `auth.uid()`** | `app_analytics_*_select_admin` | **Follow** (via `agentops_is_owner()`) |
| **Helper in policy** | `profiles_admin_select_all` → `USING (is_admin())` | **Follow** |
| **Own row + admin** | `user_daily_platform_usage_select_own_or_admin` | **Do not** — AgentOps is not per-user rows for all employees |
| **Broad authenticated** | `ai_settings`, `ai_conversation_*`, `ai_memory_items` — all authenticated CRUD | **Do not follow** — too permissive for AgentOps |
| **Service role insert** | `ai_request_logs` | Optional later for runner only; not MVP UI |

### `profiles` policies (staging)

Examples: `profiles_select_own`, `profiles_admin_select_all`, `profiles_admin_update_all`, `authenticated users can read active profiles`.

AgentOps policies should **not** grant all authenticated users access.

### Recommended AgentOps RLS pattern

For **each** `agentops_*` table:

| Policy | Command | Using / with check |
| --- | --- | --- |
| `agentops_<table>_select_owner` | `SELECT` | `agentops_is_owner()` |
| `agentops_<table>_insert_owner` | `INSERT` | `WITH CHECK (agentops_is_owner())` |
| `agentops_<table>_update_owner` | `UPDATE` | `USING` + `WITH CHECK (agentops_is_owner())` |
| `agentops_<table>_delete_owner` | `DELETE` | `agentops_is_owner()` |

- **Role target:** `authenticated` only  
- **No** `anon` policies  
- **No** `company_id` tenant filter on MVP tables  
- **Grants:** `GRANT SELECT, INSERT, UPDATE, DELETE` to `authenticated` (policies still deny non-owners)

Optional future: `agentops_runner_insert` for `service_role` on `agentops_runs` / findings only — **off** until Piter approves.

---

## Updated At Trigger Findings

| Item | Value |
| --- | --- |
| **Function** | `public.finance_set_updated_at()` — sets `NEW.updated_at = now()` |
| **Trigger naming** | `trg_<table>_set_updated_at` or `trg_<table>_updated_at` |
| **Timing** | `BEFORE UPDATE` `FOR EACH ROW` |

**Recommendation:** Reuse **`finance_set_updated_at()`** on AgentOps tables with `updated_at`:

- `agentops_runs`  
- `agentops_findings`  
- `agentops_focus_directives`  
- `agentops_agent_memory`  
- `agentops_prompt_library`  
- `agentops_verifications`  

Example trigger name: `trg_agentops_findings_set_updated_at`.

---

## UUID Convention Findings

| Item | Staging result |
| --- | --- |
| **`gen_random_uuid()`** | **111** column defaults use it |
| **Extensions** | `pgcrypto`, `uuid-ossp` enabled |
| **`uuid_generate_v4()`** | Not primary pattern in recent migrations |

**Recommendation:** `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` for all AgentOps tables.

---

## Tenant / Company Convention Findings

| Column | Where used |
| --- | --- |
| `company_id` | Finance tables, `app_analytics_*` (nullable uuid) |
| `tenant_id` | Not observed as standard column name on staging sample |
| `profiles.company` | Text field (user profile string), not FK |

**Recommendation for AgentOps MVP:**

- **Do not** add `company_id` to core `agentops_*` tables.  
- AgentOps is **global Owner-only** system QA, not tenant-operational data.  
- Store optional contextual refs in `metadata` jsonb (e.g. `company_id` of a finding’s finance module) if needed later.  
- Do **not** expose AgentOps to tenant RLS patterns used in finance.

---

## AI / Memory / Hermes / CodeGraph Table Findings

### Existing tables (staging, `public`)

| Table | Relation to AgentOps |
| --- | --- |
| `ai_settings` | Runtime AI config — separate |
| `ai_conversation_sessions` / `ai_conversation_messages` | Personal/admin AI chat — separate |
| `ai_session_insights` | AI management UI — separate |
| `ai_memory_items` | **Name similarity only** — not `agentops_agent_memory` |
| `ai_qa_cache`, `ai_knowledge_*`, `ai_avatar_assets`, … | Product AI — separate |
| `ai_admin_activity_logs` | Admin audit — separate |

### `agentops_*` tables

**None exist** on staging — **no naming conflicts**.

### Hermes / CodeGraph

- **No** DB tables for Hermes or CodeGraph.  
- Hermes readiness → **`agentops_runs.metadata`** per MVP decision.

**Recommendation:** Keep **AgentOps tables separate**; do not merge into `ai_memory_items`. Enforce RLS so Personal User AI paths cannot read `agentops_*`.

---

## Required SQL/RLS Decisions Before Migration

| # | Decision | Recommended choice |
| --- | --- | --- |
| 1 | Owner helper name | **`public.agentops_is_owner()`** |
| 2 | Role values allowed | **`user_role` enum:** `admin` only for access (via `is_admin()`) |
| 3 | Piter owner = admin or special? | **Confirm:** active **`admin`** = AgentOps owner for MVP; allowlist optional later |
| 4 | `updated_at` trigger | **`finance_set_updated_at()`** |
| 5 | Schema name | **`public`** |
| 6 | Active Top 10 enforcement | **Service layer first** + partial unique index; RPC **`agentops_promote_findings_to_active(integer)`** in follow-up migration |
| 7 | Text checks vs enums | **`text` + `CHECK`** for AgentOps status/category (flexibility); use **`user_role`** enum only when FK to `profiles.role` |
| 8 | `evidence_files.verification_id` FK | **Yes** in same migration after `agentops_verifications` created |
| 9 | `profiles.role` in policies | Compare with **`role = 'admin'::user_role`** or cast consistently with `is_admin()` |
| 10 | AI table RLS pattern | **Reject** — use strict owner-only policies |

---

## Recommended AgentOps SQL Strategy

1. **Schema:** Create 10 tables in **`public`** per `AGENTOPS_SQL_RLS_IMPLEMENTATION_PLAN.md`.  
2. **IDs:** `gen_random_uuid()` PKs; FKs to `profiles.user_id` where needed (`owner_user_id`, `triggered_by`, `created_by`).  
3. **Owner gate:**  
   - Add **`public.agentops_is_owner()`** → **`public.is_admin()`** unless Piter selects allowlist.  
   - Enable RLS on all tables; **deny by default**; four policies per table (select/insert/update/delete) for owners only.  
4. **Do not** tie AgentOps to `finance_user_has_permission` or finance templates.  
5. **Triggers:** `BEFORE UPDATE` → `finance_set_updated_at()` on tables with `updated_at`.  
6. **Constraints:** `text` + `CHECK` for enums in plan; partial **unique index** on `top10_rank` for active queue.  
7. **Hermes:** Store readiness in **`agentops_runs.metadata`** — no `agentops_system_status` table in MVP.  
8. **No `company_id`** on core tables.  
9. **Runner:** No service-role policies in first migration unless explicitly approved.

---

## Manual Queries for Piter (if re-running on another project)

Use Supabase SQL Editor on the target project (read-only):

```sql
-- Profile tables
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%profile%' OR table_name ILIKE '%user%')
ORDER BY table_name;

-- profiles columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- role distribution
SELECT lower(trim(role::text)) AS role_value, count(*)
FROM public.profiles
GROUP BY 1 ORDER BY 2 DESC;

-- admin helpers
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('is_admin', 'is_admin_user', 'agentops_is_owner', '_app_analytics_is_admin');

-- agentops tables (should be empty before migration)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'agentops%';

-- extensions
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp');
```

---

## Next Prompt Recommendation

### 1. Piter confirmation (short)

Confirm: **“AgentOps Owner = active `profiles.role = admin`”** (Option A), or provide explicit `user_id` allowlist (Option B).

### 2. Then migration prompt

**AgentOps Stage 2B — Apply SQL migration**

> Create `supabase/migrations/YYYYMMDDHHMMSS_agentops_owner_tables_rls.sql` per `AGENTOPS_SQL_RLS_IMPLEMENTATION_PLAN.md` and `AGENTOPS_PRE_SQL_SCHEMA_INSPECTION.md`: 10 tables, indexes, checks, `agentops_is_owner()` wrapping `is_admin()`, RLS owner-only policies, `finance_set_updated_at` triggers, Hermes snapshot in `agentops_runs.metadata`. No UI, API, cron, Hermes automation.

**Do not** run Stage 2B until Piter confirms admin/owner mapping if strict Owner-only product intent requires a single user.

---

## Related Documents

| Document | Role |
| --- | --- |
| `AGENTOPS_SQL_RLS_IMPLEMENTATION_PLAN.md` | Table/column plan |
| `AGENTOPS_MVP_DECISION_RECORD.md` | Database-only MVP |
| `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` | Approved scope |
| `AGENTOPS_IMPLEMENTATION_SEQUENCE.md` | Stage 2B gate |
