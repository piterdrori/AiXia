# AgentOps Browser QA Safe Workflow Rules

- Readonly navigation is allowed.
- Safe modal open/close is allowed.
- Safe search/filter/sort is allowed.
- Safe tab switch is allowed.
- Safe form open is allowed.
- Form submit is blocked unless test/draft mode is explicitly approved.
- Archive/delete is blocked unless staging test data is explicitly approved.
- Production write is blocked.
- No real emails, payments, or invites.
- No service role usage.
- No secrets in screenshots, traces, logs, or generated evidence files.

## Stage 10 — role workflow safe QA

- Scope file: `qa-agent/browser-qa/workflow-scope.json`.
- Enabled modes: readonly-navigation, safe-ui-interaction, safe-form-open-no-submit, safe-search-filter-sort, safe-modal-open-close, safe-role-visibility.
- Disabled: `synthetic-draft-write-later` (Stage 11+ only with explicit approval).
- Run via `npm run qa:agentops-role-workflow-safe`.
- Reports: `qa-agent/reports/browser-qa/role-workflow-safe-report.{json,md}` (report-only; no AgentOps DB import).
- Fail runner only on critical security leak (e.g. non-owner AgentOps access) or zero credentials / infrastructure skip.
- Non-critical findings (console noise, unexpected deny on fuzzy routes) are recorded but do not fail the runner.

## Stage 11 — synthetic write/draft safe QA

- Scope file: `qa-agent/browser-qa/write-workflow-scope.json`.
- Enabled modes: create-draft-test-record (synthetic fields only), validation-error-check (inspect only, no submit when unsafe), cancel-form, permission-denied-check.
- Disabled: Save Draft submit when counterparty is required, master-data writes, payments, payroll, emails, invites, hard delete, non-synthetic archive/delete.
- Run via `npm run qa:agentops-write-draft-safe`.
- Reports: `qa-agent/reports/browser-qa/write-draft-safe-report.{json,md}` (report-only; no AgentOps DB import).
- All test names/titles must use prefix `AIXIA-QA-` when filling forms.
- Fail runner only on critical security leak (guest/viewer write access) or zero credentials / dev server down.
