# Cursor Prompt Style Standard (AgentOps)

## Purpose

Every agent-generated Cursor prompt for AiXia AgentOps must follow Piter’s approved **12-section structured style**. Issue content is specific to the finding; section headers and order are fixed.

Reference template: `qa-agent/prompt-standards/cursor-prompt-template.md`

---

## Required 12-Section Structure

Use these exact section headers (uppercase, trailing colon). One blank line between sections.

1. **TASK** — Clear one-sentence task.
2. **PURPOSE** — Why this issue matters and what the fix should achieve.
3. **IMPORTANT** — Safety and scope rules for the agent run.
4. **STAGING ONLY** — Staging/local only; no production/main Supabase or GitHub.
5. **CURRENT ISSUE** — Issue code, route, severity, category, evidence, actual vs expected behavior.
6. **READ FIRST** — Exact files, reports, routes, components, logs, screenshots, or artifacts to inspect **before** coding.
7. **DO NOT** — Strict no-change rules (bullets).
8. **FILES LIKELY TO MODIFY** — Exact likely files, or: `inspect first and report before modifying.`
9. **IMPLEMENTATION PARTS** — PART 1–5: inspect/reproduce, fix root cause, preserve behavior, validation, report.
10. **VALIDATION** — Commands to run (always include foundation commands when applicable).
11. **REPORT** — Required report contents (files changed, root cause, fix, preservation, validation, risks).
12. **FINAL CHECK** — Numbered checklist (see below).

---

## Prompt Quality Rules

- The prompt must be **issue-specific** (exact issue code, route/page, evidence).
- The prompt must **not** be vague; never say “fix this” without evidence paths or behavior detail.
- Include **known files** when available; otherwise instruct inspect-first.
- Always include **no-change rules**, **validation commands**, and **FINAL CHECK**.
- Use the same clear, strict tone as Piter’s ChatGPT prompts.
- If information is insufficient, the prompt must instruct Cursor to **inspect and report before changing code** (PART 1 only until confirmed).

---

## FINAL CHECK (required numbered items)

Within section 12, include this numbered checklist:

1. Files created
2. Files modified
3. Root cause fixed
4. Existing behavior preserved
5. Supabase/RLS/schema changed: Yes/No
6. Production/main touched: Yes/No
7. Validation results
8. Final status
9. Next recommended step

---

## Default DO NOT bullets (include unless issue overrides)

- Do not change unrelated logic
- Do not change Supabase/RLS/schema unless explicitly approved
- Do not redesign unrelated pages
- Do not remove existing actions
- Do not touch production/main
- Do not break existing tests

---

## Default VALIDATION commands (staging AgentOps fixes)

- `npm run build`
- `npm run qa:validate-foundation`
- Add issue-specific QA or browser smoke commands when relevant

---

## Issue Workspace usage

- `/system/agent-ops/issues/[issueCode]` displays prompts in this format (legacy fix-plan prompts are normalized on display).
- Piter may edit the prompt in the Issue Workspace before approval.
- The **approved/edited prompt** is the source of truth passed to `createAgentOpsCursorHandoff` (manual-first; no automatic Cursor execution).

---

## Full Example Prompt

```
TASK:
Fix AIXIA-WORKFLOW-RWF-29 — confirm and correct Guest QA access behavior for /finance/reports on staging.

PURPOSE:
Guest users must not see finance report data or navigation beyond what workflow-scope and permissions intend. This fix should align route guards, permissions, and workflow-scope with owner-approved staging behavior.

IMPORTANT:
Manual-first AgentOps handoff. Inspect before changing. Preserve authorized access for other roles. Report blockers instead of guessing business rules.

STAGING ONLY:
Use staging/local only. Do not touch production/main Supabase, production/main GitHub, or production deployments.

CURRENT ISSUE:
- Issue code: AIXIA-WORKFLOW-RWF-29
- Route: /finance/reports
- Severity: High
- Category: Workflow / Permissions
- Evidence: qa-agent/reports/browser-qa/role-workflow-safe-report.json; screenshot guest-finance_reports-1779879762569.png
- Actual: Guest QA loaded /finance/reports while workflow-scope expected redirect or deny
- Expected: Guest should be redirected or denied per workflow-scope.json and Piter’s decision

READ FIRST:
- qa-agent/reports/browser-qa/role-workflow-safe-report.json
- qa-agent/config/workflow-scope.json
- qa-agent/config/synthetic-browser-users.json
- src/lib/permissions.ts
- src/App.tsx
- src/app/finance/reports/page.tsx (if exists)

DO NOT:
- Do not change unrelated logic
- Do not change Supabase/RLS/schema unless explicitly approved
- Do not redesign unrelated pages
- Do not remove existing actions
- Do not touch production/main
- Do not break existing tests

FILES LIKELY TO MODIFY:
- src/lib/permissions.ts
- src/App.tsx
- workflow-scope or route guard files after inspect confirms root cause
If root cause is unclear after READ FIRST, inspect first and report before modifying.

IMPLEMENTATION PARTS:
PART 1 — inspect/reproduce: Reproduce Guest QA navigation to /finance/reports on staging; compare workflow-scope vs actual UI.
PART 2 — fix root cause: Apply minimal guard/permission or scope update per Piter-approved intent only.
PART 3 — preserve existing behavior: Confirm finance-admin and finance-viewer paths unchanged unless explicitly in scope.
PART 4 — validation: Run VALIDATION commands; note any browser smoke if permissions changed.
PART 5 — report: Write report per REPORT section.

VALIDATION:
- npm run build
- npm run qa:validate-foundation
- npm run qa:static-design-guardrails (if UI touched)
- Optional: relevant browser smoke script if route guards changed

REPORT:
Provide a short markdown or issue comment with:
- files changed
- root cause
- fix applied
- logic preserved
- validation results
- remaining risks

FINAL CHECK:
1. Files created
2. Files modified
3. Root cause fixed
4. Existing behavior preserved
5. Supabase/RLS/schema changed: No
6. Production/main touched: No
7. Validation results: (paste pass/fail summary)
8. Final status: (ready for verification / blocked / needs owner decision)
9. Next recommended step: (e.g. request AgentOps verification run)
```
