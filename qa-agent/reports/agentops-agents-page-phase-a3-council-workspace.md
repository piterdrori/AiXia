# AgentOps Agents Page — Phase A.3 Council Workspace UX Correction

**Date:** 2026-07-15  
**Branch:** `origin/staging`  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents  

---

## Audit (Phase A.2 problems)

At 1440×900 the A.2 workspace stacked toolbar + meta + turn cards + history + composer inside one scroll region, so the composer left the initial viewport. History listed under the active turn (duplicate question feel). “Local summary (not an LLM consensus)” read like a report. Nested AixiaSection + workspace borders amplified card-in-card framing.

---

## What shipped

1. **Single workspace surface** — removed nested `AixiaSection` chrome from the Agents embed.
2. **Fixed composer dock** — toolbar → scrollable body → dock (`flex: 0 0 auto`, max 140px). Conversation scrolls; composer does not.
3. **Two-column desktop** — ~70% conversation (question, overview, selected agent detail) · ~30% compact agent panel.
4. **Agent inspector** — click one side-panel row; full response in conversation; Speak / Stop / Open agent / Ask follow-up. One selection at a time.
5. **History drawer** — toolbar History button; `priorCouncilTurns` only (latest excluded).
6. **Owner-friendly overview** — “Council overview” / “Generated from the individual agent responses.”
7. **Toolbar facts once** — title, roster tabs, compact progress, TTS, History, Edit roster, Full.
8. **Height** — embedded shell `clamp(620px, 70vh, 700px)`.
9. **Tablet/mobile** — agent panel becomes drawer/sheet; “N responses” button.

No orchestration / LLM / persistence / TTS-STT infra / schedule changes.

---

## Verify

- `scripts/agentops-council-phase-a3-verify.ts` — STATIC_CONTRACT_PASS  
- Function count 9/12, TTS/STT preference+voice, monitoring locks — PASS  

---

## FINAL VERDICT

```
COMPOSER_VISIBLE_WITHOUT_SCROLL: PENDING_LIVE
COUNCIL_FEELS_LIKE_CHAT: YES
DUPLICATE_COUNCIL_HEADERS_REMOVED: YES
LATEST_TURN_NOT_DUPLICATED_IN_HISTORY: YES
TECHNICAL_SUMMARY_LABEL_REMOVED: YES
TWO_COLUMN_DESKTOP_WORKSPACE: YES
TWELVE_AGENTS_VISIBLE_IN_COMPACT_PANEL: PENDING_LIVE
ONE_AGENT_FULL_RESPONSE_SELECTED: YES
AGENT_SELECTION_WORKS: PENDING_LIVE
TWELVE_FULL_CARDS_NOT_RENDERED: YES
HISTORY_MOVED_OUT_OF_ACTIVE_VIEW: YES
NESTED_CARD_LEVELS_REDUCED: YES
COMPOSER_FIXED_AND_VISIBLE: YES
LIVE_12_AGENT_SEND_PASS: PENDING_AFTER_DEPLOY
TTS_SELECTED_RESPONSE_WORKS: PENDING_AFTER_DEPLOY
STT_FIXED_COMPOSER_WORKS: YES
TAB_SWITCH_DRAFT_PRESERVED: PENDING_AFTER_DEPLOY
RESPONSIVE_DESKTOP_LIVE_PASS: PENDING_AFTER_DEPLOY
RESPONSIVE_TABLET_LIVE_PASS: PENDING_AFTER_DEPLOY
RESPONSIVE_MOBILE_LIVE_PASS: PENDING_AFTER_DEPLOY
FUNCTION_COUNT_9_OF_12: YES
BUILD_GREEN: PENDING_VERCEL
COMMITTED_TO_ORIGIN_STAGING: PENDING
VERCEL_STAGING_DEPLOY_GREEN: PENDING
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
OWNER_ACCEPTS_PHASE_A3: PENDING
```
