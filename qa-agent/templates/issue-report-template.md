# Issue Report

ISSUE ID:
AIXIA-QA-0000

CATEGORY:
Design / Functional / Logical / Technical / Improvement

SEVERITY:
Critical / High / Medium / Low / Suggestion

STATUS:
New / Confirmed / Needs Review / Approved for Fix / Rejected / Fixed / Retest Required

PAGE / ROUTE:

MODULE:

PAGE TYPE:
Hub / Registry / Detail / Create / Settings / Report / Assistant / Unknown

USER ROLE:

AI TYPE INVOLVED:
None / Owner AI / Company-Tenant AI / Personal User AI / Multiple / Unknown

VIEWPORT:

DEVICE:

BROWSER:

ENVIRONMENT:
Local / Vercel Preview / Staging / Production Read-Only

STEPS TO REPRODUCE:
1.
2.
3.

EXPECTED RESULT:

ACTUAL RESULT:

EVIDENCE:
- Screenshot:
- Video:
- Trace:
- Console log:
- Network log:
- Other:

CONSOLE / NETWORK ERRORS:

LIKELY ROOT CAUSE:
Shared component / Shared CSS / Page-level code / Backend / Supabase / Permissions / Routing / Data state / Tenant isolation / AI-MCP access / Unknown

FIX STRATEGY:
Shared source-of-truth fix / Page-specific fix / Backend fix / Permission fix / Data fix / SaaS configuration fix / AI-MCP access fix / Needs investigation

REVIEW PANEL:

AGENTS INVOLVED:

AGENT OPINIONS:

FINAL COUNCIL DECISION:
Approved / Needs Review / Rejected

IMPLEMENTATION PLAN:

SAAS READINESS IMPACT:
None / Low / Medium / High / Critical

AI/MCP READINESS IMPACT:
None / Low / Medium / High / Critical

PERSONAL AI IMPACT:
None / Low / Medium / High / Critical

HR IMPACT:
None / Low / Medium / High / Critical

CURSOR/HERMES FIX PROMPT:

DO-NOT-CHANGE RULES:
- Preserve existing business logic unless the issue explicitly requires a logic fix.
- Preserve Supabase logic, API calls, routing, permissions, validation, handlers, data structure, and backend behavior unless explicitly required.
- Inspect shared AiXia source of truth before page-level changes.
- Do not create page-local design systems.
- Do not patch one page if the issue belongs to shared component/CSS.
- Do not guess database columns; inspect schema first when uncertain.
- Preserve tenant/company boundaries.
- Preserve personal AI and Owner AI separation.
