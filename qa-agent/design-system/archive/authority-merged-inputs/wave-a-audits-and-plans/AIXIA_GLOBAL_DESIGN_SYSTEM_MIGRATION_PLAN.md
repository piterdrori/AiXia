<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/14-page-migration-rules.md, src/design-system/aixia-global/16-design-file-cleanup-map.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent migration plan has been merged into:
>
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — page migration rules
> - [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md) — cleanup disposition
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# AiXia Global Design-System Migration Plan

## Purpose

Define the ordered migration contract from inventory -> shared-component completion -> module migration waves, while protecting business logic and backend behavior.

## Global Non-Change Contract (Applies to All Waves)

- Do not change service/business logic.
- Do not change Supabase queries, RLS, schema, or migrations.
- Do not change permissions/validation/handlers.
- Do not activate Hermes runtime, CodeGraph runtime, local LLM, agentmemory runtime, scheduler, or auto Cursor execution.
- Do not touch production/main systems.

## Standard Validation Commands per Wave

- Documentation-only wave: `npm run qa:validate-foundation`
- App-source design wave:
  - `npm run build`
  - `npm run qa:validate-foundation`
  - `npm run qa:static-design-guardrails`
  - `npm run qa:guardrail-action-plan`

## Memory Rule per Wave

Each wave must update at least one file in `qa-agent/design-system/memory/`.

---

## Step 1 — Lock Rulebook and Page Patterns

- **Scope:** governance docs only
- **Routes/pages:** none
- **Shared components needed first:** none
- **Must not change:** app source/business logic/data contracts
- **Validation:** `npm run qa:validate-foundation`
- **Memory update:** required
- **Exit criteria:** rulebook + page patterns + AI rules approved

## Step 2 — Build Missing Shared Components

- **Scope:** shared component implementation wave
- **Routes/pages:** no direct migration yet; shared layer only
- **Shared components needed first:** from gap list priorities P1 -> P2 -> P3
- **Must not change:** service/data/routing semantics
- **Validation:** full app-source design validation commands
- **Memory update:** required (component progress + blockers)
- **Exit criteria:** P1 blockers implemented and documented

## Step 3 — Migrate Highest-Risk Shared Shells First

- **Scope:** shell-level alignment where drift risk is highest
- **Routes/pages:** cross-module shell owners (command/detail/list shells)
- **Shared components needed first:** module dashboard shell, workspace shell, settings shell
- **Must not change:** module actions, handlers, query shape
- **Validation:** full app-source design validation commands + visual QA checklist
- **Memory update:** required
- **Exit criteria:** shell parity achieved across targeted high-risk routes

## Step 4 — Migrate AgentOps Pages to Shared Patterns

- **Scope:** `/system/agent-ops/**`
- **Routes/pages:** control center, issues, issue workspace, agents, council, advanced, knowledge, automation, history
- **Shared components needed first:** runtime status strip, chat thread/composer, learning candidate card, audit timeline
- **Must not change:** owner-gating, manual-first behavior, lifecycle actions
- **Validation:** full app-source design validation + AgentOps smoke checks
- **Memory update:** required
- **Exit criteria:** AgentOps visual parity with global patterns, no logic regression

## Step 5 — Migrate AI Management Technical-Wall Pages

- **Scope:** `/ai-management/**`
- **Routes/pages:** ai management hub + subroutes
- **Shared components needed first:** module dashboard shell, progressive disclosure group, report/audit shell
- **Must not change:** existing AI management action semantics and guards
- **Validation:** full app-source design validation commands
- **Memory update:** required
- **Exit criteria:** reduced technical-wall density, consistent page rhythm

## Step 6 — Migrate Calendar High-Risk Pages

- **Scope:** `/calendar/**`
- **Routes/pages:** calendar list/day/new/edit
- **Shared components needed first:** process/workspace shell alignment and responsive grid helpers
- **Must not change:** calendar behavior and data flows
- **Validation:** full app-source design validation + targeted responsive checks
- **Memory update:** required
- **Exit criteria:** spacing/overflow/rhythm stabilized across viewport classes

## Step 7 — Migrate Core Non-Finance Modules

- **Scope:** dashboard/projects/tasks/employees/inbox-mail/chat/settings
- **Routes/pages:** core operational routes outside finance and agentops
- **Shared components needed first:** route navigation grid, workspace shell, chat primitives, settings shell
- **Must not change:** module business behavior and permissions
- **Validation:** full app-source design validation commands
- **Memory update:** required
- **Exit criteria:** consistent cross-module command/list/detail/create patterns

## Step 8 — Migrate Remaining Finance Edge/Legacy Pages

- **Scope:** unresolved finance edge routes and partial legacy surfaces
- **Routes/pages:** finance outliers from inventory/risk logs
- **Shared components needed first:** report shell, process wizard shell, timeline/audit components
- **Must not change:** finance data/workflow correctness
- **Validation:** full app-source design validation + finance visual QA
- **Memory update:** required
- **Exit criteria:** finance route family visually consistent; legacy visual forks removed

## Step 9 — Review Legacy Alias/Redirect Layer

- **Scope:** finance and other alias routes
- **Routes/pages:** legacy redirect paths in `App.tsx`
- **Shared components needed first:** none (routing governance work)
- **Must not change:** canonical destination behavior
- **Validation:** route sanity checks + build
- **Memory update:** required
- **Exit criteria:** alias inventory categorized (keep/deprecate/remove) with rollback notes

## Step 10 — Add Browser Visual QA

- **Scope:** cross-module visual regression governance
- **Routes/pages:** representative route matrix by module and page pattern
- **Shared components needed first:** visual QA checklist and screenshot protocol
- **Must not change:** app behavior
- **Validation:** visual QA execution + baseline updates
- **Memory update:** required
- **Exit criteria:** stable visual baselines and acceptance criteria recorded

## Step 11 — Add Future AI/Agent Enforcement Checks

- **Scope:** process enforcement
- **Routes/pages:** all future AI-driven UI changes
- **Shared components needed first:** rule references and reporting templates
- **Must not change:** logic/data contracts
- **Validation:** documentation validation + CI/workflow integration checks
- **Memory update:** required
- **Exit criteria:** AI agents consistently follow shared-first and no-local-design contracts

---

## Rollback Notes Template (Per Wave)

Each implementation wave must include:

1. routes touched
2. shared components touched
3. pre-wave screenshots/notes
4. rollback commit/grouping strategy
5. known incompatibility risks
