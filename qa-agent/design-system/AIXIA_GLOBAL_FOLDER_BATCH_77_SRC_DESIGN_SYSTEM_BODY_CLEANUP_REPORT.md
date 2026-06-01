# AiXia Global Design System — Batch 77 — Old `src/design-system/` Body Cleanup Report

**Date:** 2026-05-30  
**Type:** Safe body wording dedup/generalization — no move/archive/delete  
**Status:** COMPLETE  
**Predecessor:** Batch 76 Stage 3 authority-input archive execution

---

## 1. Purpose

Clean old `src/design-system/*.md` files (excluding `aixia-global/`) so bannered wrappers no longer read as competing design law. Generalize stale authority wording (“single source of truth,” “Locked,” “current law,” module-specific authority) while preserving historical sign-offs, migration evidence, and behavior references. **No deletion, move, archive, code, CSS, or component changes.**

---

## 2. Files inventoried (14)

All 14 files exist directly under `src/design-system/` (excluding `aixia-global/`). All confirmed bannered from Batch 30.

| File | Exists | Banner type | Current role | Target owner file(s) | Stale authority wording | Safe cleanup now | Reason |
|------|--------|-------------|--------------|----------------------|---------------------------|------------------|--------|
| `README.md` | Yes | global-delegation-wrapper | Delegation wrapper / index | `00`, `16` | No (delegates) | No | Already delegates; no conflicting body law |
| `aixia-design-principles.md` | Yes | reference-only-merged | Reference input | `00`, `01`, `02`, `06` | Yes | **Yes — cleaned** | “Global typography/card law” softened to historical reference |
| `aixia-page-patterns.md` | Yes | deprecated-competing-authority | Historical pattern + sign-offs | `03`–`06`, `12`, `14` | Yes | **Yes — cleaned** | Locked sections reframed as historical evidence |
| `aixia-component-rules.md` | Yes | deprecated-competing-authority | Implementation/history reference | `06`–`13`, `14`, `15` | Yes | **Yes — cleaned** | SOT + LOCKED MW-029 softened |
| `aixia-finance-workflow-registry-contract.md` | Yes | deprecated-competing-authority | Historical finance contract | `08`, `13`, `14`, `15` | Yes | **Yes — cleaned** | Finance SOT wording generalized |
| `aixia-migration-checklist.md` | Yes | reference-only-merged | Migration tracker / sign-off history | `14` | Yes | **Yes — cleaned** | §13 LOCKED → historical; E-4 gates reframed |
| `aixia-conflict-deprecation-policy.md` | Yes | reference-only-merged | Policy history | `00`, `14`, `15`, `16` | Yes | **Yes — cleaned** | Delegates active process to owners |
| `aixia-refresh-rules.md` | Yes | behavior-reference-only | Silent refresh behavior reference | `13`, `14` | Minimal | **Yes — light edit** | Owner mapping added; rules preserved |
| `aixia-permission-ui-rules.md` | Yes | behavior-reference-only | Permission UI behavior reference | `13` | Minimal | **Yes — light edit** | Owner mapping added; logic boundaries preserved |
| `aixia-table-rules.md` | Yes | reference-only-merged | Table behavior reference | `08` | No critical SOT in body | No | Body already reference-oriented; banner sufficient |
| `aixia-form-rules.md` | Yes | reference-only-merged | Form behavior reference | `09` | Yes (MW-029 line) | No | Unique form structure rules; MW-029 cross-ref left for Batch 78 dependency scan |
| `aixia-navigation-rules.md` | Yes | reference-only-merged | Navigation reference | `12` | No | No | Banner delegates; no competing-law sections found |
| `aixia-archive-rules.md` | Yes | reference-only-merged | Archive UI reference | `08`, `12` | No | No | Banner delegates; behavior reference intact |
| `aixia-migration-watch-registry.md` | Yes | tracker-only | Live migration watch tracker | `14`, `16` | Some “locked SOT” in MW rows | No | Active tracker; per task — do not broadly edit |

---

## 3. Files cleaned (8)

| # | File | Cleanup summary |
|---|------|-------------------|
| 1 | `aixia-page-patterns.md` | Historical intro; Hero/Header + Finance command header → sign-off evidence; Page Rhythm / Visual Hierarchy → checklists; MW-029 section historical; restored parent-pill bullet accidentally dropped mid-batch |
| 2 | `aixia-component-rules.md` | Replaced “Source of Truth” with implementation reference; MW-029 LOCKED block → historical sign-off record; softened finance registry + E-1/E-2 locked wording |
| 3 | `aixia-finance-workflow-registry-contract.md` | Body intro points to owners `08`, `13`, `14`, `15`; drift prevention → historical guidance |
| 4 | `aixia-design-principles.md` | Reference-input intro; Global typography/card “law” → historical reference with owner pointers |
| 5 | `aixia-migration-checklist.md` | Tracker/history intro; §13 LOCKED → historical record; §16/§17 MW-029 and SOT wording softened |
| 6 | `aixia-conflict-deprecation-policy.md` | Policy history intro delegating to `00`, `14`, `15`, `16` |
| 7 | `aixia-refresh-rules.md` | Added behavior-reference owner mapping; **all silent refresh rules unchanged** |
| 8 | `aixia-permission-ui-rules.md` | Added behavior-reference owner mapping; **all permission UI rules unchanged** |

---

## 4. Files intentionally left unchanged (6)

| File | Reason |
|------|--------|
| `README.md` | Already global-delegation wrapper; no new conflict found |
| `aixia-table-rules.md` | Reference-oriented body; banner sufficient |
| `aixia-form-rules.md` | Form structure detail + MW-029 cross-ref — defer to Batch 78 dependency scan |
| `aixia-navigation-rules.md` | No competing-law sections requiring edit |
| `aixia-archive-rules.md` | Archive behavior reference intact |
| `aixia-migration-watch-registry.md` | Active tracker; per task scope |

---

## 5. Exact cleanup categories applied

| Category | Action |
|----------|--------|
| **A — Competing-law headers** | Renamed “Locked — …” / “LOCKED MW-029 …” sections to “Historical record / sign-off evidence” with owner pointers |
| **B — Source-of-truth claims** | Replaced “Source of Truth,” “single source of truth,” “Global source-of-truth rule” with “implementation reference,” “historical shared-first rule,” or owner delegation |
| **C — Mandatory/current-law tone** | Softened “must follow,” “Locked global,” “current law by itself” in deprecated files; pointed to `aixia-global/` owners |
| **D — Tracker reframing** | `aixia-migration-checklist.md` intro → migration tracker + sign-off history only |
| **E — Policy delegation** | `aixia-conflict-deprecation-policy.md` → process owned by `00`, `14`, `15`, `16` |
| **F — Behavior reference preservation** | `aixia-refresh-rules.md`, `aixia-permission-ui-rules.md` — owner mapping lines only; zero rule removal |

---

## 6. Behavior rules preservation confirmation

| File | Confirmation |
|------|--------------|
| `aixia-refresh-rules.md` | Silent refresh standard, state preservation list, realtime/fallback, failure behavior — **unchanged** |
| `aixia-permission-ui-rules.md` | UI-only scope, shared permission UI rule, finance permission pattern protection, message consistency, guardrails — **unchanged** |

---

## 7. Cleanup map update summary

**File:** `src/design-system/aixia-global/16-design-file-cleanup-map.md`

- §7 step 32: Batch 77 **done** — 8 files body-cleaned; no archive/delete/move
- §7 step 33: Batch 78 **next** — old `src/design-system/` dependency scan + archive/delete readiness classification
- Renumbered delete step to §7 step 34

**No other owner law changed** in `aixia-global/` except this status note.

---

## 8. Validation

| When | Command | Result |
|------|---------|--------|
| Before edits | `npm run qa:validate-foundation` | **PASS** |
| After edits | `npm run qa:validate-foundation` | **PASS** |

Build not run — no code/scripts/package changes in this batch.

---

## 9. What was not changed

- No files moved, archived, or deleted
- No edits to `aixia-global/` owner law files except `16` status note
- No app code, CSS, components, pages, Supabase, guardrail scripts, package scripts, Hermes runtime config
- No AgentMemory server start, MCP connect, or reseed
- No page migrations, finance shell proofs, command-surface context, or CSS split
- No production/main branch work

---

## 10. Remaining cleanup stages

| Stage | Status |
|-------|--------|
| qa-agent Stage 1–3 archive | Complete (79 files) |
| Old `src/design-system/*.md` body dedup (Batch 77) | **Complete** |
| Old `src/design-system/` dependency scan + archive readiness (Batch 78) | **Next** |
| Optional form-rules MW-029 cross-ref cleanup | Deferred to Batch 78 if dependency scan clears |
| Wrapper-convert remaining body content | After Batch 78 classification |
| Page migrations (C4) | Paused |
| Archive/delete old `src/design-system/*.md` | Paused — requires Batch 78 + Piter approval |
| Deletion (C6/C7) | Paused |

---

## 11. Recommended next batch

**Batch 78 — Fast old `src/design-system/` dependency scan + archive/delete readiness classification**

- Scan imports/citations of each bannered old file (code, guardrails, memory, Hermes, docs)
- Classify files with no active dependency as archive candidates
- Do **not** delete yet
- Likely first archive candidates after scan: `aixia-design-principles.md`, `aixia-conflict-deprecation-policy.md` (if zero deps)

**Do not recommend yet:** page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, deletion, guardrail hard-error escalation.

---

## 12. Page migrations remain paused

Confirmed. Batch 77 did not authorize or start any page migration work.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_77_SRC_DESIGN_SYSTEM_BODY_CLEANUP_REPORT.md` |
| 2 | Files modified | 9 — 8 old `src/design-system/*.md` + `aixia-global/16-design-file-cleanup-map.md` (status note only) |
| 3 | Old src/design-system inventory completed | **Yes** |
| 4 | Safe body cleanup executed | **Yes** |
| 5 | Behavior references preserved | **Yes** |
| 6 | Cleanup map updated | **Yes** |
| 7 | Files moved/archived/deleted | **No** |
| 8 | Code changed | **No** |
| 9 | CSS changed | **No** |
| 10 | Pages changed | **No** |
| 11 | Components changed | **No** |
| 12 | Guardrail scripts changed | **No** |
| 13 | Package scripts changed | **No** |
| 14 | Hermes runtime config changed | **No** |
| 15 | AgentMemory server started | **No** |
| 16 | Page migrations remain paused | **Yes** |
| 17 | Batch 9 finance proofs paused | **Yes** |
| 18 | Command-surface context paused | **Yes** |
| 19 | Command results | `npm run qa:validate-foundation` — PASS (before + after) |
| 20 | Final status | **COMPLETE** |
| 21 | Recommended next batch | **Batch 78** — old `src/design-system/` dependency scan + archive/delete readiness classification |

---

## Related

- Batch 76 report: `AIXIA_GLOBAL_FOLDER_BATCH_76_STAGE_3_AUTHORITY_INPUT_ARCHIVE_EXECUTION_REPORT.md`
- Cleanup map: `src/design-system/aixia-global/16-design-file-cleanup-map.md`
- Active law root: `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md`
