# AgentOps Stage 12B Verification Queue Integration Report

## Purpose

Connect the Stage 12 verification runner to AgentOps issue/verification flow with two explicit modes:

1. **report-only** (default) — run checks, write `verification-foundation-run.*`, no DB writes  
2. **apply** — staging-only, requires `--apply --owner-approved`, records evidence via Owner-authenticated Supabase (RLS)

No scheduler, no silent auto-close, no UI-triggered execution.

## Files Modified

| File | Change |
| --- | --- |
| `qa-agent/scripts/agentops-verification-runner.mjs` | `--apply`, `--owner-approved`, apply phase, apply report fields, skip commands when all target issues already archived |
| `src/app/system/agent-ops/page.tsx` | Stage 12B Verification Runner panel with apply warning + CLI examples |

## Files Created

| File | Purpose |
| --- | --- |
| `qa-agent/scripts/agentops-verification-apply.mjs` | Owner-authenticated apply logic (feedback + backlog/active_top_10 paths) |
| `qa-agent/agentops/AGENTOPS_STAGE_12B_VERIFICATION_QUEUE_INTEGRATION_REPORT.md` | This report |

**Not modified:** `src/lib/agentops/types.ts`, `service.ts`, `index.ts` (Node script mirrors existing service semantics via Supabase + RLS; UI/service wiring deferred).

## Modes

| Mode | Flags | DB updates |
| --- | --- | --- |
| **report-only** | default, or run with `--target` / `--issue` without `--apply` | **No** |
| **apply** | `--apply --owner-approved` plus `--target` or `--issue` | **Yes** (staging Owner only) |

Safety guards:

- `--apply` without `--owner-approved` → exit **1**: `Apply mode requires --owner-approved.`
- `--apply` without `--target` or `--issue` → exit **1**
- Staging ref guard on `VITE_SUPABASE_URL` (`ydppcpbxrvvardeslzrk`)
- Owner credentials required (`AGENTOPS_QA_OWNER_*`)
- No DB updates in `--dry-run`

## Apply Rules

| Finding state | `verified_fixed` | `still_broken` / `needs_follow_up_fix` / `verification_blocked` |
| --- | --- | --- |
| **Already Verified Fixed / archived** | Skip status change; record `agentops_owner_feedback` with `verification_runner_already_resolved` | Same (feedback only) |
| **backlog** (resolvable status) | `Verified Fixed` + `archived` + feedback (`backlog_verified_fixed`) | Feedback only; status unchanged |
| **active_top_10** + pending/running verification | Update `agentops_verifications` + finding status per result | Update verification row + keep/reopen active as per result mapping |
| **active_top_10** without pending verification | Feedback only (`evidence_only_no_pending_verification`) — **does not** auto-archive | Feedback only |

Issue mapping comes from `verification-targets.json` `issueCodes`. `--issue` restricts apply to that code when it belongs to the target.

## Evidence Metadata

Recorded on apply in `agentops_owner_feedback.metadata` (and verification row metadata when pending verification exists):

- `verificationTarget`, `verificationResult`, `verificationRunId`
- `reportJsonPath`, `reportMdPath`
- `commandResults`, `checks`
- `ownerApproved: true`, `appliedBy: agentops-verification-runner`, `stage: 12B`

Paths: `qa-agent/reports/verification/verification-foundation-run.json` / `.md`

## Validation Results

| # | Command | Result |
| --- | --- | --- |
| 1 | `npm run qa:agentops-verify -- --target generic-build-and-smoke` | **PASS** (report-only; `verified_fixed` when build + smokes pass) |
| 2 | `npm run qa:agentops-verify -- --target quotation-create-shell-access --apply` | **PASS** (exit 1): `Apply mode requires --owner-approved.` |
| 3 | `npm run qa:agentops-verify -- --target quotation-create-shell-access --apply --owner-approved` | **PASS**: WDS-1/WDS-2 `skipped_already_resolved`, feedback recorded |
| 4 | `npm run qa:agentops-verify -- --target guest-finance-access --apply --owner-approved` | **PASS**: RWF-28/29 `skipped_already_resolved`, feedback recorded |
| 5 | `npm run qa:validate-foundation` | **PASS** |
| 6 | `npm run build` | **PASS** |

Latest apply run: `verification-foundation-1779934408509` (guest-finance-access apply sample).

## What Was Not Implemented

- No scheduler / cron / 24×7 automation
- No Hermes or CodeGraph runtime automation
- No production / main Supabase / GitHub
- No schema / RLS / migrations / API routes
- No automatic issue closure without `--apply --owner-approved`
- No UI “Run verification” button
- No service-layer TypeScript export for runner (script-only apply)

## Final Status

**PASS**

## Next Recommended Stage

**Stage 13** — AgentOps run orchestrator foundation (daily workflow glue without cron).

Optional follow-up: wire `recordAgentOpsVerificationResult` from the app when Owner clicks “Apply verification report” using the latest JSON path.
