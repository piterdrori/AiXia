# Cursor Prompt Template (AgentOps)

Copy and fill placeholders. Keep all 12 section headers. Replace `{{PLACEHOLDER}}` values; remove helper lines in parentheses before handoff.

```
TASK:
{{ONE_SENTENCE_TASK}}

PURPOSE:
{{WHY_IT_MATTERS_AND_SUCCESS_CRITERIA}}

IMPORTANT:
{{SAFETY_AND_SCOPE_RULES}}
Manual-first AgentOps handoff. Inspect before changing when evidence is incomplete.

STAGING ONLY:
Use staging/local only. Do not touch production/main Supabase, production/main GitHub, or production deployments.

CURRENT ISSUE:
- Issue code: {{ISSUE_CODE}}
- Route: {{ROUTE_OR_PAGE}}
- Severity: {{SEVERITY}}
- Category: {{CATEGORY}}
- Evidence: {{EVIDENCE_PATHS_OR_SUMMARY}}
- Actual: {{ACTUAL_BEHAVIOR}}
- Expected: {{EXPECTED_BEHAVIOR}}

READ FIRST:
{{BULLET_LIST_FILES_REPORTS_ARTIFACTS}}

DO NOT:
- Do not change unrelated logic
- Do not change Supabase/RLS/schema unless explicitly approved
- Do not redesign unrelated pages
- Do not remove existing actions
- Do not touch production/main
- Do not break existing tests
{{ADDITIONAL_DO_NOT_RULES}}

FILES LIKELY TO MODIFY:
{{FILE_LIST_OR_INSPECT_FIRST_SENTENCE}}

IMPLEMENTATION PARTS:
PART 1 — inspect/reproduce: {{PART_1_DETAILS}}
PART 2 — fix root cause: {{PART_2_DETAILS}}
PART 3 — preserve existing behavior: {{PART_3_DETAILS}}
PART 4 — validation: {{PART_4_DETAILS}}
PART 5 — report: {{PART_5_DETAILS}}

VALIDATION:
- npm run build
- npm run qa:validate-foundation
{{ISSUE_SPECIFIC_VALIDATION_COMMANDS}}

REPORT:
Provide a short markdown or issue comment with:
- files changed
- root cause
- fix applied
- logic preserved
- validation results
- remaining risks
Suggested path: {{REPORT_PATH_OR_ISSUE_COMMENT}}

FINAL CHECK:
1. Files created
2. Files modified
3. Root cause fixed
4. Existing behavior preserved
5. Supabase/RLS/schema changed: Yes/No
6. Production/main touched: Yes/No
7. Validation results
8. Final status
9. Next recommended step
```

## Placeholder reference

| Placeholder | Description |
|-------------|-------------|
| `{{ONE_SENTENCE_TASK}}` | Imperative task with issue code |
| `{{WHY_IT_MATTERS_AND_SUCCESS_CRITERIA}}` | Business/QA impact |
| `{{ISSUE_CODE}}` | e.g. AIXIA-WORKFLOW-RWF-29 |
| `{{ROUTE_OR_PAGE}}` | Affected route or page |
| `{{SEVERITY}}` | Critical / High / Medium / Low |
| `{{CATEGORY}}` | Finding category |
| `{{EVIDENCE_PATHS_OR_SUMMARY}}` | Reports, screenshots, logs |
| `{{ACTUAL_BEHAVIOR}}` | What happened |
| `{{EXPECTED_BEHAVIOR}}` | What should happen |
| `{{FILE_LIST_OR_INSPECT_FIRST_SENTENCE}}` | Known paths or inspect-first instruction |
