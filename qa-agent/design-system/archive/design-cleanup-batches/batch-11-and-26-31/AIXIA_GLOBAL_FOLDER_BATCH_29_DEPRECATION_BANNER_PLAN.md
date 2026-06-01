# AiXia Global Folder — Batch 29 Deprecation Banner Plan

**Date:** 2026-05-30  
**Type:** Documentation/planning only — **no banners added, no old-doc edits, no code/CSS/component/page/guardrail changes, no moves/deletes.**

---

## 1. Purpose

Batch 28 aligned guardrail citations to `src/design-system/aixia-global/` owner files with zero behavior change. **Batch 29** plans exactly which deprecation/wrapper banners old `src/design-system/*.md` files need, what each banner must say, approval gates, and the safe execution batch — **without adding banners yet**.

**Mandatory end state (unchanged):** ONE STANDARD · ONE OWNER PER ASPECT · ONE GLOBAL DESIGN FOLDER · NO COMPETING DESIGN AUTHORITIES. Active visual law lives only in `src/design-system/aixia-global/` (`00`–`16`).

---

## 2. Files audited

### Authority / prior batch inputs (read)

| # | Path |
|---|------|
| 1–4 | `aixia-global/00`, `14`, `15`, `16` |
| 5 | `src/design-system/README.md` |
| 6–9 | Batch 26–28 reports + collision audit |

### Old files under `src/design-system/` (excluding `aixia-global/`)

| # | File | Lines (approx.) | Audited |
|---|------|-----------------|---------|
| 1 | `README.md` | 120 | Yes |
| 2 | `aixia-design-principles.md` | 58 | Yes |
| 3 | `aixia-page-patterns.md` | 313 | Yes |
| 4 | `aixia-component-rules.md` | 193 | Yes |
| 5 | `aixia-table-rules.md` | 58 | Yes |
| 6 | `aixia-form-rules.md` | 76 | Yes |
| 7 | `aixia-navigation-rules.md` | 31 | Yes |
| 8 | `aixia-archive-rules.md` | 153 | Yes |
| 9 | `aixia-conflict-deprecation-policy.md` | 38 | Yes |
| 10 | `aixia-migration-checklist.md` | 464 | Yes |
| 11 | `aixia-migration-watch-registry.md` | 382 | Yes |
| 12 | `aixia-refresh-rules.md` | 44 | Yes |
| 13 | `aixia-permission-ui-rules.md` | 33 | Yes |
| 14 | `aixia-finance-workflow-registry-contract.md` | 79 | Yes |

**Total:** 14 files (13 legacy `.md` + wrapper `README.md`). No other files exist directly under `src/design-system/` outside `aixia-global/`.

---

## 3. Current old-file risk summary

| Risk | Files | Why |
|------|-------|-----|
| **Critical — competing authority** | `aixia-component-rules.md`, `aixia-page-patterns.md`, `aixia-finance-workflow-registry-contract.md` | Read as active operational/module law; long sign-off blocks; `page-patterns` cites qa-agent doc as **override**; finance contract opens with **"Single source of truth"** |
| **High — duplicate visual law** | `aixia-design-principles.md` | Global typography/card lanes + finance-specific locked wording; overlaps `00`/`01`/`02`/`06` |
| **Medium — duplicate aspect rules** | `aixia-table-rules.md`, `aixia-form-rules.md`, `aixia-navigation-rules.md`, `aixia-archive-rules.md` | Substantively agree with owners `08`/`09`/`12`/`07`/`10` but lack banners; AI may treat as parallel law |
| **Medium — process overlap** | `aixia-migration-checklist.md`, `aixia-conflict-deprecation-policy.md` | Duplicate migration/deprecation process vs `14`/`15`/`16` |
| **Low — tracker wording** | `aixia-migration-watch-registry.md` | Opening claims **"single source for migration-watch planning"** — process tracker, not visual law, but confusing vs `14` |
| **Minimal — already wrapper** | `README.md` | Batch 26 delegation wrapper; low risk if left as-is; formal banner optional for consistency |
| **Minimal — behavior only** | `aixia-refresh-rules.md`, `aixia-permission-ui-rules.md` | Non-visual behavior; still need **behavior reference** banner so they are not mistaken for layout law |

**Guardrail state (post–Batch 28):** Scripts cite `aixia-global/` owners. Old `src/design-system/*.md` files are **not** cited by guardrails — human/AI reading risk remains the primary gap.

---

## 4. Banner type definitions

| Type | Code | When to use | Banner intent |
|------|------|-------------|---------------|
| **Global delegation wrapper** | **A** | Entry/navigation files that delegate to `aixia-global/00` | This file routes readers to canonical authority; not visual law |
| **Reference only — merged into owner files** | **B** | Useful content absorbed into `aixia-global/` owners; file kept for history/lookup | Do not treat as active law; read owners instead |
| **Tracker only** | **C** | Living debt/MW registry; tracks status, does not define visual standards | MW items are debt records under `14`, not new design rules |
| **Behavior reference only** | **D** | Non-visual behavior (refresh, permissions) | Governs behavior only; visual law still in `aixia-global/` |
| **Deprecated — competing authority** | **E** | Files that read like active competing law today | Explicit downgrade; highest visibility banner |
| **Delete/archive later after merge** | **F** | Eventual archive/delete candidate after merge + approval | Banner notes archive path; no deletion in banner batch |

**Placement rule (Batch 30 execution):** Insert banner as the **first content** in each file (after optional YAML front matter if ever added), before the existing `#` title. Use a consistent HTML comment + markdown block so search/tools can detect `AIXIA-DEPRECATION-BANNER`.

---

## 5. Exact banner templates

### Template A — GLOBAL DELEGATION WRAPPER

```markdown
<!--
AIXIA-DEPRECATION-BANNER
type: global-delegation-wrapper
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Governance wrapper — not visual design law**
>
> This file **delegates** to the AiXia global design authority. It does **not** define active visual standards.
>
> **Canonical design law:** `src/design-system/aixia-global/` owner files **`00`–`16`** only.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Add or change rules only in the relevant `aixia-global/` owner file (per `00` §0.2).
> - Read first: [`aixia-global/00-README-SOURCE-OF-TRUTH.md`](aixia-global/00-README-SOURCE-OF-TRUTH.md)
>
> **Role:** navigation / delegation wrapper only.
```

### Template B — REFERENCE ONLY — MERGED INTO OWNER FILES

```markdown
<!--
AIXIA-DEPRECATION-BANNER
type: reference-only-merged
canonical: src/design-system/aixia-global/
owner-files: {{OWNER_FILE_LIST}}
-->

> **Reference only — merged into global owner files**
>
> This file is **not** the active design source-of-truth. Its useful content has been merged (or is being merged) into:
>
> {{OWNER_FILE_BULLETS}}
>
> **Canonical design law:** `src/design-system/aixia-global/` only.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Update the owner file(s) above, then `16-design-file-cleanup-map.md`.
> - Do not cite this file as current visual authority in code, guardrails, or AI prompts.
>
> **Role:** historical / lookup reference until wrapper conversion or archive.
```

*Batch 30 replaces `{{OWNER_FILE_LIST}}` / `{{OWNER_FILE_BULLETS}}` per file.*

### Template C — TRACKER ONLY

```markdown
<!--
AIXIA-DEPRECATION-BANNER
type: tracker-only
canonical: src/design-system/aixia-global/14-page-migration-rules.md
-->

> **Migration tracker only — not visual design law**
>
> This file tracks **MW-###** migration-watch debt and status. It does **not** define visual standards.
>
> **Process owner:** [`14-page-migration-rules.md`](aixia-global/14-page-migration-rules.md)  
> **Cleanup disposition:** [`16-design-file-cleanup-map.md`](aixia-global/16-design-file-cleanup-map.md)
>
> - **Do not add new visual design rules here.** Add MW items for debt tracking only.
> - New visual law belongs in `aixia-global/` owner files `01`–`15`.
> - If tracker notes conflict with `aixia-global/`, **`aixia-global/` wins** for visual law; update MW status to match.
>
> **Role:** living debt registry under owner file `14`.
```

### Template D — BEHAVIOR REFERENCE ONLY

```markdown
<!--
AIXIA-DEPRECATION-BANNER
type: behavior-reference-only
canonical: src/design-system/aixia-global/13-module-wrapper-rules.md
-->

> **Behavior reference only — not visual design law**
>
> This file describes **non-visual behavior** (refresh, permissions, etc.). It must **not** be read as layout, typography, shell, hero, card, table, or component visual authority.
>
> **Visual design law:** `src/design-system/aixia-global/` owner files **`01`–`13`** (as applicable).  
> **Module/behavior context:** [`13-module-wrapper-rules.md`](aixia-global/13-module-wrapper-rules.md) where relevant.
>
> - If this file conflicts with `aixia-global/` on **visual** matters, **`aixia-global/` wins.**
> - **Do not add new visual rules here.** Behavior-only additions require Piter approval and a note in `14` or `16`.
>
> **Role:** behavior reference (silent refresh / permission UI presentation scope).
```

### Template E — DEPRECATED — COMPETING AUTHORITY

```markdown
<!--
AIXIA-DEPRECATION-BANNER
type: deprecated-competing-authority
canonical: src/design-system/aixia-global/
owner-files: {{OWNER_FILE_LIST}}
-->

> **⚠ DEPRECATED — do not use as design law**
>
> This file **must not** be treated as active AiXia design authority. It previously read as competing or module-specific law and is **deprecated** as a standards source.
>
> **Canonical design law:** `src/design-system/aixia-global/` owner files **`00`–`16`** only. Read instead:
>
> {{OWNER_FILE_BULLETS}}
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new rules here.** Do not extend sign-off blocks, locked sections, or module contracts in this file.
> - Historical sign-offs and batch notes below are **records only**, not approval to bypass global owners.
>
> **Role:** deprecated canonical input — retained until merge verification and Piter-approved archive/delete.
```

### Template F — DELETE/ARCHIVE LATER (supplement to B or E)

Add this block **below** Template B or E banner when file is an archive candidate:

```markdown
> **Future disposition:** After owner merge is verified and Piter approves, this file will be **archived or deleted** per [`16-design-file-cleanup-map.md`](aixia-global/16-design-file-cleanup-map.md). Do not expand content before then.
```

---

## 6. File-by-file banner classification table

| File | Current role | Risk | Banner type | Owner file(s) to cite | Merge first? | Banner after approval? | Piter approval? | Archive/delete later? |
|------|--------------|------|-------------|------------------------|--------------|--------------------------|-----------------|----------------------|
| `README.md` | Delegation wrapper (Batch 26) | Minimal | **A** | `00`, `16` | No — wrapper done | Yes — optional light **A** for consistency | Yes (Batch 30) | No — keep as entry |
| `aixia-design-principles.md` | Global principles + finance lanes | High | **B** + **F** | `00`, `01`, `02`, `06` | **Mostly done** in owners; body has stale finance locks | Yes | Yes | Likely archive after merge verify |
| `aixia-page-patterns.md` | Page types, locked finance header, qa-agent override | **Critical** | **E** + **F** | `03`, `04`, `06`, `12`, `14` | **Partial** — remove qa-agent override block when banner added (same batch OK) | Yes | Yes | Archive after merge verify |
| `aixia-component-rules.md` | Multi-aspect operational law + MW sign-offs | **Critical** | **E** + **F** | `06`, `07`, `08`, `09`, `10`, `13`, `14` | **Mostly done** in owners; MW blocks stay as history | Yes | Yes | Archive after merge verify |
| `aixia-table-rules.md` | Table/registry density rules | Medium | **B** + **F** | `08` | **Done** in `08-table-list-standard.md` | Yes | Yes | Archive later |
| `aixia-form-rules.md` | Form/date/MW-024 rules | Medium | **B** + **F** | `09` | **Done** in `09-form-input-standard.md` (MW wording may differ) | Yes | Yes | Archive later |
| `aixia-navigation-rules.md` | Nav/workspace/parent pill | Medium | **B** + **F** | `12` | **Done** in `12-navigation-workspace-standard.md` | Yes | Yes | Archive later |
| `aixia-archive-rules.md` | Archive modal + row actions | Medium | **B** + **F** | `07`, `10` | **Done** in owners | Yes | Yes | Archive later |
| `aixia-conflict-deprecation-policy.md` | Safe deletion process | Medium | **B** | `14`, `15`, `16` | **Mostly done** in `14`/`15`/`16` | Yes | Yes | Keep as process wrapper or archive |
| `aixia-migration-checklist.md` | Migration pass/fail checklist | Medium | **B** + **F** | `14` | **Done** in `14-page-migration-rules.md` | Yes | Yes | Archive later |
| `aixia-migration-watch-registry.md` | MW-### living tracker | Low–medium | **C** | `14`, `16` | N/A — tracker stays | Yes | Yes | Keep as tracker under `14` |
| `aixia-refresh-rules.md` | Silent refresh behavior | Minimal | **D** | `13` (+ `14` for migration context) | N/A — behavior not visual | Yes | Yes | Keep |
| `aixia-permission-ui-rules.md` | Permission UI presentation | Minimal | **D** | `13` | N/A — behavior not visual | Yes | Yes | Keep |
| `aixia-finance-workflow-registry-contract.md` | Finance registry composition law | **Critical** | **E** + **F** | `08`, `13`, `14` | **Partial** — generalize finance-only contract to global registry pattern in owners (future); banner first | Yes | Yes | Archive after generalization |

---

## 7. Files safe to banner later (Batch 30, after Piter approval)

All **14** files can receive banners in **one documentation-only execution batch** once approved — **no app source changes required**.

**Safest first (lowest body-edit risk):**

1. `README.md` — Template **A** (optional; body already correct)
2. `aixia-refresh-rules.md` — Template **D**
3. `aixia-permission-ui-rules.md` — Template **D**
4. `aixia-migration-watch-registry.md` — Template **C**
5. `aixia-table-rules.md`, `aixia-form-rules.md`, `aixia-navigation-rules.md`, `aixia-archive-rules.md` — Template **B** + **F**

**Require prominent Template E (competing authority):**

6. `aixia-component-rules.md`
7. `aixia-page-patterns.md`
8. `aixia-finance-workflow-registry-contract.md`

**Medium priority:**

9. `aixia-design-principles.md` — **B** + **F**
10. `aixia-conflict-deprecation-policy.md` — **B**
11. `aixia-migration-checklist.md` — **B** + **F**

**Recommended same-batch body touch (still doc-only, not required for banner):**

- `aixia-page-patterns.md` — delete or strike the blockquote citing `AIXIA_PAGE_SHELL_HERO_STANDARD.md` as **override** (lines 3–4 today); replace with pointer to `03`/`04`/`05`

---

## 8. Files needing merge before banner (strict vs practical)

| File | Target owner(s) | Content to merge / status | Merge done? | Banner before merge? |
|------|-----------------|---------------------------|-------------|----------------------|
| `aixia-design-principles.md` | `00`, `01`, `02`, `06` | Principles, typography lanes, card law, evolution rule | **Yes** in owners Batches 11–25 | **Yes** — banner downgrades file immediately |
| `aixia-page-patterns.md` | `03`, `04`, `06`, `12`, `14` | Page types, shell, hero, finance locked header, responsive gate | **Yes** in owners; **stale** qa-agent override + finance lock remain in body | **Yes** — banner + remove override block in Batch 30 |
| `aixia-component-rules.md` | `06`–`10`, `13`, `14` | Component composition, workflow registry, MW sign-offs | **Yes** in owners; body is operational duplicate | **Yes** — banner; body cleanup optional later |
| `aixia-table-rules.md` | `08` | Density, variants, lifecycle row actions | **Yes** | **Yes** |
| `aixia-form-rules.md` | `09` | Date picker, `AixiaFormDateField`, MW-024 | **Yes** (owner may be more current than MW wording here) | **Yes** |
| `aixia-navigation-rules.md` | `12` | Parent pill, workspace cards | **Yes** | **Yes** |
| `aixia-archive-rules.md` | `07`, `10` | Modal tabs, archive row buttons | **Yes** | **Yes** |
| `aixia-conflict-deprecation-policy.md` | `14`, `15`, `16` | 8-step deprecation process | **Yes** in `16` + `15` §8H | **Yes** |
| `aixia-migration-checklist.md` | `14` | Full migration checklist | **Yes** in `14` §7–§12 | **Yes** |
| `aixia-finance-workflow-registry-contract.md` | `08`, `13`, `14` | Workflow registry panel composition; finance-only scope table | **Partial** — global registry pattern in `08`/`13`; finance route table is module debt record | **Yes** — **E** banner now; **generalize contract** in a later approved batch before archive |

**Conclusion:** No file **must** block Batch 30 banners waiting for a merge batch. Owner files **`01`–`15` already exist**. Remaining work is **downgrade visibility** (banner) and optional **body deduplication** afterward.

---

## 9. Files that should become tracker / behavior / reference only

| File | Target role after banners |
|------|---------------------------|
| `aixia-migration-watch-registry.md` | **Tracker only (C)** — MW-### under `14` |
| `aixia-refresh-rules.md` | **Behavior reference (D)** |
| `aixia-permission-ui-rules.md` | **Behavior reference (D)** |
| `aixia-conflict-deprecation-policy.md` | **Process reference (B)** until merged fully into `16` |
| `aixia-table-rules.md`, `aixia-form-rules.md`, `aixia-navigation-rules.md`, `aixia-archive-rules.md`, `aixia-migration-checklist.md`, `aixia-design-principles.md` | **Reference only (B)** |
| `README.md` | **Delegation wrapper (A)** |
| `aixia-component-rules.md`, `aixia-page-patterns.md`, `aixia-finance-workflow-registry-contract.md` | **Deprecated competing authority (E)** until archive |

---

## 10. Files likely to archive/delete later (after approval)

Per `16-design-file-cleanup-map.md` §4.3 gates: **After merge into owner file + Piter approval** (not before).

| File | Likely end state | Gate |
|------|------------------|------|
| `aixia-page-patterns.md` | Archive | Merge verify + banner sustained |
| `aixia-component-rules.md` | Archive | Merge verify + MW extracted to qa-agent archive if needed |
| `aixia-design-principles.md` | Archive | Merge verify |
| `aixia-table-rules.md` | Archive | Merge verify |
| `aixia-form-rules.md` | Archive | Merge verify |
| `aixia-navigation-rules.md` | Archive | Merge verify |
| `aixia-archive-rules.md` | Archive | Merge verify |
| `aixia-migration-checklist.md` | Archive | Subsumed by `14` |
| `aixia-conflict-deprecation-policy.md` | Archive or thin wrapper | Subsumed by `16` |
| `aixia-finance-workflow-registry-contract.md` | Archive after generalization | Finance table → `14` debt notes |
| `README.md` | **Keep** | Permanent delegation entry |
| `aixia-migration-watch-registry.md` | **Keep** until all MW closed | Then fold into `14` or qa-agent archive |
| `aixia-refresh-rules.md`, `aixia-permission-ui-rules.md` | **Keep** as behavior refs | Not visual law |

**Deletion:** Not recommended in Batch 30 or near-term batches. Archive-first per `aixia-conflict-deprecation-policy.md` / `16`.

---

## 11. Remaining risks

| Risk | Mitigation |
|------|------------|
| AI ignores banner and reads body sign-offs as law | Template **E** + guardrail future rule (Batch 27 Stage 4) to flag new law outside `aixia-global/` |
| `page-patterns` qa-agent override blockquote | Remove in Batch 30 when banner inserted |
| Finance contract **"Single source of truth"** title | Template **E** replaces semantic authority; consider retitling body H1 in Batch 30 (wording only) |
| MW/registry cross-links between old files | Keep links; banners clarify they are historical cross-refs |
| Owner file `15` §3 audit table still describes pre–Batch 28 citations | Optional doc refresh batch (not blocking banners) |
| `AIXIA_STANDARD.md` in components folder | Out of scope for this plan; separate banner batch later |
| qa-agent superseded law docs | Separate plan under `16` §4.1 (not `src/design-system/` scope) |

---

## 12. Recommended next batch

### **Batch 30 — Add deprecation/wrapper banners (execution)**

**Scope (after Piter approval):**

1. Insert banners per §6 table using §5 templates (docs only).
2. Optional same-batch: remove `page-patterns` qa-agent override blockquote; retitle finance contract H1 if it still says "Single source of truth".
3. Update `16-design-file-cleanup-map.md` §4.3 banner status column (doc note only).
4. Run `npm run qa:validate-foundation` only (no build unless app source touched).

**Do not in Batch 30:** page migration, finance shell proofs, command-surface, CSS split, deletion, guardrail escalation, allowlist changes.

### Alternate Batch 30 (only if Piter prefers merge-first)

**Batch 30 — Body deduplication pass** for `page-patterns` + `component-rules` (remove override/sign-off blocks, leave banners) — still doc-only, higher edit risk. **Not required** before banners per §8.

**Do not recommend yet:** page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, old-file deletion, guardrail hard-error escalation.

---

## 13. Confirmation: page migrations remain paused

| Area | Status |
|------|--------|
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |
| Old-file deletion | **Paused** |
| Deprecation banners | **Planned only — not executed in Batch 29** |

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
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_29_DEPRECATION_BANNER_PLAN.md` |
| 2 | Files modified | **None** |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Guardrail scripts changed | **No** |
| 7 | Package scripts changed | **No** |
| 8 | Old files moved/deleted | **No** |
| 9 | Deprecation banners added | **No** |
| 10 | Old `src/design-system/*.md` files audited | **Yes** (14 files) |
| 11 | Banner templates created | **Yes** (§5 — types A–F) |
| 12 | File-by-file banner plan created | **Yes** (§6) |
| 13 | Files needing merge before banner identified | **Yes** (§8 — none block banners) |
| 14 | Page migrations remain paused | **Yes** |
| 15 | Batch 9 finance proofs paused | **Yes** |
| 16 | Command-surface context paused | **Yes** |
| 17 | Command results | `qa:validate-foundation` → **PASS** |
| 18 | Final status | **Batch 29 complete — plan only** |
| 19 | Recommended next batch | **Batch 30 — add banners per this plan after Piter approval** |

---

*End of Batch 29 report.*
