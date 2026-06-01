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

# AiXia Phase 2A Council Visual Correction Report

## Problem Found

Phase 2A technically swapped Council markup to shared chat components, but the page still looked similar to the pre-migration local UI. The proof migration did not **visually** demonstrate the unified AiXia design system.

## Why Previous Migration Did Not Visibly Improve Design

1. **Double shell stacking:** `AixiaSection` (glass card + `p-6` padding) wrapped `AixiaChatThread` (second glass card), recreating the old nested `border/bg-black/20` look.
2. **Duplicate headers:** Section title and thread title repeated the same information.
3. **Weak chat workbench rhythm:** Thread body lacked inset viewport, composer dock, and message stack spacing — messages read as flat rows.
4. **User vs agent parity:** Piter messages were left-aligned like agent messages; the old right-aligned user distinction was lost.
5. **Metadata below bubble:** Status badges, focus lines, and memory UI sat under bubbles as a dense card wall.
6. **Memory prompt too large:** Full-card `AiXiaMemoryApprovalPrompt` styling dominated agent rows.
7. **Composer looked plain:** Disabled textarea without a glass composer dock.

## Files Modified

- `src/components/aixia/AixiaChatThread.tsx`
- `src/components/aixia/AixiaChatMessage.tsx`
- `src/components/aixia/AixiaChatComposer.tsx`
- `src/components/aixia/AixiaMemoryApprovalPrompt.tsx`
- `src/components/aixia/index.ts`
- `src/styles/aixia-design-system.css`
- `src/app/system/agent-ops/council/page.tsx`
- `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md`

## Files Created

- `qa-agent/design-system/AIXIA_PHASE_2A_COUNCIL_VISUAL_CORRECTION_REPORT.md`

## Shared Component CSS / Composition Fixes

### `AiXiaChatThread`

- Added `variant="workbench"` with stronger glass shell, inset viewport, message stack wrapper, composer dock footer.
- Structural slots: `__viewport`, `__messages`, `__composer-dock`.

### `AiXiaChatMessage`

- User messages: `aixia-chat-message--align-end` (right-aligned, max-width capped).
- Added `badges` prop (header row) and `footer` prop (compact below-bubble area).
- Improved meta layout (`__meta-primary`, `__meta-trailing`, `__badges`).

### `AiXiaChatComposer`

- Glass composer panel + disabled state class (`aixia-chat-composer--disabled`).

### `AiXiaMemoryApprovalPrompt`

- Added `density` prop (`comfortable` | `compact` | `inline`).
- Inline mode for compact Yes/No under memory-intent messages.
- Fixed `data-memory-approval-disabled` to reflect locked interaction state.

### Global CSS

- Workbench thread viewport/dock styling.
- User/agent bubble distinction and spacing.
- Inline memory approval compact styling.
- Embedded section body padding (`.aixia-section-body--embedded`).
- Secondary progressive disclosure (`.aixia-progressive-disclosure--secondary`).

## Council Page Usage Corrected

- Removed duplicate thread title/description (section owns the heading).
- `variant="workbench"` on chat thread.
- `bodyClassName="aixia-section-body--embedded"` on chat section.
- Agent badges moved to `badges` prop; focus + memory moved to `footer`.
- Memory prompt uses `density="inline"` (intent-gated agents only).
- Participants disclosure uses `aixia-progressive-disclosure--secondary`.

**No Council-specific CSS hacks added** — only shared class names from the design system.

## Before / After Visual Explanation

| Area | Before (Phase 2A initial) | After (visual correction) |
|---|---|---|
| Chat container | Nested generic cards, flat scroll list | Single workbench shell with inset viewport + docked composer |
| Piter messages | Similar to agent rows | Right-aligned cyan user bubbles |
| Agent rows | Badge wall under each bubble | Compact header badges + bubble + small footer |
| Memory prompt | Large nested card on 2 agents | Inline compact Yes/No block |
| Composer | Plain disabled textarea row | Glass composer dock at bottom |
| Participants | Standard disclosure weight | Secondary, visually de-emphasized |

## Memory Prompt Rule Preserved

- Still only on agents at index 0 and 2 (`memoryIntentDetected`).
- Still disabled (`status="disabled"`, no handlers).
- No memory writes, no runtime activation.

## Runtime Inactive Confirmation

- Composer remains disabled with static empty value.
- No send handlers, no service/runtime calls added.

## Validation Results

1. `npm run build` -> **PASS** (pre-existing guardrail warnings; build continued)
2. `npm run qa:validate-foundation` -> **PASS**
3. `npm run qa:static-design-guardrails` -> **PASS**
4. `npm run qa:guardrail-action-plan` -> **PASS**

## Visual QA Checklist

| Check | Result |
|---|---|
| Council chat section visibly changed | **Yes** |
| Chat thread looks like unified AiXia workbench | **Yes** |
| Message bubbles look standardized | **Yes** |
| Composer clearly at bottom | **Yes** |
| Participants are secondary/collapsed | **Yes** |
| No combined Council Summary | **Yes** |
| No system-level next action | **Yes** |
| Memory prompt only for memory-intent example | **Yes** |
| Runtime remains inactive | **Yes** |

## Next Recommended Phase

**Phase 2B** — `/system/agent-ops/history` timeline list proof using `AiXiaAuditTimeline` (after manual browser confirmation of Council visual pass).
