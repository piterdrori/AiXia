<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/06-card-section-standard.md, src/design-system/aixia-global/07-button-action-standard.md, src/design-system/aixia-global/08-table-list-standard.md, src/design-system/aixia-global/09-form-input-standard.md, src/design-system/aixia-global/10-modal-drawer-standard.md, src/design-system/aixia-global/12-navigation-workspace-standard.md, src/design-system/aixia-global/13-module-wrapper-rules.md, src/design-system/aixia-global/14-page-migration-rules.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file tracks **component gap debt** for future migration waves. It **must not** override owner files or define visual law.
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
> - [`13-module-wrapper-rules.md`](../../src/design-system/aixia-global/13-module-wrapper-rules.md) — module wrappers
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — page migration
>
> - If this tracker conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AiXia Shared Component Gap List

## Purpose

Track shared component gaps that must be implemented before broad page migrations.

## Priority Legend

- P1: migration blocker (must build before migration wave)
- P2: strongly recommended before module wave
- P3: can be parallelized after foundation blockers

| Component name | Pattern served | Routes/modules needing it | Priority | Dependencies | Required before migration | Logic preservation notes |
|---|---|---|---|---|---|---|
| `AiXiaChatThread` | Chat/Workbench | `/chat/**`, `/system/agent-ops/**`, AI management chat-like surfaces | P1 | shared message row + composer | Yes | UI shell only; keep chat handlers/message models unchanged |
| `AiXiaChatMessage` | Chat/Workbench | same as above | P1 | thread container | Yes | presentation only; do not alter sender/message semantics |
| `AiXiaChatComposer` | Chat/Workbench | same as above | P1 | shared button/form fields | Yes | preserve submit/send/intents exactly |
| `AiXiaMemoryApprovalPrompt` | Knowledge/Learning + Chat | AgentOps issue/agent/council and future memory flows | P1 | chat primitives + status badges | Yes | preserve owner approval gates and memory safety constraints |
| `AiXiaWorkspaceShell` | Detail/Workspace | Projects/tasks/employees/settings and system workspaces | P1 | page shell + hero + section wrappers | Yes | no change to existing workflow actions |
| `AiXiaLearningCandidateCard` | Knowledge/Learning | `/system/agent-ops/knowledge`, `/ai-management/knowledge` | P1 | status/action components | Yes | keep lesson decision behavior unchanged |
| `AiXiaRuntimeStatusStrip` | Advanced/Operator + system status | AgentOps, AI management, future operator pages | P1 | info/status badges | Yes | display only; no runtime activation logic |
| `AiXiaRouteNavigationGrid` | Dashboard/Command Center | Dashboard/core module hubs, AI mgmt hub, system hubs | P2 | navigation/workspace cards | Yes for hub migrations | navigation only; route targets unchanged |
| `AiXiaProgressiveDisclosureGroup` | Advanced/Operator | AI management and advanced technical pages | P2 | section/disclosure wrappers | Yes for advanced pages | collapse behavior only; no control logic changes |
| `AiXiaAuditTimeline` | History/Timeline | AgentOps history, AI activity, future audit surfaces | P2 | timeline rows, date/status chips | Yes for history migrations | no mutation to event data models |
| `AiXiaReportShell` | Report/Export | `/finance/reports/**`, other reporting modules | P2 | table shell, toolbar, export actions | Yes for report wave | keep report query and export behavior unchanged |
| `AiXiaProcessWizardShell` | Process/Wizard | Finance process routes, future staged forms | P2 | process book primitives | Yes for wizard migrations | preserve process step logic and validation |
| `AiXiaSettingsShell` | Settings/Admin | `/settings`, access approvals, admin panels | P2 | section/form/alert components | Yes for settings wave | preserve permissions and save handlers |
| `AiXiaAuthShell` | Auth/Public | login/register/forgot/reset/public auth-like pages | P3 | form and page shell primitives | No (can follow after core blockers) | preserve auth flow and redirects |
| `AiXiaModuleDashboardShell` | Dashboard/Command Center | dashboard + module hub pages | P1 | hero, metrics, navigation grid, meta strip | Yes | preserve module actions and links |

---

## Build Order (Recommended)

1. P1 shells and chat/runtime/learning blockers
2. P2 operator/timeline/report/process/settings foundations
3. P3 auth shell normalization and optional enhancements

## Migration Blockers Summary

Broad migration should not start until at least these blockers are ready:

- `AiXiaModuleDashboardShell`
- `AiXiaWorkspaceShell`
- `AiXiaChatThread`, `AiXiaChatMessage`, `AiXiaChatComposer`
- `AiXiaMemoryApprovalPrompt`
- `AiXiaLearningCandidateCard`
- `AiXiaRuntimeStatusStrip`
