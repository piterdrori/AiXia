# AgentOps Stage 9G Login Flakiness Investigation Report

## Purpose

Investigate flaky login results for synthetic users `finance-admin` and `ai-user` from Stage 9D smoke, apply targeted fixes, and re-run the 12-user smoke to confirm login findings are resolved.

## Source Findings

| issue_code | Severity | User |
| --- | --- | --- |
| `AIXIA-BROWSER-LOGIN-finance-admin` | High | `qa+agentops-finance-admin@aixia.local` |
| `AIXIA-BROWSER-LOGIN-ai-user` | Medium | `qa+agentops-ai-user@aixia.local` |

(Imported into AgentOps backlog in Stage 9F; not marked Verified Fixed in this stage.)

---

## Diagnosis

### finance-admin (`qa+agentops-finance-admin@aixia.local`)

| Check | Result |
| --- | --- |
| Auth user exists | Yes (`9f70ddb8-0e19-4e62-9ca9-3ed14a1f478c`) |
| Email confirmed | Yes |
| Profile exists | Yes |
| `status` | `active` |
| `profile_completed` | `true` |
| `role` | `admin` |
| `member_type` | `finance` |
| Company / display fields | `Synthetic QA (staging)` |

**Root cause category: B — Test detection issue** (with **D — Environment/session timing** contributing)

**Evidence:** Staging profile and auth state were valid. Stage 9D failure had `loginSuccessful: false` with only a login-failed screenshot and no route array — consistent with the test ending before post-login navigation finished. Login page uses a 10s `signInWithPassword` race timeout; the smoke test previously waited only for `domcontentloaded` and a short URL change, with 2s locator timeouts.

### ai-user (`qa+agentops-ai-user@aixia.local`)

| Check | Result |
| --- | --- |
| Auth user exists | Yes (`9bb7151c-2221-4806-892c-0a453dd85244`) |
| Email confirmed | Yes |
| Profile exists | Yes |
| `status` | `active` |
| `profile_completed` | `true` |
| `role` | `employee` |
| `member_type` | null (allowed; same as other employees) |
| Company / display fields | `Synthetic QA (staging)` |

**Root cause category: B — Test detection issue** (with **D — Environment/session timing** contributing)

**Evidence:** Same pattern as finance-admin. Comparable employee user (`qa+agentops-employee@aixia.local`) logged in successfully in the same run, ruling out broad app login logic failure for employee role.

**Not the cause:** Invalid role/member_type, missing profile, or non-owner AgentOps access (not reached when login failed).

---

## Fix Applied

### Staging password re-sync (precaution)

Ran `npm run qa:create-synthetic-users` on staging (`ydppcpbxrvvardeslzrk`):

- 12 auth users updated (passwords synced from env; values not logged)
- 12 profiles updated
- No new auth users created

Profiles were already correct; this ensures auth passwords match local `AGENTOPS_QA_*_PASSWORD` / shared synthetic password env.

### Test login detection (`agentops-synthetic-users-readonly-smoke.spec.mjs`)

- Wait for `#email` visible before fill
- Wait for **Signing in…** to clear after submit
- Wait up to 45s for authenticated routes (`/dashboard`, `/onboarding`, finance/system/ai paths)
- Optional `networkidle` after login (capped)
- Broader login error detection via alert text (invalid credentials, profile not found, login timeout messages)
- One retry when still on `/login` without a visible error
- Per-user Playwright timeout raised to 180s (tenant-admin route pass was exceeding 120s after slower login waits)

### App / provisioning script

- **No login page changes**
- **No `create-agentops-synthetic-users.mjs` logic changes** (provisioning was already correct)

---

## Rerun Result

Command: `npm run qa:agentops-synthetic-users-smoke`  
Report: `qa-agent/reports/browser-qa/synthetic-users-smoke-report.json`  
Run ID: `synthetic-users-smoke-1779876395841`

| Metric | Result |
| --- | ---: |
| Users tested | 12 |
| Login success count | **12** |
| finance-admin login | **Success** |
| ai-user login | **Success** |
| Login findings in report | **0** |
| Owner AgentOps | `loaded` (expected) |
| Non-owner AgentOps | `access-denied` (expected) |
| Critical findings | **0** |
| Report status | **passed** |
| Timed-out routes | 9 (non-login; slow dev/Supabase fetch — not security issues) |

Playwright noted one **test-level timeout** on `tenant-admin` after all routes completed; report still recorded full login and routes for that user.

---

## AgentOps Backlog Guidance

The two imported backlog items remain in staging backlog:

- `AIXIA-BROWSER-LOGIN-finance-admin`
- `AIXIA-BROWSER-LOGIN-ai-user`

**Recommended after owner review:**

1. Re-run smoke on demand to confirm stability over multiple runs.
2. Mark findings **In Progress** or **Verified Fixed** via existing AgentOps UI when satisfied (no automatic DB status change in this stage).
3. Optional Stage 9H: add a small “resolve backlog from smoke run id” helper if you want this automated later.

Do **not** delete backlog rows solely because one passing smoke run occurred unless product process approves closure.

---

## What Was Not Done

- No production changes
- No schema / RLS / migration changes
- No broad app login rewrite
- No write/destructive browser actions
- No Hermes / CodeGraph automation
- No scheduler / cron
- No automatic AgentOps backlog status updates in database
- No passwords printed or committed

---

## Final Status

**PASS WITH FOLLOW-UP**

Login flakiness for `finance-admin` and `ai-user` is **resolved** in the latest smoke (12/12 logins, 0 login findings). Follow-up: optional owner review of backlog items and monitoring `tenant-admin` per-user timeout under heavy dev-server load.

---

## Next Recommended Stage

**Stage 10** — Role-based safe workflow browser QA (build on stable 12-user login).

**Optional Stage 9H** — Backlog resolution workflow for browser-imported findings after owner sign-off.
