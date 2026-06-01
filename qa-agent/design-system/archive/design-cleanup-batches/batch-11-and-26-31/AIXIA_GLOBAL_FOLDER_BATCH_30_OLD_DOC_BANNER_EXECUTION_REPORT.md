# AiXia Global Folder — Batch 30 Old Doc Banner Execution Report

**Date:** 2026-05-30  
**Type:** Documentation-only — deprecation/wrapper banners added to old `src/design-system/*.md` files. No code/CSS/components/pages/guardrails/moves/deletes.

---

## 1. Purpose

Execute Batch 29’s approved banner plan: insert `AIXIA-DEPRECATION-BANNER` markers and Batch 29 templates on all **14** old files under `src/design-system/` (excluding `aixia-global/`), so AI/Cursor/Hermes agents cannot treat them as active design law. Optional same-batch wording cleanup on `aixia-page-patterns.md` and `aixia-finance-workflow-registry-contract.md`. Update cleanup map banner status.

---

## 2. Files modified

### Old `src/design-system/` docs (14 — banners added)

| File | Banner type |
|------|-------------|
| `README.md` | **A** — global delegation wrapper |
| `aixia-design-principles.md` | **B** + **F** |
| `aixia-page-patterns.md` | **E** + **F** |
| `aixia-component-rules.md` | **E** + **F** |
| `aixia-table-rules.md` | **B** + **F** |
| `aixia-form-rules.md` | **B** + **F** |
| `aixia-navigation-rules.md` | **B** + **F** |
| `aixia-archive-rules.md` | **B** + **F** |
| `aixia-conflict-deprecation-policy.md` | **B** |
| `aixia-migration-checklist.md` | **B** + **F** |
| `aixia-migration-watch-registry.md` | **C** — tracker only |
| `aixia-refresh-rules.md` | **D** — behavior reference |
| `aixia-permission-ui-rules.md` | **D** — behavior reference |
| `aixia-finance-workflow-registry-contract.md` | **E** + **F** |

### Other docs updated

| File | Change |
|------|--------|
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §4.3 banner column; §5 gates; C1/C3 status; §7 cleanup order |
| `src/design-system/README.md` | Paused-work note (banners done; migration/delete still paused) |

### Report created

| File |
|------|
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_30_OLD_DOC_BANNER_EXECUTION_REPORT.md` |

---

## 3. Banner type applied per file

See §2 table. All banners placed **before** the existing `#` title. All include HTML comment `AIXIA-DEPRECATION-BANNER`.

---

## 4. Owner files cited per old file

| Old file | Owner file(s) cited in banner |
|----------|----------------------------|
| `README.md` | `00`, `16` (via links in Template A) |
| `aixia-design-principles.md` | `00`, `01`, `02`, `06` |
| `aixia-page-patterns.md` | `03`, `04`, `06`, `12`, `14` |
| `aixia-component-rules.md` | `06`, `07`, `08`, `09`, `10`, `13`, `14` |
| `aixia-table-rules.md` | `08` |
| `aixia-form-rules.md` | `09` |
| `aixia-navigation-rules.md` | `12` |
| `aixia-archive-rules.md` | `07`, `10` |
| `aixia-conflict-deprecation-policy.md` | `14`, `15`, `16` |
| `aixia-migration-checklist.md` | `14` |
| `aixia-migration-watch-registry.md` | `14`, `16` |
| `aixia-refresh-rules.md` | `13`, `14` (migration context) |
| `aixia-permission-ui-rules.md` | `13` |
| `aixia-finance-workflow-registry-contract.md` | `08`, `13`, `14` |

---

## 5. Optional page-patterns override cleanup result

**Done.**

Removed blockquote citing `AIXIA_PAGE_SHELL_HERO_STANDARD.md` as override/current law.

Replaced with:

> **Current shell/hero/meta law (not this file):** `03-page-shell-standard.md`, `04-hero-header-standard.md`, `05-meta-status-strip-standard.md`.

Historical body content below banner unchanged.

---

## 6. Optional finance registry title cleanup result

**Done.**

- H1 retitled: **Historical Finance Workflow Registry Contract — Deprecated Reference**
- Opening line changed from **"Single source of truth for…"** to **"Historical contract for… (deprecated reference — not current design law)."**
- Business/composition tables and sign-off records preserved.

---

## 7. Cleanup map update summary

`16-design-file-cleanup-map.md` updated:

- **Status** — Batch 30 banners on all 14 old docs; no moves/deletes.
- **§4.3** — Added **Banner (Batch 30)** column for every old file.
- **§5** — Gates clarify banners ≠ delete authorization.
- **§6 C1** — Partial complete (old `src/design-system/*.md` done; qa-agent/component docs later).
- **§6 C3** — Marked done (Batch 28 guardrail citations).
- **§7** — Cleanup order steps 6–7 reflect Batches 27–30.

---

## 8. Confirmation: no code/CSS/page/component/guardrail changes

| Area | Changed |
|------|---------|
| App code / pages | **No** |
| CSS | **No** |
| Components | **No** |
| Guardrail scripts | **No** |
| Package scripts | **No** |

---

## 9. Confirmation: no files moved/deleted

All 14 old files remain in `src/design-system/`. No archive folder moves. No deletions.

---

## 10. Confirmation: page migrations remain paused

| Area | Status |
|------|--------|
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |
| Old-file deletion | **Paused** |

---

## 11. Remaining old-file cleanup/deletion risks

| Risk | Notes |
|------|-------|
| Body content still duplicates owner files | Banners downgrade authority; optional dedup batch later |
| MW sign-offs in `component-rules` / `page-patterns` | Historical records only per Template E |
| `src/components/aixia/AIXIA_STANDARD.md` | No banner yet (out of Batch 30 scope) |
| qa-agent superseded law docs | C1 partial — not bannered in Batch 30 |
| No automated banner detection in guardrails | Future batch (see recommended next) |
| Archive/delete | Still requires dependency checks + Piter approval per `16` §5 |

---

## 12. Recommended next batch

**Batch 31 — Cleanup-map precision refresh + archive/delete readiness audit**

Documentation-only pass to:

1. Refresh `16` §4.1 qa-agent inventory and stale guardrail notes (post–Batch 28).
2. Audit which old docs can move to `qa-agent/design-system/archive/` after banner verification.
3. Plan guardrail/QA detection for missing `AIXIA-DEPRECATION-BANNER` on deprecated paths.

**Alternates:** owner-file implementation alignment plan; banner on `AIXIA_STANDARD.md`.

**Do not recommend yet:** page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, old-file **deletion**, guardrail hard-error escalation.

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
| 1 | Files created | Batch 30 execution report |
| 2 | Files modified | 14 old docs + `16` + `README` paused note |
| 3 | Banners added to all 14 old files | **Yes** |
| 4 | `AIXIA-DEPRECATION-BANNER` in all 14 files | **Yes** |
| 5 | Page-patterns qa-agent override removed/replaced | **Yes** |
| 6 | Finance registry active “single source of truth” removed/replaced | **Yes** |
| 7 | Cleanup map banner status updated | **Yes** |
| 8 | Code changed | **No** |
| 9 | CSS changed | **No** |
| 10 | Pages changed | **No** |
| 11 | Guardrail scripts changed | **No** |
| 12 | Package scripts changed | **No** |
| 13 | Old files moved/deleted | **No** |
| 14 | Files archived | **No** |
| 15 | Finance changed | **No** (docs only; no app/finance code) |
| 16 | AgentOps changed | **No** |
| 17 | Page migrations remain paused | **Yes** |
| 18 | Batch 9 finance proofs paused | **Yes** |
| 19 | Command-surface context paused | **Yes** |
| 20 | Command results | `qa:validate-foundation` → **PASS** |
| 21 | Final status | **Batch 30 complete** |
| 22 | Recommended next batch | **Batch 31 — cleanup-map precision + archive readiness audit** |

---

*End of Batch 30 report.*
