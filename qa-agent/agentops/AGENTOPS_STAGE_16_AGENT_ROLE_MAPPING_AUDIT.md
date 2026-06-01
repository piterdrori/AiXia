# AgentOps Stage 16 Agent Role Mapping Audit

## Purpose

Audit role mapping for the 12 synthetic AgentOps users and confirm clear separation of:

- App Role (actual profile/app permission role)
- QA Specialty (testing specialty label)
- Purpose (what this synthetic user is intended to test)
- AgentOps Owner access (allowlist flag)

## Source Files Checked

1. `qa-agent/browser-qa/synthetic-browser-users.json`
2. `qa-agent/registry/combined-agents.json`
3. `qa-agent/registry/synthetic-roles.json`
4. `qa-agent/agentops/AGENTOPS_SYNTHETIC_USERS_CREATION_REPORT.md`
5. `qa-agent/agentops/AGENTOPS_STAGE_16_AGENT_MANAGEMENT_UI_REPORT.md`
6. `src/lib/agentops/service.ts`
7. `src/lib/agentops/types.ts`
8. `src/app/system/agent-ops/page.tsx`

## 12-User Mapping Audit

| qaUserId | Display Name | Email | App Role (actual) | Intended synthetic role | QA Specialty | Purpose | AgentOps Owner | Allowed Modules | Blocked Modules |
|---|---|---|---|---|---|---|---|---|---|
| agentops-owner | AgentOps Owner QA | qa+agentops-owner@aixia.local | admin | admin | Owner smoke, global visibility | Owner-level AgentOps smoke, global visibility, final review | Yes | dashboard, projects, tasks, calendar, chat, finance, employees, ai-management, system-agent-ops | — |
| platform-admin | Platform Admin QA | qa+agentops-admin@aixia.local | admin | admin | Admin without Owner AgentOps | Admin platform behavior without Owner AgentOps | No | dashboard, projects, tasks, calendar, chat, finance, employees, ai-management | system-agent-ops |
| finance-admin | Finance Admin QA | qa+agentops-finance-admin@aixia.local | admin | admin | Finance workflows (read-first) | Finance module workflows, visibility, reports, master data | No | dashboard, finance, finance-transactions, finance-master-data, finance-reports | system-agent-ops |
| finance-viewer | Finance Viewer QA | qa+agentops-finance-viewer@aixia.local | employee | employee | Blocked writes, read-only finance | Read-only finance access and blocked write actions | No | dashboard, finance, finance-reports | system-agent-ops, finance-master-data-write |
| employee | Employee QA | qa+agentops-employee@aixia.local | employee | employee | Restricted internal data | Employee visibility, self-service, restricted internal data | No | dashboard, projects, tasks, calendar, chat | finance, system-agent-ops |
| hr-admin | HR Admin QA | qa+agentops-hr-admin@aixia.local | manager | manager | HR admin workflows | HR/employee directory workflows and payroll visibility | No | dashboard, employees, finance-master-data-employees | system-agent-ops |
| hr-employee | HR Employee QA | qa+agentops-hr-employee@aixia.local | employee | employee | HR self-service boundaries | Employee HR self-service and privacy boundaries | No | dashboard, projects, tasks, expenses | employees-directory-admin, system-agent-ops |
| manager | Manager QA | qa+agentops-manager@aixia.local | manager | manager | Approvals / team visibility | Manager review, approval, and team visibility | No | dashboard, projects, tasks, calendar, chat | system-agent-ops, finance |
| ai-user | AI User QA | qa+agentops-ai-user@aixia.local | employee | employee | AI features, no Owner memory | AI features, chat, assistant visibility without Owner memory | No | dashboard, chat, ai-management | system-agent-ops |
| guest | Guest QA | qa+agentops-guest@aixia.local | guest | guest | Redirects and guards | Limited access, redirects, and route guards | No | dashboard, projects, tasks | finance, employees, system-agent-ops |
| vendor-external | Vendor External QA | qa+agentops-vendor-external@aixia.local | guest | guest | External boundary tests | External-party boundaries and restricted visibility | No | dashboard | finance, employees, projects, system-agent-ops |
| tenant-admin | Tenant Admin QA | qa+agentops-tenant-admin@aixia.local | admin | admin | SaaS admin without AgentOps | Tenant/company admin behavior without AgentOps owner access | No | dashboard, projects, finance, employees, settings | system-agent-ops |

## Admin / Manager / Employee / Guest Breakdown

- **admin:** agentops-owner, platform-admin, finance-admin, tenant-admin
- **manager:** hr-admin, manager
- **employee:** finance-viewer, employee, hr-employee, ai-user
- **guest:** guest, vendor-external

## AgentOps Owner Access

- **Only one synthetic user has AgentOps owner access:** `agentops-owner` (`qa+agentops-owner@aixia.local`)
- `tenant-admin` is **admin app role**, but **not** AgentOps Owner allowlisted.

## Findings

1. Source data itself is consistent with synthetic user creation report.
2. Prior UI mapping was misleading because it mixed:
   - app role (`intendedPlatformRole`/`profileRole`)
   - an index-based council agent label from `combined-agents.json` (no explicit qaUserId mapping)
   - synthetic testing purpose
3. `combined-agents.json` has no authoritative one-to-one key mapping to the 12 synthetic browser users, so index-based pairing is misleading.

## Should Source Data Be Corrected?

- **Not required now.**
- Recommended later: if Product wants a durable QA specialty field, add an explicit `qaSpecialty` field in `synthetic-browser-users.json` (separate from app role and purpose).

## Conclusion

- No permission or role source correction required.
- UI labels and column separation were required and have been applied so App Role, QA Specialty, Purpose, and AgentOps Owner are distinct.

