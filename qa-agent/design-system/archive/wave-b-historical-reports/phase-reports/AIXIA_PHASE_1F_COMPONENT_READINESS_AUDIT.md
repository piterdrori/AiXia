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

# AiXia Phase 1F Shared Component Readiness Audit

## Purpose

Audit Phase 1A–1E shared components before any proof-of-pattern page migration. Confirm export compile safety, prop/CSS consistency, runtime safety, and composition readiness.

## Audit Date Context

- Components audited: 8 (Phase 1A–1E wave)
- Pages migrated during audit: **none**
- Production/main touched: **no**

## Components Audited

| Component | Phase | File |
|---|---|---|
| `AiXiaWorkspaceShell` | 1A | `src/components/aixia/AixiaWorkspaceShell.tsx` |
| `AiXiaRuntimeStatusStrip` | 1A | `src/components/aixia/AixiaRuntimeStatusStrip.tsx` |
| `AiXiaChatThread` | 1B | `src/components/aixia/AixiaChatThread.tsx` |
| `AiXiaChatMessage` | 1B | `src/components/aixia/AixiaChatMessage.tsx` |
| `AiXiaChatComposer` | 1B | `src/components/aixia/AixiaChatComposer.tsx` |
| `AiXiaMemoryApprovalPrompt` | 1C | `src/components/aixia/AixiaMemoryApprovalPrompt.tsx` |
| `AiXiaProgressiveDisclosureGroup` | 1D | `src/components/aixia/AixiaProgressiveDisclosureGroup.tsx` |
| `AiXiaAuditTimeline` | 1E | `src/components/aixia/AixiaAuditTimeline.tsx` |

---

## 1) Export Readiness

### Index exports (`src/components/aixia/index.ts`)

| Component | Exported | Types exported |
|---|---|---|
| `AiXiaWorkspaceShell` | Yes | `AixiaWorkspaceShellProps`, `AixiaWorkspaceShellVariant`, `AixiaWorkspaceShellDensity` |
| `AiXiaRuntimeStatusStrip` | Yes | `AixiaRuntimeStatusStripProps`, `AixiaRuntimeStatusItem`, `AixiaRuntimeStatusTone` |
| `AiXiaChatThread` | Yes | `AixiaChatThreadProps` |
| `AiXiaChatMessage` | Yes | `AixiaChatMessageProps`, `AixiaChatMessageSenderType` |
| `AiXiaChatComposer` | Yes | `AixiaChatComposerProps`, `AixiaChatComposerPreset` |
| `AiXiaMemoryApprovalPrompt` | Yes | `AixiaMemoryApprovalPromptProps`, `AixiaMemoryApprovalStatus`, `AixiaMemoryApprovalScope` |
| `AiXiaProgressiveDisclosureGroup` | Yes | `AixiaProgressiveDisclosureGroupProps`, tone/density types |
| `AiXiaAuditTimeline` | Yes | `AixiaAuditTimelineProps`, `AixiaAuditTimelineItem`, `AixiaAuditTimelineTone` |

### Import compile check

- `src/components/aixia/index.ts` TypeScript pre-emit diagnostics: **PASS (no errors)**
- Full app build (`npm run build`): **PASS** (see validation section)
- Current app usage of new components: **none yet** (expected; migration not started)

**Verdict:** Export readiness **PASS**.

---

## 2) Props Consistency

### Cross-component conventions

| Convention | Status | Notes |
|---|---|---|
| `className` support | Pass | All 8 components support `className` |
| Optional header `title` / `description` | Pass | Thread, timeline, runtime strip, workspace shell slots |
| `actions` slot (header-level) | Pass | Thread + timeline; strip uses label/description only |
| Loading state | Pass | `AiXiaChatThread`, `AiXiaAuditTimeline` |
| Empty state | Pass | `AiXiaChatThread`, `AiXiaAuditTimeline` |
| `compact` mode | Pass | Runtime strip, chat message, audit timeline, disclosure density |
| `maxHeight` internal scroll | Pass | Chat thread (default `560px`), audit timeline (optional) |
| Parent-owned callbacks only | Pass | Composer `onChange`/`onSubmit`; memory prompt `onApprove`/`onReject` |
| No required domain models | Pass | Plain strings/ReactNode props only |

### testId / data-testid support

| Component | testId prop | data-* attributes |
|---|---|---|
| `AiXiaProgressiveDisclosureGroup` | Yes (`testId` -> `data-testid`) | `data-disclosure-tone`, `data-disclosure-density` |
| `AiXiaWorkspaceShell` | No | `data-workspace-shell-variant`, `data-workspace-shell-density` |
| `AiXiaRuntimeStatusStrip` | No | `data-runtime-strip-mode`, `data-runtime-strip-compact` |
| `AiXiaMemoryApprovalPrompt` | No | `data-memory-approval-status`, `data-memory-approval-disabled` |
| Chat primitives / audit timeline | No | Sender type via CSS modifier classes |

**Gap (non-blocking):** `testId` is only standardized on disclosure. Other components can use wrapper `data-testid` during first migration.

### Hardcoded / module-specific copy

| Component | Finding | Severity |
|---|---|---|
| `AiXiaMemoryApprovalPrompt` | Default `helperText`: `"Memory updates require Piter approval."` | Low — override via prop on non-AgentOps pages |
| `AiXiaMemoryApprovalPrompt` | Fixed question copy in component body | Low — acceptable for AgentOps-first proof; consider prop later |
| `AiXiaRuntimeStatusStrip` | Default label `"Runtime status"` | Low — generic, overridable |
| Others | No AgentOps/Finance-only required props | Pass |

**Verdict:** Props consistency **PASS with minor polish gaps** (testId parity, memory prompt default copy).

---

## 3) CSS Consistency

### Global class families present (`src/styles/aixia-design-system.css`)

| Family | Present | Dark glass style | Responsive rules |
|---|---|---|---|
| `.aixia-workspace-shell*` | Yes | Yes | Variant/density modifiers |
| `.aixia-runtime-status-strip*` | Yes | Yes | Stacked mode mobile wrap |
| `.aixia-chat-thread*` / message / composer | Yes | Yes | `@media (max-width: 820px)` |
| `.aixia-memory-approval*` | Yes | Yes | Header stack on narrow screens |
| `.aixia-progressive-disclosure*` | Yes | Yes | Summary/header wrap |
| `.aixia-audit-timeline*` | Yes | Yes | Header stack + compact mode |

### Scroll discipline

- Chat thread body: `overflow-y: auto; overflow-x: hidden`
- Audit timeline body: `overflow-y: auto; overflow-x: hidden`
- Workspace shell: uses `AixiaPage` command scroll (`aixia-workspace-shell-scroll`)
- No new page-local CSS introduced in Phase 1A–1E components

### Style alignment

- Uses shared gradients, borders, and typography rhythm consistent with Phase 1B–1D chat/disclosure families
- Reuses existing primitives (`AixiaHistoryRow`, `AixiaSignalRow`, `AixiaBadge`) without duplicating row CSS

**Verdict:** CSS consistency **PASS**.

---

## 4) Runtime Safety

Static scan of all 8 component files for: `supabase`, router hooks, `fetch`, AgentOps service imports, Hermes/CodeGraph/local LLM/agentmemory/Cursor activation.

**Result:** No matches.

### Behavior classification

| Component | Data fetching | Side effects | Notes |
|---|---|---|---|
| All 8 | None | None inside components | Display/layout only |
| `AiXiaChatComposer` | None | Form `preventDefault` + parent `onSubmit` | Controlled input only |
| `AiXiaMemoryApprovalPrompt` | None | Parent callbacks on button click | Does not write memory |

**Verdict:** Runtime safety **PASS**.

---

## 5) Composition Readiness

### Approved composition patterns

| Composition | Ready | How |
|---|---|---|
| `AiXiaWorkspaceShell` + `AiXiaRuntimeStatusStrip` | Yes | Pass strip into `statusStrip` slot |
| `AiXiaWorkspaceShell` + `AiXiaAuditTimeline` | Yes | Pass timeline into `timeline` slot or primary `children` |
| `AiXiaChatThread` + `AiXiaChatMessage` + `AiXiaChatComposer` | Yes | Messages as thread `children`; composer in `footer` |
| `AiXiaChatMessage` + `AiXiaMemoryApprovalPrompt` | Yes | Render prompt in message `metadata` or bubble `children` |
| `AiXiaProgressiveDisclosureGroup` + tables/cards/timeline | Yes | Any ReactNode `children` (e.g. `AixiaTableShell`, `AixiaAuditTimeline`) |

### Composition cautions (non-blocking)

1. **Double scroll:** Avoid nesting `maxHeight` thread/timeline inside another tight scroll container without testing.
2. **Workspace shell + full page hero:** Shell expects `hero` slot; pages already using standalone `AixiaHero` should map hero into slot during migration.
3. **Chat thread empty detection:** Empty state triggers when `children` is falsy; use explicit message list or `isLoading` (not empty fragment).

**Verdict:** Composition readiness **PASS**.

---

## 6) Migration Readiness — Proof Page Recommendation

### Candidate comparison

| Route | Pattern fit | Logic risk | Why |
|---|---|---|---|
| `/system/agent-ops/council` | Chat + memory + disclosure | **Low** | Shell UI; runtime inactive; send disabled; local chat markup maps 1:1 to shared chat primitives |
| `/system/agent-ops/history` | Timeline + disclosure | Medium | Real merged timeline data + filters; table sections; higher regression risk |
| `/system/agent-ops/agents/[agentId]` | Chat + workspace | Medium | Single-agent chat + more page sections |
| `/system/agent-ops/knowledge` | Learning cards | Higher | Lesson decision handlers + queue logic |

### First proof-of-pattern page (recommended)

**`/system/agent-ops/council`**

Reasons:

1. Exercises the largest Phase 1B/1C set in one contained section (thread, messages, composer, memory approval).
2. Can replace page-local chat markup without changing AgentOps service calls (page already loads agents only).
3. Runtime/send paths are disabled — migration is presentation-only with low backend risk.
4. Existing `data-testid="agentops-council-page"` supports smoke extension after migration.
5. Native `<details>` blocks map cleanly to `AiXiaProgressiveDisclosureGroup` in a second micro-step.

**Do not migrate yet** — proof migration is Phase 2G (next).

### Secondary proof (after council)

`/system/agent-ops/history` — timeline list section only, mapping `HistoryTimelineItem` -> `AixiaAuditTimelineItem` while preserving filter logic in page code.

---

## 7) Remaining Shared Component Gaps

### Still missing before broad migration (from gap list + audit)

| Component | Priority | Blocks |
|---|---|---|
| `AiXiaLearningCandidateCard` | P1 | Knowledge/lesson review migrations |
| `AiXiaModuleDashboardShell` | P1 | Dashboard/hub parity outside Finance |
| `AiXiaReportShell` | P2 | Finance reports wave |
| `AiXiaProcessWizardShell` | P2 | Process/wizard routes |
| `AiXiaSettingsShell` | P2 | Settings/admin wave |
| `AiXiaAuthShell` | P3 | Auth/public normalization |

### Phase 1A–1E component readiness summary

| Component | Ready for proof migration | Small fixes recommended |
|---|---|---|
| `AiXiaWorkspaceShell` | Yes (shell proof after chat) | Add optional `testId` later |
| `AiXiaRuntimeStatusStrip` | Yes | None required |
| `AiXiaChatThread` | Yes | None required |
| `AiXiaChatMessage` | Yes | None required |
| `AiXiaChatComposer` | Yes | None required |
| `AiXiaMemoryApprovalPrompt` | Yes | Override default helper on non-AgentOps pages; optional `testId` |
| `AiXiaProgressiveDisclosureGroup` | Yes | None required |
| `AiXiaAuditTimeline` | Yes | Optional `testId` for history smoke |

---

## Issues Found

| ID | Severity | Issue | Action |
|---|---|---|---|
| F1-01 | Low | `testId` only on disclosure component | Defer to post-proof hardening |
| F1-02 | Low | Memory prompt default helper mentions Piter | Override via prop during migration |
| F1-03 | Low | `data-memory-approval-disabled` reflects `disabled` prop only, not locked statuses | Document for tests; optional one-line fix later |
| F1-04 | Info | No page currently imports new components | Expected pre-migration |

**No compile/export/type/CSS blockers found.**

## Fixes Made During Audit

- **None** (audit/documentation only; no blocker requiring code change)

---

## Overall Readiness Verdict

**READY for proof-of-pattern migration** with recommended first page `/system/agent-ops/council`, scoped to chat/disclosure presentation only.

Broad module migration remains blocked by missing P1 shells/cards (`AiXiaLearningCandidateCard`, `AiXiaModuleDashboardShell`).
