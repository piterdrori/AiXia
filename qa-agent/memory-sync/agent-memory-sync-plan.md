# AgentOps Agent Memory Sync Plan

## Current Mode

AgentOps memory is currently **database-only**. Memory and interaction notes are stored in
`agentops_agent_memory` and `agentops_owner_feedback`.

## Future Goal

Export reviewed AgentOps DB memory into per-agent memory files for future Cursor/Hermes workflows
without changing AgentOps database authority.

## What Can Be Exported

- Piter notes
- focus directives
- corrections
- feature ideas
- fix instructions
- test instructions
- blocked behaviors
- status notes

## What Must Never Be Exported

- passwords
- Supabase keys
- production credentials
- private personal data
- sensitive unrelated content
- Personal ChatGPT memory
- anything not explicitly related to AgentOps/project behavior

## Proposed Future File Paths

Use placeholder target paths:

- `qa-agent/agent-memory/<agentId>.memory.md`

These files are **not created** in Stage 16C.

## Review Process

1. Run dry-run export command.
2. Review generated dry-run JSON and summary.
3. Piter approves included/excluded content.
4. Future stage creates memory export files.
5. Future stage may optionally sync to Cursor memory adapters.
6. Final rulebooks remain separate and postponed.

## Safety Rules

- No auto-sync.
- No Hermes runtime call.
- No CodeGraph runtime call.
- No rulebook creation.
- No production/main changes.
