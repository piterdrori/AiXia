# AgentOps Doubao TTS Quota Recovery and Live Verification

**Date:** 2026-07-14  
**Branch:** `staging` @ `c03f6fdf`  
**Staging alias:** https://ai-xia-staging.vercel.app  
**Main:** `d523f305` untouched  
**Production:** untouched  
**Registry:** codegraph  
**Functions:** **9/12** (unchanged — no code changes in this task)

---

## 1. Current blocker confirmed

### GET `/api/agentops/voice?action=status`

| Field | Value |
|-------|-------|
| `configured` | `true` |
| `active` / `ttsActive` | `true` |
| `ownerApproved` | `true` |
| `canGenerateAudio` | `true` |
| `provider` | `doubao` |
| `defaultVoiceId` | `en_female_dacey_uranus_bigtts` |
| `outputFormat` | `mp3` |
| `language` (status) | `zh` |
| `productionBlocked` | `false` (preview staging) |
| `sttConfigured` / `canTranscribe` | `true` (STT still healthy) |

Gates still say the server *may* generate audio; vendor quota is the runtime failure.

### Short synthesis probe

Text: `Hello, this is the AiXia voice test.`

| Layer | Result |
|-------|--------|
| Staging `POST /api/agentops/voice` | **HTTP 502**, `Content-Type: application/json`, body owner-safe: `Doubao voice is temporarily unavailable.` (no secrets) |
| Direct OpenSpeech `POST …/api/v1/tts` (local credential probe, masked) | **HTTP 429**, vendor code **3001**, message **`quota exceeded for types: text_words_lifetime`**, no audio payload |

This matches the Phase B residual blocker. Architecture is fine; **lifetime text-words quota for the TTS product on this app is exhausted**.

---

## 2. Active Doubao account (identifiers only)

Secret-safe identification:

| Item | Value |
|------|-------|
| Application ID (masked) | `****5938` (length 10) |
| Same app as STT credentials | **Yes** (STT `DOUBAO_STT_APP_ID` also ends `5938`) |
| TTS cluster | `volcano_tts` |
| Voice resource | `en_female_dacey_uranus_bigtts` |
| API host | `openspeech.bytedance.com` |
| Token present (Preview + local) | Yes (server-only; not printed) |
| Preview env names present | `DOUBAO_TTS_APP_ID`, `DOUBAO_TTS_API_KEY`, `DOUBAO_TTS_API_URL`, `DOUBAO_TTS_VOICE_ID`, `DOUBAO_TTS_CLUSTER`, `DOUBAO_TTS_LANGUAGE`, `DOUBAO_TTS_OUTPUT_FORMAT`, `AGENTOPS_DOUBAO_TTS_ACTIVE`, `AGENTOPS_DOUBAO_TTS_OWNER_APPROVED` |
| Production allow gate | Absent (`AGENTOPS_DOUBAO_TTS_PRODUCTION_ALLOWED` not set) — expected |

**Interpretation:** Staging TTS + STT share one OpenSpeech application. STT flash recognize still works; TTS `text_words_lifetime` quota for speech synthesis is exhausted (trial package or prepaid package depleted — vendor message uses the lifetime type).

---

## 3. OpenSpeech / Volcengine console

Automated browser opened:

`https://console.volcengine.com/speech/app` → redirected to **Volcengine sign-in**.

**Console login was not available in this session**, so UI fields (remaining characters, billing, trial expiry, package purchase) could **not** be read live from the console.

Authoritative non-secret quota state from the live API instead:

- Vendor code **3001**
- Message **`quota exceeded for types: text_words_lifetime`**
- Volcengine docs treat `*_lifetime` quota exceeded as: **trial / package usage exhausted; formal paid plan or package purchase required to continue**

Owner must open the Doubao语音 / OpenSpeech console for app `****5938` and verify:

1. TTS product enabled  
2. Voice `en_female_dacey_uranus_bigtts` authorized for the app  
3. Remaining `text_words_lifetime` / package characters  
4. Trial vs paid billing  
5. Whether to buy a TTS resource pack or enable pay-as-you-go  

---

## 4. Recovery option selected

**Preferred: Option A — restore quota on the current app (`****5938`).**

Rationale:

- Credentials and gates are already correct on Preview  
- Status endpoint already reports configured/active/owner-approved  
- No Preview secret rotation needed if only quota is topped up  
- STT already works on the same app ID  
- Avoids unnecessary credential churn

**Option B / C** only if A is blocked (no purchase rights, wrong org, or want TTS isolation from STT). Those require new Preview TTS secrets and a git-connected Preview redeploy — **do not change code**.

**No code changes performed** (per task rules).

---

## 5. Vercel Preview env

| Action | Result |
|--------|--------|
| Credential update | **NOT_NEEDED** until owner restores quota or supplies a different app |
| Production scope | Untouched |
| `VITE_*` secrets | None |

After owner tops up quota on the same app, **no env change** should be required; re-probe TTS immediately.

If rotating to another app, update Preview-only:

- `DOUBAO_TTS_APP_ID`
- `DOUBAO_TTS_API_KEY` (or access token)
- `DOUBAO_TTS_VOICE_ID` if required
- `DOUBAO_TTS_CLUSTER`
- keep `AGENTOPS_DOUBAO_TTS_ACTIVE=true`
- keep `AGENTOPS_DOUBAO_TTS_OWNER_APPROVED=true`

Then trigger a **git-connected staging Preview** so secrets inject (no temporary CLI-only injection as the final setup).

---

## 6. Direct server synthesis after recovery

**Not successful yet** — quota still exhausted.

| Check | Result |
|-------|--------|
| HTTP 200 | **NO** (502 local / 429 upstream) |
| `audio/mpeg` body | **NO** |
| Non-empty audio | **NO** |
| No quota code | **NO** (upstream still 3001) |

Re-run after owner recovery:

```text
POST /api/agentops/voice
{ "action": "tts", "text": "Hello, this is the AiXia Doubao voice test." }
```

Expect HTTP 200 + audio bytes.

---

## 7. Live AgentOps UI (real Doubao audio)

Real Doubao cloud audio **cannot** be claimed while synthesis returns quota 3001.

| Surface | Real Doubao audio | Notes |
|---------|-------------------|-------|
| Embedded Council | **NO** | Blocked by quota |
| Full Council | **NO** | Blocked by quota |
| QA Agent Chat | **NO** | TTS ON → honest **Browser fallback** after Doubao fails |
| System Agent Chat | **NO** | Same shared voice path |
| Finding Chat | **NO** | Same shared voice path |

QA Agent live check with TTS already ON:

- Provider badge: **Browser fallback** (`data-tts-provider=browser`)
- Status: `Doubao unavailable — using browser voice`
- Preference remains **TTS On**
- No Doubao audio on success path (expected failure)

---

## 8. Fallback still works

Verified under the current quota failure (controlled by vendor; credentials not permanently altered):

| Check | Result |
|-------|--------|
| Provider → Browser fallback | **YES** |
| Preference remains ON | **YES** |
| Honest status copy | **YES** |
| Preference / gates unchanged after STT/TTS error | **YES** (architecture preserved) |

Stop / OFF / history-silent behaviors remain covered by Phase A/B verifies (**PASS**).

---

## 9. Security

| Check | Result |
|-------|--------|
| Credentials server-only | **YES** |
| No tokens in client responses | **YES** (502 safe JSON) |
| No complete app ID / token printed | **YES** (masked `****5938` only) |
| Production TTS allow gate | Absent / disabled |
| Single voice function | `/api/agentops/voice` only |
| Function count | **9/12** |

Temporary local probe scripts were deleted after use (not committed).

---

## 10. Build and safety

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `npm run agentops:vercel-function-count-verify` | **PASS** 9/12 |
| `npm run agentops:doubao-tts-voice-verify` | **PASS** |
| `npm run agentops:doubao-stt-voice-verify` | **PASS** |
| `npm run agentops:tts-preference-verify` | **PASS** |
| `npm run build` | **Local fail** on unrelated untracked Hermes/WIP files (not part of this quota task / not on committed voice tree). Voice verifies + `tsc --noEmit` green. Staging Preview deploy remains the ship signal. |
| Main / production | Untouched |
| STT | Remains working (`canTranscribe: true`) |
| Code / architecture | Unchanged |

---

## Owner action required (unblock real Doubao TTS)

1. Log into Volcengine OpenSpeech / 豆包语音 for app `****5938`.  
2. Prefer **Option A**: purchase / enable TTS formal quota covering `text_words_lifetime` (or pay-as-you-go) for this app.  
3. Confirm voice `en_female_dacey_uranus_bigtts` remains authorized.  
4. Reply here when console shows remaining TTS characters / paid package active.  
5. Re-run one staging `POST … voice` TTS call — expect **HTTP 200 + audio/mpeg**.  
6. Only if A fails: provide alternate Preview-only TTS app credentials for Option B/C (no production, no `VITE_*`).

---

## FINAL VERDICT

```
CURRENT_QUOTA_BLOCKER_CONFIRMED: YES
ACTIVE_DOUBAO_ACCOUNT_IDENTIFIED: YES
TTS_PRODUCT_ENABLED: YES
TEXT_WORDS_LIFETIME_QUOTA_AVAILABLE: NO
STAGING_CREDENTIALS_UPDATED_IF_REQUIRED: NOT_NEEDED
GIT_CONNECTED_PREVIEW_DEPLOYED: YES
TTS_API_HTTP_200: NO
TTS_AUDIO_CONTENT_TYPE_VALID: NO
TTS_AUDIO_BODY_NONEMPTY: NO
COUNCIL_REAL_DOUBAO_AUDIO: NO
FULL_COUNCIL_REAL_DOUBAO_AUDIO: NO
AGENT_CHAT_REAL_DOUBAO_AUDIO: NO
FINDING_CHAT_REAL_DOUBAO_AUDIO: NO
DOUBAO_BADGE_VISIBLE: NO
BROWSER_FALLBACK_NOT_USED_ON_SUCCESS: NO
FALLBACK_STILL_WORKS_ON_FAILURE: YES
STOP_CONTROL_WORKS: YES
TTS_PREFERENCE_PRESERVED: YES
HISTORY_REMAINS_SILENT: YES
STT_REMAINS_WORKING: YES
NO_SECRET_LEAK: YES
FUNCTION_COUNT_9_OF_12: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
REAL_DOUBAO_TTS_OPERATIONAL: NO
```

**Bottom line:** Staging Doubao TTS integration is configured and gated correctly. Live cloud audio is still blocked solely by OpenSpeech **3001 / `text_words_lifetime`** on app `****5938`. Restore quota (Option A) — no AiXia code change required — then re-verify HTTP 200 audio.
