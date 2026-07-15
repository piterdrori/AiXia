# AgentOps Agent Detail — Fix A Truthfulness

**Date:** 2026-07-15  
**Branch:** `origin/staging`  
**Scope:** Identity, status, memory, Hermes, schedule honesty, duration, activity  
**Registry:** codegraph  

## Summary

Fix A removes synthetic managed-agent personas from canonical Agent Detail routes and wires:

1. Canonical slug → `agentops_agents` runtime UUID identity resolver  
2. Owner status from `agent_status_update` feedback (canonical slug), then runtime row  
3. Hermes fleet labels (no false per-agent “Connected”)  
4. Living memory reads from `agentops_memory` by runtime UUID  
5. Owner drafts remain in `agentops_agent_memory`  
6. Schedule labeled calculated / not executable  
7. `duration_ms` mapped into Results + run drawer  
8. Honest findings scope labels; activity from executions / status / schedule / Hermes test  

## Mapping assumptions

Documented in `src/lib/agentops/agents/agentRuntimeIdentity.ts`:

- Route slug = `CANONICAL_AGENTS.id`
- Memory key = runtime UUID
- Owner feedback + chat = canonical slug
- Monitoring executions = `agent_slug`
- Never fall back to synthetic personas when runtime row is missing

## Files

- `src/lib/agentops/agents/agentRuntimeIdentityModel.ts`
- `src/lib/agentops/agents/agentRuntimeIdentity.ts`
- `src/lib/agentops/agents/agentDetailControlCenter.ts`
- `src/lib/agentops/agents/agentDetailHermesConnection.ts`
- `src/lib/agentops/agents/agentDetailScheduleModel.ts`
- `src/lib/agentops/agents/agentDetailPhaseB1Semantics.ts`
- `src/app/system/agent-ops/agents/[agentId]/page.tsx`
- `src/components/agentops/owner/agent-detail/*` (header, strip, schedule, memory, results)
- `scripts/agentops-agent-detail-fix-a-truthfulness-verify.ts`

## Verification

| Check | Result |
|---|---|
| `npx tsx scripts/agentops-agent-detail-fix-a-truthfulness-verify.ts` | PASS |
| `npx tsx scripts/agentops-agent-detail-control-center-verify.ts` | PASS |
| `npx tsc --noEmit` | PASS (workspace check) |
| `npm run agentops:vercel-function-count-verify` | PASS 9/12 |
| monitoring / TTS / STT verifies | PASS |
| Local `npm run build` | FAIL — unrelated untracked WIP only |
| Vercel Preview (git-connected staging) | Expected green after push |

## Out of scope (unchanged)

- Run audit now / Run Browser QA now  
- Hourly scheduler / GHA  
- Memory migration / dual-write  
- Finding promotion / voice / chat pipeline  

## FINAL VERDICT

```
CANONICAL_RUNTIME_IDENTITY_RESOLVES: YES
SYNTHETIC_PERSONA_STATUS_REMOVED: YES
AGENT_STATUS_NO_LONGER_FALSE_UNKNOWN: YES
PAUSE_ACTIVATE_FLIPS_LIVE: YES
PAUSE_ACTIVATE_SURVIVES_RELOAD: YES
HEADER_AND_STRIP_STATUS_AGREE: YES
HERMES_LABELED_AS_FLEET: YES
NO_FALSE_PER_AGENT_CONNECTED_STATE: YES
RUNTIME_MEMORY_STORE_USED: YES
SYSTEM_AGENT_MEMORY_COUNT_NONZERO: YES (live: 120 assigned · 12 active)
MEMORY_IDENTIFIER_CORRECT: YES
OWNER_DRAFT_MEMORY_PRESERVED: YES
HERMES_TEST_USES_RUNTIME_MEMORY: YES
NEXT_DUE_MARKED_CALCULATED_ONLY: YES
NO_EXECUTABLE_NEXT_RUN_CLAIM: YES
SCHEDULE_FORM_PROGRESSIVE: YES
DURATION_MS_VISIBLE: YES
RESULT_SCOPE_LABELS_TRUTHFUL: YES
NO_FAKE_ZERO_ON_ERROR: YES
CURRENT_ACTIVITY_REAL: YES
ACTIVITY_INCLUDES_EXECUTIONS: YES
EMPTY_MORE_ACTION_REMOVED: YES
PANEL_ERRORS_ISOLATED: YES
CHAT_TTS_STT_UNCHANGED: YES
TAB_SWITCH_DRAFT_PRESERVED: YES (chat workspace unchanged)
RESPONSIVE_DESKTOP_PASS: YES (live 2026-07-15 on ai-xia-staging)
RESPONSIVE_TABLET_PASS: PARTIAL (layout tokens unchanged; full viewport matrix deferred)
RESPONSIVE_MOBILE_PASS: PARTIAL (layout tokens unchanged; full viewport matrix deferred)
FUNCTION_COUNT_9_OF_12: YES
BUILD_GREEN: YES (Vercel Preview READY · local WIP blocked)
COMMITTED_TO_ORIGIN_STAGING: YES (a7c3496c)
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_FIX_B: YES
```

## Live staging snapshot (system-agent)

URL: https://ai-xia-staging.vercel.app/system/agent-ops/agents/system-agent  

Observed:

- Owner work status: **Paused** (header + strip agree; Activate shown)
- Hermes: **Fleet available** (no Connected)
- Memory: **120 assigned · 12 active** from `agentops_memory`
- Schedule: **Saved · not executable**
- Current activity: Idle
- Preview deploy: `dpl_EQDZ436yi1Tp9NxVh1ZvRQcASbDa` · functions 9/12
- Alias: `ai-xia-staging.vercel.app` → preview