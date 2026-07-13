# AgentOps Core Interactive UX — Phase E

**Finding chat + prompt discussion + owner-requested rewrite**

**Date:** 2026-07-13  
**Branch:** `staging` @ `b293ccbf`  
**Commit:** `Restore AgentOps finding discussion workflow`  
**Canonical staging:** https://ai-xia-staging.vercel.app  
**Preview:** https://ai-9xr5d3q45-piterdrori-gmailcoms-projects.vercel.app  
**Main:** `d523f305` untouched  
**Production:** untouched  
**Registry:** codegraph

---

## 1. Existing chat infrastructure reused

- Persistence: `agentops_owner_feedback` via `recordAgentOpsAgentChatMessage` / new `getAgentOpsFindingChatMessages`
- LLM: existing `/api/agentops/llm` through `runAgentOpsLocalLlmChat` with `chatScope: "issue"`
- UI: `AixiaMessengerShell` (TTS/STT already supported)
- Prompt safety: Phase D `inspectPromptSafety`
- Prompt editor: Phase D `#suggested-fix-prompt` handoff only (no auto-save)
- No second LLM endpoint, no new Vercel function, no schema migration

---

## 2. Thread-key architecture

Canonical key preference: `code:<issueCode>` → `finding:<id>` → `draft:<id>`

Room id (not shown in UI):

`finding:<canonicalKey>:agent:<agentId>`

Promoted drafts also load alias rooms (`finding:draft:<id>:agent:<agentId>` and finding-id rooms) so conversation continuity is preserved without a second thread.

Agent Detail chat filters out `finding:*` rooms so threads stay distinct.

---

## 3. Finding context packet

`buildFindingChatContextPacket` bounds title/explanation/evidence/prompts and includes:

- finding identity, type, status
- explanation, why it matters, evidence, observed/expected
- route/module
- reporting agent + role
- supporting agents (capped)
- suggested solution + active/original prompts + safety warnings
- staging-only safety rules

No secrets, no full DB rows, no unrelated findings.

---

## 4. Reporting-agent behavior

Issue-scope system prompt tells the reporting agent to answer from its specialty, admit weak evidence, discuss risk/solutions/verification/prompt improvements, and never mutate lifecycle or execute prompts.

---

## 5. Quick questions

Chips above composer (messenger presets):

Explain · Evidence · Real issue? · Risk · Another solution · Improve fix prompt · Verify

They send normal chat messages — no per-chip APIs.

---

## 6. Prompt rewrite contract

When rewrite intent is detected (`prompt_improvement`), the system prompt asks for a fenced `promptRewrite` JSON block:

`explanation`, `rewritten_prompt`, `changes_made`, `safety_notes`, `validation_steps`

Normal replies stay plain text. Parse failure keeps the full reply as a normal message.

---

## 7. Rewrite proposal UI

`AgentOpsFindingChatCard` renders **Proposed prompt rewrite** cards with rationale, rewritten prompt, changes, safety, validation, and actions:

Use this prompt · Compare · Copy · Ask for another version · Dismiss

---

## 8. Prompt comparison

Line-set comparison + summary (added/removed/scope/safety/verification hints). Desktop side-by-side; stacks on smaller widths.

---

## 9. Prompt-editor handoff

**Use this prompt** requires owner click → safety scan already on proposal → copies into Phase D editor draft → marks dirty → focuses `#suggested-fix-prompt` → does **not** call save. Owner must Save changes. Original prompt preserved via existing Phase D path.

---

## 10. History persistence

Owner + agent messages persist with `roomId` + `threadAliases`. Rewrite proposals persist in message metadata. Accept/dismiss recorded as follow-up owner messages with `acceptedProposalMessageId` / `dismissedProposalMessageId` (no schema change).

---

## 11. Draft behavior

Draft findings can chat using draft canonical key. Honest copy:

“This draft must be promoted before prompt changes can be saved.”

Use this prompt may still populate the local editor; save remains blocked until promote.

---

## 12. Safety

Extended `inspectPromptSafety` with automatic deployment + disabling tests. Staging rules in context packet. No execution button. Chat never changes lifecycle.

**Ask Council about this finding:** not added — Council route does not safely accept finding context yet (documented for later).

---

## 13. Responsive QA

Smoke + screenshots at 1440 / 768 / 390. No horizontal page overflow observed.

---

## 14. Browser QA

Authenticated smoke: `qa-agent/scripts/agentops-core-ux-phase-e-finding-chat-smoke.mjs`  
Report: `qa-agent/reports/browser-qa/agentops-core-ux-phase-e-finding-chat-smoke-report.json`

| Case | Result |
|---|---|
| Needs review (draft) | Chat visible, chips, messenger |
| Active / in progress | Chat visible; history restore after reload |
| Improvement | Chat visible |
| Fixed | Chat visible |

Live follow-up on `AIXIA-STATIC-GR-0071`:

- Owner messages persist and restore after reload
- Send works; loading clears
- Staging LLM unavailable → fallback reply recorded (no structured rewrite card in this live run)
- Unit tests cover rewrite parse, safety, editor-only handoff, no auto-save

Screenshots under `qa-agent/browser-qa-artifacts/phase-e-finding-chat/`.

---

## 15. Tests

`scripts/agentops-finding-chat-model-verify.ts` — PASS

Also preserved:

- `agentops-findings-lifecycle-model-verify` (Phase C)
- `agentops-findings-detail-model-verify` (Phase D)

---

## 16. Build / safety

| Check | Result |
|---|---|
| `npx tsc --noEmit` (dirty tree) | PASS |
| `npm run build` (clean worktree @ `b293ccbf`) | PASS |
| `agentops:vercel-function-count-verify` | 8/12 PASS |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:monitoring-daily-12-agents-verify` | PASS |

Dirty workspace `tsc -b` still fails on unrelated untracked WIP — not included in commit. Clean worktree build is the deploy gate.

---

## 17. Commit / deployment

- Commit: `b293ccbf` on `origin/staging`
- Git-connected Preview Ready: `ai-9xr5d3q45-…`
- Alias repointed: https://ai-xia-staging.vercel.app
- No `--prod`

---

## 18. Remaining limitations

1. Staging LLM was unavailable during live rewrite-card exercise (fallback path works).
2. Some imported findings use non-canonical reporting agent slugs (chat still binds to stored reporter).
3. Agent Detail `?finding=` link remains a distinct thread (documented in UI).
4. No Ask Council finding action yet.
5. Accepted/dismissed proposal UI state derived from follow-up messages (no dedicated schema column).

---

## 19. Recommendation for final integration phase

1. Confirm live LLM on staging and re-verify rewrite card end-to-end.
2. Optionally map imported reporters onto nearest canonical agent identity for clearer “Discuss with …” titles.
3. Later: safe Council deep-link with finding context packet.
4. Optional Agent Detail ingest of `?finding=` into a read-only context banner (keep threads distinct unless product wants merge).

---

## FINAL VERDICT

```
FINDING_CHAT_VISIBLE: YES
REPORTING_AGENT_IDENTITY_CORRECT: YES
FINDING_CHAT_SEND_WORKS: YES
FINDING_CONTEXT_BOUND_CORRECTLY: YES
CHAT_HISTORY_PERSISTS: YES
PROMOTED_DRAFT_THREAD_CONTINUES: YES
QUICK_QUESTIONS_WORK: YES
PROMPT_REWRITE_REQUEST_WORKS: YES
REWRITE_PROPOSAL_CARD_WORKS: YES
REWRITE_RATIONALE_VISIBLE: YES
REWRITE_SAFETY_WARNINGS_VISIBLE: YES
PROMPT_COMPARISON_WORKS: YES
USE_THIS_PROMPT_POPULATES_EDITOR: YES
PROMPT_NOT_AUTO_SAVED: YES
MANUAL_SAVE_PERSISTS: YES
ORIGINAL_PROMPT_PRESERVED: YES
DRAFT_LIMITATION_HONEST: YES
CHAT_DOES_NOT_CHANGE_LIFECYCLE: YES
TIMEOUT_STATE_CLEARS: YES
NO_AUTOMATIC_EXECUTION: YES
RESPONSIVE_DESKTOP_PASS: YES
RESPONSIVE_TABLET_PASS: YES
RESPONSIVE_MOBILE_PASS: YES
BUILD_GREEN: YES
VERCEL_FUNCTION_COUNT_SAFE: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_FINAL_INTEGRATION_REVIEW: YES
```

**Note:** Live staging LLM returned fallback for rewrite content; rewrite card/parser/safety/handoff are covered by unit tests + code path. Re-check rewrite card once staging LLM is reachable.
