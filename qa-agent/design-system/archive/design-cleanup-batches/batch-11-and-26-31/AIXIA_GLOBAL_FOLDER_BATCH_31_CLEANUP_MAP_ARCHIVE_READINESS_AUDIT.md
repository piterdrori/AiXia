# AiXia Global Folder — Batch 31 Cleanup Map & Archive Readiness Audit

**Date:** 2026-05-30  
**Type:** Documentation/audit/planning only — no banners added (except verification), no moves/deletes/archives, no app-source changes.

---

## 1. Purpose

After Batch 30 added `AIXIA-DEPRECATION-BANNER` markers to all 14 old `src/design-system/*.md` files, **Batch 31** verifies banner correctness, audits `16-design-file-cleanup-map.md` accuracy, classifies archive/delete readiness, reviews qa-agent design-system inventory, and assesses `AIXIA_STANDARD.md` for a future banner batch.

---

## 2. Files audited

| Category | Paths |
|----------|--------|
| Owner / cleanup | `aixia-global/00`, `14`, `15`, `16` |
| Prior batches | Batch 29–30 reports, collision audit |
| Old docs (14) | All `src/design-system/*.md` excluding `aixia-global/` |
| Component doc | `src/components/aixia/AIXIA_STANDARD.md` |
| qa-agent inventory | `qa-agent/design-system/*` (69 files, high-level) |
| Cleanup map refresh | `16-design-file-cleanup-map.md` (minimal precision edits) |

---

## 3. Old `src/design-system/*.md` banner verification table

| File | Banner | Expected type | Owner files cited | Status correct | Remaining body risk | Archive/delete readiness |
|------|--------|---------------|-------------------|----------------|---------------------|--------------------------|
| `README.md` | Yes | **A** | `00`, `16` (links) | **Yes** | Low — lists superseded qa-agent doc as *not* current law | **A** Keep permanent wrapper |
| `aixia-design-principles.md` | Yes | **B+F** | `00`, `01`, `02`, `06` | **Yes** | Medium — finance-specific locked card/typography lanes in body | **D** Future archive after dependency check |
| `aixia-page-patterns.md` | Yes | **E+F** | `03`, `04`, `06`, `12`, `14` | **Yes** | Medium–high — "Locked — Finance transaction command header" + sign-offs | **E** Body dedup before archive |
| `aixia-component-rules.md` | Yes | **E+F** | `06`–`10`, `13`, `14` | **Yes** | High — long MW sign-offs; body "## Source of Truth" (implementation, not global law) | **E** Body dedup before archive |
| `aixia-table-rules.md` | Yes | **B+F** | `08` | **Yes** | Low — aligns with `08` | **D** Future archive after dependency check |
| `aixia-form-rules.md` | Yes | **B+F** | `09` | **Yes** | Low — "`AixiaFormDateField` structure (single source of truth)" = component field pattern, not global design law | **D** Future archive after dependency check |
| `aixia-navigation-rules.md` | Yes | **B+F** | `12` | **Yes** | Low | **D** Future archive after dependency check |
| `aixia-archive-rules.md` | Yes | **B+F** | `07`, `10` | **Yes** | Low | **D** Future archive after dependency check |
| `aixia-conflict-deprecation-policy.md` | Yes | **B** | `14`, `15`, `16` | **Yes** | Low — process doc | **D** Keep or archive after process fully in `16` |
| `aixia-migration-checklist.md` | Yes | **B+F** | `14` | **Yes** | Medium — duplicates `14` checklist; LOCKED sign-off refs | **D/E** Archive after dedup |
| `aixia-migration-watch-registry.md` | Yes | **C** | `14`, `16` | **Yes** | Low — "single source for migration-watch **planning**" (process, not visual law) | **C** Keep tracker until MW closed |
| `aixia-refresh-rules.md` | Yes | **D** | `13`, `14` | **Yes** | Minimal | **B** Keep behavior reference |
| `aixia-permission-ui-rules.md` | Yes | **D** | `13` | **Yes** | Minimal | **B** Keep behavior reference |
| `aixia-finance-workflow-registry-contract.md` | Yes | **E+F** | `08`, `13`, `14` | **Yes** | Medium — finance route table + Batch D sign-off (historical) | **F** Generalize before archive |

**Summary:** All **14/14** files have `AIXIA-DEPRECATION-BANNER`. All banner types match Batch 29/30 plan. All cite correct owner paths. All banners state `aixia-global/` wins on conflict.

**No old file** still cites qa-agent docs as **current override law** in a top-level authority block (page-patterns override removed in Batch 30).

**Residual "source of truth" wording (body only, not global visual law):**

- `aixia-form-rules.md` — component field structure (acceptable with banner)
- `aixia-component-rules.md` — shared **implementation** SOT + workflow registry phrasing (banner E mitigates)
- `aixia-migration-watch-registry.md` — migration-watch planning SOT (banner C clarifies)

---

## 4. Cleanup map accuracy review after Batch 30

| Check | Result |
|-------|--------|
| §4.3 banner column for all 14 old files | **Accurate** |
| §5 gates — no delete without dependency + approval | **Accurate** |
| §6 C1 partial (old docs bannered) | **Accurate** |
| §6 C3 guardrail citations | **Was stale** — §4.8 still said "After guardrail alignment"; **fixed in Batch 31** |
| §4.1 batch reports through Batch 26 only | **Was stale** — **fixed**: added Batches 27–31 + collision audit row |
| §7 cleanup order | **Accurate** after Batch 31 step 8 added |
| §4.4 `AIXIA_STANDARD.md` | **Updated** — notes Batch 32 banner plan |
| §4.8 `PAGE_SHELL_HERO_STANDARD` const wording | **Stale reference** in narrative — guardrails use owner paths since Batch 28 (fixed in §4.8 table) |
| `15-guardrail-rules.md` §3 audit table | Still describes pre–Batch 28 state — **document in owner refresh batch** (not blocking) |

**Batch 31 cleanup-map edits (doc-only):** §4.1 inventory rows 27–31; §4.4 component note; §4.8 guardrail status; §7 step 8 audit.

---

## 5. Archive/delete readiness table (old `src/design-system/*.md`)

Classification key: **A** permanent wrapper · **B** behavior ref · **C** tracker · **D** archive candidate after deps · **E** dedup first · **F** generalize first · **G** not ready

| File | Class | Why | Dependency check | Target owners | Gate | Recommended action |
|------|-------|-----|------------------|---------------|------|-------------------|
| `README.md` | **A** | Entry delegation only | Link scan in docs/AI prompts | `00`, `16` | None for keep | **Keep** permanently |
| `aixia-refresh-rules.md` | **B** | Non-visual behavior | Low | `13` | Keep | **Keep** |
| `aixia-permission-ui-rules.md` | **B** | Non-visual behavior | Low | `13` | Keep | **Keep** |
| `aixia-migration-watch-registry.md` | **C** | MW-### living tracker | MW item importers | `14`, `16` | MW closure | **Keep** until debt closed |
| `aixia-table-rules.md` | **D** | Merged into `08`; bannered | Grep imports + AI citation | `08` | §5 + approval | **Plan archive** (do not execute) |
| `aixia-form-rules.md` | **D** | Merged into `09` | Same | `09` | §5 + approval | **Plan archive** |
| `aixia-navigation-rules.md` | **D** | Merged into `12` | Same | `12` | §5 + approval | **Plan archive** |
| `aixia-archive-rules.md` | **D** | Merged into `07`/`10` | Same | `07`, `10` | §5 + approval | **Plan archive** |
| `aixia-design-principles.md` | **D** | Merged into `00`/`01`/`02`/`06` | Same | owners | §5 + approval | **Plan archive** |
| `aixia-conflict-deprecation-policy.md` | **D** | Process merged into `14`/`15`/`16` | Policy cross-refs | `14`–`16` | §5 + approval | **Keep or plan archive** |
| `aixia-migration-checklist.md` | **D/E** | Duplicates `14` | Checklist refs in MW/docs | `14` | Dedup then §5 | **Dedup plan** then archive |
| `aixia-page-patterns.md` | **E** | Locked finance header + sign-offs in body | Cross-refs from component-rules, checklist | `03`/`04`/`06`/`12`/`14` | Dedup + §5 | **Body dedup batch** before archive plan |
| `aixia-component-rules.md` | **E** | Long operational/MW law in body | Heavy cross-ref from pages/MW | `06`–`14` | Dedup + §5 | **Body dedup batch** before archive plan |
| `aixia-finance-workflow-registry-contract.md` | **F** | Finance-specific contract; needs global registry debt record in `08`/`14` | Finance page refs | `08`, `13`, `14` | Generalize + §5 | **Generalization plan** before archive |

**None** are approved for delete or archive execution in Batch 31.

---

## 6. Files that must remain wrapper/tracker/behavior references

| File | Role | Reason to keep |
|------|------|----------------|
| `README.md` | Wrapper **A** | Canonical entry to `aixia-global/00` |
| `aixia-migration-watch-registry.md` | Tracker **C** | Active MW-### debt registry under `14` |
| `aixia-refresh-rules.md` | Behavior **D** | Silent refresh rules — not in visual owners |
| `aixia-permission-ui-rules.md` | Behavior **D** | Permission UI presentation — not visual law |

---

## 7. Files ready for future archive planning (not execution)

After dependency grep + Piter approval, these are the **safest archive candidates** (content merged, low cross-ref risk):

1. `aixia-table-rules.md`
2. `aixia-navigation-rules.md`
3. `aixia-archive-rules.md`
4. `aixia-form-rules.md` (after confirming `09` is sole cite)
5. `aixia-design-principles.md`

**Pre-archive checklist:** `rg` for filename/path imports; update any doc links to owner files; record in `16`; **no move until approved**.

---

## 8. Files needing body deduplication before archive

| File | Issue | Suggested dedup scope (future batch) |
|------|-------|-------------------------------------|
| `aixia-page-patterns.md` | "Locked — Finance transaction command header"; E-1/E-2 sign-off blocks | Mark sections as historical or trim to pointer-only stubs |
| `aixia-component-rules.md` | MW-024/Batch D sign-offs; "## Source of Truth" heading | Retain MW IDs as history; add inline "see owner `14`" notes |
| `aixia-migration-checklist.md` | Full duplicate of migration gates in `14` | Collapse to "see `14-page-migration-rules.md`" + MW pointer |

---

## 9. Files needing generalization before archive

| File | Issue | Target |
|------|-------|--------|
| `aixia-finance-workflow-registry-contract.md` | Finance-only composition table and Batch D scope | Extract global workflow-registry pattern to `08`/`13`; move route table to `14` debt notes or qa-agent archive |

---

## 10. qa-agent design-system inventory summary

**Total files audited (high level):** ~69 under `qa-agent/design-system/`

| Category | Examples | Count (approx.) | Disposition |
|----------|----------|-----------------|-------------|
| **Global owner batch reports (KEEP history)** | `AIXIA_GLOBAL_FOLDER_BATCH_10`–`31_*` | 22 | Keep as program history |
| **Collision / alignment audits (KEEP history)** | `AIXIA_GLOBAL_OWNER_FILES_REVIEW_*`, Batch 27 plan | 2 | Keep |
| **Canonical input — merged into owners (archive later risk)** | `AIXIA_PAGE_SHELL_HERO_STANDARD.md`, P0 meta/scroll/shell/shadcn docs | ~12 | **Old authority risk** — banner/archive plan needed (qa-agent scope) |
| **P0 batch history (archive later)** | `AIXIA_P0_BATCH_1..8_*` | 8 | Archive per `16` §4.1 |
| **Phase history (archive later)** | `AIXIA_PHASE_1A..2A_*` | 10 | Archive per `16` §4.1 |
| **Planning / backlog (reference until closed)** | `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md`, migration plan, unified plan | ~8 | Keep until backlog closed |
| **Superseded foundation reports (archive later)** | `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md`, `NEXT_STEP_PLAN.md` | 3 | Archive |
| **Current mirror / QA reference** | `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md` (input to `14`/`15`) | ~4 | Keep until owners fully adopted |

**Highest qa-agent authority risk (no banner yet):**

- `AIXIA_PAGE_SHELL_HERO_STANDARD.md` — title reads as locked law; guardrails no longer cite it (Batch 28) but file body unchanged
- P0 enforcement proposals/audits — merged into `15` but still readable as law

**Recommended:** Batch 33 — qa-agent historical report **archive plan** (not execution), starting with P0 batch + phase reports.

---

## 11. `src/components/aixia/AIXIA_STANDARD.md` banner/deprecation assessment

| Question | Finding |
|----------|---------|
| Reads as active design law? | **Partially** — H1 says "Deprecated as Design Law" but **Locked authorities** table still points to `AIXIA_PAGE_SHELL_HERO_STANDARD.md` as shell/hero authority |
| Banner needed? | **Yes — recommended Batch 32** |
| Target role | **Implementation reference + guardrail phrase sync only** (not layout law) |
| Owner files replacing authority | `03`, `04`, `05`, `06`, `07`, `08`, `09`, `10`, `12`, `13`, `00` |
| Guardrails depend on it? | **Yes** — `inspectSharedStandardDocument()` checks locked phrases (warn tier); Batch 28 labels it legacy sync |
| Banner now affect scripts? | **No behavior change** if banner/comments only; **body citation refresh** should point to `aixia-global/` not qa-agent shell doc |
| Separate batch? | **Yes — Batch 32: `AIXIA_STANDARD.md` banner + authority table refresh (docs only)** |

**Do not edit in Batch 31** (per task scope).

---

## 12. Remaining risks

| Risk | Mitigation |
|------|------------|
| Body content below banners still long/competing | Body dedup batches (E files) |
| `AIXIA_STANDARD.md` qa-agent citations | Batch 32 banner + table refresh |
| qa-agent `AIXIA_PAGE_SHELL_HERO_STANDARD.md` unbannered | qa-agent archive/banner plan (Batch 33+) |
| `15-guardrail-rules.md` §3 stale audit table | Owner doc precision refresh |
| No automated banner detection | Future guardrail/QA plan (Batch 32 alt) |
| Archive without dependency check | §5 gates enforced; no execution in current program phase |

---

## 13. Recommended next batch

### **Batch 32 — `AIXIA_STANDARD.md` banner + authority table refresh (docs only)**

1. Add `AIXIA-DEPRECATION-BANNER` (implementation-reference template).
2. Replace Locked authorities table: point shell/hero/meta to `03`/`04`/`05`; governance to `aixia-global/00`.
3. Update appendix guardrail phrases to cite `aixia-global/` (keep phrases for runner sync).
4. Update cross-refs to deprecated old docs (`aixia-component-rules.md` etc.) to note banners.

**Alternates for Batch 32:**

- Old-doc **body deduplication plan** for `component-rules`, `page-patterns`, `finance-workflow-registry-contract`
- qa-agent **historical report archive plan**

**Do not recommend yet:** page migration, AgentOps History, finance shell proofs, command-surface, CSS split, **archive execution**, **deletion**, guardrail hard-error escalation.

---

## 14. Confirmation: page migrations remain paused

| Area | Status |
|------|--------|
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |
| Archive/delete execution | **Paused** |

---

## Validation

```text
npm run qa:validate-foundation
→ Result: PASS
```

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | `AIXIA_GLOBAL_FOLDER_BATCH_31_CLEANUP_MAP_ARCHIVE_READINESS_AUDIT.md` |
| 2 | Files modified | `16-design-file-cleanup-map.md` (precision refresh only) |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Guardrail scripts changed | **No** |
| 7 | Package scripts changed | **No** |
| 8 | Old files moved/deleted | **No** |
| 9 | Files archived | **No** |
| 10 | New banners added | **No** (verified existing 14) |
| 11 | All 14 banners verified | **Yes** |
| 12 | Cleanup map accuracy checked | **Yes** (+ minimal refresh) |
| 13 | Archive/delete readiness classified | **Yes** |
| 14 | qa-agent inventory reviewed | **Yes** |
| 15 | `AIXIA_STANDARD.md` assessed | **Yes** |
| 16 | Page migrations paused | **Yes** |
| 17 | Batch 9 finance proofs paused | **Yes** |
| 18 | Command-surface paused | **Yes** |
| 19 | Command results | `qa:validate-foundation` → **PASS** |
| 20 | Final status | **Batch 31 complete** |
| 21 | Recommended next batch | **Batch 32 — `AIXIA_STANDARD.md` banner + authority table refresh** |

---

*End of Batch 31 report.*
