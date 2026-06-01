# Cursor/Hermes Fix Prompt

TASK:
Fix [ISSUE ID / PROPOSAL ID].

CONTEXT:
Explain the issue or approved improvement clearly.

CATEGORY:
Design / Functional / Logical / Technical / HR / AI-MCP / Personal AI / SaaS / Integration

SEVERITY / PRIORITY:

PAGE / ROUTE:

MODULE:

EVIDENCE:
- Screenshot:
- Trace:
- Console log:
- Network log:
- QA report:

ROOT CAUSE TO INVESTIGATE:

REQUIRED SOURCE FILES / DOCS TO READ FIRST:
Always include relevant docs, and include these when relevant:
- qa-agent/qa-issue-taxonomy.md
- qa-agent/qa-agent-council.md
- qa-agent/ai-access-boundary.md
- qa-agent/personal-ai-memory-and-tools.md
- qa-agent/saas-readiness-council.md
- qa-agent/qa-config-overview.md
- qa-agent/qa-user-roles.md
- qa-agent/qa-route-registry.md
- qa-agent/qa-review-panel-map.md
- qa-agent/ai-function-access-map.md

AIXIA SOURCE-OF-TRUTH RULES:
- Inspect shared AiXia source of truth first.
- Use shared components/CSS.
- Do not create page-local design systems.
- Do not patch only one page if the issue belongs to shared source of truth.
- Preserve design-only scope if the issue is design-only.

LOGIC / BACKEND SAFETY RULES:
- Preserve Supabase logic, API calls, routing, permissions, validation, handlers, data structure, and backend behavior unless explicitly required.
- Do not guess database columns.
- If schema is uncertain, request/inspect schema first.
- Preserve silent refresh behavior.
- Do not clear visible state on failed refresh.

SECURITY / TENANT / AI RULES:
- Preserve tenant/company boundaries.
- Preserve user role permissions.
- Personal AI cannot access Owner AI.
- AI cannot do more than the user can do manually.
- Destructive AI actions require confirmation and audit.

IMPLEMENTATION REQUIREMENTS:
1.
2.
3.

NON-CHANGES:
List exact things not to change.

DELIVERABLE FORMAT:
- If modifying code later, provide exact file path.
- Provide exact full section/block replacements with unique anchors.
- Do not use vague instructions.
- Do not say "paste below" or "add after" without giving a complete unique anchor section.
- Keep changes minimal and within approved scope.
- Run build/checks if executable work is part of that future task.

RETEST REQUIREMENTS:
List what must be retested after fix.
