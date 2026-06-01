# AgentOps Stage 12 Verification Runner Foundation Report

## Purpose

Create a **staging-only, CLI-driven verification runner foundation** so fixed AgentOps issues can be re-checked with targeted QA commands and structured results (`verified_fixed`, `still_broken`, `needs_follow_up_fix`, `verification_blocked`) **without** automatic DB updates, schedulers, or Hermes/CodeGraph runtime automation.

## Files Created

| File | Purpose |
| --- | --- |
| `qa-agent/verification/verification-plan-schema.json` | Plan shape, verification types, result statuses, example plan |
| `qa-agent/verification/verification-targets.json` | Three built-in verification target templates |
| `qa-agent/scripts/agentops-verification-runner.mjs` | Runner (dry-run + execute + evaluate + report) |
| `qa-agent/reports/verification/verification-foundation-run.json` | Latest run output (overwritten per invocation) |
| `qa-agent/reports/verification/verification-foundation-run.md` | Human-readable latest run summary |
| `qa-agent/agentops/AGENTOPS_STAGE_12_VERIFICATION_RUNNER_FOUNDATION_REPORT.md` | This report |

## Files Modified

| File | Change |
| --- | --- |
| `package.json` | Added `qa:agentops-verify` script |
| `src/app/system/agent-ops/page.tsx` | Read-only **Verification Runner (Stage 12)** info block with CLI examples (no execution from UI) |

**Not modified:** `src/lib/agentops/types.ts`, `service.ts`, `index.ts` (deferred to Stage 12B).

## Verification Targets

| targetId | Issues | Type | Primary command |
| --- | --- | --- | --- |
| **guest-finance-access** | AIXIA-WORKFLOW-RWF-28, AIXIA-WORKFLOW-RWF-29 | role-workflow-verification | `qa:agentops-role-workflow-safe` |
| **quotation-create-shell-access** | AIXIA-WRITE-WDS-1, AIXIA-WRITE-WDS-2 | write-draft-verification | `qa:agentops-write-draft-safe` |
| **generic-build-and-smoke** | (any post-fix gate) | build-verification | `build`, `qa:validate-foundation`, synthetic + owner smoke |

## Runner Commands

```bash
npm run qa:agentops-verify -- --dry-run
npm run qa:agentops-verify -- --target generic-build-and-smoke
npm run qa:agentops-verify -- --target guest-finance-access
npm run qa:agentops-verify -- --target quotation-create-shell-access
npm run qa:agentops-verify -- --issue AIXIA-WRITE-WDS-1
```

- Default (no `--target` / `--issue`): **dry-run** all targets.
- Browser targets require dev server at `http://127.0.0.1:5173`.
- Runner **does not** update `agentops_findings` or `agentops_verifications` (report-only).

## Result Logic

| Status | When |
| --- | --- |
| **verified_fixed** | All pass criteria met for the target; no reproduction of the original defect |
| **still_broken** | Fail criteria met (e.g. guest loads finance route, viewer loads create shell) |
| **needs_follow_up_fix** | Partial pass or non-critical findings with core fix intact |
| **verification_blocked** | Dev server down, missing report, or required command failed / skipped |

Evaluators parse existing browser JSON reports after commands run (`role-workflow-safe-report.json`, `write-draft-safe-report.json`, smoke reports).

## Validation Runs (Stage 12)

| Command | Result |
| --- | --- |
| `npm run qa:agentops-verify -- --dry-run` | **PASS** — plan printed; reports written |
| `npm run qa:agentops-verify -- --target generic-build-and-smoke` | **verified_fixed** (build + foundation + smokes) |
| `npm run qa:agentops-verify -- --target guest-finance-access` | **verified_fixed** (role workflow; guest routes not `loaded`) |
| `npm run qa:agentops-verify -- --target quotation-create-shell-access` | **verified_fixed** (write-draft 0 findings; viewer/guest blocked) |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |

Latest per-target JSON snapshots: see `qa-agent/reports/verification/verification-foundation-run.json` (last invocation wins).

## What Was Not Implemented

- No scheduler / cron / 24×7 automation
- No automatic AgentOps DB status update or issue closure
- No Hermes or CodeGraph **runtime** automation (docs/UI references unchanged)
- No production / main Supabase / main GitHub changes
- No schema / RLS / migrations / API routes
- No UI “Run verification” button (CLI only)
- No finance or permission code changes

## Final Status

**PASS**

## Next Recommended Stage

**Stage 12B** — Connect verification runner results to AgentOps `agentops_verifications` + Owner verification queue (`recordAgentOpsVerificationResult` / pending verification UI), with explicit Owner confirmation before archiving.

**Or Stage 13** — Run orchestrator foundation (daily workflow glue without cron).
