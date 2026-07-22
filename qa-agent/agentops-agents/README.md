# AgentOps canonical agents (12 employees)

These folders are the **per-agent operating memory** for the 12 AgentOps specialists.

## Split (important)

| Path | What it is |
|------|------------|
| `qa-agent/agentops-agents/{slug}/` | Canonical AgentOps agents (`design-agent`, `qa-agent`, …) |
| `qa-agent/agents/{persona}/` | Synthetic Browser QA user personas (`finance-admin`, …) — different product |

Do **not** mix the two.

## Role-first scan law

- Every agent scans the **full staging website** (same inventory).
- Each agent only files findings/improvements in its skill pack (`detectors.md` + `src/lib/agentops/runtime/agentRoleDetectors.ts`).
- Hermes namespace: `agentops.agent.{slug}` (see `hermes.md`).

## Folder layout

```
{slug}/
  README.md
  job.md
  memory.md
  detectors.md
  hermes.md
```
