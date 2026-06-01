# CodeGraph Staging Runtime Plan

CodeGraph is **essential** for AgentOps: likely files, components, routes, shared source-of-truth, and related past fixes before Cursor work. This plan enables **read-only** discovery in staging only — no file mutation, no prompt auto-mutation, no auto Cursor.

**Current phase:** Phase 6D — adapter and readiness gate prepared. Runtime remains **inactive**; mock static hints are the only active path.

---

## Current State

- Mock/static hints active in Issue Workspace (Phase 6B/6C).
- `runAgentOpsCodeGraphDiscoveryAdapter()` falls back to mock when `CODEGRAPH_RUNTIME_ACTIVE=false`.
- Runtime not connected; no MCP from app; no browser or repository scan from browser.
- Hermes remains inactive with mock fallback.
- Cursor execution remains manual-first.

---

## Future Runtime Options

Choose the safest staged option:

| Option | Description | Risk | Recommended phase |
|--------|-------------|------|-------------------|
| **A** | Local script/CLI-generated **sanitized discovery artifact** consumed by AgentOps | Lowest — no live scan in browser | **6E** (next) |
| **B** | Server-side staging endpoint/proxy | Medium — needs auth, rate limits, redaction | 6F+ |
| **C** | External CodeGraph service endpoint | Higher — network, secrets boundary | Later |

**Recommended sequence:**

1. Keep **mock static hints** default (current).
2. Generate read-only CodeGraph output **outside the browser** (CLI / owner workstation / CI artifact job).
3. Store **sanitized discovery artifact** (JSON only — paths, labels, reasons, confidence; no file contents, no secrets).
4. Issue Workspace reads sanitized artifact when owner-enabled and artifact present for issue.
5. Owner reviews suggestions in UI.
6. Owner **manually** appends approved hints to prompt draft.
7. Add server-side runtime (Option B) only after weeks of stable artifact-based staging.

---

## Data Allowed

- Issue route, title, category, severity
- Evidence summary (non-secret)
- Known app route paths (public routing map)
- Sanitized discovery artifact (paths, symbol names, confidence — no source bodies)
- Prior issue archive metadata (redacted, staging only)

---

## Data Forbidden

- Secrets, API keys, tokens
- `.env` values or Supabase service role key
- Production credentials
- Private customer/vendor PII unless redacted
- Direct file mutation from discovery path
- Full file contents in browser or API responses
- Live repository scan from Issue Workspace client

---

## Safety Invariants (all phases)

| Invariant | Enforcement |
|-----------|-------------|
| Read-only | `readOnly: true` on runtime status |
| Owner approval | All suggestions advisory; `safeToIncludeInPrompt: false` until owner review |
| No prompt auto-mutation | Hints append only via explicit button |
| No Cursor auto-trigger | No scheduler or handoff from discovery |
| Staging only | No production/main Supabase or GitHub |
| Quick disable | `CODEGRAPH_RUNTIME_ACTIVE=false` rollback |

---

## Rollback

1. Set `CODEGRAPH_RUNTIME_ACTIVE=false` in adapter code or env flag (future).
2. Verify Issue Workspace shows mock static hints only.
3. Remove or ignore sanitized artifact for affected issues.
4. Document in AgentOps owner feedback / phase report.

---

## Related Artifacts

- `codegraph-runtime-readiness-gate.json`
- `codegraph-owner-signoff-template.md`
- `codegraph-discovery-contract.json`
- `codegraph-safety-policy.md`
- `codegraph-fallback-policy.md`
- `src/lib/agentops/codegraphDiscovery.ts`
