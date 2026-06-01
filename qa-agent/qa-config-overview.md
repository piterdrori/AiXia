# QA Config Overview

## Purpose
This file explains how the `qa-agent` configuration layer works as a unified planning map for future QA automation and council review orchestration.

## Scope and Status
- This layer is **not executable yet**.
- This layer defines the testing and review map for future automation.
- The future Synthetic User QA Agent will use these files to know which roles, routes, modules, issue types, review panels, and AI access levels to test.
- The future Expert Agent Council will use these files to decide which combined agents must review each finding.
- These files do not change app behavior.
- These files do not create users.
- These files do not change Supabase.
- These files do not create MCP tools.
- These files only define the future structure.

## Configuration File Purposes

### `qa-user-roles.md`
Defines synthetic role personas for future QA runs (owner/admin/finance/hr/manager/employee/guest/tenant-admin future), including:
- What each role should test
- What each role can and cannot do
- AI boundaries per role
- Tenant and visibility boundaries

### `qa-route-registry.md`
Defines the initial route/module registry for future QA planning, including:
- Route groups and patterns (existing and future-verify-later)
- Module classification and page types
- Role focus per route group
- Issue categories and review panel requirements
- Default AI access classification and SaaS relevance

### `qa-review-panel-map.md`
Defines how findings are routed to council panels, including:
- Which panel reviews each issue type
- Which panel reviews by module, severity, HR/AI/SaaS impact
- Which combined agents are required in each panel

### `ai-function-access-map.md`
Defines default AI access levels for major function types, including:
- Access level defaults (0-8)
- Allowed AI type and roles
- Confirmation and audit expectations
- SaaS/tenant boundary and memory impact notes

## Global Rule for Future Prompts
Every future implementation prompt must first check the existing foundation docs:

- `qa-agent/qa-issue-taxonomy.md`
- `qa-agent/qa-agent-council.md`
- `qa-agent/ai-access-boundary.md`
- `qa-agent/personal-ai-memory-and-tools.md`
- `qa-agent/saas-readiness-council.md`
