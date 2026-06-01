# AiXia Global Design System — Batch 86B — Issues KPI Rhythm SOT + Page Fix Report

**Date:** 2026-05-30  
**Type:** Source-of-truth correction + design-only page rhythm fix — one route  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/issues`  
**File:** `src/app/system/agent-ops/issues/page.tsx`

---

## 1. Purpose

Batch 86 migrated Issues to the command shell but browser review showed the page still looked incomplete: meta strip carried operational counts (open slots, issues loaded) while no strong hero KPI card row appeared. This batch fixes the **source-of-truth gap** first (`04`/`05`/`06`/`14`), then restores Issues visual rhythm to match Finance Transactions and History.

---

## 2. Screenshot / root-cause summary

| Symptom | Cause |
|---------|-------|
| Page looked thin / missing KPI boxes | Batch 86 classified Issues as registry/list → skipped hero KPIs per old `04` §4D / `14` §12.3 |
| Meta strip felt like the whole summary | Open slots + Issues loaded placed in meta strip instead of KPI cards |
| Scroll `AixiaSmartGrid` + `AixiaValueBlock` not enough | Weak card treatment vs approved `AixiaCommandMetrics` hero rhythm |
| Build passed but browser failed parity | Page-type rule too loose; no §12.1 check for visible KPI cards |

Same **pattern family** as History Batch 84 (shell without hero KPIs first), but inverted: Issues had scroll value blocks + meta counts instead of hero metrics.

---

## 3. Source-of-truth gap found

**Incorrect rule (Batch 86):** “Registry/list page type = no hero KPI row.”

**Correct rule (Batch 86B):** Page type is a **starting point only**. If a page has meaningful operational metrics (queue totals, capacity, backlog, verification, workload, risk, owner-action indicators), it **must** render a standardized KPI/summary card row. Meta strip is **never** a substitute.

---

## 4. Owner files updated

| File | Change |
|------|--------|
| `04-hero-header-standard.md` | Added §4H operational-metrics requirement; updated §4D table; reference pages include Issues |
| `05-meta-status-strip-standard.md` | Batch 86B meta vs KPI table; forbid KPI counts in meta strip |
| `06-card-section-standard.md` | Added §4J KPI placement A/B/C/D; `AixiaValueBlock` alone insufficient for §4H |
| `14-page-migration-rules.md` | §12.1 item 8 (visible KPI cards); §12.3 operational override + History/Issues lessons |
| `16-design-file-cleanup-map.md` | Step 43b Batch 86B status |

No shared components or CSS changed.

---

## 5. Exact KPI/card rhythm rule added

**Operational metrics requirement (`04` §4H, `06` §4J, `14` §12.3):**

| Placement | Use when | Component |
|-----------|----------|-----------|
| **A. Hero KPI row** | Primary page-level operational indicators; Finance / History / Issues rhythm | `<AixiaCommandMetrics />` in `AixiaHero` |
| **B. Post-meta summary row** | Registry/list queue where hero stays minimal but metrics need strong cards | `AixiaSection` + `<AixiaCommandMetrics />` immediately after meta strip |
| **C. Meta strip** | Context/mode/scope only — **not** counts that are KPIs | `AixiaCommandHubMetaStrip` |
| **D. Rule/status cards** | Manual-first, access, behavioral constraints | `AixiaSection` + `AixiaInfoBlock` |

**Mandatory:** Browser QA must confirm KPI/summary cards visible before migration batch close (`14` §12.1 #8). Finance Transactions remains strongest rhythm reference.

---

## 6. Issues page visual fix

| Change | Detail |
|--------|--------|
| Hero KPI row | Added `issuesCommandMetrics` + `<AixiaCommandMetrics />` in hero (6 metrics) |
| Metrics shown | Active Top 10, Verification pending, Backlog, Open slots, Needs attention, Follow-up / blocked |
| Meta strip | Context only: Environment, Queue mode, Loaded scope, Owner control — **removed** open slots / issues loaded counts |
| Removed duplicate | Deleted scroll “Queue summary” `AixiaSmartGrid` section (History Batch 85 pattern) |
| Unchanged sequence | Hero + hero KPIs → meta strip → guardrails → recommended action → filters → issue list |

---

## 7. Logic preserved

Unchanged: all hooks, `loadIssues`, API calls, merge/filter memos, focus chips, search, selects, `handleRefillQueue`, recommended action, issue table, empty states, owner gate, navigation, permissions.

**Note:** Click-to-filter on removed scroll metric buttons is replaced by existing focus chips (same `setFocusFilter` targets). No API, Supabase, or state behavior changes.

Removed unused `archivedOrVerifiedCount` display-only memo (filter logic for archived focus chip unchanged).

---

## 8. Browser QA comparison

| Route | Hero KPI cards | Meta strip role | Result |
|-------|----------------|-----------------|--------|
| **Issues** | 6 `.aixia-dash-metric` cards | Context only (no open-slot KPI in meta) | **PASS** |
| **History** | 6 hero metrics (unchanged) | Context only | **PASS** (spot-check) |
| **Finance Transactions** | 4 hero metrics + meta strip | Rhythm reference | **PASS** |
| **Council** | No operational KPIs (correct) | Meta only | Not re-checked (unchanged) |

Issues verified: no Queue summary duplicate section, focus chips + 16 table rows, filters/actions present, no console errors observed on Issues load.

---

## 9. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter (`issues/page.tsx`) | **No errors** |

---

## 10. Remaining risks

| Risk | Mitigation |
|------|------------|
| Metric click-to-filter removed with scroll summary | Focus chips cover same filters; document in QA |
| AgentOps Hub still lacks hero KPIs | Hub migration not approved; apply §4H when scoped |
| Guardrails not yet enforcing §4H | `15-guardrail-rules.md` pending |
| Batch 86 report now partially stale | Superseded by this report for KPI classification |

---

## 11. Recommended next batch

**Batch 87 — AgentOps smaller orb route OR Hub scope review**

- Issues must pass visual QA with corrected §4H rule before Hub (**still not auto-approved**).
- Next migration must list operational metrics and confirm KPI placement A or B in plan before edit.
- Do not migrate Advanced, Knowledge, Automation, Agents, or Hub until Piter confirms Issues rhythm in browser.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `04`, `05`, `06`, `14`, `16`, `issues/page.tsx`, this report |
| 2 | Source-of-truth updated | **Yes** |
| 3 | Issues page fixed | **Yes** |
| 4 | KPI/summary cards added/restored | **Yes** — hero `AixiaCommandMetrics` (6 cards) |
| 5 | Meta strip role corrected | **Yes** — context only |
| 6 | Other routes changed | **No** |
| 7 | Shared components changed | **No** |
| 8 | CSS changed | **No** |
| 9 | Business logic changed | **No** |
| 10 | API/Supabase changed | **No** |
| 11 | Filters/search/sort/actions preserved | **Yes** |
| 12 | Browser QA completed | **Yes** |
| 13 | `npm run qa:validate-foundation` | **PASS** |
| 14 | `npm run build` | **PASS** |
| 15 | Final status | **COMPLETE** |
| 16 | Recommended next batch | **Batch 87** — smaller orb route; Hub only after Issues sign-off |

---

## Related

- Batch 86: `AIXIA_GLOBAL_FOLDER_BATCH_86_AGENTOPS_ISSUES_MIGRATION_REPORT.md`
- Batch 85C: `AIXIA_GLOBAL_FOLDER_BATCH_85C_SOT_CLARIFICATION_AFTER_HISTORY_AUDIT.md`
- References: `history/page.tsx`, `finance/transactions/page.tsx`, `council/page.tsx`
