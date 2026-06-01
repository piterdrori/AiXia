<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/03-page-shell-standard.md, src/design-system/aixia-global/04-hero-header-standard.md, src/design-system/aixia-global/14-page-migration-rules.md, src/design-system/aixia-global/16-design-file-cleanup-map.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file records a **Phase 2A shell standard decision**. It **must not** override owner files. The “Locked” status below is **historical** — active shell/hero law is in `aixia-global/`.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`03-page-shell-standard.md`](../../src/design-system/aixia-global/03-page-shell-standard.md) — page shell
> - [`04-hero-header-standard.md`](../../src/design-system/aixia-global/04-hero-header-standard.md) — hero / header
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — page migration
> - [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md) — cleanup disposition
>
> - If this decision conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit decision history under the global cleanup program.

# AiXia Phase 2A — Global Page Shell Standard Decision

## Status

**Locked** for all command-module pages (Finance, AgentOps, Projects, Inbox, Tasks, Calendar, Chat).

## What Finance Does Correctly

| Pattern | Finance reference | Owner |
|---|---|---|
| Dark command shell | `FinancePage` → `AixiaPage surface="command"` + `aixia-command-page` | `AixiaCommandPage` / `FinancePage` |
| Fixed hero + scroll body | `AixiaHero surface="command"` + `div.aixia-command-scroll` | `AixiaCommandPageLayout` |
| Title scale | `aixia-dash-kicker` + `aixia-dash-title--hero` (not default gradient XL hero) | `AixiaHero` command surface + `dashboard/visual.css` |
| Parent navigation | `parentLabel` + `parentPath` → `aixia-parent-pill` only (no duplicate back row required) | `AixiaHero` |
| Primary actions | Refresh / open module routes in `aixia-dash-actions` (hero top-right) | `AixiaHero.actions` |
| Context badges | 0–2 compact badges in hero badge row | `AixiaHero.badges` |
| Status / runtime context | Below hero inside scroll (`AixiaFinanceHubMetaStrip`) | `AixiaFinanceHubMetaStrip` or `AixiaRuntimeStatusStrip--command-meta` |
| Section rhythm | `AixiaSection` inside scroll, shared stack gap | `aixia-command-scroll` + design tokens |
| Module bridge CSS | `aixia-finance-page` in `finance-visual.css` (tabular nums, hero spacing) | `FinancePage` module class only |

## What Council Did Differently (Root Mismatch)

1. **Wrong page shell** — `AixiaPage` default surface (light orb background) instead of command 3D shell.
2. **Wrong hero surface** — default `AixiaHero` (gradient XL title) + local `border/bg-white` classes.
3. **Badge overload in hero** — five runtime badges in hero; Finance keeps hero badges minimal and puts status in scroll meta strip.
4. **Duplicate navigation** — parent pill plus separate “Back to Control Center” button.
5. **Wrong scroll container** — `space-y-6` on default shell instead of `aixia-command-scroll`.
6. **Local composition** — raw `<details>` and hand-styled participant/integration cards instead of shared disclosure + value blocks.

## Global Page-Shell Standard (Locked)

```
AixiaCommandPage [surface=command, aixia-command-page]
├── AixiaHero [surface=command, shrink-0]
│   ├── parent pill (child pages)
│   ├── 0–2 context badges (module/staging only)
│   ├── kicker + title + subtitle (command typography)
│   └── actions (refresh, open related routes)
└── .aixia-command-scroll
    ├── meta / runtime strip (optional, top of scroll)
    ├── AixiaSection / workbench content
    └── secondary disclosures / safety blocks
```

## Hero / Header Standard

- Always `surface="command"`.
- `className="shrink-0 space-y-4"` on module hubs and child command pages.
- **No** page-local hero border/background overrides.
- **No** `rightContent` on new pages; use `statusCards` or scroll meta strip.

## Parent / Back Pill Standard

- Child pages: `parentLabel` + `parentPath` only.
- Do **not** add a second full “Back to …” button unless a legacy Finance page already has both (prefer pill-only on new AgentOps pages).

## Refresh / Action Placement Standard

- Primary refresh and route actions live in `AixiaHero.actions` (`aixia-dash-actions`).
- Secondary batch actions belong in section `actions` or registry toolbars — not duplicated in hero.

## Badge Placement Standard

- Hero: max **2** context badges (staging, shell type).
- Runtime / safety / inactive system badges: **scroll meta strip** (`AixiaFinanceHubMetaStrip` or `AixiaRuntimeStatusStrip` with `aixia-runtime-status-strip--command-meta`).

## Section Spacing Standard

- Scroll body: `aixia-command-scroll flex flex-col gap-6` (or module variant with `min-h-0 flex-1` when needed).
- Embedded workbench sections: `bodyClassName="aixia-section-body--embedded"`.
- Secondary roster / integration blocks: `AixiaProgressiveDisclosureGroup` + `aixia-progressive-disclosure--secondary`.

## Component Ownership

| Concern | Component / class |
|---|---|
| Page shell | `AixiaCommandPage` |
| Locked composition | `AixiaCommandPageLayout` |
| Finance module bridge | `FinancePage` → `AixiaCommandPage` + `aixia-finance-page` |
| Hero | `AixiaHero` (`surface="command"`) |
| Finance status strip | `AixiaFinanceHubMetaStrip` |
| Non-finance status strip | `AixiaRuntimeStatusStrip` + `--command-meta` |
| Detail/workspace variant | `AixiaWorkspaceShell` (uses `AixiaCommandPage`) |
| Sections / chat | `AixiaSection`, `AixiaChatThread`, etc. |

## Fix Location: Shared vs Page

| Fix | Where |
|---|---|
| Command page shell export | **Shared** — `AixiaCommandPage`, `AixiaCommandPageLayout` |
| Command meta strip rhythm | **Shared CSS** — `aixia-runtime-status-strip--command-meta` |
| Participant row rhythm | **Shared CSS** — `aixia-command-participant-row` |
| Council composition | **Page** — adopt command layout; remove local hero/scroll hacks |
| Finance | **No behavior change** — `FinancePage` delegates to `AixiaCommandPage` |

## Proof Migration Gate

A page proof is **not complete** until:

1. It uses `AixiaCommandPage` or `FinancePage` / `AixiaCommandPageLayout`.
2. Hero uses `surface="command"` without local visual overrides.
3. Scroll body uses `aixia-command-scroll`.
4. Side-by-side with `/finance` reads as the same product language (structure, not content).
