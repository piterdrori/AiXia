# qa-agent Design Cleanup Batch Archive — NOT CURRENT LAW

## Status

This folder contains **historical batch execution evidence only**. It is **not** active design authority.

**Archived:** 2026-05-30 (Batch 58 — 23 files; Batch 61 — 7 files; Batch 63 — 2 files; Batch 65 — 1 misfiled draft; no deletion).

---

## Rules

1. **Active design law** lives only in `src/design-system/aixia-global/` (owner files `00`–`16`).
2. Files in this archive are **historical evidence** of how owner files were created and how cleanup progressed.
3. **Do not read archived files as current law.** If an archived file conflicts with `aixia-global/`, **`aixia-global/` wins.**
4. **Do not add new rules** in this archive or treat archive content as a source-of-truth input.
5. **Restore or deletion** requires dependency checks, validation, rollback plan, and **Piter approval**.
6. **Page migrations remain paused.** Archive movement does not authorize page migration, CSS split, guardrail hard-error escalation, command-surface work, or deletion.

---

## Contents

| Subfolder | Batch range | Files | Notes |
|-----------|-------------|-------|-------|
| `batch-12-to-25/` | Owner-file creation batches 12–25 | 14 | Typography through guardrail rules owner files (Batch 58) |
| `batch-32-to-40/` | AIXIA_STANDARD sync/thinning batches 32–40 | 9 | Banner, guardrail sync, thinning chain (Batch 58) |
| `batch-11-and-26-31/` | Early tokens + README/guardrail/banner/readiness batches | 7 | Batch 11 + Batch 26–31 (Batch 61) |
| `batch-41-and-42/` | AIXIA_STANDARD thinning + Hermes/memory integration | 2 | Batch 41 + Batch 42 (Batch 63) |
| `batch-10-misfiled-draft/` | Misfiled early cleanup-map draft (not a Batch 10 report) | 1 | Renamed from `AIXIA_GLOBAL_FOLDER_BATCH_10_CREATION_REPORT.md` (Batch 65) |

**Stage 2 Wave B archive (separate folder):** [`../wave-b-historical-reports/`](../wave-b-historical-reports/) — 22 P0/phase/foundation historical reports (Batch 72). See that folder's README.

**Stage 3 authority inputs archive (separate folder):** [`../authority-merged-inputs/`](../authority-merged-inputs/) — 24 merged historical authority inputs (Batch 76). See that folder's README.

**Batch 65 note:** `AIXIA_EARLY_CLEANUP_MAP_DRAFT_MISFILED_AS_BATCH_10.md` was misfiled as Batch 10 but is actually a **3× duplicate early cleanup-map draft**. Active cleanup map is `src/design-system/aixia-global/16-design-file-cleanup-map.md` only. Historical evidence — not active law.

---

## Not archived (remain at `qa-agent/design-system/` root)

- Current governance: BATCH_45–76
- Active memory mirrors and website structure inventories

---

## Related governance

Current cleanup program evidence: `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_45` … `BATCH_65` (at `design-system/` root).

Dependency matrix: `AIXIA_GLOBAL_FOLDER_BATCH_56_QA_AGENT_ARCHIVE_DEPENDENCY_MATRIX.md`  
Stage 1 proposal: `AIXIA_GLOBAL_FOLDER_BATCH_57_STAGE_1_ARCHIVE_EXECUTION_PROPOSAL.md`  
Batch 58 execution: `AIXIA_GLOBAL_FOLDER_BATCH_58_STAGE_1_ARCHIVE_EXECUTION_REPORT.md`  
Batch 61 execution: `AIXIA_GLOBAL_FOLDER_BATCH_61_STAGE_1_BLOCKED_ARCHIVE_EXECUTION_REPORT.md`  
Batch 63 execution: `AIXIA_GLOBAL_FOLDER_BATCH_63_BATCH_41_42_ARCHIVE_EXECUTION_REPORT.md`  
Batch 65 execution: `AIXIA_GLOBAL_FOLDER_BATCH_65_BATCH_10_MISFILED_ARCHIVE_EXECUTION_REPORT.md`
