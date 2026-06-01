# AiXia Global Design System — Batch 80 — Group E Archive + Owner Path Trim Report

**Date:** 2026-05-30  
**Type:** Archive move (Group E) + owner path trim — no deletion  
**Status:** COMPLETE  
**Predecessor:** Batch 79 Group D archive

---

## 1. Purpose

Trim hard paths to the five Batch 78 Group E old `src/design-system/*.md` files and archive them in the same batch. **No deletion.** Group A/B/C remain at root; Group D remains in archive. **Old src/design-system historical doc archive track complete** (10 of 14 old docs archived; 4 active at root).

---

## 2. Baseline validation

| When | Command | Result |
|------|---------|--------|
| Before edits/move | `npm run qa:validate-foundation` | **PASS** |

---

## 3. Group E file verification

All 5 files verified at `src/design-system/` root before move:

| # | File | Exists | Banner |
|---|------|--------|--------|
| 1 | `aixia-page-patterns.md` | Yes | `deprecated-competing-authority` |
| 2 | `aixia-component-rules.md` | Yes | `deprecated-competing-authority` |
| 3 | `aixia-finance-workflow-registry-contract.md` | Yes | `deprecated-competing-authority` |
| 4 | `aixia-migration-checklist.md` | Yes | `reference-only-merged` |
| 5 | `aixia-conflict-deprecation-policy.md` | Yes | `reference-only-merged` |

**Only these 5 files were selected for archive move.**

---

## 4. Dependency check result

Searched basenames across `aixia-global/`, `src/design-system/`, `qa-agent/`, `scripts/`, `src/` app code, `package.json`.

| Reference type | Found | Classification | Blocker? |
|----------------|-------|----------------|----------|
| Owner inventory tables (`02`, `07`, `08`, `09`, `10`, `12`, `13`, `14`, `15`, `16`, `00`) | Yes | Owner/cleanup-map — **trimmed** | No |
| `16` §4.3 inventory | Yes | Cleanup map — **updated** | No |
| Group E cross-refs within old docs | Yes | Move together to archive | No |
| Group D archived docs cross-ref Group E basenames | Yes | Archive-internal — **OK after move** | No |
| `aixia-migration-watch-registry.md` (Group C) | 2 lines | Tracker — **trimmed to archive-safe paths** | No |
| `AixiaFinanceCommandCreatePage.tsx` / `AixiaFinanceCommandDetailPage.tsx` | Comment-only (`aixia-page-patterns.md`) | **Not changed** (app code out of scope) | No — comments only, not runtime |
| `scripts/`, `package.json`, guardrails | **No matches** | — | No |
| `qa-agent/hermes/` | **No matches** | — | No |

**Script/runtime blockers:** None. Proceed with trim + archive.

---

## 5. Path trims made

| File | Change summary |
|------|----------------|
| `00-README-SOURCE-OF-TRUTH.md` | Deprecation process → `14`/`16` (Group E policy archived) |
| `02-typography-standard.md` | `aixia-component-rules` → Group E archived language |
| `07-button-action-standard.md` | Component-rules inventory row → archived |
| `08-table-list-standard.md` | Finance workflow contract row → archived |
| `09-form-input-standard.md` | Component-rules row + risk row → archived |
| `10-modal-drawer-standard.md` | Component-rules row → archived |
| `12-navigation-workspace-standard.md` | Page-patterns row + risk row → archived |
| `13-module-wrapper-rules.md` | Finance contract + page-patterns rows; finance guidance + consolidation step |
| `14-page-migration-rules.md` | Checklist + conflict policy rows; §5G, §6, supporting refs appendix |
| `15-guardrail-rules.md` | Conflict policy row; §8H cleanup examples |
| `16-design-file-cleanup-map.md` | §4.3 Group E → ARCHIVED; §6 conflict text; §7 steps 35–37; Related |
| `README.md` | Legacy section + archived-groups note |
| `aixia-migration-watch-registry.md` | 2 tracker lines → archive-safe paths (Group C preserved) |

**Not weakened:** owner rules, behavior references, migration process law, silent refresh, permission UI.

---

## 6. Archive structure update

```text
src/design-system/archive/old-reference-docs/
├── README-ARCHIVE-NOT-LAW.md          (updated — Group E added)
├── group-d-merged-reference-inputs/     (Batch 79 — unchanged)
└── group-e-deprecated-historical-inputs/  (NEW — Batch 80)
    ├── aixia-page-patterns.md
    ├── aixia-component-rules.md
    ├── aixia-finance-workflow-registry-contract.md
    ├── aixia-migration-checklist.md
    └── aixia-conflict-deprecation-policy.md
```

---

## 7. Files moved (5)

| From | To |
|------|-----|
| `src/design-system/aixia-page-patterns.md` | `archive/old-reference-docs/group-e-deprecated-historical-inputs/` |
| `src/design-system/aixia-component-rules.md` | same |
| `src/design-system/aixia-finance-workflow-registry-contract.md` | same |
| `src/design-system/aixia-migration-checklist.md` | same |
| `src/design-system/aixia-conflict-deprecation-policy.md` | same |

**Move method:** PowerShell `Move-Item` (filesystem rename).

---

## 8. Cleanup map update summary

- §4.3: 5 Group E rows → **ARCHIVED (Batch 80)** with archive path
- §6: Conflict process text → archive-safe
- §7 step 35: Batch 80 **done** — historical doc archive complete
- §7 step 36: Batch 81 final re-scan **next**
- §7 step 37: Delete renumbered
- Related: Deprecation pointer → `14`/`16`

---

## 9. Re-grep results after move

| Location | Remaining refs | Classification |
|----------|----------------|----------------|
| `aixia-global/` | `16` §4.3 ARCHIVED rows + Batch 77 history line | Archive-safe inventory |
| `src/design-system/` root | Group A/B/C only (4 files + `aixia-global/`) | Active — correct |
| Archive folders | Self-references + cross-refs between archived docs | Archive-safe historical |
| `qa-agent/` batch reports | Historical (Batches 77–79) | Archive-safe |
| Component TSX comments (2 files) | Stale comment paths to `aixia-page-patterns.md` | Non-blocking; app code not changed per batch rules |
| `scripts/`, `package.json` | None | No blockers |

**Active blockers:** None  
**Script/runtime blockers:** None  

---

## 10. Post-move validation

| When | Command | Result |
|------|---------|--------|
| After move + trim | `npm run qa:validate-foundation` | **PASS** |

Build not run — docs-only changes.

---

## 11. Confirmation no deletion

No files deleted. Archive move only (10 old docs total in archive; 4 active at root).

---

## 12. Confirmation no app/CSS/page/component/guardrail/package changes

No changes to app logic, CSS, page behavior, component behavior, guardrail scripts, package scripts, or Hermes runtime config. Two component **comment** lines still cite archived `aixia-page-patterns.md` — documented only; not edited per batch scope.

---

## 13. Remaining old src/design-system files

**Active at root (Group A/B/C — 4 files):**

| Group | File | Role |
|-------|------|------|
| A | `README.md` | Governance wrapper |
| B | `aixia-refresh-rules.md` | Silent refresh behavior reference |
| B | `aixia-permission-ui-rules.md` | Permission UI behavior reference |
| C | `aixia-migration-watch-registry.md` | Living MW-### tracker |

**Archived (10 files):**

- Group D (5): `archive/old-reference-docs/group-d-merged-reference-inputs/`
- Group E (5): `archive/old-reference-docs/group-e-deprecated-historical-inputs/`

**Active law:** `src/design-system/aixia-global/` (`00`–`16`) only.

---

## 14. Recommended next batch

**Batch 81 — Old `src/design-system/` final re-scan + active-root status report**

- Confirm only Group A/B/C at root + archive tree
- Optional: note stale component comment paths for future cleanup (not required for archive completion)
- Mark old `src/design-system/` historical doc cleanup **complete**
- Validation pass only

**Do not recommend yet:** deletion, page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, guardrail hard-error escalation.

---

## 15. Page migrations remain paused

Confirmed. Batch 80 did not authorize or start any page migration work.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `group-e-deprecated-historical-inputs/` (folder), updated `README-ARCHIVE-NOT-LAW.md`, this report |
| 2 | Files moved | 5 Group E `.md` files |
| 3 | Files modified | 14 — owners `00`, `02`, `07`, `08`, `09`, `10`, `12`, `13`, `14`, `15`, `16`, `README.md`, `aixia-migration-watch-registry.md`, archive README |
| 4 | Group E files verified | **Yes** |
| 5 | Dependency check completed | **Yes** |
| 6 | Path trim executed | **Yes** |
| 7 | 5 Group E files archived | **Yes** |
| 8 | Any unapproved old docs moved | **No** |
| 9 | Files deleted | **No** |
| 10 | Group A/B/C kept active | **Yes** |
| 11 | Group D still archived | **Yes** |
| 12 | Cleanup map updated | **Yes** |
| 13 | Re-grep completed | **Yes** |
| 14 | Code changed | **No** |
| 15 | CSS changed | **No** |
| 16 | Pages changed | **No** |
| 17 | Components changed | **No** |
| 18 | Guardrail scripts changed | **No** |
| 19 | Package scripts changed | **No** |
| 20 | Hermes runtime config changed | **No** |
| 21 | AgentMemory server started | **No** |
| 22 | Page migrations remain paused | **Yes** |
| 23 | Batch 9 finance proofs paused | **Yes** |
| 24 | Command-surface context paused | **Yes** |
| 25 | Command results | `npm run qa:validate-foundation` — PASS (before + after) |
| 26 | Final status | **COMPLETE** |
| 27 | Recommended next batch | **Batch 81** — final re-scan + active-root status report |

---

## Related

- Batch 79: `AIXIA_GLOBAL_FOLDER_BATCH_79_SRC_DESIGN_SYSTEM_GROUP_D_ARCHIVE_REPORT.md`
- Archive README: `src/design-system/archive/old-reference-docs/README-ARCHIVE-NOT-LAW.md`
- Cleanup map: `src/design-system/aixia-global/16-design-file-cleanup-map.md`
