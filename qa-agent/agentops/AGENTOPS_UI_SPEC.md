# AgentOps UI

## Purpose

Define the in-app Owner interface for reviewing the Active Top 10, backlog, prompts, feedback, verification, and agent memory. **Specification only—do not build UI in this phase.**

---

## Recommended Route

**Path:** `/system/agent-ops`

**Reason:**

- System/owner module, not finance/HR/calendar business surface  
- Aligns with platform-level concerns (SaaS, security, council)  
- Clear separation from tenant operational modules  

**Future routing notes:**

- Register in `src/App.tsx` behind Owner-only guard  
- Set document title via `usePageTitle` pattern when implemented  
- Breadcrumb: System → AgentOps  

---

## Access

| Role | Access |
| --- | --- |
| Platform Owner (Piter) | Full UI |
| Admin (optional future) | Read-only summary tab if policy enabled |
| All other roles | **403 / hidden nav** |

Nav entry: visible only when `isPlatformOwner` (or equivalent) is true. Never show in Personal AI or employee menus.

---

## Layout Shell

Use shared AiXia page shell:

- `FinancePage` is **not** appropriate; use `AixiaPage` or future **`AgentOpsPage`** wrapper in `src/components/aixia`  
- Dark glass enterprise aesthetic from `src/styles/aixia-design-system.css`  
- **No page-local Tailwind design systems**  

---

## Main Page Sections

### 1. Command Hero

`AixiaHero` with `surface="command"` (or system variant when defined).

**Displays:**

| Metric | Source |
| --- | --- |
| AgentOps status | Last run success / running / failed |
| Last run time | `agentops_runs.finished_at` |
| Active Top 10 count | 0–10 |
| Open slots | `10 - active_open_count` |
| Backlog findings | count `queue_state = backlog` |
| Critical open | active critical count |
| Verification pending | `status = Marked Fixed` or `Verification Running` |
| Current focus directive | first active directive summary |
| **Hermes Memory Support Meter** | score 0–100 + label (see `AGENTOPS_HERMES_READINESS_SPEC.md`) |
| Hermes score | 0–100 |
| Hermes status label | Learning / Small Help / Helping / Main Memory Source / Full AgentOps Memory Support |
| Last Hermes check | last successful connection/readiness check |
| Memory mode | Database-only / Hermes-assisted / Hermes-primary with database system of record |

**Actions:** Run manual scan (future), Refresh, Open run history, **Run Hermes Check** (future).

---

### 1a. Hermes Status Panel

Dedicated panel (hero adjacent or collapsible section) for Owner visibility into Hermes readiness.

**Displays:**

| Field | Notes |
| --- | --- |
| Hermes connected | Yes / No / Unknown |
| Hermes score | 0–100 |
| Hermes label | Learning, Small Help, Helping, Main Memory Source / Strong Support, Full AgentOps Memory Support |
| What Hermes is helping with | Short bullet list (e.g. focus directives, false-positive memory, ranking weights) |
| Last sync | Last memory sync timestamp |
| Last check result | Pass / fail / partial + message |
| Memory limitations | e.g. “memory-limited run”, “database-only mode” |
| Owner-only warning | Hermes AgentOps memory is not visible to Personal User AI or tenants |

**Future actions (buttons; not in MVP shell unless approved):**

- **Run Hermes Check** — refresh score and connection status  
- **View Hermes Memory** — read-only Owner view of active memory patterns  
- **Disable Hermes Focus Directive** — turn off a Hermes-suggested directive (DB row remains authoritative)  

**Unavailable state:** Show warning banner; do not block queue or critical reporting. Default score band **0–20 (Learning)** or explicit “Not connected.”

---

### 2. Active Top 10 Queue

Primary work surface.

**Presentation:** `AixiaTableShell` variant `registry` or dedicated `agentops` variant; optional card mode on mobile.

**Columns / card fields:**

| Column | Notes |
| --- | --- |
| Rank | 1–10 |
| Severity | `AixiaStatusBadge` / severity tone |
| Category | badge |
| Agent | combined agent name |
| Review panel | short label |
| Page/route | monospace path |
| Issue title | link to detail |
| Status | lifecycle badge |
| Owner decision | latest feedback type icon |
| Verification | verification status badge |
| Actions | `AixiaTableActionsCell` |

**Row actions:** View details, Copy prompt, Mark fixed, Run verification (see Required Actions).

Empty state: `AixiaEmptyState` when queue has 0 items (rare) with explanation that next run will promote.

---

### 3. Backlog Findings

Secondary table with filters; not promoted unless Owner manually promotes (future) or slot opens on schedule.

**Columns:** severity, category, title, route, module, priority_score, created_at, agent, promote button (Owner-only, respects slot cap).

---

### 4. Finding Detail Drawer / Page

**Route:** `/system/agent-ops/findings/:issueCode` or slide-over drawer from queue.

**Sections (vertical stack, `AixiaSection`):**

1. **Summary** — title, severity, status, queue rank  
2. **Problem** — problem / expected / actual  
3. **Evidence** — gallery of screenshots, log snippets (`AixiaReviewGrid`)  
4. **Browser flow** — numbered steps  
5. **Agent opinions** — table of council positions  
6. **CodeGraph context** — file paths, symbols, shared-vs-page recommendation (read-only text)  
7. **Suggested fix** — strategy + non-changes (`AixiaInfoBlock`)  
8. **Owner feedback thread** — chronological remarks  
9. **Focus directive** — if generated from feedback  
10. **Verification history** — past verification runs  
11. **Related findings** — same route/module/pattern  

Use `AixiaContextSummarySection` for executive summary at top.

---

### 5. Prompt Panel

Sticky side panel or tab inside detail.

| Element | Behavior |
| --- | --- |
| Prompt text | monospace block, full prompt |
| Copy button | `AixiaButton` primary |
| Status | draft / approved / copied / used / successful / failed |
| Retest prompt | shown when Still Broken |
| Approve prompt | Owner marks prompt approved → memory |

---

### 6. Owner Feedback Panel

`AixiaFormGrid` + actions:

- Add remark (textarea)  
- Approve / Reject / Defer  
- Mark false positive  
- Priority slider or select  
- Mark in progress  
- Mark fixed → triggers verification queue  
- Request verification  
- Add focus instruction (creates directive)  
- Ask agents to re-review  

All writes go to `agentops_owner_feedback` (future API).

---

### 7. Verification Panel

Visible when status ≥ Marked Fixed.

| Field | Display |
| --- | --- |
| Marked fixed date | from feedback |
| Verification status | badge |
| Route/workflow retested | text |
| Result | Verified Fixed / Still Broken / Needs Follow-Up / Blocked |
| Updated evidence | thumbnails + links |
| Follow-up prompt | copy block if failed |

Primary action: **Run verification now** (manual trigger).

---

### 8. Agent Memory / Focus Page

**Route:** `/system/agent-ops/memory`

**Subsections:**

- Active focus directives (editable, disable, expire)  
- Agent memory entries (filter by agent, type)  
- Rejected patterns  
- Approved patterns  
- False-positive patterns  
- Module priority weights  
- Current sprint focus (Owner text + dates)  

Actions: Disable directive, Delete memory, Edit weight (Owner only).

---

### 9. Run History

**Route:** `/system/agent-ops/runs`

Table: run_type, environment, started_at, status, promoted_count, verified_fixed_count, still_broken_count, summary link.

Drill-down: findings created in that run.

---

### 10. Filters

Global filter bar (`AixiaRegistryToolbar` pattern):

- date / run  
- agent  
- category  
- severity  
- module  
- route (search)  
- status  
- queue state  
- approved / rejected  
- Active Top 10 only  
- backlog only  
- has prompt  
- has owner feedback  
- verification status  

Persist filters in URL query params for shareable Owner links.

---

## Required Actions

Each issue row and detail view must support:

| Action | Effect |
| --- | --- |
| View details | Navigate/open drawer |
| Copy prompt | Clipboard + log `copied_by_owner` |
| Add remark | Feedback row |
| Approve | Status → Approved for Fix |
| Reject | Status → Rejected; memory |
| Defer | Status → Deferred |
| Mark false positive | Status + memory pattern |
| Mark in progress | Status |
| Mark fixed | Status → Marked Fixed; queue verification |
| Run verification | Start verification run |
| Ask agents to re-review | New opinion request run slice |

---

## Visual Design Rules

- Follow AiXia dark glass enterprise design  
- Use **shared** AiXia components only on pages  
- Use registry table/card standards from design-system docs  
- Avoid huge empty gaps; use `aixia-command-scroll` for long pages  
- Responsive: table → cards below `md`  
- Severity colors: critical rose, high amber, medium cyan, low neutral, improvement violet  

---

## Required Shared Components (Implementation Phase)

Use from `src/components/aixia` (extend shared layer first if gaps):

| Component | Use |
| --- | --- |
| `AixiaPage` / future `AgentOpsPage` | Shell |
| `AixiaHero` | Command hero |
| `AixiaMetricGrid` / `AixiaMetricCard` | Hero metrics |
| `AixiaSection` | Section blocks |
| `AixiaTableShell` | Queue + backlog tables |
| `AixiaSortableHeader` | Sortable columns |
| `AixiaTableActionsCell` | Row actions |
| `AixiaBadge` / `AixiaStatusBadge` | Severity, status |
| `AixiaModal` or drawer | Quick actions (if not full page) |
| `AixiaButton` | All actions |
| `AixiaSearchField` | Route/search filters |
| `AixiaInfoBlock` | Warnings, non-changes |
| `AixiaContextSummarySection` | Finding summary |
| `AixiaEmptyState` | Empty queue/backlog |
| `AixiaAlert` | Verification blocked messages |

If AgentOps-specific layout is needed (e.g. opinion matrix, evidence gallery), add **`AixiaAgentOpsFindingPanel`** in `src/components/aixia` first—**not** in `src/app/system/agent-ops` as a one-off visual system.

---

## Important Constraints

- Do not build page-local visual systems  
- Do not import `@/components/ui` directly on AgentOps pages  
- Owner-only data must not leak into other modules’ React context  
- Screenshots may load from private storage; use signed URLs later  

---

## Accessibility

- Keyboard navigation for queue table  
- Focus trap in detail drawer  
- Alt text on evidence screenshots from finding title  

---

## Out of Scope (This Spec)

- Component implementation  
- API routes  
- Realtime subscriptions (optional later for run status)  
