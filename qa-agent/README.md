# AiXia QA Agent Foundation

This folder defines the foundation for the future **AiXia 24/7 Synthetic User QA Agent**, **Expert Agent Council**, **Personal AI review system**, **AI/MCP readiness system**, and **SaaS conversion review system**.

It is a planning, rule, registry, template, and validation layer for Cursor, Hermes, CodeGraph, and future automation agents. It does **not** run the live website, execute MCP tools, or change application code.

---

## 1. What this is

The `qa-agent` folder is:

- A **planning, rule, registry, template, and validation layer**
- A single source of truth for how issues are classified, reviewed, scored, and turned into implementation prompts
- A machine-readable configuration surface (JSON registries) plus human-readable docs and report templates

It is **not** yet:

- Browser automation
- Playwright
- MCP execution or real AI tools
- Personal AI memory or productivity implementation
- SaaS billing, tenant onboarding, or multi-tenant product implementation

---

## 2. What this system is designed to do later

When fully implemented, the AiXia QA Agent system is intended to:

- Test the website like real users across roles, routes, and viewports
- Report **design**, **functional**, **logical**, **technical**, and **improvement** issues with evidence
- Route findings through **12 combined expert agents** and defined review panels
- Generate **Cursor/Hermes** fix prompts with scope, non-changes, and retest requirements
- Evaluate **SaaS readiness** (tenant isolation, onboarding, plans, analytics, support)
- Evaluate **AI/MCP readiness** (access levels, tools, confirmation, audit, observability)
- Evaluate **Personal AI maturity** (memory, controls, creation tools, voice/avatar safety)
- Protect **Owner AI** vs **Company/Tenant AI** vs **Personal User AI** boundaries
- Protect **tenant/company** isolation and role permissions
- Preserve **AiXia source-of-truth** rules (shared components, shared CSS, no page-local design systems)

---

## 3. Current safe commands

From the project root:

```bash
npm run qa:validate-foundation
npm run qa:sample-report
```

| Command | Purpose |
| --- | --- |
| `qa:validate-foundation` | Validates that required foundation markdown files, templates, and registry JSON exist, parse correctly, and cross-reference consistently. |
| `qa:sample-report` | Reads registries and templates and writes a **sample** markdown report under `qa-agent/reports/`. |

**Neither command:**

- Tests the website or opens a browser
- Connects to Supabase or calls APIs
- Modifies app source files (except `qa:sample-report` writing `qa-agent/reports/sample-foundation-report.md`)

---

## 4. Folder structure

| Area | Location | Purpose |
| --- | --- | --- |
| Foundation rules | `qa-agent/*.md` (taxonomy, council, AI boundaries, SaaS, etc.) | Human-readable policies and review rules |
| Configuration | `qa-agent/qa-config-overview.md`, `qa-user-roles.md`, `qa-route-registry.md`, etc. | Roles, routes, panels, AI function defaults |
| Templates | `qa-agent/templates/` | Mandatory structures for issues, proposals, council decisions, prompts, readiness reports |
| Registries | `qa-agent/registry/` | Machine-readable JSON for scripts and future automation |
| Scripts | `qa-agent/scripts/` | Foundation validation and sample report generation (Node built-ins only) |
| Reports | `qa-agent/reports/` | Generated sample and (later) real QA output |
| Index | `qa-agent/FOUNDATION_INDEX.md`, `qa-agent/NEXT_PHASES.md` | File catalog and phased roadmap |

---

## 5. Read order for future agents

When working on QA, council review, or readiness audits, read in this order:

1. `qa-agent/README.md` (this file)
2. `qa-agent/FOUNDATION_INDEX.md`
3. `qa-agent/qa-issue-taxonomy.md`
4. `qa-agent/qa-agent-council.md`
5. `qa-agent/ai-access-boundary.md`
6. `qa-agent/personal-ai-memory-and-tools.md`
7. `qa-agent/saas-readiness-council.md`
8. `qa-agent/qa-config-overview.md`
9. `qa-agent/qa-user-roles.md`
10. `qa-agent/qa-route-registry.md`
11. `qa-agent/qa-review-panel-map.md`
12. `qa-agent/ai-function-access-map.md`
13. `qa-agent/templates/` (use the template that matches the deliverable)
14. `qa-agent/registry/*.json` (for structured IDs, panels, roles, routes, access levels, scores)

Before generating fix prompts, also consult `qa-agent/templates/cursor-fix-prompt-template.md` and the relevant registry entries.

### AgentOps read order (after foundation)

When working on **AgentOps** (in-app Owner queue, browser QA, verification), read after the foundation list above:

1. `qa-agent/agentops/README.md`
2. `qa-agent/agentops/AGENTOPS_PRODUCT_SPEC.md`
3. `qa-agent/agentops/AGENTOPS_DATA_MODEL_SPEC.md`
4. `qa-agent/agentops/AGENTOPS_UI_SPEC.md`
5. `qa-agent/agentops/AGENTOPS_DAILY_WORKFLOW.md`
6. `qa-agent/agentops/AGENTOPS_FEEDBACK_MEMORY_SPEC.md`
7. `qa-agent/agentops/AGENTOPS_BROWSER_QA_SPEC.md`
8. `qa-agent/agentops/AGENTOPS_HERMES_CODEGRAPH_SPEC.md`
9. `qa-agent/agentops/AGENTOPS_FIX_VERIFICATION_SPEC.md`
10. `qa-agent/agentops/AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md`
11. `qa-agent/agentops/AGENTOPS_IMPLEMENTATION_SEQUENCE.md`

---

## 6. AgentOps Specification Suite

The **AgentOps specification suite** defines the future **in-app Owner-only AgentOps dashboard**, where the **12 combined agents**, **Hermes**, **CodeGraph**, and **browser QA** work together to maintain an **Active Top 10** issue/improvement queue for Piter.

AgentOps is specification and planning only until the data model is approved and implementation stages begin (see `qa-agent/agentops/AGENTOPS_IMPLEMENTATION_SEQUENCE.md`).

| File | Purpose |
| --- | --- |
| `qa-agent/agentops/README.md` | AgentOps entry point, status, read order |
| `qa-agent/agentops/AGENTOPS_PRODUCT_SPEC.md` | Product goal, queue rules, lifecycle, safety |
| `qa-agent/agentops/AGENTOPS_DATA_MODEL_SPEC.md` | Future tables/entities (no SQL yet) |
| `qa-agent/agentops/AGENTOPS_UI_SPEC.md` | `/system/agent-ops` UI specification |
| `qa-agent/agentops/AGENTOPS_DAILY_WORKFLOW.md` | Daily/manual run orchestration |
| `qa-agent/agentops/AGENTOPS_FEEDBACK_MEMORY_SPEC.md` | Piter remarks → memory and focus |
| `qa-agent/agentops/AGENTOPS_BROWSER_QA_SPEC.md` | Real browser evidence requirements |
| `qa-agent/agentops/AGENTOPS_HERMES_CODEGRAPH_SPEC.md` | Hermes + CodeGraph integration |
| `qa-agent/agentops/AGENTOPS_FIX_VERIFICATION_SPEC.md` | Verify after Mark Fixed |
| `qa-agent/agentops/AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` | Pre-SQL approval checklist for Piter |
| `qa-agent/agentops/AGENTOPS_IMPLEMENTATION_SEQUENCE.md` | Staged implementation after approval |

**AgentOps safety (default):** AgentOps is **Owner-only** by default. **Personal User AI** and **tenant users** must not access Owner AgentOps memory, system-improvement prompts, or global QA council findings unless explicitly allowed in a future policy.

---

## 7. Hard safety rules

All work under `qa-agent` and all future QA automation must respect:

- **Do not modify app logic** from `qa-agent` foundation scripts or docs alone; implementation happens only in approved app change tasks.
- **Do not connect to Supabase** from foundation scripts; schema inspection is a separate, explicit step when fixing technical issues.
- **Do not create browser tests** until the Playwright phase (see `qa-agent/NEXT_PHASES.md`).
- **Personal AI must not access Owner AI** or another user’s private memory.
- **AI cannot do more than the user can do manually** (see `qa-agent/ai-access-boundary.md`).
- **Preserve tenant/company isolation** in every SaaS and permission-related finding.
- **Do not create page-local design systems**; fix shared AiXia components and shared CSS first.
- **Preserve shared AiXia source-of-truth** for design and interaction patterns.

---

## 8. Status

**Current status:** Foundation-ready; static discovery and design guardrails scripts available; **AgentOps specifications** documented (no database or UI yet).

Foundation docs, configuration, templates, JSON registries, validation script, sample report generator, static discovery, and static design guardrails are in place. AgentOps product specs live under `qa-agent/agentops/`.

**Next phase:** AgentOps data model approval (`AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md`), then staged implementation per `AGENTOPS_IMPLEMENTATION_SEQUENCE.md`. See `qa-agent/NEXT_PHASES.md` for the full roadmap.
