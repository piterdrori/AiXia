# AgentOps Batch 107 / Phase 3 — Cursor Prompt Standard Lock Report

**Date:** 2026-05-30  
**Status:** COMPLETE (standard documented; validation in Issue Workspace)

---

## Deliverables

| Artifact | Path |
|----------|------|
| Prompt style standard | `qa-agent/prompt-standards/cursor-prompt-style-standard.md` |
| Prompt template | `qa-agent/prompt-standards/cursor-prompt-template.md` |
| Normalizer | `src/app/system/agent-ops/issues/normalizeCursorPrompt.ts` |
| Workspace validation | Issue Workspace prompt editor |

**Prior work:** [`AGENTOPS_PHASE_3_MANUAL_EXECUTION_BRIDGE_REPORT.md`](AGENTOPS_PHASE_3_MANUAL_EXECUTION_BRIDGE_REPORT.md), [`AGENTOPS_PHASE_3B_ISSUE_WORKSPACE_BROWSER_SMOKE_REPORT.md`](AGENTOPS_PHASE_3B_ISSUE_WORKSPACE_BROWSER_SMOKE_REPORT.md)

---

## Rules

- Owner-file prompt standard is source of truth
- Issue Workspace validates/normalizes before handoff
- No automatic Cursor execution

---

## Next

Batches 108–110 / Phase 4 — Three chat systems with mock adapters.
