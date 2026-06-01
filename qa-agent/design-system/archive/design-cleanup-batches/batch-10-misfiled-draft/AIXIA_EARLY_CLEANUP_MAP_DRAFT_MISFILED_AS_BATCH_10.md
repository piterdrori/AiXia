# AiXia Global Design System — Design File Cleanup Map

## Status

**Living map for old/conflicting design files.** No files are deleted, moved, renamed, or bannered until Piter approves. This map is the authority for *what happens to every existing design-related file* once the global owner files (`00`–`16`) are populated.

Owner of this aspect: this file (`16-design-file-cleanup-map.md`). Authority root: `00-README-SOURCE-OF-TRUTH.md`.

---

## 1. Classification definitions


| Class                       | Meaning                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **KEEP AS CANONICAL INPUT** | Contains useful rules/components/CSS to be **merged** into a global owner file. Source material, not final law.        |
| **KEEP AS WRAPPER ONLY**    | May remain only if it **delegates** to the global system and defines no separate visual rules.                         |
| **DEPRECATE**               | No longer source-of-truth for agents. May remain temporarily for history/reference with a banner (banner added later). |
| **DELETE LATER**            | Unnecessary/duplicated/confusing. Removed **after** the global folder is confirmed and dependents migrated.            |
| **MIGRATE LATER**           | Page/module-specific design logic to be **moved** into the global system or replaced by shared components.             |


---

## 2. Cleanup principle

Old design files must either be **merged** into the global owner files, **converted to wrappers**, **deprecated**, **deleted later**, or **migrated later**. **No old file may continue to act as competing visual law.** Every consolidation must end with exactly one owner per aspect.

---

## 3. Ownership-split consolidation (current → single owner)

Where visual law is currently split across multiple files, it consolidates as follows:


| Aspect               | Split across today                                                                                                       | Single owner (target)                 | Consolidation                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------- |
| Tokens               | `aixia-design-system.css`, `dashboard/tokens.css`, `index.css` (shadcn HSL)                                              | `01-design-tokens.md`                 | Document one token set; CSS files implement only                |
| Typography           | `aixia-design-system.css`, `dashboard/visual.css`, `AIXIA_STANDARD.md`, `aixia-design-principles.md`                     | `02-typography-standard.md`           | One type scale; retire gradient XL on app pages                 |
| Page shell           | `AixiaPage`/`AixiaCommandPage`/`FinancePage`/`AixiaCommandPageLayout`, `layout.css`, `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | `03-page-shell-standard.md`           | One wrapper chain; orb default deprecated under DashboardLayout |
| Hero                 | `AixiaHero` (default+command), `visual.css`, `finance-visual.css`, `AIXIA_STANDARD.md`                                   | `04-hero-header-standard.md`          | One command hero typography                                     |
| Meta strip           | `AixiaCommandHubMetaStrip`, `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip`                                        | `05-meta-status-strip-standard.md`    | One strip law; finance/runtime delegate                         |
| Cards/sections       | `AixiaSection` (2 surfaces), `MetricGrid`/`CommandMetrics`, finance overview grids, local Tailwind cards                 | `06-card-section-standard.md`         | One card/section + KPI placement law                            |
| Buttons/actions      | `AixiaButton`, `AixiaActionSystem`, shadcn `ui/button`, local Tailwind                                                   | `07-button-action-standard.md`        | One action law; shadcn = chrome only                            |
| Tables/lists         | `AixiaTable`, `agentops-dense-table` CSS in global, finance registry CSS                                                 | `08-table-list-standard.md`           | One table law; module density via data attributes               |
| Forms                | `AixiaFormFields`, `aixia-form-rules.md`, inline inputs                                                                  | `09-form-input-standard.md`           | One form law                                                    |
| Modals/drawers       | `AixiaModal`, `AixiaArchiveManagerModal`, shadcn dialog                                                                  | `10-modal-drawer-standard.md`         | One overlay law                                                 |
| Scroll/responsive    | `layout.css` aliases, calendar/inbox/tasks/projects CSS                                                                  | `11-scroll-responsive-standard.md`    | One scroll law; module CSS merged                               |
| Navigation/workspace | `AixiaNavigationCard`, `AixiaWorkspaceCard`, local hub layouts                                                           | `12-navigation-workspace-standard.md` | One navigation law                                              |
| Module wrappers      | finance/calendar/chat/inbox/tasks/projects CSS + finance command shells                                                  | `13-module-wrapper-rules.md`          | Wrappers delegate-only                                          |


---

## 4. Inventory & classification

### 4.1 `qa-agent/design-system/` docs


| File(s)                                                                                                                                       | Current role                      | Class                                     | Target owner | Cleanup action                                      | Gate                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------- | ------------ | --------------------------------------------------- | ----------------------- |
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md`                                                                                                           | Locked shell/hero/meta/scroll law | **KEEP AS CANONICAL INPUT**               | 03/04/05/11  | Merge into owners; then deprecate as standalone law | After 03/04/05/11 exist |
| `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md`                                                                                                      | Layer architecture                | **KEEP AS CANONICAL INPUT**               | 00/13        | Merge                                               | After 13                |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md`                                                                                                       | P0/P1 backlog                     | **KEEP AS CANONICAL INPUT**               | 16           | Track until items closed                            | Ongoing                 |
| `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md`                                                                                              | Conflict inventory                | **KEEP AS CANONICAL INPUT**               | 16           | Merge into map                                      | Ongoing                 |
| `AIXIA_P0_META_STRIP_AUTHORITY.md`                                                                                                            | Meta strip law                    | **KEEP AS CANONICAL INPUT**               | 05           | Merge                                               | After 05                |
| `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md`                                                                                                        | Scroll aliases                    | **KEEP AS CANONICAL INPUT**               | 11           | Merge                                               | After 11                |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md`                                                                                                     | Shell/hero enforcement            | **KEEP AS CANONICAL INPUT**               | 03/04/15     | Merge                                               | After 03/04/15          |
| `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md`                                                                                                  | Guardrail rules                   | **KEEP AS CANONICAL INPUT**               | 15           | Merge                                               | After 15                |
| `AIXIA_GLOBAL_PAGE_PATTERNS.md`                                                                                                               | Page patterns                     | **KEEP AS CANONICAL INPUT**               | 03/06/12     | Merge                                               | After owners            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md`                                                                                                      | Rulebook                          | **KEEP AS CANONICAL INPUT**               | 00           | Merge                                               | After review            |
| `AIXIA_AI_PAGE_BUILDING_RULES.md`                                                                                                             | AI build rules                    | **KEEP AS CANONICAL INPUT**               | 00/14        | Merge                                               | After 14                |
| `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md`                                                                                                         | QA checklist                      | **KEEP AS CANONICAL INPUT**               | 15           | Merge                                               | After 15                |
| `AIXIA_SHARED_COMPONENT_GAP_LIST.md`                                                                                                          | Component gaps                    | **KEEP AS CANONICAL INPUT**               | 06/13        | Merge                                               | After owners            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md`                                                                                                | Migration plan                    | **KEEP AS CANONICAL INPUT**               | 14           | Merge                                               | After 14                |
| `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md`                                                                                                    | Component audit                   | **KEEP AS CANONICAL INPUT**               | 13           | Merge                                               | After 13                |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md`                                                                                        | AgentOps plan                     | **KEEP AS CANONICAL INPUT**               | 04/13/14     | Merge                                               | After owners            |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md`                                                                                           | Parity audit                      | **KEEP AS CANONICAL INPUT**               | 16           | Reference                                           | Ongoing                 |
| `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md`                                                                                      | This program's plan               | **KEEP AS CANONICAL INPUT**               | 16           | Reference                                           | Ongoing                 |
| `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md`                                                                                           | Direction context                 | **KEEP** (history/context)                | —            | Reference                                           | —                       |
| `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md`                                                                                                | Finance bridge plan               | **KEEP AS CANONICAL INPUT**               | 13           | Merge                                               | After 13                |
| `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md`                                                                                                           | Calendar scroll                   | **KEEP AS CANONICAL INPUT**               | 11           | Merge                                               | After 11                |
| `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md`                                                                                                           | shadcn boundary                   | **KEEP AS CANONICAL INPUT**               | 07/15        | Merge                                               | After owners            |
| `AIXIA_P0_BATCH_1..8_*` (8)                                                                                                                   | Batch history                     | **DEPRECATE**                             | —            | Banner → archive                                    | After 00/16 approved    |
| `AIXIA_PHASE_1A..2A_*` (10)                                                                                                                   | Phase history                     | **DEPRECATE**                             | —            | Banner → archive                                    | After 00/16 approved    |
| `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md`                                                                                              | Consolidation report              | **DEPRECATE**                             | —            | Banner → archive                                    | After review            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md`                                                                                             | Foundation report                 | **DEPRECATE**                             | —            | Banner → archive                                    | After review            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md`                                                                                                | Old next-step plan                | **DEPRECATE**                             | —            | Superseded by this program                          | After review            |
| `AIXIA_WEBSITE_STRUCTURE_INVENTORY_REPORT.md`, `AIXIA_FULL_WEBSITE_STRUCTURE_INVENTORY.md`, `AIXIA_GLOBAL_FOLDER_BATCH_10_CREATION_REPORT.md` | Inventory / batch report          | **KEEP** (non-visual reference / history) | —            | Reference                                           | —                       |


### 4.2 `qa-agent/design-system/memory/`


| File                                    | Class                    | Cleanup action                          | Gate              |
| --------------------------------------- | ------------------------ | --------------------------------------- | ----------------- |
| `AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md`  | **KEEP AS WRAPPER ONLY** | Point to `aixia-global/00`; mirror only | After 00 approved |
| `AIXIA_DESIGN_COMPONENT_MEMORY.md`      | **KEEP AS WRAPPER ONLY** | Mirror, not law                         | After owners      |
| `AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | **KEEP AS WRAPPER ONLY** | Mirror, not law                         | After owners      |
| `AIXIA_WEBSITE_STRUCTURE_MEMORY.md`     | **KEEP** (non-visual)    | Reference                               | —                 |


### 4.3 `src/design-system/` docs


| File                                          | Class                                  | Target owner | Cleanup action                                   | Gate              |
| --------------------------------------------- | -------------------------------------- | ------------ | ------------------------------------------------ | ----------------- |
| `README.md`                                   | **KEEP AS WRAPPER ONLY**               | 00           | Governance entry → delegate to `aixia-global/00` | After 00 approved |
| `aixia-design-principles.md`                  | **KEEP AS CANONICAL INPUT**            | 00/01/02     | Merge                                            | After owners      |
| `aixia-page-patterns.md`                      | **KEEP AS CANONICAL INPUT**            | 03/04/06/12  | Merge                                            | After owners      |
| `aixia-component-rules.md`                    | **KEEP AS CANONICAL INPUT**            | 06/07/09     | Merge                                            | After owners      |
| `aixia-table-rules.md`                        | **KEEP AS CANONICAL INPUT**            | 08           | Merge                                            | After 08          |
| `aixia-form-rules.md`                         | **KEEP AS CANONICAL INPUT**            | 09           | Merge                                            | After 09          |
| `aixia-navigation-rules.md`                   | **KEEP AS CANONICAL INPUT**            | 12           | Merge                                            | After 12          |
| `aixia-archive-rules.md`                      | **KEEP AS CANONICAL INPUT**            | 07/10        | Merge                                            | After owners      |
| `aixia-conflict-deprecation-policy.md`        | **KEEP AS CANONICAL INPUT**            | 15/16        | Merge                                            | After 15          |
| `aixia-migration-checklist.md`                | **KEEP AS CANONICAL INPUT**            | 14           | Merge                                            | After 14          |
| `aixia-migration-watch-registry.md`           | **KEEP AS WRAPPER ONLY**               | 14           | Living registry under 14                         | After 14          |
| `aixia-refresh-rules.md`                      | **KEEP** (behavior, partly non-visual) | 13           | Reference                                        | —                 |
| `aixia-permission-ui-rules.md`                | **KEEP** (behavior)                    | 13           | Reference                                        | —                 |
| `aixia-finance-workflow-registry-contract.md` | **MIGRATE LATER**                      | 08/13        | Generalize finance-only contract                 | After 08/13       |


### 4.4 Component-folder docs


| File                                     | Class         | Cleanup action                                                                                           | Gate         |
| ---------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| `src/components/aixia/AIXIA_STANDARD.md` | **DEPRECATE** | Already marked deprecated as design law; keep as component index until merged into 00/06/07, then banner | After owners |


### 4.5 CSS files


| File                                        | Class                        | Target owner / rule  | Cleanup action                                              | Gate                    |
| ------------------------------------------- | ---------------------------- | -------------------- | ----------------------------------------------------------- | ----------------------- |
| `src/styles/aixia-design-system.css`        | **KEEP AS CANONICAL INPUT**  | 01/02/06/07/08/09/10 | Primary implementation; optional controlled split later     | After owners + approval |
| `src/styles/dashboard/tokens.css`           | **KEEP AS CANONICAL INPUT**  | 01                   | Implements tokens                                           | After 01                |
| `src/styles/dashboard/layout.css`           | **KEEP AS CANONICAL INPUT**  | 03/11                | Implements shell/scroll                                     | After 03/11             |
| `src/styles/dashboard/visual.css`           | **KEEP AS CANONICAL INPUT**  | 04/06                | Implements hero/metrics                                     | After 04/06             |
| `src/styles/dashboard/sidebar-chrome.css`   | **KEEP AS WRAPPER ONLY**     | —                    | App chrome only                                             | —                       |
| `src/styles/dashboard/presence.css`         | **KEEP** (feature chrome)    | 13                   | Reference                                                   | —                       |
| `src/styles/dashboard/admin-usage.css`      | **DELETE LATER** (if orphan) | —                    | Import-check; delete only if unused                         | Import map + approval   |
| `src/styles/finance/finance-visual.css`     | **KEEP AS WRAPPER ONLY**     | 13                   | Scoped `.aixia-finance-page` bridge; no global selectors    | —                       |
| `src/styles/finance/master-data-visual.css` | **KEEP AS WRAPPER ONLY**     | 13                   | Scoped finance registry                                     | —                       |
| `src/styles/calendar/calendar-visual.css`   | **MIGRATE LATER**            | 04/11                | Deprecate hero overrides; keep grid/scroll exceptions in 11 | After 04/11             |
| `src/styles/chat/chat-visual.css`           | **MIGRATE LATER**            | shared `AixiaChat*`  | Replace with shared chat components                         | After chat migration    |
| `src/styles/inbox/inbox-visual.css`         | **MIGRATE LATER**            | 11                   | Merge scroll naming into aliases                            | After 11                |
| `src/styles/tasks/tasks-visual.css`         | **MIGRATE LATER**            | 11                   | Merge into aliases                                          | After 11                |
| `src/styles/projects/projects-visual.css`   | **MIGRATE LATER**            | 03/06                | Merge into command global                                   | After owners            |
| `src/styles/aixia-process-book.css`         | **KEEP AS WRAPPER ONLY**     | —                    | Scoped workflow only (P2)                                   | —                       |
| `src/styles/aixia-finance-print.css`        | **KEEP** (isolated print)    | —                    | Out of screen-design scope                                  | —                       |


### 4.6 Shared components (`src/components/aixia/`**)

Implementation layer — **KEEP** as realization of the law. Notable classifications:


| Component(s)                                                                                                                                                 | Class                         | Target owner | Note                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------ | --------------------------------------------------------------------------- |
| `AixiaPage`, `AixiaCommandPage`, `AixiaCommandPageLayout`                                                                                                    | **KEEP** (implements 03)      | 03           | Deprecate default orb surface on app pages                                  |
| `FinancePage`                                                                                                                                                | **KEEP AS WRAPPER ONLY**      | 13           | Delegates to `AixiaCommandPage` + finance scope                             |
| `AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage`                                                                                             | **MIGRATE LATER**             | 13           | Generalize to shared command detail/create (P1-04)                          |
| `AixiaHero`                                                                                                                                                  | **KEEP** (implements 04)      | 04           | Default surface decision owned by 04                                        |
| `AixiaCommandHubMetaStrip`, `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip`, `AixiaSignalRow`                                                          | **KEEP** (implements 05)      | 05           | One strip law; finance/runtime delegate                                     |
| `AixiaCommandMetrics`, `AixiaMetricCard`, `AixiaMetricGrid`, `AixiaStatusCard`, `FinanceHubMetrics`                                                          | **KEEP / MIGRATE LATER**      | 06           | Resolve metric duplication; `FinanceHubMetrics` alias cleanup (P1-01/P3-03) |
| `AixiaSection`, `AixiaDetailSection`, `AixiaContentBlocks`, `AixiaValueBlock`                                                                                | **KEEP** (implements 06)      | 06           | Default command surface                                                     |
| `AixiaButton`, `AixiaActionSystem`, `AixiaActionCard`, `AixiaRowActionMenu`, `AixiaLifecycleRowActions`, `AixiaArchiveRowActions`, `AixiaStickyActionFooter` | **KEEP** (implements 07)      | 07           | One action law                                                              |
| `AixiaTable`, `AixiaTableCells`, `AixiaRegistryToolbar`, `AixiaSideList`, `AixiaHistoryRow`                                                                  | **KEEP** (implements 08)      | 08           | Move `agentops-dense-table` CSS out of global (P1-06)                       |
| `AixiaFormFields`, `AixiaDatePicker`, `AixiaSearchField`                                                                                                     | **KEEP** (implements 09)      | 09           |                                                                             |
| `AixiaModal`, `AixiaArchiveManagerModal`, `AixiaPopoverPanel`                                                                                                | **KEEP** (implements 10)      | 10           |                                                                             |
| `AixiaNavigationCard`, `AixiaWorkspaceCard`, `AixiaWorkspaceShell`, `AixiaFeaturePanel`                                                                      | **KEEP** (implements 12)      | 12           |                                                                             |
| `AixiaChatThread/Message/Composer`                                                                                                                           | **KEEP** (implements 12/chat) | 12           | Supersedes `chat-visual.css`                                                |


### 4.7 Layout & shadcn/ui components


| File(s)                                     | Class                    | Cleanup action                               | Gate                    |
| ------------------------------------------- | ------------------------ | -------------------------------------------- | ----------------------- |
| `src/components/layout/DashboardLayout.tsx` | **KEEP AS WRAPPER ONLY** | App chrome; shadcn allowed here only         | —                       |
| `src/components/ui/`** (shadcn)             | **KEEP AS WRAPPER ONLY** | Chrome/auth only — never page-content law    | —                       |
| `src/components/ui/PageLoader.tsx`          | **DELETE LATER**         | 0 app usages (replaced by `AixiaAsyncState`) | Import check + approval |


### 4.8 Guardrails


| File(s)                                                                  | Class                        | Cleanup action                                                    | Gate                   |
| ------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------- | ---------------------- |
| `scripts/guardrails/aixia-guardrail-allowlists.mjs`                      | **KEEP AS WRAPPER ONLY**     | Point `PAGE_SHELL_HERO_STANDARD` const to `aixia-global/03` (+04) | After 03/04 + approval |
| `scripts/guardrails/aixia-shell-hero-guardrails.mjs`                     | **KEEP** (enforces 03/04)    | Cite owner files in messages                                      | After owners           |
| `scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs`                | **KEEP** (enforces 07/15)    | Cite owners                                                       | After owners           |
| `scripts/guardrails/aixia-visual-parity.mjs`, `aixia-dashboard-page.mjs` | **KEEP** (enforces 03/04/06) | Cite owners                                                       | After owners           |
| `scripts/aixia-guardrails.mjs` (build entry)                             | **KEEP**                     | Print authority = `aixia-global/00`                               | After owners           |


### 4.9 Misc


| File                                            | Class            | Cleanup action       | Gate                    |
| ----------------------------------------------- | ---------------- | -------------------- | ----------------------- |
| `src/App.css` (Vite starter, if present/unused) | **DELETE LATER** | Confirm not imported | Import check + approval |


---

## 5. Deletion / move / archive gates

No file may be **deleted, moved, renamed, or bannered** until **all** of the following are satisfied:

1. Dependency / import check is complete (no live importers).
2. Replacement owner file exists in `aixia-global/`.
3. Guardrails point to the replacement owner file.
4. Browser checks pass (no visual regression).
5. **Piter approves.**

This matches `src/design-system/aixia-conflict-deprecation-policy.md` (map dependents → confirm replacement → migrate → validate responsive → build/type check → only then delete or archive).

---

## 6. Final deletion / archive phase

After `00`–`16` are populated and approved, run a dedicated cleanup phase:


| Step | Action                                                                                                                  | Gate                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| C1   | Add deprecation banners to all **DEPRECATE** docs (point to owner files)                                                | Owners exist + approval    |
| C2   | Convert **WRAPPER** docs/components/CSS to explicit delegation notes                                                    | Owners exist               |
| C3   | Re-point all **guardrails** to `aixia-global/` owner files                                                              | 03/04/07/15 exist          |
| C4   | **Migrate** module CSS/components (calendar, chat, inbox, tasks, projects; finance command shells) one module per batch | Browser + build per module |
| C5   | **Archive** batch/phase history reports to `qa-agent/design-system/archive/`                                            | Banners added              |
| C6   | **Delete** confirmed-unused files (`PageLoader.tsx`, orphan CSS, Vite starter)                                          | Import check + approval    |
| C7   | Final sweep: confirm no file outside `aixia-global/` asserts visual law                                                 | Full repo grep + approval  |


**Outcome:** future AI/Cursor/Hermes agents read **only** `src/design-system/aixia-global/` for design law. No old report, module CSS, or duplicate standard can be mistaken for current authority.

---

## 7. Cleanup order

1. **Create** `00` **and** `16` (this batch — done).
2. Create `01`–`15` **one aspect at a time** (later batches, after `00`/`16` approved).
3. Add **deprecation banners** later (C1).
4. Update **guardrails** later (C3).
5. **Migrate** module CSS/components later (C4).
6. **Archive** old reports later (C5).
7. **Delete** only after approval (C6) and final sweep (C7).

---

## Related

- Authority root: `00-README-SOURCE-OF-TRUTH.md`
- Full plan: `qa-agent/design-system/AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md`
- Deprecation process: `src/design-system/aixia-conflict-deprecation-policy.md`

# AiXia Global Design System — Design File Cleanup Map

## Status

**Living map for old/conflicting design files.** No files are deleted, moved, renamed, or bannered until Piter approves. This map is the authority for *what happens to every existing design-related file* once the global owner files (`00`–`16`) are populated.

Owner of this aspect: this file (`16-design-file-cleanup-map.md`). Authority root: `00-README-SOURCE-OF-TRUTH.md`.

---

## 1. Classification definitions


| Class                       | Meaning                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **KEEP AS CANONICAL INPUT** | Contains useful rules/components/CSS to be **merged** into a global owner file. Source material, not final law.        |
| **KEEP AS WRAPPER ONLY**    | May remain only if it **delegates** to the global system and defines no separate visual rules.                         |
| **DEPRECATE**               | No longer source-of-truth for agents. May remain temporarily for history/reference with a banner (banner added later). |
| **DELETE LATER**            | Unnecessary/duplicated/confusing. Removed **after** the global folder is confirmed and dependents migrated.            |
| **MIGRATE LATER**           | Page/module-specific design logic to be **moved** into the global system or replaced by shared components.             |


---

## 2. Cleanup principle

Old design files must either be **merged** into the global owner files, **converted to wrappers**, **deprecated**, **deleted later**, or **migrated later**. **No old file may continue to act as competing visual law.** Every consolidation must end with exactly one owner per aspect.

---

## 3. Ownership-split consolidation (current → single owner)

Where visual law is currently split across multiple files, it consolidates as follows:


| Aspect               | Split across today                                                                                                       | Single owner (target)                 | Consolidation                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------- |
| Tokens               | `aixia-design-system.css`, `dashboard/tokens.css`, `index.css` (shadcn HSL)                                              | `01-design-tokens.md`                 | Document one token set; CSS files implement only                |
| Typography           | `aixia-design-system.css`, `dashboard/visual.css`, `AIXIA_STANDARD.md`, `aixia-design-principles.md`                     | `02-typography-standard.md`           | One type scale; retire gradient XL on app pages                 |
| Page shell           | `AixiaPage`/`AixiaCommandPage`/`FinancePage`/`AixiaCommandPageLayout`, `layout.css`, `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | `03-page-shell-standard.md`           | One wrapper chain; orb default deprecated under DashboardLayout |
| Hero                 | `AixiaHero` (default+command), `visual.css`, `finance-visual.css`, `AIXIA_STANDARD.md`                                   | `04-hero-header-standard.md`          | One command hero typography                                     |
| Meta strip           | `AixiaCommandHubMetaStrip`, `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip`                                        | `05-meta-status-strip-standard.md`    | One strip law; finance/runtime delegate                         |
| Cards/sections       | `AixiaSection` (2 surfaces), `MetricGrid`/`CommandMetrics`, finance overview grids, local Tailwind cards                 | `06-card-section-standard.md`         | One card/section + KPI placement law                            |
| Buttons/actions      | `AixiaButton`, `AixiaActionSystem`, shadcn `ui/button`, local Tailwind                                                   | `07-button-action-standard.md`        | One action law; shadcn = chrome only                            |
| Tables/lists         | `AixiaTable`, `agentops-dense-table` CSS in global, finance registry CSS                                                 | `08-table-list-standard.md`           | One table law; module density via data attributes               |
| Forms                | `AixiaFormFields`, `aixia-form-rules.md`, inline inputs                                                                  | `09-form-input-standard.md`           | One form law                                                    |
| Modals/drawers       | `AixiaModal`, `AixiaArchiveManagerModal`, shadcn dialog                                                                  | `10-modal-drawer-standard.md`         | One overlay law                                                 |
| Scroll/responsive    | `layout.css` aliases, calendar/inbox/tasks/projects CSS                                                                  | `11-scroll-responsive-standard.md`    | One scroll law; module CSS merged                               |
| Navigation/workspace | `AixiaNavigationCard`, `AixiaWorkspaceCard`, local hub layouts                                                           | `12-navigation-workspace-standard.md` | One navigation law                                              |
| Module wrappers      | finance/calendar/chat/inbox/tasks/projects CSS + finance command shells                                                  | `13-module-wrapper-rules.md`          | Wrappers delegate-only                                          |


---

## 4. Inventory & classification

### 4.1 `qa-agent/design-system/` docs


| File(s)                                                                                                                                       | Current role                      | Class                                     | Target owner | Cleanup action                                      | Gate                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------- | ------------ | --------------------------------------------------- | ----------------------- |
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md`                                                                                                           | Locked shell/hero/meta/scroll law | **KEEP AS CANONICAL INPUT**               | 03/04/05/11  | Merge into owners; then deprecate as standalone law | After 03/04/05/11 exist |
| `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md`                                                                                                      | Layer architecture                | **KEEP AS CANONICAL INPUT**               | 00/13        | Merge                                               | After 13                |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md`                                                                                                       | P0/P1 backlog                     | **KEEP AS CANONICAL INPUT**               | 16           | Track until items closed                            | Ongoing                 |
| `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md`                                                                                              | Conflict inventory                | **KEEP AS CANONICAL INPUT**               | 16           | Merge into map                                      | Ongoing                 |
| `AIXIA_P0_META_STRIP_AUTHORITY.md`                                                                                                            | Meta strip law                    | **KEEP AS CANONICAL INPUT**               | 05           | Merge                                               | After 05                |
| `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md`                                                                                                        | Scroll aliases                    | **KEEP AS CANONICAL INPUT**               | 11           | Merge                                               | After 11                |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md`                                                                                                     | Shell/hero enforcement            | **KEEP AS CANONICAL INPUT**               | 03/04/15     | Merge                                               | After 03/04/15          |
| `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md`                                                                                                  | Guardrail rules                   | **KEEP AS CANONICAL INPUT**               | 15           | Merge                                               | After 15                |
| `AIXIA_GLOBAL_PAGE_PATTERNS.md`                                                                                                               | Page patterns                     | **KEEP AS CANONICAL INPUT**               | 03/06/12     | Merge                                               | After owners            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md`                                                                                                      | Rulebook                          | **KEEP AS CANONICAL INPUT**               | 00           | Merge                                               | After review            |
| `AIXIA_AI_PAGE_BUILDING_RULES.md`                                                                                                             | AI build rules                    | **KEEP AS CANONICAL INPUT**               | 00/14        | Merge                                               | After 14                |
| `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md`                                                                                                         | QA checklist                      | **KEEP AS CANONICAL INPUT**               | 15           | Merge                                               | After 15                |
| `AIXIA_SHARED_COMPONENT_GAP_LIST.md`                                                                                                          | Component gaps                    | **KEEP AS CANONICAL INPUT**               | 06/13        | Merge                                               | After owners            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md`                                                                                                | Migration plan                    | **KEEP AS CANONICAL INPUT**               | 14           | Merge                                               | After 14                |
| `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md`                                                                                                    | Component audit                   | **KEEP AS CANONICAL INPUT**               | 13           | Merge                                               | After 13                |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md`                                                                                        | AgentOps plan                     | **KEEP AS CANONICAL INPUT**               | 04/13/14     | Merge                                               | After owners            |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md`                                                                                           | Parity audit                      | **KEEP AS CANONICAL INPUT**               | 16           | Reference                                           | Ongoing                 |
| `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md`                                                                                      | This program's plan               | **KEEP AS CANONICAL INPUT**               | 16           | Reference                                           | Ongoing                 |
| `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md`                                                                                           | Direction context                 | **KEEP** (history/context)                | —            | Reference                                           | —                       |
| `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md`                                                                                                | Finance bridge plan               | **KEEP AS CANONICAL INPUT**               | 13           | Merge                                               | After 13                |
| `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md`                                                                                                           | Calendar scroll                   | **KEEP AS CANONICAL INPUT**               | 11           | Merge                                               | After 11                |
| `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md`                                                                                                           | shadcn boundary                   | **KEEP AS CANONICAL INPUT**               | 07/15        | Merge                                               | After owners            |
| `AIXIA_P0_BATCH_1..8_*` (8)                                                                                                                   | Batch history                     | **DEPRECATE**                             | —            | Banner → archive                                    | After 00/16 approved    |
| `AIXIA_PHASE_1A..2A_*` (10)                                                                                                                   | Phase history                     | **DEPRECATE**                             | —            | Banner → archive                                    | After 00/16 approved    |
| `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md`                                                                                              | Consolidation report              | **DEPRECATE**                             | —            | Banner → archive                                    | After review            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md`                                                                                             | Foundation report                 | **DEPRECATE**                             | —            | Banner → archive                                    | After review            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md`                                                                                                | Old next-step plan                | **DEPRECATE**                             | —            | Superseded by this program                          | After review            |
| `AIXIA_WEBSITE_STRUCTURE_INVENTORY_REPORT.md`, `AIXIA_FULL_WEBSITE_STRUCTURE_INVENTORY.md`, `AIXIA_GLOBAL_FOLDER_BATCH_10_CREATION_REPORT.md` | Inventory / batch report          | **KEEP** (non-visual reference / history) | —            | Reference                                           | —                       |


### 4.2 `qa-agent/design-system/memory/`


| File                                    | Class                    | Cleanup action                          | Gate              |
| --------------------------------------- | ------------------------ | --------------------------------------- | ----------------- |
| `AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md`  | **KEEP AS WRAPPER ONLY** | Point to `aixia-global/00`; mirror only | After 00 approved |
| `AIXIA_DESIGN_COMPONENT_MEMORY.md`      | **KEEP AS WRAPPER ONLY** | Mirror, not law                         | After owners      |
| `AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | **KEEP AS WRAPPER ONLY** | Mirror, not law                         | After owners      |
| `AIXIA_WEBSITE_STRUCTURE_MEMORY.md`     | **KEEP** (non-visual)    | Reference                               | —                 |


### 4.3 `src/design-system/` docs


| File                                          | Class                                  | Target owner | Cleanup action                                   | Gate              |
| --------------------------------------------- | -------------------------------------- | ------------ | ------------------------------------------------ | ----------------- |
| `README.md`                                   | **KEEP AS WRAPPER ONLY**               | 00           | Governance entry → delegate to `aixia-global/00` | After 00 approved |
| `aixia-design-principles.md`                  | **KEEP AS CANONICAL INPUT**            | 00/01/02     | Merge                                            | After owners      |
| `aixia-page-patterns.md`                      | **KEEP AS CANONICAL INPUT**            | 03/04/06/12  | Merge                                            | After owners      |
| `aixia-component-rules.md`                    | **KEEP AS CANONICAL INPUT**            | 06/07/09     | Merge                                            | After owners      |
| `aixia-table-rules.md`                        | **KEEP AS CANONICAL INPUT**            | 08           | Merge                                            | After 08          |
| `aixia-form-rules.md`                         | **KEEP AS CANONICAL INPUT**            | 09           | Merge                                            | After 09          |
| `aixia-navigation-rules.md`                   | **KEEP AS CANONICAL INPUT**            | 12           | Merge                                            | After 12          |
| `aixia-archive-rules.md`                      | **KEEP AS CANONICAL INPUT**            | 07/10        | Merge                                            | After owners      |
| `aixia-conflict-deprecation-policy.md`        | **KEEP AS CANONICAL INPUT**            | 15/16        | Merge                                            | After 15          |
| `aixia-migration-checklist.md`                | **KEEP AS CANONICAL INPUT**            | 14           | Merge                                            | After 14          |
| `aixia-migration-watch-registry.md`           | **KEEP AS WRAPPER ONLY**               | 14           | Living registry under 14                         | After 14          |
| `aixia-refresh-rules.md`                      | **KEEP** (behavior, partly non-visual) | 13           | Reference                                        | —                 |
| `aixia-permission-ui-rules.md`                | **KEEP** (behavior)                    | 13           | Reference                                        | —                 |
| `aixia-finance-workflow-registry-contract.md` | **MIGRATE LATER**                      | 08/13        | Generalize finance-only contract                 | After 08/13       |


### 4.4 Component-folder docs


| File                                     | Class         | Cleanup action                                                                                           | Gate         |
| ---------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| `src/components/aixia/AIXIA_STANDARD.md` | **DEPRECATE** | Already marked deprecated as design law; keep as component index until merged into 00/06/07, then banner | After owners |


### 4.5 CSS files


| File                                        | Class                        | Target owner / rule  | Cleanup action                                              | Gate                    |
| ------------------------------------------- | ---------------------------- | -------------------- | ----------------------------------------------------------- | ----------------------- |
| `src/styles/aixia-design-system.css`        | **KEEP AS CANONICAL INPUT**  | 01/02/06/07/08/09/10 | Primary implementation; optional controlled split later     | After owners + approval |
| `src/styles/dashboard/tokens.css`           | **KEEP AS CANONICAL INPUT**  | 01                   | Implements tokens                                           | After 01                |
| `src/styles/dashboard/layout.css`           | **KEEP AS CANONICAL INPUT**  | 03/11                | Implements shell/scroll                                     | After 03/11             |
| `src/styles/dashboard/visual.css`           | **KEEP AS CANONICAL INPUT**  | 04/06                | Implements hero/metrics                                     | After 04/06             |
| `src/styles/dashboard/sidebar-chrome.css`   | **KEEP AS WRAPPER ONLY**     | —                    | App chrome only                                             | —                       |
| `src/styles/dashboard/presence.css`         | **KEEP** (feature chrome)    | 13                   | Reference                                                   | —                       |
| `src/styles/dashboard/admin-usage.css`      | **DELETE LATER** (if orphan) | —                    | Import-check; delete only if unused                         | Import map + approval   |
| `src/styles/finance/finance-visual.css`     | **KEEP AS WRAPPER ONLY**     | 13                   | Scoped `.aixia-finance-page` bridge; no global selectors    | —                       |
| `src/styles/finance/master-data-visual.css` | **KEEP AS WRAPPER ONLY**     | 13                   | Scoped finance registry                                     | —                       |
| `src/styles/calendar/calendar-visual.css`   | **MIGRATE LATER**            | 04/11                | Deprecate hero overrides; keep grid/scroll exceptions in 11 | After 04/11             |
| `src/styles/chat/chat-visual.css`           | **MIGRATE LATER**            | shared `AixiaChat*`  | Replace with shared chat components                         | After chat migration    |
| `src/styles/inbox/inbox-visual.css`         | **MIGRATE LATER**            | 11                   | Merge scroll naming into aliases                            | After 11                |
| `src/styles/tasks/tasks-visual.css`         | **MIGRATE LATER**            | 11                   | Merge into aliases                                          | After 11                |
| `src/styles/projects/projects-visual.css`   | **MIGRATE LATER**            | 03/06                | Merge into command global                                   | After owners            |
| `src/styles/aixia-process-book.css`         | **KEEP AS WRAPPER ONLY**     | —                    | Scoped workflow only (P2)                                   | —                       |
| `src/styles/aixia-finance-print.css`        | **KEEP** (isolated print)    | —                    | Out of screen-design scope                                  | —                       |


### 4.6 Shared components (`src/components/aixia/`**)

Implementation layer — **KEEP** as realization of the law. Notable classifications:


| Component(s)                                                                                                                                                 | Class                         | Target owner | Note                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------ | --------------------------------------------------------------------------- |
| `AixiaPage`, `AixiaCommandPage`, `AixiaCommandPageLayout`                                                                                                    | **KEEP** (implements 03)      | 03           | Deprecate default orb surface on app pages                                  |
| `FinancePage`                                                                                                                                                | **KEEP AS WRAPPER ONLY**      | 13           | Delegates to `AixiaCommandPage` + finance scope                             |
| `AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage`                                                                                             | **MIGRATE LATER**             | 13           | Generalize to shared command detail/create (P1-04)                          |
| `AixiaHero`                                                                                                                                                  | **KEEP** (implements 04)      | 04           | Default surface decision owned by 04                                        |
| `AixiaCommandHubMetaStrip`, `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip`, `AixiaSignalRow`                                                          | **KEEP** (implements 05)      | 05           | One strip law; finance/runtime delegate                                     |
| `AixiaCommandMetrics`, `AixiaMetricCard`, `AixiaMetricGrid`, `AixiaStatusCard`, `FinanceHubMetrics`                                                          | **KEEP / MIGRATE LATER**      | 06           | Resolve metric duplication; `FinanceHubMetrics` alias cleanup (P1-01/P3-03) |
| `AixiaSection`, `AixiaDetailSection`, `AixiaContentBlocks`, `AixiaValueBlock`                                                                                | **KEEP** (implements 06)      | 06           | Default command surface                                                     |
| `AixiaButton`, `AixiaActionSystem`, `AixiaActionCard`, `AixiaRowActionMenu`, `AixiaLifecycleRowActions`, `AixiaArchiveRowActions`, `AixiaStickyActionFooter` | **KEEP** (implements 07)      | 07           | One action law                                                              |
| `AixiaTable`, `AixiaTableCells`, `AixiaRegistryToolbar`, `AixiaSideList`, `AixiaHistoryRow`                                                                  | **KEEP** (implements 08)      | 08           | Move `agentops-dense-table` CSS out of global (P1-06)                       |
| `AixiaFormFields`, `AixiaDatePicker`, `AixiaSearchField`                                                                                                     | **KEEP** (implements 09)      | 09           |                                                                             |
| `AixiaModal`, `AixiaArchiveManagerModal`, `AixiaPopoverPanel`                                                                                                | **KEEP** (implements 10)      | 10           |                                                                             |
| `AixiaNavigationCard`, `AixiaWorkspaceCard`, `AixiaWorkspaceShell`, `AixiaFeaturePanel`                                                                      | **KEEP** (implements 12)      | 12           |                                                                             |
| `AixiaChatThread/Message/Composer`                                                                                                                           | **KEEP** (implements 12/chat) | 12           | Supersedes `chat-visual.css`                                                |


### 4.7 Layout & shadcn/ui components


| File(s)                                     | Class                    | Cleanup action                               | Gate                    |
| ------------------------------------------- | ------------------------ | -------------------------------------------- | ----------------------- |
| `src/components/layout/DashboardLayout.tsx` | **KEEP AS WRAPPER ONLY** | App chrome; shadcn allowed here only         | —                       |
| `src/components/ui/`** (shadcn)             | **KEEP AS WRAPPER ONLY** | Chrome/auth only — never page-content law    | —                       |
| `src/components/ui/PageLoader.tsx`          | **DELETE LATER**         | 0 app usages (replaced by `AixiaAsyncState`) | Import check + approval |


### 4.8 Guardrails


| File(s)                                                                  | Class                        | Cleanup action                                                    | Gate                   |
| ------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------- | ---------------------- |
| `scripts/guardrails/aixia-guardrail-allowlists.mjs`                      | **KEEP AS WRAPPER ONLY**     | Point `PAGE_SHELL_HERO_STANDARD` const to `aixia-global/03` (+04) | After 03/04 + approval |
| `scripts/guardrails/aixia-shell-hero-guardrails.mjs`                     | **KEEP** (enforces 03/04)    | Cite owner files in messages                                      | After owners           |
| `scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs`                | **KEEP** (enforces 07/15)    | Cite owners                                                       | After owners           |
| `scripts/guardrails/aixia-visual-parity.mjs`, `aixia-dashboard-page.mjs` | **KEEP** (enforces 03/04/06) | Cite owners                                                       | After owners           |
| `scripts/aixia-guardrails.mjs` (build entry)                             | **KEEP**                     | Print authority = `aixia-global/00`                               | After owners           |


### 4.9 Misc


| File                                            | Class            | Cleanup action       | Gate                    |
| ----------------------------------------------- | ---------------- | -------------------- | ----------------------- |
| `src/App.css` (Vite starter, if present/unused) | **DELETE LATER** | Confirm not imported | Import check + approval |


---

## 5. Deletion / move / archive gates

No file may be **deleted, moved, renamed, or bannered** until **all** of the following are satisfied:

1. Dependency / import check is complete (no live importers).
2. Replacement owner file exists in `aixia-global/`.
3. Guardrails point to the replacement owner file.
4. Browser checks pass (no visual regression).
5. **Piter approves.**

This matches `src/design-system/aixia-conflict-deprecation-policy.md` (map dependents → confirm replacement → migrate → validate responsive → build/type check → only then delete or archive).

---

## 6. Final deletion / archive phase

After `00`–`16` are populated and approved, run a dedicated cleanup phase:


| Step | Action                                                                                                                  | Gate                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| C1   | Add deprecation banners to all **DEPRECATE** docs (point to owner files)                                                | Owners exist + approval    |
| C2   | Convert **WRAPPER** docs/components/CSS to explicit delegation notes                                                    | Owners exist               |
| C3   | Re-point all **guardrails** to `aixia-global/` owner files                                                              | 03/04/07/15 exist          |
| C4   | **Migrate** module CSS/components (calendar, chat, inbox, tasks, projects; finance command shells) one module per batch | Browser + build per module |
| C5   | **Archive** batch/phase history reports to `qa-agent/design-system/archive/`                                            | Banners added              |
| C6   | **Delete** confirmed-unused files (`PageLoader.tsx`, orphan CSS, Vite starter)                                          | Import check + approval    |
| C7   | Final sweep: confirm no file outside `aixia-global/` asserts visual law                                                 | Full repo grep + approval  |


**Outcome:** future AI/Cursor/Hermes agents read **only** `src/design-system/aixia-global/` for design law. No old report, module CSS, or duplicate standard can be mistaken for current authority.

---

## 7. Cleanup order

1. **Create** `00` **and** `16` (this batch — done).
2. Create `01`–`15` **one aspect at a time** (later batches, after `00`/`16` approved).
3. Add **deprecation banners** later (C1).
4. Update **guardrails** later (C3).
5. **Migrate** module CSS/components later (C4).
6. **Archive** old reports later (C5).
7. **Delete** only after approval (C6) and final sweep (C7).

---

## Related

- Authority root: `00-README-SOURCE-OF-TRUTH.md`
- Full plan: `qa-agent/design-system/AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md`
- Deprecation process: `src/design-system/aixia-conflict-deprecation-policy.md`

# AiXia Global Design System — Design File Cleanup Map

## Status

**Living map for old/conflicting design files.** No files are deleted, moved, renamed, or bannered until Piter approves. This map is the authority for *what happens to every existing design-related file* once the global owner files (`00`–`16`) are populated.

Owner of this aspect: this file (`16-design-file-cleanup-map.md`). Authority root: `00-README-SOURCE-OF-TRUTH.md`.

---

## 1. Classification definitions


| Class                       | Meaning                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **KEEP AS CANONICAL INPUT** | Contains useful rules/components/CSS to be **merged** into a global owner file. Source material, not final law.        |
| **KEEP AS WRAPPER ONLY**    | May remain only if it **delegates** to the global system and defines no separate visual rules.                         |
| **DEPRECATE**               | No longer source-of-truth for agents. May remain temporarily for history/reference with a banner (banner added later). |
| **DELETE LATER**            | Unnecessary/duplicated/confusing. Removed **after** the global folder is confirmed and dependents migrated.            |
| **MIGRATE LATER**           | Page/module-specific design logic to be **moved** into the global system or replaced by shared components.             |


---

## 2. Cleanup principle

Old design files must either be **merged** into the global owner files, **converted to wrappers**, **deprecated**, **deleted later**, or **migrated later**. **No old file may continue to act as competing visual law.** Every consolidation must end with exactly one owner per aspect.

---

## 3. Ownership-split consolidation (current → single owner)

Where visual law is currently split across multiple files, it consolidates as follows:


| Aspect               | Split across today                                                                                                       | Single owner (target)                 | Consolidation                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------- |
| Tokens               | `aixia-design-system.css`, `dashboard/tokens.css`, `index.css` (shadcn HSL)                                              | `01-design-tokens.md`                 | Document one token set; CSS files implement only                |
| Typography           | `aixia-design-system.css`, `dashboard/visual.css`, `AIXIA_STANDARD.md`, `aixia-design-principles.md`                     | `02-typography-standard.md`           | One type scale; retire gradient XL on app pages                 |
| Page shell           | `AixiaPage`/`AixiaCommandPage`/`FinancePage`/`AixiaCommandPageLayout`, `layout.css`, `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | `03-page-shell-standard.md`           | One wrapper chain; orb default deprecated under DashboardLayout |
| Hero                 | `AixiaHero` (default+command), `visual.css`, `finance-visual.css`, `AIXIA_STANDARD.md`                                   | `04-hero-header-standard.md`          | One command hero typography                                     |
| Meta strip           | `AixiaCommandHubMetaStrip`, `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip`                                        | `05-meta-status-strip-standard.md`    | One strip law; finance/runtime delegate                         |
| Cards/sections       | `AixiaSection` (2 surfaces), `MetricGrid`/`CommandMetrics`, finance overview grids, local Tailwind cards                 | `06-card-section-standard.md`         | One card/section + KPI placement law                            |
| Buttons/actions      | `AixiaButton`, `AixiaActionSystem`, shadcn `ui/button`, local Tailwind                                                   | `07-button-action-standard.md`        | One action law; shadcn = chrome only                            |
| Tables/lists         | `AixiaTable`, `agentops-dense-table` CSS in global, finance registry CSS                                                 | `08-table-list-standard.md`           | One table law; module density via data attributes               |
| Forms                | `AixiaFormFields`, `aixia-form-rules.md`, inline inputs                                                                  | `09-form-input-standard.md`           | One form law                                                    |
| Modals/drawers       | `AixiaModal`, `AixiaArchiveManagerModal`, shadcn dialog                                                                  | `10-modal-drawer-standard.md`         | One overlay law                                                 |
| Scroll/responsive    | `layout.css` aliases, calendar/inbox/tasks/projects CSS                                                                  | `11-scroll-responsive-standard.md`    | One scroll law; module CSS merged                               |
| Navigation/workspace | `AixiaNavigationCard`, `AixiaWorkspaceCard`, local hub layouts                                                           | `12-navigation-workspace-standard.md` | One navigation law                                              |
| Module wrappers      | finance/calendar/chat/inbox/tasks/projects CSS + finance command shells                                                  | `13-module-wrapper-rules.md`          | Wrappers delegate-only                                          |


---

## 4. Inventory & classification

### 4.1 `qa-agent/design-system/` docs


| File(s)                                                                                                                                       | Current role                      | Class                                     | Target owner | Cleanup action                                      | Gate                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------- | ------------ | --------------------------------------------------- | ----------------------- |
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md`                                                                                                           | Locked shell/hero/meta/scroll law | **KEEP AS CANONICAL INPUT**               | 03/04/05/11  | Merge into owners; then deprecate as standalone law | After 03/04/05/11 exist |
| `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md`                                                                                                      | Layer architecture                | **KEEP AS CANONICAL INPUT**               | 00/13        | Merge                                               | After 13                |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md`                                                                                                       | P0/P1 backlog                     | **KEEP AS CANONICAL INPUT**               | 16           | Track until items closed                            | Ongoing                 |
| `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md`                                                                                              | Conflict inventory                | **KEEP AS CANONICAL INPUT**               | 16           | Merge into map                                      | Ongoing                 |
| `AIXIA_P0_META_STRIP_AUTHORITY.md`                                                                                                            | Meta strip law                    | **KEEP AS CANONICAL INPUT**               | 05           | Merge                                               | After 05                |
| `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md`                                                                                                        | Scroll aliases                    | **KEEP AS CANONICAL INPUT**               | 11           | Merge                                               | After 11                |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md`                                                                                                     | Shell/hero enforcement            | **KEEP AS CANONICAL INPUT**               | 03/04/15     | Merge                                               | After 03/04/15          |
| `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md`                                                                                                  | Guardrail rules                   | **KEEP AS CANONICAL INPUT**               | 15           | Merge                                               | After 15                |
| `AIXIA_GLOBAL_PAGE_PATTERNS.md`                                                                                                               | Page patterns                     | **KEEP AS CANONICAL INPUT**               | 03/06/12     | Merge                                               | After owners            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md`                                                                                                      | Rulebook                          | **KEEP AS CANONICAL INPUT**               | 00           | Merge                                               | After review            |
| `AIXIA_AI_PAGE_BUILDING_RULES.md`                                                                                                             | AI build rules                    | **KEEP AS CANONICAL INPUT**               | 00/14        | Merge                                               | After 14                |
| `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md`                                                                                                         | QA checklist                      | **KEEP AS CANONICAL INPUT**               | 15           | Merge                                               | After 15                |
| `AIXIA_SHARED_COMPONENT_GAP_LIST.md`                                                                                                          | Component gaps                    | **KEEP AS CANONICAL INPUT**               | 06/13        | Merge                                               | After owners            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md`                                                                                                | Migration plan                    | **KEEP AS CANONICAL INPUT**               | 14           | Merge                                               | After 14                |
| `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md`                                                                                                    | Component audit                   | **KEEP AS CANONICAL INPUT**               | 13           | Merge                                               | After 13                |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md`                                                                                        | AgentOps plan                     | **KEEP AS CANONICAL INPUT**               | 04/13/14     | Merge                                               | After owners            |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md`                                                                                           | Parity audit                      | **KEEP AS CANONICAL INPUT**               | 16           | Reference                                           | Ongoing                 |
| `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md`                                                                                      | This program's plan               | **KEEP AS CANONICAL INPUT**               | 16           | Reference                                           | Ongoing                 |
| `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md`                                                                                           | Direction context                 | **KEEP** (history/context)                | —            | Reference                                           | —                       |
| `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md`                                                                                                | Finance bridge plan               | **KEEP AS CANONICAL INPUT**               | 13           | Merge                                               | After 13                |
| `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md`                                                                                                           | Calendar scroll                   | **KEEP AS CANONICAL INPUT**               | 11           | Merge                                               | After 11                |
| `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md`                                                                                                           | shadcn boundary                   | **KEEP AS CANONICAL INPUT**               | 07/15        | Merge                                               | After owners            |
| `AIXIA_P0_BATCH_1..8_*` (8)                                                                                                                   | Batch history                     | **DEPRECATE**                             | —            | Banner → archive                                    | After 00/16 approved    |
| `AIXIA_PHASE_1A..2A_*` (10)                                                                                                                   | Phase history                     | **DEPRECATE**                             | —            | Banner → archive                                    | After 00/16 approved    |
| `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md`                                                                                              | Consolidation report              | **DEPRECATE**                             | —            | Banner → archive                                    | After review            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md`                                                                                             | Foundation report                 | **DEPRECATE**                             | —            | Banner → archive                                    | After review            |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md`                                                                                                | Old next-step plan                | **DEPRECATE**                             | —            | Superseded by this program                          | After review            |
| `AIXIA_WEBSITE_STRUCTURE_INVENTORY_REPORT.md`, `AIXIA_FULL_WEBSITE_STRUCTURE_INVENTORY.md`, `AIXIA_GLOBAL_FOLDER_BATCH_10_CREATION_REPORT.md` | Inventory / batch report          | **KEEP** (non-visual reference / history) | —            | Reference                                           | —                       |


### 4.2 `qa-agent/design-system/memory/`


| File                                    | Class                    | Cleanup action                          | Gate              |
| --------------------------------------- | ------------------------ | --------------------------------------- | ----------------- |
| `AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md`  | **KEEP AS WRAPPER ONLY** | Point to `aixia-global/00`; mirror only | After 00 approved |
| `AIXIA_DESIGN_COMPONENT_MEMORY.md`      | **KEEP AS WRAPPER ONLY** | Mirror, not law                         | After owners      |
| `AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | **KEEP AS WRAPPER ONLY** | Mirror, not law                         | After owners      |
| `AIXIA_WEBSITE_STRUCTURE_MEMORY.md`     | **KEEP** (non-visual)    | Reference                               | —                 |


### 4.3 `src/design-system/` docs


| File                                          | Class                                  | Target owner | Cleanup action                                   | Gate              |
| --------------------------------------------- | -------------------------------------- | ------------ | ------------------------------------------------ | ----------------- |
| `README.md`                                   | **KEEP AS WRAPPER ONLY**               | 00           | Governance entry → delegate to `aixia-global/00` | After 00 approved |
| `aixia-design-principles.md`                  | **KEEP AS CANONICAL INPUT**            | 00/01/02     | Merge                                            | After owners      |
| `aixia-page-patterns.md`                      | **KEEP AS CANONICAL INPUT**            | 03/04/06/12  | Merge                                            | After owners      |
| `aixia-component-rules.md`                    | **KEEP AS CANONICAL INPUT**            | 06/07/09     | Merge                                            | After owners      |
| `aixia-table-rules.md`                        | **KEEP AS CANONICAL INPUT**            | 08           | Merge                                            | After 08          |
| `aixia-form-rules.md`                         | **KEEP AS CANONICAL INPUT**            | 09           | Merge                                            | After 09          |
| `aixia-navigation-rules.md`                   | **KEEP AS CANONICAL INPUT**            | 12           | Merge                                            | After 12          |
| `aixia-archive-rules.md`                      | **KEEP AS CANONICAL INPUT**            | 07/10        | Merge                                            | After owners      |
| `aixia-conflict-deprecation-policy.md`        | **KEEP AS CANONICAL INPUT**            | 15/16        | Merge                                            | After 15          |
| `aixia-migration-checklist.md`                | **KEEP AS CANONICAL INPUT**            | 14           | Merge                                            | After 14          |
| `aixia-migration-watch-registry.md`           | **KEEP AS WRAPPER ONLY**               | 14           | Living registry under 14                         | After 14          |
| `aixia-refresh-rules.md`                      | **KEEP** (behavior, partly non-visual) | 13           | Reference                                        | —                 |
| `aixia-permission-ui-rules.md`                | **KEEP** (behavior)                    | 13           | Reference                                        | —                 |
| `aixia-finance-workflow-registry-contract.md` | **MIGRATE LATER**                      | 08/13        | Generalize finance-only contract                 | After 08/13       |


### 4.4 Component-folder docs


| File                                     | Class         | Cleanup action                                                                                           | Gate         |
| ---------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| `src/components/aixia/AIXIA_STANDARD.md` | **DEPRECATE** | Already marked deprecated as design law; keep as component index until merged into 00/06/07, then banner | After owners |


### 4.5 CSS files


| File                                        | Class                        | Target owner / rule  | Cleanup action                                              | Gate                    |
| ------------------------------------------- | ---------------------------- | -------------------- | ----------------------------------------------------------- | ----------------------- |
| `src/styles/aixia-design-system.css`        | **KEEP AS CANONICAL INPUT**  | 01/02/06/07/08/09/10 | Primary implementation; optional controlled split later     | After owners + approval |
| `src/styles/dashboard/tokens.css`           | **KEEP AS CANONICAL INPUT**  | 01                   | Implements tokens                                           | After 01                |
| `src/styles/dashboard/layout.css`           | **KEEP AS CANONICAL INPUT**  | 03/11                | Implements shell/scroll                                     | After 03/11             |
| `src/styles/dashboard/visual.css`           | **KEEP AS CANONICAL INPUT**  | 04/06                | Implements hero/metrics                                     | After 04/06             |
| `src/styles/dashboard/sidebar-chrome.css`   | **KEEP AS WRAPPER ONLY**     | —                    | App chrome only                                             | —                       |
| `src/styles/dashboard/presence.css`         | **KEEP** (feature chrome)    | 13                   | Reference                                                   | —                       |
| `src/styles/dashboard/admin-usage.css`      | **DELETE LATER** (if orphan) | —                    | Import-check; delete only if unused                         | Import map + approval   |
| `src/styles/finance/finance-visual.css`     | **KEEP AS WRAPPER ONLY**     | 13                   | Scoped `.aixia-finance-page` bridge; no global selectors    | —                       |
| `src/styles/finance/master-data-visual.css` | **KEEP AS WRAPPER ONLY**     | 13                   | Scoped finance registry                                     | —                       |
| `src/styles/calendar/calendar-visual.css`   | **MIGRATE LATER**            | 04/11                | Deprecate hero overrides; keep grid/scroll exceptions in 11 | After 04/11             |
| `src/styles/chat/chat-visual.css`           | **MIGRATE LATER**            | shared `AixiaChat*`  | Replace with shared chat components                         | After chat migration    |
| `src/styles/inbox/inbox-visual.css`         | **MIGRATE LATER**            | 11                   | Merge scroll naming into aliases                            | After 11                |
| `src/styles/tasks/tasks-visual.css`         | **MIGRATE LATER**            | 11                   | Merge into aliases                                          | After 11                |
| `src/styles/projects/projects-visual.css`   | **MIGRATE LATER**            | 03/06                | Merge into command global                                   | After owners            |
| `src/styles/aixia-process-book.css`         | **KEEP AS WRAPPER ONLY**     | —                    | Scoped workflow only (P2)                                   | —                       |
| `src/styles/aixia-finance-print.css`        | **KEEP** (isolated print)    | —                    | Out of screen-design scope                                  | —                       |


### 4.6 Shared components (`src/components/aixia/`**)

Implementation layer — **KEEP** as realization of the law. Notable classifications:


| Component(s)                                                                                                                                                 | Class                         | Target owner | Note                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------ | --------------------------------------------------------------------------- |
| `AixiaPage`, `AixiaCommandPage`, `AixiaCommandPageLayout`                                                                                                    | **KEEP** (implements 03)      | 03           | Deprecate default orb surface on app pages                                  |
| `FinancePage`                                                                                                                                                | **KEEP AS WRAPPER ONLY**      | 13           | Delegates to `AixiaCommandPage` + finance scope                             |
| `AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage`                                                                                             | **MIGRATE LATER**             | 13           | Generalize to shared command detail/create (P1-04)                          |
| `AixiaHero`                                                                                                                                                  | **KEEP** (implements 04)      | 04           | Default surface decision owned by 04                                        |
| `AixiaCommandHubMetaStrip`, `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip`, `AixiaSignalRow`                                                          | **KEEP** (implements 05)      | 05           | One strip law; finance/runtime delegate                                     |
| `AixiaCommandMetrics`, `AixiaMetricCard`, `AixiaMetricGrid`, `AixiaStatusCard`, `FinanceHubMetrics`                                                          | **KEEP / MIGRATE LATER**      | 06           | Resolve metric duplication; `FinanceHubMetrics` alias cleanup (P1-01/P3-03) |
| `AixiaSection`, `AixiaDetailSection`, `AixiaContentBlocks`, `AixiaValueBlock`                                                                                | **KEEP** (implements 06)      | 06           | Default command surface                                                     |
| `AixiaButton`, `AixiaActionSystem`, `AixiaActionCard`, `AixiaRowActionMenu`, `AixiaLifecycleRowActions`, `AixiaArchiveRowActions`, `AixiaStickyActionFooter` | **KEEP** (implements 07)      | 07           | One action law                                                              |
| `AixiaTable`, `AixiaTableCells`, `AixiaRegistryToolbar`, `AixiaSideList`, `AixiaHistoryRow`                                                                  | **KEEP** (implements 08)      | 08           | Move `agentops-dense-table` CSS out of global (P1-06)                       |
| `AixiaFormFields`, `AixiaDatePicker`, `AixiaSearchField`                                                                                                     | **KEEP** (implements 09)      | 09           |                                                                             |
| `AixiaModal`, `AixiaArchiveManagerModal`, `AixiaPopoverPanel`                                                                                                | **KEEP** (implements 10)      | 10           |                                                                             |
| `AixiaNavigationCard`, `AixiaWorkspaceCard`, `AixiaWorkspaceShell`, `AixiaFeaturePanel`                                                                      | **KEEP** (implements 12)      | 12           |                                                                             |
| `AixiaChatThread/Message/Composer`                                                                                                                           | **KEEP** (implements 12/chat) | 12           | Supersedes `chat-visual.css`                                                |


### 4.7 Layout & shadcn/ui components


| File(s)                                     | Class                    | Cleanup action                               | Gate                    |
| ------------------------------------------- | ------------------------ | -------------------------------------------- | ----------------------- |
| `src/components/layout/DashboardLayout.tsx` | **KEEP AS WRAPPER ONLY** | App chrome; shadcn allowed here only         | —                       |
| `src/components/ui/`** (shadcn)             | **KEEP AS WRAPPER ONLY** | Chrome/auth only — never page-content law    | —                       |
| `src/components/ui/PageLoader.tsx`          | **DELETE LATER**         | 0 app usages (replaced by `AixiaAsyncState`) | Import check + approval |


### 4.8 Guardrails


| File(s)                                                                  | Class                        | Cleanup action                                                    | Gate                   |
| ------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------- | ---------------------- |
| `scripts/guardrails/aixia-guardrail-allowlists.mjs`                      | **KEEP AS WRAPPER ONLY**     | Point `PAGE_SHELL_HERO_STANDARD` const to `aixia-global/03` (+04) | After 03/04 + approval |
| `scripts/guardrails/aixia-shell-hero-guardrails.mjs`                     | **KEEP** (enforces 03/04)    | Cite owner files in messages                                      | After owners           |
| `scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs`                | **KEEP** (enforces 07/15)    | Cite owners                                                       | After owners           |
| `scripts/guardrails/aixia-visual-parity.mjs`, `aixia-dashboard-page.mjs` | **KEEP** (enforces 03/04/06) | Cite owners                                                       | After owners           |
| `scripts/aixia-guardrails.mjs` (build entry)                             | **KEEP**                     | Print authority = `aixia-global/00`                               | After owners           |


### 4.9 Misc


| File                                            | Class            | Cleanup action       | Gate                    |
| ----------------------------------------------- | ---------------- | -------------------- | ----------------------- |
| `src/App.css` (Vite starter, if present/unused) | **DELETE LATER** | Confirm not imported | Import check + approval |


---

## 5. Deletion / move / archive gates

No file may be **deleted, moved, renamed, or bannered** until **all** of the following are satisfied:

1. Dependency / import check is complete (no live importers).
2. Replacement owner file exists in `aixia-global/`.
3. Guardrails point to the replacement owner file.
4. Browser checks pass (no visual regression).
5. **Piter approves.**

This matches `src/design-system/aixia-conflict-deprecation-policy.md` (map dependents → confirm replacement → migrate → validate responsive → build/type check → only then delete or archive).

---

## 6. Final deletion / archive phase

After `00`–`16` are populated and approved, run a dedicated cleanup phase:


| Step | Action                                                                                                                  | Gate                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| C1   | Add deprecation banners to all **DEPRECATE** docs (point to owner files)                                                | Owners exist + approval    |
| C2   | Convert **WRAPPER** docs/components/CSS to explicit delegation notes                                                    | Owners exist               |
| C3   | Re-point all **guardrails** to `aixia-global/` owner files                                                              | 03/04/07/15 exist          |
| C4   | **Migrate** module CSS/components (calendar, chat, inbox, tasks, projects; finance command shells) one module per batch | Browser + build per module |
| C5   | **Archive** batch/phase history reports to `qa-agent/design-system/archive/`                                            | Banners added              |
| C6   | **Delete** confirmed-unused files (`PageLoader.tsx`, orphan CSS, Vite starter)                                          | Import check + approval    |
| C7   | Final sweep: confirm no file outside `aixia-global/` asserts visual law                                                 | Full repo grep + approval  |


**Outcome:** future AI/Cursor/Hermes agents read **only** `src/design-system/aixia-global/` for design law. No old report, module CSS, or duplicate standard can be mistaken for current authority.

---

## 7. Cleanup order

1. **Create** `00` **and** `16` (this batch — done).
2. Create `01`–`15` **one aspect at a time** (later batches, after `00`/`16` approved).
3. Add **deprecation banners** later (C1).
4. Update **guardrails** later (C3).
5. **Migrate** module CSS/components later (C4).
6. **Archive** old reports later (C5).
7. **Delete** only after approval (C6) and final sweep (C7).

---

## Related

- Authority root: `00-README-SOURCE-OF-TRUTH.md`
- Full plan: `qa-agent/design-system/AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md`
- Deprecation process: `src/design-system/aixia-conflict-deprecation-policy.md`

