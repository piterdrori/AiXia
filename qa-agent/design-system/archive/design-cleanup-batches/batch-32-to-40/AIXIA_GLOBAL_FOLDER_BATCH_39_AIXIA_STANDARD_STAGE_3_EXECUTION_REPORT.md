# AiXia Global Design System — Batch 39 — Stage 3 AIXIA_STANDARD Secondary Check Downgrade

**Date:** 2026-05-30  
**Scope:** Narrow guardrail read-path change — `inspectSharedStandardDocument()` only  
**Predecessor:** Batch 38 Stage 3 execution proposal (Piter-approved target)

---

## 1. Purpose

Execute Stage 3: convert the secondary `AIXIA_STANDARD.md` guardrail check from **13 exact phrase** validation to **banner + legacy-reference marker** validation only, while keeping `inspectGlobalOwnerPhraseAnchors()` as the **primary** 13/13 phrase coverage path.

`AIXIA_STANDARD.md` was **not** edited. Appendix sections remain for Stage 4 thinning proposal.

---

## 2. Files modified

| File | Change |
|------|--------|
| `scripts/aixia-guardrails.mjs` | `inspectSharedStandardDocument()` — phrase loop removed; banner checks added |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §4.4, §4.8, §7 step 12 — Batch 39 Stage 3 status |

## Files created

| File |
|------|
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_39_AIXIA_STANDARD_STAGE_3_EXECUTION_REPORT.md` |

**Not modified:** `AIXIA_STANDARD.md`, `package.json`, owner phrase anchors, allowlists, pages, CSS, components.

---

## 3. Baseline results before edit

| Metric | Result |
|--------|--------|
| Owner phrase coverage | **13/13 PASS** |
| `qa:validate-foundation` | **PASS** |
| Static findings | **185** |
| `qa:guardrail-action-plan` | **PASS** |
| `npm run build` | **PASS** |
| Hard errors | **0** |
| Build warnings (approx.) | **195** |
| Owner phrase warnings | **0** |
| AIXIA_STANDARD phrase warnings | **0** (all 13 phrases present) |

---

## 4. Results after edit

| Metric | Result |
|--------|--------|
| Owner phrase coverage | **13/13 PASS** |
| `qa:validate-foundation` | **PASS** |
| Static findings | **185** (unchanged) |
| `qa:guardrail-action-plan` | **PASS** |
| `npm run build` | **PASS** |
| Hard errors | **0** |
| Build warnings (approx.) | **195** (unchanged) |
| Owner phrase warnings | **0** |
| AIXIA_STANDARD banner/reference warnings | **0** (banner present) |
| New warnings introduced | **No** |

---

## 5. Exact change to `inspectSharedStandardDocument()`

### Removed

- 13-string `requiredPhrases` array
- Per-phrase `text.includes(phrase)` loop

### Added (warn-only via `addError`)

| Check | String |
|-------|--------|
| Deprecation banner marker | `AIXIA-DEPRECATION-BANNER` |
| Banner type | `type: legacy-implementation-reference` |
| Legacy reference wording | `Legacy implementation reference` |

### Preserved

- `assertFileExists(AIXIA_STANDARD_FILE, ...)` at function start
- Scope: `"AiXia legacy standard document sync rule"`
- `addError` only (no `addHardError`)
- Call order: `inspectGlobalOwnerPhraseAnchors()` first, then `inspectSharedStandardDocument()`

---

## 6. Confirmation — owner phrase check remains primary

| Aspect | Status |
|--------|--------|
| `inspectGlobalOwnerPhraseAnchors()` | **Unchanged** |
| Runs before legacy check | **Yes** |
| 13/13 owner anchors | **Still enforced** |
| Primary scope/messages | **Unchanged** |

---

## 7. Confirmation — AIXIA_STANDARD no longer requires 13 exact phrases

Build guardrails **no longer** read or require the 13 legacy phrase strings inside `AIXIA_STANDARD.md`. Phrase coverage is **owner-file only**.

Appendix phrases may remain in the file until Stage 4 thinning — they are no longer build-gated.

---

## 8. Confirmation — secondary check remains warn-only

All new banner/reference checks use `addError` → warnings array. **No** hard-error escalation. **No** allowlist changes.

---

## 9. Confirmation — AIXIA_STANDARD.md not edited

File content unchanged in Batch 39. Banner and appendix intact.

---

## 10. Cleanup map update summary

Updated `16-design-file-cleanup-map.md`:

- **§4.4** — Batch 39 Stage 3 done; 13-phrase dependency removed; not archive-ready; Stage 4 not executed.
- **§4.8** — Runner row: secondary = banner + legacy-reference check.
- **§7 step 12** — Stage 3 secondary downgrade recorded.

---

## 11. Remaining dependency on AIXIA_STANDARD.md

| Dependency | Status after Batch 39 |
|------------|----------------------|
| Primary phrase sync | **Owner files** (`aixia-global/`) |
| Secondary sync | Banner + legacy-reference markers + file existence |
| `REQUIRED_AIXIA_COMPONENT_FILES` | Still requires file to exist |
| Hermes manifest | Still lists path (non-build) |
| qa-agent memory | Stale PAGE_SHELL_HERO refs (non-build) |
| Appendix content | **Not build-gated** — safe to thin in Stage 4 after proposal |

---

## 12. Stage 4 appendix thinning — readiness

**Ready for Stage 4 thinning proposal (Batch 40)** — **not** ready for execution without proposal + approval.

| Gate | Status |
|------|--------|
| Stage 3 stable build | **Yes** (this batch) |
| 13-phrase build dependency on AIXIA_STANDARD | **Removed** |
| Banner check active | **Yes** |
| Hermes/memory updated | **No** — defer to parallel doc batch |
| Piter approval for content removal | **Required** before Stage 4 execution |

---

## 13. Recommended next batch

### **Batch 40 — AIXIA_STANDARD Stage 4 thinning proposal**

Plan removal of duplicated appendix sections and canonical law table from `AIXIA_STANDARD.md`, keeping:

- `AIXIA-DEPRECATION-BANNER` + blockquote
- Short implementation reference note
- Component quick index + owner links
- Superseded-rules warning (historical anti-patterns)

**Do not execute removal in proposal batch.**

**Do not recommend yet:** page migration, AgentOps History, finance shell proofs, command-surface context, CSS split, archive execution, guardrail hard-error escalation, old-file deletion.

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | Batch 39 report |
| 2 | Files modified | `aixia-guardrails.mjs`, `16-design-file-cleanup-map.md` |
| 3 | Code behavior changed | **No** (app/pages/components unchanged) |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Components changed | **No** |
| 7 | Guardrail hard-error behavior changed | **No** |
| 8 | Guardrail warning tier changed | **No** |
| 9 | Package scripts changed | **No** |
| 10 | AIXIA_STANDARD.md changed | **No** |
| 11 | AIXIA_STANDARD 13-phrase secondary dependency removed | **Yes** |
| 12 | Owner-file phrase check remains primary | **Yes** |
| 13 | AIXIA_STANDARD secondary banner/reference check active | **Yes** |
| 14 | Owner phrase coverage | **13/13 Yes** |
| 15 | New warnings introduced | **No** |
| 16 | Cleanup map updated | **Yes** |
| 17 | Old files moved/deleted/archived | **No** |
| 18 | Page migrations remain paused | **Yes** |
| 19 | Batch 9 finance proofs paused | **Yes** |
| 20 | Command-surface context paused | **Yes** |
| 21 | Command results | All PASS (see §4) |
| 22 | Final status | **Batch 39 complete** |
| 23 | Recommended next batch | **Batch 40 — Stage 4 thinning proposal** |
