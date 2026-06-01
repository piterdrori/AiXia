# AiXia Registry — Cursor Map for External Repos and Tools

This folder is **Cursor's routing map** for external repositories and workflow tools that surround the AiXia application. It does not contain application code, design law, or tool binaries.

## Purpose

- Tell Cursor **which external repo or tool to use** for a given task without Piter repeating instructions every session.
- Define **where** siblings live relative to the app (`../reference`, `../tools`, etc.).
- Prevent external material from being mistaken for **AiXia source of truth** or from polluting the app tree.

**Cursor should read this folder (and `CURSOR_AUTO_TOOL_USE_RULES.md`) before choosing external tools.**

## Authority order (what wins when sources conflict)

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
| `TOOL_REGISTRY.md` | Master list of tools and repos with status and triggers |
| `DESIGN_REPO_REGISTRY.md` | When to consult each design reference repo |
| `CURSOR_AUTO_TOOL_USE_RULES.md` | Automatic decision rules per task type |
| `REPO_IMPORT_RULES.md` | How to add new repos safely |
| `APP_DEPENDENCY_APPROVAL_RULES.md` | When something may enter `package.json` or runtime |

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
