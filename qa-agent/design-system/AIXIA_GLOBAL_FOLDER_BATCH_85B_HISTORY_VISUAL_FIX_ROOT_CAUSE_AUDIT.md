# AiXia Global Design System — Batch 85B — History Visual Fix Root-Cause Audit

**Date:** 2026-05-30  
**Type:** Root-cause audit + standard-improvement recommendation only  
**Status:** COMPLETE  
**Scope:** AgentOps History Batches 84–85 — no page migration, no code changes

---

## 1. Purpose

Determine why Batch 84’s History command-shell migration still looked wrong in browser, what Batch 85 fixed, whether the failure was page implementation vs source-of-truth vs process, and what must change before Issues/Hub/orb-route migrations.

---

## 2. Batch 84 vs Batch 85 comparison

### What Batch 84 did correctly

| Area | Batch 84 outcome |
|------|------------------|
| Shell | Replaced orb/default `AixiaPage` with `AixiaCommandPageLayout` |
| Hero surface | `AixiaHero surface="command"` with parent pill, kicker, title, subtitle, actions |
| Meta strip | Added `AixiaCommandHubMetaStrip` in `scrollLead` |
| Sections | Applied `AixiaSection surface="command"` on main content blocks |
| Loading | Replaced raw Tailwind placeholder with `AixiaEmptyState` |
| Logic | All hooks, API calls, filters, timeline, actions preserved |
| Validation | `qa:validate-foundation` + `npm run build` passed |

### What Batch 84 did incorrectly

| Area | Problem | Owner rule violated (already existed) |
|------|---------|--------------------------------------|
| Hero badges | Kept `Staging only` + `Read-only history` in `AixiaHero badges` — rendered **between parent pill and kicker** | `04` §4B — avoid status badges in hero; `05` — status/context belongs in meta strip |
| Hero KPIs | **Missing** `AixiaCommandMetrics` in hero | `04` §4D + `05` §4A/§4 hub KPIs in hero; `06` §4B hero KPI path |
| Scroll KPIs | Six metrics in scroll `AixiaSection` via `AixiaSmartGrid` + `AixiaValueBlock` | `04` §4D — forbidden: page-level hub KPIs in scroll body |
| Meta strip | Duplicated KPI counts (runs, verification, decisions) | `05` §4A — meta strip is secondary context, **not** primary KPIs |
| Card rhythm | Read-only rule as orphan `AixiaInfoBlock`; Reports as top-level `<details>` | `06` §4A — sections use `AixiaSection`; rule/status cards inside section shell |
| Loading placement | `AixiaEmptyState` outside section wrapper | `06` — loading/empty should follow section rhythm |
| QA process | Browser QA **not run**; report marked hero/meta aligned | `14` §12 — build pass alone is not visual approval |

### What Batch 85 changed

| Change | Effect |
|--------|--------|
| Removed hero `badges` prop | Floating pills gone from title area |
| Added `AixiaCommandMetrics` as hero children | Finance Transactions KPI rhythm restored |
| Relocated staging/read-only to meta strip | Environment + History access as signal rows |
| Meta strip → contextual only | Timeline scope + report artifacts (no KPI duplication) |
| Removed duplicate scroll KPI section | Single KPI source in hero |
| Wrapped read-only, loading, reports in `AixiaSection` | Standard box/section rhythm |
| Browser QA | PASS vs Finance + Council |

### Did Batch 85 update source-of-truth?

**No.** Batch 85 edited only `history/page.tsx` and `16-design-file-cleanup-map.md` (step status). No changes to owner files `04`/`05`/`06`/`14` or shared components.

**The fix was local page-only.**

---

## 3. Root-cause finding

**Verdict: combination — not a single cause.**

| Cause layer | Weight | Summary |
|-------------|--------|---------|
| **1. Page implementation** | **Primary** | Batch 84 carried legacy hero badges forward, placed KPIs in scroll not hero, and filled meta strip with KPI duplicates — all contradict existing owner files |
| **2. Source-of-truth clarity** | **Secondary** | Rules exist but are ambiguous on page-type classification (History = hub-with-KPIs vs registry/list), badge *type* (staging/read-only vs context), and explicit pill→kicker→metrics→meta sequence |
| **3. Shared component API** | **Contributing** | `AixiaHero` `badges` prop legally renders status pills between pill and kicker; no guard against staging/runtime badges |
| **4. Batch 84 / Batch 83 prompt** | **Contributing** | Council over-weighted as reference (no hero KPIs); Batch 83 scope explicitly recommended scroll `AixiaSmartGrid`+`AixiaValueBlock` instead of Finance `AixiaCommandMetrics`; no mandatory browser comparison; no explicit “forbid hero badges” gate |
| **5. QA process gap** | **Contributing** | Batch 84 skipped browser QA despite `14` §12 requiring visual confirmation |

**Direct answer:** Batch 84 did **not** fail because owner files were missing entirely. It failed because implementation + scope prompt **misapplied** existing law, and ambiguity made the wrong choice look valid. Batch 85 corrected the page without clarifying law — repeat risk remains on Issues/Hub.

---

## 4. Source-of-truth adequacy audit

Reviewed: `04`, `05`, `06`, `13`, `14`.

### Question-by-question answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Do owner files prohibit floating badges inside hero title area? | **Partially.** `04` §4B limits badges (hub avoid; child max 2; never runtime status in hero) but does **not** name placement “between parent pill and kicker” or forbid staging/read-only badges by name |
| 2 | Do they say status/context badges belong in meta strip or rule sections? | **Partially.** `05` §4A defines meta strip as secondary operational/context signals; `06` §4C covers rule/status cards — but `04` §4B still allows “max 2 context badges” on child pages, which Batch 84 misused |
| 3 | Do they require hero KPI rows when approved pages use them? | **Partially.** `04` §4D requires `AixiaCommandMetrics` in hero for hub/dashboard; forbids scroll-body hub KPIs — but History is not explicitly classified (could be read as registry/list → “no hero metrics”) |
| 4 | Do they define hero actions vs badges vs meta strip vs KPI cards vs rule cards? | **Yes, spread across `04`/`05`/`06`** — but no single ordered checklist: parent pill → kicker → title → subtitle → **hero metrics** → meta strip → rule section |
| 5 | Do they require equivalent box/card rhythm on migration? | **Yes** — `06` §2 forbids page-local Tailwind card systems; `14` §12 requires header/body alignment — but no explicit “must match Finance hub sequence” example for AgentOps |
| 6 | Was Batch 84 wrong because it ignored existing rules? | **Mostly yes** — badge placement, scroll KPIs, and KPI-in-meta-strip directly violate `04`/`05`/`06` |
| 7 | Or because rules were not explicit enough? | **Partly yes** — page-type ambiguity and “max 2 child badges” enabled a plausible wrong reading; Batch 83 scope doc contradicted Finance KPI placement |

---

## 5. Shared component misuse audit

| Component | Allowed misuse? | Assessment |
|-----------|-----------------|------------|
| `AixiaHero` `badges` | **Yes** | Renders badges between parent pill and kicker by design (`AixiaHero.tsx` L117–129). Staging/read-only badges are valid props but wrong for command hero law |
| `AixiaCommandMetrics` | N/A — underused | Available; Batch 84 did not use it in hero |
| `AixiaCommandHubMetaStrip` | **Yes** | Accepts any label/value; Batch 84 passed KPI counts — component cannot distinguish KPI vs context |
| `AixiaSection` | No | Used correctly in Batch 84 for some blocks; orphan InfoBlock/details skipped it |
| `AixiaSmartGrid` + `AixiaValueBlock` | **Misapplied** | Valid components, wrong **placement** for page-level summary KPIs |
| `AixiaInfoBlock` | No guard | Fine for rule content; needs `AixiaSection` wrapper per rhythm |

**Conclusion:** Misuse is **primarily page-level implementation**, amplified by **API permissiveness** (`badges`, meta strip content) and **unclear page-type law**. Fix order: **owner-file clarity first** → **migration prompt/browser gate** → **optional future component warnings** (not in this batch).

---

## 6. Prompt / process root-cause audit

| Question | Finding |
|----------|---------|
| Did Batch 84 prompt forbid floating hero badges? | **No** — prompt said align with Council; did not say “remove hero badges” or “no staging badges in hero” |
| Did prompt require Finance comparison? | **Weakly** — Batch 83 listed Finance components but recommended Council pattern + scroll SmartGrid KPIs |
| Did prompt overuse Council? | **Yes** — Council has no hero KPIs and no badges; Finance Transactions is the stronger KPI+meta rhythm reference |
| Should future prompts require dual reference? | **Yes** — module reference (Council/AgentOps) **+** strongest global rhythm page (Finance Transactions hub) |
| Should future prompts include root-cause step on visual mismatch? | **Yes** — if browser fails parity, classify: implementation bug vs SOT gap vs wrong reference page **before** patch batch |

**Batch 83 scope error (upstream):** Recommended `AixiaSmartGrid` + `AixiaValueBlock` in summary section and meta strip with run/verification counts — this **predetermined** Batch 84’s wrong layout. Batch 84 executed the scope faithfully but the scope conflicted with owner `04`/`05`.

---

## 7. Whether Batch 85 fixed page only or source-of-truth too

| Layer | Batch 85 action |
|-------|-----------------|
| Page | **Fixed** — hero metrics, meta strip, sections |
| Owner files | **Not changed** |
| Shared components | **Not changed** |
| Migration prompts | **Not updated** |
| Guardrails | **Not changed** |

**Batch 85 was page-only.** Repeat risk on Issues/Hub remains until law clarity + process gates improve.

---

## 8. Recommended owner-file improvements

| Finding | Current owner coverage | Risk of repeat | Recommended action |
|---------|------------------------|----------------|-------------------|
| Staging/read-only badges in hero | `04` §4B vague on badge *types* | **High** | Clarify `04` — staging/access/read-only badges **forbidden** in hero; use meta strip or rule section |
| KPI placement (scroll vs hero) | `04` §4D exists but History page-type ambiguous | **High** | Clarify `04` — review/history/summary pages with page-level counts use hero `AixiaCommandMetrics` |
| Meta strip carries KPI counts | `05` §4A clear but not cross-linked in migration checklist | **Medium** | Add `14` migration checklist row: meta strip must not duplicate hero KPIs |
| Command page visual sequence | Spread across `03`/`04`/`05`/`06` | **High** | Add `14` § checklist: hero → meta strip → rule/status section → work sections |
| Build ≠ visual approval | `14` §12 exists | **High** | Enforce in batch templates: browser QA mandatory before migration batch close |
| Council as sole AgentOps reference | `14` mentions Council template | **Medium** | Add note: KPI pages must also compare Finance Transactions hub |

**Recommendation:** **Batch 85C** — apply small owner-file clarifications (proposed wording below). **Do not** skip 85C and go straight to Issues unless Piter explicitly accepts repeat risk.

---

## 9. Proposed exact wording (draft only — not applied)

### `04-hero-header-standard.md` — add after §4B table row on badges

```markdown
- **Forbidden in command hero:** staging/environment badges, read-only/access-mode badges, runtime/service status badges, and any badge that duplicates meta-strip or rule-section content.
- **Placement:** command hero title group order is fixed: parent pill → kicker → title → subtitle → actions row. Badges must not appear between parent pill and kicker on new or migrated pages.
- **If staging/read-only/access context is required:** place it in `AixiaCommandHubMetaStrip` (`05`) or a rule/status section (`06`), not in `AixiaHero badges`.
```

### `04-hero-header-standard.md` — extend §4D page-type table

```markdown
| Review / history / audit pages with page-level summary counts | `<AixiaCommandMetrics />` **in hero** (same as hub/dashboard) |
```

### `05-meta-status-strip-standard.md` — add to §4A “What belongs there”

```markdown
- **Belongs in meta strip:** environment (e.g. staging only), access mode (e.g. read-only), workflow/context signals, scope markers — compact label/value/detail rows only.
- **Does not belong in meta strip:** primary numeric KPIs already shown in hero metrics; duplicate count cards; badge-style pills.
```

### `14-page-migration-rules.md` — add migration visual checklist (new subsection)

```markdown
### Command-page visual parity checklist (mandatory before batch close)

1. Parent pill → kicker → title → subtitle → hero actions — no badges between pill and kicker.
2. Page-level KPIs in `AixiaCommandMetrics` inside hero when equivalent approved hubs use hero KPIs (e.g. Finance Transactions).
3. Meta strip below hero — contextual signals only; no KPI duplication.
4. Rule/access/status copy in `AixiaSection` + shared rule/status component — not orphan blocks.
5. Browser compare: module reference page **and** strongest global rhythm reference (Finance Transactions for KPI hubs).
6. Build pass alone is not approval (`14` §12).
```

---

## 10. Risk of repeat on Issues / Hub / other routes

| Route | Repeat risk | Why |
|-------|-------------|-----|
| **Issues queue** | **High** | Local h1 header; likely to recreate custom hero; may add badges “for staging” |
| **Hub** | **Very high** | KPIs already in scroll; large file; easy to partial-migrate shell only |
| **Orb routes** (Advanced, Knowledge, etc.) | **High** | Legacy hero badges pattern from pre-migration pages |
| **Issue workspace** | **Medium** | Has command hero but hero-child KPI grid — may duplicate Batch 84 scroll-KPI mistake |

**Mitigation before Batch 86:** run **85C** owner clarifications + updated migration prompt with Finance+Council browser gate.

---

## 11. Recommended next batch

### Primary recommendation: **Batch 85C — Apply owner-file clarifications**

- Apply proposed wording to `04`, `05`, `14` (Piter approval required per living-law loop)
- No page edits
- Update Batch 86 prompt template after 85C

### Alternative (if Piter skips 85C): **Batch 86 — Issues migration**

- Only with **strict** prompt: forbid hero badges; require `AixiaCommandMetrics` if page has queue summary KPIs; meta strip contextual only; mandatory browser QA vs History (fixed) + Finance Transactions + Council; root-cause step if parity fails

**Do not migrate Issues until this audit question is answered — answered: combination root cause; 85C recommended before 86.**

---

## 12. No page migration in this audit

Confirmed. No app code, CSS, components, guardrails, or owner files edited in Batch 85B.

---

## Key questions — direct answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Caused by bad page implementation? | **Yes — primary cause** |
| 2 | Caused by weak/incomplete source-of-truth? | **Partly — secondary; rules existed but ambiguous + Batch 83 scope contradicted them** |
| 3 | Did Batch 85 fix page only or SOT too? | **Page only** |
| 4 | What prevents repeat on Issues/Hub? | **85C owner clarifications + dual-reference browser gate + mandatory visual QA + no hero badges in migration prompts** |

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |

Build not run — audit-only batch, no code changes.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `AIXIA_GLOBAL_FOLDER_BATCH_85B_HISTORY_VISUAL_FIX_ROOT_CAUSE_AUDIT.md` |
| 2 | Files modified | None (optional cleanup map update deferred — audit-only) |
| 3 | Root-cause audit completed | **Yes** |
| 4 | Batch 84 vs Batch 85 compared | **Yes** |
| 5 | Source-of-truth adequacy checked | **Yes** |
| 6 | Shared component misuse checked | **Yes** |
| 7 | Prompt/process root cause checked | **Yes** |
| 8 | Page-only vs SOT-level fix answered | **Yes — page-only** |
| 9 | Owner-file improvements proposed | **Yes** |
| 10 | Owner files edited | **No** |
| 11 | Code changed | **No** |
| 12 | CSS changed | **No** |
| 13 | Pages changed | **No** |
| 14 | Components changed | **No** |
| 15 | Business logic changed | **No** |
| 16 | `npm run qa:validate-foundation` | **PASS** |
| 17 | Final recommendation | **Batch 85C** — owner-file clarifications, then **Batch 86** Issues with improved prompt |

---

## Related

- Batch 84: `AIXIA_GLOBAL_FOLDER_BATCH_84_AGENTOPS_HISTORY_MIGRATION_REPORT.md`
- Batch 85: `AIXIA_GLOBAL_FOLDER_BATCH_85_AGENTOPS_HISTORY_VISUAL_PARITY_FIX_REPORT.md`
- Owner: `04-hero-header-standard.md`, `05-meta-status-strip-standard.md`, `06-card-section-standard.md`, `14-page-migration-rules.md`
