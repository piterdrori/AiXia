# CodeGraph Staging Runtime Owner Signoff

CodeGraph is **essential** for AgentOps discovery before Cursor work. Complete this form **before** any read-only staging runtime enablement. Store completed signoff outside the repo (secure notes / owner feedback record).

Reference: `codegraph-staging-runtime-plan.md`, `codegraph-runtime-readiness-gate.json`, `codegraph-safety-policy.md`

---

## Important

**Approval is required before `CODEGRAPH_RUNTIME_ACTIVE` can be `true`.**

Until signoff is complete:

- `CODEGRAPH_RUNTIME_ACTIVE=false`
- Mock static hints remain the only active discovery path
- No production/main targets
- No browser or repository scan from Issue Workspace

---

## Signoff fields

| Field | Value |
|-------|--------|
| **Date** | |
| **Approved by** | |
| **Environment** | local / staging / preview (never production for first activation) |
| **Runtime mode approved** | mock only / sanitized artifact / staging endpoint |
| **Read-only confirmed** | Yes / No |
| **File mutation disabled** | Yes / No |
| **Prompt auto-mutation disabled** | Yes / No |
| **Cursor trigger disabled** | Yes / No |
| **Secrets excluded** | Yes / No |
| **Sample issue selected** | e.g. `AIXIA-SAMPLE-001` |
| **Rollback plan confirmed** | Yes / No |
| **Notes** | |

---

## Pre-signoff checklist

- [ ] `codegraph-runtime-readiness-gate.json` reviewed — blockers understood
- [ ] Phase 6C browser smoke passed (`npm run qa:agentops-codegraph-discovery-smoke`)
- [ ] No secrets committed to git
- [ ] Sanitized artifact format reviewed (Phase 6E when applicable)
- [ ] Mock fallback verified after disabling runtime flag

---

## Rollback (if needed after activation)

1. Set `CODEGRAPH_RUNTIME_ACTIVE=false` in adapter.
2. Verify Issue Workspace: runtime mode = mock static hints, source unchanged.
3. Remove sanitized artifact references for affected issues.
4. Document in AgentOps report / owner feedback.
