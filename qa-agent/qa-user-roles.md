# QA User Roles

## Purpose
Define synthetic user roles for future QA execution planning.

## Important Boundaries
- Do not create real users yet.
- Do not create Supabase users yet.
- Do not create test credentials yet.
- This file defines intended synthetic roles and what each role should test.

## Role Definitions

### 1) Owner / Platform Owner
- **Purpose**: Test owner-only visibility, system intelligence, SaaS readiness, global QA reports, and Owner AI boundaries.
- **Expected AI type**: Owner AI only.
- **Main routes/modules to test**: Owner-only strategy/config surfaces (if they exist), global QA/council dashboards (future), SaaS/global configuration (future), system improvement prompt areas (future).
- **Allowed action level**: Full owner-level review/planning actions according to owner policy.
- **Blocked action examples**: Not applicable to owner scope, but must still respect explicit policy restrictions.
- **Data visibility boundary**: Platform-level according to owner permissions.
- **Personal AI boundary**: Must never be treated as normal Personal User AI.
- **SaaS/tenant boundary**: Can inspect cross-tenant readiness and policy; must not weaken tenant isolation.

### 2) Company Admin
- **Purpose**: Test company-level administration inside one tenant/company.
- **Expected AI type**: Company/Tenant AI + Personal AI.
- **Main routes/modules to test**: Company settings, user management, module access, master data, permission boundaries, tenant data visibility, admin workflows.
- **Allowed action level**: Admin actions inside owned tenant.
- **Blocked action examples**: Access to other tenants, owner-only/global platform controls.
- **Data visibility boundary**: Tenant-scoped administrative data only.
- **Personal AI boundary**: Personal AI can act only within admin’s tenant permissions.
- **SaaS/tenant boundary**: Strict tenant boundary enforcement.

### 3) Finance Admin
- **Purpose**: Test finance workflows with create/edit/archive/delete/restore where allowed.
- **Expected AI type**: Department-aware Personal AI + possible Finance Company/Tenant AI.
- **Main routes/modules to test**: Finance registries, finance detail pages, create pages, archive/delete/restore flows, finance master data, payment and approval workflows, finance AI boundaries.
- **Allowed action level**: Finance admin actions permitted by role and record state.
- **Blocked action examples**: Owner-only features, cross-tenant finance data.
- **Data visibility boundary**: Tenant finance data allowed by finance permissions.
- **Personal AI boundary**: AI can assist only with permitted finance records/actions.
- **SaaS/tenant boundary**: No access outside tenant boundary.

### 4) Finance Viewer
- **Purpose**: Test read-only finance access.
- **Expected AI type**: Read/search/explain Personal AI only.
- **Main routes/modules to test**: Finance read pages, registries, permitted details/reports.
- **Allowed action level**: Read/search/explain only.
- **Blocked action examples**: Create/edit/archive/delete/restore/approval execution.
- **Data visibility boundary**: Read-only records explicitly permitted by role.
- **Personal AI boundary**: AI must not execute write actions.
- **SaaS/tenant boundary**: Read-only access within tenant only.

### 5) HR Admin
- **Purpose**: Test HR and people operations with HR administrative permissions.
- **Expected AI type**: HR-aware Personal AI + possible HR Company/Tenant AI.
- **Main routes/modules to test**: Employee registry/profile, HR documents, leave/attendance/workstation booking, onboarding/offboarding, payroll handoff visibility, HR-sensitive permissions.
- **Allowed action level**: HR admin actions allowed by policy and role.
- **Blocked action examples**: Unauthorized finance execution, cross-tenant HR access.
- **Data visibility boundary**: HR-sensitive records within authorized scope.
- **Personal AI boundary**: AI must respect HR privacy and role boundaries.
- **SaaS/tenant boundary**: Tenant-scoped HR data only.

### 6) HR Viewer / HR Assistant
- **Purpose**: Test limited HR support access.
- **Expected AI type**: Permission-limited Personal AI.
- **Main routes/modules to test**: Limited HR visibility routes, support workflows, restricted HR views.
- **Allowed action level**: Limited read/support operations.
- **Blocked action examples**: Sensitive private data access, restricted edits, payroll/HR approvals unless explicitly allowed.
- **Data visibility boundary**: Minimum necessary HR data per permission.
- **Personal AI boundary**: AI restricted to role-limited data and actions.
- **SaaS/tenant boundary**: Tenant-only, role-limited visibility.

### 7) Manager
- **Purpose**: Test team-level management workflows.
- **Expected AI type**: Manager Personal AI.
- **Main routes/modules to test**: Team tasks, team employee visibility, manager approvals, manager-allowed reports.
- **Allowed action level**: Team-management actions assigned to manager role.
- **Blocked action examples**: Owner/admin-only settings, unauthorized HR/finance admin operations.
- **Data visibility boundary**: Team and workflow data granted to manager.
- **Personal AI boundary**: AI cannot exceed manager role permissions.
- **SaaS/tenant boundary**: Tenant-scoped manager access only.

### 8) Employee
- **Purpose**: Test normal employee self-service.
- **Expected AI type**: Personal User AI only.
- **Main routes/modules to test**: Own profile, own tasks, own leave requests, own expenses, own payslip/paycheck visibility (if allowed), workstation booking, personal documents.
- **Allowed action level**: Self-service only.
- **Blocked action examples**: Internal finance funding statuses, other employees’ private data, admin-only HR data, company-wide sensitive records.
- **Data visibility boundary**: Own records and explicitly shared records only.
- **Personal AI boundary**: AI can help only with employee’s allowed records/actions.
- **SaaS/tenant boundary**: No cross-tenant access.

### 9) Guest / Restricted User
- **Purpose**: Test lowest-permission access behavior.
- **Expected AI type**: Explain/navigate only, if allowed.
- **Main routes/modules to test**: Minimal allowed routes and access-denied behavior.
- **Allowed action level**: Very limited read/navigation support.
- **Blocked action examples**: Sensitive route access, write actions, restricted tools, private records.
- **Data visibility boundary**: Minimal non-sensitive permitted surfaces.
- **Personal AI boundary**: No restricted tool/record access.
- **SaaS/tenant boundary**: Strict tenant and role restrictions.

### 10) SaaS Tenant Admin (Future)
- **Purpose**: Test SaaS tenant onboarding and workspace setup once SaaS mode exists.
- **Expected AI type**: Company/Tenant AI + Personal AI with tenant-admin permissions.
- **Main routes/modules to test**: Company signup, workspace initialization, invite users, plan/module settings, tenant branding, subscription/plan visibility.
- **Allowed action level**: Tenant administration and onboarding actions.
- **Blocked action examples**: Platform-owner-only controls, other tenant configuration.
- **Data visibility boundary**: Tenant admin scope only.
- **Personal AI boundary**: Personal AI can operate only within tenant-admin permissions.
- **SaaS/tenant boundary**: Must enforce strict tenant isolation and entitlement boundaries.

## Global Rule
Synthetic users should eventually be created only in staging or controlled test environments. Production synthetic users must be read-only unless explicitly approved.
