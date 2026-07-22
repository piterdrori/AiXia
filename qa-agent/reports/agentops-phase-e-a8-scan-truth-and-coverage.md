# AgentOps Phase E-A8 — Last-Run Truth, Full-Scope Scans, Never-Empty Results

**Date:** 2026-07-22  
**Branch:** `origin/staging` — commit `4ff98bb8` "Fix AgentOps last-run truth and full-scope never-empty scans"  
**Registry:** codegraph  
**Alias:** https://ai-xia-staging.vercel.app → `ai-2y8w5lqc0-…` (Preview Ready, not `--prod`)  
**main / production:** untouched  

---

## 1. Owner-reported problems

1. Schedule card says "every hours · 1 hours" and "Last run 7/22 12:14 PM", but the hero LAST RUN badge says 7/21 1:11 PM — a day earlier. Applies to all agents.
2. Agents must test **all pages** of the website, and a scan must never end with nothing — if no issues are found, the agent must suggest improvements.

## 2. Root causes found

| Symptom | Root cause |
|---|---|
| Hero Last run a day stale | `selectLatestAgentRun` **preferred owner_manual runs over scheduled runs regardless of recency** — yesterday's manual run beat today's hourly scheduled runs. |
| "every hours · 1 hours" | Frequency label concatenated raw enum + unit without grammar. |
| Scans covering one page | Browser QA engine scanned **only the first route** of the scope; scheduler mapped `entire_staging` to *unsupported skip* and modules to the agent-detail route only; selected routes capped at 3. |
| Empty scans | Zero qualifying findings ended as bare "Completed" with no output; low-severity observations and runner suggestions were discarded. |

## 3. Fixes

### Last run truthfulness (`agentDetailLatestRun.ts`)
`selectLatestAgentRun` now returns the **most recent terminal run regardless of trigger** (running/queued still win). Contract updated in `agentops-agent-detail-final-verify` with timestamped cases.

### Frequency label (`AgentSchedulePanel.tsx`)
"every hours · 1 hours" → **"Every 1 hour"** (grammar-aware for hours/days/weeks, "On selected days at HH:MM" for day schedules).

### Full-scope scans
- Browser QA engine (`agentops-manual-run-browser-qa-engine.ts`) scans **every route in scope** (cap `AGENTOPS_BROWSER_QA_MAX_ROUTES`, default 5) with per-route results, per-route cancel checkpoints, aggregated evidence, and route-tagged findings/drafts.
- Scheduler core (`agentops-manual-run-scheduler-core.mjs`):
  - `entire_staging` now maps to **CORE_STAGING_ROUTES** (14 core website pages: hub, dashboard, projects, tasks, calendar, chat, inbox, mail, employees, finance, agent-ops pages) with **deterministic hourly rotation** so consecutive scheduled runs cover the whole website.
  - `selected_modules` maps module roots to real routes (not just the agent detail page).
  - Selected-routes cap raised to 5 per run. Route allowlist extended to the core app modules.

### Never-empty scans (both engines: browser_qa `b2-d` + website_audit `b2-c`)
When a completed scan creates zero issue drafts, it now records **improvement drafts** in this order:
1. Real low-severity observations → improvement drafts (max 3).
2. Runner improvement suggestions → improvement drafts (max 2).
3. Honest coverage-gap improvement ("checks passed; extend coverage for accessibility/empty-state/mobile/slow-network").

Duplicate keys prevent hourly spam — a still-open improvement from a previous run is skipped with the honest note "the improvement suggestion from a previous run is still open". New run result label: `improvements_suggested`. `findings_count` includes improvement drafts.

## 4. Live proof (staging)

`agentops-e-a8-scan-coverage-live.mjs` (real engine, real browser):

- Multi-route run `/system/agent-ops` + `/system/agent-ops/issues` → **both routes scanned** (`perRouteResults` 2×`real_browser`), 2 real issue drafts (console errors high, visible error copy high). `ok: true`
- `/login` run → 1 real medium finding (failed requests). `ok: true`
- `/login` repeat (all qualifying findings duplicate-skipped → drafts 0) → **improvement fallback fired**: 1 improvement draft ("Inspect network tab for failing API or asset requests"), note "No qualifying defects — recorded 1 improvement suggestion(s) instead." `ok: true`

`agentops-e-a8-agent-page-live.mjs` (system-agent page after deploy):

- Strip Last run: **Completed 7/22/2026 1:16 PM** (today, newest run) — same day as schedule card. `consistent: true`
- Frequency: **"Every 1 hour"** — `hasEveryHoursBug: false`. `ok: true`

Ironically, the scans of real routes kept finding genuine issues — confirming the owner's point that "no findings" runs were under-reporting, not clean.

## 5. Verify scripts updated

- `agentops-agent-detail-final-verify` — recency-based last-run contract (PASS)
- `agentops-manual-run-scheduler-hardening-verify` — entire_staging → core-route rotation with full coverage across windows (PASS)
- `agentops-manual-run-worker-verify` — engine multi-route + improvement fallback assertions; repaired a pre-existing stale assertion ("Browser QA engine not connected." copy had moved to `manualRunWorkerHealth.ts` in an earlier phase) (PASS)

## 6. Safety checks

`tsc --noEmit` PASS · agent-detail-final / status-strip PASS · scheduler + hardening + worker verifies PASS · issues-verify PASS · pre-issues-pages PASS · vercel-function-count PASS (9/12) · monitoring-owner-promotion-lock PASS. No new Vercel functions; no cron/workflow changes; drafts only — no auto-promotion, no auto-fix.

## 7. Notes / limitations

- The hero badge and the schedule card intentionally show slightly different stats: the strip shows the newest run of any kind; the schedule card shows the last **scheduled** run. They now agree on recency (same day) instead of contradicting each other by a day.
- Whole-website coverage is achieved **across consecutive scheduled runs** (5 routes per run, rotating through 14 core routes) to keep each run within its duration budget.
- The scheduler tick + staging worker run locally; the new engine behavior activates immediately from this checkout (already on `staging`).

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED / PRODUCTION_UNTOUCHED | YES / YES |
| LAST_RUN_SHOWS_NEWEST_RUN | YES (live: today 1:16 PM) |
| HERO_VS_SCHEDULE_CONTRADICTION_FIXED | YES (`consistent: true`) |
| FREQUENCY_LABEL_FIXED | YES ("Every 1 hour") |
| SCANS_COVER_ALL_ROUTES_IN_SCOPE | YES (per-route results, live 2/2) |
| ENTIRE_STAGING_COVERS_WHOLE_WEBSITE | YES (14 core routes, rotating) |
| SCAN_NEVER_EMPTY | YES (issues or improvement drafts; duplicate-safe) |
| IMPROVEMENT_FALLBACK_PROVEN_LIVE | YES |
| APPLIES_TO_ALL_AGENTS | YES (shared selector/engine/scheduler code) |
| BUILD_GREEN · DEPLOY_GREEN · COMMITTED_TO_ORIGIN_STAGING | YES |
