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

# AiXia Phase 2A Global Page Standard Correction Report

## Root Cause

**Yes.** Shared chat components existed, but Council composed them on the **wrong page shell**:

| Layer | Finance (`/finance`) | Council (before) |
|---|---|---|
| Page shell | `FinancePage` → command 3D surface | Default `AixiaPage` (light orb shell) |
| Hero | `AixiaHero surface="command"` | Default hero + local border/bg classes |
| Title scale | `aixia-dash-title--hero` | `aixia-title-xl` + gradient split title |
| Badges | Minimal in hero; status in scroll strip | Five runtime badges in hero |
| Navigation | Parent pill on child pages | Pill + duplicate Back button |
| Scroll | `aixia-command-scroll` | `space-y-6` on default shell |

Swapping inner JSX (chat thread, sections) could not unify product language without fixing the outer command page standard.

## Why Council and Finance Looked Different

Council was treated as a “chat section migration” only. Finance enforces rhythm at the **page shell** first (command surface, hero typography, scroll region, meta strip). Council skipped that layer and looked like a custom dark card page inside the generic app shell.

## Files Created

- `src/components/aixia/AixiaCommandPage.tsx`
- `src/components/aixia/AixiaCommandPageLayout.tsx`
- `qa-agent/design-system/AIXIA_PHASE_2A_GLOBAL_PAGE_SHELL_STANDARD_DECISION.md`
- `qa-agent/design-system/AIXIA_PHASE_2A_GLOBAL_PAGE_STANDARD_CORRECTION_REPORT.md`

## Files Modified

- `src/components/aixia/FinancePage.tsx` — delegates to `AixiaCommandPage`
- `src/components/aixia/AixiaWorkspaceShell.tsx` — uses `AixiaCommandPage`
- `src/components/aixia/index.ts` — exports new shell components
- `src/app/system/agent-ops/council/page.tsx` — command layout + hero/scroll/meta strip
- `src/styles/aixia-design-system.css` — command meta strip + participant row tokens
- `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md`
- `qa-agent/design-system/memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md`

## Shared Components / CSS Fixed

- **`AixiaCommandPage`** — global command-module page shell (source of truth for non-finance command pages).
- **`AixiaCommandPageLayout`** — locked hero + scroll composition.
- **`aixia-runtime-status-strip--command-meta`** — Finance-like meta strip rhythm for AgentOps.
- **`aixia-command-participant-row`** — shared participant roster row (replaces local bordered divs).

## Council Page Composition Fixed

- Uses `AixiaCommandPageLayout` with command hero (parent pill, 2 context badges, Open Agents + Refresh).
- Runtime/safety context in `AixiaRuntimeStatusStrip` at top of scroll (not hero badge wall).
- Removed duplicate Back button; parent pill handles return to Control Center.
- Removed local hero `className` border/background hack.
- Integration readiness uses `AixiaProgressiveDisclosureGroup` + `AixiaValueBlock` grid.
- Chat workbench, memory intent gating, disabled composer, and safety copy **unchanged in behavior**.

## Page-Shell Standard Documented

**Yes** — `AIXIA_PHASE_2A_GLOBAL_PAGE_SHELL_STANDARD_DECISION.md`

## Memory Updated

**Yes** — component memory + AI agent design rules memory.

## Before / After Visual Explanation

| Area | Before | After |
|---|---|---|
| Page background | Generic orb `AixiaPage` | Command 3D glass shell (matches Finance / AgentOps CC) |
| Hero title | Large gradient XL | Compact command kicker + title |
| Hero badges | 5 runtime badges | 2 context badges; runtime in scroll strip |
| Back navigation | Pill + Back button | Parent pill only |
| Scroll | Unstructured vertical stack | `aixia-command-scroll` rhythm |
| Status block | Heavy `AixiaSection` + badge row | Compact meta strip below hero |
| Integration panel | Raw `<details>` + local cards | Shared progressive disclosure + value blocks |

## No Local Hacks

**Confirmed** — Council uses only shared components and shared CSS classes (`aixia-runtime-status-strip--command-meta`, `aixia-command-participant-row`, existing disclosure/chat classes).

## No Business Logic Changes

**Confirmed** — same `loadData`, Supabase service calls, owner gate, chat preview content, memory intent indices, disabled composer.

## Validation Results

1. `npm run build` → **PASS** (pre-existing guardrail warnings; build continued)
2. `npm run qa:validate-foundation` → **PASS**
3. `npm run qa:static-design-guardrails` → **PASS** (164 findings; 4 actionable)
4. `npm run qa:guardrail-action-plan` → **PASS**

## Manual Browser QA Checklist

Compare `/finance`, `/system/agent-ops/council`, `/system/agent-ops`, `/system/agent-ops/agents`:

| # | Check | Result |
|---|---|---|
| 1 | Finance and Council feel like same product | Pending manual |
| 2 | Same page shell rhythm | Pending manual |
| 3 | Same hero/header logic | Pending manual |
| 4 | Same badge/action placement logic | Pending manual |
| 5 | Same parent/back pill logic | Pending manual |
| 6 | Same section rhythm | Pending manual |
| 7 | No Council-only local visual hack | **Yes** (code review) |
| 8 | Chat behavior preserved | **Yes** (code review) |
| 9 | Runtime inactive | **Yes** (code review) |

## Next Recommended Phase

1. **Manual browser sign-off** on Council vs Finance page rhythm.
2. Apply `AixiaCommandPageLayout` to remaining AgentOps child pages that still use ad-hoc command composition.
3. Resume **Phase 2B** (History timeline proof) only after shell parity is confirmed — not before.
