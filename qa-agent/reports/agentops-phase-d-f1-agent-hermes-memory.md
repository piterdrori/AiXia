# AgentOps Phase D-F1 — Dedicated Per-Agent Hermes Long-Term Memory

**Mode:** Staging-only architecture + implementation + QA  
**Registry:** codegraph  
**Branch:** `origin/staging`  
**Alias:** https://ai-xia-staging.vercel.app  
**Target:** `/system/agent-ops/agents/:agent`  
**Date:** 2026-07-21  

**Commits:**
- `07e706e2` — Connect AgentOps agents to Hermes memory
- `e36e9025` — Fix AgentOps Hermes memory TypeScript build
- `a6109976` — Fix Agent Hermes loading Unknown flash
- `03b117ed` — Harden D-F1 Hermes memory live QA wait
- (this report) — Document AgentOps Phase D-F1 agent Hermes memory

**Preview alias (not `--prod`):** latest Ready Preview → `ai-xia-staging.vercel.app`

Issues / Draft Issue approval workflow was **not** started.

---

## 1. Summary

D-E6 made the status strip honest, but Agent Detail still said Hermes was only fleet-available with no per-agent connection. D-F1 adds a real per-agent Hermes connection + namespace model, seeds all 12 canonical agents, wires Agent Detail to `getAgentHermesMemory`, and keeps memory improvements pending until owner approval.

---

## 2. Current Hermes/memory audit

| Topic | Finding |
|---|---|
| What Hermes meant | Fleet transport health via `GET /api/agentops/hermes` (`getAgentOpsHermesRuntimeHealth`) |
| Fleet Hermes transport | Advisory transport reachability — not per-agent memory |
| Per-agent connection table | **Missing before D-F1** (`agentSpecificRecordExists` always false) |
| Memory storage | `agentops_memory` (runtime UUID) + `agentops_agent_memory` (slug owner drafts) |
| slug → runtime UUID | `resolveAgentRuntimeIdentity` / `canonical:` tool tag on `agentops_agents` |
| Chat memory | `getAgentOpsAgentMemory` filtered by `active` (pending excluded if inactive) |
| Worker memory | Not wired into website audit / Browser QA prompt context |
| Approved | `agentops_agent_memory.active` + `metadata.approvalStatus` |
| Missing | Dedicated connection rows, unique namespaces, truthful Agent Hermes Connected, improvement pipeline UI |

---

## 3. Final per-agent Hermes model

A. **Hermes Connection** — `agentops_agent_hermes_connections`  
B. **Namespace** — `agentops.agent.<slug>` (unique)  
C. **Approved long-term** — owner-approved active `agentops_agent_memory`  
D. **Pending improvements** — `approvalStatus=pending_approval`, inactive until approve  
E. **Shared/global** — `agentops_memory` scope=global, labeled separately  
F. **Diagnostics** — runtime noisy/prompt-like rows, collapsed by default  

Connected only when connection record exists **and** retrieval works.

---

## 4. Data model changes

Migration: `supabase/migrations/20260721120000_agentops_agent_hermes_connections.sql`  
Applied to staging Supabase project.

Fields: `agent_slug`, `runtime_agent_id`, `hermes_namespace`, `status`, `connection_version`, health/sync timestamps, `metadata`.  
RLS: owner-only via `agentops_is_owner()`.  
No new Vercel function routes (budget unchanged 9/12).

---

## 5. Canonical agent connection records

Canonical roster (12): system, memory, issue, evolution, fix, qa, design, runtime, logs, config, chat, analytics.

Seed: `qa-agent/scripts/agentops-d-f1-seed-hermes-connections.mjs`  
Result: **12/12 upserted**, **12 connected**, namespaces unique.

---

## 6. Per-agent memory retrieval

`getAgentHermesMemory({ agentSlug, runtimeAgentId })` returns connection status, namespace, approved/pending/shared/diagnostic counts, sync times, banner copy.

Agent Detail Memory/Hermes panel uses this on load + Test Hermes + Refresh.

---

## 7. Memory improvement pipeline

Reuses `agentops_agent_memory` + existing approve/reject helpers:

- `proposeAgentMemoryImprovement` → pending draft  
- `approveAgentMemoryImprovement` → active approved  
- `rejectAgentMemoryImprovement` → rejected inactive  
No auto-approval / auto-application.

---

## 8. Agent Detail UI updates

Summary cards: Fleet Hermes · Agent Hermes · Namespace · Approved memory · Pending improvements · Diagnostics.  
Connected banner when retrieval-backed connection exists.  
Tabs: Approved → Pending → Shared/global → Diagnostics → Files → Runtime history.  
Default tab: Approved.

---

## 9. Test Hermes behavior

Output includes Fleet transport, Agent Hermes, Namespace, Approved memory loaded, Pending drafts.  
Does **not** say Connected from fleet transport alone.

Live design-agent sample:  
`Fleet transport: Available · Agent Hermes: Connected · Namespace: agentops.agent.design-agent · Approved memory loaded: 2 · Pending drafts: 2`

---

## 10. Refresh/sync behavior

Refresh memory reloads connection + approved + pending + shared counts + diagnostics and updates `lastMemorySyncAt` when appropriate. No auto-approval.

---

## 11. Chat/worker memory safety

| Surface | Status |
|---|---|
| Chat | Uses `selectApprovedAgentMemoryForPrompt` — approved active only |
| Pending in prompts | Excluded |
| Diagnostics in prompts | Excluded (not in agentops_agent_memory prompt path) |
| Worker audit/Browser QA | **NOT_WIRED** — documented; not pretended |

---

## 12. Live QA

Artifacts: `qa-agent/browser-qa-artifacts/phase-d-f1-hermes-memory/`  
JSON: `qa-agent/reports/runtime/phase-d-f1-hermes-memory-live-1784608510079.json`

| Agent | Agent Hermes | Namespace |
|---|---|---|
| system-agent | Connected | agentops.agent.system-agent |
| design-agent | Connected | agentops.agent.design-agent |
| qa-agent | Connected | agentops.agent.qa-agent |
| analytics-agent | Connected | agentops.agent.analytics-agent |
| runtime-agent | Connected | agentops.agent.runtime-agent |
| logs-agent | Connected | agentops.agent.logs-agent |

All six pass Connected + unique namespace + diagnostics collapsed label + connected banner.

---

## 13. Memory improvement live test

Script: `qa-agent/scripts/agentops-d-f1-memory-improvement-live.mjs`

| Step | Result |
|---|---|
| Create pending on design-agent | PASS |
| Not in approved yet | PASS |
| Approve → active for design-agent | PASS |
| qa-agent does not receive it | PASS |
| Reject other draft | PASS |

---

## 14. Regression checks (light)

- D-E1 / D-E2 / D-E4 / D-E6 verifies still pass  
- Online / status-strip verifies pass  
- Function count 9/12  
- No Issues workflow started  

---

## 15. Security checks

- No service role in browser  
- Owner RLS on connection table  
- No cross-agent leakage in live test  
- Pending/diagnostics excluded from chat prompt helper  
- No auto-approval / auto-application  
- main / production untouched  

---

## 16. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `agentops:vercel-function-count-verify` | 9/12 PASS |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:agent-detail-final-verify` | PASS |
| `agentops:agent-detail-memory-hermes-verify` | PASS |
| `agentops:agent-detail-online-verify` | PASS |
| `agentops:agent-detail-status-strip-verify` | PASS |
| `agentops:agent-hermes-memory-verify` | PASS |
| Vercel Preview build | Ready (after TS fix) |

---

## 17. Known limitations

1. Worker audit/Browser QA memory context still not injected (NOT_WIRED).  
2. Chat context indicator (“Using approved memory: N”) not added to avoid chat clutter.  
3. Existing runtime `agentops_memory` rows remain diagnostic-heavy; approved long-term lives primarily in `agentops_agent_memory`.  
4. Durable staging worker still required for online badges (unchanged from D-E5).  

---

## 18. Final readiness decision

Per-agent Hermes memory connections are real on staging, Agent Detail is truthful, and memory improvements require owner approval. Safe to proceed later to existing Issues review workflow — still not started here.

### FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| PER_AGENT_HERMES_MODEL_DEFINED | YES |
| CONNECTION_RECORDS_CREATED | YES |
| UNIQUE_NAMESPACE_PER_AGENT | YES |
| AGENT_HERMES_CONNECTED_WHEN_RETRIEVAL_WORKS | YES |
| FLEET_HERMES_STILL_SEPARATED | YES |
| APPROVED_MEMORY_SCOPED_PER_AGENT | YES |
| PENDING_MEMORY_IMPROVEMENTS_WORK | YES |
| MEMORY_APPROVAL_WORKS | YES |
| MEMORY_REJECTION_WORKS | YES |
| NO_PENDING_MEMORY_IN_PROMPT_CONTEXT | YES |
| NO_DIAGNOSTICS_IN_PROMPT_CONTEXT | YES |
| NO_CROSS_AGENT_MEMORY_LEAKAGE | YES |
| AGENT_DETAIL_HERMES_UI_UPDATED | YES |
| TEST_HERMES_CONNECTION_TRUTHFUL | YES |
| REFRESH_MEMORY_WORKS | YES |
| CHAT_MEMORY_CONTEXT_SAFE | YES |
| WORKER_MEMORY_CONTEXT_SAFE | NOT_WIRED |
| MEMORY_IMPROVEMENT_LIVE_TEST_PASS | YES |
| SIX_AGENT_LIVE_QA_PASS | YES |
| D_E6_STATUS_STRIP_REGRESSION_PASS | YES |
| WORKER_ONLINE_REGRESSION_PASS | YES |
| NO_MEMORY_AUTO_APPLICATION | YES |
| OWNER_APPROVAL_REQUIRED_FOR_MEMORY | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES (Vercel Preview) |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_EXISTING_ISSUES_REVIEW_WORKFLOW | YES |
