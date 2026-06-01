# AiXia Global Design System — Batch 44 — Hermes Manifest + Memory Mirror Refresh

**Date:** 2026-05-30  
**Scope:** Context/manifest/memory-doc refresh only — no runtime, no app code, no MCP connection  
**Status:** COMPLETE

---

## 1. Purpose

Batch 43 validated AgentMemory in standalone local/staging mode (10 memories seeded, 6/6 recall PASS) but did not update Hermes export context or qa-agent memory mirrors. Those surfaces still pointed agents at `AIXIA_STANDARD.md` and old qa-agent shell-law docs as active authority.

Batch 44 aligns Hermes export manifest and qa-agent memory mirrors with the mandatory cleanup rule:

- **ONE STANDARD. ONE OWNER PER ASPECT. ONE GLOBAL DESIGN FOLDER. NO COMPETING DESIGN AUTHORITIES.**
- Active design law lives only in `src/design-system/aixia-global/` owners `00`–`16`.
- Memory mirrors law but does **not** override owner files.
- `AIXIA_STANDARD.md` remains thinned legacy implementation reference only (Batch 41).

---

## 2. Files modified

| File | Change |
|------|--------|
| `scripts/export-analytics-for-hermes.mjs` | Restructured `collectGithubManifest()` — design authority, implementation, legacy reference, Hermes memory sections |
| `qa-agent/design-system/memory/AIXIA_AI_AGENT_DESIGN_RULES_MEMORY.md` | Batch 44 authority block; owner paths; stale shell-law demoted |
| `qa-agent/design-system/memory/AIXIA_DESIGN_COMPONENT_MEMORY.md` | Batch 44 authority block; shell/hero/meta → owners `03`–`05`, `11` |
| `qa-agent/design-system/memory/AIXIA_DESIGN_SYSTEM_MASTER_MEMORY.md` | Authoritative refs updated; historical shell doc marked superseded |
| `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` | Batch 44 cleanup status; export manifest note; stale pointer table |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §4.4 Batch 44 gate note; cleanup order steps 15–16 (Batch 43/44) |

## Files created

| File | Purpose |
|------|---------|
| `qa-agent/hermes/AIXIA_HERMES_MANIFEST_MEMORY_MIRROR_REFRESH_REPORT.md` | This report |

**Not modified in Batch 44:** app code, CSS, components, pages, Supabase, guardrails, allowlists, `package.json`, package scripts, `.hermes.md` runtime config, Cursor MCP config.

---

## 3. Hermes/export manifest audit (pre-change)

**File:** `scripts/export-analytics-for-hermes.mjs`  
**Function:** `collectGithubManifest()` — embedded in analytics export as `github_context_manifest.json` under `analytics-exports/YYYY-MM-DD/`.

### Pre-Batch 44 state

| Aspect | Finding |
|--------|---------|
| **Primary design paths** | Flat `files` array listed `src/components/aixia/AIXIA_STANDARD.md` as a primary context file |
| **`aixia-global/00`–`16`** | **Not listed** |
| **Old qa-agent shell-law docs** | **Not listed** in manifest (good) but memory mirrors still cited them as current law |
| **AgentMemory/Hermes docs** | **Not listed** |
| **`.agentmemory-local/*.json`** | **Not listed** (correct) |
| **Affects app/runtime/build?** | **No** — export runs via `npm run export:analytics` (optional manual/CI step); manifest is static JSON bundled with analytics snapshots |
| **Runtime usage** | Report-only context for Hermes/agents analyzing exports — not loaded by Vite app or production runtime |

### Post-Batch 44 manifest structure

| Section | Contents |
|---------|----------|
| `design_authority` | `aixia-global/00`–`16` + `src/design-system/README.md` |
| `implementation` | `index.ts`, `aixia-design-system.css`, guardrail scripts |
| `legacy_reference` | `AIXIA_STANDARD.md` with `role: legacy-implementation-reference` |
| `hermes_memory` | Memory source-of-truth, integration plan, Batch 43 seed/report/results, this report |
| `runtime_context` | `package.json`, `App.tsx`, permissions, supabase client, analytics tracker |
| `files` | Flat union of existing paths (backward compatible) |

**Excluded by design:** `.env`, secrets, `.agentmemory-local/*.json`, old P0 shell reports as active law.

---

## 4. Hermes/export context update summary

- **Added/prioritized:** all `src/design-system/aixia-global/00`–`16` owner files.
- **Added:** Hermes/memory integration docs and Batch 43 artifacts (seed, install report, recall results).
- **Downgraded:** `AIXIA_STANDARD.md` → `legacy_reference` with explicit `role` and note (not active law).
- **Removed as active law:** no listing of Stage 3 Tier 1 shell/hero authority or old shell reports in manifest.
- **Unchanged:** analytics collection logic, Supabase queries, output schema shape (additive manifest fields only), package scripts.

**Manifest metadata:** `batch: "44-hermes-manifest-memory-mirror"` with note that active law is `aixia-global/00–16`.

---

## 5. qa-agent memory mirror update summary

All four memory files under `qa-agent/design-system/memory/` refreshed:

| Topic | Update |
|-------|--------|
| **Active law** | `src/design-system/aixia-global/` owners `00`–`16` |
| **Shell law** | `03-page-shell-standard.md` |
| **Hero law** | `04-hero-header-standard.md` |
| **Meta/status law** | `05-meta-status-strip-standard.md` |
| **Module wrapper** | `13-module-wrapper-rules.md` |
| **Migration** | `14-page-migration-rules.md` |
| **Guardrails** | `15-guardrail-rules.md` |
| **Cleanup/deprecation** | `16-design-file-cleanup-map.md` |
| **Stale shell doc** | Stage 3 Tier 1 shell/hero authority → historical/superseded only |
| **AIXIA_STANDARD.md** | Legacy implementation reference only |
| **Memory role** | Mirrors law; `aixia-global/` wins on conflict |
| **Silent refresh** | Preserved in all mirrors |
| **Paused states** | Page migration, Batch 9 finance proofs, command-surface, CSS split, archive/delete — all preserved |
| **Post-memory resume** | Return to Batch 40/41 design cleanup sequence — do not jump to page migration |

---

## 6. Batch 43 AgentMemory status carried forward

| Item | Status |
|------|--------|
| Package | `@agentmemory/agentmemory@0.9.24` via npx cache — **not** in `package.json` |
| Standalone local mode | **SUCCESS** — 10 governance memories seeded |
| Recall tests | **6/6 PASS** |
| Persist file | `qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json` (local/staging only) |
| Full REST server `:3111` | **BLOCKED** — `iii-engine v0.11.2` crash exit `3221225501` / `0xC0000409` on Windows |
| Secrets stored | **None** |
| Production touched | **No** |
| Cursor/Hermes MCP | **Deferred** — no runtime config changed in Batch 44 |
| Raw local DB in Hermes manifest | **No** — seed/report/results only |

---

## 7. Silent refresh rule status

**Preserved** in all memory mirrors and unchanged in owner files:

- Background refresh must not reset scroll, filters, forms, modals, tabs, or visible data.
- Silent refresh failure must not replace real visible data with empty arrays or zero counts.

---

## 8. Stale source-of-truth grep results

Searches run after memory mirror refresh (focus: memory mirrors + export manifest).

### Stage 3 Tier 1 shell/hero authority (historical)

| Location | Classification |
|----------|----------------|
| `qa-agent/design-system/memory/*.md` | **Fixed in Batch 44** — cited only as historical/superseded; points to owners `03`–`05`, `11` |
| `16-design-file-cleanup-map.md` | **Historical/cleanup map** — documents merge/deprecation plan |
| `qa-agent/hermes/AIXIA_HERMES_MEMORY_INTEGRATION_PLAN.md` | **Historical/planning** — pre-Batch 44 planning doc |
| Old batch reports (`Batch 37`–`42`) | **Historical only** |

### `AIXIA_STANDARD.md`

| Location | Classification |
|----------|----------------|
| `scripts/export-analytics-for-hermes.mjs` | **Fixed** — `legacy_reference` role only |
| Memory mirrors | **Fixed** — legacy bridge only |
| `AIXIA_STANDARD.md` itself | **Bannered/deprecated** — intentional |
| Batch 41/40 reports | **Historical** |

### `single source of truth` / `locked law` / `current law`

| Location | Classification |
|----------|----------------|
| Memory mirrors | **Fixed** — "current law" now points to `aixia-global/`; old docs explicitly "not current law" |
| `16-design-file-cleanup-map.md` | **Cleanup registry** — uses "KEEP AS CANONICAL INPUT" for merge targets (not competing law) |
| Historical qa-agent reports | **Historical only** — not updated (out of Batch 44 scope) |

### Still risky (monitor, not fixed this batch)

| Item | Risk | Mitigation |
|------|------|------------|
| `.hermes.md` | May contain pre-Batch 44 paths if edited elsewhere | Batch 44 did **not** change runtime Hermes config; review before MCP connect |
| Old batch reports in `qa-agent/design-system/` | Agents might read if not routed | Memory mirrors + export manifest now route to owners; archive plan deferred |
| Stage 3 Tier 1 shell/hero authority file still exists on disk | Could be misread | Cleanup map marks for merge/deprecate; not listed in export manifest; archive candidate after Batch 75 trim |

---

## 9. Cleanup map update summary

**File:** `src/design-system/aixia-global/16-design-file-cleanup-map.md`

- **§4.4** — `AIXIA_STANDARD.md` gate updated: Batch 44 manifest/mirror alignment done; archive still blocked pending Piter approval.
- **Cleanup order step 15** — Batch 43 AgentMemory local/staging test complete.
- **Cleanup order step 16** — Batch 44 Hermes manifest + memory mirror refresh complete.
- **Explicit:** raw `.agentmemory-local` not committed as source of truth; full REST/MCP deferred; no page migration.

---

## 10. Confirmation — no runtime Hermes/MCP connection changed

- **AgentMemory REST server:** not started
- **iii-engine:** not run
- **Port `:3111` / `:3113`:** nothing listening
- **Cursor MCP config:** not changed in Batch 44
- **`.hermes.md`:** not modified in Batch 44
- **Change type:** static manifest path list + memory mirror markdown only

---

## 11. Confirmation — no production touched

- No production deployment
- No main-branch push requirement for this batch
- No Supabase schema/data changes
- Export script unchanged for live analytics queries (only manifest path list)

---

## 12. Validation results

| Command | Result | Notes |
|---------|--------|-------|
| `npm run qa:validate-foundation` | **PASS** | All checks OK |
| `npm run build` | **Not run** | Export script change does not affect Vite build graph |
| `npm run export:analytics` | **Not run** | Requires `SUPABASE_SERVICE_ROLE_KEY`; no documented dry-run/manifest-only flag — do not invent |

---

## 13. Remaining blockers/risks

1. **Full AgentMemory REST server** — blocked on Windows `iii-engine` crash; needs Docker/WSL or engine fix before MCP.
2. **`AIXIA_STANDARD.md` archive** — still blocked until dependency checks, stable validation, manifest/mirror alignment validated in use, and **Piter approval**.
3. **Historical qa-agent reports** — still on disk; not purged in Batch 44 (archive plan deferred).
4. **Export manifest not exercised live** — next `export:analytics` run will emit new structure; verify JSON when credentials available.
5. **`.hermes.md`** — may need static context refresh in a future batch when MCP connect is approved (not Batch 44).

---

## 14. Recommended next batch

**Do not recommend page migration yet.**

Choose one:

| Option | Batch 45 focus |
|--------|----------------|
| **A** | Docker/WSL AgentMemory full REST server test — if Piter wants MCP/Cursor integration next |
| **B** | Return to design cleanup sequence from Batch 40/41 — archive-readiness gates, dependency checks |
| **C** | qa-agent old authority archive **plan** (documentation only — no deletion) |

**Do not recommend:** AgentOps History migration, finance shell proofs, command-surface context, CSS split, file deletion, archive execution, guardrail hard-error escalation.

**Post-memory resume rule:** After Hermes/AgentMemory track completes, resume Batch 40/41 cleanup sequence — not page migration.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/hermes/AIXIA_HERMES_MANIFEST_MEMORY_MIRROR_REFRESH_REPORT.md` |
| 2 | Files modified | 6 (see §2) |
| 3 | Hermes/export context updated | **Yes** |
| 4 | qa-agent memory mirrors refreshed | **Yes** |
| 5 | Stage 3 shell/hero authority current-law refs removed from memory mirrors | **Yes** (historical mentions only; Batch 75 path trim) |
| 6 | `AIXIA_STANDARD` downgraded in Hermes/export context | **Yes** |
| 7 | AgentMemory raw local DB included in context | **No** |
| 8 | Silent refresh rule preserved in memory mirrors | **Yes** |
| 9 | Post-memory resume point preserved | **Yes** |
| 10 | Code behavior changed | **No** |
| 11 | CSS changed | **No** |
| 12 | Pages changed | **No** |
| 13 | Components changed | **No** |
| 14 | Guardrail scripts changed | **No** |
| 15 | Package scripts changed | **No** |
| 16 | Hermes runtime config changed | **No** |
| 17 | AgentMemory server started | **No** |
| 18 | Cursor/Hermes MCP connected | **No** |
| 19 | Production touched | **No** |
| 20 | Main Supabase touched | **No** |
| 21 | `AIXIA_STANDARD` archived/deleted | **No** |
| 22 | Page migrations remain paused | **Yes** |
| 23 | Batch 9 finance proofs paused | **Yes** |
| 24 | Command-surface context paused | **Yes** |
| 25 | Command results | `qa:validate-foundation` PASS; export analytics not run (no dry-run; needs service key) |
| 26 | Final status | **Batch 44 COMPLETE** |
| 27 | Recommended next batch | **B** (design cleanup / archive-readiness) or **A** (Docker/WSL REST test if MCP priority) or **C** (qa-agent archive plan) |

---

*End of Batch 44 report.*
