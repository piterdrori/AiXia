# Local LLM / Memory / Voice Tool Evaluation (Phase 5/6)

## Scope

Architecture and external-tool evaluation only for:

1. OpenMonoAgent.ai
2. agentmemory
3. Supertonic

No runtime integration is activated in this phase.

## 1) OpenMonoAgent.ai

## What it does

- Local-first coding agent with bundled inference approach (llama.cpp), CLI/TUI workflow, tool pipeline, sub-agents, and playbooks.
- Positions itself as no-cloud/no-token-cost local agent runtime.

## How it fits AgentOps

- Potential future local runtime pattern for low-cost inference.
- Useful as reference for:
  - sub-agent orchestration style
  - tool pipeline/sandbox concepts
  - local-first operational model

## Which phase it affects

- Primarily future Phase 8/9 (local chat runtime readiness) and possibly Phase 12+ experimentation.

## What it might replace/supplement

- Could supplement local conversation runtime strategy.
- Not a direct replacement for current Cursor handoff model in this phase.

## Integration risks

- Heavy platform/runtime alignment effort with current React + Supabase architecture.
- Requires careful separation from existing Cursor approval workflow.
- Potential operational complexity around local model management and tool sandboxing.

## Security/runtime risks

- Local execution surface is broad; requires strict execution boundaries.
- Must ensure no unintended command/file mutation path is introduced into AgentOps UI flows.

## Licensing/runtime risks

- Repository license indicates **AGPL-3.0** (strong copyleft/network-use obligations).
- AGPL implications may be restrictive for direct embedding/modification in proprietary/commercial workflows.

## Recommendation

- **Evaluate later (design reference now, no direct integration now).**
- Use architectural patterns only at this stage; defer any runtime adoption decision until legal and operational review is complete.

## 2) agentmemory

## What it does

- Persistent memory engine with MCP/HTTP integration model.
- Emphasizes semantic/hybrid retrieval, session timeline/replay, cross-agent support, and memory tooling.
- Supports Cursor/Hermes and many MCP-capable clients.

## How it fits AgentOps

- Strong fit for planned memory retrieval layer:
  - semantic memory recall
  - timeline/observability
  - recurrence signals
  - cross-agent retrieval proposals
- Can serve as runtime retrieval tier while Supabase remains durable authority.

## Which phase it affects

- Phase 7 (archive/learning memory integration)
- Phase 8/9 (chat runtime + memory retrieval)
- Phase 11 (Hermes memory strengthening behavior)

## What it might replace/supplement

- Supplements static memory-file review with richer retrieval/search runtime.
- Does not replace Supabase source-of-truth memory model.

## Integration risks

- Need strict two-layer authority model to prevent retrieval store from becoming accidental source-of-truth.
- Must enforce policy guardrails for cross-agent memory propagation and secret filtering.

## Security/runtime risks

- Memory capture hooks can ingest sensitive context if filtering is weak.
- Requires explicit privacy/safety filtering and approval gates before durable writes.

## Licensing/runtime risks

- License: **Apache-2.0** (generally permissive for integration).
- Runtime complexity still present (services, hooks, MCP wiring), but licensing risk is relatively low.

## Recommendation

- **Use now for architecture target; evaluate controlled staging pilot later.**
- Treat as preferred candidate for memory retrieval layer once readiness gates are defined.

## 3) Supertonic

## What it does

- On-device multilingual TTS (ONNX runtime) with local inference orientation.
- Supports Python, Node.js, browser/WebGPU, and many other runtimes.
- Offers local server mode in Python SDK with OpenAI-compatible endpoint.

## How it fits AgentOps

- Strong candidate for future spoken output in Council/Agent/Issue chat.
- Fits privacy and local-compute goals for low recurring cost voice output.

## Which phase it affects

- Future voice phase (roadmap Phase 14 style sequencing), after text chat + memory are stable.

## What it might replace/supplement

- Supplements text chat with optional spoken output.
- Does not replace core reasoning, memory governance, or issue workflow logic.

## Integration risks

- Voice quality/performance depends on local device capabilities and model assets.
- Additional UX complexity (playback controls, interruptions, latency handling, voice selection).

## Security/runtime risks

- Lower than command-executing systems; primarily media-output pipeline risk.
- Still requires strict prevention of voice-driven destructive actions.

## Licensing/runtime risks

- License: **MIT** (permissive).
- Operational dependencies include model asset distribution/hosting and runtime packaging.

## Recommendation

- **Defer until text chat + memory are stable.**
- Keep as planned voice output layer, not immediate implementation target.

## Comparative Summary

- **OpenMonoAgent.ai:** valuable architecture reference; legal/runtime risk higher for direct adoption now.
- **agentmemory:** strongest near-term fit for memory retrieval layer; keep Supabase authoritative.
- **Supertonic:** strong future TTS option; defer until core text+memory stack is production-ready in staging.

## Final Evaluation Decision (Phase 5/6)

- OpenMonoAgent.ai -> **Evaluate later**
- agentmemory -> **Target candidate for later controlled staging pilot**
- Supertonic -> **Defer (voice phase after text-memory maturity)**
