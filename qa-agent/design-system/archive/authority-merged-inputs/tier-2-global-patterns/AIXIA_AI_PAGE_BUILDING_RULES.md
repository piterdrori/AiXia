<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md, src/design-system/aixia-global/13-module-wrapper-rules.md, src/design-system/aixia-global/14-page-migration-rules.md, src/design-system/aixia-global/15-guardrail-rules.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged into:
>
> - [`00-README-SOURCE-OF-TRUTH.md`](../../src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md) — authority root
> - [`13-module-wrapper-rules.md`](../../src/design-system/aixia-global/13-module-wrapper-rules.md) — module wrappers / no local design law
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — page migration gates
> - [`15-guardrail-rules.md`](../../src/design-system/aixia-global/15-guardrail-rules.md) — guardrail rules
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# AiXia AI / Cursor Page-Building Rules

## Purpose

Provide mandatory execution rules for AI agents performing any page design work in AiXia.

## 1) Mandatory Read-First Sequence (Before Editing Any Page)

1. `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md`
2. Relevant owner file(s) `01`–`16` for the task aspect (see `00` §0.2)
3. `qa-agent/design-system/memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md`
4. Relevant shared components in `src/components/aixia/*`
5. Target page file in `src/app/**`

**Historical note:** Items 1–2 replaced deprecated qa-agent rulebook/page-patterns citations (Batch 48). Do not use `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md` or `AIXIA_GLOBAL_PAGE_PATTERNS.md` as current law.

No editing before this read sequence is complete.

## 2) Shared Components First

- Always implement using existing shared components first.
- Do not introduce repeated local UI systems.

## 3) No Page-Local Repeated Patterns

Forbidden for repeatable patterns:

- local hero systems
- local card/tile systems
- local table/list shells
- local chat/workbench systems
- local badge/button style variants
- local spacing/typography/radius systems

## 4) Missing Pattern Procedure

If a required pattern is missing:

1. document the gap in design-system docs/memory
2. build/extend shared component first
3. update memory file(s)
4. migrate page(s) to use that shared component

Never skip directly to page-local implementation for repeated behavior.

## 5) Business Logic Preservation

During design-only tasks:

- do not modify service/business logic
- do not alter workflow semantics
- do not remove actions/handlers

## 6) Data / Routing / Security Preservation

- preserve Supabase queries and API contracts
- preserve routing contracts unless explicitly requested
- preserve permissions and validation behavior
- preserve handlers and action outcomes

## 7) Existing Actions Preservation

Every existing visible action (buttons/menu actions/workflow actions) must remain functionally equivalent unless explicit change request exists.

## 8) Required Output Report Format

Every AI design change report must include:

1. files modified
2. shared components used
3. shared component gaps found
4. memory files updated
5. validation commands run
6. remaining risks/blockers

## 9) Broad Migration Preconditions

No broad page migration without all of:

1. route inventory reference
2. module wave plan
3. screenshot/manual QA plan
4. rollback notes

## 10) Enforcement Rules

- No runtime activation during design-only work (Hermes, CodeGraph runtime, local LLM, agentmemory runtime).
- No scheduler/auto Cursor execution activation.
- No production/main changes in this stream.
