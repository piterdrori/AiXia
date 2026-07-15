# AgentOps Agents Page — Phase A.2 Council Workspace Redesign

**Date:** 2026-07-15  
**Branch:** `origin/staging` @ `aa32c4c8`  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents  
**Preview deploy:** `dpl_8tDbXmT3V3WxmkdVFPsihxzpBBtN` → alias `ai-xia-staging.vercel.app` (not `--prod`)

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

### Why screenshots showed many “ready” answers

**READY_MESSAGES_SOURCE_IDENTIFIED: YES**

Category: **D (and sometimes C)** — persisted agent chat replies whose content is literally `ready` / `Ready.` from short probe questions. Not presence/`agent_status_update` rows.

Filtered from the owner-facing conversation view; records kept in persistence.

### Roster honesty

Previous embedded default used managed synthetic QA users. AgentOps Council mode now defaults to canonical 12; Custom Council remains available.

---

## What shipped

1. **Turn view-model** — grouping by `requestId` / owner→agents; presence filter; deterministic local summary; roster-mode filter; orphan buckets dropped  
2. **Embedded workspace** — header / active turn / collapsed agent accordion / compact composer / history  
3. **Roster modes** — AgentOps Council (canonical 12) vs Custom Council  
4. **Send race fix** — keep in-flight until `loadData` completes; `sending` not tied to page loading  
5. **Verify** — `scripts/agentops-council-phase-a2-verify.ts` STATIC_CONTRACT_PASS  
6. **Live QA** — `qa-agent/scripts/agentops-agents-page-phase-a2-live.mjs`

---

## Live QA evidence (reverify after `aa32c4c8`)

| Metric | Result |
|---|---|
| Roster | `canonical`, question matched, **System…Analytics** rows |
| Progress | `12 of 12 agents replied` |
| Managed QA rows | none |
| Expanded default | 0 → expand to 1 works |
| TTS Speak/Stop | stopVisible + stopped |
| Shell | ~680px (before 683 / after 680) |
| Dock | 150px after |
| Composer | visible |
| Mobile 390 | no horizontal overflow |

Artifacts: `qa-agent/browser-qa-artifacts/phase-a2-council/`  
JSON: `qa-agent/reports/browser-qa/agentops-agents-page-phase-a2-live.json`

---

## FINAL VERDICT

```
READY_MESSAGES_SOURCE_IDENTIFIED: YES
PRESENCE_MESSAGES_FILTERED_FROM_CHAT: YES
COUNCIL_TURNS_GROUPED: YES
LATEST_OWNER_QUESTION_VISIBLE: YES
COUNCIL_PROGRESS_VISIBLE: YES
INDIVIDUAL_RESPONSES_COLLAPSED_DEFAULT: YES
FULL_RESPONSE_EXPAND_WORKS: YES
TWELVE_RESPONSES_EASY_TO_SCAN: YES
CANONICAL_12_DEFAULT_ROSTER: YES
CUSTOM_COUNCIL_STILL_AVAILABLE: YES
NESTED_CARD_OVERHEAD_REMOVED: YES
COMPOSER_DOCK_AT_MOST_150PX: YES
COMPOSER_ALWAYS_VISIBLE: YES
ONE_INTERNAL_SCROLLBAR: YES
LIVE_12_AGENT_SEND_PASS: YES
NO_READY_MESSAGES_DISPLAYED_AS_ANSWERS: YES
TTS_EXPANDED_RESPONSE_WORKS: YES
STT_WORKS: YES
TAB_SWITCH_DOES_NOT_REMOUNT: YES
RESPONSIVE_DESKTOP_PASS: YES
RESPONSIVE_TABLET_PASS: YES
RESPONSIVE_MOBILE_PASS: YES
FUNCTION_COUNT_9_OF_12: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
OWNER_ACCEPTS_PHASE_A2: PENDING
```

---

## Owner spot-check

1. Agents → **AgentOps Council** shows System/Memory/Issue/…/Analytics (not Finance Viewer QA).  
2. Custom Council tab still available.  
3. Ask once → combined local summary → 12 collapsed rows → expand one → Speak/Stop → composer stays visible.
