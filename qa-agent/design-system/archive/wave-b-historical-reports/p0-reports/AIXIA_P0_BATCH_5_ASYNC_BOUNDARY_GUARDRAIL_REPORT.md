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

# P0 Batch 5 — Async, Boundary & Guardrail Report

**Date:** 2026-05-29  
**Scope:** Shared design authority only — no page shell migrations, no Council/History layout patches.

---

## Purpose

1. Add shared async/loading wrapper (`AixiaAsyncState`) to replace product-page `PageLoader`
2. Promote shadcn boundary to path-scoped **build hard error** on clean finance/agent-ops paths
3. Document legacy finance shell bridge plan (13 routes)
4. Audit calendar scroll family
5. Add new-file / non-legacy shell/hero hard errors while preserving legacy warn-only debt

---

## Files created

| File | Role |
|------|------|
| `src/components/aixia/AixiaAsyncState.tsx` | Shared async gate (PageLoader API + optional default UI) |
| `qa-agent/design-system/AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md` | 13-route shell bridge plan |
| `qa-agent/design-system/AIXIA_P0_CALENDAR_SCROLL_AUDIT.md` | Calendar scroll audit |
| `qa-agent/design-system/AIXIA_P0_BATCH_5_ASYNC_BOUNDARY_GUARDRAIL_REPORT.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `src/styles/aixia-design-system.css` | `.aixia-async-state*` CSS |
| `src/styles/dashboard/layout.css` | Calendar scroll extension comment |
| `src/components/aixia/index.ts` | Export `AixiaAsyncState` |
| `scripts/guardrails/aixia-guardrail-allowlists.mjs` | Legacy debt set, PageLoader defer files, error prefixes |
| `scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs` | Hard error on finance/agent-ops |
| `scripts/guardrails/aixia-shell-hero-guardrails.mjs` | Hard error on non-legacy routes |
| `scripts/aixia-guardrails.mjs` | `addHardError` + build exit on hard failures |
| 11 page files | `PageLoader` → `AixiaAsyncState` (primitive swap only) |
| Memory files (×3) | Batch 5 status |

---

## P0 items addressed

| ID | Outcome |
|----|---------|
| P0-07 async wrapper | **Done** — `AixiaAsyncState` |
| P0-07 shadcn boundary | **Done** — hard error on finance + agent-ops (build) |
| P0-04 finance shell | **Plan** — no route edits |
| P0-06 calendar scroll | **Audit** — no alias change |
| P0-01/03 guardrails | **Partial** — legacy warn-only + non-legacy hard error |

---

## PageLoader usage classification

| File | Classification | Batch 5 action |
|------|----------------|----------------|
| `dashboard/page.tsx` | Product loading (skeleton fallback) | **Replaced** → `AixiaAsyncState` |
| `projects/page.tsx` | Product loading | **Replaced** |
| `tasks/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/issues/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/issues/[issueCode]/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/agents/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/agents/[agentId]/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/automation/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/advanced/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/knowledge/page.tsx` | Product loading | **Replaced** |
| `system/agent-ops/council/page.tsx` | Product loading | **Deferred** — Council not patched |
| `system/agent-ops/history/page.tsx` | Product loading | **Deferred** — History not patched |
| `components/ui/PageLoader.tsx` | Legacy primitive | Retained for council/history |

All replacements preserve `loading`, `fallback`, and `children` props — no layout or fetch logic changes.

---

## Shared async/loading wrapper result

**Created:** `AixiaAsyncState`

Features:
- Drop-in `PageLoader` API (`loading`, `fallback`, `children`)
- Optional `title`, `description`, `variant` (inline/compact/panel)
- Optional `progress` + `AixiaProgressBar`
- AiXia glass styling via `.aixia-async-state*`
- No shadcn imports

---

## shadcn boundary escalation result

| Scope | Build level | QA scan level |
|-------|-------------|---------------|
| `src/app/finance/**` | **Error** | Warn |
| `src/app/system/agent-ops/**` | **Error** | Warn |
| Shell chrome (`DashboardLayout`, etc.) | Allowed | N/A |

**Allowlist:** `@/components/ui/PageLoader` only on:
- `src/app/system/agent-ops/council/page.tsx`
- `src/app/system/agent-ops/history/page.tsx`

| Metric | Batch 4 | Batch 5 |
|--------|---------|---------|
| shadcn boundary warnings (build) | 0 | **0** |
| shadcn boundary errors (build) | 0 | **0** (clean; would fail on new violation) |

---

## Legacy finance shell bridge plan

See `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md`.

- **13 routes** listed with shell type and risk
- **Recommended:** shell-only `FinancePage` wrap in Batch 6+ (one route proof first)
- **Batch 5:** no finance route JSX changes

---

## Calendar scroll audit result

See `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md`.

- Calendar hub already composes `aixia-command-scroll` + `aixia-calendar-scroll`
- In-cell stacks and popover scroll remain calendar-specific
- **No CSS alias changes** in Batch 5

---

## New-file-only shell/hero guardrail result

**Mode:** Legacy allowlist + hard error for all other app pages (build).

- `LEGACY_SHELL_HERO_DEBT_FILES` (19 routes) → **warn-only** (preserves 19 shell + 15 hero counts)
- Any other `src/app/**/page.tsx` with orb shell or non-command hero → **build hard error**
- QA static scan remains warn-only for all routes

| Metric | Batch 4 | Batch 5 |
|--------|---------|---------|
| Shell warnings (legacy) | 19 | **19** |
| Hero warnings (legacy) | 15 | **15** |
| Shell errors (non-legacy) | 0 | **0** |
| Hero errors (non-legacy) | 0 | **0** |

**False-positive notes:** New routes using `AixiaCommandPage` / `FinancePage` pass. Auth/login excluded. `ai-management/**` deferred.

---

## Changes made

- Created `AixiaAsyncState` + CSS
- Replaced PageLoader on 11 routes (dashboard, projects, tasks, 8 agent-ops — not council/history)
- shadcn boundary hard error on finance + agent-ops (build)
- Non-legacy shell/hero hard error (build)
- Legacy finance shell bridge plan + calendar scroll audit
- Memory updates

## Changes deferred

- Council/History PageLoader → AixiaAsyncState (Batch 6)
- Finance shell-only wraps (13 routes)
- Calendar CSS merge
- Legacy shell debt warn → error promotion

---

## Page migrations confirmation

**None.** Only loading primitive import/tag swap on 11 routes; fallbacks and children unchanged.

| Area | Patched? |
|------|----------|
| Council layout | **No** (PageLoader retained) |
| History layout | **No** (PageLoader retained) |
| Finance route visuals | **No** |
| AgentOps layout | **No** (async primitive only) |

---

## Risk notes

| Risk | Mitigation |
|------|------------|
| Hard error blocks new finance/agent-ops pages with ui imports | Intended regression guard |
| Council/history still on PageLoader allowlist | Documented defer until Batch 6 |
| Non-legacy hard shell error on new routes | Forces command shell from day one |

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (190 findings, was 198) |
| `npm run qa:guardrail-action-plan` | **PASS** |

### Browser spot-check

- `/finance` — loads
- `/system/agent-ops` — loads
- `/system/agent-ops/council` — loads
- `/system/agent-ops/agents` — loads

---

## Next recommended P0/P1 batch (Batch 6)

**P0 remains open.** Continue shared consolidation:

1. Replace PageLoader on council + history with `AixiaAsyncState` (layout-preserving primitive swap)
2. Shell-only `FinancePage` proof on one legacy route (`invoices/[id]`)
3. Remove PageLoader allowlist when council/history migrated
4. Promote legacy shell warnings to errors per-module as debt ≤ 3

**Do not** recommend broad page migration until P0 shell/CSS/guardrail debt is further reduced.
