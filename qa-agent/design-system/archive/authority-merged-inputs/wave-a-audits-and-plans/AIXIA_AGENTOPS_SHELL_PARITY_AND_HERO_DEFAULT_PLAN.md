<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/03-page-shell-standard.md, src/design-system/aixia-global/04-hero-header-standard.md, src/design-system/aixia-global/05-meta-status-strip-standard.md, src/design-system/aixia-global/13-module-wrapper-rules.md, src/design-system/aixia-global/14-page-migration-rules.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file records AgentOps shell parity **planning** and hero-default analysis. It **must not** override owner files or authorize page migration.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`03-page-shell-standard.md`](../../src/design-system/aixia-global/03-page-shell-standard.md) — page shell
> - [`04-hero-header-standard.md`](../../src/design-system/aixia-global/04-hero-header-standard.md) — hero / header
> - [`05-meta-status-strip-standard.md`](../../src/design-system/aixia-global/05-meta-status-strip-standard.md) — meta / status strips
> - [`13-module-wrapper-rules.md`](../../src/design-system/aixia-global/13-module-wrapper-rules.md) — module wrappers
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — page migration
>
> - If this plan conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AgentOps Shell Parity & Hero Default Plan

**Date:** 2026-05-29  
**Type:** Planning + shared-source preparation analysis — **no code, CSS, page, guardrail, or memory changes**  
**Inputs:** `AIXIA_GLOBAL_VISUAL_PARITY_AUDIT_AFTER_BATCH_8.md`, guardrail allowlists, route source inspection

---

## 1. Purpose

Define a precise AgentOps shell parity migration plan and analyze whether changing `AixiaHero`'s default surface to `command` is safe — **without migrating pages in this task**.

**Decision context:** Batch 9 finance shell proofs remain **paused**. Visible parity gaps are **AgentOps debt**, not finance loading wrappers.

---

## 2. Routes inspected

### Primary audit routes (visual + code)

| Route | File |
|-------|------|
| `/system/agent-ops` | `src/app/system/agent-ops/page.tsx` |
| `/system/agent-ops/history` | `src/app/system/agent-ops/history/page.tsx` |
| `/system/agent-ops/council` | `src/app/system/agent-ops/council/page.tsx` |

### Remaining AgentOps shell-warning routes (`LEGACY_SHELL_HERO_DEBT_FILES`)

| Route | File |
|-------|------|
| `/system/agent-ops/advanced` | `advanced/page.tsx` |
| `/system/agent-ops/agents` | `agents/page.tsx` |
| `/system/agent-ops/agents/[agentId]` | `agents/[agentId]/page.tsx` |
| `/system/agent-ops/automation` | `automation/page.tsx` |
| `/system/agent-ops/history` | `history/page.tsx` |
| `/system/agent-ops/knowledge` | `knowledge/page.tsx` |

### AgentOps routes **not** on legacy debt list (for comparison)

| Route | File | Notes |
|-------|------|-------|
| `/system/agent-ops/issues` | `issues/page.tsx` | Command shell; **local hero markup** (no `AixiaHero`) |
| `/system/agent-ops/issues/[issueCode]` | `issues/[issueCode]/page.tsx` | Command shell + `AixiaHero surface="command"` |

**Reference:** `/finance` — `src/app/finance/page.tsx` (`FinancePage` + command hero + hub meta + hero metrics)

---

## 3. AgentOps shell parity table

| Route | Shell component | Command 3D? | Hero surface | Hub meta strip | KPIs/metrics location | Local card grids | Parity vs `/finance` |
|-------|-----------------|-------------|--------------|----------------|----------------------|------------------|----------------------|
| **Council** ✓ ref | `AixiaCommandPageLayout` | ✓ | `command` | ✓ `AixiaFinanceHubMetaStrip variant="command"` | N/A (no hub KPIs — correct) | Minimal (`AixiaValueBlock`) | **High** |
| **Hub** | `AixiaPage surface="command"` | ✓ | `command` | ✗ | ✗ In scroll (`AixiaSection` → `AixiaCommandMetrics`) | ✗ Readiness grid | **Partial** |
| **History** | `<AixiaPage>` orb | ✗ | **default** (gradient XL) | ✗ | ✗ Local summary grid in scroll | ✗ `rounded-xl border` cells | **Low** |
| **Advanced** | `<AixiaPage>` orb | ✗ | default | ✗ | ✗ | ✗ | **Low** |
| **Agents** | `<AixiaPage>` orb | ✗ | default + local hero `className` | ✗ | ✗ | ✗ | **Low** |
| **Agents/[id]** | `<AixiaPage>` orb | ✗ | default + local hero border | ✗ | ✗ | ✗ | **Low** |
| **Automation** | `<AixiaPage>` orb | ✗ | default | ✗ | ✗ | ✗ | **Low** |
| **Knowledge** | `<AixiaPage>` orb | ✗ | default | ✗ | ✗ | ✗ | **Low** |
| **Issues** | `AixiaPage surface="command"` | ✓ | **Local h1** (not `AixiaHero`) | ✗ | ✗ In sections | Partial | **Partial** |
| **Issue workspace** | `AixiaPage surface="command"` | ✓ | `command` | ✗ | In workspace sections | Workbench-specific | **Partial** (E) |

---

## 4. Current shell / hero / meta status (per route)

### Council — **AgentOps reference template**

```
AixiaCommandPageLayout
  → AixiaHero surface="command" (parent pill, actions)
  → scrollLead: AixiaFinanceHubMetaStrip variant="command"
  → children: chat + sections (AixiaSection surface="command")
```

### Hub (`/system/agent-ops`)

```
AixiaPage surface="command" className="aixia-command-page"
  → AixiaHero surface="command"
  → div.aixia-command-scroll
      → AixiaSection "Today's Priority" (local card)
      → AixiaSection "Command metrics" → AixiaCommandMetrics  ← should be in hero
      → AixiaSection "System readiness" (local 5-col grid)
      → … many more sections (~60 section nodes)
```

### History — **largest gap**

```
AixiaPage (default/orb)
  → div.space-y-6 (NOT canonical scroll as shell child)
      → AixiaHero (NO surface="command") — gradient XL kicker
      → AixiaInfoBlock (amber banner)
      → AixiaAsyncState
          → AixiaSection + local 6-col metric grid
          → details/sections/tables
```

### Legacy orb family (advanced, agents, agents/[id], automation, knowledge)

Shared pattern:

```
AixiaPage (orb)
  → div.space-y-6 or aixia-command-scroll wrapper
      → AixiaHero (default) + badges + optional className hacks
      → AixiaInfoBlock
      → AixiaSection(s) + tables
```

---

## 5. Visual gaps vs Finance reference

| Gap | Finance reference | AgentOps impact |
|-----|-------------------|-----------------|
| Orb atmosphere | Command 3D stack only | History + 5 legacy routes |
| Hero typography | `aixia-dash-kicker` + `aixia-dash-title--hero` | Default gradient XL on 6 routes |
| Hub KPIs in hero | `AixiaCommandMetrics` as hero children | Hub puts metrics in scroll section |
| Hub meta strip | First scroll child | Only Council has it |
| Scroll wrapper | `.aixia-command-scroll` direct under shell | History uses `space-y-6` |
| Local metric cards | Shared metrics / value blocks | History summary grid, hub readiness grid |
| Parent navigation | Parent pill only | History duplicate Back button |

---

## 6. Root cause classification

| Issue | Class | Layer |
|-------|-------|-------|
| Orb `AixiaPage` on 6 AgentOps routes | **B** Page-family migration | AgentOps shell family |
| Default hero on same 6 routes | **B** + **A** | Family migration + shared default enables drift |
| Hub metrics in scroll | **C** Individual page debt | `agent-ops/page.tsx` composition |
| Hub missing meta strip | **C** | Hub page never wired |
| Issues page local hero markup | **C** | Bypasses `AixiaHero` entirely |
| Council chat layout | **E** | Business-purpose difference within standard shell |
| Finance detail SmartLayout variance | **E** | Different archetype — not AgentOps scope |
| `AixiaHero surface = "default"` in component | **A** | Shared component default |

---

## 7. Migration sequence recommendation

**Principle:** Migrate using **Council template** (`AixiaCommandPageLayout` + command hero + hub meta strip). One route per batch with browser check vs `/finance` and Council. **Do not** patch hero CSS locally.

| Phase | Route(s) | Scope | Risk | Depends on |
|-------|----------|-------|------|------------|
| **P0** | — | Shared hero context prep (see §10) | Low | This plan approved |
| **P1** | `history` | Full shell parity: `AixiaCommandPageLayout`, command hero, hub meta strip, command scroll, remove duplicate Back, replace summary grid with `AixiaCommandMetrics` or meta strip cells | **Medium** — largest visual change | P0 doc only; migration batch when unfrozen |
| **P2** | `page` (hub) | Add hub meta strip; move `commandMetrics` into hero children; reduce readiness local grid to shared blocks | **Medium** — dense page | P1 pattern proven |
| **P3** | `advanced`, `knowledge`, `automation` | Orb → `AixiaCommandPageLayout`; command hero; hub meta strip; preserve sections | **Low–medium** | P1 template |
| **P4** | `agents`, `agents/[agentId]` | Same as P3; remove hero `className` border hacks | **Low–medium** | P3 |
| **P5** | `issues` | Replace local h1 hero with `AixiaHero surface="command"` + optional meta strip | **Medium** — registry-style | P2 hub pattern |
| **P6** | Guardrail promotion | AgentOps prefix hard error when legacy set empty | **Low** | Phases P1–P5 |

**Do not migrate in this task.** Sequence defines safe order when page migration is approved.

---

## 8. `AixiaHero` default analysis

**File:** `src/components/aixia/AixiaHero.tsx`

| Question | Answer |
|----------|--------|
| **Current default** | `surface = "default"` (line 90) |
| **Surface options** | `"default" \| "command"` (`commandSurface.ts`) |
| **Default branch renders** | `<section class="aixia-hero aixia-glass-hover">` + `aixia-title-xl` + `aixia-gradient-text` |
| **Command branch renders** | `<header class="aixia-dash-hero …">` + `aixia-dash-kicker` + `aixia-dash-title--hero` |

---

## 9. Call-site risk analysis

### Explicit `surface="command"` (safe — unchanged by default flip)

~75+ files under `src/` including: Finance hub/registries, dashboard, projects, tasks, calendar, AI Management hub, AgentOps hub, Council, issue workspace, shared wrappers (`AixiaFinanceCommandDetailPage`, `AixiaFinanceCommandCreatePage`).

### Implicit default (`surface` omitted) — **would change if default → command**

| Category | Approx. count | Examples | Break risk if default → command |
|----------|---------------|----------|--------------------------------|
| **AgentOps orb routes** | 6 | history, advanced, agents, automation, knowledge | **Visual fix intended** — typography improves; `statusCards` still supported in command branch |
| **Finance legacy detail** | ~10 | expense-funding/[id], payroll/[id], vendors/new | **Medium visual shift** — uses `badges` + `statusCards` on default hero; command branch renders both but **layout changes** (bento vs side grid) |
| **Other app pages** | ~15–20 | Some project/task/employee pages, finance create flows | Case-by-case layout shift |
| **Public/auth** | 0 | Landing uses custom markup, not `AixiaHero` | N/A |

### Authenticated call sites affected by global default flip

**~35–40 files** with `<AixiaHero` and no `surface="command"` in file (estimated from repo scan: ~110 hero files, ~75 with explicit command).

### Public / auth / marketing exceptions

- `src/app/page.tsx` — landing; **does not use** `AixiaHero`
- `login`, `register` — excluded from guardrails; no `AixiaHero`
- **No authenticated page should rely on default/orb hero** per locked standard

### Would global default → `command` break pages?

| Break type | Likelihood |
|------------|------------|
| Runtime / TypeScript errors | **No** — same props API |
| Layout regression (statusCards side → bento) | **Yes** — finance legacy detail pages |
| Badge/title copy semantics | **Low** — command uses kicker for `gradientTitle` separately from title |
| Tests / snapshots | **Unknown** — browser QA would need rerun |

**Conclusion:** Global default flip is **not low-risk today**. It would mass-change ~35–40 pages without controlled migration, including finance legacy heroes with heavy `statusCards` usage.

---

## 10. Recommended default strategy

| Option | Assessment | Recommendation |
|--------|------------|----------------|
| **A. Default `command` globally** | High blast radius; finance legacy layout shifts | **Defer** until implicit-default count ≤ 5 |
| **B. Default command inside command shell context** | Requires React context from `AixiaCommandPage` / `FinancePage` / `AixiaCommandPageLayout` | **Best long-term prep** — Batch 10 candidate |
| **C. Keep default + guardrail enforce** | Current state; drift continues on omitted prop | **Keep** for legacy debt files |
| **D. Required `surface` prop** | TypeScript breaking change on all call sites | **Too disruptive** for one batch |
| **E. Hybrid (recommended)** | Context default + explicit migration + guardrails | **Adopt** |

### Recommended hybrid (Option E) — preparation only

1. **Batch 10 (shared prep, low risk):** Add `AixiaCommandSurfaceContext` in shared components:
   - Providers: `AixiaCommandPage`, `FinancePage`, `AixiaCommandPageLayout`
   - `AixiaHero`: if `surface` omitted → use context value if `"command"`, else `"default"`
   - **No visual change** until pages sit inside command shell without explicit surface
2. **Batch 11 (first migration):** History → `AixiaCommandPageLayout` (explicit `surface="command"` regardless) — fixes worst outlier
3. **Batch 12+:** AgentOps family migrations; as routes enter command layout, implicit heroes inherit command surface via context
4. **Future:** When implicit-default heroes ≤ 5, flip TypeScript default to `command` and require `surface="default"` opt-out for any remaining exceptions

**Do not change `AixiaHero` default in this task.** Analysis shows it is **not safe as a standalone one-line change**.

---

## 11. Guardrail recommendation

| Topic | Recommendation |
|-------|----------------|
| **Shell/hero warnings warn-only** | **Keep** for `LEGACY_SHELL_HERO_DEBT_FILES` (6 AgentOps + 10 finance) |
| **Promote AgentOps to hard error** | **After** P1–P4 migrations remove routes from legacy set; then path-scoped error on `src/app/system/agent-ops/**` per `AIXIA_P0_GUARDRAIL_ENFORCEMENT_PROPOSAL.md` |
| **Block new non-command hero on authenticated pages** | **Already active** for files **not** in legacy set (Batch 5 hard error). **Keep.** |
| **History warning until migration** | **Yes** — keep in legacy set until P1 migration batch completes |
| **New files in agent-ops** | Hard error today if orb shell or non-command hero — **keep** |
| **Finance shell proofs** | **Remain paused** — not guardrail priority |

**Do not change guardrail scripts in this task.**

---

## 12. What not to change yet

- AgentOps History / hub / legacy route JSX
- Council (reference — already aligned)
- Finance routes (any)
- `AixiaHero` default prop value
- Guardrail allowlists
- Memory files (update after first implementation batch)
- Finance shell proof routes (Batch 9 paused)

---

## 13. Exact next implementation batch

**Batch 10 — Shared command-surface context prep (recommended)**

| Deliverable | Type | Risk |
|-------------|------|------|
| `AixiaCommandSurfaceContext` + provider in command shell components | Shared component | **Low** — no page edits |
| `AixiaHero` reads context when `surface` omitted | Shared component | **Low** — behavior unchanged until layout migration |
| JSDoc on `AixiaHero`: `surface="default"` is legacy; authenticated pages use `command` | Documentation in source | None |
| Unit/browser note in plan report | QA prep | None |

**Not Batch 10:**

- Finance shell proof continuation (**paused**)
- History migration (**Batch 11**, requires explicit approval to unfreeze page migration)
- Global default flip (**deferred**)
- Random local hero CSS patches on History

**Batch 11 (after Batch 10 + approval):** AgentOps History shell migration using Council template — single route, full shell parity, browser verification.

---

## 14. Shared-layer vs family vs individual summary

| Fix type | What | When |
|----------|------|------|
| **Shared-layer** | Command surface context; hero JSDoc; eventual default flip | Batch 10–future |
| **Page-family** | 6 orb AgentOps routes → `AixiaCommandPageLayout` | Batches 11–14 |
| **Individual** | Hub metrics placement; Issues local hero | Batches 12, 15 |
| **Accepted (E)** | Council chat density; issue workspace workbench | No migration required |

---

## 15. Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | Not run (documentation-only) |

---

## 16. Final check

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md` |
| 2 | Files modified | **None** |
| 3 | Code changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Finance routes changed | **No** |
| 6 | AgentOps routes changed | **No** |
| 7 | AgentOps routes inspected | **Yes** (10 routes) |
| 8 | AixiaHero default analyzed | **Yes** (§8–10) |
| 9 | Call-site risk analyzed | **Yes** (§9) |
| 10 | Guardrail recommendation created | **Yes** (§11) |
| 11 | Batch 9 finance proof remains paused | **Yes** |
| 12 | Recommended next implementation batch | **Batch 10: shared command-surface context prep** |
| 13 | Command results | `qa:validate-foundation` PASS |
| 14 | Final status | Plan complete — safe order: shared context → History migration → hub alignment → remaining AgentOps orb routes |

---

## Summary for Piter

- **Council is the AgentOps migration template** — not Finance route proofs.
- **History is first migration target** when page work is approved — not another finance wrapper.
- **Changing `AixiaHero` default to `command` globally is unsafe now** (~35–40 implicit call sites, finance legacy layout shifts).
- **Safest shared prep:** command-surface **context** so heroes inside command shells default correctly without a global breaking change.
- **Batch 9 finance proofs stay paused.**
