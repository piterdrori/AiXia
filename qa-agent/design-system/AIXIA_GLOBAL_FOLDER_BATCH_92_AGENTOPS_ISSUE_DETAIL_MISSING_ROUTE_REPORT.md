# AiXia Global Design System — Batch 92 — AgentOps Issue Detail Missing Route Report

**Date:** 2026-05-30  
**Type:** Route investigation + SOT command-shell alignment for existing Issue Detail workspace  
**Status:** COMPLETE  
**Missing URL tested:** `/system/agent-ops/issues/AIXIA-BROWSER-LOGIN-finance-admin`  
**Actual route file:** `src/app/system/agent-ops/issues/[issueCode]/page.tsx`  
**Router registration:** `App.tsx` → `/system/agent-ops/issues/:issueCode`

---

## 1. Purpose

Investigate the reported missing Issue Detail URL, confirm routing/data wiring, and align the Issue Detail workspace with the global command pattern without changing business logic.

---

## 2. Missing URL tested

`/system/agent-ops/issues/AIXIA-BROWSER-LOGIN-finance-admin`

---

## 3. Route/root cause analysis

| Finding | Detail |
|---------|--------|
| Route file missing? | **No** — file already exists |
| Expected `[issueId]` folder? | **No** — repo convention is **`[issueCode]`** matching `issue_code` and `useParams<{ issueCode: string }>()` |
| App router wired? | **Yes** — `AgentOpsIssueWorkspacePage` imported and mounted at `:issueCode` |
| Why it may have looked missing | Task spec referenced `[issueId]`; prior page used legacy `AixiaPage` shell (not yet SOT-migrated like other AgentOps routes); not-found state was a generic error block rather than dedicated empty state |
| Data for test issue | Present in staging sources (archived/verified issue with fix plan + verification history); resolves via active/backlog/verification lookup + `getAgentOpsFindingDetail` |

**Conclusion:** The dynamic route was present and functional. This batch **fixed/enhanced** the existing workspace page rather than creating a new route file.

---

## 4. Dynamic route file decision

| Decision | Value |
|----------|-------|
| Create new file? | **No** |
| Correct file path | `src/app/system/agent-ops/issues/[issueCode]/page.tsx` |
| Param name | `issueCode` (not `issueId`) |
| Component | `AgentOpsIssueWorkspacePage` (default export) |

---

## 5. Source-of-truth files read

| File | Applied for |
|------|-------------|
| `00-README-SOURCE-OF-TRUTH.md` | Authority hierarchy |
| `03-page-shell-standard.md` | `AixiaCommandPageLayout` |
| `04-hero-header-standard.md` §4G, §4H | Hero sequence; detail KPI placement A |
| `05-meta-status-strip-standard.md` | Context-only meta |
| `06-card-section-standard.md` §4J | KPI row + command sections |
| `08-table-list-standard.md` | Timeline/list blocks in workbench |
| `11-scroll-responsive-standard.md` | Command scroll preserved |
| `13-module-wrapper-rules.md` | Shared components only |
| `14-page-migration-rules.md` §12.1–12.3 | Detail/workspace classification |
| `15-guardrail-rules.md` | Build/validation gate |

---

## 6. Page-type classification

| Attribute | Classification (`14` §12.3) |
|-----------|----------------------------|
| Route | `/system/agent-ops/issues/:issueCode` |
| Primary type | **Detail / workspace** (issue-solving workbench) |
| KPI expectation | **Yes** — operational lifecycle metrics exist |
| Meta expectation | **Yes** — context/mode/scope only |

---

## 7. Pre-edit reasoning

### How Issues registry generates links

`issues/page.tsx` navigates with:

```tsx
navigate(`/system/agent-ops/issues/${encodeURIComponent(item.issueCode)}`)
```

Same pattern in Hub, History, and Agent Detail issue cards — all use **`issue_code` / `issueCode`**, not `issueId`.

### Data source for `AIXIA-BROWSER-LOGIN-finance-admin`

- Imported browser QA finding (Stage 9E/9F) in Supabase `agentops_findings`
- Fix plan in generated plans (`plan-AIXIA-BROWSER-LOGIN-finance-admin-1779938232333`)
- Verification/handoff history in owner feedback
- Loaded via existing `loadIssue()` pipeline — no new fields invented

### Not-found behavior

When issue code is absent from active top 10, backlog preview, and verification match without resolvable finding id → error **"Issue not found in current staging issue sources."**  
Now renders dedicated **Issue not found** empty state with Back to Issues action.

### Logic preserved

All workflow handlers unchanged: lifecycle rail, agent chat, cursor prompt editing, fix plan decisions, handoff/verification, CodeGraph hints, timeline, secondary actions, modals/forms, API calls, owner gate.

---

## 8. KPI/card decision and why

**Required:** Yes — `04` §4H placement **A** (hero `AixiaCommandMetrics`).

**Why:** Issue workspace exposes operational lifecycle signals (severity, status, execution state, timeline count, agent messages, fix plan status). Prior local 4-cell Tailwind hero grid duplicated these metrics.

**Hero metrics (6):**

1. Severity  
2. Issue status  
3. Execution state  
4. Timeline events  
5. Agent messages  
6. Fix plan status  

**Removed:** Duplicate hero Tailwind summary grid and floating hero badges (`Manual-first`, `Staging-only`, inline issue badge).

---

## 9. Meta strip decision and why

**Required:** Yes — context only (`05`).

| Item | Role |
|------|------|
| Environment: Staging only | Replaces hero badge |
| Runtime mode: Manual-first | Replaces hero badge |
| Issue code: URL identifier | Context label (not KPI substitute) |
| Workspace scope: Issue-solving workbench | Scope label |

---

## 10. Detail/section/list decision and why

**Decision:** Keep existing **workbench sections** — lifecycle rail, issue context, agent chat, cursor prompt, evidence/fix plan disclosures, verification/closure panels, timeline, technical status.

| Element | Pattern | Why |
|---------|---------|-----|
| Lifecycle rail | Command section + rail component | Workflow state — not registry table |
| Workbench | Command section + nested cards/forms | Preserved issue-solving UX |
| Timeline | Disclosure list | `08` list/card rhythm |
| Not found | Command section + `AixiaEmptyState` | Proper empty state |

Added `surface="command"` to primary sections (lifecycle rail, workbench, loading fallback). Deeper nested disclosures unchanged to avoid workflow risk.

---

## 11. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/issues/[issueCode]/page.tsx` | SOT command shell + KPI/meta + not-found UX + state cleanup |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_92_AGENTOPS_ISSUE_DETAIL_MISSING_ROUTE_REPORT.md` | This report |

No new route file created. Hub, Council, Issues registry, and other AgentOps routes unchanged.

---

## 12. What was created or fixed

**Created:** Nothing new — route already existed.

**Fixed/enhanced:**

- Migrated Issue Detail to `AixiaCommandPageLayout` + command hero + meta strip
- Moved operational metrics into hero `AixiaCommandMetrics`
- Added Refresh action with spinner
- Dedicated not-found empty state for invalid issue codes
- Clears stale finding/detail state when lookup fails
- Removed duplicate local hero KPI grid and floating badges

---

## 13. What logic was preserved

Unchanged: `loadIssue` data sources/API calls, all workflow action handlers, forms, modals, lifecycle derivation, agent adapter, verification flows, navigation targets, test IDs (`agentops-issue-workspace`, lifecycle rail, workbench, etc.).

---

## 14. Browser QA results

**PASS**

| Route | Result |
|-------|--------|
| `/system/agent-ops/issues` | Loads registry (spot-check) |
| `/system/agent-ops/issues/AIXIA-BROWSER-LOGIN-finance-admin` | Loads full workspace; hero KPIs; Back/Refresh; lifecycle + workbench intact |
| `/system/agent-ops/issues/DOES-NOT-EXIST` | Dedicated **Issue not found** empty state + Back to Issues |
| `/system/agent-ops/agents/agentops-owner` | Detail comparison OK (prior batch) |
| `/system/agent-ops/history` | No regression (spot-check) |
| `/finance/transactions` | No regression (spot-check) |

No console errors observed. Actions/links functional on valid issue page.

---

## 15. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |

---

## 16. Source-of-truth gaps found

**No new gaps.**

**Documentation note:** Task spec referenced `[issueId]` but repo/router convention is **`[issueCode]`**. Owner files do not require renaming the param — URL path `/system/agent-ops/issues/AIXIA-BROWSER-LOGIN-finance-admin` is correct.

**Residual debt (not blocking):** Archived issues reachable only when present in active/backlog preview or verification match may still fail direct URL lookup if absent from those sources. Fixing that would require a dedicated by-code fetch API (out of scope — no API/Supabase changes in this batch).

---

## 17. Recommended next batch

**Batch 93 — Final Hub + Council source-of-truth review and migration if needed**

Issue Detail route is confirmed working. Proceed with Hub/Council final review as previously planned.

---

## 18. Confirmation Hub/Council were not changed

Confirmed. No edits to `src/app/system/agent-ops/page.tsx` or `src/app/system/agent-ops/council/page.tsx` in this batch.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `[issueCode]/page.tsx`, this report |
| 2 | Issue detail route created/fixed | **Yes** — fixed/enhanced existing route |
| 3 | URL `/system/agent-ops/issues/AIXIA-BROWSER-LOGIN-finance-admin` works | **Yes** |
| 4 | Invalid issue URL handled | **Yes** |
| 5 | Exact report filename used | **Yes** |
| 6 | Source-of-truth reasoning documented | **Yes** |
| 7 | Page type classified from owner files | **Yes** — detail/workspace |
| 8 | KPI/card decision derived from owner files | **Yes** |
| 9 | Meta strip decision derived from owner files | **Yes** |
| 10 | Detail/section decision derived from owner files | **Yes** |
| 11 | Hub changed | **No** |
| 12 | Council changed | **No** |
| 13 | Other AgentOps routes changed | **No** |
| 14 | Shared components changed | **No** |
| 15 | CSS changed | **No** |
| 16 | Business logic changed | **No** |
| 17 | API/Supabase changed | **No** |
| 18 | Actions/links preserved | **Yes** |
| 19 | Loading/error/empty/not-found states preserved or added | **Yes** |
| 20 | `npm run qa:validate-foundation` | **PASS** |
| 21 | `npm run build` | **PASS** |
| 22 | Browser QA | **PASS** |
| 23 | Source-of-truth gaps found | **No** |
| 24 | Final status | **COMPLETE** |
| 25 | Recommended next batch | **Batch 93 — Hub + Council final SOT review** |
