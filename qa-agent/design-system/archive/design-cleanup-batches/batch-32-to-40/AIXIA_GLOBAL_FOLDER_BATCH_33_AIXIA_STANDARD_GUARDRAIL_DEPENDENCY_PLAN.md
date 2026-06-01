# AiXia Global Design System — Batch 33 — AIXIA_STANDARD Guardrail Dependency Reduction Plan

**Date:** 2026-05-30  
**Scope:** Documentation / planning only — **no script, code, CSS, or file moves**  
**Predecessor:** Batch 32 (`AIXIA_STANDARD.md` banner + authority table refresh)

---

## 1. Purpose

Batch 32 downgraded `src/components/aixia/AIXIA_STANDARD.md` to a legacy implementation/guardrail sync bridge and pointed its authority table at `src/design-system/aixia-global/` owners `00`–`16`. Guardrails still **read and validate** that file via `inspectSharedStandardDocument()` in `scripts/aixia-guardrails.mjs`.

Batch 33 audits that dependency, maps each locked phrase to the correct owner file, assesses owner-file coverage, defines a staged zero-risk read-path migration plan, and recommends the next safe execution batch — **without changing guardrail behavior**.

**End state (unchanged global rule):** ONE STANDARD · ONE OWNER PER ASPECT · ONE GLOBAL DESIGN FOLDER · NO COMPETING AUTHORITIES. Active design law lives only in `src/design-system/aixia-global/`. `AIXIA_STANDARD.md` may become a thin reference or be archived only after guardrail read-path migration, validation, and Piter approval.

---

## 2. Files / scripts audited

| Path | Role in dependency |
|------|-------------------|
| `scripts/aixia-guardrails.mjs` | **Primary:** `AIXIA_STANDARD_FILE` constant; `inspectSharedStandardDocument()` phrase sync; `REQUIRED_AIXIA_COMPONENT_FILES` existence check; build entry (`package.json` `build`) |
| `scripts/export-analytics-for-hermes.mjs` | **Secondary:** includes `src/components/aixia/AIXIA_STANDARD.md` in Hermes context manifest (path listing only — no phrase checks) |
| `src/components/aixia/AIXIA_STANDARD.md` | Legacy phrase host + component index (Batch 32 banner) |
| `src/design-system/aixia-global/00`–`16` | Canonical owner files (target read path) |
| `src/design-system/aixia-global/15-guardrail-rules.md` | Policy: `AIXIA_STANDARD.md` = deprecated guardrail source; cites owner-file citation map |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §4.4 disposition; §4.8 runner row still notes legacy phrase sync |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_27_GUARDRAIL_REFERENCE_ALIGNMENT_PLAN.md` | Stage 8 = runner alignment (plan only, not executed) |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_28_GUARDRAIL_CITATION_ALIGNMENT_REPORT.md` | Batch 28 updated runner messages; **kept** locked-phrase check by design |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_32_AIXIA_STANDARD_BANNER_REPORT.md` | Batch 32 outcome + recommended this plan |
| `package.json` | `build` → `aixia-guardrails.mjs`; QA scripts unchanged |
| `qa-agent/design-system/memory/*.md` | **Out of guardrail scope** but still mention `AIXIA_STANDARD.md` — agent confusion risk |

**Not audited for phrase reads (no `AIXIA_STANDARD` content reads):** `aixia-shell-hero-guardrails.mjs`, `aixia-shadcn-boundary-guardrails.mjs`, `aixia-visual-parity.mjs`, `static-design-guardrails.mjs`, component `.tsx` files.

---

## 3. Current AIXIA_STANDARD dependency map

```
package.json "build"
    └── scripts/aixia-guardrails.mjs :: main()
            ├── inspectSharedStandardDocument()     ← reads AIXIA_STANDARD.md TEXT (13 phrases)
            ├── inspectSharedComponentSourceOfTruth()
            │       └── REQUIRED_AIXIA_COMPONENT_FILES includes "AIXIA_STANDARD.md"
            │           └── assertFileExists() only (existence, not content)
            └── … other checks (CSS, components, finance, sub-guardrails)

scripts/export-analytics-for-hermes.mjs
    └── collectGithubManifest() staticPaths[]       ← path only (Hermes context)
```

### 3.1 `inspectSharedStandardDocument()` — behavior

| Aspect | Detail |
|--------|--------|
| **Location** | `scripts/aixia-guardrails.mjs` lines ~462–494 |
| **Trigger** | First call in `main()` before CSS/component/finance checks |
| **Read** | Full text of `src/components/aixia/AIXIA_STANDARD.md` |
| **Check** | `text.includes(phrase)` for each of **13** exact strings (case-sensitive substring match) |
| **On missing file** | `assertFileExists` → `addError` → **warning** (build continues) |
| **On missing phrase** | `addError` → **warning** (build continues) |
| **Scope label** | `"AiXia legacy standard document sync rule"` |
| **Message (Batch 28)** | Clarifies file is legacy sync; canonical law = `src/design-system/aixia-global/` |
| **Hard error?** | **No** — uses `addError`, not `addHardError` |
| **Build block?** | **No** — warnings are logged; `process.exit(1)` only for `hardErrors` or runner `errors` arrays |

### 3.2 `REQUIRED_AIXIA_COMPONENT_FILES` — separate dependency

| Aspect | Detail |
|--------|--------|
| **Location** | `scripts/aixia-guardrails.mjs` lines ~24–62, checked in `inspectSharedComponentSourceOfTruth()` |
| **AIXIA_STANDARD role** | File **must exist** at `src/components/aixia/AIXIA_STANDARD.md` |
| **Content** | Not validated except by `inspectSharedStandardDocument()` |
| **On missing** | `addError` → **warning** (build continues) |

### 3.3 Why Batch 32 preserved the 13 phrases

Batch 32 was **documentation-only**. Removing or renaming phrases would have changed guardrail **outcomes** (new warnings on every build) without an approved migration path. Batch 28 explicitly kept the locked-phrase check as **legacy sync by design** while updating citation messages to point at `aixia-global/`. Batch 32 moved authority wording to owner files in prose but kept appendix headings/strings byte-identical to satisfy `includes()` checks.

### 3.4 Other readers of `AIXIA_STANDARD.md`

| Consumer | Reads content? | Notes |
|----------|----------------|-------|
| `scripts/aixia-guardrails.mjs` | **Yes** | 13 phrase sync + file existence |
| `scripts/export-analytics-for-hermes.mjs` | **No** (path only) | Hermes manifest; update when file archived |
| AI agents / Hermes / Cursor rules | **Yes** (manual) | Batch 32 banner mitigates; path proximity risk remains |
| `qa-agent/design-system/memory/*.md` | **Yes** (manual) | Still cite old patterns — mirror update later |
| Owner files `02`–`13` | **No** | List file as deprecated reference in audit tables |

---

## 4. Current required phrases table

All phrases checked by `inspectSharedStandardDocument()` — exact substring match required.

| # | Required phrase | AIXIA_STANDARD.md section (Batch 32) | Guardrail tier | Build blocks if missing? |
|---|-----------------|----------------------------------------|----------------|--------------------------|
| 1 | `Source of truth` | `### Source of truth` | Warning | **No** |
| 2 | `Zero local design rule` | `### Zero local design rule` | Warning | **No** |
| 3 | `Locked shared components` | `### Locked shared components` | Warning | **No** |
| 4 | `Registry toolbar standard` | `### Registry toolbar standard` | Warning | **No** |
| 5 | `Archive manager standard` | `### Archive manager standard` | Warning | **No** |
| 6 | `Button standard` | `### Button standard` | Warning | **No** |
| 7 | `Table standard` | `### Table standard` | Warning | **No** |
| 8 | `Silent refresh standard` | `### Silent refresh standard` | Warning | **No** |
| 9 | `Finance permission standard` | `### Finance permission standard` | Warning | **No** |
| 10 | `GLOBAL AIXIA FONT / TYPOGRAPHY RULE` | `### GLOBAL AIXIA FONT / TYPOGRAPHY RULE` | Warning | **No** |
| 11 | `All AiXia pages must use the same shared font and shared text-size scale` | Under typography rule (bullet) | Warning | **No** |
| 12 | `No page may create its own font family` | Under typography rule (bullet) | Warning | **No** |
| 13 | `Large hero titles may stay large` | Under typography rule (bullet) | Warning | **No** |

**Note:** Missing phrases produce **warnings**, not hard errors. Batch 32 validation passed because all 13 phrases were present — not because missing phrases would block the build.

---

## 5. Required phrase → owner file mapping

Owner mapping uses `src/design-system/aixia-global/` numbered owners. **Exact phrase match in owner file today:** none of the 13 strings appear verbatim in owner files (verified grep across `aixia-global/`). Semantic law exists under different headings and wording.

| # | Required phrase | Current reason for check | Target owner file | Target section (if known) | Owner has equivalent law? | Future guardrail can read owner instead? | Migration risk | Recommended future action |
|---|-----------------|--------------------------|-------------------|---------------------------|---------------------------|----------------------------------------|----------------|---------------------------|
| 1 | `Source of truth` | Legacy doc sync; ensures SOT sections not deleted | `00-README-SOURCE-OF-TRUTH.md` (+ `15` §4A) | `00` §1 authority; `15` §4 Canonical guardrail model | **Semantic yes** (`source-of-truth` hyphenated) | **Yes**, after phrase anchor or heading-based check | **Medium** — exact string absent | Add phrase anchor to `00` §9 or `15` §4A; then parallel check |
| 2 | `Zero local design rule` | Enforces no page-local visual systems | `13-module-wrapper-rules.md` (+ `14`, `15` §4B) | `13` §5 “No local design systems”; `14` §2 migration discipline | **Semantic yes** | **Yes** | **Medium** | Anchor in `13` §5; map runner to `13`+`14` |
| 3 | `Locked shared components` | Ensures component index / shared-primitive discipline documented | `00` + `06`–`10` (+ component barrel) | `00` §6 implementation rules; owner audit tables | **Partial** — components named, phrase absent | **Yes** (multi-file or `00` index) | **Medium–High** — spans many owners | Consolidate anchor in `00` §6 or `16` §4.5 component table |
| 4 | `Registry toolbar standard` | Registry toolbar pattern not lost from docs | `08-table-list-standard.md` | §4 registry pattern; `AixiaRegistryToolbar` rows | **Semantic yes** | **Yes** | **Low–Medium** | Anchor in `08` §4 registry toolbar subsection |
| 5 | `Archive manager standard` | Archive modal pattern documented | `10-modal-drawer-standard.md` (+ `08`) | `10` archive manager; `08` archive table variant | **Semantic yes** | **Yes** | **Low–Medium** | Anchor in `10` §4 archive manager |
| 6 | `Button standard` | Button primitive / variant law | `07-button-action-standard.md` | §4 canonical button model | **Semantic yes** | **Yes** | **Low** | Anchor in `07` §4A |
| 7 | `Table standard` | Table shell / registry law | `08-table-list-standard.md` | §4 `AixiaTableShell` | **Semantic yes** | **Yes** | **Low** | Anchor in `08` §4 |
| 8 | `Silent refresh standard` | Scroll/filter preservation on refresh | `11-scroll-responsive-standard.md` (+ `13` refresh input) | `11` §4I silent refresh; `aixia-refresh-rules.md` input | **Semantic yes** | **Yes** | **Medium** — behavior spans refresh input doc | Anchor in `11` §4I; cite refresh input |
| 9 | `Finance permission standard` | Permission UI / access denied preservation | `13-module-wrapper-rules.md` (+ `aixia-permission-ui-rules.md` input) | `13` permission UI row; access denied patterns | **Semantic yes** (Finance-scoped wording; law is global permission **presentation**) | **Yes** | **Medium** — phrase says “Finance” but rule is global | Anchor in `13`; generalize wording in anchor |
| 10 | `GLOBAL AIXIA FONT / TYPOGRAPHY RULE` | Typography section not stripped | `02-typography-standard.md` | §4 typography categories; §10 conflicts | **Semantic yes** (different heading) | **Yes** | **Medium** | Add §4 anchor heading matching legacy phrase |
| 11 | `All AiXia pages must use the same shared font and shared text-size scale` | Shared font scale discipline | `02-typography-standard.md` | §4A Font family; `data-font-size` | **Semantic yes** | **Yes** | **Medium** — exact sentence absent | Add bullet to `02` §4A (phrase anchor) |
| 12 | `No page may create its own font family` | Forbid module font stacks | `02-typography-standard.md` | §4A Forbidden row | **Semantic yes** (“Module-specific font stacks”) | **Yes** | **Low–Medium** | Add exact phrase to `02` §4A Forbidden |
| 13 | `Large hero titles may stay large` | Marketing/non-command hero exception | `02-typography-standard.md` + `04-hero-header-standard.md` | `04` §13 public/marketing exceptions; `02` deprecated gradient XL | **Semantic yes** (inverse framing: auth pages must not) | **Yes** | **Medium** — wording asymmetry | Anchor in `04` §13 + `02` §4B deprecated note |

### 5.1 Multi-file read strategy (future implementation note)

Phrases 3, 8, 9, 10–13 may require **one owner primary + one input doc** or a **phrase registry** in `15-guardrail-rules.md` §4 (guardrail phrase sync table). Prefer **one owner per phrase** per global cleanup rule; use `15` only for guardrail-policy metadata, not visual law duplication.

---

## 6. Equivalent owner-file coverage assessment

| Coverage level | Phrases | Assessment |
|----------------|---------|------------|
| **Strong semantic coverage** | 1, 2, 4, 5, 6, 7, 8, 10, 11, 12 | Owner files contain enforceable law; guardrails already cite these owners for runtime violations (shell, hero, tables, buttons, scroll) |
| **Partial / split coverage** | 3, 9, 13 | Law spread across `00`+implementations, permission input doc, or `02`+`04` |
| **Exact phrase match in owner** | **None (0/13)** | Migration **cannot** swap read path without doc anchors or check-logic change |
| **Runtime enforcement without phrase check** | Most visual rules | Sub-guardrails enforce code/CSS patterns independently of markdown phrase sync |

**Gap:** The 13 checks are **documentation integrity** checks, not substitutes for code enforcement. They prevent accidental deletion of legacy sync sections while `AIXIA_STANDARD.md` remains the runner’s markdown SOT. Owner files are richer but use different vocabulary — **phrase anchors** (exact strings in owner appendices) are the lowest-risk bridge before read-path migration.

**Recommended pre-migration doc work (future batch, not Batch 33):** Add a short **“Guardrail phrase anchor”** subsection to each target owner (or a single table in `15` §4) containing the exact legacy strings, labeled as sync metadata — not new visual law.

---

## 7. Staged guardrail read-path migration plan

**Do not execute in Batch 33.** Each stage requires Piter approval before script changes.

### Stage 1 — Parallel owner-file checks (warn-only, additive)

**Goal:** Read same 13 phrases from mapped owner file(s) **in addition to** `AIXIA_STANDARD.md`.

| Action | Detail |
|--------|--------|
| Add | `inspectOwnerFilePhraseSync()` in `aixia-guardrails.mjs` (or qa-agent read-only script first) |
| Behavior | **Warn-only** if owner missing phrase; **do not** fail build on owner gap while legacy file still passes |
| Prerequisite | Phrase anchors added to owner files (docs batch) **OR** accept initial owner warnings as coverage report |
| Risk | **Low** if additive only |

### Stage 2 — Compare outputs / baseline

**Goal:** Confirm no false positives and document gap list.

| Action | Detail |
|--------|--------|
| Run | `npm run build` before/after; record warning counts |
| Run | Dedicated diff report: phrase present in AIXIA_STANDARD vs each owner |
| Gate | Owner coverage ≥ 13/13 for all phrases **or** documented exceptions with Piter approval |
| Risk | **Low** (read-only analysis) |

### Stage 3 — Move required-phrase source to owner files

**Goal:** Primary `includes()` checks read owner file(s); `AIXIA_STANDARD.md` check retained temporarily.

| Action | Detail |
|--------|--------|
| Change | Primary phrase loop targets owner paths from mapping table §5 |
| Keep | Legacy check in parallel until one release cycle / baseline confirmed |
| Gate | Batch 28-style verification: warning/hard-error counts unchanged for code violations |
| Risk | **Medium** — script change; needs careful testing |

### Stage 4 — Downgrade AIXIA_STANDARD check to legacy bridge warning

**Goal:** Single warn if legacy file diverges from owners (optional checksum/section count), not 13 separate phrase checks.

| Action | Detail |
|--------|--------|
| Replace | 13-phrase loop on `AIXIA_STANDARD.md` with one “legacy bridge drift” warning |
| Keep | File existence in `REQUIRED_AIXIA_COMPONENT_FILES` until archive |
| Risk | **Medium** — must not remove coverage accidentally |

### Stage 5 — Thin `AIXIA_STANDARD.md`

**Goal:** Reduce to component index + pointer to `aixia-global/`; remove duplicate appendix phrases.

| Action | Detail |
|--------|--------|
| Docs | Strip appendix after Stage 3 primary reads owners |
| Keep | Banner + component quick index |
| Gate | Guardrails no longer depend on appendix text |
| Risk | **Medium** — doc-only but must follow Stage 3 |

### Stage 6 — Archive (Piter approval)

**Goal:** Move to archive or replace with stub pointer.

| Action | Detail |
|--------|--------|
| Update | `export-analytics-for-hermes.mjs` manifest → `aixia-global/00` |
| Update | `REQUIRED_AIXIA_COMPONENT_FILES` — remove or replace with stub |
| Update | Memory mirrors, cleanup map §4.4, §4.8 |
| Gate | All §5 deletion gates in `16-design-file-cleanup-map.md` |
| Risk | **High** if premature |

---

## 8. Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Removing phrases too early** | 13 new warnings every build (no block, but noise + agent confusion) | Never remove phrases before Stage 3 primary switch |
| **Guardrails losing coverage** | Phrase checks are doc-integrity only; removing without owner anchors loses safety net | Stage 1 parallel + Stage 2 gap report |
| **Owner files lack exact matches** | `includes()` fails on reworded law | Phrase anchor subsections in owners (docs batch) before Stage 3 |
| **Multi-file read support** | One phrase may map to 2 owners | Phrase registry in `15` or OR-check across mapped files |
| **False positives** | Owner structured as tables vs appendix headings | Use explicit anchor blocks, not fuzzy match |
| **Agents still read AIXIA_STANDARD as law** | File lives beside components | Batch 32 banner; Stage 5 thin file; memory mirror updates |
| **Archive before migration** | Hermes manifest + REQUIRED_AIXIA_COMPONENT_FILES + phrase loop | Follow Stage 6 gates in `16` §5 |
| **Behavior change disguised as docs** | Changing check target changes warning set | Baseline counts; Batch 28 protocol |
| **Finance permission phrase naming** | Legacy phrase says “Finance” | Generalize in owner anchor; keep exact string for sync until Stage 4 |

---

## 9. What must not change yet

| Area | Status |
|------|--------|
| `scripts/aixia-guardrails.mjs` logic | **Frozen** |
| 13 `requiredPhrases` strings | **Frozen** |
| Warning vs hard-error tiers | **Frozen** |
| `AIXIA_STANDARD.md` content | **Frozen** (Batch 32 state) |
| Owner files `00`–`16` | **Frozen** in Batch 33 (no phrase anchors until approved batch) |
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |
| File move / delete / archive | **Paused** |
| Guardrail hard-error escalation | **Paused** |
| production/main | **Not touched** |

---

## 10. Recommended next batch

### **Primary recommendation — Batch 34: Owner-file phrase anchors + parallel coverage report (zero behavior change)**

Two sub-steps in one approved batch:

1. **Docs:** Add labeled **“Guardrail phrase anchor (sync metadata)”** blocks to mapped owner files (`00`, `02`, `04`, `07`, `08`, `10`, `11`, `13`, optionally `15`) containing the **exact** 13 legacy strings — not new visual law, only sync anchors per mapping §5.
2. **QA script (read-only, not build gate):** New `qa-agent/scripts/compare-aixia-standard-phrase-coverage.mjs` reporting owner vs `AIXIA_STANDARD` coverage — **does not** alter `aixia-guardrails.mjs` yet.

**Why first:** Closes the exact-match gap identified in §6 without touching build behavior. Enables Stage 1 parallel checks in Batch 35 with baseline confidence.

### Alternate Batch 34 options

| Option | Scope |
|--------|--------|
| **qa-agent old authority banner/archive plan** | Banner remaining qa-agent P0 shell/hero reports (competing authority risk) |
| **Cleanup map precision update** | Refresh `16` §4.8 runner row (Batch 32 done; Stage 1–6 notes); add §7 step for phrase migration |

### Do not recommend yet

- Page migration · AgentOps History migration · Finance shell proofs · Command-surface context · CSS split · Old-file deletion · Guardrail hard-error escalation · Stage 3 script switch without Batch 34 anchors

---

## 11. Confirmation: page migrations remain paused

Per `00` §0.3, `14-page-migration-rules.md`, and Batches 26–33 scope:

| Item | Status |
|------|--------|
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |
| Guardrail script changes | **Paused** (Batch 33 plan only) |
| File deletion / archive | **Paused** |

---

## Validation

```bash
npm run qa:validate-foundation
```

**Result (2026-05-30):** **PASS** — Markdown, templates, registry JSON/schema, cross-refs, important content checks OK.

**Build not run** — Batch 33 made no code changes.

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_33_AIXIA_STANDARD_GUARDRAIL_DEPENDENCY_PLAN.md` |
| 2 | Files modified | **None** |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Guardrail scripts changed | **No** |
| 7 | Package scripts changed | **No** |
| 8 | AIXIA_STANDARD.md changed | **No** |
| 9 | Old files moved/deleted | **No** |
| 10 | Files archived | **No** |
| 11 | Required phrases audited | **Yes** (13 phrases, `inspectSharedStandardDocument`) |
| 12 | Required phrases mapped to owner files | **Yes** (§5) |
| 13 | Owner-file coverage assessed | **Yes** (§6 — semantic yes, exact match 0/13) |
| 14 | Read-path migration plan created | **Yes** (§7, Stages 1–6) |
| 15 | Page migrations remain paused | **Yes** |
| 16 | Batch 9 finance proofs paused | **Yes** |
| 17 | Command-surface context paused | **Yes** |
| 18 | Command results | `qa:validate-foundation` → **PASS** |
| 19 | Final status | **Batch 33 complete** (plan-only) |
| 20 | Recommended next batch | **Batch 34 — owner-file phrase anchors + parallel coverage report (docs + read-only QA script)** |
