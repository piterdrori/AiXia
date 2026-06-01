# QA Review Panel Map

## Purpose
Define which review panel should be used for each issue type, module, and impact area.

## Panels and Primary Usage

### 1) Design Panel
**Used for**
- UI design
- UX flow
- Responsiveness
- Typography
- Spacing
- Empty gaps
- Shared design-system visual behavior
- Avatar placement or visual guidance

**Agents**
- Design & UX Excellence Agent
- Design System & Frontend Quality Agent
- Synthetic User QA Agent
- Final Council Chair / Implementation Planner

### 2) Functional Engineering Panel
**Used for**
- Buttons
- Forms
- Modals
- Uploads
- Search/filter/sort
- Create/edit/archive/delete/restore
- Tabs
- Broken user interactions

**Agents**
- Synthetic User QA Agent
- Design System & Frontend Quality Agent
- Backend, Database & Reliability Agent
- Security, Permissions & Tenant Isolation Agent, if permissions are involved
- Final Council Chair / Implementation Planner

### 3) Business Logic Panel
**Used for**
- Finance logic
- Record lifecycle
- Approval flow
- Status visibility
- Redundant/missing steps
- Archive/delete logic
- Real company operational workflows

**Agents**
- Business Logic & Operations Agent
- Security, Permissions & Tenant Isolation Agent
- Backend, Database & Reliability Agent, if backend/data state is involved
- Synthetic User QA Agent
- Final Council Chair / Implementation Planner

### 4) HR Panel
**Used for**
- Employee data
- HR workflows
- Leave/attendance/workstation booking
- HR documents
- Payroll handoff
- Employee self-service
- HR privacy

**Agents**
- HR & People Operations Agent
- Security, Permissions & Tenant Isolation Agent
- Business Logic & Operations Agent
- Product & SaaS Strategy Agent, if SaaS customer value is involved
- Final Council Chair / Implementation Planner

### 5) Technical Panel
**Used for**
- Console errors
- Network errors
- Supabase errors
- Build/type errors
- Hydration errors
- Slow loading
- Silent refresh
- Realtime reliability
- Environment/config issues

**Agents**
- Backend, Database & Reliability Agent
- Design System & Frontend Quality Agent, if frontend is involved
- Security, Permissions & Tenant Isolation Agent, if permissions/data are involved
- Synthetic User QA Agent
- Final Council Chair / Implementation Planner

### 6) AI / MCP Panel
**Used for**
- MCP tools
- AI execution
- AI read/write access
- AI action logs
- AI retrieval
- AI observability
- Owner AI / tenant AI / personal AI boundary

**Agents**
- AI / MCP Architecture Agent
- Personal AI Productivity Agent, if personal AI is involved
- Security, Permissions & Tenant Isolation Agent
- Backend, Database & Reliability Agent
- Tools, Integrations & Commercial Open Source Agent, if tool selection is involved
- Final Council Chair / Implementation Planner

### 7) Personal AI Panel
**Used for**
- Personal AI memory
- User activity learning
- User-specific assistant
- PDF/document/image generation
- Voice/STT/TTS
- Personal AI workflow automation
- User memory controls

**Agents**
- Personal AI Productivity Agent
- AI / MCP Architecture Agent
- Security, Permissions & Tenant Isolation Agent
- Backend, Database & Reliability Agent
- Final Council Chair / Implementation Planner

### 8) SaaS Conversion Panel
**Used for**
- Tenant isolation
- SaaS onboarding
- Billing/plans
- Feature flags
- Tenant settings
- Multi-company support
- Product analytics
- Customer success

**Agents**
- Product & SaaS Strategy Agent
- Security, Permissions & Tenant Isolation Agent
- Backend, Database & Reliability Agent
- Tools, Integrations & Commercial Open Source Agent
- Business Logic & Operations Agent
- Final Council Chair / Implementation Planner

## Mapping By Issue Category

- **Design Issue** -> Design Panel (primary), Functional Engineering Panel (if interaction affected)
- **Functional Issue** -> Functional Engineering Panel (primary), Technical Panel (if runtime errors), Business Logic Panel (if lifecycle rules involved)
- **Logical Issue** -> Business Logic Panel (primary), HR Panel (if people data), SaaS Conversion Panel (if tenant/plan impact)
- **Technical Issue** -> Technical Panel (primary), Security/Permission escalation through Technical + Functional/Business as needed
- **Improvement Suggestion** -> Panel based on domain:
  - UX/design -> Design Panel
  - Workflow behavior -> Business Logic Panel
  - AI/MCP -> AI / MCP Panel
  - Personal AI -> Personal AI Panel
  - SaaS -> SaaS Conversion Panel
  - HR -> HR Panel

## Mapping By Module

- **Core / App Shell** -> Design Panel, Functional Engineering Panel, Technical Panel
- **Finance Hub + Transactions + Master Data** -> Functional Engineering Panel, Business Logic Panel, Technical Panel, plus Design Panel if UX issues
- **HR / People Operations** -> HR Panel (primary), Business Logic Panel, Technical Panel
- **AI / Assistant** -> AI / MCP Panel (primary), Personal AI Panel (if user memory/productivity), Technical Panel
- **SaaS / Tenant Management** -> SaaS Conversion Panel (primary), Technical Panel, AI / MCP Panel (if AI tenant controls involved)

## Mapping By Severity

- **Critical** -> Required domain panel + Security, Permissions & Tenant Isolation Agent + Final Council Chair mandatory; include Technical Panel when reliability/data risk exists
- **High** -> Primary domain panel + Final Council Chair; add Security/Technical when permissions/data/runtime risk appears
- **Medium** -> Primary domain panel; escalate cross-panel only if affected scope spans modules or policies
- **Low** -> Primary panel only, with Final Council Chair signoff for implementation sequencing
- **Suggestion** -> Domain panel + Final Council Chair; decision can be APPROVED / NEEDS REVIEW / REJECTED based on score/risk

## Mapping By AI / MCP Impact

- Any finding with AI tool access, retrieval, execution, or boundary concerns -> **AI / MCP Panel**
- If user memory, personalization, voice, or personal workflows are involved -> add **Personal AI Panel**
- If AI action has permission risk -> include **Security, Permissions & Tenant Isolation Agent**
- If AI tooling affects architecture/reliability -> include **Backend, Database & Reliability Agent**

## Mapping By SaaS Impact

- Any finding affecting tenant isolation, plan entitlements, onboarding, tenant config, analytics, or customer success -> **SaaS Conversion Panel**
- If implementation spans finance/HR operational logic -> add **Business Logic Panel** or **HR Panel**
- If tenant/security policy may be violated -> Security participation mandatory

## Mapping By HR Impact

- Any finding involving employee data/privacy/HR workflows/payroll handoff -> **HR Panel** (primary)
- If technical reliability issues also exist -> add **Technical Panel**
- If lifecycle/approval/business-state mismatch exists -> add **Business Logic Panel**
- If SaaS customer-value implications exist -> include Product & SaaS Strategy Agent via HR panel rules
