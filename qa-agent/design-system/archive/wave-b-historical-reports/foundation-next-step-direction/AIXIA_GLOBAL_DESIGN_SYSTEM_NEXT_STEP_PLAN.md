<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-historical-report-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Historical report only — not current design law**
>
> This qa-agent file is **batch/phase execution evidence or audit history**. It is **not** active AiXia design authority.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this report conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval** (see `16-design-file-cleanup-map.md`).
>
> **Role:** historical report / execution evidence.

# AiXia Global Design System Next Step Plan

## Objective

Use the completed structure inventory and memory foundation to execute a controlled, shared-first, module-based global design system rollout.

## Ordered Next Steps

1. **Build/finish global rulebook**
   - Consolidate current `src/design-system/*` into one execution-grade global rulebook package.
   - Include page patterns, component usage contracts, risk controls, and acceptance criteria.

2. **Build global page patterns**
   - Finalize standard templates for:
     - Dashboard/Command Center
     - Registry/List
     - Detail/Workspace
     - Create/Edit
     - Chat/Workbench
     - Knowledge/Learning
     - Advanced/Operator
     - History/Timeline
     - Settings/Admin
     - Auth/Public

3. **Build AI/Cursor page-building rules**
   - Define strict route-level implementation rules for AI agents:
     - shared-first
     - no logic mutation in design-only phases
     - evidence/reporting requirements
     - memory update requirement per phase

4. **Build migration plan**
   - Sequence by module, not by random pages.
   - Start with highest-risk/high-impact route groups.
   - Include rollback and visual verification checkpoints.

5. **Build shared component gap list**
   - Convert component-memory gap items into implementation backlog.
   - Tag dependencies per module and per page pattern.

6. **Build missing shared components first**
   - Implement shared gaps before touching consuming pages.
   - Reject page-local substitutes for repeatable patterns.

7. **Migrate pages by module**
   - Module waves (example): core modules -> AI management -> remaining finance edges -> system/admin tails.
   - Keep route families coherent per migration batch.

8. **Add visual QA**
   - Include desktop/laptop/mobile checks and anti-regression screenshots.
   - Validate no horizontal scroll leakage and layout rhythm consistency.

9. **Update memory files each step**
   - Every phase must update at least one file in `qa-agent/design-system/memory/`.
   - Track new rules, pattern decisions, and unresolved risks.

## Gate Before Any Page Rewrite

Do not start broad page rewrite/migration until:

1. Website structure inventory is complete.
2. Memory files are created and acknowledged.
3. Global design-system foundation/rulebook is approved.
