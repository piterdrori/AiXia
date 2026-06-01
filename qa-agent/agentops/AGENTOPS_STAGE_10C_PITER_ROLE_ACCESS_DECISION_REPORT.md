# AgentOps Stage 10C Piter Role Access Decision Report

## Purpose

Prepare Stage 10 role-workflow findings for **Piter approval** before any AgentOps backlog import, `workflow-scope.json` edits, or app/permission changes. This stage is decision documentation only.

## Source

| Artifact | Path |
| --- | --- |
| Stage 10B review | `qa-agent/reports/browser-qa/role-workflow-findings-review.json` |
| Stage 10B summary | `qa-agent/reports/browser-qa/role-workflow-findings-review.md` |
| Import plan (not applied) | `public/agentops/role-workflow-import-plan.json` |
| SQL (not applied) | `qa-agent/reports/browser-qa/agentops-role-workflow-import.sql` |

## Summary counts

| Metric | Count |
| --- | ---: |
| Total findings in decision table | 29 |
| Real permission issues | 2 |
| Scope expectation mismatches | 8 |
| Staging role setup issues | 1 |
| Needs Piter decision | 18 |
| **Recommended immediate import** (after Piter OK) | **2** |
| **Recommended scope alignment rows** | **27** (proposals; many overlap by finding) |
| **Recommended synthetic user setup review** | **1** (finance-admin) |
| Hold import until Piter decides | 18 |

Stage 10B generated **20** import candidates; Stage 10C recommends importing **only 2** now (guest finance). The other **18** import candidates should **not** be imported until Piter approves role behavior.

## Artifacts created (Stage 10C)

| File | Purpose |
| --- | --- |
| `qa-agent/reports/browser-qa/role-workflow-piter-decision-table.md` | Human-readable decision table for Piter |
| `qa-agent/reports/browser-qa/role-workflow-piter-decision-table.json` | Machine-readable decisions |
| `qa-agent/reports/browser-qa/workflow-scope-update-plan.md` | Proposed scope changes (not applied) |
| `qa-agent/reports/browser-qa/workflow-scope-update-plan.json` | Structured scope plan |

## Key decisions needed from Piter

1. **Guest finance (RWF-28, RWF-29)** — Should guest users be **hard-blocked** from all `/finance/*` routes? (Recommended: **yes**, import as AgentOps issues and fix guards on staging.)

2. **Employee finance shells (RWF-5–8)** — Is it acceptable that employees **see finance page shells** if writes/data are blocked, or must they **redirect** immediately? (Likely **update workflow-scope** to `loaded` for navigation-only, **not** import.)

3. **Manager finance shells (RWF-20–23)** — Same question as employee for manager role.

4. **Finance Viewer (RWF-2–4)** — Which finance sub-routes may a read-only finance viewer open (master-data, transactions, AI management)?

5. **HR Admin (RWF-10–14)** — Should HR Admin see the finance **hub** and which sub-routes, or only HR/payroll paths?

6. **HR Employee (RWF-15–19)** — Should HR Employee have **any** finance route access?

7. **AI User finance (RWF-25–27)** — Should AI User open finance routes at all, or only `/ai-management`?

8. **Employee / Manager AI management (RWF-9, RWF-24)** — Should non-AI roles access `/ai-management`?

9. **Finance Admin + AI (RWF-1)** — Is finance-admin QA intentionally `profileRole=admin` (broader nav), or should staging user be narrowed? (Likely **synthetic user** or **scope** update, **not** app bug import.)

10. **Tenant Admin** — No findings in this batch; confirm tenant-admin should keep finance + AI access as in current scope.

## Recommended immediate actions (do not apply in 10C)

1. **Import only** `AIXIA-WORKFLOW-RWF-28` and `AIXIA-WORKFLOW-RWF-29` after Piter confirms guest finance must be blocked.
2. **Hold** the other 18 Stage 10B import candidates until Piter approves per-row decisions in `role-workflow-piter-decision-table.md`.
3. **Do not** relax `workflow-scope.json` for guest finance — keep `access-denied`.
4. After approval, apply selected scope updates from `workflow-scope-update-plan.json` in **Stage 10D**.

## Decision groups (summary)

### Real permission issue (2) — guest finance

| ID | Route | Recommendation |
| --- | --- | --- |
| RWF-28 | `/finance/master-data` | Import as AgentOps issue; fix route guard |
| RWF-29 | `/finance/reports` | Import as AgentOps issue; fix route guard |

### Scope expectation mismatch (8) — employee + manager finance

| IDs | Roles | Recommendation |
| --- | --- | --- |
| RWF-5–8 | employee | Update workflow-scope **or** accept navigation-only; **do not import** |
| RWF-20–23 | manager | Same as employee |

### Staging role setup (1)

| ID | Recommendation |
| --- | --- |
| RWF-1 | Adjust finance-admin synthetic profile **or** set scope `loaded` for `/ai-management`; **do not import** as app defect |

### Needs Piter decision (18)

Organized in decision table by role: finance-viewer (3), employee AI (1), hr-admin (5), hr-employee (5), manager AI (1), ai-user finance (3). **Hold import** until approved.

## What was not done

- No app fixes
- No permission or RLS changes
- No `workflow-scope.json` changes applied
- No AgentOps DB import (including the 20 candidates)
- No production or main Supabase/GitHub changes
- No schema/migrations/API routes
- No scheduler / Hermes / CodeGraph automation

## Next recommended stage

**Stage 10C-Approval** — Piter reviews `role-workflow-piter-decision-table.md`, marks approve/reject per row (can be a short reply or annotated checklist).

**Then Stage 10D** — Apply approved `workflow-scope.json` updates and import **only** approved findings into AgentOps backlog (Owner UI or reviewed SQL on staging).
