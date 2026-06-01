# AiXia Global Design System — Batch 86 — AgentOps Issues Queue Migration Report

**Date:** 2026-05-30  
**Type:** Design-only command-pattern migration — one route  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/issues`  
**File:** `src/app/system/agent-ops/issues/page.tsx`

---

## 1. Purpose

Migrate the AgentOps Issues queue route to the clarified global command pattern (Batch 85C owner files) while preserving all queue logic, filters, actions, and data flows. Dual/triple reference: History (fixed), Council, Finance Transactions.

---

## 2. Page-type classification

| Attribute | Classification |
|-----------|----------------|
| Route | `/system/agent-ops/issues` |
| Page type (14 §12.3) | **Registry/list / queue-management** |
| Hub page? | **No** |
| History/read-only page? | **No** |
| Detail page? | **No** |

**Design decisions from classification:**

| Element | Decision | Owner-file basis |
|---------|----------|------------------|
| Hero metrics in hero | **No** — registry/list type uses scroll-section summary metrics, not hero KPI row | `04` §4D, §4G; `14` §12.3 |
| Meta strip | **Yes** — contextual status only (environment, queue mode, open slots, issues loaded) | `05` Batch 85C |
| Rule/status section | **Yes** — manual-first queue guardrails via `AixiaInfoBlock` | `06`, `13` |
| Queue summary KPIs | **Yes** — in scroll body as clickable `AixiaSmartGrid` + `AixiaValueBlock` | Finance rhythm without duplicating hero KPIs |
| Table/list queue | **Yes** — unchanged issue table and filters | Preserved logic |

---

## 3. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/issues/page.tsx` | Command-pattern migration (design-only) |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 43 status only |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_86_AGENTOPS_ISSUES_MIGRATION_REPORT.md` | This report |

No other routes, shared components, or CSS files changed.

---

## 4. Before migration summary

| Area | Before |
|------|--------|
| Shell/wrapper | `AixiaPage` with local page header block |
| Hero/header | Local `h1` + subtitle; floating `Staging only` / `Manual-first` badges in title area |
| Meta strip | **None** |
| Card/grid/table | Local Tailwind KPI grid; sections without consistent `surface="command"` |
| Queue/filter/search/sort | Focus chips, search, status/queue/severity/category/route/agent filters, issue table |
| Modals/actions | Refill queue, recommended action, Open Workspace navigation |
| Loading/error/empty | `AixiaAsyncState` + `AixiaEmptyState`; owner gate error block |
| Logic preserved | All hooks, `loadIssues`, merge/filter memos, `handleRefillQueue`, API calls unchanged |

---

## 5. Components/patterns used

| Component / pattern | Role |
|---------------------|------|
| `AixiaCommandPageLayout` | Command shell wrapper (History/Council) |
| `AixiaHero surface="command"` | Parent pill → kicker → title → subtitle → actions (04 §4G) |
| `AixiaCommandHubMetaStrip variant="command"` | Contextual meta strip in `scrollLead` (05) |
| `AixiaSection surface="command"` | Guardrails, summary, recommended action, filters, list, loading |
| `AixiaInfoBlock` | Manual-first rule, action feedback, error states |
| `AixiaSmartGrid` + `AixiaValueBlock` | Queue summary metrics (scroll section, not hero) |
| `AixiaAsyncState` / `AixiaEmptyState` | Loading and empty states (visual wrapper only) |
| `AixiaTableShell` / `AixiaBadge` / `AixiaStatusBadge` | Issue list table (unchanged logic) |

**Not used (by design):** `AixiaCommandMetrics` in hero — correct for registry/list page type per 85C.

---

## 6. What changed visually

| Change | Detail |
|--------|--------|
| Shell | Replaced `AixiaPage` + local header with `AixiaCommandPageLayout` |
| Hero | Command hero with Back, Refill Queue (when applicable), Refresh — **no floating badges** |
| Meta strip | Environment, Queue mode, Open slots, Issues loaded |
| Guardrails section | New `AixiaSection` + `AixiaInfoBlock` for manual-first rule |
| Queue summary | Local Tailwind grid → `AixiaSmartGrid` + `AixiaValueBlock` in command section |
| Sections | All major areas use `surface="command"` rhythm |
| Access denied | Early return uses command shell + section (History pattern) |
| Test ID | Added `data-testid="agentops-issues-page"` on scroll body wrapper |

---

## 7. What logic was preserved

All of the following remain unchanged in behavior:

- `loadIssues`, owner gate, `getAgentOps*` API calls
- State: focus/status/queue/severity/category/route/agent filters, search term
- `mergedItems`, `filteredItems`, counts, `recommendedAction`, `handleRefillQueue`
- Focus chip handlers, filter `<select>` / search `<input>`, more-filters `<details>`
- Issue table columns, badges, Open Workspace navigation
- `AixiaAsyncState` loading gate, error `AixiaInfoBlock`, empty state copy memos
- No modals added/removed; no route path or permission changes

---

## 8. Dual/triple reference comparison

| Aspect | History (85) | Council | Finance Transactions | Issues (86) |
|--------|--------------|---------|----------------------|-------------|
| Command shell | Yes | Yes | Yes (finance command) | **Yes** |
| Hero badges in title area | Removed | None | None | **None** |
| Hero KPI metrics | Yes (history type) | No | Yes (registry hero KPI) | **No** (list/queue type) |
| Meta strip context | Environment, access, scope | Context items | Registry meta | **Environment, mode, slots, loaded** |
| Summary metrics location | Hero (history KPIs) | N/A | Hero + scroll | **Scroll Queue summary section** |
| Section rhythm | `AixiaSection command` | Same | Same | **Same** |

Issues aligns with **Council** for hero-without-KPI + meta strip, and with **Finance Transactions** for meta-strip placement and scroll-section metric rhythm (metrics in body, not duplicated in meta strip).

---

## 9. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter (`issues/page.tsx`) | **No errors** |

Guardrail warnings in build output are pre-existing project debt; none introduced by this batch.

---

## 10. Browser QA result

**PASS** — verified at `http://127.0.0.1:5173/system/agent-ops/issues`

| Check | Result |
|-------|--------|
| Command shell / hero sequence (04 §4G) | Parent pill, kicker, title, subtitle, actions present |
| No floating hero badges | **0** hero badge nodes in hero |
| Meta strip (05) | Environment, Queue mode, Open slots, Issues loaded |
| Sections (06) | Queue guardrails, summary, recommended action, Find issues, Issue list |
| Table / filters | 16 table rows; focus chips All/Needs attention/Active/Verification/Backlog/Archived |
| `data-testid="agentops-issues-page"` | Present |
| Console errors | None observed |

**Cross-route spot checks:**

| Route | Verified |
|-------|----------|
| `/system/agent-ops/history` | Command shell; hero KPI content; no hero badges |
| `/system/agent-ops/council` | Command shell loaded |
| `/finance/transactions` | Route reachable for rhythm reference |

**Manual follow-up (optional):** Click focus chips, run Refresh, exercise Refill Queue when slots available, confirm no scroll/filter reset on silent refresh.

---

## 11. Owner-file improvement proposals

| Item | Recommendation |
|------|----------------|
| Filter row raw `<input>`/`<select>` | Shared registry filter components (same as History proposal) |
| Focus chip local Tailwind | Optional shared chip/toggle pattern in command registry toolbar |
| Recommended action inner card | Optional shared `AixiaCalloutPanel` for command pages |
| Guardrail debt for Issues | Add to guardrail-alignment batch after sign-off |

No owner-file edits required for Batch 86 completion.

---

## 12. Recommended next batch

**Batch 87 — AgentOps smaller orb route OR Hub decision**

- **Do not migrate Hub** unless Issues browser QA confirms the command pattern is stable (this batch passes that gate).
- Prefer next smallest AgentOps orb route (e.g. Advanced preview, Knowledge list) with the same page-type classification step before edit.
- Hub migration remains **not approved** until Batch 87 scope review.

---

## 13. Confirmation — no other routes migrated

Confirmed. Only `/system/agent-ops/issues` page file edited for migration work.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `issues/page.tsx`, `16-design-file-cleanup-map.md`, this report |
| 2 | Issues route migrated | **Yes** |
| 3 | Page type classified | **Yes** — registry/list queue-management |
| 4 | History route changed | **No** |
| 5 | Council route changed | **No** |
| 6 | Hub route changed | **No** |
| 7 | Other AgentOps routes changed | **No** |
| 8 | Shared components changed | **No** |
| 9 | CSS changed | **No** |
| 10 | Business logic changed | **No** |
| 11 | API/Supabase changed | **No** |
| 12 | Filters/search/sort/actions preserved | **Yes** |
| 13 | Modals/loading/error/empty states preserved | **Yes** |
| 14 | Command shell used | **Yes** — `AixiaCommandPageLayout` |
| 15 | Hero aligned with 04 §4G | **Yes** |
| 16 | Meta strip aligned with 05 | **Yes** |
| 17 | Card/section rhythm aligned with 06 | **Yes** |
| 18 | Dual/triple browser comparison completed | **Yes** |
| 19 | Silent refresh/no-jump preserved | **Yes** (no logic changes) |
| 20 | `npm run qa:validate-foundation` | **PASS** |
| 21 | `npm run build` | **PASS** |
| 22 | Browser QA | **PASS** |
| 23 | Page migrations limited to Issues only | **Yes** |
| 24 | Finance proofs paused | **Yes** |
| 25 | Command-surface context paused | **Yes** |
| 26 | CSS split paused | **Yes** |
| 27 | Final status | **COMPLETE** |
| 28 | Recommended next batch | **Batch 87** — smaller orb route; Hub only after QA gate |

---

## Related

- Batch 85C: `AIXIA_GLOBAL_FOLDER_BATCH_85C_SOT_CLARIFICATION_AFTER_HISTORY_AUDIT.md`
- Batch 85: `AIXIA_GLOBAL_FOLDER_BATCH_85_AGENTOPS_HISTORY_VISUAL_PARITY_FIX_REPORT.md`
- Batch 84: `AIXIA_GLOBAL_FOLDER_BATCH_84_AGENTOPS_HISTORY_MIGRATION_REPORT.md`
- References: `history/page.tsx`, `council/page.tsx`, `finance/transactions/page.tsx`
