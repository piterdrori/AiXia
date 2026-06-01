<!--
AIXIA-QA-AGENT-AUTHORITY-BANNER
type: qa-merged-canonical-input
canonical: src/design-system/aixia-global/
owner-files: src/design-system/aixia-global/07-button-action-standard.md, src/design-system/aixia-global/13-module-wrapper-rules.md, src/design-system/aixia-global/15-guardrail-rules.md
-->

> **Merged canonical input — not active design law**
>
> Useful content from this qa-agent document has been merged into:
>
> - [`07-button-action-standard.md`](../../src/design-system/aixia-global/07-button-action-standard.md) — buttons / actions / shadcn boundary
> - [`13-module-wrapper-rules.md`](../../src/design-system/aixia-global/13-module-wrapper-rules.md) — module wrappers / chrome vs content
> - [`15-guardrail-rules.md`](../../src/design-system/aixia-global/15-guardrail-rules.md) — guardrail rules
>
> **Active design law lives only in** `src/design-system/aixia-global/` owner files **`00`–`16`**. This qa-agent file is **not current law**.
>
> - If this file conflicts with `aixia-global/`, **`aixia-global/` wins.**
> - **Do not add new design rules here.** Future rules must go into the correct owner file (per `00` §0.2).
> - Do not cite this file as current visual authority in code, guardrails, AI prompts, or memory seeds.
> - Archive or delete requires dependency checks and **Piter approval** (see [`16-design-file-cleanup-map.md`](../../src/design-system/aixia-global/16-design-file-cleanup-map.md)).
>
> **Role:** deprecated canonical input — lookup until archive phase.

# P0-07 — shadcn/ui Boundary Audit

**Status:** Audited · warn-only guardrail active (Batch 3)  
**Date:** 2026-05-29

---

## Locked boundary

| Layer | Owner | Allowed |
|-------|-------|---------|
| **Shell chrome** | `DashboardLayout`, auth layouts | `@/components/ui/*` for sidebar, header, dropdowns, tooltips |
| **Product page content** | Finance, AgentOps, Projects, etc. | `@/components/aixia/*` only |
| **Radix primitives** | Wrapped inside AiXia components | Not imported directly in page files |

**Rule:** `src/components/ui/*` must not define product page rhythm. Finance/AgentOps page content must use shared AiXia components.

**Standard:** `qa-agent/design-system/AIXIA_PAGE_SHELL_HERO_STANDARD.md`

---

## Audit — Finance (`src/app/finance/**`)

| Finding | Count |
|---------|-------|
| Direct `@/components/ui` imports in page files | **0** |
| Classification | **Clean** — finance pages use AiXia shared components |

**Migration blockers:** None for shadcn boundary. Legacy shell/hero issues are separate (P0-01/P0-03).

---

## Audit — AgentOps (`src/app/system/agent-ops/**`)

| File | Import | Classification |
|------|--------|----------------|
| `page.tsx` | `@/components/ui/PageLoader` | **Allowlisted** — loading chrome (migrate to `AixiaLoadingState` in P1) |
| `page.tsx` | `@/components/ui/progress` | **Dangerous** — page content UI; guardrail warns |
| `council/page.tsx` | `PageLoader` | Allowlisted |
| `history/page.tsx` | `PageLoader` | Allowlisted |
| `agents/page.tsx` | `PageLoader` | Allowlisted |
| `agents/[agentId]/page.tsx` | `PageLoader` | Allowlisted |
| `issues/page.tsx` | `PageLoader` | Allowlisted |
| `issues/[issueCode]/page.tsx` | `PageLoader` | Allowlisted |
| `automation/page.tsx` | `PageLoader` | Allowlisted |
| `advanced/page.tsx` | `PageLoader` | Allowlisted |
| `knowledge/page.tsx` | `PageLoader` | Allowlisted |

**Guardrail warnings (Batch 3):** **1** — `Progress` on `system/agent-ops/page.tsx`

---

## Audit — Shell chrome (allowed)

| File | ui imports | Status |
|------|------------|--------|
| `src/components/layout/DashboardLayout.tsx` | Button, Input, Badge, Avatar, DropdownMenu, Tooltip | **Allowed** — app shell chrome |

---

## Allowlist (guardrail)

Defined in `scripts/guardrails/aixia-guardrail-allowlists.mjs`:

- **Shell chrome files:** `DashboardLayout.tsx`, `AuthLayout.tsx` (if present)
- **AgentOps temporary:** `@/components/ui/PageLoader` only
- **Finance/AgentOps scan paths:** warn on any other ui import in `page.tsx`

---

## Next enforcement (Batch 4+)

1. Replace AgentOps `PageLoader` with `AixiaLoadingState` / shared loading primitive
2. Replace `Progress` on AgentOps hub with AiXia progress pattern or remove
3. Promote shadcn boundary to **error** for Finance/AgentOps after zero warnings
4. Document calendar/chat module ui usage in P1-05 wave

---

## Migration blockers

- PageLoader has no 1:1 AiXia export today — P1 shared loading component needed before error-level enforcement
- Council/History/AgentOps page migration frozen — ui cleanup happens after P0 close
