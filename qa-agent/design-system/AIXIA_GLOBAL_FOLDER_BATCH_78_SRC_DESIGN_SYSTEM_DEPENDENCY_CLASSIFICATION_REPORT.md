# AiXia Global Design System — Batch 78 — Old `src/design-system/` Dependency Classification Report

**Date:** 2026-05-30  
**Type:** Dependency scan + archive/delete readiness classification — no move/archive/delete  
**Status:** COMPLETE  
**Predecessor:** Batch 77 old `src/design-system/` body cleanup

---

## 1. Purpose

Scan references to all 14 old `src/design-system/*.md` files (excluding `aixia-global/`), classify dependency levels (D0–D6), and assign archive/readiness groups. **No files moved, archived, or deleted.** Tiny safe wording fixes only where scan found clear stale authority lines.

---

## 2. Files inventoried (14)

All 14 files exist, all bannered (Batch 30).

| File | Banner | Role after Batch 77 | Target owners | Active dep | Archive-ready | Keep-active | Delete-later | Group | Reason |
|------|--------|----------------------|---------------|------------|---------------|-------------|--------------|-------|--------|
| `README.md` | Yes (global-delegation-wrapper) | Governance wrapper / index | `00`, `16` | **Yes** (D2+D3) | No | **Yes** | No | **A** | Hermes export + delegation entry; must stay |
| `aixia-refresh-rules.md` | Yes (behavior-reference-only) | Silent refresh behavior reference | `11`, `13`, `14`, `15` | **Yes** (D2+D3) | No | **Yes** | No | **B** | Owners + Hermes memory cite; behavior rules active |
| `aixia-permission-ui-rules.md` | Yes (behavior-reference-only) | Permission UI behavior reference | `13`, `14` | **Yes** (D2) | No | **Yes** | No | **B** | Owner `13` cites as behavior input |
| `aixia-migration-watch-registry.md` | Yes (tracker-only) | Living MW-### debt tracker | `14`, `16` | **Yes** (D1+D2) | No | **Yes** | No | **C** | Active tracker under owner `14`; not historical |
| `aixia-design-principles.md` | Yes (reference-only-merged) | Historical reference input | `00`, `01`, `02`, `06` | No (D1+D2 only) | **Yes** | No | No | **D** | Merged into owners; no D3/D4/D5 |
| `aixia-navigation-rules.md` | Yes (reference-only-merged) | Historical navigation reference | `12` | No (D1+D2 only) | **Yes** | No | No | **D** | Merged into `12`; no D3/D4/D5 |
| `aixia-table-rules.md` | Yes (reference-only-merged) | Historical table reference | `08` | No (D1+D2 only) | **Yes** | No | No | **D** | Merged into `08`; cross-refs are old-doc-only |
| `aixia-archive-rules.md` | Yes (reference-only-merged) | Historical archive UI reference | `07`, `08`, `10` | No (D1+D2 only) | **Yes** | No | No | **D** | Merged into `07`/`08`/`10`; no runtime dep |
| `aixia-form-rules.md` | Yes (reference-only-merged) | Historical form reference | `09` | No (D1+D2 only) | **Yes** | No | No | **D** | Merged into `09`; tiny MW-029 fix applied Batch 78 |
| `aixia-page-patterns.md` | Yes (deprecated-competing-authority) | Historical pattern + sign-offs | `03`–`06`, `12`, `14` | No (D1+D2) | Later | No | No | **E** | Owner `12`/`13`/`15` still cite path; trim before archive |
| `aixia-component-rules.md` | Yes (deprecated-competing-authority) | Implementation/history reference | `06`–`13`, `14`, `15` | No (D1+D2) | Later | No | No | **E** | Owners `02`/`07`/`09`/`10` cite path; trim before archive |
| `aixia-finance-workflow-registry-contract.md` | Yes (deprecated-competing-authority) | Historical finance contract | `08`, `13`, `14`, `15` | No (D1+D2) | Later | No | No | **E** | Owner `08`/`13` cite path + “migrate later” note |
| `aixia-migration-checklist.md` | Yes (reference-only-merged) | Sign-off / migration history | `14` | No (D1+D2) | Later | No | No | **E** | Owner `14` cites as canonical input; trim before archive |
| `aixia-conflict-deprecation-policy.md` | Yes (reference-only-merged) | Policy history | `00`, `14`, `15`, `16` | No (D1+D2) | Later | Optional wrapper | No | **E** | `00`/`14`/`15`/`16` + README Related cite; trim before archive |

**Delete-later candidates (Group F):** None — every file has at least D1/D2 references or an active keep role.

**Manual review (Group G):** None required.

---

## 3. Dependency scan method

For each of the 14 files, searched repo for:

- Full path: `src/design-system/<filename>`
- Basename: `<filename>`
- Basename without extension

**Search locations:**

| Location | Result summary |
|----------|----------------|
| `src/design-system/aixia-global/` | D2 owner inventory + merge-input tables (primary external dep) |
| `src/design-system/` (old docs) | D1 cross-references among old files |
| `qa-agent/design-system/` | D1 archived reports + Batch 77 report only (not active law) |
| `qa-agent/hermes/` | D3: `README.md`, `aixia-refresh-rules.md` only |
| `qa-agent/design-system/memory/` | D3: `README.md`, `aixia-refresh-rules.md` |
| `scripts/` | D3: `export-analytics-for-hermes.mjs` → `README.md` only |
| `scripts/guardrails/` | **No matches** (D4 clear) |
| `package.json` | **No old-doc paths** (D4 clear) |
| `.cursor/` | **No matches** |
| `.hermes*` | **No matches** |
| `src/` (app/components/lib) | **No matches** (D5 clear) |
| `qa-agent/agentops/` | **No matches** |

**Guardrail scripts:** No old `src/design-system/*.md` paths read or enforced at build time. Owner `15` mentions `aixia-page-patterns.md` as a **future rejection example** only (D2 prose, not D4 script load).

---

## 4. Dependency classification table

| File | D0 | D1 | D2 | D3 | D4 | D5 | D6 | Highest | Group |
|------|----|----|----|----|----|----|-----|---------|-------|
| `README.md` | | | ✓ | ✓ | | | | D3 | A |
| `aixia-refresh-rules.md` | | | ✓ | ✓ | | | | D3 | B |
| `aixia-permission-ui-rules.md` | | | ✓ | | | | | D2 | B |
| `aixia-migration-watch-registry.md` | | ✓ | ✓ | | | | | D2 | C |
| `aixia-design-principles.md` | | ✓ | ✓ | | | | | D2 | D |
| `aixia-navigation-rules.md` | | ✓ | ✓ | | | | | D2 | D |
| `aixia-table-rules.md` | | ✓ | ✓ | | | | | D2 | D |
| `aixia-archive-rules.md` | | ✓ | ✓ | | | | | D2 | D |
| `aixia-form-rules.md` | | ✓ | ✓ | | | | | D2 | D |
| `aixia-page-patterns.md` | | ✓ | ✓ | | | | | D2 | E |
| `aixia-component-rules.md` | | ✓ | ✓ | | | | | D2 | E |
| `aixia-finance-workflow-registry-contract.md` | | ✓ | ✓ | | | | | D2 | E |
| `aixia-migration-checklist.md` | | ✓ | ✓ | | | | | D2 | E |
| `aixia-conflict-deprecation-policy.md` | | ✓ | ✓ | | | | | D2 | E |

**Key findings:**

- **D4 (guardrail/script):** Zero runtime script dependencies on old doc paths.
- **D5 (app/runtime):** Zero imports or code references.
- **D3 (Hermes/export):** Only `README.md` and `aixia-refresh-rules.md` — both **keep-active**.
- **D2 (owners/cleanup map):** All 14 files listed in `16` §4.3; 10 owner files cite specific old paths as merge-input inventory.

---

## 5. Keep-active files (Group A/B/C)

| Group | Files | Why keep |
|-------|-------|----------|
| **A — Wrapper** | `README.md` | Governance delegation entry; in Hermes `design_authority` export |
| **B — Behavior reference** | `aixia-refresh-rules.md`, `aixia-permission-ui-rules.md` | Silent refresh + permission UI rules; cited by owners `11`/`13`/`14`; refresh also in Hermes memory |
| **C — Tracker** | `aixia-migration-watch-registry.md` | Living MW-### registry; updated during migration work; not historical |

---

## 6. Archive-ready files (Group D — Batch 79 candidates)

Bannered, merged into owners, **D0/D1/D2 only**, no Hermes/guardrail/runtime dependency:

| # | File | Owner merge complete | External deps beyond old-doc cross-refs |
|---|------|---------------------|----------------------------------------|
| 1 | `aixia-design-principles.md` | `00`/`01`/`02`/`06` | `02`, `16` inventory rows only |
| 2 | `aixia-navigation-rules.md` | `12` | `12`, `16` inventory rows only |
| 3 | `aixia-table-rules.md` | `08` | `08`, `16` inventory rows only |
| 4 | `aixia-archive-rules.md` | `07`/`08`/`10` | Owner inventory rows only |
| 5 | `aixia-form-rules.md` | `09` | `09`, `16` inventory rows only |

**Batch 79 action:** Move these 5 to `qa-agent/design-system/archive/old-src-design-system/` (or similar) and trim hard paths in owner inventory tables + `16` §4.3 in the same batch.

---

## 7. Path-trim-needed files (Group E — archive after trim)

| File | Owner paths to trim | Notes |
|------|---------------------|-------|
| `aixia-page-patterns.md` | `12`, `13`, `15`, `16` | Sign-off cross-refs among old docs resolve when batch archived together |
| `aixia-component-rules.md` | `02`, `07`, `09`, `10`, `16` | Historical MW sign-offs; merge complete in owners |
| `aixia-finance-workflow-registry-contract.md` | `08`, `13`, `16` | Owner `13` “migrate later” note can become archive pointer |
| `aixia-migration-checklist.md` | `14`, `16` | Owner `14` canonical-input table + appendix refs |
| `aixia-conflict-deprecation-policy.md` | `00`, `14`, `15`, `16`, README Related | Process merged into owners; can archive after pointer trim |

---

## 8. Delete-later candidates

**None.** All files either remain keep-active (4) or have archive value (10). Deletion remains paused until post-archive sweep + Piter approval (C6/C7).

---

## 9. Manual review files

**None.**

---

## 10. Tiny cleanup edits made

| File | Edit |
|------|------|
| `aixia-form-rules.md` | `single source of truth` → `required structure (see owner 09)`; LOCKED MW-029 → historical pointer to owners `04`–`06` |
| `README.md` | Stale root path to archived `AIXIA_PAGE_SHELL_HERO_STANDARD.md` → correct archive path under `authority-merged-inputs/tier-1-core-authority/` |

**Not edited:** behavior rules in refresh/permission files; migration-watch registry; table/navigation/archive body content.

---

## 11. Cleanup map update summary

**File:** `src/design-system/aixia-global/16-design-file-cleanup-map.md`

- §7 step 33: Batch 78 **done** — dependency scan + classification complete
- §7 step 34: Batch 79 **next** — archive move for Group D (5 files) + owner path trim as needed
- §7 step 35: Delete step renumbered

No changes to owner law content beyond status notes.

---

## 12. Validation result

| When | Command | Result |
|------|---------|--------|
| Before scan/edits | `npm run qa:validate-foundation` | **PASS** |
| After tiny edits | `npm run qa:validate-foundation` | **PASS** |

Build not run — docs-only changes.

---

## 13. What was not changed

- No files moved, archived, or deleted
- No app code, CSS, components, pages, Supabase
- No guardrail scripts, package scripts, Hermes runtime config
- No AgentMemory server, MCP connect, or reseed
- No page migrations, finance proofs, command-surface context, CSS split
- No production/main branch work
- Owner files `00`–`15` body law unchanged (inventory path refs remain for Batch 79 trim)

---

## 14. Recommended next batch

**Batch 79 — Fast old `src/design-system/` archive move (Group D only)**

Move after validation (same batch, no proposal-only step):

1. `aixia-design-principles.md`
2. `aixia-navigation-rules.md`
3. `aixia-table-rules.md`
4. `aixia-archive-rules.md`
5. `aixia-form-rules.md`

**Same batch:** Trim hard paths in owner inventory tables (`02`, `08`, `09`, `10`, `12`, `16` §4.3) to archive-safe language; add `README-ARCHIVE-NOT-LAW.md` under new archive folder.

**Then (Batch 80+):** Path-trim Group E files and archive `page-patterns`, `component-rules`, `finance-workflow-registry-contract`, `migration-checklist`, `conflict-deprecation-policy`.

**Do not recommend yet:** deletion, page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, guardrail hard-error escalation.

---

## 15. Page migrations remain paused

Confirmed. Batch 78 did not authorize or start any page migration work.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_78_SRC_DESIGN_SYSTEM_DEPENDENCY_CLASSIFICATION_REPORT.md` |
| 2 | Files modified | 4 — `aixia-form-rules.md`, `README.md`, `16-design-file-cleanup-map.md` (status note), + this report |
| 3 | Old src/design-system dependency scan completed | **Yes** |
| 4 | Classification table created | **Yes** |
| 5 | Keep-active files identified | **Yes** (4 files: README, refresh, permission, migration-watch) |
| 6 | Archive-ready files identified | **Yes** (5 files — Group D) |
| 7 | Path-trim-needed files identified | **Yes** (5 files — Group E) |
| 8 | Delete-later candidates identified | **Yes** (none — all retained or archive-bound) |
| 9 | Any tiny cleanup executed | **Yes** (`aixia-form-rules.md`, `README.md`) |
| 10 | Files moved/archived/deleted | **No** |
| 11 | Code changed | **No** |
| 12 | CSS changed | **No** |
| 13 | Pages changed | **No** |
| 14 | Components changed | **No** |
| 15 | Guardrail scripts changed | **No** |
| 16 | Package scripts changed | **No** |
| 17 | Hermes runtime config changed | **No** |
| 18 | AgentMemory server started | **No** |
| 19 | Page migrations remain paused | **Yes** |
| 20 | Batch 9 finance proofs paused | **Yes** |
| 21 | Command-surface context paused | **Yes** |
| 22 | Command results | `npm run qa:validate-foundation` — PASS (before + after) |
| 23 | Final status | **COMPLETE** |
| 24 | Recommended next batch | **Batch 79** — archive move for 5 Group D files + owner path trim |

---

## Related

- Batch 77 report: `AIXIA_GLOBAL_FOLDER_BATCH_77_SRC_DESIGN_SYSTEM_BODY_CLEANUP_REPORT.md`
- Cleanup map: `src/design-system/aixia-global/16-design-file-cleanup-map.md`
- Hermes export (D3 deps): `scripts/export-analytics-for-hermes.mjs`
