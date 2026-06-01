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

# P0 Batch 4 — Meta, Scroll & Boundary Report

**Date:** 2026-05-29  
**Scope:** Shared design authority cleanup only — no page migrations, no Council/History/Finance route visual patches.

---

## Purpose

Continue P0 consolidation after Batch 3 guardrails:

1. Remove dead runtime meta CSS competing with `AixiaCommandHubMetaStrip`
2. Merge hub meta cell typography/chrome into one canonical class family
3. Resolve AgentOps shadcn boundary warning via shared `AixiaProgressBar`
4. Continue scroll override cleanup (alias, not delete)
5. Prepare path-scoped guardrail error promotion (proposal only)
6. Keep page migrations frozen

---

## Files created

| File | Role |
|------|------|
| `src/components/aixia/AixiaProgressBar.tsx` | Shared progress bar (replaces shadcn `Progress` in module page content) |
| `qa-agent/design-system/AIXIA_P0_BATCH_4_META_SCROLL_BOUNDARY_REPORT.md` | This report |

---

## Files modified

| File | Change |
|------|--------|
| `src/styles/aixia-design-system.css` | Unified hub meta cell chrome; removed `.aixia-runtime-status-strip--command-meta`; added `.aixia-progress-bar*` |
| `src/styles/finance/finance-visual.css` | Removed duplicate hub meta signal-row rules + dead `__item|__label|__value` BEM |
| `src/styles/projects/projects-visual.css` | `--new` scroll: `overflow-x` only (inherits canonical overflow-y) |
| `src/styles/tasks/tasks-visual.css` | Same scroll alias cleanup as projects |
| `src/styles/calendar/calendar-visual.css` | Documented deferred calendar scroll family (P0-06) |
| `src/components/aixia/index.ts` | Export `AixiaProgressBar` |
| `src/app/system/agent-ops/page.tsx` | `Progress` → `AixiaProgressBar` (boundary fix only; no shell/hero change) |
| `qa-agent/design-system/AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | Path-scoped error promotion plan (Batch 4) |
| Memory files (×3) | Batch 4 status |

---

## P0 items addressed

| ID | Batch 4 outcome |
|----|-----------------|
| **P0-05** runtime meta CSS | **Done** — dead `.aixia-runtime-status-strip--command-meta` removed |
| **P0-05** hub meta chrome | **Done** — canonical signal-row family for command + finance |
| **P0-07** shadcn boundary | **Done** — 0 boundary warnings; `PageLoader` still allowlisted |
| **P0-06** scroll | **Partial** — projects/tasks `--new` deduped; calendar/chat deferred |
| **P0-01/03** guardrails | **Plan** — path-scoped escalation documented; hard fail not enabled |

---

## Runtime meta CSS cleanup

### Removed (dead)

| CSS block | Reason |
|-----------|--------|
| `.aixia-command-page .aixia-runtime-status-strip--command-meta` (+ 6 child rules) | Zero TSX call sites; competed with hub meta strip authority |

### Deprecated (component, unchanged)

- `AixiaRuntimeStatusStrip` `variant="hub-meta"` — delegates to `AixiaCommandHubMetaStrip`; no new page meta via runtime strip

### Remaining blockers

- None for runtime meta CSS removal — safe to delete confirmed by grep

---

## Hub meta typography/chrome cleanup

### Canonical class family (design-system)

```css
.aixia-command-page .aixia-command-hub-meta,
.aixia-finance-page .aixia-finance-hub-meta          /* grid */
.aixia-*-hub-meta .aixia-signal-row                   /* cell chrome */
.aixia-*-hub-meta .aixia-signal-row-label             /* label typography */
.aixia-*-hub-meta .aixia-signal-row-value             /* value typography */
```

Finance pages now receive the same bordered cell chrome as command pages (previously finance had padding/typography only).

### Finance-specific exceptions

- None required for hub meta cells after merge
- `.aixia-finance-page .aixia-finance-hub-summary` and other finance-only blocks unchanged

### Duplicate rules removed

| Location | Removed |
|----------|---------|
| `finance-visual.css` | signal-row, signal-row-label, signal-row-value duplicates |
| `finance-visual.css` | dead `.aixia-finance-hub-meta__item|__label|__value` (zero TSX usage) |

---

## shadcn boundary warning result

| Before | After |
|--------|-------|
| 1 (`@/components/ui/progress` on AgentOps hub) | **0** |

**Fix:** `AixiaProgressBar` shared component + CSS in design-system.  
**Deferred:** `PageLoader` on AgentOps routes — allowlisted until shared async section wrapper exists.  
**Route behavior:** unchanged (same loading gate + Hermes score display).

---

## Scroll override cleanup

| Override | Action |
|----------|--------|
| `.aixia-projects-page--new .aixia-projects-scroll` | Removed duplicate `overflow-y: auto`; kept `overflow-x: hidden` |
| `.aixia-tasks-page--new .aixia-tasks-scroll` | Same |
| `.aixia-finance-page .aixia-command-scroll` | **Deferred** — grid rhythm spacing, not scroll shell |
| `.aixia-calendar-scroll` | **Deferred** — separate FAB/mode padding family; documented |

### Remaining duplicate list (CSS truth warnings)

- `projects-visual.css`, `tasks-visual.css` — `--new` form overrides still flagged (reduced scope)
- `calendar-visual.css` — separate scroll family until calendar audit

---

## Guardrail escalation plan

See updated `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` — **Batch 4 section**.

| Phase | Target | Level | Enabled? |
|-------|--------|-------|----------|
| E-1 | Finance page shadcn | error | Batch 5 (already 0 warnings) |
| E-1 | AgentOps page shadcn (excl. PageLoader allowlist) | error | Batch 5 (0 warnings after Progress fix) |
| E-2 | Shell/hero on finance/agent-ops | error | Batch 5+ when debt ≤ 3 per path |
| E-3 | New files only | error | Optional Batch 5 |

**Hard failure:** not enabled in Batch 4 (19 shell + 15 hero warnings remain).

---

## Warning counts before/after

| Metric | Batch 3 | Batch 4 |
|--------|---------|---------|
| Shell (G-01) | 19 | **19** |
| Hero (G-02) | 15 | **15** |
| shadcn boundary (G-07) | 1 | **0** |
| Static design findings | 199 | **198** |

---

## Changes made

- Removed 38 lines dead runtime meta CSS
- Merged hub meta cell chrome into design-system (command + finance selectors)
- Created `AixiaProgressBar` shared component
- Replaced shadcn `Progress` on AgentOps hub only
- Reduced projects/tasks scroll duplication
- Updated guardrail escalation proposal + memory files

## Changes deferred

- Calendar scroll family merge
- Finance scroll body grid rhythm (module-specific, safe)
- PageLoader → shared async wrapper
- Shell/hero guardrail hard failure
- Legacy 13 finance orb routes shell wrap
- AgentOps orb shell migration

---

## Page migrations confirmation

**None.** AgentOps hub received a single shared-component import swap (`Progress` → `AixiaProgressBar`) per P0-07 boundary scope — not a shell/hero/page migration.

| Route area | Patched? |
|------------|----------|
| Council | **No** |
| History | **No** |
| Finance route visuals | **No** |
| Page shell migrations | **No** |

---

## Risk notes

| Risk | Mitigation |
|------|------------|
| Finance hub meta now has bordered cells (was padding-only) | Matches command rhythm; browser verify on `/finance` |
| Runtime meta CSS removal | Zero call sites verified |
| AgentOps hub Progress visual delta | Violet tone preserved via `AixiaProgressBar tone="violet"` |

---

## Validation results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (198 findings) |
| `npm run qa:guardrail-action-plan` | **PASS** |

### Browser spot-check (dev server)

Routes checked after CSS/component changes:

- `/finance` — HTTP 200
- `/system/agent-ops/council` — HTTP 200
- `/system/agent-ops` — HTTP 200
- `/system/agent-ops/agents` — HTTP 200

---

## Next recommended P0 batch (Batch 5)

**Do not unfreeze page migrations.** Continue shared authority:

1. **P0-07 complete:** shared `AixiaAsyncSection` or equivalent to replace allowlisted `PageLoader` on AgentOps
2. **Guardrail E-1:** promote shadcn boundary to **error** on `src/app/finance/**` and `src/app/system/agent-ops/**` (now 0 warnings)
3. **P0-04:** legacy finance shell-only wrap plan for 13 orb routes (shared loader only — no page JSX migration batch)
4. **P0-06:** calendar scroll audit + optional alias to layout.css
5. **P0-01/03:** path-scoped shell/hero errors for new files only

---

## Business logic / runtime / production

| Check | Status |
|-------|--------|
| Business logic changed | **No** |
| Supabase/RLS/schema changed | **No** |
| Runtime systems activated | **No** |
| Production/main touched | **No** |
