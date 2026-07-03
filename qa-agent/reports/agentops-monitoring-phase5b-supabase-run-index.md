# AgentOps Monitoring — Phase 5B Supabase Run Index

**Date:** 2026-07-03  
**Mode:** Staging Supabase run-index build only  
**Branch:** `staging`  
**Primary commit:** `266b9351` (follow-up routing/API fixes through `17142185`)  
**Source reports:** Phase 5A GHA dry-run, productionBlocked fix, Vercel deploy-output investigation

---

## 1. Migration created

| Item | Detail |
|------|--------|
| File | `supabase/migrations/20260703120000_agentops_monitoring_runs.sql` |
| Applied to staging | **YES** — Supabase project `ydppcpbxrvvardeslzrk` via MCP `apply_migration` |
| Production touched | **NO** |

---

## 2. Table schema

**Table:** `public.agentops_monitoring_runs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `run_id` | text NOT NULL | unique index |
| `source` | text | default `github_actions` |
| `mode` | text NOT NULL | e.g. `scheduled_dry_run` |
| `level` | int NOT NULL | |
| `dry_run` | boolean NOT NULL | |
| `target_base_url` | text NOT NULL | |
| `target_class` | text NOT NULL | CHECK staging/preview/local/production_rejected/invalid |
| `production_blocked` | boolean NOT NULL | |
| `production_guard_active` | boolean NOT NULL | |
| `production_target_rejected` | boolean NOT NULL | |
| `continuous_enabled` | boolean | default false |
| `agents_considered` | int | default 0 |
| `agents_run` | int | default 0 |
| `findings_count` | int | default 0 |
| `actual_issues_created` | int | default 0 |
| `actual_memory_writes` | int | default 0 |
| `errors_count` | int | default 0 |
| `status` | text NOT NULL | CHECK completed/partial/failed/indexed |
| `started_at` / `ended_at` | timestamptz | |
| `duration_ms` | int | |
| `github_run_id` / `github_run_url` | text | |
| `artifact_name` | text | |
| `summary` | jsonb | default `{}` — no secrets / full artifacts |
| `created_at` | timestamptz | default now() |

**Indexes:** `run_id` (unique), `created_at DESC`, `github_run_id` (partial), `status`

**Constraints:** staging-writes check — non-dry-run rows must have zero issue/memory writes

---

## 3. RLS rules

| Rule | Detail |
|------|--------|
| RLS | **ENABLED** |
| SELECT | `authenticated` + `agentops_is_owner()` policy |
| INSERT | **No authenticated policy** — service role (GHA) only |
| Anonymous writes | **Blocked** |
| Service role | Bypasses RLS (GHA insert + Vercel server read when key present) |

---

## 4. Repository / helper files

| File | Role |
|------|------|
| `src/lib/agentops/runtime/agentOpsMonitoringRunIndex.ts` | `buildMonitoringRunIndexRecord`, `insertMonitoringRunIndexRecord`, `listMonitoringRunIndexRecords`, staging ref guard, dry-run-only insert gate |
| `src/lib/agentops/runtime/agentOpsMonitoringStatusService.ts` | Extended with `latestMonitoringRuns`, `latestIndexedRun`, `dryRunDefault` (dev / full stack) |
| `api/agentops/monitoring.ts` | Single Vercel function entry (`GET`/`POST` exports) |
| `api/agentops/_lib/monitoringRoutes.ts` | Vercel-safe status handler (Supabase index reads, no `src/lib` ESM chain) |
| `scripts/agentops-monitoring-gha-run-index-insert.ts` | GHA post-dry-run insert script |
| `scripts/agentops-vercel-function-count-verify.ts` | Hobby 12-function audit |
| `src/app/system/agent-ops/agents/AgentScheduledMonitoringCard.tsx` | Indexed cloud run UI block |
| `src/app/system/agent-ops/agents/page.tsx` | Wires Scheduled Monitoring card |

**Staging ref guard:** inserts rejected unless Supabase URL project ref is `ydppcpbxrvvardeslzrk`.

---

## 5. GHA insert behavior

| Step | Behavior |
|------|----------|
| Workflow | `.github/workflows/agentops-monitoring-scheduled-dry-run.yml` |
| After dry-run + summary | `npx tsx scripts/agentops-monitoring-gha-run-index-insert.ts` |
| Secret | `STAGING_SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY` |
| On insert failure | Step exits 1 → job fails |
| Artifact upload | `if: always()` — preserved after index step |
| Cron | **Still commented out** |

**Manual GHA run (post-push):** `28636790687` — **success**

```
[agentops-monitoring-run-index] Indexed run d54736cc-8b67-4ff3-9948-eade633394bd status= completed dry_run= true
```

---

## 6. Status API changes

| Route | Method | Behavior |
|-------|--------|----------|
| `/api/agentops/monitoring/status` | GET | Returns `latestMonitoringRuns` (10), `latestIndexedRun`, `cloudActive: false`, `dryRunDefault: true`, `continuousActive: false`, `safety.productionBlocked: true` |
| `/api/agentops/monitoring/dry-run` | POST | 503 on Vercel (Playwright not on serverless); dev/GHA path unchanged |
| `/api/agentops/monitoring/reports/latest` | GET | Points to GHA artifacts + Supabase index |

**Vercel routing:** non-Next catch-all unsupported → single `api/agentops/monitoring.ts` + rewrite:

```json
{ "source": "/api/agentops/monitoring/:subpath*", "destination": "/api/agentops/monitoring?monitoringSubpath=:subpath*" }
```

**Verified preview response** (`17142185` deploy):

- `latestIndexedRun.githubRunId`: `28636790687`
- `agentsConsidered`: 12, `agentsRun`: 2, `findingsCount`: 2
- `actualIssuesCreated`: 0, `actualMemoryWrites`: 0
- `productionBlocked`: true

---

## 7. Agents hub UI changes

**Page:** `/system/agent-ops/agents`

`AgentScheduledMonitoringCard` shows:

- Latest cloud dry-run from Supabase index
- Timestamp, GitHub run link, target class, agents considered/run, findings
- Issue writes: 0, memory writes: 0, production blocked
- Empty state: “No indexed cloud runs yet”
- Local dry-run button + artifact panel retained as fallback

---

## 8. Function count verification

```
npm run agentops:vercel-function-count-verify — PASSED
  tracked api route files: 8/12
```

Shared helpers remain under `api/**/_lib/` (not counted as functions).

---

## 9. Vercel deploy status

| Deploy | SHA | Status |
|--------|-----|--------|
| Latest preview | `17142185` | **Ready** (GitHub Vercel check: success) |
| Preview URL (verified) | `https://ai-1owum9gsb-piterdrori-gmailcoms-projects.vercel.app` | Status API 200 + indexed row |
| `/system/agent-ops/agents` | preview | HTTP 200 |

**Note:** `ai-xia-staging.vercel.app` alias currently points to an **older** deployment (Jun 8, 5 functions). Latest staging previews include monitoring λ. Alias refresh is a Phase 5C / ops follow-up — not blocking index functionality on current preview URLs.

---

## 10. Manual GHA run result

| Field | Value |
|-------|-------|
| Run ID | `28636790687` |
| Conclusion | **success** |
| Artifact | Preserved |
| Index insert | **success** |

---

## 11. Supabase row verification

```sql
SELECT run_id, dry_run, target_class, production_blocked,
       agents_considered, agents_run, findings_count,
       actual_issues_created, actual_memory_writes,
       github_run_id, status, created_at
FROM agentops_monitoring_runs
ORDER BY created_at DESC LIMIT 1;
```

| Field | Value |
|-------|-------|
| `run_id` | `d54736cc-8b67-4ff3-9948-eade633394bd` |
| `dry_run` | true |
| `target_class` | staging |
| `production_blocked` | true |
| `agents_considered` | 12 |
| `agents_run` | 2 |
| `findings_count` | 2 |
| `actual_issues_created` | 0 |
| `actual_memory_writes` | 0 |
| `github_run_id` | `28636790687` |
| `status` | completed |

---

## 12. Remaining blockers

1. **Staging domain alias** — `ai-xia-staging.vercel.app` should be repointed to latest `staging` preview (or production promotion workflow).
2. **Vercel env (recommended)** — set `AGENTOPS_STAGING_SUPABASE_PROJECT_REF=ydppcpbxrvvardeslzrk` explicitly (guard now infers from staging URL on preview).
3. **Owner UI dry-run on Vercel** — intentionally 503; use GHA `workflow_dispatch` or local dev.
4. **Cron / continuous / live writes** — still disabled by design until Phase 5C+ owner approval.
5. **Eligibility table in status API** — Vercel handler returns empty eligibility (full `agentOpsMonitoringStatusService` remains for dev); optional enhancement for 5C.

---

## Final verdict

| Check | Result |
|-------|--------|
| SUPABASE_RUN_INDEX_TABLE_CREATED | **YES** |
| RLS_SAFE | **YES** |
| DRY_RUN_ONLY_INSERTS | **YES** |
| PRODUCTION_SUPABASE_BLOCKED | **YES** |
| GHA_INSERTS_RUN_SUMMARY | **YES** |
| ARTIFACT_UPLOAD_PRESERVED | **YES** |
| STATUS_API_READS_INDEX | **YES** |
| AGENTS_UI_SHOWS_INDEXED_RUNS | **YES** (on current preview deploy; card wired on agents page) |
| NO_ISSUES_CREATED | **YES** |
| NO_MEMORY_WRITES_APPROVED | **YES** |
| CONTINUOUS_STILL_DISABLED | **YES** |
| CRON_STILL_DISABLED | **YES** |
| VERCEL_FUNCTION_COUNT_SAFE | **YES** (8/12) |
| VERCEL_STAGING_DEPLOY_GREEN | **YES** (preview `17142185`; alias refresh pending) |
| SAFE_FOR_PHASE_5C | **YES** |

---

## Verification commands run

```bash
npx tsc --noEmit          # pass
npm run build             # pass
npm run agentops:monitoring-gha-dry-run-verify      # pass
npm run agentops:monitoring-runtime-wiring-verify   # pass
npm run agentops:monitoring-policy-verify           # pass
npm run agentops:vercel-function-count-verify       # pass (8/12)
```

**Registry:** codegraph (read-only verification)
