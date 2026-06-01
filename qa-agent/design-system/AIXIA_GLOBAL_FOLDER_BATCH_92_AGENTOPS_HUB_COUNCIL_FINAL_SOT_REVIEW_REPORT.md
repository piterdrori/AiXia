# AiXia Global Design System — Batch 92 — AgentOps Hub + Council Final SOT Review Report

**Date:** 2026-05-30  
**Type:** Final SOT review + design-only alignment — two routes  
**Status:** COMPLETE  
**Routes:** `/system/agent-ops`, `/system/agent-ops/council`  
**Files:** `src/app/system/agent-ops/page.tsx`, `src/app/system/agent-ops/council/page.tsx`

---

## 1. Purpose

Review the two remaining AgentOps pages (Control Center hub and Agent Council) against the final owner files after Batches 85C and 86B. Migrate or align only where SOT violations were clear and safe without logic changes.

---

## 2. Source-of-truth files read

| File | Applied for |
|------|-------------|
| `00-README-SOURCE-OF-TRUTH.md` | Authority hierarchy |
| `03-page-shell-standard.md` | `AixiaCommandPageLayout`, scroll lead |
| `04-hero-header-standard.md` §4G, §4H | Hero sequence; hub KPI placement A |
| `05-meta-status-strip-standard.md` | Context-only meta; no KPI substitution |
| `06-card-section-standard.md` §4J | KPI placement; command sections |
| `08-table-list-standard.md` | Hub is not primary registry — navigation rhythm |
| `11-scroll-responsive-standard.md` | Command scroll preserved |
| `12-navigation-workspace-standard.md` | Hub navigation grid + cards |
| `13-module-wrapper-rules.md` | Shared components only |
| `14-page-migration-rules.md` §12.1–12.3 | Page-type table; Council chat exception |
| `15-guardrail-rules.md` | Build/validation gate awareness |

Reference routes (comparison only): History, Issues, Advanced, Knowledge, Automation, Agents, Agent Detail, Finance Transactions.

---

## 3. Hub page-type classification

| Attribute | Classification (`14` §12.3) |
|-----------|----------------------------|
| Route | `/system/agent-ops` |
| Primary type | **Hub / dashboard** (module command center) |
| Secondary traits | Today's priority; system readiness; route navigation; collapsed legacy fallback |
| KPI expectation | **Yes** — `AixiaCommandMetrics` in hero |
| Meta expectation | **Yes** — context/mode/scope only |

---

## 4. Hub pre-edit reasoning

### Operational metrics / indicators present

| Signal | Source |
|--------|--------|
| Active Top 10 count / open slots | `dashboard.activeOpenCount`, `dashboard.openSlots` |
| Backlog count | `dashboard.backlogCount` |
| Pending verification | `dashboard.verificationPendingCount` |
| Queue health action | `queueHealth.recommendedAction` |
| Agents needing attention | `statusDashboardSummary.agentsNeedingAttention` |
| Automation / scheduler prep | `schedulerPrep.active` |
| Today's priority recommendation | `todayPriority` memo |
| System readiness blocks | Hermes, CodeGraph, LLM, Scheduler, Cursor posture |
| Route navigation | 7 child AgentOps routes |

### Pre-edit SOT violations (primary hub surface)

| Violation | Owner rule |
|-----------|------------|
| `AixiaPage` instead of `AixiaCommandPageLayout` | `03`, `14` §12.1 |
| `AixiaCommandMetrics` in section, not hero | `04` §4H placement A, `06` §4J |
| No meta strip | `05`, `14` §12.3 hub row |
| Local Tailwind navigation buttons | `12` §4B — `AixiaNavigationGrid` + `AixiaNavigationCard` |
| Top sections missing `surface="command"` | `06`, `14` §12.1 |

### Logic preserved

All hooks, API calls, dashboard loading, refill/import/verification workflows, legacy fallback panel content, modals, navigation handlers, owner gate, and action feedback — unchanged.

---

## 5. Hub safe-to-change decision

**Decision:** **Yes — migrate primary hub shell in Batch 92.**

**Why:** Violations were clear from owner files. Changes limited to shell wrapper, hero KPI placement, meta strip, navigation grid, and top-section surface flags. No business logic touched. Collapsed legacy fallback content intentionally left as-is (8000+ lines of preserved workflows; not primary hub rhythm).

---

## 6. Hub KPI/card/meta/navigation decision and why

| Surface | Decision | Why |
|---------|----------|-----|
| **Hero KPIs** | Keep existing 6 `commandMetrics` — move into hero children | `14` §12.3 hub row + `04` §4H placement A |
| **Meta strip** | Add 4 context items: Environment, Control mode, Hub scope, Legacy fallback | `05` — no queue counts in meta |
| **Navigation** | Replace local buttons with `AixiaNavigationGrid` + 7 `AixiaNavigationCard` | `12` §4B hub primary navigation |
| **Sections** | Today's Priority, System readiness, Navigate — `surface="command"` | `06` command rhythm |
| **Removed** | Duplicate "Command metrics" section | KPI duplication after hero move |
| **Not changed** | Legacy `<details>` fallback grids/tabs | Risky logic-adjacent debt; secondary fallback only |

---

## 7. Council page-type classification

| Attribute | Classification (`14` §12.3) |
|-----------|----------------------------|
| Route | `/system/agent-ops/council` |
| Primary type | **Chat / coordination** |
| KPI expectation | **No** — explicit §12.3 exception |
| Meta expectation | **Yes** — context-only |

`14` §12.3: *"Chat / coordination (Council) | No (no operational count KPIs) | Yes"*

---

## 8. Council pre-edit reasoning

### Already compliant

- `AixiaCommandPageLayout` + command hero
- No hero KPI row (correct per page type)
- Group chat thread section + progressive disclosure participants
- Safety guardrails section
- Owner gate early return
- All chat/composer/memory-approval preview logic preserved
- `data-testid="agentops-council-page"` present

### Minor violations found

| Issue | Severity |
|-------|----------|
| `AixiaFinanceHubMetaStrip` instead of AgentOps-standard `AixiaCommandHubMetaStrip` | Alignment |
| Meta item `"Council roster: N agents"` — dynamic count in meta | Borderline KPI substitution (`05` / Batch 86B lesson) |

---

## 9. Council safe-to-change decision

**Decision:** **Yes — small design-only alignment only.**

**Why:** Shell and section rhythm already matched final owners after 85C/86B. No hero KPIs required. Only meta-strip component + scope wording needed.

---

## 10. Council KPI/card/meta/section decision and why

| Surface | Decision | Why |
|---------|----------|-----|
| **Hero KPIs** | **Not added** | `14` §12.3 Council exception — chat/coordination, not operational dashboard |
| **Meta strip** | Switch to `AixiaCommandHubMetaStrip`; roster count → scope label "All managed agents" | AgentOps consistency + context-only meta |
| **Sections** | Unchanged | Already `surface="command"` with chat thread, disclosure groups, safety |
| **Chat badges in messages** | Unchanged | Agent status in message context — not floating hero badges |

---

## 11. Files changed

| File | Change |
|------|--------|
| `src/app/system/agent-ops/page.tsx` | Hub shell SOT alignment |
| `src/app/system/agent-ops/council/page.tsx` | Meta strip component + scope wording |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §7 step 49 status |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_92_AGENTOPS_HUB_COUNCIL_FINAL_SOT_REVIEW_REPORT.md` | This report |

No other routes, shared components, or CSS changed.

---

## 12. What changed visually

### Hub

- `AixiaPage` → `AixiaCommandPageLayout` + `AixiaCommandHubMetaStrip`
- Hero title normalized to **Control Center** (page name per `04` §4B)
- 6 command metrics moved from section into hero
- Removed duplicate "Command metrics" section
- Navigate local buttons → shared `AixiaNavigationGrid` / `AixiaNavigationCard`
- Top sections use `surface="command"`
- Gate loading / access denied use command shell

### Council

- `AixiaFinanceHubMetaStrip` → `AixiaCommandHubMetaStrip`
- Meta first item: scope label instead of dynamic agent count

---

## 13. What logic was preserved

**Hub:** All dashboard data loading, refill/import/verification actions, today's priority handler, legacy fallback panel, modals, tab state, and navigation URLs — unchanged.

**Council:** `loadData`, managed agents, chat thread preview, composer disabled state, memory approval prompts, participant navigation to agent workspaces, owner gate — unchanged.

---

## 14. Browser comparison results

**PASS**

| Route | Result |
|-------|--------|
| `/system/agent-ops` | Hero **Control Center**; 6 KPI subtitles visible; meta context; navigation cards (Issues–History); Today's Priority + System readiness + legacy collapse present |
| `/system/agent-ops/council` | Hero **Agent Council**; chat thread + composer; participants disclosure; safety section; no hero KPI row (correct) |
| `/system/agent-ops/history` | No regression |
| `/system/agent-ops/issues` | No regression |
| `/system/agent-ops/advanced` | Spot-check OK (prior batch) |
| `/system/agent-ops/knowledge` | Spot-check OK (prior batch) |
| `/system/agent-ops/automation` | Spot-check OK (prior batch) |
| `/system/agent-ops/agents` | No regression |
| `/system/agent-ops/agents/agentops-owner` | Spot-check OK (prior batch) |
| `/finance/transactions` | No regression |

No console errors observed on Hub or Council. Navigation cards and legacy fallback links still work.

---

## 15. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| Linter | **No errors** |

---

## 16. Source-of-truth gaps found

**No new owner-file gaps.**

**Known residual debt (not a SOT gap):** Hub collapsed legacy fallback panel still contains local Tailwind stat/card grids from pre-migration era. This is secondary fallback content, not the primary hub surface. Recommend Batch 93 parity re-scan if that panel should eventually be removed or further aligned — not a blocker for route migration completeness.

---

## 17. Whether AgentOps page migration is now complete

**Yes** — all nine AgentOps routes now reviewed and aligned to final owner rules:

1. Control Center (Hub) — Batch 92  
2. History — Batch 84–85  
3. Issues — Batch 86–86B  
4. Advanced — Batch 87  
5. Knowledge — Batch 88  
6. Automation — Batch 89  
7. Agents registry — Batch 90  
8. Agent Detail — Batch 91  
9. Council — Batch 92 (alignment)

Primary surfaces follow command shell + hero KPIs (where required) + context meta + section/navigation rhythm.

---

## 18. Recommended next batch

**Batch 93 — AgentOps final parity re-scan + guardrail debt shrink proposal**

- Re-scan all AgentOps routes for residual local grids (especially Hub legacy collapse).
- Propose guardrail debt shrink items without finance proofs, command-surface context, CSS split, or hard-error escalation.
- Do not start finance shell proofs until AgentOps final parity sign-off.

---

## 19. Confirmation — no unrelated routes migrated

Confirmed. Only Hub and Council files edited in Batch 92.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files changed | `agent-ops/page.tsx`, `council/page.tsx`, cleanup map, this report |
| 2 | Hub reviewed | **Yes** |
| 3 | Council reviewed | **Yes** |
| 4 | Hub migrated/fixed | **Yes** |
| 5 | Council migrated/fixed | **Yes** (small meta alignment only) |
| 6 | Exact report filename used | **Yes** |
| 7 | Source-of-truth reasoning documented | **Yes** |
| 8 | Hub page type classified from owner files | **Yes** — hub/dashboard |
| 9 | Council page type classified from owner files | **Yes** — chat/coordination |
| 10 | KPI/card decisions derived from owner files | **Yes** |
| 11 | Meta strip decisions derived from owner files | **Yes** |
| 12 | Navigation/section decisions derived from owner files | **Yes** |
| 13 | Other AgentOps routes changed | **No** |
| 14 | Shared components changed | **No** |
| 15 | CSS changed | **No** |
| 16 | Business logic changed | **No** |
| 17 | API/Supabase changed | **No** |
| 18 | Actions/links/modals preserved | **Yes** |
| 19 | Loading/error/empty states preserved | **Yes** |
| 20 | `npm run qa:validate-foundation` | **PASS** |
| 21 | `npm run build` | **PASS** |
| 22 | Browser QA | **PASS** |
| 23 | Source-of-truth gaps found | **No** |
| 24 | AgentOps migration complete | **Yes** |
| 25 | Final status | **COMPLETE** |
| 26 | Recommended next batch | **Batch 93 — AgentOps final parity re-scan + guardrail debt shrink proposal** |
