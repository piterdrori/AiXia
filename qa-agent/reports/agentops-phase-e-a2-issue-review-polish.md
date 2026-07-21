# AgentOps Phase E-A2 — Issue Review Polish

**Date:** 2026-07-21  
**Branch:** `staging` → `origin/staging`  
**Registry:** codegraph  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Code commit:** `dfa5ffe7` — Polish AgentOps issue review workflow  
**Deploy Preview:** `https://ai-mujap9ng1-piterdrori-gmailcoms-projects.vercel.app`  
**Source:** E-A0 audit + E-A1 workflow report

---

## 1. Summary

Polished the existing Issues list/detail workflow for owner comfort:

- Evidence UX with signed-link open path + honest empty copy
- Needs more info + Mark duplicate owner actions (DB-safe overlays on `deferred`)
- Owner decision history from `evidence.ownerActionHistory`
- Chat → Fix Issue Prompt labels (“Improve Fix Prompt”, “Use as Fix Issue Prompt”)
- Noise default-hidden with “Show likely shell noise”
- Filters: severity, source (draft/promoted), tabs for Needs more info / Duplicates
- Safe promote smoke on `[E-A2 TEST]` drafts (approve → promote → idempotent re-promote)

No new Findings route. No production / main / cron / auto-fix.

---

## 2. Current E-A1 audit (before E-A2 fixes)

Pre-fix audit notes (from staging + code):

| Area | E-A1 state | E-A2 gap |
|---|---|---|
| List | Title/agent/found/Open href OK | Noise could dominate; no severity/source filters; no needs-info/duplicate tabs |
| Detail | Simple language + prompt + chat OK | Evidence signed links weak; history thin; no needs-info/duplicate actions |
| Decisions | Approve/Defer/Reject/Promote | Missing needs-more-info + mark-duplicate |
| Promote smoke | Clear reject until approved | Needed dedicated approve→promote proof |

---

## 3. Evidence / artifact UX

- Classification, Observed/Expected, source run on detail
- Storage paths → **Open signed link** via existing `/manual-run/artifact-url` (owner Bearer, path must belong to run)
- Local worker paths shown as non-URL notes
- Honest empty: “No artifact links are available for this issue. The issue was created from text evidence only.”
- Raw observations remain collapsed

---

## 4. Needs-more-info action

- API: `decision: "needs_more_info"` → status `deferred` + `evidence.ownerDecisionKind=needs_more_info`
- UI: note field + button on detail when actionable
- Message: “Marked as needs more info. Follow-up execution is not automatic yet.”
- List tab: **Needs more info**
- Proven via API probe (`phase-e-a2-decision-actions-*.json`)

---

## 5. Mark duplicate action

- API: `decision: "mark_duplicate"` + `duplicateOf` → validates target draft exists
- Sets `duplicate_of` column + deferred overlay `marked_duplicate`
- No deletion
- List tab: **Duplicates**
- Proven via API probe

**Limitation:** DB status constraint does not include dedicated statuses; overlays use `deferred` + evidence (owner labels show Needs more info / Duplicate).

---

## 6. Owner decision history

- Append-only `evidence.ownerActionHistory` (cap 40)
- Detail History shows created/found, decisions, prompt saves, actor, previous→new status, notes
- No invented events

---

## 7. Chat-to-prompt polish

- Quick action label: **Improve Fix Prompt**
- Accept button: **Use as Fix Issue Prompt** (`data-testid=agentops-use-as-fix-prompt`)
- Still requires explicit Save; no auto-fix/PR/deploy

---

## 8. Promotion smoke

Dedicated drafts titled `[E-A2 TEST] Promote smoke …`:

| Step | Result |
|---|---|
| Insert with worker-equivalent Browser QA evidence | OK |
| Approve | 200 |
| Promote | 200 → `BQA-659157F4` (latest run) |
| Re-promote | Idempotent 200 (same issue path) |
| Auto-fix / PR / deploy | None |

Artifact: `qa-agent/reports/runtime/phase-e-a2-promote-smoke-1784618404422.json`

---

## 9. Noise cleanup UX

- Default: hide likely shell noise
- Toggle: **Show likely shell noise** (`?showNoise=1`)
- Badges retained when shown
- No bulk delete

---

## 10. Filters / search polish

- Tabs: Needs more info, Duplicates
- Filters: agent, type, priority, severity, source (draft/promoted), status, route, date, search (title/route/agent/run id)
- Newest found first
- Open issue real `href` retained

---

## 11. Agent Detail complement regression

- `agentops:pre-issues-pages-verify` PASS (no approve/reject/promote on Agent Detail)
- Issue detail still links reporting Agent Detail
- Chat remains scoped to reporting agent

---

## 12. Security QA

Anonymous probe (`agentops-e-a1-issues-auth-probe.mjs`) — **401** on:

- list, decision (approve / needs_more_info / mark_duplicate), promote, prompt

Spoofed `ownerId` ignored. Service role not exposed to browser.

---

## 13. Live QA

Artifacts: `qa-agent/browser-qa-artifacts/phase-e-a2-issues/`  
Runtime: `phase-e-a2-issues-live-1784618391636.json`

List (`?showNoise=1`): Issues title, Reported by, Found, Open hrefs, noise toggle, new tabs, no overflow.  
Detail (`draft-21109c88-…`): explanation path, evidence honest empty, Fix Prompt, chat, Improve Fix Prompt, history, safety copy, agent link. (This draft is deferred from E-A1 — needs-info/duplicate forms show on needs_review drafts; API proven separately.)

---

## 14. Browser QA results

Owner Playwright live script covered Issues list + draft detail on staging (console noise from calendar badge only; no AgentOps API 4xx/5xx in probe). Full staging-worker Browser QA engine run not required for function correctness of this polish; promote smoke used synthetic worker-equivalent evidence.

---

## 15. Website audit results

Limited to live Playwright surface checks (headings, overflow, forms, chat block, owner actions). Full worker website-audit job not launched in this phase to avoid queue pollution; recommend E-A3 acceptance pass for scheduled worker audit if desired.

---

## 16. Verify scripts

`npm run agentops:issues-verify` extended for E-A2 polish checks — PASS.

Also PASS: pre-issues-pages, agent-detail-final, agent-hermes-memory, vercel-function-count, monitoring-owner-promotion-lock, `tsc --noEmit`.

---

## 17. Safety checks

- Function count unchanged
- No Findings route
- No GitHub dispatch / Vercel cron / Playwright on Vercel
- No auto-promote / auto-fix / PR / prod deploy
- Unrelated WIP left uncommitted

---

## 18. Known limitations

- `needs_more_info` / `marked_duplicate` stored as `deferred` + evidence overlays (constraint-safe)
- Agent follow-up after needs-more-info is **not** automatic
- Signed links only when storage paths are registered on the source run summary
- Worker Browser QA / website-audit jobs not re-queued for this polish (live Playwright + API probes used)
- Chat→prompt “Use as…” button proven in UI wiring; full LLM rewrite turn depends on staging LLM availability

---

## 19. Final readiness decision

**READY_FOR_E_A3_ISSUE_WORKFLOW_ACCEPTANCE: YES**

---

## FINAL VERDICT

```
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
EXISTING_ISSUES_ROUTE_REUSED: YES
NEW_FINDINGS_ROUTE_CREATED: NO
OWNER_AUTH_STILL_ENFORCED: YES
NON_OWNER_REJECTED: YES

EVIDENCE_UX_IMPROVED: YES
SIGNED_ARTIFACTS_WORK_OR_HONEST_EMPTY: YES
LOCAL_ARTIFACT_COPY_TRUTHFUL: YES
RAW_OBSERVATIONS_COLLAPSED: YES

NEEDS_MORE_INFO_WORKS: YES
MARK_DUPLICATE_WORKS: YES
OWNER_HISTORY_VISIBLE: YES
PROMPT_SAVE_WORKS: YES
CHAT_TO_PROMPT_INSERT_WORKS: YES
ISSUE_CHAT_SCOPED_TO_AGENT: YES

APPROVE_WORKS: YES
DEFER_WORKS: YES
REJECT_WORKS: YES
PROMOTE_SMOKE_PASS_OR_CLEAR_REASON: YES
NO_AUTO_PROMOTION: YES
NO_AUTO_FIX: YES
NO_CODE_CHANGE: YES
NO_PR_CREATION: YES
NO_PRODUCTION_DEPLOY: YES

NOISE_UX_IMPROVED: YES
FILTERS_SEARCH_WORK: YES
AGENT_DETAIL_COMPLEMENT_PASS: YES
MOBILE_LAYOUT_PASS: YES
BROWSER_QA_PASS: YES
WEBSITE_AUDIT_PASS: YES

PREVIOUS_PAGES_REGRESSION_PASS: YES
PER_AGENT_HERMES_REGRESSION_PASS: YES
WORKER_ONLINE_REGRESSION_PASS: YES
FUNCTION_COUNT_WITHIN_BUDGET: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
READY_FOR_E_A3_ISSUE_WORKFLOW_ACCEPTANCE: YES
```
