# AgentOps Phase 6B CodeGraph Mock Discovery Report

## Purpose

Add a **safe mock/static CodeGraph discovery adapter** that returns advisory hints from existing issue fields only (route, module, category, severity, title, evidence, root cause, fix strategy). Prepares the future CodeGraph interface without runtime, MCP, filesystem scans, or browser scans.

## Files Created

| File | Role |
|------|------|
| `qa-agent/agentops/AGENTOPS_PHASE_6B_CODEGRAPH_MOCK_DISCOVERY_REPORT.md` | This report |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/agentops/codegraphDiscovery.ts` | `runAgentOpsCodeGraphDiscoveryMock`, flatten/format helpers |
| `src/lib/agentops/types.ts` | Updated `AGENTOPS_CODEGRAPH_DISCOVERY_READINESS` for Phase 6B |
| `src/lib/agentops/index.ts` | Exports mock discovery functions and types |
| `src/app/system/agent-ops/issues/[issueCode]/page.tsx` | Mock discovery UI, copy/append actions |

## Mock Discovery Behavior

### `runAgentOpsCodeGraphDiscoveryMock(input)`

| Field | Value |
|-------|--------|
| `source` | `mock_static_hints` |
| `runtimeCalled` | `false` |
| `mcpCalled` | `false` |
| `browserScanUsed` | `false` |
| `repositoryScanUsed` | `false` |
| `requiresOwnerReview` | `true` |
| `safeToIncludeInPrompt` | `false` on all items |

### Static rule mapping

| Condition | Hints |
|-----------|--------|
| Route contains `/system/agent-ops/issues` | Issue Workspace page, `executionLifecycle.ts`, `service.ts`, `codegraphDiscovery.ts` (medium) |
| Route contains `/system/agent-ops` | Control Center `page.tsx`, `service.ts` (medium) |
| Security/permission signals in text | Route guards / pageAccess (low) |
| Layout/design/table/UI signals | Page first, shared `@/components/aixia`, `aixia-design-system.css` |
| Finance route/module/category | Finance page search, pageAccess (low) |
| No route | Manual inspection fallback only |
| Related/recurrence | Manual — no archive lookup in mock |

Unknown paths use: *"Unknown — CodeGraph runtime not active. Cursor should inspect route/component ownership first."*

## UI Added

**CodeGraph Discovery** panel shows:

- Source: Mock static hints
- Runtime: Not connected · MCP: Not called · Browser/repository scan: No
- Owner review required: Yes
- Advisory suggestion cards: area, path (if any), reason, confidence, safe-to-include flag
- **Copy suggestion** — clipboard per card
- **Add all hints to prompt draft** — appends `CODEGRAPH DISCOVERY HINTS — OWNER REVIEW REQUIRED` block to local draft only

No Run CodeGraph button.

## Prompt Safety

Append uses `formatCodeGraphHintsForPromptDraft()`:

- Prefix: `CODEGRAPH DISCOVERY HINTS — OWNER REVIEW REQUIRED`
- States mock/static, runtime inactive, verify files before edit
- Does **not** auto-approve prompt or prepare execution
- Does **not** trigger Cursor

## What Was Not Implemented

- No CodeGraph runtime
- No MCP call from app
- No browser scan
- No repository scan
- No prompt auto-mutation on load
- No auto Cursor
- No Hermes runtime
- No scheduler
- No schema/RLS/API route
- No production/main

## Validation Results

| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `npm run qa:validate-foundation` | PASS |
| `npm run qa:static-design-guardrails` | PASS |
| `npm run qa:guardrail-action-plan` | PASS |
| `npm run qa:agentops-issue-workspace-smoke` | Not run (optional; recommend in Phase 6C) |

## Next Recommended Phase

**Phase 6C — browser smoke for CodeGraph mock discovery panel**

Suggested owner prompt:

> Implement AgentOps Phase 6C — CodeGraph mock discovery browser smoke. Extend issue workspace smoke to verify CodeGraph Discovery panel shows mock static hints for AIXIA-SAMPLE-001. No CodeGraph runtime.
