# AiXia Global Folder — Batch 21 Scroll/Responsive Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `11-scroll-responsive-standard.md` as the single source-of-truth for all AiXia page scroll, command scroll, internal scroll, horizontal table/list scroll, card/list scroll limits, modal scroll, calendar/grid exceptions, responsive breakpoints, viewport targets, overflow containment, silent refresh scroll preservation, and scroll/responsive migration/deprecation rules.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/11-scroll-responsive-standard.md` | Canonical owner for page/internal/table/modal/calendar scroll, breakpoints, responsive wrapping, refresh preservation, collisions, consolidation plan |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_21_SCROLL_RESPONSIVE_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmation scope

| Item | Result |
|------|--------|
| Only `11-scroll-responsive-standard.md` created as owner file in this batch | **Yes** |
| Files `12`–`15` created | **No** |
| Code changed | **No** |
| CSS changed | **No** |
| Components changed | **No** |
| Pages changed | **No** |
| Finance patched | **No** |
| AgentOps patched | **No** |
| Guardrails changed | **No** |
| Old files moved/deleted | **No** |
| Deprecation banners added | **No** |

---

## Scroll/responsive sources audited

- `src/styles/dashboard/layout.css` (command scroll aliases, shell overflow, responsive grids)
- `src/styles/dashboard/visual.css`
- `src/styles/aixia-design-system.css` (smart layout, smart scroll, FAB safe scroll, table/modal scroll, breakpoints)
- `src/styles/finance/finance-visual.css`
- `src/styles/finance/master-data-visual.css`
- `src/styles/calendar/calendar-visual.css`
- `src/styles/chat/chat-visual.css`
- `src/styles/inbox/inbox-visual.css`
- `src/styles/tasks/tasks-visual.css`
- `src/styles/projects/projects-visual.css`
- `src/components/aixia/AixiaSection.tsx`
- `src/components/aixia/AixiaSmartLayout.tsx`
- `src/components/aixia/AixiaTable.tsx`
- `src/components/aixia/AixiaModal.tsx`
- `qa-agent/design-system/AIXIA_P0_SCROLL_CLASS_UNIFICATION.md`
- `qa-agent/design-system/AIXIA_P0_CALENDAR_SCROLL_AUDIT.md`
- `src/design-system/aixia-refresh-rules.md`
- Local Tailwind overflow/min-width usage scan
- `16-design-file-cleanup-map.md` scroll row

---

## Scroll/responsive collisions identified

1. `.aixia-command-scroll` vs multiple module scroll alias classes.
2. Calendar scroll family exceptions vs global command scroll.
3. Inbox/tasks/projects module scroll overrides on form routes.
4. Table header/body horizontal scroll mismatch risk.
5. Page-level horizontal scroll from local wrappers.
6. Table action column reachability under scroll.
7. Refresh/scroll jump and full-page reload risk.
8. Smart layout dead gaps when match/bottomSpan unused.
9. Sections with too few visible items or premature internal scroll.
10. Module CSS owning scroll behavior (tasks/projects/finance/chat).
11. Local Tailwind overflow utilities on pages.
12. Dual outer/inner scroll layer confusion.
13. FAB safe area vs calendar scroll-padding overlap.
14. Old P0 scroll/calendar/shell docs still interpretable as scroll authority.

---

## Canonical scroll/responsive model created

`11-scroll-responsive-standard.md` now defines:

- **A.** Page scroll (command shell, one vertical context, no horizontal page scroll).
- **B.** Internal section scroll (8/10/12 thresholds, smart scroll heights).
- **C.** Table/list horizontal scroll (containment, sticky head, action reachability).
- **D.** Card/list scroll (visible counts, smart layout alignment, FAB safe area).
- **E.** Modal/drawer scroll (internal body, scroll lock, mobile).
- **F.** Calendar/grid exceptions (documented extension pattern).
- **G.** Breakpoints/viewport targets (mobile through wide desktop from `01`).
- **H.** Responsive wrapping (hero through modals).
- **I.** Silent refresh and scroll preservation.

---

## Wrapper/component strategy documented

- Command page shell owns page scroll.
- `AixiaSection` owns section smart scroll.
- `AixiaSmartLayout` owns two-column/bottom alignment.
- `AixiaTableShell` / `AixiaModal` own container scroll.
- Module classes are aliases/exceptions only.
- `.aixia-fab-safe-scroll` / `.aixia-page-rhythm` are composable modifiers.

---

## Forbidden scroll/responsive patterns documented

- No module-specific scroll law.
- No page-level horizontal scroll.
- No nested scroll traps / header-body scroll split.
- No scroll jumps on refresh.
- No cramped one-screen layouts.
- No local overflow systems.
- No scroll rules in legacy docs/reports.

---

## One-scroll/responsive-owner rule confirmed

**Yes.** All scroll/overflow/breakpoint/responsive rules owned exclusively by `11-scroll-responsive-standard.md` per `00` §0.2.

---

## Page migrations remain paused

**Yes** — per `00` §7.

---

## Batch 9 finance proofs paused

**Yes** — unchanged.

---

## Command-surface context paused

**Yes** — unchanged.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only batch) |

---

## Next recommended batch

After Piter reviews and approves `11-scroll-responsive-standard.md`, create:

`src/design-system/aixia-global/12-navigation-workspace-standard.md`

Not recommended yet: page migration, command-surface context, finance route proof work, CSS split, old-file deletion.
