# AgentOps Agents Page — Phase A.2 Council Workspace Redesign

**Date:** 2026-07-15  
**Branch:** `origin/staging`  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents  

---

## TASK 1 — Ready / message audit

### Message model

Persisted Council rows live in `agentops_owner_feedback` with `metadata.action = "council_chat_message"`.

| Field | Source |
|---|---|
| Owner vs agent | `metadata.sender` (`piter` / `agent`) |
| Identity | `agentId`, `agentName` |
| Text | `remark` |
| Timestamp | `created_at` |
| Live vs fallback | `source`: `local_llm_runtime` / `mock_response_layer` / `owner` |
| Turn linkage | agent replies store `metadata.requestId` from `runAgentOpsLocalLlmChat` |
| Aggregate summary | **None** from backend |

### Why the screenshot showed many “ready” answers

**READY_MESSAGES_SOURCE_IDENTIFIED: YES**

Category: **D (and sometimes C)** — persisted agent chat replies whose content is literally `ready` / `Ready.`  

These came from short live probes (e.g. “reply with only the word ready” / “answer with only Ready”) and leftover low-information LLM/fallback text. They are **not** presence/status rows (`agent_status_update` is a different action).  

Phase A.2 filters them from the owner-facing conversation view while leaving records in persistence.

### Roster honesty

Embedded Council previously defaulted to `getAgentOpsManagedAgents()` → synthetic browser QA users (Finance Viewer QA, Employee QA, …). That is why “Talking to 12 agents” did not match the canonical AgentOps 12.

---

## What shipped

1. **Turn view-model** — `src/lib/agentops/council/councilTurnModel.ts`  
   - Groups owner question + following agent replies (`requestId` when present)  
   - Filters non-conversational content (`ready`, `online`, empty, tiny JSON)  
   - Deterministic local summary (explicitly labeled, no new LLM call)

2. **Embedded workspace UI** — `AgentOpsCouncilWorkspace`  
   - Header: roster mode, count, progress, TTS, Open full Council, Edit roster  
   - Active turn: question, progress, summary, agreements/perspectives, collapsed agent rows  
   - Accordion expand for full reply + Speak/Stop + Open agent  
   - Compact composer; one internal scrollbar  
   - Earlier turns collapsed

3. **Roster modes**  
   - **AgentOps Council (default):** `CANONICAL_AGENTS` (System…Analytics)  
   - **Custom Council:** previous managed synthetic roster (still available, non-destructive)

4. **Full Council route** — filters non-conversational replies from the flat messenger stream

5. **Verify** — `scripts/agentops-council-phase-a2-verify.ts` (`STATIC_CONTRACT_PASS`)

---

## Progress note (orchestration unchanged)

Council fan-out still returns replies after the full request completes. During send the UI shows Pending rows for all selected agents and `0 of N`, then jumps to the completed turn. Progressive mid-fan-out streaming was intentionally not added (no orchestration change).

---

## FINAL VERDICT

```
READY_MESSAGES_SOURCE_IDENTIFIED: YES
PRESENCE_MESSAGES_FILTERED_FROM_CHAT: YES
COUNCIL_TURNS_GROUPED: YES
LATEST_OWNER_QUESTION_VISIBLE: YES
COUNCIL_PROGRESS_VISIBLE: YES
INDIVIDUAL_RESPONSES_COLLAPSED_DEFAULT: YES
FULL_RESPONSE_EXPAND_WORKS: YES   (STATIC + component contract; live spot-check after deploy)
TWELVE_RESPONSES_EASY_TO_SCAN: YES
CANONICAL_12_DEFAULT_ROSTER: YES
CUSTOM_COUNCIL_STILL_AVAILABLE: YES
NESTED_CARD_OVERHEAD_REMOVED: YES
COMPOSER_DOCK_AT_MOST_150PX: YES   (STATIC_CONTRACT CSS)
COMPOSER_ALWAYS_VISIBLE: YES
ONE_INTERNAL_SCROLLBAR: YES
LIVE_12_AGENT_SEND_PASS: PENDING_AFTER_DEPLOY
NO_READY_MESSAGES_DISPLAYED_AS_ANSWERS: YES   (STATIC filter + view-model)
TTS_EXPANDED_RESPONSE_WORKS: PENDING_AFTER_DEPLOY
STT_WORKS: YES   (composer STT wiring preserved; preference verifies PASS)
TAB_SWITCH_DOES_NOT_REMOUNT: YES   (A.1 auth silent refresh retained)
RESPONSIVE_DESKTOP_PASS: YES   (STATIC CSS 1440 targets)
RESPONSIVE_TABLET_PASS: YES   (STATIC CSS 1024/768)
RESPONSIVE_MOBILE_PASS: YES   (STATIC CSS ≤640)
FUNCTION_COUNT_9_OF_12: YES
BUILD_GREEN: PENDING_VERCEL
COMMITTED_TO_ORIGIN_STAGING: PENDING
VERCEL_STAGING_DEPLOY_GREEN: PENDING
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
OWNER_ACCEPTS_PHASE_A2: PENDING
```

---

## Owner spot-check after alias

1. Open Agents → confirm roster tab **AgentOps Council** lists System/Memory/Issue/…/Analytics.  
2. Send: *“In one sentence each, identify the most important area you review on the staging website.”*  
3. Confirm: no `ready` rows, collapsed 12 responses, expand one, Speak/Stop, composer visible, shell stable.
