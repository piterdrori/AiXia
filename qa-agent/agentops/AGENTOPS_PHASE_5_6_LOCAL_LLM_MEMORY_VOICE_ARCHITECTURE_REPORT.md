# AgentOps Phase 5/6 - Local LLM + Memory + Voice Architecture Report

## Purpose

Define AgentOps architecture for local chat, memory, and future voice while evaluating candidate repositories (OpenMonoAgent.ai, agentmemory, Supertonic) before any runtime integration.

## Files created

- `qa-agent/local-llm/local-llm-agent-architecture.md`
- `qa-agent/local-llm/local-llm-chat-contract.json`
- `qa-agent/local-llm/memory-layer-architecture.md`
- `qa-agent/local-llm/local-llm-memory-policy.md`
- `qa-agent/local-llm/local-llm-voice-plan.md`
- `qa-agent/local-llm/local-llm-tool-evaluation.md`
- `qa-agent/agentops/AGENTOPS_PHASE_5_6_LOCAL_LLM_MEMORY_VOICE_ARCHITECTURE_REPORT.md`

## Files modified

- None

## Local LLM architecture summary

- React AgentOps routes remain orchestration UI and control surface.
- Supabase remains durable source-of-truth for approved memory, issue lifecycle, verification, and archived lessons.
- Local LLM/OpenMonoAgent-style runtime is planned as low-cost conversation layer, not authority.
- agentmemory-style layer is planned as retrieval/timeline/recurrence layer (non-authoritative).
- Hermes is essential for memory interpretation, lesson synthesis, issue linkage, and prompt refinement.
- CodeGraph remains code-discovery advisory layer.
- Cursor remains approved code-fix execution bridge.

## Three chat systems summary

- **Council (`/system/agent-ops/council`)**
  - one Piter input, individual role-based agent replies
  - no combined summary
  - no system-level next-action authority
  - intent-gated memory prompt

- **Individual Agent (`/system/agent-ops/agents/[agentId]`)**
  - one selected agent, training/fine-tuning context
  - intent-gated memory prompt
  - default memory scope: that agent only

- **Issue Chat (`/system/agent-ops/issues/[issueCode]`)**
  - issue-solving context + prompt improvement + Cursor review loop
  - future lesson candidate pipeline
  - intent-gated memory prompt

## Memory layer summary

Three-level design:

1. Supabase source-of-truth memory (durable authority)
2. agentmemory-style retrieval runtime memory (advisory recall/search/timeline)
3. static memory files (export/review artifacts)

Write policy:

- no automatic durable memory writes
- memory updates only after explicit Yes approval
- shared/cross-agent memory only with explicit shared approval.

## Hermes essential role

Hermes is documented as essential for:

- memory quality strengthening
- lesson summarization and relation mapping
- prompt quality improvement
- role behavior refinement over time

Hermes activation remains deferred to later gated phases.

## OpenMonoAgent evaluation

- Valuable as local-agent architecture reference (sub-agents, tool pipeline, local-first design).
- Higher legal/runtime adoption risk for direct integration now (AGPL-3.0 implications and operational complexity).
- Recommendation: evaluate later; use as architectural inspiration only in current phase.

## agentmemory evaluation

- Strongest fit for planned retrieval memory layer (semantic/hybrid recall, timeline/replay, multi-agent compatibility).
- Compatible with Supabase-as-authority model if governance is enforced.
- License (Apache-2.0) is favorable.
- Recommendation: target candidate for controlled staging pilot in later phases.

## Supertonic evaluation

- Strong local TTS candidate (on-device, multi-runtime support, local server options).
- Best positioned as future voice output after text chat + memory governance are stable.
- License (MIT) is favorable.
- Recommendation: defer implementation until voice phase.

## Effect on Phase 7 archive/learning memory

- Establishes clear durable-vs-retrieval split needed for lesson approval and archive integration.
- Adds recurrence detection and retrieval support patterns for archived lessons.

## Effect on Hermes

- Defines Hermes as required reasoning amplifier for memory and prompt quality.
- Provides explicit role boundary prior to runtime activation.

## Effect on CodeGraph

- Keeps CodeGraph advisory in chat contract context (`codegraphHints`) without runtime activation in this phase.

## Effect on Cursor bridge

- No change to manual-first Cursor approval bridge.
- Chat/memory architecture remains separate from execution controls.

## What was not implemented

- No package installation
- No local LLM runtime integration
- No Hermes runtime integration
- No CodeGraph runtime integration
- No agentmemory runtime integration
- No OpenMonoAgent runtime integration
- No Supertonic or STT/TTS runtime integration
- No scheduler/auto-execution changes
- No Supabase schema/RLS/migration changes
- No production/main environment changes

## Validation results

- `npm run qa:validate-foundation` -> **PASS**

## Next recommended phase

- Phase 7 architecture-to-implementation planning for archive/learning memory flow, followed by Phase 8 mock local chat contract wiring under strict staging gates.
