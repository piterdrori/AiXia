# Hermes Fallback Policy (AgentOps)

**Status:** Design-only (Phase 5A). Defines when Issue Workspace uses mock responses instead of Hermes.

## Default Mode

**Current and default:** `mock_status_based` via `generateAgentOpsMockResponse` in `src/lib/agentops/agentResponseMock.ts`.

Hermes adapter is **opt-in for future phases** only after readiness checklist and explicit owner approval of runtime integration.

## Fallback Triggers

Use mock layer when **any** condition is true:

| # | Condition | Behavior |
| --- | --- | --- |
| 1 | Hermes unavailable (connection fail, timeout, 5xx) | Mock response |
| 2 | Hermes not app-callable (`appCallable: false`) | Mock response (current default) |
| 3 | Unsafe output detected (forbidden action, secrets, production refs) | Block Hermes output → mock |
| 4 | Low confidence (`confidence: low`) | Mock response + owner review banner |
| 5 | Missing prompt style compliance | Reject Hermes prompt suggestions → mock or empty suggestions |
| 6 | `shouldFallbackToMock: true` on Hermes response | Mock response |
| 7 | Owner has not approved Hermes runtime (checklist incomplete) | Mock response only |
| 8 | Request mode is disallowed | Do not call Hermes; mock or error |

## Fallback Flow

```
Owner asks agent (Issue Workspace)
  → Build HermesAdapterRequest from issue data
  → if (!hermesReady || !appCallable) → generateAgentOpsMockResponse
  → else try future HermesAdapterClient.invoke(request)
       → if failure OR shouldFallbackToMock OR safety violation
            → generateAgentOpsMockResponse(mappedIntent)
       → else normalize to AgentOpsAgentMockResponse shape
  → record messages via recordAgentOpsIssueAgentMessage
  → UI labels response source: mock | hermes_advisory
```

## Mock Mapping

| Hermes mode | Mock intent |
| --- | --- |
| `issue_clarification` | `clarification` |
| `prompt_refinement` | `prompt_improvement` |
| `risk_review` | `risk_review` |
| `next_step_recommendation` | `next_step` |
| `cursor_report_synthesis` | `clarification` (interim) |
| `archive_lesson_extraction` | `next_step` (interim) |

Phase 5B may add dedicated mock handlers for synthesis/archive modes.

## Prompt Style Fallback

If Hermes `promptSuggestions` do not preserve required sections (TASK, PURPOSE, … FINAL CHECK):

1. **Reject** Hermes prompt block
2. Use mock `prompt_improvement` suggestions OR
3. Return empty `promptSuggestions` with limitation note: *"Hermes output did not meet prompt style standard — use mock suggestions or edit manually."*

Never auto-merge non-compliant Hermes prompt text into approved prompt.

## Forbidden Action Handling

If Hermes suggests forbidden actions (auto Cursor, schema change, closure, shell, etc.):

1. **Block** display of that portion
2. Set safety flags: `forbidden_action_blocked`
3. Fall back to mock response
4. Log in owner feedback metadata (future)

## UI Labeling

| Source | Owner-visible label |
| --- | --- |
| Mock | Mock response only — Hermes not active |
| Hermes advisory (future) | Hermes advisory — owner approval required |
| Fallback after Hermes attempt | Hermes unavailable — mock fallback used |

Phase 5A UI shows mock label + contract prepared indicator only.

## Persistence

Fallback does not skip persistence — both Piter question and mock (or future Hermes) response are stored via existing `issue_agent_message` owner feedback metadata.

## No Degradation of Safety

Fallback to mock must **never**:

- Auto-approve prompts
- Trigger Cursor
- Skip owner review
- Hide that fallback occurred (when Hermes was attempted in future phases)
