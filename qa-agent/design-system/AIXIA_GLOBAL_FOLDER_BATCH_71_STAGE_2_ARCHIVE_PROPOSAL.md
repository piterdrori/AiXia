# AiXia Global Design System — Batch 71 — Stage 2 Archive Proposal

**Date:** 2026-05-30  
**Type:** Final re-grep + archive **proposal only** — **no move, delete, or doc edits**  
**Status:** COMPLETE — **awaiting Piter approval for Batch 72 execution**  
**Predecessor:** Batch 70 Stage 2 memory path trim

---

## 1. Purpose

Run a **final Stage 2 dependency re-grep** for **22** Wave B historical reports and produce an **archive execution proposal** for Piter approval. Batch 69 (owner trim) and Batch 70 (memory trim) cleared all S2/S3 blockers. This batch confirms **S0/S1 only**, proposes archive folder structure, exact move plan, validation, rollback, and approval gates. **No files moved in Batch 71.**

---

## 2. Wave B file list (reconfirmed)

**Canonical set:** **22 files** at `qa-agent/design-system/` root (Batch 52 Wave B scope).

**Excluded from proposal (not Wave B):** `AIXIA_PHASE_2A_GLOBAL_PAGE_SHELL_STANDARD_DECISION.md` — Tier 2 / Batch 48; remains at root as Stage 3 adjacent input.

| # | Exact path | Exists | Banner | Group | Severity (post Batch 70) | Ready for proposal |
|---|------------|--------|--------|-------|--------------------------|--------------------|
| 1 | `qa-agent/design-system/AIXIA_P0_BATCH_1_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md` | **Yes** | Template A (Batch 52) | P0 batch | **S1** | **Yes** |
| 2 | `qa-agent/design-system/AIXIA_P0_BATCH_2_SHARED_AUTHORITY_CLEANUP_REPORT.md` | **Yes** | Template A | P0 batch | **S1** | **Yes** |
| 3 | `qa-agent/design-system/AIXIA_P0_BATCH_3_GUARDRAIL_BOUNDARY_REPORT.md` | **Yes** | Template A | P0 batch | **S1** | **Yes** |
| 4 | `qa-agent/design-system/AIXIA_P0_BATCH_4_META_SCROLL_BOUNDARY_REPORT.md` | **Yes** | Template A | P0 batch | **S1** | **Yes** |
| 5 | `qa-agent/design-system/AIXIA_P0_BATCH_5_ASYNC_BOUNDARY_GUARDRAIL_REPORT.md` | **Yes** | Template A | P0 batch | **S1** | **Yes** |
| 6 | `qa-agent/design-system/AIXIA_P0_BATCH_6_ASYNC_ALLOWLIST_FINANCE_PROOF_REPORT.md` | **Yes** | Template A | P0 batch | **S1** | **Yes** |
| 7 | `qa-agent/design-system/AIXIA_P0_BATCH_7_FINANCE_SHELL_PROOF_REPORT.md` | **Yes** | Template A | P0 batch | **S1** | **Yes** |
| 8 | `qa-agent/design-system/AIXIA_P0_BATCH_8_FINANCE_SHELL_PROOF_REPORT.md` | **Yes** | Template A | P0 batch | **S1** | **Yes** |
| 9 | `qa-agent/design-system/AIXIA_PHASE_1A_WORKSPACE_RUNTIME_COMPONENTS_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 10 | `qa-agent/design-system/AIXIA_PHASE_1B_CHAT_PRIMITIVES_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 11 | `qa-agent/design-system/AIXIA_PHASE_1C_MEMORY_APPROVAL_PROMPT_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 12 | `qa-agent/design-system/AIXIA_PHASE_1D_PROGRESSIVE_DISCLOSURE_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 13 | `qa-agent/design-system/AIXIA_PHASE_1E_AUDIT_TIMELINE_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 14 | `qa-agent/design-system/AIXIA_PHASE_1F_COMPONENT_READINESS_AUDIT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 15 | `qa-agent/design-system/AIXIA_PHASE_1F_COMPONENT_READINESS_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 16 | `qa-agent/design-system/AIXIA_PHASE_2A_COUNCIL_BROWSER_VISUAL_REWORK_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 17 | `qa-agent/design-system/AIXIA_PHASE_2A_COUNCIL_CHAT_PROOF_MIGRATION_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 18 | `qa-agent/design-system/AIXIA_PHASE_2A_COUNCIL_VISUAL_CORRECTION_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 19 | `qa-agent/design-system/AIXIA_PHASE_2A_GLOBAL_PAGE_STANDARD_CORRECTION_REPORT.md` | **Yes** | Template A | Phase | **S1** | **Yes** |
| 20 | `qa-agent/design-system/AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md` | **Yes** | Template A | Foundation | **S1** | **Yes** |
| 21 | `qa-agent/design-system/AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md` | **Yes** | Template A | Next-step | **S1** | **Yes** |
| 22 | `qa-agent/design-system/AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md` | **Yes** | Template A | Direction | **S1** | **Yes** |

**Missing files:** **None**

---

## 3. Final dependency grep results

### 3.1 Search method

| Item | Detail |
|------|--------|
| **Repo scan scope** | **1,044** text files: `src/**`, `scripts/**`, `qa-agent/**`, `.cursor/**`, `.hermes.md`, `package.json`, `README.md` |
| **Per-candidate needles** | Full path, basename, basename without `.md` |
| **Excluded from blocker counts** | Self-reference; paths under `archive/design-cleanup-batches/` (Stage 1 historical) |
| **Severity** | Highest non-excluded ref per file |

### 3.2 Blocker summary by location

| Location | Wave B hard path matches | Blocker severity |
|----------|--------------------------|------------------|
| `src/design-system/aixia-global/` (`14`/`15`/`16`) | **0** | — |
| Memory mirrors (3 design files) | **0** | — |
| `qa-agent/hermes/` | **0** | — |
| `scripts/` · `.cursor/` · `package.json` · `.hermes.md` | **0** | — |
| `src/` app/runtime | **0** | — |

### 3.3 Severity distribution (all 22 files)

| Severity | Count | Archive impact |
|----------|-------|----------------|
| **S0** | 0 | — |
| **S1** | **22** | Safe to propose archive |
| **S2** | **0** | — |
| **S3** | **0** | — |
| **S4** | **0** | — |
| **S5** | **0** | — |
| **S6** | **0** | — |

### 3.4 Per-file reference summary

| Group | Ref count range | Typical S1 sources |
|-------|-----------------|-------------------|
| P0 batch (8) | 4–5 | Batch 52/67/68/70 governance; P0 Batch 1 also `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` (Stage 3 adjacent — historical) |
| Phase (11) | 3–5 | Batch 52/67/68/70 governance; 1F audit↔report sibling cross-ref |
| Foundation / next-step / direction (3) | 10–11 | Batch 46/49/50/52/54/56/67/68/69 governance; unified cleanup plan; website inventory (next-step only) |

**No S1 reference is an active read-first dependency** — all are governance inventories, historical planning docs, or self/peer cross-refs within the Wave B set being archived together.

---

## 4. Files included in proposal

**Proposed Stage 2 archive set:** **22/22** Wave B files (all S1 only).

| Subfolder (proposed) | Files |
|----------------------|-------|
| `p0-reports/` | 8× `AIXIA_P0_BATCH_1` … `AIXIA_P0_BATCH_8` |
| `phase-reports/` | 11× `AIXIA_PHASE_*` (Wave B phase set) |
| `foundation-next-step-direction/` | `FOUNDATION_REPORT`, `NEXT_STEP_PLAN`, `P0_DIRECTION_CLARIFICATION` |

---

## 5. Files excluded

| Item | Reason |
|------|--------|
| **None** from Wave B set | All 22 pass S0/S1 gate |
| `AIXIA_PHASE_2A_GLOBAL_PAGE_SHELL_STANDARD_DECISION.md` | Not Wave B — Tier 2 / Batch 48 |
| Stage 1 archived files (33) | Already under `archive/design-cleanup-batches/` |
| Stage 3 bannered authority inputs (~50) | Separate archive stage |
| Governance BATCH_45–71 | Current program flow — stay at root |
| Memory mirrors (4 design) | Active — never archive |
| Website inventories (2) | Active inventory |
| `archive/design-cleanup-batches/README-ARCHIVE-NOT-LAW.md` | Existing Stage 1 README — not moved |

---

## 6. Proposed archive structure

**Proposed root (not created in Batch 71):**

```text
qa-agent/design-system/archive/wave-b-historical-reports/
├── README-ARCHIVE-NOT-LAW.md          ← NEW (recommended)
├── p0-reports/                        ← 8 files
├── phase-reports/                     ← 11 files
└── foundation-next-step-direction/    ← 3 files
```

### README recommendation

| Option | Verdict |
|--------|---------|
| Reuse `archive/design-cleanup-batches/README-ARCHIVE-NOT-LAW.md` only | **Not recommended** — that README documents Stage 1 batch execution evidence (33 files in 5 subfolders); Wave B is a different archive class |
| **New** `archive/wave-b-historical-reports/README-ARCHIVE-NOT-LAW.md` | **Recommended** — mirrors Stage 1 pattern; Wave B-specific contents table; cross-links to Stage 1 README and governance chain |

**Batch 72 should also:** Add a short pointer row in `archive/design-cleanup-batches/README-ARCHIVE-NOT-LAW.md` §Contents (or §Not archived update) linking to `wave-b-historical-reports/`.

### Required README wording (Batch 72 draft)

1. Archived files are **historical evidence only** — not current design law.
2. **Active design law** lives only in `src/design-system/aixia-global/` owner files `00`–`16`.
3. **Do not read archived files as current law.** If conflict, **`aixia-global/` wins.**
4. **Do not add new rules** in archive.
5. **Restore or deletion** requires dependency checks, validation, rollback plan, and **Piter approval**.
6. Archive movement does **not** authorize page migration, CSS split, deletion, guardrail hard-error escalation, or command-surface work.
7. **Page migrations remain paused** after archive.

---

## 7. Proposed exact move plan (Batch 72 — execution only after Piter approval)

### 7.1 Pre-move (Batch 72 step 1)

1. `npm run qa:validate-foundation` → must **PASS**
2. Re-grep all 22 basenames — confirm **0** S2+ in owners/memory/scripts/app
3. Confirm Piter approval of this proposal (Batch 71)

### 7.2 Create structure (Batch 72 step 2)

```text
mkdir qa-agent/design-system/archive/wave-b-historical-reports
mkdir qa-agent/design-system/archive/wave-b-historical-reports/p0-reports
mkdir qa-agent/design-system/archive/wave-b-historical-reports/phase-reports
mkdir qa-agent/design-system/archive/wave-b-historical-reports/foundation-next-step-direction
```

Create `README-ARCHIVE-NOT-LAW.md` in `wave-b-historical-reports/` (wording per §6).

### 7.3 Move files (Batch 72 step 3)

**Method:** `fs.renameSync` (same as Stage 1 — `qa-agent/` is not git-tracked).

| # | From (root) | To (archive) |
|---|-------------|--------------|
| 1–8 | `AIXIA_P0_BATCH_1` … `AIXIA_P0_BATCH_8` | `archive/wave-b-historical-reports/p0-reports/` |
| 9–19 | 11× `AIXIA_PHASE_*` (Wave B list) | `archive/wave-b-historical-reports/phase-reports/` |
| 20–22 | Foundation, next-step, direction | `archive/wave-b-historical-reports/foundation-next-step-direction/` |

**Do not move:** Stage 3 files · governance BATCH_45+ · memory · inventories · shell decision.

### 7.4 Post-move doc updates (Batch 72 step 4)

| File | Update |
|------|--------|
| `16-design-file-cleanup-map.md` §4.1 Wave B row | Change status to **ARCHIVED (Batch 72)** with archive paths; §7 add step for Stage 2 archive complete |
| `archive/design-cleanup-batches/README-ARCHIVE-NOT-LAW.md` | Add Wave B pointer; update §Not archived |
| **Do not** rewrite old governance reports (Batch 46–70) — historical path refs remain valid as audit trail |

### 7.5 Post-move validation (Batch 72 step 5)

1. `npm run qa:validate-foundation` → **PASS**
2. Confirm 22/22 files at archive paths; 0 at root
3. Optional grep: no owner/memory hard paths to old root paths
4. **No build** — docs-only + file moves; no script/package/runtime changes

---

## 8. Reference update policy

| Reference type | Policy |
|----------------|--------|
| Old governance reports (Batch 46–70) citing root paths | **Leave unchanged** — historical audit trail |
| `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md` | **Leave unchanged** — historical planning doc |
| Archived Stage 1 / misfiled draft paths in `archive/design-cleanup-batches/` | **Leave unchanged** |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` → P0 Batch 1 | **Leave unchanged** — Stage 3 adjacent; optional trim in future Stage 3 work |
| Owner files `14`/`15`/`16` | **Already trimmed (Batch 69)** — no further update before move |
| Memory mirrors | **Already trimmed (Batch 70)** — no further update before move |
| `16-design-file-cleanup-map.md` | **Update after move only (Batch 72)** — archive status + paths |
| Wave B report bodies | **Do not rewrite** — banners and content preserved as-is |

**Principle:** Archive README explains that historical governance reports may cite old root paths; active law is in `aixia-global/` only.

---

## 9. Validation plan (Batch 72 execution)

### Before move

| Step | Command / check | Pass criteria |
|------|-----------------|---------------|
| 1 | `npm run qa:validate-foundation` | **PASS** |
| 2 | Full grep 22 filenames in owners/memory/scripts/app | **0** S2+ blockers |
| 3 | File existence | **22/22** at root |

### After move

| Step | Command / check | Pass criteria |
|------|-----------------|---------------|
| 1 | `npm run qa:validate-foundation` | **PASS** |
| 2 | File count | **22/22** in archive subfolders; **0** Wave B at root |
| 3 | Build | **Not required** (no code/script changes) |
| 4 | Optional grep | No new owner/memory hard paths to old root |

**Expected:** validation PASS · no app/CSS/page/component changes · page migrations still paused.

---

## 10. Rollback plan (Batch 72)

| Step | Action |
|------|--------|
| 1 | `fs.renameSync` each file from archive subfolder back to `qa-agent/design-system/` root (reverse move log) |
| 2 | Revert `16-design-file-cleanup-map.md` §4.1 / §7 if edited in Batch 72 |
| 3 | Remove `archive/wave-b-historical-reports/` README and empty subfolders if no other content |
| 4 | Revert pointer edit in `archive/design-cleanup-batches/README-ARCHIVE-NOT-LAW.md` if added |
| 5 | `npm run qa:validate-foundation` → **PASS** |

**Data/schema rollback:** Not needed — file moves and doc status only.

---

## 11. Piter approval checklist

Before Batch 72 execution, confirm:

- [ ] **22-file list** confirmed (§2 table)
- [ ] **All files S0/S1 only** — no S2/S3/S4/S5/S6 blockers (§3)
- [ ] **Archive destination approved:** `archive/wave-b-historical-reports/` with 3 subfolders
- [ ] **New Wave B README wording approved** (§6)
- [ ] **Move plan approved** (§7) — `fs.renameSync`, no deletion
- [ ] **Reference policy approved** (§8) — no mass rewrite of old governance reports
- [ ] **Validation plan approved** (§9)
- [ ] **Rollback plan approved** (§10)
- [ ] **No page migration** included in Batch 72
- [ ] **No deletion** included in Batch 72
- [ ] **Piter explicitly approves Batch 72 execution**

---

## 12. What was not changed

| Area | Changed? |
|------|----------|
| Wave B files at root (22) | **No** |
| Archive folders | **No** — not created |
| Owner files `14`/`15`/`16` | **No** |
| Memory mirrors | **No** |
| Hermes / export scripts | **No** |
| App code, CSS, components, pages | **No** |
| Guardrail scripts, package scripts | **No** |
| AgentMemory server / reseed | **No** |
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |

---

## 13. Recommended next batch

### **Batch 72 — Execute Stage 2 Wave B archive move (22 files only)**

**Prerequisites:** Piter approval of this proposal (§11 checklist).

**Scope:** Create archive structure · README · move 22 files · update `16` + archive README pointers · validation · execution report.

**Do not recommend yet:**

- Stage 3 archive
- Page migration · AgentOps History migration · finance shell proofs · command-surface · CSS split · deletion · guardrail hard-error escalation

---

## 14. Confirmation — paused workstreams

| Workstream | Status |
|------------|--------|
| Page migrations | **Paused** |
| Batch 9 finance shell proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |
| Stage 2 archive execution | **Proposed — not executed** |

---

## 15. Validation

```text
npm run qa:validate-foundation
Result: PASS
```

---

## 16. Final check

| # | Check | Result |
|---|-------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_71_STAGE_2_ARCHIVE_PROPOSAL.md` |
| 2 | Files modified | **None** (proposal only) |
| 3 | Wave B file set reconfirmed | **Yes** — 22/22 exist |
| 4 | Final dependency grep completed | **Yes** — 1,044 files scanned |
| 5 | All 22 files S0/S1 only | **Yes** — 22× S1, 0× S2+ |
| 6 | Archive proposal created | **Yes** |
| 7 | Archive folder structure proposed | **Yes** — `archive/wave-b-historical-reports/` + 3 subfolders |
| 8 | Exact move plan created | **Yes** — §7 (Batch 72) |
| 9 | Validation plan created | **Yes** — §9 |
| 10 | Rollback plan created | **Yes** — §10 |
| 11 | Piter approval checklist created | **Yes** — §11 |
| 12 | Code changed | **No** |
| 13 | CSS changed | **No** |
| 14 | Pages changed | **No** |
| 15 | Components changed | **No** |
| 16 | Guardrail scripts changed | **No** |
| 17 | Package scripts changed | **No** |
| 18 | Hermes runtime config changed | **No** |
| 19 | AgentMemory server started | **No** |
| 20 | Wave B files moved/archived/deleted | **No** |
| 21 | Archive folders created | **No** |
| 22 | Page migrations remain paused | **Yes** |
| 23 | Batch 9 finance proofs paused | **Yes** |
| 24 | Command-surface context paused | **Yes** |
| 25 | Command results | `qa:validate-foundation` → **PASS** |
| 26 | Final status | **Batch 71 COMPLETE** — 22/22 S1-clean; archive proposal ready for Piter approval |
| 27 | Recommended next batch | **Batch 72 — Execute Stage 2 Wave B archive move (22 files)** |

---

**End of Batch 71 proposal.**
