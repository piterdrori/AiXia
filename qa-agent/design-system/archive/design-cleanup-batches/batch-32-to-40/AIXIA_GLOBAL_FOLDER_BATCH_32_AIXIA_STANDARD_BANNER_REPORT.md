# AiXia Global Design System — Batch 32 — AIXIA_STANDARD Banner + Authority Table Refresh

**Date:** 2026-05-30  
**Scope:** Documentation / source-of-truth wording only  
**Target:** `src/components/aixia/AIXIA_STANDARD.md`

---

## 1. Purpose

Batch 31 identified `AIXIA_STANDARD.md` as the next highest source-of-truth risk: it still partially read as active design authority while guardrails continue to sync locked phrases from it for legacy compatibility.

Batch 32 adds a deprecation banner, refreshes the authority table to delegate to `src/design-system/aixia-global/` owner files `00`–`16`, and updates the cleanup map — without changing guardrail logic, code, CSS, pages, or moving/deleting any files.

---

## 2. Files modified

| File | Change |
|------|--------|
| `src/components/aixia/AIXIA_STANDARD.md` | Banner added; authority table refreshed; appendix authority citations updated |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §4.4 entry updated for Batch 32 status |

## Files created

| File |
|------|
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_32_AIXIA_STANDARD_BANNER_REPORT.md` |

---

## 3. Banner added summary

Prepended `AIXIA-DEPRECATION-BANNER` block with:

- **type:** `legacy-implementation-reference`
- **canonical:** `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md`
- **owner-files:** `src/design-system/aixia-global/01`–`16`

Banner states:

- This file is not the active design source-of-truth.
- Active design law lives only in `src/design-system/aixia-global/`.
- File remains temporarily as legacy implementation sync / guardrail compatibility reference.
- Guardrails may inspect for legacy sync but must not treat this file as design-law owner.
- `aixia-global/` wins on conflict.
- Do not add new design rules here.
- Future disposition requires dependency checks, guardrail alignment, and Piter approval.

Retitled H1 from "Deprecated as Design Law" framing to **"AiXia Component Index (Legacy Implementation Reference)"** with Batch 32 status note.

---

## 4. Authority table refresh summary

Replaced **"Locked authorities"** table (which pointed at `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md` and other qa-agent P0 docs as current law) with **"Canonical design law (read these first)"** table mapping all topics to `aixia-global/` owner files `00`–`16`.

Added footnote: historical qa-agent planning docs are merge input/backlog only — not current law.

---

## 5. Old references removed/replaced

| Old reference | Replacement |
|---------------|-------------|
| `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md` as layout/hero authority | `03-page-shell-standard.md`, `04-hero-header-standard.md`, `05-meta-status-strip-standard.md`, `11-scroll-responsive-standard.md` |
| `PAGE_SHELL_HERO_STANDARD` in appendix layout-law sentences | Owner file citations (`03`, `04`, `05`, `11`) |
| `aixia-component-rules.md`, `aixia-page-patterns.md`, `PAGE_SHELL_HERO_STANDARD` as active cross-refs | Deprecated bannered docs noted; owners `07`–`10`, `08` cited |
| qa-agent P0 rows in primary authority table | Moved to historical footnote only |
| Wording implying this file is single source of truth / overrides `aixia-global/` | Clarified: implementation sync for components/CSS; design law in `aixia-global/` |

**Preserved:** All guardrail `requiredPhrases` strings in appendix sections (Batch 28 legacy sync contract unchanged).

---

## 6. Cleanup map update summary

Updated `16-design-file-cleanup-map.md` §4.4 row for `AIXIA_STANDARD.md`:

- Batch 32 banner added.
- Authority table points to `aixia-global/` `00`–`16`.
- Status: legacy implementation sync only.
- No deletion/move/archive yet.
- Future: thin reference or archive after dependency check + guardrail alignment + Piter approval.

---

## 7. Confirmation — no code/CSS/page/component behavior changed

- No `.tsx`, `.ts`, `.css`, or page files edited.
- No component exports or behavior changed.
- Documentation wording only in `AIXIA_STANDARD.md` and cleanup map §4.4.

---

## 8. Confirmation — guardrail logic unchanged

- `scripts/aixia-guardrails.mjs` not modified.
- `inspectSharedStandardDocument()` `requiredPhrases` array unchanged.
- All 13 locked phrases remain present in `AIXIA_STANDARD.md` appendix.

---

## 9. Confirmation — no files moved/deleted/archived

- `AIXIA_STANDARD.md` remains at `src/components/aixia/AIXIA_STANDARD.md`.
- No archive folder writes.
- No deletions.

---

## 10. Remaining AIXIA_STANDARD dependency risk

| Risk | Detail |
|------|--------|
| Guardrail phrase sync | `aixia-guardrails.mjs` still hard-requires 13 phrases in this file — file cannot be archived until guardrails read owner files or a thin phrase stub |
| Agent confusion | File lives beside components; banner mitigates but does not remove path proximity |
| Historical body content | Superseded orb/hero sections retained for audit trail — could still be misread without banner |
| qa-agent P0 docs | Still exist un-bannered; next risk after this file |

---

## 11. Recommended next batch

**Recommended:** **AIXIA_STANDARD guardrail dependency reduction plan** — map each `requiredPhrases` entry to the matching `aixia-global/` owner file, stage guardrail read-path migration (messages/comments first, behavior unchanged), then thin or archive `AIXIA_STANDARD.md` after Piter approval.

**Alternate:** **qa-agent old authority banner/archive plan** — banner remaining qa-agent P0 shell/hero reports so they cannot compete with `aixia-global/`.

**Not recommended yet:** page migration, Batch 9 finance proofs, command-surface context, CSS split, old-file deletion, guardrail hard-error escalation.

---

## Validation commands

Run after Batch 32 edits:

```bash
npm run qa:validate-foundation
npm run qa:static-design-guardrails
npm run qa:guardrail-action-plan
npm run build
```

Results recorded in final check section after execution.

---

## Validation results (executed 2026-05-30)

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run qa:static-design-guardrails` | **PASS** (185 findings, 4 actionable) |
| `npm run qa:guardrail-action-plan` | **PASS** |
| `npm run build` | **PASS** (guardrails + tsc + vite; 0 hard errors) |

All 13 legacy `requiredPhrases` in `AIXIA_STANDARD.md` satisfied; no guardrail sync failures.
