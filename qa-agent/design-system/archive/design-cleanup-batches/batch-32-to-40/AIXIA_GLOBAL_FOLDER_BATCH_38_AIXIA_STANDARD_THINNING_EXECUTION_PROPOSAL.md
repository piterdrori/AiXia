# AiXia Global Design System — Batch 38 — AIXIA_STANDARD Thinning Execution Proposal (Stage 3)

**Date:** 2026-05-30  
**Scope:** Documentation / planning only — **Stage 3 not executed**  
**Predecessor:** Batch 37 thinning readiness audit  
**Target execution batch:** Batch 39 (requires Piter approval)

---

## 1. Purpose

Batch 37 classified `src/components/aixia/AIXIA_STANDARD.md` as **READY FOR PARTIAL THINNING PLAN ONLY** and defined Stage 3 as converting `inspectSharedStandardDocument()` from a **13-phrase secondary check** to a **banner + existence secondary check**, while keeping `inspectGlobalOwnerPhraseAnchors()` as the **primary** 13/13 phrase coverage path.

Batch 38 produces the **approved execution proposal** for that Stage 3 guardrail change. No scripts, files, or behavior are modified in this batch.

---

## 2. Current dependency state

| Dependency | Location | Behavior today | Blocks appendix removal? |
|------------|----------|----------------|--------------------------|
| **Primary phrase sync** | `inspectGlobalOwnerPhraseAnchors()` | Reads `aixia-global/`; 13 exact phrases; warn-only | No — this is the target primary path |
| **Secondary phrase sync** | `inspectSharedStandardDocument()` | Reads `AIXIA_STANDARD.md`; 13 exact `includes()` checks; warn-only | **Yes** — appendix must keep all phrases |
| **File existence** | `assertFileExists` in `inspectSharedStandardDocument()` + `REQUIRED_AIXIA_COMPONENT_FILES` | Warn if missing | Yes — file must exist at path |
| **Hermes manifest** | `export-analytics-for-hermes.mjs` | Path list only; no content read | No (build) |
| **qa-agent memory** | 3 memory files | Stale `PAGE_SHELL_HERO` pointers | No (build); agent confusion risk |
| **Component code** | None | No `.tsx`/`.ts` reads | No |

**Current guardrail call order in `main()`:**

```text
inspectGlobalOwnerPhraseAnchors();   // primary — unchanged in Stage 3
inspectSharedStandardDocument();     // secondary — Stage 3 target
inspectSharedComponentSourceOfTruth(); // includes REQUIRED_AIXIA_COMPONENT_FILES
```

**Current metrics (Batch 36 baseline):**

- Owner coverage: **13/13 PASS**
- Build: **PASS**, **0 hard errors**
- Secondary phrase warnings: **0** (all phrases present)
- Primary owner warnings: **0**
- Static findings: **185**

**Banner already present in `AIXIA_STANDARD.md`:**

- Marker: `AIXIA-DEPRECATION-BANNER`
- `type: legacy-implementation-reference`
- Canonical: `aixia-global/00-README-SOURCE-OF-TRUTH.md`

---

## 3. Stage 3 target behavior

After Stage 3 execution (Batch 39, post-approval):

| Check | Behavior |
|-------|----------|
| **Owner phrases (primary)** | `inspectGlobalOwnerPhraseAnchors()` still validates 13/13 phrases in `aixia-global/` owner files — **unchanged** |
| **AIXIA_STANDARD existence** | File must still exist at `src/components/aixia/AIXIA_STANDARD.md` — **unchanged** via `assertFileExists` + `REQUIRED_AIXIA_COMPONENT_FILES` |
| **AIXIA_STANDARD banner** | File must contain `AIXIA-DEPRECATION-BANNER` — **new secondary check** |
| **Legacy reference wording (optional)** | Warn if file lacks `legacy-implementation-reference` type in banner OR lacks `Legacy implementation reference` blockquote phrase — **recommended soft check** |
| **13 phrases in AIXIA_STANDARD** | **No longer checked** by `inspectSharedStandardDocument()` |
| **Warning tier** | All remain **warn-only** via `addError` |
| **Hard errors** | **None added** |
| **Package scripts** | **Unchanged** |
| **AIXIA_STANDARD.md content** | **Unchanged in Stage 3** — appendix thinning is Stage 4 (separate batch) |
| **Appendix removal** | **Not in Stage 3** — only enabled *after* Stage 3 proves stable builds without phrase loop |

---

## 4. Proposed script change plan

**File:** `scripts/aixia-guardrails.mjs`  
**Function:** `inspectSharedStandardDocument()`  
**Status:** Proposal only — **do not apply in Batch 38**

### 4.1 Current behavior

```javascript
function inspectSharedStandardDocument() {
  if (!assertFileExists(AIXIA_STANDARD_FILE, "AiXia legacy standard document sync rule")) return;

  const text = readText(AIXIA_STANDARD_FILE);
  const requiredPhrases = [ /* 13 strings */ ];

  for (const phrase of requiredPhrases) {
    if (!text.includes(phrase)) {
      addError(AIXIA_STANDARD_FILE, `...missing phrase: ${phrase}...`, "AiXia legacy standard document sync rule");
    }
  }
}
```

- Reads full file text.
- Emits up to **13 warnings** if phrases missing.
- Scope: `"AiXia legacy standard document sync rule"`.
- Tier: warn-only (`addError`).

### 4.2 Proposed behavior

Replace the 13-phrase loop with banner + legacy-bridge checks. **Pseudocode — not applied:**

```javascript
/**
 * Secondary legacy sync (Stage 3 / Batch 39): AIXIA_STANDARD.md is a temporary
 * implementation sync bridge only. Primary phrase coverage is
 * inspectGlobalOwnerPhraseAnchors() → aixia-global/ owner files 00–16.
 * This check verifies file presence and deprecation banner — not 13 phrase anchors.
 */
function inspectSharedStandardDocument() {
  if (!assertFileExists(AIXIA_STANDARD_FILE, "AiXia legacy standard document sync rule")) return;

  const text = readText(AIXIA_STANDARD_FILE);

  if (!text.includes("AIXIA-DEPRECATION-BANNER")) {
    addError(
      AIXIA_STANDARD_FILE,
      "AIXIA_STANDARD.md (secondary legacy sync bridge) must include AIXIA-DEPRECATION-BANNER. Primary phrase coverage reads src/design-system/aixia-global/ owner files.",
      "AiXia legacy standard document sync rule"
    );
  }

  if (!text.includes("type: legacy-implementation-reference")) {
    addError(
      AIXIA_STANDARD_FILE,
      "AIXIA_STANDARD.md banner must declare type: legacy-implementation-reference. Primary design law: src/design-system/aixia-global/.",
      "AiXia legacy standard document sync rule"
    );
  }

  if (!text.includes("Legacy implementation reference")) {
    addError(
      AIXIA_STANDARD_FILE,
      "AIXIA_STANDARD.md must retain legacy implementation reference wording in its deprecation banner. Not active design law.",
      "AiXia legacy standard document sync rule"
    );
  }
}
```

### 4.3 What stays unchanged in Stage 3

| Item | Change? |
|------|---------|
| `inspectGlobalOwnerPhraseAnchors()` | **No** |
| `REQUIRED_AIXIA_COMPONENT_FILES` array (includes `"AIXIA_STANDARD.md"`) | **No** — keep separate existence check in `inspectSharedComponentSourceOfTruth()` |
| `main()` call order (owner first, legacy second) | **No** |
| `addError` / `addHardError` policy | **No** |
| Phrase constants in `aixia-owner-phrase-coverage-report.mjs` | **No** |
| `package.json` | **No** |

### 4.4 Optional merge (defer to later batch)

Batch 39 may **keep duplicate existence checks** (both `assertFileExists` in `inspectSharedStandardDocument` and `REQUIRED_AIXIA_COMPONENT_FILES`) to minimize diff risk. Merging into one check is optional in Batch 40+ after Stage 3 is stable.

### 4.5 Expected warning delta at current repo state

With banner already present:

- **Before Stage 3:** 0 secondary phrase warnings.
- **After Stage 3:** 0 secondary banner warnings (banner checks pass).
- **Net new warnings:** **0** at current state.
- **If someone removes appendix phrases only:** 0 new warnings (phrases no longer checked).
- **If someone removes banner:** up to **3** new secondary warnings (banner checks fail).

### 4.6 Files touched in Batch 39 execution (future)

| File | Change |
|------|--------|
| `scripts/aixia-guardrails.mjs` | Replace phrase loop in `inspectSharedStandardDocument()` |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_39_*_REPORT.md` | Execution report |
| `16-design-file-cleanup-map.md` | Optional §4.4/§4.8 Stage 3 done note |

**Not touched in Batch 39 Stage 3:**

- `AIXIA_STANDARD.md` content
- Pages, CSS, components
- Allowlists
- Hermes script (Stage 2 non-build plan)

---

## 5. Proposed validation plan

### 5.1 Before Batch 39 edit (baseline capture)

Run and record outputs:

```bash
node scripts/guardrails/aixia-owner-phrase-coverage-report.mjs
npm run qa:validate-foundation
npm run qa:static-design-guardrails
npm run qa:guardrail-action-plan
npm run build
```

**Record:**

| Metric | Expected baseline |
|--------|-------------------|
| Owner coverage | 13/13 PASS |
| `qa:validate-foundation` | PASS |
| Static findings | 185 |
| Build hard errors | 0 |
| Build warnings (total) | ~195 (document exact count) |
| Warnings scope `AiXia global owner phrase anchor rule` | 0 |
| Warnings scope `AiXia legacy standard document sync rule` | 0 |

### 5.2 After Batch 39 edit

Run **identical commands**. Compare:

| Metric | Expected after Stage 3 |
|--------|------------------------|
| Owner coverage | 13/13 PASS |
| Build | PASS |
| Hard errors | 0 |
| Static findings | 185 (unchanged unless unrelated drift) |
| New owner phrase warnings | 0 |
| New legacy banner warnings | 0 (banner exists today) |
| Legacy phrase warnings | **N/A** — check removed |
| Total warning count | **Same or lower** than baseline |

### 5.3 Negative test (optional manual, Batch 39)

Temporarily remove `AIXIA-DEPRECATION-BANNER` in a local branch only:

- Expect **1–3** warnings from `AiXia legacy standard document sync rule`.
- Expect **0** hard errors.
- Revert before commit.

### 5.4 Success criteria

Stage 3 execution is successful if:

1. Owner coverage remains 13/13.
2. Build passes with 0 hard errors.
3. No increase in total build warnings at current repo state.
4. Banner check fires when banner removed (negative test).
5. No page/CSS/component/package changes in the Stage 3 commit.

---

## 6. Rollback plan

If Batch 39 Stage 3 causes unexpected warnings or process issues:

### 6.1 Git rollback

```bash
git checkout HEAD -- scripts/aixia-guardrails.mjs
```

Or revert the Batch 39 commit.

### 6.2 Restore behavior

Reinstate full `inspectSharedStandardDocument()` with:

- `assertFileExists(AIXIA_STANDARD_FILE, ...)`
- 13-phrase `requiredPhrases` array (exact strings unchanged)
- Per-phrase `addError` with Batch 36 secondary messaging

### 6.3 Verify rollback

1. Confirm all 13 phrases still exist in `AIXIA_STANDARD.md` appendix (they should — Stage 3 does not edit the file).
2. Run full validation suite (§5.1).
3. Expect 0 legacy phrase warnings if appendix intact.

### 6.4 Rollback scope

- **No database/Supabase rollback** required.
- **No schema migration** involved.
- **No page/CSS rollback** — Stage 3 touches guardrail script only.

---

## 7. Non-build dependency plan

Execute **after** Stage 3 is stable (Batch 40+ or parallel doc batches). **Not in Batch 39 Stage 3.**

### 7.1 Hermes export manifest

**File:** `scripts/export-analytics-for-hermes.mjs`

| Current | Proposed future |
|---------|-----------------|
| `"src/components/aixia/AIXIA_STANDARD.md"` in `staticPaths` | Add `"src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md"` |
| | Optionally keep `AIXIA_STANDARD.md` until thin/archive |
| | Eventually drop `AIXIA_STANDARD.md` when archived |

### 7.2 qa-agent memory mirrors

| File | Stale reference | Replace with |
|------|-----------------|--------------|
| `memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | `AIXIA_PAGE_SHELL_HERO_STANDARD.md` as locked layout law | `aixia-global/03`, `04`, `05` |
| `memory/AIXIA_DESIGN_COMPONENT_MEMORY.md` | Shell law = PAGE_SHELL_HERO | `aixia-global/03`–`05`; index note for `AIXIA_STANDARD` |
| `memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md` | README → PAGE_SHELL_HERO | README → `aixia-global/00` |

**Batch suggestion:** qa-agent memory + old authority banner plan (parallel to Stage 4 thinning).

### 7.3 Cleanup map (`16-design-file-cleanup-map.md`)

When Batch 39 executes, update:

- **§4.4** — Stage 3 done: secondary check = banner + existence; phrases not required in file.
- **§4.8** — Runner row reflects new `inspectSharedStandardDocument()` behavior.
- **§7** — Add step: Stage 3 guardrail banner check (Batch 39).

### 7.4 Coverage report footer

**File:** `aixia-owner-phrase-coverage-report.mjs`

Update note from *"Legacy sync still reads AIXIA_STANDARD.md"* to *"Primary phrase coverage: aixia-global/; AIXIA_STANDARD secondary: banner + existence only."*

### 7.5 Archive gate (unchanged)

No archive/delete until:

1. Stage 3 stable builds recorded.
2. Stage 4 appendix thinned or file stubbed.
3. Hermes + memory updated.
4. `16` §5 gates satisfied.
5. **Piter approves.**

---

## 8. Piter approval checklist

**Stage 3 execution (Batch 39) must not start until Piter confirms:**

| # | Gate | Status today |
|---|------|--------------|
| 1 | Owner phrase coverage stable at **13/13** | **Yes** (Batch 34–36) |
| 2 | `AIXIA-DEPRECATION-BANNER` present in `AIXIA_STANDARD.md` | **Yes** (Batch 32) |
| 3 | Script change is **warn-only** (`addError` only) | **Yes** (proposed) |
| 4 | **No** hard-error escalation | **Yes** (proposed) |
| 5 | **No** file deletion in Stage 3 | **Yes** (proposed) |
| 6 | **No** appendix thinning in Stage 3 | **Yes** (Stage 4 separate) |
| 7 | Rollback plan documented | **Yes** (§6) |
| 8 | Validation plan documented | **Yes** (§5) |
| 9 | Baseline build metrics captured before edit | **Required at Batch 39 start** |
| 10 | Primary owner check remains first in `main()` | **Yes** (proposed) |

**Piter sign-off line (for Batch 39 PR description):**

> Approved: Execute Batch 39 Stage 3 — convert `inspectSharedStandardDocument()` to banner + existence secondary check only; no `AIXIA_STANDARD.md` content edits in same batch.

---

## 9. What must not change yet

| Area | Status |
|------|--------|
| `scripts/aixia-guardrails.mjs` | **Frozen until Batch 39 approval** |
| `AIXIA_STANDARD.md` | **Frozen** |
| 13 owner phrase anchors | **Frozen** |
| Warning/hard-error tiers | **Frozen** |
| Allowlists | **Frozen** |
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |
| CSS split | **Paused** |
| Archive / delete / move | **Paused** |
| Appendix removal | **Paused** until post–Stage 3 stable builds |

---

## 10. Recommended next batch

### **Batch 39 — Execute Stage 3 guardrail change** (requires Piter approval)

**Scope:**

1. Apply §4.2 pseudocode to `inspectSharedStandardDocument()`.
2. Capture before/after metrics per §5.
3. Update `16` cleanup map (minimal).
4. Create Batch 39 execution report.
5. **Do not** thin `AIXIA_STANDARD.md` in the same batch.

**Success unlocks:** Batch 40 — Stage 4 appendix thinning proposal/execution (remove duplicated sections; keep banner + component index).

**Do not recommend yet:**

- Page migration · AgentOps History · Finance shell proofs · Command-surface context · CSS split · Archive execution · Guardrail hard-error escalation · Old-file deletion

---

## 11. Confirmation: page migrations remain paused

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

Build not run — Batch 38 made no code changes.

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
| 10 | Old files moved/deleted/archived | **No** |
| 11 | Stage 3 target defined | **Yes** (§3) |
| 12 | Proposed script plan created | **Yes** (§4) |
| 13 | Validation plan created | **Yes** (§5) |
| 14 | Rollback plan created | **Yes** (§6) |
| 15 | Piter approval checklist created | **Yes** (§8) |
| 16 | Page migrations remain paused | **Yes** |
| 17 | Batch 9 finance proofs paused | **Yes** |
| 18 | Command-surface context paused | **Yes** |
| 19 | Command results | `qa:validate-foundation` → **PASS** |
| 20 | Final status | **Batch 38 complete** (proposal only) |
| 21 | Recommended next batch | **Batch 39 — Execute Stage 3** (after Piter approval) |
