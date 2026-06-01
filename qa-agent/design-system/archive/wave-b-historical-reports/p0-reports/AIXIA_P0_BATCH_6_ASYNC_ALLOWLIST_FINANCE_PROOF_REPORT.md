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

# P0 Batch 6 — Async Allowlist & Finance Proof Report

**Date:** 2026-05-29  
**Scope:** Primitive-only async swap (Council/History), PageLoader allowlist removal, one finance shell proof — no layout redesign, no visual migration.

---

## Purpose

1. Replace final Council/History `PageLoader` with `AixiaAsyncState`
2. Remove PageLoader shadcn allowlist entries
3. Prove finance shell bridge on one low-risk legacy route (`invoices/[id]`)
4. Confirm guardrail debt direction

---

## Files created

| File | Role |
|------|------|
| `qa-agent/design-system/AIXIA_P0_BATCH_6_ASYNC_ALLOWLIST_FINANCE_PROOF_REPORT.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `src/app/system/agent-ops/council/page.tsx` | `PageLoader` → `AixiaAsyncState` |
| `src/app/system/agent-ops/history/page.tsx` | `PageLoader` → `AixiaAsyncState` |
| `src/app/finance/transactions/invoices/[id]/page.tsx` | Loading/not-found → `FinancePage` shell wrap |
| `scripts/guardrails/aixia-guardrail-allowlists.mjs` | Empty PageLoader defer set; remove invoices from legacy shell debt |
| Memory files (×3) | Batch 6 status |

---

## Council/History async replacement result

| Route | Status | Layout preserved |
|-------|--------|------------------|
| `council/page.tsx` | **Replaced** | Yes — same `loading`, `fallback` (`AixiaEmptyState`), children |
| `history/page.tsx` | **Replaced** | Yes — same loading div fallback, same section tree |

**Business logic:** unchanged (data fetching, routing, actions untouched).

---

## PageLoader usage / allowlist result

| Metric | Batch 5 | Batch 6 |
|--------|---------|---------|
| App `PageLoader` usages | 2 (council, history) | **0** |
| Allowlist entries | 2 | **0** (empty set) |
| `PageLoader.tsx` component | Retained | Retained (unused in app) |

**shadcn boundary:** 0 warnings, 0 errors (build PASS).

---

## Finance shell-only proof route

**Selected:** `src/app/finance/transactions/invoices/[id]/page.tsx`

**Why low risk:**
- Medium risk per bridge plan; happy path already uses `AixiaFinanceCommandDetailPage` → `FinancePage`
- Only loading and not-found branches used orb `<AixiaPage>`
- No hero/badge debt on those branches
- Single-file, two early-return branches only

**Shell-only changes:**

```tsx
// Loading: FinancePage + AixiaLoadingState fullPage={false}
// Not found: FinancePage + same AixiaEmptyState
```

**Non-changes:**
- Main `AixiaFinanceCommandDetailPage` return block unchanged
- All Supabase, permissions, handlers, SmartLayout, print, archive logic unchanged
- No hero/meta/section visual edits

**Bridge context result:** Loading and error states now receive `.aixia-finance-page` and finance scroll class via `FinancePage`.

**Future:** Apply same pattern to remaining 12 legacy routes (one batch per route or small groups).

---

## Guardrail counts before/after

| Metric | Batch 5 | Batch 6 | Notes |
|--------|---------|---------|-------|
| PageLoader app usages | 2 | **0** | Allowlist cleared |
| shadcn boundary errors | 0 | **0** | Clean |
| Shell warnings (legacy) | 19 | **18** | invoices orb removed |
| Hero warnings (legacy) | 15 | **15** | Unchanged |
| Static findings | 190 | **187** | −3 |

**Changed guardrail behavior:** None (allowlist emptied; legacy debt set minus invoices).

**Remaining blockers:** 12 finance orb routes, 6 AgentOps orb routes, legacy hero debt on those routes.

---

## Confirmations

| Check | Result |
|-------|--------|
| Page migrations | **No** |
| Council redesigned | **No** |
| History redesigned | **No** |
| Finance visual migration | **No** |
| Finance business logic changed | **No** |
| Supabase/RLS/schema changed | **No** |
| Production/main touched | **No** |

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (187 findings) |
| `npm run qa:guardrail-action-plan` | **PASS** |

### Browser spot-check

- `/system/agent-ops/council` — loads
- `/system/agent-ops/history` — loads
- `/finance` — (existing server)
- `/system/agent-ops` — (existing server)

---

## Next recommended P0/P1 batch (Batch 7)

**P0 remains open.** Continue shared consolidation:

1. Finance shell proof on next medium-risk route (e.g. `purchase-orders/[id]` or `expense-funding/[id]`)
2. Remove cleared routes from `LEGACY_SHELL_HERO_DEBT_FILES` as each proof completes
3. When legacy finance orb count ≤ 3, promote shell warnings to errors for finance prefix
4. Do **not** start broad page migration or Council/History layout work

---

## Deferred

- Remaining 12 finance legacy orb routes
- AgentOps orb shell migration (6 routes)
- PageLoader component deletion (unused but kept for reference)
- Full invoices route scroll-body alignment (visual parity guardrail note on loading branch only)
