# App Dependency Approval Rules

Defines what may enter **AiXia-github** as a real dependency versus what must stay an **external workflow tool**.

**Default: workflow tool, not app dependency.**

**No package may be added to `AiXia-github/package.json` without explicit Piter approval.**

---

## Dependency types

### workflow tool

| Attribute | Value |
|-----------|--------|
| **Where it belongs** | `../tools/<name>/`, MCP, or npx — outside app bundle |
| **May touch package.json** | **No** |
| **Approval required** | Registry entry + Piter for `experimental` → `active` |
| **Risk level** | Low (if isolated) |
| **Examples** | Understand-Anything, agentmemory (npx), OpenMonoAgent (when activated), claude-context |

### design reference

| Attribute | Value |
|-----------|--------|
| **Where it belongs** | `../reference/<name>/` |
| **May touch package.json** | **No** (optional install inside reference only) |
| **Approval required** | Import checklist; design comparison optional |
| **Risk level** | Low (copy-paste risk is main threat) |
| **Examples** | shadcn-admin, tailadmin-react, tailadmin-multi |

### dev tool

| Attribute | Value |
|-----------|--------|
| **Where it belongs** | `AiXia-github` **devDependencies** only |
| **May touch package.json** | **Yes** — devDependencies after approval |
| **Approval required** | Piter + `npm run build` passes |
| **Risk level** | Medium |
| **Examples** | ESLint plugins, Playwright, TypeScript tooling, `@playwright/test` |

### app dependency

| Attribute | Value |
|-----------|--------|
| **Where it belongs** | `AiXia-github` **dependencies** — imported from `src/` or `api/` |
| **May touch package.json** | **Yes** — dependencies after approval |
| **Approval required** | **Explicit Piter approval** + written justification |
| **Risk level** | High |
| **Examples** | New UI library, data client, crypto lib — each needs ticket |

### runtime dependency

| Attribute | Value |
|-----------|--------|
| **Where it belongs** | `dependencies` — shipped in production bundle |
| **May touch package.json** | **Yes** — after approval |
| **Approval required** | Piter + bundle size + security review |
| **Risk level** | High |
| **Examples** | Anything imported by Vite client build |

### backend dependency

| Attribute | Value |
|-----------|--------|
| **Where it belongs** | `api/`, Supabase functions, server handlers, env-configured services |
| **May touch package.json** | **Yes** — if server bundle uses it; env for external services |
| **Approval required** | Piter + no secrets in repo + RLS/permissions check |
| **Risk level** | Critical |
| **Examples** | New API SDK, JWT library changes, Supabase client version bumps |

### MCP tool

| Attribute | Value |
|-----------|--------|
| **Where it belongs** | `.cursor/mcp.json` or user MCP config — **not** npm dep unless separate app need |
| **May touch package.json** | **No** (prefer npx/HTTP MCP) |
| **Approval required** | Piter for new MCP entries |
| **Risk level** | Medium (path scope, secrets) |
| **Examples** | codegraph, supabase-mcp, vercel-mcp, future claude-context MCP |

### generated artifact

| Attribute | Value |
|-----------|--------|
| **Where it belongs** | `.codegraph/`, `../repo-analysis/`, `analytics-exports/`, gitignored locals |
| **May touch package.json** | **No** |
| **Approval required** | gitignore review |
| **Risk level** | Low–medium (commit noise) |
| **Examples** | Codegraph index, UA reports, agentmemory local JSON |

---

## Not app dependencies (explicit)

These must **not** be added to `package.json` without a dedicated approval ticket reclassifying them:

| Tool | Use instead |
|------|-------------|
| Codegraph | MCP + npx `@colbymchenry/codegraph` |
| agentmemory | npx + `../tools/agentmemory/` |
| Understand-Anything | `../tools/` clone |
| claude-context | `../tools/` or MCP |
| OpenMonoAgent | `../tools/open-mono-agent/` |
| Design reference repos | `../reference/` only |

In-app **integrations** (hermes-integration, agentops, aixia-analytics, qa-agent) are product code — not the same as cloning upstream repos into dependencies.

---

## Product-feature repos (not automatic app dependencies)

A repo may be a **future AiXia product feature** (e.g. Zapier MCP, external app actions, AI-created tasks/invoices/emails) and still belong in `../tools/` **first** for inspection only.

**Product-feature repos are not automatically app dependencies.**

Before any product integration into AiXia-github, Cursor must ensure Piter has approved:

- separate **feature architecture plan**
- **security review** (secrets, OAuth, data scope)
- **permission model** (who can trigger actions; draft/approval workflow where relevant)
- **Supabase/API impact review** (RLS, handlers, audit trail)
- explicit **Piter approval** to move beyond `../tools/` inspection

Until then: registry row may be `blocked` or `experimental`; no `package.json`, no production MCP with live credentials, no user-facing UI wiring.

---

## Before any app dependency is added

Cursor must **stop** and provide Piter:

1. **Why it is needed** — concrete task blocked without it.
2. **Alternatives** — external/MCP/npx/copy-via-shared-component/wrapper script.
3. **Files that will change** — at minimum `package.json`, lockfile, import sites.
4. **Impact** — build, bundle size, Supabase, API routes, permissions, security surface.
5. **Rollback plan** — revert commit, remove imports, lockfile rollback command.

Wait for **explicit Piter approval** before editing `package.json` or lockfiles.

---

## Approval checklist (Piter)

- [ ] Category confirmed (not workflow tool misclassified)
- [ ] No duplicate capability (e.g. Codegraph + claude-context overlap justified)
- [ ] `npm run build` planned after add
- [ ] Secrets stay out of repo
- [ ] aixia-global impact assessed (if UI)
- [ ] Registry `TOOL_REGISTRY.md` row updated (`candidate-app-dependency` → approved)

---

## Relationship to registry

| Registry status | package.json |
|-----------------|--------------|
| reference-only | Never |
| experimental / approved-tool (workflow) | Never |
| blocked | Never |
| candidate-app-dependency | After checklist only |
| in-app-integration (existing code) | Already in repo — new deps still need approval |

---

## Summary

- **Workflow tool** = help Cursor build AiXia from outside.
- **App dependency** = becomes part of the shipped or built product.
- When in doubt, classify as **workflow tool** and document in `TOOL_REGISTRY.md`.
