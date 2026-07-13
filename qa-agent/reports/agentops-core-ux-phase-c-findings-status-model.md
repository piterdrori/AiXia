# AgentOps Core UX Phase C — Findings List + Complete Status Model

**Date:** 2026-07-13  
**Branch:** `staging`  
**Scope:** Staging only — Findings list / status model / owner catalog  
**Registry:** codegraph  
**Base (pre-commit):** `4e17ffcd`  
**Main (untouched):** `d523f305`  

---

## 1. Internal status audit

### Monitoring drafts (`agentops_monitoring_issue_drafts` via `/api/agentops/monitoring/drafts`)

| Stored status | Owner-facing |
|---|---|
| `draft` | Needs review |
| `owner_approved` | Approved |
| `promoted` | Superseded (dropped from UI; promoted finding wins) |
| `rejected` | Rejected |
| `deferred` | Deferred |
| other | Unknown |

### Promoted findings (`agentops_findings`)

| Stored status | Owner-facing |
|---|---|
| `New`, `Backlog` | Needs review |
| `Owner Reviewed`, `Approved for Fix` | Approved |
| `Active Top 10` | Active |
| `In Progress`, `Still Broken`, `Needs Follow-Up Fix` | In progress |
| `Marked Fixed by Piter` | Fixed |
| `Verification Running`, `Verification Blocked` | Waiting for verification |
| `Verified Fixed` | Verified |
| `Deferred` | Deferred |
| `Rejected`, `False Positive` | Rejected |
| `Archived` | Archived |
| unrecognized | Unknown (documented, still shown in All) |

### Unsupported / not invented

- No new DB statuses.
- No fake “fixed” without a real stored mapping.
- Owner decision / promote remain existing draft APIs only.
- Mark fixed / verify / reopen from advanced operator surfaces are **not** newly invented on this list; Verification/Fixed cards deep-link to finding detail / existing review paths.

---

## 2. Canonical owner status mapper

Pure module: `src/lib/agentops/findings/findingsLifecycleModel.ts`

- `mapDraftOwnerStatus`
- `mapFindingOwnerStatus`
- `OWNER_FINDING_STATUS_LABEL`
- Stored values never rewritten — UI labels only.

---

## 3. Finding type mapper

`mapOwnerFindingType` → `issue` | `improvement` | `feature`

| Inputs | Owner type |
|---|---|
| error, bug, issue, functional, design, technical, … | Issue |
| improvement, enhance, enhancement | Improvement |
| feature, new_feature, feature_idea, new feature | New feature |

“Fixed” is **status only**, never a type.

---

## 4. Deduplication model

Read-only canonical view keyed by:

1. `promotedIssueId` → `promoted:<id>`
2. `issueCode` → `code:<code>`
3. draft id → `draft:<id>`
4. finding id → `finding:<id>`
5. `duplicateKey` → `dup:<key>`
6. fallback → `source:<id>`

Rules:

- Promoted drafts map to `superseded` and are **omitted**.
- Same key: prefer **finding** over draft; else newer `updatedAt`.
- No DB writes during dedupe.

Loader: `src/lib/agentops/findings/findingsOwnerCatalog.ts`  
Catalog read: `listAgentOpsFindingsCatalog` (owner-gated, limit ≤ 300).

---

## 5. Tabs and definitions

| Tab | Membership |
|---|---|
| Needs review | `needs_review` |
| Active | type Issue + `active` \| `approved` \| `in_progress` |
| Improvements | type Improvement + non-rejected |
| New features | type Feature + non-rejected |
| Verification | `waiting_for_verification` |
| Fixed | `fixed` \| `verified` (labels distinguish) |
| Deferred | `deferred` |
| Rejected | `rejected` \| `duplicate` |
| All | every canonical row after dedupe |

Default tab: Needs review (`?tab=` omitted when default).

---

## 6. Agent identity behavior

Each card shows:

- Display name (canonical agents)
- Username + job title (`getAgentOwnerMeta`)
- Link to `/system/agent-ops/agents/:agent` when slug resolves
- Supporting agents: `+N supporting agents` when metadata provides slugs

---

## 7. Owner actions

| Context | Actions |
|---|---|
| Needs review draft | Approve / Defer / Reject (existing decision API) + Open finding when issue code exists |
| Approved draft | Promote to issue (existing promote API) |
| Active / finding | Open finding / Open issue |
| Verification | Review verification → detail route |
| Fixed | Open finding |

No automatic promotion. No new lifecycle backends.

---

## 8. URL state

Preserved query params:

- `tab` — needs-review (default omitted), active, improvements, new-features, verification, fixed, deferred, rejected, all
- `agent`, `type`, `priority`, `route`, `status`, `date` (`7d`/`30d`/`90d`), `q`

Legacy aliases: `needs_review`, `features`, `completed`.

Detail route unchanged: `/system/agent-ops/issues/:code`.

---

## 9. Responsive QA

Smoke covers 1440 / 1024 / 768 / 390. Card layout (no horizontal tables). Filters collapse behind disclosure.

*(Filled after staging smoke.)*

---

## 10. Browser QA

Script: `qa-agent/scripts/agentops-core-ux-phase-c-findings-smoke.mjs`  
Artifacts: `qa-agent/browser-qa-artifacts/phase-c-findings/`  

*(Filled after alias + smoke.)*

---

## 11. Tests

`scripts/agentops-findings-lifecycle-model-verify.ts` — **PASS**

Covers: type map, status map, promoted draft drop, dedupe preferring finding, tab membership, agent filter, URL tab aliases, Unavailable counts (no fake zeros).

Owner promotion lock verify preserved: **PASS**.

---

## 12. Build / safety

| Check | Result |
|---|---|
| Lifecycle model verify | PASS |
| `tsc -b` via `npm run build` | PASS |
| `npm run build` | PASS |
| `agentops:vercel-function-count-verify` | PASS **8/12** |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:monitoring-daily-12-agents-verify` | PASS (integration from main tree with `.env.local`) |

No new Vercel functions. No schema changes. No automatic lifecycle writes.

---

## 13. Commit / deployment

**Commit message:** `Align AgentOps findings lifecycle UI`

**Files:**

- `src/lib/agentops/findings/findingsLifecycleModel.ts`
- `src/lib/agentops/findings/findingsOwnerCatalog.ts`
- `src/app/system/agent-ops/issues/page.tsx`
- `src/components/agentops/owner/AgentOpsFindingCard.tsx`
- `src/lib/agentops/service.ts` (`listAgentOpsFindingsCatalog` only)
- `src/lib/agentops/index.ts`
- `scripts/agentops-findings-lifecycle-model-verify.ts`
- `qa-agent/scripts/agentops-core-ux-phase-c-findings-smoke.mjs`
- `qa-agent/reports/agentops-core-ux-phase-c-findings-status-model.md` (force-add)

**Push:** `origin/staging`  
**Deploy:** git-connected Vercel Preview → alias `ai-xia-staging.vercel.app` (no `--prod`)  
**Main / production:** untouched

*(Commit SHA + Preview URL filled after push.)*

---

## 14. Unsupported lifecycle gaps

1. List does not expose Mark Fixed / Verify / Reopen as first-class buttons — those remain on finding detail / operator surfaces until Phase D confirms safe owner APIs.
2. Supporting-agent tooltips are label-only (`+N`); full identity disclosure can deepen in Phase D.
3. Findings catalog caps at 200–300 rows (read window), not infinite history.
4. Drafts without issue codes have no Open finding route until promoted.
5. `unknown` / `archived` statuses appear in All / status filter but are not dedicated tabs.

---

## 15. Recommendations for Phase D

1. Finding Detail owner UX aligned to the same status/type labels.
2. Finding chat (if approved) bound to canonical finding key.
3. Safe owner Mark Fixed / Request verification / Verify / Reopen on the list **only** when preconditions match existing services.
4. Richer supporting-agent disclosure + evidence chips.
5. Optional infinite scroll / server filters once catalog volume grows.

---

## FINAL VERDICT

```
CANONICAL_STATUS_MODEL_CREATED: YES
ISSUE_TYPE_MAPPING_WORKS: YES
IMPROVEMENT_TYPE_MAPPING_WORKS: YES
FEATURE_TYPE_MAPPING_WORKS: YES
NEEDS_REVIEW_TAB_WORKS: PENDING_SMOKE
ACTIVE_TAB_WORKS: PENDING_SMOKE
IMPROVEMENTS_TAB_WORKS: PENDING_SMOKE
NEW_FEATURES_TAB_WORKS: PENDING_SMOKE
VERIFICATION_TAB_WORKS: PENDING_SMOKE
FIXED_TAB_WORKS: PENDING_SMOKE
DEFERRED_TAB_WORKS: PENDING_SMOKE
REJECTED_TAB_WORKS: PENDING_SMOKE
ALL_TAB_DEDUPLICATED: YES
PROMOTED_DRAFT_DUPLICATION_REMOVED: YES
REPORTING_AGENT_VISIBLE: YES
SUPPORTING_AGENTS_VISIBLE_WHERE_AVAILABLE: YES
AGENT_FILTER_WORKS: YES
URL_TAB_STATE_WORKS: PENDING_SMOKE
URL_FILTER_STATE_WORKS: PENDING_SMOKE
OWNER_ACTIONS_PRESERVED: YES
NO_AUTOMATIC_PROMOTION: YES
PARTIAL_FAILURE_REMAINS_USABLE: YES
NO_FAKE_COUNTS: YES
RESPONSIVE_DESKTOP_PASS: PENDING_SMOKE
RESPONSIVE_TABLET_PASS: PENDING_SMOKE
RESPONSIVE_MOBILE_PASS: PENDING_SMOKE
BUILD_GREEN: YES
VERCEL_FUNCTION_COUNT_SAFE: YES
COMMITTED_TO_ORIGIN_STAGING: PENDING
VERCEL_STAGING_DEPLOY_GREEN: PENDING
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_PHASE_D: PENDING
```
