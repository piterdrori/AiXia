# AiXia Global Design System — Batch 79 — Group D Archive + Owner Path Trim Report

**Date:** 2026-05-30  
**Type:** Archive move (Group D) + owner path trim — no deletion  
**Status:** COMPLETE  
**Predecessor:** Batch 78 dependency classification

---

## 1. Purpose

Archive the 5 Batch 78 Group D old `src/design-system/*.md` files (merged reference inputs) and trim hard owner paths in the same batch. **No deletion.** Group A/B/C and Group E files remain at `src/design-system/` root.

---

## 2. Baseline validation

| When | Command | Result |
|------|---------|--------|
| Before edits/move | `npm run qa:validate-foundation` | **PASS** |

---

## 3. Group D file verification

All 5 files verified at `src/design-system/` root before move:

| # | File | Exists | Banner |
|---|------|--------|--------|
| 1 | `aixia-design-principles.md` | Yes | `reference-only-merged` |
| 2 | `aixia-navigation-rules.md` | Yes | `reference-only-merged` |
| 3 | `aixia-table-rules.md` | Yes | `reference-only-merged` |
| 4 | `aixia-archive-rules.md` | Yes | `reference-only-merged` |
| 5 | `aixia-form-rules.md` | Yes | `reference-only-merged` |

**Only these 5 files were selected for archive move.** No other old docs moved.

---

## 4. Owner path trims made

| Owner file | Change |
|------------|--------|
| `02-typography-standard.md` | Replaced hard path to `aixia-design-principles.md` with Group D archive-safe language; `aixia-component-rules.md` marked Group E pending |
| `07-button-action-standard.md` | Replaced `aixia-archive-rules.md` inventory row with historical merged input (archived Batch 79) |
| `08-table-list-standard.md` | Replaced table/archive hard paths; §4.J uses active law in-file; risk row + consolidation step updated |
| `09-form-input-standard.md` | Replaced form-rules hard path; preservation rule uses active law; risk row + consolidation step updated |
| `10-modal-drawer-standard.md` | Replaced archive-rules hard path; risk row + consolidation step updated |
| `12-navigation-workspace-standard.md` | Replaced navigation-rules hard path; parent pill rule stands as active law; risk row + consolidation step updated |
| `16-design-file-cleanup-map.md` | §2 aspect rows + §4.3 Group D rows → **ARCHIVED (Batch 79)** with archive path; §7 steps 34–36 updated |
| `README.md` | Legacy files paragraph notes Group D archived location |

**Not weakened:** typography, table, form, modal, navigation, or archive rules in owner files — only path/inventory wording changed.

---

## 5. Archive structure created

```text
src/design-system/archive/old-reference-docs/
├── README-ARCHIVE-NOT-LAW.md
└── group-d-merged-reference-inputs/
    ├── aixia-design-principles.md
    ├── aixia-navigation-rules.md
    ├── aixia-table-rules.md
    ├── aixia-archive-rules.md
    └── aixia-form-rules.md
```

**Move method:** PowerShell `Move-Item` (filesystem rename — `src/design-system/` not git-tracked as committed paths; `git mv` not applicable).

---

## 6. Files moved (5)

| From | To |
|------|-----|
| `src/design-system/aixia-design-principles.md` | `src/design-system/archive/old-reference-docs/group-d-merged-reference-inputs/` |
| `src/design-system/aixia-navigation-rules.md` | same |
| `src/design-system/aixia-table-rules.md` | same |
| `src/design-system/aixia-archive-rules.md` | same |
| `src/design-system/aixia-form-rules.md` | same |

---

## 7. Cleanup map update summary

**File:** `src/design-system/aixia-global/16-design-file-cleanup-map.md`

- §4.3: 5 Group D rows → **ARCHIVED (Batch 79)** with archive subfolder path
- §4.3: Group E rows annotated for Batch 80
- §7 step 34: Batch 79 **done**
- §7 step 35: Batch 80 Group E **next**
- §7 step 36: Delete renumbered

---

## 8. Re-grep results after move

Searched basenames across `aixia-global/`, `src/design-system/`, `qa-agent/`, `scripts/`, `.cursor/`, `package.json`.

| Reference location | Classification | Blocker? |
|--------------------|----------------|----------|
| `16-design-file-cleanup-map.md` | Archive-safe inventory (ARCHIVED status + path) | No |
| `archive/old-reference-docs/README-ARCHIVE-NOT-LAW.md` | Archive-safe listing | No |
| Owner files `02`, `07`, `08`, `09`, `10`, `12` | Archive-safe historical language | No |
| Group E root files (`aixia-page-patterns.md`, `aixia-component-rules.md`) | Basename cross-refs to archived files (pending Batch 80 trim) | No — not script/runtime |
| `qa-agent/` batch reports + archived qa-agent docs | Historical/report reference (D1) | No |
| `scripts/`, `package.json`, `.cursor/`, app code | **No matches** | No |

**Active blockers:** None  
**Script/runtime blockers:** None  

---

## 9. Post-move validation

| When | Command | Result |
|------|---------|--------|
| After move + owner trim | `npm run qa:validate-foundation` | **PASS** |

Build not run — docs-only changes.

---

## 10. Confirmation no deletion

No files deleted. Archive move only.

---

## 11. Confirmation no app/CSS/page/component/guardrail/package changes

No changes to app code, CSS, components, pages, Supabase, guardrail scripts, package scripts, or Hermes runtime config.

---

## 12. Remaining old src/design-system groups

| Group | Files at `src/design-system/` root | Status |
|-------|-----------------------------------|--------|
| **A — Wrapper** | `README.md` | Active |
| **B — Behavior** | `aixia-refresh-rules.md`, `aixia-permission-ui-rules.md` | Active |
| **C — Tracker** | `aixia-migration-watch-registry.md` | Active |
| **D — Archived** | 5 files | Moved to `archive/old-reference-docs/group-d-merged-reference-inputs/` |
| **E — Pending** | `aixia-page-patterns.md`, `aixia-component-rules.md`, `aixia-finance-workflow-registry-contract.md`, `aixia-migration-checklist.md`, `aixia-conflict-deprecation-policy.md` | Path-trim + archive in Batch 80 |

---

## 13. Recommended next batch

**Batch 80 — Fast Group E path-trim + archive**

1. Trim owner hard paths in `00`, `13`, `14`, `15`, `16` (+ remaining cross-refs in Group E old docs)
2. Move 5 Group E files to `archive/old-reference-docs/group-e-merged-reference-inputs/` (or extend existing archive tree)
3. Update `16` §4.3 and README
4. Re-grep + validate

**Do not recommend yet:** deletion, page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, guardrail hard-error escalation.

---

## 14. Page migrations remain paused

Confirmed. Batch 79 did not authorize or start any page migration work.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `src/design-system/archive/old-reference-docs/README-ARCHIVE-NOT-LAW.md`, `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_79_SRC_DESIGN_SYSTEM_GROUP_D_ARCHIVE_REPORT.md` |
| 2 | Files moved | 5 Group D `.md` files → `archive/old-reference-docs/group-d-merged-reference-inputs/` |
| 3 | Files modified | 9 — owners `02`, `07`, `08`, `09`, `10`, `12`, `16`, `README.md`, + this report |
| 4 | Group D files verified | **Yes** |
| 5 | Owner path trim executed | **Yes** |
| 6 | 5 Group D files archived | **Yes** |
| 7 | Any unapproved old docs moved | **No** |
| 8 | Files deleted | **No** |
| 9 | Group A/B/C kept active | **Yes** |
| 10 | Group E kept pending | **Yes** |
| 11 | Cleanup map updated | **Yes** |
| 12 | Re-grep completed | **Yes** |
| 13 | Code changed | **No** |
| 14 | CSS changed | **No** |
| 15 | Pages changed | **No** |
| 16 | Components changed | **No** |
| 17 | Guardrail scripts changed | **No** |
| 18 | Package scripts changed | **No** |
| 19 | Hermes runtime config changed | **No** |
| 20 | AgentMemory server started | **No** |
| 21 | Page migrations remain paused | **Yes** |
| 22 | Batch 9 finance proofs paused | **Yes** |
| 23 | Command-surface context paused | **Yes** |
| 24 | Command results | `npm run qa:validate-foundation` — PASS (before + after) |
| 25 | Final status | **COMPLETE** |
| 26 | Recommended next batch | **Batch 80** — Group E path-trim + archive |

---

## Related

- Batch 78: `AIXIA_GLOBAL_FOLDER_BATCH_78_SRC_DESIGN_SYSTEM_DEPENDENCY_CLASSIFICATION_REPORT.md`
- Cleanup map: `src/design-system/aixia-global/16-design-file-cleanup-map.md`
- Archive README: `src/design-system/archive/old-reference-docs/README-ARCHIVE-NOT-LAW.md`
