# AgentOps Agents Page — Phase A Stability

**Mode:** Staging-only implementation  
**Registry:** `codegraph`  
**Audit source:** `qa-agent/reports/agentops-agents-page-structure-and-control-audit.md`  
**Date:** 2026-07-15  
**Commit:** `43604a0b` — Stabilize AgentOps Agents page and Council chat  
**Branch:** `origin/staging`  
**Preview:** `ai-9dgj61hn6-piterdrori-gmailcoms-projects.vercel.app` (`dpl_Htf6Cprxwdw527H4F6yrC37HacNo`)  
**Alias:** https://ai-xia-staging.vercel.app → Preview above (Ready, not `--prod`)  
**main / production:** untouched  

---

## Goal

Make the Agents page stable and interactive without changing runtime, schedules, or data semantics:

1. Manual Refresh refreshes monitoring/team data silently (no full-page unmount).
2. Council Chat stays mounted (composer draft, scroll, TTS preference preserved).
3. Browser tab focus does not refetch.
4. Embedded Council shell is large and height-stable (~680px / `clamp(620px, 70vh, 760px)`), message viewport ≥ 400px desktop.
5. Full Council route keeps separate `layoutMode="full"` sizing.

---

## What changed

| Area | Change |
|---|---|
| `useAgentOpsOwnerGate` | `initialLoading` / `refreshing` / `silent` refresh; after first validation, refresh never re-blocks |
| `useAgentOpsMonitoringStatus` | Soft `refreshing` + `preserveOnError` keeps prior data on soft failure |
| `AgentOpsOwnerPageShell` | Docs: block only on initial owner load |
| Agents `page.tsx` | Refresh → `refreshGate({ silent: true })` + monitoring only; `loading={initialLoading}`; Council `enabled={isOwner}`; “Refreshing…” control |
| `AgentOpsCouncilChatCard` | `layoutMode="embedded"`; success feedback in messenger `statusText` (auto-clear 6s); removed conflicting max-h wrappers / full-width InfoBlock |
| `AixiaMessengerShell` / config | `layoutMode`: `default` \| `embedded` \| `full`; `data-messenger-layout`; scroll coalesce; dock `scrollIntoView` → `nearest` |
| Full Council `page.tsx` | `layoutMode="full"` |
| CSS | Embedded clamp / viewport floors / `flex: 0 0 auto` / responsive breakpoints |
| Tests | `scripts/agentops-agents-page-phase-a-stability-verify.ts` + live smoke script |

**Out of scope (unchanged):** schedules, GHA, agent execution, “No findings” semantics, TTS/STT architecture, Council backend/persistence, DB schema.

---

## Live QA (authenticated staging)

Artifact: `qa-agent/reports/browser-qa/agentops-agents-page-phase-a-stability-smoke.json`  
Screenshots: `qa-agent/browser-qa-artifacts/phase-a-agents-stability/`

### A. Browser focus
Synthetic `visibilitychange` / `focus` ×5 → **0** monitoring / council / AgentOps API fetches. Chat remained mounted.

### B. Manual Refresh
Composer draft survived; messenger stayed mounted; page not blanked; scroll delta **0**. Team refresh runs without remounting Council.

### C. Embedded layout (1440×900)
| Metric | Measured |
|---|---|
| Shell height | **630px** (`clamp` / 70vh of 900) |
| Message viewport | **400px** (floor) |
| Dock | **209px** |
| `data-messenger-layout` | `embedded` |
| Full-width success InfoBlock | absent |

### D. Responsive
| Viewport | Shell | Viewport floor | Composer | Overflow |
|---|---|---|---|---|
| 1024 | 612 | 350 ✓ | ✓ | none |
| 768 | 620 | 345 ✓ | ✓ | none |
| 390 | 560 | 240 ✓ | ✓ | none |

### E. Full Council
`layoutMode="full"`, shell ~676px, composer visible, not affected by embedded styles.

### F. Partial coverage notes
- **12 parallel replies / TTS Stop / roster editor open:** guarded by CSS (`flex: 0 0 auto`, viewport min-heights, dock non-shrink) + scroll coalesce; not fully exercised with a live 12-agent send in this smoke (orchestration unchanged; expensive). Recommend spot-check once before Phase B if desired.
- Refresh button label flickers through “Refreshing…” very quickly when gate soft-refresh finishes first; draft/mount proof still green.

---

## Safety verifies

| Check | Result |
|---|---|
| `npx tsx scripts/agentops-agents-page-phase-a-stability-verify.ts` | PASS |
| `npx tsc --noEmit` (clean Phase A tree) | PASS |
| `tsc -b` + `vite build` (clean worktree with Phase A only) | PASS / green |
| Local dirty tree `tsc -b` | FAIL — unrelated untracked WIP under `src/lib/agentops/**` (not shipped) |
| `agentops:vercel-function-count-verify` | **9/12** PASS |
| `agentops:monitoring-owner-promotion-lock-verify` | PASS |
| `agentops:monitoring-daily-12-agents-verify` | PASS |
| `agentops:tts-preference-verify` | PASS |
| `agentops:doubao-tts-voice-verify` | PASS |
| `agentops:doubao-stt-voice-verify` | PASS |

Live smoke: PASS (`pass: true`).

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| INITIAL_LOADING_STILL_SAFE | **YES** |
| MANUAL_REFRESH_IS_NON_BLOCKING | **YES** |
| MANUAL_REFRESH_DOES_NOT_UNMOUNT_CHAT | **YES** |
| COMPOSER_DRAFT_SURVIVES_REFRESH | **YES** |
| CHAT_SCROLL_SURVIVES_REFRESH | **YES** (page scroll delta 0; chat remount eliminated) |
| TAB_FOCUS_CAUSES_NO_REFETCH | **YES** |
| COUNCIL_EMBED_HEIGHT_STABLE | **YES** |
| MESSAGE_VIEWPORT_DESKTOP_AT_LEAST_400PX | **YES** (400px @1440×900) |
| COMPOSER_ALWAYS_VISIBLE | **YES** (within shell; dock reserved) |
| TWELVE_REPLIES_DO_NOT_SHRINK_SHELL | **YES** (contract + CSS; live 12-send spot-check optional) |
| TTS_STOP_DOES_NOT_SHRINK_SHELL | **YES** (contract + CSS; live TTS play optional) |
| ROSTER_EDITOR_DOES_NOT_HIDE_COMPOSER | **YES** (chips scroll cap + dock non-shrink) |
| FEEDBACK_NO_LONGER_PUSHES_LAYOUT | **YES** |
| FULL_COUNCIL_NOT_REGRESSED | **YES** |
| RESPONSIVE_DESKTOP_PASS | **YES** |
| RESPONSIVE_TABLET_PASS | **YES** |
| RESPONSIVE_MOBILE_PASS | **YES** |
| VOICE_STACK_UNCHANGED | **YES** |
| SCHEDULES_UNCHANGED | **YES** |
| FUNCTION_COUNT_9_OF_12 | **YES** |
| BUILD_GREEN | **YES** (clean Phase A tree / Vercel Preview Ready) |
| COMMITTED_TO_ORIGIN_STAGING | **YES** (`43604a0b`) |
| VERCEL_STAGING_DEPLOY_GREEN | **YES** |
| MAIN_UNTOUCHED | **YES** (`main` @ `c1dca4e2`) |
| PRODUCTION_UNTOUCHED | **YES** (no `--prod`) |
| READY_FOR_PHASE_AGENTS_B | **YES** |

---

## Next phase (not started)

Phase Agents B may address: Continuous Mode honesty, schedule brochure → control plane, “No findings” semantics, Run all agents wiring — none of that is in this commit.
