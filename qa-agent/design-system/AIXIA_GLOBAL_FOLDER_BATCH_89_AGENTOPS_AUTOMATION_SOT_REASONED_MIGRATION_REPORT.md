# AiXia Global Design System — Batch 89 — AgentOps Automation SOT-Reasoned Migration Report

**Date:** 2026-05-30  
**Type:** Design-only command-pattern migration — one route, source-of-truth reasoning  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/automation`  
**File:** `src/app/system/agent-ops/automation/page.tsx`

---

## 1. Purpose

Migrate the AgentOps Automation orb route using active owner-file reasoning (not mechanical copy from sibling pages). Fifth smaller orb route after History, Issues, Advanced, and Knowledge. Hub remains not approved.

---

## 2. Source-of-truth files read

| File | Applied for |
|------|-------------|
| `00-README-SOURCE-OF-TRUTH.md` | Authority hierarchy; stop if SOT gap |
| `03-page-shell-standard.md` | `AixiaCommandPageLayout`, scroll lead, command scroll |
| `04-hero-header-standard.md` §4G, §4H | Hero sequence; operational metrics → hero KPI row |
| `05-meta-status-strip-standard.md` | Context-only meta; no KPI substitution |
| `06-card-section-standard.md` §4J | KPI placement A; section rhythm; no local Tailwind KPI grids |
| `11-scroll-responsive-standard.md` | Internal scroll in tables/disclosures preserved |
| `13-module-wrapper-rules.md` | Shared components only; no local visual law |
| `14-page-migration-rules.md` §12.1–12.3 | Page-type classification; browser QA checklist |
| `15-guardrail-rules.md` | Validation/build gate awareness |

Reference routes (comparison only): History, Issues, Advanced, Knowledge, Council, Finance Transactions.

---

## 3. Page-type classification

| Attribute | Classification (`14` §12.3) |
|-----------|----------------------------|
| Route | `/system/agent-ops/automation` |
| Primary type | **Workflow / action / control page** |
| Secondary traits | Owner-controlled automation shell; queue + scheduler readiness |
| Hub? | **No** |
| Registry/list? | **No** |

Workflow/action type does **not** exempt KPI cards when operational metrics exist (`04` §4H override).

---

## 4. Pre-edit reasoning

### Operational metrics / indicators found on page

| Signal | Source in page logic |
|--------|----------------------|
| Active Top 10 fill | `queueHealth.activeOpenCount` / `activeTarget` |
| Open slots | `queueHealth.openSlots` |
| Backlog count | `queueHealth.backlogCount` |
| Pending verification | `pendingVerificationCount` |
| Control request log size | `automationRequests.length` |
| Workflow step count | `manualScanWorkflow.steps.length` |
| Queue recommendation (text) | `queueHealth.recommendedAction`, `explanation` |
| Scheduler posture (mode) | `schedulerPrep.active`, `schedulerStatus` |
| Latest run / latest request (context) | `latestRunStatus`, `latestAutomationRequest` |

### Risky workflow controls preserved (logic unchanged)

- Refill queue, mark scan needed, queue hold/manual scan decisions
- Verification pass / quiet mode requests
- Manual scan workflow step copy/mark running/mark completed
- Copy-only manual run tool cards
- Quiet mode / pause / resume recording

---

## 5. KPI/card decision and why

**Required:** Yes — `04` §4H + `06` §4J placement **A** (hero KPI row).

**Why:** Page has multiple operational counts (queue capacity, backlog, verification backlog, control log, workflow steps). Local “Automation summary” Tailwind grid was page-level KPI debt; meta strip cannot substitute per `05`.

**Hero `AixiaCommandMetrics` (6 cards):**

| Card | Value source |
|------|--------------|
| Active Top 10 | `queueHealth` ratio; footnote = recommendation text |
| Open slots | `queueHealth.openSlots` |
| Backlog | `queueHealth.backlogCount` |
| Pending verification | `pendingVerificationCount` |
| Control requests | `automationRequests.length` |
| Workflow steps | `manualScanWorkflow.steps.length` |

**Removed:** “Automation summary” section (duplicate local KPI grid). Queue health section’s inner 4-cell count grid removed (counts now in hero); recommendation + copy-only commands retained in section.

---

## 6. Meta strip decision and why

**Required:** Yes — context/mode/scope only (`05` §4A).

| Item | Why meta (not hero KPI) |
|------|-------------------------|
| Environment: Staging only | Replaces floating hero badge (`04` §4G) |
| Control mode: Manual-first | Behavioral constraint label |
| Scheduler posture: Flagged/Inactive | Mode/state, not a numeric KPI |
| Latest activity: run + request label | Contextual scope, not duplicate of control-request count |

Former hero badges (`Staging only`, `Scheduler flagged/inactive`, `Manual-first`) relocated here — not duplicated as KPI cards.

---

## 7. Section/card rhythm decision and why

| Area | Decision (`06`, `14` §12.1) |
|------|----------------------------|
| Safety boundaries | `AixiaSection surface="command"` + `AixiaInfoBlock` (rule/status) |
| Primary manual controls | Command section; action buttons unchanged |
| Queue health & scan trigger | Command section; explanation + disclosure for commands |
| Manual scan workflow | Command section wrapping `<details>` |
| Scheduler preparation | Command section wrapping `<details>` |
| Manual run tools | Command section wrapping `<details>` |
| Quiet mode controls | Command section; buttons unchanged |
| Loading | `AixiaAsyncState` → section + `AixiaEmptyState` |
| Access denied | `AixiaCommandPageLayout` early return |

Scheduler prep inner status grid kept — section-scoped readiness detail, not page-level hero KPIs.

---

## 8. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/automation/page.tsx` | SOT-reasoned command migration |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 46 status |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_89_AGENTOPS_AUTOMATION_SOT_REASONED_MIGRATION_REPORT.md` | This report |

No other routes, shared components, or CSS changed.

---

## 9. What changed visually

- `AixiaPage` → `AixiaCommandPageLayout` + command hero + meta strip
- Removed 3 floating hero badges → meta strip context items
- Added hero `AixiaCommandMetrics` (6 cards)
- Removed duplicate “Automation summary” grid and queue section count grid
- All major areas use `AixiaSection surface="command"`
- Disclosures wrapped in sections (Advanced/Knowledge pattern)
- Loading wrapped in section + empty state
- Refresh button spinner on load

---

## 10. What logic was preserved

Unchanged: `loadData`, all API calls, owner gate, `submitting`/`feedback` state, all handlers (`handleRefillQueue`, `handleMarkScanNeeded`, `handleQueueHealthDecision`, `recordRequest`, `recordManualStepAction`, `copyAndRecordStepCommand`, `copyText`), workflow step UI, scheduler prep content, manual run tool copy cards, quiet/pause/resume buttons, `data-testid="agentops-automation"`, error/empty states, table-less disclosure content.

---

## 11. Browser comparison results

**PASS** — `http://127.0.0.1:5173/system/agent-ops/automation`

| Check | Result |
|-------|--------|
| Hero metrics | 6 cards, correct labels |
| Hero badges | 0 |
| Meta strip | Environment, Control mode, Scheduler posture, Latest activity |
| Duplicate summary section | Removed |
| Primary controls visible | Refill Queue + control buttons |
| Disclosures | 4 preserved |
| testId | Present |

Structural alignment with Advanced/Knowledge/Issues/History (hero KPIs + meta context + command sections). Council (no KPIs) and Finance (rhythm reference) not re-validated in depth — Automation spot-check sufficient.

---

## 12. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter | **No errors** |

---

## 13. Source-of-truth gaps found

**No new gaps.** Batch 86B §4H/§4J and `14` §12.3 operational-metrics override were sufficient to reason:

- Page type = workflow/action
- Operational counts exist → hero KPI row
- Mode/scheduler/latest activity → meta strip
- Controls/disclosures → command sections

No owner-file clarification batch required before this migration.

---

## 14. Recommended next batch

**Batch 90 — AgentOps Agents list or Agent Detail route**

- Five orb/control routes now pass SOT-reasoned migration (History, Issues, Advanced, Knowledge, Automation).
- **Hub migration still not recommended** until Agents/Agent Detail routes are scoped and pass browser QA.
- Continue one-route-per-batch with pre-edit SOT reasoning document in report.

---

## 15. Confirmation — no other routes migrated

Confirmed. Only `/system/agent-ops/automation` edited.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `automation/page.tsx`, cleanup map, this report |
| 2 | Automation route migrated | **Yes** |
| 3 | Exact report filename used | **Yes** — `AIXIA_GLOBAL_FOLDER_BATCH_89_AGENTOPS_AUTOMATION_SOT_REASONED_MIGRATION_REPORT.md` |
| 4 | Source-of-truth reasoning documented | **Yes** |
| 5 | Page type classified from owner files | **Yes** — workflow/action |
| 6 | KPI/card decision derived from owner files | **Yes** — §4H placement A |
| 7 | Meta strip decision derived from owner files | **Yes** — context only |
| 8 | Other AgentOps routes changed | **No** |
| 9 | Shared components changed | **No** |
| 10 | CSS changed | **No** |
| 11 | Business logic changed | **No** |
| 12 | API/Supabase changed | **No** |
| 13 | Actions/forms/modals preserved | **Yes** |
| 14 | Loading/error/empty preserved | **Yes** |
| 15 | `npm run qa:validate-foundation` | **PASS** |
| 16 | `npm run build` | **PASS** |
| 17 | Browser QA | **PASS** |
| 18 | Source-of-truth gaps found | **No** |
| 19 | Final status | **COMPLETE** |
| 20 | Recommended next batch | **Batch 90** — Agents or Agent Detail; Hub not yet |
