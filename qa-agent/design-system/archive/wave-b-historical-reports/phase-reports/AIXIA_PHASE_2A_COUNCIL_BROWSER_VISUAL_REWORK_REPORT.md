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

# AiXia Phase 2A Council Browser Visual Rework Report

## Browser Problems Found

1. Council hero still felt custom (badges dominant, extra wrapper on actions).
2. Council context strip was unreadable — `AixiaRuntimeStatusStrip` inline mode crammed label + badge into narrow signal rows; “Memory policy” column broke.
3. Chat workbench was a large empty dark block (`min-height: 220px`, heavy gradient shell, `480px` viewport).
4. Sections used default glass instead of Finance command panels.
5. Page did not use Finance-identical meta strip grid (3 equal columns, label / value — detail).

## Why Previous Correction Failed Visually

The prior pass switched to `AixiaCommandPage` + command hero but kept **`AixiaRuntimeStatusStrip`** for context. That component’s inline layout is not the Finance meta strip — it renders nested label nodes + badges inside `AixiaSignalRow`, which wraps and breaks at command-page widths.

Shared component usage alone did not produce Finance rhythm because the **wrong shared primitive** was chosen for the status row.

## Visual Mismatches vs Finance (Before This Rework)

| Area | Finance | Council (before rework) |
|---|---|---|
| Meta/status row | `AixiaFinanceHubMetaStrip` 3-column grid | `AixiaRuntimeStatusStrip` 6 cramped cells |
| Hero badges | None on hub | Two badges + noisy context header |
| Chat shell | N/A on hub | Heavy workbench, 220px min + 480px max empty viewport |
| Sections | Command dash panels | Default section cards |

## Shared Components / CSS Changed

| File | Change |
|---|---|
| `AixiaFinanceHubMetaStrip.tsx` | `variant="command"` → `aixia-command-hub-meta` grid |
| `AixiaRuntimeStatusStrip.tsx` | `variant="hub-meta"` → same grid (global fix) |
| `AixiaChatThread.tsx` | `density="compact"` + content-first max height |
| `AixiaCommandPageLayout.tsx` | Finance-matching scroll flex (`min-h-0 flex-1`) |
| `aixia-design-system.css` | `.aixia-command-hub-meta` Finance-identical grid; compact chat/workbench |

## Council Composition Changed

- Removed hero badges and runtime strip header block.
- Replaced context strip with **`AixiaFinanceHubMetaStrip variant="command"`** (3 items: roster, runtime, memory).
- All primary sections use **`surface="command"`**.
- Chat uses **`density="compact"`** workbench (no fixed 480px height).
- Hero actions match Finance (direct children in `aixia-dash-actions`).

## No Local Design Hack

**Confirmed** — only shared classes (`aixia-command-hub-meta`, `aixia-section-body--embedded`, `aixia-command-participant-row`, compact chat density).

## Before / After (Expected in Browser)

| Area | After rework |
|---|---|
| Hero | Compact kicker/title/subtitle; parent pill; actions top-right; no badge row |
| Context strip | Three equal cards like Finance “System Status / Personal Access / Company Areas” |
| Chat | Lighter panel, shorter scroll viewport, messages start near top |
| Sections | Same dash-panel headers as Finance command sections |

## Browser QA (Manual — Required)

Side-by-side `/finance` and `/system/agent-ops/council`:

| # | Check | Expected |
|---|---|---|
| 1 | Same command page shell rhythm | Yes |
| 2 | Same hero hierarchy | Yes |
| 3 | Same action placement logic | Yes |
| 4 | Same status/meta strip rhythm | Yes |
| 5 | Same section spacing rhythm | Yes |
| 6 | Context strip clean/readable | Yes |
| 7 | Chat thread not oversized/empty | Yes |
| 8 | No broken wrapping/cramped labels | Yes |
| 9 | No local one-off visual system | Yes |
| 10 | Feels like same product as Finance | **Pending your confirmation** |

## Validation Results

1. `npm run build` → **PASS**
2. `npm run qa:validate-foundation` → **PASS**
3. `npm run qa:static-design-guardrails` → **PASS**
4. `npm run qa:guardrail-action-plan` → **PASS**

## Phase 2A Approval Status

**Blocked until manual browser screenshots confirm items 1–10.**

Do not start Phase 2B (History) until approval.
