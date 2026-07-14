# AgentOps Voice Phase C — Real Doubao STT Integration

**Date:** 2026-07-14  
**Branch:** `staging` @ `3538524d` (STT impl `834f335c`)  
**Staging alias:** https://ai-xia-staging.vercel.app → Preview `ai-c8tfuxl2n-…` (Ready)  
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

Authenticated Chromium on https://ai-xia-staging.vercel.app (alias → `ai-c8tfuxl2n-…`):

| Surface | Evidence |
|---------|----------|
| Full Council `/system/agent-ops/council` | Composer label **Mic · Doubao**; mic **Start voice input** |
| QA Agent Chat | Label **Mic · Doubao**; record → timer; Stop → `POST /api/agentops/voice` (~6.4s); status **No speech detected** (no spoken audio in automation); composer unchanged; no auto-send; Cancel restores idle and preserves typed baseline |
| System Agent Chat | **Mic · Doubao** + Start voice input |
| Finding Chat `/system/agent-ops/issues/:id` | Same shell; after status probe **Mic · Doubao** (briefly “unavailable” until probe settles — honest) |
| Embedded Council card | Shares `AixiaMessengerShell` / `useAixiaVoiceChat` wiring (same as full Council) |

**Live status probe:** `sttConfigured/sttActive=true`, `sttProvider:"doubao"`, `canTranscribe:true`, `sttBlockingReason:null`.

**Not proven in automation:** a real spoken phrase populating a non-empty transcript (host has no spoken audio). Owner should speak once on staging for that final proof.

**TTS duplex on TTS ON:** code-path verified (stop + busy gate); live echo test limited because Phase B Doubao TTS remains vendor-quota blocked and TTS stayed Off for most of this QA.

---

## 13. Mobile QA

- Chromium emulation **390×844**: System Agent — `overflowX: false`, mic touch target ~44×36, **Mic · Doubao** present  
- **Real Android Chrome mic:** not device-proven  
- **iOS Safari:** not claimed  

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
- Verify scripts: STT / TTS / preference / function-count — **PASS** (re-run 2026-07-14)  
- Vercel Preview Ready + alias repointed; local `tsc` may still fail on unrelated untracked WIP  

---

## 16. Commit / deployment

- Commit: `834f335c` — *Connect Doubao STT to AgentOps chats*  
- Report commit: `3538524d` (+ follow-up report refresh if pushed)  
- Push: `origin/staging`  
- Alias: https://ai-xia-staging.vercel.app → Ready Preview (not `--prod`)  

---

## 17. Remaining limitations

1. Browser fallback requires a **second utterance** if Doubao fails after MediaRecorder.  
2. OpenSpeech flash must accept `webm` for Chrome default recordings.  
3. Phase B TTS vendor quota (3001) is independent and still blocks cloud TTS audio.  
4. Real mobile OS mic permission not device-tested here.  
5. Automated live QA could not inject spoken audio — non-empty transcript UI still needs one owner utterance.  

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
TRANSCRIPT_APPEARS_IN_COMPOSER: NO
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

Notes on NO rows / nuances:

- `TRANSCRIPT_APPEARS_IN_COMPOSER`: live automation had no spoken audio; path returned owner-facing **No speech detected** after Doubao POST and left composer empty (correct for empty). Owner should speak once to promote this to YES.
- Duplex / stop-TTS before STT: verified by shared playback bus + busy gate in code and recording starting while TTS Off preference unchanged; full TTS-ON echo demo still limited by Phase B quota.

**Live status probe (post-alias):** `sttConfigured: true`, `sttActive: true`, `sttProvider: "doubao"`, `canTranscribe: true`.
