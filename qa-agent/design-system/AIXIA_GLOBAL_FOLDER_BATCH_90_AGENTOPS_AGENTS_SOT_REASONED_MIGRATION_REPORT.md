# AiXia Global Design System — Batch 90 — AgentOps Agents SOT-Reasoned Migration Report

**Date:** 2026-05-30  
**Type:** Design-only command-pattern migration — one route, source-of-truth reasoning  
**Status:** COMPLETE  
**Route:** `/system/agent-ops/agents`  
**File:** `src/app/system/agent-ops/agents/page.tsx`

---

## 1. Purpose

Migrate the AgentOps Agents roster route using active owner-file reasoning. Sixth AgentOps orb route after History, Issues, Advanced, Knowledge, and Automation. Hub and Agent Detail remain not approved.

---

## 2. Source-of-truth files read

| File | Applied for |
|------|-------------|
| `00-README-SOURCE-OF-TRUTH.md` | Authority hierarchy |
| `03-page-shell-standard.md` | `AixiaCommandPageLayout`, scroll lead |
| `04-hero-header-standard.md` §4G, §4H | Hero sequence; operational metrics → hero KPI row |
| `05-meta-status-strip-standard.md` | Context-only meta; no KPI substitution |
| `06-card-section-standard.md` §4J | KPI placement A; command sections |
| `08-table-list-standard.md` | Registry table via `AixiaTableShell variant="registry"` |
| `11-scroll-responsive-standard.md` | Internal table scroll preserved |
| `13-module-wrapper-rules.md` | Shared components only |
| `14-page-migration-rules.md` §12.1–12.3 | Page-type + operational override + browser QA |
| `15-guardrail-rules.md` | Build/validation gate awareness |

Reference routes (comparison only): History, Issues, Advanced, Knowledge, Automation, Council, Finance Transactions.

---

## 3. Page-type classification

| Attribute | Classification (`14` §12.3) |
|-----------|----------------------------|
| Route | `/system/agent-ops/agents` |
| Primary type | **Registry / list** (agent roster management) |
| Secondary traits | Status dashboard overlay; filter chips; workspace links |
| Hub? | **No** |
| Agent Detail? | **No** (links only — detail route not migrated) |

Registry/list type does **not** skip KPI cards when operational metrics exist (`04` §4H override — same lesson as Issues Batch 86B).

---

## 4. Pre-edit reasoning

### Agent metrics / indicators on page

| Signal | Source |
|--------|--------|
| Total agents | `summary.total` |
| Needs attention | `summary.attention` (status dashboard) |
| Active / Quiet / Needs memory / Blocked | `summary.*` from `managedAgents` |
| Owner-only restricted | `summary.restricted` |
| Per-agent roster rows | `filteredAgents` + `AixiaTableShell` |
| Filter state | `filter` + `FILTERS` chips |
| Council navigation | Dedicated section + link (not embedded chat) |

### Logic/actions/links preserved

- `loadData`, owner gate, `getAgentOpsManagedAgents`, `getAgentOpsAgentStatusDashboard`
- Filter chips (`setFilter`)
- Table columns, badges, row actions, `AixiaRowActionMenu` items
- Navigation to agent workspace and memory/chat query params
- Council / Knowledge / Advanced / Control Center links
- Test IDs: `agentops-agents-overview`, `agentops-agents-advanced-tools`

---

## 5. KPI/card decision and why

**Required:** Yes — `04` §4H placement **A** (hero `AixiaCommandMetrics`).

**Why:** Page has six operational roster counts in existing `summary` memo. Local “Overview” Tailwind grid was page-level KPI debt; meta strip cannot substitute per `05`.

**Hero metrics (6):** Total agents, Needs attention, Active, Quiet, Needs memory, Owner-only restricted — all from existing `summary` values.

**Removed:** “Overview” section duplicate grid.

---

## 6. Meta strip decision and why

**Required:** Yes — context/mode/scope only (`05`).

| Item | Role |
|------|------|
| Environment: Staging only | Replaces hero badge |
| Control mode: Manual-first | Replaces hero badge |
| Roster scope: 12 synthetic QA agents | Scope label (not total count duplicate) |
| Council access: Separate route | Navigation/context — Council is not embedded here |

Former floating badges (`Staging only`, `Manual-first`) relocated to meta — not hero KPIs.

---

## 7. Table/list/card decision and why

**Decision:** Keep **registry table** pattern (`08`) — primary content is agent roster list.

| Element | Pattern | Why |
|---------|---------|-----|
| Agent roster | `AixiaTableShell variant="registry"` | Registry/list page; wide columns; internal scroll |
| Filters | Section + button chips | Preserved existing filter UX |
| Council promo | Section + callout card | Navigation to separate route — not table row |
| Advanced tools | Section + `<details>` disclosure | Secondary links — not primary list |

No conversion to navigation cards — roster is tabular data with row actions per `08`.

---

## 8. Section/card rhythm decision and why

| Section | `surface="command"` | Content |
|---------|---------------------|---------|
| Agent Council | Yes | Council link callout |
| Filters | Yes | Filter chip buttons |
| Agent roster | Yes | Table + empty/error states |
| Advanced agent tools | Yes | Legacy disclosure + route links |
| Loading fallback | Yes | `AixiaEmptyState` |
| Access denied | Command shell + section | Owner gate |

Sequence: **Hero KPIs → meta strip → Council → filters → roster table → advanced tools**.

---

## 9. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/agents/page.tsx` | SOT-reasoned command migration |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 47 status |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_90_AGENTOPS_AGENTS_SOT_REASONED_MIGRATION_REPORT.md` | This report |

No other routes, shared components, or CSS changed.

---

## 10. What changed visually

- `AixiaPage` → `AixiaCommandPageLayout` + command hero + meta strip
- Removed local hero `className` border styling and floating badges
- Hero title normalized to **Agents** (page name only per `04` §4B)
- Added hero `AixiaCommandMetrics` (6 cards)
- Removed duplicate “Overview” KPI grid
- All sections use `surface="command"`
- Advanced tools wrapped in command section
- Loading wrapped in section + empty state
- Refresh with spinner icon

---

## 11. What logic was preserved

Unchanged: all hooks, API calls, `summary`/`filteredAgents` memos, filter state/handlers, table rendering, `buildActionItems`, row navigation URLs, Council/Knowledge/Advanced links, empty/error states, test IDs, owner gate behavior.

---

## 12. Browser comparison results

**PASS** — `http://127.0.0.1:5173/system/agent-ops/agents`

| Check | Result |
|-------|--------|
| `data-testid="agentops-agents-overview"` | Present |
| Hero metrics | 6 cards with correct labels |
| Hero badges | 0 |
| Meta strip context | Environment, Control mode, Roster scope, Council access |
| Duplicate Overview section | Removed |
| Registry table | 12 rows |
| Filters | Present |
| Open Council | Present |
| Advanced tools testId | Present |
| Hero title | `Agents` |

Aligned with Issues/Automation registry rhythm (hero KPIs + meta + filters + registry table). Hub and Agent Detail not edited.

---

## 13. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter | **No errors** |

---

## 14. Source-of-truth gaps found

**No new gaps.** `04` §4H, `05`, `06` §4J, `08`, and `14` §12.3 were sufficient to classify registry/list + operational metrics → hero KPIs + registry table without hand-written layout instructions.

---

## 15. Recommended next batch

**Batch 91 — Agent Detail route scope review OR owner-file Hub readiness gate**

- Six AgentOps orb/control routes now pass SOT-reasoned migration.
- **Hub migration still not recommended** until explicit Piter approval after orb-route sign-off.
- **Agent Detail** was out of scope for Batch 90 — recommend dedicated scope batch before Hub.
- If Hub is requested, require separate page-type analysis (hub vs dashboard per `14` §12.3).

---

## 16. Confirmation — no other routes migrated

Confirmed. Only `/system/agent-ops/agents` edited.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `agents/page.tsx`, cleanup map, this report |
| 2 | Agents route migrated | **Yes** |
| 3 | Exact report filename used | **Yes** |
| 4 | Source-of-truth reasoning documented | **Yes** |
| 5 | Page type classified from owner files | **Yes** — registry/list |
| 6 | KPI/card decision derived from owner files | **Yes** — §4H placement A |
| 7 | Meta strip decision derived from owner files | **Yes** |
| 8 | Table/list/card decision derived from owner files | **Yes** — `08` registry table |
| 9 | Other AgentOps routes changed | **No** |
| 10 | Shared components changed | **No** |
| 11 | CSS changed | **No** |
| 12 | Business logic changed | **No** |
| 13 | API/Supabase changed | **No** |
| 14 | Actions/links/modals preserved | **Yes** |
| 15 | Loading/error/empty preserved | **Yes** |
| 16 | `npm run qa:validate-foundation` | **PASS** |
| 17 | `npm run build` | **PASS** |
| 18 | Browser QA | **PASS** |
| 19 | Source-of-truth gaps found | **No** |
| 20 | Final status | **COMPLETE** |
| 21 | Recommended next batch | **Batch 91** — Agent Detail scope or Hub readiness gate; Hub not auto-approved |
