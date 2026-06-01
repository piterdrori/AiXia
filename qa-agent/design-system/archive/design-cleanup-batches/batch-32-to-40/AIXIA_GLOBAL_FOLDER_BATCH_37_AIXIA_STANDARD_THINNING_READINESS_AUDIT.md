# AiXia Global Design System — Batch 37 — AIXIA_STANDARD Thinning Readiness Audit

**Date:** 2026-05-30  
**Scope:** Documentation-only audit — **no file edits, no guardrail changes, no thinning**

---

## 1. Purpose

Batch 36 made `inspectGlobalOwnerPhraseAnchors()` the **primary** phrase check and `inspectSharedStandardDocument()` **secondary legacy sync**. Before thinning, archiving, or deleting any part of `src/components/aixia/AIXIA_STANDARD.md`, this audit inventories all dependencies, classifies every major section, maps the 13 required phrases, and defines a staged thinning plan.

**End state (unchanged):** Active design law lives only in `src/design-system/aixia-global/`. `AIXIA_STANDARD.md` may remain only as secondary legacy sync bridge, implementation reference, or future archive candidate after dependency migration, validation, and Piter approval.

---

## 2. Files / scripts audited


| Category         | Paths                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Target file      | `src/components/aixia/AIXIA_STANDARD.md`                                                         |
| Build guardrails | `scripts/aixia-guardrails.mjs`                                                                   |
| Coverage report  | `scripts/guardrails/aixia-owner-phrase-coverage-report.mjs`                                      |
| Hermes export    | `scripts/export-analytics-for-hermes.mjs`                                                        |
| Owner / policy   | `src/design-system/aixia-global/00`–`16`, `15-guardrail-rules.md`, `src/design-system/README.md` |
| Batch history    | Batches 32–36 reports                                                                            |
| qa-agent docs    | Memory files, consolidation reports, audits, batch plans                                         |
| Repo search      | 38 files matching `AIXIA_STANDARD` (grep, 2026-05-30)                                            |


**Not found:** `package.json` references, `.hermes.md` references, component `.tsx` imports, static-design-guardrails reads of file content.

---

## 3. All references to `AIXIA_STANDARD.md`

### 3.1 Build-affecting (must migrate before appendix removal)


| File                           | Reference type                      | Reads content?             | Exact phrases?                   | Affects build?                  | Can remove later?                           | Replacement / target                                       |
| ------------------------------ | ----------------------------------- | -------------------------- | -------------------------------- | ------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| `scripts/aixia-guardrails.mjs` | `AIXIA_STANDARD_FILE` constant      | Yes                        | **Yes** — 13 `includes()` checks | **Yes** — every `npm run build` | After Stage 3 guardrail change              | Primary: owner anchors; secondary: banner + existence only |
| `scripts/aixia-guardrails.mjs` | `REQUIRED_AIXIA_COMPONENT_FILES`    | Existence only             | No                               | **Yes** — warn if file missing  | After thin stub or archive with path update | Keep stub or remove from list after archive                |
| `scripts/aixia-guardrails.mjs` | `inspectGlobalOwnerPhraseAnchors()` | No (reads `aixia-global/`) | N/A                              | Yes (primary)                   | N/A                                         | Already primary                                            |


### 3.2 Runtime / export (non-build gate)


| File                                      | Reference type                        | Reads content?      | Exact phrases? | Affects build? | Can remove later? | Replacement / target                              |
| ----------------------------------------- | ------------------------------------- | ------------------- | -------------- | -------------- | ----------------- | ------------------------------------------------- |
| `scripts/export-analytics-for-hermes.mjs` | `collectGithubManifest()` static path | No — path list only | No             | No             | Yes               | Point to `aixia-global/00` + component `index.ts` |


### 3.3 Read-only QA / migration visibility


| File                                                        | Reference type                                            | Reads content?             | Affects build? | Can remove later?                      |
| ----------------------------------------------------------- | --------------------------------------------------------- | -------------------------- | -------------- | -------------------------------------- |
| `scripts/guardrails/aixia-owner-phrase-coverage-report.mjs` | Comment + constant name `REQUIRED_AIXIA_STANDARD_PHRASES` | Scans `aixia-global/` only | No             | Keep; update footer note after Stage 3 |


### 3.4 Owner files (deprecation audit tables + phrase anchors)


| File                                                             | Reference type                      | Reads AIXIA_STANDARD content? | Affects build? |
| ---------------------------------------------------------------- | ----------------------------------- | ----------------------------- | -------------- |
| `00`, `02`, `04`, `07`, `08`, `09`, `10`, `11`, `12`, `13`, `15` | Audit row: deprecated source        | No                            | No             |
| `00`, `02`, `04`, `07`, `08`, `10`, `11`, `13`                   | Phrase anchor disclaimer cites path | No                            | No             |
| `16-design-file-cleanup-map.md`                                  | §2 collision table, §4.4, §4.8, §7  | No                            | No             |


### 3.5 Governance wrapper


| File                          | Reference type                                 | Affects build? |
| ----------------------------- | ---------------------------------------------- | -------------- |
| `src/design-system/README.md` | Delegates; lists as deprecated component index | No             |


### 3.6 qa-agent memory (agent confusion risk — stale)


| File                                           | Issue                                                   | Affects build? | Future target                    |
| ---------------------------------------------- | ------------------------------------------------------- | -------------- | -------------------------------- |
| `memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | Says read PAGE_SHELL_HERO not AIXIA_STANDARD for layout | No             | Update to `aixia-global/03`–`05` |
| `memory/AIXIA_DESIGN_COMPONENT_MEMORY.md`      | Index-only + PAGE_SHELL_HERO as shell law               | No             | Update to `aixia-global/`        |
| `memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md`  | P0-08 points README → PAGE_SHELL_HERO                   | No             | Update to `aixia-global/00`      |


### 3.7 qa-agent reports / plans (historical — no build impact)

Batch reports 10–36, consolidation backlog, conflict audit, unified plans, P0 reports, existing component audit, finance-local-glass verification, AgentOps Hermes discovery — **documentation only**. Safe to leave until archive phase; should not be cited as current law.

### 3.8 Component code

**No** `.tsx`/`.ts` files import or read `AIXIA_STANDARD.md`. Proximity risk: file lives beside components in `src/components/aixia/` — agents may open it first.

---

## 4. Dependency map

```
npm run build
└── scripts/aixia-guardrails.mjs
    ├── [PRIMARY] inspectGlobalOwnerPhraseAnchors()
    │       └── runOwnerPhraseCoverageReport() → aixia-global/*.md (13 phrases)
    ├── [SECONDARY] inspectSharedStandardDocument()
    │       └── AIXIA_STANDARD.md full text → 13 exact phrase includes()
    └── inspectSharedComponentSourceOfTruth()
            └── REQUIRED_AIXIA_COMPONENT_FILES includes "AIXIA_STANDARD.md" (existence)

scripts/export-analytics-for-hermes.mjs
└── Hermes manifest path list (no content read)

node scripts/guardrails/aixia-owner-phrase-coverage-report.mjs
└── Manual read-only; aixia-global/ only

Agents / memory / qa-agent reports
└── Citations only; no build coupling
```

**Blocking dependencies for appendix removal today:**

1. `inspectSharedStandardDocument()` — 13 phrase checks on `AIXIA_STANDARD.md` text.
2. `REQUIRED_AIXIA_COMPONENT_FILES` — file must exist at current path.

**Non-blocking but should migrate before archive:**

1. Hermes manifest path list.
2. qa-agent memory stale shell-law pointers.
3. Collision rows in `16` §2 still list `AIXIA_STANDARD.md` as typography/hero source (historical inventory — not live law).

---

## 5. Section classification table — `AIXIA_STANDARD.md`


| Section                                   | Lines (approx.) | Classification | Notes                                                                    |
| ----------------------------------------- | --------------- | -------------- | ------------------------------------------------------------------------ |
| `AIXIA-DEPRECATION-BANNER` + blockquote   | 1–18            | **B** + **F**  | Keep in thin reference; banner required for agent clarity                |
| H1 + Batch 32 status note                 | 20–22           | **B**          | Implementation index framing                                             |
| Canonical design law table                | 24–45           | **C** + **F**  | Duplicated by `00`–`16`; safe future removal after agents routed to `00` |
| Historical qa-agent footnote              | 47              | **D**          | Backlog pointer only                                                     |
| Superseded rules (do not implement)       | 49–56           | **D** + **B**  | Historical retired patterns; useful anti-pattern warning                 |
| Shared implementation source              | 58–63           | **B**          | Paths to components/CSS — still useful                                   |
| Component quick index                     | 65–82           | **B**          | Useful implementation map; could move to `00` §6 or stay thin            |
| Finance rewrite discipline                | 84–91           | **C** + **B**  | Overlaps `13`/`14`; discipline bullets still useful                      |
| Appendix intro                            | 95–97           | **A** + **B**  | Required for guardrail sync context                                      |
| `### Source of truth`                     | 99–101          | **A** + **E**  | Phrase + wording "implementation source of truth" — mitigated by banner  |
| `### Zero local design rule`              | 103–105         | **A** + **C**  | Phrase required; prose owned by `13`                                     |
| `### Locked shared components`            | 107–109         | **A** + **C**  | Phrase required; index duplicated                                        |
| `### Registry toolbar standard`           | 111–113         | **A** + **C**  | Phrase required; law in `08`                                             |
| `### Archive manager standard`            | 115–117         | **A** + **C**  | Phrase required; law in `10`/`08`                                        |
| `### Button standard`                     | 119–121         | **A** + **C**  | Phrase required; law in `07`                                             |
| `### Table standard`                      | 123–125         | **A** + **C**  | Phrase required; law in `08`                                             |
| `### Silent refresh standard`             | 127–129         | **A** + **C**  | Phrase required; law in `11`                                             |
| `### Finance permission standard`         | 131–133         | **A** + **C**  | Phrase required; law in `13`                                             |
| `### GLOBAL AIXIA FONT / TYPOGRAPHY RULE` | 135–140         | **A** + **C**  | 4 phrases/substrings required; law in `02`/`04`                          |


**Summary counts:**


| Class | Meaning                               | Sections                                                                     |
| ----- | ------------------------------------- | ---------------------------------------------------------------------------- |
| **A** | Required for current guardrail sync   | Appendix (all 13 phrase headings + body text containing phrases)             |
| **B** | Implementation reference still useful | Banner, index, paths, superseded warnings, discipline                        |
| **C** | Duplicated by aixia-global            | Law table, appendix prose (not phrase strings)                               |
| **D** | Historical only                       | qa-agent footnote, superseded orb/hero list                                  |
| **E** | Risky active-law wording              | "Source of truth" in appendix (banner overrides)                             |
| **F** | Safe future removal candidate         | Canonical law table (after routing); duplicated appendix prose after Stage 3 |


---

## 6. Required phrase dependency table


| #   | Exact phrase                                                             | Location in AIXIA_STANDARD.md     | Owner anchor file                  | Still needed in AIXIA_STANDARD today | Future removal condition                      | Risk if removed now       | Recommended removal stage |
| --- | ------------------------------------------------------------------------ | --------------------------------- | ---------------------------------- | ------------------------------------ | --------------------------------------------- | ------------------------- | ------------------------- |
| 1   | Source of truth                                                          | `### Source of truth` heading     | `00-README-SOURCE-OF-TRUTH.md`     | **Yes** (secondary check)            | Stage 3: legacy check → banner/existence only | 1 secondary warning/build | Stage 4                   |
| 2   | Zero local design rule                                                   | `### Zero local design rule`      | `13-module-wrapper-rules.md`       | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 3   | Locked shared components                                                 | `### Locked shared components`    | `00-README-SOURCE-OF-TRUTH.md`     | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 4   | Registry toolbar standard                                                | `### Registry toolbar standard`   | `08-table-list-standard.md`        | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 5   | Archive manager standard                                                 | `### Archive manager standard`    | `10-modal-drawer-standard.md`      | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 6   | Button standard                                                          | `### Button standard`             | `07-button-action-standard.md`     | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 7   | Table standard                                                           | `### Table standard`              | `08-table-list-standard.md`        | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 8   | Silent refresh standard                                                  | `### Silent refresh standard`     | `11-scroll-responsive-standard.md` | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 9   | Finance permission standard                                              | `### Finance permission standard` | `13-module-wrapper-rules.md`       | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 10  | GLOBAL AIXIA FONT / TYPOGRAPHY RULE                                      | `### GLOBAL AIXIA FONT…` heading  | `02-typography-standard.md`        | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 11  | All AiXia pages must use the same shared font and shared text-size scale | Typography bullet                 | `02-typography-standard.md`        | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 12  | No page may create its own font family                                   | Typography bullet                 | `02-typography-standard.md`        | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |
| 13  | Large hero titles may stay large                                         | Typography bullet                 | `04-hero-header-standard.md`       | **Yes**                              | Same                                          | 1 warning                 | Stage 4                   |


**Owner-file need:** All 13 phrases are **not** required in `AIXIA_STANDARD.md` for design law — they are required **only** because `inspectSharedStandardDocument()` still checks this file. Primary coverage already reads owner files.

---

## 7. Thinning readiness classification

### **READY FOR PARTIAL THINNING PLAN ONLY**

**Why not thinner classifications:**


| Classification                     | Why not yet                                                     |
| ---------------------------------- | --------------------------------------------------------------- |
| NOT READY TO THIN                  | Too pessimistic — owner primary path works; 13/13 anchors exist |
| READY FOR LIMITED SECTION REMOVAL  | Appendix removal would trigger 13 secondary warnings today      |
| READY TO CONVERT TO THIN REFERENCE | Blocked by secondary 13-phrase guardrail check                  |
| READY TO ARCHIVE                   | Blocked by build existence check + Hermes path + memory mirrors |


**Why partial plan is appropriate:**

- Primary phrase coverage is on `aixia-global/` (Batch 35–36 complete).
- Secondary legacy check still **requires full appendix** with exact strings.
- Useful implementation sections (index, paths) can remain in a future thin file.
- Duplicated sections (canonical law table, appendix prose) are identified for Stage 4 removal **after** Stage 3 guardrail change.
- No code/CSS/page dependencies on file content.

---

## 8. Staged thinning plan

**Do not execute in Batch 37.**

### Stage 1 — Current state (done through Batch 36)

- Owner check primary; `AIXIA_STANDARD` secondary.
- 13/13 owner anchors; build PASS; 0 phrase warnings.

### Stage 2 — Non-phrase dependency migration (Batch 38+ proposal)


| Action                                              | Target                                                  |
| --------------------------------------------------- | ------------------------------------------------------- |
| Update Hermes manifest                              | Replace path with `aixia-global/00`                     |
| Update qa-agent memory mirrors                      | Point to `aixia-global/` not PAGE_SHELL_HERO            |
| Update `15-guardrail-rules.md` audit row            | Note secondary sync + primary owner read (wording only) |
| Optional: add `qa:owner-phrase-coverage` npm script | Convenience only — not build gate                       |


### Stage 3 — Guardrail: legacy check → banner + existence (requires approved batch)


| Change  | Detail                                                                    |
| ------- | ------------------------------------------------------------------------- |
| Replace | `inspectSharedStandardDocument()` 13-phrase loop                          |
| With    | Warn if file missing, or banner marker `AIXIA-DEPRECATION-BANNER` missing |
| Keep    | `REQUIRED_AIXIA_COMPONENT_FILES` existence (or merge into above)          |
| Tier    | Warn-only — no hard errors                                                |
| Gate    | Baseline build warning count; Piter approval                              |


### Stage 4 — Thin `AIXIA_STANDARD.md` content (after Stage 3 stable)

**Remove (class C/F):**

- Canonical design law table (duplicate of `00`–`16`)
- Full appendix phrase sections (no longer checked)

**Keep (class B):**

- Banner + deprecation blockquote
- Short implementation note + links to `00`
- Component quick index (optional — or merge into `00` §6)
- Superseded rules warning (historical anti-patterns)
- Shared implementation source paths

### Stage 5 — Extended validation

Run after Stage 3 or 4:

1. `node scripts/guardrails/aixia-owner-phrase-coverage-report.mjs` → 13/13
2. `npm run qa:validate-foundation`
3. `npm run qa:static-design-guardrails` → compare finding count
4. `npm run qa:guardrail-action-plan`
5. `npm run build` → 0 hard errors; document warning delta
6. Optional: Hermes export manifest spot-check

### Stage 6 — Archive (Piter approval only)

- Move to `qa-agent/design-system/archive/` or stub pointer file
- Remove from `REQUIRED_AIXIA_COMPONENT_FILES`
- Update `16` §4.4 classification
- Final grep sweep

---

## 9. Cleanup map status review (`16-design-file-cleanup-map.md`)


| Batch milestone                           | Reflected in `16`?                 | Location                   |
| ----------------------------------------- | ---------------------------------- | -------------------------- |
| Batch 32 banner                           | **Yes** (implicit in §4.4 history) | §4.4 row text              |
| Batch 34 owner phrase anchors             | **Partial**                        | §7 step 9 mentions anchors |
| Batch 35 parallel read                    | **Partial**                        | §7 step 10                 |
| Batch 36 owner primary / legacy secondary | **Yes**                            | §4.4, §4.8, §7 step 11     |
| Batch 37 thinning audit                   | **No**                             | Report-only this batch     |


**Recommendation:** Update `16` in a future batch (e.g. Batch 38 proposal) with Batch 37 audit pointer and Stage 2–3 gates — **not edited in Batch 37** per scope.

§2 collision rows still listing `AIXIA_STANDARD.md` under Typography/Hero are **historical source inventory** — accurate as "former competing source," not as current law.

---

## 10. Risks


| Risk                                        | Impact                          | Mitigation                                        |
| ------------------------------------------- | ------------------------------- | ------------------------------------------------- |
| Removing appendix before Stage 3            | 13 secondary warnings per build | Execute Stage 3 first                             |
| Agents open file beside components          | Treat as law despite banner     | Memory mirror updates; thin file                  |
| Stale memory cites PAGE_SHELL_HERO          | Wrong routing                   | Stage 2 memory batch                              |
| Hermes manifest omits `aixia-global/`       | Weaker agent context            | Add `00` to manifest when removing AIXIA_STANDARD |
| Duplicate "Source of truth" in appendix     | Confusion (class E)             | Remove in Stage 4 after phrase check dropped      |
| finance-local-glass report cites old policy | Stale audit                     | Historical only                                   |
| Thinning without Piter approval             | Premature archive               | Gate in `16` §5                                   |


---

## 11. What must not change yet


| Area                        | Status     |
| --------------------------- | ---------- |
| `AIXIA_STANDARD.md` content | **Frozen** |
| Guardrail scripts           | **Frozen** |
| 13 phrases in legacy check  | **Frozen** |
| Warning/hard-error tiers    | **Frozen** |
| Page migrations             | **Paused** |
| Batch 9 finance proofs      | **Paused** |
| Command-surface context     | **Paused** |
| Archive / delete / move     | **Paused** |


---

## 12. Recommended next batch

### **Primary — Batch 38: AIXIA_STANDARD thinning execution proposal (no edits yet)**

Deliverable: Approved step-by-step PR plan for Stage 3 guardrail change (banner/existence secondary check) with baseline counts, rollback notes, and Piter approval checklist. **No execution** until approved.

### **Alternate — Batch 38: qa-agent old authority banner/archive plan**

Banner remaining qa-agent P0 shell/hero reports; update memory mirrors — reduces agent confusion parallel to thinning.

### **Alternate — Batch 38: Stage 3 execution** (only if Piter pre-approves)

Convert `inspectSharedStandardDocument()` from 13 phrases to banner + existence check; validate build; **then** Stage 4 thin file in Batch 39.

**Do not recommend yet:** page migration, AgentOps History, finance shell proofs, command-surface context, CSS split, archive execution, guardrail hard-error escalation.

---

## 13. Confirmation: page migrations remain paused


| Item                    | Status     |
| ----------------------- | ---------- |
| Page migrations         | **Paused** |
| Batch 9 finance proofs  | **Paused** |
| Command-surface context | **Paused** |


---

## Validation

```bash
npm run qa:validate-foundation
→ Result: PASS (2026-05-30)
```

Build not run — no code changed.

---

## Final check


| #   | Item                               | Result                                                                             |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Files created                      | This report                                                                        |
| 2   | Files modified                     | **None**                                                                           |
| 3   | Code changed                       | **No**                                                                             |
| 4   | CSS changed                        | **No**                                                                             |
| 5   | Pages changed                      | **No**                                                                             |
| 6   | Components changed                 | **No**                                                                             |
| 7   | Guardrail scripts changed          | **No**                                                                             |
| 8   | Package scripts changed            | **No**                                                                             |
| 9   | AIXIA_STANDARD.md changed          | **No**                                                                             |
| 10  | Old files moved/deleted/archived   | **No**                                                                             |
| 11  | AIXIA_STANDARD references audited  | **Yes** (38 files)                                                                 |
| 12  | AIXIA_STANDARD sections classified | **Yes**                                                                            |
| 13  | 13 required phrases mapped         | **Yes**                                                                            |
| 14  | Thinning readiness classified      | **Yes** — **READY FOR PARTIAL THINNING PLAN ONLY**                                 |
| 15  | Staged thinning plan created       | **Yes** (Stages 1–6)                                                               |
| 16  | Page migrations remain paused      | **Yes**                                                                            |
| 17  | Batch 9 finance proofs paused      | **Yes**                                                                            |
| 18  | Command-surface context paused     | **Yes**                                                                            |
| 19  | Command results                    | `qa:validate-foundation` → **PASS**                                                |
| 20  | Final status                       | **Batch 37 complete**                                                              |
| 21  | Recommended next batch             | **Batch 38 — thinning execution proposal (Stage 3 plan, no edits until approved)** |


