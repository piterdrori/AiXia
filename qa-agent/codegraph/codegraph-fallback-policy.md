# CodeGraph Fallback Policy (AgentOps)

When CodeGraph discovery is unavailable, low confidence, or unsafe, AgentOps must degrade gracefully to **manual inspection** — never silent failure or empty prompts.

---

## Fallback triggers

| Condition | Behavior |
|-----------|----------|
| CodeGraph unavailable | `shouldFallbackToManualInspection: true`; prompt hints say inspect manually |
| Low confidence suggestion | Show in UI as low confidence only; do not mark `safeToIncludeInPrompt` unless medium+ and owner-reviewed |
| Unsafe path | Exclude from prompt; `safeToIncludeInPrompt: false` |
| Sensitive path/env file | Exclude/redact; never show secret values |
| No route match | Fallback: search by route/page string in `src/app` |
| No component match | Fallback: inspect `@/components/aixia` and `src/styles/aixia-design-system.css` |
| No prior fix match | Do not invent recurrence reference; omit `relatedPastIssues` |
| MCP/runtime error | Mock/static hints only (Phase 6B); log metadata without secrets |

---

## Manual inspection fallback text (template)

When fallback is active, prompt context hints should include:

1. Inspect route/page: `{route}` or unknown if missing
2. Check shared AiXia components before page-level hacks
3. Check `src/styles/aixia-design-system.css` for repeated UI issues
4. Use AgentOps evidence summary and fix strategy from issue record
5. CodeGraph not active — structural suggestions unavailable

(Phase 6B mock adapter may populate this from issue fields only.)

---

## Response fields

| Field | Fallback value |
|-------|----------------|
| `confidence` | `low` |
| `shouldFallbackToManualInspection` | `true` |
| `requiresOwnerReview` | `true` |
| `limitations` | States CodeGraph inactive or partial |
| `safetyFlags` | e.g. `codegraph_inactive`, `manual_inspection_only` |

---

## Hermes and mock layers

- Hermes mock (`agentResponseMock`) already states CodeGraph not active — keep consistent.
- Future Hermes runtime must respect CodeGraph fallback flags; never override with invented file paths.

---

## Owner workflow

1. View discovery panel (advisory).
2. Manually verify paths in repo/Cursor.
3. Copy approved hints into Cursor prompt editor.
4. Approve handoff only after Piter review.

No automatic step between discovery and prompt approval.
