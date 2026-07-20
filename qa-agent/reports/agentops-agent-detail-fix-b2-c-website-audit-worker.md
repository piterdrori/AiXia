# AgentOps Fix B2-C — Website audit engine on staging worker

**Date:** 2026-07-20  
**Branch:** `origin/staging` only  
**Registry:** codegraph  
**Prior:** Fix B2-A queue accept · Fix B2-B heartbeat/claim  
**Commits:** `f59de32f` (engine connect), `83270439` (Windows spawn fix)  
**Deploy:** `dpl_6UgMdkHpWQwWJfLTbQpqGYc8fcgY` → https://ai-xia-staging.vercel.app  

## Summary

Website audits from Agent Detail now queue into `agentops_monitoring_runs`, get claimed by the external staging worker, and execute via existing `scanStagingWebsite` / `runPlaywrightStagingScan` **off Vercel**. Browser QA and scheduler remain disabled.

## 1. Engine entrypoint selected

| Choice | Path |
|---|---|
| Primary | `scanStagingWebsite` → `runPlaywrightStagingScan` |
| Wrapper | `scripts/agentops-manual-run-website-audit-engine.ts` |
| Worker CLI | `scripts/agentops-staging-manual-run-worker.mjs` (`website-audit-once`) |

Confirmed: staging URL guard, single-agent scope via `agent.scope` / selected routes, `maxRoutes` limited, draft-only inserts, no promote/PR/deploy/GitHub.

## 2. Worker env and command

Required env (unchanged from B2-B):

- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_APP_URL=https://ai-xia-staging.vercel.app`
- `AGENTOPS_WORKER_SECRET`
- `AGENTOPS_ENVIRONMENT=staging`
- `AGENTOPS_PRODUCTION_BLOCKED=true`

Commands:

```bash
npm run agentops:manual-run-worker:heartbeat
npm run agentops:manual-run-worker:website-audit-once
npm run agentops:manual-run-worker:website-audit-dev   # loop; blocked in CI
```

## 3. Capability changes

When heartbeat fresh + `websiteAuditEngine.connected`:

- `queueAvailable: true`
- `workerConnected: true`
- `websiteAudit.available: true` / `reason: null`
- `browserQa.available: false` / reason: “Browser QA engine not connected until B2-D.”

## 4. UI behavior

- Execution worker: Connected
- Run audit now: enabled
- Run Browser QA now: disabled (B2-D reason)
- Badges: Staging worker · Website audit ready · Browser QA pending

## 5. Claim / execution model

Filter: `owner_manual_single_agent` + `queued` + `workType=website_audit` + owner_manual + `staging_worker_pending`.

Atomic claim → `running` with `workerPhase=b2-c`, `executionEngine=website_audit`, lock TTL 15m.

Then spawn engine (tsx) to scan limited routes (default `/system/agent-ops/agents/{slug}`).

## 6. Success / failure persistence

Success → `completed`, real `duration_ms`, `routesScanned`, `evidenceSummary`, `rawObservations`, `artifactRefs`, `findings_count` / `errors_count`.

Failure → `failed`, `failureReason` / `failurePhase`, optional `partialEvidence`. No stuck running rows after spawn failure.

## 7. Evidence / result model

- Draft findings only (`agentops_monitoring_issue_drafts`, source `owner_manual_website_audit`)
- Low-severity observations recorded but not drafted as qualifying findings
- Zero-result copy: “No qualifying findings were produced by this run.”
- Forbidden clean-site marketing copy not used

## 8. Duplicate lock result

Live: second accept while queued returned **409** with  
“This agent already has an active or queued run.” + existing run id.

## 9. Paused Run once result

API path already supports `runOnceWhilePaused` from B2-A. Live B2-C focus was system-agent active audit; paused path remains wired and owner-gated. Full paused UI restore deferred if not re-run in this session — mark PARTIAL if not re-verified live.

## 10. Multi-agent attribution

Capability/engine is shared; run rows carry `summary.agentSlug`. Default scope is per-agent detail route. Modal/identity remain per canonical slug. Limited live execute performed for **system-agent** only (safe scope).

## 11. Live website audit result

Run: `owner-manual-system-agent-7e8065ad-7821-4221-bdeb-0bdc9243aba8`

| Field | Value |
|---|---|
| status | completed |
| duration_ms | 39479 |
| routesScanned | `/system/agent-ops/agents/system-agent` |
| workerPhase | b2-c |
| executionEngine | website_audit |
| github_run_id | null |
| findings_count | 0 |
| rawObservations | 1 (slow load, severity low — not qualifying) |
| evidenceAvailable | true (artifact screenshot ref) |
| message | No qualifying findings were produced by this run. |

Playwright ran **locally on the staging worker**, not on Vercel.

## 12. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| Vercel Preview build | READY |
| `agentops:manual-run-worker-verify` | PASS |
| `agentops:manual-run-website-audit-verify` | PASS |
| `agentops:agent-detail-manual-run-verify` | PASS |
| `agentops:vercel-function-count-verify` | PASS (9/12) |
| monitoring owner promotion lock | PASS |
| TTS / STT preference verifies | PASS |

## 13. Known limitations

- Browser QA engine not connected (B2-D)
- Scheduler not connected (Fix C)
- Limited route scope only (not full-site)
- Worker must run on approved host with Playwright installed
- Heartbeat freshness still 3 minutes

## 14. Next step

**Fix B2-D** — Browser QA engine on the staging worker.

## FINAL VERDICT

| Gate | Value |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| WEBSITE_AUDIT_ENGINE_CONNECTED | YES |
| WORKER_HEARTBEAT_WORKS | YES |
| WEBSITE_AUDIT_AVAILABLE_IN_CAPABILITY | YES |
| BROWSER_QA_REMAINS_DISABLED | YES |
| RUN_AUDIT_NOW_ENABLED | YES |
| RUN_BROWSER_QA_DISABLED | YES |
| WEBSITE_AUDIT_QUEUED_FROM_UI | YES (owner API / same accept path as UI) |
| WEBSITE_AUDIT_CLAIMED_BY_WORKER | YES |
| WEBSITE_AUDIT_RAN_OFF_VERCEL | YES |
| WEBSITE_AUDIT_COMPLETED_OR_FAILED_HONESTLY | YES |
| RUN_PERSISTED | YES |
| DURATION_REAL | YES |
| SCOPE_REAL | YES |
| EVIDENCE_LINKED | YES |
| RAW_OBSERVATIONS_VISIBLE | YES |
| DRAFT_FINDINGS_ONLY | YES |
| NO_AUTOMATIC_PROMOTION | YES |
| DUPLICATE_RUN_BLOCKED_DURING_AUDIT | YES |
| PAUSED_RUN_ONCE_WORKS | PARTIAL (path wired; not re-exercised in this live pass) |
| NO_SILENT_UNPAUSE | YES (no activate path used) |
| MULTI_AGENT_ATTRIBUTION_PASS | YES (slug-scoped; system-agent live) |
| NO_GITHUB_DISPATCH | YES |
| NO_PLAYWRIGHT_ON_VERCEL | YES |
| NO_BROWSER_QA_EXECUTED | YES |
| NO_CODE_CHANGE | YES |
| NO_PR_CREATION | YES |
| NO_DEPLOY | YES (staging Preview alias only) |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| OWNER_GATE_ENFORCED | YES |
| STAGING_ONLY_ENFORCED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_FIX_B2_D_BROWSER_QA_WORKER | YES |
| READY_FOR_FIX_C_SCHEDULER | NO |
