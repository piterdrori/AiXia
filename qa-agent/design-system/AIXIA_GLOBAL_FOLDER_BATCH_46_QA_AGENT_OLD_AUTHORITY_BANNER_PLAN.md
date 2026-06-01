# AiXia Global Design System — Batch 46 — qa-agent Old Authority Banner Plan

**Date:** 2026-05-30  
**Type:** Documentation / planning only — **no banners added, no qa-agent authority doc edits, no archive/delete/move**  
**Status:** COMPLETE  
**Predecessor:** Batch 45 archive-readiness gate audit

---

## 1. Purpose

Batch 45 identified **`qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md`** as the top cleanup blocker: unbannered, title reads “Locked,” body asserts “non-negotiable layout law,” while content is already merged into owner files `03`, `04`, `05`, and `11`.

**Batch 46** creates a documentation-only banner plan for old qa-agent authority docs so Batch 47 can add banners safely without rewriting bodies or executing archive/delete.

**Mandatory end state (unchanged):** ONE STANDARD · ONE OWNER PER ASPECT · ONE GLOBAL DESIGN FOLDER · NO COMPETING DESIGN AUTHORITIES. Active design law = `src/design-system/aixia-global/` only.

---

## 2. Files audited

| Category | Scope |
|----------|--------|
| Owner / gate files | `aixia-global/00`, `03`–`05`, `11`, `14`–`16` (read for merge targets) |
| Predecessor audit | `AIXIA_GLOBAL_FOLDER_BATCH_45_CLEANUP_ARCHIVE_READINESS_GATE_REPORT.md` |
| Priority authority docs | 8 files listed in task Part 3 |
| Extended authority scan | ~81 `qa-agent/design-system/*.md` — grep for *source of truth*, *locked*, *authority*, *non-negotiable*, *standard*, *design law* |
| Memory mirrors | 4 files under `qa-agent/design-system/memory/` (content refreshed Batch 44; no HTML banners yet) |
| Batch / phase history | Batch 10–45 reports, P0 batch 1–8, Phase 1A–2A (sampled for banner type) |
| Guardrail dependency | Read-only: guardrails cite `aixia-global/` owners (Batch 28+); no qa-agent doc citations in guardrail scripts |

**Not audited for execution:** app code, CSS, components, pages, guardrails, Hermes runtime, AgentMemory server.

---

## 3. qa-agent authority-risk inventory

Focus: files that **read like current design law** or **route agents away from `aixia-global/`**. Batch execution reports are grouped where one banner type applies to all.

### 3.1 Critical and high-risk (must banner in Batch 47)

| File path | Title (current) | Current role | Risk | Reads as current law? | Superseded by `aixia-global/`? | Target owner(s) | Banner type | Archive readiness | Notes |
|-----------|-----------------|--------------|------|----------------------|--------------------------------|-----------------|-------------|-------------------|-------|
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | AiXia Page Shell & Hero Standard **(Locked)** | Asserted layout law | **Critical** | **Yes** | **Yes** | `03`, `04`, `05`, `11` | **C** | Archive **plan** after banner + dependency grep | **#1 priority** — no banner; “non-negotiable layout law” |
| `AIXIA_P0_META_STRIP_AUTHORITY.md` | P0-05 — Command Hub Meta Strip Authority | Meta strip ownership | **High** | **Yes** — “Locked authority” | **Yes** | `05` | **B** | Archive plan later | Content merged into `05` |
| `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` | P0-06 — Scroll Class Unification Notes | Scroll alias notes | **High** | Partial — “Canonical class” | **Yes** | `11` | **B** | Archive plan later | Implementation notes; law in `11` |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` | P0-01/02/03 — Shell & Hero Default Enforcement Plan | Enforcement plan | **High** | **Yes** — “Locked rule” | **Yes** | `03`, `04`, `15` | **B** | Archive plan later | Plan-only doc; rules in owners |
| `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | P0-01/03 — Guardrail Enforcement Proposal | Guardrail proposal | **Medium–High** | Partial — enforcement rules | **Yes** | `15` | **B** | Archive plan later | Superseded by `15-guardrail-rules.md` |
| `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md` | AiXia Unified Design Authority Plan | Pre-global 4-layer architecture | **High** | **Yes** — layer stack as authority | **Yes** | `00`, `13`, `16` | **E** | Keep until program complete | Superseded by global folder program |
| `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md` | AiXia Design Source-of-Truth Conflict Audit | Conflict inventory | **Medium** | Partial — dated “no unified authority” | **Partial** — input to `16` | `16` | **E** | Keep as audit input | Opening summary outdated post-Batch 10–25 |
| `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md` | AiXia Unified Global Design Folder & Cleanup Plan | Program master plan | **Medium** | Partial — “Critical principle (locked)” | **Partial** — led to `00`–`16` | `00`, `16` | **E** | Keep until cleanup complete | Still useful program reference; must not override owners |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md` | AiXia Global Unified Design-System Rulebook | Pre-owner rulebook | **High** | **Yes** — “Source-of-Truth Rule” locked to components + qa-agent memory | **Yes** | `00`, `01`–`15` | **B** | Archive plan later | **`AIXIA_AI_PAGE_BUILDING_RULES.md` still cites this first** |
| `AIXIA_GLOBAL_PAGE_PATTERNS.md` | AiXia Global Page Patterns | Page pattern contract | **High** | **Yes** — “canonical page patterns every module must use” | **Yes** | `03`, `06`, `12`, `14` | **B** | Archive plan later | Cited in AI page-building rules |
| `AIXIA_AI_PAGE_BUILDING_RULES.md` | AiXia AI / Cursor Page-Building Rules | Agent read-first sequence | **High** | **Yes** — mandatory read order points at old rulebook | **Yes** | `00`, `14` | **B** + read-order fix | Archive plan later | Read-first list must point to `00`/`14` in Batch 47+ |
| `AIXIA_PHASE_2A_GLOBAL_PAGE_SHELL_STANDARD_DECISION.md` | Phase 2A — Global Page Shell Standard Decision | Shell decision | **High** | **Yes** — “**Locked** for all command-module pages” | **Yes** | `03`, `04` | **B** | Archive plan later | Duplicates shell/hero law |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` | Global Visual Parity Audit — After Batch 8 | Audit vs shell standard | **Medium** | Partial — baseline = shell doc | **Yes** | `03`, `04`, `05`, `16` | **E** | Keep as audit history | References `AIXIA_PAGE_SHELL_HERO_STANDARD.md` as baseline |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` | AgentOps Shell Parity & Hero Default Plan | Migration plan | **Medium** | Partial — shell parity rules | **Yes** | `04`, `13`, `14` | **E** | Keep as plan history | No page migration in scope |

### 3.2 Medium-risk P0 / consolidation inputs (banner Batch 47 or 48)

| File path | Risk | Banner type | Target owner(s) | Notes |
|-----------|------|-------------|-------------------|-------|
| `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | Medium | **B** | `07`, `15` | Merged into owners |
| `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md` | Medium | **B** | `11` | Merged into `11` |
| `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md` | Medium | **E** | `13`, `14` | Planning history |
| `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` | High | **B** | `11` | Priority tier 1 |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` | Medium | **E** | `16` | Living backlog under cleanup map |
| `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md` | Low–Medium | **A** | — | Historical report |
| `AIXIA_SHARED_COMPONENT_GAP_LIST.md` | Low | **E** | `06`, `13` | Planning input |
| `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md` | Medium | **B** | `15` | Merged into `15` |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md` | Medium | **B** | `14` | Superseded by `14` |
| `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md` | Low | **E** | `13` | Audit input |

### 3.3 Lower-risk groups (banner optional — Batch 48+)

| Group | Count | Banner type | Reads as current law? | Notes |
|-------|-------|-------------|----------------------|-------|
| `AIXIA_GLOBAL_FOLDER_BATCH_10` … `BATCH_45` reports | 36 | **A** | **No** | Self-describing batch history; optional light banner for consistency |
| `AIXIA_P0_BATCH_1` … `P0_BATCH_8_*` | 8 | **A** | **No** | Execution evidence; cleanup map marks DEPRECATE → archive later |
| `AIXIA_PHASE_1A` … `PHASE_2A_*` | 12 | **A** | Partial (2A shell decision = **B**) | Phase history |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md` | 1 | **A** | **No** | Superseded foundation report |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md` | 1 | **A** | **No** | Superseded by global folder program |
| `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md` | 1 | **A** | **No** | Context only |
| `AIXIA_GLOBAL_OWNER_FILES_REVIEW_AND_COLLISION_AUDIT.md` | 1 | **E** | **No** | Audit history — still useful |

### 3.4 Memory mirrors (`qa-agent/design-system/memory/`)

| File | Risk | Banner type | Notes |
|------|------|-------------|-------|
| `AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` | Low | **D** (optional) | Content already states mirror-not-law (Batch 44); HTML banner optional for tool detection |
| `AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | Low | **D** (optional) | Refreshed Batch 44 |
| `AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md` | Low | **D** (optional) | Refreshed Batch 44 |
| `AIXIA_DESIGN_COMPONENT_MEMORY.md` | Low | **D** (optional) | Refreshed Batch 44 |
| `AIXIA_WEBSITE_STRUCTURE_MEMORY.md` | Low | **D** (optional) | Non-visual reference |

**Batch 47 priority:** authority docs first; memory mirror banners **optional** (content already correct).

---

## 4. Banner type definitions (qa-agent)

Aligned with Batch 30 `AIXIA-DEPRECATION-BANNER` marker pattern. qa-agent types use `scope: qa-agent` in the HTML comment for filtering.

| Code | Name | When to use |
|------|------|-------------|
| **A** | **HISTORICAL REPORT ONLY** | Batch reports, phase execution reports, P0 batch reports — evidence only |
| **B** | **MERGED CANONICAL INPUT — NOT ACTIVE LAW** | Old plans/audits whose useful content was merged into owner files |
| **C** | **DEPRECATED AUTHORITY — SUPERSEDED BY AIXIA-GLOBAL** | Old docs that still **read as law** (e.g. shell/hero standard) |
| **D** | **MEMORY MIRROR ONLY** | qa-agent memory files — mirror/route only, never law |
| **E** | **PLANNING/AUDIT HISTORY ONLY** | Plans and audits that informed owners but must not override them |

**Every banner must state:**

- Active design law lives only in `src/design-system/aixia-global/` (`00`–`16`)
- This qa-agent doc is **not** current law
- If conflict, **`aixia-global/` wins**
- **Do not add new design rules here**
- Future rules go into the correct owner file (per `00` §0.2)
- Archive/delete requires dependency checks and **Piter approval**

**Placement rule (Batch 47 execution):** Insert as **first content** before the existing `#` title. Do not rewrite body in banner-only batch.

---

## 5. Exact banner templates

### Template A — HISTORICAL REPORT ONLY

```markdown
<!--
AIXIA-DEPRECATION-BANNER
scope: qa-agent
type: qa-historical-report-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Historical report only — not current design law**
>
> This qa-agent file is **batch/phase execution evidence or audit history**. It is **not** active AiXia design authority.
>
> **Active design law:** `src/design-system/aixia-global/` owner files **`00`–`16`** only.
>
> - If this report conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** New or changed rules belong in the correct `aixia-global/` owner file.
> - Archive or delete this report only after dependency checks and **Piter approval** (see `16-design-file-cleanup-map.md`).
>
> **Role:** historical report / execution evidence.
```

### Template B — MERGED CANONICAL INPUT — NOT ACTIVE LAW

```markdown
<!--
AIXIA-DEPRECATION-BANNER
scope: qa-agent
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: {{OWNER_FILE_LIST}}
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged (or is merged) into:
>
> {{OWNER_FILE_BULLETS}}
>
> **Active design law:** `src/design-system/aixia-global/` only.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Update the owner file(s) above, then `16-design-file-cleanup-map.md`.
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** deprecated canonical input — lookup until archive phase.
```

*Batch 47 replaces `{{OWNER_FILE_LIST}}` and `{{OWNER_FILE_BULLETS}}` per file.*

### Template C — DEPRECATED AUTHORITY — SUPERSEDED BY AIXIA-GLOBAL

```markdown
<!--
AIXIA-DEPRECATION-BANNER
scope: qa-agent
type: qa-deprecated-authority-superseded
canonical: src/design-system/aixia-global/
owner-files: {{OWNER_FILE_LIST}}
-->

> **⚠ DEPRECATED AUTHORITY — superseded by `aixia-global/`**
>
> This qa-agent document **must not** be read as current AiXia design law. It previously asserted locked/non-negotiable authority and is **superseded**.
>
> **Read active law instead:**
>
> {{OWNER_FILE_BULLETS}}
>
> **Active design law:** `src/design-system/aixia-global/` owner files **`00`–`16`** only.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new rules here.** Do not extend locked sections, sign-offs, or enforcement blocks.
> - Content below is **historical reference only** until Piter-approved archive/delete.
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** deprecated authority — highest visibility downgrade.
```

### Template D — MEMORY MIRROR ONLY

```markdown
<!--
AIXIA-DEPRECATION-BANNER
scope: qa-agent
type: qa-memory-mirror-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Memory mirror only — not design law**
>
> This qa-agent memory file **mirrors, summarizes, and routes** agents to owner files. It **does not** define or override AiXia design law.
>
> **Active design law:** `src/design-system/aixia-global/` owner files **`00`–`16`** only.
>
> - If this mirror conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Write rules into the correct owner file first; then update this mirror if needed.
> - AgentMemory/Hermes persistent memory must follow the same hierarchy (see `qa-agent/hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md`).
>
> **Role:** operational memory mirror — continuity, not a second law book.
```

### Template E — PLANNING/AUDIT HISTORY ONLY

```markdown
<!--
AIXIA-DEPRECATION-BANNER
scope: qa-agent
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: {{OWNER_FILE_LIST}}
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file informed the global design folder program or recorded audits. It **must not** override owner files.
>
> **Active design law:** `src/design-system/aixia-global/` (`00`–`16`).  
> **Cleanup disposition:** [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)
>
> Related owner context: {{OWNER_FILE_BULLETS}}
>
> - If this plan/audit conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Update owner files for law; update `16` for file disposition.
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.
```

---

## 6. File-by-file banner plan (Batch 47 execution order)

### Tier 1 — Execute first (Piter approval recommended before Batch 47)

| # | File | Banner | Owner file bullets | Title change in Batch 47? | Body cleanup? | Batch 47 ready? | Archive later? | Piter approval? |
|---|------|--------|-------------------|----------------------------|---------------|-----------------|----------------|-----------------|
| 1 | `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | **C** | `03-page-shell-standard.md`, `04-hero-header-standard.md`, `05-meta-status-strip-standard.md`, `11-scroll-responsive-standard.md` | **Preserve H1** — banner sufficient; optional subtitle “(Historical — Superseded)” only if Piter approves wording change | **No** in banner batch | **Yes** | **Yes** — after banner + grep + approval | **Yes** |
| 2 | `AIXIA_P0_META_STRIP_AUTHORITY.md` | **B** | `05-meta-status-strip-standard.md` | No | No | Yes | Yes | Yes |
| 3 | `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` | **B** | `11-scroll-responsive-standard.md` | No | No | Yes | Yes | Yes |
| 4 | `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` | **B** | `03`, `04`, `15-guardrail-rules.md` | No | No | Yes | Yes | Yes |
| 5 | `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | **B** | `15-guardrail-rules.md` | No | No | Yes | Yes | Yes |
| 6 | `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md` | **E** | `00`, `13`, `16` | No | No | Yes | Keep until program done | Yes |
| 7 | `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md` | **E** | `16-design-file-cleanup-map.md` | No | No | Yes | Keep as audit input | Yes |
| 8 | `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md` | **E** | `00`, `16` | No | No | Yes | Keep until cleanup complete | Yes |

### Tier 2 — Same batch or Batch 48 (high citation risk)

| File | Banner | Owner bullets | Title change? | Body cleanup? | Batch 47? | Notes |
|------|--------|---------------|---------------|---------------|-----------|-------|
| `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md` | **B** | `00`–`15` (summary list) | No | No | **Yes** | Breaks wrong read-first chain |
| `AIXIA_GLOBAL_PAGE_PATTERNS.md` | **B** | `03`, `06`, `12`, `14` | No | No | Yes | |
| `AIXIA_AI_PAGE_BUILDING_RULES.md` | **B** | `00`, `14` | No | **Yes — read-first list only** (separate micro-edit with approval) | Yes | Banner + fix §1 read order to `00`/`14`/memory |
| `AIXIA_PHASE_2A_GLOBAL_PAGE_SHELL_STANDARD_DECISION.md` | **B** | `03`, `04` | No | No | Yes | |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` | **E** | `03`, `04`, `05`, `16` | No | No | Optional Batch 48 | Audit history |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` | **E** | `04`, `13`, `14` | No | No | Optional Batch 48 | |

### Tier 3 — Batch 48+ (optional consistency)

| Group | Banner | Count | Notes |
|-------|--------|-------|-------|
| P0 batch 1–8 reports | **A** | 8 | Low risk; fast to apply |
| Phase 1A–2A (except shell decision) | **A** | 11 | |
| Global folder batch 10–45 reports | **A** | 36 | Optional — self-documenting |
| Memory mirrors | **D** | 4 | Optional — content already mirror-only |

### Batch 47 execution checklist (for next batch)

1. Piter approval to add banners (wording-only; no body rewrites except `AIXIA_AI_PAGE_BUILDING_RULES.md` §1 if approved).
2. Apply Tier 1 banners (files 1–8) using templates above.
3. Apply Tier 2 rulebook/page-patterns/building-rules banners.
4. Run `npm run qa:validate-foundation`.
5. Grep repo for citations of `AIXIA_PAGE_SHELL_HERO_STANDARD.md` as authority — update **only** read-first lists if found (no code).
6. Update `16-design-file-cleanup-map.md` §4.1 banner status (Batch 47 execution report).
7. **Do not** archive, delete, or move files.

---

## 7. AIXIA_PAGE_SHELL_HERO_STANDARD — special handling

**File:** `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md`

| Topic | Plan |
|-------|------|
| **Supersession** | Content superseded by `03-page-shell-standard.md`, `04-hero-header-standard.md`, `05-meta-status-strip-standard.md`, `11-scroll-responsive-standard.md` |
| **Banner** | Template **C** — `qa-deprecated-authority-superseded` |
| **Owner bullets** | All four owners above with one-line aspect labels (shell / hero / meta / scroll) |
| **Title** | **Preserve** `# AiXia Page Shell & Hero Standard (Locked)` in Batch 47 — banner block above title is sufficient; “Locked” in H1 becomes visibly contradicted by banner (intentional). Optional H1 softening deferred to a later wording batch with Piter approval |
| **Body** | **Do not rewrite** in Batch 47 — historical reference; dedup not required before banner |
| **Archive** | Future archive **plan** only — requires: (1) banner in place, (2) repo grep for live citations, (3) guardrails unchanged (already cite owners), (4) memory/export confirmed (Batch 44 done), (5) **Piter approval** |
| **Guardrails** | Batch 28+ cite `aixia-global/` owners — **do not** cite this file in guardrail scripts |
| **Hermes/memory** | Batch 44 updated mirrors and export manifest — **do not** list this file as active context |
| **Residual risk after banner** | Agents may still read body if they skip banner — mitigated by banner visibility + future archive; optional cross-link in `00` Related section already points here as merge input |

**Batch 47 immediate action:** Insert Template **C** banner only — highest ROI, lowest risk.

---

## 8. Cleanup map recommendation (report only — `16` not edited in Batch 46)

After Batch **47** banner execution, update `src/design-system/aixia-global/16-design-file-cleanup-map.md`:

| Section | Recommended update |
|---------|-------------------|
| §4.1 `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | Add column **Banner (Batch 47)** — Template C applied; still KEEP AS CANONICAL INPUT until archive |
| §4.1 P0 authority docs | Note banner type B/E applied per Batch 46 plan |
| §6 step C1 | Extend: “Partial — Batch 30 done (14 `src/design-system/*.md`); **Batch 47 — qa-agent authority banners (planned)**” |
| §7 cleanup order | Add step **18**: Batch 46 banner plan (done); step **19**: Batch 47 qa-agent banner execution (pending Piter approval) |

**Do not** change classifications in §4.1 until banners are actually applied in Batch 47.

---

## 9. What was not changed

- qa-agent authority docs (no banners added)
- `src/design-system/aixia-global/16-design-file-cleanup-map.md` (report-only recommendation)
- App code, CSS, components, pages
- Guardrail scripts, package scripts
- Hermes runtime config, Cursor MCP, AgentMemory server
- Supabase, production, main branch
- No archive, delete, or move

---

## 10. Recommended next batch

**Batch 47 — Add qa-agent old authority banners according to this plan**

Execution order:

1. Tier 1 files 1–8 (Template C for shell/hero standard; B/E for others)
2. Tier 2 rulebook, page patterns, AI page-building rules (+ optional §1 read-order fix)
3. Optional Tier 3 batch-report banners (Template A)
4. Validation + cleanup map status update

**Do not recommend:**

- Page migration
- AgentOps History migration
- Finance shell proofs (Batch 9)
- Command-surface context
- CSS split
- Archive execution
- File deletion
- Guardrail hard-error escalation

---

## 11. Confirmation — page migrations remain paused

**Yes.** Owner `14-page-migration-rules.md`, Batch 45 report, memory mirrors, and AgentMemory seed all lock page migrations. This banner plan does not change that state.

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
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_46_QA_AGENT_OLD_AUTHORITY_BANNER_PLAN.md` |
| 2 | Files modified | **None** |
| 3 | qa-agent authority docs audited | **Yes** |
| 4 | Banner templates created | **Yes** (A–E) |
| 5 | File-by-file banner plan created | **Yes** |
| 6 | AIXIA_PAGE_SHELL_HERO_STANDARD plan created | **Yes** (§7) |
| 7 | Code changed | **No** |
| 8 | CSS changed | **No** |
| 9 | Pages changed | **No** |
| 10 | Components changed | **No** |
| 11 | Guardrail scripts changed | **No** |
| 12 | Package scripts changed | **No** |
| 13 | Hermes runtime config changed | **No** |
| 14 | AgentMemory server started | **No** |
| 15 | Old files moved/deleted/archived | **No** |
| 16 | Banners added | **No** (plan only) |
| 17 | Page migrations remain paused | **Yes** |
| 18 | Batch 9 finance proofs paused | **Yes** |
| 19 | Command-surface context paused | **Yes** |
| 20 | Command results | `qa:validate-foundation` PASS |
| 21 | Final status | **Batch 46 COMPLETE** |
| 22 | Recommended next batch | **Batch 47 — qa-agent old authority banner execution** (Tier 1 + Tier 2; Piter approval recommended) |

---

*End of Batch 46 plan.*
