# AiXia Global Design System — Batch 87 — AgentOps Advanced Migration Report

**Date:** 2026-05-30  
**Type:** Design-only command-pattern migration — one route  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/advanced`  
**File:** `src/app/system/agent-ops/advanced/page.tsx`

---

## 1. Purpose

Migrate the AgentOps Advanced orb route to the global command pattern, applying Batch 86B operational-metrics KPI rules. This is the second smaller orb route after Issues, before Hub migration.

---

## 2. Page-type classification

| Attribute | Classification |
|-----------|----------------|
| Route | `/system/agent-ops/advanced` |
| Page type (`14` §12.3) | **Settings / utility / advanced control** |
| Hub page? | **No** |
| Queue/registry page? | **No** |
| Detail page? | **No** |

---

## 3. KPI/card decision

**Question 1:** Does the page have operational metrics?

**Yes.** Existing `summary` memo provides six operational counts:

| Metric | Source |
|--------|--------|
| Import sources | `importSources.length` |
| Import candidates | Sum of `candidateCount` |
| Fix plans | `fixPlans.length` |
| Owner review fix plans | Filtered plan statuses |
| Verification requests | `verificationRequests.length` |
| Pending verification | Non-passed request statuses |

**Decision:** Per `04` §4H placement **A** — render `<AixiaCommandMetrics />` in hero (same rhythm as Issues/History/Finance). Page type (utility/advanced) does **not** exempt KPI cards when operational metrics exist.

**Meta strip:** Context only — Environment, Control mode, Tool scope, Runtime safety. No KPI counts in meta strip (`05` Batch 86B).

**Removed:** Local Tailwind 6-column “Advanced overview” grid (duplicate of hero KPIs).

---

## 4. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/advanced/page.tsx` | Command-pattern migration |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 44 status |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_87_AGENTOPS_ADVANCED_MIGRATION_REPORT.md` | This report |

No other routes, shared components, or CSS files changed.

---

## 5. Before migration summary

| Area | Before |
|------|--------|
| Shell | `AixiaPage` + local `space-y-6` wrapper |
| Hero | Default-surface `AixiaHero` with floating badges (`Staging only`, `Owner-controlled`) |
| Meta strip | **None** |
| KPI/summary | Local Tailwind 6-cell grid inside “Advanced overview” section |
| Safety rule | Orphan `AixiaInfoBlock` outside section system |
| Tool areas | Five top-level `<details>` blocks outside `AixiaSection` |
| Loading | Local rounded div text fallback |
| Logic | `loadData`, import/fix-plan/verification tables, navigation, owner gate |

---

## 6. Components/patterns used

| Component / pattern | Role |
|---------------------|------|
| `AixiaCommandPageLayout` | Command shell wrapper |
| `AixiaHero surface="command"` | Parent pill → kicker → title → subtitle → actions (04 §4G) |
| `AixiaCommandMetrics` | Hero KPI row — 6 operational metrics (04 §4H, 06 §4J) |
| `AixiaCommandHubMetaStrip variant="command"` | Context meta strip in `scrollLead` (05) |
| `AixiaSection surface="command"` | Safety boundaries + each tool/disclosure area |
| `AixiaInfoBlock` | Safety boundaries, errors, command examples |
| `AixiaAsyncState` / `AixiaEmptyState` | Loading and empty states |
| `AixiaTableShell` | Import, fix plan, verification tables (unchanged logic) |

---

## 7. What changed visually

| Change | Detail |
|--------|--------|
| Shell | `AixiaPage` → `AixiaCommandPageLayout` |
| Hero | Command surface; badges removed; Refresh with spinner |
| Hero KPIs | Six `AixiaCommandMetrics` cards from existing `summary` |
| Meta strip | Environment, Control mode, Tool scope, Runtime safety |
| Safety block | Wrapped in `AixiaSection surface="command"` |
| Overview grid | Removed (KPIs moved to hero) |
| Tool disclosures | Each wrapped in `AixiaSection surface="command"` |
| Loading | `AixiaSection` + `AixiaEmptyState` |
| Access denied | Command shell + section (Issues pattern) |

---

## 8. What logic was preserved

Unchanged: `loadData`, all API calls (`getAgentOps*`), owner gate, `summary` computation, import/fix-plan/verification table data and columns, all navigation buttons, `<details>` expand/collapse content, command examples, latest run marker, `data-testid="agentops-advanced"`, error handling semantics.

No modals or forms on this page — disclosure sections and tables preserved exactly.

---

## 9. Multi-reference comparison

| Route | Hero KPIs | Meta role | Advanced alignment |
|-------|-----------|-----------|-------------------|
| **Advanced** | 6 cards | Context only | Target |
| **Issues** | 6 cards | Context only | Same rhythm |
| **History** | 6 cards | Context only | Same rhythm |
| **Council** | None (no operational KPIs) | Context | Shell reference only |
| **Finance Transactions** | 4 cards | Context/registry | Strongest global rhythm reference |

Advanced matches Issues/History hero + meta + section sequence. No floating hero badges.

---

## 10. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter (`advanced/page.tsx`) | **No errors** |

---

## 11. Browser QA result

**PASS** — verified at `http://127.0.0.1:5173/system/agent-ops/advanced`

| Check | Result |
|-------|--------|
| `data-testid="agentops-advanced"` | Present |
| Hero metric cards | 6 (Import sources through Pending verification) |
| Floating hero badges | 0 |
| Meta strip context items | Environment, Control mode, Tool scope, Runtime safety |
| Duplicate overview grid | Removed |
| Command sections | Safety boundaries + 5 tool sections |
| Disclosure blocks | 5 `details.agentops-disclosure` preserved |
| Command shell / hero sequence | Parent pill, kicker, title, subtitle, actions |
| History spot-check | 6 hero metrics (unchanged) |

No console errors observed on Advanced load.

---

## 12. Owner-file improvement proposals

| Item | Recommendation |
|------|----------------|
| Nested `<details>` inside sections | Optional shared `AixiaProgressiveDisclosureGroup` in future batch |
| Duplicate section title + details summary text | Minor polish — could dedupe labels later |
| Guardrail debt for Advanced | Add to guardrail-alignment batch after sign-off |

No owner-file edits required for Batch 87 completion.

---

## 13. Recommended next batch

**Batch 88 — AgentOps Knowledge or Automation orb route**

- Migrate another smaller orb route before Hub.
- **Hub migration remains not approved** until at least two smaller orb routes pass browser QA (Issues + Advanced now complete).
- Apply same page-type + operational-metrics classification before edit.

---

## 14. Confirmation — no other routes migrated

Confirmed. Only `/system/agent-ops/advanced` edited for migration work.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `advanced/page.tsx`, cleanup map, this report |
| 2 | Advanced route migrated | **Yes** |
| 3 | Page type classified | **Yes** — settings/utility/advanced control |
| 4 | KPI/card decision documented | **Yes** — hero KPIs required (§4H placement A) |
| 5 | History route changed | **No** |
| 6 | Issues route changed | **No** |
| 7 | Council route changed | **No** |
| 8 | Hub route changed | **No** |
| 9 | Other AgentOps routes changed | **No** |
| 10 | Shared components changed | **No** |
| 11 | CSS changed | **No** |
| 12 | Business logic changed | **No** |
| 13 | API/Supabase changed | **No** |
| 14 | Actions/forms/modals preserved | **Yes** |
| 15 | Loading/error/empty preserved | **Yes** |
| 16 | Command shell used | **Yes** |
| 17 | Hero aligned with 04 §4G | **Yes** |
| 18 | KPI/card rule from 04 §4H / 06 §4J | **Yes** |
| 19 | Meta strip aligned with 05 | **Yes** |
| 20 | Card/section rhythm aligned with 06 | **Yes** |
| 21 | Multi-reference browser comparison | **Yes** |
| 22 | Silent refresh/no-jump preserved | **Yes** (no logic changes) |
| 23 | `npm run qa:validate-foundation` | **PASS** |
| 24 | `npm run build` | **PASS** |
| 25 | Browser QA | **PASS** |
| 26 | Migrations limited to Advanced only | **Yes** |
| 27 | Finance proofs paused | **Yes** |
| 28 | Command-surface context paused | **Yes** |
| 29 | CSS split paused | **Yes** |
| 30 | Final status | **COMPLETE** |
| 31 | Recommended next batch | **Batch 88** — Knowledge or Automation; not Hub yet |

---

## Related

- Batch 86B: `AIXIA_GLOBAL_FOLDER_BATCH_86B_ISSUES_KPI_RHYTHM_SOT_AND_PAGE_FIX_REPORT.md`
- Batch 86: `AIXIA_GLOBAL_FOLDER_BATCH_86_AGENTOPS_ISSUES_MIGRATION_REPORT.md`
- References: `issues/page.tsx`, `history/page.tsx`, `council/page.tsx`, `finance/transactions/page.tsx`
