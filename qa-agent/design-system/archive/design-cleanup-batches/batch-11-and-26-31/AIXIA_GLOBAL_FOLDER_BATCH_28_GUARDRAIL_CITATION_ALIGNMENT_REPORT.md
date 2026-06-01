# AiXia Global Folder — Batch 28 Guardrail Citation Alignment Report

**Date:** 2026-05-30  
**Type:** Guardrail citation/message alignment only — no rule logic, allowlist, severity, or app-source changes.

---

## 1. Purpose

Implement Batch 27 Stage 1: replace old qa-agent authority citations in guardrail scripts with `src/design-system/aixia-global/` owner-file references. Detection logic, allowlist entries, warn/hard-error tiers, and scan scopes are unchanged.

---

## 2. Files modified

| File | Change |
|------|--------|
| `scripts/guardrails/aixia-guardrail-allowlists.mjs` | Replaced `PAGE_SHELL_HERO_STANDARD` with owner-file constants; refreshed allowlist comments |
| `scripts/guardrails/aixia-shell-hero-guardrails.mjs` | G-01/G-02/G-03 messages cite `03`/`04`/`02`/`15` |
| `scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs` | G-07 messages cite `07`/`13`/`15`; removed old boundary doc |
| `scripts/guardrails/aixia-visual-parity.mjs` | Registry intro messages cite `05`/`08`/`14` instead of `AIXIA_STANDARD §22` |
| `qa-agent/scripts/static-design-guardrails.mjs` | Updated `orb-page-shell`, `non-command-hero`, `shadcn-page-content` hints |
| `scripts/aixia-guardrails.mjs` | Legacy SOT comment + `inspectSharedStandardDocument` scope/message wording |

## Files created

| File | Role |
|------|------|
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_28_GUARDRAIL_CITATION_ALIGNMENT_REPORT.md` | This report |

**Not modified:** `package.json`, page/CSS/component files, allowlist array contents, guardrail detection logic.

---

## 3. Baseline counts before changes

| Metric | Before |
|--------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| Static scan files | 528 |
| Static findings total | **185** |
| Static actionable | 4 |
| Static review needed | 25 |
| Static `orb-page-shell` | **16** |
| Static `non-command-hero` | **15** |
| `npm run qa:guardrail-action-plan` | **PASS** (185 source findings) |
| Build guardrail warnings (lines) | **195** |
| Shell/hero warning lines | **31** |
| shadcn boundary lines | **0** |
| Hard errors (build blocked) | **0** |
| `npm run build` | Not run in baseline capture (guardrails-only: exit 0) |

---

## 4. Counts after changes

| Metric | After |
|--------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| Static scan files | 528 |
| Static findings total | **185** |
| Static actionable | 4 |
| Static review needed | 25 |
| Static `orb-page-shell` | **16** |
| Static `non-command-hero` | **15** |
| `npm run qa:guardrail-action-plan` | **PASS** (185 source findings) |
| Build guardrail warnings (lines) | **195** |
| Shell/hero warning lines | **31** |
| shadcn boundary lines | **0** |
| Hard errors (build blocked) | **0** |
| `npm run build` | **PASS** (guardrails + tsc + vite) |

---

## 5. Confirmation: no behavior change

| Check | Result |
|-------|--------|
| Warning count delta | **0** (195 → 195) |
| Shell/hero count delta | **0** (31 → 31) |
| shadcn boundary count delta | **0** (0 → 0) |
| Hard error delta | **0** |
| Static finding count delta | **0** (185 → 185) |
| Allowlist entry count | **Unchanged** (16 legacy routes, same prefixes/sets) |
| Rule logic / scan patterns | **Unchanged** |

Only citation strings in messages, hints, comments, and scope labels changed.

---

## 6. Old references replaced

| Old reference | Removed from |
|---------------|--------------|
| `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md` | allowlists constant, shell-hero messages, shadcn messages (was incorrectly appended), static QA hints |
| `qa-agent/design-system/AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | `BOUNDARY_DOC` constant, static QA hint |
| `qa-agent/design-system/AIXIA_P0_BATCH_5_ASYNC_BOUNDARY_GUARDRAIL_REPORT.md` | allowlist comment (replaced with owner refs) |
| `AIXIA_STANDARD §22` | visual-parity registry intro messages (×3) |
| `AIXIA_STANDARD.md` as “source of truth” | runner scope/message for locked-phrase sync check |

---

## 7. New owner-file references used

| Constant / usage | Path |
|------------------|------|
| `PAGE_SHELL_OWNER` | `src/design-system/aixia-global/03-page-shell-standard.md` |
| `HERO_HEADER_OWNER` | `src/design-system/aixia-global/04-hero-header-standard.md` |
| `TYPOGRAPHY_OWNER` | `src/design-system/aixia-global/02-typography-standard.md` |
| `GUARDRAIL_POLICY_OWNER` | `src/design-system/aixia-global/15-guardrail-rules.md` |
| `BUTTON_ACTION_OWNER` | `src/design-system/aixia-global/07-button-action-standard.md` |
| `MODULE_WRAPPER_OWNER` | `src/design-system/aixia-global/13-module-wrapper-rules.md` |
| `PAGE_MIGRATION_OWNER` | `src/design-system/aixia-global/14-page-migration-rules.md` |
| `DESIGN_CLEANUP_MAP_OWNER` | `src/design-system/aixia-global/16-design-file-cleanup-map.md` |
| `META_STRIP_OWNER` / inline | `05-meta-status-strip-standard.md` |
| `TABLE_LIST_OWNER` / inline | `08-table-list-standard.md` |

**Rule mapping in messages:**

- G-01 → `03` + `15`
- G-02 → `04` + `15`
- G-03 → `04` + `02` + `15`
- G-07 → `07` + `13` + `15`
- Registry intro → `05` + `08` + `14`

---

## 8. Allowlist comments refreshed

Updated in `aixia-guardrail-allowlists.mjs` (comments only):

- `AUTH_PUBLIC_*` — permanent auth exception per `15` §4D
- `ORB_SHELL_DEFER_PREFIXES` — temporary defer; cites `14`, `16`
- `LEGACY_SHELL_HERO_DEBT_FILES` — legacy debt; shrink on migration; cites `14`, `16`, `15`; no growth without approval
- `SHADCN_SHELL_CHROME_FILES` — chrome/auth only; cites `13`, `15`
- `SHADCN_PAGELOADER_DEFER_FILES` — empty; cites `15`, `16`
- `SHADCN_BOUNDARY_*` — policy pointer to `15` §4F

**Array contents unchanged.**

---

## 9. Static QA hints refreshed

In `qa-agent/scripts/static-design-guardrails.mjs` `FINDING_HINTS`:

| Finding ID | New citation |
|------------|--------------|
| `orb-page-shell` | `03-page-shell-standard.md` + `15-guardrail-rules.md` |
| `non-command-hero` | `04-hero-header-standard.md` + `15-guardrail-rules.md` |
| `shadcn-page-content` | `07` + `13` + `15` |

Finding IDs, scan patterns, and classification logic unchanged.

---

## 10. Visual parity citation refreshed

Three transaction-registry messages in `aixia-visual-parity.mjs` now cite:

`src/design-system/aixia-global/05-meta-status-strip-standard.md`, `08-table-list-standard.md`, `14-page-migration-rules.md`

Detection regexes and warn tier unchanged.

---

## 11. Runner SOT wording refreshed

`scripts/aixia-guardrails.mjs`:

- Comment on `AIXIA_STANDARD_FILE`: legacy implementation reference; canonical law in `aixia-global/`
- `inspectSharedStandardDocument()`: function comment + scope renamed to `AiXia legacy standard document sync rule`
- Error message clarifies `AIXIA_STANDARD.md` is legacy sync; canonical law is `src/design-system/aixia-global/`

Locked-phrase checks **retained** (same phrases, same warn tier).

---

## 12. Confirmation: no allowlist entries changed

| Allowlist | Before | After |
|-----------|--------|-------|
| `LEGACY_SHELL_HERO_DEBT_FILES` | 16 entries | 16 entries (identical paths) |
| `ORB_SHELL_DEFER_PREFIXES` | 1 prefix | 1 prefix |
| `SHADCN_SHELL_CHROME_FILES` | 2 files | 2 files |
| `SHADCN_PAGELOADER_DEFER_FILES` | empty | empty |
| `SHADCN_BOUNDARY_ERROR_PREFIXES` | 2 prefixes | 2 prefixes |
| `AUTH_PUBLIC_*` | unchanged | unchanged |

---

## 13. Confirmation: no warn/hard-error behavior changed

- Legacy shell/hero routes: still **warn-only**
- Non-legacy shell/hero: still **hard error** via `addHardError`
- shadcn in finance/agent-ops page content: still **hard error**
- Visual parity / dashboard / finance SOT checks: still **warn** via runner `addError`
- No new checks added; no checks removed

---

## 14. Validation results

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** — 185 findings |
| `npm run qa:guardrail-action-plan` | **PASS** |
| `npm run build` | **PASS** |

Regenerated reports under `qa-agent/reports/` now contain `aixia-global/` citations in shell/hero messages and hints.

---

## 15. Remaining citation debt

| Item | Notes |
|------|-------|
| Finance runner messages | Still say “shared source-of-truth” for `@/components/aixia` — accurate for implementation; could map to owner files in a later message-only pass |
| `AIXIA_STANDARD.md` locked-phrase check | Still runs (legacy sync by design); not removed per batch scope |
| `15-guardrail-rules.md` §3 audit table | Documents pre-Batch-28 state; update in a doc refresh batch |
| Competing docs | `aixia-component-rules.md`, `aixia-page-patterns.md`, `aixia-finance-workflow-registry-contract.md` — no guardrail detection yet |
| `scripts/export-analytics-for-hermes.mjs` | Still lists `AIXIA_STANDARD.md` — out of guardrail scope |
| No-new-design-law detection | Not implemented (Batch 27 Stage 4+) |
| Deprecation banner enforcement | Not implemented |

---

## 16. Recommended next batch

**Batch 29 — Deprecation banner plan for old `src/design-system/*.md`**

Documentation-only plan (mirroring Batches 27–28 pattern) for banner text, target files (`aixia-component-rules.md`, `aixia-page-patterns.md`, `aixia-finance-workflow-registry-contract.md`, qa-agent superseded law docs), and execution gates per `16`.

**Alternates:**

- Cleanup-map precision refresh for remaining collisions
- Owner-file implementation alignment plan (CSS/component citations)
- No-new-design-law detection plan

**Do not recommend yet:** page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, old-file deletion, guardrail hard-error escalation.

---

## Pause confirmations

| Area | Status |
|------|--------|
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | `AIXIA_GLOBAL_FOLDER_BATCH_28_GUARDRAIL_CITATION_ALIGNMENT_REPORT.md` |
| 2 | Files modified | 6 guardrail/QA script files (see §2) |
| 3 | Guardrail script logic changed | **No** |
| 4 | Guardrail message/citation text changed | **Yes** |
| 5 | Allowlist entries changed | **No** |
| 6 | Warn/hard-error behavior changed | **No** |
| 7 | Package scripts changed | **No** |
| 8 | Code/page/CSS/component behavior changed | **No** |
| 9 | Old files moved/deleted | **No** |
| 10 | Deprecation banners added | **No** |
| 11 | Old shell/hero citation replaced | **Yes** |
| 12 | Old shadcn citation replaced | **Yes** |
| 13 | Static QA hints updated | **Yes** |
| 14 | Visual parity AIXIA_STANDARD §22 citation replaced | **Yes** |
| 15 | Before/after counts listed | **Yes** (§3–§4) |
| 16 | Behavior delta | **No** |
| 17 | Page migrations remain paused | **Yes** |
| 18 | Batch 9 finance proofs paused | **Yes** |
| 19 | Command-surface context paused | **Yes** |
| 20 | Command results | All validation **PASS**; build **PASS** |
| 21 | Final status | **Batch 28 complete** |
| 22 | Recommended next batch | **Batch 29 — deprecation banner plan for old `src/design-system/*.md`** |

---

*End of Batch 28 report.*
