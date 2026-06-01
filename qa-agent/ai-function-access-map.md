# AI Function Access Map

## Purpose
Define the default AI access classification for major website function types.

## Important
- This is a planning map only.
- It does not create real AI tools.
- It does not create MCP tools.
- It does not change permissions.

## Access Levels
0. No AI access  
1. AI can explain only  
2. AI can navigate only  
3. AI can read/search allowed records  
4. AI can prepare draft  
5. AI can execute after confirmation  
6. AI can execute automatically within limited safe rules  
7. Owner AI only  
8. Never expose to AI

## Function Type Defaults

### 1) Page explanation
- **Default access level**: 1-2
- **Allowed AI type**: Personal User AI (and Company/Tenant AI where enabled)
- **Allowed roles**: Any role with route permission
- **Confirmation requirement**: None
- **Audit requirement**: Optional interaction log
- **SaaS/tenant boundary**: Must remain tenant-scoped and route-permission scoped
- **Personal AI memory impact**: May store preference/context if user controls allow
- **Notes**: Explanation/navigation only; no record mutation.

### 2) Record search/read
- **Default access level**: 3
- **Allowed AI type**: Personal User AI (and tenant AI for authorized admin contexts)
- **Allowed roles**: Roles already authorized to read same records
- **Confirmation requirement**: Usually no
- **Audit requirement**: Access log recommended for sensitive domains
- **SaaS/tenant boundary**: Strict tenant and record-level permissions
- **Personal AI memory impact**: Can learn usage patterns from authorized records only
- **Notes**: Never expand scope beyond manual user access.

### 3) Create draft record
- **Default access level**: 4
- **Allowed AI type**: Personal User AI / Company-Tenant AI where applicable
- **Allowed roles**: Roles that can manually create same record type
- **Confirmation requirement**: Draft preview before final save recommended
- **Audit requirement**: Draft-generation log recommended
- **SaaS/tenant boundary**: Tenant-scoped creation context only
- **Personal AI memory impact**: May remember preferred fields/templates if user allows
- **Notes**: Draft does not imply official submission.

### 4) Submit/create official record
- **Default access level**: 5
- **Allowed AI type**: Personal User AI / Company-Tenant AI for authorized roles
- **Allowed roles**: Roles with manual submit/create permission
- **Confirmation requirement**: Explicit confirmation required
- **Audit requirement**: Required
- **SaaS/tenant boundary**: Must validate tenant and role before write
- **Personal AI memory impact**: Record action metadata can be retained under policy
- **Notes**: No silent official submission.

### 5) Edit existing record
- **Default access level**: 5
- **Allowed AI type**: Personal User AI / Company-Tenant AI where permitted
- **Allowed roles**: Roles that can manually edit and only in editable record states
- **Confirmation requirement**: Explicit confirmation required
- **Audit requirement**: Required
- **SaaS/tenant boundary**: Must enforce tenant + record-state + role constraints
- **Personal AI memory impact**: May learn edit patterns from authorized actions only
- **Notes**: Editing forbidden when lifecycle state locks record.

### 6) Archive record
- **Default access level**: 5
- **Allowed AI type**: Personal User AI / Company-Tenant AI for authorized roles
- **Allowed roles**: Roles with manual archive rights
- **Confirmation requirement**: Explicit confirmation required
- **Audit requirement**: Required
- **SaaS/tenant boundary**: Tenant-isolated archival actions only
- **Personal AI memory impact**: Archive intent/history may be logged under policy
- **Notes**: Reversible/archive behavior must match app lifecycle rules.

### 7) Delete / permanently delete
- **Default access level**: 5 (restricted) / 7 / 8 depending module policy
- **Allowed AI type**: Owner AI or tightly restricted admin AI only when policy allows
- **Allowed roles**: Owner/Admin-level only, if allowed by app policy
- **Confirmation requirement**: Explicit high-friction confirmation required
- **Audit requirement**: Mandatory with full action context
- **SaaS/tenant boundary**: Must enforce tenant + role + entitlement + policy gates
- **Personal AI memory impact**: Minimal retention; sensitive action logging policy applies
- **Notes**: Permanent delete may be Owner AI only or never exposed to AI.

### 8) Finance approval / payment execution
- **Default access level**: 4 for recommendation/draft, 5 for execution with confirmation
- **Allowed AI type**: Company/Tenant AI + authorized Personal AI
- **Allowed roles**: Finance-authorized roles only
- **Confirmation requirement**: Explicit confirmation required for execution
- **Audit requirement**: Mandatory
- **SaaS/tenant boundary**: Strict tenant isolation and finance permission checks
- **Personal AI memory impact**: Store only policy-allowed, non-sensitive preference patterns
- **Notes**: Employee AI must never access internal finance execution tools.

### 9) HR sensitive data access
- **Default access level**: 3 (conditional)
- **Allowed AI type**: HR-authorized Personal AI / HR tenant AI
- **Allowed roles**: HR-authorized roles only; employee limited to own allowed data
- **Confirmation requirement**: Not always required for read; required for sensitive exports/actions
- **Audit requirement**: Required for sensitive HR data access
- **SaaS/tenant boundary**: Strict tenant + role + record-level controls
- **Personal AI memory impact**: Restricted memory; sensitive HR data storage controls required
- **Notes**: Employee AI can access only own allowed HR data.

### 10) Payroll / paycheck workflow
- **Default access level**: 1-4 for explain/draft/recommendation, 5 for approval/payment with confirmation
- **Allowed AI type**: HR/Finance authorized AI contexts only
- **Allowed roles**: HR/Finance authorized roles; employee role is limited
- **Confirmation requirement**: Required for approvals/execution
- **Audit requirement**: Mandatory
- **SaaS/tenant boundary**: Tenant-scoped and role-scoped workflow gates
- **Personal AI memory impact**: Limited to permitted user context; no unauthorized payroll internals
- **Notes**: Employee AI must not see internal payroll/finance execution details unless explicitly allowed.

### 11) Personal PDF/document creation
- **Default access level**: 4
- **Allowed AI type**: Personal User AI
- **Allowed roles**: Any role for allowed source data
- **Confirmation requirement**: Preview/confirmation for official documents
- **Audit requirement**: Required for official document generation
- **SaaS/tenant boundary**: Source data must remain within tenant and role permissions
- **Personal AI memory impact**: Can learn preferred document styles/templates if user allows
- **Notes**: Must not include unauthorized records in outputs.

### 12) Image/diagram generation
- **Default access level**: 4
- **Allowed AI type**: Personal User AI / authorized Tenant AI contexts
- **Allowed roles**: Roles with access to source data used for visuals
- **Confirmation requirement**: Recommended when publishing official outputs
- **Audit requirement**: Log generation context for official use
- **SaaS/tenant boundary**: No cross-tenant/private data leakage
- **Personal AI memory impact**: Style preferences can be learned under user controls
- **Notes**: Business visuals allowed only from authorized data.

### 13) Voice/avatar execution
- **Default access level**: 1-2 for explain/navigate, 4 for drafts, 5 for controlled execution
- **Allowed AI type**: Personal User AI / authorized Tenant AI contexts
- **Allowed roles**: Roles permitted for corresponding manual actions
- **Confirmation requirement**: Extra confirmation for dangerous actions
- **Audit requirement**: Required for execution actions
- **SaaS/tenant boundary**: Same tenant/role limits as non-voice actions
- **Personal AI memory impact**: Voice preference memory allowed with user controls
- **Notes**: Delete/archive/approval/payment actions cannot be executed silently by voice.

### 14) Owner system improvement prompt generation
- **Default access level**: 7
- **Allowed AI type**: Owner AI only
- **Allowed roles**: Owner / platform owner only
- **Confirmation requirement**: Owner-governed workflow
- **Audit requirement**: Required
- **SaaS/tenant boundary**: System-level governance capability, not general tenant user feature
- **Personal AI memory impact**: Not accessible to Personal User AI
- **Notes**: Normal users and Personal AI cannot access.

### 15) SaaS tenant setup/configuration
- **Default access level**: 5 (execution with confirmation), some areas 3 for read-only views
- **Allowed AI type**: Tenant Admin authorized AI and Owner AI for platform-level settings
- **Allowed roles**: Tenant Admin / Owner only
- **Confirmation requirement**: Explicit confirmation required
- **Audit requirement**: Mandatory
- **SaaS/tenant boundary**: Must enforce permission, audit, entitlement, and tenant boundaries
- **Personal AI memory impact**: Limited retention of admin preferences only, no cross-tenant memory
- **Notes**: Respect plan entitlements and tenant isolation at all times.
