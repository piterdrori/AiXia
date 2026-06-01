# AgentOps Stage 9D Synthetic Users Smoke Report

## Purpose
Read-only authenticated route/access smoke for all 12 synthetic users. This stage verifies that credentials (if configured) allow login, that role-based route access/blocks are observed, and that AgentOps Owner isolation is enforced (only the allowlisted owner can access `/system/agent-ops`).

## Files Created
- `qa-agent/browser-qa/tests/agentops-synthetic-users-readonly-smoke.spec.mjs`
- `qa-agent/scripts/load-agentops-synthetic-users-env.mjs`
- `qa-agent/scripts/run-agentops-synthetic-users-smoke.mjs`
- `qa-agent/browser-qa/.env.synthetic-users.local.example`
- `qa-agent/agentops/AGENTOPS_STAGE_9D_SYNTHETIC_USERS_SMOKE_REPORT.md` (this file)

## Files Modified
- `package.json` (added `qa:agentops-synthetic-users-smoke`)
- `.gitignore` (ensures `qa-agent/browser-qa/.env.synthetic-users.local` is ignored)
- `qa-agent/browser-qa/playwright.config.mjs` (unchanged in Stage 9D)

## Users Tested
The synthetic user catalog lives in `qa-agent/browser-qa/synthetic-browser-users.json` and includes these 12 QA identities:

- `agentops-owner` — `qa+agentops-owner@aixia.local` — `admin` (AgentOps Owner allowlist: yes)
- `platform-admin` — `qa+agentops-admin@aixia.local` — `admin`
- `finance-admin` — `qa+agentops-finance-admin@aixia.local` — `admin`
- `finance-viewer` — `qa+agentops-finance-viewer@aixia.local` — `employee` (finance read-only permission overrides)
- `employee` — `qa+agentops-employee@aixia.local` — `employee`
- `hr-admin` — `qa+agentops-hr-admin@aixia.local` — `manager` (HR/payroll permission overrides)
- `hr-employee` — `qa+agentops-hr-employee@aixia.local` — `employee` (own expenses/paycheck visibility overrides)
- `manager` — `qa+agentops-manager@aixia.local` — `manager`
- `ai-user` — `qa+agentops-ai-user@aixia.local` — `employee`
- `guest` — `qa+agentops-guest@aixia.local` — `guest`
- `vendor-external` — `qa+agentops-vendor-external@aixia.local` — `guest` (external vendor boundary checks)
- `tenant-admin` — `qa+agentops-tenant-admin@aixia.local` — `admin`

## Credential Handling
- Credentials are loaded locally only from:
  - `process.env`
  - `.env.local` (gitignored)
  - `qa-agent/browser-qa/.env.synthetic-users.local` (gitignored)
- No credential values are printed to console or written to reports.
- Password resolution order:
  1. Per-user password env var (example: `AGENTOPS_QA_FINANCE_ADMIN_PASSWORD`)
  2. `AGENTOPS_QA_SYNTHETIC_PASSWORD` (shared synthetic password)
  3. `AGENTOPS_QA_OWNER_PASSWORD` fallback is allowed only for staging runs, and only when the shared password is not set (the report notes that fallback was used, without printing the value).
- If no password is available for a given user, that user is skipped gracefully and the report records the missing env var name(s) without values.

## AgentOps Access Isolation
- Expected:
  - Owner (`qa+agentops-owner@aixia.local`) can load `/system/agent-ops`.
  - All other synthetic users must be blocked from AgentOps Owner UI (access-denied or redirect).
- Enforcement:
  - If any non-owner synthetic user can load the “AgentOps Control Center”, the smoke report creates a **Critical** finding:
    - category: `Security/Permission`
    - severity: `Critical`
    - title: `Non-owner synthetic user can access AgentOps`
    - importEligible: `true` (report-only; no automatic import)

## Route Coverage
For every user (when credentials exist), the smoke checks these routes:
- `/dashboard`
- `/system/agent-ops`
- `/finance`
- `/finance/master-data`
- `/finance/transactions`
- `/finance/reports`
- `/ai-management`

Each route records:
- requested route
- final URL
- status (`loaded`, `auth-required`, `access-denied`, `redirected`, `failed`)
- visible heading/title (best-effort)
- screenshot path
- console errors count
- network errors count

## Findings
Findings are report-only and are written to:
- `qa-agent/reports/browser-qa/synthetic-users-smoke-report.json`
- `qa-agent/reports/browser-qa/synthetic-users-smoke-report.md`

This stage does not import findings into AgentOps.

## What Was Not Implemented
- No write workflows.
- No browser QA deep workflow actions.
- No scheduler/cron.
- No Hermes automation.
- No CodeGraph automation.
- No database import of findings.

## Reliability (Stage 9D timeout fix)
- One Playwright test per synthetic user (serial, `retries: 0`).
- Per-route hard cap (~25s): navigation, classification, and screenshot; slow routes record `timed-out` and continue.
- AgentOps non-owner blocked screen is classified as `access-denied` with `expected: true` (not a Critical finding).
- Locator checks use short timeouts (2s) so `isVisible()` does not consume the full test budget.
- Reports are written after each user and in `afterAll`.

## Next Recommended Stage
Stage 9E — Convert synthetic users smoke findings into AgentOps backlog candidates.

