# AgentOps Stage 13B Fix Plan Generator Report

## Purpose

Generate repeatable issue summaries, fix plans, verification plans, and safe Cursor prompts for selected AgentOps findings.

## Files Created

| File | Purpose |
| --- | --- |
| `qa-agent/fix-planning/fix-plan-schema.json` | Canonical generated fix-plan structure |
| `qa-agent/fix-planning/fix-plan-generator-config.json` | Selection rules, validation commands, do-not-change defaults |
| `qa-agent/scripts/generate-agentops-fix-plans.mjs` | Planning/report generator script |
| `qa-agent/reports/fix-plans/agentops-fix-plan-summary.md` | Human-readable generated plan index |
| `qa-agent/reports/fix-plans/agentops-fix-plan-summary.json` | Machine-readable generated plan index |
| `qa-agent/agentops/AGENTOPS_STAGE_13B_FIX_PLAN_GENERATOR_REPORT.md` | This stage report |

Per-issue outputs were generated in:
`qa-agent/reports/fix-plans/issues/`

## Files Modified

| File | Change |
| --- | --- |
| `package.json` | Added `qa:agentops-fix-plans` script |
| `src/app/system/agent-ops/page.tsx` | Added read-only Fix Plan Generator panel with command examples and warning |

## How It Works

1. Reads report/import-plan sources from `public/agentops/*.json` and latest orchestrator/report context.
2. Applies configured selection rules:
   - include `active_top_10` open findings
   - include `backlog` findings with `metadata.approvedByPiter = true`
   - include `backlog` findings with `High`/`Critical` severity
   - skip `Verified Fixed`, `Archived`, `False Positive`, `Deferred`
3. Generates per-issue plan JSON + markdown containing:
   - Piter-readable summary
   - likely root cause
   - preferred fix strategy
   - do-not-change guardrails
   - validation commands
   - copy-paste Cursor prompt
4. Writes summary index JSON + markdown.

## Generated Plan Outputs

- Summary: `qa-agent/reports/fix-plans/agentops-fix-plan-summary.md`
- Summary JSON: `qa-agent/reports/fix-plans/agentops-fix-plan-summary.json`
- Example issue plan:
  - `qa-agent/reports/fix-plans/issues/AIXIA-WORKFLOW-RWF-28_FIX_PLAN.md`
  - `qa-agent/reports/fix-plans/issues/AIXIA-WORKFLOW-RWF-28_FIX_PLAN.json`

Generated in this run:
- selected issues: **3**
- generated plans: **3**
- source mode: `reports`

## Safety Rules

Confirmed:

- no DB updates
- no code fixes
- no Cursor execution
- no scheduler/cron
- no production/main operations
- no schema/RLS/API changes
- staging-only planning context

## Validation Results

| Command | Result |
| --- | --- |
| `npm run qa:agentops-fix-plans` | **PASS** (3 plans generated) |
| `npm run qa:agentops-fix-plans -- --dry-run` | **PASS** (no files written) |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** (existing guardrail warnings only) |

## Final Status

**PASS**

## Next Recommended Stage

**Stage 13C** — Owner approval workflow for generated fix plans.

Alternative: **Stage 14** — auto-refill scan trigger when backlog is low (priority dependent).
