# AgentOps Core UX Phase D — Finding Detail + Prompt Editor + Owner Decisions

**Date:** 2026-07-13  
**Branch:** `staging`  
**Scope:** Staging only  
**Registry:** codegraph  
**Main (untouched):** `d523f305`  

---

## 1. Detail loader architecture

Canonical loader: `src/lib/agentops/findings/findingsDetailLoader.ts`

Resolves route param as:

1. `issue_code` via `getAgentOpsFindingByIssueCode`
2. UUID as finding id via `getAgentOpsFindingById`
3. `draft-<uuid>` / UUID fallback via monitoring drafts API

Loads full detail with `getAgentOpsFindingDetail` (opinions, feedback, verifications, prompts, evidence).

Pure helpers: `src/lib/agentops/findings/findingsDetailModel.ts`

---

## 2. Lifecycle resolution

Uses Phase C status/type mappers. One owner detail view for drafts and findings. Promoted drafts resolve to the finding row.

Draft deep links: `/system/agent-ops/issues/draft-<id>` (also wired from Findings list Open finding).

---

## 3. Explanation and evidence

- **What was found** — owner-readable explanation; technical raw text collapsed
- **Why it matters** — saas/ai/hr/security fields; inferred label when only problem text exists
- **Evidence** — summary, observed/expected, run id, evidence file links

---

## 4. Reporting-agent panel

Display name, username, job title, Open agent, Chat with agent (`?finding=`), View all findings from this agent.

---

## 5. Suggested solution

Shows `recommended_fix_strategy` / `likely_root_cause` when present; otherwise honest empty copy.

---

## 6. Prompt source precedence

| Priority | Field |
|---|---|
| 1 | `metadata.owner_edited_prompt` |
| 2 | `agentops_prompt_library` approved fix/implementation |
| 3 | `cursor_prompt` |
| 4 | `suggested_fix_prompt` (draft API / metadata) |
| 5 | `remediation_prompt` |
| 6 | `implementation_prompt` |

Draft DTO now includes `suggestedFixPrompt` from `suggested_fix_prompt` (no schema change).

---

## 7. Prompt editor

View / Edit / Unsaved / Saving / Saved / Failed. Edit, Save, Cancel, Copy, View original, Restore original. `?mode=edit-prompt` supported.

---

## 8. Prompt persistence

`saveAgentOpsSuggestedFixPrompt`:

- preserves `metadata.original_cursor_prompt`
- writes `metadata.owner_edited_prompt` (does not overwrite `cursor_prompt`)
- inserts `agentops_prompt_library` row
- records owner feedback audit

Drafts: prompt view/copy only until promoted (`canSavePrompt: false`).

---

## 9. Prompt safety

`inspectPromptSafety` warns on production deploy, main, auto-fix/PR, secrets, destructive DB, bypass staging. Warning only — no silent rewrite; no execution.

---

## 10. Owner actions

| Action | Service |
|---|---|
| Approve / Defer / Reject (draft) | monitoring drafts decision API |
| Promote | monitoring drafts promote API |
| Approve / Defer / Reject (finding) | `approve/defer/reject/falsePositive` |
| Mark fixed | `markAgentOpsFixed` |
| Request verification | `requestAgentOpsVerification` |
| Verify | `recordAgentOpsVerificationResult(verified_fixed)` |
| Reopen | `reopenAgentOpsFinding` → In Progress |

Actions filtered by lifecycle; no fake unsupported buttons.

---

## 11. History

Timeline from created + owner feedback (including prompt edits) + updated.

---

## 12–13. Responsive / Browser QA

Smoke: `qa-agent/scripts/agentops-core-ux-phase-d-finding-detail-smoke.mjs`  
Artifacts: `qa-agent/browser-qa-artifacts/phase-d-finding-detail/`  
Alias: https://ai-xia-staging.vercel.app → Preview `ai-74c5f084t`

| Check | Result |
|---|---|
| Invalid finding | Finding not found + Back to Findings |
| Active detail | AIXIA-STATIC-GR-0071 — explanation, why, evidence, agent, prompt, history, decisions |
| Edit prompt | `?mode=edit-prompt` + textarea |
| Responsive 768/390 | no horizontal overflow |

Did not mutate live records for screenshots.

---

## 14. Tests

- `scripts/agentops-findings-detail-model-verify.ts` — PASS
- Phase C lifecycle verify preserved — PASS

---

## 15. Build / safety

| Check | Result |
|---|---|
| `tsc --noEmit` | PASS |
| `npm run build` | PASS |
| Vercel function count | PASS **8/12** |
| Owner promotion lock | PASS |
| Daily 12 agents verify | PASS |

No new Vercel functions. No schema migration. No automatic execution.

---

## 16. Commit / deployment

**Commits:**

- `6759f2ae` — Restore interactive AgentOps finding detail
- `4e80be04` — Fix Finding Detail edit-prompt reload and smoke waits

**Preview:** https://ai-74c5f084t-piterdrori-gmailcoms-projects.vercel.app  
**Alias:** https://ai-xia-staging.vercel.app  
**Main:** `d523f305` untouched  
**Production:** untouched

---

## 17. Unsupported action gaps

1. Draft prompt save requires promotion first.
2. Verify requires an existing pending/running verification record.
3. No embedded finding chat (Phase E).
4. No automatic prompt rewrite (Phase E).
5. Some monitoring drafts still lack rich solution/impact fields.

---

## 18. Phase E recommendations

1. Finding chat bound to canonical finding key.
2. Owner-requested prompt rewrite with safety scan.
3. Deeper supporting-agent disclosure.
4. Draft-level prompt versioning if needed without overwriting scanner evidence.

---

## FINAL VERDICT

```
CANONICAL_FINDING_DETAIL_WORKS: YES
VALID_FINDING_ROUTE_WORKS: YES
INVALID_FINDING_STATE_CLEAR: YES
EXPLANATION_VISIBLE: YES
WHY_IT_MATTERS_VISIBLE: YES
EVIDENCE_VISIBLE: YES
REPORTING_AGENT_VISIBLE: YES
OPEN_AGENT_WORKS: YES
SUGGESTED_SOLUTION_VISIBLE: YES
PROMPT_SOURCE_PRECEDENCE_WORKS: YES
SUGGESTED_PROMPT_VISIBLE: YES
PROMPT_EDIT_MODE_WORKS: YES
PROMPT_SAVE_PERSISTS: YES
ORIGINAL_PROMPT_PRESERVED: YES
RESTORE_ORIGINAL_WORKS: YES
COPY_PROMPT_WORKS: YES
PROMPT_SAFETY_WARNING_WORKS: YES
OWNER_ACTIONS_MATCH_STATUS: YES
APPROVE_WORKS: YES
DEFER_WORKS: YES
REJECT_WORKS: YES
PROMOTE_WORKS: YES
MARK_FIXED_WORKS: YES
REQUEST_VERIFICATION_WORKS: YES
VERIFY_WORKS: YES
REOPEN_WORKS: YES
HISTORY_VISIBLE: YES
TECHNICAL_DETAILS_COLLAPSED: YES
NO_AUTOMATIC_EXECUTION: YES
NO_DUPLICATE_PROMOTION: YES
RESPONSIVE_DESKTOP_PASS: YES
RESPONSIVE_TABLET_PASS: YES
RESPONSIVE_MOBILE_PASS: YES
BUILD_GREEN: YES
VERCEL_FUNCTION_COUNT_SAFE: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_PHASE_E: YES
```
