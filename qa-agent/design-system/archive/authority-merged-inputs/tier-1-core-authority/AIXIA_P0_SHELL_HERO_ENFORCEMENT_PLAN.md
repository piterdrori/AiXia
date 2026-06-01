<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/03-page-shell-standard.md, src/design-system/aixia-global/04-hero-header-standard.md, src/design-system/aixia-global/15-guardrail-rules.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged into:
>
> - [`03-page-shell-standard.md`](../../src/design-system/aixia-global/03-page-shell-standard.md) — page shell
> - [`04-hero-header-standard.md`](../../src/design-system/aixia-global/04-hero-header-standard.md) — hero / header
> - [`15-guardrail-rules.md`](../../src/design-system/aixia-global/15-guardrail-rules.md) — guardrail rules
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# P0-01 / P0-02 / P0-03 — Shell & Hero Default Enforcement Plan

**Status:** Plan only (Batch 1) — no mass route edits  
**Batch:** P0 Batch 1 (2026-05-29)

---

## Problems

| ID | Issue | Root cause |
|----|-------|------------|
| P0-01 | Dual page atmosphere | `AixiaPage` `surface` defaults to `"default"` (orb marketing background) |
| P0-02 | Four shell wrappers | Pages use `AixiaPage`, `FinancePage`, `AixiaCommandPage`, `AixiaCommandPageLayout` inconsistently |
| P0-03 | Dual hero typography | `AixiaHero` `surface` defaults to `"default"` (gradient XL / marketing scale) |

Authenticated dashboard routes therefore drift from Finance command rhythm without page-level hacks.

---

## Locked rule (documentation)

Under `DashboardLayout`, **authenticated product modules** must use:

```
AixiaCommandPage | FinancePage | AixiaCommandPageLayout
  → AixiaHero surface="command"
  → .aixia-command-scroll
  → AixiaCommandHubMetaStrip (when meta row needed)
```

Reference: `AIXIA_PAGE_SHELL_HERO_STANDARD.md`.

**Exceptions (explicit):** `/login`, auth callbacks, marketing/landing if any, print-only views — may keep non-command surfaces until `AixiaAuthShell` exists.

---

## Safe default changes (later batches — not Batch 1)

| Component | Current default | Proposed change | Risk |
|-----------|-----------------|-----------------|------|
| `AixiaPage` | `surface="default"` | **Do not change globally** — breaks auth/marketing if used outside dashboard | High |
| `AixiaHero` | `surface="default"` | Change default to `"command"` **only after** audit of non-dashboard `AixiaHero` usages | Medium |
| `FinancePage` | wraps `AixiaCommandPage` | Already correct | None |
| `AixiaCommandPage` | command surface | Already correct | None |

**Batch 1 decision:** No prop default changes in code — guardrails and docs only.

---

## Wrapper consolidation target (P0-02)

| Wrapper | Role |
|---------|------|
| `AixiaCommandPage` | Canonical command shell (3D stack) |
| `FinancePage` | `AixiaCommandPage` + `aixia-finance-page` + finance CSS register |
| `AixiaCommandPageLayout` | Structured slots (`hero`, `scrollLead`, `children`) |
| Raw `AixiaPage surface="command"` | **Deprecate** in app routes — migrate to `AixiaCommandPage` in P0 Batch 2+ |
| Raw `AixiaPage` default | **Forbidden** under dashboard except legacy finance (13 routes) until wrapped |

---

## Enforcement guardrails (planned)

1. **ESLint / guardrail script:** Flag `AixiaPage` without `surface="command"` under `src/app` excluding `login`, `auth`, `public`
2. **Flag** `AixiaHero` without `surface="command"` under `src/app` dashboard paths
3. **Flag** `AixiaPage` default surface when parent route is under `/finance`, `/system`, `/projects`, etc.
4. Tie `npm run qa:static-design-guardrails` to P0-01/P0-03 after defaults are safe

---

## Legacy finance debt (blocks blind default flip)

~13 finance routes still use `<AixiaPage>` without `FinancePage` (orb shell + no `aixia-finance-page`). Fixing requires **Finance shell migration** (frozen until P0 CSS/doc complete). List in `AIXIA_P0_BATCH_1_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md`.

---

## Batch 2+ recommended order

1. P0-04 complete (finance layout wrapper for legacy `AixiaPage` routes OR finance route layout import)
2. P0-03 — `AixiaHero` default `surface="command"` + audit exceptions
3. P0-01 — guardrail + optional `AixiaAppPage` wrapper that forces command under dashboard
4. P0-02 — deprecate raw command `AixiaPage` in app

Do not resume Council/History page patches until P0-01–P0-05 are **Done** in backlog.
