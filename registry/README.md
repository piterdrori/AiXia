# AiXia Registry — Cursor Map for External Repos and Tools

This folder is **Cursor's routing map** for external repositories and workflow tools that surround the AiXia application. It does not contain application code, design law, or tool binaries.

## Purpose

- Tell Cursor **which external repo or tool to use** for a given task without Piter repeating instructions every session.
- Define **where** siblings live relative to the app (`../reference`, `../tools`, etc.).
- Prevent external material from being mistaken for **AiXia source of truth** or from polluting the app tree.

**Cursor should read this folder (and `CURSOR_AUTO_TOOL_USE_RULES.md`) before choosing external tools.**

## Authority order (what wins when sources conflict)

### AgentOps / ACDL (reasoning and display freeze)

When the task touches AgentOps, ACDL, Browser QA stack, or USL display:

| Priority | Source | Role |
|----------|--------|------|
| 1 | `registry/AGENTOPS_ACDL_STABLE_BASELINE.md` | Verified stable baseline — production-architecture freeze record |
| 2 | `registry/ACDL_SYSTEM_LOCK_v2.1.md` | **Absolute architecture freeze** — hard prohibitions, immutable stack order, regression gate |
| 3 | `registry/AGENTOPS_RUNTIME_ARCHITECTURE_FREEZE.md` | **Runtime diagnostics freeze** — read-only observability contract; A/B/C routes |
| 4 | `registry/AGENTOPS_RUNTIME_SEMANTIC_BOUNDARY.md` | **Runtime semantic boundary** — observation-only display rules; no UI inference |
| 5 | `registry/AGENTOPS_MONITORING_RUNTIME_CONTRACT.md` | **Monitoring runtime contract** — levels 0–3, staging-only, evidence gates |
| 6 | `registry/AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK.md` | **Monitoring owner promotion + memory proposal lock** — draft → promote → live issue (5D); proposal-only memory queue (5E) |
| 7 | `registry/AGENTOPS_GLOBAL_UX_FREEZE.md` | **Global product UX freeze** — Agents Hub, Agent Detail, Issues contracts; forbidden drift |
| 8 | `registry/ACDL_SYSTEM_LOCK_v2.md` | Prior lock — semantic firewall, report structure (verify scripts reference v2 constants) |
| 9 | `registry/ACDL_CORE_LOCK_v1.md` | Single reasoning authority — ACDL CORE sole interpreter |
| 10 | `registry/HERMES_COORDINATION_CONTRACT.md` | Hermes coordination boundaries (subordinate to ACDL lock) |
| 11 | `registry/TOOL_REGISTRY.md` | External tool selection for workflow tasks |

**USL v1 implementation:** `src/lib/agentops/usl/` · verify: `scripts/agentops-usl-verify.ts`

**Runtime immutability guard:** `src/lib/agentops/runtime/acdlRuntimeImmutabilityGuard.ts` · verify: `scripts/agentops-runtime-immutability-check.ts` (CI build gate)

**Global product UX freeze:** `registry/AGENTOPS_GLOBAL_UX_FREEZE.md` · verify: `scripts/agentops-global-ux-freeze-verify.ts` · `npm run agentops:global-ux-freeze-verify` (CI build gate, after runtime checks)

**Monitoring owner promotion + memory proposal lock (Phase 5D + 5E):** `registry/AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK.md` · verify: `scripts/agentops-monitoring-owner-promotion-lock-verify.ts` · `npm run agentops:monitoring-owner-promotion-lock-verify`

### General AiXia (design and app law)

| Priority | Source | Role |
|----------|--------|------|
| 1 | `src/design-system/aixia-global/` | Living design and implementation law for AiXia |
| 2 | `.hermes.md` | Agent operating rules for this repo (not replaced by registry) |
| 3 | `registry/` | When to use which external repo/tool; where they live |
| 4 | `qa-agent/` current docs | QA, AgentOps, integration plans (non-archive banners) |
| 5 | `../repo-analysis/` outputs | Generated comparisons and architecture notes |
| 6 | External tool outputs | Advisory only (recall, MCP dumps, UA reports) |

**External repos are workflow tools** unless explicitly approved as app dependencies per `APP_DEPENDENCY_APPROVAL_RULES.md`.

## Workspace layout (parent container)

Parent folder: `AiXia-staging (42)/` — **do not** treat as the Cursor app root.

| Path (from `AiXia-github/`) | Role |
|-----------------------------|------|
| **`AiXia-github/`** (this repo) | **Only real app** — all product code, Supabase, API, approved in-app integrations |
| `../reference/` | Design inspiration repos — **read-only** |
| `../tools/` | External AI/agent/memory/analysis clones — **not** app code |
| `../repo-analysis/` | Generated reports and comparison outputs — **not** app code |
| `../archive/` | Retired or duplicate copies — **blocked** for implementation |

## Registry files

| File | Use |
|------|-----|
| `AGENTOPS_ACDL_STABLE_BASELINE.md` | **Stable baseline freeze** — Lock v2.1 + USL v1 verified record; change-control gate |
| `AGENTOPS_RUNTIME_ARCHITECTURE_FREEZE.md` | **Runtime diagnostics freeze** — read-only observability contract; forbidden behavior; A/B/C routes |
| `AGENTOPS_RUNTIME_SEMANTIC_BOUNDARY.md` | **Runtime semantic boundary** — observation-only display; no inference in observatory UI |
| `AGENTOPS_MONITORING_RUNTIME_CONTRACT.md` | **Monitoring runtime contract** — levels 0–3, staging-only, evidence gates, Phase 1 foundation |
| `AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK.md` | **Monitoring owner promotion + memory proposal lock** — Phase 5D promote + Phase 5E proposal-only memory; subordinate to ACDL + monitoring contract |
| `AGENTOPS_GLOBAL_UX_FREEZE.md` | **Global product UX freeze** — Hub, Detail, Issues vocabulary and structure lock |
| `ACDL_SYSTEM_LOCK_v2.1.md` | **Absolute architecture freeze** — immutable stack, hard prohibitions, regression checklist |
| `TOOL_REGISTRY.md` | Master list of tools and repos with status and triggers |
| `DESIGN_REPO_REGISTRY.md` | When to consult each design reference repo |
| `CURSOR_AUTO_TOOL_USE_RULES.md` | Automatic decision rules per task type |
| `REPO_IMPORT_RULES.md` | How to add new repos safely |
| `APP_DEPENDENCY_APPROVAL_RULES.md` | When something may enter `package.json` or runtime |
| `ACDL_CORE_LOCK_v1.md` | Single Reasoning Authority — ACDL CORE is sole interpreter; all other layers are non-thinking infrastructure |
| `ACDL_SYSTEM_LOCK_v2.md` | Complete system lock — semantic firewall, report structure, v10.4-only final gate, regression detection |
| `HERMES_COORDINATION_CONTRACT.md` | Hermes coordination boundaries (subordinate to ACDL lock on reasoning) |

**USL v1 (display shim, not a registry file):** `src/lib/agentops/usl/` · `scripts/agentops-usl-verify.ts`

## Core rules (summary)

1. **Edit AiXia only in `AiXia-github`** for real code changes (`src/`, `api/`, `supabase/`, etc.).
2. **Do not copy** code from `../reference/` or `../tools/` into `src/` without an approved migration plan.
3. **Do not install** packages in the parent folder, in `../reference/`, or in `../tools/` as a substitute for app work.
4. **Design references** inform patterns; **aixia-global** and shared components decide implementation.
5. Update registry rows when a tool is installed, blocked, or promoted — with Piter approval for status changes.

## Status legend (see `TOOL_REGISTRY.md`)

- **active** — use when triggers match (design refs: read-only)
- **reference-only** — design repos under `../reference/`
- **experimental** — may use with caution; not default for production paths
- **approved-tool** — cleared for routine workflow use
- **blocked** — do not use; inform Piter
- **candidate-app-dependency** — requires full approval before `package.json`

## Last updated

Registry created: 2026-06-01 (documentation bootstrap).  
AgentOps ACDL stable baseline freeze: 2026-06-25 (`AGENTOPS_ACDL_STABLE_BASELINE.md`, `ACDL_SYSTEM_LOCK_v2.1.md`).  
AgentOps monitoring owner promotion + memory proposal lock: 2026-07-07 (`AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK.md` — Phase 5D + 5E).
