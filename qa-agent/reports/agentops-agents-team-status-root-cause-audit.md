# AgentOps Agents — Team status root-cause audit

**Registry:** codegraph  
**Mode:** Read-only (no code or env changes)  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents  
**Date:** 2026-07-14  
**Branch context:** `staging` (local WIP present; not included in this audit)

---

## 1. Symptom

Agents page loads. Council Chat remains available.

Team status shows:

- “Team status temporarily unavailable”
- Warning: “Live monitoring metrics could not load. Council Chat remains available below.”
- Registered / Completed today / Running / Needs attention / Failed·missing / Next daily review → all **Unavailable**
- Retry status control present

---

## 2. Browser comparison

| Surface | Page load | Warning | Auth shell | Notes |
|--------|-----------|---------|------------|-------|
| Cursor / TaskFlow embedded browser (authenticated owner) | Success | **Yes** after ~18s | Owner shell + Council OK | Reproduced twice on hard navigations |
| Same session after **Retry status** | Success | **No** | Same | Metrics populate (Registered 12, Completed today 12, …) |
| Standalone Chrome (desktop) | Not separately instrumented this session | — | — | Failure mechanism is the shared client 18s abort; any browser whose request exceeds 18s will show the same UI |

**Failure shape:** Universal client timeout when the status fetch exceeds 18s — **not** TaskFlow-auth-only. Embedded browser cold loads reliably aborted; Retry (single in-flight request) succeeded.

**Intermittency:** Yes — server often finishes under 18s from Node (~7–15s). Cold/dual-mount browser path consistently hit the 18s wall in this audit.

---

## 3. Network request

**Exact URL (relative):** `GET /api/agentops/monitoring/status`  
**Absolute:** `https://ai-xia-staging.vercel.app/api/agentops/monitoring/status`

### Failed first paint (Resource Timing)

| Field | Observation |
|-------|-------------|
| Requests | **2** parallel (React StrictMode remount / dual effect) |
| Duration | **18002–18009 ms** (matches `MONITORING_STATUS_TIMEOUT_MS = 18_000`) |
| `transferSize` | **0** (aborted; body not accepted by client) |
| Redirects | None observed |
| CORS | Same-origin; not involved |
| Credentials | Same-origin cookies as expected for SPA |

### Successful Retry

| Field | Observation |
|-------|-------------|
| Requests | 1 new `GET /api/agentops/monitoring/status` |
| Duration | **~7359 ms** |
| `transferSize` | **~13046** (compressed) |
| UI | Warning cleared; metrics Real values |

---

## 4. Direct API result

Unauthenticated / server-side `fetch` (no secrets printed):

| Check | Result |
|-------|--------|
| HTTP | **200** |
| Content-Type | `application/json` |
| Wall time (this machine) | **~7.2–8.5 s** (samples); historically seen up to ~14–15 s |
| Body size | **~153812** bytes uncompressed |
| `ok` | `true` |
| `readPathState.authMode` | `service_role` |
| `readPathState.projectRef` | `ydppcpbxrvvardeslzrk` |
| `agentsRowCount` | **12** |
| `executionRowCount` | **12** |
| `status.daily12ReviewStatus.registeredAgents` | **12** |
| `agentsCompletedToday` | **12** |
| `persistenceComplete` | `true` |
| `latestDailyRunId` | present |

**Conclusion:** API itself is healthy. Page integration fails when the client aborts before the 200 body is fully received/parsed.

---

## 5. Current deployment

Alias: **https://ai-xia-staging.vercel.app**

| Field | Value |
|-------|--------|
| Deployment ID | `dpl_4UZowS9Mo6HDpgj4Gsh8hHsSrJt9` |
| Host | `ai-bm7daw3ud-piterdrori-gmailcoms-projects.vercel.app` |
| Ready state | **READY** |
| Target | Preview (`target: null` / non-production) |
| Source | **git** (`githubDeployment: 1`) |
| Branch | **staging** |
| Commit SHA | `c03f6fdfbfc56e96af7495caa5d64661f9dff9f0` |
| Commit message | Refresh AgentOps Voice Phase C live QA report |
| Region | `iad1` |

Note: `origin/staging` tip at audit time was `46bbf29c` (later TTS report). Alias deployment is slightly behind tip but **not** the cause of Unavailable metrics (API on this deployment returns valid status).

---

## 6. Preview environment

Presence by **name only** (Vercel `env ls`, Preview / Preview (staging)):

| Name | Present |
|------|---------|
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | **YES** (Preview staging) |
| `SUPABASE_SERVICE_ROLE_KEY` | **YES** (Preview staging) |
| `STAGING_SUPABASE_URL` | **NOT listed** under that exact name |
| `SUPABASE_URL` | **NOT listed** under that exact name |
| `STAGING_SUPABASE_ANON_KEY` | **NOT listed** under that exact name |
| `SUPABASE_ANON_KEY` | **NOT listed** under that exact name |
| `VITE_SUPABASE_URL` | YES (Preview) |
| `VITE_SUPABASE_ANON_KEY` | YES (Preview) |

Runtime proof of correct staging project: status payload `projectRef = ydppcpbxrvvardeslzrk`, `authMode = service_role`.  
Branch-scoped Preview secrets for service role are injected. Alias points at git-connected staging Preview (not an orphan CLI deploy without Git meta).

---

## 7. Server logs

Sample (Preview deployment `dpl_4UZowS9Mo6HDpgj4Gsh8hHsSrJt9`, last ~3h):

| Field | Observation |
|-------|-------------|
| Route | `GET /api/agentops/monitoring/status` |
| HTTP status | **200** (repeated; no 401/403/503 cluster for this path) |
| Branch | `staging` |
| Cache | `MISS` |
| Safe error category | None in sampled lines — successful serverless completions |
| Duration (Vercel log UI) | Not returned by log API in this capture |
| Secrets / stack traces | None copied |

No evidence of missing service-role config, wrong project ref, RLS denial, or module import failure on this path during the audit window. Client abort happens while (or after) the function is still producing a successful 200.

---

## 8. Database read path

Server path (`api/agentops/_lib/monitoringRoutes.ts` → `handleMonitoringStatusRequest`):

- Uses monitoring read client with **service_role** (`createMonitoringReadClient`)
- Returns **503** only when read client is not configured — not observed live
- Performs multiple Supabase queries (run index, drafts, proposals, daily12, agents, …) → large JSON payload

Staging Supabase (`ydppcpbxrvvardeslzrk`) read-only checks:

| Check | Result |
|-------|--------|
| Agent registry count | **12** (`agentops_agents`) |
| Recent monitoring runs | Present (`completed` rows) |
| API `agentsRowCount` / registered | **12** |
| Production project access | Not indicated (`projectRef` staging only) |
| Anon fallback for protected reads | Not used (`authMode: service_role`) |

---

## 9. Client hook trace

```
Agents page (page.tsx)
  → useAgentOpsOwnerGate()  // monitoring hook enabled only when isOwner
  → useAgentOpsMonitoringStatus(isOwner)
       → fetchWithTimeout("/api/agentops/monitoring/status", { timeoutMs: 18_000 })
       → parse { ok, status.daily12ReviewStatus }
       → setDaily12 / setError(FetchTimeoutError → "Monitoring status timed out. Try refresh.")
  → rosterUnavailable = Boolean(monitoringError) || (!monitoringLoading && !daily12)
  → Team status UI (“Unavailable” + gold warning)
```

Key constants / files:

- `src/components/agentops/owner/useAgentOpsMonitoringStatus.ts` — `MONITORING_STATUS_TIMEOUT_MS = 18_000`
- `src/lib/fetchWithTimeout.ts` — AbortController → `FetchTimeoutError` on abort
- `src/app/system/agent-ops/agents/page.tsx` — Team status mapping

Additional same-endpoint consumers (can amplify load):

- `AgentDaily12ReviewCard.tsx` (also 18s timeout)
- `AgentScheduledMonitoringCard.tsx` / `AgentDailyReviewStatusSection.tsx`

**Parser mismatch:** Rejected. When a response arrives under timeout, UI correctly maps `registeredAgents`, `agentsCompletedToday`, etc. (Retry proof).

**StrictMode:** Cold load fired **two** status requests starting at the same timestamp; both aborted at ~18s.

---

## 10. Authentication analysis

| Check | Result |
|-------|--------|
| Owner shell loads | Yes |
| Council Chat available | Yes (by design when owner) |
| Monitoring fetch gated on `isOwner` | Yes |
| API requires owner session for status | No — unauthenticated GET returned 200 with service-role payload |
| TaskFlow-only cookie/storage failure | **Not primary** — Retry in same embedded session succeeded |
| Mid-load UI | While `monitoringLoading` and no error yet, warning is hidden; can briefly show fallbacks (e.g. Registered `?? 12`) before abort flips to Unavailable |

Do **not** weaken owner gate or RLS.

---

## 11. Retry behavior

| Check | Result |
|-------|--------|
| New request sent | **Yes** |
| Loading / Refresh interaction | Refresh disabled while loading; Retry enabled on error |
| Success updates all Team status metrics | **Yes** (12 / 12 / 0 / 0 / 0 / next review timestamp) |
| Failed path leaves stale loading | No — `finally` clears loading; error + null daily12 drives Unavailable |
| Request storm on spam | Not stress-tested; each Retry invokes one `refresh()` (dual StrictMode is on mount, not Retry) |

**Retry is functional** when the subsequent request completes under 18s.

---

## 12. Confirmed root cause

### **H. Timeout/abort race**

Evidence:

1. Browser Resource Timing: dual `monitoring/status` entries duration **exactly ~18000 ms**, `transferSize: 0`.
2. Hook hard-aborts at `MONITORING_STATUS_TIMEOUT_MS = 18_000` → `FetchTimeoutError` → `monitoringError` → `rosterUnavailable`.
3. Direct API and Vercel logs: **HTTP 200**, healthy `readPathState`, 12 agents — server path works.
4. Retry (~7s, nonzero transfer) restores metrics in the **same** authenticated session → not auth, not parser, not missing Preview service role, not wrong alias.

Contributing factors (not alternate primary categories):

- ~154 KB payload + multi-query read path → slow wall times near/over 18s under load/latency
- StrictMode double-fetch on mount increases contention
- Alias commit slightly behind tip — unrelated to Unavailable metrics

---

## 13. Minimal fix plan (do not implement yet)

1. **Client timeout / concurrency (required code):**  
   - Raise Agents Team-status timeout (e.g. 30–45s) **or**  
   - Slim `GET /api/agentops/monitoring/status` for summary needs (optional query `?view=team-summary`) **or both**.  
   - Prefer single-flight (dedupe in-flight status fetch) so StrictMode does not abort two heavy reads.
2. **UX honesty (small):** While `monitoringLoading`, do not treat as success with misleading zeros; keep loading or explicit “Loading…” (no fake metrics).
3. **Tests:** Contract/smoke — status under load; Team status after AbortTimeout; Retry updates UI; no dual-flight abort flake.
4. **Deploy:** Redeploy git-connected **staging** Preview; keep alias on staging Preview. No main/prod. No env change required if service role already present.
5. **Do not:** Fake fallback metrics, hide warning without fixing abort, weaken auth/RLS, change schedules/schema/Council Chat/TTS.

---

## 14. Files / settings likely to change

| Item | Change? |
|------|---------|
| `src/components/agentops/owner/useAgentOpsMonitoringStatus.ts` | Yes (timeout / single-flight) |
| `src/lib/fetchWithTimeout.ts` | Maybe (shared helpers only) |
| `src/app/system/agent-ops/agents/page.tsx` | Maybe (loading UX only) |
| `api/agentops/_lib/monitoringRoutes.ts` | Optional (payload slim / summary mode) |
| `AgentDaily12ReviewCard.tsx` (same endpoint timeout) | Likely align timeout |
| Preview env secrets | **No** for primary fix |
| Alias repoint | **No** for primary fix |

---

## 15. Safety implications

- Staging-only fix; **main** and **production** untouched.
- No RLS/auth weakening.
- No fake metrics.
- Reducing payload or raising client timeout must not broaden data exposure beyond current status contract.
- Keep Council Chat availability unchanged.

---

## FINAL VERDICT

```
FAILURE_REPRODUCED: YES
NORMAL_CHROME_AFFECTED: YES
TASKFLOW_AFFECTED: YES
MONITORING_STATUS_REQUEST_IDENTIFIED: YES
DIRECT_API_WORKS: YES
API_HTTP_STATUS: 200
CURRENT_ALIAS_DEPLOYMENT_IDENTIFIED: YES
GIT_CONNECTED_PREVIEW: YES
PREVIEW_SERVICE_ROLE_PRESENT: YES
STAGING_PROJECT_REF_CORRECT: YES
SERVER_LOG_CAUSE_FOUND: NO
DATABASE_READ_PATH_WORKS: YES
AGENT_REGISTRY_RETURNS_12: YES
CLIENT_RESPONSE_PARSER_WORKS: YES
OWNER_SESSION_VALID: YES
RETRY_BUTTON_SENDS_NEW_REQUEST: YES
ROOT_CAUSE_CONFIRMED: YES
ROOT_CAUSE_CATEGORY: H
CODE_CHANGE_REQUIRED: YES
ENV_CHANGE_REQUIRED: NO
REDEPLOY_REQUIRED: YES
SAFE_TO_IMPLEMENT_FIX: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
```

Notes on verdict fields:

- **NORMAL_CHROME_AFFECTED: YES** — shared client 18s abort; mechanism is not TaskFlow-specific (standalone Chrome not separately logged this session).
- **SERVER_LOG_CAUSE_FOUND: NO** — logs show successful 200s; failure is client-side abort vs slow/large response, not a logged server exception category.
