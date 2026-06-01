<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-planning-audit-history-only
canonical: src/design-system/aixia-global/16-design-file-cleanup-map.md
owner-files: src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md, src/design-system/aixia-global/16-design-file-cleanup-map.md
-->

> **Planning / audit history only — not current design law**
>
> This qa-agent file informed the global design folder program or recorded planning history. It **must not** override owner files.
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> Related owner context:
>
> - [`00-README-SOURCE-OF-TRUTH.md`](../../src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md) — authority root
> - [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md) — cleanup disposition
>
> - If this plan conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Archive or delete requires dependency checks and **Piter approval**.
>
> **Role:** planning / audit history under the global cleanup program.

# AiXia Unified Design Authority Plan

**Status:** Proposed — staging only  
**Rule:** Only the structures below may define **reusable** design standards. Pages consume design; pages do not invent design.

---

## 1. Target Architecture (One Umbrella)

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4 — Agent/ops (qa-agent/design-system/)              │
│  AI rules, memory, audits, migration plans, reports         │
└──────────────────────────────┬──────────────────────────────┘
                               │ must mirror
┌──────────────────────────────▼──────────────────────────────┐
│  LAYER 3 — Human docs (src/design-system/)                  │
│  Patterns, component rules, checklists, principles          │
└──────────────────────────────┬──────────────────────────────┘
                               │ must mirror
┌──────────────────────────────▼──────────────────────────────┐
│  LAYER 2 — Components (src/components/aixia/)                 │
│  All reusable visual + composition components                 │
└──────────────────────────────┬────────────────────────────────┘
                               │ styled by
┌──────────────────────────────▼──────────────────────────────┐
│  LAYER 1 — CSS (src/styles/)                                  │
│  Primitives + command chrome + approved module bridges        │
└───────────────────────────────────────────────────────────────┘
```

**Explicitly NOT design authority:**

- `src/components/ui/*` — implementation detail for chrome/auth only; must not define product page rhythm
- `src/app/**/page.tsx` — composition + data only
- `src/App.css` — remove or ignore (unused)

---

## 2. Layer 1 — CSS (Final Structure)

### 2.1 `src/styles/aixia-design-system.css`

**Owns (primitives only, after consolidation):**

- Color/glass/border/radius tokens (or imports token file)
- Typography scale (single `--aixia-type-*` family)
- Spacing/stack gaps
- Shared class families: sections, cards, tables, forms, badges, buttons, chat, timeline, empty/loading
- AgentOps table tuning only if truly cross-module (prefer component-scoped data attributes)

**Must NOT own (move out or delete duplicates):**

- Finance-only hero typography → move to `finance-visual.css` only, scoped `.aixia-finance-page`
- Duplicate command-hub-meta definitions (merge one class: `.aixia-command-hub-meta`)

### 2.2 `src/styles/dashboard/`

| File | Owns |
|------|------|
| `tokens.css` | Command/dashboard CSS variables |
| `layout.css` | `.aixia-command-page`, `.aixia-command-scroll`, tabs, shell flex |
| `visual.css` | `.aixia-dash-hero`, metrics glass, kicker/title |
| `sidebar-chrome.css` | App shell sidebar/topbar (with DashboardLayout) |

### 2.3 Module bridge CSS (allowed, scoped)

| File | Scope | Rule |
|------|-------|------|
| `finance/finance-visual.css` | `.aixia-finance-page` only | Typography/rhythm bridge; no global selectors |
| `finance/master-data-visual.css` | Finance master-data routes | Registry density only |
| `projects/projects-visual.css` | `.aixia-projects-page` | Until merged into command global |
| `calendar/calendar-visual.css` | Calendar routes | **Deprecate** hero overrides → shared hero |
| `chat/chat-visual.css` | Chat routes | **Deprecate** after chat migration |
| `inbox/inbox-visual.css`, `tasks/tasks-visual.css` | Module routes | **Merge** into layout.css aliases |

### 2.4 Other

| File | Owns |
|------|------|
| `aixia-process-book.css` | Wizard/process layouts |
| `aixia-finance-print.css` | Print only |
| `src/index.css` | Tailwind + shadcn base tokens for ui chrome |

### 2.5 `src/main.tsx` load order (target)

1. `index.css` (tailwind base)
2. `dashboard/tokens.css`
3. `dashboard/layout.css`
4. `dashboard/visual.css`
5. `aixia-design-system.css` (primitives; **no** finance @import at root — finance pages import bridge or use body class scope)
6. `aixia-process-book.css`

Module bridges: lazy or route-level import only where needed.

---

## 3. Layer 2 — Components (`src/components/aixia/`)

### 3.1 Shell taxonomy (merge to one family)

| Component | Role | Target |
|-----------|------|--------|
| `AixiaCommandPage` | **Single** command shell wrapper | Keep |
| `FinancePage` | Thin alias: `AixiaCommandPage` + `aixia-finance-page` | Keep |
| `AixiaCommandPageLayout` | Hero + scroll composition | Keep |
| `AixiaPage` | **Only** non-command surfaces (auth/marketing) OR deprecated for app pages | Restrict |
| `AixiaWorkspaceShell` | Detail/workspace composition on command shell | Keep |
| `AixiaFinanceCommandCreatePage` / `DetailPage` | Finance workflow composition | Generalize later → `AixiaCommandDetailPage` |

### 3.2 Hero

- **One public hero:** `AixiaHero`
- **Default `surface` must become `"command"`** for app pages (breaking change behind codemod), OR lint/guardrail fails build if default surface used under `DashboardLayout`
- Deprecate default gradient XL for authenticated app

### 3.3 Meta / status

- **Single component:** `AixiaCommandHubMetaStrip` (rename from FinanceHubMetaStrip)
- `AixiaRuntimeStatusStrip` — only for true runtime tool diagnostics; `variant="hub-meta"` delegates to meta strip

### 3.4 Metrics

- **Hero KPIs:** `AixiaCommandMetrics` only
- **Scroll metrics:** `AixiaMetricGrid` / `AixiaMetricCard` — document when each is allowed; forbid duplicate KPIs in scroll

### 3.5 Chat

- **Single product chat:** `AixiaChatThread`, `AixiaChatMessage`, `AixiaChatComposer`
- Deprecate `src/app/chat/components/*` visual structure (keep data hooks)

### 3.6 Tables, forms, disclosure

- Already centralized — enforce via guardrails; no page tables

---

## 4. Layer 3 — `src/design-system/` (Developer SOT)

**Single index:** `README.md` links to:

- `aixia-page-patterns.md` (merge with PAGE_SHELL_HERO_STANDARD)
- `aixia-component-rules.md`
- `aixia-design-principles.md`
- `aixia-migration-checklist.md`

**Retire duplicate content** from `AIXIA_STANDARD.md` in components folder → pointer to `src/design-system/`.

---

## 5. Layer 4 — `qa-agent/design-system/` (Agent SOT)

**Owns:**

- `AIXIA_GLOBAL_DESIGN_SYSTEM_RULEBOOK.md` (high-level law)
- `AIXIA_PAGE_SHELL_HERO_STANDARD.md` (locked layout law)
- `memory/*` (short decisions only)
- Audits, reports, backlog

**Must not** duplicate full pattern specs that live in `src/design-system/` — link instead.

---

## 6. shadcn `ui/` Boundary

| Allowed | Forbidden |
|---------|-----------|
| DashboardLayout chrome (sidebar, dropdowns, avatar) | Page heroes, KPI cards, registry tables |
| Auth forms (login/register) until `AixiaAuthShell` exists | Finance/AgentOps primary buttons |
| Radix primitives inside AiXia wrappers | Direct `Button` on finance/agentops pages |

---

## 7. Consolidation Phases (No Page Migration)

| Phase | Work | Pages touched |
|-------|------|---------------|
| **C0** | Docs + backlog + standards (this task) | 0 |
| **C1** | P0 CSS/shell/hero defaults | Shared only |
| **C2** | P1 meta strip rename, chat authority decision, section surface default | Shared only |
| **C3** | P2 module bridge deprecation | CSS + lint |
| **C4** | Migration waves | Pages (later) |

---

## 8. Success Criteria

- One command page shell path for all authenticated modules
- One hero typography on command surface
- One meta strip component for status rows
- Finance visual bridge scoped to `.aixia-finance-page` only
- Guardrails fail on `AixiaPage` default under dashboard routes
- Zero new page-local CSS classes for repeated patterns
- Council/Finance browser comparison passes **without page-specific patches**
