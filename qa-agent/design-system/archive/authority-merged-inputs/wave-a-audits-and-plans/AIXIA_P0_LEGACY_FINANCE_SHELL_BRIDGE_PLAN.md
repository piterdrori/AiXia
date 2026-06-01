<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/03-page-shell-standard.md, src/design-system/aixia-global/13-module-wrapper-rules.md, src/design-system/aixia-global/14-page-migration-rules.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file records a **legacy finance shell bridge plan**. It **must not** override owner files or authorize route migrations.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`03-page-shell-standard.md`](../../src/design-system/aixia-global/03-page-shell-standard.md) — page shell
> - [`13-module-wrapper-rules.md`](../../src/design-system/aixia-global/13-module-wrapper-rules.md) — finance module wrapper
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — page migration
>
> - If this plan conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# P0 — Legacy Finance Shell Bridge Plan (Batch 5)

**Status:** Plan only — no route migrations in Batch 5  
**Date:** 2026-05-29

---

## Problem

`FinanceModuleBridgeLoader` loads finance bridge CSS for all `/finance` routes via `DashboardLayout`, but **13 legacy detail/create routes** still render plain `<AixiaPage>` without `.aixia-finance-page` from `FinancePage` / `AixiaCommandPage`.

Bridge CSS applies under `.aixia-finance-page` selectors — legacy orb shells miss scoped hub meta, scroll rhythm, and finance token lane.

---

## 13 legacy routes (re-verified Batch 5)

| Route | Current shell | Pattern | Risk |
|-------|---------------|---------|------|
| `finance/master-data/vendors/new` | `<AixiaPage>` orb | Create form + hero badges | **High** — mixed hero/meta |
| `finance/transactions/expense-review/[id]` | `<AixiaPage>` orb (×2 branches) | Detail workflow | **High** |
| `finance/transactions/expense-funding/[id]` | `<AixiaPage>` orb | Detail | **Medium** |
| `finance/transactions/expense-payments/[id]` | `<AixiaPage>` orb (×2) | Detail | **High** |
| `finance/transactions/invoices/[id]` | `<AixiaPage>` orb | Detail | **Medium** |
| `finance/transactions/paycheck-requests/[id]` | Mixed `<AixiaPage>` + inner `FinancePage` | Split shell | **High** |
| `finance/transactions/payroll/funding-batches/[id]` | `<AixiaPage>` orb | Detail | **Medium** |
| `finance/transactions/payroll/new` | `<AixiaPage>` orb | Create | **High** |
| `finance/transactions/payroll/review/[id]` | `<AixiaPage>` orb | Review detail | **Medium** |
| `finance/transactions/payroll/[id]` | `<AixiaPage>` orb | Detail | **Medium** |
| `finance/transactions/proforma-invoices/[id]` | `<AixiaPage>` orb | Detail | **Medium** |
| `finance/transactions/purchase-orders/[id]` | `<AixiaPage>` orb | Detail | **Medium** |
| `finance/transactions/quotations/[id]` | `<AixiaPage>` orb (×2) | Detail | **High** |

All listed in `LEGACY_SHELL_HERO_DEBT_FILES` (guardrail warn-only).

---

## What already works (no page edit)

| Mechanism | Scope |
|-----------|--------|
| `FinanceModuleBridgeLoader` | Loads `register-finance-bridge-styles.ts` on all `/finance` |
| Shared hub meta CSS | Applies when `.aixia-finance-page` present |
| Guardrails G-01/G-02 | Warn on legacy routes; **error** on new non-legacy routes |

---

## Recommended migration strategy (future batch — P0 Batch 6+)

### Phase F-1 — Shell-only wrap (preferred)

Replace outer `<AixiaPage>` with `<FinancePage>` **without** moving hero sections, handlers, or Supabase logic.

- Same children, same class names on scroll body where possible
- Map scroll to `.aixia-finance-page-scroll` via `FinancePage` default
- One route per batch with build + browser check vs `/finance`

### Phase F-2 — Mixed-shell cleanup

`paycheck-requests/[id]` — remove duplicate outer `AixiaPage`; single `FinancePage` wrapper.

### Phase F-3 — Create routes last

`vendors/new`, `payroll/new` — hero badge/statusCards debt; shell wrap + hero surface in same controlled batch.

### Deferred (too risky for silent bridge)

- **FinanceShellBridge class injection** on `DashboardLayout` body — would apply `.aixia-finance-page` globally under `/finance` and break non-finance-scoped command pages if any exist
- **Automatic DOM wrapper** without JSX change — not supported

---

## Batch 5 non-changes (confirmed)

- No finance route JSX edited
- No `FinancePage` wraps added
- No hero/meta/layout changes on finance pages
- Bridge loader unchanged

---

## Next batch recommendation

**P0 Batch 6:** Shell-only wrap on **one** medium-risk route (e.g. `invoices/[id]`) as proof; expand to remaining 12 in groups of 3–4 after browser parity vs `/finance`.
