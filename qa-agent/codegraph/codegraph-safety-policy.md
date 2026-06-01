# CodeGraph Safety Policy (AgentOps)

CodeGraph discovery for AgentOps is **read-only** and **owner-gated**. This policy applies to all future runtime integration.

---

## Core rules

| Rule | Requirement |
|------|-------------|
| Read-only only | No file writes, no schema changes, no RLS edits |
| No file mutation | Discovery must not modify repo or database |
| No prompt auto-mutation | Suggestions never auto-append to Cursor prompt |
| No Cursor trigger | CodeGraph never starts Cursor or shell |
| Staging only | No production/main until separate owner policy |
| No secrets | No API keys, env secrets, or tokens in requests/responses |
| No env secret scanning in UI | Do not display `.env` contents or secret values |
| No direct Supabase changes | Discovery does not mutate AgentOps tables |
| No schema/RLS edits | Structural DB changes require explicit approval |
| Owner approval required | Piter reviews before prompt inclusion |

---

## Browser and app boundaries

- **No MCP from the app** — CodeGraph MCP tools run in Cursor/agent context only until a server-side proxy exists.
- **No file-system scan from browser** — client never walks the repo.
- **No network to CodeGraph from client** without a reviewed server route (future phase).

---

## Path and content safety

Exclude or redact from suggestions:

- `.env`, `.env.local`, `.vercel`
- `node_modules`
- Credentials, keys, passwords in paths or labels
- Production-only config unless explicitly approved

Mark `safeToIncludeInPrompt: false` for uncertain or sensitive items.

---

## Prompt and Cursor

- Suggestions are **hints** — not approved prompt text.
- Copy/append actions require explicit owner click (future UI).
- Forbidden: auto-run Cursor, auto-approve handoff, auto-close issue.

---

## Rollback

1. Disable CodeGraph feature flag / runtime flag (future).
2. Issue Workspace shows **Not active** and manual inspection fallback.
3. Verify no prompt fields were auto-modified.
4. Document in AgentOps report if incident.

---

## Alignment

- `qa-agent/codegraph/codegraph-discovery-contract.json` — `safety` block on every request
- `qa-agent/hermes/hermes-safety-policy.md` — parallel Hermes rules
- AiXia design system: fix shared CSS/components first, not page hacks
