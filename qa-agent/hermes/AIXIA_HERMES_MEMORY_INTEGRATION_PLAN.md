# AiXia Hermes + Persistent Memory Integration Plan

**Batch:** 42 (architecture/planning only — no install, no runtime changes)  
**Date:** 2026-05-30  
**Status:** PLAN APPROVED FOR REVIEW — install blocked until Batch 43 gates + Piter approval

---

## Executive summary

AiXia now has **one active design authority**: `src/design-system/aixia-global/` owner files `00`–`16`. Batch 41 thinned `AIXIA_STANDARD.md` to a legacy implementation reference only. The next strategic layer is **Hermes + persistent memory** — not as a competing law source, but as an **operational memory and agent coordination layer** that routes all agents back to canonical owner files, preserves project continuity, and prevents repeated mistakes.

**This batch does not install anything.** It defines role, memory model, context manifest, silent-refresh rule, AgentMemory evaluation, install-readiness checklist, and memory seed plan for Batch 43+.

### Terminology (critical)

| Term | Meaning in AiXia |
|------|------------------|
| **AiXia Hermes** | Project operational memory layer: `.hermes.md`, `qa-agent/design-system/memory/*`, `qa-agent/hermes/*`, analytics export, future AgentOps adapter — coordinates Cursor/agents on AiXia work |
| **Hermes Agent** | External agent framework (`~/.hermes/config.yaml`) — **agentmemory** documents native plugin + MCP integration for this product |
| **agentmemory** | Third-party persistent memory server (`@agentmemory/agentmemory`) — candidate backend for Batch 43 local/staging test only |

AiXia Hermes rules in `.hermes.md` remain valid for Cursor sessions but **must be updated** to cite `aixia-global/` as canonical law (planned Batch 43 alt or Batch 44).

---

## PART 1 — Hermes role definition

### Hermes must be (AiXia operational layer)

Hermes is the **essential operational memory and agent coordination layer** for:

| Domain | Hermes responsibility |
|--------|----------------------|
| Design source-of-truth awareness | Always read `aixia-global/00`–`16` first; route agents to correct owner file |
| Page migration awareness | Know paused/unpaused state; never silently migrate |
| Guardrail awareness | Know build/QA guardrails, owner phrase coverage, warn vs hard-error policy |
| QA report memory | Surface latest static guardrails, action plan, browser QA, foundation validation |
| Known issue memory | Track recurring violations, finance print debt, shell/hero warn-only routes |
| Batch history memory | Batches 10–42 decisions, why paused, what completed |
| Future agent briefing | Pre-task context packs for Cursor/build agents |
| Mistake prevention | Lessons from Piter locked rules, silent refresh, no local design law |
| Project continuity | Bridge sessions without re-explaining architecture |

### Hermes must not

| Forbidden behavior | Reason |
|--------------------|--------|
| Override `aixia-global/` | Memory mirrors law; owner files win on conflict |
| Invent design rules | New law goes only into correct owner file `00`–`16` |
| Change code without approved task scope | `.hermes.md` hard rule |
| Bypass guardrails | Build/QA rules are mandatory |
| Treat old reports as current law | e.g. Stage 3 bannered authority inputs, P0 reports = history only |
| Silently migrate pages | Page migrations explicitly paused |
| Write memory that contradicts owner files | Memory must cite owner path + "if conflict, owner wins" |
| Interrupt active user workflows | No page jumps, scroll resets, modal closures, filter/sort/tab resets, form edit loss, chat interruption, visible reloads |
| Run sync/QA/analytics in ways that violate silent refresh | Applies to app refresh **and** agent-driven re-fetch patterns that would trigger UI state loss in product pages |
| Silently change source-of-truth or implementation | Proposals only — Piter approves owner-file/guardrail/code changes per `00` §0.4 |

### 12-agent future infrastructure (Batch 51 — planning note)

When the 12 AiXia agents operate at full scope (crawl/test/play within approved boundaries):

| Capability | Rule |
|------------|------|
| **Role/scope memory** | Each agent carries role and approved scope — not competing design law |
| **Explore and test** | Crawl, browser QA, AgentOps findings within approved scope to discover design/logic/UX/workflow issues |
| **Report with evidence** | Classify as implementation bug, source-of-truth gap, or new standard; attach browser QA, code inspection, or repeated-mistake evidence |
| **Hermes routing** | Hermes routes proposals to the **correct owner file** (`00` §0.2) — memory records as proposal, not law |
| **Approval gate** | **Piter approves** before source-of-truth files, guardrails, code, CSS, schemas, workflows, or page behavior change |
| **Follow current law** | Until approved update exists, agents follow `aixia-global/` during implementation — living law, not frozen law |

See: `00-README-SOURCE-OF-TRUTH.md` §0.4 · `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` · `.cursor/rules/aixia-living-source-of-truth.mdc`

### Current Hermes assets (existing, not modified in Batch 42)

| Asset | Role | Gap vs target |
|-------|------|---------------|
| `.hermes.md` | Cursor project Hermes rules (analytics auto-run, Apple-level layout, rewrite prompts) | Does not cite `aixia-global/` as sole design law; still implies shared CSS/components as law without owner-file routing |
| `qa-agent/design-system/memory/*.md` | Persistent qa-agent memory (4 files) | **Was stale (Batch 42):** cited Stage 3 shell/hero authority as locked law — **fixed Batches 44 + 75**; mirrors point to `aixia-global/` |
| `qa-agent/hermes/*.md` | Adapter design, safety, staging activation (12 files) | Hermes **not active** in app; database-only mode |
| `scripts/export-analytics-for-hermes.mjs` | Analytics + `github_context_manifest.json` | Still lists `AIXIA_STANDARD.md`; missing `aixia-global/00`–`16` |
| `qa-agent/agentops/*` | AgentOps reports, Hermes phases 5A–5E | Advisory mock layer only |

---

## PART 2 — Memory model

Memory is **layered**. Higher layers summarize; **Layer A is law**. On conflict, Layer A wins.

### Layer A — Canonical law memory

| Field | Value |
|-------|-------|
| **Source** | `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md` through `16-design-file-cleanup-map.md` |
| **Purpose** | Hermes must always know these files first |
| **Write policy** | Agents write new/changed rules **only** into owner files — never only into memory |
| **Recall policy** | Memory entries must include owner file path + section anchor |

### Layer B — Implementation reference memory

| Field | Value |
|-------|-------|
| **Source** | `src/components/aixia/index.ts`, shared components, `src/styles/aixia-design-system.css`, dashboard CSS, guardrail scripts, thinned `AIXIA_STANDARD.md` |
| **Purpose** | How law is implemented in code/CSS |
| **Write policy** | Summaries only; link to owner file for behavior law |
| **Note** | `AIXIA_STANDARD.md` = legacy bridge/index only — not active law |

### Layer C — Batch/project history memory

| Field | Value |
|-------|-------|
| **Source** | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_*`, P0 batches, AgentOps phase reports |
| **Purpose** | What was done, why, and in what order |
| **Write policy** | Historical; label report date and supersession |

### Layer D — Current status memory

| Field | Value |
|-------|-------|
| **Source** | Latest batch report (Batch 41/42), `16-design-file-cleanup-map.md`, migration watch registry, AgentOps control panel status |
| **Purpose** | What is paused, next safe batch, what is unsafe |
| **Write policy** | Refresh after each batch; single "current status" entry preferred |

**Current paused states (locked):**

- Page migrations — **PAUSED**
- Batch 9 finance proofs — **PAUSED**
- Command-surface context — **PAUSED**
- CSS split — **PAUSED**
- Archive/delete — **PAUSED**
- Guardrail hard-error escalation — **PAUSED**
- agentmemory install — **PAUSED** (until Batch 43 + Piter approval)

### Layer E — Lessons/mistakes memory

| Field | Value |
|-------|-------|
| **Source** | Piter locked rules (`.hermes.md`, owner `00` §0, `14`/`15`), recurring guardrail violations |
| **Purpose** | Prevent repeated errors |
| **Examples** | No local design law; silent refresh; shell/hero before page patch; finance print shared system |

### Layer F — Runtime/analytics memory

| Field | Value |
|-------|-------|
| **Source** | `npm run analytics:hermes`, `scripts/export-analytics-for-hermes.mjs`, static guardrails JSON, future AgentOps telemetry |
| **Purpose** | Learn from real usage and QA findings |
| **Write policy** | Aggregated/sanitized only — no secrets, no raw PII |

---

## PART 3 — Required Hermes context manifest

Plan a **Hermes context manifest** (future: extend `github_context_manifest.json` or parallel `hermes_context_manifest.json`) that always includes the following tiers.

### Tier 1 — Design authority (always first)

```
src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md
src/design-system/aixia-global/01-design-tokens.md
src/design-system/aixia-global/02-typography-standard.md
src/design-system/aixia-global/03-page-shell-standard.md
src/design-system/aixia-global/04-hero-header-standard.md
src/design-system/aixia-global/05-meta-status-strip-standard.md
src/design-system/aixia-global/06-card-section-standard.md
src/design-system/aixia-global/07-button-action-standard.md
src/design-system/aixia-global/08-table-list-standard.md
src/design-system/aixia-global/09-form-input-standard.md
src/design-system/aixia-global/10-modal-drawer-standard.md
src/design-system/aixia-global/11-scroll-responsive-standard.md
src/design-system/aixia-global/12-navigation-workspace-standard.md
src/design-system/aixia-global/13-module-wrapper-rules.md
src/design-system/aixia-global/14-page-migration-rules.md
src/design-system/aixia-global/15-guardrail-rules.md
src/design-system/aixia-global/16-design-file-cleanup-map.md
src/design-system/README.md  (wrapper — delegates to 00)
```

### Tier 2 — Implementation reference

```
src/components/aixia/index.ts
src/components/aixia/AIXIA_STANDARD.md          (legacy reference only — bannered)
src/styles/aixia-design-system.css
src/styles/dashboard/tokens.css
src/styles/dashboard/layout.css
src/styles/dashboard/visual.css
scripts/aixia-guardrails.mjs
scripts/guardrails/aixia-owner-phrase-coverage-report.mjs
scripts/guardrails/aixia-shell-hero-guardrails.mjs
scripts/guardrails/aixia-shadcn-boundary-guardrails.mjs
```

### Tier 3 — Status and coordination

**Batch 62 path trim:** Batch 41/42 execution reports are **historical evidence only** — not active Hermes context. Do not add root-path report files to the live manifest; use batch-number status below.

```
src/design-system/aixia-global/16-design-file-cleanup-map.md
# Batch 41 — AIXIA_STANDARD Stage 4 thinning completed; report may be archived as historical evidence (not active Hermes context)
# Batch 42 — Hermes/memory integration plan completed; report may be archived as historical evidence (not active Hermes context)
# Stage 3 Wave A owner collision audit — historical merged input only (not active Hermes context); content in `16`
qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md
qa-agent/reports/static-design-guardrails.json   (latest scan — path only in manifest)
qa-agent/reports/guardrail-action-plan.json
```

### Tier 4 — Behavior rules (must cite owner files)

```
src/design-system/aixia-refresh-rules.md         (input doc — behavior; merged into 11/13/14/15)
qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md  (silent refresh summary)
```

### Explicitly remove or downgrade (never as active law in manifest)

| Path | New classification |
|------|-------------------|
| Stage 3 Tier 1 shell/hero authority (historical merged input) | **Historical** — superseded by `03`, `04`, `05`, `11` |
| Old qa-agent shell-law reports (P0 batch reports as law) | **Historical mirror only** |
| `src/design-system/aixia-*-rules.md` (bannered) | **Deprecated reference** — not current law |
| `AIXIA_STANDARD.md` as design law | **Downgrade** — legacy implementation reference only |
| `qa-agent/design-system/memory/*` when stale | **Mirror** — must be refreshed to point at `aixia-global/` |

### Planned script change (Batch 43 alt — not executed in Batch 42)

Update `scripts/export-analytics-for-hermes.mjs` `collectGithubManifest()`:

- **Remove** `AIXIA_STANDARD.md` as primary design authority entry (or keep with `role: legacy-reference` metadata)
- **Add** `aixia-global/00` and owner files `01`–`16`
- **Add** `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md`

---

## PART 4 — Refresh and silent-update memory requirement

### Hermes memory rule (locked text for seed + mirror)

> **Silent refresh is a hard AiXia behavior rule.** Any realtime refresh, manual refresh, fallback refresh, data sync, browser QA rerun, AgentOps sync, or AI-driven update must **not** cause page jump, scroll reset, filter reset, sort reset, tab reset, modal close, form edit loss, section collapse, conversation interruption, or visible full-page reload after initial load. Refresh must preserve current user state and update only affected data in place unless Piter explicitly approves a different behavior.

### Owner-file mapping

| Owner file | Relevant sections |
|------------|-------------------|
| `11-scroll-responsive-standard.md` | §4 canonical model — scroll preservation; §I silent refresh and scroll preservation; no scroll jumps during silent refresh |
| `13-module-wrapper-rules.md` | Silent refresh via `aixia-refresh-rules.md` input; preserve scroll/filters/modals/editing state |
| `14-page-migration-rules.md` | Migration must not change silent behavior; tabs/filters/sort preserved; silent refresh QA gate |
| `15-guardrail-rules.md` | Guardrail expectation: silent refresh does not jump scroll/filters |

### Hermes operational extension

When Hermes or agentmemory triggers **background sync** (analytics pull, QA re-scan, memory refresh):

- Must not instruct agents to implement patterns that cause UI state loss
- Must not recommend full page remounts for live data updates
- Browser QA reruns must use non-destructive navigation patterns where possible
- AgentOps sync remains advisory-only until explicit approval gates pass

---

## PART 5 — AgentMemory evaluation

**Source inspected:** Public README at `https://github.com/rohitg00/agentmemory` (raw README, 2026-05-30). No install performed.

### Evaluation table

| Capability | Relevance to AiXia/Hermes | Install/runtime requirement | Data storage location | MCP/REST/Hermes support | Security risk | Local/staging suitability | Production suitability | Recommendation |
|------------|---------------------------|----------------------------|----------------------|---------------------------|---------------|---------------------------|------------------------|----------------|
| Persistent memory server | High — matches Piter everlasting-improvement goal | Node.js; `iii-engine` v0.11.2 pinned; optional Docker | `~/.agentmemory/` (config `.env`; export root `AGENTMEMORY_EXPORT_ROOT=~/.agentmemory`; Docker `/data`) | MCP (53 tools with server; 7-tool shim fallback), REST `:3111`, Hermes native plugin | Local server binds `127.0.0.1` by default; optional `AGENTMEMORY_SECRET`; secrets stripped pre-storage per docs | **Good** — local/staging first | **Not yet** — needs policy, backup, Piter approval | **Plan now; install Batch 43 local only** |
| Hybrid search (BM25 + embeddings) | High — recall across batches/owners | Local embeddings default (`all-MiniLM-L6-v2` / BGE-small); no API key required for no-op mode | Same as above | via MCP `memory_smart_search`, REST `/agentmemory/smart-search` | Embedding model runs locally; LLM optional | Good | Defer | Seed with sanitized summaries only |
| Hermes Agent integration | Medium-high for external Hermes Agent users | `~/.hermes/config.yaml` + plugin copy from `integrations/hermes/` | Hermes plugin + shared agentmemory store | **Documented:** `memory.provider: agentmemory`, MCP block | Modifies `~/.hermes/` — not AiXia repo | Staging test only | No | Do not connect until Batch 43 validation |
| Cursor MCP integration | High — primary AiXia agent surface | Merge into `~/.cursor/mcp.json`; requires running server at `:3111` | User-level MCP config + agentmemory store | **Documented:** standard MCP block with `@agentmemory/mcp` | MCP shim may reach localhost; sandbox needs `AGENTMEMORY_FORCE_PROXY` | Good for dev machine | No | Batch 43 test mode only after Piter approval |
| Real-time viewer | Medium — debug memory graph | Auto `:3113`, loopback | N/A | HTTP viewer | Local only by default | Good | No | Optional in Batch 43 |
| Session hooks / auto-capture | Medium — risk of over-capture | Agent-specific plugins/hooks | Observations in agentmemory KV | Hooks per agent | May capture code snippets — need AiXia redaction policy | Staging with filters | No | Disable auto-capture until seed policy approved |
| Team share / mesh sync | Low for now | `TEAM_ID`, mesh endpoints | Shared instances | REST mesh | Cross-instance sync risk | No | No | **Exclude** until security review |
| Governance delete / export | High — rollback requirement | `memory_export`, `memory_governance_delete`, `agentmemory remove` | Export via REST `/agentmemory/export` | MCP + REST | Export may contain sensitive snippets if mis-seeded | Required for staging | N/A | Mandatory in Batch 43 test plan |

### Required facts verified from public docs

| Question | Verified answer |
|----------|-----------------|
| Exact install command | `npm install -g @agentmemory/agentmemory` **or** `npx @agentmemory/agentmemory` / `npx -y @agentmemory/agentmemory@latest` |
| Global install required? | **No** — global optional; npx supported; README recommends global to avoid stale npx cache |
| Local/npx usage supported? | **Yes** |
| Default port | **3111** (REST/MCP HTTP); also **3112** (WebSocket), **3113** (viewer), **49134** (iii bridge) |
| Server start command | `agentmemory` or `npx @agentmemory/agentmemory` |
| Server stop command | `agentmemory stop` (graceful); manual kill if crashed |
| Memory storage path | **`~/.agentmemory/`** (`.env` config); `AGENTMEMORY_EXPORT_ROOT=~/.agentmemory`; Docker persistent mount **`/data`** |
| MCP support | **Yes** — `@agentmemory/mcp` shim; 53 tools with server, 7 without |
| REST support | **Yes** — 125 endpoints on `:3111`; health at `GET /agentmemory/health` |
| Hermes compatibility | **Yes** — documented native plugin + `memory.provider: agentmemory` in `~/.hermes/config.yaml` |
| Cursor compatibility | **Yes** — merge MCP block into `~/.cursor/mcp.json` |
| Uninstall/reset | `agentmemory remove`; `memory_governance_delete`; REST forget/import; delete `~/.agentmemory/` for full reset |
| Security/privacy | Docs claim API keys/secrets stripped before storage; optional bearer token; local bind default; LLM providers opt-in |

### Ten evaluation questions — answers

1. **Hermes or generic MCP/REST?** Both — generic MCP/REST for any client; dedicated Hermes Agent plugin documented separately from AiXia `.hermes.md`.
2. **Global install required?** No — npx/local supported; global recommended by upstream for version freshness.
3. **Local server?** Yes — must run memory server for full 53-tool MCP surface.
4. **Default port?** **3111** (primary).
5. **Storage location?** **`~/.agentmemory/`** (user home); Docker `/data`.
6. **Multiple agents share?** Yes — one server, shared memory; optional `AGENT_ID` + `AGENTMEMORY_AGENT_SCOPE=isolated`.
7. **Install now?** **No** — create integration plan first (this batch); install Batch 43 after Piter approval.
8. **Staging/local first?** **Yes** — mandatory.
9. **Data must not be stored?** Secrets, service role keys, production credentials, private customer data, personal sensitive data, unfinished guesses as facts, outdated reports as current law.
10. **Prevent competing law?** Seed with "owner wins" rule; memory entries are summaries + pointers; new rules written to owner files; periodic mirror refresh from `aixia-global/`; no design law writes to agentmemory only.

### Recommendation

**Do not install in Batch 42.** Proceed to **Batch 43 — local/staging install + recall test** only after Piter approves this plan. Prefer **project-scoped staging** with explicit seed categories and export/reset drills before any Cursor MCP merge.

---

## PART 6 — Installation readiness checklist

**Gate: all items must be checked before Batch 43 install.**

| # | Check | Owner | Status |
|---|-------|-------|--------|
| 1 | Confirm local/staging only — no production Vercel/Supabase prod writes | Piter | Pending |
| 2 | Confirm no production customer/analytics raw export into memory | Piter | Pending |
| 3 | Confirm memory storage path (`~/.agentmemory/` or project-local override) documented | Agent | Pending |
| 4 | Confirm backup/export path (`memory_export`, REST `/agentmemory/export`) tested | Agent | Pending |
| 5 | Confirm MCP connection method (Cursor test MCP vs Hermes Agent plugin) chosen | Piter | Pending |
| 6 | Confirm Cursor compatibility on Windows dev machine | Agent | Pending |
| 7 | Confirm security/privacy rules written (see Part 7 seed exclusions) | Agent | **Draft in this plan** |
| 8 | Confirm memory categories A–F mapped to seed entries | Agent | **Draft in Part 7** |
| 9 | Confirm reset/delete process (`agentmemory remove`, governance delete) documented | Agent | Pending |
| 10 | **Piter approval** for Batch 43 install | Piter | **Required** |

### Proposed Batch 43 (install batch — not executed yet)

1. Install `@agentmemory/agentmemory` **locally/staging only** (`npx` — no global unless approved)
2. Start server; verify `curl http://localhost:3111/agentmemory/health`
3. Document port behavior (`3111`, `3113`, `49134`)
4. Seed memory from `aixia-global/` summaries (Layer A) + status + silent refresh rule
5. Run recall test (`memory_smart_search` for "silent refresh", "owner file 04")
6. Verify recalled memory **does not override** owner file wording — cites paths only
7. Connect Cursor MCP **test mode only** if approved — do not merge to shared prod configs
8. Document rollback: `agentmemory stop`, `agentmemory remove`, delete seed export, remove MCP entry

**Alternative Batch 43** (if install not approved): Hermes manifest script update + qa-agent memory mirror refresh only.

---

## PART 7 — Memory seed plan

### Seed categories (first import)

| ID | Category | Seed content | Source |
|----|----------|--------------|--------|
| S1 | Authority root | ONE STANDARD / ONE OWNER / ONE FOLDER / NO COMPETING AUTHORITIES | `00` §0 |
| S2 | Owner index | Table mapping aspect → owner file `01`–`16` | `00` §0.2 |
| S3 | Paused states | Page migration, finance proofs, command-surface, CSS split, archive/delete | Batch 41/42 reports + `16` |
| S4 | Cleanup status | Batch 41 AIXIA_STANDARD thinned; not archive-ready | `16` §4.4, Batch 41 report |
| S5 | Hermes role | Operational memory — not law; routes to owners | This plan Part 1 |
| S6 | Silent refresh rule | Full locked text + owner map `11`/`13`/`14`/`15` | Part 4 |
| S7 | No local design law | Finance/product pages — extend shared components/CSS first | `00`, `13`, `15` |
| S8 | No page migration without approval | Explicit pause + `14` gates | `14`, `16` |
| S9 | Code instruction format | Inspect owners + shared components before edit; report files touched | `.hermes.md`, `15` |
| S10 | Shared component SOT | Implementation in `src/components/aixia/*` + CSS; law in owners | `AIXIA_STANDARD` thinned + `00` |
| S11 | AgentOps status | Hermes adapter advisory-only; mock responses; not active in app | `qa-agent/hermes/hermes-adapter-design.md` |
| S12 | Archive/delete gates | AIXIA_STANDARD, old docs — Hermes manifest + memory mirror + Piter approval | `16`, Batch 41 |

### Must not seed

- Secrets, Supabase service role keys, `.env` values
- Private customer/vendor PII from analytics exports
- Production credentials or production-only endpoints
- Personal sensitive data
- Unfinished guesses stated as facts
- Outdated reports (Stage 3 bannered authority inputs, P0 reports) as **current law**
- Full owner file copies (seed **summaries + pointers** only — owners remain canonical in repo)

### Seed delivery method (Batch 43)

1. Manual curated markdown → `memory_save` / REST `/agentmemory/remember`
2. Optional: script-generated seed JSON from owner headings (read-only extract — no auto-law)
3. Verify each seed entry includes: `canonical_owner`, `supersedes_nothing`, `if_conflict_owner_wins`

---

## PART 8 — Prevent memory from becoming competing law

### Governance rules (mandatory)

1. **Read order:** `aixia-global/00` → relevant owner → implementation → memory → history reports
2. **Write order:** New/changed rules → owner file first → then optional memory summary pointing to owner
3. **Conflict rule:** If memory ≠ owner file, **owner file wins**; memory must be corrected or deleted
4. **Classification tags:** Every memory entry: `layer:A-F`, `status:current|historical`, `owner_path` (if applicable)
5. **Refresh cadence:** After each global design batch, update Layer D + mirror file `AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md`
6. **No autonomous migration:** Memory must not trigger page migrations or archive/delete
7. **Silent refresh:** Memory must not recommend patterns that break user state preservation

---

## Related documents

| Document | Role |
|----------|------|
| `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` | Short mirror for agents — read after `00` |
| Batch 42 — Hermes/memory integration execution report | Historical evidence only; archive candidate after re-grep + Piter approval; **not** active Hermes read chain (Batch 62 path trim) |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | Cleanup gates including Hermes/memory blocker |
| `qa-agent/hermes/hermes-safety-policy.md` | Existing safety envelope — align on Batch 43 |
| `qa-agent/hermes/hermes-adapter-design.md` | Future in-app Hermes — separate from agentmemory server |

---

## Recommended next batch

**Primary:** Batch 43 — Install and test `agentmemory` locally/staging only (after Piter approval).

**Alternative:** Batch 43 — Hermes manifest/context script update + qa-agent memory mirror refresh (if install not approved).

**Do not recommend yet:** page migration, AgentOps History migration, finance shell proofs, command-surface context, CSS split, archive/delete, guardrail hard-error escalation.
