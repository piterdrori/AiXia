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

# AiXia Phase 2A Council Chat Proof Migration Report

## Purpose

First proof-of-pattern page migration: replace local Council chat markup with Phase 1A–1E shared components on `/system/agent-ops/council`, without changing service logic, runtime activation, or Supabase behavior.

## Files Created

- `qa-agent/design-system/AIXIA_PHASE_2A_COUNCIL_CHAT_PROOF_MIGRATION_REPORT.md`

## Files Modified

- `src/app/system/agent-ops/council/page.tsx`
- `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md`

## Page Migrated

- **Route:** `/system/agent-ops/council`
- **Scope:** chat section + participants disclosure only (not whole page)

## Exact Section Migrated

1. **Group chat thread** (`AixiaSection` titled "Group chat thread")
   - Local thread scroll area, message bubbles, composer block
2. **Council participants (compact)** disclosure
   - Native `<details>` replaced with `AiXiaProgressiveDisclosureGroup`

## Sections Intentionally Not Migrated

- Hero, navigation actions, badges
- **Council status** section (still uses `AixiaBadge` row — separate from chat area)
- Future integration readiness `<details>`
- Safety `AixiaInfoBlock` section
- Owner gate / `loadData` / agent roster loading

## Shared Components Used

| Component | Usage |
|---|---|
| `AiXiaChatThread` | Group chat container with title, description, internal scroll, footer composer |
| `AiXiaChatMessage` | Piter placeholders + per-agent planned replies |
| `AiXiaChatComposer` | Disabled footer composer |
| `AiXiaMemoryApprovalPrompt` | Only on memory-intent example agents (index 0 and 2) |
| `AiXiaProgressiveDisclosureGroup` | Participants roster (collapsed by default) |

## Shared Components Not Used (and why)

| Component | Reason |
|---|---|
| `AiXiaRuntimeStatusStrip` | Runtime/status badges live in separate **Council status** section outside the chat area; no local strip existed inside the chat box to replace without expanding scope |

## Local Markup Replaced

- Custom flex-based Piter message bubbles → `AixiaChatMessage` (`senderType="user"`)
- Custom agent reply cards → `AixiaChatMessage` (`senderType="agent"`, `planned`)
- Inline memory Yes/No buttons → `AiXiaMemoryApprovalPrompt` (`disabled`, `status="disabled"`)
- Native disabled `<textarea>` + button row → `AixiaChatComposer` (`disabled`, static `value=""`)
- Native participants `<details>` → `AiXiaProgressiveDisclosureGroup`

## Behavior Preserved

- Group-chat-first layout (no Council Summary, no system next action)
- Agent roster still from `getAgentOpsManagedAgents()` / dashboard status map
- Memory prompt only when `memoryIntentDetected` (agents at index 0 and 2)
- Composer disabled; no `onSubmit` handler; no message sending
- No new stateful chat simulation
- Participants remain collapsed by default (`defaultOpen` not set)
- Existing navigation handlers unchanged

## Runtime Inactive Confirmation

- No local LLM, Hermes, agentmemory, CodeGraph, voice, scheduler, or Cursor paths added
- `AixiaChatComposer` is `disabled` with empty controlled value
- `AixiaMemoryApprovalPrompt` uses `status="disabled"` and `disabled` (no approve/reject handlers)

## Memory Prompt Rule Preserved

- Intent-gated display only: prompt rendered for two example agents only
- Parent still controls visibility via `memoryIntentDetected` flag
- Component does not detect intent or write memory

## Participants Handling

- Migrated to `AiXiaProgressiveDisclosureGroup` with `testId="agentops-council-participants"` preserved
- Participant list content and **Open individual agent** navigation unchanged

## Test IDs

| ID | Location |
|---|---|
| `agentops-council-page` | Unchanged (page root) |
| `agentops-council-chat-thread` | Wrapper around `AiXiaChatThread` |
| `agentops-council-chat-composer` | Wrapper around footer `AixiaChatComposer` |
| `agentops-council-memory-prompt` | Wrapper around intent-gated `AiXiaMemoryApprovalPrompt` |
| `agentops-council-participants` | `AixiaProgressiveDisclosureGroup` `testId` prop |

No Council-specific smoke test added in this phase.

## Visual QA Notes

- Chat uses shared dark-glass thread/message/composer styling from `aixia-design-system.css`
- User messages use shared `--user` modifier (left-aligned avatar layout vs old right-aligned local bubbles — acceptable proof trade-off)
- Planned/pending badges appear on placeholder messages via `planned` prop
- Internal scroll handled by `AixiaChatThread` (`maxHeight="520px"`)

## Validation Results

1. `npm run build` -> **PASS** (pre-existing guardrail warnings; build continued)
2. `npm run qa:validate-foundation` -> **PASS**
3. `npm run qa:static-design-guardrails` -> **PASS**
4. `npm run qa:guardrail-action-plan` -> **PASS**

## Lessons Learned

- Shared chat primitives drop in cleanly when runtime is inactive (presentation-only swap).
- Memory approval composes well inside `AixiaChatMessage` `metadata` without service changes.
- Runtime strip belongs in page status section; defer `AiXiaRuntimeStatusStrip` until a status-section migration wave.
- `testId` on disclosure is ready; chat/timeline components benefit from optional `testId` props in a future polish pass.

## Next Recommended Phase

1. **Phase 2B** — proof migration on `/system/agent-ops/history` timeline list only (`AiXiaAuditTimeline`), preserving filter logic in page code.
2. Optional polish: add `testId` props to `AiXiaChatThread` / `AiXiaChatComposer` in shared layer.
3. Continue P1 gap work (`AiXiaLearningCandidateCard`, `AiXiaModuleDashboardShell`) before broad AgentOps migration.
