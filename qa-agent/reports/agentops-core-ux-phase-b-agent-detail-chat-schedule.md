# AgentOps Core UX Phase B — Agent Detail + Chat + Schedule

**Date:** 2026-07-13  
**Branch:** `staging`  
**Scope:** Staging only  
**Registry:** codegraph  
**Commits:** `9ec2294b` (feature), `bb1a36e1` (loading fix)  

---

## 1. Existing components reused

| Piece | Reuse |
|---|---|
| Chat persistence | `getAgentOpsAgentChatMessages` / `recordAgentOpsAgentChatMessage` (`agentops_owner_feedback`, `action: agent_chat_message`) |
| LLM | `runAgentOpsLocalLlmChat` (`chatScope: "individual_agent"`) → `/api/agentops/llm` |
| Messenger UI | `AixiaMessengerShell` (TTS/STT via `useAixiaVoiceChat`) |
| Agent identity | `CANONICAL_AGENTS`, `AGENT_IDENTITY_DEFINITIONS`, `getAgentOwnerMeta` |
| Memory approval | `commitAgentOpsMemoryFromChatApproval` |
| Runtime schedule row | `fetchAgentByRouteParam` / `updateAgentRecord` (`agentIntelligenceClient`) |
| Schedule encoding | `parseScheduleFromTools` / `mergeScheduleIntoTools` |
| Status control | `updateAgentOpsAgentStatus` |
| Findings / timeline | `getAgentOpsActiveTop10`, `getAgentOpsAgentTimeline` |
| Monitoring status | `useAgentOpsMonitoringStatus` |

**New thin wrappers (no second chat/schedule backend):**
- `useAgentOpsAgentChat.tsx`
- `AgentOpsAgentChatCard.tsx`
- `AgentOpsAgentScheduleBox.tsx`

**Not mounted:** full untracked `AgentChatPanel` tree (~200+ WIP files). Phase B uses the **canonical equivalent** already on staging (same pattern as Phase A Council).

---

## 2. Agent header

`/system/agent-ops/agents/:agent` — display name, username, job title, responsibility, status, work mode, last activity, last daily review, Back to Agents.  
Pause/Activate wired. Run now disabled with honest copy.

---

## 3. Agent Chat behavior

Visible without disclosure. Title `Chat with [Name]`. Composer, send/loading, TTS/STT via messenger shell. Verified on system / design / qa / analytics agents.

---

## 4. Chat context

Per-turn: agent id, display name, username, job title, responsibility, status, today/findings notes, active memory snippets, staging-only job perspective. No secrets / raw rows / other agents.

---

## 5. History behavior

Server-persisted `agent_chat_message` stream. Smoke confirmed owner message survives Agents → Agent Detail navigation (`historyPreserved: true`).

---

## 6–7. Today + Findings

Real roster data or **Unavailable** (no fake zeros). Latest findings cards + “View all findings from this agent”.

---

## 8. Schedule box

Visible “Work mode and schedule”: status, work mode, daily/operational/weekly labels, last/next run, continuous Off, owner approval Required. Pause/Activate + Manual/Scheduled when runtime row exists. No raw cron in default view.

---

## 9. Run-now behavior

**NOT_CONNECTED** — disabled with “Single-agent run is not connected yet.” (no Vercel-safe single-agent owner path without new functions).

---

## 10. Responsive QA

Smoke artifacts: `qa-agent/browser-qa-artifacts/phase-b-agent-detail/`  
Desktop 1440 / tablet 1024+768 / mobile 390 — chat + schedule + today/findings visible; no horizontal page overflow. Mobile messenger toolbar is tight (acceptable; no page break).

---

## 11. Failure states

Monitoring/detail errors do not block chat. Chat has Retry. Schedule has Retry + Monitoring link. Invalid slug wait improved; owner gate has 20s timeout.

---

## 12. Build / safety

| Check | Result |
|---|---|
| `npx tsc --noEmit` (clean worktree) | PASS |
| `npm run build` (clean worktree) | PASS |
| `agentops:vercel-function-count-verify` | PASS (8/12) |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:monitoring-daily-12-agents-verify` | PASS |

No new Vercel functions. Chat backend unchanged. Scheduler engine unchanged.

---

## 13. Commit / deployment

- `9ec2294b` Restore interactive AgentOps agent detail  
- `bb1a36e1` Fix Agent Detail loading so chat mounts after owner gate  
- Push: `origin/staging`  
- Preview Ready: `https://ai-meijfs8ok-piterdrori-gmailcoms-projects.vercel.app`  
- Alias: https://ai-xia-staging.vercel.app  
- `origin/main`: `d523f305` untouched · no `--prod`

Smoke: `qa-agent/scripts/agentops-core-ux-phase-b-agent-detail-smoke.mjs` → `allAgentsPass: true`

---

## 14. Remaining limitations

1. Full `AgentChatPanel` (Doubao voice stack + Browser QA-in-chat) still local WIP — not committed.  
2. Single-agent Run now not connected on Vercel owner UI.  
3. Duration field Unavailable (not in monitoring payload).  
4. LLM reply latency can exceed short smoke windows; owner message history confirmed.

---

## FINAL VERDICT

| Check | Result |
|---|---|
| ALL_12_AGENT_SLUGS_WORK | YES |
| AGENT_HEADER_COMPLETE | YES |
| AGENT_STATUS_VISIBLE | YES |
| AGENT_CHAT_VISIBLE | YES |
| AGENT_CHAT_COMPOSER_VISIBLE | YES |
| AGENT_CHAT_SEND_WORKS | YES |
| CORRECT_AGENT_RESPONDS | PARTIAL (chrome identity correct; LLM reply not always captured in smoke window) |
| AGENT_CHAT_HISTORY_PRESERVED | YES |
| TODAY_SECTION_VISIBLE | YES |
| LATEST_FINDINGS_VISIBLE | YES |
| SCHEDULE_BOX_VISIBLE | YES |
| ACTIVE_PAUSED_CONTROL_WORKS | YES |
| SINGLE_AGENT_RUN_WORKS | NOT_CONNECTED |
| ADVANCED_DETAILS_COLLAPSED | YES |
| RESPONSIVE_DESKTOP_PASS | YES |
| RESPONSIVE_TABLET_PASS | YES |
| RESPONSIVE_MOBILE_PASS | YES |
| NO_RUNTIME_REGRESSION | YES |
| NO_OWNER_GATE_REGRESSION | YES |
| BUILD_GREEN | YES |
| VERCEL_FUNCTION_COUNT_SAFE | YES |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| READY_FOR_PHASE_C | YES |
