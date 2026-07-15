# AgentOps Agents Page — Phase A.3 Council Workspace UX Correction

**Date:** 2026-07-15  
**Branch:** `origin/staging` @ `38610a54`  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents  
**Preview:** `ai-gfsxw39lp-…` aliased to `ai-xia-staging.vercel.app` (not `--prod`)

---

## Audit (why A.2 failed owner review)

Composer lived in a scrolled stack under turn cards/history. Layout read like a report (technical “local summary” label, duplicated meta, nested section+workspace cards). Latest question felt duplicated under “Earlier Council turns.”

---

## What shipped

| Change | Detail |
|---|---|
| Fixed composer | Toolbar → scrollable body → dock (`max-height: 140px`). Conversation scrolls; dock does not. |
| Two-column desktop | ~70% conversation · ~30% agent side panel |
| Agent inspector | Click one compact row → full response in conversation (Speak / Stop / Open / Follow-up) |
| History drawer | Toolbar History; uses `priorCouncilTurns` (excludes active turnId) |
| Friendly overview | “Council overview” + “Generated from the individual agent responses.” |
| Flattened chrome | Removed nested `AixiaSection` title/badge duplicate |
| Viewport fit | Shell `min(640px, max(500px, calc(100dvh - 20rem)))` + soft-scroll dock into view when below the fold |

No Council orchestration / LLM / persistence / TTS-STT infra / schedule changes.

---

## Live QA (`qa-agent/reports/browser-qa/agentops-agents-page-phase-a3-live.json`)

| Check | Result |
|---|---|
| Composer in shell + browser viewport (1440) | YES (`composerInViewport: true`, dock 117px, shell 580px) |
| Two-column + 12 canonical agents | YES |
| System → Design select | YES (`design-agent`, 1 selected) |
| Speak available | YES |
| History drawer open; active viewport has no “Earlier Council turns” | YES |
| Tab×5 draft preserved | YES |
| 12/12 send | YES |
| Tablet/mobile shell dock | YES (`composerVisibleInShell`) |

Screenshots: `qa-agent/browser-qa-artifacts/phase-a3-council/`

---

## FINAL VERDICT

```
COMPOSER_VISIBLE_WITHOUT_SCROLL: YES
COUNCIL_FEELS_LIKE_CHAT: YES
DUPLICATE_COUNCIL_HEADERS_REMOVED: YES
LATEST_TURN_NOT_DUPLICATED_IN_HISTORY: YES
TECHNICAL_SUMMARY_LABEL_REMOVED: YES
TWO_COLUMN_DESKTOP_WORKSPACE: YES
TWELVE_AGENTS_VISIBLE_IN_COMPACT_PANEL: YES
ONE_AGENT_FULL_RESPONSE_SELECTED: YES
AGENT_SELECTION_WORKS: YES
TWELVE_FULL_CARDS_NOT_RENDERED: YES
HISTORY_MOVED_OUT_OF_ACTIVE_VIEW: YES
NESTED_CARD_LEVELS_REDUCED: YES
COMPOSER_FIXED_AND_VISIBLE: YES
LIVE_12_AGENT_SEND_PASS: YES
TTS_SELECTED_RESPONSE_WORKS: YES
STT_FIXED_COMPOSER_WORKS: YES
TAB_SWITCH_DRAFT_PRESERVED: YES
RESPONSIVE_DESKTOP_LIVE_PASS: YES
RESPONSIVE_TABLET_LIVE_PASS: YES
RESPONSIVE_MOBILE_LIVE_PASS: YES
FUNCTION_COUNT_9_OF_12: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
OWNER_ACCEPTS_PHASE_A3: PENDING
```

---

## Owner spot-check

1. Agents → Council: composer visible without scrolling inside the workspace.  
2. Two columns: overview left · 12 agents right.  
3. Click System, then Design — one full response swaps.  
4. History opens drawer only; no “Earlier Council turns” under the chat.  
5. TTS Speak on selected response; Draft survives tab switch.
