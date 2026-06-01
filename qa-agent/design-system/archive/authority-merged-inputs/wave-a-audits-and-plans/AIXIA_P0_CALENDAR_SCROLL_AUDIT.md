<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/11-scroll-responsive-standard.md, src/design-system/aixia-global/13-module-wrapper-rules.md, src/design-system/aixia-global/14-page-migration-rules.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged into:
>
> - [`11-scroll-responsive-standard.md`](../../src/design-system/aixia-global/11-scroll-responsive-standard.md) — scroll / responsive
> - [`13-module-wrapper-rules.md`](../../src/design-system/aixia-global/13-module-wrapper-rules.md) — module scroll exceptions
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — migration gates
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# P0-06 — Calendar Scroll Family Audit (Batch 5)

**Status:** Audit complete — no CSS alias changes (deferred)  
**Date:** 2026-05-29

---

## Scroll class inventory

| Class | File | Role |
|-------|------|------|
| `.aixia-command-scroll` | `dashboard/layout.css` | Canonical command page scroll shell |
| `.aixia-calendar-scroll` | `calendar/calendar-visual.css` | Calendar module scroll extension |
| `.aixia-fab-safe-scroll` | design-system | FAB bottom safe-area padding |
| `.aixia-page-rhythm` | design-system | Block spacing rhythm |

---

## Page usage

| Route | Scroll classes on body | Type |
|-------|------------------------|------|
| `calendar/page.tsx` | `aixia-command-scroll aixia-page-rhythm aixia-fab-safe-scroll aixia-calendar-scroll` | Full-page command scroll + calendar extension |
| `calendar/day/page.tsx` | `aixia-command-scroll aixia-calendar-scroll` | Day view scroll |
| `calendar/new/page.tsx` | (form in command page — no separate scroll class on outer) | Form body |
| `calendar/[id]/edit/page.tsx` | Same as new | Form body |
| `.aixia-calendar-day-cell-stack` | Internal | **In-cell** event stack (not page scroll) |
| `.aixia-calendar-day-popover-list` | Internal | Popover list scroll |

---

## Classification

| Behavior | Calendar-specific? | Align with `.aixia-command-scroll`? |
|----------|---------------------|-------------------------------------|
| Page vertical scroll (month/day) | Partial — uses command scroll **plus** calendar class | **Already aligned** — dual class on same element |
| FAB safe-area padding | Shared | Yes — via `aixia-fab-safe-scroll` |
| Mode padding (`--new`, `--edit`, `--day`) | Yes — scroll-padding-bottom for forms/day | **Keep calendar-only** |
| Calendar `::before` glow | Yes — bottom radial | **Keep calendar-only** (differs from command glow) |
| In-cell chip stack / popover | Yes | **Do not merge** into command scroll |
| Month grid horizontal overflow | No | N/A — grid uses `overflow` on panel not scroll class |

---

## Batch 5 decision

**No CSS alias changes.** Calendar hub already composes canonical scroll:

```tsx
<div className="aixia-command-scroll aixia-page-rhythm aixia-fab-safe-scroll aixia-calendar-scroll">
```

`.aixia-calendar-scroll` adds mode-specific padding and documents deferred FAB/mode behavior (Batch 4 comment retained).

---

## Future recommendation

1. **P0 Batch 6:** Add `.aixia-calendar-scroll` to `layout.css` comment block as documented extension (no rule merge)
2. **P1:** Extract shared `AixiaModuleScroll` wrapper component if projects/tasks/calendar all need mode flags
3. **Do not** force calendar month grid or day-cell stacks into `.aixia-command-scroll`

---

## Remaining blockers

- Form routes (`new`, `edit`) rely on page flex stack — verify scroll-padding when wrapping with shared scroll component
- Day view uses both command + calendar scroll — browser test before any class removal
