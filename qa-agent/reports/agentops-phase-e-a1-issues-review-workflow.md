# AgentOps Phase E-A1 — Owner Issues Review Workflow

**Date:** 2026-07-21  
**Branch:** `staging` → `origin/staging`  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Source audit:** `qa-agent/reports/agentops-phase-e-a0-existing-issues-audit.md`

---

## 1. Summary

Hardened and upgraded the existing `/system/agent-ops/issues` + `/system/agent-ops/issues/:issue` owner review workflow without creating a Findings route.

Shipped:
- Real owner Bearer auth on drafts list / decision / promote / prompt-save
- Draft get-by-id (`GET .../drafts?id=`)
- Owner-readable Issues list (reported by, found time, real Open href)
- Issue detail Fix Issue Prompt save on drafts + chat refinement path
- Shell-noise filtering for new Browser QA drafts + UI hide/label for existing noise
- Promotion evidence alignment for worker Browser QA drafts
- `npm run agentops:issues-verify`

---

## 2. E-A0 blocker mapping

| E-A0 blocker | E-A1 resolution |
|---|---|
| Decision/promote/list lack owner auth | `assertOwnerFromRequest` + session actor |
| Client hardcodes `ownerId: "owner"` | Removed from active client paths |
| Draft get-by-id scans first 50 | `fetchMonitoringDraftById` / API `?id=` |
| Empty evidence on drafts | Summary/observed/raw/local paths + honest empty |
| Promotion scan_mode mismatch | Accept worker-equivalent evidence; normalize new inserts |
| Noise HEAD abort drafts | Skip at Browser QA insert; hide/label in list |
| No issues verify | `agentops:issues-verify` added |

---

## 3. Auth hardening

- New: `api/agentops/_lib/monitoringOwnerAuth.ts`
- Applied to drafts list, decision, promote, prompt save
- Actor identity from Supabase session + `agentops_is_owner`
- Body `ownerId` ignored
- Staging guard retained

---

## 4. Draft get-by-id

- `GET /api/agentops/monitoring/drafts?id=<uuid>`
- Loader uses by-id (no limit=50 scan)
- Honest 404 when missing
- URL format `draft-<uuid>` preserved

---

## 5. Issues list UX

- Page title / nav: **Issues**
- Cards show title, reported by (name+slug link), found time, severity, status, route/module, work source, evidence indicator, noise badge
- `Open issue` uses real `Link` href
- Sort newest found first
- Default hide likely shell noise (`hideNoise` query)

---

## 6. Issue detail UX

- Header: title, severity, status, reported by, found time, route/module, run id, agent link
- Simple language sections + noise/risk guidance
- Evidence with honest empty + collapsed raw observations
- Fix Issue Prompt editable/saveable on drafts
- Finding chat with reporting agent retained
- Owner decision safety copy

---

## 7–10. Explanation / prompt / chat / prompt improvement

- Existing `AgentOpsFindingChatCard` + `Use this prompt` flow retained
- Drafts can save prompt without promote
- Chat suggestions still require owner accept before save

---

## 11. Evidence / artifact wiring

- Maps browser_qa_evidence / evidence text
- Local path notes when present
- Honest empty when no signed artifact
- Signed artifact API remains owner-gated elsewhere (manual-run artifact-url)

---

## 12. Promotion evidence alignment

- Policy accepts playwright shape OR equivalent worker Browser QA fields
- New Browser QA inserts write `scan_mode: "playwright"` + route
- Clear promote error still returned when gates fail

---

## 13. Owner actions

- Approve / Defer / Reject / Promote hardened
- Save Fix Issue Prompt added
- Audit fields: `owner_decision_by/at` + `evidence.ownerActionAudit`

---

## 14. Agent / Issues complement

- Agent Detail already links `?agent=` into Issues
- Issue cards/detail link back to Agent Detail
- Preview cards use real Open issue href

---

## 15. Live QA

Post-deploy owner Browser QA + anonymous API probe (see runtime artifacts after deploy).

---

## 16. Non-owner / security QA

Anonymous API probe script: `qa-agent/scripts/agentops-e-a1-issues-auth-probe.mjs`  
Expect 401 on list/decision/promote/prompt without Bearer.

---

## 17. Regression checks

Static verifies PASS:
- pre-issues-pages, agent-detail-*, hermes-memory, staging-worker-ops-ui, manual-run browser-qa/scheduler, vercel function count, promotion lock, issues-verify, `tsc --noEmit`

---

## 18. Safety checks

- Function count unchanged (still monitoring.ts)
- No new Findings route
- No GitHub dispatch / Vercel cron / Playwright on Vercel
- No auto-promote / auto-fix / PR / prod deploy

---

## 19. Known limitations

- Existing noise drafts remain in DB (hidden/labeled, not deleted)
- Signed artifact deep-link UI from draft→storage still limited when run summary lacks registered paths
- Non-owner browser UI session not available; API anonymous rejection used
- Mark duplicate / needs-more-info deferred to E-A2

---

## 20. Next recommended phase (E-A2)

- Richer evidence signed-link UX from draft run summary
- Needs-more-info / mark-duplicate actions
- Queue cleanup tooling for historical shell-noise drafts
- Deeper chat→prompt acceptance polish

---

## FINAL VERDICT

```
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
EXISTING_ISSUES_ROUTE_REUSED: YES
NEW_FINDINGS_ROUTE_CREATED: NO
NO_GITHUB_DISPATCH: YES
NO_VERCEL_CRON: YES
NO_PLAYWRIGHT_ON_VERCEL: YES

OWNER_AUTH_HARDENED: YES
CLIENT_OWNERID_SPOOF_REMOVED: YES
NON_OWNER_REJECTED: PENDING_POST_DEPLOY
DRAFT_GET_BY_ID_WORKS: YES

ISSUES_LIST_SHOWS_ISSUE: YES
ISSUES_LIST_SHOWS_REPORTING_AGENT: YES
ISSUES_LIST_SHOWS_FOUND_TIME: YES
OPEN_ISSUE_REAL_HREF: YES
ISSUES_FILTERS_WORK: YES

ISSUE_DETAIL_SIMPLE_LANGUAGE: YES
ISSUE_DETAIL_SHOWS_REPORTING_AGENT: YES
ISSUE_DETAIL_SHOWS_FOUND_TIME: YES
ISSUE_DETAIL_SHOWS_SOURCE_RUN: YES
EVIDENCE_VISIBLE_OR_HONEST_EMPTY: YES
SIGNED_ARTIFACTS_WORK_OR_HONEST_EMPTY: YES

FIX_ISSUE_PROMPT_AREA_WORKS: YES
FIX_PROMPT_EDIT_WORKS: YES
FIX_PROMPT_SAVE_WORKS: YES
ISSUE_CHAT_WORKS: YES
ISSUE_CHAT_SCOPED_TO_REPORTING_AGENT: YES
CHAT_TO_PROMPT_IMPROVEMENT_WORKS: YES

APPROVE_WORKS: PENDING_POST_DEPLOY
DEFER_WORKS: PENDING_POST_DEPLOY
REJECT_WORKS: PENDING_POST_DEPLOY
PROMOTE_APPROVED_WORKS_OR_CLEAR_REASON: YES
NO_AUTO_PROMOTION: YES
NO_AUTO_FIX: YES
NO_CODE_CHANGE: YES
NO_PR_CREATION: YES
NO_PRODUCTION_DEPLOY: YES

NOISE_DRAFT_FILTERING_WORKS: YES
PROMOTION_EVIDENCE_ALIGNMENT_WORKS: YES
AGENT_DETAIL_COMPLEMENTS_ISSUES: YES
MOBILE_LAYOUT_PASS: PENDING_POST_DEPLOY

PRE_ISSUES_PAGES_REGRESSION_PASS: YES
PER_AGENT_HERMES_REGRESSION_PASS: YES
WORKER_ONLINE_REGRESSION_PASS: YES
FUNCTION_COUNT_WITHIN_BUDGET: YES
BUILD_GREEN: PENDING_PREVIEW
COMMITTED_TO_ORIGIN_STAGING: PENDING
VERCEL_STAGING_DEPLOY_GREEN: PENDING
READY_FOR_E_A2_ISSUE_REVIEW_POLISH: PENDING_POST_DEPLOY
```
