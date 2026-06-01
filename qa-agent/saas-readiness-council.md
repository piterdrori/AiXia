# SaaS Readiness Council

## Purpose
Define how AiXia is reviewed and converted from an internal company website into a multi-tenant SaaS platform usable by many companies.

## SaaS Principle
Every new feature must ask:  
Is this only for Piter’s company, or can it support many companies as SaaS?

## SaaS Status Types
1. Internal-only now  
2. Tenant-ready  
3. SaaS-ready  
4. Blocked due to missing tenant isolation / permissions / plan logic

## SaaS Review Areas

### 1) Tenant Isolation
- `company_id` / `tenant_id` separation
- Supabase RLS
- Storage isolation
- AI/MCP tenant isolation
- Cross-company data protection

### 2) Company Onboarding
- Company signup
- Workspace creation
- First admin setup
- Invite users
- Setup checklist
- Import data
- Default master data
- Demo/sample data
- Guided onboarding

### 3) Subscription / Billing / Plans
- Subscription plans
- User-seat billing
- Module-based pricing
- AI usage limits
- Storage limits
- Trial plan
- Upgrade/downgrade logic
- Plan entitlements

### 4) Tenant Configuration
- Company settings
- Feature flags
- Module enable/disable
- Role presets
- Language
- Currency
- Timezone
- Branding
- Regional settings

### 5) Product Analytics / Growth
- Activation metrics
- Retention metrics
- Feature usage
- AI usage
- Trial-to-paid funnel
- Module adoption
- Customer health score

### 6) Customer Success / Support
- Help center
- In-app guidance
- Training flows
- Support tickets
- Feedback tools
- Usage alerts
- Admin onboarding

## SaaS Readiness Score
0 = Internal company only, not SaaS-ready  
1 = Basic `company_id` exists but incomplete tenant separation  
2 = Tenant-separated data but weak onboarding/configuration  
3 = Tenant-ready with roles/settings but no billing/plan controls  
4 = SaaS-ready with onboarding, tenant settings, plan controls, analytics  
5 = Full SaaS-grade: tenant isolation, billing, onboarding, analytics, support, AI usage controls, audit logs

## Required SaaS Review Output
Every SaaS review must report:

- Current SaaS readiness score
- Tenant isolation issues
- Onboarding gaps
- Billing/plan gaps
- Configuration gaps
- Analytics gaps
- Support/customer success gaps
- Required next step

## SaaS Hard Blockers
- Any cross-company data leakage risk
- Any feature without tenant isolation where tenant isolation is required
- Any AI/MCP tool without tenant/company boundary
- Any paid/plan feature without entitlement control
- Any production SaaS feature that requires manual developer setup per customer
