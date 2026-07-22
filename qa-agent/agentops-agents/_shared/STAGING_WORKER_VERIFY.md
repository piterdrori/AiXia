# Role-first full-site scans — staging worker verification

## After deploy to staging branch / worker

1. Restart the staging AgentOps worker so it loads:
   - `fullSiteRouteInventory`
   - `agentRoleDetectors`
   - scheduler `CORE_STAGING_ROUTES` from `qa-agent/agentops-agents/_shared/full-site-routes.json`
2. Ensure owner Browser QA storage state exists at:
   - `qa-agent/browser-qa-auth/storage-state.json`
   - or `AGENTOPS_BROWSER_QA_STORAGE_STATE`
3. Run verify locally:
   - `npx tsx scripts/agentops-role-first-verify.ts`
   - `npx tsx scripts/agentops-slow-load-metric-verify.ts`
4. Trigger a design-agent scheduled/manual `website_audit` with `entire_staging`
   (local dry-run: `npx tsx scripts/agentops-design-agent-role-first-dry-run.ts --max-routes 20`).
5. Confirm findings are design-pack only (no slow-load-only promotions).

## Expected behavior

- Every agent receives the same full-site route inventory (133 routes incl. 12 agent detail pages).
- Each agent promotes only in-skill findings.
- Per-agent memory folders live under `qa-agent/agentops-agents/{slug}/`.
- Hermes namespace: `agentops.agent.{slug}`.

## QA evidence (2026-07-22)

| Check | Result |
|---|---|
| Storage state | Present (`qa-agent/browser-qa-auth/storage-state.json`); owner auth reaches Dashboard / Finance |
| `agentops-role-first-verify.ts` | `ok: true` · 133 routes · design slow-load blocked |
| `agentops-slow-load-metric-verify.ts` | `ok: true` |
| `CORE_STAGING_ROUTES` | 133 · includes `/system/agent-ops/agents/design-agent` |
| Design-agent dry-run (20 routes) | `slowLoadPromoted: 0` · all classifications `allowed: true` |
| Design-agent page dry-run | `slowLoadPromoted: 0` on `/system/agent-ops/agents/design-agent` |
| Browser QA Control Center | Healthy · 12/12 agents · worker online · scheduler online |
| Browser QA Design Agent detail | Hermes `agentops.agent.design-agent` · Active · Audit tools ready |
| Browser QA Issues | Legacy slow-load drafts still listed (pre-role-first). Shell-noise hide active (4 hidden). |

### Blockers for remote worker cutover

1. **Feature branch not deployed** to `ai-xia-staging.vercel.app` yet — live UI still defaults Design Agent manual audit to **Selected routes: /…/design-agent** (old behavior). Do **not** start that remote audit until this branch is on staging + worker restarted.
2. **Local `.env.local` lacks `AGENTOPS_WORKER_SECRET`** — cannot restart/claim against the remote queue from this machine. Remote staging worker already shows **Worker online**; restart it on the host that has the secret after deploy.
3. After deploy: confirm Design Agent schedule/manual default scope shows **Entire staging** (or full inventory), then run audit and re-check Issues for no new slow-load-only design-agent promotions.
