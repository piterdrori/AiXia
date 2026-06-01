<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-historical-report-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Historical report only — not current design law**
>
> This qa-agent file is **batch/phase execution evidence or audit history**. It is **not** active AiXia design authority.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this report conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval** (see `16-design-file-cleanup-map.md`).
>
> **Role:** historical report / execution evidence.

# P0 Direction Clarification — After Batch 8

**Date:** 2026-05-29  
**Type:** Clarification / audit only — **no code changes**  
**Trigger:** Piter concern that finance shell proof work may be drifting away from global AiXia standardization and AgentOps goals.

---

## Executive summary

Batches 6–8 did **not** perform finance visual redesign or loaded-page migration. They changed **loading and not-found shell wrappers only** on three finance detail routes, plus async primitive swaps on Council/History (Batch 6). The visible card/section layout mismatch Piter sees is **pre-existing page debt** and **unmigrated loaded content** — not an outcome of Batch 6–8 loaded-page edits (because those edits did not happen).

Finance shell proofs were a **narrow guardrail / CSS-bridge track** (P0-04), not the main AgentOps standardization path. Continuing one finance route per batch **does not** fix global visual parity and **should be paused** until direction is realigned.

**Batch 9 recommendation: PAUSE** — do not modify another finance route.

---

## What happened in Batch 6–8

| Batch | Primary work | Finance touch |
|-------|--------------|---------------|
| **6** | Council + History: `PageLoader` → `AixiaAsyncState` (layout preserved); PageLoader allowlist cleared | **One** finance proof: `invoices/[id]` loading/not-found → `FinancePage` |
| **7** | — | **One** finance proof: `purchase-orders/[id]` loading/not-found → `FinancePage` |
| **8** | — | **One** finance proof: `proforma-invoices/[id]` loading/not-found → `FinancePage` |

**Also in Batches 1–5 (context):** shared CSS consolidation, guardrails, `AixiaAsyncState`, finance bridge loader, hub meta CSS — **shared layer**, not page layout migration.

### What did **not** happen

- No finance loaded-detail JSX restructure
- No cards, sections, line items, or lifecycle action cards moved
- No finance business logic, Supabase, routing, or permissions changes
- No AgentOps page visual work (except Batch 6 async wrapper on Council/History)
- No Council/History layout redesign
- No broad page migration wave
- No production/main changes

---

## Question 1 — Why were Finance routes touched in Batch 6–8?

| Category | Answer |
|----------|--------|
| **Visual redesigns?** | **No** |
| **Page migrations?** | **No** (loaded content unmigrated) |
| **Shell/loading/not-found context only?** | **Yes** — the only finance page JSX edits |
| **Guardrail debt reduction?** | **Yes** — orb `AixiaPage` warnings reduced 19 → 16 across batches 6–8 |
| **Required for shared SOT enforcement?** | **Partially** — supports **P0-04** (finance bridge CSS scoped under `.aixia-finance-page`) |

### Why finance at all?

From `AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md` and `AIXIA_DESIGN_CONSOLIDATION_BACKLOG.md`:

1. **Finance is the locked visual baseline** (`AIXIA_PAGE_SHELL_HERO_STANDARD.md` references `/finance` hub).
2. **13 legacy finance detail routes** still used orb `<AixiaPage>` on some branches, so finance bridge CSS (`finance-visual.css` under `.aixia-finance-page`) did not apply consistently on loading/error paths.
3. **Guardrails** warn on orb shells; clearing debt one route at a time was planned as **mechanical shell context**, not visual parity work.
4. Batch 6 bundled the **first finance proof** with async cleanup; Batches 7–8 continued that **same narrow track**.

This was **not** chosen because AgentOps needed finance page edits. It was a **parallel P0 debt cleanup** that can look like page migration when viewed in the browser — but it is not.

---

## Question 2 — Did Batch 6–8 change loaded Finance page visuals?

**Verified from code** (example: `proforma-invoices/[id]/page.tsx`):

| Check | Result |
|-------|--------|
| Loaded detail JSX changed? | **No** — `AixiaFinanceCommandDetailPage` block (~line 3296+) untouched |
| Cards/sections/buttons moved? | **No** |
| Line item sections moved? | **No** |
| Lifecycle action cards moved? | **No** |
| Local page styles changed? | **No** |
| Only loading/not-found changed? | **Yes** |

**Before/after pattern (all three finance proofs):**

```tsx
// ONLY these early-return branches changed:
if (isLoading) return <FinancePage><AixiaLoadingState fullPage={false} … /></FinancePage>;
if (!record) return <FinancePage><AixiaEmptyState … /></FinancePage>;

// UNCHANGED — entire loaded page:
return (
  <AixiaFinanceCommandDetailPage hero={…} metaStripItems={…} actionRow={…} …>
    {/* all sections, tables, SmartLayout, handlers — identical */}
  </AixiaFinanceCommandDetailPage>
);
```

**Batch 6 Council/History:** only `PageLoader` → `AixiaAsyncState` with same `loading` / `fallback` / children — no section tree changes.

**Conclusion:** Loaded finance pages look the same as before Batch 6–8. Any visual mismatch is **not caused by these batches changing loaded layout**.

---

## Question 3 — Why does the browser still look different from the expected standard?

Most likely causes (in order):

| Cause | Explanation |
|-------|-------------|
| **Pre-existing page layout debt** | Most routes were never migrated to the locked shell/hero/meta/scroll standard. Guardrails report 150+ warnings; only 3 finance orb instances were cleared. |
| **Loaded content not migrated yet** | Detail pages compose sections locally (SmartLayout, action rows, summary blocks) without a single enforced global detail template for every document type. |
| **Comparing different states/pages** | Loading/not-found (now wrapped in `FinancePage`) vs loaded detail (`AixiaFinanceCommandDetailPage`) vs `/finance` hub vs AgentOps orb pages — different shells by design today. |
| **AgentOps still on legacy shell** | 6 AgentOps routes remain on orb/default shell (warn-only debt). AgentOps was **not** visually standardized in Batch 6–8. |
| **Shared CSS changes (Batches 1–5)** | Hub meta CSS, scroll aliases, finance bridge scoping may affect rhythm globally — but Batch 6–8 finance edits did not touch loaded JSX. |
| **Shell/context changes (Batch 6–8)** | Affect **loading and not-found only** — invisible when viewing a loaded record with data. |
| **Viewport / scroll position** | Screenshot comparisons often differ by scroll, panel width, or auth state — not proof of regression from Batch 6–8. |

**Bottom line:** Piter’s observed mismatch is expected while **page migrations remain frozen** and **P0 authority conflicts are only partially resolved**. Batch 6–8 did not move cards or sections on loaded pages.

---

## Question 4 — AgentOps only or all AiXia pages?

**Correct direction** (from unified authority plan + consolidation backlog):

```
Layer 1 — Shared CSS (tokens, layout, primitives)
    ↓
Layer 2 — Shared components (shells, hero, meta, sections, tables)
    ↓
Layer 3 — Docs + guardrails (single law)
    ↓
Layer 4 — Page families (Finance reference → AgentOps → others)
    ↓
Layer 5 — Individual pages (composition only — no local visual systems)
```

| Principle | Meaning |
|-----------|---------|
| **Global shared standard first** | Fix P0 splits (dual shell, dual hero, meta strip, scroll families, CSS scope) in shared files |
| **Then page families** | AgentOps conforms to same standard Finance already models — not Finance patched route-by-route |
| **Individual pages via shared components only** | Use `FinancePage`, `AixiaCommandPageLayout`, `AixiaFinanceCommandDetailPage` (or future generic equivalent) — no local hero/CSS hacks |
| **No random local page redesigns** | One-route finance shell wrap without loaded migration **does not** standardize visuals |

**AgentOps is blocked** on P0-01, P0-03, P0-05, P1-02 per backlog — not on clearing finance loading branches.

**“Standardize all pages”** in this project means: **one shared authority**, then modules consume it. It does **not** mean editing finance detail routes one at a time without loaded migration.

---

## Question 5 — Should Batch 9 continue finance shell proof routes?

| Option | Assessment |
|--------|------------|
| Continue one-route finance shell debt | **Low value for visible parity** — reduces guardrail count only; does not fix card/section rhythm |
| **Pause finance route changes** | **Recommended** — stops perceived drift |
| Return to shared source-of-truth only | **Recommended** — aligns with original AgentOps/global goal |
| Global visual parity audit | **Recommended** — document-only; compare reference vs reality with checklist |
| AgentOps visual parity verification | **Recommended next execution** after audit — browser vs `/finance` standard |
| Another finance payroll route | **Not recommended now** — increases confusion |

### Explicit instruction

**Batch 9 should PAUSE finance shell proof routes.**

---

## Question 6 — Safe next step (proposed Batch 9 alternative)

**Batch 9 (revised): Global Visual Parity Audit — documentation only, no page edits**

1. Pick **3 reference pages**: `/finance` hub, one finance detail with data, one AgentOps hub (e.g. `/system/agent-ops`).
2. Browser capture at **same viewport** (1280×800), **loaded state with auth**, **scroll top**.
3. Checklist against `AIXIA_PAGE_SHELL_HERO_STANDARD.md`:
   - shell wrapper chain
   - hero surface/command typography
   - meta strip placement
   - scroll region
   - section gap rhythm
   - action row placement
4. Classify gaps: **shared component fix** vs **page migration (frozen)** vs **guardrail-only debt**.
5. Output: `AIXIA_P0_GLOBAL_VISUAL_PARITY_AUDIT.md` with ordered fix plan — **shared layer first**.

**Optional Batch 10 (after audit approval):** one **shared component** change (e.g. P1-04 generic `AixiaCommandDetailPage` plan, or AgentOps meta strip alignment) — still **no random finance page edits**.

---

## Are finance shell proofs required?

| Required for… | Answer |
|---------------|--------|
| Global visual standardization | **No** — loaded migration + shared components matter more |
| P0-04 finance CSS bridge correctness | **Partially** — loading/error paths should use `.aixia-finance-page`; loaded paths already use `AixiaFinanceCommandDetailPage` → `FinancePage` on the three proof routes |
| Guardrail count reduction | **Yes** — mechanical only |
| AgentOps standardization | **No** |

Finance shell proofs are **optional debt cleanup**, not the critical path to “all pages look the same.”

---

## Page migrations status

**Still frozen.** Batch 6–8 did not unfreeze migrations. No loaded finance layout was migrated.

---

## What “standardize all pages” means here

1. **One design authority** (CSS → components → docs → guardrails).
2. **Finance hub/detail shells as reference pattern**, not as excuse to edit every finance route locally.
3. **AgentOps and other modules adopt shared shells** — not orb `AixiaPage`, command hero, hub meta strip, command scroll.
4. **Pages compose data** into shared components; they do not invent layout.
5. **Visual parity** comes from shared layer + controlled family migration — **not** from loading-branch wrapper swaps alone.

---

## Final check

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_P0_DIRECTION_CLARIFICATION_AFTER_BATCH_8.md` |
| 2 | Files modified | **None** |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Finance pages changed | **No** (this task) |
| 6 | AgentOps changed | **No** |
| 7 | Why Finance was touched | Guardrail/CSS-bridge debt on loading/not-found only; not visual standardization |
| 8 | Whether visuals changed | **Loaded pages: No.** Loading/not-found shell context only in Batches 6–8 |
| 9 | Recommended next step | **Global Visual Parity Audit** (doc-only) → shared SOT fixes → AgentOps parity verification |
| 10 | Batch 9 proceed? | **Pause** — do not continue finance shell proof routes |

---

## Summary for Piter

- **You are right to question the direction.** One finance route per batch reduces guardrail numbers but **does not** make pages look consistent.
- **Batch 6–8 did not redesign finance layouts.** They only wrapped loading/not-found in `FinancePage` on three routes.
- **The visual mismatch you see is the unmigrated state** — expected while P0 is open and page migrations are frozen.
- **The original goal remains:** shared source-of-truth first, then AgentOps (and all modules) consuming it — **not** blind finance page edits.
- **Stop Batch 9 finance work.** Next: audit what differs visually, fix shared layer, then plan AgentOps parity with evidence.
