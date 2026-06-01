<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md, src/design-system/aixia-global/16-design-file-cleanup-map.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file recorded a conflict audit that informed the global cleanup map. It **must not** override owner files. The executive summary may be **historically dated** — active law is in `aixia-global/`.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`00-README-SOURCE-OF-TRUTH.md`](../../src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md) — authority root
> - [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md) — cleanup disposition
>
> - If this audit conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AiXia Design Source-of-Truth Conflict Audit

**Date:** 2026-05-29  
**Scope:** Staging repository scan (read-only audit)  
**Status:** Page migrations **paused** until P0/P1 authority conflicts are resolved.

---

## 1. Executive Summary

AiXia does **not** have one unified design authority today. Multiple parallel systems compete at every layer:

- **Two page atmospheres** (command 3D shell vs default orb shell)
- **Two hero typographies** (`AixiaHero` command vs default gradient XL)
- **Three shell entry points** (`AixiaPage`, `FinancePage` / `AixiaCommandPage`, module page classes)
- **Parallel shadcn/ui stack** in layout, auth, and many app pages
- **Module bridge CSS** imported globally and per-route
- **Three documentation trees** with overlapping and sometimes conflicting rules

Page-by-page fixes (Council, chat primitives, command page wrappers) cannot finish the project because they patch symptoms while **authority remains split**.

---

## 2. Design Owner Files Found

### 2.1 Global CSS load order (`src/main.tsx`)

| Order | File | Purpose | Authority |
|------:|------|---------|-----------|
| 1 | `src/index.css` | Tailwind layers + shadcn HSL tokens + base theme | **Partial** — app chrome + legacy utility |
| 2 | `src/styles/dashboard/tokens.css` | Dashboard CSS variables | **Partial** — command/dashboard tokens |
| 3 | `src/styles/dashboard/layout.css` | Command scroll, page shells, tabs | **Real** — command layout rhythm |
| 4 | `src/styles/dashboard/visual.css` | Dash hero, metrics, glass, orbs | **Real** — command hero/metric visuals |
| 5 | `src/styles/projects/projects-visual.css` | Projects module bridge | **Module-local** — conflicts with global command |
| 6 | `src/styles/aixia-design-system.css` | Global AiXia primitives (~9k+ lines) | **Real** — primary primitive CSS |
| 7 | `src/styles/aixia-process-book.css` | Process/wizard book | **Partial** — workflow-only |

**Imported inside `aixia-design-system.css`:**

| File | Purpose | Conflict |
|------|---------|----------|
| `src/styles/aixia-finance-print.css` | Print documents | OK — isolated print context |
| `src/styles/finance/finance-visual.css` | Finance hero, meta strip, overview grids | **Finance bridge** applied globally |
| `src/styles/finance/master-data-visual.css` | Master data registry tuning | **Finance bridge** |

**Per-route CSS imports (not in main.tsx):**

| File | Imported by | Conflict |
|------|-------------|----------|
| `src/styles/calendar/calendar-visual.css` | `calendar/*` pages | Overrides hero/command patterns |
| `src/styles/chat/chat-visual.css` | `chat/page.tsx` | Parallel chat visual system |
| `src/styles/inbox/inbox-visual.css` | `inbox/page.tsx` | Duplicate command scroll naming |
| `src/styles/tasks/tasks-visual.css` | `tasks/*` pages | Duplicate command scroll naming |

**Not loaded (dead / legacy):**

| File | Notes |
|------|-------|
| `src/App.css` | Vite starter styles; **not imported** anywhere |
| `src/styles/dashboard/admin-usage.css` | Orphan unless imported elsewhere |
| `src/styles/dashboard/presence.css` | Loaded via `DashboardLayout` path for sidebar |

**Tailwind:** `tailwind.config.js` — shadcn color map; used heavily by `src/components/ui/*` and inline Tailwind on pages.

---

### 2.2 Shared components — `src/components/aixia/` (87 files)

| Group | Key files | Authority | Conflicts |
|-------|-----------|-----------|-----------|
| **Page shells** | `AixiaPage`, `FinancePage`, `AixiaCommandPage`, `AixiaCommandPageLayout`, `AixiaWorkspaceShell` | **Split** — 4 composition paths | Finance vs command vs default surface |
| **Hero** | `AixiaHero` | **Split** — `surface=command` vs `default` | Two title scales, two layouts |
| **Finance command shells** | `AixiaFinanceCommandCreatePage`, `AixiaFinanceCommandDetailPage` | **Finance partial SOT** | Not used by AgentOps |
| **Finance hub** | `AixiaFinanceHubMetaStrip`, `AixiaFinanceHubControlPanel`, `AixiaFinanceHubOverviewGrid`, `FinanceHubMetrics` | **Finance partial SOT** | Name implies finance-only; command variant added ad hoc |
| **Metrics** | `AixiaCommandMetrics`, `AixiaMetricCard`, `AixiaMetricGrid`, `AixiaStatusCard` | **Overlapping** | Pages mix hero KPI vs scroll metrics |
| **Sections** | `AixiaSection` (`surface=command` vs default), `AixiaDetailSection` | **Split surfaces** | Same component, different visual language |
| **Tables** | `AixiaTable`, `AixiaTableCells`, `AixiaRegistryToolbar` | **Real** | AgentOps dense-table CSS in global file |
| **Chat** | `AixiaChatThread`, `AixiaChatMessage`, `AixiaChatComposer` | **New partial SOT** | `app/chat/*` still uses local chat UI |
| **Runtime/status** | `AixiaRuntimeStatusStrip`, `AixiaSignalRow` | **Overlapping** | Runtime strip ≠ Finance meta strip (hub-meta variant added late) |
| **Process book** | `process-book/*`, `AixiaProcessBook` | **Workflow SOT** | Separate CSS file + finance shell |
| **Print** | `AixiaFinancePrint.tsx` + print CSS | **Real** — print only | — |
| **Docs in tree** | `AIXIA_STANDARD.md` | **Legacy doc** | Says `AixiaPage` only; omits `FinancePage`/`AixiaCommandPage` |

---

### 2.3 Parallel UI system — `src/components/ui/` (55 files)

| Purpose | Authority | Conflict |
|---------|-----------|----------|
| shadcn/Radix primitives (Button, Card, Table, Dialog, Sidebar, …) | **Parallel stack** | Used in `DashboardLayout`, auth pages, settings, projects, tasks, chat, employees |
| `PageLoader`, `PageError` | **Hybrid** | Used alongside AiXia empty/loading states |

**Rule violation:** Finance/AgentOps guardrails say use `AixiaButton`; dashboard shell still uses `Button` from ui.

---

### 2.4 App layout

| File | Purpose | Conflict |
|------|---------|----------|
| `src/components/layout/DashboardLayout.tsx` | Sidebar, top bar, content area | Imports shadcn + dashboard CSS; wraps all authenticated routes |
| `src/components/ai/FloatingAIChat.tsx` | Global AI floater | Separate visual layer |

---

### 2.5 Module-local component folders (act as design owners)

| Path | Files | Role | Should become |
|------|------:|------|---------------|
| `src/components/finance/*` | 31 | Paycheck/expense wizards, reports, panels | Content-only; visual → shared |
| `src/app/chat/components/*` | 7 | Full chat UI (header, list, composer) | Migrate to `AixiaChat*` or documented exception |
| `src/components/finance/process-book/FinanceProcessBookShell.tsx` | 1 | Finance process wrapper | Extend shared process-book |

---

### 2.6 Developer docs — `src/design-system/` (14 files)

| File | Purpose |
|------|---------|
| `README.md` | Dev-facing index |
| `aixia-page-patterns.md` | Page patterns (Finance-heavy locked sections) |
| `aixia-component-rules.md` | Component usage |
| `aixia-design-principles.md` | Principles |
| `aixia-form-rules.md`, `aixia-table-rules.md`, `aixia-navigation-rules.md`, … | Domain rules |
| `aixia-migration-checklist.md` | Finance migration tracker |
| `aixia-migration-watch-registry.md` | Watch items MW-* |

---

### 2.7 Agent/ops docs — `qa-agent/design-system/` (27+ files)

Includes rulebook, global patterns, phase reports (1A–2A), gap lists, inventories, and `memory/*`. **Operational** layer — must stay aligned with `src/design-system` but currently duplicates and drifts.

---

## 3. Design Authority Map

| Tier | Assets |
|------|--------|
| **Real source of truth (target)** | `aixia-design-system.css` (primitives only), `dashboard/layout.css` + `dashboard/visual.css` (command chrome), `src/components/aixia/*` (components), `src/design-system/*` (human docs) |
| **Partial SOT (module bridges)** | `finance-visual.css`, `master-data-visual.css`, `projects-visual.css`, `calendar/chat/inbox/tasks-visual.css` |
| **Legacy / competing** | `AixiaHero` default surface, `AixiaPage` default surface, shadcn `ui/*`, inline Tailwind on pages |
| **Page-local design** | `app/chat/components/*`, heavy `className` blocks on AgentOps/AI Management pages |
| **Duplicate/conflicting** | `AixiaMetricGrid` vs `AixiaCommandMetrics`; `AixiaRuntimeStatusStrip` vs `AixiaFinanceHubMetaStrip`; four page shell wrappers |

---

## 4. Conflicts Found (Detailed)

### 4.1 Page shell competition

| Shell | Used by | Visual result |
|-------|---------|---------------|
| `FinancePage` → `AixiaCommandPage` + `aixia-finance-page` | Finance hub + most finance routes | Command 3D + finance typography bridge |
| `AixiaPage surface="command"` + `aixia-command-page` | AgentOps CC, some issues pages | Command 3D without finance bridge |
| `AixiaCommandPageLayout` | Council (recent) | Command 3D + layout helper |
| `AixiaPage` default (orbs) | AI Management, some legacy pages | Light orb background — **different product** |
| Module classes (`aixia-projects-page`, etc.) | Projects, inbox, tasks | Parallel command naming in layout.css |

### 4.2 Hero competition

- **Command:** `aixia-dash-kicker`, `aixia-dash-title--hero` (~1.35–1.75rem)
- **Default:** `aixia-title-xl` + `aixia-gradient-text` (larger, marketing-like)
- **Docs contradiction:** `AIXIA_STANDARD.md` lists `statusCards`; Finance locked standard forbids badges in hero and moves KPIs to `AixiaCommandMetrics`

### 4.3 Meta / status row competition

- Finance: `AixiaFinanceHubMetaStrip` + `.aixia-finance-hub-meta` grid
- AgentOps: historically `AixiaRuntimeStatusStrip` inline (broken wrapping); recent `variant="command"` on meta strip
- Global CSS: `.aixia-command-hub-meta` duplicated from finance rules in `aixia-design-system.css` — **third copy of same layout**

### 4.4 Typography scale

Owners: `index.css` shadcn vars, `dashboard/tokens.css`, `finance-visual.css` hero overrides, `aixia-design-system.css` finance page locks, Tailwind utilities on pages.

### 4.5 Scroll behavior

- `.aixia-command-scroll` (global)
- `.aixia-finance-page-scroll`, `.aixia-projects-scroll`, `.aixia-inbox-scroll`, `.aixia-tasks-scroll` (aliases in layout.css)
- Per-module duplicates in tasks/inbox CSS (guardrail MW-008)

### 4.6 Chat

- **Product chat:** `src/app/chat/components/*` + `chat-visual.css`
- **AgentOps council:** `AixiaChatThread` workbench + global chat CSS
- No single chat authority

### 4.7 Tables

- `AixiaTable` + registry cells (shared)
- shadcn `Table` on some pages
- AgentOps `.agentops-dense-table` overrides inside `aixia-design-system.css` (module CSS inside global file)

---

## 5. Documentation Contradictions

| Topic | Doc A | Doc B | Actual code |
|-------|-------|-------|-------------|
| Page shell | `AIXIA_STANDARD.md`: `AixiaPage` | Rulebook: `FinancePage` + shared CSS | Four wrappers in use |
| Hero badges | `AIXIA_STANDARD.md`: use `badges` | `aixia-page-patterns.md`: forbidden on finance command hero | Finance forbids; Council had badges until rework |
| Hero KPIs | `AIXIA_STANDARD.md`: `AixiaMetricGrid` | Locked finance header: `AixiaCommandMetrics` in hero only | Both exist in codebase |
| Meta strip | Phase 2A reports: `AixiaRuntimeStatusStrip` | Finance patterns: `AixiaFinanceHubMetaStrip` only | Both used; different layouts |
| Module CSS | `aixia-design-principles.md`: bridge may tune rhythm only | `calendar-visual.css` / `chat-visual.css` replace hero systems | Guardrails flag conflicts |
| Migration next step | Master memory: implement gap components | Phase 2B report: History migration | User: **stop migrations** |

---

## 6. Why Page-by-Page Fixes Keep Failing

1. **No single shell** — Council was moved to command shell while AI Management still uses orb `AixiaPage`; Finance adds `aixia-finance-page` bridge. Side-by-side comparisons fail because **baseline is module-specific**.

2. **Wrong primitive for the pattern** — Status/context rows need Finance meta grid, not runtime inline strip. JSX “uses shared components” but **wrong shared component**.

3. **CSS load order** — `finance-visual.css` loads globally inside `aixia-design-system.css`, so “global” rules are finance-biased; other modules add second overrides per route.

4. **Dual hero API** — `surface` prop is optional; default is **not** command. New pages forget `surface="command"` and look like a different product.

5. **shadcn coexistence** — Dashboard chrome and many pages still use ui/Button, ui/Card; spacing and radius differ from AiXia dash actions.

6. **Documentation sprawl** — Agents read phase reports that say “migration successful” while rulebook says different hero rules; no single locked **PAGE_SHELL_HERO** doc until now.

7. **Accumulation without deprecation** — New shared components (CommandPage, RuntimeStrip, ChatThread) added without retiring old paths or merging CSS class families.

---

## 7. Scan Coverage Confirmation

| Scan area | Scanned |
|-----------|---------|
| `src/styles/**` | Yes — 18 CSS files + import graph |
| `src/index.css`, `App.css` | Yes |
| `tailwind.config.js` | Yes |
| `src/components/aixia/**` | Yes — 87 files |
| `src/components/ui/**` | Yes — 55 files |
| `src/components/layout`, finance, chat | Yes |
| Page shells in `src/app/**` | Yes — grep for FinancePage/AixiaPage/Command |
| Local design patterns in pages | Yes — ui imports, module CSS, agentops classes |
| `qa-agent/design-system/**` | Yes |
| `src/design-system/**` | Yes |
| `AIXIA_STANDARD.md` | Yes |

---

## 8. Recommended Immediate Action (No Page Edits)

1. Approve **unified authority plan** and **PAGE_SHELL_HERO_STANDARD** (companion docs).
2. Execute **P0 consolidation backlog** only (shell/hero/CSS/doc merge).
3. Freeze all page migrations until P0 complete.
4. Do not approve Phase 2A/2B proof migrations until browser pass uses **locked standard**, not ad hoc fixes.
