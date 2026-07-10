# AgentOps Monitoring Phase 5C — Issue Draft Pipeline

**Status:** Verified and locked  
**Environment:** Staging (`ydppcpbxrvvardeslzrk`)  
**Branch:** `staging`  
**Effective:** 2026-07-06  

## Summary

Phase 5C established the owner-gated issue **draft** pipeline from scheduled monitoring dry-runs. GHA and runtime paths may create drafts only — never live issues without explicit owner action.

## Verified workflow

1. GHA `workflow_dispatch` dry-run on staging routes
2. Playwright report persisted to run index (`agentops_monitoring_runs`)
3. Issue draft rows inserted (`agentops_monitoring_issue_drafts`, status=`draft`)
4. Owner reviews drafts in AgentOps Issues hub
5. Owner decisions: Approve / Reject / Defer (no auto-promotion)

## Safety invariants

- No auto-promotion from GHA or monitoring insert scripts
- Draft status lifecycle: `draft` → `owner_approved` | `rejected` | `deferred`
- Promotion requires separate Phase 5D owner-click step
- Staging Supabase only; production untouched

## Evidence

- Registry: `registry/AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK.md` §2–§4
- UI: `MonitoringIssueDraftsReview` on Findings → Needs review
- API: `POST /api/agentops/monitoring/drafts/decision`

## Verdict

**PHASE_5C_DRAFT_PIPELINE_LOCKED:** YES
