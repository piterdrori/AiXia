<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/15-guardrail-rules.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged into:
>
> - [`15-guardrail-rules.md`](../../src/design-system/aixia-global/15-guardrail-rules.md) — guardrail rules
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# P0-01 / P0-03 — Guardrail Enforcement Proposal (Batch 2)

**Status:** Documented proposal — **warn only** until P0 Batch 3  
**Date:** 2026-05-29

---

## Goal

Authenticated dashboard routes must not use:

- `AixiaPage` default orb surface (`surface` omitted or `"default"`)
- `AixiaHero` default gradient XL surface (`surface` omitted or `"default"`)

Enforcement must not block auth pages or one-off public routes.

---

## Existing guardrails (today)

| Script | Rule | Level |
|--------|------|-------|
| `scripts/guardrails/aixia-visual-parity.mjs` | Pages with `AixiaHero` / kicker but no `FinancePage` or command `AixiaPage` + `aixia-command-page` | **warn** |
| `scripts/guardrails/aixia-visual-parity.mjs` | Finance routes using raw `AixiaPage` without `FinancePage` | **warn** |
| `scripts/guardrails/aixia-dashboard-page.mjs` | Dashboard page command shell | **error** (dashboard only) |
| `scripts/aixia-guardrails.mjs` | Component/CSS SOT snippets | **warn** (build continues) |

**Gap:** No rule for `<AixiaHero>` without `surface="command"` on authenticated app routes.

---

## Proposed rules (Batch 3 — warn first)

### Rule G-01 — Command page shell

**When:** `src/app/**/page.tsx` (exclude auth + public)

**Fail/warn if:**

- File contains `<AixiaPage` AND
- Does NOT match `<AixiaPage` with `surface="command"` OR `<FinancePage` OR `<AixiaCommandPage` (via layout shell components)

**Exclude paths:**

- `src/app/login/**`
- `src/app/register/**`
- `src/app/auth/**` (if present)
- Print-only or standalone public routes (explicit allowlist)

### Rule G-02 — Command hero surface

**When:** Same scope

**Warn if:**

- File contains `<AixiaHero` AND
- Does NOT contain `surface="command"` within ~500 chars of opening tag

**Exclude:** Same as G-01

### Rule G-03 — Default hero marketing classes

**Warn if:** `aixia-title-xl` or `aixia-gradient-text` on authenticated routes under `src/app/` (excluding auth).

---

## Likely false positives

| Case | Mitigation |
|------|------------|
| Loading/error states using minimal `AixiaPage` without hero | Allowlist file patterns or `AixiaPageState`-only pages |
| Legacy finance detail routes (13 routes) | Already warned by finance shell rule; G-01 duplicates — merge messages |
| `paycheck-requests/[id]` mixed shell (AixiaPage wrapper + FinancePage inner) | Needs page migration later; warn is correct |
| AI Management orb pages (`src/app/ai-management/**`) | Exclude until P2-01 or warn as known debt |
| Calendar/chat module pages mid-migration | Exclude module paths until P1-05 |

---

## Recommended enforcement batch (Batch 3 — implemented)

1. ✅ G-01/G-02 added to `aixia-shell-hero-guardrails.mjs` — **warn only** (19 shell + 15 hero warnings)
2. ✅ G-07 shadcn boundary in `aixia-shadcn-boundary-guardrails.mjs` — **1 warning**
3. ✅ Integrated into `npm run build` and `qa:static-design-guardrails`
4. **Batch 4:** Promote to error for finance/agent-ops path subsets after debt reduction
5. **Batch 4:** `AixiaHero` default `surface="command"` after usage audit

---

## Default prop changes (deferred)

| Component | Change | Blocked by |
|-----------|--------|------------|
| `AixiaHero` default `surface="command"` | Batch 5+ | Auth pages + legacy finance orb pages |
| `AixiaPage` default `surface="command"` | **Never global** | Auth/marketing must keep orb option |

See also: `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md`

---

## Path-scoped error promotion (Batch 4 — proposal only, not enabled)

**Goal:** Reduce false positives before global hard failure. Legacy debt stays warn-only until path debt ≤ 3.

### Phase E-1 — shadcn boundary (ready after Batch 4)

| Path | Rule | Level | Notes |
|------|------|-------|-------|
| `src/app/finance/**/page.tsx` | No `@/components/ui/*` in page content | **error** | Already 0 warnings — safe to promote in Batch 5 |
| `src/app/system/agent-ops/**/page.tsx` | No `@/components/ui/*` except allowlist | **error** | After `Progress` → `AixiaProgressBar`; `PageLoader` remains allowlisted until shared async shell exists |

**Allowlist (unchanged):** `@/components/ui/PageLoader` on AgentOps routes only.

### Phase E-2 — shell/hero (deferred to Batch 5+)

| Path | Rule | Level | Gate |
|------|------|-------|------|
| `src/app/login/**`, `src/app/register/**` | Excluded | — | Auth must keep orb |
| `src/app/finance/**/page.tsx` using `FinancePage` | G-01 pass | **error** | When legacy 13 routes wrapped or excluded explicitly |
| `src/app/system/agent-ops/council/**` | G-01/G-02 pass | **error** | When Council shell debt cleared (currently command — verify guardrail) |
| All other `src/app/**/page.tsx` | G-01/G-02 | **warn** | Until debt ≤ 3 per module prefix |

### Phase E-3 — new files only (optional Batch 5)

- **error** if a **new** file under `src/app/finance/` or `src/app/system/agent-ops/` introduces orb shell or shadcn ui import.
- Implementation: compare against git base branch file list; zero legacy false positives.

### False-positive mitigations

| Case | Mitigation |
|------|------------|
| AgentOps `PageLoader` | Keep allowlist until `AixiaAsyncSection` or equivalent shared wrapper ships |
| Legacy finance detail routes (13) | Explicit exclude list in guardrail until shell-only wrap batch |
| `ai-management/**` | Exclude until P2-01 |
| Calendar scroll family | Not a guardrail target — CSS-only P0-06 |

### Batch 4 outcome

- **Hard failure:** not enabled (risk still high on 19+15 shell/hero warnings).
- **shadcn:** 1 → 0 warnings after `AixiaProgressBar` on AgentOps hub.
- **Next enable step:** Batch 5 — error on Finance page shadcn + new-file-only shell rules.

### Batch 5 outcome (implemented)

- **shadcn hard error:** enabled on build for `src/app/finance/**` + `src/app/system/agent-ops/**` (0 current violations).
- **PageLoader allowlist:** council + history only.
- **Shell/hero:** `LEGACY_SHELL_HERO_DEBT_FILES` warn-only; all other app pages hard error on build.
- **AixiaAsyncState:** replaces PageLoader on 11 non-deferred routes.
