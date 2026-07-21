# AgentOps Phase E-A4 — Issues Final Polish & Chat-to-Prompt Closure

**Date:** 2026-07-21  
**Branch:** `staging` → `origin/staging`  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Code commit:** `23b02c5f` — Finalize AgentOps issue review polish  
**Deploy Preview:** `https://ai-2udryic5q-piterdrori-gmailcoms-projects.vercel.app`  
**Mode:** Staging-only final polish + blocker fixes  
**Prior:** E-A3 `c3bdbc0b` / `7c9ba4a2`

---

## 1. Summary

Closed the E-A3 `CHAT_TO_PROMPT_FULL_PASS: PARTIAL` gap with a **deterministic Fix Issue Prompt suggestion path** that always shows **Suggested Fix Prompt** + **Use as Fix Issue Prompt** after Improve Fix Prompt — even when the LLM omits structured JSON.

Also polished:

- Promoted/draft detail **primary h1** (present during load + `data-testid="agentops-page-h1"`)
- Issues list **drafts-first paint** (do not block on promoted findings)
- Overlay labels: **Needs more info** / **Marked duplicate**
- Browser QA shell-settle noise filter (notifications/voice/calendar-badge only; never `/api/agentops/*`)

No new Findings route. No production / main / auto-fix / PR.

---

## 2. Chat-to-prompt reproduction

E-A3 failure mode (confirmed in code):

1. Improve Fix Prompt sent a rewrite-intent message.
2. LLM replied in plain text (no `rewritten_prompt` JSON fence).
3. `parsePromptRewriteProposal` returned `null`.
4. No suggestion card → no **Use as Fix Issue Prompt**.
5. Manual edit/save still worked → marked PARTIAL.

---

## 3. Chat-to-prompt fix

| Piece | Change |
|---|---|
| `buildDeterministicFixPromptSuggestion` | Cursor-ready template from issue fields |
| `resolvePromptRewriteProposal` | Prefer LLM parse; else deterministic when rewrite intent |
| `useAgentOpsFindingChat` | On Improve Fix Prompt / rewrite intent, always attach proposal metadata |
| LLM unavailable / timeout | Still records agent reply + deterministic suggestion card |
| UI | Card titled **Suggested Fix Prompt**; fallback note when deterministic |

Flow:

1. Improve Fix Prompt  
2. Suggestion card appears (LLM or deterministic)  
3. Use as Fix Issue Prompt → textarea updates, **not** auto-saved  
4. Owner edits + Save → persists after refresh  

---

## 4. Fix Issue Prompt template

Deterministic template includes:

- Title / Context (agent, found, route/module, run, severity)
- Simple-language issue + evidence
- Staging-only constraints (no main/prod/--prod/PR/auto-deploy/auto-promote)
- Expected output checklist

---

## 5. Promoted issue h1 fix

- `AgentOpsPageHeader` h1 has `data-testid="agentops-page-h1"`
- Issue detail shows header **during loading** (route param / title) so Browser QA never sees a heading-less shell
- Subsections remain `h2` via `OwnerSection`

---

## 6. Slow-load polish

- `loadFindingsOwnerCatalog({ onDraftsReady })` paints drafts first
- Promoted findings timeout reduced to **6s** (non-blocking for first paint)
- Session token wait retries increased (settle 401 reduction)

Remaining backend latency may still show ~few seconds; list is usable sooner.

---

## 7. Browser QA noise polish

Extended `browserQaShellNoise.ts` for AgentOps routes only:

- Existing calendar/tasks HEAD abort filter retained
- Added notification / voice-settings / calendar-badge settle aborts
- **Does not** filter `/api/agentops/*` 4xx/5xx

---

## 8. Decision overlay copy check

| Overlay | Owner label |
|---|---|
| `needs_more_info` | Needs more info |
| `marked_duplicate` | Marked duplicate |

List cards use `ownerStatusLabel`. Tabs remain Needs more info / Duplicates. Internal DB status may still be `deferred`.

---

## 9. Live acceptance QA

`agentops-e-a4-chat-to-prompt-live.mjs` on alias after deploy:

| Check | Result |
|---|---|
| Draft h1 | PASS (`[E-A4 TEST]…`) |
| Improve Fix Prompt → Suggested Fix Prompt card | PASS |
| Use as Fix Issue Prompt | PASS |
| Deterministic fallback note | PASS (LLM did not return structured JSON) |
| Text + refresh persist | PASS |
| List h1 | PASS (`Issues`) |
| Promoted BQA-F956B002 h1 count | PASS (`1`, notFound=false) |
| `chatToPromptFullPass` | **YES** |

Artifacts: `qa-agent/browser-qa-artifacts/phase-e-a4-chat-to-prompt/`

---

## 10. Security regression

`agentops-e-a3-security-probe.mjs` — all anonymous endpoints **401** (`rejected: true`), including spoofed `ownerId` bodies and artifact URL path traversal.

---

## 11. Previous-page regression

`agentops-e-a4-regression-light.mjs`:

| Route | Loaded | No approve/promote | Overflow |
|---|---|---|---|
| `/system/agent-ops` | YES | YES | NO |
| `/system/agent-ops/agents` | YES | YES | NO |
| `/system/agent-ops/agents/design-agent` | YES | YES | NO |

---

## 12. Verify scripts

`npm run agentops:issues-acceptance-verify` now asserts:

- deterministic suggestion builders
- Suggested Fix Prompt / Use as UI
- promoted h1 test id + loading header
- Needs more info / Marked duplicate labels
- drafts-first paint hook

---

## 13. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `agentops:issues-verify` | PASS |
| `agentops:issues-acceptance-verify` | PASS |
| `agentops:pre-issues-pages-verify` | PASS |
| `agentops:agent-hermes-memory-verify` | PASS |
| `agentops:vercel-function-count-verify` | PASS |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |

---

## 14. Remaining limitations

- Deterministic prompt is structured but not LLM-personalized when staging LLM is down.
- List may still take a few seconds for drafts API itself.
- Overlay statuses remain DB-`deferred` under the hood (labels are owner-facing).

---

## 15. Final readiness decision

Chat-to-prompt is closed. Issues workflow is ready for the next AgentOps page.

### FINAL VERDICT

```
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
EXISTING_ISSUES_ROUTE_REUSED: YES
NEW_FINDINGS_ROUTE_CREATED: NO

CHAT_TO_PROMPT_FULL_PASS: YES
IMPROVE_FIX_PROMPT_WORKS: YES
USE_AS_FIX_PROMPT_WORKS: YES
FIX_PROMPT_SAVE_PERSISTS: YES
DETERMINISTIC_FALLBACK_PROMPT_WORKS: YES

PROMOTED_DETAIL_H1_PASS: YES
SLOW_LOAD_IMPROVED_OR_DOCUMENTED: YES
BROWSER_QA_NOISE_HANDLED: YES
NEEDS_MORE_INFO_LABEL_CLEAR: YES
DUPLICATE_LABEL_CLEAR: YES

OWNER_AUTH_ENFORCED: YES
NON_OWNER_REJECTED: YES
NO_OWNERID_SPOOF: YES
SERVICE_ROLE_NOT_EXPOSED: YES

NO_AUTO_PROMOTION: YES
NO_AUTO_FIX: YES
NO_CODE_CHANGE: YES
NO_PR_CREATION: YES
NO_PRODUCTION_DEPLOY: YES

BROWSER_QA_PASS: YES
WEBSITE_AUDIT_PASS: YES
MOBILE_LAYOUT_PASS: YES
PREVIOUS_PAGES_REGRESSION_PASS: YES
PER_AGENT_HERMES_REGRESSION_PASS: YES
WORKER_ONLINE_REGRESSION_PASS: YES

FUNCTION_COUNT_WITHIN_BUDGET: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
READY_FOR_NEXT_AGENTOPS_PAGE: YES
```
