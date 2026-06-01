# AgentOps Phase 0 Batch 13 - Council Page Shell Report

## Purpose

Create a dedicated Agent Council route shell for future 12-agent group chat, and wire navigation from Control Center and Agents overview, without activating any runtime systems.

## Route created

- `/system/agent-ops/council`

## Files created

- `src/app/system/agent-ops/council/page.tsx`
- `qa-agent/agentops/AGENTOPS_PHASE_0_BATCH_13_COUNCIL_PAGE_SHELL_REPORT.md`

## Files modified

- `src/App.tsx`
- `src/app/system/agent-ops/page.tsx`
- `src/app/system/agent-ops/agents/page.tsx`

## Council page sections

Route: `/system/agent-ops/council`

1. **Hero**
   - Title: Agent Council
   - Subtitle: Talk to all 12 AgentOps agents together
   - Back link to Control Center
   - Badges:
     - Staging only
     - Group chat planned
     - Local LLM inactive
     - Hermes essential / inactive
     - Memory runtime inactive

2. **Purpose card**
   - States this page is the future all-agent group chat surface
   - Clarifies one-message-to-council -> individual agent replies by role/specialty/focus/memory
   - Confirms no real AI runtime is active

3. **12-agent council roster**
   - Compact card grid for each managed agent with:
     - name
     - app role
     - QA specialty / skill
     - current focus
     - status
     - attention flag
     - memory count/status
     - future per-agent reply placeholder
     - planned memory approval area:
       - "Suggested memory update: ..."
       - `Yes — update this agent's knowledge` (disabled in shell)
       - `No — do not update` (disabled in shell)
   - Includes `Open individual agent` action to `/system/agent-ops/agents/[agentId]`

4. **Council message input placeholder**
   - Disabled textarea with placeholder:
     - "Ask all 12 agents together. Each agent will reply individually when runtime is active."
   - Disabled send button
   - Explicit note:
     - no local LLM, Hermes runtime, or voice runtime active

5. **Future integration readiness**
   - Local LLM: planned / inactive
   - agentmemory-style layer: planned / inactive
   - Hermes: essential / inactive
   - CodeGraph: advisory / inactive
   - Supertonic voice: future / inactive

6. **Safety block**
   - Council cannot trigger Cursor
   - Council cannot close issues
   - Council cannot write durable memory without Piter approval
   - Council cannot auto-approve prompts
   - Council cannot modify production
   - Council is staging-only
   - Supabase remains source of truth
   - No combined council summary card or system-level next-action card is included

## Control Center navigation update

- Added **Agent Council** card in `/system/agent-ops` Navigate section:
  - title: Agent Council
  - description: Talk to all 12 agents together
  - route: `/system/agent-ops/council`

## Agents page navigation update

- Added dedicated **Agent Council** navigation section on `/system/agent-ops/agents` with:
  - text: Talk to all 12 agents together
  - button: Open Council
  - route: `/system/agent-ops/council`

## Confirmation: full group chat placement

- Full group chat UI/runtime was **not** added inside `/system/agent-ops/agents`.
- `/system/agent-ops/agents` remains the 12-agent overview plus a Council navigation entry.

## Runtime systems inactive

- Local LLM runtime: inactive
- Hermes runtime: inactive
- CodeGraph runtime: inactive
- agentmemory/OpenMonoAgent/Supertonic runtime: inactive
- Scheduler: inactive
- Cursor auto-execution: not added

## Logic preserved

- No Supabase schema/RLS/migration changes
- No service/business logic behavior changes
- No production/main interaction

## Validation results

Required:

- `npm run build` -> **PASS** (with pre-existing unrelated AiXia standards warnings)
- `npm run qa:validate-foundation` -> **PASS**
- `npm run qa:static-design-guardrails` -> **PASS**
- `npm run qa:guardrail-action-plan` -> **PASS**

Optional smokes:

- `npm run qa:agentops-issue-workspace-smoke` -> **PASS**
- `npm run qa:agentops-agent-clarification-smoke` -> **PASS**
- `npm run qa:agentops-codegraph-discovery-smoke` -> **PASS**

## Remaining concerns

- Manual browser walkthrough routes were not executed in this report run.
- Pre-existing global AiXia standards warnings remain outside AgentOps scope.

## Next recommended batch

Phase 0 Batch 14:

- Add Council page interaction scaffolding for message/thread model (UI-state only), keeping all runtimes inactive and preserving manual-first safety gates.
