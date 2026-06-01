# AgentOps Phase 3B Issue Workspace Browser Smoke Report

## Purpose

Browser smoke verification for Phase 3 manual-first execution bridge on staging/local Issue Workspace routes.

## Environment

- Base URL: `http://127.0.0.1:5173`
- Viewport: 1366×768 (14-inch laptop class)
- Auth: AgentOps owner QA credentials (read-only smoke)
- Run command: `npm run qa:agentops-issue-workspace-smoke`

## Issue Code Tested

**`AIXIA-SAMPLE-001`** — `[SAMPLE] Payment methods registry column alignment`

Selected from Issues list (16 issues shown). Safe sample issue used; no destructive actions performed.

## Routes Tested

1. `/system/agent-ops/issues`
2. `/system/agent-ops/issues/AIXIA-SAMPLE-001`

## Screenshots Created

Saved under `qa-agent/reports/browser-qa/screenshots/issue-workspace-phase-3b/`:

| File | Coverage |
|------|----------|
| `01-issue-list.png` | Issues list, filters, queue summary, manual-first list subtitle |
| `02-lifecycle-rail-top.png` | Issue header, manual-first banner, lifecycle rail, execution state badge |
| `03-cursor-prompt-editor.png` | Issue summary, evidence, reporting agent |
| `04-cursor-report-verification.png` | Structured Cursor prompt editor, manual handoff buttons, Cursor Report panel |
| `05-timeline-future-placeholders.png` | Closure/archive, issue timeline, future placeholders (Hermes/CodeGraph inactive) |

JSON machine report: `qa-agent/reports/browser-qa/issue-workspace-phase-3b-smoke-report.json`

## Visual Checks

### Issue list (`/system/agent-ops/issues`)

- Issue list heading visible: **Yes**
- Filters visible (status/queue/severity/category/route/agent + search): **Yes**
- Open Workspace actions visible (16 rows): **Yes**
- Queue summary cards visible: **Yes**
- Page-level horizontal scroll: **No**
- Layout break / clipped buttons: **None observed**

### Issue workspace (`/system/agent-ops/issues/AIXIA-SAMPLE-001`)

- Back to Issues pill + Issue Workspace badge: **Yes**
- Issue command bar (title/status/severity/route): **Yes**
- Manual-first execution bridge banner: **Yes**
- Lifecycle rail (9-step path + execution state): **Yes** (`prompt draft ready`)
- Issue summary + evidence panels: **Yes**
- Cursor Prompt Editor (12-section structured text): **Yes**
- Prompt contains TASK / PURPOSE / STAGING ONLY / FINAL CHECK: **Yes**
- Handoff buttons present (Prepare, Copy, Mark Copied, Mark Working): **Yes** (disabled until plan approved — expected)
- Cursor Report panel + structured intake form: **Yes**
- Verification panel: **Yes** (present in DOM; visible on scroll between prompt/report sections)
- Issue timeline: **Yes** (issue found/imported event shown)
- Future placeholders inactive: **Yes** (Agent chat planned, Hermes not active, CodeGraph not active)
- Page scroll works in main content container: **Yes**

## Safety Checks

- Manual-first copy visible: **Yes**
- “Does not run Cursor automatically” visible: **Yes**
- No auto-fix / run Cursor now / production fix labels: **Confirmed**
- Hermes runtime: **Not active** (placeholder only)
- CodeGraph runtime: **Not active** (placeholder only)
- Scheduler activation: **Not triggered**
- Auto Cursor execution: **Not triggered**
- Shell execution from UI: **Not triggered**
- Destructive actions (prepare handoff, record report, verification result, close): **Not clicked**

## UI Bugs Found

None blocking. Observations only:

1. **Scroll container:** Main app content scrolls inside `main .overflow-y-auto` (DashboardLayout), not window — smoke harness must scroll that container for section screenshots.
2. **Handoff buttons disabled** on sample issue until fix plan approved — expected manual-first gating, not a defect.

## Fixes Made (Phase 3B harness only)

1. Added `qa-agent/browser-qa/tests/agentops-issue-workspace-phase-3b-smoke.spec.mjs`
2. Added `qa-agent/scripts/run-agentops-issue-workspace-smoke.mjs`
3. Added npm script `qa:agentops-issue-workspace-smoke`
4. Improved waits/selectors for AixiaSection label markup and inner scroll container

No application business-logic changes.

## Validation Results

| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `npm run qa:validate-foundation` | PASS |
| `npm run qa:static-design-guardrails` | PASS |
| `npm run qa:guardrail-action-plan` | PASS |
| `npm run qa:agentops-issue-workspace-smoke` | PASS (final run) |

## Final Recommendation

**Phase 3 Issue Workspace manual-first bridge is visually usable on staging/local.** Proceed to **Phase 4 — Agent response mock layer inside Issue Workspace**, or repeat Phase 3B after significant UI changes.

## Safety Confirmations

- no auto Cursor execution ✅
- no shell execution from UI ✅
- no scheduler activation ✅
- no Hermes runtime ✅
- no CodeGraph runtime ✅
- no schema/RLS/migration changes ✅
- no production/main ✅
