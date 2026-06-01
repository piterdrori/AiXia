# Hermes Staging Activation Owner Signoff

Hermes is **essential** to AgentOps. Complete this form **before** any runtime enablement. Store completed signoff outside the repo (secure notes / owner feedback record).

Reference: `hermes-activation-checklist.md`, `hermes-endpoint-config-design.md`, `hermes-env-template.example`

---

## Important

**Approval is required before `HERMES_RUNTIME_ACTIVE` can be `true`.**

Until signoff is complete:

- `HERMES_RUNTIME_ACTIVE=false`
- `HERMES_OWNER_APPROVED=false`
- Mock fallback remains the only response path
- No production/main targets

---

## Signoff fields

| Field | Value |
|-------|--------|
| **Date** | |
| **Approved by** | |
| **Environment** | local / staging / preview (never production for first activation) |
| **Endpoint configured** | Yes / No |
| **Health check passed** | Yes / No |
| **Fallback verified** | Yes / No |
| **Sample issue selected** | e.g. `AIXIA-SAMPLE-001` |
| **Allowed modes** | issue_clarification, prompt_refinement, risk_review, next_step_recommendation, cursor_report_synthesis, archive_lesson_extraction |
| **Runtime activation approved** | Yes / No |
| **Scope** | one sample issue only / all staging issues |
| **Rollback plan confirmed** | Yes / No |
| **Notes** | |

---

## Pre-signoff checklist

- [ ] `hermes-activation-checklist.md` complete
- [ ] Env vars set in `.env.local` or Vercel staging only (not in repo)
- [ ] No secrets committed to git
- [ ] Health check stub upgraded to real ping (future phase) and passed
- [ ] Browser smoke plan ready (`npm run qa:agentops-agent-clarification-smoke`)

---

## Rollback (if needed after activation)

1. Set `HERMES_RUNTIME_ACTIVE=false` and `HERMES_OWNER_APPROVED=false` in env.
2. Set adapter code flags off.
3. Verify Issue Workspace: endpoint not active, mock fallback only.
4. Document in AgentOps report / owner feedback.
