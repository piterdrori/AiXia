<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md, src/design-system/aixia-global/16-design-file-cleanup-map.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file is the **program plan** that led to `src/design-system/aixia-global/` owner files `00`–`16`. It **must not** override those owner files as active law.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`00-README-SOURCE-OF-TRUTH.md`](../../src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md) — authority root
> - [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md) — cleanup disposition
>
> - If this plan conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AiXia Unified Global Design Folder & Cleanup Plan

**Date:** 2026-05-30  
**Type:** Documentation / audit only — **no code, CSS, component, page, file move, or deletion in this task**  
**Status:** Plan for approval. All page migration and implementation work **paused**.

---

## Critical principle (locked)

> **All AiXia authenticated app pages must follow one shared global design system. Module-specific wrappers may provide data/context only, but they must not create separate visual standards. Every visual aspect must have exactly one source-of-truth owner file. Changing that owner file must change the standard everywhere. Old/conflicting design files must be deprecated or deleted so they cannot confuse future agents.**

---

## 1. Purpose

Define **one** mutual/shared/global design folder for the entire AiXia website and a precise cleanup map so that:

- There is one source-of-truth folder for all website visual law.
- Each file inside owns exactly **one** design aspect.
- No module-specific, finance, AgentOps, calendar, or page-local design file competes with it.
- Changing one owner file changes the standard everywhere.
- Old/duplicate/conflicting design files are deprecated or deleted (later, after approval).

---

## 2. Why all page work is paused

| Reason | Detail |
|--------|--------|
| Root cause is authority fragmentation, not page bugs | Conflict audit found 2 page atmospheres, 2 hero typographies, 3+ shell entry points, multiple competing CSS/doc trees |
| Route-by-route work was not closing parity | Batches 6–8 finance shell proofs reduced guardrail counts but did not fix visible inconsistency |
| Implementing before unifying authority deepens debt | Command-surface context, History migration, hero default flip all depend on a settled single source-of-truth |
| Piter's requirement | One global design folder first; one owner per aspect; no competing standards |

**Paused:** finance shell proofs (Batch 9), command-surface context (Batch 10 prep), AgentOps History/Council migration, individual page patches, all CSS/component/visual edits.

---

## 3. Proposed global design folder path

**Recommended:** `src/design-system/aixia-global/`

**Why this path:**

- `src/design-system/` is **already** the declared governance entry (`README.md`) and is referenced by `AIXIA_STANDARD.md` and component docs — building the canonical folder here keeps existing links valid and avoids a second top-level tree.
- Co-located with code (`src/`) so component authors and Cursor/Hermes find it next to `src/components/aixia/` and `src/styles/`.
- A dedicated `aixia-global/` subfolder gives a clean, numbered, single-owner file set while the legacy `src/design-system/*.md` files are deprecated/merged in place.

**Rejected alternatives:**

- `qa-agent/design-system/` — this is the **agent/QA layer** (reports, memory, audits). It should *mirror* the law, not *own* it. Keeping law here keeps confusing it with throwaway batch reports.
- Repo root `/design-system/` — detaches law from `src/` code; weaker discoverability.

**Relationship:**

```
src/design-system/aixia-global/   ← LAW (one owner per aspect)  [NEW]
src/design-system/*.md            ← legacy rules → merge then deprecate
qa-agent/design-system/**         ← agent layer: reports/memory MIRROR the law
src/components/aixia/**           ← implementation of the law
src/styles/**                     ← CSS implementation of the law
scripts/guardrails/**             ← enforcement pointing at the law
```

---

## 4. Proposed file structure

`src/design-system/aixia-global/`

| File | Single owned aspect |
|------|---------------------|
| `00-README-SOURCE-OF-TRUTH.md` | Global authority rule, reading order, deprecation list, one-owner rule |
| `01-design-tokens.md` | Colors, background, glass opacity, borders, shadows, radius, spacing, z-index, motion, breakpoints, status colors |
| `02-typography-standard.md` | Fonts, sizes, weights, line height, letter spacing, headings, labels, body, helper, table text, button text |
| `03-page-shell-standard.md` | Authenticated app shell, background, padding, max width, vertical rhythm, wrapper shell rules, atmosphere |
| `04-hero-header-standard.md` | Hero/header layout, title/eyebrow/subtitle/actions, KPI/status placement, command/default behavior, `AixiaHero` |
| `05-meta-status-strip-standard.md` | Page meta strips, hub meta rows, runtime status separation, strip layout |
| `06-card-section-standard.md` | Section/KPI/summary/action cards, overview grids, card position, spacing, two-column rhythm |
| `07-button-action-standard.md` | Button variants, primary/secondary/danger meaning, action location, row/header/footer/confirmation actions, archive/delete/restore |
| `08-table-list-standard.md` | Registry/archive tables, list rows, sticky headers, action cells, horizontal scroll, row heights, alignment, responsive |
| `09-form-input-standard.md` | Inputs, selects, textareas, date fields, labels, helper, validation state, form layout |
| `10-modal-drawer-standard.md` | Modals, drawers, archive manager, confirmations, popups, overlay behavior |
| `11-scroll-responsive-standard.md` | Page scroll, internal scroll, table scroll, calendar/grid exceptions, mobile/tablet/desktop, 14-inch + large desktop |
| `12-navigation-workspace-standard.md` | Navigation/workspace cards, hub pages, side/info panels, module cards |
| `13-module-wrapper-rules.md` | Finance/AgentOps/Calendar/Tasks/Projects/HR/Mail wrapper rules; what wrappers may/never customize; delegate-only |
| `14-page-migration-rules.md` | Safe migration, what counts as migration, shell-only meaning, forbidden local invention, approval sequence |
| `15-guardrail-rules.md` | Guardrail enforcement, warn vs hard-error, deprecated-pattern detection, scripts point to this folder |
| `16-design-file-cleanup-map.md` | Every old design file: keep/deprecate/delete/migrate, reason, replacement owner, deletion order |

---

## 5. One-owner-per-design-aspect rule

| Rule | Statement |
|------|-----------|
| R1 | Each visual aspect has exactly **one** owner file in `aixia-global/`. |
| R2 | No other doc, component, or CSS file may define a competing standard for that aspect. |
| R3 | Changing the owner file changes the standard website-wide. |
| R4 | Module wrappers (Finance/AgentOps/etc.) provide **data/context only** — never visual law. |
| R5 | Implementation files (components, CSS) **realize** the owner file; they do not **author** new law. |
| R6 | Agent/QA docs (`qa-agent/**`) **mirror** the law; they never override it. |
| R7 | Any file not in `aixia-global/` that asserts visual law is **deprecated** or **delete-later**. |

---

## 6. Current competing design **doc** inventory

### 6.1 `qa-agent/design-system/` (50 .md)

| File | Role today | Class |
|------|-----------|-------|
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | Locked shell/hero/meta/scroll law | **KEEP CANONICAL** → 03/04/05/11 |
| `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md` | Layer architecture | **KEEP CANONICAL** → 00/13 |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` | P0/P1 backlog | **KEEP CANONICAL** → 16 inputs |
| `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md` | Conflict inventory | **KEEP CANONICAL** → 16 inputs |
| `AIXIA_P0_META_STRIP_AUTHORITY.md` | Meta strip law | **KEEP CANONICAL** → 05 |
| `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` | Scroll aliases | **KEEP CANONICAL** → 11 |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` | Shell/hero enforcement | **KEEP CANONICAL** → 03/04/15 |
| `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | Guardrail rules | **KEEP CANONICAL** → 15 |
| `AIXIA_GLOBAL_PAGE_PATTERNS.md` | Page patterns | **KEEP CANONICAL** → 03/06/12 |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md` | Rulebook | **KEEP CANONICAL** → 00 |
| `AIXIA_AI_PAGE_BUILDING_RULES.md` | AI build rules | **KEEP CANONICAL** → 00/14 |
| `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md` | QA checklist | **KEEP CANONICAL** → 15 |
| `AIXIA_SHARED_COMPONENT_GAP_LIST.md` | Component gaps | **KEEP CANONICAL** → 06/13 inputs |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md` | Migration plan | **KEEP CANONICAL** → 14 |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md` | Next-step plan | **DEPRECATE** (superseded by this plan) |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md` | Foundation report | **DEPRECATE** (history) |
| `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md` | Component audit | **KEEP CANONICAL** → 13 inputs |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` | AgentOps plan | **KEEP CANONICAL** → 04/13/14 inputs |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` | Parity audit | **KEEP CANONICAL** → 16 inputs |
| `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md` | Direction clarification | **KEEP** (history/context) |
| `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md` | Finance bridge plan | **KEEP** (→ 13 inputs) |
| `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md` | Calendar scroll | **KEEP** (→ 11 inputs) |
| `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | shadcn boundary | **KEEP** (→ 15 inputs) |
| `AIXIA_P0_BATCH_1..8_*` (8 reports) | Batch history | **DEPRECATE** as authority (history only) |
| `AIXIA_PHASE_1A..2A_*` (10 reports) | Phase history | **DEPRECATE** as authority (history only) |
| `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md` | Consolidation report | **DEPRECATE** (history) |
| `AIXIA_WEBSITE_STRUCTURE_INVENTORY_REPORT.md` / `AIXIA_FULL_WEBSITE_STRUCTURE_INVENTORY.md` | Structure inventory | **KEEP** (reference, non-visual) |

### 6.2 `qa-agent/design-system/memory/` (4)

| File | Class |
|------|-------|
| `AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md` | **KEEP AS WRAPPER** → must point to `aixia-global/00` |
| `AIXIA_DESIGN_COMPONENT_MEMORY.md` | **KEEP AS WRAPPER** → mirror, not law |
| `AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | **KEEP AS WRAPPER** → mirror, not law |
| `AIXIA_WEBSITE_STRUCTURE_MEMORY.md` | **KEEP** (non-visual reference) |

### 6.3 `src/design-system/` (14)

| File | Class | Target owner |
|------|-------|--------------|
| `README.md` | **KEEP AS WRAPPER** | Governance entry → delegate to `aixia-global/00` |
| `aixia-design-principles.md` | **KEEP CANONICAL** | 00/01/02 |
| `aixia-page-patterns.md` | **KEEP CANONICAL** | 03/04/06/12 |
| `aixia-component-rules.md` | **KEEP CANONICAL** | 06/07/09 |
| `aixia-table-rules.md` | **KEEP CANONICAL** | 08 |
| `aixia-form-rules.md` | **KEEP CANONICAL** | 09 |
| `aixia-navigation-rules.md` | **KEEP CANONICAL** | 12 |
| `aixia-archive-rules.md` | **KEEP CANONICAL** | 07/10 |
| `aixia-conflict-deprecation-policy.md` | **KEEP CANONICAL** | 15/16 |
| `aixia-migration-checklist.md` | **KEEP CANONICAL** | 14 |
| `aixia-migration-watch-registry.md` | **KEEP AS WRAPPER** | 14 (living registry) |
| `aixia-refresh-rules.md` | **KEEP** (behavior, partly non-visual) | 13 (silent refresh) |
| `aixia-permission-ui-rules.md` | **KEEP** (behavior) | 13 (permission UI) |
| `aixia-finance-workflow-registry-contract.md` | **MIGRATE LATER** | Finance-specific → 08/13 generalize |

### 6.4 Component-folder docs

| File | Class |
|------|-------|
| `src/components/aixia/AIXIA_STANDARD.md` | **DEPRECATE** (already marked deprecated as design law; keep as component index only until merged into 00/06/07) |

---

## 7. Current competing **CSS** inventory

| File | Owns today | Class | Target owner / rule |
|------|-----------|-------|---------------------|
| `src/styles/aixia-design-system.css` | ~9k lines primitives | **KEEP CANONICAL** | Split by aspect → 01/02/06/07/08/09/10; primary implementation |
| `src/styles/dashboard/tokens.css` | command/dash tokens | **KEEP CANONICAL** | 01 |
| `src/styles/dashboard/layout.css` | command page/scroll/tabs | **KEEP CANONICAL** | 03/11 |
| `src/styles/dashboard/visual.css` | dash hero/metrics/glass | **KEEP CANONICAL** | 04/06 |
| `src/styles/dashboard/sidebar-chrome.css` | app shell sidebar/topbar | **KEEP AS WRAPPER** | App chrome only (not page law) |
| `src/styles/dashboard/presence.css` | presence chrome | **KEEP** (feature chrome) | 13 |
| `src/styles/dashboard/admin-usage.css` | admin usage | **MIGRATE LATER** (audit if orphan/imported) | 06/08 or delete |
| `src/styles/finance/finance-visual.css` | finance hero/meta/grids | **KEEP AS WRAPPER** | Scoped `.aixia-finance-page` bridge only; no global selectors |
| `src/styles/finance/master-data-visual.css` | finance registry density | **KEEP AS WRAPPER** | Scoped finance registry only |
| `src/styles/calendar/calendar-visual.css` | calendar hero/scroll overrides | **MIGRATE LATER** | Deprecate hero overrides → 04/11; keep grid exceptions in 11 |
| `src/styles/chat/chat-visual.css` | chat visual system | **MIGRATE LATER** | Merge into shared chat components / deprecate |
| `src/styles/inbox/inbox-visual.css` | inbox scroll naming | **MIGRATE LATER** | Merge scroll into 11 aliases |
| `src/styles/tasks/tasks-visual.css` | tasks scroll naming | **MIGRATE LATER** | Merge into 11 aliases |
| `src/styles/projects/projects-visual.css` | projects bridge | **MIGRATE LATER** | Merge into command global (03/06) |
| `src/styles/aixia-process-book.css` | workflow/wizard book | **KEEP AS WRAPPER** | Scoped workflow only (P2) |
| `src/styles/aixia-finance-print.css` | print documents | **KEEP** (isolated print context) | Out of screen-design scope |

---

## 8. Current competing **component** inventory

`src/components/aixia/**` (77 components) — **implementation, not law**. They **KEEP** but must consume `aixia-global/` owners. Highlighted classifications:

| Component(s) | Class | Note |
|--------------|-------|------|
| `AixiaPage`, `AixiaCommandPage`, `AixiaCommandPageLayout` | **KEEP CANONICAL** (implements 03) | Deprecate default orb surface usage on app pages |
| `FinancePage` | **KEEP AS WRAPPER** | Delegates to `AixiaCommandPage` + finance class; no new law |
| `AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage` | **KEEP AS WRAPPER** / **MIGRATE LATER** | Finance composition; generalize to shared command detail/create (P1-04) |
| `AixiaHero` | **KEEP CANONICAL** (implements 04) | Default surface analysis pending; owner = 04 |
| `AixiaCommandHubMetaStrip`, `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip`, `AixiaSignalRow` | **KEEP CANONICAL** (implements 05) | One strip law; finance wrapper delegates |
| `AixiaCommandMetrics`, `AixiaMetricCard`, `AixiaMetricGrid`, `AixiaStatusCard`, `FinanceHubMetrics` | **KEEP CANONICAL / alias cleanup** (06) | Resolve metric duplication (P1-01); `FinanceHubMetrics` naming alias |
| `AixiaSection`, `AixiaDetailSection`, `AixiaContentBlocks`, `AixiaValueBlock` | **KEEP CANONICAL** (06) | Default command surface |
| `AixiaButton`, `AixiaActionSystem`, `AixiaActionCard`, `AixiaRowActionMenu`, `AixiaLifecycleRowActions`, `AixiaArchiveRowActions`, `AixiaStickyActionFooter` | **KEEP CANONICAL** (07) | One action law |
| `AixiaTable`, `AixiaTableCells`, `AixiaRegistryToolbar`, `AixiaSideList`, `AixiaHistoryRow` | **KEEP CANONICAL** (08) | AgentOps dense-table CSS to move out of global (P1-06) |
| `AixiaFormFields`, `AixiaInputField`-style, `AixiaSelectField`, `AixiaDatePicker`, `AixiaSearchField` | **KEEP CANONICAL** (09) | |
| `AixiaModal`, `AixiaArchiveManagerModal`, `AixiaPopoverPanel` | **KEEP CANONICAL** (10) | |
| `AixiaNavigationCard`, `AixiaWorkspaceCard`, `AixiaWorkspaceShell`, `AixiaFeaturePanel` | **KEEP CANONICAL** (12) | |
| `AixiaChatThread/Message/Composer` | **KEEP CANONICAL** (12/own) | Chat consolidation supersedes `chat-visual.css` |
| `src/components/layout/DashboardLayout.tsx` | **KEEP AS WRAPPER** | App chrome; shadcn allowed here only |
| `src/components/ui/**` (shadcn) | **KEEP AS WRAPPER** | Chrome/auth only — **never** page content law; `PageLoader.tsx` unused → **DELETE LATER** |

---

## 9. Current competing **docs** authority summary

| Authority tier today | Files | Problem |
|----------------------|-------|---------|
| Locked law | `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | Only covers shell/hero/meta/scroll — not buttons/tables/forms/modals/tokens |
| Governance entry | `src/design-system/README.md` | Points to multiple files; no single numbered owner set |
| Component index (deprecated as law) | `AIXIA_STANDARD.md` | Still readable; risk of agents treating as law |
| Rules docs | `src/design-system/aixia-*.md` (13) | Per-topic, but not numbered single-owner; overlap with qa-agent docs |
| Agent memory | `memory/*.md` (4) | Mirror, sometimes restate law |
| Batch/phase reports | ~20 reports | History; risk of being read as current law |

**Collision:** shell/hero/typography/buttons rules appear in `AIXIA_STANDARD.md`, `src/design-system/*.md`, `AIXIA_PAGE_SHELL_HERO_STANDARD.md`, and memory simultaneously.

---

## 10. Collision table by design aspect

| Design aspect | Competing sources today | Collision risk |
|---------------|-------------------------|----------------|
| Tokens (color/glass/radius/spacing) | `aixia-design-system.css`, `dashboard/tokens.css`, `index.css` (shadcn HSL) | Two token systems (AiXia + shadcn) |
| Typography | `aixia-design-system.css`, `dashboard/visual.css`, `AIXIA_STANDARD.md`, `design-principles.md` | XL gradient vs command kicker |
| Page shell | `AixiaPage`/`AixiaCommandPage`/`FinancePage`/`AixiaCommandPageLayout`, `layout.css`, `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | 4 wrappers, orb vs command |
| Hero | `AixiaHero` (default vs command), `visual.css`, `finance-visual.css`, `AIXIA_STANDARD.md` | 2 hero typographies |
| Meta/status strip | `AixiaCommandHubMetaStrip`, `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip` | 3 strip components |
| Cards/sections | `AixiaSection` (2 surfaces), `MetricGrid`/`CommandMetrics`, finance overview grids, local Tailwind cards | KPI in hero vs scroll |
| Buttons/actions | `AixiaButton`, `AixiaActionSystem`, shadcn `ui/button`, local Tailwind buttons | shadcn vs AiXia |
| Tables/lists | `AixiaTable`, `agentops-dense-table` CSS in global, finance registry CSS | module CSS in global file |
| Forms | `AixiaFormFields`, `form-rules.md`, scattered inline inputs | partial |
| Modals/drawers | `AixiaModal`, `AixiaArchiveManagerModal`, shadcn dialog | shadcn vs AiXia |
| Scroll/responsive | `layout.css` aliases, calendar/inbox/tasks/projects CSS | competing scroll classes |
| Navigation/workspace | `AixiaNavigationCard`, `AixiaWorkspaceCard`, local hub layouts | partial |
| Module wrappers | finance/calendar/chat/inbox/tasks/projects CSS + finance command shells | module visual law leakage |

---

## 11. Canonical owner proposed per design aspect

| Aspect | Owner file | Primary CSS implementation | Primary component(s) |
|--------|-----------|----------------------------|----------------------|
| Tokens | `01-design-tokens.md` | `dashboard/tokens.css` + token block of `aixia-design-system.css` | — |
| Typography | `02-typography-standard.md` | `aixia-design-system.css` (type scale) | `AixiaHero`, `AixiaSection` |
| Page shell | `03-page-shell-standard.md` | `dashboard/layout.css` | `AixiaCommandPage`, `AixiaCommandPageLayout`, `FinancePage` |
| Hero | `04-hero-header-standard.md` | `dashboard/visual.css` | `AixiaHero` |
| Meta strip | `05-meta-status-strip-standard.md` | hub-meta block of `aixia-design-system.css` | `AixiaCommandHubMetaStrip` |
| Cards/sections | `06-card-section-standard.md` | `aixia-design-system.css` (cards), `visual.css` (metrics) | `AixiaSection`, `AixiaCommandMetrics`, `AixiaMetricCard` |
| Buttons/actions | `07-button-action-standard.md` | `aixia-design-system.css` (buttons/action-system) | `AixiaButton`, `AixiaActionSystem` |
| Tables/lists | `08-table-list-standard.md` | `aixia-design-system.css` (tables) | `AixiaTable`, `AixiaRegistryToolbar` |
| Forms | `09-form-input-standard.md` | `aixia-design-system.css` (forms) | `AixiaFormFields` |
| Modals/drawers | `10-modal-drawer-standard.md` | `aixia-design-system.css` (modals) | `AixiaModal`, `AixiaArchiveManagerModal` |
| Scroll/responsive | `11-scroll-responsive-standard.md` | `dashboard/layout.css` (scroll aliases) | shells |
| Navigation/workspace | `12-navigation-workspace-standard.md` | `aixia-design-system.css` | `AixiaNavigationCard`, `AixiaWorkspaceCard` |
| Module wrappers | `13-module-wrapper-rules.md` | scoped bridge CSS only | `FinancePage`, finance command shells |
| Migration | `14-page-migration-rules.md` | — | — |
| Guardrails | `15-guardrail-rules.md` | `scripts/guardrails/**` | — |
| Cleanup map | `16-design-file-cleanup-map.md` | — | — |

---

## 12. Files to KEEP AS CANONICAL INPUT (merge into `aixia-global/`)

- `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md` → 03/04/05/11
- `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md` → 00/13
- `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md`, `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md`, `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` → 16
- `AIXIA_P0_META_STRIP_AUTHORITY.md` → 05; `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` → 11
- `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md`, `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md`, `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md`, `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` → 15
- `AIXIA_GLOBAL_PAGE_PATTERNS.md`, `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md`, `AIXIA_AI_PAGE_BUILDING_RULES.md` → 00/03/06/12/14
- `AIXIA_SHARED_COMPONENT_GAP_LIST.md`, `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md`, `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` → 06/13/14
- `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md` → 14
- `src/design-system/aixia-design-principles.md`, `aixia-page-patterns.md`, `aixia-component-rules.md`, `aixia-table-rules.md`, `aixia-form-rules.md`, `aixia-navigation-rules.md`, `aixia-archive-rules.md`, `aixia-conflict-deprecation-policy.md`, `aixia-migration-checklist.md` → respective owners
- CSS: `aixia-design-system.css`, `dashboard/tokens.css`, `dashboard/layout.css`, `dashboard/visual.css`

---

## 13. Files to KEEP AS WRAPPER ONLY (delegate; no separate law)

- `src/design-system/README.md` (governance entry → points to `aixia-global/00`)
- `qa-agent/design-system/memory/*.md` (mirror law)
- `src/design-system/aixia-migration-watch-registry.md` (living registry)
- `src/components/aixia/FinancePage.tsx`, `AixiaFinanceCommandDetailPage.tsx`, `AixiaFinanceCommandCreatePage.tsx`
- `src/styles/finance/finance-visual.css`, `finance/master-data-visual.css` (scoped bridge)
- `src/styles/dashboard/sidebar-chrome.css`, `presence.css`, `aixia-process-book.css`
- `src/components/layout/DashboardLayout.tsx`, `src/components/ui/**` (chrome/auth only)

---

## 14. Files to DEPRECATE (not source-of-truth; keep for history)

- `src/components/aixia/AIXIA_STANDARD.md` (component index only; not law)
- All `AIXIA_P0_BATCH_1..8_*` reports
- All `AIXIA_PHASE_1A..2A_*` reports
- `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md`
- `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md`, `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md`

> Deprecation = add a header banner pointing to `aixia-global/` once the new folder exists. **Not** done in this task.

---

## 15. Files to DELETE LATER (after new folder confirmed + dependents migrated)

| File | Reason | Gate |
|------|--------|------|
| `src/components/ui/PageLoader.tsx` | 0 app usages (replaced by `AixiaAsyncState`) | Confirm no imports |
| `src/App.css` (if present, Vite starter) | Not imported | Confirm not referenced |
| Batch/phase report duplicates | Pure history; archive to `qa-agent/design-system/archive/` | After 16 cleanup map merged |
| `src/styles/dashboard/admin-usage.css` | If confirmed orphan/unimported | Import-check first |

**No deletions in this task.** All require dependency map + approval per `aixia-conflict-deprecation-policy.md`.

---

## 16. Files to MIGRATE LATER (move logic into global / replace with shared)

| File | Migration |
|------|-----------|
| `src/styles/calendar/calendar-visual.css` | Deprecate hero overrides → 04; keep only grid/scroll exceptions in 11 |
| `src/styles/chat/chat-visual.css` | Replace with shared `AixiaChat*` components |
| `src/styles/inbox/inbox-visual.css` | Merge scroll naming into 11 aliases |
| `src/styles/tasks/tasks-visual.css` | Merge into 11 aliases |
| `src/styles/projects/projects-visual.css` | Merge into command global (03/06) |
| `AixiaFinanceCommandDetailPage/CreatePage` | Generalize to shared command detail/create (P1-04) |
| `FinanceHubMetrics` | Alias/cleanup vs `AixiaCommandMetrics` (P1-01/P3-03) |
| `aixia-finance-workflow-registry-contract.md` | Generalize finance-only contract → 08/13 |
| `agentops-dense-table` CSS in `aixia-design-system.css` | Move to `data-density="compact"` on `AixiaTable` (P1-06) |

---

## 17. What each future global design file owns

(See §4 table — each numbered file owns exactly one aspect. `00` owns authority/reading order; `16` owns the cleanup map and deletion order.)

---

## 18. What no module file is allowed to own anymore

After unification, **no** module or page file may define:

- page background / atmosphere / shell wrapper
- hero typography / hero layout
- meta strip layout
- card/section spacing or grid rhythm
- button variants / action placement meaning
- table/list structure or scroll behavior
- form field styling
- modal/overlay behavior
- token values (color/glass/radius/spacing/motion/breakpoints)
- scroll/responsive class definitions

Module CSS may **only** scope **bridge** adjustments under a documented module class (e.g. `.aixia-finance-page`) that does **not** redefine global aspects.

---

## 19. How modules must use the global folder

| Module | Allowed (data/context) | Forbidden (visual law) |
|--------|------------------------|------------------------|
| **Finance** | `FinancePage` wrapper for `.aixia-finance-page` scope; data, permissions, registry contracts | New hero/card/table/scroll standards |
| **AgentOps** | `AixiaCommandPageLayout` + `AixiaHero surface="command"` + hub meta strip; data/owner gating | Orb shell, gradient hero, local metric grids |
| **Calendar** | Grid/scroll **exception** documented in 11; data | Local hero overrides, local scroll classes |
| **Tasks/Projects** | Command shell + shared cards/tables; data | Module scroll/card CSS |
| **HR/Mail/Inbox/Chat** | Shared shells + shared components; data | Local visual systems (chat → shared `AixiaChat*`) |

Rule: **wrappers delegate to global primitives only.**

---

## 20. How guardrails should point to the global folder

| Guardrail | Update (later) |
|-----------|----------------|
| `scripts/guardrails/aixia-guardrail-allowlists.mjs` | `PAGE_SHELL_HERO_STANDARD` const → `src/design-system/aixia-global/03-page-shell-standard.md` (+ hero 04) |
| `aixia-shell-hero-guardrails.mjs` | Reference 03/04 in messages |
| `aixia-shadcn-boundary-guardrails.mjs` | Reference 07/15 |
| `aixia-visual-parity.mjs`, `aixia-dashboard-page.mjs` | Reference 03/04/06 |
| `scripts/aixia-guardrails.mjs` (build) | Print “Authority: src/design-system/aixia-global/00” |
| `15-guardrail-rules.md` | Documents warn-only vs hard-error and which paths escalate |

All guardrail message hints should cite the **numbered owner file**, not scattered docs.

---

## 21. Cleanup order

1. **Create** `src/design-system/aixia-global/` with `00-README-SOURCE-OF-TRUTH.md` + `16-design-file-cleanup-map.md` (next batch).
2. Write canonical owner files `01`–`15` by merging KEEP-CANONICAL inputs (one aspect per batch).
3. Add **deprecation banners** to DEPRECATE files pointing to the new owners.
4. Convert KEEP-AS-WRAPPER docs/components/CSS to explicit delegation notes.
5. Point **guardrails** at the new owner files.
6. **Migrate** module CSS/components per §16 (one module per batch, with browser + build verification).
7. **Delete** DELETE-LATER files only after dependents confirmed migrated and Piter approves.
8. Archive history reports to `qa-agent/design-system/archive/`.

---

## 22. Risks

| Risk | Mitigation |
|------|------------|
| Broken doc links during move | Keep legacy files in place with deprecation banner until links updated |
| Agents reading old reports as law | Banner + `00` deprecation list + guardrail message pointing to owners |
| CSS split regressions | Split by aspect with build + browser verification; no behavior change during doc creation |
| Module bridge over-scoping | Enforce module class scoping rule (18/19) in guardrails |
| Premature deletion | Hard gate: dependency map + responsive verification + approval (policy doc) |
| Large `aixia-design-system.css` split risk | Documentation owns rules; CSS file may stay single until a controlled split batch |

---

## 23. Approval needed from Piter before deleting/moving anything

**Explicit approval required for:**

1. Creating `src/design-system/aixia-global/` and adopting it as the **single** law folder.
2. Deprecating `AIXIA_STANDARD.md` and all batch/phase reports as authority.
3. Marking `src/design-system/*.md` as canonical inputs to be merged then deprecated.
4. Any **file move, rename, or deletion** (none done here).
5. Any **CSS split** of `aixia-design-system.css`.
6. Pointing guardrails at the new folder.

**No file is moved or deleted in this task.**

---

## 24. Recommended next batch

**Batch 10 (revised): Create the unified global design folder — first canonical files only**

1. Create `src/design-system/aixia-global/`.
2. Write `00-README-SOURCE-OF-TRUTH.md` (authority rule, reading order, deprecation list, one-owner rule, critical principle).
3. Write `16-design-file-cleanup-map.md` (port §6–§16 of this plan into the living map).
4. **Do not** write `01`–`15` yet (one-aspect-per-batch after 00/16 approved).
5. **Do not** move/delete/deprecate existing files yet (banner pass is a later step).

**Explicitly NOT next:** finance route shell proofs · command-surface context · AgentOps/History/Council patches · individual page cleanup.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** (see below) |
| `npm run build` | Not run (documentation-only) |

---

## Final check

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md` |
| 2 | Files modified | **None** |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Finance changed | **No** |
| 7 | AgentOps changed | **No** |
| 8 | Global design folder proposed | **Yes** — `src/design-system/aixia-global/` |
| 9 | One-owner-per-design-aspect rule confirmed | **Yes** |
| 10 | Cleanup map created | **Yes** (§6–§16; full living map deferred to `16-…`) |
| 11 | Keep/deprecate/delete/migrate classified | **Yes** |
| 12 | Page migrations remain paused | **Yes** |
| 13 | Batch 9 finance proofs paused | **Yes** |
| 14 | Batch 10 command-surface context paused | **Yes** (replaced by folder-creation batch) |
| 15 | Command results | `qa:validate-foundation` PASS |
| 16 | Final status | Plan complete — ready to create `aixia-global/` `00` + `16` on approval |
| 17 | Recommended next batch | Create `src/design-system/aixia-global/` with `00-README-SOURCE-OF-TRUTH.md` + `16-design-file-cleanup-map.md` |
