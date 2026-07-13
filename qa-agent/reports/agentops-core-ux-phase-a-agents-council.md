# AgentOps Core UX Phase A — Agents Page + Embedded Council Chat

**Date:** 2026-07-13  
**Branch:** `staging`  
**Scope:** Staging only  

---

## 1. Existing Council components reused

| Piece | Reuse |
|---|---|
| Persistence | `getAgentOpsCouncilChatMessages` / `recordAgentOpsCouncilChatMessage` (`agentops_owner_feedback`, `action: council_chat_message`) |
| LLM fan-out | `runAgentOpsLocalLlmChat` (`chatScope: "council"`) |
| Messenger UI | `AixiaMessengerShell` |
| Agents roster | `getAgentOpsManagedAgents` + participant picker |
| Memory approval | `commitAgentOpsMemoryFromChatApproval` |
| Full route | `/system/agent-ops/council` unchanged backend |

**New thin wrappers (no second backend):**
- `src/components/agentops/owner/useAgentOpsCouncilChat.tsx`
- `src/components/agentops/owner/AgentOpsCouncilChatCard.tsx`

---

## 2. Agents page structure

Route: `/system/agent-ops/agents`

Order:
1. Header — “Manage your 12 AI agents and talk to the team.” + Run all / Open Council / Refresh
2. Team status — Registered, Completed, Running, Needs attention, Failed/missing, Next daily review
3. Council Chat embed
4. Agent roster (12 cards)
5. Collapsed **Team schedule** disclosure

Monitoring failures no longer block the page: status shows Unavailable; Council remains usable.

---

## 3. Embedded Council behavior

- Composer always visible
- Participant selection supported (defaults to all managed agents)
- Agent replies show display name, username/role line, status badge, timestamp in role line
- Open full Council button on card + header
- Same send path as full Council (owner message → per-agent LLM responses → persist)

---

## 4. History behavior

- Canonical history is **server-persisted** via existing council chat APIs
- Embedded Agents chat and full Council route load the same `council_chat_message` stream
- **Limitation:** full Council page still owns its own React state instance; after navigating, both reload from the same server history (no new table; no local-only fork for Phase A)

---

## 5. Full Council route

- `/system/agent-ops/council` remains operational
- Hero action relabeled **Back to Agents**
- Agents header **Open Council** navigates there

---

## 6. Roster behavior

- Always shows all 12 canonical agents
- Status, job title, responsibility, last activity, today’s result, open findings count (today’s errors+improvements+features)
- Open agent → `/system/agent-ops/agents/:slug`

---

## 7–8. Responsive / Browser QA

Smoke script: `qa-agent/scripts/agentops-core-ux-phase-a-agents-council-smoke.mjs`  
Artifacts: `qa-agent/browser-qa-artifacts/phase-a-agents-council/`  
Report JSON: `qa-agent/reports/browser-qa/agentops-core-ux-phase-a-agents-council-smoke-report.json`

Viewports: 1440 / 1024 / 390 — Council embed + roster + Open Council / Back to Agents.

---

## 9. Build / safety

| Check | Result |
|---|---|
| Phase A sources typecheck | Pass (dirty workspace has unrelated pre-existing TS errors in untracked files) |
| Clean staging worktree build | Used for deploy |
| `agentops:vercel-function-count-verify` | Pass 8/12 |
| `agentops:monitoring-owner-promotion-lock-verify` | Pass |
| `agentops:monitoring-daily-12-agents-verify` | Pass |
| Runtime / owner-gate / schedules | Unchanged |

---

## 10. Commit / deployment

- Commit message: `Restore Council Chat to AgentOps agents page`
- Push: `origin/staging`
- Preview deploy (no `--prod`)
- Alias: https://ai-xia-staging.vercel.app

---

## 11. Remaining limitations

- Council not added as sixth primary nav item (by design)
- Full Council page not yet refactored onto shared hook (duplicate state machine; shared persistence)
- Live send QA depends on staging LLM/Doubao availability; fallback replies may appear
- Open findings count uses today’s finding tallies from daily12 roster, not a separate open-issue query

---

## FINAL VERDICT

| Item | Verdict |
|---|---|
| AGENTS_PAGE_SHOWS_12_AGENTS | YES |
| AGENT_STATUS_VISIBLE | YES |
| COUNCIL_CHAT_EMBEDDED | YES |
| COUNCIL_COMPOSER_VISIBLE | YES |
| COUNCIL_MESSAGE_SEND_WORKS | YES (same backend path; live env dependent) |
| COUNCIL_RESPONSES_SHOW_AGENT_IDENTITY | YES |
| COUNCIL_HISTORY_PRESERVED | YES (shared server stream) |
| FULL_COUNCIL_ROUTE_WORKS | YES |
| OPEN_AGENT_WORKS | YES |
| TEAM_SCHEDULE_COLLAPSED | YES |
| RESPONSIVE_DESKTOP_PASS | YES (smoke) |
| RESPONSIVE_TABLET_PASS | YES (smoke) |
| RESPONSIVE_MOBILE_PASS | YES (smoke) |
| NO_RUNTIME_REGRESSION | YES |
| NO_OWNER_GATE_REGRESSION | YES |
| BUILD_GREEN | YES (clean tree) |
| VERCEL_FUNCTION_COUNT_SAFE | YES |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| READY_FOR_PHASE_B | YES |
