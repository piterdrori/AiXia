<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/06-card-section-standard.md, src/design-system/aixia-global/07-button-action-standard.md, src/design-system/aixia-global/08-table-list-standard.md, src/design-system/aixia-global/09-form-input-standard.md, src/design-system/aixia-global/10-modal-drawer-standard.md, src/design-system/aixia-global/12-navigation-workspace-standard.md, src/design-system/aixia-global/13-module-wrapper-rules.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file records a **shared component audit** (pre–`aixia-global/` program). It **must not** override owner files.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`06-card-section-standard.md`](../../src/design-system/aixia-global/06-card-section-standard.md) — cards / sections
> - [`07-button-action-standard.md`](../../src/design-system/aixia-global/07-button-action-standard.md) — buttons / actions
> - [`08-table-list-standard.md`](../../src/design-system/aixia-global/08-table-list-standard.md) — tables / lists
> - [`09-form-input-standard.md`](../../src/design-system/aixia-global/09-form-input-standard.md) — forms / inputs
> - [`10-modal-drawer-standard.md`](../../src/design-system/aixia-global/10-modal-drawer-standard.md) — modals / drawers
> - [`12-navigation-workspace-standard.md`](../../src/design-system/aixia-global/12-navigation-workspace-standard.md) — navigation / workspace
> - [`13-module-wrapper-rules.md`](../../src/design-system/aixia-global/13-module-wrapper-rules.md) — module wrappers / components
>
> - If this audit conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AiXia Existing Shared Component Audit

## Purpose

Audit current shared AiXia design components and CSS before creating new global shared components, to prevent duplication and enforce extend-first decisions.

## Scope And Safety

- Audit only (no app page edits, no migrations, no logic/runtime/backend changes)
- Source inputs reviewed first as requested:
  - `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md` and relevant owner files `01`–`16`
  - `src/components/aixia/index.ts`
  - `src/components/aixia/**` (pattern-relevant shared files)
  - `src/styles/aixia-design-system.css`
  - `src/design-system/aixia-global/**`
  - `qa-agent/design-system/AIXIA_SHARED_COMPONENT_GAP_LIST.md`
  - `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md`

**Historical note (Batch 50):** `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md` and `AIXIA_GLOBAL_PAGE_PATTERNS.md` are bannered deprecated inputs — not current law.

## Executive Audit Result

- Shared navigation and card primitives already exist strongly (`AixiaNavigationGrid`, `AixiaNavigationCard`, `AixiaWorkspaceCard`)
- Shared timeline/history exists partially (`AixiaHistoryRow`, process history modals) but not as a full reusable audit timeline shell
- Shared status primitives exist partially (`AixiaStatusBadge`, `AixiaStatusCard`, `AixiaSignalRow`, `AixiaFinanceHubMetaStrip`) but no global runtime strip component
- Shared workspace/detail shell exists under Finance-specific names (`AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage`) and generic layout primitives (`AixiaPage`, `AixiaSmartLayout`, `AixiaDetailSection`), but no module-agnostic `AiXiaWorkspaceShell`
- Chat/workbench and memory-approval shared components are currently missing as first-class shared components

## Component/Pattern Classification Matrix

Legend used in classification:
- Exists fully
- Exists partially
- Exists under another name
- Missing
- Should extend existing component
- Should create new component

| Requested component/pattern | Existing candidate(s) | Classification | Recommended action |
|---|---|---|---|
| `AiXiaChatThread` | No shared chat-thread component in `src/components/aixia` | Missing | Create new component |
| `AiXiaChatMessage` | No shared chat-message bubble component in `src/components/aixia` | Missing | Create new component |
| `AiXiaChatComposer` | No shared chat-composer/input component in `src/components/aixia` | Missing | Create new component |
| Disabled/planned chat state | `AixiaPageStates`, `AixiaInfoBlock`, `AixiaAlert` | Exists partially | Extend existing state/info primitives inside new chat shell |
| Per-agent message identity | `AixiaBadge`, `AixiaStatusBadge`, `AixiaProfileCard` (generic identity visuals) | Exists partially | Extend via new `AiXiaChatMessage` props (agent label/avatar/tone) |
| Message action area | `AixiaActionSystem`, `AixiaButton` | Exists under another name (generic action bar) | Extend existing action primitives; do not build separate generic action system |
| `AiXiaMemoryApprovalPrompt` | No dedicated shared component; only generic blocks/buttons exist | Missing | Create new component (intent-gated memory approval block) |
| Inline Yes/No memory prompt style | `AixiaButton`, `AixiaInfoBlock`, `AixiaStatusBadge` | Exists partially | Extend by composing in new `AiXiaMemoryApprovalPrompt` |
| Compact approval block | `AixiaInfoBlock` + compact button rows possible, not standardized | Exists partially | Extend existing primitives inside new memory prompt component |
| `AiXiaRuntimeStatusStrip` | `AixiaFinanceHubMetaStrip`, `AixiaSignalRow`, `AixiaStatusBadge`, `AixiaStatusCard`, `AixiaFinanceHubControlPanel` | Exists partially / under another name | Extend existing strip primitives into module-agnostic runtime strip |
| Compact status badges | `AixiaStatusBadge`, `AixiaBadge` | Exists fully | Reuse as-is |
| System readiness row | `AixiaSignalRow` + `AixiaFinanceHubMetaStrip` | Exists partially | Extend into `AiXiaRuntimeStatusStrip` API |
| Manual-first/safety badges | `AixiaBadge`, `AixiaInfoBlock`, `AixiaAccessRule` | Exists partially | Reuse badges + info block patterns inside runtime strip |
| `AiXiaWorkspaceShell` | `AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage`, `AixiaPage`, `AixiaSmartLayout`, `AixiaDetailSection` | Exists under another name (finance-specific) / partial globally | Extend finance shell pattern into module-agnostic workspace shell |
| Shared detail page wrapper | `AixiaFinanceCommandDetailPage` | Exists under another name | Extend and generalize |
| Primary/secondary layout | `AixiaSmartLayout` | Exists fully | Reuse as-is |
| Collapsible secondary details | Native `<details>` style exists via CSS `.agentops-disclosure`; no shared component | Exists partially | Create shared disclosure wrapper, reuse CSS pattern ideas |
| Timeline/history area | `AixiaHistoryRow`, `AixiaProcessHistoryModal`, `AixiaPayrollProcessHistoryModal` | Exists partially | Extend into `AiXiaAuditTimeline` |
| Shared collapsible group | No shared `Aixia*Disclosure*` component in index exports | Missing | Create new component (`AiXiaProgressiveDisclosureGroup`) |
| Details/summary pattern | CSS support for `.agentops-disclosure > summary`, plus native usage on pages | Exists partially | Wrap into shared reusable disclosure component |
| Advanced section pattern | `AixiaSection`, `AixiaInfoBlock`, `AixiaFeaturePanel` | Exists partially | Extend with shared progressive-disclosure group |
| Activity feed | `AixiaHistoryRow` can render item rows | Exists partially | Extend with timeline/feed shell |
| Audit timeline | No dedicated shared audit timeline component | Missing | Create new `AiXiaAuditTimeline` |
| Issue timeline | No dedicated shared issue timeline component | Missing | Create in same timeline family |
| Decision history list | `AixiaHistoryRow` + `AixiaStatusBadge` | Exists partially | Extend into timeline family |
| Route navigation grid | `AixiaNavigationGrid` | Exists fully | Reuse as-is |
| Navigation cards | `AixiaNavigationCard` | Exists fully | Reuse as-is |
| Workspace cards | `AixiaWorkspaceCard` | Exists fully | Reuse as-is |
| Module cards | `AixiaNavigationCard` + `AixiaWorkspaceCard` | Exists fully | Reuse as-is |

## Existing Shared Components Found (Pattern-Relevant)

- **Navigation/Hub:** `AixiaNavigationGrid`, `AixiaNavigationCard`, `AixiaNavigationInfoPanel`, `AixiaNavigationStatBlock`, `AixiaWorkspaceCard`
- **Detail/Layout:** `AixiaPage`, `FinancePage`, `AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage`, `AixiaSmartLayout`, `AixiaSection`, `AixiaDetailSection`
- **Status/Signals:** `AixiaStatusBadge`, `AixiaStatusCard`, `AixiaSignalRow`, `AixiaFinanceHubMetaStrip`, `AixiaFinanceHubControlPanel`, `AixiaAccessRule`, `AixiaInfoBlock`
- **History:** `AixiaHistoryRow`, `AixiaProcessHistoryModal`, `AixiaPayrollProcessHistoryModal`
- **Action areas:** `AixiaActionSystem`, `AixiaButton`

## Equivalent Components Under Different Names

- `AiXiaWorkspaceShell` equivalent base: `AixiaFinanceCommandDetailPage` (detail workspace shell, finance-scoped)
- Runtime strip equivalent base: `AixiaFinanceHubMetaStrip` + `AixiaSignalRow` (finance-scoped signal strip)
- Timeline equivalent row base: `AixiaHistoryRow` (row primitive, not complete timeline shell)
- Navigation module-card system already implemented as `AixiaNavigationGrid` + `AixiaNavigationCard` + `AixiaWorkspaceCard`

## Components To Extend (Do Not Duplicate)

- `AixiaFinanceCommandDetailPage` / `AixiaFinanceCommandCreatePage` -> extend pattern into global `AiXiaWorkspaceShell`
- `AixiaSignalRow` + `AixiaStatusBadge` + `AixiaInfoBlock` -> compose into `AiXiaRuntimeStatusStrip`
- `AixiaHistoryRow` -> use as base row primitive for `AiXiaAuditTimeline`
- `AixiaActionSystem` + `AixiaButton` -> use as action foundation in chat/message/memory prompt components
- `AixiaPageStates` + `AixiaInfoBlock` -> use for disabled/planned chat and blocked runtime states

## Components To Create New

- `AiXiaChatThread`
- `AiXiaChatMessage`
- `AiXiaChatComposer`
- `AiXiaMemoryApprovalPrompt`
- `AiXiaRuntimeStatusStrip` (new component, but built from existing status/signal primitives)
- `AiXiaWorkspaceShell` (new global shell, generalized from finance shell contract)
- `AiXiaProgressiveDisclosureGroup`
- `AiXiaAuditTimeline`

## CSS/Classes Audit

### CSS/Classes Already Available

- Navigation/workspace cards: `.aixia-navigation-*`, `.aixia-workspace-card*`
- Status/signal rows: `.aixia-status-card*`, `.aixia-status-badge`, `.aixia-signal-row*`, `.aixia-finance-hub-meta`
- Detail/layout: `.aixia-detail-section*`, `.aixia-smart-layout*`, `.aixia-command-scroll`
- History row: `.aixia-history-row*`
- Existing disclosure style pattern: `.agentops-disclosure` and `summary` selectors (currently route-style oriented)

### CSS/Classes Missing (Need New Shared Ownership)

- Chat primitives: no `.aixia-chat-thread*`, `.aixia-chat-message*`, `.aixia-chat-composer*`
- Memory approval prompt family: no `.aixia-memory-approval*`
- Global runtime strip family: no module-agnostic `.aixia-runtime-status-strip*`
- Shared progressive disclosure family: no generic `.aixia-progressive-disclosure*`
- Shared timeline shell/feed family: no `.aixia-audit-timeline*` container classes

## Exact Files Inspected

- `src/components/aixia/index.ts`
- `src/components/aixia/AIXIA_STANDARD.md`
- `src/components/aixia/AixiaWorkspaceCard.tsx`
- `src/components/aixia/AixiaNavigationCard.tsx`
- `src/components/aixia/AixiaFinanceCommandDetailPage.tsx`
- `src/components/aixia/AixiaFinanceCommandCreatePage.tsx`
- `src/components/aixia/AixiaHistoryRow.tsx`
- `src/components/aixia/AixiaFinanceHubMetaStrip.tsx`
- `src/components/aixia/AixiaAccessRule.tsx`
- `src/components/aixia/AixiaDetailSection.tsx`
- `src/components/aixia/AixiaPopoverPanel.tsx`
- `src/components/aixia/AixiaWorkflowNotesSection.tsx`
- `src/components/aixia/AixiaSection.tsx`
- `src/components/aixia/AixiaPage.tsx`
- `src/components/aixia/FinancePage.tsx`
- `src/components/aixia/AixiaSmartLayout.tsx`
- `src/components/aixia/AixiaStatusBadge.tsx`
- `src/components/aixia/AixiaInfoBlock.tsx`
- `src/components/aixia/AixiaActionSystem.tsx`
- `src/components/aixia/AixiaFeaturePanel.tsx`
- `src/components/aixia/AixiaSideList.tsx`
- `src/components/aixia/AixiaStatusCard.tsx`
- `src/components/aixia/AixiaContextSummarySection.tsx`
- `src/components/aixia/AixiaSignalRow.tsx`
- `src/components/aixia/process-book/AixiaProcessHistoryModal.tsx`
- `src/components/aixia/process-book/AixiaPayrollProcessHistoryModal.tsx`
- `src/components/aixia/process-book/index.ts`
- `src/components/aixia/AixiaFinanceHubControlPanel.tsx`
- `src/styles/aixia-design-system.css`
- `src/design-system/README.md`
- `src/design-system/aixia-component-rules.md`
- `src/design-system/aixia-page-patterns.md`
- `src/design-system/aixia-design-principles.md`
- `src/design-system/aixia-migration-watch-registry.md`
- `qa-agent/design-system/AIXIA_SHARED_COMPONENT_GAP_LIST.md`
- `qa-agent/design-system/AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md`
- `qa-agent/design-system/AIXIA_GLOBAL_PAGE_PATTERNS.md`
- `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md`

## Next Recommended Implementation Order (Extend-First)

1. Build `AiXiaWorkspaceShell` by generalizing `AixiaFinanceCommandDetailPage` contract (no finance behavior changes)
2. Build chat primitives (`AiXiaChatThread`, `AiXiaChatMessage`, `AiXiaChatComposer`) using existing section/action/state primitives
3. Build `AiXiaMemoryApprovalPrompt` on top of chat + badge/button/info primitives (intent-gated UX only)
4. Build `AiXiaRuntimeStatusStrip` by composing `AixiaSignalRow`/status badge conventions
5. Build `AiXiaAuditTimeline` by extending `AixiaHistoryRow`
6. Build `AiXiaProgressiveDisclosureGroup` to standardize current native `<details>` usage into shared ownership

## Final Audit Decision

- Do not duplicate existing navigation/workspace/status/timeline-row primitives
- Extend existing shared components where partial/equivalent foundations already exist
- Create new components only for clear missing families (chat, memory prompt, progressive disclosure shell, audit timeline shell, global workspace shell, runtime strip)
