<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/11-scroll-responsive-standard.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged into:
>
> - [`11-scroll-responsive-standard.md`](../../src/design-system/aixia-global/11-scroll-responsive-standard.md) — scroll / responsive
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# P0-06 — Scroll Class Unification Notes (Batch 2)

**Canonical class:** `.aixia-command-scroll`  
**Owner:** `src/styles/dashboard/layout.css`

---

## Duplicate / alias classes (unified in Batch 2)

| Class | Role | Batch 2 action |
|-------|------|----------------|
| `.aixia-command-scroll` | **Canonical** inner scroll body | unchanged |
| `.aixia-command-page-scroll` | Outer stack scroll on `AixiaCommandPage` | aliased to canonical rules |
| `.aixia-finance-page-scroll` | Outer stack scroll on `FinancePage` | aliased to canonical rules |
| `.aixia-finance-scroll` | Legacy finance alias | aliased to canonical rules |
| `.aixia-projects-scroll` | Projects module | already aliased; kept |
| `.aixia-inbox-scroll` | Inbox module | added to `::before` + child z-index groups |
| `.aixia-tasks-scroll` | Tasks module | already aliased; kept |

---

## Module overrides (deferred — do not remove)

| Location | Class | Risk if removed |
|----------|-------|-----------------|
| `finance-visual.css` | `.aixia-finance-page .aixia-command-scroll` | Finance grid gap rhythm |
| `projects-visual.css` | `.aixia-projects-page--new .aixia-projects-scroll` | New project form layout |
| `tasks-visual.css` | `.aixia-tasks-page--new .aixia-tasks-scroll` | New task form layout |
| `aixia-design-system.css` | `.aixia-finance-page .aixia-command-scroll:has(.aixia-process-book)` | Process book overflow |

---

## Page usage pattern

Most pages use **inner** `<div className="aixia-command-scroll">` inside command shell.  
Shell wrappers pass **outer** scroll class via `scrollClassName` on `AixiaPage` stack (`aixia-command-page-scroll` / `aixia-finance-page-scroll`).

Both layers now share base scroll behavior from `layout.css`. Module-specific spacing remains in bridge CSS.

---

## Next (Batch 3+)

1. Standardize `FinancePage` / `AixiaCommandPage` `scrollClassName` to one name (`aixia-command-page-scroll` only).
2. Retire `.aixia-finance-scroll` if zero references after grep audit.
3. Remove duplicate scroll blocks in `projects-visual.css` / `tasks-visual.css` when module pages consume canonical scroll only (P1-05).
