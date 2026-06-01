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

# P0 Batch 7 — Finance Shell Proof Report

**Date:** 2026-05-29  
**Scope:** One finance shell-only proof route — no layout redesign, no visual migration, no business logic changes.

---

## Purpose

Continue P0 design authority consolidation by proving the Batch 6 finance shell bridge pattern on the next lowest-risk legacy route, reducing shell warning debt by one without touching loaded page content.

---

## Route selection (Part 1)

| Field | Value |
|-------|-------|
| **Selected route** | `src/app/finance/transactions/purchase-orders/[id]/page.tsx` |
| **Warning reason** | One orb `<AixiaPage>` instance (not-found branch only) |
| **Current shell type** | Happy path: `AixiaFinanceCommandDetailPage` → `FinancePage`; loading: bare `AixiaLoadingState`; not-found: orb `<AixiaPage>` |
| **Why low risk** | Medium risk per bridge plan; only one orb usage; no `AixiaHero` on file; loaded detail already uses shared finance command detail shell |
| **Intended change** | Wrap loading + not-found branches in `FinancePage`; remove `AixiaPage` import |
| **Non-changes** | `AixiaFinanceCommandDetailPage` block, Supabase, handlers, SmartLayout, print, archive, permissions, routing |

**Alternatives considered:** `proforma-invoices/[id]` (same pattern, deferred to Batch 8); `expense-funding/[id]` (full-page orb — higher risk).

---

## Shell-only change (Part 2)

| Branch | Before | After |
|--------|--------|-------|
| Loading (`isLoading`) | Bare `AixiaLoadingState` | `FinancePage` + `AixiaLoadingState fullPage={false}` |
| Not found (`!purchaseOrder`) | `<AixiaPage>` + `AixiaEmptyState` | `FinancePage` + same `AixiaEmptyState` |

**Loaded page path:** `AixiaFinanceCommandDetailPage` return block — **untouched**.  
**Logic:** data fetching, conditions, handlers — **unchanged**.

---

## Files created

| File | Role |
|------|------|
| `qa-agent/design-system/AIXIA_P0_BATCH_7_FINANCE_SHELL_PROOF_REPORT.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `src/app/finance/transactions/purchase-orders/[id]/page.tsx` | Loading/not-found → `FinancePage` shell wrap |
| `scripts/guardrails/aixia-guardrail-allowlists.mjs` | Remove purchase-orders from `LEGACY_SHELL_HERO_DEBT_FILES` |
| Memory files (×3) | Batch 7 status |

---

## Guardrail counts before/after (Part 3)

| Metric | Batch 6 | Batch 7 | Notes |
|--------|---------|---------|-------|
| Shell warnings (legacy) | 18 | **17** | −1 (purchase-orders orb removed) |
| Hero warnings (legacy) | 15 | **15** | Unchanged |
| shadcn boundary errors | 0 | **0** | Clean |
| PageLoader app usages | 0 | **0** | Unchanged |
| Static findings | 187 | **186** | −1 |

---

## Browser spot-check (Part 4)

Dev server: **UP** at http://127.0.0.1:5173/

| Route | Result |
|-------|--------|
| `/finance/transactions/purchase-orders/test-id` | Not-found state renders ("Purchase order not found") — no crash |
| `/finance` | HTTP 200 |
| `/system/agent-ops` | HTTP 200 |
| `/system/agent-ops/history` | HTTP 200 |
| `/system/agent-ops/council` | Loads (Council content present) |

No obvious visual break or horizontal scroll introduced on checked routes.

---

## Confirmations

| Check | Result |
|-------|--------|
| Page migrations | **No** |
| Finance visual migration | **No** |
| Finance business logic changed | **No** |
| Council redesigned | **No** |
| History redesigned | **No** |
| AgentOps redesigned | **No** |
| Supabase/RLS/schema changed | **No** |
| Production/main touched | **No** |
| Runtime systems activated | **No** |

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (186 findings) |
| `npm run qa:guardrail-action-plan` | **PASS** |

---

## Changes deferred

- Remaining 11 finance legacy orb routes
- 6 AgentOps orb shell routes on legacy debt list
- Full purchase-orders loaded-page scroll-body alignment (visual parity notes only)
- Guardrail hard-error promotion for finance prefix (when orb count ≤ 3)

---

## Next recommended P0/P1 batch (Batch 8)

**P0 remains open.** Continue shared consolidation:

1. Finance shell proof on next medium-risk route (e.g. `proforma-invoices/[id]` — same loading/not-found pattern as purchase-orders)
2. Remove cleared routes from `LEGACY_SHELL_HERO_DEBT_FILES` as each proof completes
3. When legacy finance orb count ≤ 3, evaluate path-scoped shell warning → error promotion per `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md`
4. Do **not** start broad page migration or Council/History/AgentOps layout work
