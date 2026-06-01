<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-historical-report-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Historical report only — not current design law**
>
> This qa-agent file is **batch/phase execution evidence or audit history**. It is **not** active AiXia design authority.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this report conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval** (see `16-design-file-cleanup-map.md`).
>
> **Role:** historical report / execution evidence.

# P0 Batch 2 — Shared Authority Cleanup Report

**Date:** 2026-05-29  
**Scope:** Shared design authority only — no page migrations, no Council/Finance/History route patches, no Supabase/RLS, no production/main.

---

## Purpose

Continue P0 consolidation after Batch 1: finish finance bridge loading for legacy finance routes, promote `AixiaCommandHubMetaStrip` to canonical component, unify scroll CSS aliases, and document guardrail enforcement — without unfreezing page migrations.

---

## Files created

| File | Role |
|------|------|
| `src/components/aixia/AixiaCommandHubMetaStrip.tsx` | Canonical meta strip component |
| `src/components/aixia/FinanceModuleBridgeLoader.tsx` | Route-scoped finance CSS loader |
| `qa-agent/design-system/AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` | P0-06 audit + alias notes |
| `qa-agent/design-system/AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | P0-01/P0-03 guardrail rules |
| `qa-agent/design-system/AIXIA_P0_BATCH_2_SHARED_AUTHORITY_CLEANUP_REPORT.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `src/components/aixia/AixiaFinanceHubMetaStrip.tsx` | Thin finance wrapper (`variant="finance"` default) |
| `src/components/aixia/AixiaRuntimeStatusStrip.tsx` | `hub-meta` delegates to `AixiaCommandHubMetaStrip` |
| `src/components/aixia/index.ts` | Export command meta from canonical file |
| `src/components/layout/DashboardLayout.tsx` | Mount `FinanceModuleBridgeLoader` on `/finance` routes |
| `src/styles/dashboard/layout.css` | Scroll class aliases (P0-06) |
| Memory files (×3) | Batch 2 status |

---

## P0 items addressed

| ID | Batch 2 outcome |
|----|-----------------|
| **P0-04** | **Partial → improved** — `FinanceModuleBridgeLoader` loads bridge CSS for all `/finance` routes including legacy `AixiaPage` routes |
| **P0-05** | **Partial → improved** — canonical `AixiaCommandHubMetaStrip.tsx`; finance alias wrapper; runtime `hub-meta` delegates |
| **P0-06** | **Partial** — scroll aliases unified in `layout.css`; module overrides documented |
| **P0-01 / P0-03** | **Plan** — guardrail proposal doc with G-01/G-02/G-03 rules |

---

## Legacy finance bridge findings (P0-04)

### Routes still using plain `<AixiaPage>` (no `FinancePage` shell)

| Route | Bridge CSS (Batch 2) | `.aixia-finance-page` class | Safe to wrap later? | Notes |
|-------|----------------------|----------------------------|---------------------|-------|
| `transactions/expense-review/[id]` | Yes (layout loader) | **No** | Medium | Large legacy hero (badges, statusCards); high regression risk |
| `transactions/payroll/new` | Yes | **No** | Medium | Legacy payroll create |
| `transactions/proforma-invoices/[id]` | Yes | **No** | Medium | Detail + print |
| `transactions/paycheck-requests/[id]` | Yes | **Partial** | Low | Mixed: inner `FinancePage` + outer `AixiaPage` |
| `transactions/quotations/[id]` | Yes | **No** | Medium | Legacy detail |
| `transactions/expense-payments/[id]` | Yes | **No** | Medium | Legacy detail |
| `transactions/payroll/funding-batches/[id]` | Yes | **No** | Medium | Legacy payroll |
| `transactions/expense-funding/[id]` | Yes | **No** | Medium | Legacy detail |
| `transactions/purchase-orders/[id]` | Yes | **No** | Medium | Legacy detail |
| `transactions/invoices/[id]` | Yes | **No** | Medium | Legacy detail |
| `transactions/payroll/review/[id]` | Yes | **No** | Medium | Legacy payroll |
| `transactions/payroll/[id]` | Yes | **No** | Medium | Legacy payroll |
| `master-data/vendors/new` | Yes | **No** | **High** | Smallest surface — good pilot for shell-only wrap |

**Batch 2 fix:** `FinanceModuleBridgeLoader` in `DashboardLayout` when `pathname.startsWith("/finance")` — one shared change, zero page files touched.

**Remaining blocker:** Finance bridge CSS is mostly scoped to `.aixia-finance-page`. Legacy orb pages still **do not receive** command hero typography / meta grid rules until wrapped in `FinancePage` (shell migration — frozen until P0 complete).

**Batch 3 plan:** Shell-only wrap pilot on `master-data/vendors/new` OR controlled allowlist; not broad migration.

---

## Meta strip cleanup findings (P0-05)

### Call sites (`AixiaFinanceHubMetaStrip` / `AixiaCommandHubMetaStrip`)

| Area | Files | Variant |
|------|-------|---------|
| Finance hub/registry | `finance/page.tsx`, `transactions/page.tsx`, registry pages (~25) | default (`finance`) |
| Finance detail/command shells | `AixiaFinanceCommandCreatePage`, `AixiaFinanceCommandDetailPage`, payment detail pages | default |
| Finance workbench | `FinancePayrollWorkbench.tsx` | default |
| AgentOps | `system/agent-ops/council/page.tsx` | `command` |
| Calendar | `calendar/page.tsx` | default |
| **Runtime strip `hub-meta`** | **0 app call sites** | delegates if used |

### Changes made

- `AixiaCommandHubMetaStrip.tsx` — canonical implementation
- `AixiaFinanceHubMetaStrip` — wrapper with `variant="finance"` default
- `AixiaRuntimeStatusStrip` `variant="hub-meta"` — delegates to command strip (no duplicate grid markup)

### Remains

- Rename imports at call sites from `AixiaFinanceHubMetaStrip` → `AixiaCommandHubMetaStrip` (optional P1 cleanup)
- Council still imports finance-named component with `variant="command"` — works; rename deferred
- CSS: `.aixia-finance-hub-meta` (finance-visual) vs `.aixia-command-hub-meta` (design-system) — intentional dual class under different page roots

---

## Scroll class findings (P0-06)

See `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md`.

**Duplicates unified (Batch 2):** `.aixia-command-page-scroll`, `.aixia-finance-page-scroll`, `.aixia-finance-scroll`, `.aixia-inbox-scroll` added to canonical scroll rule groups in `layout.css`.

**Deferred:** Module-specific overrides in `finance-visual.css`, `projects-visual.css`, `tasks-visual.css`.

---

## Guardrail prep findings (P0-01 / P0-03)

See `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md`.

- Proposed G-01 (command shell) and G-02 (hero `surface="command"`) as **warnings** in Batch 3
- Default prop changes still **deferred**
- False positives documented (auth, ai-management, legacy finance list)

---

## Changes deferred

- FinancePage shell wrap for 13 legacy routes (page migration — frozen)
- Guardrail G-01/G-02 implementation in scripts (Batch 3)
- Remove `hub-meta` variant entirely (after zero call sites confirmed)
- Retire `.aixia-finance-scroll` class name
- P0-07 shadcn boundary

---

## Page migrations confirmation

**None.** No `src/app/**` page files modified.

---

## Risk notes

1. `FinanceModuleBridgeLoader` loads finance CSS on every finance route visit — intentional; Vite dedupes module graph.
2. Finance meta default preserved via wrapper — finance pages unchanged behavior.
3. DashboardLayout change is layout-only — no finance business logic.

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (164 findings; pre-existing) |
| `npm run qa:guardrail-action-plan` | **PASS** |

**Browser spot-check:** Recommended on dev server — `/finance`, `/system/agent-ops/council`, `/system/agent-ops`, `/system/agent-ops/agents`.

---

## Next recommended P0 batch (Batch 3)

1. Implement G-02 hero surface warning in `aixia-visual-parity.mjs`
2. Remove duplicate meta strip CSS overlap audit (command vs finance grid)
3. P0-07 shadcn vs AiXia shell boundary doc
4. Optional: shell-only pilot wrap for `master-data/vendors/new` when migration freeze lifts for allowlisted routes

**Do not** resume Council/History/AgentOps page migration until P0 backlog items are closed.
