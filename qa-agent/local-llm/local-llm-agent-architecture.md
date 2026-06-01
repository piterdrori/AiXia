# Local LLM Agent Architecture (Phase 5/6)

## Purpose

Define a staging-safe, manual-first architecture for AgentOps local conversation, memory reasoning, and future voice support without enabling any runtime integration yet.

## Core Authority Rules

1. Local LLM is a conversation/runtime layer, not the final authority.
2. Supabase remains source of truth for durable records.
3. Hermes is essential for memory reasoning quality and long-term agent improvement.
4. Memory writes require explicit Piter approval (Yes/No flow); no auto-write.
5. Cursor remains the approved code-fixing execution tool.

## System Components

- **React UI (AgentOps routes)**  
  Control panel + chat interfaces for Council, Agent Workspace, and Issue Workspace.

- **Supabase (source of truth)**  
  Approved memory, issues, approvals, audit trail, verification states, closure, and archived lessons.

- **Local LLM / OpenMonoAgent-style runtime (future activation)**  
  Low-cost local inference for daily chat responses and role-based drafting.

- **agentmemory-style layer (future activation)**  
  Retrieval/search/timeline/pattern memory runtime for non-authoritative context recall.

- **Hermes (essential, future activation)**  
  Reasoning layer for memory interpretation, lesson synthesis, issue linkage, prompt refinement, and behavioral quality.

- **CodeGraph (future activation)**  
  Code/source discovery context for issue and prompt quality, advisory only.

- **Cursor bridge (existing, manual-first)**  
  Approved prompt handoff and fix-report lifecycle, no auto execution.

- **Supertonic (future voice output)**  
  Local TTS output layer for spoken replies.

- **STT layer (future input)**  
  Speech-to-text intake into the same text-first safety pipeline.

## Runtime Boundaries (Current Phase)

Architecture-only in Phase 5/6:

- No local LLM runtime activation
- No Hermes runtime activation
- No CodeGraph runtime activation
- No agentmemory runtime activation
- No OpenMonoAgent runtime activation
- No Supertonic/STT runtime activation
- No scheduler/auto Cursor behavior

## Three Chat Systems

## 1) Council Chat

- **Route:** `/system/agent-ops/council`
- One Piter message fan-outs to relevant agent roles.
- Each agent returns an individual reply.
- No combined council summary.
- No system-level next-action authority card.
- Memory prompt appears only when explicit memory intent is detected.

## 2) Individual Agent Chat

- **Route:** `/system/agent-ops/agents/[agentId]`
- One selected agent responds in-role.
- Used for coaching/fine-tuning that specific agent.
- Memory prompt remains intent-gated.
- Default memory scope is agent-specific.

## 3) Specific Issue Chat

- **Route:** `/system/agent-ops/issues/[issueCode]`
- Issue-focused conversation with issue agent.
- Supports prompt refinement and Cursor report review workflow.
- Feeds future issue lesson candidates (approval-gated).
- Memory prompt remains intent-gated.

## High-Level Data Flow (Future Runtime)

1. Piter sends message from one of three chat scopes.
2. Scope context + Supabase records + retrieval hints are assembled.
3. agentmemory-style retrieval returns candidate memories/lessons.
4. Hermes reasoning enriches relevance and recommendation quality.
5. Local LLM generates scoped response(s).
6. If memory intent detected, agent asks:  
   "Do you want me to update my memory with this?"
7. Only on **Yes**: durable write request is recorded and persisted to Supabase.
8. Cursor handoff remains separate and explicitly approved.

## Security + Compliance Posture

- Staging-only development and runtime rollout.
- Durable memory, approvals, and audit events tracked in Supabase.
- Secrets/credentials excluded from memory and chat persistence.
- Role boundaries preserved: advisory AI vs owner-approved durable actions.

## Phase Linkage

- **Phase 5/6:** Architecture + repo/tool evaluation only.
- **Phase 7:** Archive/learning memory integration (approval-gated).
- **Phase 8/9:** Chat contract + mock runtime, then controlled local runtime readiness.
- **Phase 10/11:** Controlled CodeGraph/Hermes staging activation.
- **Phase 12:** Controlled Cursor execution bridge after readiness gates.
