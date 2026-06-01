# AiXia Global Design System — Batch 88 — AgentOps Knowledge Migration Report

**Date:** 2026-05-30  
**Type:** Design-only command-pattern migration — one route  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/knowledge`  
**File:** `src/app/system/agent-ops/knowledge/page.tsx`

---

## 1. Purpose

Migrate the AgentOps Knowledge orb route to the global command pattern, applying Batch 86B operational-metrics KPI rules. Fourth smaller orb route after History, Issues, and Advanced — Hub remains not approved.

---

## 2. Page-type classification

| Attribute | Classification |
|-----------|----------------|
| Route | `/system/agent-ops/knowledge` |
| Page type (`14` §12.3) | **Knowledge / reference / content-management** |
| Hub page? | **No** |
| Registry/list page? | **No** |
| History/read-only page? | **No** |
| Detail page? | **No** |

---

## 3. KPI/card decision

**Question 1:** Does the page have operational/knowledge metrics?

**Yes.** Existing derived values:

| Metric | Source |
|--------|--------|
| Agents tracked | `memorySummary.totalAgents` / `summary.totalAgents` |
| Memory files created | `summary.filesCreated` |
| Missing files | `summary.filesMissing` |
| Sensitive warnings | `summary.warnings` |
| Pending review lessons | `lessonSummary.pending` |
| Agents with refresh changes | `summary.agentsWithChanges` |

**Decision:** Per `04` §4H placement **A** — `<AixiaCommandMetrics />` in hero (6 cards). Knowledge/content page type does **not** exempt KPI cards when operational metrics exist.

**Meta strip:** Context only — Environment, Approval mode, Knowledge scope, Runtime safety. No KPI counts in meta strip (`05`).

**Removed duplicate:** “Knowledge overview” local 6-column Tailwind grid (metrics moved to hero). Pending Review lesson cell removed from section grid (now in hero); section retains Approved, Rejected/cleanup, and four static readiness placeholders.

---

## 4. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/knowledge/page.tsx` | Command-pattern migration |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 45 status |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_88_AGENTOPS_KNOWLEDGE_MIGRATION_REPORT.md` | This report |

No other routes, shared components, or CSS files changed.

---

## 5. Before migration summary

| Area | Before |
|------|--------|
| Shell | `AixiaPage` + local `space-y-6` wrapper |
| Hero | Default-surface `AixiaHero` with badges (`Staging only`, `Approval required`) |
| Meta strip | **None** |
| KPI/summary | Local Tailwind 6-cell “Knowledge overview” grid |
| Safety rule | Orphan `AixiaInfoBlock` outside section system |
| Lesson section | 7-column local grid + candidate cards + decision actions |
| Tool areas | Five top-level `<details>` blocks outside `AixiaSection` |
| Loading | Local rounded div text fallback |
| Logic | `loadData`, memory/refresh/lesson APIs, `handleLessonDecision`, tables, navigation |

---

## 6. Components/patterns used

| Component / pattern | Role |
|---------------------|------|
| `AixiaCommandPageLayout` | Command shell wrapper |
| `AixiaHero surface="command"` | Parent pill → kicker → title → subtitle → actions (04 §4G) |
| `AixiaCommandMetrics` | Hero KPI row — 6 operational metrics (04 §4H, 06 §4J) |
| `AixiaCommandHubMetaStrip variant="command"` | Context meta strip in `scrollLead` (05) |
| `AixiaSection surface="command"` | Safety, lessons, policy, readiness, disclosures |
| `AixiaInfoBlock` | Safety boundaries, errors, Hermes/agentmemory info |
| `AixiaAsyncState` / `AixiaEmptyState` | Loading and empty states |
| `AixiaTableShell` | Memory review and refresh plan tables (unchanged logic) |

---

## 7. What changed visually

| Change | Detail |
|--------|--------|
| Shell | `AixiaPage` → `AixiaCommandPageLayout` |
| Hero | Command surface; badges removed; Refresh with spinner; route shortcuts preserved |
| Hero KPIs | Six `AixiaCommandMetrics` cards from existing summary/lesson data |
| Meta strip | Environment, Approval mode, Knowledge scope, Runtime safety |
| Overview grid | Removed (KPIs in hero) |
| Safety block | Wrapped in `AixiaSection surface="command"` |
| Lesson section | `surface="command"`; pending metric moved to hero only |
| Disclosures | Each wrapped in `AixiaSection surface="command"` |
| Loading | `AixiaSection` + `AixiaEmptyState` |
| Access denied | Command shell + section (Advanced/Issues pattern) |

---

## 8. What logic was preserved

Unchanged: `loadData`, all API calls (`getAgentOps*`, `recordAgentOpsLessonCandidateDecision`), owner gate, `summary`/`lessonSummary` memos, memory and refresh plan state, lesson candidate cards, all four decision buttons per candidate, `lessonActionId` disable logic, memory/refresh tables, all navigation buttons, all test IDs (`agentops-knowledge`, `agentops-knowledge-lesson-candidates`, `agentops-lesson-candidate-card`, `agentops-lesson-decision-actions`), error handling, `<details>` expand/collapse content.

---

## 9. Multi-reference comparison

| Route | Hero KPIs | Meta role | Knowledge alignment |
|-------|-----------|-----------|---------------------|
| **Knowledge** | 6 cards | Context only | Target |
| **Advanced** | 6 cards | Context only | Same rhythm |
| **Issues** | 6 cards | Context only | Same rhythm |
| **History** | 6 cards | Context only | Same rhythm |
| **Council** | None | Context | Shell reference only |
| **Finance Transactions** | 4 cards | Context | Global rhythm reference |

Knowledge matches the proven AgentOps orb pattern: hero KPIs + meta context + command sections. No floating hero badges.

---

## 10. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter (`knowledge/page.tsx`) | **No errors** |

---

## 11. Browser QA result

**PASS** — verified at `http://127.0.0.1:5173/system/agent-ops/knowledge`

| Check | Result |
|-------|--------|
| `data-testid="agentops-knowledge"` | Present |
| Hero metric cards | 6 (Agents tracked through Agents with refresh changes) |
| Floating hero badges | 0 |
| Meta strip context | Environment, Approval mode, Knowledge scope, Runtime safety |
| Duplicate overview grid | Removed |
| Command sections | Safety, Lesson Candidates, Policy, Readiness, 5 disclosure sections |
| `agentops-knowledge-lesson-candidates` | Present |
| Disclosure blocks | 5 `details.agentops-disclosure` |
| Advanced spot-check | Route reachable (unchanged) |

No console errors observed on Knowledge load.

---

## 12. Owner-file improvement proposals

| Item | Recommendation |
|------|----------------|
| Lesson section local status grid | Optional shared section sub-metrics pattern for workflow-specific counts not in hero |
| Nested `<details>` inside sections | Optional `AixiaProgressiveDisclosureGroup` in future batch |
| Guardrail debt for Knowledge | Add to guardrail-alignment batch after sign-off |

No owner-file edits required for Batch 88 completion.

---

## 13. Recommended next batch

**Batch 89 — AgentOps Automation orb route**

- Migrate Automation before Hub.
- **Hub migration remains not approved** until Automation (and other smaller orbs) pass browser QA.
- Four orb routes now proven: History, Issues, Advanced, Knowledge.

---

## 14. Confirmation — no other routes migrated

Confirmed. Only `/system/agent-ops/knowledge` edited for migration work.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `knowledge/page.tsx`, cleanup map, this report |
| 2 | Knowledge route migrated | **Yes** |
| 3 | Page type classified | **Yes** — knowledge/reference/content-management |
| 4 | KPI/card decision documented | **Yes** — hero KPIs required (§4H placement A) |
| 5 | History route changed | **No** |
| 6 | Issues route changed | **No** |
| 7 | Advanced route changed | **No** |
| 8 | Council route changed | **No** |
| 9 | Hub route changed | **No** |
| 10 | Other AgentOps routes changed | **No** |
| 11 | Shared components changed | **No** |
| 12 | CSS changed | **No** |
| 13 | Business logic changed | **No** |
| 14 | API/Supabase changed | **No** |
| 15 | Actions/forms/modals preserved | **Yes** |
| 16 | Loading/error/empty preserved | **Yes** |
| 17 | Command shell used | **Yes** |
| 18 | Hero aligned with 04 §4G | **Yes** |
| 19 | KPI/card rule from 04 §4H / 06 §4J | **Yes** |
| 20 | Meta strip aligned with 05 | **Yes** |
| 21 | Card/section rhythm aligned with 06 | **Yes** |
| 22 | Multi-reference browser comparison | **Yes** |
| 23 | Silent refresh/no-jump preserved | **Yes** (no logic changes) |
| 24 | `npm run qa:validate-foundation` | **PASS** |
| 25 | `npm run build` | **PASS** |
| 26 | Browser QA | **PASS** |
| 27 | Migrations limited to Knowledge only | **Yes** |
| 28 | Finance proofs paused | **Yes** |
| 29 | Command-surface context paused | **Yes** |
| 30 | CSS split paused | **Yes** |
| 31 | Final status | **COMPLETE** |
| 32 | Recommended next batch | **Batch 89** — Automation; not Hub yet |

---

## Related

- Batch 87: `AIXIA_GLOBAL_FOLDER_BATCH_87_AGENTOPS_ADVANCED_MIGRATION_REPORT.md`
- Batch 86B: `AIXIA_GLOBAL_FOLDER_BATCH_86B_ISSUES_KPI_RHYTHM_SOT_AND_PAGE_FIX_REPORT.md`
- References: `advanced/page.tsx`, `issues/page.tsx`, `history/page.tsx`, `council/page.tsx`, `finance/transactions/page.tsx`
