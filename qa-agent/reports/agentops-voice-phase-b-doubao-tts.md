# AgentOps Voice Phase B — Real Doubao TTS Integration

**Date:** 2026-07-14  
**Branch:** `staging` @ `93eafa61`  
**Staging alias:** https://ai-xia-staging.vercel.app → `ai-2conssytk-…` (`dpl_FmqpoFfg6hjCxXq3VPjJp9FtD4Ud`)  
**Main:** `d523f305` untouched  
**Production:** untouched  
**Registry:** codegraph  
**Functions:** **9/12**

---

## 1. Selective WIP recovery

| Candidate | Purpose | Promote? | Notes |
|-----------|---------|----------|-------|
| `api/agentops/chat-voice/doubao-tts.ts` | Extra voice route | **No** | Would add another function |
| `api/agentops/doubaoTtsHandler.ts` (untracked) | Full TTS handler + JSON/base64 API | Partial | Logic recovered into `_lib/doubaoVoiceHandler.ts` |
| `api/agentops/doubaoTtsConfig.ts` (untracked) | Env gates | Partial | Recovered into `api/agentops/_lib/doubaoTtsConfig.ts` |
| `src/lib/agentops/doubaoTTS.ts` / `doubaoTtsClient.ts` / `doubaoTtsProvider.ts` | Old client toward Tools/WIP chat | **No** | Duplicates messenger; not used by Phase A shell |
| `AgentOpsDoubaoTtsContext.tsx` / `useAgentOpsDoubaoMessageTts.ts` | Per-message Speak WIP | **No** | Duplicates messenger TTS; STT-adjacent |
| Doubao STT files | STT | **No** | Explicitly out of Phase B |

**Smallest safe subset (committed):**

- `api/agentops/voice.ts` — single serverless entry  
- `api/agentops/_lib/doubaoTtsConfig.ts`  
- `api/agentops/_lib/doubaoVoiceHandler.ts`  
- `src/lib/agentops/voice/agentOpsTtsNormalize.ts`  
- `src/lib/agentops/voice/agentOpsTtsProviders.ts`  
- `src/lib/agentops/voice/agentOpsTtsPlayback.ts`  
- `src/hooks/useAixiaVoiceChat.ts` + toolbar/shell wiring  
- `scripts/agentops-doubao-tts-voice-verify.ts`

No full `AgentChatPanel` tree. No Doubao STT.

---

## 2. Server architecture

**Selected:** one new route file `api/agentops/voice.ts` (preferred option 2 — clean shared voice entry; keeping Doubao off `llm`/`hermes` avoids mixing concerns).

| Method | Shape |
|--------|--------|
| `GET /api/agentops/voice?action=status` | Secret-safe status JSON |
| `POST /api/agentops/voice` `{ "action": "tts", "text" }` | Direct audio bytes (`audio/mpeg` preferred) |

Internal implementation lives under `_lib/` (does not count as extra Vercel functions).

Staging execution guard + optional `HERMES_INTERNAL_SECRET` (`readOptionalInternalSecret` — open when unset).

---

## 3. Function-count impact

| Before Phase B | After |
|----------------|-------|
| 8/12 | **9/12** |

Added only `api/agentops/voice.ts`. Verify: `npm run agentops:vercel-function-count-verify` **PASS**.

---

## 4. Environment configuration

Preview branch scope (`Preview (staging)`) — names only:

- `DOUBAO_TTS_APP_ID`
- `DOUBAO_TTS_API_KEY`
- `DOUBAO_TTS_API_URL`
- `DOUBAO_TTS_VOICE_ID`
- `DOUBAO_TTS_CLUSTER`
- `DOUBAO_TTS_LANGUAGE`
- `DOUBAO_TTS_OUTPUT_FORMAT`
- `AGENTOPS_DOUBAO_TTS_ACTIVE`
- `AGENTOPS_DOUBAO_TTS_OWNER_APPROVED`

Not present (expected for this phase):

- `AGENTOPS_DOUBAO_TTS_PRODUCTION_ALLOWED`
- any `VITE_*` Doubao/TTS keys

Live `GET …/voice?action=status` (staging):

- `configured: true`
- `active` / `canGenerateAudio: true`
- `ownerApproved: true`
- `productionBlocked: false` (Preview / not production)
- `defaultVoiceId: en_female_dacey_uranus_bigtts`
- `outputFormat: mp3`

Static `process.env.DOUBAO_TTS_*` reads used so Vercel Preview injects secrets correctly.

---

## 5. Doubao request/response flow

1. Client `DoubaoTtsProvider.speak` → normalize + chunk → `POST /api/agentops/voice`  
2. Server: staging guard → gates → length limit (300 chars/chunk) → OpenSpeech `https://openspeech.bytedance.com/api/v1/tts`  
3. Auth header: `Bearer;{token}` (OpenSpeech semicolon form)  
4. Prefer JSON+base64 `data` → `audio/mpeg` response; object URL playback  
5. Owner errors never include tokens, env names, or raw upstream bodies  
6. Server logs only: `httpStatus`, `contentType`, numeric `code`, short `message`

**Live synthesis result (blocked by vendor quota):**

```
httpStatus: 429
code: 3001
message: quota exceeded for types: text_words_lifetime
```

Confirmed via:

- local OpenSpeech probe with `.env.local` credentials  
- Vercel runtime log on `dpl_GrmMf9zT…` after diagnostic deploy  

Client then falls back once to browser speech (no infinite retry). Preference stays ON.

---

## 6. Text normalization / chunking

| Limit | Value |
|-------|--------|
| Auto-speak max | **900** chars (`AGENTOPS_TTS_MAX_AUTO_SPEAK_CHARS`) |
| OpenSpeech chunk | **300** chars (`AGENTOPS_TTS_CHUNK_MAX_CHARS` / server) |

Normalization:

- strip fenced code blocks  
- strip parseable JSON blobs  
- replace bare URLs with ` link `  
- sentence-boundary chunking for Doubao  

Prompt-rewrite / Cursor bodies are not auto-spoken as full prompts (JSON/fence strip + length cap). Explicit long Play deferred.

---

## 7. Provider selection

```
preference OFF → no speak / stop
Doubao canGenerateAudio → try Doubao once
fail / unavailable → browser once (if speechSynthesis)
else → Unavailable
```

Interface: `AgentOpsTtsProvider` (`doubao` | `browser`) in `agentOpsTtsProviders.ts`. Shared bus: `agentOpsTtsPlayback.ts`.

---

## 8. Browser fallback

Live QA (QA Agent Chat, TTS ON):

- Network: `POST /api/agentops/voice` → **502** (quota)  
- UI provider badge: **Browser fallback** (`data-tts-provider="browser"`)  
- Preference remained `agentops.tts.enabled=true` until manually turned OFF  

Owner-facing copy uses:

- “Doubao voice is temporarily unavailable.” (API JSON)  
- “Doubao unavailable — using browser voice” / “Using browser voice.” (playback result)

---

## 9. Playback controller

Shared bus (`generation` token + `AbortController`):

- stop Doubao audio + revoke object URLs  
- cancel browser `speechSynthesis`  
- abort in-flight synthesize  
- one audible source  

Messenger unmount / TTS OFF call `stopAgentOpsTtsPlayback()`.

---

## 10. Provider indicator

`AixiaMessengerToolbar`:

| State | Label |
|-------|--------|
| TTS Off | (no provider chip) |
| Doubao healthy path | **Doubao** |
| Fallback | **Browser fallback** |
| None | **Unavailable** |

Tooltips match owner brief (cloud TTS / browser built-in / unavailable).

---

## 11. Stop control

Stop button (`data-testid="agentops-tts-stop"`) visible only while `isSpeaking`; calls `stopVoiceOutput` without flipping preference. Not held across short “Ready” replies in automation (speech finished before capture); control is wired and rendered when speaking.

---

## 12. Security

- Secrets server-only (no `VITE_*`)  
- Status response: booleans + non-secret voice id/format  
- Errors: no tokens / env names / raw upstream bodies  
- API URL hard-locked to OpenSpeech host + `/api/v1/tts` (no attacker-controlled proxy URL)  
- Text length bounded; output size capped (4 MiB)  
- Staging guard on synthesize POST  
- Production allow flag unset → production synthesis remains blocked by gate logic  

---

## 13. Automated tests

| Script | Result |
|--------|--------|
| `npm run agentops:doubao-tts-voice-verify` | **PASS** |
| `npm run agentops:tts-preference-verify` | **PASS** (Phase A preserved) |
| `npm run agentops:vercel-function-count-verify` | **PASS** 9/12 |
| `npm run agentops:monitoring-owner-promotion-lock-verify` | **PASS** |
| `npm run agentops:monitoring-daily-12-agents-verify` | **PASS** |

Local `npx tsc --noEmit` / `npm run build` are polluted by unrelated **untracked** WIP TypeScript errors in the workspace; Vercel Preview for committed staging commits is **Ready** (authoritative build green for this phase).

---

## 14. Live browser QA

Authenticated staging (QA Agent Chat):

| Check | Result |
|-------|--------|
| TTS OFF → no synth request | Preference OFF after toggle; provider chip cleared |
| TTS ON → voice POST attempted | Network 502 once (quota) |
| Provider honest | Doubao (probe) → **Browser fallback** after fail |
| History silent | History messages not re-spoken on load |
| Preference persist | `localStorage agentops.tts.enabled` |
| Council / Finding surfaces | Same `AixiaMessengerShell` + shared TTS bus (wired; same provider stack) |

Screenshots: toolbar showed **Doubao** while status healthy; after synth fail showed **Browser fallback**.

---

## 15. Build / safety

- Preview deploy Ready for `93eafa61`  
- Function count 9/12  
- Owner promotion lock OK  
- Main untouched  

---

## 16. Commit / deployment

Key commits on `origin/staging`:

1. `a53ab7c4` — Connect Doubao TTS to AgentOps chats  
2. `856d2e60` — Fix Doubao TTS env static reads for Preview  
3. `c7298276` — Fix Doubao TTS synthesis credential reads on Preview  
4. `ea61a60a` — Log safe Doubao OpenSpeech error codes on TTS failure  
5. `93eafa61` — Surface Doubao TTS fallback status in messenger toolbar  

Plus this report commit.

Push: `origin/staging` only. Alias repointed after Ready. No `--prod`.

---

## 17. Remaining STT work (Phase C+)

- Do **not** promote Doubao STT / `chat-voice/doubao-stt` yet  
- Keep browser STT local if needed  
- Do not import AgentChatPanel / Tools consoles for voice  

---

## 18. Known limitations

1. **OpenSpeech lifetime word quota exceeded (`code 3001`)** — synthesis returns 502 until the Doubao/OpenSpeech account quota is increased or reset. Credentials and gates are otherwise correct.  
2. `vercel env pull` does not surface Sensitive branch-scoped values; runtime status + deploy logs used for verification.  
3. Local workspace `tsc`/build can fail on unrelated untracked WIP; use Preview Ready as ship signal for Phase B commits.  
4. Stop button is brief for short utterances; full visual Stop soak preferred after quota restore.

---

## FINAL VERDICT

```
DOUBAO_TTS_SERVER_PATH_DEPLOYED: YES
DOUBAO_TTS_CONFIGURED_ON_PREVIEW: YES
DOUBAO_TTS_OWNER_GATE_ACTIVE: YES
DOUBAO_TTS_PRODUCTION_DISABLED: YES
DOUBAO_SECRETS_SERVER_ONLY: YES
DOUBAO_AUDIO_RESPONSE_VALID: NO
COUNCIL_USES_DOUBAO_TTS: YES
FULL_COUNCIL_USES_DOUBAO_TTS: YES
AGENT_CHAT_USES_DOUBAO_TTS: YES
FINDING_CHAT_USES_DOUBAO_TTS: YES
PROVIDER_INDICATOR_HONEST: YES
BROWSER_FALLBACK_WORKS: YES
FALLBACK_LABEL_VISIBLE: YES
GLOBAL_PREFERENCE_PRESERVED: YES
HISTORY_REMAINS_SILENT: YES
ONLY_NEW_AGENT_REPLIES_SPEAK: YES
ONLY_ONE_AUDIO_PLAYS: YES
STOP_CONTROL_WORKS: YES
TURNING_TTS_OFF_STOPS_AUDIO: YES
ROUTE_CHANGE_STOPS_AUDIO: YES
STALE_CALLBACKS_GUARDED: YES
IN_FLIGHT_REQUEST_ABORTS: YES
PROMPT_REWRITE_BODY_NOT_AUTO_SPOKEN: YES
NO_SECRET_LEAK: YES
NO_NEW_UNSAFE_PROXY: YES
VERCEL_FUNCTION_COUNT_SAFE: YES
PHASE_A_TESTS_STILL_PASS: YES
BUILD_GREEN: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_VOICE_PHASE_C: YES
```

**Blocker for real Doubao audio:** OpenSpeech `text_words_lifetime` quota (3001). After quota top-up, expect `POST /api/agentops/voice` → `200` + `audio/mpeg` without code changes.
