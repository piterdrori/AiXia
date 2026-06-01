# AgentOps Messenger Visibility QA Report

Date: 2026-05-30  
Scope: Council, Agent Workspace, Issue Workspace agent chats  
Shell: `AixiaMessengerShell` (shared AiXia component + `aixia-design-system.css`)

## Root cause (2026-05-30 browser QA)

1. **Flex trap** — `.aixia-messenger-shell__viewport` used `min-height: 280px`, preventing the dock from fitting inside the shell when the participant picker was expanded.
2. **Page scroll clip** — Shell height used large `vh` values while the command page hero/meta strip consumed the top of the scroll container, so the composer dock rendered below the visible fold on first load.
3. **Council picker height** — 12-agent chip grid added ~176px above the composer when expanded.

## Fixes applied

| Fix | File |
|-----|------|
| Viewport `min-height: 0` + flex shrink | `aixia-design-system.css` |
| Shell height `clamp(420px, calc(100dvh - 20rem), 540px)` | `aixia-design-system.css` |
| Auto-scroll composer dock into view on mount | `AixiaMessengerShell.tsx` |
| Participant picker collapsed by default + Edit roster toggle | `AixiaChatParticipantPicker.tsx` |
| Issue page messenger padding class | `issues/[issueCode]/page.tsx` |

## Build gate

| Check | Result | Notes |
|-------|--------|-------|
| `npm run build` | Pass (2026-05-30) | Zero TypeScript errors |

## Browser QA (2026-05-30, 800×800 viewport)

| Check | Council | Agent Workspace | Issue Workspace |
|-------|---------|-----------------|-----------------|
| Composer dock in viewport after load | Pass | Pass | Pass |
| Textarea visible (≥72px) | Pass | Pass | Pass |
| Mic button visible | Pass | Pass | Pass |
| Plus attachment button visible | Pass | Pass | Pass |
| Send button visible | Pass | Pass | Pass |
| Enter hint visible | Pass | Pass | Pass |
| TTS toggle in toolbar | Pass | Pass | Pass |
| Empty state readable | Pass | Pass | Pass |
| Council participant picker collapsed default | Pass | N/A | N/A |
| Issue intent presets above composer | N/A | N/A | Pass |
| Auto-scroll reveals dock on load | Pass | Pass | Pass |

Routes verified:

- `/system/agent-ops/council`
- `/system/agent-ops/agents/manager`
- `/system/agent-ops/issues/AIXIA-STATIC-GR-0074`

## Cross-chat parity (structural)

| Check | Council | Agent Workspace | Issue Workspace |
|-------|---------|-----------------|-----------------|
| Same shell component | Pass | Pass | Pass |
| Toolbar + TTS toggle | Pass | Pass | Pass |
| Tall scroll viewport | Pass | Pass | Pass |
| Fixed composer dock | Pass | Pass | Pass |
| Mic left | Pass | Pass | Pass |
| Plus attachment | Pass | Pass | Pass |
| Enter to send | Pass | Pass | Pass |
| User right / agent left bubbles | Pass | Pass | Pass |
| Empty state | Pass | Pass | Pass |
| Typing indicator while sending | Pass | Pass | Pass |
| Council participant picker | Pass | N/A | N/A |
| Issue intent presets | N/A | N/A | Pass |

## Functional smoke (runtime)

| Check | Expected | Manual verify |
|-------|----------|---------------|
| Text send → agent reply | All 3 surfaces | Requires Ollama and/or Hermes server route |
| Hermes Issue routing | `/api/agentops/hermes` first | Set `VITE_AGENTOPS_HERMES_ENABLED` + server `HERMES_*` |
| Council 2-agent select | Exactly 2 replies | Use participant picker → Edit roster |
| Memory Yes | Writes to one agent only | `commitAgentOpsMemoryFromChatApproval` |
| Memory No | Rejection metadata only | owner_feedback action `memory_approval_rejected` |
| Attachments | Upload metadata + bubble chip | Supabase bucket `agentops-chat-attachments` |
| TTS | Speaks new agent messages when enabled | AI Management voice settings |
| STT | Appends transcript to composer | Browser + voice_enabled |

## Mobile width (390px)

| Check | Result |
|-------|--------|
| Dock controls tappable (44×44 min) | Pass (CSS) |
| Composer wraps without hiding mic/plus | Pass (CSS grid) |
| Shell height uses `calc(100dvh - 14rem)` | Pass (CSS) |

## Known constraints

- Vite dev does not serve `api/` — use `vercel dev` for Hermes route testing.
- Attachment upload requires Supabase Storage bucket `agentops-chat-attachments`.
- Voice mic/TTS require AI Management voice features enabled.
- Pages with large hero blocks may still require a small scroll on very short viewports; shell auto-scrolls dock into view on mount.

## Sign-off

- [x] Browser pass on all three routes (2026-05-30)
- [x] Shared messenger shell migrated on all three pages
- [x] Memory approval wired with Yes/No handlers
- [x] Council participant selection filters LLM fan-out
- [x] Per-agent identity loader + 12 agent folders scaffolded
- [x] Composer visibility fix (flex + viewport height + auto-scroll)
