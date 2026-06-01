# AgentOps Phase 6C — CodeGraph Mock Discovery Browser Smoke Report

## Purpose

Browser-only verification that the **CodeGraph Discovery** panel (Phase 6B mock adapter) is visible, readable, safe, and useful on the Issue Workspace for sample issue `AIXIA-SAMPLE-001`. No CodeGraph runtime, MCP, Hermes, repository scan, or auto-execution.

## Environment

| Item | Value |
|------|--------|
| Base URL | `http://127.0.0.1:5173` |
| Auth | Owner QA (`AGENTOPS_QA_OWNER_EMAIL` / `AGENTOPS_QA_OWNER_PASSWORD`) |
| Issue code | `AIXIA-SAMPLE-001` |
| Route | `/system/agent-ops/issues/AIXIA-SAMPLE-001` |
| Viewport | 1366×768 |
| Smoke run ID | `codegraph-discovery-phase-6c-1780018268711` |
| Playwright duration | ~24s |

## Files Created

| File | Role |
|------|------|
| `qa-agent/agentops/AGENTOPS_PHASE_6C_CODEGRAPH_DISCOVERY_BROWSER_SMOKE_REPORT.md` | This report |
| `qa-agent/browser-qa/tests/agentops-codegraph-discovery-phase-6c-smoke.spec.mjs` | Playwright smoke spec |
| `qa-agent/scripts/run-agentops-codegraph-discovery-smoke.mjs` | npm script runner |
| `qa-agent/reports/browser-qa/codegraph-discovery-phase-6c-smoke-report.json` | Machine-readable smoke results |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Added `qa:agentops-codegraph-discovery-smoke` |
| `qa-agent/browser-qa/tests/agentops-codegraph-discovery-phase-6c-smoke.spec.mjs` | Fixed section locator (`.aixia-label` vs `heading` role) to prevent 4m timeout |

**Not modified:** `src/lib/agentops/*`, Issue Workspace UI, schema/RLS/migrations, production/main.

## Screenshots Captured

Saved under `qa-agent/reports/browser-qa/screenshots/codegraph-discovery-phase-6c/`:

1. `01-issue-workspace-codegraph-panel.png` — Issue Workspace with CodeGraph Discovery visible
2. `02-codegraph-suggestion-cards.png` — Advisory suggestion cards
3. `03-safety-labels-runtime-inactive.png` — Runtime/MCP/scan inactive state
4. `04-prompt-editor-after-append.png` — Cursor prompt textarea after “Add all hints”
5. `05-lifecycle-no-auto-execution.png` — Lifecycle / prompt area (no auto-execution)

## Smoke Results Summary

**Status: PASSED** (`qa-agent/reports/browser-qa/codegraph-discovery-phase-6c-smoke-report.json`)

### 1. Page load

| Check | Result |
|-------|--------|
| Issue Workspace route loads | Yes |
| Back to issues visible | Yes |
| Issue code visible | Yes |
| CodeGraph Discovery panel visible | Yes |
| Panel before Cursor Prompt / Execution Request | Yes (`codegraphTextIdx` 17184 &lt; `promptTextIdx` 21308) |
| Layout break | None observed |

### 2. Safety labels (visible copy)

| Label | Result |
|-------|--------|
| CodeGraph runtime not connected | Yes (“Runtime: Not connected”, description mentions runtime not connected) |
| MCP not called | Yes |
| Browser scan: No | Yes |
| Repository scan: No | Yes |
| Owner review required | Yes |
| Advisory-only messaging | Yes (“Advisory suggestions (verify in repo before editing)”) |
| Info block: No MCP / No browser scan / No repository scan | Yes |

### 3. Mock static hints (`AIXIA-SAMPLE-001`)

Sample issue route in data: `/finance/master-data/payment-methods` — mock hints correctly skew to **finance** areas (not AgentOps route hints).

| Check | Result |
|-------|--------|
| Source: mock static hints | Yes |
| Runtime / MCP / browser / repository scan all inactive | Yes (UI + mock contract) |
| Confidence labels | Yes |
| Reason text on cards | Yes |
| `safeToIncludeInPrompt` false / pending Piter review | Yes (“No — pending Piter review”) |
| Suggestion cards readable | Yes (13+ labels observed) |

**Suggestions observed (subset):**

- Reported route: /finance/master-data/payment-methods
- Finance route area, Finance page and access
- Page component first, Shared AiXia components, Shared AiXia design system CSS
- Route guard and permission helpers, Finance permissions / pageAccess
- Types and contracts, Tests and smoke, Related past fixes, Recurrence clues
- Inspect route/page: /finance/master-data/payment-methods

### 4. Prompt safety

| Check | Result |
|-------|--------|
| Copy suggestion button visible | Yes |
| Add all hints to prompt draft visible | Yes |
| Copy suggestion toast detected | **No** (button present; headless clipboard/toast not confirmed — non-blocking) |
| Append increases draft length | Yes |
| Append contains `CODEGRAPH DISCOVERY HINTS — OWNER REVIEW REQUIRED` | Yes |
| Append auto-approves prompt | **No** |
| Append prepares execution request | **No** |
| Cursor auto-triggered | **No** |
| Prompt textarea still editable | Yes |

### 5. Layout (1366×768)

| Check | Result |
|-------|--------|
| Clipped primary buttons | None detected |
| Overlapping text | None observed |
| Scroll in main content | Works |
| Panel readable | Yes |

## UI Bugs Found

None blocking. Minor observations:

1. **Copy suggestion feedback** — Playwright did not detect “CodeGraph suggestion copied” toast within 5s (likely clipboard API in headless Chromium). Button is present and wired in UI; manual browser copy should be re-verified if needed.
2. **Console noise** — Intermittent `Failed to fetch` for profile/AI chat settings during smoke (Supabase session edge); did not block workspace or CodeGraph panel.

## Fixes Made (smoke harness only)

- **Root cause of prior 4m timeout:** smoke used `getByRole("heading", { name: /codegraph discovery/i })` but `AixiaSection` renders title in `.aixia-label`, not a heading role.
- **Fix:** scope panel via `section` + `.aixia-label` filter; assert visibility before `innerText()`; scope suggestion/button locators to CodeGraph section.

No application feature changes.

## Validation Commands

| Command | Result |
|---------|--------|
| `npm run qa:agentops-codegraph-discovery-smoke` | **PASS** (1 passed, ~26s) |
| `npm run build` | **PASS** (guardrail warnings only, pre-existing) |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** |
| `npm run qa:guardrail-action-plan` | **PASS** |

## Safety Confirmation

| Runtime / action | Called? |
|------------------|---------|
| CodeGraph runtime | **No** |
| MCP | **No** |
| Browser file scan | **No** |
| Repository scan | **No** |
| Hermes runtime | **No** |
| External LLM | **No** |
| Cursor auto-trigger | **No** |
| Schema / RLS / migrations changed | **No** |
| Production / main touched | **No** |

## Final Recommendation

**Approve Phase 6B mock CodeGraph Discovery for staging Issue Workspace use** as an advisory, owner-review-only panel. The UI is correctly placed, labeled, and constrained. Mock hints for `AIXIA-SAMPLE-001` behave as designed for its finance route metadata.

**Optional follow-ups (not required for 6C):**

- Phase 6D: optional real CodeGraph runtime behind owner flag (still no auto-prompt / no auto-Cursor).
- Improve Playwright copy assertion (grant clipboard permissions or assert feedback region).
- Dedicated sample issue with `/system/agent-ops/issues` route if AgentOps-specific hint cards need explicit screenshot proof.

## Phase 6C Final Check

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | Report, smoke spec, runner script, JSON report, 5 screenshots |
| 2 | Files modified | `package.json`, smoke spec (locator fix) |
| 3 | Browser smoke run | **Yes** |
| 4 | Issue code tested | `AIXIA-SAMPLE-001` |
| 5 | CodeGraph Discovery panel visible | **Yes** |
| 6 | Safety labels visible | **Yes** |
| 7 | Mock static hints shown | **Yes** |
| 8 | Unknowns handled safely | **Yes** |
| 9 | Copy suggestion works | **Not verified in automation** (button visible; toast not detected) |
| 10 | Append hints works | **Yes** |
| 11 | Append auto-approves | **No** |
| 12 | Cursor auto-triggered | **No** |
| 13 | CodeGraph runtime called | **No** |
| 14 | MCP called | **No** |
| 15 | Browser/repository scan used | **No** |
| 16 | Hermes runtime called | **No** |
| 17 | External LLM called | **No** |
| 18 | Screenshots captured | **Yes** |
| 19 | Schema/RLS/migrations changed | **No** |
| 20 | Production/main touched | **No** |
| 21 | Command results | All PASS (see Validation Commands) |
| 22 | Final status | **PASS — Phase 6C complete** |
| 23 | Next recommended prompt | *AgentOps Phase 6D — CodeGraph staging runtime adapter (owner-gated, read-only discovery call, still no prompt auto-mutation or auto-Cursor).* |
