# AiXia AgentMemory Local/Staging Install Report — Batch 43

**Date:** 2026-05-30  
**Scope:** Local/staging install and test only — no production, no app code changes  
**Predecessor:** Batch 42 Hermes + memory integration plan

---

## 1. Purpose

Install and test `@agentmemory/agentmemory` locally for the AiXia staging repo; seed safe summarized memory from `aixia-global/` governance rules; run recall tests proving memory routes to owner files and does **not** become competing law.

---

## 2. Files created

| File | Role |
|------|------|
| `qa-agent/hermes/AIXIA_AGENTMEMORY_INITIAL_SEED.md` | Safe seed content (no secrets) |
| `qa-agent/hermes/scripts/batch43-seed-and-recall.mjs` | Standalone seed + recall test script |
| `qa-agent/hermes/batch43-recall-results.json` | Recall test results (6/6 PASS) |
| `qa-agent/hermes/AIXIA_AGENTMEMORY_LOCAL_STAGING_INSTALL_REPORT.md` | This report |
| `qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json` | Staging persist store (generated — do not treat as law) |
| `qa-agent/hermes/bin/iii.exe` | Downloaded `iii-engine v0.11.2` for server attempt (local test artifact — do not commit) |
| `qa-agent/hermes/bin/iii-x86_64-pc-windows-msvc.zip` | Download archive (local test artifact) |
| `qa-agent/hermes/batch43-agentmemory-server.log` | Server start attempt log |
| `qa-agent/hermes/batch43-iii-engine.log` | iii-engine crash log |

**Also on user machine (outside repo):**

| Path | Role |
|------|------|
| `%LOCALAPPDATA%\npm-cache\_npx\...\ @agentmemory/agentmemory@0.9.24` | npx package cache |
| `%USERPROFILE%\.local\bin\iii.exe` | Copied iii binary per upstream Windows docs |

---

## 3. Files modified

| File | Change |
|------|--------|
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | Batch 43 AgentMemory test status; cleanup order step 15 |
| `qa-agent/design-system/memory/AIXIA_HERMES_MEMORY_SOURCE_OF_TRUTH.md` | Batch 43 install/recall status, persist path, rollback |

**Not modified:** `package.json`, `.hermes.md`, `~/.cursor/mcp.json`, guardrails, code, CSS, pages, components, Supabase, `export-analytics-for-hermes.mjs`.

---

## 4. AgentMemory repo/docs findings (verified from public README + live CLI)

| Fact | Verified value |
|------|----------------|
| Install command | `npx -y @agentmemory/agentmemory@latest` **or** `npm install -g @agentmemory/agentmemory` |
| Global required | **No** — npx/local supported |
| Version installed (npx) | **0.9.24** |
| Default REST port | **3111** |
| Viewer port | **3113** (loopback) |
| iii WebSocket | **49134** |
| Server start | `npx @agentmemory/agentmemory` or `agentmemory` |
| Server stop | `agentmemory stop` |
| Standalone MCP (no engine) | `npx @agentmemory/agentmemory mcp` |
| Health check | `GET http://localhost:3111/agentmemory/health` |
| Default storage | `~/.agentmemory/` (`.env`, export root) |
| Standalone persist | `~/.agentmemory/standalone.json` or `STANDALONE_PERSIST_PATH` |
| MCP | `@agentmemory/mcp` — 53 tools with server; 7-tool local fallback |
| REST | 125 endpoints on `:3111` when server running |
| Hermes Agent | Documented `memory.provider: agentmemory` in `~/.hermes/config.yaml` |
| Cursor | Merge MCP block into `~/.cursor/mcp.json` |
| Uninstall | `agentmemory remove`; delete `~/.agentmemory/`; delete staging persist file |
| Windows requirement | **iii-engine v0.11.2** binary or Docker — npm package alone insufficient |

---

## 5. Pre-install safety checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Local/staging only | **Yes** — staging repo path only |
| 2 | Repo path confirmed | `AiXia-github` staging workspace |
| 3 | No production credentials | **Confirmed** — no `.env` ingested |
| 4 | No production Supabase | **Confirmed** — no Supabase calls |
| 5 | No production Vercel | **Confirmed** |
| 6 | No secrets stored | **Confirmed** — seed is public governance text only |
| 7 | Memory storage path identified | `qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json` |
| 8 | Port identified | **3111** (target; not listening — see blocker) |
| 9 | Install command identified | `npx -y @agentmemory/agentmemory@latest --version` |
| 10 | Rollback command identified | Delete persist file; `agentmemory remove`; stop processes |
| 11 | Piter approval for Batch 43 local test | **Assumed per task assignment** |

---

## 6. Install command used

```powershell
npx -y @agentmemory/agentmemory@latest --version
```

**Output:** `0.9.24`  
**Install location:** npm npx cache (`%LOCALAPPDATA%\npm-cache\_npx\...`) — **not** added to repo `package.json`.

---

## 7. Runtime/server commands attempted

### Full server (failed on this Windows host)

```powershell
# PATH includes qa-agent/hermes/bin/iii.exe
npx -y @agentmemory/agentmemory@latest --verbose
# Also: node .../dist/cli.mjs --verbose with iii on PATH
```

**Result:** `iii-engine` starts then crashes with exit code **3221225501** (`0xC0000409`) after registering HTTP trigger on port 3111. Health check never responded.

**iii-engine direct:**

```powershell
iii.exe --config .../dist/iii-config.yaml
```

Same crash. Docker unavailable on machine.

### Successful test path — standalone local mode (documented fallback)

```powershell
$env:STANDALONE_PERSIST_PATH = "qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json"
node qa-agent/hermes/scripts/batch43-seed-and-recall.mjs
```

Uses exported `handleToolCall` from `@agentmemory/agentmemory/dist/standalone.mjs` — falls back to local InMemoryKV when `:3111` unreachable (per upstream MCP shim behavior).

---

## 8. Port and health check

| Port | Expected | Actual |
|------|----------|--------|
| 3111 | REST/MCP HTTP | **Not listening** — iii-engine crash |
| 3113 | Viewer | **Not started** |
| 49134 | iii WebSocket | **Not started** |

**Health check:**

```powershell
curl.exe -s http://127.0.0.1:3111/agentmemory/health
```

**Result:** connection failed (expected — server not running).

---

## 9. Memory storage path

| Store | Path |
|-------|------|
| **Batch 43 staging persist (used)** | `qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json` |
| Default standalone (docs) | `%USERPROFILE%\.agentmemory\standalone.json` |
| Full server data (docs) | `%USERPROFILE%\.agentmemory\` + `./data/` under engine cwd |

**Memories after seed:** **10** entries in staging persist file.

---

## 10. Seed file summary

Source: `qa-agent/hermes/AIXIA_AGENTMEMORY_INITIAL_SEED.md`

Seeded topics:

1. Authority hierarchy — `aixia-global/00`–`16`
2. Conflict rule — owner wins
3. Silent refresh hard rule
4. Paused states (migrations, finance proofs, command-surface, CSS split, archive)
5. Post-memory resume — Batch 44 manifest/mirror; no page migration
6. No design law in memory only
7. No local design law
8. AIXIA_STANDARD thinned legacy status
9. Hermes operational role
10. Exact code-instruction rule

**No secrets, keys, customer data, or `.env` content.**

---

## 11. Seed result

| Metric | Result |
|--------|--------|
| Method | `memory_save` via standalone `handleToolCall` |
| Entries created | **10** |
| Errors | **0** |
| Persist file written | **Yes** |

---

## 12. Recall test table

| # | Query | Expected | Result | Pass |
|---|-------|----------|--------|------|
| 1 | active AiXia design source of truth | `aixia-global/`, 00–16 | Top hit cites `src/design-system/aixia-global/` owner files 00–16 | **PASS** |
| 2 | memory conflicts aixia-global | owner wins | Top hit: "owner file wins" / "aixia-global wins" | **PASS** |
| 3 | silent refresh rule | no scroll/filter/modal reset; preserve state | Top hit lists scroll/filter/modal/chat/reload prohibitions | **PASS** |
| 4 | migrate AgentOps History | paused / not approved | Top hit: "PAUSED", "NOT approved" | **PASS** |
| 5 | next step after Hermes AgentMemory track | Batch 44 / design cleanup; no page migration | Top hit: Batch 44 manifest; do NOT jump to page migration | **PASS** |
| 6 | design rules stored only memory | must go to owner files | Top hit: "must NOT be stored only in memory" | **PASS** |

**Overall:** **6/6 PASS** — see `qa-agent/hermes/batch43-recall-results.json`.

**Correction needed:** None for seeded content. Full-server recall on `:3111` not tested (blocked).

---

## 13. Hermes/Cursor connection status

**Deferred — not applied in Batch 43.**

Reason:

- Full REST server not running on this Windows host (iii-engine crash).
- Standalone MCP merge to `~/.cursor/mcp.json` requires explicit Piter approval for persistent user-level config change.
- No autonomous execution enabled; no production workflows connected.

**Documented future test-mode block (not applied):**

```json
"agentmemory": {
  "command": "npx",
  "args": ["-y", "@agentmemory/mcp"],
  "env": {
    "AGENTMEMORY_URL": "http://localhost:3111",
    "STANDALONE_PERSIST_PATH": "<repo>/qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json"
  }
}
```

Use only after full server works **or** Piter approves standalone-only MCP with staging persist path.

---

## 14. Security/privacy notes

- No secrets, Supabase service keys, production credentials, or customer data seeded.
- Staging persist file contains only public governance summaries.
- iii-engine and agentmemory bind `127.0.0.1` by default when running (not exposed this batch).
- Standalone local mode uses BM25-style keyword match (no LLM, no embeddings API) — appropriate for governance keyword recall test.
- Do not commit `qa-agent/hermes/bin/iii.exe` or `.agentmemory-local/*.json` to Git unless explicitly approved.

---

## 15. Backup / export / reset / uninstall

| Action | Command / steps |
|--------|-----------------|
| **Backup staging memory** | Copy `qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json` |
| **Export (standalone script)** | `memory_export` via `batch43-seed-and-recall.mjs` pattern or standalone handleToolCall |
| **Export (full server, when running)** | `GET http://localhost:3111/agentmemory/export` |
| **Reset staging seed** | Delete `qa-agent/hermes/.agentmemory-local/aixia-batch43-standalone.json`; re-run seed script |
| **Stop server** | `npx @agentmemory/agentmemory stop` or kill process on 3111 |
| **Uninstall agentmemory** | `npx @agentmemory/agentmemory remove` (user-level state); delete npx cache optional |
| **Remove iii binary** | Delete `qa-agent/hermes/bin/iii.exe` and `%USERPROFILE%\.local\bin\iii.exe` if copied |
| **Confirm no server** | `netstat -ano \| findstr ":3111"` → no listeners |

---

## 16. What was not changed

- Production / main GitHub / Vercel / Supabase
- Application code, CSS, pages, components
- Guardrail scripts and behavior
- `package.json` / npm scripts
- `.hermes.md`, Hermes runtime config
- Cursor MCP config
- Page migrations, finance proofs, archive/delete

---

## 17. Validation result

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |
| `npm run build` | **Not run** — no app code/package changes |

---

## 18. Remaining blockers/risks

| Blocker | Impact | Mitigation |
|---------|--------|------------|
| **iii-engine crash on Windows** | Full `:3111` server unavailable | Try Docker (`AGENTMEMORY_USE_DOCKER=1`), different iii build, or Linux/WSL host; upstream issue |
| **Standalone vs full server** | No hybrid semantic search, 7-tool MCP fallback only without server | Accept for governance keyword seed; upgrade when server runs |
| **Stale qa-agent memory files** | Still cite old shell-law docs | **Batch 44** manifest + mirror refresh |
| **`export-analytics-for-hermes.mjs`** | Still lists `AIXIA_STANDARD.md` | **Batch 44** |
| **Cursor MCP not wired** | AgentMemory not in live Cursor sessions yet | Batch 44+ after server or approved standalone |

---

## 19. Recommended next batch

**Batch 44 — Hermes manifest/context script update + qa-agent memory mirror refresh**

- Point Hermes export/context to `aixia-global/00`–`16`
- Remove stale Stage 3 shell/hero authority memory pointers
- Keep AgentMemory as mirror, not law
- Resolve iii-engine on Windows or document Docker/WSL path before Cursor MCP merge
- **No page migration**

---

## FINAL CHECK

| # | Item | Result |
|---|------|--------|
| 1 | Files created | Seed doc, script, results JSON, persist file, report, local iii binary (test) |
| 2 | Files modified | cleanup map, memory mirror |
| 3 | AgentMemory installed | **Yes** (npx cache v0.9.24 — not in package.json) |
| 4 | Memory server started | **No** (iii-engine crash) |
| 5 | Server stopped or documented stop command | **Yes** — documented; no listener on 3111 |
| 6 | Port verified | **Yes** — 3111 not listening (verified) |
| 7 | Memory storage path documented | **Yes** |
| 8 | Seed file created | **Yes** |
| 9 | Memory seeded | **Yes** (10 entries, standalone mode) |
| 10 | Recall tests run | **Yes** |
| 11 | Recall tests passed | **Yes** (6/6) |
| 12 | Hermes/Cursor connected | **Deferred** |
| 13 | Secrets stored | **No** |
| 14 | Production touched | **No** |
| 15 | Main Supabase touched | **No** |
| 16 | Production Vercel touched | **No** |
| 17 | Code changed | **No** (docs/scripts only) |
| 18 | CSS changed | **No** |
| 19 | Pages changed | **No** |
| 20 | Components changed | **No** |
| 21 | Guardrail scripts changed | **No** |
| 22 | Package scripts changed | **No** |
| 23 | AIXIA_STANDARD archived/deleted | **No** |
| 24 | Page migrations remain paused | **Yes** |
| 25 | Batch 9 finance proofs paused | **Yes** |
| 26 | Command-surface context paused | **Yes** |
| 27 | Command results | seed/recall script PASS; `qa:validate-foundation` PASS |
| 28 | Final status | **BATCH 43 PARTIAL COMPLETE — standalone seed/recall PASS; full server blocked on Windows** |
| 29 | Recommended next batch | **Batch 44 — Hermes manifest + memory mirror refresh** |

---

## End state reminder

**ONE STANDARD. ONE OWNER PER ASPECT. ONE GLOBAL DESIGN FOLDER. NO COMPETING DESIGN AUTHORITIES.**

AgentMemory staging data mirrors governance — it does **not** override `src/design-system/aixia-global/`.
