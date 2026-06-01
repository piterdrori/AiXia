# AgentOps Stage 4B Sample Data Smoke Test

## Purpose
Staging-only sample data seed and validation so `/system/agent-ops` can be visually tested with real database rows before write actions (feedback, Mark Fixed, verification).

## Environment
- **Project:** aixia-staging
- **Project ref:** `ydppcpbxrvvardeslzrk`
- **Route:** `/system/agent-ops`
- **User:** Piter Drori (`2826e36f-22ad-4403-bad5-57b85e011d88`) — bootstrap Owner
- **Date/time (UTC):** 2026-05-27 (Stage 4B seed session)

## Seed Summary
| Entity | Count |
|--------|------:|
| `agentops_runs` | 1 |
| Active Top 10 findings (`active_top_10`) | 5 |
| Backlog findings (`backlog`) | 3 |
| `agentops_agent_opinions` | 3 |
| `agentops_prompt_library` | 1 |
| `agentops_evidence_files` | 1 |

**Sample run ID:** `392f45fb-bbab-402c-8b01-d63d6f24c59b`

All seeded rows use `metadata.sample = true` and/or `issue_code` prefix `AIXIA-SAMPLE*`.

## Sample Records

### Run
| Field | Value |
|-------|--------|
| run_type | manual |
| environment | staging |
| status | completed |
| summary | AgentOps Stage 4B sample data seed for UI smoke testing. |
| metadata.hermes | score 8, label Learning, mode Database-only, appCallable false, codegraphCallable false |

### Active Top 10 (`AIXIA-SAMPLE-001` … `005`)
| issue_code | title | severity | rank | route |
|------------|-------|----------|-----:|-------|
| AIXIA-SAMPLE-001 | [SAMPLE] Payment methods registry column alignment | Critical | 1 | /finance/master-data/payment-methods |
| AIXIA-SAMPLE-002 | [SAMPLE] Finance reports export button spacing | High | 2 | /finance/reports |
| AIXIA-SAMPLE-003 | [SAMPLE] Finance settings hero badge drift | Medium | 3 | /finance/settings |
| AIXIA-SAMPLE-004 | [SAMPLE] Customer PO wizard step validation copy | Medium | 4 | /finance/transactions/customer-pos |
| AIXIA-SAMPLE-005 | [SAMPLE] AgentOps shell empty-state copy polish | Suggestion | 5 | /system/agent-ops |

### Backlog
| issue_code | title | severity |
|------------|-------|----------|
| AIXIA-SAMPLE-BACKLOG-001 | [SAMPLE] Backlog — vendor archive filter persistence | Medium |
| AIXIA-SAMPLE-BACKLOG-002 | [SAMPLE] Backlog — calendar day view mobile scroll | Low |
| AIXIA-SAMPLE-BACKLOG-003 | [SAMPLE] Backlog — AI management metric refresh label | Suggestion |

### Related rows
- **Opinions:** linked to SAMPLE-001, SAMPLE-002, SAMPLE-003 (agents: security-permissions-tenant-isolation, final-council-chair-implementation-planner, design-ux-excellence)
- **Prompt:** fix prompt on SAMPLE-001 (marked sample in text)
- **Evidence:** browser-note on SAMPLE-001 → `qa-agent/sample-evidence/sample-browser-note.md`

## Expected Dashboard Metrics (service layer)
| Metric | Expected |
|--------|----------|
| activeOpenCount | 5 |
| openSlots | 5 (10 − 5) |
| backlogCount | 3 |
| criticalOpenCount | 1 |
| verificationPendingCount | 0 (unless other rows exist) |
| Hermes | 8/100 Learning from latest sample run metadata |

SQL verification on staging after seed: **active_open=5, backlog_count=3, critical_open=1** for `AIXIA-SAMPLE%` rows.

## UI Smoke Test Result

| Check | Result | Notes |
|-------|--------|-------|
| Sidebar visible for owner | **Pending manual** | Code: `DashboardLayout` shows link when `getAgentOpsOwnerStatus()` is true |
| Page loaded | **Pending manual** | Route registered; page gates on owner RPC |
| Hermes meter | **Verified via SQL** | Latest sample run has hermes metadata 8/Learning |
| Active Top 10 | **Verified via SQL** | 5 rows with ranks 1–5 |
| Backlog | **Verified via SQL** | 3 backlog rows |
| Run history | **Verified via SQL** | 1 completed manual staging run |
| Refresh | **Pending manual** | Read-only re-fetch; no writes in service |
| Errors | **None in seed** | All inserts succeeded |

**Browser/manual UI test:** Not run in this session (no authenticated browser session to staging app). **Piter should open staging/local app as Owner and confirm visuals.**

**Code inspection (Stage 4 page):** Page loads summary, top10, backlog, run history via read-only services; opinions/prompts/evidence are **not** on the main shell (finding detail route not built yet) — seed of those rows is for future detail UI only.

## RLS / Access Notes
| Test | Result |
|------|--------|
| Owner JWT simulation (`2826e36f-…`) | **8** sample findings visible |
| Non-owner employee JWT simulation | **0** sample findings visible |
| Production | **Not touched** |

## Cleanup Option
When sample data should be removed (only when Piter approves):

```sql
-- Staging only — review before running
DELETE FROM public.agentops_evidence_files
WHERE finding_id IN (SELECT id FROM public.agentops_findings WHERE issue_code LIKE 'AIXIA-SAMPLE%');

DELETE FROM public.agentops_prompt_library
WHERE finding_id IN (SELECT id FROM public.agentops_findings WHERE issue_code LIKE 'AIXIA-SAMPLE%');

DELETE FROM public.agentops_agent_opinions
WHERE finding_id IN (SELECT id FROM public.agentops_findings WHERE issue_code LIKE 'AIXIA-SAMPLE%');

DELETE FROM public.agentops_findings
WHERE issue_code LIKE 'AIXIA-SAMPLE%';

DELETE FROM public.agentops_runs
WHERE metadata->>'sample' = 'true'
  AND summary LIKE '%Stage 4B%';
```

Or broader: `DELETE FROM public.agentops_findings WHERE metadata->>'sample' = 'true';`

**Do not run cleanup unless explicitly requested.**

## What Was Not Done
- No production database changes
- No schema/migrations
- No app source changes
- No write UI, API, cron, browser automation, or Hermes automation
- No package installs
- Sample data not deleted

## Final Status
**PASS WITH FOLLOW-UP**

Staging sample data seeded and validated via SQL + RLS simulation. **Follow-up:** Piter manual browser smoke test on `/system/agent-ops` against staging (or local app pointed at staging Supabase).

## Next Recommended Stage
**Stage 5 — Owner feedback + Mark Fixed write flows** (service + UI), still Owner-gated.

**Or** quick **Stage 4B manual sign-off** prompt: Owner opens staging UI, confirms 5/3/1 metrics and tables, then proceed to Stage 5.
