# AiXia Global Design System — Batch 34 — Owner-File Phrase Anchors + Read-Only Parallel Coverage Report

**Date:** 2026-05-30  
**Scope:** Documentation anchors + read-only coverage script — **zero guardrail behavior change**

---

## 1. Purpose

Batch 33 identified that all 13 legacy guardrail `requiredPhrases` had semantic equivalents in `src/design-system/aixia-global/` but **0/13 exact matches**, blocking safe read-path migration away from `src/components/aixia/AIXIA_STANDARD.md`.

Batch 34 adds **Guardrail phrase anchors** sections to mapped owner files, creates a read-only coverage report script, updates the cleanup map, and validates that build guardrail behavior is unchanged.

---

## 2. Files read

| File | Use |
|------|-----|
| `scripts/aixia-guardrails.mjs` | Source of 13 exact `requiredPhrases` |
| `src/components/aixia/AIXIA_STANDARD.md` | Legacy sync host (unchanged) |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_33_AIXIA_STANDARD_GUARDRAIL_DEPENDENCY_PLAN.md` | Phrase → owner mapping |
| `src/design-system/aixia-global/00`, `02`, `04`, `07`, `08`, `10`, `11`, `13`, `16` | Anchor targets + cleanup map |
| `package.json` | Validation commands (not modified) |

---

## 3. Exact 13 required phrases audited

From `inspectSharedStandardDocument()` in `scripts/aixia-guardrails.mjs` (unchanged):

1. `Source of truth`
2. `Zero local design rule`
3. `Locked shared components`
4. `Registry toolbar standard`
5. `Archive manager standard`
6. `Button standard`
7. `Table standard`
8. `Silent refresh standard`
9. `Finance permission standard`
10. `GLOBAL AIXIA FONT / TYPOGRAPHY RULE`
11. `All AiXia pages must use the same shared font and shared text-size scale`
12. `No page may create its own font family`
13. `Large hero titles may stay large`

---

## 4. Phrase-to-owner mapping table

| # | Exact phrase | Current purpose | Target owner file | Target section | Existed before Batch 34? | Added in Batch 34? | Risk |
|---|--------------|-----------------|-------------------|----------------|--------------------------|--------------------|------|
| 1 | Source of truth | Legacy doc sync | `00-README-SOURCE-OF-TRUTH.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 2 | Zero local design rule | No page-local visual systems | `13-module-wrapper-rules.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 3 | Locked shared components | Shared primitive discipline | `00-README-SOURCE-OF-TRUTH.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 4 | Registry toolbar standard | Registry toolbar pattern | `08-table-list-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 5 | Archive manager standard | Archive modal pattern | `10-modal-drawer-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 6 | Button standard | Button primitive law | `07-button-action-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 7 | Table standard | Table shell law | `08-table-list-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 8 | Silent refresh standard | Scroll/filter preservation | `11-scroll-responsive-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 9 | Finance permission standard | Permission UI preservation | `13-module-wrapper-rules.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 10 | GLOBAL AIXIA FONT / TYPOGRAPHY RULE | Typography section sync | `02-typography-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 11 | All AiXia pages must use the same shared font and shared text-size scale | Shared font scale | `02-typography-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 12 | No page may create its own font family | Forbid module font stacks | `02-typography-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |
| 13 | Large hero titles may stay large | Marketing/non-command hero exception | `04-hero-header-standard.md` | Guardrail phrase anchors | No | **Yes** | Low |

**Phrase text:** unchanged from guardrail source. **Not removed** from `AIXIA_STANDARD.md`.

---

## 5. Owner files modified

| Owner file | Phrases anchored |
|------------|------------------|
| `00-README-SOURCE-OF-TRUTH.md` | 1, 3 |
| `02-typography-standard.md` | 10, 11, 12 |
| `04-hero-header-standard.md` | 13 |
| `07-button-action-standard.md` | 6 |
| `08-table-list-standard.md` | 4, 7 |
| `10-modal-drawer-standard.md` | 5 |
| `11-scroll-responsive-standard.md` | 8 |
| `13-module-wrapper-rules.md` | 2, 9 |
| `16-design-file-cleanup-map.md` | §4.4, §4.8, §7 notes only |

---

## 6. Phrase anchors added

Each modified owner file received a trailing section:

**Title:** `## Guardrail phrase anchors`

**Disclaimer (required):**  
*These phrases are guardrail anchors for future migration away from `src/components/aixia/AIXIA_STANDARD.md`. They do not create separate design law. The actual rule meaning is governed by this owner file.*

**Content:** Exact legacy phrase strings as bullet lines (no rewording).

No existing visual standards, rule meaning, or body sections were rewritten.

---

## 7. Read-only coverage script created

**File:** `scripts/guardrails/aixia-owner-phrase-coverage-report.mjs`

| Property | Value |
|----------|-------|
| Reads | 13 phrases (mirrored constant + primary-owner map) |
| Scans | All `.md` under `src/design-system/aixia-global/` |
| Output | stdout only |
| Build integration | **None** — not in `package.json` scripts |
| Exit behavior | Exit 0 on success; does not block builds |
| Mutations | **None** — read-only |

**Run manually:**

```bash
node scripts/guardrails/aixia-owner-phrase-coverage-report.mjs
```

---

## 8. Coverage result

```
Coverage: 13/13 phrases found in aixia-global/
Result: PASS — all required phrases found under aixia-global/
All 13 phrases found in primary owner files (primary OK)
```

---

## 9. Validation results

| Command | Result |
|---------|--------|
| `node scripts/guardrails/aixia-owner-phrase-coverage-report.mjs` | **PASS** (13/13) |
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (185 findings — unchanged from Batch 32/33 baseline) |
| `npm run qa:guardrail-action-plan` | **PASS** |
| `npm run build` | **PASS** (0 hard errors; no new AIXIA_STANDARD phrase warnings) |

---

## 10. Confirmation — existing guardrail behavior unchanged

| Check | Status |
|-------|--------|
| `scripts/aixia-guardrails.mjs` modified | **No** |
| `inspectSharedStandardDocument()` unchanged | **Yes** |
| `requiredPhrases` array unchanged | **Yes** |
| `AIXIA_STANDARD.md` unchanged | **Yes** |
| Warning/hard-error tiers unchanged | **Yes** |
| Allowlists unchanged | **Yes** |
| `package.json` scripts unchanged | **Yes** |
| New hard errors added | **No** |

---

## 11. Remaining dependency on `AIXIA_STANDARD.md`

| Dependency | Status |
|------------|--------|
| Build phrase sync | Still reads **only** `AIXIA_STANDARD.md` |
| File existence check | Still in `REQUIRED_AIXIA_COMPONENT_FILES` |
| Owner anchors | Ready for **Batch 35** parallel read |
| Archive readiness | **Not ready** — dual read path not yet implemented |
| Hermes manifest | Still lists `AIXIA_STANDARD.md` path |

---

## 12. Recommended next batch

### **Batch 35 — Parallel owner-file read check in guardrails (zero behavior change)**

Add `inspectOwnerFilePhraseSync()` to `scripts/aixia-guardrails.mjs`:

- Read same 13 phrases from primary owner files (per mapping §4).
- **Warn-only** if owner missing phrase (should not fire after Batch 34).
- **Keep** existing `AIXIA_STANDARD.md` checks unchanged.
- Baseline warning counts before/after (Batch 28 protocol).

**Do not recommend yet:** page migration, AgentOps History, finance shell proofs, command-surface context, CSS split, file deletion, guardrail hard-error escalation, thinning/archiving `AIXIA_STANDARD.md`.

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | `scripts/guardrails/aixia-owner-phrase-coverage-report.mjs`, this report |
| 2 | Files modified | 8 owner files + `16-design-file-cleanup-map.md` |
| 3 | Code behavior changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Components changed | **No** |
| 7 | Guardrail build behavior changed | **No** |
| 8 | Package scripts changed | **No** |
| 9 | AIXIA_STANDARD.md checks changed | **No** |
| 10 | Required phrases changed/renamed | **No** |
| 11 | Required phrases added to owner files | **Yes** |
| 12 | Owner phrase coverage | **13/13 Yes** |
| 13 | Read-only coverage script created | **Yes** |
| 14 | Cleanup map updated | **Yes** |
| 15 | Old files moved/deleted/archived | **No** |
| 16 | Page migrations remain paused | **Yes** |
| 17 | Batch 9 finance proofs paused | **Yes** |
| 18 | Command-surface context paused | **Yes** |
| 19 | Command results | All PASS (see §9) |
| 20 | Final status | **Batch 34 complete** |
| 21 | Recommended next batch | **Batch 35 — parallel owner-file read in guardrails** |
