# AgentOps Phase E-A5 — Issues List Simplification

**Date:** 2026-07-21  
**Branch:** `origin/staging` @ `be149a3b` (fix leftover) · feature commit `f7dab74b`  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/issues  
**Preview:** `https://ai-205frkd9i-piterdrori-gmailcoms-projects.vercel.app` (Ready)  
**Alias:** https://ai-xia-staging.vercel.app → Preview above (not `--prod`)  
**main / production:** untouched  

---

## 1. Summary

The Issues list is now a browse-and-open inbox. Decision actions were removed from list cards. All owner decisions remain on the issue detail page. Inbox helper copy was added. Filters/tabs are unchanged and still only change what is displayed.

## 2. Owner decision

The list page must not contain decision actions. It is only for browsing and opening issues. All issue decisions happen on the detail page.

## 3. List card simplification

Each list card still shows:

- issue title
- reported by agent
- found time
- severity / priority
- status
- source route/module
- evidence indicator
- noise badge when relevant
- **Open issue** as a real `Link` (`href` → `/system/agent-ops/issues/:issue`)

Removed from list wiring (`src/app/system/agent-ops/issues/page.tsx`):

- `onApprove` / `onDefer` / `onReject` / `onSecondary`
- `decideDraft` / `promoteDraft` handlers
- “Next step” recommended-action decision hints on cards

Shared `AgentOpsFindingCard` still supports optional decision props for other callers (e.g. Agent Results); the Issues list no longer passes them.

## 4. Removed list actions

Removed from list cards:

- Approve
- Defer
- Reject
- Needs more info
- Mark duplicate
- Promote / Promote to issue
- Review verification secondary action

Kept:

- Open issue only

Inbox helper copy:

> This is your Issues inbox. Open an issue to review the evidence, chat with the reporting agent, improve the fix prompt, and decide what to do.

## 5. Detail action regression

Detail page (`/system/agent-ops/issues/:issue`) unchanged for workflow:

- Accept / Approve
- Later / Defer
- Dismiss / Reject
- Needs more info
- Mark duplicate
- Promote approved issue
- Fix Issue Prompt save
- chat-to-prompt flow

Live detail open of a needs-review draft showed Approve / Defer / Reject / Needs more info / Mark duplicate / Fix Issue Prompt / chat surface. Promote correctly absent until approved.

## 6. Filters/tabs regression

Still present and display-only:

- Needs review, Accepted/active, Needs more info, Later/deferred, Duplicates, Dismissed/rejected, Promoted/active, All
- agent / severity / status filters
- noise toggle (default hide shell noise)
- search

Live: tabs + “Show likely shell noise” visible; `?tab=all` listed 117 cards.

## 7. Live QA

Script: `qa-agent/scripts/agentops-e-a5-issues-list-live.mjs`  
Base: https://ai-xia-staging.vercel.app  

| Check | Result |
|---|---|
| page loads | YES |
| title / reported by / found time | YES (117 cards) |
| only Open issue card action | YES |
| no Approve/Defer/Reject/Promote buttons on cards | YES |
| Open issue real href | YES (`/system/agent-ops/issues/draft-…`) |
| filters/tabs / noise toggle | YES |
| mobile no overflow (390) | YES |
| detail opens + decision actions | YES |
| Fix Issue Prompt present | YES |
| chat surface present | YES |

Additional regression (`agentops-e-a4-chat-to-prompt-live.mjs` on staging after alias):

- `chatToPromptFullPass: true`
- `promptUpdated` / `saved` / `persisted: true`
- Suggested Fix Prompt + Use as Fix Issue Prompt exercised

Light previous-page regression (`agentops-e-a4-regression-light.mjs`): Control Center / Agents / design-agent loaded, no overflow.

Security probe: `qa-agent/scripts/agentops-e-a3-security-probe.mjs` — all anonymous decision/prompt/promote/list calls **401**.

## 8. Security regression

| Check | Result |
|---|---|
| owner auth required for detail actions | YES (API 401 without bearer) |
| anonymous cannot approve/defer/reject/promote/save prompt | YES |
| spoofed `ownerId` ignored (no session) | YES (401) |
| service role not exposed | YES (no secrets in client list change) |
| no secrets logged | YES |

## 9. Safety checks

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run agentops:issues-verify` | PASS |
| `npm run agentops:issues-acceptance-verify` | PASS |
| `npm run agentops:pre-issues-pages-verify` | PASS |
| `npm run agentops:vercel-function-count-verify` | PASS (9/12) |
| `npm run agentops:monitoring-owner-promotion-lock-verify` | PASS |
| Vercel Preview build | Ready (`ai-205frkd9i-…`) after TS leftover fix |

First Preview for `f7dab74b` failed on leftover `setActionFeedback` (fixed in `be149a3b`).

## 10. Final readiness decision

**READY_FOR_OWNER_REVIEW_OF_ISSUES_LIST: YES**

List is browse/open only; decisions stay on detail; staging alias updated; main/production untouched.

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| EXISTING_ISSUES_ROUTE_REUSED | YES |
| NEW_FINDINGS_ROUTE_CREATED | NO |
| LIST_PAGE_ONLY_HAS_OPEN_ISSUE_ACTION | YES |
| APPROVE_REMOVED_FROM_LIST | YES |
| DEFER_REMOVED_FROM_LIST | YES |
| REJECT_REMOVED_FROM_LIST | YES |
| PROMOTE_REMOVED_FROM_LIST | YES |
| ISSUE_TITLE_VISIBLE | YES |
| REPORTING_AGENT_VISIBLE | YES |
| FOUND_TIME_VISIBLE | YES |
| OPEN_ISSUE_REAL_HREF | YES |
| FILTERS_TABS_STILL_WORK | YES |
| DETAIL_ACTIONS_STILL_WORK | YES |
| FIX_PROMPT_REGRESSION_PASS | YES (`saved` + `persisted` on E-A4 live) |
| CHAT_TO_PROMPT_REGRESSION_PASS | YES (`chatToPromptFullPass: true`) |
| OWNER_AUTH_STILL_ENFORCED | YES |
| MOBILE_LAYOUT_PASS | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES |
| BUILD_GREEN | YES |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_OWNER_REVIEW_OF_ISSUES_LIST | YES |
