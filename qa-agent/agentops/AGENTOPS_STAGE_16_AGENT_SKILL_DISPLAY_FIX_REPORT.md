# AGENTOPS Stage 16 Agent Skill Display Fix Report

## What Was Unclear

The Agents tab emphasized `App Role` too early in the table, while assignment-critical skill identity was less visible. For owner workflow, this made task assignment harder because app permission role is not the same as QA specialty.

## New Column Order

1. Agent
2. Agent Skill / Specialty
3. App Role
4. Email
5. Purpose
6. Allowed Modules
7. Blocked Modules
8. AgentOps Owner
9. Memory
10. Current Focus
11. Latest Activity
12. Status
13. Actions

## Source Used for Agent Skill / Specialty

Skill labels are now assigned by explicit `qaUserId` mapping in service layer (deterministic, no index-based mapping):

- Base identity and purpose source: `qa-agent/browser-qa/synthetic-browser-users.json`
- Role clarity constraints: `qa-agent/agentops/AGENTOPS_STAGE_16_AGENT_ROLE_MAPPING_AUDIT.md`
- Skill naming vocabulary aligned to: `qa-agent/registry/combined-agents.json` (+ approved finance workflow label)

No index-pairing to combined agents is used.

## App Role Confirmation

`App Role` remains the actual app/profile permission role only:

- admin
- manager
- employee
- guest

It is kept visible but treated as secondary to skill identity.

## Agent Skill / Specialty Confirmation

`Agent Skill / Specialty` is now primary for work assignment and appears near the left side of the table.

## All 12 Agents

All 12 synthetic agents remain visible in the table.

## Actions Column Reachability

Actions remains the final column and is still reachable through table-area horizontal scrolling.

## Files Modified

- `src/lib/agentops/service.ts`
- `src/app/system/agent-ops/page.tsx`

## Files Created

- `qa-agent/agentops/AGENTOPS_STAGE_16_AGENT_SKILL_DISPLAY_FIX_REPORT.md`

## Validation Results

- `npm run build` -> PASS
- `npm run qa:validate-foundation` -> PASS
- `npm run qa:static-design-guardrails` -> PASS
- `npm run qa:guardrail-action-plan` -> PASS

