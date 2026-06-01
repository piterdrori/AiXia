<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md, src/design-system/aixia-global/14-page-migration-rules.md, src/design-system/aixia-global/16-design-file-cleanup-map.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file tracks **P0/P1 consolidation backlog** debt. It **must not** override owner files. “Target SOT” columns are **historical** — active law is `aixia-global/` only.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`00-README-SOURCE-OF-TRUTH.md`](../../src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md) — authority root
> - [`14-page-migration-rules.md`](../../src/design-system/aixia-global/14-page-migration-rules.md) — migration gates
> - [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md) — cleanup disposition
>
> - If this backlog conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** living backlog tracker under the global cleanup program — not visual law.

# AiXia Design Consolidation Backlog

**Policy:** No page migrations until item is **Done** or explicitly waived.  
**Priority:** P0 = blocks all standardization · P1 = blocks module migration · P2 = module-specific · P3 = cleanup

---

## P0 — Blocks All Standardization

| ID | Issue | File(s) | Conflict | Risk | Proposed fix | Target SOT | App code? |
|----|-------|---------|----------|------|--------------|------------|-----------|
| P0-01 | Dual page atmosphere | `AixiaPage.tsx`, `AixiaCommandPage.tsx` | default orbs vs command 3D | Every page looks like different product | Default `AixiaPage` not used under `DashboardLayout`; lint rule | `AixiaCommandPage` | Yes — guardrail |
| P0-02 | Four shell wrappers | `FinancePage`, `AixiaCommandPage`, `AixiaCommandPageLayout`, raw `AixiaPage` | Inconsistent composition | Agents pick wrong wrapper | Document one tree; deprecate raw command `AixiaPage` in pages | `AixiaCommandPageLayout` | Yes — gradual |
| P0-03 | Dual hero typography | `AixiaHero.tsx`, `dashboard/visual.css`, default hero CSS | command vs gradient XL | Child pages look “marketing” | Default `surface="command"` for app; remove default XL from authenticated paths | `AixiaHero` command only | Yes |
| P0-04 | Finance CSS global import | `aixia-design-system.css` imports `finance-visual.css` | Global rules finance-biased | Non-finance modules inherit finance typography | Scope finance bridge to `.aixia-finance-page` only; remove root @import | `finance-visual.css` scoped | Yes — CSS |
| P0-05 | Duplicate meta strip systems | `AixiaFinanceHubMetaStrip`, `AixiaRuntimeStatusStrip`, `.aixia-command-hub-meta` CSS | Three layouts for same pattern | Broken AgentOps strips | One component `AixiaCommandHubMetaStrip`; runtime strip hub-meta delegates | `AixiaCommandHubMetaStrip` | Yes |
| P0-06 | Competing scroll class families | `layout.css`, module CSS | finance/projects/inbox/tasks scroll aliases | Scroll rhythm drift | Single `.aixia-command-scroll`; remove module duplicates | `dashboard/layout.css` | Yes — CSS |
| P0-07 | shadcn vs AiXia on shell | `DashboardLayout.tsx`, `ui/button` | Dash actions ≠ Aixia dash actions | Chrome ≠ content mismatch | Document boundary; migrate shell buttons when AuthShell exists | ui = chrome only | Yes — layout |
| P0-08 | Doc triple authority | `AIXIA_STANDARD.md`, `src/design-system/*`, `qa-agent/*` | Contradictory hero/badge rules | Agents implement wrong pattern | Merge into PAGE_SHELL_HERO + component-rules; deprecate STANDARD.md | `src/design-system` | No |

---

## P1 — Blocks Module Migration

| ID | Issue | File(s) | Conflict | Proposed fix | Target | App code? |
|----|-------|---------|----------|--------------|--------|-----------|
| P1-01 | Metric duplication | `AixiaMetricGrid`, `AixiaCommandMetrics` | KPIs in hero and scroll | Lint: KPIs in hero = CommandMetrics only | `AixiaCommandMetrics` | Yes — lint |
| P1-02 | Section dual surface | `AixiaSection.tsx` | command dash panel vs default section | Default command under dashboard | `surface="command"` default | Yes |
| P1-03 | Chat dual system | `app/chat/components/*`, `AixiaChat*` | Two chat UIs | Migration plan; deprecate local chat chrome | `AixiaChatThread` | Yes — later wave |
| P1-04 | Finance command shells not generic | `AixiaFinanceCommandDetailPage` | AgentOps can't reuse | Rename/generalize to `AixiaCommandDetailPage` | Shared shell | Yes |
| P1-05 | Module per-route CSS | calendar/chat/inbox/tasks visual | Overrides hero/command | Remove hero overrides; use shared | Module bridge scoped | Yes — CSS |
| P1-06 | AgentOps dense table in global CSS | `aixia-design-system.css` `.agentops-dense-table` | Module rules in global file | Move to `data-density="compact"` on AixiaTable | `AixiaTable` | Yes |
| P1-07 | `AixiaWorkspaceShell` vs `CommandPageLayout` overlap | Both exist | Two detail patterns | Document when to use each | PAGE_SHELL_HERO doc | No |
| P1-08 | Guardrails vs reality | `scripts/aixia-guardrails.mjs` | 150+ warnings ignored | Tie P0 fixes to guardrail enforcement | CI policy | Yes |

---

## P2 — Module-Specific

| ID | Issue | File(s) | Proposed fix |
|----|-------|---------|--------------|
| P2-01 | AI Management orb pages | `app/ai-management/*` | Move to command shell |
| P2-02 | Calendar shadcn buttons | `calendar/*` + visual CSS | AixiaButton + drop local hero |
| P2-03 | Process book visual weight | `aixia-process-book.css` | Align stage intro with command sections |
| P2-04 | Paycheck wizard density | `PaycheckApplicationWizard.tsx` | Align with expense process or document variant |
| P2-05 | Print system isolation | print CSS | Keep isolated (OK) |

---

## P3 — Cleanup

| ID | Issue | Proposed fix |
|----|-------|--------------|
| P3-01 | Dead `App.css` | Delete or archive |
| P3-02 | Duplicate phase reports | Archive to `qa-agent/design-system/archive/` |
| P3-03 | `FinanceHubMetrics` vs `CommandMetrics` naming | Alias/export cleanup |
| P3-04 | Unused admin-usage/presence CSS audit | Import or remove |

---

## Migration Blockers (Explicit)

**Do not migrate** until done:

| Module / route | Blocked by |
|----------------|------------|
| AgentOps (all) | P0-01, P0-03, P0-05, P1-02 |
| Council / History / chat proof | P0-01–P0-05, P1-03 |
| Finance (remaining) | P0-04 (scoped bridge), P1-01 |
| Calendar / Chat / Tasks / Inbox | P1-05, P1-03 |
| AI Management | P0-01, P2-01 |

---

## Suggested Execution Order

1. P0-08 (docs merge) — no code  
2. P0-04, P0-06 (CSS scoping) — high impact  
3. P0-03, P0-01 (hero/page defaults + guardrails)  
4. P0-05 (meta strip unification)  
5. P1-02, P1-01 (section + metrics lint)  
6. Browser verification: Finance hub vs empty command template (not Council patch)  
7. Only then: AgentOps migration wave
