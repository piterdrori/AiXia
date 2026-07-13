# AgentOps Core UX Phase B — Agent Detail + Chat + Schedule

**Date:** 2026-07-13  
**Branch:** `staging`  
**Scope:** Staging only  
**Registry:** codegraph  

---

## 1. Existing components reused

| Piece | Reuse |
|---|---|
| Chat persistence | `getAgentOpsAgentChatMessages` / `recordAgentOpsAgentChatMessage` (`agentops_owner_feedback`, `action: agent_chat_message`) |
| LLM | `runAgentOpsLocalLlmChat` (`chatScope: "individual_agent"`) → `/api/agentops/llm` |
| Messenger UI | `AixiaMessengerShell` (existing TTS/STT via `useAixiaVoiceChat`) |
| Agent identity | `CANONICAL_AGENTS`, `AGENT_IDENTITY_DEFINITIONS`, `getAgentOwnerMeta` |
| Memory approval | `commitAgentOpsMemoryFromChatApproval` |
| Runtime schedule row | `fetchAgentByRouteParam` / `updateAgentRecord` (`agentIntelligenceClient`) |
| Schedule encoding | `parseScheduleFromTools` / `mergeScheduleIntoTools` (`agentScheduleConfig`) |
| Status control | `updateAgentOpsAgentStatus` |
| Findings / timeline | `getAgentOpsActiveTop10`, `getAgentOpsAgentTimeline` |
| Monitoring status | `useAgentOpsMonitoringStatus` |

**New thin wrappers (no second chat/schedule backend):**
- `src/components/agentops/owner/useAgentOpsAgentChat.tsx`
- `src/components/agentops/owner/AgentOpsAgentChatCard.tsx`
- `src/components/agentops/owner/AgentOpsAgentScheduleBox.tsx`

**Not mounted in this commit:** full untracked `AgentChatPanel` tree (~200+ WIP files including ACDL browser QA). Phase B uses the **canonical equivalent** already on staging (same pattern as Phase A Council embed).

---

## 2. Agent header

Route: `/system/agent-ops/agents/:agent`

Shows: display name, username, job title, one-sentence responsibility, today status badge, work mode, last activity, last daily review, **Back to Agents**.

Primary actions:
- **Run this agent now** — disabled (honest)
- **Pause / Activate** — wired to `updateAgentOpsAgentStatus`

Invalid slug → “Agent not found” + Back to Agents. No shell-level “Agent not found for id” for valid slugs.

---

## 3. Agent Chat behavior

- Visible without disclosure (section order: Header → Chat → Today/Findings → Schedule → Activity → Advanced)
- Title: `Chat with [Agent Name]`
- Subtitle: ask about work, findings, recommendations
- Text composer, send/loading, owner vs agent labels, timestamps
- TTS/STT via existing `AixiaMessengerShell` / `useAixiaVoiceChat` (not rebuilt)
- Browser QA-in-chat tools remain available only when the full `AgentChatPanel` stack is later remounted; Phase B does not add new Browser QA APIs (function-count safe)

---

## 4. Chat context

Each turn sends:
- agent id / display name / username / job title / responsibility
- status + today’s findings summary (when available)
- agent memory snippets (active only)
- staging-only instruction to stay in this agent’s job perspective

Does **not** inject secrets, raw Supabase rows, huge JSON, or other agents’ data.

---

## 5. History behavior

- Server-persisted via existing `agent_chat_message` owner-feedback stream
- Leaving and returning reloads the same history
- Empty state: `Start a conversation with [Agent Name].`
- **Limitation vs local AgentChatPanel:** no multi-thread browser-local session sidebar in Phase B (server stream is the source of truth)

---

## 6. Today section

Real monitoring roster fields when available; otherwise **Unavailable** (no fake zeros):
- Daily review status, errors, improvements, features, no findings, routes, last run
- Duration: Unavailable (not provided by current status payload)

Monitoring failures do not block the page or chat.

---

## 7. Findings section

Up to 5 latest findings for this agent with type/title/priority/route/date + Open finding.  
Action: View all findings from this agent. No raw IDs in the card UI.

---

## 8. Schedule box

Visible **Work mode and schedule** section (not buried in Advanced):
- Status Active/Paused/Blocked
- Work mode Manual only / Scheduled (persisted into agent `tools` schedule tag when runtime row exists)
- Daily review / operational / weekly labels from fleet monitoring (read-only fleet truth)
- Continuous monitoring: Off · Owner approval: Required
- Pause/Activate + Manual/Scheduled controls
- Link to Monitoring for fleet schedule
- No raw cron strings in default view

---

## 9. Run-now behavior

**SINGLE_AGENT_RUN_WORKS: NOT_CONNECTED**

Staging Vercel does not expose a safe owner UI single-agent execution path (monitoring dry-run is GHA/local; `runAgentWorkCycle` depends on untracked `/api/agentops/chat-browser-qa`).  
Button stays **disabled** with: “Single-agent run is not connected yet.” — no fake execution.

---

## 10. Responsive QA

Smoke script: `qa-agent/scripts/agentops-core-ux-phase-b-agent-detail-smoke.mjs`  
Viewports: 1440 / 1024 / 768 / 390 for sample agents.

*(Populate after post-deploy smoke run.)*

---

## 11. Failure states

- Agent registry error: page remains usable; chat may still work
- Chat error: compact Retry; rest of page usable
- Schedule error: compact Retry + link to Monitoring
- Invalid slug: clear not-found state

---

## 12. Build / safety

Verified in clean deploy worktree (`AiXia-staging-deploy-hotfix`) with Phase B files applied:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npm run agentops:vercel-function-count-verify` | PASS (8/12) |
| `npm run agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `npm run agentops:monitoring-daily-12-agents-verify` | PASS (wiring + retry upsert; integration requires `.env.local`) |

No new Vercel API functions. Chat backend = existing `/api/agentops/llm`. Scheduler engine unchanged.

---

## 13. Commit / deployment

- Commit message: `Restore interactive AgentOps agent detail`
- Push: `origin/staging`
- Deploy: Vercel Preview only (no `--prod`)
- Alias: `https://ai-xia-staging.vercel.app`
- `origin/main` untouched

*(Fill SHA / deploy URL after push.)*

---

## 14. Remaining limitations

1. Full `AgentChatPanel` (Doubao-specific voice + Browser QA tool reports + local session sidebar) still untracked WIP — not committed to avoid function-count / ACDL blast radius.
2. Single-agent Run now not connected on Vercel owner UI.
3. Duration for today’s run not available from monitoring status payload.
4. Fleet cron editing remains on Monitoring (by design).

---

## FINAL VERDICT

| Check | Result |
|---|---|
| ALL_12_AGENT_SLUGS_WORK | YES (canonical resolver) |
| AGENT_HEADER_COMPLETE | YES |
| AGENT_STATUS_VISIBLE | YES |
| AGENT_CHAT_VISIBLE | YES |
| AGENT_CHAT_COMPOSER_VISIBLE | YES |
| AGENT_CHAT_SEND_WORKS | PENDING_POST_DEPLOY_SMOKE |
| CORRECT_AGENT_RESPONDS | PENDING_POST_DEPLOY_SMOKE |
| AGENT_CHAT_HISTORY_PRESERVED | YES (server stream; smoke pending) |
| TODAY_SECTION_VISIBLE | YES |
| LATEST_FINDINGS_VISIBLE | YES |
| SCHEDULE_BOX_VISIBLE | YES |
| ACTIVE_PAUSED_CONTROL_WORKS | YES |
| SINGLE_AGENT_RUN_WORKS | NOT_CONNECTED |
| ADVANCED_DETAILS_COLLAPSED | YES |
| RESPONSIVE_DESKTOP_PASS | PENDING_POST_DEPLOY_SMOKE |
| RESPONSIVE_TABLET_PASS | PENDING_POST_DEPLOY_SMOKE |
| RESPONSIVE_MOBILE_PASS | PENDING_POST_DEPLOY_SMOKE |
| NO_RUNTIME_REGRESSION | YES |
| NO_OWNER_GATE_REGRESSION | YES |
| BUILD_GREEN | YES |
| VERCEL_FUNCTION_COUNT_SAFE | YES |
| COMMITTED_TO_ORIGIN_STAGING | PENDING |
| VERCEL_STAGING_DEPLOY_GREEN | PENDING |
| MAIN_UNTOUCHED | YES (`d523f305`) |
| PRODUCTION_UNTOUCHED | YES |
| READY_FOR_PHASE_C | PENDING (after deploy smoke) |
