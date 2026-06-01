<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/05-meta-status-strip-standard.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged into:
>
> - [`05-meta-status-strip-standard.md`](../../src/design-system/aixia-global/05-meta-status-strip-standard.md) — meta / status strips
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# P0-05 — Command Hub Meta Strip Authority

**Status:** Authority decided · alias exported · page rewrites deferred  
**Batch:** P0 Batch 1 (2026-05-29)

---

## Problem

Three patterns competed for the same UI job (secondary operational row below command hero):

| Pattern | Location | Issue |
|---------|----------|-------|
| `AixiaFinanceHubMetaStrip` | Component | Finance-specific name; `variant="command"` added in Phase 2A |
| `AixiaRuntimeStatusStrip` `variant="hub-meta"` | Component | Runtime primitive misused for page chrome |
| `.aixia-finance-hub-meta` / `.aixia-command-hub-meta` | CSS | Duplicate grids in `finance-visual.css` and `aixia-design-system.css` |

---

## Locked authority

| Role | Owner |
|------|-------|
| **Page-level meta/status row** (system, access, record context) | `AixiaCommandHubMetaStrip` |
| Finance module (same component, finance grid class) | `AixiaFinanceHubMetaStrip` = alias; `variant="finance"` → `.aixia-finance-hub-meta` under `.aixia-finance-page` |
| Non-finance command pages | `variant="command"` → `.aixia-command-hub-meta` (CSS in `aixia-design-system.css` under `.aixia-command-page`) |
| **Runtime / live diagnostics** (service health, probes) | `AixiaRuntimeStatusStrip` with `variant="default"` or `stacked` only |

**Forbidden:** `AixiaRuntimeStatusStrip` with `variant="hub-meta"` on new pages; inline badge rows for page meta.

---

## Naming plan

| Name | Status |
|------|--------|
| `AixiaCommandHubMetaStrip` | **Preferred** export (alias of `AixiaFinanceHubMetaStrip`) |
| `AixiaFinanceHubMetaStrip` | **Compatibility** export until P1 rename wave |
| `AixiaCommandHubMetaItem` | Type alias of `AixiaFinanceHubMetaItem` |
| `commandMetricsToMetaStripItems` | Keep (maps hero KPIs → meta items when migrating legacy layouts) |

---

## CSS authority

| Class | Owner file | Scope |
|-------|------------|-------|
| `.aixia-finance-page .aixia-finance-hub-meta` | `finance-visual.css` | Finance only |
| `.aixia-command-page .aixia-command-hub-meta` | `aixia-design-system.css` | AgentOps / generic command |

Do not add a third meta grid in module CSS.

---

## Batch 1 implementation

- Exported `AixiaCommandHubMetaStrip` + `AixiaCommandHubMetaItem` from `index.ts`
- JSDoc on `AixiaFinanceHubMetaStrip` and deprecation note on `AixiaRuntimeStatusStrip` `hub-meta`
- Scoped finance hub-meta CSS under `.aixia-finance-page` (P0-04 overlap)

## Batch 2 implementation

- **`AixiaCommandHubMetaStrip.tsx`** — canonical component (default `variant="command"`)
- **`AixiaFinanceHubMetaStrip`** — thin wrapper defaulting to `variant="finance"`
- **`AixiaRuntimeStatusStrip` `hub-meta`** — delegates to `AixiaCommandHubMetaStrip` (no duplicate grid markup)
- **0 app call sites** use `hub-meta` today

**Not in Batch 2:** Rename finance call sites to `AixiaCommandHubMetaStrip`; remove `hub-meta` variant entirely.

## Batch 3 CSS dedupe

- Hub meta **grid** unified in `aixia-design-system.css` (command + finance selectors)
- Duplicate grid removed from `finance-visual.css`
- Cell chrome split intentionally (command bordered vs finance padding-only)

---

## Next batch (P0-05 completion)

1. Lint/guardrail: forbid `AixiaRuntimeStatusStrip` with `variant="hub-meta"` under `src/app`
2. Migrate existing `hub-meta` call sites to `AixiaCommandHubMetaStrip`
3. Consider moving `.aixia-command-hub-meta` rules next to finance bridge or into shared meta component CSS module
