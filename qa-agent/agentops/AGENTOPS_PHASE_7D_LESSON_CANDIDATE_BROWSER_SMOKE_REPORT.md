# AgentOps Phase 7D - Lesson Candidate Browser Smoke Report

## Purpose

Verify the Phase 7C lesson-candidate draft flow through a safe browser smoke path:

- Issue Workspace lesson trigger behavior
- Knowledge lesson-candidate visibility behavior
- metadata-only decision behavior
- runtime safety boundaries (no durable memory write/index/runtime activation)

## Files created

- `qa-agent/browser-qa/tests/agentops-lesson-candidate-phase-7d-smoke.spec.mjs`
- `qa-agent/scripts/run-agentops-lesson-candidate-smoke.mjs`
- `qa-agent/agentops/AGENTOPS_PHASE_7D_LESSON_CANDIDATE_BROWSER_SMOKE_REPORT.md`

## Files modified

- `package.json`
- `src/app/system/agent-ops/issues/[issueCode]/page.tsx`
- `src/app/system/agent-ops/knowledge/page.tsx`

## Package script added

- `qa:agentops-lesson-candidate-smoke`

## Smoke scope and issue tested

- Primary test route set:
  - `/system/agent-ops/issues/AIXIA-SAMPLE-001`
  - `/system/agent-ops/knowledge`
- Dynamic issue candidate scan from issues list included.

## Verified-fixed sample availability

- Verified-fixed sample with enabled `Prepare Lesson Candidate` action: **not found** in this run.
- Smoke status: **BLOCKED_NO_VERIFIED_FIXED_ISSUE** (safe blocked outcome, not false pass).

## Draft trigger / Knowledge visibility / decisions

- Draft trigger tested: **No** (blocked by sample availability)
- Knowledge draft visibility tested: **Yes** (route checked)
- Decision metadata tested: **No** (no visible draft card to act on)

## Safety assertions

Validated through available UI context:

- no durable memory write wording
- approval required before memory
- Supabase source-of-truth boundary (or marked not-evaluable when section unavailable)
- agentmemory inactive boundary (or marked not-evaluable when section unavailable)
- Hermes inactive boundary
- no local LLM active wording
- no auto Cursor execution labels
- no production-mode safety violation wording

## Screenshots / report paths

- JSON smoke report:
  - `qa-agent/reports/browser-qa/lesson-candidate-phase-7d-smoke-report.json`
- Screenshots:
  - `qa-agent/reports/browser-qa/screenshots/lesson-candidate-phase-7d/01-issues-list.png`
  - `qa-agent/reports/browser-qa/screenshots/lesson-candidate-phase-7d/03-knowledge-lesson-section.png`
  - `qa-agent/reports/browser-qa/screenshots/lesson-candidate-phase-7d/04-issue-runtime-safety.png`
- Playwright artifacts:
  - `qa-agent/reports/browser-qa/playwright-output/`
  - `qa-agent/reports/browser-qa/playwright-report.json`
  - `qa-agent/reports/browser-qa/playwright-html/`

## Command results

- `npm run qa:agentops-lesson-candidate-smoke` -> **BLOCKED_NO_VERIFIED_FIXED_ISSUE** (runner exit 0)
- `npm run qa:agentops-issue-workspace-smoke` -> **PASS**
- `npm run qa:agentops-agent-clarification-smoke` -> **PASS**
- `npm run qa:agentops-codegraph-discovery-smoke` -> **PASS**
- `npm run build` -> **PASS** (with pre-existing guardrail warnings outside this scope)
- `npm run qa:validate-foundation` -> **PASS**
- `npm run qa:static-design-guardrails` -> **PASS**
- `npm run qa:guardrail-action-plan` -> **PASS**

## Remaining concerns

- No verified-fixed-equivalent sample issue with enabled lesson trigger was available during this run.
- Knowledge lesson-candidate section visibility was constrained by environment fetch issues in this run; safety checks were completed with blocked-mode fallback notes.
- One initial flaky login attempt occurred in the new smoke run; retry passed and produced blocked status.

## Next recommended phase

- Phase 7E: seed a deterministic staging-safe verified-fixed sample fixture (or QA seed command) so the smoke can consistently exercise full trigger -> Knowledge draft -> decision metadata path as **PASS** instead of blocked.
