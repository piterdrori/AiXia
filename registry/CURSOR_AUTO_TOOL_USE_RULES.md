# Cursor Auto Tool Use Rules

Automatic decision rules so Cursor selects external repos and tools **without** Piter repeating instructions each session.

**Registry is routing only.** It does not override `src/design-system/aixia-global/` or `.hermes.md`.

---

## Before every task

1. **Confirm app root** is `AiXia-github` (git remote `https://github.com/piterdrori/AiXia.git`, not a sibling folder).
2. Read `registry/README.md` and this file; pick tools from `TOOL_REGISTRY.md` by task type.
3. **Log selection** in the reply: e.g. `Registry: codegraph, shadcn-admin (reference-only)`.
4. **Ignore** paths under `../AiXia-staging/` (duplicate-staging), `../archive/`, unless Piter explicitly asks.
5. **Never** treat `../reference/` or `../tools/` as the app when running builds or edits.

---

## New Repo URL Handling Rule

When Piter sends a **GitHub repo URL** (or any new external repo link), Cursor must **not** clone, install, connect to MCP, or integrate it immediately.

Cursor must first:

1. Run the **Mandatory Repo Intake Interview** from `registry/REPO_IMPORT_RULES.md`.
2. Classify the repo as **build-support** vs **product-feature** (never assume).
3. Propose placement, registry status, and risk summary.
4. **Wait for explicit Piter approval** on the approval gate (clone now vs register-only, folder, status).

A repo URL is **not** permission to install. Register-only is valid until Piter approves clone.

---

## Rule: Design tasks

1. Read **AiXia source of truth first:** relevant `aixia-global/` owner files.
2. Read **shared components** and `src/styles/aixia-design-system.css`.
3. Consult **`DESIGN_REPO_REGISTRY.md`** — choose at most one reference repo by trigger.
4. Compare patterns; output migration notes to `../repo-analysis/comparisons/` if needed.
5. **Implement only in AiXia-github** via shared components — no page-local design systems.

---

## Rule: Code impact / refactor tasks

1. Use **Codegraph** first (`codegraph_context`, `codegraph_trace`, `codegraph_impact`, etc.) on **AiXia-github** path.
2. Read real source files Codegraph identifies.
3. Do not rely on grep alone for symbol/caller questions when Codegraph is available.
4. Edit **AiXia-github only**.

---

## Rule: Broad architecture understanding

1. **Codegraph first** for structure and call paths.
2. If installed **and** registry status is `active` / `approved-tool` / `experimental` (with care): **Understand-Anything** (`../tools/understand-anything/`) for narrative architecture maps.
3. Write summaries to `../repo-analysis/understand-anything/` — not into `src/`.
4. Do not replace Codegraph for precise symbol/caller queries.

---

## Rule: Semantic code search

1. **Codegraph** for named symbols, callers, callees, impact.
2. If installed and approved: **claude-context** for natural-language / semantic discovery when Codegraph name search is insufficient.
3. Outputs to `../repo-analysis/claude-context/` if persisted.
4. Still read confirmed files before editing.

---

## Rule: Memory / context recall

1. **`.hermes.md`** (agent law for this repo).
2. **`aixia-global/`** for design decisions.
3. **`qa-agent/`** current memory docs (respect archive banners — not law).
4. **`knowledge/`** product context.
5. **agentmemory** only if installed and approved — **advisory only**; never overrides steps 1–2.
6. Do not auto-edit owner files from memory recall.

---

## Rule: Browser QA

1. Use **`qa-agent/browser-qa/`** and `npm run qa:*` scripts from **AiXia-github** `package.json`.
2. Run against AiXia dev server — not reference or tools repos.
3. Fixes go to AiXia-github app code; reports stay in qa-agent or `repo-analysis/`.

---

## Rule: Local LLM / agent experiments

1. Check **`open-mono-agent`** row in `TOOL_REGISTRY.md`.
2. If status is **blocked** (default): **do not use** OpenMonoAgent; inform Piter.
3. Staging LLM via **`api/agentops/`** (Ollama proxy) only when task is approved AgentOps/Hermes work.
4. Experiments stay in `../tools/` or staging env — not production app behavior without approval.

---

## Rule: Real code changes

- **Edit AiXia-github only** (`src/`, `api/`, `supabase/`, `scripts/` product scripts, in-app integrations).
- **Never edit** `../reference/`, `../tools/`, `../repo-analysis/`, `../archive/` to fix AiXia.
- **Never install packages** automatically.
- **Never add app dependencies** without `APP_DEPENDENCY_APPROVAL_RULES.md`.
- **Never treat external repos** as AiXia law.

---

## When to use what

| Situation | Primary | Secondary | Do not use |
|-----------|---------|-------------|------------|
| Design problem | aixia-global + shared components | DESIGN_REPO_REGISTRY pick | duplicate-staging; paste from reference |
| Component inconsistency | aixia-global + Codegraph usages | shared component fix | One-off page hack |
| Dependency / impact | Codegraph | read affected files | Random grep only |
| Architecture explanation | Codegraph | Understand-Anything (if approved) | Reference repos |
| Semantic search | Codegraph | claude-context (if approved) | OpenMonoAgent |
| Memory / context | .hermes.md + aixia-global | qa-agent docs; agentmemory advisory | Archive qa-agent as law |
| Browser QA | qa-agent/browser-qa | app qa scripts | reference builds |
| Local LLM / agent experiment | api/agentops staging | OpenMonoAgent if active | open-mono-agent when blocked |
| New repo URL from Piter | Mandatory Repo Intake Interview (REPO_IMPORT_RULES) | classify + propose placement; wait for approval | clone/install/MCP connect from URL alone |
| New repo import (after approval) | REPO_IMPORT_RULES | update TOOL_REGISTRY | clone into src/ or qa-agent/hermes/bin |
| App dependency request | APP_DEPENDENCY_APPROVAL_RULES | stop until approved | silent package.json edit |

---

## Hard never-do list (automatic)

| Never | Reason |
|-------|--------|
| Clone/install/connect new repo without intake interview + Piter approval | Unknown purpose; URL ≠ approval |
| Auto `npm install` / `pnpm install` / `yarn` / `bun` | Wrong folder or unapproved dep |
| Edit `../reference/` to fix AiXia | Reference is read-only |
| Edit `../tools/` to fix AiXia | Tools are external |
| Copy external repo files into `src/` | Migration plan required |
| Add `package.json` dependency without approval | App dependency gate |
| Use duplicate-staging (`../AiXia-staging/`) | Stale, blocked |
| Use open-mono-agent when blocked | Registry status |
| Treat agentmemory recall as aixia-global | Authority inversion |
| Codegraph index on non–AiXia-github path | Wrong project |
| Commit or rely on `qa-agent/hermes/bin/` binaries | Local test artifacts |

---

## Escalation

If a tool is **not installed**, **blocked**, or **experimental** and the task requires it: stop, name the registry ID, ask Piter for activation — do not clone or install without approval.
