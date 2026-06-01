# AiXia Global Folder — Batch 27 Guardrail/Reference Alignment Plan

**Date:** 2026-05-30  
**Type:** Documentation/planning only — **no script edits, no behavior changes, no code/CSS/components/pages/package changes, no file moves/deletes, no deprecation banners.**

---

## 1. Purpose

Batch 26 resolved the primary `src/design-system/README.md` collision by delegating to `aixia-global/00`. Owner files `00`–`16` are populated; guardrail **policy** is canonical in `15-guardrail-rules.md`.

**Batch 27** audits every guardrail script reference, allowlist, and warn/error tier against owner files, maps old authority paths to `src/design-system/aixia-global/` owners, and defines a **staged plan** for a future implementation batch.

**This batch creates the plan only.** Guardrail scripts, allowlists, and enforcement levels remain unchanged.

**Mandatory end state (unchanged):** ONE STANDARD · ONE OWNER PER ASPECT · ONE GLOBAL DESIGN FOLDER · NO COMPETING DESIGN AUTHORITIES. Guardrails implement policy from `15`; they must not invent policy.

---

## 2. Files/scripts audited

### Read-first inputs (reviewed)

| # | Path | Role in audit |
|---|------|----------------|
| 1 | `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md` | Authority root; pause rules |
| 2 | `src/design-system/aixia-global/14-page-migration-rules.md` | Migration gates; legacy debt context |
| 3 | `src/design-system/aixia-global/15-guardrail-rules.md` | Target guardrail policy (comparison baseline) |
| 4 | `src/design-system/aixia-global/16-design-file-cleanup-map.md` | Old-doc disposition; allowlist debt tracking |
| 5 | `qa-agent/design-system/AIXIA_GLOBAL_OWNER_FILES_REVIEW_AND_COLLISION_AUDIT.md` | Remaining collisions |
| 6 | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_26_README_DELEGATION_META_REFRESH_REPORT.md` | Prior batch state |
| 7 | `qa-agent/design-system/AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | Canonical input → merged into `15` |
| 8 | `qa-agent/design-system/AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | Canonical input → merged into `15`/`07`/`13` |
| 9 | `qa-agent/design-system/AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` | Canonical input → merged into `03`/`04`/`15` |
| 10 | `qa-agent/design-system/AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md` | Canonical input → merged into `14`/`15` |
| 11–17 | Guardrail scripts + `package.json` | Implementation audit (below) |

### Build gate (orchestrator)

| Script | Invoked by | Role |
|--------|------------|------|
| `scripts/aixia-guardrails.mjs` | `npm run build` (first step) | Orchestrator: SOT checks, finance rules, sub-guardrails |

### Sub-guardrails (`scripts/guardrails/`)

| Script | Imported by |
|--------|-------------|
| `aixia-guardrail-allowlists.mjs` | shell-hero, shadcn-boundary; indirectly static QA |
| `aixia-guardrail-utils.mjs` | shell-hero, shadcn-boundary |
| `aixia-shell-hero-guardrails.mjs` | `aixia-guardrails.mjs`, `qa-agent/scripts/static-design-guardrails.mjs` |
| `aixia-shadcn-boundary-guardrails.mjs` | same |
| `aixia-visual-parity.mjs` | `aixia-guardrails.mjs` only |
| `aixia-dashboard-page.mjs` | `aixia-guardrails.mjs` only |

### QA mirror (read-only triage)

| Script | Invoked by | Role |
|--------|------------|------|
| `qa-agent/scripts/static-design-guardrails.mjs` | `npm run qa:static-design-guardrails` | Broader scan + reuses shell/hero + shadcn sub-guardrails |
| `qa-agent/scripts/generate-guardrail-action-plan.mjs` | `npm run qa:guardrail-action-plan` | Triage from static scan (no old-law path constants) |
| `qa-agent/scripts/validate-qa-foundation.mjs` | `npm run qa:validate-foundation` | qa-agent markdown/registry integrity |

### Package.json QA/build connection

| Script | Guardrail connection |
|--------|---------------------|
| `build` | `node scripts/aixia-guardrails.mjs && tsc -b && vite build` |
| `qa:validate-foundation` | Foundation docs only — safe for doc batches |
| `qa:static-design-guardrails` | Read-only; writes `qa-agent/reports/static-design-guardrails.*` |
| `qa:guardrail-action-plan` | Action plan from static findings |

---

## 3. Current guardrail script map

### 3.1 Runner architecture (`scripts/aixia-guardrails.mjs`)

**Three severity channels:**

| Function | Array | Build effect |
|----------|-------|--------------|
| `addError()` | `warnings[]` | **Warn** — build continues |
| `addHardError()` | `hardErrors[]` | **Hard error** — `process.exit(1)` |
| (internal) | `errors[]` | Guardrail system failure — exit 1 |

**Invocation order in `main()`:**

1. `inspectSharedStandardDocument()` — `AIXIA_STANDARD.md` locked phrases → warn
2. `inspectSharedCssSourceOfTruth()` — CSS selectors / smart-layout → warn
3. `inspectSharedFinancePrintSourceOfTruth()` — print isolation → warn
4. `inspectSharedComponentSourceOfTruth()` — component exports/snippets → warn
5. `inspectFinancePermissionHelperSourceOfTruth()` — `pageAccess.ts` → warn
6. `inspectFinanceLibSafetyRules()` — finance lib patterns → warn
7. `runDashboardPageGuardrails({ addError })` → **warn**
8. `runVisualParityGuardrails({ addWarning: addError, addError })` → **warn** (finance hero badge/statusCards use `addError` callback = warn tier)
9. `runShellHeroGuardrails({ addWarning: addError, addError: addHardError })` → **legacy warn / non-legacy hard**
10. `runShadcnBoundaryGuardrails({ addWarning: addError, addError: addHardError })` → **finance+agent-ops hard**
11. `inspectFinancePage()` loop over `src/app/finance/**` → **warn** (registry, smart-layout, print, buttons, zero-local-design, etc.)

**Referenced authority docs in runner (not in messages — implicit SOT):**

| Constant | Path | Target owner(s) |
|----------|------|-----------------|
| `AIXIA_STANDARD_FILE` | `src/components/aixia/AIXIA_STANDARD.md` | `01`–`13` (deprecated guardrail SOT per `15`) |
| `AIXIA_STYLE_FILE` | `src/styles/aixia-design-system.css` | `01`, `11` |
| Finance print files | `aixia-finance-print.css`, `AixiaFinancePrint.tsx` | Approved print exception (`15` §11) |

**No `qa-agent/` or `aixia-global/` paths in runner messages today.**

---

### 3.2 `aixia-guardrail-allowlists.mjs`

| Export | Purpose | Entries | Cited old authority |
|--------|---------|---------|---------------------|
| `PAGE_SHELL_HERO_STANDARD` | Message citation constant | 1 path string | `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md` |
| `AUTH_PUBLIC_PAGE_PREFIXES` | Skip shell/hero on auth routes | `login/`, `register/` | — |
| `AUTH_PUBLIC_PAGE_EXACT` | Exact auth pages | 2 files | — |
| `ORB_SHELL_DEFER_PREFIXES` | Skip shell warnings (P2) | `ai-management/` | — |
| `LEGACY_SHELL_HERO_DEBT_FILES` | G-01/G-02/G-03 warn-only | **16 routes** (10 finance + 6 agent-ops) | Comment → `AIXIA_P0_BATCH_5_ASYNC_BOUNDARY_GUARDRAIL_REPORT.md` |
| `SHADCN_SHELL_CHROME_FILES` | Chrome exception (scan only) | DashboardLayout, AuthLayout | Comment → `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` |
| `SHADCN_PAGELOADER_DEFER_FILES` | PageLoader defer | **Empty** | — |
| `SHADCN_BOUNDARY_ERROR_PREFIXES` | Hard-error scope | `finance/`, `agent-ops/` | — |
| `SHADCN_BOUNDARY_MODULE_PREFIXES` | Scan scope (same as error today) | `finance/`, `agent-ops/` | — |

---

### 3.3 `aixia-shell-hero-guardrails.mjs`

| Rule | Detection | Legacy debt | Non-legacy | Message cites |
|------|-----------|-------------|------------|---------------|
| **G-01** | `<AixiaPage` without `surface="command"` | warn | **hard** | `PAGE_SHELL_HERO_STANDARD` |
| **G-02** | `<AixiaHero` without `surface="command"` | warn | **hard** | `PAGE_SHELL_HERO_STANDARD` |
| **G-03** | `aixia-title-xl` / `aixia-gradient-text` | warn | **hard** | `PAGE_SHELL_HERO_STANDARD` |

**Skips:** auth/public pages, `ORB_SHELL_DEFER_PREFIXES` (`ai-management/`).

**Output scopes:** `AiXia shell atmosphere`, `AiXia hero surface`, `AiXia hero typography`.

**Target owners:** G-01 → `03-page-shell-standard.md`; G-02/G-03 → `04-hero-header-standard.md`; policy → `15-guardrail-rules.md`.

---

### 3.4 `aixia-shadcn-boundary-guardrails.mjs`

| Rule | Scope | Level | Message cites |
|------|-------|-------|---------------|
| **G-07** | `@/components/ui/*` in page content under `finance/` + `agent-ops/` | **hard** on error prefixes | `BOUNDARY_DOC` + `PAGE_SHELL_HERO_STANDARD` |

**Local constant:** `BOUNDARY_DOC = "qa-agent/design-system/AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md"`.

**Chrome allowlist:** `SHADCN_SHELL_CHROME_FILES` (verified imports exist; not blocking chrome).

**Target owners:** `07-button-action-standard.md`, `13-module-wrapper-rules.md`, `15-guardrail-rules.md` §4F.

---

### 3.5 `aixia-visual-parity.mjs`

**No old doc path citations.** Messages cite `AIXIA_STANDARD §22` in three finance registry strings only.

| Check family | Scope | Level (via runner) | Target owner(s) |
|--------------|-------|-------------------|-----------------|
| shadcn Button + `aixia-dash-action` | all app pages | warn | `07` |
| Raw `aixia-dash-hero` header markup | all app pages | warn | `04` |
| Missing command shell with hero/kicker | authenticated app | warn | `03` |
| Hero child order (metrics vs tabs/toolbar) | command heroes | warn | `04`, `06` |
| KPI in scroll vs hero | command heroes | warn | `04`, `06` |
| Manual `aixia-dash-metrics` without `--auto` | command heroes | warn | `04`, `06` |
| `min-h-screen` on finance pages | finance | warn | `03`, `11` |
| Finance hero badges/statusCards/Studio title | finance | warn (`addError` callback) | `04`, `05` |
| FinancePage without `aixia-command-scroll` | finance | warn | `03`, `11` |
| Finance using AixiaPage not FinancePage | finance | warn | `03`, `13` |
| Legacy workspace cards / glass Tailwind | 6 workspace hub pages | warn | `06`, `12` |
| Finance hub meta strip / scroll spacing / KPI order | 5 finance hub pages | warn | `05`, `06`, `11` |
| Transaction registry intro order | transaction `page.tsx` files | warn | `05`, `08`, `AIXIA_STANDARD §22` → `08`/`14` |
| Finance scroll Tailwind overrides | all finance pages | warn | `11` |
| Module CSS hero/scroll conflicts | `*-visual.css` | warn | `01`, `11` |
| Finance double-shell in DashboardLayout | layout | warn | `03`, `13` |

---

### 3.6 `aixia-dashboard-page.mjs`

| Check | Level (via runner `addError`) | Target owner |
|-------|------------------------------|--------------|
| Required `src/styles/dashboard/*.css` exist | warn | `03` (dashboard module CSS) |
| Dashboard page imports presence/admin-usage CSS | warn | `03` |
| Command shell on dashboard page | warn | `03`, `04` |
| Required dashboard cards rendered | warn | `06`, `12` |

**No authority doc citations in messages.**

---

### 3.7 `qa-agent/scripts/static-design-guardrails.mjs`

**Reuses:** `runShellHeroGuardrails`, `runShadcnBoundaryGuardrails` (inherits old citations in findings).

**Additional pattern catalog** (`FINDING_HINTS`) with old-law hints:

| Finding ID | Old reference in hint |
|------------|----------------------|
| `orb-page-shell` | `AIXIA_PAGE_SHELL_HERO_STANDARD.md` |
| `non-command-hero` | `AIXIA_PAGE_SHELL_HERO_STANDARD.md` (short name) |
| `shadcn-page-content` | `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` |

**Broader scans (no doc paths):** local table/modal/button systems, glass Tailwind, tailwind-heavy pages, archive flows, missing page shell imports, forbidden UI patterns on finance/agent-ops prefixes.

**Output:** `qa-agent/reports/static-design-guardrails.md` + `.json` — triage only, does not block build.

---

## 4. Current old authority references found

### 4.1 Active citation strings in guardrail code

| Old path / reference | Where used | Usage type |
|---------------------|------------|------------|
| `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md` | `PAGE_SHELL_HERO_STANDARD` constant; shell-hero error messages (×3); shadcn error messages; static QA hints (×2) | **Violation message / hint** |
| `qa-agent/design-system/AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | `BOUNDARY_DOC` in shadcn guardrails; static QA hint | **Violation message / hint** |
| `qa-agent/design-system/AIXIA_P0_BATCH_5_ASYNC_BOUNDARY_GUARDRAIL_REPORT.md` | Allowlist comment on `LEGACY_SHELL_HERO_DEBT_FILES` | **Comment only** |
| `qa-agent/design-system/AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | Allowlist comment on `SHADCN_SHELL_CHROME_FILES` | **Comment only** |
| `src/components/aixia/AIXIA_STANDARD.md` | Runner locked-phrase checks; visual-parity `§22` in 3 messages | **Implicit SOT / message fragment** |
| `src/design-system/aixia-component-rules.md` | *(not cited by scripts)* | Competing doc — cleanup batch |
| `src/design-system/aixia-page-patterns.md` | *(not cited by scripts)* | Competing doc — cleanup batch |
| `src/design-system/aixia-finance-workflow-registry-contract.md` | *(not cited by scripts)* | Competing doc — cleanup batch |

### 4.2 Canonical inputs cited by scripts but not yet replaced

| qa-agent input doc | Merged into owner(s) per `16` | Still cited by scripts? |
|--------------------|------------------------------|-------------------------|
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | `03`, `04`, `05`, `11` | **Yes** — primary collision |
| `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | `07`, `13`, `15` | **Yes** |
| `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | `15` | No (content in `15`; not in script strings) |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` | `03`, `04`, `15` | No |
| `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md` | `14`, `15` | No |

### 4.3 Competing law files (not in scripts — human/AI collision risk)

| File | Risk |
|------|------|
| `src/design-system/aixia-component-rules.md` | Multi-aspect operational law |
| `src/design-system/aixia-page-patterns.md` | Locked finance header law |
| `src/design-system/aixia-finance-workflow-registry-contract.md` | Finance registry UI law |

Guardrails do not yet detect or reject citations of these files.

---

## 5. New `aixia-global/` owner-file mapping

### 5.1 Old reference → owner file (primary map)

| Old reference / violation area | Replace with owner file(s) |
|--------------------------------|----------------------------|
| Shell / orb `AixiaPage`, command shell, FinancePage | `03-page-shell-standard.md` |
| Hero surface, command typography, gradient XL ban | `04-hero-header-standard.md` |
| Meta strip, finance hub intro, registry meta order | `05-meta-status-strip-standard.md` |
| Cards, sections, KPI grids, workspace cards | `06-card-section-standard.md` |
| Buttons, actions, shadcn boundary, dash-action | `07-button-action-standard.md` |
| Tables, lists, registry toolbar, transaction registry | `08-table-list-standard.md` |
| Forms, inputs, search fields | `09-form-input-standard.md` |
| Modals, archive flows | `10-modal-drawer-standard.md` |
| Scroll, responsive, command-scroll, module CSS scroll | `11-scroll-responsive-standard.md` |
| Navigation, workspace hubs, dashboard cards | `12-navigation-workspace-standard.md` |
| Module wrappers, FinancePage, finance double-shell | `13-module-wrapper-rules.md` |
| Migration sequence, legacy debt removal | `14-page-migration-rules.md` |
| Guardrail policy, G-01/G-02/G-03/G-07, allowlists | `15-guardrail-rules.md` |
| Cleanup, deprecation, allowlist shrink conditions | `16-design-file-cleanup-map.md` |
| Design tokens / glass / CSS SOT | `01-design-tokens.md` |
| Typography scale | `02-typography-standard.md` |
| `AIXIA_STANDARD.md` locked phrases | Map by topic to `01`–`13` (not single file) |
| `AIXIA_STANDARD §22` registry intro | `05`, `08`, `14` |

### 5.2 Proposed citation constants (future Batch 28 — not implemented)

```text
PAGE_SHELL_OWNER     = src/design-system/aixia-global/03-page-shell-standard.md
HERO_HEADER_OWNER    = src/design-system/aixia-global/04-hero-header-standard.md
GUARDRAIL_POLICY     = src/design-system/aixia-global/15-guardrail-rules.md
SHADCN_BOUNDARY      = 07 + 13 + 15 (multi-cite in messages)
```

Replace single `PAGE_SHELL_HERO_STANDARD` with **dual cite** (`03` + `04`) for shell/hero violations; shadcn messages cite `15` §4F + `07` + `13`.

---

## 6. Allowlist audit

| Allowlist | Count | Legacy debt? | Justifying owner | Migration / deletion condition | Warn vs hard today | Later |
|-----------|-------|--------------|------------------|-------------------------------|-------------------|-------|
| `AUTH_PUBLIC_PAGE_PREFIXES` / `AUTH_PUBLIC_PAGE_EXACT` | 2 routes | No | `03`, `15` §11 | **Permanent** auth exception | Skipped (no check) | Keep |
| `ORB_SHELL_DEFER_PREFIXES` | 1 prefix (`ai-management/`) | Yes — P2 defer | `14`, `16` | Remove when AI mgmt migrated | Skipped | Shrink after migration |
| `LEGACY_SHELL_HERO_DEBT_FILES` | **16 files** | **Yes** | `14`, `16`, `15` §4E | Remove **one entry per route** when wrapped per `14` | **Warn** on G-01/G-02/G-03 | Shrink only; no growth |
| `SHADCN_SHELL_CHROME_FILES` | 2 files | No | `13`, `15` §4F | **Permanent** chrome exception | N/A (allow chrome) | Keep |
| `SHADCN_PAGELOADER_DEFER_FILES` | **0** | Cleared Batch 6 | `15`, `16` | Retain empty structure; add only with approval | N/A | Keep empty |
| `SHADCN_BOUNDARY_ERROR_PREFIXES` | 2 prefixes | Partial — scoped rollout | `15` §4F | Expand after baselines clean + approval | **Hard** in scope | Expand later only |
| `SHADCN_BOUNDARY_MODULE_PREFIXES` | 2 prefixes | Same as error scope today | `15` | Align with error prefixes on expansion | Scan = error scope | Rename/clarify in Batch 28 metadata |

### 6.1 `LEGACY_SHELL_HERO_DEBT_FILES` inventory

**Finance (10):**

- `src/app/finance/master-data/vendors/new/page.tsx`
- `src/app/finance/transactions/expense-funding/[id]/page.tsx`
- `src/app/finance/transactions/expense-payments/[id]/page.tsx`
- `src/app/finance/transactions/expense-review/[id]/page.tsx`
- `src/app/finance/transactions/paycheck-requests/[id]/page.tsx`
- `src/app/finance/transactions/payroll/funding-batches/[id]/page.tsx`
- `src/app/finance/transactions/payroll/new/page.tsx`
- `src/app/finance/transactions/payroll/review/[id]/page.tsx`
- `src/app/finance/transactions/payroll/[id]/page.tsx`
- `src/app/finance/transactions/quotations/[id]/page.tsx`

*(Audit confirms 10 finance + 6 agent-ops = 16 total. Note: `15-guardrail-rules.md` §4E lists “8 finance” — script set has 10; reconcile in a future owner-file precision pass.)*

**AgentOps (6):**

- `src/app/system/agent-ops/advanced/page.tsx`
- `src/app/system/agent-ops/agents/page.tsx`
- `src/app/system/agent-ops/agents/[agentId]/page.tsx`
- `src/app/system/agent-ops/automation/page.tsx`
- `src/app/system/agent-ops/history/page.tsx`
- `src/app/system/agent-ops/knowledge/page.tsx`

### 6.2 Allowlist policy alignment (plan only)

- Batch 28: add **owner-file + deletion condition** comments per `15` §4D without changing entries.
- Allowlist **removal** only when route migrated per `14` + recorded in `16`.
- **No allowlist shrink in Batch 27 or 28.**

---

## 7. Warning/error policy audit

### 7.1 Current implementation vs `15-guardrail-rules.md`

| Policy area | `15` says | Scripts do today | Match? |
|-------------|-----------|------------------|--------|
| Shell/hero legacy debt | Warn-only | Warn on 16 files; hard elsewhere | **Yes** |
| Shell/hero non-legacy | Hard error | `addHardError` | **Yes** |
| shadcn finance+agent-ops | Hard error | `addHardError` | **Yes** |
| Visual parity | Warn | All via `addError` → warnings | **Yes** |
| Dashboard standard | Warn | `addError` → warnings | **Yes** |
| Finance SOT / registry / smart-layout | Global policy; cite owners | Finance-scoped checks; no owner cites | **Partial** — behavior OK for now; citations missing |
| `addError` naming | Documented confusion | Runner `addError` = warn tier | **Yes** (documented in `15` §7) |
| Messages cite `aixia-global/` | Required after alignment | Still cite qa-agent paths | **No** — primary gap |
| No-new-debt | Block new violations where safe | Full-repo scan; no changed-file scope | **Partial** — future |
| Deprecation enforcement | Not active yet | Not implemented | **Yes** (intentionally deferred) |
| Module-specific guardrail law | Forbidden | Finance-heavy runner checks | **Partial** — mechanics scoped; policy is global in `15` |

### 7.2 Hard-error paths (build blocked)

| Source | Condition |
|--------|-----------|
| `runShellHeroGuardrails` | G-01/G-02/G-03 on any app page **not** auth/public/deferred/legacy-debt |
| `runShadcnBoundaryGuardrails` | `@/components/ui/*` in page under `src/app/finance/` or `src/app/system/agent-ops/` |

### 7.3 Warn-only paths (build continues)

| Source | Examples |
|--------|----------|
| Runner SOT checks | Component/CSS/AIXIA_STANDARD/finance lib/print |
| `runVisualParityGuardrails` | All heuristics |
| `runDashboardPageGuardrails` | Dashboard CSS/shell/cards |
| `runShellHeroGuardrails` | Legacy 16 files |
| `runShadcnBoundaryGuardrails` | Would warn if error prefixes narrowed (today same as scan scope) |
| Finance page inspectors | Registry, smart-layout, buttons, zero-local-design, etc. |

### 7.4 Visual parity vs browser QA

Static heuristics are **supplementary** per `15` §4G. Migration sign-off still requires browser QA per `14` §12 — unchanged.

---

## 8. Mismatches with `15-guardrail-rules.md`

| ID | Mismatch | Severity | Fix stage |
|----|----------|----------|-----------|
| M1 | `PAGE_SHELL_HERO_STANDARD` still points to qa-agent doc | **High** — wrong authority in messages | Batch 28 Stage 1 |
| M2 | `BOUNDARY_DOC` points to audit not `15`/`07`/`13` | **High** | Batch 28 Stage 1 |
| M3 | Allowlist comments cite batch reports not `14`/`16`/`15` | Medium | Batch 28 Stage 2 |
| M4 | Static QA `FINDING_HINTS` cite old docs | Medium | Batch 28 Stage 1 |
| M5 | Runner enforces `AIXIA_STANDARD.md` not owner files | Medium | Later batch (behavior + cite) |
| M6 | Visual parity cites `AIXIA_STANDARD §22` | Low | Batch 28 message pass |
| M7 | No guardrail rejects new law in old `src/design-system/*.md` | Planned future | Stage 4+ |
| M8 | No deprecation-banner detection | Planned future | Stage 5 |
| M9 | Finance-specific check **messages** read as finance law | Low — policy in `15` clarifies | Batch 28+ cite `13`/`08`/global owners |
| M10 | `G-DASH` marked warn in `15` but checks use `addError` | None — consistent warn tier | — |

---

## 9. Staged guardrail/reference alignment plan

**Explicit constraints for all stages:** no script edits in Batch 27; no hard-error escalation; no allowlist removal; no page migration; no old-file deletion until cleanup map gates.

### Stage 0 — Batch 27 (this batch) ✅

- Audit scripts, allowlists, policies.
- Publish this plan.
- Run `npm run qa:validate-foundation`.

### Stage 1 — Batch 28 (recommended next): reference/message alignment only

**Allowed:** Comments, string constants, error/warning message templates, static QA hints.  
**Forbidden:** Rule logic changes, allowlist edits, escalation, new checks.

1. Replace `PAGE_SHELL_HERO_STANDARD` with `03` + `04` paths in:
   - `aixia-guardrail-allowlists.mjs`
   - `aixia-shell-hero-guardrails.mjs`
   - `aixia-shadcn-boundary-guardrails.mjs` (drop shell doc from shadcn messages; cite `15`+`07`+`13`)
   - `qa-agent/scripts/static-design-guardrails.mjs` hints
2. Replace `BOUNDARY_DOC` with owner citations.
3. Record baseline warning/hard-error counts before/after (expect **zero behavior delta**).
4. Validate: `npm run qa:validate-foundation`; optional `npm run build` to confirm counts unchanged.

### Stage 2 — Allowlist metadata refresh (Batch 29 or part of 28 if approved)

- Add owner-file + deletion-condition comments to each allowlist export.
- Cross-link `LEGACY_SHELL_HERO_DEBT_FILES` entries to `16` debt table.
- **Do not remove or add entries.**

### Stage 3 — Package script descriptions (optional small batch)

- Update `package.json` script comments if any describe old qa-agent law (currently minimal).
- No script command changes.

### Stage 4 — No-new-design-law detection (after baseline review + Piter approval)

- Static scan rule: flag new “locked law” language in `src/design-system/*.md` outside `aixia-global/`.
- Requires deprecation banner batch plan completed first.

### Stage 5 — Deprecation-banner detection (after banner batch executes)

- Guardrail or QA check that old docs contain required banner per `16`.

### Stage 6 — Allowlist shrink (after migrations per `14`)

- Remove routes from `LEGACY_SHELL_HERO_DEBT_FILES` one at a time.
- Remove `ORB_SHELL_DEFER_PREFIXES` when AI mgmt migrated.

### Stage 7 — Escalation (after clean baselines + approval)

- Warn → hard for visual parity subsets.
- Expand shadcn hard-error beyond finance/agent-ops.
- **Not before** baseline counts documented.

### Stage 8 — `AIXIA_STANDARD.md` runner alignment (separate approved batch)

- Map locked phrases to owner files; reduce dual-SOT dependency on component markdown.

---

## 10. What must not change yet

| Area | Status |
|------|--------|
| Guardrail script logic / behavior | **Frozen** |
| Allowlist entries | **Frozen** |
| Hard-error vs warn tiers | **Frozen** |
| Page migrations | **Paused** |
| Batch 9 finance shell proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |
| Old file moves/deletes | **Paused** |
| Deprecation banners on old docs | **Paused** |
| `aixia-component-rules.md` / `aixia-page-patterns.md` / finance registry contract | **Not edited** |
| production/main | **Not touched** |

---

## 11. Recommended next batch

### **Batch 28 — Guardrail reference script update (comments/output only)**

**Why first:** Lowest risk; directly fixes M1–M4; zero behavior change if done correctly; aligns with `15` §8 checklist items 1–3.

**Scope:**

1. Update citation constants and message templates only.
2. Update static QA finding hints.
3. Refresh allowlist **comments** (optional same batch if Piter approves Stage 2).
4. Record baseline counts; confirm build warning/error counts unchanged.

**Do not recommend yet for Batch 28:**

- Page migration
- AgentOps History migration
- Finance shell proofs (Batch 9)
- Command-surface context
- CSS split
- Old-file deletion
- Guardrail hard-error escalation
- Deprecation banner **execution** (plan-only batch is OK as alternate Batch 28 choice)

**Alternate Batch 28:** Deprecation banner **plan** for old `src/design-system/*.md` (documentation only, mirroring Batch 27 pattern).

**Alternate Batch 29:** Cleanup map precision refresh for remaining old-file collisions (`aixia-component-rules`, `aixia-page-patterns`, finance registry contract).

---

## 12. Confirmation: page migrations remain paused

Per `00` §0.3, `14`, and Batch 26–27 scope:

- **Page migrations:** **Paused**
- **Batch 9 finance proofs:** **Paused**
- **Command-surface context:** **Paused**
- **Guardrail script changes:** **Paused until Batch 28**
- **Implementation alignment:** Plan complete; execution awaits Piter approval

---

## Validation

```text
npm run qa:validate-foundation
→ Result: PASS (markdown, templates, registry JSON/schema, cross-refs, content checks)
```

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_27_GUARDRAIL_REFERENCE_ALIGNMENT_PLAN.md` |
| 2 | Files modified | **None** |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Guardrail scripts changed | **No** |
| 7 | Package scripts changed | **No** |
| 8 | Old files moved/deleted | **No** |
| 9 | Deprecation banners added | **No** |
| 10 | Guardrail scripts audited | **Yes** |
| 11 | Old authority references mapped | **Yes** |
| 12 | Allowlists audited | **Yes** |
| 13 | Warning/error policy audited | **Yes** |
| 14 | Staged alignment plan created | **Yes** |
| 15 | Page migrations remain paused | **Yes** |
| 16 | Batch 9 finance proofs paused | **Yes** |
| 17 | Command-surface context paused | **Yes** |
| 18 | Command results | `npm run qa:validate-foundation` → **PASS** |
| 19 | Final status | **Batch 27 complete — plan only** |
| 20 | Recommended next batch | **Batch 28 — guardrail citation/message alignment (no behavior change)** |

---

*End of Batch 27 report.*
