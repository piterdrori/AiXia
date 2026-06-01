<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md through 16-design-file-cleanup-map.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent rulebook has been merged into `src/design-system/aixia-global/` owner files **`00`–`16`**. Read active law there — not this file.
>
> - [`00-README-SOURCE-OF-TRUTH.md`](../../src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md) — authority root and reading order
> - [`01-design-tokens.md`](../../src/design-system/aixia-global/01-design-tokens.md) through [`15-guardrail-rules.md`](../../src/design-system/aixia-global/15-guardrail-rules.md) — aspect owners
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

# AiXia Global Unified Design-System Rulebook

## Purpose

Define the single global design-system foundation and migration contract for all AiXia modules, routes, and future AI-assisted page work.

## Scope Baseline

- 170 registered route paths
- 18 module/domain groups
- 146 discovered `src/app/**/page.tsx`
- Risk hotspots: Calendar, AI Management, mixed legacy/canonical Finance routes, core non-Finance modules with uneven shared-system adoption

---

## 1) Source-of-Truth Rule

Global visual source of truth is locked to:

1. `src/components/aixia/*`
2. `src/styles/aixia-design-system.css` (plus shared AiXia style imports)
3. `src/design-system/*` governance docs
4. `qa-agent/design-system/memory/*` project memory and decisions

If a visual behavior is repeatable, it must be owned in shared components/CSS, not page-local markup.

---

## 2) No-Local-Design Rule

Pages must not create local repeated visual systems. Forbidden for repeated use cases:

- local hero/header systems
- local card systems
- local table systems
- local chat/workbench systems
- local badge/button variant systems
- local spacing/radius/typography rhythms
- page-specific visual hacks that duplicate shared behavior

Allowed only for truly unique one-off UI after explicit approval and documentation.

---

## 3) Shared-First Rule

When a page needs a visual pattern:

1. use an existing shared AiXia component first
2. if missing, design/implement the pattern as a shared component first
3. then consume the shared component in pages

Never invert this order for repeatable patterns.

---

## 4) Business-Logic Protection Rule

During design-only work:

- do not change service functions
- do not change Supabase queries
- do not change RLS/schema/migrations
- do not change routing behavior unless explicitly requested as a navigation task
- do not change permissions, validation, handlers, or workflow semantics
- preserve all existing actions and operational flows

Design refactors must be presentation-structure only.

---

## 5) Finance Baseline Rule

Approved Finance visual rhythm is the baseline for global standardization:

- dark glass enterprise shell
- consistent hero rhythm
- compact KPI/status card language
- consistent registry/list structure
- consistent detail/workspace structure
- consistent create/edit structure
- table scroll discipline (internal table/list wrappers only)
- action semantics discipline (primary/secondary/danger)

This baseline must be generalized, not forked into module-specific visual systems.

---

## 6) Global Module Coverage Rule

This rulebook applies to all current and future modules:

- Auth/Public
- Dashboard/Core
- Projects
- Tasks
- Calendar
- Chat/Comms
- Inbox/Mail
- Employees/People
- Settings
- AI Management
- System/AgentOps
- Finance Hub
- Finance Master Data
- Finance Transactions
- Finance Reports
- Finance Access Approvals
- Legacy Alias/Redirect layer
- Future modules

No module is exempt from shared-system governance.

---

## 7) Memory Update Rule

Every future design-system phase must update at least one file in:

- `qa-agent/design-system/memory/`

Minimum memory update payload:

1. decisions made
2. shared patterns used or introduced
3. unresolved gaps
4. risk notes and next step

---

## 8) AI/Agent Enforcement Contract

This rulebook is binding for Cursor/Hermes/CodeGraph-assisted UI work:

- use shared components first
- never introduce repeated local visual systems
- protect business logic/data/permissions
- document evidence and memory updates per phase

Any output violating these rules is non-compliant.

---

## 9) What This Rulebook Does Not Do

- does not migrate pages
- does not build missing components (that is a subsequent implementation phase)
- does not rewrite app modules immediately
- does not alter runtime or backend behavior

This document defines the foundation contract and governance only.
