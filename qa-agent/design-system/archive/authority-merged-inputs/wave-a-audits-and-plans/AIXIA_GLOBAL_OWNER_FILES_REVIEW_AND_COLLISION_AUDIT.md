<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md, src/design-system/aixia-global/16-design-file-cleanup-map.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file records **owner-file review and collision audit** history. Collision rows may be **historically dated** — active law is in `aixia-global/` owner files `00`–`16`.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`00-README-SOURCE-OF-TRUTH.md`](../../src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md) — authority root
> - [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md) — cleanup disposition
>
> - If this audit conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AiXia Global Owner Files Review & Collision Audit

**Date:** 2026-05-30  
**Type:** Audit/review/report only — no code, CSS, component, page, guardrail-script, package-script, file move, delete, or deprecation banner changes.

---

## 1. Purpose

Verify that owner files `00`–`16` in `src/design-system/aixia-global/` are internally consistent, complete, and non-contradictory; and that existing files in `src/design-system/` do not confuse, contradict, or compete with the new global source of truth.

This audit supports the mandatory end state:

**ONE STANDARD. ONE OWNER PER ASPECT. ONE GLOBAL DESIGN FOLDER. NO COMPETING DESIGN AUTHORITIES.**

---

## 2. Files audited in `src/design-system/aixia-global/`

All 17 files (16 numbered owners + this audit references the set):

| # | File |
|---|------|
| 00 | `00-README-SOURCE-OF-TRUTH.md` |
| 01 | `01-design-tokens.md` |
| 02 | `02-typography-standard.md` |
| 03 | `03-page-shell-standard.md` |
| 04 | `04-hero-header-standard.md` |
| 05 | `05-meta-status-strip-standard.md` |
| 06 | `06-card-section-standard.md` |
| 07 | `07-button-action-standard.md` |
| 08 | `08-table-list-standard.md` |
| 09 | `09-form-input-standard.md` |
| 10 | `10-modal-drawer-standard.md` |
| 11 | `11-scroll-responsive-standard.md` |
| 12 | `12-navigation-workspace-standard.md` |
| 13 | `13-module-wrapper-rules.md` |
| 14 | `14-page-migration-rules.md` |
| 15 | `15-guardrail-rules.md` |
| 16 | `16-design-file-cleanup-map.md` |

---

## 3. Files audited in `src/design-system/`

| File | In cleanup map §4.3 |
|------|-------------------|
| `README.md` | Yes |
| `aixia-design-principles.md` | Yes |
| `aixia-page-patterns.md` | Yes |
| `aixia-component-rules.md` | Yes |
| `aixia-table-rules.md` | Yes |
| `aixia-form-rules.md` | Yes |
| `aixia-navigation-rules.md` | Yes |
| `aixia-archive-rules.md` | Yes |
| `aixia-conflict-deprecation-policy.md` | Yes |
| `aixia-migration-checklist.md` | Yes |
| `aixia-migration-watch-registry.md` | Yes |
| `aixia-refresh-rules.md` | Yes |
| `aixia-permission-ui-rules.md` | Yes |
| `aixia-finance-workflow-registry-contract.md` | Yes |

No other files exist directly under `src/design-system/` (subfolder `aixia-global/` excluded from old-file scope).

---

## 4. Confirmation: all owner files 00–16 exist

**Yes.** All sixteen numbered owner files plus `00` README are present on disk. Batch 25 completed the set (`15-guardrail-rules.md` was the final missing owner).

---

## 5. Internal consistency result for 00–16

**Overall: strong alignment with two stale-content issues and one structural ambiguity.**

The owner set is **substantively consistent** on the highest-risk splits:

| Cross-cutting topic | Owners involved | Result |
|---------------------|-----------------|--------|
| Authority / one-owner rule | 00, all owners | **Consistent** |
| Tokens vs typography | 01, 02 | **Consistent** (01 owns values; 02 owns type roles) |
| Shell vs hero placement | 03, 04 | **Consistent** (hero fixed above scroll; shell owns atmosphere) |
| Hero KPIs vs meta strip | 04, 05, 06 | **Consistent** (KPIs in hero via `AixiaCommandMetrics`; meta strip secondary only) |
| Meta strip vs cards | 05, 06 | **Consistent** |
| Cards vs navigation/workspace | 06, 12 | **Consistent** (navigation cards owned by 12; section/KPI cards by 06) |
| Buttons/actions vs tables/modals/archive | 07, 08, 10 | **Consistent** |
| Forms vs modals/popovers | 09, 10 | **Consistent** (`AixiaDatePicker` popover exception documented in 10) |
| Scroll vs tables/modals/navigation | 11, 08, 10, 12 | **Consistent** (calendar exception in 11 + 13) |
| Module wrappers vs visual owners | 13, 01–12 | **Consistent** (delegate-only principle repeated) |
| Migration vs cleanup | 14, 16 | **Consistent** |
| Guardrails vs migration/cleanup | 15, 14, 16 | **Consistent** |

**Verdict:** No hard logical contradictions on visual law between owner files `01`–`15`. Issues found are **stale meta-state**, **documented overlap needing clarification**, and **missing cross-references** — not conflicting rules.

---

## 6. Contradictions found inside `aixia-global/`

| # | Location | Issue | Classification |
|---|----------|-------|----------------|
| C1 | `00-README-SOURCE-OF-TRUTH.md` §3 | States **"Current state (Batch 10): Only `00` and `16` exist"** — false after Batches 11–25 | **Contradiction** (stale meta-state vs repo reality) |
| C2 | `16-design-file-cleanup-map.md` §7 step 2 | Says **"Create `01`–`15` one aspect at a time (later batches)"** — already done | **Contradiction** (stale procedure text) |

**Count: 2 contradictions** (both are stale status/procedure text, not conflicting visual law).

---

## 7. Ambiguous ownership found inside `aixia-global/`

| # | Topic | Files | Detail | Classification |
|---|-------|-------|--------|----------------|
| A1 | **Hub page shell pattern** | `03`, `12`, `13` | `03`/`13` emphasize `AixiaCommandPage` + `AixiaCommandPageLayout`; `12` describes hub rhythm and also assigns **`AixiaWorkspaceShell`** as multi-region hub composition. Finance hub today uses `FinancePage` + inline sections, not necessarily `AixiaWorkspaceShell`. | **Ambiguous ownership** — needs future clarification in `03` or `12` (when WorkspaceShell vs CommandPageLayout) |
| A2 | **Two command shell entry points** | `03` | Documents both raw `AixiaCommandPage` and `AixiaCommandPageLayout` as valid; notes collision **"document one tree"** | **Overlap but acceptable** — clarification deferred to implementation/migration |
| A3 | **`AixiaHero` `statusCards` vs meta strip** | `04`, `05` | 05 explicitly separates hero bento status from page meta strip | **No issue** — boundary documented |

**Count: 1 ambiguous ownership item requiring future clarification (A1); 1 acceptable overlap (A2).**

---

## 8. Missing cross-references found inside `aixia-global/`

| # | Gap | Recommendation |
|---|-----|----------------|
| X1 | `00` reading order does not state **all `01`–`15` now exist** | Update `00` §3 current-state paragraph (future doc batch) |
| X2 | `16` §4.1 gate column still reads **"After 05 exist"**, **"After 11 exist"**, etc. for many qa-agent inputs — owners now exist | Update gates to **"After merge + approval"** |
| X3 | `15` §13 completion table does not cross-link **`16` §6 final sweep** explicitly | Minor — add cross-ref in future edit |
| X4 | Batch creation reports (`AIXIA_GLOBAL_FOLDER_BATCH_11`–`25`) not listed in `16` inventory | Add as historical reference entries |

**Count: 4 missing cross-reference / stale-reference items.**

---

## 9. Collision table — `src/design-system/` old files vs `aixia-global/`

| Old file | vs `aixia-global/` | Competing authority? | Recommended disposition |
|----------|-------------------|----------------------|-------------------------|
| `README.md` | **Contradicts / competes** — declares `AIXIA_PAGE_SHELL_HERO_STANDARD.md` as **locked non-negotiable law**; does not point to `aixia-global/00` | **Yes — primary collision** | **Wrapper only** — delegate to `aixia-global/00`; remove locked qa-agent citation |
| `aixia-design-principles.md` | **Partly agrees** — aligns on shared-first; embeds finance-specific typography/card lanes | Mild compete on finance wording | **Merge** → `00`/`01`/`02`; then **wrapper/deprecate** |
| `aixia-page-patterns.md` | **Partly agrees** — hero/meta/KPI split matches `04`/`05`/`06`; header cites old qa-agent doc as override | Mild compete (finance locked header as law) | **Merge** → `03`/`04`/`06`/`12`/`14`; then **deprecate** |
| `aixia-component-rules.md` | **Partly agrees** — spans components, forms, tables, archive, workflow registry, MW sign-offs | **Yes — operational competing law** | **Merge** → `06`/`07`/`08`/`09`/`10`/`13`/`14`; then **wrapper/deprecate** |
| `aixia-table-rules.md` | **Agrees** with `08` | No | **Merge** → `08`; then **wrapper/deprecate** |
| `aixia-form-rules.md` | **Agrees** with `09`; MW-024 status wording partially stale ("open globally" vs finance complete in `09`) | No (wording drift only) | **Merge** → `09`; then **wrapper/deprecate** |
| `aixia-navigation-rules.md` | **Agrees** with `12` | No | **Merge** → `12`; then **wrapper/deprecate** |
| `aixia-archive-rules.md` | **Agrees** with `07`/`10` | No | **Merge** → `07`/`10`; then **wrapper/deprecate** |
| `aixia-conflict-deprecation-policy.md` | **Agrees** with `14`/`15`/`16` | No | **Merge** → `14`/`15`/`16`; keep as process wrapper until merged |
| `aixia-migration-checklist.md` | **Agrees** with `14` | No | **Merge** → `14`; then **wrapper/deprecate** |
| `aixia-migration-watch-registry.md` | **Mostly agrees** — living MW-### tracker; opening line says **"single source for migration-watch planning"** (process overlap with `14`) | Mild — not visual law | **Wrapper only** under `14` (per `16` §4.3) |
| `aixia-refresh-rules.md` | **Agrees** — behavior/non-visual | No | **Remain** as non-visual reference (`13`) |
| `aixia-permission-ui-rules.md` | **Agrees** — behavior/non-visual | No | **Remain** as non-visual reference (`13`) |
| `aixia-finance-workflow-registry-contract.md` | **Contradicts global-only principle** in `13`/`08` — finance-specific composition law | **Yes — module competing law** | **Migrate later** → generalize to global registry pattern; then **deprecate** |

---

## 10. Files that agree with `aixia-global/`

- `aixia-table-rules.md` → `08`
- `aixia-navigation-rules.md` → `12`
- `aixia-archive-rules.md` → `07`/`10`
- `aixia-conflict-deprecation-policy.md` → `14`/`15`/`16`
- `aixia-migration-checklist.md` → `14`
- `aixia-refresh-rules.md` → `13` (behavior)
- `aixia-permission-ui-rules.md` → `13` (behavior)
- `aixia-form-rules.md` → `09` (substantive agreement; minor MW-024 wording drift)
- `aixia-design-principles.md` → `00`/`01`/`02` (substantive agreement; finance-specific phrasing)

---

## 11. Files that partly agree but need wrapper/deprecation wording

- `README.md` — must stop citing qa-agent shell doc as locked law
- `aixia-design-principles.md` — finance command lane wording should defer to owners
- `aixia-page-patterns.md` — locked finance header section should defer to `04`/`05`/`06`
- `aixia-component-rules.md` — long operational sign-off blocks should defer to `14`/`16`/MW registry
- `aixia-migration-watch-registry.md` — clarify it tracks debt under `14`, not migration law
- `aixia-form-rules.md` — align MW-024 global status wording with `09`

---

## 12. Files that contradict `aixia-global/`

| File | Contradiction |
|------|---------------|
| `README.md` | Asserts qa-agent `AIXIA_PAGE_SHELL_HERO_STANDARD.md` overrides everything — conflicts with `00` one-folder authority |
| `aixia-finance-workflow-registry-contract.md` | Presents finance-only registry UI as **single source of truth** — conflicts with `13` (no module visual law) and `08` (global table/registry law) |

**Count: 2 files with material contradictions.**

---

## 13. Files that create competing authority

| File | Why |
|------|-----|
| `README.md` | Primary governance entry still points agents to old qa-agent shell standard |
| `aixia-component-rules.md` | Multi-aspect operational law + sign-off gates readable as current authority |
| `aixia-page-patterns.md` | "Locked" finance header block readable as overriding global owners |
| `aixia-finance-workflow-registry-contract.md` | Explicit "single source of truth" for registry UI |

**Count: 4 competing-authority files** (plus qa-agent docs/scripts outside this folder — tracked in `16` §4.1).

---

## 14. Files that should become wrapper-only

- `README.md` (highest priority)
- `aixia-migration-watch-registry.md`
- `aixia-conflict-deprecation-policy.md` (until merged into `14`/`15`/`16`)

---

## 15. Files that should be merged into owner files

| Source | Target owner(s) |
|--------|-----------------|
| `aixia-design-principles.md` | `00`, `01`, `02` |
| `aixia-page-patterns.md` | `03`, `04`, `06`, `12`, `14` |
| `aixia-component-rules.md` | `06`, `07`, `08`, `09`, `10`, `13`, `14` |
| `aixia-table-rules.md` | `08` |
| `aixia-form-rules.md` | `09` |
| `aixia-navigation-rules.md` | `12` |
| `aixia-archive-rules.md` | `07`, `10` |
| `aixia-migration-checklist.md` | `14` |
| `aixia-conflict-deprecation-policy.md` | `14`, `15`, `16` |

---

## 16. Files that should be deprecated later

After merge + wrapper conversion + Piter approval:

- `aixia-page-patterns.md`
- `aixia-component-rules.md`
- `aixia-table-rules.md`
- `aixia-form-rules.md`
- `aixia-navigation-rules.md`
- `aixia-archive-rules.md`
- `aixia-design-principles.md`
- `aixia-migration-checklist.md`
- `aixia-finance-workflow-registry-contract.md` (after generalization)

---

## 17. Files that should be archived later

- Historical sign-off sections inside `aixia-component-rules.md` / `aixia-migration-checklist.md` (extract to qa-agent archive after merge)
- qa-agent batch reports per `16` §4.1 (after banners)

---

## 18. Files that should be deleted later (after checks and approval)

None under `src/design-system/` directly — all listed files have merge or wrapper value first.

Deletion candidates remain in `16` §4.5–4.7 (`PageLoader.tsx`, orphan CSS, etc.) — out of scope for this audit's old-doc list.

---

## 19. Cleanup map accuracy review

**Overall: structurally accurate; procedure gates and meta-state are stale.**

| Area | Accurate? | Notes |
|------|-----------|-------|
| §4.3 `src/design-system/` inventory | **Yes** | All 14 old files listed with correct target owners |
| §3 ownership-split table | **Yes** | Matches owner responsibilities |
| §4.1 qa-agent doc classifications | **Mostly yes** | Gate column outdated ("After 05 exist" when `05` exists) |
| §4.5–4.8 CSS/components/guardrails | **Yes** | Aligns with owner files and repo |
| §5 deletion gates | **Yes** | Matches `14`/`15` |
| §6 final cleanup phase C1–C7 | **Yes** | Clear sequence |
| §7 cleanup order step 2 | **Stale** | Says create `01`–`15` later — **done** |
| Batch reports 11–25 | **Missing** | Not in inventory (non-blocking historical gap) |

---

## 20. Missing cleanup-map entries

| # | Missing entry | Suggested class |
|---|---------------|-----------------|
| M1 | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_11`–`25_*` (15 reports) | **KEEP** (history) |
| M2 | `qa-agent/design-system/AIXIA_GLOBAL_OWNER_FILES_REVIEW_AND_COLLISION_AUDIT.md` (this file) | **KEEP** (audit history) |
| M3 | Stale gate text throughout §4.1 ("After XX exist") | **Update in place** when cleanup map edited |

**Count: 3 missing/stale cleanup-map items** (2 new inventory rows + 1 gate-column refresh).

---

## 21. Recommended changes to cleanup map

1. **Update §7 step 2** — mark `01`–`15` creation **complete**; next step is **review/approval + reference alignment**.
2. **Refresh §4.1 gate column** — change "After 05 exist" → **"After merge + Piter approval"** for rows whose owners now exist.
3. **Add §4.1 rows** for `AIXIA_GLOBAL_FOLDER_BATCH_11`–`25` reports as **KEEP (history)**.
4. **Add note in §4.3** that `README.md` is **high-priority wrapper conversion** — currently active competing authority.
5. **Cross-link** `AIXIA_GLOBAL_OWNER_FILES_REVIEW_AND_COLLISION_AUDIT.md` in §4.1 as review artifact.

*(Documentation-only recommendations — do not edit `16` in this task unless Piter approves a follow-up batch.)*

---

## 22. Recommended next batch

**Prerequisites met for planning (not for page migration):**

| Gate | Status |
|------|--------|
| Owner files exist (`00`–`16`) | **Yes** |
| Internal visual-law contradictions | **None** (2 stale meta-text issues only) |
| Old `src/design-system/` collisions classified | **Yes** |
| Cleanup map accuracy reviewed | **Yes** (stale gates noted) |
| Guardrail/reference alignment plan clear | **Yes** (documented in `15` §8–§9) |

### Recommended next batch (documentation only)

**Batch 26 — `src/design-system/README.md` delegation + owner meta refresh**

Scope (requires Piter approval):

1. Rewrite `src/design-system/README.md` to **delegate exclusively** to `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md`.
2. Remove **"Locked page shell & hero law"** pointer to `AIXIA_PAGE_SHELL_HERO_STANDARD.md` as current authority.
3. Replace document map with **pointer to owner files `00`–`16`**; move Batch D / MW sign-off history to **reference appendix** or link to `aixia-migration-watch-registry.md` only.
4. Optionally in same batch (if approved): fix stale **Batch 10** paragraph in `00` §3 and **§7 step 2** in `16`.

**Do not yet:**

- Add deprecation banners to old docs (unless Piter explicitly approves banner batch)
- Change guardrail scripts
- Migrate pages (AgentOps History, finance shell proofs, etc.)
- Implement command-surface context
- Split CSS
- Delete old files

### Follow-on batches (after README delegation)

| Order | Batch | Scope |
|-------|-------|-------|
| 27 | Guardrail/reference alignment plan doc + script citation updates | Policy-first per `15`; update allowlist constants |
| 28 | Deprecation banner pass | Old `src/design-system/*.md` + qa-agent superseded law docs |
| 29 | Cleanup map refresh | Gates, batch report inventory, README status |
| 30+ | Shared implementation alignment | Meta strip naming, hero citations — **not page migration** |

---

## 23. Explicit confirmation: page migrations remain paused

**Yes.** This audit does not authorize page migration, finance shell proofs (Batch 9), command-surface context, CSS split, or old-file deletion. All remain paused per `00`, `14`, and `15`.

---

## Appendix A — Owner file completeness (Scope 3)

| File | Responsibility clear | Sole owner | Relationships clear | Forbidden patterns | Migration/cleanup gates |
|------|---------------------|------------|---------------------|-------------------|-------------------------|
| 00 | Yes | Yes | Yes | Yes | Yes |
| 01 | Yes | Yes | Yes | Yes | N/A (visual) |
| 02 | Yes | Yes | Yes | Yes | N/A |
| 03 | Yes | Mostly | Yes | Yes | Via 14 |
| 04 | Yes | Yes | Yes | Yes | Via 14 |
| 05 | Yes | Yes | Yes | Yes | Via 14 |
| 06 | Yes | Yes | Yes | Yes | Via 14 |
| 07 | Yes | Yes | Yes | Yes | Via 14 |
| 08 | Yes | Yes | Yes | Yes | Via 14 |
| 09 | Yes | Yes | Yes | Yes | Via 14 |
| 10 | Yes | Yes | Yes | Yes | Via 14 |
| 11 | Yes | Yes | Yes | Yes | Via 14 |
| 12 | Yes | Yes* | Yes | Yes | Via 14 |
| 13 | Yes | Yes | Yes | Yes | Via 14 |
| 14 | Yes | Yes | Yes | Yes | Self |
| 15 | Yes | Yes | Yes | Yes | Self + 16 |
| 16 | Yes | Yes | Yes | Yes | Self |

\*Hub shell ambiguity (WorkspaceShell vs CommandPageLayout) noted in §7 A1 — does not invalidate sole ownership of navigation/workspace aspects.

---

## Appendix B — Duplicate wording (harmless)

Repeated phrases across owners (**"no Finance-specific law"**, **"canonical input → merge"**, **"Piter approval"**) are intentional reinforcement — **duplicate wording but not harmful**.

---

## Validation

Run: `npm run qa:validate-foundation` — see final check below.
