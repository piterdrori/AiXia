# AgentOps Phase E-A6 — Issue Detail Fix with Cursor Workflow

**Date:** 2026-07-22  
**Branch:** `origin/staging` — code commit `e31f0e6b` "Add AgentOps issue fix workflow"  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/issues/:issue  
**Preview:** `https://ai-iclta5ejo-piterdrori-gmailcoms-projects.vercel.app` (Ready)  
**Alias:** https://ai-xia-staging.vercel.app → Preview above (not `--prod`)  
**main / production:** untouched  

---

## 1. Summary

The issue detail page is rebuilt around two prime owner actions: **Fix with Cursor** and **Delete issue**. Approve/Defer/Reject moved into collapsed Advanced actions with owner-readable names (Accept as real issue / Review later / Dismiss). The page now shows "Page checked by the agent" with a clickable staging link, an owner-readable Suggested solution paragraph, a structured Cursor-quality Fix Issue Prompt template, a Fixing → Fixed lifecycle with owner-confirmed Mark as fixed, soft-delete with audit, Mark duplicate hidden in Advanced, and History renamed to Activity log.

## 2. Owner screenshot issues addressed

| Owner problem | Fix |
|---|---|
| Approve/Defer/Reject visible and unclear | Removed from prime area; renamed and collapsed into Advanced actions |
| Source route/module unclear | "Page checked by the agent" with clickable staging URL; run id as "Technical source run" |
| Suggested solution not useful | Owner-readable paragraph (reproduce → fix → recheck); limited-evidence variant asks Cursor to verify reproduction first |
| Fix Issue Prompt too weak | Structured template: context / issue / page / evidence / task / constraints / expected output |
| Owner decision confusing | Replaced by "Issue actions" with prime Fix with Cursor + Delete issue |
| Mark duplicate confusing | Advanced-only with "same problem" explanation |
| History unclear | "Activity log" with subtitle; collapses when > 6 entries; owner-friendly labels |

## 3. New issue action model

Prime (header + Issue actions):

- **Fix with Cursor** (primary) — copies + downloads the structured prompt, marks status Fixing
- **Delete issue** (secondary) — confirmation, soft-delete/archive
- Back to Issues · Copy fix prompt · **Mark as fixed** (confirmation + optional note)

Safety copy: "Fix with Cursor uses the Fix Issue Prompt on staging only. It does not touch production." / "Delete issue removes this issue from the active list. It does not fix code."

Advanced (collapsed): Accept as real issue · Review later · Dismiss · Needs more info · Mark duplicate · Promote approved issue.

## 4. Page checked by agent

`stagingPageUrl()` builds `https://ai-xia-staging.vercel.app<route>` for app routes only (non-staging absolute URLs rejected). Live QA: link rendered and clickable (`data-testid="agentops-page-checked"`). Module + technical source run shown beneath.

## 5. Suggested solution rewrite

`buildOwnerSuggestedSolution()` — plain paragraph, no raw dump. Weak-evidence/noise cases say: "This issue has limited evidence. Cursor should first verify whether the problem still reproduces before changing code."

## 6. Structured Fix Issue Prompt

`buildStructuredFixIssuePrompt()` in `src/lib/agentops/findings/issueFixWorkflow.ts` emits the full template (AGENTOPS ISSUE FIX — STAGING ONLY · Issue · Reported by · Page checked · Found · Source run · Severity · Simple explanation · Evidence · Task · Required steps 1–7 · Strict constraints · Expected output). Owner-editable via "Use structured template" button; save persists (live-verified); Copy prompt works (live clipboard check). No secrets, tokens, cookies, or storage_state are ever included — template inputs are issue fields only.

## 7. Cursor/TaskFlow handoff

**CURSOR_DIRECT_LAUNCH: LOCAL_BRIDGE_REQUIRED.** No existing TaskFlow/Cursor integration or deep link can safely start Cursor from the staging browser. Implemented honest handoff:

- Copies structured prompt to clipboard
- Downloads `agentops-fix-<id>.md` prompt file
- Shows "open Cursor and paste this prompt" status
- Marks draft **Fixing** via owner-authenticated decision API

No fake "Sent to Cursor" automation claims (statically asserted).

## 8. Fixing / Fixed lifecycle

DB status stays within its constraint (`draft|owner_approved|rejected|deferred|promoted`); owner states persist as evidence overlays:

| Owner action | DB status | `ownerDecisionKind` | Owner label |
|---|---|---|---|
| Fix with Cursor | `deferred` | `fixing` | Fixing |
| Mark as fixed | `deferred` | `fixed_by_owner` | Fixed |
| Delete issue | `rejected` | `deleted_by_owner` | Deleted |

Mark as fixed requires confirmation + optional note; recorded in `ownerActionHistory`. Automatic verification is **not** implemented — owner-confirmed path only (E-A7 follow-up).

## 9. Delete / archive issue

Confirmation copy: "Delete this issue from the active list? This does not fix code. The record will be archived for audit." Soft-delete only — no rows hard-deleted; the record remains in the Deleted tab. Promoted (`agentops_findings`) records fall back to Dismiss with honest feedback (documented limitation).

## 10. Advanced actions

Collapsed `AgentOpsAdvancedDisclosure` inside Issue actions. Mark duplicate explanation: "Use this only when two issue records describe the same problem." Live QA confirms no Mark duplicate button outside the collapsed disclosure.

## 11. Activity log

Renamed from History. Subtitle: "Records what happened to this issue: when it was created, prompt changes, owner actions, and fix status." Collapses when > 6 entries. Owner-friendly labels via `ownerActivityLabel()` (e.g. "Sent to Cursor — marked Fixing", "Deleted by owner").

## 12. List status regression

- New tabs: **Fixing** and **Deleted** (plus existing Fixed)
- Fixing/Fixed/Deleted hidden from default Needs review tab (statically + live verified)
- Deleted hidden from All (audit lives in Deleted tab)
- List remains browse/open only — no decision buttons returned

## 13. Live QA

Script: `qa-agent/scripts/agentops-e-a6-issue-fix-workflow-live.mjs` — **ok: true** (test drafts `[E-A6 TEST] … 1784688860…`):

- Prime area: Fix with Cursor ✓ Delete issue ✓ no Approve/Defer/Reject ✓
- Page checked link → `https://ai-xia-staging.vercel.app/system/agent-ops/issues` ✓
- Suggested solution paragraph ✓ Activity log ✓ safety copy ✓
- Structured template inserted + saved + persisted after reload ✓
- Copy prompt → clipboard starts with template header ✓
- Fix with Cursor → `agentops-fix-<id>.md` download + handoff status + **Fixing** ✓
- Mark as fixed (confirm + note) → **Fixed**; hidden from default list; visible in Fixed tab ✓
- Delete issue (confirm) → **Deleted**; hidden from default list; visible in Deleted tab ✓
- Mark duplicate only inside collapsed Advanced ✓
- Mobile 390px: no overflow ✓

First run surfaced two QA-script defects (fixed): flat waits raced page reloads, and Chrome keeps closed-`<details>` content layout-queryable so visibility checks now use the semantic collapsed-details assertion.

## 14. Security QA

- Anonymous `mark_fixing` / `mark_fixed` / `delete_issue` → **401** (live)
- Full E-A3 anonymous probe (list/decision/promote/prompt/artifact + path traversal) → all **401**
- Client-supplied `ownerId` ignored (session-only identity, unchanged)
- Service role never in browser; handoff prompt built from issue fields only — no tokens/cookies/storage_state
- No secrets logged

## 15. Regression QA

- Chat-to-prompt live: `chatToPromptFullPass: true`, prompt save persisted
- E-A5 list live: ok (list browse/open only; detail updated to E-A6 contract)
- Light previous-page regression (Control Center / Agents / design-agent): loaded, no overflow
- Per-agent Hermes namespaces verify: 12 canonical agents ok
- Promoted BQA-* detail bridge untouched

## 16. Verify scripts

- `agentops:issues-verify` — updated E-A6 assertions, PASS
- `agentops:issues-acceptance-verify` — updated E-A6 assertions, PASS
- **New** `agentops:issue-fix-workflow-verify` — 17 checks incl. prime actions, template sections, overlays, default-list hiding, honest handoff, owner auth — PASS

## 17. Safety checks

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `agentops:issues-verify` | PASS |
| `agentops:issues-acceptance-verify` | PASS |
| `agentops:issue-fix-workflow-verify` | PASS |
| `agentops:pre-issues-pages-verify` | PASS |
| `agentops:agent-hermes-memory-verify` | PASS |
| `agentops:vercel-function-count-verify` | PASS (9/12) |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| Vercel Preview build (build gate; local WIP dirty) | Ready (`ai-iclta5ejo-…`) |

## 18. Known limitations

1. **No direct Cursor launch** — browser cannot start Cursor without a local bridge (LOCAL_BRIDGE_REQUIRED). Safe handoff (clipboard + .md file + instructions) implemented instead.
2. **No automatic fix verification** — Fixed requires owner confirmation. Automatic Browser-QA-based verification is an E-A7 follow-up.
3. **Promoted (`agentops_findings`) records**: Delete issue falls back to Dismiss (kept for audit); Fixing overlay applies to drafts only — promoted issues use their existing In progress/Fixed lifecycle.
4. Old E-A6 test drafts remain labeled `[E-A6 TEST]` in Fixed/Deleted tabs (audit-visible, harmless).

## 19. Final readiness decision

**READY_FOR_OWNER_REVIEW_OF_ISSUE_DETAIL: YES**

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| EXISTING_ISSUES_ROUTE_REUSED | YES |
| NEW_FINDINGS_ROUTE_CREATED | NO |
| PRIME_APPROVE_DEFER_REJECT_REMOVED | YES |
| FIX_WITH_CURSOR_VISIBLE | YES |
| DELETE_ISSUE_VISIBLE | YES |
| PAGE_CHECKED_BY_AGENT_CLEAR | YES |
| SUGGESTED_SOLUTION_SIMPLE | YES |
| FIX_PROMPT_STRUCTURED | YES |
| CURSOR_DIRECT_LAUNCH_WORKS | LOCAL_BRIDGE_REQUIRED |
| CURSOR_PROMPT_HANDOFF_WORKS | YES |
| FIXING_STATUS_WORKS | YES |
| MARK_FIXED_WORKS | YES |
| FIXED_HIDDEN_FROM_DEFAULT_LIST | YES |
| DELETE_ARCHIVE_WORKS | YES |
| DELETED_HIDDEN_FROM_DEFAULT_LIST | YES |
| MARK_DUPLICATE_ADVANCED_ONLY | YES |
| ACTIVITY_LOG_CLEAR | YES |
| CHAT_TO_PROMPT_REGRESSION_PASS | YES |
| PROMPT_SAVE_REGRESSION_PASS | YES |
| EVIDENCE_REGRESSION_PASS | YES |
| LIST_OPEN_ONLY_REGRESSION_PASS | YES |
| OWNER_AUTH_ENFORCED | YES |
| NON_OWNER_REJECTED | YES |
| NO_OWNERID_SPOOF | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| CURSOR_HANDOFF_NO_SECRETS | YES |
| NO_AUTO_PRODUCTION_DEPLOY | YES |
| NO_AUTO_PR_CREATION | YES |
| NO_SECRET_LEAKAGE | YES |
| MOBILE_LAYOUT_PASS | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES (9/12) |
| BUILD_GREEN | YES (Preview build gate) |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_OWNER_REVIEW_OF_ISSUE_DETAIL | YES |
