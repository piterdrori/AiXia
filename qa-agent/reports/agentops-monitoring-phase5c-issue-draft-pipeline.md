# AgentOps Monitoring — Phase 5C Issue Draft Pipeline

**Date:** 2026-07-03  
**Mode:** Staging-only owner-gated issue draft pipeline  
**Branch:** `staging` @ `414ec292`  
**Prior:** Phase 5B run index + alias repoint

---

## 1. Migration created

| Item | Detail |
|------|--------|
| File | `supabase/migrations/20260703140000_agentops_monitoring_issue_drafts.sql` |
| Applied to staging | **YES** — `ydppcpbxrvvardeslzrk` |
| Production touched | **NO** |

---

## 2. RLS rules

| Rule | Detail |
|------|--------|
| RLS | **ENABLED** |
| SELECT | `authenticated` + `agentops_is_owner()` |
| UPDATE | Owner can update status/decision fields |
| INSERT | **Service role only** (GHA pipeline) — no authenticated INSERT policy |
| Anonymous writes | **Blocked** |

---

## 3. Policy module

**File:** `src/lib/agentops/runtime/agentOpsMonitoringIssueDraftPolicy.ts`

| Helper | Purpose |
|--------|---------|
| `canCreateMonitoringIssueDraft` | Dry-run + productionBlocked + Browser QA evidence gate |
| `buildMonitoringIssueDraftCandidate` | Title/summary/evidence/duplicate_key |
| `buildDuplicateKey` | SHA-256 of agent+route+title |
| `classifyDraftSeverity` | From finding severity |
| `mapFindingToResponsibleAgent` | Agent slug from finding or scan context |
| `sanitizeFindingEvidence` | Strips base64 screenshots, caps DOM snapshot |

**Hard blocks:** no auto-promote, no memory writes, no auto-fix, staging Supabase only.

---

## 4. Draft builder

**File:** `src/lib/agentops/runtime/agentOpsMonitoringIssueDrafts.ts`

| Export | Behavior |
|--------|----------|
| `extractIssueDraftCandidatesFromReport` | From per-agent `findings[]` in JSON report |
| `insertMonitoringIssueDrafts` | Staging-only, dry-run gates, dedupe by `duplicate_key` |
| `listMonitoringIssueDrafts` / `getMonitoringIssueDraft` | Read helpers |
| `updateMonitoringIssueDraftDecision` | Approve / reject / defer (no promote) |
| `patchMonitoringRunDraftSummary` | Updates run index `summary` with draft stats |

**Report extension:** `agentsRun[].findings[]` added to scheduled dry-run JSON (sanitized evidence, no base64).

---

## 5. GHA pipeline changes

After run index insert:

```bash
npx tsx scripts/agentops-monitoring-gha-issue-drafts-insert.ts
```

Updates run summary with `issueDraftsCreated`, `issueDraftsSkippedDuplicate`, `issueDraftsSkippedPolicy`, `issueDraftsErrors`.

Artifact upload remains `if: always()` after draft step.

**Manual GHA run:** `28639604373` — **success**

```
[agentops-monitoring-issue-drafts] created=2 skippedDuplicate=0 skippedPolicy=0 errors=0 candidates=2
```

---

## 6. Status API changes

**Route:** `GET /api/agentops/monitoring/status` (same Vercel function)

Added fields:

- `latestIssueDrafts` (last 10)
- `issueDraftCounts` (draft / owner_approved / rejected / deferred / promoted)
- `safety.liveIssuesCreated: false`
- `safety.ownerApprovalRequired: true`
- `safety.autoFixBlocked: true`

**Additional routes (same function):**

- `GET /api/agentops/monitoring/drafts`
- `POST /api/agentops/monitoring/drafts/decision` — `{ draftId, decision, ownerId }`

---

## 7. Agents hub UI

**File:** `AgentScheduledMonitoringCard.tsx`

- “Issue drafts from monitoring” block
- Open draft count + latest title/route/severity
- “Review drafts” → `/system/agent-ops/issues?panel=monitoring-drafts`

---

## 8. Issues review UI

**File:** `MonitoringIssueDraftsReview.tsx` on `/system/agent-ops/issues`

Per draft: title, agent, route, severity, summary, Browser QA evidence, source run.

Owner actions: **Approve draft**, **Reject**, **Defer** — no Promote button (Phase 5D).

---

## 9. Function count verification

```
npm run agentops:vercel-function-count-verify — PASSED (8/12)
```

No new top-level API route files. All draft logic in `api/agentops/_lib/monitoringRoutes.ts`.

---

## 10. Vercel deploy status

| Deploy | SHA | Status |
|--------|-----|--------|
| Preview | `414ec292` | **Ready** |
| Alias | `ai-xia-staging.vercel.app` → `ai-pi1r5378v-…vercel.app` | Repointed |

---

## 11. Manual GHA run result

| Field | Value |
|-------|-------|
| Run ID | `28639604373` |
| Run index | `faa3e8ca-04f8-4162-8224-33a05aa909a5` |
| Drafts created | **2** |
| Live issues | **0** |
| Memory writes | **0** |
| Artifact | Preserved |

---

## 12. Supabase draft row verification

| agent_slug | route | severity | status | title |
|------------|-------|----------|--------|-------|
| analytics-agent | /metrics | medium | draft | Broken navigation links detected (7) |
| config-agent | /configuration | medium | draft | Broken navigation links detected (7) |

Both linked to run `faa3e8ca-…`, GitHub run `28639604373`.

---

## 13. Remaining blockers (Phase 5D)

1. **Promote to live `agentops_issues`** — owner-click only, separate phase
2. **Owner UI dry-run on Vercel** — still 503; use GHA or local dev
3. **Cron / continuous** — still disabled by design
4. **Re-run dedupe** — second GHA run with same findings should increment `skippedDuplicate`

---

## Final verdict

| Check | Result |
|-------|--------|
| ISSUE_DRAFT_TABLE_CREATED | **YES** |
| RLS_SAFE | **YES** |
| DRAFTS_ONLY_NO_LIVE_ISSUES | **YES** |
| BROWSER_QA_EVIDENCE_REQUIRED | **YES** |
| PRODUCTION_SUPABASE_BLOCKED | **YES** |
| GHA_INSERTS_DRAFTS | **YES** |
| STATUS_API_RETURNS_DRAFTS | **YES** |
| AGENTS_UI_SHOWS_DRAFT_SUMMARY | **YES** |
| ISSUES_UI_SHOWS_DRAFT_REVIEW | **YES** |
| OWNER_APPROVAL_REQUIRED | **YES** |
| NO_AUTO_PROMOTION | **YES** |
| NO_MEMORY_WRITES_APPROVED | **YES** |
| CONTINUOUS_STILL_DISABLED | **YES** |
| CRON_STILL_DISABLED | **YES** |
| VERCEL_FUNCTION_COUNT_SAFE | **YES** (8/12) |
| VERCEL_STAGING_DEPLOY_GREEN | **YES** |
| SAFE_FOR_PHASE_5D | **YES** |

---

## Verification commands

```bash
npx tsc --noEmit                    # pass
npm run build                       # pass
npm run agentops:monitoring-gha-dry-run-verify      # pass
npm run agentops:monitoring-runtime-wiring-verify   # pass
npm run agentops:monitoring-policy-verify           # pass
npm run agentops:vercel-function-count-verify       # pass (8/12)
```
