# AiXia Website Structure Memory

## Modules Found

- Auth/Public
- Onboarding/Profile
- Dashboard
- Projects
- Tasks
- Calendar
- Chat
- Inbox/Mail
- Employees/People
- Global Settings
- AI Management
- System/AgentOps
- Finance Hub
- Finance Master Data
- Finance Transactions
- Finance Reports
- Finance Access Approvals
- Legacy Redirect/Alias Layer

## Route Groups

- Public/auth: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`
- Core work: `/dashboard`, `/projects/**`, `/tasks/**`, `/calendar/**`
- Comms: `/chat/**`, `/inbox`, `/mail`
- People/settings: `/employees/**`, `/settings`, `/onboarding`
- AI admin: `/ai-management/**`
- System ops: `/system/agent-ops/**`
- Finance: `/finance/**` (hub, master-data, transactions, reports, access-approvals)

## Counts (From Source Scan)

- Registered routes (`src/App.tsx` path entries): **170**
- `src/app/**/page.tsx` files discovered: **146**
- Imported route page components in `App.tsx`: **136**

## Page-Type Distribution (Heuristic from Route Patterns)

- Dashboard/command center: high concentration in `/dashboard`, `/finance`, `/ai-management`, `/system/agent-ops`
- Registry/list: very high concentration (especially finance transactions/master-data)
- Detail/workspace (`:id`, `:issueCode`, `:agentId`): high
- Create/new (`/new`): very high
- Edit (`/edit`): low-medium
- Process/workbench/chat: medium-high (`chat`, expense/paycheck process, AgentOps issue/agent/council)
- Knowledge/history/advanced/operator: medium (`/system/agent-ops/*`, `/ai-management/*`)

## Highest-Risk Areas

1. Calendar module (layout/rhythm drift risk)
2. AI management routes (technical wall + local pattern drift risk)
3. Finance mixed legacy/canonical route overlap
4. Non-finance core modules with mixed shared-component adoption

## Migration Priority Candidates

1. High-traffic cross-module shells: dashboard/core list/detail pages
2. AI management surface normalization
3. Remaining high-risk finance routes not fully on unified command/detail wrappers
4. Legacy alias cleanup after canonical parity is stable
