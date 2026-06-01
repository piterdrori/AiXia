# AiXia Global Folder — Batch 25 Guardrail Rules Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page/guardrail-script/package-script changes, no file moves/deletes.

---

## Purpose

Create `15-guardrail-rules.md` as the single source-of-truth for all AiXia design guardrail and enforcement rules — warning vs hard-error policy, allowlist policy, legacy debt policy, static design checks, shadcn boundary, shell/hero enforcement, visual parity, cleanup/deprecation enforcement, build/QA script relationship, and guardrail migration/deprecation rules.

This completes the owner file set `00`–`16` (excluding no missing numbered files).

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/15-guardrail-rules.md` | Canonical owner for guardrail model (A–I), canonical rules, rule IDs G-01/G-02/G-03/G-07, collisions, script strategy, consolidation plan, completion definition, next-step dependency |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_25_GUARDRAIL_RULES_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmation scope

| Item | Result |
|------|--------|
| Only `15-guardrail-rules.md` created as owner file in this batch | **Yes** |
| Guardrail scripts changed | **No** |
| Package scripts changed | **No** |
| Code changed | **No** |
| CSS changed | **No** |
| Pages changed | **No** |
| Finance patched | **No** |
| AgentOps patched | **No** |
| Old files moved/deleted | **No** |
| Deprecation banners added | **No** |

---

## Guardrail sources audited

- `scripts/guardrails/aixia-guardrail-allowlists.mjs`
- `scripts/guardrails/aixia-shell-hero-guardrails.mjs`
- `scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs`
- `scripts/guardrails/aixia-visual-parity.mjs`
- `scripts/guardrails/aixia-dashboard-page.mjs`
- `scripts/aixia-guardrails.mjs`
- `package.json` (build + qa scripts)
- `qa-agent/scripts/static-design-guardrails.mjs`
- `qa-agent/scripts/validate-qa-foundation.mjs`
- `qa-agent/design-system/AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md`
- `qa-agent/design-system/AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md`
- `qa-agent/design-system/AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md`
- `qa-agent/design-system/AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md`
- `src/design-system/aixia-conflict-deprecation-policy.md`
- `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md` (deprecated citation target)
- Owner files `00`–`14`, `16`

---

## Guardrail collisions identified

1. Guardrail scripts still cite `AIXIA_PAGE_SHELL_HERO_STANDARD.md` instead of `aixia-global/` owners.
2. Allowlists contain 16 legacy shell/hero debt files.
3. shadcn boundary hard error active on finance + agent-ops prefixes.
4. Shell/hero hard error on non-legacy routes; warn on legacy debt.
5. Old batch reports referenced in allowlist comments.
6. Cleanup/deprecation not enforced by guardrails yet.
7. Module CSS ownership not hard-enforceable yet.
8. Changed-file/new-file enforcement not implemented.
9. PageLoader deletion still cleanup-gated.
10. Runner `addError` naming → warnings array (build continues).
11. Visual parity checks warn-only.
12. Finance-specific SOT checks in runner need generalized owner citations.

---

## Canonical guardrail model created

Documented in `15-guardrail-rules.md` §4:

- **A.** Source-of-truth guardrails (cite `00`–`16`)
- **B.** Static design guardrails (shell/hero, shadcn, parity, dashboard, SOT)
- **C.** Warning vs hard-error policy (legacy warn; new debt block when safe)
- **D.** Allowlist policy (named, owner reference, deletion condition, shrink over time)
- **E.** Legacy debt policy (tracked in 14/16; cannot grow)
- **F.** Shadcn boundary policy (chrome allowed; product content blocked)
- **G.** Visual parity policy (owner files + browser QA)
- **H.** Cleanup/deprecation enforcement (future)
- **I.** Build/QA script relationship

---

## Enforcement strategy documented

- Policy in `15`; scripts implement only.
- `aixia-guardrails.mjs` = build runner; sub-guardrails = check implementations.
- Allowlists = data in `aixia-guardrail-allowlists.mjs`; policy here.
- Future: policy-first script alignment batch after Piter approval.
- Consolidation plan §9: cite owners → shrink allowlists → reject external design law.

---

## Forbidden guardrail patterns documented

- No guardrail policy outside this file.
- No module-specific guardrail law.
- No permanent unexplained allowlists.
- No blind escalation.
- No scripts inventing visual law.
- No old reports as current law after alignment.
- No deletion without dependency checks.

---

## Confirmation: no implementation changes

| Area | Changed |
|------|---------|
| Guardrail scripts | **No** |
| Package scripts | **No** |
| Page code | **No** |
| CSS | **No** |
| Components | **No** |
| File moves/deletes | **No** |
| Deprecation banners | **No** |
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |

---

## Next recommended batch

**Do not recommend page migration yet.**

Recommend:

### AiXia Global Design Owner Files Review & Approval Pass

- Confirm `00`–`16` exist.
- Check consistency across owner files.
- Check no owner contradicts another.
- Check cleanup map still matches owners.
- Draft next implementation alignment plan.
- **No code/CSS/page/guardrail script changes yet.**

---

## Validation

Run: `npm run qa:validate-foundation` — see final check in batch completion message.
