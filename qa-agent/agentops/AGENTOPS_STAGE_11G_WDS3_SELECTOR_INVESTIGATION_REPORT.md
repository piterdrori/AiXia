# AgentOps Stage 11G WDS-3 Selector Investigation Report

## Purpose

Investigate held **AIXIA-WRITE-WDS-3** — finance-admin “New Quotation” control not matched during Stage 11 write/draft QA — and determine whether it is a real app bug or a test/timing issue. **No AgentOps import** in this stage.

## Finding

| Field | Value |
| --- | --- |
| **AgentOps code (held)** | `AIXIA-WRITE-WDS-3` |
| **QA report ID** | WDS-3 (write-draft-safe) |
| **Symptom** | `finance-admin cannot see expected create action on /finance/transactions/quotations` |
| **Import status** | Never imported (Stage 11C held) |

## Inspection Result

### How “New Quotation” is rendered

On `src/app/finance/transactions/quotations/page.tsx`:

- **Component:** `AixiaButton` (`variant="primary"`, `type="button"`) inside `AixiaRegistryToolbar` → `primaryAction`.
- **Visible label:** `New Quotation` (with `Plus` icon).
- **Not** a link, menu item, or hero action — registry toolbar primary action per AiXia finance registry standard.
- **Navigation:** `onClick={() => navigate("/finance/transactions/quotations/new")}`.
- **Visibility:** `permissionState.canCreate` from `PAGE_ACCESS_CONFIG` (`createFinanceRecords`, `createInvoices`) after `fetchFinanceEffectivePermissions`.

`AixiaRegistryToolbar` exposes `data-toolbar-has-primary="true"` when the create button is mounted.

### Should finance-admin see it?

**Yes.** Staging finance-admin has create permissions; ACCESS meta on the registry shows “Enabled — Create, archive, and lifecycle controls…”. Direct navigation to `/finance/transactions/quotations/new` loads the create form with Save Draft (verified in prior and current QA runs).

### Why Stage 11 QA missed it

1. **List page blocks on full-page load:** While `isLoading && quotations.length === 0`, the page renders only `AixiaLoadingState` (“Loading quotations…”) — **no registry toolbar yet**.
2. **Test checked too early:** `checkCreateButtonVisibility` ran ~2.5s after navigation without waiting for load completion.
3. **Screenshot evidence:** `finance-admin-list-finance-quotations-list-1779930583113.png` (pre-fix run) shows only the global loading spinner — not a missing button.

The Playwright selector (`getByRole("button", { name: /New Quotation/i })`) is **correct** for the rendered control; the failure was **timing**, not wrong text or role.

### Navigation to `/new`

| Path | Result (post-fix QA `write-draft-safe-1779931417921`) |
| --- | --- |
| Direct URL `/finance/transactions/quotations/new` | **loaded** — Document Overview + Save Draft visible |
| List toolbar button | **create-visible-enabled** — matched via `role=button` after registry ready |

## Classification

**test-selector-issue** (root cause: **test did not wait for quotation registry load** before asserting create control visibility; selector text/role were already correct)

Secondary note (not primary): toolbar create button has no dedicated `data-testid`; `data-toolbar-has-primary` on the toolbar cluster is available for future QA hardening (**ux-testability** enhancement only — not required for this classification).

## Fix Applied

**Yes — test-only** in `qa-agent/browser-qa/tests/agentops-synthetic-write-draft-safe.spec.mjs`:

1. **`waitForQuotationListReady`** — wait for “Loading quotations” to clear, “Quotation Registry” visible, and `[data-toolbar-has-primary="true"]` when create is expected.
2. **`checkCreateButtonVisibility`** — default pattern `New Quotation`; fallback locator via toolbar primary cluster; record `createLocator` in workflow attempts.
3. **`waitForQuotationNewTerminalState` / `classifyWriteRoute`** — wait through permission/source loading before classifying `/new` as denied (reduces false positives after list wait fix).

**No app source changes.**

## Browser Evidence

| Item | Value |
| --- | --- |
| **Command** | `npm run qa:agentops-write-draft-safe` |
| **Run ID** | `write-draft-safe-1779931417921` |
| **Result** | **PASS** — 5/5 tests, **findingsCount: 0**, criticalFindings: 0 |
| **finance-admin list** | `create-visible-enabled`, `createLocator: role=button` |
| **finance-admin /new** | `outcome: loaded` at `http://127.0.0.1:5173/finance/transactions/quotations/new` |
| **Screenshots** | `qa-agent/reports/browser-qa/screenshots/write-draft-safe/finance-admin-list-finance-quotations-list-1779931471581.png`, `finance-admin-quotations-new-1779931478333.png` |
| **Console/network** | No blocking errors required for create visibility in final run; intermittent `Failed to fetch` seen in other suites under load — not reproduced as create blocker in final write-draft run |

## WDS-3 Recommendation

**Do not import; resolved as test-selector issue.**

- Not a permission or app bug on staging.
- WDS-1/WDS-2 were real issues (fixed Stage 11E, closed Stage 11F).
- Optional future: add `data-testid="finance-quotations-new"` on create button for QA stability (Piter decision — **not** done in 11G).

## What Was Not Done

- No app source / UI / permission changes
- No RLS / schema / migrations / API routes
- No production or main Supabase / GitHub
- No AgentOps DB import for WDS-3
- No Save Draft click or record creation
- No scheduler / Hermes / CodeGraph automation
- No vendor-external role-workflow investigation

## Command Results

| Command | Result |
| --- | --- |
| `npm run qa:agentops-write-draft-safe` | **PASS** (findingsCount: 0) |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** |
| `npm run qa:guardrail-action-plan` | **PASS** |

## Final Status

**PASS**

## Next Recommended Stage

**Stage 12** — Automated verification runner foundation (per AgentOps roadmap).

**Do not run Stage 11H import** for WDS-3 unless Piter explicitly wants a documentation-only backlog row for the resolved test issue.
