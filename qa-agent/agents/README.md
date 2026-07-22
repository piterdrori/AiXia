# AgentOps per-agent folders

## Two different trees

| Path | Meaning |
|------|---------|
| `qa-agent/agentops-agents/{slug}/` | **Canonical AgentOps agents** (`design-agent`, `qa-agent`, …) — role-first full-site specialists |
| `qa-agent/agents/{agentId}/` | **Synthetic Browser QA personas** (`finance-admin`, `platform-admin`, …) |

Do not treat persona folders as the 12 AgentOps employees.

## Synthetic persona layout

Each synthetic QA agent has an isolated folder under `qa-agent/agents/{agentId}/`.

```
qa-agent/agents/{agentId}/
  manifest.json         # Canonical identity (specialty, role, modules)
  job.md                # Placeholder job definition (Mission / Responsibilities / Out of scope / Escalation)
  creativity-brief.md   # How this agent imagines problems in their domain
  memory.md             # Static export mirror (DB is source of truth at runtime)
```

## Rules

- Persona Agent IDs match `qa-agent/browser-qa/synthetic-browser-users.json`.
- Runtime prompts for personas load from `manifest.json` via `src/lib/agentops/agentIdentityLoader.ts`.
- Canonical AgentOps agents use `qa-agent/agentops-agents/` + `agentIdentityDefinitions.ts` + Hermes `agentops.agent.{slug}`.
- Memory writes always require Piter Yes/No approval and are scoped to one agent id.

Legacy flat files in `qa-agent/agent-memory/` remain during transition.
