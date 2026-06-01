# Hermes Staging Activation Plan

Hermes is **required** for AgentOps long-term: issue clarification, prompt refinement, risk review, next-step guidance, Cursor report synthesis, and archive lesson extraction. This plan enables Hermes **intentionally** in staging only — production remains disabled until weeks of stable staging success.

**Current phase:** Steps 1–2 complete. Step 2.5 endpoint design complete (Phase 5E). Steps 3–8 are future work after owner approval and env configuration outside repo.

---

## Step 2.5 — Endpoint configuration design (Phase 5E)

**Status:** Done (design only)

- `hermes-endpoint-config-design.md` — planned endpoint options and staged path
- `hermes-env-template.example` — safe env var names, no secrets in repo
- `hermes-owner-signoff-template.md` — required fields before `HERMES_RUNTIME_ACTIVE=true`
- Adapter status exposes `endpointConfigured: false`, `endpointSource: not_configured`
- Runtime remains **inactive** — no API route, no network ping

---

## Principles

1. **Mock fallback stays default** until every gate check passes.
2. **Owner approval** before any runtime enablement.
3. **Advisory only** — Hermes never auto-approves, auto-handoffs, or closes issues.
4. **Instant rollback** via code flags + readiness gate state.
5. **Compare before trust** — Hermes vs mock on the same issue before broad enablement.

---

## Step 1 — Keep mock fallback default (current)

**Status:** Done (Phase 5B/5C)

- `runAgentOpsHermesAdapter()` always uses `generateAgentOpsMockResponse` when `runtimeActive === false`.
- Issue Workspace Ask Agent flow unchanged for owners.
- Gate state: `staging_ready_pending_owner`.

---

## Step 2 — Add disabled real adapter function behind feature flag

**Status:** Planned (Phase 6+)

- Add `invokeHermesRuntime(request)` stub that returns `shouldFallbackToMock: true` until endpoint wired.
- Wire feature flag: `AGENTOPS_HERMES_STAGING_ENABLED` (env only, not in repo).
- Default: flag off, mock fallback.

---

## Step 3 — Run health check only

**Status:** Stub done (Phase 5D); real ping planned after endpoint env configured

- `checkHermesStagingHealth()` stub returns `not_configured` until `HERMES_STAGING_ENDPOINT` set outside repo
- Future: safe no-data ping only (see `hermes-health-check-plan.md`)
- On failure: gate state → `failed_health_check`, remain on mock
- Log result to owner feedback metadata (global, no finding_id, no secrets)

---

## Step 4 — Enable Hermes for one safe sample issue only

**Status:** Planned

- Allowlist: `AIXIA-SAMPLE-001` only.
- All other issues: mock fallback regardless of flag.
- Record `adapterSource: hermes_runtime` vs `mock_fallback` in metadata.

---

## Step 5 — Compare Hermes response against mock response

**Status:** Planned

- For each test question, store both responses in metadata (redacted if needed).
- Piter reviews: issue-specificity, prompt style, no invented files, no forbidden actions.
- Document comparison in `qa-agent/agentops/` report.

---

## Step 6 — Allow Piter to approve Hermes-generated prompt suggestions

**Status:** Planned

- UI: label `Hermes advisory — owner approval required`.
- Copy/append buttons unchanged — no auto-merge to approved prompt.
- Owner must still approve fix plan and prepare execution manually.

---

## Step 7 — Expand to all staging issues after stable behavior

**Status:** Planned

- Remove issue allowlist after N successful days and smoke passes.
- Gate state → `staging_enabled`.
- Monitor fallback rate and safety blocks.

---

## Step 8 — Keep production disabled until weeks of staging success

**Status:** Policy (ongoing)

- Production/main Supabase: **never** until explicit separate approval.
- Production GitHub: **never** until explicit separate approval.
- `safety.stagingOnly` remains true in all requests until production policy approved.

---

## Success criteria for staging_enabled

| Criterion | Target |
|-----------|--------|
| Health check | 7 consecutive days pass |
| Fallback rate | < 5% when Hermes enabled |
| Forbidden-action blocks | 0 unhandled |
| Browser smoke | PASS after each adapter change |
| Owner sign-off | Checklist complete |

---

## Related documents

| Document | Purpose |
|----------|---------|
| `hermes-readiness-gate.json` | Machine-readable gate state |
| `hermes-activation-checklist.md` | Owner sign-off checklist |
| `hermes-endpoint-config-design.md` | Endpoint and env configuration design |
| `hermes-env-template.example` | Env var names (example only) |
| `hermes-owner-signoff-template.md` | Owner signoff before runtime |
| `hermes-adapter-contract.json` | Request/response contract |
| `hermes-safety-policy.md` | Safety rules |
| `hermes-fallback-policy.md` | Fallback rules |
