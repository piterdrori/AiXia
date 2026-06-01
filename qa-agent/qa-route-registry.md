# QA Route Registry

## Purpose
Define the initial route/module registry the future QA agent will use for planning coverage.

## Important
- This is a starting registry and may be expanded later.
- Do not verify routes yet.
- Do not create route tests yet.
- Do not modify routes.
- If a route is uncertain or future-only, mark it as: **Status: Future / Verify Later**.
- This registry uses route groups and route patterns (not exact route file claims).

## Registry Schema
For each route or route group:
- Route or route pattern
- Module
- Page type: hub / registry / detail / create / settings / report / assistant / unknown
- Primary roles to test
- Main issue categories to test
- Required review panels
- AI access classification default
- SaaS readiness relevance
- Notes

---

## 1) Core / App Shell

### Route group: `/`
- **Module**: Core / App Shell
- **Page type**: hub
- **Primary roles**: Owner, Company Admin, Manager, Employee, Guest/Restricted
- **Issue categories**: Design, Functional, Technical, Improvement Suggestion
- **Required review panels**: Design Panel, Functional Engineering Panel, Technical Panel
- **AI access default**: Level 1-2 (explain/navigate), role-permission dependent
- **SaaS readiness relevance**: Medium
- **Notes**: Entry-point UX and initial navigation clarity.

### Route group: `/dashboard` (if exists)
- **Module**: Core / Dashboard
- **Page type**: hub
- **Primary roles**: Owner, Company Admin, Manager, Employee
- **Issue categories**: Design, Functional, Logical, Technical, Improvement Suggestion
- **Required review panels**: Design Panel, Functional Engineering Panel, Business Logic Panel, Technical Panel
- **AI access default**: Level 1-3
- **SaaS readiness relevance**: High
- **Notes**: **Status: Future / Verify Later** if unavailable.

### Route group: `/settings` (if exists)
- **Module**: Core / Settings
- **Page type**: settings
- **Primary roles**: Owner, Company Admin
- **Issue categories**: Functional, Logical, Technical
- **Required review panels**: Functional Engineering Panel, Business Logic Panel, Technical Panel, SaaS Conversion Panel
- **AI access default**: Level 1-3, Level 5 for permitted config actions with confirmation
- **SaaS readiness relevance**: High
- **Notes**: **Status: Future / Verify Later** if unavailable.

### Route group: `/profile` (if exists)
- **Module**: Core / User Profile
- **Page type**: detail/settings
- **Primary roles**: All authenticated roles
- **Issue categories**: Functional, Design, Technical, Personal AI-related
- **Required review panels**: Functional Engineering Panel, Design Panel, Technical Panel, Personal AI Panel
- **AI access default**: Level 1-4
- **SaaS readiness relevance**: Medium
- **Notes**: **Status: Future / Verify Later** if unavailable.

### Route group: `/tasks` (if exists)
- **Module**: Core / Tasks
- **Page type**: registry/detail
- **Primary roles**: Manager, Employee
- **Issue categories**: Functional, Logical, Design
- **Required review panels**: Functional Engineering Panel, Business Logic Panel, Design Panel
- **AI access default**: Level 1-5 (confirmation required for write actions)
- **SaaS readiness relevance**: Medium
- **Notes**: **Status: Future / Verify Later** if unavailable.

---

## 2) Finance Hub

### Route group: `/finance`
- **Module**: Finance Hub
- **Page type**: hub
- **Primary roles**: Finance Admin, Finance Viewer, Company Admin
- **Issue categories**: Design, Functional, Logical, Technical
- **Required review panels**: Design Panel, Functional Engineering Panel, Business Logic Panel, Technical Panel
- **AI access default**: Level 1-3 by default; higher only per action policy
- **SaaS readiness relevance**: High
- **Notes**: Entry for finance workflows and boundaries.

### Route group: `/finance/master-data`
- **Module**: Finance Master Data
- **Page type**: hub/registry
- **Primary roles**: Finance Admin, Company Admin, Finance Viewer (read only)
- **Issue categories**: Functional, Logical, Technical
- **Required review panels**: Functional Engineering Panel, Business Logic Panel, Technical Panel
- **AI access default**: Level 3-5 depending permission and confirmation
- **SaaS readiness relevance**: High
- **Notes**: Strong tenant isolation and integrity expectations.

### Route group: `/finance/transactions`
- **Module**: Finance Transactions
- **Page type**: hub/registry
- **Primary roles**: Finance Admin, Finance Viewer
- **Issue categories**: Functional, Logical, Technical, Design
- **Required review panels**: Functional Engineering Panel, Business Logic Panel, Technical Panel, Design Panel
- **AI access default**: Level 3-5 with confirmation for execution
- **SaaS readiness relevance**: High
- **Notes**: Includes lifecycle-sensitive transaction handling.

### Route group: `/finance/reports` (if exists)
- **Module**: Finance Reports
- **Page type**: report
- **Primary roles**: Finance Admin, Finance Viewer, Company Admin
- **Issue categories**: Functional, Logical, Technical, Improvement Suggestion
- **Required review panels**: Functional Engineering Panel, Business Logic Panel, Technical Panel
- **AI access default**: Level 1-4
- **SaaS readiness relevance**: High
- **Notes**: **Status: Future / Verify Later** if unavailable.

### Route group: `/finance/settings` (if exists)
- **Module**: Finance Settings
- **Page type**: settings
- **Primary roles**: Finance Admin, Company Admin
- **Issue categories**: Functional, Logical, Technical
- **Required review panels**: Functional Engineering Panel, Business Logic Panel, Technical Panel, SaaS Conversion Panel
- **AI access default**: Level 1-3/5 depending action permission
- **SaaS readiness relevance**: High
- **Notes**: **Status: Future / Verify Later** if unavailable.

---

## 3) Finance Master Data Areas (Known or Likely)

### Route pattern group: `/finance/master-data/*`
- **Module**: Finance Master Data
- **Page type**: registry/detail/create/settings (varies)
- **Primary roles**: Finance Admin (write), Finance Viewer (read), Company Admin
- **Issue categories**: Functional, Logical, Technical
- **Required review panels**: Functional Engineering Panel, Business Logic Panel, Technical Panel
- **AI access default**: Level 3 for read, Level 4-5 for draft/execute with confirmation
- **SaaS readiness relevance**: High
- **Notes**: Includes likely areas:
  - companies
  - clients
  - vendors
  - company bank accounts
  - vendor bank accounts
  - currencies
  - exchange rates
  - payment terms
  - shipping terms
  - tax codes
  - units of measure
  - items
  - revenue categories
  - expense categories
  - finance roles / permissions (if exists; **Status: Future / Verify Later**)

---

## 4) Finance Transactions Areas (Known or Likely)

### Route pattern group: `/finance/transactions/*`
- **Module**: Finance Transactions
- **Page type**: hub/registry/detail/create/report (varies)
- **Primary roles**: Finance Admin, Finance Viewer
- **Issue categories**: Functional, Logical, Technical, Design
- **Required review panels**: Functional Engineering Panel, Business Logic Panel, Technical Panel, Design Panel
- **AI access default**: Level 3 read, Level 4 draft, Level 5 execute-after-confirmation
- **SaaS readiness relevance**: High
- **Notes**: Includes known or likely transaction areas:
  - customer POs
  - quotations
  - sales orders (if exists; **Status: Future / Verify Later**)
  - proforma invoices
  - invoices
  - payments received
  - purchase orders
  - vendor bills (if exists; **Status: Future / Verify Later**)
  - payments made
  - expenses
  - expense payments made
  - paycheck requests
  - payroll / paychecks (if exists; **Status: Future / Verify Later**)

---

## 5) HR / People Operations (Future or Existing)

### Route pattern group: `/hr/*` and/or people-operation route groups
- **Module**: HR / People Operations
- **Page type**: hub/registry/detail/create/settings/report (varies)
- **Primary roles**: HR Admin, HR Viewer/Assistant, Manager, Employee
- **Issue categories**: Functional, Logical, Technical, Design, Improvement Suggestion
- **Required review panels**: HR Panel, Functional Engineering Panel, Business Logic Panel, Technical Panel
- **AI access default**: Level 1-4 by role, Level 5 only for permitted actions with confirmation
- **SaaS readiness relevance**: High
- **Notes**: Include:
  - employees
  - employee profile
  - HR dashboard
  - leave requests
  - attendance
  - workstation booking
  - onboarding
  - offboarding
  - HR documents
  - policies
  - payroll handoff  
  **Status: Future / Verify Later** for uncertain or non-existent routes.

---

## 6) AI / Assistant (Future)

### Route pattern group: AI control and assistant surfaces
- **Module**: AI / Assistant
- **Page type**: assistant/settings/report/unknown
- **Primary roles**: Owner, Company Admin, Tenant Admin (future), Manager, Employee
- **Issue categories**: Functional, Logical, Technical, Improvement Suggestion
- **Required review panels**: AI / MCP Panel, Personal AI Panel, Technical Panel, Security-involved Functional Panel where needed
- **AI access default**: Variable by feature; baseline Level 1-4 with strict boundaries
- **SaaS readiness relevance**: High
- **Notes**: Include future areas:
  - personal AI assistant
  - owner AI dashboard
  - AI activity logs
  - AI tool permissions
  - voice/avatar settings
  - MCP tool registry
  - AI memory settings  
  **Status: Future / Verify Later**.

---

## 7) SaaS / Tenant Management (Future)

### Route pattern group: tenant and SaaS administration surfaces
- **Module**: SaaS / Tenant Management
- **Page type**: hub/settings/report/unknown
- **Primary roles**: Owner, SaaS Tenant Admin (future), Company Admin (where delegated)
- **Issue categories**: Logical, Functional, Technical, Improvement Suggestion
- **Required review panels**: SaaS Conversion Panel, Technical Panel, AI / MCP Panel if AI-tenant tools involved
- **AI access default**: Level 1-3 for most, Level 5 for execution with confirmation and entitlement checks
- **SaaS readiness relevance**: Critical
- **Notes**: Include future areas:
  - tenant onboarding
  - company workspace setup
  - subscription/billing
  - feature flags
  - tenant branding
  - tenant analytics
  - support/help center  
  **Status: Future / Verify Later**.
