# AgentOps Phase E-A9 — Monitoring Page Correlation

**Date:** 2026-07-22  
**Branch:** `origin/staging` — commit `f0cac0c2` "Correlate AgentOps monitoring with issues and agent pages"  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/monitoring  
**Alias:** https://ai-xia-staging.vercel.app → `ai-cpbya309s-…` (Preview Ready, not `--prod`)  
**main / production:** untouched  

---

## 1. Audit findings

Compared Monitoring against the redesigned pages (Control Center, Agents, Agent detail, Issues inbox, Issue detail):

| Gap | Detail |
|---|---|
| Fake health values | "Operational checks: Healthy" and "Weekly review: Healthy" were **hardcoded** — contradicting the truth-first design of the other pages. |
| Run history blind to agent scans | "Run history" showed only the daily 12-agent GHA review; the hourly per-agent staging-worker runs (E-A8) were invisible, recreating the same "monitoring says daily, agent page says hourly" confusion the owner reported. |
| Run outcomes invisible | Recent terminal runs showed status only — no issues filed / improvements suggested, no E-A8 `improvements_suggested` vocabulary, no route counts. |
| Weak cross-navigation | No links from runs to the agent page or from run outcomes to the Issues inbox; draft review links used an obsolete `?panel=monitoring-drafts` param. |

## 2. Fixes

- **Truthful summary values** — Operational checks and Weekly review derive from schedule metadata freshness (`Healthy` / `Overdue` / `No runs recorded`). Live result: Operational **Healthy**, Weekly **No runs recorded** (honest — no weekly run indexed). Summary labels clarified to "Last daily review / Next daily review".
- **Run outcomes** — queue API (`toQueueRunView`) now returns `result`, `draftsCreated`, `improvementDraftsCreated`, `routesCheckedCount` from run summaries. "Recent runs" rows show owner-readable outcomes matching Issues vocabulary: "N issues filed", "N improvement suggestions filed", "No new findings (existing suggestions still open)", plus route counts and end time.
- **Cross-links** — agent slug in each run row opens `/system/agent-ops/agents/:agent`; runs that filed drafts get **Open Issues inbox**; page-level "Open Issues inbox" / "Open Agents" buttons added; `?panel=monitoring-drafts` links normalized to the Issues inbox.
- **Fleet vs agent clarity** — "Run history" renamed **Fleet run history** with copy: "Per-agent hourly scan runs appear in the staging worker queue above and on each agent page."

## 3. Live QA (`agentops-e-a9-monitoring-correlation-live.mjs`) — ok: true

- Summary: truthful values rendered (Healthy / No runs recorded) ✓
- Recent runs: 10 rows, all with outcome labels — E-A8 improvement suggestions visible ("1 improvement suggestion filed") ✓
- Open Issues inbox from a run row → lands on `/system/agent-ops/issues` with the inbox helper ✓
- Agent link from a run row → lands on the agent detail page ✓
- Fleet run history note ✓ · cross-links ✓ · mobile 390px no overflow ✓

## 4. Safety

`tsc` PASS · staging-worker-ops-ui-verify PASS · manual-run-worker-verify PASS · agent-detail-final-verify PASS · issues-verify PASS. No new Vercel functions, no service-role exposure (queue API stays owner-gated), no decision actions added to Monitoring.

## FINAL VERDICT

| Gate | Result |
|---|---|
| MAIN_UNTOUCHED / PRODUCTION_UNTOUCHED | YES / YES |
| HARDCODED_HEALTH_REMOVED | YES (truthful freshness values) |
| RUN_OUTCOMES_MATCH_ISSUES_VOCABULARY | YES |
| E_A8_IMPROVEMENTS_VISIBLE_IN_MONITORING | YES (live) |
| MONITORING_LINKS_TO_AGENT_PAGES | YES (live nav) |
| MONITORING_LINKS_TO_ISSUES_INBOX | YES (live nav) |
| FLEET_VS_AGENT_RUNS_CLARIFIED | YES |
| MOBILE_LAYOUT_PASS | YES |
| BUILD_GREEN · DEPLOY_GREEN · COMMITTED_TO_ORIGIN_STAGING | YES |
