# AiXia QA Issue Taxonomy

## Purpose
This document defines how the AiXia QA system classifies issues, captures evidence, sets severity, and converts validated findings into Cursor/Hermes implementation prompts.

## Issue Categories

### 1) Design Issue
**Definition**  
A visual, layout, UI, UX, responsiveness, spacing, typography, shared-design-system, or user-clarity problem.

**Examples**
- Different font sizes between equivalent pages
- Missing shared AiXia hero
- Missing overview/status cards
- Local card design instead of shared components
- Wrong button color
- Wrong spacing
- Empty gaps
- Card height mismatch
- Table header/content misalignment
- Horizontal scroll problems
- Mobile/tablet layout issues
- Avatar placement or visual guidance problems

**Required evidence**
- Screenshot
- Viewport size
- Route
- User role
- Expected vs actual visual behavior
- Suspected shared component/CSS source, if relevant

**Fix-prompt behavior**
- Inspect shared AiXia source of truth first.
- Prefer shared component/CSS fixes over page-local patches.
- Never change business logic for design-only issues.

### 2) Functional Issue
**Definition**  
A user action, workflow, button, form, modal, tab, upload, search, filter, sort, create/edit/archive/delete, or interaction does not work correctly.

**Examples**
- Buttons do not click
- Forms do not open
- Create page fails
- Edit mode fails
- Save Draft fails
- Archive opens incorrectly
- Restore fails
- Delete workflow fails
- Search/filter/sort does not work
- Tabs do not switch
- Modal does not close
- Upload panel does not respond

**Required evidence**
- Steps to reproduce
- Screenshot/video/trace
- Console errors
- Network errors
- Route
- User role
- Expected result
- Actual result

**Fix-prompt behavior**
- Preserve app logic unless the issue truly requires a logic fix.
- Identify whether cause is frontend, backend, permission, routing, or data-state related.
- Do not create local replacement systems if shared components exist.

### 3) Logical Issue
**Definition**  
The page technically works, but business behavior, role visibility, lifecycle state, finance/HR workflow, approval, archive/delete, or data relationship is wrong.

**Examples**
- Employee sees internal funding status
- Finance viewer sees Delete button
- Draft document shows final approval action
- Company bank currency does not follow company currency
- Vendor bank currency does not use general currency master data
- Paid records show editable draft actions
- Archived records appear on active registry
- Payroll approval and finance payment execution are mixed incorrectly
- Employee-facing HR page exposes company-internal HR/admin data

**Required evidence**
- Route
- User role
- Record state/status
- Expected business rule
- Actual behavior
- Screenshot/trace, if available
- Permission or lifecycle rule violated

**Fix-prompt behavior**
- Explain why behavior is wrong.
- Identify frontend visibility, permission, backend, or data-state cause.
- Preserve existing backend unless backend/permission fix is explicitly required.
- Require schema inspection before any uncertain database change.

### 4) Technical Issue
**Definition**  
A technical failure such as console error, network failure, Supabase error, build error, TypeScript error, hydration error, slow loading, missing environment variable, route error, or broken data loading.

**Examples**
- Console errors
- Network failed requests
- 404 routes
- Supabase query errors
- Build errors
- TypeScript errors
- Hydration errors
- Slow loading pages
- Missing environment variables
- Realtime or silent refresh failure

**Required evidence**
- Console logs
- Network logs
- Failed request URL
- Error message
- Stack trace, when available
- Route
- User role
- Screenshot
- Timing/performance data, if relevant

**Fix-prompt behavior**
- Identify whether issue is build, frontend, backend, routing, Supabase, environment, or performance.
- Do not guess database columns.
- Require schema inspection for Supabase uncertainty.
- Preserve visible state during silent refresh.

### 5) Improvement Suggestion
**Definition**  
Not a bug. A product, UX, workflow, AI, SaaS, HR, finance, automation, document, image, report, integration, or performance idea that can improve usefulness, professionalism, uniqueness, commercialization, or ease of use.

**Examples**
- Workflow needs fewer clicks
- Page needs better summary
- Table needs missing filter
- User role needs clearer messaging
- Dashboard should show a KPI
- Action needs confirmation text
- AI should help prepare a document
- Personal AI should suggest next task
- HR module needs onboarding checklist
- SaaS tenant setup needs guided wizard

**Required evidence**
- Current workflow/page context
- Why suggestion adds value
- Expected benefit
- Risk
- Required review panel
- Whether it affects SaaS readiness, AI/MCP readiness, HR, permissions, or backend

**Fix-prompt behavior**
- Must not become implementation until reviewed by relevant council agents.
- Include scope, non-changes, risk, required source files, and implementation plan if approved.
- Reject if redundant, too risky, page-local, or not aligned with AiXia standards.

## Severity Levels

- **Critical**: permission/security/data leak issues, tenant isolation risk, finance/HR sensitive exposure, wrong financial data, destructive action risk, production route failure, build failure, or backend data corruption risk.
- **High**: major broken workflow, failed create/edit/archive/restore/delete, broken registry, broken AI action, failed HR/payroll workflow, or severe user-blocking bug.
- **Medium**: important usability/design/functionality issue that does not fully block workflow.
- **Low**: minor visual, text, spacing, alignment, or non-blocking issue.
- **Suggestion**: improvement ideas only (not bugs).

## Required Issue Report Format
Every issue must use this exact structure:

- ISSUE ID:
- CATEGORY:
- SEVERITY:
- PAGE:
- USER ROLE:
- VIEWPORT:
- DEVICE:
- BROWSER:
- STEPS TO REPRODUCE:
- EXPECTED RESULT:
- ACTUAL RESULT:
- EVIDENCE:
- CONSOLE / NETWORK ERRORS:
- LIKELY ROOT CAUSE:
- FIX STRATEGY:
- REVIEW PANEL:
- AGENTS INVOLVED:
- AGENT OPINIONS:
- FINAL COUNCIL DECISION:
- IMPLEMENTATION PLAN:
- SAAS READINESS IMPACT, if relevant:
- AI/MCP READINESS IMPACT, if relevant:
- PERSONAL AI IMPACT, if relevant:
- HR IMPACT, if relevant:
- CURSOR/HERMES FIX PROMPT:
- DO-NOT-CHANGE RULES:

## Global AiXia Rules
Every issue and prompt must respect all rules below:

- Inspect shared AiXia source of truth first.
- Use shared AiXia components and CSS before page-level fixes.
- Do not create page-local design systems.
- Do not patch one page if issue belongs to shared component/CSS.
- Do not change business logic for design-only issues.
- Preserve Supabase logic, API calls, routing, permissions, validation, handlers, data structure, and backend behavior unless explicitly required.
- For backend/schema uncertainty, require schema inspection before code changes.
- For HR issues, separate employee-facing visibility from company-internal HR/admin visibility.
- For AI/MCP issues, classify whether AI can explain, navigate, read/search, prepare draft, execute after confirmation, execute automatically, or never access.
- For SaaS issues, classify tenant isolation, plan entitlement, onboarding, configuration, analytics, and support impact.
- For personal AI issues, classify memory, privacy, permission boundary, user controls, and audit impact.
