# AgentOps Monitoring Owner Promotion Lock — Phase 5D + 5E Final

**Status:** Active governance — owner-click promotion + proposal-only memory queue locked  
**Effective:** 2026-07-06 (5D) · 2026-07-07 (5E memory proposal lock)  
**Branch verified:** `staging` @ `686686ef`  
**Supersedes:** Informal Phase 5C draft-only notes; Phase 5D-only lock without memory proposal section  
**Subordinate to:**

1. `registry/ACDL_SYSTEM_LOCK_v2.1.md`
2. `registry/AGENTOPS_RUNTIME_ARCHITECTURE_FREEZE.md`
3. `registry/AGENTOPS_RUNTIME_SEMANTIC_BOUNDARY.md`
4. `registry/AGENTOPS_MONITORING_RUNTIME_CONTRACT.md`

**This document is governance only. It does not enable cron, continuous monitoring, auto-promotion, auto-fix, auto-deploy, active memory application, or approved memory writes.**

---

## 1. Purpose

Lock the verified AgentOps monitoring workflow as an official **staging-only, owner-gated** capability:

**Monitoring run → evidence-backed issue draft → owner review → owner approval → owner-click promotion → live AgentOps issue**

No step in this chain may bypass explicit owner action for promotion. GHA and runtime paths may create **drafts only** — never live issues without owner click.

---

## 2. Current capability (Phase 5D + 5E verified)

| Phase | Capability | Status |
|-------|------------|--------|
| 5A | GHA manual-dispatch scheduled **dry-run** monitoring | Active |
| 5B | Staging Supabase run index (`agentops_monitoring_runs`) | Active |
| 5C | Owner-gated issue **drafts** from dry-run findings | Active |
| 5D | Owner-click **promotion** to live `agentops_issues` | Active |
| 5E | Memory **proposal queue** from monitoring (proposal-only) | Active |
| 5F | Owner-click **apply** approved proposal → `agentops_memory` | **Not enabled** |

**Verified on staging (2026-07-06 — 5D):**

- Browser QA: `qa-agent/browser-qa/tests/monitoring-phase5d-promote-smoke.spec.mjs` — **PASS**
- Promoted issues: analytics-agent → **BQA-0B036BE3**; config-agent → **BQA-7121AF8F**
- Supabase: exactly **one** live issue per promoted draft; duplicate promotion blocked

**Verified on staging (2026-07-06 — 5E):**

- GHA run [28774559888](https://github.com/piterdrori/AiXia/actions/runs/28774559888) — **1 memory proposal** inserted
- Run index: `actualMemoryWrites=0`, `actualIssuesCreated=0`
- Status API: `memoryProposalOnly=true`, `activeMemoryWrites=false`, `ownerApprovalRequired=true`
- Staging alias: `https://ai-xia-staging.vercel.app` → Phase 5E deployment

---

## 3. End-to-end verified workflow

```
GHA workflow_dispatch (dry-run)
  → Playwright Browser QA on staging routes
  → JSON report + run index row (agentops_monitoring_runs)
  → Issue draft rows (agentops_monitoring_issue_drafts, status=draft)
  → Owner reviews in Issues hub → Monitoring drafts panel
  → Owner clicks Approve draft (status=owner_approved)
  → Owner clicks Promote to Issue (POST /api/agentops/monitoring/drafts/promote)
  → Live agentops_issues row created (status=open, environment=staging)
  → Draft status=promoted, promoted_issue_id stored
  → Issue visible in Issues hub as BQA-{code}
```

**Owner approval points (mandatory):**

1. GHA run — manual `workflow_dispatch` only (no cron)
2. Draft decision — Approve / Reject / Defer (owner click)
3. Promotion — separate **Promote to Issue** click (never automatic)

---

## 4. Draft status lifecycle

| Status | Meaning | Promotion allowed |
|--------|---------|-------------------|
| `draft` | Awaiting owner review | **No** |
| `owner_approved` | Owner approved; not yet promoted | **Yes** (owner-click only) |
| `rejected` | Owner rejected | **No** |
| `deferred` | Owner deferred | **No** |
| `promoted` | Live issue created | **No** (idempotent return only) |

Transitions:

- `draft` → `owner_approved` | `rejected` | `deferred` via `POST .../drafts/decision`
- `owner_approved` → `promoted` via `POST .../drafts/promote` only
- `promoted` is terminal (no revert without separate governance)

---

## 5. Promotion requirements

All must pass (`agentOpsMonitoringIssuePromotionPolicy.ts`):

| Requirement | Detail |
|-------------|--------|
| Supabase project | Staging ref `ydppcpbxrvvardeslzrk` only |
| Draft status | `owner_approved` |
| Evidence | Browser QA (Playwright + route) on draft |
| Content | Title + summary + (route or module) |
| Owner identity | `ownerId` + `explicitOwnerClick: true` |
| Pipeline context | `pipelineContext: "automatic"` **forbidden** |
| Already promoted | Blocked if `promoted_issue_id` set |
| Auto-fix / deploy | Blocked if evidence requests it |
| Production | Blocked |

**API:** `POST /api/agentops/monitoring/drafts/promote`  
**Payload:** `{ draftId, ownerId }`  
**Handler:** `api/agentops/_lib/monitoringRoutes.ts` → `handleMonitoringDraftPromoteRequest`

---

## 6. Safety guarantees

- **No auto-promotion** — GHA inserts drafts only; promotion is API + UI owner click
- **No auto-apply memory** — GHA inserts memory proposals only; approve sets `owner_approved` without writing `agentops_memory`
- **No live writes from GHA dry-run** — `actual_issues_created=0`, `actual_memory_writes=0` on run index
- **Duplicate promotion blocked** — `promoted_issue_id`, `source_draft_id` evidence, duplicate_key, DB open dedupe index
- **Staging only** — production URLs and non-staging Supabase refs rejected
- **Vercel-safe API** — single `api/agentops/monitoring.ts` function; promote route via rewrite
- **Function count** — ≤12 Vercel API route files (verified by `agentops:vercel-function-count-verify`)

---

## 7. Forbidden actions (permanent until new governance)

| Action | Status |
|--------|--------|
| Cloud cron for monitoring | **Forbidden** (schedule commented in workflow) |
| Continuous monitoring loops | **Forbidden** (`CONTINUOUS_ENABLED=false` in GHA) |
| Auto-promote draft → issue | **Forbidden** |
| Auto-create live issues from monitoring | **Forbidden** in dry-run / default paths |
| Auto-fix / auto-deploy from monitoring | **Forbidden** (Level 4) |
| Approved memory writes from monitoring | **Forbidden** |
| Auto-apply memory proposal → `agentops_memory` | **Forbidden** (Phase 5E) |
| Bulk approve memory proposals | **Forbidden** (Phase 5E) |
| Production Supabase / production URL | **Forbidden** |
| Bulk promote | **Forbidden** (UI: one draft at a time) |
| Modify ACDL engines for monitoring promotion | **Forbidden** |

---

## 8. Data tables involved

| Table | Role |
|-------|------|
| `agentops_monitoring_runs` | GHA dry-run run index (summaries, counts, github_run_id) |
| `agentops_monitoring_issue_drafts` | Owner-gated drafts; status lifecycle; `promoted_issue_id` |
| `agentops_monitoring_memory_proposals` | Owner-gated memory proposals; no auto-apply in Phase 5E |
| `agentops_issues` | Live staging issues after owner-click promotion |
| `agentops_memory` | Active memory — **not written** by Phase 5E monitoring paths |
| `agentops_agents` | Agent slug → `agent_id` resolution for promotion |
| `agentops_agent_logs` | Audit log entry on promotion (`issue_detected` payload) |

**Schema note:** `source`, `source_draft_id`, `source_run_id` live in `agentops_issues.evidence` jsonb — not separate columns.

---

## 9. Evidence requirements

Issue **drafts** and **promotion** require Browser QA evidence:

- `browser_qa_evidence.scan_mode === "playwright"`
- Route or absolute URL present
- Finding from dry-run with `productionBlocked=true`

Policy: `agentOpsMonitoringIssueDraftPolicy.ts`, `agentOpsMonitoringIssuePromotionPolicy.ts`

---

## 10. Duplicate promotion protection

Before creating a live issue:

1. Return existing if `draft.promoted_issue_id` set
2. Query `agentops_issues` where `evidence.source_draft_id = draftId`
3. Reuse issue from same `duplicate_key` on another promoted draft
4. Catch DB unique index `idx_agentops_issues_open_dedupe` on `(agent_id, page_url)`

Repeat promote returns same `issueId` with `alreadyPromoted: true`.

---

## 11. Staging-only requirement

- Staging Supabase: `ydppcpbxrvvardeslzrk`
- Staging URL: `https://ai-xia-staging.vercel.app` (or local dev with staging env)
- `agentops_issues.environment` CHECK = `staging`
- API guard: `guardAgentOpsExecutionResponse` + staging ref inference

---

## 12. Production block

- Production hostnames blocked by `stagingScanUrlGuard`
- Non-staging Supabase ref blocks draft insert and promotion
- `AGENTOPS_PRODUCTION_BLOCKED=true` in GHA workflow
- No production Vercel deploy from monitoring workflow

---

## 13. Monitoring Memory Proposal Queue — Phase 5E

**Table:** `agentops_monitoring_memory_proposals`  
**Migration:** `supabase/migrations/20260706120000_agentops_monitoring_memory_proposals.sql`

Monitoring findings may create **memory proposals only** — never active memory. GHA and runtime paths insert proposal rows; they do **not** write to `agentops_memory`, Hermes memory, or global memory providers.

### 13.1 Proposal creation requirements

All must pass (`agentOpsMonitoringMemoryProposalPolicy.ts`):

| Requirement | Detail |
|-------------|--------|
| Dry-run | `dryRun === true` |
| Production blocked | `productionBlocked === true` |
| No active memory writes | `actualMemoryWrites === 0` |
| No live issues created | `actualIssuesCreated === 0` |
| Target class | `staging`, `preview`, or `local` only |
| Supabase project | Staging ref `ydppcpbxrvvardeslzrk` only |
| Evidence | Non-empty `proposal`, `rationale`, and `evidence` jsonb on each row |
| Repeated / high-signal | ≥2 agents **or** ≥2 routes for same normalized pattern; confidence ≥ 0.68 |

Single-run, single-agent-only findings → **zero proposals** (conservative; acceptable).

### 13.2 Proposal status lifecycle

| Status | Meaning | Active memory written |
|--------|---------|----------------------|
| `proposal` | Awaiting owner review | **No** |
| `owner_approved` | Owner approved intent only | **No** |
| `rejected` | Owner rejected | **No** |
| `deferred` | Owner deferred | **No** |
| `applied` | Reserved for Phase 5F apply | **No** in Phase 5E |

**Phase 5E supports only:** Approve · Reject · Defer

- **Approve** sets `status=owner_approved` only — it does **not** mean active memory.
- **`owner_approved` ≠ active memory.** Applying to `agentops_memory` is **Phase 5F** and requires a separate explicit owner click.
- No automatic Hermes/global memory mutation.
- No bulk approval or auto-apply.

### 13.3 End-to-end memory proposal workflow

```
GHA workflow_dispatch (dry-run)
  → JSON report + run index row
  → Issue draft rows (unchanged Phase 5C behavior)
  → Memory proposal candidates extracted (conservative)
  → Proposal rows inserted (status=proposal) — service role only
  → Owner reviews in Memory hub → Monitoring proposals panel
  → Owner clicks Approve / Reject / Defer
  → POST /api/agentops/monitoring/memory-proposals/decision
  → Status updated; activeMemoryWritten=false returned
  → (Phase 5F) separate owner-click apply → agentops_memory — NOT in 5E
```

**API routes (same `api/agentops/monitoring.ts` function):**

- `GET /api/agentops/monitoring/memory-proposals`
- `POST /api/agentops/monitoring/memory-proposals/decision` — payload `{ proposalId, decision, ownerId }`
- Decision values: `owner_approved` | `rejected` | `deferred` only (no `apply`, no `applied` transition in 5E)

### 13.4 Phase 5E forbidden actions

| Action | Status |
|--------|--------|
| Auto-apply proposal → `agentops_memory` | **Forbidden** |
| Approve writes active memory | **Forbidden** |
| Bulk approve / promote all proposals | **Forbidden** |
| Hermes/global memory mutation from monitoring | **Forbidden** |
| GHA writes `approved: true` memory | **Forbidden** |
| Production Supabase for proposals | **Forbidden** |

**Does not relax Phase 5D promotion lock.** Issue draft → promote workflow unchanged.

---

## 14. Phase 5F boundaries (not in scope of this lock)

Phase 5F may address **owner-click apply** of `owner_approved` memory proposals to `agentops_memory`:

- Requires separate explicit owner click (not automatic on approve)
- Requires separate governance revision and verification script
- Does **not** relax Phase 5D promotion lock or Phase 5E proposal-only rules until approved

**Do not enable Phase 5F without explicit owner approval and lock document update.**

---

## 15. Implementation map

| Artifact | Path |
|----------|------|
| Draft policy | `src/lib/agentops/runtime/agentOpsMonitoringIssueDraftPolicy.ts` |
| Draft persistence | `src/lib/agentops/runtime/agentOpsMonitoringIssueDrafts.ts` |
| Promotion policy | `src/lib/agentops/runtime/agentOpsMonitoringIssuePromotionPolicy.ts` |
| Promotion repository | `src/lib/agentops/runtime/agentOpsMonitoringIssuePromotion.ts` |
| Memory proposal policy | `src/lib/agentops/runtime/agentOpsMonitoringMemoryProposalPolicy.ts` |
| Memory proposal persistence | `src/lib/agentops/runtime/agentOpsMonitoringMemoryProposals.ts` |
| Owner API | `api/agentops/_lib/monitoringRoutes.ts` |
| Issue draft UI | `src/app/system/agent-ops/issues/MonitoringIssueDraftsReview.tsx` |
| Memory proposal UI | `src/app/system/agent-ops/memory/MonitoringMemoryProposalsReview.tsx` |
| Agents hub summary | `src/app/system/agent-ops/agents/AgentScheduledMonitoringCard.tsx` |
| GHA workflow | `.github/workflows/agentops-monitoring-scheduled-dry-run.yml` |
| GHA memory proposals insert | `scripts/agentops-monitoring-gha-memory-proposals-insert.ts` |
| Browser QA (5D) | `qa-agent/browser-qa/tests/monitoring-phase5d-promote-smoke.spec.mjs` |

---

## 16. Verification commands

```bash
npm run agentops:monitoring-owner-promotion-lock-verify
npm run agentops:monitoring-gha-dry-run-verify
npm run agentops:monitoring-policy-verify
npm run agentops:monitoring-runtime-wiring-verify
npm run agentops:vercel-function-count-verify
npx playwright test -c qa-agent/browser-qa/playwright.config.mjs \
  qa-agent/browser-qa/tests/monitoring-phase5d-promote-smoke.spec.mjs
```

---

## 17. Reports (evidence)

| Report | Path |
|--------|------|
| Phase 5C draft pipeline | `qa-agent/reports/agentops-monitoring-phase5c-issue-draft-pipeline.md` |
| Phase 5D promotion | `qa-agent/reports/agentops-monitoring-phase5d-owner-click-issue-promotion.md` |
| Phase 5D final lock | `qa-agent/reports/agentops-monitoring-phase5d-final-lock.md` |
| Phase 5E memory proposal queue | `qa-agent/reports/agentops-monitoring-phase5e-memory-proposal-queue.md` |
| Phase 5E final lock | `qa-agent/reports/agentops-monitoring-phase5e-final-lock.md` |
| Browser QA JSON | `qa-agent/reports/browser-qa/monitoring-phase5d-promote-smoke-report.json` |

---

## Last updated

Phase 5D owner promotion lock: 2026-07-06  
Phase 5E memory proposal queue lock: 2026-07-07
