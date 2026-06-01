<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/03-page-shell-standard.md, src/design-system/aixia-global/04-hero-header-standard.md, src/design-system/aixia-global/05-meta-status-strip-standard.md, src/design-system/aixia-global/14-page-migration-rules.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent audit compared routes against historical shell/hero baselines. It **must not** override owner files. References to `AIXIA_PAGE_SHELL_HERO_STANDARD.md` below are **historical** — active law is in `aixia-global/`.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`03-page-shell-standard.md`](../../src/design-system/aixia-global/03-page-shell-standard.md) — page shell
> - [`04-hero-header-standard.md`](../../src/design-system/aixia-global/04-hero-header-standard.md) — hero / header
> - [`05-meta-status-strip-standard.md`](../../src/design-system/aixia-global/05-meta-status-strip-standard.md) — meta / status strips
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — page migration
>
> - If this audit conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AiXia Global Visual Parity Audit — After Batch 8

**Date:** 2026-05-29  
**Type:** Documentation / audit only — **no code, CSS, page, guardrail, or memory changes**  
**Trigger:** Pause Batch 9 finance shell proofs; establish evidence-based next direction for global standardization.

---

## 1. Purpose

Compare Finance (reference baseline), one loaded finance detail, and AgentOps routes (hub, History, Council) against `AIXIA_PAGE_SHELL_HERO_STANDARD.md`. Classify every visual rhythm gap by root cause so the next batch fixes **shared authority** or **planned page-family migration** — not random route-by-route finance shell wraps.

---

## 2. Pages / routes checked

| # | Route | State observed |
|---|-------|----------------|
| 1 | `/finance` | **Loaded** — authenticated owner session |
| 2 | `/finance/transactions/proforma-invoices` | **Loaded** — registry list |
| 3 | `/finance/transactions/invoices/739a1888-fa32-4143-a7d3-2804d2048a1d` | **Loaded detail** — opened from registry “Open” (invoice record; same `AixiaFinanceCommandDetailPage` shell as proforma detail) |
| 4 | `/system/agent-ops` | **Loaded** — owner Control Center |
| 5 | `/system/agent-ops/history` | **Loaded** — owner History |
| 6 | `/system/agent-ops/council` | **Loaded** — owner Council |

**Note on finance detail:** Registry “Open” navigated to an **invoice** detail URL, not a proforma UUID. Structure is identical (`AixiaFinanceCommandDetailPage` → `FinancePage`). A dedicated proforma UUID was not required for shell/rhythm comparison.

---

## 3. Browser / dev environment

| Setting | Value |
|---------|-------|
| Dev server | `http://127.0.0.1:5173/` — **UP** |
| Viewport | 1280 × 800 (CDP device metrics override) |
| Auth | Logged in as **Piter Drori** (owner-capable session) |
| Scroll | Top of page unless noted |
| Tooling | Cursor IDE browser + CDP DOM class probes + code inspection |

---

## 4. Screenshots / visual inspection

Captured during audit (Cursor temp screenshots):

| Route | Inspected |
|-------|-----------|
| `/finance` | Yes — hero KPI row, hub meta strip, overview grid |
| `/system/agent-ops` | Yes — hero, priority card, metrics in scroll |
| `/system/agent-ops/council` | Yes — command layout, hub meta strip, chat thread |
| `/system/agent-ops/history` | Yes — default/orb hero gradient, local summary cards |
| Finance detail (invoice) | Yes — command detail hero metrics, meta strip, SmartLayout sections |

---

## 5. Finance reference hub (`/finance`) observations

**Shell:** `FinancePage` → `AixiaCommandPage` + `.aixia-finance-page` + `.aixia-dash-3d-stack` ✓  
**Hero:** `AixiaHero surface="command"` — kicker “Finance”, title, subtitle, Refresh action ✓  
**Hero KPIs:** `AixiaCommandMetrics` **inside hero** ✓ (locked standard for hubs)  
**Meta strip:** `AixiaFinanceHubMetaStrip` as first child of `.aixia-command-scroll` ✓  
**Content rhythm:** `AixiaFinanceHubOverviewGrid` → `AixiaSmartLayout` sections — consistent `gap-6` scroll ✓  
**Atmosphere:** Command 3D glass — **not** orb ✓  

**Verdict:** Matches `AIXIA_PAGE_SHELL_HERO_STANDARD.md` — **canonical reference**.

---

## 6. Finance detail observations

**Route inspected:** `/finance/transactions/invoices/739a1888-…` (registry-opened loaded record)

**Shell:** `AixiaFinanceCommandDetailPage` → `FinancePage` — `.aixia-finance-page` + command 3D ✓  
**Hero:** Command hero with parent pill “Proforma / Invoice”, gradient kicker, title (INV-00027), `AixiaCommandMetrics` in hero (Recipient, Balance Due, Payment Progress) ✓  
**Meta strip:** Hub meta cells (Document, Workspace, Record Status, Payment Status) below hero, inside scroll ✓  
**Content:** `AixiaSmartLayout` with Document Overview, Financial Summary, line items — **page-local composition** but within shared detail shell ✓  
**Batch 6–8 impact:** Loading/not-found only — **loaded view unchanged** ✓  

**Minor parity notes (pre-existing, not Batch 6–8):**

- Section density and sidebar width vary by document type — **individual page composition debt**, not shell failure.
- Some finance detail routes still on legacy orb for loading only (cleared on 3 proofs) — invisible in loaded state.

**Verdict:** Loaded finance detail **aligns with reference** at shell/hero/meta level. Card placement differences vs hub are **expected** (detail vs hub purpose).

---

## 7. AgentOps hub (`/system/agent-ops`) observations

**Shell:** `AixiaPage surface="command"` + `.aixia-command-page` — command 3D present ✓ (not orb)  
**Hero:** `AixiaHero surface="command"` — kicker, title, subtitle, action cluster ✓  
**Hero KPIs:** **Missing from hero** — metrics placed in scroll inside `AixiaSection` “Command metrics” ✗  
**Meta strip:** **None** — `hubMeta` count 0 ✗  
**Content rhythm:** Many stacked sections (~60 section nodes); page-local `rounded-xl border bg-white/[0.03]` readiness cards ✗  
**Scroll:** `.aixia-command-scroll flex flex-col gap-6` ✓  

**Verdict:** Command shell and hero typography mostly correct, but **hub rhythm diverges** from Finance reference (metrics location, no meta strip, heavy section stack).

---

## 8. AgentOps History observations

**Shell:** `<AixiaPage>` **default/orb** — `aixia-page` without `aixia-command-page`; **no** `aixia-dash-3d-stack` ✗  
**Hero:** `AixiaHero` **without** `surface="command"` — gradient XL kicker visible (“AgentOps” gradient text) ✗  
**Hero badges:** 2 declared + additional badge noise in DOM (8 badge nodes) — exceeds hub discipline ✗  
**Parent nav:** `parentLabel`/`parentPath` present ✓ but **duplicate** “Back to Control Center” button ✗  
**Meta strip:** **None** ✗  
**Scroll:** Uses `space-y-6` wrapper — **not** canonical `.aixia-command-scroll` as direct shell child ✗  
**Summary metrics:** Local `rounded-xl border` grid cards — not `AixiaCommandMetrics` ✗  
**Info blocks:** Large amber “Read-only surface” block before sections — pushes content down ✗  

**Verdict:** **Largest AgentOps parity gap.** Orb atmosphere + default hero + no hub meta strip. This explains much of Piter’s “different product” feeling vs Finance.

---

## 9. AgentOps Council observations

**Shell:** `AixiaCommandPageLayout` — command 3D ✓  
**Hero:** `AixiaHero surface="command"` + parent pill ✓  
**Meta strip:** `AixiaFinanceHubMetaStrip variant="command"` in `scrollLead` ✓  
**Scroll:** `.aixia-command-scroll` ✓  
**Content:** Chat thread + progressive disclosure — **purpose-specific** (E) but shell rhythm matches reference ✓  
**Hero metrics:** None — correct per standard for non-KPI council page ✓  

**Verdict:** **Best AgentOps alignment** with Finance reference. Council Phase 0 correction (Batch 1) shows in structure.

---

## 10. Parity gaps table

| ID | Gap | Finance ref | AgentOps hub | History | Council | Finance detail |
|----|-----|-------------|--------------|---------|---------|----------------|
| G-01 | Command 3D shell (not orb) | ✓ | ✓ | ✗ orb | ✓ | ✓ |
| G-02 | `surface="command"` hero | ✓ | ✓ | ✗ default | ✓ | ✓ |
| G-03 | Hub KPIs in hero (`AixiaCommandMetrics`) | ✓ | ✗ in scroll | ✗ local cards | N/A ✓ | ✓ detail KPIs |
| G-04 | Hub meta strip below hero | ✓ | ✗ | ✗ | ✓ | ✓ |
| G-05 | Single `.aixia-command-scroll` region | ✓ | ✓ | ✗ | ✓ | ✓ |
| G-06 | No gradient XL / marketing hero | ✓ | ✓ | ✗ | ✓ | ✓ |
| G-07 | No page-local metric card grids | ✓ | ✗ readiness | ✗ summary | ✓ | partial |
| G-08 | Section vertical rhythm `gap-6` | ✓ | partial | ✗ space-y-6 | ✓ | ✓ |
| G-09 | Shared detail shell for finance docs | N/A | N/A | N/A | N/A | ✓ |
| G-10 | Parent pill without duplicate Back | ✓ | ✓ | ✗ | ✓ | ✓ |

---

## 11. Root cause classification (every gap)

| Gap ID | Classification | Rationale |
|--------|----------------|-----------|
| G-01 History orb shell | **B** Page-family migration | History uses default `AixiaPage`; needs `AixiaCommandPageLayout` or command `AixiaPage` — after shared shell docs enforced |
| G-02 History default hero | **B** + **A** | Missing `surface="command"` — page-family fix; default hero surface in shared component enables drift (**A**) |
| G-03 AgentOps hub metrics in scroll | **C** Individual page debt | Control Center composes metrics inside `AixiaSection` instead of hero children |
| G-03 History local summary cards | **C** | Page-local grid instead of shared metrics/meta |
| G-04 AgentOps hub no meta strip | **C** | Hub page never wired to `AixiaCommandHubMetaStrip` |
| G-04 History no meta strip | **B** | Page-family migration |
| G-05 History scroll wrapper | **C** | `space-y-6` competes with canonical scroll |
| G-06 History gradient hero | **B** | Default hero surface on authenticated page |
| G-07 AgentOps readiness local cards | **C** | Inline Tailwind cards vs shared value blocks |
| G-08 History spacing | **C** | Local wrapper choice |
| G-09 Finance detail section placement | **C** + **E** | SmartLayout composition varies by document — acceptable business layout within shared shell |
| G-10 History duplicate Back | **C** | Extra button alongside parent pill |
| Finance detail vs hub card position | **E** | Different page types — detail has action row + SmartLayout sidebar |
| Batch 6–8 loading shell wraps | **D** | Affects loading/not-found only — not visible in loaded screenshots |
| Screenshot viewport truncation | **D** | 1280×800 clips wide meta rows and metric grids |

---

## 12. Shared-layer fixes (Category A)

| Issue | Shared fix (no page migration yet) |
|-------|-------------------------------------|
| Default hero surface on authenticated routes | Consider default `surface="command"` under `DashboardLayout` in `AixiaHero` (P0-03 backlog) |
| AgentOps hub metrics pattern | Document/enforce hub pattern: metrics **only** as hero children — guardrail already warns |
| Meta strip naming | `AixiaFinanceHubMetaStrip variant="command"` used on Council — promote as `AixiaCommandHubMetaStrip` everywhere (P0-05 partial) |
| Page-local `rounded-xl border bg-white/[0.03]` cards | Add/shared-ize pattern in `AixiaValueBlock` or command metric adjacency — reduce one-off Tailwind |

---

## 13. Page-family migration gaps (Category B)

| Family | Routes | Required migration (when unfrozen) |
|--------|--------|-------------------------------------|
| **AgentOps History** | `/system/agent-ops/history` | Orb → `AixiaCommandPageLayout`; command hero; hub meta strip; command scroll; remove duplicate Back |
| **AgentOps hub** | `/system/agent-ops` | Wire hub meta strip; move command metrics into hero; reduce section sprawl |
| **AgentOps legacy orb routes** | advanced, agents, automation, knowledge (+ agents/[id]) | Same shell family as History — warn-only debt today |
| **Finance legacy orb routes** | 10 remaining detail/create routes | Shell family — **not** visual migration; separate from parity audit priority |

**AgentOps is the primary page-family parity gap**, not Finance loaded detail.

---

## 14. Individual page debt (Category C)

- AgentOps Control Center: metrics section placement, readiness grid cards, extreme section count
- AgentOps History: summary grid, info block placement, collapsible details styling
- Finance detail pages: SmartLayout sidebar/content split per document type (acceptable within shell)

---

## 15. Viewport / data / state differences (Category D)

- Loaded vs loading vs not-found states differ visually (Batch 6–8 finance proofs affect former two only)
- Registry list vs detail vs hub are different page archetypes
- Owner auth required for AgentOps — non-owner would show empty states (not tested this session)
- 1280×800 viewport truncates wide metric rows

---

## 16. Batch 9 finance proof routes — remain paused?

**Yes — remain PAUSED.**

Audit confirms:

- Finance **hub** and **loaded detail** already match reference at shell/hero/meta level.
- Visible inconsistency is **AgentOps History (orb + default hero)** and **AgentOps hub (metrics/meta placement)** — not finance loading branches.
- Continuing finance shell proofs **does not** close G-01 through G-08.

---

## 17. Recommended next batch

**Batch 9 (revised): AgentOps Page-Family Shell Parity Plan — documentation + shared prep only**

1. **Write** `AIXIA_AGENTOPS_SHELL_PARITY_PLAN.md` — ordered migration for History → hub → remaining 5 orb routes; **no JSX edits in Batch 9**.
2. **Shared prep (Batch 10 candidate):** one shared-layer change only if audit-approved:
   - Option A: `AixiaHero` default `surface="command"` for dashboard routes (P0-03)
   - Option B: Extract `AgentOpsHubMetaStrip` usage pattern from Council into documented template
3. **Visual parity browser QA script (Batch 10 candidate):** Playwright smoke that asserts DOM classes (`aixia-command-page`, `aixia-command-hub-meta`, hero command surface) on Finance + Council + History — fails today on History by design.
4. **Do not:** another finance shell proof route; local History hero patch without plan; “fix one page visually” without shared layer proof.

**Priority order:**

1. Shared hero default surface (P0-03) — prevents new drift  
2. AgentOps History page-family shell migration (single route, full shell — **when migration unfrozen**)  
3. AgentOps hub meta + hero metrics alignment  
4. Guardrail escalation for AgentOps orb routes (when ≤3 remain)  
5. Finance legacy orb routes — **lowest visual parity priority**

---

## 18. What “standardize all pages” means (this project)

| Means | Does not mean |
|-------|----------------|
| One CSS + component + doc authority | Patching finance routes one-by-one |
| Finance hub/detail as **reference pattern** | Finance is the migration target |
| All modules use command shell + command hero + hub meta + command scroll | Random local Tailwind card grids |
| Page families migrate via shared shells | Loaded JSX restructure without shared primitive |
| Guardrails enforce SOT | Guardrail count reduction alone |

**Page migrations remain frozen** until shared P0 gaps are closed and a family plan is approved. This audit does **not** unfreeze migrations.

---

## 19. Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only task) |

---

## 20. Final check

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` |
| 2 | Files modified | **None** |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Finance pages changed | **No** |
| 6 | AgentOps pages changed | **No** |
| 7 | Routes inspected | 6 routes (see §2) |
| 8 | Root causes classified | **Yes** (§11) |
| 9 | Shared-layer gaps identified | **Yes** (§12) |
| 10 | Page-family migration gaps identified | **Yes** (§13) |
| 11 | Individual page debt identified | **Yes** (§14) |
| 12 | Batch 9 remains paused | **Yes** |
| 13 | Command results | `qa:validate-foundation` PASS |
| 14 | Final status | Audit complete — direction is **AgentOps shell parity + shared hero default**, not finance shell proofs |
| 15 | Recommended next batch | AgentOps Shell Parity Plan (doc) → shared P0-03 hero default → History shell migration when approved |

---

## Summary for Piter

- **Finance hub and loaded finance detail already follow the locked standard** at shell/hero/meta level.
- **AgentOps History is the clearest visual outlier** (orb background, gradient hero, no meta strip) — this matches the “different product” screenshot concern.
- **AgentOps Control Center** uses command shell but puts KPIs in the scroll body and skips the hub meta strip — second-largest gap.
- **Council is the AgentOps reference** — closest to Finance rhythm.
- **Batch 6–8 finance changes did not cause loaded-page card/section drift** — those pages were not restructured.
- **Next work should target AgentOps page-family shell parity and shared hero defaults**, not another finance loading-branch wrap.
