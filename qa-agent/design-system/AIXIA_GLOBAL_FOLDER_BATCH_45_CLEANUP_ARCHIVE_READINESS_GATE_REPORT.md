# AiXia Global Design System — Batch 45 — Cleanup Archive-Readiness Gate Report

**Date:** 2026-05-30  
**Type:** Documentation / audit / planning only — no archive, delete, move, banner execution, or app changes  
**Status:** COMPLETE

---

## 1. Purpose

Batch 44 completed the Hermes/memory detour (export manifest + memory mirror refresh). **Batch 45 resumes the global design cleanup sequence** from where it paused after Batches 40/41.

This batch answers:

1. What old authority files still block cleanup?
2. Which files are ready for future archive **planning**?
3. Which files must remain because Hermes/memory/export still needs them?
4. Which qa-agent old authority reports are still risky?
5. Which files can be marked “archive-ready later” but not archived yet?
6. What exact next cleanup batch should happen before any deletion/archive execution?

**Hard rule unchanged:** ONE STANDARD. ONE OWNER PER ASPECT. ONE GLOBAL DESIGN FOLDER. NO COMPETING DESIGN AUTHORITIES. Active law = `src/design-system/aixia-global/` only.

---

## 2. Files audited

| Category | Paths |
|----------|--------|
| Owner / authority | `src/design-system/aixia-global/00`–`16` (all 17 files verified present) |
| Old design docs | All 14 `src/design-system/*.md` excluding `aixia-global/` |
| Component legacy doc | `src/components/aixia/AIXIA_STANDARD.md` |
| Hermes / memory | Batch 43–44 reports, seed, memory mirrors, `export-analytics-for-hermes.mjs` manifest structure |
| qa-agent inventory | ~81 `qa-agent/design-system/*.md` (high-level + focused old-authority review) |
| Cleanup map | `16-design-file-cleanup-map.md` (status notes only) |
| Guardrail dependency | `scripts/aixia-guardrails.mjs` `inspectSharedStandardDocument()` (read-only audit) |

**Not audited for execution:** CSS files, components, pages, Supabase, guardrail scripts (behavior unchanged).

---

## 3. Current cleanup state (post-Batch 44)

| Item | Status |
|------|--------|
| Owner files `00`–`16` | **Exist and are active law** — all 17 files present under `src/design-system/aixia-global/` |
| Old `src/design-system/*.md` | **14/14 bannered** (Batch 30) — `AIXIA-DEPRECATION-BANNER` on every file |
| `AIXIA_STANDARD.md` | **Thinned** (Batch 41) — legacy implementation reference + component index; banner `type: legacy-implementation-reference` |
| Hermes/export context | **Points to `aixia-global/00`–`16` first** (Batch 44); `AIXIA_STANDARD.md` in `legacy_reference` only |
| qa-agent memory mirrors | **Refreshed** (Batch 44) — cite owners; old shell doc = historical only |
| AgentMemory | **Local/staging mirror only** — standalone seed 6/6 recall; full REST/MCP deferred (Windows iii-engine crash) |
| Archive/delete | **Not started** — all gates in `16` §5 still apply |
| Page migrations | **PAUSED** |
| Batch 9 finance proofs | **PAUSED** |
| Command-surface context | **PAUSED** |
| CSS split | **PAUSED** |
| Guardrail hard-error escalation | **PAUSED** |

**Continuation rule honored:** Hermes/memory track complete; cleanup sequence resumed — **no jump to page migration.**

---

## 4. Old `src/design-system/*.md` readiness table

Classification key: **A** permanent wrapper · **B** behavior reference · **C** tracker · **D** future archive plan · **E** body dedup first · **F** generalization first · **G** not ready

| File | Banner type | Class | Current risk | Dependencies | Hermes/export needs? | Memory mirrors need? | Target owners | Recommended next action | Archive/delete gate |
|------|-------------|-------|--------------|--------------|----------------------|----------------------|---------------|-------------------------|---------------------|
| `README.md` | `global-delegation-wrapper` | **A** | Low | Entry point for `src/design-system/` | **Yes** — listed in export `design_authority` adjacency via `README.md` | Low — routing only | `00`, `16` | **Keep** as permanent delegation wrapper | Do not archive |
| `aixia-design-principles.md` | `reference-only-merged` | **D** | Medium — finance-specific lanes in body | Content merged into `00`/`01`/`02`/`06` | **No** — not in export manifest | **No** | `00`, `01`, `02`, `06` | Future archive **plan** after body verify + no live citations | Dedup verify + Piter approval |
| `aixia-page-patterns.md` | `deprecated-competing-authority` | **E** | Medium–high — locked finance sign-offs in body | Merged into `03`/`04`/`06`/`12`/`14` | **No** | **No** | `03`, `04`, `06`, `12`, `14` | Body dedup batch; then archive **plan** | Dedup + dependency check + approval |
| `aixia-component-rules.md` | `deprecated-competing-authority` | **E** | High — long MW sign-offs; “Source of Truth” section (implementation) | Merged into `06`–`10`, `13`, `14` | **No** | **No** | `06`–`10`, `13`, `14` | Body dedup before any archive plan | Dedup + approval |
| `aixia-table-rules.md` | `reference-only-merged` | **D** | Low | Merged into `08` | **No** | **No** | `08` | Future archive plan after dependency grep | Dependency check + approval |
| `aixia-form-rules.md` | `reference-only-merged` | **D** | Low — “SOT” = field pattern not global law | Merged into `09` | **No** | **No** | `09` | Future archive plan | Dependency check + approval |
| `aixia-navigation-rules.md` | `reference-only-merged` | **D** | Low | Merged into `12` | **No** | **No** | `12` | Future archive plan | Dependency check + approval |
| `aixia-archive-rules.md` | `reference-only-merged` | **D** | Low | Merged into `07`, `10` | **No** | **No** | `07`, `10` | Future archive plan | Dependency check + approval |
| `aixia-conflict-deprecation-policy.md` | `reference-only-merged` | **B** / **D** | Low — process doc | Process duplicated in `14`/`15`/`16` | **No** | **No** | `14`, `15`, `16` | Keep as process reference **or** archive after `16` fully subsumes | Process merge verify + approval |
| `aixia-migration-checklist.md` | `reference-only-merged` | **E** | Medium — duplicates `14` checklist | Merged into `14` | **No** | **No** | `14` | Dedup against `14-page-migration-rules.md` | Dedup + approval |
| `aixia-migration-watch-registry.md` | `tracker-only` | **C** | Low — planning tracker | Living MW registry | **No** | **No** | `14`, `16` | **Keep** until migration-watch items closed | Keep until MW closed |
| `aixia-refresh-rules.md` | `behavior-reference-only` | **B** | Minimal | Behavior merged into `11`/`13`/`14`/`15` | **No** | **Yes** — cited as input doc in memory mirror | `11`, `13`, `14`, `15` | **Keep** behavior reference; optional later archive | Keep until memory/export no longer cite |
| `aixia-permission-ui-rules.md` | `behavior-reference-only` | **B** | Minimal | Behavior in `13` | **No** | Low | `13` | **Keep** behavior reference | Keep |
| `aixia-finance-workflow-registry-contract.md` | `deprecated-competing-authority` | **F** | Medium — finance-only route table | Needs generalization to shared registry law | **No** | **No** | `08`, `13`, `14` | Generalization plan before archive | Generalize + approval |

**Summary:** All 14 old docs are bannered and **not listed as active law** in Hermes export. **None are ready for archive execution.** Highest-priority pre-archive work: **E** (page-patterns, component-rules, migration-checklist) and **F** (finance workflow contract).

---

## 5. AIXIA_STANDARD readiness table

| Check | Result |
|-------|--------|
| Thinned (Batch 41) | **Yes** — canonical law table and appendix phrases removed |
| Not active law | **Yes** — banner + body state legacy reference only |
| Guardrails | **Secondary only** — `inspectSharedStandardDocument()` checks banner existence, `type: legacy-implementation-reference`, and legacy wording; **primary phrase law reads owner files** (Batch 39) |
| Hermes/export | **`legacy_reference` role only** — not in `design_authority` |
| Memory mirrors | **Do not treat as law** — Batch 44 refresh explicit |
| Ready for future archive **planning**? | **Partially yes** — can draft proposal in a later batch |
| Ready for archive **execution**? | **No** |

### Blockers still preventing archive

| Blocker | Detail |
|---------|--------|
| Guardrail file existence | Build still calls `inspectSharedStandardDocument()` — file must exist with banner markers |
| Component quick index | Hermes `legacy_reference` and agents still use as implementation bridge |
| Cleanup map gate | §4.4 + §5 require dependency checks, stable validation, Piter approval |
| Piter approval | Mandatory before any archive/delete |
| Guardrail dependency removal | Future batch must remove or replace secondary check before archive execution |
| Hermes alignment | Batch 44 done — no longer blocks **planning**, still blocks **execution** until guardrails updated |

**Batch 45 verdict:** Mark as **“future archive proposal candidate — not archive-ready for execution.”**

---

## 6. qa-agent old authority risk audit

~81 files under `qa-agent/design-system/`. Classifications: **A** historical report · **B** banner later · **C** archive later · **D** useful input already merged · **E** risky old authority wording · **F** safe until archive phase

### Highest risk — still blocking cleanup confidence

| File | Class | Risk | Why |
|------|-------|------|-----|
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | **E** | **Critical** | **No deprecation banner.** Title: “Locked”; body: “non-negotiable layout law”. Content merged into owners `03`/`04`/`05`/`11` but file reads as current authority. |
| `AIXIA_P0_META_STRIP_AUTHORITY.md` | **E** | High | Asserts meta strip law without banner; merged into `05` |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` | **E** | High | Enforcement plan language; merged into `03`/`04`/`15` |
| `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` | **D/E** | Medium | Canonical scroll aliases — merged into `11`; body still authoritative tone |
| `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md` | **E** | Medium | Pre-global-folder architecture; may read as layered law |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md` | **E** | Medium | Pre-owner rulebook — superseded by `00`–`16` |

### P0 batch reports (8 files)

| Files | Class | Notes |
|-------|-------|-------|
| `AIXIA_P0_BATCH_1` … `AIXIA_P0_BATCH_8_*` | **A** / **C** | Historical execution reports; cleanup map marks **DEPRECATE → banner → archive**. Not in Hermes export. Risk if agent reads without date context. |

### Phase reports (~10 files)

| Files | Class | Notes |
|-------|-------|-------|
| `AIXIA_PHASE_1A` … `AIXIA_PHASE_2A_*` | **A** / **C** | Phase history; archive later per cleanup map §4.1 |

### Unified / consolidation reports

| File | Class | Notes |
|------|-------|-------|
| `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md` | **C** | Superseded by global folder program |
| `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md` | **D** | Still useful input for `16` — not law |
| `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md` | **F** | Program plan — keep until cleanup complete |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` | **D** | Tracking input for `16` |

### Batch 10–44 reports (33 files)

| Files | Class | Notes |
|-------|-------|-------|
| `AIXIA_GLOBAL_FOLDER_BATCH_10` … `BATCH_44` + owner review | **F** | Safe historical batch record; cite `16` + latest batch for status |

### Memory mirrors (4 files)

| Files | Class | Notes |
|-------|-------|-------|
| `memory/*.md` | **F** | Refreshed Batch 44 — route to `aixia-global/`; not risky as law if read in order |

**Top cleanup blocker:** **`AIXIA_PAGE_SHELL_HERO_STANDARD.md`** — only major qa-agent doc still presenting as locked law without banner.

---

## 7. Hermes / memory dependency gate result

| Gate | Pass? | Evidence |
|------|-------|----------|
| Hermes export no longer depends on old active-law docs | **Yes** | `collectGithubManifest()` — `design_authority` = `aixia-global/00`–`16` only; old `src/design-system/*.md` not listed; qa-agent shell doc not listed |
| Memory mirrors no longer cite old docs as current law | **Yes** | Batch 44 refresh; stale pointer table in `AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` |
| AgentMemory seed does not treat old docs as law | **Yes** | `AIXIA_AGENTMEMORY_INITIAL_SEED.md` — hierarchy points to `aixia-global/`; 6/6 recall tests passed on authority routing |
| `aixia-global/` is first source of truth | **Yes** | Export manifest note + memory read order + seed §1 |
| Silent refresh captured | **Yes** | Seed §4; memory mirror §Silent refresh; owners `11`/`13`/`14`/`15` |
| Post-memory resume = design cleanup | **Yes** | This batch; no page migration recommended |
| Raw `.agentmemory-local` not committed as law | **Yes** | Excluded from export manifest (Batch 44) |

**Remaining Hermes/memory dependencies (keep files, do not archive yet):**

| Dependency | File(s) | Reason |
|------------|---------|--------|
| Export legacy bridge | `AIXIA_STANDARD.md` | `legacy_reference` section |
| Export Hermes docs | Batch 43–44 reports, seed, recall JSON, integration plan, memory source-of-truth | Operational context |
| Memory behavior input | `aixia-refresh-rules.md` | Cited as silent-refresh input doc (behavior, not visual law) |
| Delegation entry | `src/design-system/README.md` | Listed adjacent to global folder in export |

**Verdict:** Archive/delete of old authority files is **not blocked by Hermes/export/memory routing** except for the specific files above — which must remain until guardrail + proposal gates clear.

---

## 8. 12-agent future memory infrastructure note

**Separate from design cleanup** — tracked in AgentOps roadmap, not design law:

- AgentOps master roadmap references **Phase 15 — Final 12-Agent Source-of-Truth Rulebooks** and multi-agent Council/Agents overview (`/system/agent-ops/agents`, `/system/agent-ops/council`).
- Planned retrieval memory layer (semantic recall, multi-agent compatibility) appears in AgentOps Phase 5/6 architecture reports — **future work**, not active in staging design cleanup.
- Batch 43 AgentMemory test validated **design-authority routing** only (standalone local mode); full REST/MCP for 12-agent operational memory remains **deferred** (iii-engine Windows crash; Docker/WSL option in Batch 45A path from Batch 44).
- **Design cleanup rule:** 12-agent memory infrastructure must **mirror and route** to `aixia-global/` — same as Hermes — and must not become a second design law book.

---

## 9. Proposed cleanup execution sequence

| Stage | Batch | Action | Execution in Batch 45? |
|-------|-------|--------|------------------------|
| **1** | **45 (this)** | Archive-readiness gate audit | **Done** |
| **2** | **46** | qa-agent old authority **banner plan** (priority: `AIXIA_PAGE_SHELL_HERO_STANDARD.md`, P0 authority docs) | Planned — **recommended next** |
| **3** | **47+** | qa-agent old authority banner **execution** (after Piter approval) | Not yet |
| **4** | Later | qa-agent historical report **archive plan** (move to `qa-agent/design-system/archive/`) | Not yet |
| **5** | Later | Old `src/design-system/*.md` body **deduplication/generalization** (E/F files) | Not yet |
| **6** | Later | `AIXIA_STANDARD` archive/deletion **proposal** (not execution) | Not yet |
| **7** | Later | Dependency/import checks + guardrail secondary check removal | Not yet |
| **8** | Last | Archive/delete **execution** — Piter approval only | **Forbidden until stage 7** |

**Do not recommend:** page migration, finance shell proofs, command-surface, CSS split, file deletion, archive execution, guardrail hard-error escalation.

---

## 10. Cleanup map update summary

**File:** `src/design-system/aixia-global/16-design-file-cleanup-map.md`

| Update | Detail |
|--------|--------|
| §4.4 `AIXIA_STANDARD.md` | Added Batch 45 gate note — assessed; future archive proposal only |
| §7 step 17 | Batch 45 archive-readiness gate audit complete |
| §7 steps 18–21 | Renumbered (wrapper merge → migrate → archive → delete) |

Classifications in §4.1–§4.3 **unchanged** — audit confirms Batch 31 inventory still accurate post-Batch 44.

---

## 11. What was not changed

- App code, CSS, components, pages
- Guardrail scripts, allowlists, package scripts
- Supabase, production, main branch
- Hermes runtime config, Cursor MCP, AgentMemory server
- Any file moved, deleted, archived, or bannered (qa-agent old authority docs still unbannered)
- Page migrations, finance proofs, command-surface, CSS split

---

## 12. Recommended next batch

**Primary recommendation: Batch 46 — qa-agent old authority banner plan**

Focus:

1. **`AIXIA_PAGE_SHELL_HERO_STANDARD.md`** — highest-risk unbannered old law doc
2. P0 authority docs (`AIXIA_P0_META_STRIP_AUTHORITY.md`, `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md`, etc.)
3. Template aligned with Batch 30 banner types (`deprecated-competing-authority`, `reference-only-merged`)
4. Plan only unless Piter approves execution in same batch

**Alternate Batch 46 options (lower priority than banner plan):**

- Old `src/design-system/*.md` body deduplication **plan** (E-class files)
- `AIXIA_STANDARD` archive/deletion **proposal** (documentation only)

**Do not recommend yet:** AgentOps History migration, finance shell proofs, command-surface, CSS split, archive execution, deletion, guardrail escalation, page migration.

---

## 13. Confirmation — page migrations remain paused

**Yes.** Owner `14-page-migration-rules.md`, memory mirrors, AgentMemory seed, and cleanup map all lock page migrations. Batch 45 does not change that state.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **Not run** — no code changes |

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_45_CLEANUP_ARCHIVE_READINESS_GATE_REPORT.md` |
| 2 | Files modified | `src/design-system/aixia-global/16-design-file-cleanup-map.md` (status notes only) |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Components changed | **No** |
| 7 | Guardrail scripts changed | **No** |
| 8 | Package scripts changed | **No** |
| 9 | Hermes runtime config changed | **No** |
| 10 | AgentMemory server started | **No** |
| 11 | Old files moved/deleted/archived | **No** |
| 12 | Cleanup readiness audited | **Yes** |
| 13 | Old src/design-system files classified | **Yes** (14 files) |
| 14 | AIXIA_STANDARD readiness assessed | **Yes** |
| 15 | qa-agent old authority risks audited | **Yes** |
| 16 | Hermes/memory dependency gate checked | **Yes** — pass |
| 17 | 12-agent future memory infrastructure noted | **Yes** |
| 18 | Page migrations remain paused | **Yes** |
| 19 | Batch 9 finance proofs paused | **Yes** |
| 20 | Command-surface context paused | **Yes** |
| 21 | Command results | `qa:validate-foundation` PASS |
| 22 | Final status | **Batch 45 COMPLETE** |
| 23 | Recommended next batch | **Batch 46 — qa-agent old authority banner plan** (priority: `AIXIA_PAGE_SHELL_HERO_STANDARD.md`) |

---

*End of Batch 45 report.*
