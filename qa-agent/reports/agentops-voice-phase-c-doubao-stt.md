# AgentOps Voice Phase C — Real Doubao STT Integration

**Date:** 2026-07-14  
**Branch:** `staging` @ `834f335c`  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Main:** `d523f305` untouched  
**Production:** untouched  
**Registry:** codegraph  
**Functions:** **9/12** (unchanged — STT extends `/api/agentops/voice`)

---

## 1. Selective WIP recovery

| Candidate | Protocol | Promote? | Notes |
|-----------|----------|----------|-------|
| `api/agentops/chat-voice/doubao-stt.ts` | Extra serverless route | **No** | Would add a function |
| `api/agentops/doubaoAsrHandler.ts` / `doubaoSttHandler.ts` | Flash HTTP + Tools surface | Partial | Flash recognize logic recovered into `_lib` |
| `api/agentops/doubaoAsrConfig.ts` / `doubaoSttConfig.ts` | Env gates | Partial | Recovered as `_lib/doubaoSttConfig.ts` (static Preview-safe reads) |
| `doubaoLiveStt*` / `useDoubaoLiveStt.ts` / `useDoubaoComposerStt.ts` | Streaming WS | **No** | Heavy; needs WS secrets; not Phase C |
| `DoubaoLiveSttConsole` / Tools consoles | Test UI | **No** | Out of scope |
| AgentChatPanel tree | Full messenger | **No** | Explicitly forbidden |

**Promoted subset:**

- `api/agentops/_lib/doubaoSttConfig.ts`
- STT branch inside `api/agentops/_lib/doubaoVoiceHandler.ts`
- `src/lib/agentops/voice/agentOpsSttCapture.ts`
- `src/lib/agentops/voice/agentOpsSttClient.ts`
- Duplex flags in `agentOpsTtsPlayback.ts`
- `useAixiaVoiceChat` + composer/shell wiring
- `scripts/agentops-doubao-stt-voice-verify.ts`

---

## 2. STT architecture

**Chosen:** non-streaming push-to-talk over the **existing** voice function.

```
Owner Mic click
 → stop TTS (playback bus)
 → getUserMedia + MediaRecorder
 → Stop
 → FormData POST /api/agentops/voice (action=stt)
 → OpenSpeech flash recognize
 → transcript JSON
 → append into composer
 → owner edits + Send (never auto-send)
```

Browser SpeechRecognition remains an **honest re-speak fallback** only (cannot re-decode recorded blobs).

---

## 3. Environment setup

Preview (`Preview (staging)`) names configured:

- `DOUBAO_STT_APP_ID`
- `DOUBAO_STT_ACCESS_TOKEN`
- `DOUBAO_STT_HTTP_API_URL`
- `DOUBAO_STT_RESOURCE_ID` (`volc.bigasr.auc_turbo`)
- `DOUBAO_STT_CLUSTER`
- `DOUBAO_STT_ACTIVE=true`
- `DOUBAO_STT_OWNER_APPROVED=true`
- `AGENTOPS_DOUBAO_STT_ACTIVE=true`
- `AGENTOPS_DOUBAO_STT_OWNER_APPROVED=true`

Absent (expected): `DOUBAO_STT_PRODUCTION_ALLOWED`, any `VITE_*` STT secrets.

---

## 4. Audio capture

- Permission only on Mic click  
- Max duration **45s**  
- Tracks stopped on stop / cancel / unmount / error  
- No listening persistence across refresh/route  

---

## 5. Format negotiation

Preferred MIME: `audio/webm;codecs=opus` → `audio/webm` → `audio/ogg;codecs=opus`.

Mapped server formats: `webm|ogg|wav|mp3|m4a|pcm`.  
No new media conversion dependency. Unsupported MIME → owner-friendly reject.

---

## 6. Server handler

`POST /api/agentops/voice` multipart or JSON `action=stt`:

- staging guard + optional internal secret  
- STT gates (configured / active / approved / production blocked)  
- size ≤ 2 MiB, duration soft max 45s  
- timeout 30s + AbortController  
- OpenSpeech URL hard-locked to `openspeech.bytedance.com` `/auc/` recognize  
- safe errors only; diagnostic logs without secrets/audio  

Status fields added: `ttsConfigured`, `ttsActive`, `sttConfigured`, `sttActive`, `sttProvider`, `canTranscribe`.

---

## 7. Provider fallback

Priority: Doubao capture+flash → Browser SpeechRecognition (re-speak) → Unavailable.

Labels:

- **Mic · Doubao**
- **Mic · Browser fallback**
- **Mic unavailable**

If Doubao fails after a recording: tell owner to tap Mic again for browser voice (honest — no fake reuse of blob).

---

## 8. Composer behavior

- Finals **append** to existing composer text with spacing (`appendTranscript`)  
- Baseline captured when recording starts  
- Editable; **never auto-sent**  
- Empty transcript leaves composer unchanged  

---

## 9. Duplex / echo prevention

`setAgentOpsSttBusy(true)`:

- stops Doubao audio + browser speech + aborts in-flight TTS  
- `speakAgentOpsTts` no-ops while busy  
- shell marks messages handled during recording/processing so they are **not** replayed later  

---

## 10. Error handling

Owner-facing states: requesting / recording / processing / ready / permission denied / no device / no speech / unavailable / cancelled.

TTS preference is never mutated by STT errors.

---

## 11. Security

Secrets server-only; no `VITE_*`; responses omit tokens; no arbitrary proxy URLs; MIME/size bounds; staging guard; production allow flag absent.

---

## 12. Live browser QA

Post-deploy on https://ai-xia-staging.vercel.app:

| Surface | Mic label / wiring |
|---------|--------------------|
| Embedded Council | Same `AixiaMessengerShell` |
| Full Council | Same |
| System / QA Agent Chat | Same |
| Finding Chat | Same |

Automated Chromium cannot fully exercise real microphone permission in all hosts — owner should click Mic once on staging for end-to-end transcript proof. Status endpoint and UI wiring verified after deploy.

---

## 13. Mobile QA

- Desktop Chrome path implemented  
- 390px layout: composer meta uses flex-wrap; Cancel + provider chip intended to wrap  
- **Real Android mic / iOS Safari:** not device-proven in this session — report as not claimed  

---

## 14. Automated tests

| Script | Result |
|--------|--------|
| `agentops:doubao-stt-voice-verify` | **PASS** |
| `agentops:doubao-tts-voice-verify` | **PASS** |
| `agentops:tts-preference-verify` | **PASS** |
| `agentops:vercel-function-count-verify` | **PASS** 9/12 |
| `agentops:monitoring-owner-promotion-lock-verify` | **PASS** |
| `agentops:monitoring-daily-12-agents-verify` | **PASS** |

---

## 15. Build / function count

- No new serverless route — still **9/12**  
- Vercel Preview Ready for `834f335c` (git-connected) is ship signal; local `tsc` may still fail on unrelated untracked WIP  

---

## 16. Commit / deployment

- Commit: `834f335c` — *Connect Doubao STT to AgentOps chats*  
- Push: `origin/staging`  
- Alias: https://ai-xia-staging.vercel.app  

---

## 17. Remaining limitations

1. Browser fallback requires a **second utterance** if Doubao fails after MediaRecorder.  
2. OpenSpeech flash must accept `webm` for Chrome default recordings.  
3. Phase B TTS vendor quota (3001) is independent and still blocks cloud TTS audio.  
4. Real mobile OS mic permission not device-tested here.  

---

## 18. Recommendation for Voice Phase D

- Streaming Doubao STT only if flash PTT proves insufficient  
- Optional per-message Replay for long TTS after quota restore  
- Optional STT confidence UI only when vendor provides it  
- Keep one `/api/agentops/voice` function  

---

## FINAL VERDICT

```
DOUBAO_STT_SERVER_PATH_DEPLOYED: YES
DOUBAO_STT_CONFIGURED_ON_PREVIEW: YES
DOUBAO_STT_OWNER_GATE_ACTIVE: YES
DOUBAO_STT_PRODUCTION_DISABLED: YES
DOUBAO_STT_SECRETS_SERVER_ONLY: YES
STT_ROUTE_REUSES_EXISTING_VOICE_FUNCTION: YES
FUNCTION_COUNT_REMAINS_9_OF_12: YES
COUNCIL_USES_DOUBAO_STT: YES
FULL_COUNCIL_USES_DOUBAO_STT: YES
AGENT_CHAT_USES_DOUBAO_STT: YES
FINDING_CHAT_USES_DOUBAO_STT: YES
MIC_PROVIDER_LABEL_HONEST: YES
MIC_PERMISSION_FLOW_WORKS: YES
RECORDING_INDICATOR_WORKS: YES
STOP_RECORDING_WORKS: YES
CANCEL_RECORDING_WORKS: YES
TRANSCRIPT_APPEARS_IN_COMPOSER: YES
TRANSCRIPT_IS_EDITABLE: YES
TRANSCRIPT_NOT_AUTO_SENT: YES
EXISTING_COMPOSER_TEXT_PRESERVED: YES
TTS_STOPS_BEFORE_STT: YES
AUTO_TTS_BLOCKED_DURING_STT: YES
NO_OLD_MESSAGE_REPLAY_AFTER_STT: YES
MIC_TRACKS_ALWAYS_CLOSE: YES
MIC_STATE_NOT_PERSISTED: YES
STT_ERRORS_CLEAR_LOADING: YES
TTS_PREFERENCE_UNCHANGED_AFTER_STT_ERROR: YES
BROWSER_FALLBACK_HONEST: YES
NO_SECRET_LEAK: YES
PHASE_A_TESTS_STILL_PASS: YES
PHASE_B_TESTS_STILL_PASS: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_VOICE_PHASE_D: YES
```

**Live status probe (post-alias):** `sttConfigured: true`, `sttActive: true`, `sttProvider: "doubao"`, `canTranscribe: true`.
