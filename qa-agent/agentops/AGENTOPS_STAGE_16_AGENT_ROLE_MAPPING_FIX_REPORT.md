# AGENTOPS Stage 16 Agent Role Mapping Fix Report

## What Was Confusing/Wrong

Agents tab displayed mixed role semantics:

- App role and QA role were combined in one cell
- Purpose text was merged with role context
- `combined-agents.json` council labels were index-mapped to users with no authoritative join key
- This made admin role interpretation ambiguous (for example tenant admin vs AgentOps owner)

## Actual Mapping Source Checked

- `qa-agent/browser-qa/synthetic-browser-users.json`
- `qa-agent/agentops/AGENTOPS_SYNTHETIC_USERS_CREATION_REPORT.md`
- `qa-agent/registry/synthetic-roles.json`
- `qa-agent/registry/combined-agents.json`
- `src/lib/agentops/service.ts`
- `src/lib/agentops/types.ts`
- `src/app/system/agent-ops/page.tsx`

Detailed audit:

- `qa-agent/agentops/AGENTOPS_STAGE_16_AGENT_ROLE_MAPPING_AUDIT.md`

## All 12 Role Mappings

See full table in:

- `qa-agent/agentops/AGENTOPS_STAGE_16_AGENT_ROLE_MAPPING_AUDIT.md`

## Source Data Changed

- **No**

## UI Labels Changed

Yes:

- `System Role` -> `App Role`
- `QA Role / Purpose` -> split into:
  - `QA Specialty`
  - `Purpose`
- `Owner Access` -> `AgentOps Owner`

## Final Column Structure

1. Agent
2. Email
3. App Role
4. QA Specialty
5. Purpose
6. Allowed Modules
7. Blocked Modules
8. AgentOps Owner
9. Memory
10. Current Focus
11. Latest Activity
12. Status
13. Actions

## Confirmation Checks

- App Role now shows only app/profile role (`admin`, `manager`, `employee`, `guest`)
- QA Specialty is separated from App Role
- Purpose is separated from role
- AgentOps Owner is separated from App Role
- Tenant Admin QA is treated as `admin` app role and **not** AgentOps Owner unless allowlisted
- Horizontal table scroll remains active and Actions column remains reachable

## Files Modified

- `src/lib/agentops/types.ts`
- `src/lib/agentops/service.ts`
- `src/app/system/agent-ops/page.tsx`

## Service Logic Notes

- No Supabase query permissions behavior changed.
- No writes/owner gates changed.
- Mapping cleanup only:
  - removed misleading index-based council-agent mapping
  - normalized App Role from profile/intended role
  - added deterministic QA Specialty labels by `qaUserId` for display clarity

## Validation Results

- `npm run build` -> PASS
- `npm run qa:validate-foundation` -> PASS
- `npm run qa:static-design-guardrails` -> PASS
- `npm run qa:guardrail-action-plan` -> PASS

