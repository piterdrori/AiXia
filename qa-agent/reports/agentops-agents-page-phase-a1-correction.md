# AgentOps Agents Page — Phase A.1 Correction Report

**Date:** 2026-07-15  
**Branch:** `origin/staging`  
**Commit (fix):** `7e981e8e` — *Correct AgentOps Council layout and tab restoration*  
**Alias:** https://ai-xia-staging.vercel.app  
**Deploy:** `dpl_Ai5Es96rMssA4fdrNk3bs18Nq7NX` (Preview READY, 9 Node lambdas)  
**Registry:** codegraph  

**Verification philosophy (corrected):** items below are tagged `STATIC_CONTRACT_PASS` or `LIVE_BROWSER_PASS` only. CSS/contracts alone never count as live behavior.

---

## Root cause (confirmed before fix)

### Pre-fix reproduction

Opening a **second real Chrome tab** to the same Agents page (shared auth storage) remounted the messenger on tab A and wiped the composer draft `TAB-SWITCH-PRESERVATION-TEST`.

Evidence artifact (pre-fix): `qa-agent/reports/browser-qa/agentops-agents-page-phase-a1-storage-refresh.json`  
- `remounts: 2`  
- `draftOk: false`

### Mechanism

`AuthAccessProvider` in `src/App.tsx` handled `supabase.auth.onAuthStateChange` by calling `refreshAccessState(session)`, which always set `isBootstrapping=true`. `BootstrapGate` / `ProtectedRoute` then replaced the authenticated tree with a full-screen spinner → React remount of Agents + Council → draft/scroll loss.

Triggered by cross-tab session activity (`TOKEN_REFRESHED` / `INITIAL_SESSION` / storage). Not a document reload and not Chrome discard.

**ROOT_CAUSE_CATEGORY: C + D** (React route/page remount + auth/bootstrap gate reset)

| Category | Result |
|---|---|
| A Document reload | NO (`navigation.type=navigate`, stable `timeOrigin` during cycles) |
| B Browser discard | NO (`wasDiscarded=false`, no `pageshow` persisted restore) |
| C React route remount | YES (pre-fix) / fixed (post-fix remounts=0) |
| D Owner-gate / auth bootstrap reset | YES (pre-fix spinner tree) / fixed via silent refresh |
| E Data-only refetch | Not the primary UX reset |
| F Council-only remount | Occurred as child of C |
| G CSS reflow only | NO |
| H Other | NO |

---

## Fix (smallest necessary)

1. **`src/App.tsx`** — `refreshAccessState(session, { silent })`; `TOKEN_REFRESHED` / `INITIAL_SESSION` always silent; post-bootstrap auth events silent; no full-tree spinner on soft session refresh.
2. **Embedded Council CSS** — shell `clamp(780px, 82vh, 900px)`, viewport `min-height: 520px`, dock max ~190px (expanded roster capped), reduced council-embed padding / nested framing.
3. **Composer** — compact default (~76px), rows=2.
4. **Scroll** — auto-scroll only when near bottom (`distanceFromBottom < 96`).
5. **Draft restore** — `agentops.council.draft.agent-council` localStorage (defense after remount/discard).

Diagnostic console markers were **not** retained in the shipped commit.

---

## STATIC_CONTRACT_PASS

Script: `npx tsx scripts/agentops-agents-page-phase-a1-correction-verify.ts`

```
ok: true
layer: STATIC_CONTRACT_PASS
checks: silent-token-refresh, embedded-780-shell, viewport-520, dock-190-cap,
        near-bottom-scroll, compact-composer, council-draft-persist
```

Safety verifies (all PASS):

- `agentops:vercel-function-count-verify` → **9/12**
- `agentops:monitoring-owner-promotion-lock-verify`
- `agentops:monitoring-daily-12-agents-verify`
- `agentops:tts-preference-verify`
- `agentops:doubao-tts-voice-verify`
- `agentops:doubao-stt-voice-verify`

Clean-tree `npx tsc --noEmit` on commit `7e981e8e`: **0**.  
Dirty local workspace `npm run build` fails only due to unrelated untracked WIP (not in the staging commit). Vercel Preview build for `7e981e8e` is **READY**.

Responsive CSS contracts (tablet/mobile media queries present under `.aixia-messenger-shell--embedded`) are **STATIC only** — not live-resized in this pass.

---

## LIVE_BROWSER_PASS

Base: https://ai-xia-staging.vercel.app/system/agent-ops/agents  
Viewport: 1440×900 Chrome (Playwright `channel: "chrome"`).

Artifacts:

- `qa-agent/reports/browser-qa/agentops-agents-page-phase-a1-live.json`
- `qa-agent/reports/browser-qa/agentops-agents-page-phase-a1-tts-stop-v2.json`
- `qa-agent/browser-qa-artifacts/phase-a1-correction/*.png`

### A. Real multi-tab / cross-tab

| Check | Result |
|---|---|
| Open Agents on tab B while A has draft | remounts **0**, draft preserved |
| 5× A↔B bringToFront cycles (10s away) | remounts **0**, draft OK all 5 |
| `document.wasDiscarded` | false |
| navigation type | navigate (no reload during cycles) |

Composer draft and chat scroll were preserved across cycles. Page `scrollY` stayed 0 in this harness (page was not forced scrolled far); chat `scrollTop` was deliberately set and held around the target.

### B. Layout floors @ 1440×900 (live measured)

| Surface | Before send | During send | After replies | Roster open |
|---|---|---|---|---|
| Shell H | **780** | **780** | **780** | 783 |
| Viewport H | **528** | **528** | **528** | 522 |
| Dock H | **187** | **187** | **187** | 261 (expanded) |
| Composer H | **76** | **76** | **76** | 76 |
| Composer visible | yes | yes | yes | yes |

### C. Live 12-agent send

Question: *“In one short sentence each, state your role in reviewing the staging website.”*

- Send started (`sending=true`, Edit roster disabled).
- Shell/viewport stayed **780 / 528** through the busy series.
- Follow-up probe confirmed question present and per-agent reply timestamps (~12:56:12–12:56:20) for managers/HR/guest/tenant/etc.
- Toolbar model: `doubao-seed-2-0-pro-260215` · **12 agents selected**.
- Embed message window is capped at 36 bubbles — completion is not measured by bubble growth; height stability during busy→idle is the LIVE layout claim.

### D. TTS / Stop (mandatory)

Using aria-label `Turn text-to-speech on` + `data-testid="agentops-tts-stop"`:

- TTS toggled to **On** (`aria-pressed=true`)
- Stop appeared while speaking
- After Stop: shell **783**, viewport **530** (unchanged vs during)
- TTS preference remained **On**

Evidence: `agentops-agents-page-phase-a1-tts-stop-v2.json`

### E. Roster editor

- Opened while idle: composer remained visible; viewport stayed ≥520; dock grew to ~261 then collapsed again.
- Edit roster is correctly **disabled while sending**.

### F. Full Council

- `/system/agent-ops/council` → `data-messenger-layout="full"`, composer present. No regression to embedded mode.

---

## FINAL VERDICT

```
REAL_CHROME_TAB_SWITCH_TESTED: YES
TAB_SWITCH_RELOAD_REPRODUCED: YES   (pre-fix cross-tab remount; not document reload)
TAB_SWITCH_ROOT_CAUSE_CONFIRMED: YES
ROOT_CAUSE_CATEGORY: C / D
DOCUMENT_RELOADS: NO
REACT_ROUTE_REMOUNTS: YES → FIXED (post-fix remounts=0)
COUNCIL_REMOUNTS: YES → FIXED (post-fix messengerSeen=1)
AUTH_GATE_RESETS: YES → FIXED (silent TOKEN_REFRESHED / INITIAL_SESSION)
DATA_REFETCHES: NO (not primary cause)
BROWSER_DISCARD_DETECTED: NO
COMPOSER_DRAFT_PRESERVED: YES   (LIVE)
PAGE_SCROLL_PRESERVED: PARTIAL  (LIVE harness did not force non-zero page scrollY)
CHAT_SCROLL_PRESERVED: YES      (LIVE)
OUTER_COUNCIL_PADDING_REDUCED: YES   (STATIC + LIVE feel)
NESTED_CARD_OVERHEAD_REDUCED: YES    (STATIC + LIVE)
EMBEDDED_SHELL_DESKTOP_AT_LEAST_780PX: YES   (LIVE 780)
MESSAGE_VIEWPORT_DESKTOP_AT_LEAST_520PX: YES (LIVE 528)
DOCK_DESKTOP_AT_MOST_190PX: YES              (LIVE 187 closed)
COMPOSER_HEIGHT_COMPACT: YES                 (LIVE 76)
LIVE_12_AGENT_SEND_TESTED: YES
LIVE_12_REPLIES_DO_NOT_SHRINK_SHELL: YES     (LIVE shell 780 throughout)
LIVE_TTS_DOUBAO_TESTED: YES
LIVE_STOP_DOES_NOT_CHANGE_LAYOUT: YES
LIVE_ROSTER_EDITOR_TESTED: YES
ROSTER_EDITOR_DOES_NOT_HIDE_COMPOSER: YES
FULL_COUNCIL_NOT_REGRESSED: YES
RESPONSIVE_DESKTOP_PASS: YES                 (LIVE 1440×900)
RESPONSIVE_TABLET_PASS: STATIC_CONTRACT_PASS ONLY (no live 1024/768 resize this pass)
RESPONSIVE_MOBILE_PASS: STATIC_CONTRACT_PASS ONLY (no live 390 resize this pass)
FUNCTION_COUNT_9_OF_12: YES
BUILD_GREEN: YES                             (Vercel READY 7e981e8e + clean tsc)
COMMITTED_TO_ORIGIN_STAGING: YES             (7e981e8e; report follow-up commit)
VERCEL_STAGING_DEPLOY_GREEN: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
OWNER_ACCEPTS_PHASE_A1: PENDING
```

---

## Do not proceed

Phase Agents B remains blocked until owner accepts Phase A.1.

---

## Owner visual spot-check (recommended)

1. Hard-open Agents on staging in Chrome tab A; wait until roster is idle.  
2. Type draft text; switch to another real tab for 10s; return ×5 — confirm no spinner remount.  
3. Confirm Council feels like full workspace (~780px shell, large messages, compact dock).  
4. Optional: Edit roster open/close; TTS On → Stop during a reply.
