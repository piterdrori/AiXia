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

# P0 Batch 3 — Guardrail & Boundary Report

**Date:** 2026-05-29  
**Scope:** Shared design authority enforcement — no page migrations, no Council/Finance/History route patches.

---

## Purpose

Add warn-only guardrails for shell/hero misuse (P0-01/P0-03), audit and warn on shadcn/ui boundary violations (P0-07), dedupe hub meta strip grid CSS (P0-05), and document scroll override status (P0-06).

---

## Files created

| File | Role |
|------|------|
| `scripts/guardrails/aixia-guardrail-allowlists.mjs` | Auth/deferred/shadcn allowlists |
| `scripts/guardrails/aixia-guardrail-utils.mjs` | JSX tag + import helpers |
| `scripts/guardrails/aixia-shell-hero-guardrails.mjs` | P0-01/P0-03 warnings |
| `scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs` | P0-07 warnings |
| `qa-agent/design-system/AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | shadcn boundary audit |
| `qa-agent/design-system/AIXIA_P0_BATCH_3_GUARDRAIL_BOUNDARY_REPORT.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `scripts/aixia-guardrails.mjs` | Wire shell/hero + shadcn guardrails (build) |
| `qa-agent/scripts/static-design-guardrails.mjs` | P0 rules + findings integration |
| `src/styles/aixia-design-system.css` | Shared hub meta grid for finance + command |
| `src/styles/finance/finance-visual.css` | Removed duplicate hub meta grid rules |
| `src/styles/dashboard/layout.css` | Scroll alias documentation comment |
| Memory files (×3) | Batch 3 status |

---

## P0 items addressed

| ID | Batch 3 outcome |
|----|-----------------|
| **P0-01** | **Partial** — warn-only orb `AixiaPage` detection (19 warnings) |
| **P0-03** | **Partial** — warn-only non-command `AixiaHero` (15 warnings) |
| **P0-07** | **Partial** — audit doc + warn on AgentOps `Progress` (1 warning) |
| **P0-05** | **Partial** — hub meta **grid** CSS deduped; cell chrome still split |
| **P0-06** | **Partial** — audit doc updated; module overrides documented |

---

## Guardrail warnings added

| Rule | Scope | Count | CI fail? |
|------|-------|-------|----------|
| G-01 Orb `AixiaPage` | `AiXia shell atmosphere` | **19** | No (warn) |
| G-02 Non-command `AixiaHero` | `AiXia hero surface` | **15** | No (warn) |
| G-03 Gradient XL classes | `AiXia hero typography` | **0** | No |
| G-07 shadcn page content | `AiXia shadcn boundary` | **1** | No (warn) |

**Allowlists:** `login/`, `register/`; `ai-management/` deferred (no warn until P2-01); AgentOps `PageLoader` allowlisted.

**False positives noted:** Mixed-shell pages (e.g. `paycheck-requests/[id]`) warn per orb instance — expected until shell migration. Command `AixiaPage surface="command"` without `aixia-command-page` class is not flagged (surface attribute is sufficient).

**Next enforcement:** Promote G-01/G-02 to error for finance + agent-ops when legacy list ≤ 3 and PageLoader migrated.

---

## shadcn boundary audit

See `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md`.

- Finance pages: **0** ui imports (clean)
- AgentOps: **1** actionable warning (`Progress` on hub page)
- DashboardLayout: ui imports **allowed** (shell chrome)

---

## Meta strip CSS dedupe audit

| Class family | Canonical owner | Batch 3 change |
|--------------|-----------------|----------------|
| Hub meta **grid** | `aixia-design-system.css` | Combined `.aixia-command-hub-meta` + `.aixia-finance-hub-meta` |
| Hub meta **cell chrome** | Command: design-system (bordered cells); Finance: finance-visual (padding-only) | **Deferred** — intentional visual difference |
| Runtime strip | `.aixia-runtime-status-strip*` | Unchanged; diagnostics only |
| Legacy `.aixia-runtime-status-strip--command-meta` | design-system | Marked deprecated in comment |

**Call sites:** Still use `AixiaFinanceHubMetaStrip` name (~30 files) — no renames in this batch.

---

## Scroll override audit

See `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` (updated in Batch 2).

| Status | Detail |
|--------|--------|
| Aliases unified | `.aixia-command-scroll`, `.aixia-command-page-scroll`, `.aixia-finance-page-scroll`, module scroll classes |
| Risky overrides remain | `finance-visual.css` gap on `.aixia-command-scroll`; projects/tasks `--new` scroll; calendar scroll |
| Removals | **None** — pages still depend on module classes |

---

## Page migrations confirmation

**None.** No `src/app/**` page files modified.

---

## Risk notes

1. Build emits additional warnings — does not fail CI.
2. Hub meta grid dedupe requires finance bridge CSS loaded for finance pages (Batch 2 loader).
3. 19+15 warnings document known debt — not regressions from Batch 3.

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** (warn-only; +35 new P0 shell/hero/shadcn warnings) |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (includes P0 findings in report) |
| `npm run qa:guardrail-action-plan` | **PASS** |

**Browser spot-check:** HTTP 200 on `/finance` and `/system/agent-ops/council` (dev server).

---

## Next recommended P0 batch (Batch 4)

1. Remove deprecated `.aixia-runtime-status-strip--command-meta` CSS when confirmed unused
2. Shared hub meta **cell** typography consolidation (if browser-approved vs Finance)
3. Implement G-02 as error for new finance routes only (path-scoped)
4. P0-07: shared loading primitive; migrate AgentOps PageLoader
5. P0-06: remove duplicate scroll blocks in projects/tasks `--new` when module migration unfrozen

**Do not** unfreeze Council/History page migration until P0 backlog closed.
