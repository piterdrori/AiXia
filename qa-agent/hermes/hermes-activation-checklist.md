# Hermes Activation Checklist (Staging)

Hermes is **essential** to AgentOps — this checklist ensures activation is **intentional**, **safe**, and **reversible**. Complete every item before enabling Hermes runtime in staging.

Reference: `hermes-readiness-gate.json`, `hermes-staging-activation-plan.md`

---

## Pre-activation (design complete)

- [x] Adapter contract exists (`hermes-adapter-contract.json`)
- [x] Safety policy exists (`hermes-safety-policy.md`)
- [x] Fallback policy exists (`hermes-fallback-policy.md`)
- [x] Adapter wrapper exists (`hermesAdapter.ts` with mock fallback)
- [x] Issue Workspace uses `runAgentOpsHermesAdapter()`
- [x] Readiness gate defined (`hermes-readiness-gate.json`)
- [x] Health check stub defined (`checkHermesStagingHealth()`)
- [x] Endpoint configuration design (`hermes-endpoint-config-design.md`)
- [x] Env template example (`hermes-env-template.example`)
- [x] Owner signoff template (`hermes-owner-signoff-template.md`)

---

## Before enabling Hermes runtime in staging

### Endpoint configuration (Phase 5E)

- [ ] Review `hermes-endpoint-config-design.md` and choose staged path (local → staging → production disabled)
- [ ] Copy `hermes-env-template.example` to `.env.local` (local) or Vercel staging env — **never commit values**
- [ ] Set `HERMES_STAGING_ENDPOINT` outside repo only
- [ ] Keep `HERMES_RUNTIME_ACTIVE=false` until owner signoff complete
- [ ] Keep `HERMES_OWNER_APPROVED=false` until signoff form complete
- [ ] Complete `hermes-owner-signoff-template.md` before any runtime enablement

### Adapter and environment

- [ ] Hermes endpoint/adapter identified (URL, client, or internal service — documented outside repo secrets)
- [ ] App-callable method confirmed (not Cursor-only tooling)
- [ ] Credentials stored safely — **not in git repo** (env / secret manager only)
- [ ] Staging-only environment configured (local / staging / preview — never production)
- [ ] Rollback/disable switch confirmed (`HERMES_RUNTIME_ACTIVE` + feature flag path)

### Owner and safety

- [ ] Owner (Piter) approves staging Hermes activation in writing
- [ ] Safety policy reviewed and accepted
- [ ] Fallback to mock confirmed on failure paths
- [ ] Prompt style enforcement confirmed (12-section standard)
- [ ] Forbidden-action blocking confirmed in response validator
- [ ] Advisory-only UI labeling confirmed (no auto-approve, no auto Cursor)

### Testing

- [ ] Test issue selected (e.g. `AIXIA-SAMPLE-001`)
- [ ] Health check script or adapter probe defined
- [ ] Compare Hermes vs mock response on same question documented
- [ ] Logging/audit metadata verified in `agentops_owner_feedback`
- [ ] Browser smoke test plan ready (`npm run qa:agentops-agent-clarification-smoke`)
- [ ] No production/main Supabase or GitHub touched

---

## Activation sign-off

| Field | Value |
|-------|--------|
| Approved by | __________________ |
| Date | __________________ |
| Staging environment | __________________ |
| Adapter endpoint (redacted) | __________________ |
| Feature flag name | __________________ |
| Rollback owner | Piter |

---

## Post-activation monitoring (first 7 days staging)

- [ ] Daily: health check pass rate
- [ ] Daily: fallback rate vs Hermes success rate
- [ ] Review: any forbidden-action blocks in logs
- [ ] Review: prompt suggestions quality vs mock baseline
- [ ] No silent production enablement

---

## Rollback procedure

1. Set `HERMES_RUNTIME_ACTIVE = false` and `HERMES_APP_CALLABLE = false` in `hermesAdapter.ts` (or feature flag off).
2. Set gate state to `disabled_by_safety` in readiness tracking.
3. Verify Issue Workspace shows mock fallback only.
4. Run `npm run qa:agentops-agent-clarification-smoke`.
5. Document incident in owner feedback / AgentOps report if needed.
