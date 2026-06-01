# AgentOps per-agent folders

Each synthetic QA agent has an isolated folder under `qa-agent/agents/{agentId}/`.

## Layout

```
qa-agent/agents/{agentId}/
  manifest.json         # Canonical identity (specialty, role, modules)
  job.md                # Placeholder job definition (Mission / Responsibilities / Out of scope / Escalation)
  creativity-brief.md   # How this agent imagines problems in their domain
  memory.md             # Static export mirror (DB is source of truth at runtime)
```

## Rules

- Agent IDs match `qa-agent/browser-qa/synthetic-browser-users.json`.
- Runtime prompts load from `manifest.json` via `src/lib/agentops/agentIdentityLoader.ts`.
- Memory writes always require Piter Yes/No approval and are scoped to one `agentId`.
- Creative proposals are owner-reviewed metadata only — no auto-issue creation.

Legacy flat files in `qa-agent/agent-memory/` remain during transition.
