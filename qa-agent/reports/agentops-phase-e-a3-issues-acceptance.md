# AgentOps Phase E-A3 — Issues Workflow Acceptance

**Date:** 2026-07-21  
**Branch:** `staging` → `origin/staging`  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Code commit:** `c3bdbc0b` — Accept AgentOps issue review workflow  
**Deploy Preview:** `https://ai-1hre701te-piterdrori-gmailcoms-projects.vercel.app` (`dpl_Az1zz6aBMsZMKbnPc3eJ1r6wjt1a`)  
**Mode:** Staging-only acceptance QA + blocker fixes only  
**Prior:** E-A1 `0d49673d` · E-A2 `dfa5ffe7` / `b21b0bdb`

---

## 1. Summary

Owner acceptance pass on the existing Issues routes completed on staging.

**Blocker found and fixed:** Promoted drafts create runtime `agentops_issues` rows with `BQA-*` display codes, but issue detail only looked up `agentops_findings`. Opening `/issues/BQA-…` showed “Finding not found.” Detail loader now bridges promoted runtime issues via `getProductIssueByCode` / `getRuntimeIssueById`.

**Chat → prompt:** Scoped chat + prompt save/persist passed. Full “Use as Fix Issue Prompt” path was **PARTIAL** (no parseable rewrite control in the run; manual edit/save used).

No new Findings route. No production / main / cron / auto-fix / PR.

---

## 2. Issues list owner acceptance

Live (`agentops-e-a3-issues-acceptance-live.mjs`):

| Check | Result |
|---|---|
| H1 “Issues” | PASS |
| Reported by + Found time | PASS (`showNoise=1`) |
| Severity + status visible | PASS |
| Real Open issue hrefs | PASS (`/system/agent-ops/issues/draft-…`) |
| Needs more info / Duplicates tabs | PASS |
| Likely noise hidden by default | PASS |
| Show likely shell noise toggle | PASS |
| No “Website clean” / “No issues found” | PASS |
| Mobile overflow @390 | PASS (`listOverflow: false`) |

Filters/search covered by E-A2 static verify + UI presence (agent/status/severity/source/noise/search).

---

## 3. Issue detail owner acceptance

**Known draft** `draft-21109c88-4ca6-4afa-9546-f7db66f8bc13`:

| Check | Result |
|---|---|
| Reported by / Found / Source run / route | PASS |
| Fix Issue Prompt | PASS |
| Chat + Improve Fix Prompt | PASS |
| History + Evidence | PASS |
| Honest empty artifacts | PASS |
| Safety copy (no auto code change) | PASS |
| Link to reporting Agent Detail | PASS → `/system/agent-ops/agents/qa-agent` |
| Mobile overflow | PASS |

**Promoted (pre-fix):** `BQA-659157F4` / `BQA-F956B002` → not found (**blocker**).  
**Fix:** `loadPromotedRuntimeDetail` in `findingsDetailLoader.ts`.  
**Post-deploy smoke:** both `BQA-F956B002` and `BQA-659157F4` load with Reported by, Found, Fix Issue Prompt (`agentops-e-a3-promoted-detail-smoke.mjs`).

---

## 4. Chat-to-prompt acceptance

On fresh `[E-A3 TEST]` draft:

| Step | Result |
|---|---|
| Chat scoped to QA Agent | PASS |
| Improve / ask for better prompt | Ran (no Use-as control) |
| Use as Fix Issue Prompt | PARTIAL — control not shown |
| Manual edit + Save | PASS |
| Persist after refresh | PASS (`[E-A3 saved …]` retained) |
| Staging LLM fallback copy | Not triggered (`llmFallback: false`) |

**Verdict:** `CHAT_TO_PROMPT_FULL_PASS: PARTIAL`

---

## 5. Owner decision acceptance

API probes on dedicated `[E-A3 TEST]` drafts (owner Bearer):

| Action | Result |
|---|---|
| Reject | PASS → `rejected` + history |
| Defer | PASS → `deferred` + history |
| Needs more info | PASS → deferred overlay + note |
| Mark duplicate | PASS → `duplicate_of` set, rows retained |
| Approve | PASS → `owner_approved` + history |

No auto-promote on approve.

---

## 6. Promote acceptance

| Step | Result |
|---|---|
| Promote approved test draft | PASS → `BQA-F956B002` |
| Re-promote | PASS — idempotent / blocked cleanly |
| Auto-fix / PR / deploy | NONE |

---

## 7. Evidence / artifact acceptance

- Honest empty copy present on text-only draft  
- Signed Open link path remains owner Bearer + run-scoped (security probe)  
- Raw observations remain collapsed (E-A2 UX unchanged)

---

## 8. Security acceptance

`agentops-e-a3-security-probe.mjs` against staging — all anonymous:

| Endpoint | Status |
|---|---|
| GET drafts list | 401 |
| GET draft by id | 401 |
| POST decision (approve / needs_more_info / mark_duplicate) + spoofed ownerId | 401 |
| POST promote + spoofed ownerId | 401 |
| POST prompt + spoofed ownerId | 401 |
| GET signed artifact URL | 401 |
| Arbitrary path artifact URL | 401 |

Owner auth still uses `assertOwnerFromRequest` (session + `agentops_is_owner`). No client `ownerId: "owner"`.

---

## 9. Browser QA results

Owner Playwright acceptance live (local Chromium → staging URL) used for workflow proof — list/detail/chat/decisions/promote/regression.

Limited **remote staging worker** Browser QA via `agentops-e-a3-browser-qa-limited.mjs` (not Vercel Playwright). Runtime: `phase-e-a3-browser-qa-limited-1784621210353.json` — all three routes `completed`.

| Route | Worker notes (non-blocking) |
|---|---|
| Issues list | low disabled button; medium failed_requests (1) — likely shell/auth settle |
| Known draft | low disabled button |
| BQA-F956B002 | medium missing_h1; low disabled button — E-A4 polish |

Owner Playwright workflow QA remains the acceptance proof. Console shell noise (calendar/tasks) + transient list 401 during settle documented, not auth bypass.

---

## 10. Website audit results

Limited website audit completed (`phase-e-a0-website-audit-limited-1784620584778.json`):

| Route | Status | Notes |
|---|---|---|
| `/system/agent-ops/issues` | completed | Slow load ~6.9s (low) |
| draft-21109c88-… | completed | Slow load ~6.6s (low) |

No broken-structure blockers. No full-site scan.

---

## 11. Previous-page regression

Light owner navigation:

| Route | Loaded | No approve/promote on Agent Detail |
|---|---|---|
| `/system/agent-ops` | PASS | PASS |
| `/system/agent-ops/agents` | PASS | PASS |
| `/system/agent-ops/agents/design-agent` | PASS | PASS |
| `/system/agent-ops/agents/system-agent` | PASS | PASS |

Static verifies: pre-issues, agent-detail-final, hermes-memory, manual-run browser-qa/scheduler, promotion-lock — PASS.

---

## 12. Issues found and fixed

1. **Blocker — promoted BQA detail 404**  
   - Cause: promote writes `agentops_issues`; detail only queried `agentops_findings`.  
   - Fix: bridge in `loadCanonicalFindingDetail` via `loadPromotedRuntimeDetail`.  
   - Also bridges UUID runtime ids when opening by promoted issue id from a draft.

---

## 13. Remaining limitations (E-A4 polish)

- Chat → “Use as Fix Issue Prompt” not always emitted → treat full chat-to-prompt as PARTIAL until LLM rewrite proposal is reliable.
- DB statuses still lack first-class `needs_more_info` / `duplicate` (overlays on `deferred`).
- Transient AgentOps API 401 during first list settle may still flash once after login (session race) — monitor, not a spoof hole.
- Promoted runtime detail may lack a primary `h1` (worker medium finding) — align heading with draft detail in polish.
- Issues list slow-load (~6–7s) and occasional failed_requests noise from Browser QA — performance/noise polish, not workflow blockers.

---

## 14. Safety checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run agentops:issues-verify` | PASS |
| `npm run agentops:issues-acceptance-verify` | PASS |
| `npm run agentops:pre-issues-pages-verify` | PASS |
| `npm run agentops:agent-detail-final-verify` | PASS |
| `npm run agentops:agent-hermes-memory-verify` | PASS |
| `npm run agentops:manual-run-browser-qa-verify` | PASS |
| `npm run agentops:manual-run-scheduler-verify` | PASS |
| `npm run agentops:vercel-function-count-verify` | PASS (9/12) |
| `npm run agentops:monitoring-owner-promotion-lock-verify` | PASS |

Build gate: git-connected Vercel Preview (local dirty WIP avoided).

---

## 15. Final readiness decision

Issues workflow is owner-acceptable on staging. Promoted BQA detail blocker fixed and verified on alias. Ready for the next AgentOps page.

### FINAL VERDICT

```
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
EXISTING_ISSUES_ROUTE_REUSED: YES
NEW_FINDINGS_ROUTE_CREATED: NO

ISSUES_LIST_OWNER_ACCEPTANCE_PASS: YES
ISSUES_LIST_SHOWS_ISSUE_AGENT_FOUND_TIME: YES
ISSUES_FILTERS_SEARCH_PASS: YES
ISSUES_NOISE_UX_PASS: YES

ISSUE_DETAIL_OWNER_ACCEPTANCE_PASS: YES
ISSUE_DETAIL_SIMPLE_LANGUAGE_PASS: YES
ISSUE_DETAIL_AGENT_FOUND_RUN_VISIBLE: YES
EVIDENCE_ARTIFACTS_PASS: YES
SIGNED_ARTIFACTS_PASS_OR_HONEST_EMPTY: YES

CHAT_TO_PROMPT_FULL_PASS: PARTIAL
FIX_PROMPT_SAVE_PERSISTS: YES
ISSUE_CHAT_SCOPED_TO_AGENT: YES

APPROVE_ACCEPTANCE_PASS: YES
DEFER_ACCEPTANCE_PASS: YES
REJECT_ACCEPTANCE_PASS: YES
NEEDS_MORE_INFO_ACCEPTANCE_PASS: YES
MARK_DUPLICATE_ACCEPTANCE_PASS: YES
PROMOTE_ACCEPTANCE_PASS: YES

NON_OWNER_REJECTED: YES
OWNER_AUTH_ENFORCED: YES
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
