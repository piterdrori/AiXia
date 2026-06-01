# CodeGraph Discovery Design

CodeGraph is **essential** for AgentOps — it helps identify likely files, components, routes, shared source-of-truth, and related past fixes **before** a Cursor prompt is sent. Phase 6A defines the read-only discovery contract only.

Reference: `codegraph-discovery-contract.json`, `codegraph-safety-policy.md`, `codegraph-fallback-policy.md`

---

## Current State

| Item | Status |
|------|--------|
| CodeGraph runtime | **Not active** |
| MCP from app | **Not allowed** (Phase 6A) |
| Issue Workspace | Placeholder / readiness panel only |
| Suggestions | **Not available** |
| Fallback | Manual inspection instructions in prompts |

---

## Future Purpose

Help AgentOps discover structural context before Cursor fixes an issue:

- Likely files and symbols to inspect
- Likely components and route ownership
- Shared components and CSS source-of-truth (`src/components/aixia`, `aixia-design-system.css`)
- Possible impacted modules and services
- Related past fixes and recurrence clues
- Prompt context hints (advisory — owner adds to prompt manually)

Aligns with `.cursor/rules/codegraph.mdc` tool chains (`codegraph_context`, `codegraph_trace`, `codegraph_impact`, `codegraph_explore`) for **agent** use — future app integration must proxy read-only, never mutate from browser.

---

## Allowed Future Modes

| Mode | Purpose |
|------|---------|
| `issue_context_discovery` | Broad context for an issue |
| `likely_files` | Candidate file paths |
| `route_ownership` | Map route → page + imports |
| `component_impact` | Blast radius of UI components |
| `shared_source_of_truth` | Shared AiXia components/CSS |
| `related_fix_lookup` | Prior fixed issues / archive |
| `recurrence_lookup` | Repeated pattern detection |
| `prompt_context_suggestions` | Advisory blocks for Cursor prompt |

---

## Disallowed Modes

- Direct code edits or file mutation
- Automatic prompt mutation without owner review
- Automatic Cursor execution
- Production actions or production/main targets
- Schema/RLS edits without explicit approval
- Secret or credential access
- Browser file-system scan
- MCP calls from client-side React code

---

## Data CodeGraph May Read (future)

- Issue route, title, category, severity
- Summary, evidence, likely root cause, recommended fix strategy
- Repository index (AST knowledge graph)
- Route/component map (static or indexed)
- Prior fixed issue archive (AgentOps metadata)
- Shared component registry paths

---

## Data CodeGraph Must Not Read

- Secrets, API keys, tokens
- `.env`, `.env.local`, service role keys
- Production credentials
- Private customer PII beyond issue workspace fields
- Raw Supabase service role operations

---

## Owner Approval Rules

1. All CodeGraph suggestions are **advisory only**.
2. **Piter approves** before any suggestion is copied or appended to the Cursor prompt.
3. UI must label `safeToIncludeInPrompt` per item; unsafe paths excluded.
4. No auto-merge into `editedCursorPrompt` (same rule as Hermes mock suggestions).

---

## Integration with Hermes

- Hermes may **consume** CodeGraph discovery results for clarification (future).
- Hermes does **not** replace CodeGraph for structural lookup.
- Both remain inactive in Phase 6A; contracts prepared in parallel.

---

## Fallback

If CodeGraph is unavailable, responses set `shouldFallbackToManualInspection: true` and prompts include manual inspection steps (route/page, shared components, grep guidance). See `codegraph-fallback-policy.md`.

---

## Phased rollout (planned)

| Phase | Scope |
|-------|--------|
| 6A (current) | Contract, policies, UI readiness |
| 6B | Mock discovery adapter (static hints from issue route only) |
| 6C+ | Server-side read-only proxy to CodeGraph index (no browser MCP) |

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Contract | `qa-agent/codegraph/codegraph-discovery-contract.json` |
| Hermes + CodeGraph spec | `qa-agent/agentops/AGENTOPS_HERMES_CODEGRAPH_SPEC.md` |
| Adapter readiness (app) | `src/lib/agentops/codegraphDiscovery.ts` |
