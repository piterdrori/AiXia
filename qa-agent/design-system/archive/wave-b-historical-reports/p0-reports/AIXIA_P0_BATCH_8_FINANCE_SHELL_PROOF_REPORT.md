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

# P0 Batch 8 — Finance Shell Proof Report

**Date:** 2026-05-29  
**Scope:** One finance shell-only proof route — no layout redesign, no visual migration, no business logic changes.

---

## Purpose

Continue P0 design authority consolidation by applying the established Batch 6/7 finance shell bridge pattern to `proforma-invoices/[id]`, reducing shell warning debt by one without touching loaded page content.

---

## Route inspection (Part 1)

| Field | Value |
|-------|-------|
| **Selected route** | `src/app/finance/transactions/proforma-invoices/[id]/page.tsx` |
| **Warning reason** | One orb `<AixiaPage>` instance (not-found branch only) |
| **Current shell type** | Happy path: `AixiaFinanceCommandDetailPage` → `FinancePage`; loading: bare `AixiaLoadingState`; not-found: orb `<AixiaPage>` |
| **Branches using `AixiaPage`** | Not-found only (`!proforma \|\| !totals`) |
| **Loaded page shell** | `AixiaFinanceCommandDetailPage` (line ~3293) |
| **Hero debt in file** | None (`AixiaHero` not used) |
| **Safe?** | **Yes** — identical low-risk pattern to `invoices/[id]` and `purchase-orders/[id]` |
| **Intended change** | Wrap loading + not-found in `FinancePage`; remove `AixiaPage` import |
| **Non-changes** | `AixiaFinanceCommandDetailPage` block, Supabase, handlers, SmartLayout, print, archive, permissions, routing |

---

## Shell-only change (Part 2)

| Branch | Before | After |
|--------|--------|-------|
| Loading (`isLoading`) | Bare `AixiaLoadingState` | `FinancePage` + `AixiaLoadingState fullPage={false}` |
| Not found (`!proforma \|\| !totals`) | `<AixiaPage>` + `AixiaEmptyState` | `FinancePage` + same `AixiaEmptyState` |

**Loaded page path:** `AixiaFinanceCommandDetailPage` return block — **untouched**.  
**Logic:** data fetching, conditions, handlers — **unchanged**.

---

## Files created

| File | Role |
|------|------|
| `qa-agent/design-system/AIXIA_P0_BATCH_8_FINANCE_SHELL_PROOF_REPORT.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `src/app/finance/transactions/proforma-invoices/[id]/page.tsx` | Loading/not-found → `FinancePage` shell wrap |
| `scripts/guardrails/aixia-guardrail-allowlists.mjs` | Remove proforma-invoices from `LEGACY_SHELL_HERO_DEBT_FILES` |
| Memory files (×3) | Batch 8 status |

---

## Guardrail counts before/after (Part 3)

| Metric | Batch 7 | Batch 8 | Notes |
|--------|---------|---------|-------|
| Shell warnings (legacy) | 17 | **16** | −1 (proforma-invoices orb removed) |
| Hero warnings (legacy) | 15 | **15** | Unchanged |
| shadcn boundary errors | 0 | **0** | Clean |
| PageLoader app usages | 0 | **0** | Unchanged |
| Static findings | 186 | **185** | −1 |

---

## Browser spot-check (Part 4)

Dev server: **UP** at http://127.0.0.1:5173/

| Route | Result |
|-------|--------|
| `/finance/transactions/proforma-invoices/test-id` | Not-found state renders ("Proforma invoice not found") — no crash |
| `/finance` | HTTP 200 |
| `/system/agent-ops` | HTTP 200 |
| `/system/agent-ops/history` | HTTP 200 |
| `/system/agent-ops/council` | HTTP 200 |

No obvious visual break or horizontal scroll introduced on checked routes.

---

## Confirmations

| Check | Result |
|-------|--------|
| Page migrations | **No** |
| Finance visual migration | **No** |
| Finance business logic changed | **No** |
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
| `npm run qa:static-design-guardrails` | **PASS** (185 findings) |
| `npm run qa:guardrail-action-plan` | **PASS** |

---

## Changes deferred

- Remaining 10 finance legacy orb routes
- 6 AgentOps orb shell routes on legacy debt list
- Full proforma-invoices loaded-page scroll-body alignment (visual parity notes only)
- Guardrail hard-error promotion for finance prefix (when orb count ≤ 3)

---

## Next recommended P0/P1 batch (Batch 9)

**P0 remains open.** Continue shared consolidation:

1. Finance shell proof on next medium-risk route with loading/not-found-only orb usage (e.g. `payroll/[id]`, `payroll/review/[id]`, or `payroll/funding-batches/[id]`)
2. Remove cleared routes from `LEGACY_SHELL_HERO_DEBT_FILES` as each proof completes
3. When legacy finance orb count ≤ 3, evaluate path-scoped shell warning → error promotion per `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md`
4. Do **not** start broad page migration or AgentOps layout work
