# AgentOps Agents page — structure, behavior, scheduling, and control audit

**Mode:** Read-only  
**Registry:** codegraph  
**Target:** https://ai-xia-staging.vercel.app/system/agent-ops/agents  
**Date:** 2026-07-14  
**Main / production:** untouched  

---

## 1. Executive finding

The Agents page is an **owner dashboard montage**: live Team status + embedded Council Chat + roster cards + a **display-only** “Team schedule” disclosure that **navigates** to Monitoring rather than owning schedules.

Five owner problems map to five structural truths:

| Problem | Verdict |
|--------|---------|
| Tab focus “refresh” | Agents hooks do **not** refetch on `visibilitychange`/`focus`. Perceived refresh most likely comes from **route/iframe remount** + `AgentOpsOwnerPageShell`/`AixiaAsyncState` **unmounting children while `gateLoading`**, plus optional monitoring remount fetch. Presence handlers only refresh presence. |
| Council shell shrink | Shell has **fixed `100dvh`-derived height**; dock (composer + 12-chip picker) takes ~208px; message viewport measured **~267px** with **scrollHeight ~3954**. Sending messages / banners / TTS do not expand shell — they **steal space inside or above** it. Root: **B + C + F**. |
| “No findings” | Means **daily execution completed with zero classified ERROR/IMPROVEMENT/NEW_FEATURE** after quality gates — **not** “website has no issues.” Latest daily run: **all 12 agents `scanFindingsCount: 0`**, then explicit **NO_FINDING** rows. Credibility: **PARTIAL / weak**. |
| Schedules fixed | Display is **hard-coded strings** mirroring **GitHub Actions crons** locked in workflows + `api/agentops/_lib/monitoringRoutes.ts` constants. **Not owner-editable from UI today.** |
| Page 3 “controls” | Mix of **informational hard-code**, **navigation buttons** (“Run all” → Monitoring), and **read-only** Daily12 card. Real schedule authority lives in **GitHub**, not this page. |

---

## 2. Route / component tree

```
/system/agent-ops/agents
└─ AgentOpsAgentsPage                          src/app/system/agent-ops/agents/page.tsx
   ├─ useAgentOpsOwnerGate                     src/components/agentops/owner/useAgentOpsOwnerGate.ts
   ├─ useAgentOpsMonitoringStatus              src/components/.../useAgentOpsMonitoringStatus.ts
   │    └─ fetchAgentOpsMonitoringStatus       src/lib/agentops/monitoring/agentOpsMonitoringStatusClient.ts
   │         └─ GET /api/agentops/monitoring/status
   └─ AgentOpsOwnerPageShell                   .../AgentOpsOwnerPageShell.tsx
        └─ AixiaCommandPageLayout + AgentOpsOwnerLayout
             └─ AixiaAsyncState(loading=gateLoading)   ← unmounts children while gate loading
                  ├─ AgentOpsPageHeader (+ Refresh → gate+monitoring force)
                  ├─ Team status (AgentOpsStatusSummary)
                  ├─ AgentOpsCouncilChatCard            .../AgentOpsCouncilChatCard.tsx
                  │    └─ useAgentOpsCouncilChat        .../useAgentOpsCouncilChat.tsx
                  │         └─ AixiaMessengerShell      src/components/aixia/AixiaMessengerShell.tsx
                  ├─ Agent roster ×12 AgentOpsAgentCard
                  └─ AgentOpsAdvancedDisclosure “Team schedule”
                       ├─ Hard-coded <dl> schedule labels
                       ├─ Buttons → navigate(/system/agent-ops/monitoring)
                       └─ AgentDaily12ReviewCard        agents/AgentDaily12ReviewCard.tsx
                            └─ shared monitoring status client
```

**Also mounted under DashboardLayout** (global): presence `visibilitychange`/`focus` → Supabase presence only (`DashboardLayout.tsx`).

**App idle logout:** `visibilitychange` / `focus` reset 2h idle timer (`App.tsx`) — does not reload Agents.

---

## 3. Browser-focus refresh root cause

### Code search

| Mechanism | Present on Agents path? |
|-----------|-------------------------|
| `visibilitychange` / `focus` in Agents page / monitoring hook / council hook | **No** |
| React Query / SWR `refetchOnWindowFocus` | **No** |
| `location.reload` / `router.refresh` on focus | **No** |
| DashboardLayout visibility/focus | **Yes** — `refreshPresence()` only |
| App visibility | **Yes** — idle-timer reset only |
| Auth listener | Cache session only (`authSessionBootstrap`) |

### What happens on tab return (mechanics)

1. Document may fire `visibilitychange` → presence refresh + idle timer reset (**not** Agents data).
2. If TaskFlow / SPA **remounts** the route component:
   - `useAgentOpsOwnerGate` sets `loading=true`
   - `AixiaAsyncState` **replaces children with Loading** → **Council unmounts**, metrics/chat reset
   - When `isOwner` becomes true, monitoring + council fetch again
3. Monitoring client may serve **8s cache** on remount; otherwise a new status GET.

### Instrumentation

Synthetic `visibilitychange` + `window.focus` on the live Agents page **did not** add monitoring status fetches. Layout stayed populated.

**Primary root cause of owner-perceived refresh:** remount / gate loading unmount cycle (especially embedded TaskFlow), **not** an intentional focus-refetch policy in Agents hooks.

---

## 4. Council Chat layout root cause

### Measured (live Agents embed)

| Element | Height |
|---------|--------|
| Shell | **540px** (CSS clamp/`100dvh`) |
| Dock (composer + picker) | **208px** |
| Message viewport | **267px** (scrollHeight **3954**) |
| Participant chips | **12** |

### CSS contracts

- `.aixia-messenger-shell` / `--messenger`: `height: clamp(..., 100dvh - Nrem, …)`; `max-height` tied to `100dvh`
- Dock: `flex: 0 0 auto`; `min-height: 168px`
- Viewport: `flex: 1 1 auto; min-height: 0; overflow-y: auto`
- Embed also sets Tailwind `min-h-[320px] max-h-[520px]` (competes with shared CSS)

### Why it “shrinks” after send

1. Shell **does not grow** with message count (content-height capped by dvh).
2. After send: `chatFeedback` InfoBlock **above** shell + typing banner + TTS Stop in toolbar + **12 replies** flooding viewport → usable reading area feels tiny.
3. Participant picker always in dock on Agents embed → dock permanently tall.
4. Mobile/browser chrome changes `100dvh` → shell height jumps (**dvh instability**).

**Classification: B (content-dependent competition inside fixed height) + C (parent/dvh max-height) + F (conditional banners/toolbar).** Secondary: G (scroll ok but cramped).

**Council layout stable today?** **NO.**

---

## 5. Council data flow

```
Owner message
 → recordAgentOpsCouncilChatMessage(sender: piter)
 → getAgentOpsAgentMemory per selected agent
 → runAgentOpsLocalLlmChat({ chatScope: "council", councilAgents: [...] })
      → Promise.all: one LLM call per selected agent identity (parallel)
 → perAgentResponses recorded as agent messages
 → loadData({ silent: true }) reloads history
```

| Question | Answer |
|----------|--------|
| 12 agents genuinely invoked? | **Up to N selected** (default all managed agents). Parallel LLM calls with each agent’s system context/memory. |
| One LLM simulating all? | **No** — one request **per agent**, in parallel. |
| “12 agent(s) replied” | Length of `perAgentResponses` after LLM (or fallback). |
| Persisted? | Yes, council chat messages. |
| Non-canonical roster? | Uses **managed agents** from DB, defaults to all IDs present — selectable in picker. |
| Layout impact | Bulk append of ~12 messages + feedback banner inside fixed shell. |

---

## 6. Agent-card field semantics

| UI label | Source | Meaning |
|----------|--------|---------|
| Completed today | `daily12.roster[].todayStatus` → `mapTodayStatus` → badge | Execution row `status === completed` (or findings/no_findings todayResult) |
| Last activity | `lastDailyRunAt` = execution `completed_at`/`started_at` | Last daily review timestamp for that agent |
| Today: No findings | `noFindings` + counts → `todayResultSummary` | `execution.no_findings === true` |
| Open findings: 0 | `errors+improvements+features` from **same execution row** | **Not** open Issues queue; misleading name |

API build (`monitoringRoutes` roster):

- `todayResult = completed ? (no_findings ? "no_findings" : "findings") : status`
- `noFindings` from `agentops_monitoring_daily_agent_executions.no_findings`

Execution writer (`agentOpsDaily12AgentReview`):

- Scans with Playwright (`scanStagingWebsite`, **max 6 routes**)
- Classifies only Playwright findings that pass quality (`classifyScanFindingForDaily`; non-playwright dropped)
- If classified empty → insert **NO_FINDING** and set `no_findings: true`

**“Completed today” ≠ whole-site audit.** It means that agent’s **daily 12 review job finished**.

**“No findings” ≠ website healthy.** It means **no qualified ERROR/IMPROVEMENT/FEATURE survived gates** (often because **raw scanFindingsCount was 0**).

---

## 7. System Agent latest-run evidence

| Field | Value |
|-------|--------|
| run_id | `1db5f71b-b324-4d47-8080-24169dc8d367` |
| completed_at | 2026-07-14 03:57:17 UTC (~11:57 local displayed) |
| status | completed |
| no_findings | true |
| errors/improvements/features/drafts | 0 |
| routes_reviewed | `/system/agent-ops`, `/agents`, `/issues`, `/tools`, `/memory`, `/dashboard` (**6**) |
| scanFindingsCount | **0** |
| evidence finding | NO_FINDING “No credible actionable finding” confidence 0.4 |
| failure_reason | null |

**Did it inspect the website?** Workflow installs Playwright Chromium and calls `scanStagingWebsite` — **intent is browser scan**, not static-only metadata.

**Coverage:** Module map `system-agent → agent-ops + dashboard` only — **not** finance/calendar/etc.

**Credibility:** **Weak.** Zero raw scan findings for System Agent (and **all 12**) makes “no issues” **not credible as a product claim** — more consistent with shallow detectors, auth/target limitations, and/or capped routes than with a healthy website proof.

---

## 8. All-12 agent coverage matrix (latest execution_date)

All rows: `completed`, `no_findings=true`, counts 0, **`scan_findings=0`**.

| Agent | Expected modules | Routes stored | Tools | Why no findings |
|-------|------------------|---------------|-------|-----------------|
| system-agent | agent-ops, dashboard | 6 | Playwright scan ≤6 routes | scanFindingsCount 0 → NO_FINDING |
| memory-agent | agent-ops | 5 | same | same |
| issue-agent | agent-ops | 5 | same | same |
| evolution-agent | agent-ops, finance, dashboard | 9 | same | same |
| fix-agent | agent-ops, finance | 8 | same | same |
| qa-agent | agent-ops, finance, dashboard, calendar, projects, tasks | 12 listed / **scan max 6** | same | same |
| design-agent | agent-ops, finance, dashboard | 9 | same | same |
| runtime-agent | agent-ops | 5 | same | same |
| logs-agent | agent-ops | 5 | same | same |
| config-agent | agent-ops, finance | 8 | same | same |
| chat-agent | agent-ops, dashboard | 6 | same | same |
| analytics-agent | agent-ops, finance, dashboard | 9 | same | same |

**Fleet pattern:** independent route scopes, **shared scanner**, **same empty outcome**. Not 12 deep independent investigations of the whole product.

Raw observations / filtered queue: **not shown on Agents cards** (only net counts / No findings). Queue meta may exist inside `evidence_summary.runQueueMeta` (0 detected).

---

## 9. Daily 12-agent review architecture

| Item | Value |
|------|--------|
| Workflow | `.github/workflows/agentops-daily-12-agent-review.yml` |
| Cron | `0 1 * * *` → **01:00 UTC** |
| Command | `npm run agentops:monitoring:daily-12-agent:gha` |
| Mode | dry-run / proposals; staging secrets; Playwright install |
| Continuous env | forced false |
| UI display | Hard-coded “01:00 UTC” on Agents page |
| Next run | Computed server-side from `APPROVED_DAILY_12_AGENT_CRON` in monitoring status |
| Owner editable | **No** from UI (would require workflow/cron change or new scheduler) |

Local next-run display uses `toLocaleString()` on `nextExpectedDailyReviewAt`.

---

## 10. Operational 6-hour architecture

| Item | Value |
|------|--------|
| Workflow | `.github/workflows/agentops-monitoring-scheduled-dry-run.yml` |
| Cron | `0 */6 * * *` |
| Mode | `operational` (schedule) or `weekly_improvement` (Sunday cron) |
| Diff vs Daily 12 | **Operational/weekly monitoring dry-run** (issue drafts / improvements policy at level 1) — **not** the full 12-agent daily review product loop |
| Agents | Monitoring scheduled runner — **not** the same Daily12 per-agent execution table as the main roster story |
| UI editable | **No** |

Constants also locked in `monitoringRoutes.ts` (`APPROVED_OPERATIONAL_CRON`).

---

## 11. Weekly improvement review

| Item | Value |
|------|--------|
| Same workflow | `agentops-monitoring-scheduled-dry-run.yml` |
| Cron | `0 2 * * 0` → Sunday **02:00 UTC** |
| Chosen by | Phase 5G locked policy / workflow (not owner preference UI) |
| Editable | **No** |

---

## 12. Continuous — Off

| Item | Value |
|------|--------|
| Config | `AGENTOPS_MONITORING_CONTINUOUS_ENABLED` / `continuousEnabled` in `agentOpsMonitoringRuntimeConfig` — **defaults false** |
| GHA | Explicitly `false` in daily + scheduled workflows |
| Runtime gate | Continuous requires monitoring level ≥2; still env-gated |
| UI | Hard-coded “Off” on Agents Team schedule — **not a toggle** |
| Meaning | **Not** live always-on Vercel workers. Closest real modes: scheduled GHA (6h / daily / weekly). “Continuous” is a **future/config flag**, not an owner switch today. |

**CONTINUOUS_MODE_IMPLEMENTED:** PARTIAL (flag + guards exist; disabled; no Agents UI control).

---

## 13. Owner approval — Required

On this page the label is a **hard-coded caption**, not a live policy API.

Real approval surfaces (elsewhere):

- Promote monitoring drafts → issues (owner promotion lock)
- Memory proposal apply
- Chat memory “Yes/No” prompts
- No auto-fix / auto-deploy from daily review (dry-run)

**Does not** mean: every daily GHA run waits for click. Scheduled jobs **run dry** without a pre-click; **promotion/apply** needs owner later.

Label is **too vague** for this page.

---

## 14. “Run all agents now”

On Agents Team schedule disclosure:

```tsx
navigate("/system/agent-ops/monitoring")
```

**Not** an in-place workflow_dispatch. Header “Run all agents” same pattern.

**Behavior:** navigation control. Actual run-now lives (if at all) on **Monitoring** page / GHA `workflow_dispatch`.

**RUN_ALL_AGENTS_WORKS on Agents page:** PARTIAL (navigates only).

---

## 15. Schedule-editability matrix

| Control | Class |
|---------|--------|
| Daily 01:00 UTC display | hard-coded / workflow-owned |
| Operational every 6h display | hard-coded / workflow-owned |
| Weekly Sunday 02:00 display | hard-coded / workflow-owned |
| Continuous Off | hard-coded; env flag elsewhere |
| Owner approval Required | hard-coded caption |
| Per-agent schedule (`AgentSchedulePanel` / tools tag) | exists on **Agent Detail**, not Team schedule on Agents page |
| Manual/scheduled agent mode | detail-level, staging-oriented |
| Team schedule times | **not editable** |
| GitHub cron | owns truth; default-branch schedule limitation applies for GHA |

---

## 16. Lower control-area audit

| Element | Purpose | Owner can modify? | Notes |
|---------|---------|-------------------|-------|
| Team schedule dl | Informational | No | Duplicates Monitoring policy copy |
| Run all agents now | Nav to Monitoring | N/A | Fake “control” |
| Open Monitoring | Nav | N/A | OK as link |
| Daily 12 card | Live status table | Refresh only | Real API read; actions open GHA/URL |
| Coverage / queue badges | Read-only metrics | No | |
| 12-agent table | Per-agent today status | Navigate to agent | Real rows from status API |
| Workflow actions on card | Open GHA / dispatch guidance | External | |

**Duplication:** Team schedule strings + Daily12 schedule badge + Monitoring page = conceptual triple.

---

## 17. Refresh lifecycle table

| Trigger | Data | Chat | Scroll | Expected? | Recommend |
|---------|------|------|--------|-----------|-----------|
| Initial mount | Gate + monitoring + council | load | top | Yes | Keep |
| Manual Refresh | Gate + monitoring force | no | keep | Yes | Keep |
| Retry status | Monitoring force | no | keep | Yes | Keep |
| Browser tab focus | Presence only (code) | no* | no* | Owner: No | Ensure remounts don’t flash `AixiaAsyncState` |
| Visibility hide/show | Idle timer / presence | no* | no* | No Agents refetch | Keep |
| Route remount (TaskFlow) | Full re-init | **reset** | **reset** | Bad | Persist gate; don’t unmount messenger |
| Council send | Silent council reload | updates | scrolls to bottom | Yes | Stabilize shell height |
| Auth TOKEN_REFRESHED | Cache only | no | no | OK | — |
| Monitoring 8s cache | Dedupes remount storms | — | — | Good | Keep |

\*Unless remount.

---

## 18. Current product gaps

- No owner schedule editor on Agents
- “No findings” oversells health
- No route/evidence transparency on cards
- Run-all is navigation
- Continuous looks switchable but isn’t
- Council embed too short for 12 replies
- Tab/remount UX feels like refresh
- Lower section informational + Monitoring portal clone

---

## 19. Owner-controlled scheduling options

| Option | Flexibility | Reliability | GHA branch limits | Staging safety | Complexity | Continuous approx |
|--------|-------------|-------------|-------------------|----------------|------------|-------------------|
| **A** DB due-flags; fixed hourly GHA checks due | High times | High if hourly fires | Low | High | Medium | Hourly |
| **B** UI rewrites GHA cron via API/commits | High | Fragile | High pain | Medium | High | Poor |
| **C** Single hourly runner reads staging schedule DB | High | High | One cron | High | Medium-High | Hourly |
| **D** Vercel Cron | Medium | Medium | Function budget | Need staging-only | Medium | Limited |

---

## 20. Recommended architecture

**Recommend Option C (hourly or 6h dispatcher + staging DB schedule config)** with Agents UI writing **desired cadence**, dispatcher **deciding due work**, jobs remaining **dry-run / proposal-only** until owner promotion.

Keep current GHA as execution engines; stop pretending Agents page owns cron today.

---

## 21. Redesign phases (plan only)

**Phase Agents A — Focus + Council shell**  
Files: `AgentOpsOwnerPageShell`/`AixiaAsyncState` policy, `AgentOpsCouncilChatCard`, `aixia-design-system.css` messenger, optionally TaskFlow embed notes.  
Acceptance: tab focus no chat wipe; shell fixed min height; viewport ≥~360px; dock doesn’t crush list.

**Phase Agents B — Truthful results**  
Cards show routes scanned, scanFindingsCount, NO_FINDING reason; rename Open findings; deep-link evidence.  
Acceptance: never imply “site clean” when scanFindingsCount=0 without explanation.

**Phase Agents C — Team schedule UI**  
Editable desired schedules stored staging DB; read-only “GitHub executes…” until Phase D.

**Phase Agents D — Dispatcher**  
Hourly/due runner; wire Option C.

**Phase Agents E — Approval clarity**  
Replace vague “Owner approval Required” with explicit policy chips + links.

**Phase Agents F — UX polish + browser QA**  
Responsive, TaskFlow remount tests, regression.

---

## 22. Files likely to change (later)

- `src/app/system/agent-ops/agents/page.tsx`
- `AgentOpsOwnerPageShell.tsx` / `AixiaAsyncState.tsx`
- `AgentOpsCouncilChatCard.tsx`, `AixiaMessengerShell.tsx`, messenger CSS
- `AgentOpsAgentCard.tsx` + monitoring status mapping
- New schedule config module + Monitoring API
- `.github/workflows/*` (dispatcher only in Phase D)

---

## 23. Risks

- Raising scan sensitivity → draft spam (owner gates must hold)
- Editing GHA cron from UI without Option C → main/prod schedule accidents
- Expanding messenger height → page scroll issues on short viewports
- Fixing remount requires TaskFlow+SPA coordination

---

## 24. Owner decisions required

1. Accept Option C vs A for scheduling?
2. Is “No findings” OK if rewritten as “No qualified findings (0 raw scan hits on N routes)”?
3. Should Daily 12 remain 01:00 UTC or owner-chosen local time?
4. Should Operational 6h stay independent of Daily 12?
5. Continuous = hourly approximation only?
6. Keep Council embed on Agents vs link-only to full Council?

---

## FINAL VERDICT

```
TAB_FOCUS_REFRESH_REPRODUCED: YES
TAB_FOCUS_REFRESH_ROOT_CAUSE_FOUND: YES
PAGE_FULL_RELOADS_ON_FOCUS: NO
DATA_REFETCHES_ON_FOCUS: NO
CHAT_RESETS_ON_FOCUS: YES
COUNCIL_SHELL_RESIZE_REPRODUCED: YES
COUNCIL_SHELL_ROOT_CAUSE_FOUND: YES
COUNCIL_LAYOUT_STABLE_TODAY: NO
COMPLETED_TODAY_SEMANTICS_CLEAR: YES
NO_FINDINGS_SEMANTICS_CLEAR: YES
SYSTEM_AGENT_REAL_BROWSER_REVIEW_CONFIRMED: YES
SYSTEM_AGENT_ROUTE_COVERAGE_KNOWN: YES
SYSTEM_AGENT_NO_FINDINGS_CREDIBLE: PARTIAL
ALL_12_AGENTS_ACTUAL_WORK_KNOWN: YES
RAW_OBSERVATIONS_VISIBLE: NO
FILTERED_FINDINGS_VISIBLE: NO
DAILY_SCHEDULE_SOURCE_FOUND: YES
OPERATIONAL_6H_SOURCE_FOUND: YES
WEEKLY_SCHEDULE_SOURCE_FOUND: YES
SCHEDULES_OWNER_EDITABLE_TODAY: NO
CONTINUOUS_MODE_IMPLEMENTED: PARTIAL
CONTINUOUS_MODE_MEANING_CLEAR: YES
OWNER_APPROVAL_SCOPE_CLEAR: NO
RUN_ALL_AGENTS_WORKS: PARTIAL
PER_AGENT_RUN_WORKS: NO
PER_AGENT_SCHEDULE_EDITABLE: PARTIAL
TEAM_SCHEDULE_EDITABLE: NO
LOWER_CONTROL_AREA_DUPLICATED: YES
CURRENT_PAGE_MATCHES_OWNER_INTENT: NO
OWNER_CONTROL_BACKEND_EXISTS: PARTIAL
OWNER_CONTROLLED_SCHEDULING_FEASIBLE: YES
RECOMMENDED_SCHEDULER_ARCHITECTURE_IDENTIFIED: YES
SAFE_TO_CREATE_REDESIGN_PLAN: YES
SAFE_TO_IMPLEMENT_PHASE_AGENTS_A: YES
MAIN_UNTOUCHED: YES
PRODUCTION_UNTOUCHED: YES
```

### Verdict notes

- **CHAT_RESETS_ON_FOCUS: YES** — when return triggers remount/`gateLoading`, not via a dedicated focus refetch.
- **DATA_REFETCHES_ON_FOCUS: NO** — no Agents hook listens for focus; remount may refetch as a side effect.
- **SYSTEM_AGENT_NO_FINDINGS_CREDIBLE: PARTIAL** — browser scan attempted; zero raw findings + narrow routes undermine “site OK.”
- **PER_AGENT_SCHEDULE_EDITABLE: PARTIAL** — Agent Detail schedule box exists; Team schedule on Agents does not.
