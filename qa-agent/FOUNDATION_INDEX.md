# AiXia QA Agent Foundation Index

Detailed catalog of every file in the `qa-agent` foundation as of the initial documentation and tooling pass. Use this with `qa-agent/README.md` when navigating the system.

---

## 1. Foundation rule files

| File | Description |
| --- | --- |
| `qa-agent/qa-issue-taxonomy.md` | Defines issue categories (Design, Functional, Logical, Technical, Improvement), severity levels, required report fields, fix-prompt behavior, and global AiXia guardrails. |
| `qa-agent/qa-agent-council.md` | Defines the 12 combined expert agents, review panels, council rules, scoring dimensions, and decision types (APPROVED / NEEDS REVIEW / REJECTED). |
| `qa-agent/ai-access-boundary.md` | Separates Owner AI, Company/Tenant AI, and Personal User AI; defines access levels 0–8, MCP tool contract fields, confirmation, audit, and voice/avatar rules. |
| `qa-agent/personal-ai-memory-and-tools.md` | Defines memory types, what Personal AI may learn or must not do, user controls, modern capability targets, creation rules, and maturity scoring 0–5. |
| `qa-agent/saas-readiness-council.md` | Defines SaaS status types, review areas (isolation, onboarding, billing, config, analytics, support), readiness score 0–5, and hard blockers. |

---

## 2. Configuration files

| File | Description |
| --- | --- |
| `qa-agent/qa-config-overview.md` | Explains how configuration docs work together; states the layer is non-executable; lists purpose of each config file and the global rule to read foundation docs first. |
| `qa-agent/qa-user-roles.md` | Defines ten synthetic user roles (owner, admins, viewers, manager, employee, guest, future tenant admin) with AI types, test scope, boundaries, and production testing policy. |
| `qa-agent/qa-route-registry.md` | Starting route/module registry by group (Core, Finance, HR, AI, SaaS) with page types, roles, issue categories, panels, AI defaults, and future-verify-later markers. |
| `qa-agent/qa-review-panel-map.md` | Maps issue types, modules, severity, and impact areas to the eight review panels and required agents. |
| `qa-agent/ai-function-access-map.md` | Default AI access classification for fifteen major function types (explain, read, draft, execute, archive, finance/HR, documents, voice, owner-only, SaaS config). |

---

## 3. Templates

| File | Description |
| --- | --- |
| `qa-agent/templates/issue-report-template.md` | Mandatory structure for every QA issue (ID, category, severity, evidence, panels, impacts, Cursor/Hermes prompt, do-not-change rules). |
| `qa-agent/templates/improvement-proposal-template.md` | Structure for non-bug improvement ideas with scoring, council decision, scope, non-changes, and implementation plan. |
| `qa-agent/templates/council-decision-template.md` | How the council records agent positions, consensus, risks, approved scope, and retest requirements. |
| `qa-agent/templates/cursor-fix-prompt-template.md` | Exact format for Cursor/Hermes prompts including required docs, source-of-truth rules, backend safety, and deliverable format. |
| `qa-agent/templates/qa-run-summary-template.md` | Full-run QA summary: scope, counts by severity/category/module/role, readiness summaries, artifacts. |
| `qa-agent/templates/saas-readiness-report-template.md` | SaaS readiness finding across isolation, onboarding, billing, config, analytics, support, and council decision. |
| `qa-agent/templates/ai-mcp-readiness-report-template.md` | AI/MCP readiness: access classification, MCP score, missing tools/permissions/audit, voice and personal AI impact. |
| `qa-agent/templates/personal-ai-review-template.md` | Personal AI review: maturity scores, memory types, controls, creation tools, permission and audit requirements. |

---

## 4. Registries

Machine-readable JSON (`version` + `description` on each file). Consumed by validation and sample report scripts; intended for future automation.

| File | Description |
| --- | --- |
| `qa-agent/registry/issue-categories.json` | Five categories with examples, evidence, root causes, default panels, fix-prompt rules. |
| `qa-agent/registry/severity-levels.json` | Five severity levels with use-when guidance, priority order, council review and release-blocking flags. |
| `qa-agent/registry/combined-agents.json` | Twelve combined agents with combines, role, alwaysAsk, inspect/approve/block lists, output responsibilities. |
| `qa-agent/registry/review-panels.json` | Eight panels with usedFor, required/optional agent IDs, approval and blocking rules. |
| `qa-agent/registry/synthetic-roles.json` | Ten synthetic roles with AI types, modules, allowed access levels, boundaries, production policy. |
| `qa-agent/registry/route-groups.json` | Seven route groups with patterns, status, roles, categories, panels, default AI access, SaaS relevance. |
| `qa-agent/registry/ai-access-levels.json` | Nine access levels (0–8) with numeric level, confirmation/audit, risk, examples, restrictions. |
| `qa-agent/registry/readiness-scores.json` | Three score models: saas-readiness, mcp-readiness, personal-ai-maturity (0–5 each). |

---

## 5. Scripts

| File | Description |
| --- | --- |
| `qa-agent/scripts/validate-qa-foundation.mjs` | Read-only validator: file presence, JSON parse, schema checks, cross-references, important markdown phrases. Exit code 1 on failure. |
| `qa-agent/scripts/generate-sample-qa-report.mjs` | Reads registries and templates; writes `qa-agent/reports/sample-foundation-report.md`. Does not test the website. |
| `qa-agent/scripts/static-app-discovery.mjs` | Read-only route/component discovery; writes `qa-agent/reports/static-app-discovery.{md,json}`. |
| `qa-agent/scripts/static-design-guardrails.mjs` | Read-only design-system guardrail scan; writes `qa-agent/reports/static-design-guardrails.{md,json}`. |
| `qa-agent/scripts/generate-guardrail-action-plan.mjs` | Reads guardrail JSON; writes `qa-agent/reports/guardrail-action-plan.{md,json}`. |

---

## 6. AgentOps Specification Suite

Owner-only **in-app AgentOps** product and implementation specs (no database, UI, or automation yet).

| File | Description |
| --- | --- |
| `qa-agent/agentops/README.md` | Entry point: what AgentOps is, current status, read order, safety rules. |
| `qa-agent/agentops/AGENTOPS_PRODUCT_SPEC.md` | Product goal, 12 agents, Hermes/CodeGraph/Browser/UI, Active Top 10 queue, backlog, lifecycle, verification, safety. |
| `qa-agent/agentops/AGENTOPS_DATA_MODEL_SPEC.md` | Ten future entities/tables, fields, boundaries; **no SQL** until approved. |
| `qa-agent/agentops/AGENTOPS_UI_SPEC.md` | Route `/system/agent-ops`, sections, actions, shared AiXia components. |
| `qa-agent/agentops/AGENTOPS_DAILY_WORKFLOW.md` | Daily/manual run phases, browser requirement, agent collaboration, outputs. |
| `qa-agent/agentops/AGENTOPS_FEEDBACK_MEMORY_SPEC.md` | Owner feedback types, Hermes memory, focus directives. |
| `qa-agent/agentops/AGENTOPS_BROWSER_QA_SPEC.md` | Browser QA capabilities, evidence contract, environments. |
| `qa-agent/agentops/AGENTOPS_HERMES_CODEGRAPH_SPEC.md` | Hermes coordination and CodeGraph mapping flow. |
| `qa-agent/agentops/AGENTOPS_FIX_VERIFICATION_SPEC.md` | Post–Mark Fixed verification types and slot rules. |
| `qa-agent/agentops/AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` | Checklist Piter must approve before Supabase schema/RLS. |
| `qa-agent/agentops/AGENTOPS_IMPLEMENTATION_SEQUENCE.md` | Staged implementation order (one prompt at a time). |

---

## 7. Reports

| File | Description |
| --- | --- |
| `qa-agent/reports/sample-foundation-report.md` | Sample markdown report generated from registries (foundation counts, five sample findings, readiness notes). Regenerate with `npm run qa:sample-report`. |

---

## 8. Package scripts

Defined in root `package.json` (not modified when adding index docs):

| npm script | Runs |
| --- | --- |
| `qa:validate-foundation` | `node qa-agent/scripts/validate-qa-foundation.mjs` |
| `qa:sample-report` | `node qa-agent/scripts/generate-sample-qa-report.mjs` |

---

## 9. What is not created yet

The following are **explicitly out of scope** for the current foundation and AgentOps specs:

**General QA automation**

- No Playwright browser tests yet
- No GitHub Actions yet
- No Supabase synthetic users or test credentials yet
- No real MCP tools or MCP server files yet
- No real Personal AI memory implementation yet
- No SaaS billing or tenant onboarding implementation yet

**AgentOps (spec only until approved)**

- No AgentOps database tables yet
- No AgentOps RLS policies yet
- No AgentOps UI route yet (`/system/agent-ops`)
- No AgentOps API/service layer yet
- No AgentOps browser runner yet
- No Hermes memory writer integration yet
- No CodeGraph runtime integration in AgentOps runs yet
- No daily AgentOps scheduler/cron yet

---

## Related index files

| File | Description |
| --- | --- |
| `qa-agent/README.md` | Main entry point, safety rules, read order, status |
| `qa-agent/NEXT_PHASES.md` | Phased roadmap; one phase per future implementation prompt |
