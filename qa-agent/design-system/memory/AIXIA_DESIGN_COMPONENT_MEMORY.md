<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-memory-mirror-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Memory mirror only — not active design law**
>
> This memory file is a **mirror/context/agent briefing file only**. It is **not** active AiXia design authority.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This memory file is **not current law**.
>
> - If this mirror conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - Memory may record lessons, proposals, status, and history — **not** law.
> - Memory must route approved rule changes into the correct owner file (per `00` §0.2).
> - Memory must **not** silently change law or implementation.
> - **Do not add new design rules here.** Proposed improvements require Piter approval before owner files, guardrails, code, CSS, schemas, workflows, or page behavior change.
> - Archive or delete requires dependency checks and **Piter approval** (see `16-design-file-cleanup-map.md`).
>
> **Role:** operational memory mirror — continuity and agent briefing, not a second law book.

# AiXia Design Component Memory

## Current authority (Batch 53 — read `aixia-global/` first)

**Active design law:** `src/design-system/aixia-global/` owners `00`–`16`. Component/CSS files **implement** law; they do not author competing visual law.

**Living law (Batch 51):** Agents may propose owner-file improvements when gaps are found — with evidence and Piter approval. Do not silently change components/CSS/pages to bypass owners. Memory mirrors only.

**Paused:** page migrations, Batch 9 finance proofs, command-surface context, CSS split, archive/delete.

**Silent refresh (mandatory):** See `AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` — owners `11`, `13`, `14`, `15`.

**12 agents:** Report issues and propose owner-file upgrades via Hermes/memory — not silent implementation changes (`00` §0.4).

**Shell/hero/meta law:** `03-page-shell-standard.md`, `04-hero-header-standard.md`, `05-meta-status-strip-standard.md` — not Stage 3 Tier 1 shell/hero authority inputs (historical merged only).

**Legacy reference:** `AIXIA_STANDARD.md` — component index / implementation bridge only.

## Existing Shared Components (Current Baseline)

From `src/components/aixia/index.ts` and related shared files:

- Page shells: `AixiaPage`, `AixiaCommandPage`, `AixiaCommandPageLayout`, `FinancePage`
- Meta strip (page chrome): `AixiaCommandHubMetaStrip` (preferred), `AixiaFinanceHubMetaStrip` (alias)
- Hero/layout: `AixiaHero`, `AixiaSection`, `AixiaSmartGrid`, `AixiaSmartLayout`
- KPIs/status: `AixiaCommandMetrics`, `AixiaMetricCard`, `AixiaStatusCard`, `AixiaStatusBadge`
- Navigation cards: `AixiaNavigationCard`, `AixiaWorkspaceCard`
- Registry/table: `AixiaRegistryToolbar`, `AixiaTableShell`, `AixiaSortableHeader`, shared table cells
- Forms: `AixiaFormFields`, `AixiaDatePicker`, `AixiaModal`, sticky footer
- Alerts/states: `AixiaAlert`, `AixiaInfoBlock`, `AixiaEmptyState`, `AixiaPageStates`
- Workflow/process: process-book suite + workflow registry components
- Print system: `AixiaFinancePrint*`

## Missing Shared Patterns (Global Program Gaps)

1. Unified non-finance module templates mirroring finance-level structure rigor.
2. Shared command-center pattern for AI/admin/system pages outside finance.
3. Shared chat/workbench layout primitives for all chat-like modules.
4. Shared timeline/history visualization pattern for cross-module use.
5. Shared migration metadata tag system to mark page compliance level.

## Repeated Local/Duplicate Patterns to Eliminate

1. Local hero or summary shells in legacy pages.
2. Route-specific list/control bars that duplicate registry behavior.
3. Per-page spacing rhythm overrides not aligned to shared tokens.
4. Mixed command/detail wrappers across similar workflow pages.

## Build-Before-Migration Component Priorities

### Priority 1 (Foundation)

- Global command-center wrapper + metadata strip for non-finance modules
- Global detail/workspace wrapper parity (finance + system + AI)
- Global registry/list shell parity

### Priority 2 (Workflow/Comms)

- Shared chat/workbench thread/input/action framing
- Shared history/timeline sections
- Shared operator/advanced panel blocks

### Priority 3 (Cleanup/Standardization)

- Legacy alias/redirect deprecation helpers and route-state consistency badges
- Shared risk/compliance indicator blocks for migration QA

## Final Gap List Summary (Foundation Phase)

Primary shared gaps are now formalized in **Stage 3 Wave A shared component gap list** (historical merged input → `06`/`13`):

Key blockers:

- `AiXiaModuleDashboardShell`
- `AiXiaWorkspaceShell`
- `AiXiaChatThread`
- `AiXiaChatMessage`
- `AiXiaChatComposer`
- `AiXiaMemoryApprovalPrompt`
- `AiXiaLearningCandidateCard`
- `AiXiaRuntimeStatusStrip`

## Build Order (historical sequence — not current law)

1. P1 migration blockers (shell + chat + memory/runtime/learning core)
2. P2 pattern enablers (`AiXiaAuditTimeline`, `AiXiaReportShell`, `AiXiaProcessWizardShell`, `AiXiaSettingsShell`)
3. P3 cleanup enhancements (`AiXiaAuthShell` and optional extras)

## Components Blocking Migration

Broad module migration should not proceed until P1 blockers are implemented and validated.

## Existing Component Audit Summary (Latest)

Audit reference: **Stage 3 Wave A existing shared component audit** (historical merged input → `13`):

Key findings:

- Navigation/shared module cards already exist fully (`AixiaNavigationGrid`, `AixiaNavigationCard`, `AixiaWorkspaceCard`).
- Detail/workspace shell exists partially under finance-specific names (`AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage`) plus global layout primitives (`AixiaPage`, `AixiaSmartLayout`, `AixiaDetailSection`).
- Runtime/status strip patterns exist partially (`AixiaFinanceHubMetaStrip`, `AixiaSignalRow`, `AixiaStatusBadge`, `AixiaInfoBlock`) but no global runtime strip component.
- Timeline/activity exists partially (`AixiaHistoryRow`, process history modals) but no shared audit timeline shell.
- Chat/workbench and memory approval prompt shared components are still missing.

## Final Decision For P1 Components

- `AiXiaModuleDashboardShell`: **extend existing navigation/card/hub primitives** (do not duplicate card systems).
- `AiXiaWorkspaceShell`: **create new component by extending finance shell contracts** (`AixiaFinanceCommandDetailPage`/`CreatePage`) into a module-agnostic API.
- `AiXiaChatThread`: **create new** (no shared equivalent exists).
- `AiXiaChatMessage`: **create new** (no shared equivalent exists).
- `AiXiaChatComposer`: **create new** (no shared equivalent exists).
- `AiXiaMemoryApprovalPrompt`: **create new**, but compose from existing buttons/badges/info blocks; keep intent-gated behavior.
- `AiXiaLearningCandidateCard`: **create new**, while reusing existing shared card/badge/action primitives.
- `AiXiaRuntimeStatusStrip`: **create new by extending existing status/signal primitives** (`AixiaSignalRow`, `AixiaStatusBadge`, `AixiaInfoBlock`).

## No-Duplication Lock

- Do not duplicate existing shared components when an equivalent or partial foundation exists.
- Extend shared owners first; only create net-new components for truly missing families.
- Repeated page-local patterns remain disallowed by the global design rulebook.

## Build/Extend Order (Locked After Audit)

1. Extend to `AiXiaWorkspaceShell` (from finance shell contract)
2. Build chat primitives (`AiXiaChatThread`, `AiXiaChatMessage`, `AiXiaChatComposer`)
3. Build `AiXiaMemoryApprovalPrompt` on top of existing shared primitives
4. Build `AiXiaRuntimeStatusStrip` from existing status/signal primitives
5. Build `AiXiaLearningCandidateCard`
6. Build `AiXiaAuditTimeline` and `AiXiaProgressiveDisclosureGroup` (P2 enablers)

## Phase 1A Implementation Update (Workspace + Runtime)

Implemented in this phase:

- `AiXiaWorkspaceShell` created in `src/components/aixia/AixiaWorkspaceShell.tsx`
- `AiXiaRuntimeStatusStrip` created in `src/components/aixia/AixiaRuntimeStatusStrip.tsx`
- Shared exports updated in `src/components/aixia/index.ts`
- Shared CSS added in `src/styles/aixia-design-system.css` for:
  - `.aixia-workspace-shell`
  - `.aixia-workspace-shell__body`
  - `.aixia-workspace-shell__primary`
  - `.aixia-workspace-shell__secondary`
  - `.aixia-workspace-shell__details`
  - `.aixia-runtime-status-strip`
  - `.aixia-runtime-status-strip__items`
  - `.aixia-runtime-status-strip__item`

P1 status:

- `AiXiaWorkspaceShell`: created (P1)
- `AiXiaRuntimeStatusStrip`: created (P1)

Scope lock:

- No pages migrated yet.
- No business logic changes.
- No service/Supabase/runtime activation changes.

Next component wave (recommended):

1. `AiXiaChatThread`
2. `AiXiaChatMessage`
3. `AiXiaChatComposer`
4. `AiXiaMemoryApprovalPrompt`

## Phase 1B Implementation Update (Chat Primitives)

Implemented in this phase:

- `AiXiaChatThread` created in `src/components/aixia/AixiaChatThread.tsx`
- `AiXiaChatMessage` created in `src/components/aixia/AixiaChatMessage.tsx`
- `AiXiaChatComposer` created in `src/components/aixia/AixiaChatComposer.tsx`
- Shared exports updated in `src/components/aixia/index.ts`
- Shared CSS added in `src/styles/aixia-design-system.css` for chat thread/message/composer families

Scope lock:

- No pages migrated yet.
- `AiXiaMemoryApprovalPrompt` not created in this phase.
- No business logic/service/Supabase/runtime activation changes.

Next component wave (recommended):

1. `AiXiaMemoryApprovalPrompt`
2. `AiXiaProgressiveDisclosureGroup`
3. `AiXiaAuditTimeline`

## Phase 1C Implementation Update (Memory Approval Prompt)

Implemented in this phase:

- `AiXiaMemoryApprovalPrompt` created in `src/components/aixia/AixiaMemoryApprovalPrompt.tsx`
- Shared export updated in `src/components/aixia/index.ts`
- Shared CSS added in `src/styles/aixia-design-system.css` for `.aixia-memory-approval*` classes

Intent-gated memory rule:

- This component is display-only for approval UI.
- The parent determines when memory intent exists.
- This component does **not** detect intent.
- This component does **not** write memory.

Scope lock:

- No pages migrated yet.
- No service/Supabase changes.
- No runtime activation changes.

Next component wave (recommended):

1. `AiXiaProgressiveDisclosureGroup`
2. `AiXiaAuditTimeline`

## Phase 1D Implementation Update (Progressive Disclosure Group)

Implemented in this phase:

- `AiXiaProgressiveDisclosureGroup` created in `src/components/aixia/AixiaProgressiveDisclosureGroup.tsx`
- Shared export updated in `src/components/aixia/index.ts`
- Shared CSS added in `src/styles/aixia-design-system.css` for `.aixia-progressive-disclosure*` classes

Standardization rule:

- This shared component is the future replacement for scattered page-level `<details>/<summary>` disclosure patterns.
- Disclosure behavior remains accessibility-first and display-only.

Scope lock:

- No pages migrated yet.
- No business logic/service/Supabase/runtime activation changes.

Next component wave (recommended):

1. `AiXiaAuditTimeline`

## Phase 1E Implementation Update (Audit Timeline)

Implemented in this phase:

- `AiXiaAuditTimeline` created in `src/components/aixia/AixiaAuditTimeline.tsx`
- Shared export updated in `src/components/aixia/index.ts`
- Shared CSS added in `src/styles/aixia-design-system.css` for `.aixia-audit-timeline*` classes

Timeline standardization rule:

- This shared component extends existing `AixiaHistoryRow` timeline-row concepts into a reusable timeline/feed shell.
- This component is display-only and parent-driven (no data/service/runtime behavior inside the component).

Scope lock:

- No pages migrated yet.
- No business logic/service/Supabase/runtime activation changes.

Next component wave (recommended):

1. Phase 1F component readiness audit before any page migration

## Phase 1F Implementation Update (Component Readiness Audit)

Readiness audit completed:

- **Evidence:** Wave B historical phase reports (Phase 1F readiness) — archived group pending Stage 2 approval; component law in `src/design-system/aixia-global/06-shared-component-rules.md`, `13-module-wrapper-rules.md`.

Readiness summary:

- Export readiness: PASS (`src/components/aixia/index.ts`, full build)
- Props/CSS/runtime safety: PASS (minor non-blocking polish gaps only)
- Composition readiness: PASS for all planned Phase 1A–1E compositions
- No pages migrated in Phase 1F

Components ready for proof migration:

- `AiXiaChatThread`, `AiXiaChatMessage`, `AiXiaChatComposer`, `AiXiaMemoryApprovalPrompt`, `AiXiaProgressiveDisclosureGroup` (primary proof set)
- `AiXiaRuntimeStatusStrip`, `AiXiaAuditTimeline`, `AiXiaWorkspaceShell` (ready; use in follow-up proofs)

Components needing small fixes (non-blocking):

- Optional `testId` parity on chat/timeline/shell components
- `AiXiaMemoryApprovalPrompt` default helper text should be overridden on non-AgentOps pages

First recommended proof-of-pattern page:

- `/system/agent-ops/council` (low-risk chat/disclosure presentation migration only)

Remaining gaps before broad migration:

- `AiXiaLearningCandidateCard` (P1)
- `AiXiaModuleDashboardShell` (P1)
- `AiXiaReportShell`, `AiXiaProcessWizardShell`, `AiXiaSettingsShell` (P2)
- `AiXiaAuthShell` (P3)

Scope lock:

- No pages migrated yet.
- No business logic/service/Supabase/runtime activation changes in Phase 1F.

Next phase (recommended):

1. Phase 2G proof-of-pattern migration on `/system/agent-ops/council` (chat section only)

## Phase 2A Implementation Update (Council Chat Proof Migration)

First proof migration completed:

- Route: `/system/agent-ops/council`
- Section: Group chat thread + participants disclosure only
- **Evidence:** Wave B historical phase report (Council chat proof) — archived group pending Stage 2 approval; shell/components per `aixia-global/` owners `03`–`06`.

Shared components used:

- `AiXiaChatThread`, `AiXiaChatMessage`, `AiXiaChatComposer`, `AiXiaMemoryApprovalPrompt`, `AiXiaProgressiveDisclosureGroup`

Not used in this proof:

- `AiXiaRuntimeStatusStrip` (runtime badges remain in separate Council status section)

Pages not migrated:

- Whole Council page (hero, council status, future integration, safety unchanged)
- All other AgentOps routes
- Finance and non-AgentOps modules

Lessons learned:

- Presentation-only chat swap works without service/runtime changes when composer stays disabled.
- Memory approval composes inside message `metadata` with parent-controlled intent gating.
- User message alignment differs slightly from old local right-aligned bubbles (shared layout).

Remaining migration risks:

- Double-scroll if nested max-height containers are added carelessly
- Broad AgentOps migration still blocked by `AiXiaLearningCandidateCard` and `AiXiaModuleDashboardShell`
- History timeline migration must preserve existing filter/merge logic in page code

Next phase (recommended):

1. Phase 2B — `/system/agent-ops/history` timeline section proof (`AiXiaAuditTimeline`)

## Phase 2A Visual Correction Update (Council Chat Workbench Pass)

Problem:

- Initial Council proof migration swapped components but did not look meaningfully standardized.

Corrections (shared-first):

- `AiXiaChatThread` gained `variant="workbench"` with viewport + composer dock structure.
- `AiXiaChatMessage` gained user alignment, `badges`, and `footer` composition slots.
- `AiXiaMemoryApprovalPrompt` gained `density="inline"` for compact intent-gated prompts.
- `AiXiaChatComposer` gained disabled glass dock styling.
- Global CSS strengthened chat/workbench, inline memory, embedded section body, secondary disclosure.

Council usage fixes:

- Removed duplicate thread header (section owns title).
- Moved agent badges to message header; memory prompt inline in footer for intent examples only.
- Participants disclosure marked secondary.

Scope lock:

- Still presentation-only; runtime inactive; no service/Supabase changes.
- No Council-specific CSS hacks.

Next phase (recommended):

1. Manual browser confirm Council visual pass, then Phase 2B history timeline proof.

## Phase 2A Global Page Shell Correction (Finance Rhythm Parity)

Problem:

- Council used shared chat components but still looked like a different product than Finance because the **page shell** was wrong (default `AixiaPage` + default `AixiaHero`, local hero classes, hero badge overload, non-command scroll).

Locked standard:

- `AixiaCommandPage` + `AixiaCommandPageLayout` for command hubs and child command pages.
- `AixiaHero surface="command"` with parent pill, max 2 hero badges, actions in `aixia-dash-actions`.
- Scroll body: `aixia-command-scroll`; status/runtime in `AixiaRuntimeStatusStrip--command-meta` or `AixiaFinanceHubMetaStrip`.
- See **Stage 3 Tier 2 Phase 2A shell decision** (historical merged input — active law in owners `03`–`05`, `11`).

Shared additions:

- `AixiaCommandPage`, `AixiaCommandPageLayout`
- CSS: `aixia-runtime-status-strip--command-meta`, `aixia-command-participant-row`
- `FinancePage` now delegates to `AixiaCommandPage` (no finance behavior change)

Proof gate:

- Swapping JSX to shared components is **not** sufficient; pages must pass side-by-side visual rhythm check with `/finance`.
- Phase 2B (History) paused until Council page-shell parity is browser-confirmed.

## Phase 2A Browser Visual Rework (Council vs Finance)

Lesson:

- `AixiaRuntimeStatusStrip` inline mode is **not** a substitute for Finance meta strip on command pages.
- Use `AixiaFinanceHubMetaStrip variant="command"` or `AixiaRuntimeStatusStrip variant="hub-meta"` for status rows (3-column label / value — detail).
- Chat workbench on command pages: `AixiaChatThread` `density="compact"`; avoid large fixed max heights on sparse preview content.
- Command sections: `AixiaSection surface="command"`.

**Evidence:** Wave B historical phase report (Council browser visual rework) — archived group pending Stage 2 approval; command surface per `aixia-global/` owners `03`–`06`.

## Design Authority Consolidation (2026-05-29) — Migrations Paused

Root issue: multiple competing design owners (CSS, shells, hero surfaces, meta strips, shadcn ui, module bridges, docs).

- Page-by-page fixes **stopped** (Council, History, AgentOps patches do not scale).
- Audit: **Stage 3 Tier 1 conflict audit** (historical merged input → `16`)
- Plan: **Stage 3 Tier 1 unified design authority plan** (historical merged input → `00`/`13`)
- Backlog: **Stage 3 Wave A consolidation backlog** (P0–P3 historical planning → `14`/`15`/`16`)
- **Current shell/hero/meta law:** `src/design-system/aixia-global/03`, `04`, `05`, `11` (not Stage 3 Tier 1 shell/hero authority inputs)

Future agents: if source-of-truth conflict exists, fix shared layer first — **do not** patch individual pages.

## P0 Batch 1 (2026-05-29)

- **Finance CSS:** `register-finance-bridge-styles.ts` — import only from `FinancePage`, `AixiaFinanceCommandCreatePage`, `AixiaFinanceCommandDetailPage`; not from `aixia-design-system.css`.
- **Meta strip authority:** Use `AixiaCommandHubMetaStrip` for page meta; `AixiaRuntimeStatusStrip` for runtime diagnostics only (`hub-meta` deprecated for new pages).
- **Docs:** `AIXIA_STANDARD.md` is legacy implementation reference only (Batch 41); shell/hero/meta law is `aixia-global/03`–`05`.
- **Evidence:** Wave B historical P0 batch report — law in `aixia-global/` owners + `14-page-migration-rules.md`, `15-guardrail-rules.md`.

## P0 Batch 2 (2026-05-29)

- **Finance bridge:** `FinanceModuleBridgeLoader` in DashboardLayout for all `/finance` paths.
- **Meta strip:** `AixiaCommandHubMetaStrip.tsx` is canonical; `AixiaFinanceHubMetaStrip` wraps with `variant="finance"`.
- **Scroll:** `layout.css` aliases `aixia-command-page-scroll`, `aixia-finance-page-scroll`, `aixia-finance-scroll`, `aixia-inbox-scroll` to canonical scroll rules.
- **Evidence:** Wave B historical P0 batch report — law in `aixia-global/` + `14`/`15`.

## P0 Batch 3 (2026-05-29)

- **Guardrails:** `aixia-shell-hero-guardrails.mjs` + `aixia-shadcn-boundary-guardrails.mjs` (warn-only, build + QA scan).
- **Hub meta CSS:** grid rules unified in `aixia-design-system.css`; finance-visual keeps cell typography.
- **shadcn:** Finance clean; AgentOps `Progress` warned — see **Stage 3 Wave A shadcn boundary audit** (historical merged input → `07`/`15`).
- **Evidence:** Wave B historical P0 batch report — law in `aixia-global/` + `14`/`15`.

## P0 Batch 4 (2026-05-29)

- **Runtime meta CSS removed:** `.aixia-runtime-status-strip--command-meta` block deleted from design-system; `variant="hub-meta"` delegates only.
- **Hub meta canonical CSS:** `.aixia-command-hub-meta` + `.aixia-finance-hub-meta` share signal-row grid, border, typography in `aixia-design-system.css`.
- **Dead finance BEM removed:** `.aixia-finance-hub-meta__item|__label|__value` (zero TSX usage).
- **New shared component:** `AixiaProgressBar` — use instead of `@/components/ui/progress` in Finance/AgentOps page content.
- **Scroll:** projects/tasks `--new` scroll overrides alias canonical overflow; calendar scroll family deferred.
- **Evidence:** Wave B historical P0 batch report — law in `aixia-global/` + `14`/`15`.

## P0 Batch 5 (2026-05-29)

- **AixiaAsyncState:** drop-in PageLoader replacement (`loading`, `fallback`, `children`); optional title/description/progress when no fallback.
- **PageLoader deferred:** council + history only (allowlisted for shadcn boundary).
- **Guardrails:** shadcn boundary hard error on `src/app/finance/**` + `src/app/system/agent-ops/**`; shell/hero hard error on non-legacy debt files.
- **Plans:** **Stage 3 Wave A finance shell bridge + calendar scroll audits** (historical merged inputs → `11`/`13`/`14`)
- **Evidence:** Wave B historical P0 batch report — law in `aixia-global/` + `14`/`15`.

## P0 Batch 6 (2026-05-29)

- **PageLoader:** zero app usages; allowlist empty; use `AixiaAsyncState` everywhere.
- **Finance proof:** `invoices/[id]` loading/not-found wrapped in `FinancePage` (shell only; happy path unchanged via `AixiaFinanceCommandDetailPage`).
- **Evidence:** Wave B historical P0 batch report — law in `aixia-global/` + `14`/`15`.

## P0 Batch 7 (2026-05-29)

- **Finance proof:** `purchase-orders/[id]` loading/not-found wrapped in `FinancePage` (shell only; happy path unchanged via `AixiaFinanceCommandDetailPage`).
- **Shell debt:** 17 legacy routes remain warn-only in `LEGACY_SHELL_HERO_DEBT_FILES` (purchase-orders removed).
- **Evidence:** Wave B historical P0 batch report — law in `aixia-global/` + `14`/`15`.

## P0 Batch 8 (2026-05-29)

- **Finance proof:** `proforma-invoices/[id]` loading/not-found wrapped in `FinancePage` (shell only; happy path unchanged via `AixiaFinanceCommandDetailPage`).
- **Shell debt:** 16 legacy routes remain warn-only in `LEGACY_SHELL_HERO_DEBT_FILES` (proforma-invoices removed).
- **Evidence:** Wave B historical P0 batch report — law in `aixia-global/` + `14`/`15`.
