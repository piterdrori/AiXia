<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/03-page-shell-standard.md, src/design-system/aixia-global/04-hero-header-standard.md, src/design-system/aixia-global/05-meta-status-strip-standard.md, src/design-system/aixia-global/06-card-section-standard.md, src/design-system/aixia-global/08-table-list-standard.md, src/design-system/aixia-global/11-scroll-responsive-standard.md, src/design-system/aixia-global/15-guardrail-rules.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent checklist has been merged into:
>
> - [`03-page-shell-standard.md`](../../src/design-system/aixia-global/03-page-shell-standard.md) — page shell
> - [`04-hero-header-standard.md`](../../src/design-system/aixia-global/04-hero-header-standard.md) — hero / header
> - [`05-meta-status-strip-standard.md`](../../src/design-system/aixia-global/05-meta-status-strip-standard.md) — meta / status strips
> - [`06-card-section-standard.md`](../../src/design-system/aixia-global/06-card-section-standard.md) — cards / sections
> - [`08-table-list-standard.md`](../../src/design-system/aixia-global/08-table-list-standard.md) — tables / lists
> - [`11-scroll-responsive-standard.md`](../../src/design-system/aixia-global/11-scroll-responsive-standard.md) — scroll / responsive
> - [`15-guardrail-rules.md`](../../src/design-system/aixia-global/15-guardrail-rules.md) — guardrail / QA expectations
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# AiXia Global Visual QA Checklist

## Purpose

Provide a consistent visual verification checklist for all design-system migration waves.

## Core Consistency Checks

- [ ] Hero/header structure is consistent with approved pattern
- [ ] Parent/back pill label style and placement are consistent
- [ ] KPI/status card rhythm is consistent with shared baseline
- [ ] Section spacing rhythm matches shared tokens
- [ ] Button variant meaning is correct (`primary`, `secondary`, `danger`)
- [ ] Badge/status semantics are consistent across equivalent states
- [ ] Table/list alignment is consistent (header, row, action cell)
- [ ] Internal scroll is used intentionally (table/panel), not random wrappers
- [ ] No page-level horizontal scroll leaks
- [ ] Chat/workbench layout follows shared structure (thread/composer/actions)
- [ ] Advanced/technical sections use progressive disclosure (not dense default walls)
- [ ] No random page-local visual style systems for repeated patterns
- [ ] No oversized technical walls in default module landing surfaces

## Responsive Checks (Required)

- [ ] Large desktop (wide)
- [ ] 14-inch laptop class
- [ ] Tablet class
- [ ] Mobile class

For each responsive class confirm:

- [ ] no clipped actions
- [ ] no overlap between fixed controls and main content
- [ ] readable hierarchy and spacing
- [ ] intended wrapping behavior for toolbars/cards/tables

## State Checks

- [ ] Loading state uses shared state components
- [ ] Empty state uses shared empty-state pattern
- [ ] Error/blocked state uses shared alert/state pattern
- [ ] Permission/access-denied state is visually consistent

## Pattern-Specific Checks

### Registry/List

- [ ] shared toolbar pattern
- [ ] shared table shell/cells/actions
- [ ] archive flow entry is consistent

### Detail/Workspace

- [ ] summary/context sections follow shared blocks
- [ ] action areas are grouped and clear

### Create/Edit

- [ ] shared form controls and action footer
- [ ] validation feedback is consistent

### Process/Wizard

- [ ] stage intro + stage body + footer progression is clear
- [ ] stage controls remain reachable on small screens

### Report/Export

- [ ] report controls and output shell are consistent
- [ ] export actions are discoverable and non-overlapping

## Release Gate

A migration batch is not visually approved until:

1. all checklist items pass for targeted routes
2. responsive checks pass for all required viewport classes
3. no repeated local visual systems were introduced
