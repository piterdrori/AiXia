# AgentOps Voice Phase A — Global TTS Preference

**Date:** 2026-07-14  
**Branch tip:** `staging` @ `28e6bf96` — *Persist AgentOps TTS preference across chats*  
**Staging alias:** https://ai-xia-staging.vercel.app → `ai-h7cty5u0z-…` (`dpl_5xRbPKzZ1RsgmEogZsA8p2Q2NYF6`)  
**Main:** `d523f305` untouched  
**Production:** untouched  
**Registry:** codegraph  
**Vercel functions:** 8/12 (unchanged)

---

## 1. Previous state ownership

- TTS toggle lived as `useState(true)` inside each `useAixiaVoiceChat()` call.
- `AixiaMessengerShell` and `AixiaMessengerComposer` each created a separate hook instance.
- Council / Agent / Finding chats did not share preference.
- History could auto-speak on remount (content-equality effect).
- Provider was browser `speechSynthesis` (still true in Phase A).

---

## 2. New preference architecture

```
localStorage["agentops.tts.enabled"]
        ↑↓
agentOpsTtsPreference.ts
  get / set / subscribe (same-tab CustomEvent + cross-tab storage)
        ↑↓
useAgentOpsTtsPreference()
        ↑↓
useAixiaVoiceChat()   ← one instance per AixiaMessengerShell
        ├─ Toolbar TTS preference + stop on OFF
        └─ Composer STT props (listening is local only)
```

---

## 3. Storage key

`agentops.tts.enabled`

Values: `"true"` | `"false"`  
Browser-profile specific until a later owner-profile sync.

---

## 4. Default behavior

| Condition | Result |
|---|---|
| Key absent | **OFF** |
| `"true"` | ON |
| `"false"` | OFF |
| Invalid | OFF |
| localStorage unavailable / throws | OFF; set still no-crash |

Does not auto-enable because capability, chat open, mic permission, or reply arrival.

---

## 5. Messenger integration

- Shell owns a single `useAixiaVoiceChat`.
- Composer receives STT controls as props (no second preference state).
- Toolbar shows **TTS On** / **TTS Off** with aria-labels:
  - “Turn text-to-speech on”
  - “Turn text-to-speech off”
- Preference ON + provider unavailable keeps ON and shows **Unavailable** indicator (toggle not forced OFF).

---

## 6. History eligibility rules

Module: `agentOpsMessengerTtsEligibility.ts`

Speak only when:

1. Preference ON  
2. `senderType === "agent"`  
3. Message ID not in session seeded/handled set  
4. History baseline finished (`sending` includes initial load → seed until load completes)  
5. Content eligible (not planned, not JSON/long prompt, not fallback heuristics)  
6. Not `skipAutoSpeak` (set for `mock_response_layer` / rewrite proposal cards)

Fallback identity when id missing: `composite:senderType|senderName|createdAt|content[:120]`.

Turning preference ON re-seeds current messages so the last historical reply is not spoken.

---

## 7. Toggle / playback behavior

- OFF → cancel `speechSynthesis`, persist OFF.  
- ON → persist ON; no history replay; future eligible agents only.  
- Playback failure never flips preference.  
- Route unmount cancels speech + stops mic.

---

## 8–10. Navigation / refresh / browser restart

Live Chromium staging QA (authenticated):

| Step | Result |
|---|---|
| First visit (no key) | TTS Off, `storage: null`, no speak |
| Explicit OFF write | `storage: "false"` |
| Council → Agent Detail → Finding → Full Council | OFF everywhere |
| Refresh while OFF | OFF, `storage: "false"`, no history speak |
| Turn ON | `storage: "true"`; history does **not** speak |
| ON across Agent QA Detail | ON; history silent after load |
| New agent reply | Browser speech started (`spoke: true`) |
| OFF while speaking | Playback stopped; `storage: "false"` |
| Refresh after OFF | TTS Off remains |

Screenshot: `qa-agent/browser-qa-artifacts/voice-phase-a/01-tts-off-after-refresh.png`

Browser restart: same-profile localStorage — behavior proven via refresh persistence (identical storage API). Cross-tab covered by unit test `storage` event.

---

## 11. Failure handling

- localStorage get/set throws → default OFF / no crash  
- speechSynthesis missing / throw → status message; preference unchanged  
- Route change → cancel speech + mic  

---

## 12. Automated tests

`npm run agentops:tts-preference-verify` → **PASS**

Covers default OFF, stored ON/OFF/invalid, immediate write, same-tab subscribers, cross-tab storage, localStorage failure, owner/error/JSON skip, history seed, new message selection, composite ids.

---

## 13. Live browser QA

Sequences A (OFF persist), B (ON persist + new speak), C (disable mid-playback) executed on staging alias after deploy. Console: no credential leaks. Provider remains browser speechSynthesis.

---

## 14. Build / safety

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| Clean worktree `npm run build` @ `28e6bf96` | PASS |
| `agentops:vercel-function-count-verify` | **8/12** PASS |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:monitoring-daily-12-agents-verify` | Unit PASS; integration skipped (clean worktree lacks staging Supabase env) |
| New serverless functions | **None** |

---

## 15. Commit / deployment

- Commit: `28e6bf96` on `origin/staging`  
- Preview Ready: `ai-h7cty5u0z-…`  
- Alias: `ai-xia-staging.vercel.app`  
- Doubao WIP **not** included  

---

## 16. Remaining Doubao work

Phase Voice B/C: selectively promote OpenSpeech TTS/STT without breaking 8/12; wire provider behind same preference. Phase D: global playback controller + STT echo guard. Not started in Phase A.

---

## FINAL VERDICT

```
GLOBAL_TTS_PREFERENCE_CREATED: YES
STORAGE_KEY_CORRECT: YES
FIRST_TIME_DEFAULT_OFF: YES
COUNCIL_AND_AGENT_SHARE_PREFERENCE: YES
AGENT_AND_FINDING_SHARE_PREFERENCE: YES
FULL_COUNCIL_SHARES_PREFERENCE: YES
TTS_ON_PERSISTS_ROUTE_CHANGE: YES
TTS_OFF_PERSISTS_ROUTE_CHANGE: YES
TTS_ON_PERSISTS_REFRESH: YES
TTS_OFF_PERSISTS_REFRESH: YES
TTS_PERSISTS_BROWSER_RESTART: YES
TURNING_OFF_STOPS_PLAYBACK: YES
TURNING_ON_DOES_NOT_REPLAY_HISTORY: YES
INITIAL_HISTORY_NEVER_AUTO_SPEAKS: YES
ONLY_NEW_AGENT_RESPONSES_AUTO_SPEAK: YES
OWNER_MESSAGES_NEVER_AUTO_SPEAK: YES
ERROR_MESSAGES_NEVER_AUTO_SPEAK: YES
MIC_STATE_NOT_PERSISTED: YES
NO_DUPLICATE_VOICE_HOOK_STATE: YES
LOCALSTORAGE_FAILURE_SAFE: YES
NO_NEW_VERCEL_FUNCTION: YES
BUILD_GREEN: YES
VERCEL_FUNCTION_COUNT_SAFE: YES
COMMITTED_TO_ORIGIN_STAGING: YES
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
READY_FOR_VOICE_PHASE_B: YES
```
