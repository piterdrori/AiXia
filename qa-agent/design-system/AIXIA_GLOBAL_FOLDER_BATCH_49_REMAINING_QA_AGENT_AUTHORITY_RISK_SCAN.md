# AiXia Global Design System — Batch 49 — Remaining qa-agent Authority Risk Scan

**Date:** 2026-05-30  
**Type:** Scan / classification / planning only — **no banners added, no qa-agent doc edits**  
**Status:** COMPLETE  
**Predecessors:** Batch 46 plan · Batch 47 Tier 1 · Batch 48 Tier 2

---

## 1. Purpose

After 12 qa-agent authority banners (Tier 1 + Tier 2), scan `qa-agent/design-system/` for **remaining unbannered** files that still contain or imply current design law, source-of-truth authority, locked standards, or wrong read-first chains — and classify them for Batch 50 banner execution or manual review.

**Mandatory end state (unchanged):** ONE STANDARD · ONE OWNER PER ASPECT · ONE GLOBAL DESIGN FOLDER · NO COMPETING DESIGN AUTHORITIES.

---

## 2. Search terms used

Primary grep patterns (case-insensitive where noted):

| Term group | Patterns |
|------------|----------|
| Source-of-truth | `source of truth`, `Source of Truth`, `single source` |
| Locked / authority | `locked`, `Locked`, `authority`, `Authority`, `non-negotiable` |
| Canonical / standard | `canonical`, `Canonical`, `standard`, `Standard`, `global standard` |
| Law / rules | `current law`, `design law`, `must follow`, `must use`, `rulebook` |
| Agent routing | `read first`, `master memory`, `Mandatory Read` |

**Scan scope:** `qa-agent/design-system/` — **90** markdown files (root + `memory/` subfolder).

**Exclusions applied during classification:**

- Files with `AIXIA-QA-AGENT-AUTHORITY-BANNER` → listed as already covered
- Batch 10–49 execution/plan reports that mention old terms only in historical/meta context → mostly **F**
- `memory/` files with Batch 44 “not design law” headers → **D optional** or **F**

---

## 3. Files scanned

| Area | Count | Notes |
|------|-------|-------|
| Root `qa-agent/design-system/*.md` | 85 | Includes batch reports + authority docs |
| `qa-agent/design-system/memory/*.md` | 5 | Design + website structure mirrors |
| **Total** | **90** | Full tree under scan target |

---

## 4. Already-bannered qa-agent files summary

**12 authority files** carry `AIXIA-QA-AGENT-AUTHORITY-BANNER` (Batches 47–48):

| File | Batch | Template |
|------|-------|----------|
| `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | 47 | **C** |
| `AIXIA_P0_META_STRIP_AUTHORITY.md` | 47 | **B** |
| `AIXIA_P0_SCROLL_CLASS_UNIFICATION.md` | 47 | **B** |
| `AIXIA_P0_SHELL_HERO_ENFORCEMENT_PLAN.md` | 47 | **B** |
| `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` | 47 | **B** |
| `AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md` | 47 | **E** |
| `AIXIA_DESIGN_SOURCE_OF_TRUTH_CONFLICT_AUDIT.md` | 47 | **E** |
| `AIXIA_UNIFIED_GLOBAL_DESIGN_FOLDER_AND_CLEANUP_PLAN.md` | 47 | **E** |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md` | 48 | **B** |
| `AIXIA_GLOBAL_PAGE_PATTERNS.md` | 48 | **B** |
| `AIXIA_AI_PAGE_BUILDING_RULES.md` | 48 | **B** (+ read-first fix) |
| `AIXIA_PHASE_2A_GLOBAL_PAGE_SHELL_STANDARD_DECISION.md` | 48 | **E** |

**Coverage gap:** **78/90** files remain **without** the qa-agent authority banner marker (includes batch reports, optional bulk targets, and low-risk inventory docs).

---

## 5. Remaining unbannered authority-risk files

### 5.1 Medium–high risk (Batch 50 Wave A — banner recommended)

Files that still read as **actionable law**, **locked boundaries**, **canonical checklists**, or **wrong baselines** if opened without context.

| File | Risk phrases (sample) | Why risky |
|------|----------------------|-----------|
| `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | “Locked boundary” | Asserts layer ownership rules |
| `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md` | “Canonical command page scroll shell” | Scroll law duplicated from `11` |
| `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md` | “consistent with approved pattern”, checklist as law | QA gate reads as standard |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md` | “migration contract”, wave validation | Process law superseded by `14` |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` | baseline = `AIXIA_PAGE_SHELL_HERO_STANDARD.md` | Routes agents to pre-banner shell doc body |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` | shell parity rules, hero default analysis | Planning with enforceable tone |
| `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md` | finance shell bridge plan | Module wrapper planning |
| `AIXIA_SHARED_COMPONENT_GAP_LIST.md` | “must be implemented before broad page migrations” | Blocking checklist |
| `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md` | read-first cites rulebook + page patterns | Stale read-first chain |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` | “Target SOT”, P0-08 doc triple authority | Living backlog with SOT column |
| `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md` | “unified design authority” problem statement | Pre-global-folder audit |
| `AIXIA_GLOBAL_OWNER_FILES_REVIEW_AND_COLLISION_AUDIT.md` | collision / competing authority | Audit input — dated framing |

### 5.2 Low–medium risk (Batch 50 Wave B — Template A bulk)

| Group | Files | Risk |
|-------|-------|------|
| P0 batch reports (unbannered) | 8 files: `AIXIA_P0_BATCH_1` … `P0_BATCH_8_*` | Execution evidence; “authority”, “canonical” in historical narrative |
| P0 direction | `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md` | Context only |
| Phase reports (unbannered) | 11 files: Phase 1A–2A except shell decision | Execution reports; some “Standard documented” sections |
| Superseded foundation | `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md`, `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md` | Historical; “build rulebook” steps outdated |
| Website inventories | `AIXIA_WEBSITE_STRUCTURE_INVENTORY_REPORT.md`, `AIXIA_FULL_WEBSITE_STRUCTURE_INVENTORY.md` | Non-visual structure — low design-law risk |

### 5.3 Memory mirrors (Batch 50 Wave C — optional Template D)

| File | Risk | Notes |
|------|------|-------|
| `memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` | Low | Batch 44 mirror header — **D optional** for tool detection |
| `memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | Low | Routes to `aixia-global/`; “Non-Negotiable Rules” section = behavior mirror |
| `memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md` | Low | Historical P0 pointers — mirror context |
| `memory/AIXIA_DESIGN_COMPONENT_MEMORY.md` | Low | “Build Order (Locked)” = historical component memory |
| `memory/AIXIA_WEBSITE_STRUCTURE_MEMORY.md` | **None** | Non-visual route inventory — **F** |

### 5.4 Harmless / historical-only (Template F — no banner required)

| Group | Approx. count | Reason |
|-------|---------------|--------|
| `AIXIA_GLOBAL_FOLDER_BATCH_10` … `BATCH_48` reports | ~39 | Self-describing batch execution; cites old terms in audit tables only |
| Batch 45–46 planning reports | 2 | Meta-documentation |
| Batch 49 (this report) | 1 | Scan report |

---

## 6. Classification table (unbannered files with authority-risk language)

| File | Class | Risk | Proposed banner | Target owner(s) | Batch 50 safe? | Body cleanup? | Archive later? |
|------|-------|------|-----------------|-----------------|----------------|---------------|----------------|
| `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` | **B** | Medium–high | B | `07`, `15` | **Yes** | No | Yes |
| `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md` | **B** | Medium | B | `11` | **Yes** | No | Yes |
| `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md` | **B** | Medium | B | `15` | **Yes** | No | Yes |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md` | **B** | Medium | B | `14` | **Yes** | No | Yes |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` | **E** | Medium | E | `03`, `04`, `05`, `16` | **Yes** | No | Yes |
| `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` | **E** | Medium | E | `04`, `13`, `14` | **Yes** | No | Keep |
| `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md` | **E** | Medium | E | `13`, `14` | **Yes** | No | Keep |
| `AIXIA_SHARED_COMPONENT_GAP_LIST.md` | **E** | Medium | E | `06`, `13`, `16` | **Yes** | No | Keep |
| `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md` | **E** | Medium | E | `13`, `16` | **Yes** | **Yes** — scope read-first list | Yes |
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` | **E** | Medium | E | `16` | **Yes** | No | Keep (living) |
| `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md` | **E** | Low–medium | E | `16` | **Yes** | No | Yes |
| `AIXIA_GLOBAL_OWNER_FILES_REVIEW_AND_COLLISION_AUDIT.md` | **E** | Low–medium | E | `16` | **Yes** | No | Keep |
| `AIXIA_P0_BATCH_1` … `P0_BATCH_8_*` (8) | **A** | Low | A | — | **Yes** (bulk) | No | Yes |
| `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md` | **F** | Low | A optional | — | Yes | No | Yes |
| `AIXIA_PHASE_1A` … `PHASE_2A_*` (11 unbannered) | **A** | Low | A | — | **Yes** (bulk) | No | Yes |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md` | **A** | Low | A | — | Yes | No | Yes |
| `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md` | **A** | Low | A | — | Yes | No | Yes |
| `AIXIA_WEBSITE_STRUCTURE_INVENTORY_REPORT.md` | **F** | None | — | — | No | No | Keep |
| `AIXIA_FULL_WEBSITE_STRUCTURE_INVENTORY.md` | **F** | None | — | — | No | No | Keep |
| `memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` | **D** | Low | D optional | `00` | Yes | No | No |
| `memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | **D** | Low | D optional | `00` | Yes | No | No |
| `memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md` | **D** | Low | D optional | `00` | Yes | No | No |
| `memory/AIXIA_DESIGN_COMPONENT_MEMORY.md` | **D** | Low | D optional | `00` | Yes | No | No |
| `memory/AIXIA_WEBSITE_STRUCTURE_MEMORY.md` | **F** | None | — | — | No | No | Keep |
| Batch 10–48 execution reports (~39) | **F** | None | A optional | — | Optional bulk | No | Yes |

---

## 7. Proposed banner type summary (Batch 50)

| Template | Wave A count | Wave B count | Wave C optional |
|----------|--------------|--------------|-----------------|
| **B** — Merged canonical input | 4 | — | — |
| **E** — Planning/audit history | 8 | — | — |
| **A** — Historical report only | — | ~21 (P0 batches + phases + foundation) | ~39 batch reports |
| **D** — Memory mirror only | — | — | 4 design memory files |
| **F** — No banner | 3 inventories + batch meta | — | — |

**No remaining files need Template C** — `AIXIA_PAGE_SHELL_HERO_STANDARD.md` is already covered (Batch 47).

---

## 8. Files safe for Batch 50 banner execution

### Wave A — execute first (12 files, clear list)

1. `AIXIA_P0_SHADCN_BOUNDARY_AUDIT.md` — **B**
2. `AIXIA_P0_CALENDAR_SCROLL_AUDIT.md` — **B**
3. `AIXIA_GLOBAL_VISUAL_QA_CHECKLIST.md` — **B**
4. `AIXIA_GLOBAL_DESIGN_SYSTEM_MIGRATION_PLAN.md` — **B**
5. `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` — **E**
6. `AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` — **E**
7. `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md` — **E**
8. `AIXIA_SHARED_COMPONENT_GAP_LIST.md` — **E**
9. `AIXIA_EXISTING_SHARED_COMPONENT_AUDIT.md` — **E** (+ scope read-first list fix)
10. `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` — **E**
11. `AIXIA_DESIGN_AUTHORITY_CONSOLIDATION_REPORT.md` — **E**
12. `AIXIA_GLOBAL_OWNER_FILES_REVIEW_AND_COLLISION_AUDIT.md` — **E**

### Wave B — bulk Template A (optional same batch or Batch 51)

- 8 × `AIXIA_P0_BATCH_*` reports
- 11 × `AIXIA_PHASE_*` reports (excluding already-bannered shell decision)
- `AIXIA_GLOBAL_DESIGN_SYSTEM_FOUNDATION_REPORT.md`
- `AIXIA_GLOBAL_DESIGN_SYSTEM_NEXT_STEP_PLAN.md`
- `AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md`

### Wave C — optional Template D

- 4 × `memory/AIXIA_*` design memory files (not `WEBSITE_STRUCTURE`)

**Total Batch 50 candidate count:** **12 required** + **21 optional bulk** + **4 optional memory** = up to **37** files.

---

## 9. Files needing manual review

| File | Class | Why manual review |
|------|-------|-------------------|
| `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md` | **G** partial | Living backlog — banner **E** OK but P0-08 row still says “Target SOT: src/design-system”; consider one-line table note in Batch 50, not full rewrite |
| `memory/AIXIA_DESIGN_COMPONENT_MEMORY.md` | **G** partial | “Locked standard” / P0 historical blocks — banner **D** sufficient; optional later thinning |
| `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md` | **G** partial | Body cites shell standard by filename — banner **E** sufficient; optional footnote in Batch 51 |
| Batch 10–48 reports (~39) | **F/G** | Low ROI for individual banners — **bulk Template A optional** only if Piter wants 100% marker coverage |

**No file requires blocking manual review before Wave A banners** — list is clear enough for Batch 50 execution.

---

## 10. Cleanup map recommendation (report only — `16` not edited)

After Batch **50** banner execution, update `src/design-system/aixia-global/16-design-file-cleanup-map.md`:

| Section | Recommended update |
|---------|-------------------|
| §4.1 | Add **Banner (Batch 50)** column or gate notes for Wave A files (P0 audits, checklist, migration plan, parity, gap list, consolidation backlog, etc.) |
| §4.2 memory | Note Template **D** optional on 4 design memory files |
| §6 C1 | “Batch 50 — Wave A qa-agent banners (12 files); Wave B bulk optional; memory mirrors optional” |
| §7 | Add step **21**: Batch 49 scan (done); step **22**: Batch 50 banner execution (pending) |
| Archive grouping | Group Wave A+B bannered qa-agent docs as **archive-later candidates** — still **no archive/delete** until dependency grep + Piter approval |

**Do not** mark any file archived/deleted in Batch 50 planning.

---

## 11. What was not changed

- No qa-agent authority doc edits
- No banners added
- No archive, delete, or move
- `16-design-file-cleanup-map.md` unchanged (report-only recommendation)
- App code, CSS, components, pages, guardrails, package scripts, Hermes, MCP, Supabase untouched

---

## 12. Recommended next batch

**Batch 50 — remaining qa-agent banner execution (Wave A — 12 files)**

Clear file list from §8. Use Batch 46/47/48 banner templates with marker `AIXIA-QA-AGENT-AUTHORITY-BANNER`. Optional same batch: Wave B bulk Template **A** (21 files) and Wave C memory Template **D** (4 files) if Piter approves scope.

**Do not recommend:**

- Page migration
- AgentOps History migration
- Finance shell proofs (Batch 9)
- Command-surface context
- CSS split
- Archive execution
- Deletion
- Guardrail hard-error escalation

**Alternate if Piter narrows scope:** Batch 50 Wave A only (12 files); defer Wave B/C to Batch 51.

---

## 13. Confirmation — page migrations remain paused

**Yes.** Owner `14`, memory mirrors, consolidation backlog policy, and all batch reports unchanged on migration gates.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **Not run** — scan only |

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `AIXIA_GLOBAL_FOLDER_BATCH_49_REMAINING_QA_AGENT_AUTHORITY_RISK_SCAN.md` |
| 2 | Files modified | **None** |
| 3 | qa-agent authority scan completed | **Yes** |
| 4 | Remaining unbannered risk files identified | **Yes** |
| 5 | Classification table created | **Yes** |
| 6 | Batch 50 candidate file list created | **Yes** (12 required + 21/4 optional) |
| 7 | Code changed | **No** |
| 8 | CSS changed | **No** |
| 9 | Pages changed | **No** |
| 10 | Components changed | **No** |
| 11 | Guardrail scripts changed | **No** |
| 12 | Package scripts changed | **No** |
| 13 | Hermes runtime config changed | **No** |
| 14 | AgentMemory server started | **No** |
| 15 | Old files moved/deleted/archived | **No** |
| 16 | Banners added | **No** |
| 17 | Page migrations remain paused | **Yes** |
| 18 | Batch 9 finance proofs paused | **Yes** |
| 19 | Command-surface context paused | **Yes** |
| 20 | Command results | `qa:validate-foundation` PASS |
| 21 | Final status | **Batch 49 COMPLETE** |
| 22 | Recommended next batch | **Batch 50 — Wave A qa-agent banner execution (12 files)** |

---

*End of Batch 49 scan.*
