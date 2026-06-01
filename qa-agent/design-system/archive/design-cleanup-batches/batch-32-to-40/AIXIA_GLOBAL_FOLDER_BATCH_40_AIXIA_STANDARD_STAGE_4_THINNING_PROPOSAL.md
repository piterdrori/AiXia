# AiXia Global Design System — Batch 40 — AIXIA_STANDARD Stage 4 Thinning Proposal

**Date:** 2026-05-30  
**Scope:** Documentation / planning only — **Stage 4 not executed**  
**Predecessor:** Batch 39 Stage 3 (secondary check = banner + legacy-reference only)  
**Target execution batch:** Batch 41 (requires Piter approval)

---

## 1. Purpose

Batch 39 removed the build-time **13-phrase dependency** on `src/components/aixia/AIXIA_STANDARD.md`. The file still contains a **duplicated canonical law table**, **full appendix phrase sections**, and **outdated guardrail wording** (e.g. “guardrail phrase sync”) that are no longer required for build or primary phrase coverage.

Batch 40 defines **exactly** what Batch 41 may remove and what must remain in a thin legacy implementation reference — without editing any files in this batch.

---

## 2. Current post-Stage-3 state

| Aspect | Status |
|--------|--------|
| Primary phrase check | `inspectGlobalOwnerPhraseAnchors()` → `aixia-global/` **13/13** |
| Secondary check | `inspectSharedStandardDocument()` → existence + 3 banner strings |
| 13 phrases in `AIXIA_STANDARD.md` | **Not build-gated** (removed Batch 39) |
| `AIXIA_STANDARD.md` edited since Batch 32 | **No** (appendix still present) |
| Build | **PASS**, 0 hard errors, ~195 warnings (unchanged) |
| Static findings | **185** |
| Page migrations / finance proofs / command-surface | **Paused** |

**Secondary guardrail required strings (must survive Batch 41 thin edit):**

1. `AIXIA-DEPRECATION-BANNER`
2. `type: legacy-implementation-reference`
3. `Legacy implementation reference`

All three exist today in lines 1–18 of `AIXIA_STANDARD.md`.

---

## 3. Current `AIXIA_STANDARD.md` section audit

| Section | Lines | Class | Rationale |
|---------|-------|-------|-----------|
| HTML comment `AIXIA-DEPRECATION-BANNER` block | 1–6 | **A — MUST KEEP** | Guardrail check #1; canonical pointer metadata |
| Blockquote deprecation banner | 8–18 | **A — MUST KEEP** | Guardrail checks #2–#3; core non-law messaging |
| H1 `AiXia Component Index…` | 20 | **A — MUST KEEP** (retitle in Batch 41) | File identity; propose new title in §7 |
| Batch 32 status note | 22 | **B — SAFE TO REMOVE** (replace) | Says “guardrail phrase sync” — **obsolete after Batch 39**; replace with Stage 4 status |
| `## Canonical design law (read these first)` table | 24–45 | **B — SAFE TO REMOVE** | Fully duplicated by `00`–`16`; agents should read `00` |
| Historical qa-agent footnote | 47 | **B — SAFE TO REMOVE** | Backlog pointer; not needed in thin file |
| `## Superseded rules (do not implement)` | 49–56 | **C — KEEP TEMPORARILY** | Useful anti-pattern guard against orb/hero regression; law also in `03`/`04` |
| `## Shared implementation source` | 58–63 | **A — MUST KEEP** | Implementation paths not duplicated in one owner file |
| `## Component quick index` | 65–82 | **A — MUST KEEP** | Practical agent index beside components |
| `## Finance rewrite discipline` | 84–91 | **C — KEEP TEMPORARILY** | Overlaps `13`/`14`; still useful for finance-adjacent agents |
| `## Appendix — Guardrail phrases` intro | 95–97 | **B — SAFE TO REMOVE** | **Incorrect** — says phrases satisfy guardrail checks; false post–Batch 39 |
| Appendix `### Source of truth` … `### GLOBAL AIXIA FONT…` | 99–140 | **B — SAFE TO REMOVE** | Duplicated in owner anchors; **not build-gated** |

### Class summary

| Class | Count (sections) | Batch 41 action |
|-------|------------------|-----------------|
| **A — MUST KEEP** | Banner, paths, component index | Preserve (update wording only where noted) |
| **B — SAFE TO REMOVE** | Law table, appendix, obsolete status/intro | Delete in Batch 41 |
| **C — KEEP TEMPORARILY** | Superseded rules, finance discipline | Keep in Batch 41; optional remove in Batch 42+ after agent routing stable |
| **D — NEEDS OWNER VERIFICATION** | None blocking — superseded rules covered by `03`/`04`/`13` | Optional later trim only |

---

## 4. Sections to keep (Batch 41 thin file)

### Required for guardrails (exact strings)

- Lines 1–6: `AIXIA-DEPRECATION-BANNER` comment block (update inner prose only if strings preserved)
- Lines 8–18: blockquote containing `Legacy implementation reference`, `type: legacy-implementation-reference` context, link to `00`

### Required for implementation reference role

- Shared implementation source paths (components, CSS, finance bridge, process book)
- Component quick index table
- Finance command shell pointer (`AixiaFinanceCommandCreatePage` / `DetailPage`)

### Recommended to keep in Batch 41 (class C)

- Superseded rules (orb/hero anti-patterns)
- Finance rewrite discipline (4 bullets + one-line owner pointer)

---

## 5. Sections safe to remove later (Batch 41)

| Remove | Lines | Reason |
|--------|-------|--------|
| Batch 32 status note (replace, not blank) | 22 | Obsolete “phrase sync” wording |
| `## Canonical design law (read these first)` + table | 24–45 | Owned by `aixia-global/00`–`16` |
| Historical qa-agent footnote | 47 | Not needed in thin bridge |
| `---` before appendix | 93 | Structural |
| Entire `## Appendix — Guardrail phrases` through EOF | 95–140 | Not build-gated; phrases live in owner files |

**Estimated size reduction:** ~55 lines removed (~40% of file).

---

## 6. Sections to keep temporarily (optional later trim)

| Section | Keep through Batch 41 because | Later removal gate |
|---------|--------------------------------|--------------------|
| Superseded rules | Prevents reintroduction of orb/gradient hero patterns | After `04`/`14` migration maturity + agent memory update |
| Finance rewrite discipline | Common agent entry path for finance pages | After `13`/`14` cited in memory/Hermes |

---

## 7. Target thin-file structure (proposal — not applied)

```markdown
<!--
AIXIA-DEPRECATION-BANNER
type: legacy-implementation-reference
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
owner-files: src/design-system/aixia-global/01-design-tokens.md through 16-design-file-cleanup-map.md
-->

> **Legacy implementation reference — not active design law**
> … [preserve required guardrail strings from current banner] …
> … [update: guardrails check banner/existence only; phrase law in owner files] …

# AiXia Component Implementation Reference — Legacy Bridge

> **Status (Batch 41):** Not active design law. Canonical law: `src/design-system/aixia-global/` `00`–`16`. Guardrails: primary phrase coverage reads owner files; this file is secondary banner/existence check only.

## Design law (read owner files — not this file)

- Authority root: [00-README-SOURCE-OF-TRUTH.md](…)
- Full owner map: [16-design-file-cleanup-map.md](…) §2 or inline link to `00` reading order
- Do not add design rules here.

## Shared implementation source

- [unchanged paths from current § Shared implementation source]

## Component quick index

- [unchanged table from current § Component quick index]

## Superseded rules (do not implement)

- [unchanged bullets from current § Superseded rules]

## Finance rewrite discipline

- [unchanged 4 bullets + owner pointer line]

## Guardrail compatibility

- Primary phrase coverage: `scripts/aixia-guardrails.mjs` → `inspectGlobalOwnerPhraseAnchors()` → `aixia-global/` owner phrase anchors (13/13).
- Secondary check on this file: `AIXIA-DEPRECATION-BANNER`, `type: legacy-implementation-reference`, `Legacy implementation reference` wording only.
- Manual coverage report: `node scripts/guardrails/aixia-owner-phrase-coverage-report.mjs`

## Archive / deletion gate

- Not archive-ready. Requires: Hermes manifest update, qa-agent memory alignment, stable builds, `16` §5 gates, Piter approval.
```

**Explicitly absent in thin file:** canonical law table (00–16 duplicate), appendix phrase sections, “guardrail phrase sync” claims.

---

## 8. Exact future edit plan — Batch 41 execution

**Do not execute in Batch 40.**

### 8.1 Files to touch

| File | Action |
|------|--------|
| `src/components/aixia/AIXIA_STANDARD.md` | Thin content per §8.2 |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | Update §4.4, §7 step 13 |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_41_AIXIA_STANDARD_STAGE_4_EXECUTION_REPORT.md` | Create |

**Do not touch:** `scripts/aixia-guardrails.mjs`, `package.json`, pages, CSS, components, allowlists.

### 8.2 Exact edits to `AIXIA_STANDARD.md`

**Step 1 — Preserve banner comment block (lines 1–6)**  
Keep `AIXIA-DEPRECATION-BANNER`, `type: legacy-implementation-reference`, `canonical:`, `owner-files:` unchanged.

**Step 2 — Update blockquote (lines 8–18)**  
- Keep: `Legacy implementation reference`, `not active design law`, `aixia-global/` wins, link to `00`, link to `16`.  
- **Change** line 12 from “legacy phrase sync” to: guardrails inspect this file for **banner/existence compatibility only**; phrase law is in owner files.  
- **Change** future disposition line to note Stage 4 thinned.

**Step 3 — Replace H1 (line 20)**  
From: `# AiXia Component Index (Legacy Implementation Reference)`  
To: `# AiXia Component Implementation Reference — Legacy Bridge`

**Step 4 — Replace status note (line 22)**  
Remove “guardrail phrase sync reference”. State Batch 41 thinned file; secondary guardrail = banner markers only.

**Step 5 — DELETE lines 24–47 inclusive**  
Remove entire `## Canonical design law` table and historical qa-agent footnote.

**Step 6 — KEEP lines 49–91** (Superseded rules, Shared implementation source, Component quick index, Finance rewrite discipline) with optional one-line tweak to line 91 (remove “Deprecated reference copies…” if desired — **optional**, not required).

**Step 7 — DELETE lines 93–140 inclusive**  
Remove horizontal rule before appendix and entire `## Appendix — Guardrail phrases` section.

**Step 8 — ADD new sections before EOF**  
Insert `## Guardrail compatibility` and `## Archive / deletion gate` per §7 template.

### 8.3 `16-design-file-cleanup-map.md` updates (Batch 41)

- **§4.4:** Stage 4 thinned; secondary banner check only; not archive-ready.  
- **§7:** Add step 13 — Stage 4 appendix/law table removed (Batch 41).

### 8.4 Optional follow-up (not Batch 41)

- Update `aixia-owner-phrase-coverage-report.mjs` footer note (wording only).  
- Hermes manifest + memory mirrors (Batch 42 doc batch).

---

## 9. Future validation plan (Batch 41)

### Before edit — record baseline

```bash
node scripts/guardrails/aixia-owner-phrase-coverage-report.mjs
npm run qa:validate-foundation
npm run qa:static-design-guardrails
npm run qa:guardrail-action-plan
npm run build
```

Record: owner 13/13, static 185, hard errors 0, warning count ~195, legacy/banner warnings 0.

### After edit — same commands

| Metric | Expected |
|--------|----------|
| Owner coverage | 13/13 PASS |
| `qa:validate-foundation` | PASS |
| Static findings | 185 |
| Build | PASS |
| Hard errors | 0 |
| Banner/reference warnings | 0 (required strings preserved in banner) |
| New warnings vs baseline | 0 delta |
| Package scripts | unchanged |

### Negative test (optional local branch)

Remove `AIXIA-DEPRECATION-BANNER` temporarily → expect 1–3 legacy-scope warnings, 0 hard errors. Revert before commit.

---

## 10. Rollback plan (Batch 41)

1. `git checkout HEAD -- src/components/aixia/AIXIA_STANDARD.md`  
2. If cleanup map edited: `git checkout HEAD -- src/design-system/aixia-global/16-design-file-cleanup-map.md`  
3. Run full validation suite (§9).  
4. Confirm banner + appendix restored; 0 banner warnings; owner 13/13.  
5. No database/schema rollback required.

---

## 11. Cleanup map future update recommendation

**Do not edit `16` in Batch 40.**

When Batch 41 executes, update:

| Location | Proposed text intent |
|----------|---------------------|
| §4.4 class/action | **Thinned legacy implementation reference** (not full index + appendix) |
| §4.4 status | Batch 41 Stage 4 done; law table + appendix removed; **not archive-ready** |
| §4.4 gate | Archive after Hermes/memory cleanup + stable builds + Piter approval |
| §7 step 13 | Stage 4 thinning executed |

Do **not** change classification to ARCHIVE or DELETE until dependency migration complete.

---

## 12. Risks

| Risk | Mitigation |
|------|------------|
| Accidentally remove `Legacy implementation reference` from banner | Batch 41 checklist: grep three required strings before commit |
| Agents lose component index | Keep quick index section |
| Agents re-read appendix as law | Removing appendix reduces confusion |
| Banner blockquote edit breaks guardrail string | Edit prose around required substrings only |
| Superseded rules removed too early | Keep in Batch 41 (class C) |
| Hermes still points at full file | Stage 42 manifest update before archive |
| Memory still cites old patterns | Parallel memory update batch |

---

## 13. Piter approval checklist (Batch 41 execution)

| # | Gate | Ready? |
|---|------|--------|
| 1 | Stage 3 stable (Batch 39) | **Yes** |
| 2 | Owner 13/13 stable | **Yes** |
| 3 | Exact delete list approved (§8.2 steps 5 & 7) | **Pending Piter** |
| 4 | Banner required strings preserved (§8.2 steps 1–2) | **Plan defined** |
| 5 | No guardrail script changes in Batch 41 | **Yes** |
| 6 | No hard-error escalation | **Yes** |
| 7 | No archive/delete in Batch 41 | **Yes** |
| 8 | Rollback plan clear (§10) | **Yes** |
| 9 | Validation plan clear (§9) | **Yes** |
| 10 | Superseded rules + finance discipline retention approved | **Pending Piter** |

**Sign-off line for Batch 41 PR:**

> Approved: Execute Batch 41 Stage 4 — thin `AIXIA_STANDARD.md` per Batch 40 §8.2; preserve banner guardrail strings; remove canonical law table and appendix only.

---

## 14. Recommended next batch

### **Batch 41 — Execute Stage 4 thinning**

Apply §8.2 exactly; update `16` §4.4; create execution report; run §9 validation.

**Do not recommend yet:** page migration, AgentOps History, finance shell proofs, command-surface context, CSS split, archive execution, file deletion, guardrail hard-error escalation.

**After Batch 41:** Batch 42 — Hermes manifest + qa-agent memory mirror update (non-build dependency cleanup).

---

## 15. Confirmation: page migrations remain paused

| Item | Status |
|------|--------|
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |
| Archive / delete | **Paused** |

---

## Validation

```bash
npm run qa:validate-foundation
→ Result: PASS (2026-05-30)
```

Build not run — Batch 40 made no code changes.

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | This report |
| 2 | Files modified | **None** |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Components changed | **No** |
| 7 | Guardrail scripts changed | **No** |
| 8 | Package scripts changed | **No** |
| 9 | AIXIA_STANDARD.md changed | **No** |
| 10 | AIXIA_STANDARD thinning executed | **No** |
| 11 | Old files moved/deleted/archived | **No** |
| 12 | Stage 4 target structure defined | **Yes** (§7) |
| 13 | Future edit plan created | **Yes** (§8) |
| 14 | Future validation plan created | **Yes** (§9) |
| 15 | Rollback plan created | **Yes** (§10) |
| 16 | Piter approval checklist created | **Yes** (§13) |
| 17 | Page migrations remain paused | **Yes** |
| 18 | Batch 9 finance proofs paused | **Yes** |
| 19 | Command-surface context paused | **Yes** |
| 20 | Command results | `qa:validate-foundation` → **PASS** |
| 21 | Final status | **Batch 40 complete** (proposal only) |
| 22 | Recommended next batch | **Batch 41 — Execute Stage 4 thinning** (after Piter approval) |
