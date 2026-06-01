# AiXia Global Design System — Batch 35 — Parallel Owner-File Read Check in Guardrails

**Date:** 2026-05-30  
**Scope:** Guardrail runner additive check — **zero behavior change when anchors present**

---

## 1. Purpose

Batch 34 placed all 13 legacy guardrail phrases as anchors in `src/design-system/aixia-global/` owner files. Batch 35 adds a **parallel** build-time check (`inspectGlobalOwnerPhraseAnchors()`) that verifies those anchors exist, while **preserving** the existing `inspectSharedStandardDocument()` check on `AIXIA_STANDARD.md`.

When all 13 phrases are present (current state), the new check emits **no warnings** — proving guardrails can read owner files without changing build output.

---

## 2. Files modified

| File | Change |
|------|--------|
| `scripts/aixia-guardrails.mjs` | Import coverage helper; add `AIXIA_GLOBAL_DIR`; add `inspectGlobalOwnerPhraseAnchors()`; call after legacy check |
| `scripts/guardrails/aixia-owner-phrase-coverage-report.mjs` | Fix direct-run guard so import from guardrails does not execute CLI |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §4.4, §4.8, §7 Batch 35 status |

## Files created

| File |
|------|
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_35_PARALLEL_OWNER_PHRASE_GUARDRAIL_REPORT.md` |

---

## 3. Existing AIXIA_STANDARD check status

**Function:** `inspectSharedStandardDocument()` — **unchanged**

| Aspect | Before Batch 35 | After Batch 35 |
|--------|-----------------|----------------|
| File read | `src/components/aixia/AIXIA_STANDARD.md` | Same |
| Phrase list | 13 inline strings | Same (unchanged array) |
| Missing phrase | `addError` → warning | Same |
| Scope | `AiXia legacy standard document sync rule` | Same |
| Hard error | No | No |
| Removed | — | **No** |

---

## 4. New owner-file parallel check summary

**Function:** `inspectGlobalOwnerPhraseAnchors()`

| Aspect | Behavior |
|--------|----------|
| Trigger | Immediately after `inspectSharedStandardDocument()` in `main()` |
| Logic | Reuses `runOwnerPhraseCoverageReport()` from read-only coverage script |
| Phrases | Same 13 exact strings (shared via coverage module constants) |
| Scan | All `.md` under `src/design-system/aixia-global/` |
| Missing phrase | `addError` → **warning** only (scope: `AiXia global owner phrase anchor rule`) |
| All present | **No warnings** (current state) |
| Hard errors | **None added** |
| Replaces legacy check | **No** |

**Comments/messages clarify:** `AIXIA_STANDARD.md` = legacy sync bridge; `aixia-global/` = canonical design law; parallel check is transitional until read-path migration with Piter approval.

---

## 5. Confirmation — phrase list unchanged

The inline `requiredPhrases` array in `inspectSharedStandardDocument()` was **not modified**. No phrase text renamed or removed.

Shared constants in `aixia-owner-phrase-coverage-report.mjs` remain aligned with the legacy list (Batch 34).

---

## 6. Confirmation — AIXIA_STANDARD check preserved

- `inspectSharedStandardDocument()` body unchanged except preceding new function in file.
- Still first phrase check in `main()`.
- Legacy warnings only if phrases missing from `AIXIA_STANDARD.md` (none today).

---

## 7. Owner phrase coverage result

```text
node scripts/guardrails/aixia-owner-phrase-coverage-report.mjs
→ Coverage: 13/13 phrases found in aixia-global/
→ Result: PASS
```

Build parallel check: **0 warnings** from `AiXia global owner phrase anchor rule` (all anchors present).

---

## 8. Before/after build and QA results

| Command | Batch 34 baseline | Batch 35 |
|---------|-------------------|----------|
| Owner coverage script | 13/13 PASS | 13/13 PASS |
| `qa:validate-foundation` | PASS | PASS |
| `qa:static-design-guardrails` | 185 findings | **185 findings** (unchanged) |
| `qa:guardrail-action-plan` | PASS | PASS |
| `npm run build` | PASS, 0 hard errors | **PASS, 0 hard errors** |
| New owner-anchor warnings | N/A | **0** |
| Legacy AIXIA_STANDARD phrase warnings | 0 | **0** |

---

## 9. Warning/error behavior comparison

| Tier | Batch 34 | Batch 35 |
|------|----------|----------|
| Hard errors | 0 | **0** |
| Legacy phrase warnings | 0 (all phrases present) | **0** |
| Owner phrase warnings | N/A (not in build) | **0** (all anchors present) |
| Allowlists | Unchanged | Unchanged |
| `addError` vs `addHardError` policy | Unchanged | Unchanged |
| Static scan findings | 185 | **185** |

**Net behavior change when 13/13 coverage holds:** none.

---

## 10. Cleanup map update summary

Updated `16-design-file-cleanup-map.md`:

- **§4.4** — Batch 35 parallel owner-file read; legacy check unchanged; not archive-ready.
- **§4.8** — Runner row notes `inspectGlobalOwnerPhraseAnchors()` done.
- **§7 step 10** — Parallel owner-file guardrail read recorded.

Classifications unchanged. `AIXIA_STANDARD.md` **not** marked archive-ready.

---

## 11. Remaining dependency on AIXIA_STANDARD.md

| Dependency | Status |
|------------|--------|
| Legacy phrase sync | Still active (`inspectSharedStandardDocument`) |
| Owner phrase sync | Now **also** active in parallel (warn-only) |
| Primary read path | Still legacy file for phrase enforcement messaging |
| Archive readiness | **Not ready** — dual checks intentional until Batch 36+ downgrade |
| File existence | Still in `REQUIRED_AIXIA_COMPONENT_FILES` |

---

## 12. Recommended next batch

### **Batch 36 — Downgrade AIXIA_STANDARD to secondary legacy sync check**

With stable 13/13 parallel coverage proven:

1. Make owner-file anchor check the **primary** phrase warning source (same warn-only tier).
2. Reduce `AIXIA_STANDARD.md` check to a single legacy-bridge drift warning (or warn-only duplicate suppressed).
3. Baseline warning counts before/after; **no hard-error escalation**.
4. Piter approval before thinning `AIXIA_STANDARD.md` appendix.

**Do not recommend yet:** page migration, AgentOps History, finance shell proofs, command-surface context, CSS split, file deletion, guardrail hard-error escalation.

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | Batch 35 report |
| 2 | Files modified | `aixia-guardrails.mjs`, `aixia-owner-phrase-coverage-report.mjs`, `16-design-file-cleanup-map.md` |
| 3 | Code behavior changed | **No** (app/pages/components unchanged) |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Components changed | **No** |
| 7 | Guardrail build behavior changed | **No** (0 new warnings at 13/13 coverage) |
| 8 | Package scripts changed | **No** |
| 9 | AIXIA_STANDARD.md checks preserved | **Yes** |
| 10 | Required phrases changed/renamed | **No** |
| 11 | Parallel owner-file read check added | **Yes** |
| 12 | Owner phrase coverage | **13/13 Yes** |
| 13 | New warnings introduced | **No** |
| 14 | Cleanup map updated | **Yes** |
| 15 | Old files moved/deleted/archived | **No** |
| 16 | Page migrations remain paused | **Yes** |
| 17 | Batch 9 finance proofs paused | **Yes** |
| 18 | Command-surface context paused | **Yes** |
| 19 | Command results | All PASS (see §8) |
| 20 | Final status | **Batch 35 complete** |
| 21 | Recommended next batch | **Batch 36 — downgrade AIXIA_STANDARD to secondary legacy sync** |
