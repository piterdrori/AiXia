# Ai Access Boundary

## Purpose
Define strict separation between Owner AI, Company/Tenant AI, and Personal User AI, including MCP tool access, permission inheritance, confirmation rules, and audit requirements.

## AI Types

### 1) Owner AI
- Belongs only to Piter / platform owner.
- Can review whole system according to owner permissions.
- Can analyze QA reports.
- Can coordinate expert council.
- Can generate Cursor/Hermes prompts.
- Can recommend product/SaaS/AI/HR/finance improvements.
- Must not be exposed to normal users.

### 2) Company/Tenant AI
- Belongs to one company/tenant.
- Helps company admins/managers only within company permissions.
- Cannot access another company’s data.
- Must respect tenant isolation, company settings, plan entitlements, and role permissions.

### 3) Personal User AI
- One AI assistant per user account.
- Helps only that user.
- Can learn that user’s activity within allowed permission boundaries.
- Cannot access Owner AI.
- Cannot access another user’s private memory.
- Cannot access data the user cannot access manually.
- Cannot execute actions the user cannot execute manually.

## Global Rule
If the user cannot do it manually, the user’s AI cannot do it.

## AI Access Levels
Every function must be classified using one of these levels:

0. No AI access  
1. AI can explain only  
2. AI can navigate only  
3. AI can read/search allowed records  
4. AI can prepare draft  
5. AI can execute after confirmation  
6. AI can execute automatically within limited safe rules  
7. Owner AI only  
8. Never expose to AI

## MCP Tool Classification Contract
Every future MCP tool must define:

- Tool name
- AI type allowed
- User roles allowed
- Tenant/company boundary
- Record-level permission requirement
- Read/write/delete/action type
- Confirmation requirement
- Audit log requirement
- Rollback/recovery requirement, if relevant
- Whether allowed in voice/avatar mode
- Whether Owner AI only

## Confirmation Rules
- Read/explain actions may not require confirmation.
- Draft creation usually requires preview before save.
- Create/edit actions require confirmation unless clearly safe and user-configured.
- Archive/delete/permanent delete always require explicit confirmation.
- Finance/HR/payroll/security actions require explicit confirmation.
- Voice execution of dangerous actions requires extra confirmation.
- AI cannot silently execute destructive actions.

## Audit Rules
Every AI action must record:

- `user_id`
- `company_id` / `tenant_id`
- AI type
- tool called
- input summary
- affected record
- action result
- confirmation status
- timestamp
- error/failure result, if any

## Voice / Avatar Rules
- Voice can explain and navigate easily.
- Voice can prepare drafts.
- Voice can execute only with clear confirmation.
- Avatar must not cover important UI.
- Avatar should guide, explain, and confirm, not distract.
- User must be able to stop/cancel voice/avatar execution.
