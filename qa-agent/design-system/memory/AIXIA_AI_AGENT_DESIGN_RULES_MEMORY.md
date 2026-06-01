<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-memory-mirror-only
canonical: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
-->

> **Memory mirror only — not active design law**
>
> This memory file is a **mirror/context/agent briefing file only**. It is **not** active AiXia design authority.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This memory file is **not current law**.
>
> - If this mirror conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - Memory may record lessons, proposals, status, and history — **not** law.
> - Memory must route approved rule changes into the correct owner file (per `00` §0.2).
> - Memory must **not** silently change law or implementation.
> - **Do not add new design rules here.** Proposed improvements require Piter approval before owner files, guardrails, code, CSS, schemas, workflows, or page behavior change.
> - Archive or delete requires dependency checks and **Piter approval** (see `16-design-file-cleanup-map.md`).
>
> **Role:** operational memory mirror — continuity and agent briefing, not a second law book.

# AiXia AI Agent Design Rules Memory

## Current authority (Batch 53 — read `aixia-global/` first)

**Active design law:** `src/design-system/aixia-global/` owner files **`00`–`16` only.**

| Aspect | Owner file |
|--------|------------|
| Shell | `03-page-shell-standard.md` |
| Hero / header | `04-hero-header-standard.md` |
| Meta / status strip | `05-meta-status-strip-standard.md` |
| Module wrappers | `13-module-wrapper-rules.md` |
| Page migration | `14-page-migration-rules.md` |
| Guardrails | `15-guardrail-rules.md` |
| Cleanup / deprecation | `16-design-file-cleanup-map.md` |

Memory mirrors law but **does not override** owner files. If memory conflicts with `aixia-global/`, **`aixia-global/` wins.**

**Living law (Batch 51):** Source of truth is not frozen. Agents follow current owners during work, propose improvements with evidence, and wait for Piter approval before changing owner files, guardrails, or implementation. Memory records proposals — not law. See `00-README-SOURCE-OF-TRUTH.md` §0.4.

**Historical only (not current law):** Stage 3 Tier 1 shell/hero authority inputs — superseded by owners `03`–`05` and `11`; archive candidates after memory trim + Piter approval.

**Legacy reference only:** `src/components/aixia/AIXIA_STANDARD.md` — thinned implementation bridge (Batch 41); not active law.

**Post-memory resume:** After Hermes/AgentMemory track, return to design cleanup sequence; **do not jump into page migration.** (Cleanup through Batch 53 — qa-agent banners + living SOT governance.)

**Paused:** page migrations, Batch 9 finance proofs, command-surface context, CSS split, archive/delete, Cursor/Hermes MCP (full REST deferred).

**Silent refresh (mandatory):** See `AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` — owners `11`, `13`, `14`, `15`.

**12 agents:** Use Hermes/memory to report issues and propose owner-file upgrades with evidence — **not** silent law or implementation changes (`00` §0.4).

## Mandatory Rules for Any Future UI/Page Work

1. Always use the shared design system first (`src/components/aixia/*` + shared CSS).
2. If a pattern is missing, create/extend a shared component first.
3. Do not create page-local visual systems for repeated patterns.
4. During design-only phases, do not change business logic.
5. Preserve Supabase/API/routing/permissions/validation/handlers unless explicitly requested.
6. For each design change, report which shared pattern/component was used.
7. After each major design-system step, update at least one memory file in `qa-agent/design-system/memory/`.

## Safety Lock

- No runtime activation (Hermes, CodeGraph runtime, local LLM, agentmemory runtime).
- No scheduler activation.
- No automatic Cursor execution.
- No production/main touch during design-foundation phases.

## Mandatory Read-First Docs

Before any page design/edit:

1. `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md`
2. Relevant owner file `01`–`16` for the task aspect (shell=`03`, hero=`04`, meta=`05`, migration=`14`, guardrails=`15`)
3. `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md`
4. `src/design-system/README.md` (delegates to `00`)
5. relevant shared components in `src/components/aixia/*`
6. target page file in `src/app/**` (only when migration is explicitly unfrozen)

**Do not cite as current law:** Stage 3 bannered qa-agent authority inputs, old P0 shell reports, or `AIXIA_STANDARD.md` for layout/design law.

## Mandatory Report Requirements

Every AI-driven design update must report:

- files modified
- shared components used
- shared gaps found
- memory files updated
- validation commands run
- remaining risks/blockers

## Enforcement Reminder

- No page-local repeated design systems.
- Missing repeatable pattern -> shared component first -> then page consumption.

## Page Shell Standard (Phase 2A — historical lesson)

*Active law:* owners `03`–`05`, `11`. Phase report below is **historical evidence only** (bannered Batch 48).

1. Command modules must use `AixiaCommandPage` or `FinancePage` (never default `AixiaPage` alone for hubs).
2. Use `AixiaCommandPageLayout` or the command shell pattern: command hero + `aixia-command-scroll` (see owner `03`).
3. `AixiaHero` must set `surface="command"`; no local hero border/background overrides.
4. Parent navigation: `parentLabel` + `parentPath` pill; avoid duplicate back buttons on new AgentOps pages.
5. Runtime/safety badges belong in scroll meta strip, not stacked in hero (max 2 hero context badges).
6. Proof migrations fail if `/finance` and the target page do not share the same page rhythm (manual browser check required).

Reference: **Stage 3 Tier 2 Phase 2A shell decision** (historical merged input — bannered Batch 48; active law in owners `03`–`05`, `11`)

## Command Meta Strip vs Runtime Strip (Browser Lesson)

- On command hubs/child pages, status/context rows must use **Finance hub meta grid** (`AixiaFinanceHubMetaStrip variant="command"` or `AixiaRuntimeStatusStrip variant="hub-meta"`).
- Do **not** use default `AixiaRuntimeStatusStrip` inline badge rows for page-level meta — it breaks wrapping in the browser.
- Limit to **3** primary meta cells per row when mirroring Finance hub rhythm.
- Chat preview shells: `AixiaChatThread` with `density="compact"` on command pages.

## Design Authority Consolidation — Hard Stop on Page Migrations (2026-05-29)

1. **All page migrations paused** until P0/P1 conflicts in **Stage 3 Wave A consolidation backlog** (historical merged input → `14`/`15`/`16`) are resolved.
2. **Audit all design owner files** before any UI work — see **Stage 3 Tier 1 conflict audit** (historical merged input → `16`).
3. **One unified authority structure required** — see **Stage 3 Tier 1 unified design authority plan** (historical merged input → `00`/`13`).
4. **Do not fix pages locally** when a source-of-truth conflict exists (shell, hero, meta strip, CSS).
5. **Layout/shell/hero/meta law:** `src/design-system/aixia-global/` owners `03`, `04`, `05`, `11` — browser QA vs `/finance` required for any future proof when migration unfreezes.
6. Phase 2B History, Council re-patches, and AgentOps page migrations are **blocked** until Piter approves migration after cleanup gates.

## P0 Batch 1 — Agent Rules Update (2026-05-29)

1. Read `src/design-system/aixia-global/03-page-shell-standard.md`, `04-hero-header-standard.md`, and `05-meta-status-strip-standard.md` before shell/hero/meta work — not `AIXIA_STANDARD.md` or old qa-agent shell-law docs for layout law.
2. Finance bridge CSS is **not** global; do not re-add `@import` to `aixia-design-system.css`.
3. Page-level meta rows: `AixiaCommandHubMetaStrip` (`variant="command"` outside Finance module class).
4. `AixiaRuntimeStatusStrip` — runtime/diagnostics only; do not add `variant="hub-meta"` on new pages.
5. **Source:** Wave B historical P0 batch reports — next work after Batch 1 lessons: scroll, legacy finance shell, hub-meta removal (see `14-page-migration-rules.md`, `15-guardrail-rules.md`), **not** page migration.

## P0 Batch 2 — Agent Rules Update (2026-05-29)

1. Finance CSS on legacy routes: ensured by `FinanceModuleBridgeLoader` in DashboardLayout — do not re-add global `@import`.
2. Use `AixiaCommandHubMetaStrip` for new page meta; `AixiaFinanceHubMetaStrip` is finance-default wrapper only.
3. Scroll body: prefer `.aixia-command-scroll`; shell stack may use `.aixia-command-page-scroll` (aliased in layout.css).
4. Guardrail proposal: **Stage 3 Tier 1 P0 guardrail enforcement proposal** (historical merged input → `15`) — warn-only in Batch 3; no default prop flips yet.
5. **Source:** Wave B historical P0 batch reports — active rules in `00-README-SOURCE-OF-TRUTH.md`, `14-page-migration-rules.md`, `15-guardrail-rules.md`; **page migrations still frozen**.

## P0 Batch 3 — Agent Rules Update (2026-05-29)

1. Build warns on orb `AixiaPage` (19 routes) and non-command `AixiaHero` (15 routes) — fix with shared shells when migration unfreezes.
2. No new `@/components/ui` in Finance/AgentOps page content; AgentOps `PageLoader` allowlisted only.
3. Hub meta grid CSS lives in `aixia-design-system.css` only — do not duplicate in finance-visual.
4. **Source:** Wave B historical P0 batch reports — active rules in `aixia-global/` + `14`/`15`; **page migrations still frozen**.

## P0 Batch 4 — Agent Rules Update (2026-05-29)

1. Hub meta cell chrome is **only** in `aixia-design-system.css` — no duplicate signal-row rules in finance-visual.
2. Do not restore `.aixia-runtime-status-strip--command-meta` CSS; page meta = `AixiaCommandHubMetaStrip` only.
3. Use `AixiaProgressBar` for progress indicators in Finance/AgentOps page content — not `@/components/ui/progress`.
4. Scroll: module `--new` forms may set `overflow-x: hidden` only; vertical scroll inherits `layout.css` aliases.
5. Guardrail hard failure **not enabled** — see path-scoped plan in **Stage 3 Tier 1 guardrail proposal** (historical merged input → `15`).
6. **Source:** Wave B historical P0 batch reports — active rules in `aixia-global/` + `14`/`15`; **page migrations still frozen**.

## P0 Batch 5 — Agent Rules Update (2026-05-29)

1. Use `AixiaAsyncState` for product-page async gates — not `@/components/ui/PageLoader` (except council/history until Batch 6).
2. shadcn/ui in finance/agent-ops page content **fails build** — use `@/components/aixia` only.
3. New app pages outside `LEGACY_SHELL_HERO_DEBT_FILES` must use command shell + command hero or build fails.
4. Legacy 19-route shell debt stays warn-only until shell-only wrap batches.
5. Finance shell bridge: read **Stage 3 Wave A finance shell bridge plan** (historical merged input → `13`/`14`) before any finance route edit.
6. **Source:** Wave B historical P0 batch reports — active rules in `aixia-global/` + `14`/`15`; **page migrations still frozen**.

## P0 Batch 6 — Agent Rules Update (2026-05-29)

1. **No PageLoader** in app page content — `AixiaAsyncState` only; shadcn allowlist is empty.
2. Finance legacy shell proof: wrap loading/error states in `FinancePage` before touching main content layout.
3. `invoices/[id]` proof complete — do not replicate full route migration; one route per batch.
4. Shell debt: 18 legacy routes remain warn-only in `LEGACY_SHELL_HERO_DEBT_FILES`.
5. **Source:** Wave B historical P0 batch reports — active rules in `aixia-global/` + `14`/`15`; **page migrations still frozen**.

## P0 Batch 7 — Agent Rules Update (2026-05-29)

1. Finance legacy shell proof: `purchase-orders/[id]` loading/not-found → `FinancePage` (same pattern as `invoices/[id]`).
2. Shell debt: 17 legacy routes remain warn-only in `LEGACY_SHELL_HERO_DEBT_FILES`.
3. Do not wrap loaded detail content — only loading/not-found/fallback branches unless explicitly approved.
4. **Source:** Wave B historical P0 batch reports — active rules in `aixia-global/` + `14`/`15`; **page migrations still frozen**.

## P0 Batch 8 — Agent Rules Update (2026-05-29)

1. Finance legacy shell proof: `proforma-invoices/[id]` loading/not-found → `FinancePage` (same pattern as `invoices/[id]` and `purchase-orders/[id]`).
2. Shell debt: 16 legacy routes remain warn-only in `LEGACY_SHELL_HERO_DEBT_FILES`.
3. Do not wrap loaded detail content — only loading/not-found/fallback branches unless explicitly approved.
4. **Source:** Wave B historical P0 batch reports — active rules in `aixia-global/` + `14`/`15`; **page migrations still frozen**.
