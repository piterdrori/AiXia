# AgentOps Monitoring Runtime Contract — Phase 1 Safety Foundation

**Status:** Active governance — Phase 1 (foundation only)  
**Effective:** 2026-06-16  
**Supersedes:** Informal monitoring notes in scheduled/continuous audit  
**Complements:** `registry/ACDL_SYSTEM_LOCK_v2.1.md` · `registry/AGENTOPS_ACDL_STABLE_BASELINE.md` · `registry/AGENTOPS_RUNTIME_ARCHITECTURE_FREEZE.md` · `registry/AGENTOPS_RUNTIME_SEMANTIC_BOUNDARY.md` · `registry/AGENTOPS_GLOBAL_UX_FREEZE.md` · `src/lib/agentops/usl/`

**This document is governance only. Phase 1 does not activate scheduling, continuous loops, or cloud cron.**

---

## 1. Monitoring purpose

AgentOps monitoring observes the **staging** deployment for regressions, UX/design drift, runtime health, logs, and configuration signals. Findings may inform **owner-reviewed** issue drafts and **proposal-only** memory — never autonomous production change.

Monitoring exists to:

- Give owners synthetic-employee-style visibility on staging routes
- Produce **evidence-bound** observations (Browser QA / Playwright)
- Prepare scheduled and continuous modes for explicit Phase 2/3 activation
- Block unsafe automation (production, auto-fix, auto-deploy, silent memory approval)

---

## 2. Allowed monitoring levels (0–3)

| Level | Name | Phase 1 state | Description |
|-------|------|---------------|-------------|
| **0** | Manual only | **ACTIVE** | Owner triggers work (Run manual cycle). No automatic loops. |
| **1** | Scheduled monitoring | **Prepared, not active** | Agents scan staging on configured intervals — requires explicit env + cloud activation in Phase 2. |
| **2** | Continuous watch | **Prepared, not active** | Per-agent repeated monitoring — requires explicit env + worker activation in Phase 2. |
| **3** | Auto issue drafting / promotion | **Prepared, not active** | Issue creation from monitoring allowed only with Browser QA evidence + policy + owner-safe status rules. |
| **4** | Auto fix / deploy | **FORBIDDEN** | Must remain blocked in all phases until separate owner contract. |

**Active level today:** Level 0 only (`AGENTOPS_MONITORING_LEVEL` defaults to `0`).

---

## 3. Forbidden Level 4

No monitoring path may:

- Apply fixes autonomously
- Deploy to any environment
- Mutate production data or configuration
- Bypass ACDL orchestration locks
- Promote issues to “approved for fix” without owner action

Level 4 is **permanently blocked** in Phase 1 and must not be enabled without a new governance revision.

---

## 4. Staging-only requirement

- All Playwright / Browser QA scans target **staging hosts only**
- Production hostnames (`aixia.app`, `*.aixia.app`, hosts containing `production`) are **blocked**
- `VERCEL_ENV=production` blocks runtime Playwright execution
- Remote staging requires explicit `AGENTOPS_RUNTIME_ALLOW_REMOTE_STAGING=true`
- Policy module: `assertMonitoringActionAllowed` rejects non-staging URLs

---

## 5. Owner approval requirements

| Action | Owner approval |
|--------|----------------|
| Start scheduled loop | Explicit env flag + Phase 2 cloud/worker activation |
| Start continuous loop | Explicit env flag + Phase 2 worker activation |
| Promote issue from monitoring | Owner review (issue-agent may draft only) |
| Approve memory from monitoring | Owner approval — monitoring writes are `approved: false` |
| Enable Level 3 issue auto-create | `AGENTOPS_MONITORING_LEVEL>=3` + `AGENTOPS_MONITORING_ISSUE_AUTO_CREATE=true` |
| Auto-fix / deploy | **Never** without new contract |

---

## 6. Browser QA evidence requirement

Issue **creation** or **promotion** from monitoring requires evidence containing:

- `scan_mode: "playwright"` or `scan_mode: "browser_qa"`, **and**
- Route/page context (`route`, `page_url`, or `absolute_url`), **and**
- Staging URL reference where applicable

Findings without Browser QA evidence must **not** create or promote issues. Policy enforces this in `agentOpsRuntimeEngine` orchestration guards.

---

## 7. Issue creation rules

1. **Level 0–2:** Runtime engine **does not** auto-create issues (findings logged/skipped with policy reason).
2. **Level 3:** Auto-create allowed only when:
   - `AGENTOPS_MONITORING_ISSUE_AUTO_CREATE=true`
   - Agent role permits `canCreateIssueDraft`
   - Browser QA evidence present
   - Staging URL passes production block
3. **Promotion** (`canPromoteIssue`): issue-agent only; owner gate in product UI remains authoritative.
4. Duplicate dedupe (`idx_agentops_issues_open_dedupe`) still applies when creation is allowed.
5. Manual product cycle (`runAgentWorkCycle`) remains log-only for issues unless separately wired in Phase 2.

---

## 8. Memory update rules

- Monitoring cycles write memory with **`approved: false`** always
- `canUpdateMemory: "proposal_only"` agents may emit observation summaries only
- `canUpdateMemory: "none"` agents must not write monitoring memory
- Silent approval (`approved: true`) from monitoring paths is **forbidden**
- Chat-driven memory proposals remain separate (owner approval flow unchanged)

---

## 9. Agent participation roles

Twelve canonical agents have defined roles in `src/lib/agentops/runtime/agentOpsMonitoringPolicy.ts`:

| Agent | Scheduled | Continuous | Browse | Issue draft | Promote | Memory | Verify fix |
|-------|-----------|------------|--------|-------------|---------|--------|------------|
| system-agent | — | — | — | — | — | proposal | — |
| memory-agent | — | — | — | — | — | proposal | — |
| issue-agent | ✓ | — | — | ✓ | ✓ | proposal | — |
| evolution-agent | — | — | — | — | — | proposal | — |
| fix-agent | ✓ | — | ✓ | — | — | none | ✓ |
| qa-agent | ✓ | ✓ | ✓ | ✓ | — | proposal | — |
| design-agent | ✓ | ✓ | ✓ | ✓ | — | proposal | — |
| runtime-agent | ✓ | — | ✓ | — | — | proposal | — |
| logs-agent | ✓ | — | — | ✓ | — | proposal | — |
| config-agent | ✓ | — | — | ✓ | — | none | — |
| chat-agent | — | — | — | — | — | none | — |
| analytics-agent | ✓ | — | — | ✓ | — | proposal | — |

Roles are **conservative** — under-grant rather than over-grant. Phase 2 may tune participation with owner approval.

---

## 10. Manual / scheduled / continuous definitions

| Mode | Definition | Phase 1 |
|------|------------|---------|
| **Manual** | Owner clicks Run manual cycle on Agent Detail; single-shot staging work | Active |
| **Scheduled** | `runScheduledLoop` — interval tick for agents with `mode: scheduled` | Code exists; **not started**; blocked without `AGENTOPS_MONITORING_SCHEDULED_ENABLED=true` |
| **Continuous** | `runContinuousLoop` — per-agent infinite loop with delay | Code exists; **not started**; blocked without `AGENTOPS_MONITORING_CONTINUOUS_ENABLED=true` |
| **On-demand tick** | `POST /api/agentops/runtime/tick` or worker `once: true` | Allowed for manual/operator invocation; issue/memory guards still apply |

---

## 11. Cloud activation requirements (Phase 2+)

Before enabling Level 1/2 in production operations:

1. Phase 1 policy module merged and verification passing
2. Explicit owner sign-off on monitoring level
3. Env flags set on worker host only (not Vercel serverless by default)
4. Vercel cron / GitHub scheduled workflow — **not enabled in Phase 1**
5. `enableSchedule` / `intervalMinutes` in DB honored by engine (Phase 2 wiring)
6. Per-agent schedule respect in `runRuntimeTick` (Phase 2)
7. Browser QA evidence pipeline verified end-to-end
8. Runbook entry in `qa-agent/` with rollback steps

---

## 12. Verification commands

```bash
npx tsc -b
npx tsx scripts/agentops-usl-verify.ts
npx tsx scripts/agentops-acdl-architecture-lock-verify.ts
npx tsx scripts/agentops-runtime-immutability-check.ts
npx tsx scripts/agentops-runtime-semantic-verify.ts
npx tsx scripts/agentops-global-ux-freeze-verify.ts
npx tsx scripts/agentops-monitoring-policy-verify.ts
# or
npm run agentops:monitoring-policy-verify
```

---

## Implementation map

| Artifact | Path |
|----------|------|
| Policy module | `src/lib/agentops/runtime/agentOpsMonitoringPolicy.ts` |
| Runtime orchestration guards | `src/lib/agentops/runtime/agentOpsRuntimeEngine.ts` |
| Worker loop gate | `src/lib/agentops/runtime/agentOpsRuntimeWorker.ts` |
| Policy verification | `scripts/agentops-monitoring-policy-verify.ts` |

**ACDL engine changes:** None required for Phase 1.
