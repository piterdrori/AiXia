# Repository Import Rules

How to add new external repositories and tools so Cursor can route to them automatically via `TOOL_REGISTRY.md` and `DESIGN_REPO_REGISTRY.md`.

**Default:** new imports are **workflow tools**, not app dependencies.

AiXia uses external repos in two ways — Cursor must **never assume** which applies:

1. **Build-support repos** — help Cursor/Hermes build AiXia (design refs, code understanding, memory, QA, local agents).
2. **Product-feature repos** — may later become **user-facing** AiXia capabilities (e.g. MCP action bridges, Zapier-style integrations).

A URL alone is **not** approval to clone, install, or integrate.

---

## Mandatory Repo Intake Interview Before Clone/Install

Before cloning, installing, connecting to MCP, adding to `package.json`, or integrating any new repo, Cursor must **ask Piter intake questions** and receive **clear answers**. Cursor must **not** proceed from only a GitHub URL.

### A. Purpose

Ask Piter:

- What do you want this repo to do for AiXia?
- Is this repo for helping Cursor build the website, or is it intended to become a **user-facing AiXia feature**?
- Is this repo only for research/inspiration, or do you expect AiXia to **depend** on it?

### B. Usage type

Ask Piter to choose **one**:

- design reference
- UI/component template
- code-understanding tool
- semantic search tool
- memory tool
- QA/testing tool
- local AI/coding agent
- MCP action tool
- future product feature
- app dependency
- backend/service dependency
- unknown / needs research

### C. User-facing impact

- Will AiXia users interact with this tool **inside the website**?
- Will the AI agent use this tool to **perform actions for users**?
- Will this tool **create, edit, delete, send, or approve** anything?

### D. Data/security impact

- Will it touch finance, invoices, payments, vendors, clients, employees, bank details, legal documents, or customer data?
- Will it need API keys, OAuth, credentials, tokens, or secrets?
- Can it access external apps (Gmail, Google Calendar, Slack, GitHub, CRM, Sheets, Zapier, etc.)?

### E. Execution risk

- Is it **read-only**?
- Can it **write data**?
- Can it **trigger external actions**?
- Can it run shell commands, Docker, scripts, browser automation, or network calls?

### F. Placement decision

Cursor must **recommend one** (with rationale):

- `../reference/`
- `../tools/`
- `../repo-analysis/`
- `../archive/`
- `AiXia-github/registry/` only (register intent, no clone yet)
- `AiXia-github` app dependency candidate
- **blocked / do not install**

### G. Approval gate

Cursor must ask Piter to approve explicitly:

- final category (build-support vs product-feature, and usage type)
- final target folder
- install status
- whether to **clone now** or **only register** in `TOOL_REGISTRY.md`
- registry status: `blocked`, `experimental`, `approved-tool`, `reference-only`, or `candidate-app-dependency`

**Do not clone, install, or connect until Piter confirms the approval gate.**

---

## Placement rules

| Kind | Target folder | Registry file to update |
|------|---------------|-------------------------|
| Design / admin / UI template | `../reference/<repo-name>/` | `DESIGN_REPO_REGISTRY.md` + row in `TOOL_REGISTRY.md` |
| External tool / agent / memory / code analysis | `../tools/<repo-name>/` | `TOOL_REGISTRY.md` |
| Reports, exports, comparisons | `../repo-analysis/<id>/` | Note in `TOOL_REGISTRY.md` Outputs column |
| Retired / duplicate project copy | `../archive/<name>-YYYYMMDD/` | `TOOL_REGISTRY.md` status `blocked` or remove after archive |
| Real app dependency | `AiXia-github/package.json` (only) | `APP_DEPENDENCY_APPROVAL_RULES.md` — **after Piter approval** |

**Never place:**

- Tool clones inside `AiXia-github/src/`
- Tool binaries inside `qa-agent/hermes/bin/`
- `package.json` or `node_modules` at parent `AiXia-staging (42)/` level

---

## Required intake fields

Complete before first use (copy as checklist):

| Field | Description |
|-------|-------------|
| **Repo name** | Short directory name |
| **URL** | Canonical GitHub (or official) URL |
| **Purpose** | One sentence: why AiXia needs it |
| **Category** | design-reference \| code-understanding \| memory \| local-agent \| qa \| mcp \| in-app-integration |
| **Target folder** | `../reference/...` or `../tools/...` etc. |
| **Status** | Usually `experimental` until verified; design refs → `active reference-only` |
| **Install requirement** | none \| clone \| npx \| MCP \| OS binary |
| **Run command** | Exact command or MCP id |
| **Cursor trigger** | Task phrases that auto-select this ID |
| **Risk** | low \| medium \| high (confusion, secrets, bundle, schema) |
| **May affect AiXia** | none \| docs-only \| api-staging \| app-dependency-candidate |
| **Piter approval status** | pending \| approved \| blocked |

Add row to `TOOL_REGISTRY.md` with **Last Verified** date when approved.

---

## Import workflow

1. **Mandatory Repo Intake Interview** (section above) — document answers in chat or `../repo-analysis/`.
2. Piter approves category, folder, status, and clone-now vs register-only.
3. Clone or configure **only** in approved target folder (not in AiXia-github).
4. Add registry row(s) with status `experimental` unless design reference.
5. Add `../repo-analysis/<id>/` stub if tool produces reports.
6. Update `CURSOR_AUTO_TOOL_USE_RULES.md` triggers only if new task class needs it (Piter approval).
7. Smoke-test tool in isolation; then set status `active` or `approved-tool`.
8. **Do not** touch `AiXia-github/package.json` unless app dependency approval completes.

---

## Forbidden actions

| Forbidden | Why |
|-----------|-----|
| Clone/install/connect from URL without **Mandatory Repo Intake Interview** + Piter approval | Unknown purpose/risk |
| Clone into `AiXia-github/src/` | App pollution |
| Clone into `qa-agent/hermes/bin/` | Wrong pattern (use `../tools/`) |
| `npm install` at parent workspace level | Stray lockfiles / confusion |
| `npm install` in `AiXia-github` without app dependency approval | Unapproved deps |
| Direct copy from external repo into app | Bypasses aixia-global and shared components |
| Edit reference repos to “match AiXia” | Reference stays upstream-pristine |
| Auto-merge external git into AiXia git | Separate remotes |
| Point Codegraph MCP `--path` at `../reference` or `../tools` | Wrong index scope |

---

## Design repo import (additional)

- Must include **Compare against AiXia SOT** in `DESIGN_REPO_REGISTRY.md`.
- Status: **active reference-only** unless blocked.
- README in `../reference/` already states rules — do not weaken.

---

## Tool repo import (additional)

- Prefer **MCP or npx** over `package.json` when possible (see `APP_DEPENDENCY_APPROVAL_RULES.md`).
- Binaries and large artifacts stay in `../tools/` or OS paths — gitignore locally.
- agentmemory, OpenMonoAgent, Understand-Anything, claude-context: **never** auto-promote to app dependency.

---

## After import

Cursor auto-use requires:

1. Row in `TOOL_REGISTRY.md` with clear **Cursor Auto-Use Trigger**.
2. Status not `blocked`.
3. `CURSOR_AUTO_TOOL_USE_RULES.md` alignment.

Inform Piter when a new ID is ready for `experimental` → `approved-tool` promotion.
