# Tool Registry

Master index for external repos, MCP servers, and in-app workflow integrations.  
Paths are relative to **parent** `AiXia-staging (42)/` unless noted as inside `AiXia-github/`.

**Before auto-selecting a tool:** read `CURSOR_AUTO_TOOL_USE_RULES.md` and confirm status is not `blocked`.

| ID | Name | Category | Location | Install Status | Status | Cursor Auto-Use Trigger | Safe To Use | May Affect AiXia | Outputs Go To | Never Do | Approval Needed | Last Verified |
|----|------|----------|----------|----------------|--------|-------------------------|-------------|------------------|---------------|----------|-----------------|---------------|
| codegraph | Codegraph | code-understanding | MCP via `AiXia-github/.cursor/mcp.json`; index `AiXia-github/.codegraph/`; npx `@colbymchenry/codegraph` | mcp-configured | approved-tool | impact, callers, callees, trace flow, symbol lookup, refactor blast radius | yes (read-only index) | none | optional notes in `../repo-analysis/codegraph/` | Index `../reference/` or wrong path; write app files from graph alone; add to package.json | none for MCP read-only | 2026-06-01 |
| hermes-integration | AiXia Hermes integration | memory / in-app-integration | `AiXia-github/.hermes.md`, `qa-agent/hermes/`, `api/agentops/hermesHandler.ts`, `scripts/export-analytics-for-hermes.mjs` | in-app active | approved-tool | agent rules, analytics export, staging Hermes proxy, memory integration plans | yes (staging for server proxy) | api-staging, scripts, docs | `qa-agent/hermes/` (not upstream clone) | Replace aixia-global; commit secrets; clone upstream into src | none for docs/scripts use | 2026-06-01 |
| qa-agent | qa-agent / browser-qa | qa | `AiXia-github/qa-agent/`, `npm run qa:*` in package.json | in-app active | approved-tool | browser QA, smoke tests, AgentOps verification, guardrail scripts | yes | test artifacts, reports in qa-agent | `qa-agent/reports/`, browser-qa results | Run QA against ../reference as if it were AiXia; treat archive reports as law | none | 2026-06-01 |
| aixia-analytics | AiXia analytics | in-app-integration | `AiXia-github/src/lib/analytics/`, `scripts/export-analytics-for-hermes.mjs`, `scripts/query-analytics-for-hermes.mjs` | in-app active | approved-tool | usage, errors, product analytics questions, Hermes analytics handoff | yes | product telemetry export | `analytics-exports/` (gitignored) | Expose secrets in exports; guess metrics without scripts | none | 2026-06-01 |
| agentops | AgentOps | in-app-integration | `AiXia-github/src/lib/agentops/`, `src/app/system/agent-ops/`, `api/agentops/`, `qa-agent/agentops/` | in-app active | approved-tool | AgentOps UI, council, issue workspace, owner tables, LLM adapter staging | yes (staging) | feature code, api routes | qa-agent/agentops reports | Merge external agent UI repos into src without plan | feature changes: explicit request | 2026-06-01 |
| supabase-mcp | Supabase MCP | mcp | `AiXia-github/.cursor/mcp.json` → `https://mcp.supabase.com/mcp` | mcp-configured | approved-tool | schema, migrations advisory, logs, project config (no secrets in chat) | yes (careful) | backend ops advisory | none | Apply migrations without approval; print service keys | schema changes: Piter | 2026-06-01 |
| vercel-mcp | Vercel MCP | mcp | `AiXia-github/.cursor/mcp.json` → `https://mcp.vercel.com` | mcp-configured | approved-tool | deploy, env names (not values), project linkage | yes | deploy pipeline | none | Expose env secret values | deploy changes: Piter | 2026-06-01 |
| agentmemory | agentmemory | memory | Planned: `../tools/agentmemory/`; runtime: `npx -y @agentmemory/agentmemory`; staging data: `qa-agent/hermes/.agentmemory-local/` | partial (npx tested; no tools clone) | experimental planned | memory recall, seed tests, advisory context (after install + active row) | staging-only | advisory recall only; not law | `../repo-analysis/agentmemory/` or gitignored local store | Install in AiXia-github package.json; treat recall as aixia-global; commit bin under qa-agent/hermes/bin | activate: Piter | 2026-06-01 |
| open-mono-agent | OpenMonoAgent.ai | local-agent | Planned: `../tools/open-mono-agent/` | not installed | blocked until explicit activation | local agent experiment, playbooks (only when status → active) | no (blocked) | none | `../repo-analysis/open-mono-agent/` | Auto-run; add app deps; edit app from experiments without ticket | explicit activation: Piter | 2026-06-01 |
| understand-anything | Understand-Anything | code-understanding | Planned: `../tools/understand-anything/` | not installed | experimental planned | broad architecture map, onboarding doc, cross-module explanation when Codegraph insufficient | experimental when installed | docs/analysis only | `../repo-analysis/understand-anything/` | Paste UA output into src/; replace Codegraph for symbol queries | install + active: Piter | 2026-06-01 |
| claude-context | claude-context | code-understanding / semantic-search / mcp-candidate | Planned: `../tools/claude-context/` or MCP config (TBD) | not installed | experimental planned | semantic code search, natural-language file/symbol discovery when Codegraph name search fails | experimental when installed | none | `../repo-analysis/claude-context/` | Duplicate Codegraph structural queries; add to package.json without approval | install + active: Piter | 2026-06-01 |
| shadcn-admin | shadcn-admin | design-reference | `../reference/shadcn-admin/` | cloned (git) | active reference-only | admin shell, shadcn patterns, sidebar, dashboard density, table/forms | yes (read-only) | none | `../repo-analysis/comparisons/shadcn-admin/` | npm install from app root; copy components into src without migration | none | 2026-06-01 |
| tailadmin-react | free-react-tailwind-admin-dashboard | design-reference | `../reference/free-react-tailwind-admin-dashboard/` | cloned (git) | active reference-only | Tailwind admin layouts, React dashboard widgets | yes (read-only) | none | `../repo-analysis/comparisons/tailadmin-react/` | same as shadcn-admin | none | 2026-06-01 |
| tailadmin-multi | free-tailwind-admin-dashboard-template | design-reference | `../reference/free-tailwind-admin-dashboard-template/` | cloned (git) | active reference-only | multi-framework template comparison (prefer react variant only) | yes (read-only) | none | `../repo-analysis/comparisons/tailadmin-multi/` | install all 6 variants; copy Vue/Angular into AiXia | none | 2026-06-01 |
| duplicate-staging | AiXia-staging duplicate | archive-candidate | `../AiXia-staging/` (sibling) | exists, no .git | blocked / archive candidate | none — do not auto-use | blocked | confusion only | `../archive/` after move | Edit, build, npm install, or read .env as source | archive: Piter | 2026-06-01 |
| zapier-mcp | Zapier MCP | future-product-feature / external-action-mcp / mcp-action-tool | `../tools/zapier-mcp/` planned | not installed | blocked until product architecture and security approval | none automatically; only when Piter asks about external app actions, MCP action bridges, or AiXia AI-agent user actions | no, not until approved | future product feature candidate only | `../repo-analysis/zapier-mcp/` | Never clone, install, connect accounts, execute external actions, send messages, create records, edit data, or add app dependencies without explicit Piter approval | Piter explicit approval + product architecture + security/permission plan | 2026-06-01 |

## Category glossary

| Category | Meaning |
|----------|---------|
| design-reference | UI/template inspiration in `../reference/` |
| code-understanding | Structure, architecture, semantic search |
| memory | Context recall; subordinate to aixia-global and .hermes.md |
| local-agent | Experimental runtimes in `../tools/` |
| qa | Tests and verification inside AiXia-github |
| mcp | Cursor MCP server (HTTP or npx) |
| future-product-feature | May become user-facing; starts in tools/ + intake interview |
| mcp-action-tool | MCP that can trigger external app actions (high gate) |
| in-app-integration | Approved product or agent surface inside AiXia-github |

## Updating this table

When adding a row: complete intake in `REPO_IMPORT_RULES.md`, set status, get Piter approval for `experimental` → `active` / `approved-tool`, update **Last Verified** date.
