# AiXia Global Design System — Batch 56 — qa-agent Archive Dependency Matrix

**Date:** 2026-05-30  
**Type:** Dependency audit / grep matrix — **no archive, delete, move, or doc edits**  
**Status:** COMPLETE  
**Predecessor:** Batch 55 archive-readiness report

---

## 1. Purpose

Build a **file × blocker × severity** dependency matrix for **79** future qa-agent archive candidates (Batch 55 groups) before any archive move. Identify Stage 1 likely-safe candidates, blockers by severity, and required pre-archive updates. **No archive execution in this batch.**

---

## 2. Candidate files scanned

| Group | Stage | Count | Verified in repo |
|-------|-------|-------|------------------|
| Batch execution reports | Stage 1 | **33** | BATCH_10–42 (excl. 43–44 gap — none exist) |
| Wave B historical | Stage 2 | **22** | P0×8, phase×11, foundation×3 |
| Bannered authority inputs | Stage 3 | **24** | Tier 1+2+Wave A merged inputs |
| Manual review overlap | Manual | **4** | Subset of Stage 3 (also listed in Stage 3) |
| **Total unique candidates** | — | **79** | All paths exist |

**Not in candidate set (do not archive):**

- 4 active memory mirrors (`memory/AIXIA_*` design files except website structure)
- 3 website structure inventory files
- Governance reports BATCH_45–55 (current flow)
- `AIXIA_WEBSITE_STRUCTURE_MEMORY.md`

---

## 3. Search method

| Item | Detail |
|------|--------|
| **Repo scan scope** | **1,011** text files: `src/**`, `scripts/**`, `qa-agent/**`, `.cursor/**`, `.hermes.md`, `package.json`, `README.md` |
| **Per-candidate needles** | Full path `qa-agent/design-system/<file>`, basename, basename without `.md` |
| **Excluded from ref counts** | Self-reference; ephemeral Batch 56 scan script (not committed) |
| **Reference locations** | `aixia-global/` owners, `src/design-system/`, `qa-agent/design-system/`, `qa-agent/hermes/`, `qa-agent/agentops/`, `scripts/`, `.cursor/`, `.hermes.md`, `package.json` |

---

## 4. Severity legend

| Code | Meaning | Archive impact |
|------|---------|----------------|
| **S0** | No external references | Move later after Piter approval |
| **S1** | Historical report / batch meta refs only | Usually safe; optional path update |
| **S2** | Owner file (`aixia-global/`) or cleanup map reference | Update owner/cleanup map before archive |
| **S3** | Hermes export, memory mirror, `.hermes`, Cursor rule refs | Update memory/Hermes read chains before archive |
| **S4** | Guardrail / package script reference | Update scripts + validation before archive |
| **S5** | Runtime / app source reference | Full impact review + build/browser QA |
| **S6** | Uncategorized path — manual verify | Human review |

**Highest severity** = worst blocker among all refs for that file.

**Scan result:** **S4 = 0**, **S5 = 0** across all 79 candidates (guardrails no longer cite qa-agent paths; no app imports).

---

## 5. Full dependency matrix (summary by group)

### 5.1 Severity distribution

| Highest severity | Stage 1 (33) | Stage 2 (22) | Stage 3 (24) | Total |
|------------------|-------------|-------------|-------------|-------|
| **S0** | 0 | 0 | 0 | 0 |
| **S1** | **23** | 0 | 0 | 23 |
| **S2** | **8** | **3** | **5** | **16** |
| **S3** | **2** | **19** | **19** | **40** |
| **S4–S6** | 0 | 0 | 0 | 0 |

### 5.2 Stage 1 — batch execution (33 files)

| Highest | Count | Blocker source | Readiness |
|---------|-------|----------------|-----------|
| S1 | 23 | Batch/governance cross-refs only | **Ready for Stage 1 later** |
| S2 | 8 | `16-design-file-cleanup-map.md` §4.1 / §7 inventory rows | Needs cleanup map update |
| S3 | 2 | Memory mirrors cite Hermes batch reports | Needs memory path trim |

**S2 blocked (8):**

- `AIXIA_GLOBAL_FOLDER_BATCH_10_CREATION_REPORT.md`
- `AIXIA_GLOBAL_FOLDER_BATCH_11_DESIGN_TOKENS_REPORT.md`
- `AIXIA_GLOBAL_FOLDER_BATCH_26_README_DELEGATION_META_REFRESH_REPORT.md`
- `AIXIA_GLOBAL_FOLDER_BATCH_27_GUARDRAIL_REFERENCE_ALIGNMENT_PLAN.md`
- `AIXIA_GLOBAL_FOLDER_BATCH_28_GUARDRAIL_CITATION_ALIGNMENT_REPORT.md`
- `AIXIA_GLOBAL_FOLDER_BATCH_29_DEPRECATION_BANNER_PLAN.md`
- `AIXIA_GLOBAL_FOLDER_BATCH_30_OLD_DOC_BANNER_EXECUTION_REPORT.md`
- `AIXIA_GLOBAL_FOLDER_BATCH_31_CLEANUP_MAP_ARCHIVE_READINESS_AUDIT.md`

**S3 blocked (2):**

- `AIXIA_GLOBAL_FOLDER_BATCH_41_AIXIA_STANDARD_STAGE_4_EXECUTION_REPORT.md` — memory master/history refs
- `AIXIA_GLOBAL_FOLDER_BATCH_42_HERMES_MEMORY_INTEGRATION_REPORT.md` — Hermes integration cross-refs

### 5.3 Stage 2 — Wave B historical (22 files)

| Highest | Count | Primary blocker |
|---------|-------|-----------------|
| S2 | 3 | Owner `14` §4 audit table |
| S3 | 19 | Memory mirrors (P0 lesson blocks, component memory phase refs) |

**S2 only (3):**

- `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md`
- `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md`
- `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md`

**All P0 batch (8) + most phase (8) + component audit/report:** **S3** via `AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md`, `AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md`, `AIXIA_DESIGN_COMPONENT_MEMORY.md`.

### 5.4 Stage 3 — bannered authority inputs (24 files)

| Highest | Count | Primary blocker |
|---------|-------|-----------------|
| S2 | 5 | Owner `14`/`15`/`00`/`13` audit tables |
| S3 | 19 | Memory mirrors + stale-pointer tables in HERMES mirror |

**Highest ref count (top blockers):**

| File | Ref count | Highest | Key locations |
|------|-----------|---------|---------------|
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | **44** | S3 | Memory mirrors, owner `00`/`15`, governance reports |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` | 18 | S3 | Memory, AI rules, owner `14` |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` | 18 | S2 | Owner `14`, memory |
| `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | 17 | S3 | Owner `15`, memory |
| `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md` | 17 | S3 | Owner `14`, memory |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` | 17 | S2 | Owner `14`/`13`, memory |

**S2-only Stage 3 (5):** scroll unification, unified cleanup plan, parity audit, AgentOps shell plan, design authority consolidation report.

---

## 6. Stage 1 likely-safe candidates (23 files)

**Criteria met:** highest **S1** only; not memory mirror; not website inventory; not Hermes manifest input; not current governance (45–55).

| # | File |
|---|------|
| 1 | `AIXIA_GLOBAL_FOLDER_BATCH_12_TYPOGRAPHY_REPORT.md` |
| 2 | `AIXIA_GLOBAL_FOLDER_BATCH_13_PAGE_SHELL_REPORT.md` |
| 3 | `AIXIA_GLOBAL_FOLDER_BATCH_14_HERO_HEADER_REPORT.md` |
| 4 | `AIXIA_GLOBAL_FOLDER_BATCH_15_META_STATUS_REPORT.md` |
| 5 | `AIXIA_GLOBAL_FOLDER_BATCH_16_CARD_SECTION_REPORT.md` |
| 6 | `AIXIA_GLOBAL_FOLDER_BATCH_17_BUTTON_ACTION_REPORT.md` |
| 7 | `AIXIA_GLOBAL_FOLDER_BATCH_18_TABLE_LIST_REPORT.md` |
| 8 | `AIXIA_GLOBAL_FOLDER_BATCH_19_FORM_INPUT_REPORT.md` |
| 9 | `AIXIA_GLOBAL_FOLDER_BATCH_20_MODAL_DRAWER_REPORT.md` |
| 10 | `AIXIA_GLOBAL_FOLDER_BATCH_21_SCROLL_RESPONSIVE_REPORT.md` |
| 11 | `AIXIA_GLOBAL_FOLDER_BATCH_22_NAVIGATION_WORKSPACE_REPORT.md` |
| 12 | `AIXIA_GLOBAL_FOLDER_BATCH_23_MODULE_WRAPPER_REPORT.md` |
| 13 | `AIXIA_GLOBAL_FOLDER_BATCH_24_PAGE_MIGRATION_REPORT.md` |
| 14 | `AIXIA_GLOBAL_FOLDER_BATCH_25_GUARDRAIL_RULES_REPORT.md` |
| 15 | `AIXIA_GLOBAL_FOLDER_BATCH_32_AIXIA_STANDARD_BANNER_REPORT.md` |
| 16 | `AIXIA_GLOBAL_FOLDER_BATCH_33_AIXIA_STANDARD_GUARDRAIL_DEPENDENCY_PLAN.md` |
| 17 | `AIXIA_GLOBAL_FOLDER_BATCH_34_OWNER_PHRASE_ANCHORS_REPORT.md` |
| 18 | `AIXIA_GLOBAL_FOLDER_BATCH_35_PARALLEL_OWNER_PHRASE_GUARDRAIL_REPORT.md` |
| 19 | `AIXIA_GLOBAL_FOLDER_BATCH_36_AIXIA_STANDARD_SECONDARY_SYNC_REPORT.md` |
| 20 | `AIXIA_GLOBAL_FOLDER_BATCH_37_AIXIA_STANDARD_THINNING_READINESS_AUDIT.md` |
| 21 | `AIXIA_GLOBAL_FOLDER_BATCH_38_AIXIA_STANDARD_THINNING_EXECUTION_PROPOSAL.md` |
| 22 | `AIXIA_GLOBAL_FOLDER_BATCH_39_AIXIA_STANDARD_STAGE_3_EXECUTION_REPORT.md` |
| 23 | `AIXIA_GLOBAL_FOLDER_BATCH_40_AIXIA_STANDARD_STAGE_4_THINNING_PROPOSAL.md` |

**Proposed action:** Batch 57 **archive execution proposal** for these 23 only — **still no move until Piter approval.**

---

## 7. Blockers by severity

### S2 — Owner / cleanup map (16 files)

| Blocker file | Candidates affected |
|--------------|---------------------|
| `16-design-file-cleanup-map.md` | 8× Stage 1 batch reports (inventory §4.1, cleanup order §7) |
| `14-page-migration-rules.md` §4 | Stage 2 foundation/direction + many Stage 3 migration inputs |
| `15-guardrail-rules.md` §3 | Stage 3 guardrail/shell/checklist inputs |
| `00-README-SOURCE-OF-TRUTH.md` Related | Shell standard, conflict audit, unified plan |
| `13-module-wrapper-rules.md` §3 | Unified authority plan, AgentOps shell plan |

**Fix before archive:** Stub or remove audit-table rows; point to `aixia-global/` only or archived path note.

### S3 — Hermes / memory (40 file-hits; dominant blocker)

| Blocker | Detail |
|---------|--------|
| `memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md` | P0 batch status tables; foundation doc list |
| `memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | P0 lesson blocks; shell standard pointer; phase decision ref |
| `memory/AIXIA_DESIGN_COMPONENT_MEMORY.md` | Phase 1F/2A audit refs; gap list; shell decision |
| `memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` | Stale pointer table (shell standard, P0 reports) |
| `scripts/export-analytics-for-hermes.mjs` | **Only** lists `memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` — not archive candidates directly |
| `.hermes.md` | **No** `qa-agent/design-system/` path refs found |
| `.cursor/rules/` | **No** qa-agent design-system path refs found |

**Fix before Stage 2/3 archive:** Trim memory mirror path lists to owners + governance reports; keep historical lesson text without live path deps.

### S4 — Guardrails / package

**None found.** Batch 28 aligned guardrails to `aixia-global/` owners; `scripts/**` has no qa-agent design-system path strings except Hermes export memory entry.

### Current governance reports (implicit S1 block for bulk Stage 1)

BATCH_45–55 reference earlier batch reports in narrative tables — **S1 only**; does not block the 23 clean Stage 1 files.

---

## 8. Manual review files (4)

| File | Ref count | Highest | Why manual |
|------|-----------|---------|------------|
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` | 18 | S3 | Living P0/P1 tracker — may stay active |
| `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md` | 9 | S2 | Cited in `16` Related |
| `AIXIA_GLOBAL_OWNER_FILES_REVIEW_AND_COLLISION_AUDIT.md` | 9 | S3 | Pre-approval audit — archive after Piter owner sign-off |
| `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md` | 11 | S3 | Component memory cites audit path |

**Action:** Do not archive until Piter confirms tracker/audit retirement.

---

## 9. Cleanup map recommendation (`16-design-file-cleanup-map.md`)

**Report-only — `16` not edited in Batch 56.**

Recommended future additions:

| Section | Content |
|---------|---------|
| §5.2 (new) | Archive dependency severity legend (S0–S6) |
| §6 C5 | Batch 56 matrix complete; Stage 1 subset (23 files) grep-clean at S1 |
| §7 step 27 | Batch 56 dependency matrix (done) |
| §7 step 28 | Batch 57 Stage 1 archive **proposal** (pending) |
| §4.1 gate notes | “Archive-ready at S1 — Batch 56” on 23 Stage 1 files |

---

## 10. What was not changed

- No archive, delete, move, or archive folder creation
- No qa-agent doc edits (except this report)
- No owner file edits
- No memory edits
- No code, CSS, components, pages, guardrails, package scripts, Hermes runtime, AgentMemory, Supabase

---

## 11. Recommended next batch

**Batch 57 — Stage 1 archive execution proposal (23 files) — still no move**

Deliverable:

1. Formal move proposal for the 23 S1-clean Stage 1 batch reports only
2. Pre-move checklist: Piter approval, `qa:validate-foundation`, optional `16` stub for moved paths
3. Proposed destination: `qa-agent/design-system/archive/batch-execution/` (folder **not created** until execution batch)

**Parallel optional Batch 57b:** Reference blocker update plan for 10 blocked Stage 1 files (8× S2 cleanup map, 2× S3 memory) before expanding Stage 1 scope.

**Do not recommend yet:**

- Stage 2/3 archive moves (memory blocker density)
- Page migration · finance proofs · command-surface · CSS split · archive execution without proposal · deletion · guardrail escalation

---

## 12. Confirmation — page migrations remain paused

**Yes.**

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **Not run** — audit only |

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `AIXIA_GLOBAL_FOLDER_BATCH_56_QA_AGENT_ARCHIVE_DEPENDENCY_MATRIX.md` |
| 2 | Files modified | **None** |
| 3 | Dependency matrix created | **Yes** |
| 4 | Candidate files listed | **Yes** (79) |
| 5 | References searched across repo | **Yes** (1,011 files) |
| 6 | Severity classification completed | **Yes** (S0–S6) |
| 7 | Stage 1 likely-safe candidates listed | **Yes** (23) |
| 8 | Blockers listed | **Yes** (S2: 16, S3: 40 file-hits) |
| 9 | Code changed | **No** |
| 10 | CSS changed | **No** |
| 11 | Pages changed | **No** |
| 12 | Components changed | **No** |
| 13 | Guardrail scripts changed | **No** |
| 14 | Package scripts changed | **No** |
| 15 | Hermes runtime config changed | **No** |
| 16 | AgentMemory server started | **No** |
| 17 | Old files moved/deleted/archived | **No** |
| 18 | Archive folders created | **No** |
| 19 | Page migrations remain paused | **Yes** |
| 20 | Batch 9 finance proofs paused | **Yes** |
| 21 | Command-surface context paused | **Yes** |
| 22 | Command results | `qa:validate-foundation` **PASS** |
| 23 | Final status | **Batch 56 COMPLETE** |
| 24 | Recommended next batch | **Batch 57 — Stage 1 archive execution proposal (23 files, no move yet)** |

---

*End of Batch 56 matrix.*
