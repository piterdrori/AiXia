<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-deprecated-authority-superseded
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/03-page-shell-standard.md, src/design-system/aixia-global/04-hero-header-standard.md, src/design-system/aixia-global/05-meta-status-strip-standard.md, src/design-system/aixia-global/11-scroll-responsive-standard.md
-->

> **⚠ DEPRECATED AUTHORITY — superseded by `aixia-global/`**
>
> This qa-agent document **used to be treated as locked, non-negotiable layout law**. It is now **deprecated authority** and has been **superseded**. Agents **must not** read it as active design law.
>
> **Read active law instead:**
>
> - [`03-page-shell-standard.md`](../../src/design-system/aixia-global/03-page-shell-standard.md) — page shell
> - [`04-hero-header-standard.md`](../../src/design-system/aixia-global/04-hero-header-standard.md) — hero / header
> - [`05-meta-status-strip-standard.md`](../../src/design-system/aixia-global/05-meta-status-strip-standard.md) — meta / status strips
> - [`11-scroll-responsive-standard.md`](../../src/design-system/aixia-global/11-scroll-responsive-standard.md) — scroll / responsive
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Content below is **historical reference only** until dependency checks and **Piter approval** for archive/delete.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated authority — superseded canonical input retained until archive phase.

# AiXia Page Shell & Hero Standard (Locked)

**Authority:** This document is the non-negotiable layout law for authenticated AiXia pages.  
**Baseline reference:** `/finance` hub (`FinancePage` + command hero + meta strip + command scroll).  
**Applies to:** Finance, AgentOps, Projects, Tasks, Inbox, Calendar (command routes), AI Management (when migrated).

---

## 0. Forbidden (Agents Must Not)

- Use `AixiaPage` **default** surface (orb background) under `DashboardLayout`
- Invent page-local hero markup, hero CSS classes, or hero `className` borders/backgrounds
- Put runtime/status badges in hero (max **0** status badges in hero; context badges max **2** only when documented)
- Use `AixiaRuntimeStatusStrip` default inline mode for page-level meta rows
- Use `AixiaMetricGrid` for hero KPIs
- Add module-specific scroll containers other than `.aixia-command-scroll`
- Patch one page (e.g. Council) without fixing shared SOT

---

## 1. Page Shell Standard

### 1.1 Wrapper chain (command pages)

```tsx
<AixiaCommandPage>                    // or FinancePage (= CommandPage + aixia-finance-page)
  <AixiaHero surface="command" … />  // fixed header
  <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col gap-6">
    {/* meta strip, sections */}
  </div>
</AixiaCommandPage>
```

**Or** use `AixiaCommandPageLayout` with `hero`, `scrollLead`, `children` props (same structure).

### 1.2 Visual properties

| Property | Value | Owner |
|----------|-------|-------|
| Background | Command 3D stack (`aixia-dash-3d-stack`) | `AixiaPage surface="command"` |
| Max width | Inherited from `DashboardLayout` content area; finance may add `max-w-[1920px] mx-auto` on FinancePage className | Layout |
| Padding | Module bridge only on `.aixia-finance-page` if needed; **no** page-local padding hacks | `finance-visual.css` |
| Vertical gap between scroll children | `gap-6` (1.5rem) in `aixia-command-scroll` | `layout.css` + Tailwind on scroll div |
| Scroll | Single region: `.aixia-command-scroll` only | `dashboard/layout.css` |
| Responsive | Hero wraps; meta strip `auto-fit` grid; sections stack | CSS grid |

### 1.3 Non-command pages

Auth (`/login`, etc.) may use default surfaces until `AixiaAuthShell` exists. **Not** a reference for product modules.

---

## 2. Hero Standard (Command Surface)

### 2.1 Required props

| Prop | Rule |
|------|------|
| `surface` | **Must** be `"command"` |
| `className` | `shrink-0 space-y-4` on hubs and child command pages |
| `gradientTitle` | Short kicker (module name): e.g. `Finance`, `AgentOps` |
| `title` | Page name only (no duplicate module name in title) |
| `subtitle` | One line, `aixia-dash-subtitle--hero` scale (~0.8125rem) |
| `parentLabel` / `parentPath` | **Child pages only** — destination name, not “Back” |
| `actions` | Refresh + primary route actions |
| `badges` | **Hub:** avoid. **Child:** max 2 context badges. **Never** runtime status badges |
| `children` | **Only** `AixiaCommandMetrics` when hero KPIs exist |

### 2.2 Typography (command)

| Element | Class | Scale |
|---------|-------|-------|
| Kicker | `aixia-dash-kicker` | 0.65rem, uppercase, letter-spacing 0.2em |
| Title | `aixia-dash-title--hero` | clamp(1.35rem, 2.5vw, 1.75rem) |
| Subtitle | `aixia-dash-subtitle--hero` | 0.8125rem |

**Forbidden:** `aixia-title-xl`, `aixia-gradient-text` on authenticated command pages.

### 2.3 Actions placement

- Container: `aixia-dash-actions` (auto from command hero)
- Position: top-right of hero inner row
- Buttons: `AixiaButton` variant `secondary` for refresh/navigation; `primary` for main CTA
- Icons: `mr-2 h-4 w-4` inside button
- **No** extra wrapping `div` with custom flex unless multiple groups — prefer fragment `<>...</>`

### 2.4 Parent / back pill

- Component: `aixia-parent-pill` via `parentLabel` + `parentPath`
- Position: top of hero left column, **above** kicker
- Label: destination (`Control Center`, `Finance`, `Master Data`) — **not** “Back to …”
- **Do not** duplicate with a second Back button unless legacy finance page (prefer pill only on new work)

### 2.5 When hero has metrics

| Page type | Hero children |
|-----------|---------------|
| Hub/dashboard | `<AixiaCommandMetrics items={…} />` |
| Child create (finance) | `<AixiaCommandMetrics />` via `AixiaFinanceCommandCreatePage` |
| Child detail with KPIs | Metrics in hero via `AixiaFinanceCommandDetailPage` |
| AgentOps council | **No** hero metrics |
| Registry/list | **No** hero metrics — toolbar only |

---

## 3. Meta / Status Strip (Below Hero, Inside Scroll)

### 3.1 Component

**Must use:** `AixiaFinanceHubMetaStrip` with `variant="command"`  
**Or:** `AixiaRuntimeStatusStrip variant="hub-meta"` (delegates to same grid)

**Forbidden:** `AixiaRuntimeStatusStrip` default inline mode for page meta.

### 3.2 Layout

- Class: `aixia-command-hub-meta` (or `aixia-finance-hub-meta` on finance pages)
- Grid: `repeat(auto-fit, minmax(min(100%, 11rem), 1fr))`
- Cell content: `label` (uppercase) + `value — detail` single line via `AixiaSignalRow`
- Count: **3 cells** preferred (match Finance hub); max 4 on wide hubs; never 6+ cramped cells

### 3.3 Content rules

| Belongs in meta strip | Does NOT belong in meta strip |
|-----------------------|-------------------------------|
| System/runtime inactive | Primary business KPIs |
| Access/roster context | Hero title duplicate |
| Memory policy, staging notes | Duplicate refresh state |
| Record/workflow state | Large badge clusters |

---

## 4. Command / Dashboard Page Pattern

**Reference:** `/finance`

1. Command shell + command hero  
2. Optional `AixiaCommandMetrics` in hero  
3. `aixia-command-scroll`  
4. `AixiaFinanceHubMetaStrip` / command meta strip (3 cells)  
5. Optional `AixiaFinanceHubControlPanel` / feature panel (finance only)  
6. Overview metrics grid / navigation cards (`AixiaSmartLayout`, `AixiaWorkspaceCard`)  
7. Sections with `AixiaSection surface="command"`

---

## 5. Child Page Pattern

**Reference:** `/finance/reports`, `/system/agent-ops/council` (when SOT fixed)

1. `parentLabel` + `parentPath` pill  
2. Kicker + title + subtitle  
3. Actions: refresh + open related (no duplicate back)  
4. Meta strip immediately inside scroll (3 cells)  
5. Primary work sections (`surface="command"`)

---

## 6. Workspace / Detail Pattern

**Shell:** `AixiaWorkspaceShell` or `AixiaFinanceCommandDetailPage`

| Zone | Content |
|------|---------|
| Hero | Context + optional `AixiaCommandMetrics` |
| Scroll lead | Meta strip |
| Primary | Work area (forms, tables, chat workbench) |
| Secondary | Side column via `AixiaSmartLayout` |
| Footer | `AixiaStickyActionFooter` when actions |

---

## 7. Chat Page / Workbench Pattern

| Zone | Standard |
|------|----------|
| Placement | Inside `AixiaSection surface="command"` with `bodyClassName="aixia-section-body--embedded"` |
| Thread | `AixiaChatThread variant="workbench" density="compact"` |
| Max height | `min(280px, 42vh)` default compact — not 480px+ on sparse preview |
| User messages | Right-aligned (`senderType="user"`) |
| Agent messages | Left-aligned, `compact`, badges in header row |
| Composer | Footer dock; disabled state with status text when runtime inactive |
| Participants | `AixiaProgressiveDisclosureGroup` secondary — not primary hero content |
| Meta/runtime | **Above** chat section in meta strip — not inside thread header |

---

## 8. Section Standard

| Prop | Command pages |
|------|---------------|
| `surface` | `"command"` → `aixia-dash-panel` glass |
| Header | `aixia-dash-panel-hd` + icon in `aixia-dash-metric-icon` |
| Title | `aixia-dash-panel-title` |
| Body default | `aixia-dash-panel-body`; embedded chat: `aixia-section-body--embedded` |

Spacing between sections: parent `gap-6` on scroll container.

---

## 9. Visual QA Gate (Required Before Any Migration Sign-Off)

Compare candidate page to `/finance` at 1440×900:

1. Same shell background (command 3D, not orbs)  
2. Same hero title scale  
3. Same action corner placement  
4. Same 3-column meta strip rhythm (if meta exists)  
5. Same section panel chrome  
6. No cramped/wrapping meta labels  
7. Chat workbench not dominant empty block  

**All seven must pass.** JSX component names alone are insufficient.

---

## 10. Component Ownership Summary

| Concern | Owner |
|---------|-------|
| Page shell | `AixiaCommandPage` / `FinancePage` |
| Layout composition | `AixiaCommandPageLayout` |
| Hero | `AixiaHero` `surface="command"` |
| Hero KPIs | `AixiaCommandMetrics` |
| Meta strip | `AixiaFinanceHubMetaStrip variant="command"` |
| Scroll | `.aixia-command-scroll` |
| Sections | `AixiaSection surface="command"` |
| Chat | `AixiaChatThread` + `density="compact"` |
| CSS | `dashboard/layout.css`, `dashboard/visual.css`, `aixia-design-system.css` primitives |
