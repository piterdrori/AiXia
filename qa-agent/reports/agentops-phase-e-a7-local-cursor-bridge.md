# AgentOps Phase E-A7 — Local Cursor Bridge for Fix with Cursor

**Date:** 2026-07-22  
**Branch:** `origin/staging` — commits `645890a8` "Add local Cursor bridge for AgentOps issue fixes" · `b7543d20` "Handle Chrome local network access for Cursor bridge"  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/issues/:issue  
**Preview:** `https://ai-i4irgf3pu-piterdrori-gmailcoms-projects.vercel.app` (Ready)  
**Alias:** https://ai-xia-staging.vercel.app → Preview above (not `--prod`)  
**main / production:** untouched  

---

## 1. Summary

Fix with Cursor no longer only downloads a `.md` file. A localhost-only bridge (`npm run agentops:cursor-bridge`) now runs on the owner machine; when the staging page detects it, clicking Fix with Cursor sends the structured prompt to the bridge, the bridge writes it to `.agentops/fix-prompts/` and **launches Cursor with the repo + prompt file**, and the issue becomes Fixing. Live QA proved the full loop: bridge detected → Cursor opened → status Fixing → no download dialog → offline fallback honest.

## 2. Cursor integration audit

| Option | Finding |
|---|---|
| Cursor CLI | `cursor.cmd` 3.5.33 installed (`C:\Program Files\cursor\...\bin`). VS Code-compatible flags: open folder/file, `--goto`, `--reuse-window`. **No flag to auto-start a chat/agent with a prompt.** |
| `cursor://` deeplink | Protocol registered, but no proven prompt-injection deeplink — not used (no fake claims). |
| `cursor-agent` CLI | Not installed on this machine. |
| TaskFlow | "TaskFlow" in this repo is the app's internal branding (localStorage keys); no local command/queue that accepts prompts or opens Cursor. **TASKFLOW_INTEGRATION_AVAILABLE: NO.** |
| Existing localhost bridge pattern | None reusable (`agentops-api-dev-plugin` is Vite dev emulation only). |
| Agent runner consuming prompt files | Staging worker consumes queue jobs, not local Cursor prompts — out of scope. |

Conclusion: `CURSOR_DIRECT_LAUNCH: YES` (open Cursor with repo + prompt file) · `CURSOR_AUTO_FIX_START: NOT_SUPPORTED_BY_CURSOR`.

## 3. Local bridge design

`scripts/agentops-cursor-bridge.mjs` → `npm run agentops:cursor-bridge`

- Binds **127.0.0.1:17876** only (`server.listen(PORT, HOST)`); refuses to start unless the repo checkout is on the **staging** branch
- `GET /health` → `{ ok, service, version, cursorCliAvailable, needsToken, autoFixStart }`
- `POST /fix-issue` → validates, writes `.agentops/fix-prompts/agentops-fix-<issue-id>.md`, launches Cursor CLI with **fixed arguments** (`repo root + prompt file + --reuse-window`), returns `{ accepted, mode, promptFile, cursorLaunched, autoFixStart, reason }`
- Modes: `cursor_cli` (CLI found) · `prompt_file` (CLI missing — honest reason)

## 4. Security model

- Localhost only; Host header must be `127.0.0.1:17876`/`localhost:17876`
- CORS allowlist: `https://ai-xia-staging.vercel.app` + `ai-*-piterdrori-gmailcoms-projects.vercel.app` previews (+ env extras); browser origins outside the list → 403
- **Bridge token required** (`X-Bridge-Token`): auto-generated, printed once at startup, stored in gitignored `.agentops/cursor-bridge-token.txt`; owner pastes it once into the page (localStorage)
- Rejects: `branch !== staging` (400) · non-staging/production `stagingUrl` (400) · issueId outside `[a-zA-Z0-9_-]{1,80}` → path traversal impossible (400) · command-shaped payload keys (`command`/`cmd`/`shell`/`exec`/`args`/`script`) (400) · secret-looking prompts (service_role, sb_secret, storage_state, JWT blobs, private keys) (400)
- No arbitrary shell — the only spawned process is the resolved Cursor CLI with fixed args; prompt writes only inside `.agentops/fix-prompts/`
- Request handler logs issueId + mode only; never tokens or prompt bodies
- `Access-Control-Allow-Private-Network: true` on preflight (Chrome PNA/LNA)

## 5. Bridge behavior

Validated live: prompt file written with the structured template header, Cursor launched (`cursorLaunched: true`), honest `autoFixStart: "not_supported_by_cursor"` — the bridge never pretends Cursor accepted a chat.

## 6. Web UI detection

- Detail page probes `GET /health` on load (`data-testid="agentops-bridge-status"`)
- **Online:** "Local bridge connected · Cursor CLI ready" — click sends to bridge, shows "Cursor opened with this fix prompt.", **no download dialog**
- **Offline:** "Local Cursor bridge is not running." — click opens help panel (`agentops-bridge-help`): Copy bridge command (`npm run agentops:cursor-bridge`), Download prompt, Copy prompt. No auto-download; status unchanged
- **401 from bridge:** inline token input ("Save token and retry"), token persisted in localStorage
- Chrome 138+ **Local Network Access**: fetches declare `targetAddressSpace: "loopback"`; owner must click Allow once when Chrome asks (copy explains this). Headless QA disables the LNA check flag since prompts can't be clicked.

## 7. Owner flow

1. Once per machine: `npm run agentops:cursor-bridge` (prints token; paste once when asked)
2. Open the staging issue → click **Fix with Cursor**
3. Page: Local bridge connected → Cursor opened → Status: Fixing
4. Cursor opens the repo + prompt file; owner runs the fix prompt
5. After verifying on staging → **Mark as fixed** (confirmation + note)

## 8. TaskFlow investigation

No TaskFlow local command/queue exists (branding only). Standalone bridge used. **TASKFLOW_INTEGRATION_USED: NO.**

## 9. Status model

| Situation | Status |
|---|---|
| Bridge unavailable | stays Needs review (live-verified) |
| Bridge accepts + Cursor launched | Fixing — "Cursor opened with this fix prompt." |
| Bridge accepts, CLI missing | Fixing — "Prompt file written locally … waiting for owner/Cursor work." |
| Owner confirms Mark as fixed | Fixed |
| Automatic Browser QA verification | E-A8 follow-up (not pretended) |

Fixed is never set by the bridge.

## 10. Live QA

`qa-agent/scripts/agentops-e-a7-cursor-bridge-live.mjs` — **ok: true**:

- Bridge started; page shows "Local bridge connected · Cursor CLI ready"
- Fix with Cursor → bridge accepted, **Cursor opened**, status **Fixing**, **no download dialog**
- Prompt file written; starts with `AGENTOPS ISSUE FIX — STAGING ONLY`; **no secrets** (service_role/sb_secret/storage_state/JWT/Bearer/cookie scans clean)
- Bridge stopped → page shows not-running copy; click opens fallback panel with Copy bridge command + Download prompt + Copy prompt; **no auto-download**; status stays **Needs review**; manual Download prompt works

Debug journey (documented honestly): first run failed because Chromium 148 blocks loopback fetches from public HTTPS pages (Local Network Access permission). Fixed with `targetAddressSpace: "loopback"`, owner-facing copy, and the QA flag.

## 11. Security QA

| Probe | Result |
|---|---|
| POST without token | 401 |
| Allowlisted-origin bypass (evil origin) | 403 |
| Production URL | 400 |
| branch=main | 400 |
| issueId path traversal | 400 |
| command payload key | 400 |
| secret-looking prompt | 400 (bridge-verify) |
| Non-owner in app | Issues detail stays owner-gated (unchanged E-A3 wiring); decision API 401 anonymously |
| Prompt secrets scan | Clean |
| Token/prompt logging | None in request handler (statically asserted) |

## 12. Verify scripts

- **New** `agentops:cursor-bridge-verify` — static + dynamic (starts bridge on port 17911 with launch skipped; 11 checks) — PASS
- **New** `agentops:issue-fix-cursor-bridge-verify` — UI/client/bridge static contract (12 checks) — PASS
- Updated `agentops:issue-fix-workflow-verify` + `agentops:issues-acceptance-verify` with bridge assertions — PASS

## 13. Safety checks

`tsc --noEmit` · cursor-bridge-verify · issue-fix-cursor-bridge-verify · issue-fix-workflow-verify · issues-verify · issues-acceptance-verify · pre-issues-pages-verify · vercel-function-count-verify (9/12 — the bridge is a local script, no new Vercel function) · monitoring-owner-promotion-lock-verify — **all PASS**. Vercel Preview build used as build gate (local dirty WIP).

## 14. Known limitations

1. **Cursor cannot auto-start a chat/agent from CLI 3.5.x** — Cursor opens with the repo + prompt file; the owner pastes/runs the prompt. `CURSOR_AUTO_FIX_START: NOT_SUPPORTED_BY_CURSOR`.
2. **Chrome asks once for local network permission** (Chrome 138+ LNA) — the owner must click Allow; copy explains this.
3. **One-time token pairing** — owner pastes the printed bridge token once per browser.
4. Bridge serves the repo checkout it was started in and refuses non-staging branches; it does not manage multiple repos.
5. Automatic fix verification (Browser QA before Fixed) is the E-A8 follow-up.

## 15. Final readiness decision

**READY_FOR_OWNER_REVIEW_OF_FIX_WITH_CURSOR: YES**

---

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED | YES |
| PRODUCTION_UNTOUCHED | YES |
| EXISTING_ISSUES_ROUTE_REUSED | YES |
| NEW_FINDINGS_ROUTE_CREATED | NO |
| LOCAL_CURSOR_BRIDGE_CREATED | YES |
| BRIDGE_LOCALHOST_ONLY | YES |
| BRIDGE_AUTH_OR_PAIRING_REQUIRED | YES |
| BRIDGE_REJECTS_UNSAFE_ORIGINS | YES |
| BRIDGE_REJECTS_PRODUCTION | YES |
| BRIDGE_REJECTS_ARBITRARY_COMMANDS | YES |
| BRIDGE_REJECTS_PATH_TRAVERSAL | YES |
| CURSOR_DIRECT_LAUNCH_WORKS | YES |
| CURSOR_AUTO_FIX_START_WORKS | NOT_SUPPORTED_BY_CURSOR |
| CURSOR_OPEN_WITH_PROMPT_FILE_WORKS | YES |
| TASKFLOW_INTEGRATION_USED | NO |
| TASKFLOW_INTEGRATION_AVAILABLE | NO |
| WEB_UI_DETECTS_BRIDGE | YES |
| FIX_WITH_CURSOR_SENDS_TO_BRIDGE | YES |
| NO_DOWNLOAD_DIALOG_WHEN_BRIDGE_ONLINE | YES |
| FALLBACK_DOWNLOAD_COPY_STILL_WORKS | YES |
| FIXING_STATUS_AFTER_BRIDGE_ACCEPT | YES |
| FIXED_REQUIRES_CONFIRMATION | YES |
| PROMPT_HAS_NO_SECRETS | YES |
| SERVICE_ROLE_NOT_EXPOSED | YES |
| STORAGE_STATE_NOT_EXPOSED | YES |
| NON_OWNER_REJECTED | YES |
| NO_AUTO_PRODUCTION_DEPLOY | YES |
| NO_AUTO_PR_CREATION | YES |
| NO_SECRET_LEAKAGE | YES |
| FUNCTION_COUNT_WITHIN_BUDGET | YES (9/12) |
| BUILD_GREEN | YES (Preview build gate) |
| COMMITTED_TO_ORIGIN_STAGING | YES |
| VERCEL_STAGING_DEPLOY_GREEN | YES |
| READY_FOR_OWNER_REVIEW_OF_FIX_WITH_CURSOR | YES |
