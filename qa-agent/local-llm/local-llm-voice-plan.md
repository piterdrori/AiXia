# Local LLM Voice Plan (Phase 5/6)

## Purpose

Define future voice interaction architecture while preserving text-first safety and approval controls.

## Planned Voice Pipeline (Future Phase)

1. **STT input (future):** convert Piter speech to text.
2. **Context assembly:** chat scope + memory retrieval + issue/agent context.
3. **Local LLM + Hermes reasoning:** generate response text.
4. **Memory intent check:** if memory instruction intent detected, ask for Yes/No approval in text/voice UI.
5. **TTS output (Supertonic-style):** synthesize spoken response locally.

## Safety Rules

- Voice cannot trigger Cursor execution.
- Voice cannot close issues directly.
- Voice cannot write durable memory without explicit Yes approval.
- Voice cannot modify production or bypass staging controls.
- Voice interactions must produce equivalent text/audit logs.

## Runtime Boundaries (Current Phase)

This phase does not implement voice runtime:

- no STT runtime activation
- no Supertonic/TTS runtime activation
- no voice command execution bridge

## Integration Notes

- Supertonic supports local, on-device TTS with Node/Python/browser integration paths.
- Voice should remain a presentation/output layer on top of the same text policy engine.
- Any voice control action must route through the same approval and audit trail model as text UI.

## Recommended Sequencing

1. Stabilize text chat contracts + memory approval flow.
2. Activate local retrieval and Hermes reasoning under staging gates.
3. Add TTS output-only path.
4. Add STT input path after output and audit behavior are stable.
5. Keep destructive/automation actions blocked from voice channel unless explicitly approved in a future governance phase.
