# AgentOps Browser QA Route Workflow Map

All workflows in this foundation are readonly/safe.

## `/system/agent-ops`
- Check page loads.
- Check owner-only access behavior.
- Check Hermes meter is visible.
- Check Active Top 10 section is visible.
- Check refill/low-backlog notice area is visible when applicable.

## `/finance`
- Check page loads.
- Check finance hub cards are visible.

## `/finance/master-data`
- Check page loads.
- Check navigation is visible.

## `/finance/transactions`
- Check page loads.
- Check transaction module cards/links are visible.

## `/finance/reports`
- Check page loads.

## `/finance/settings`
- Check access behavior (allowed vs blocked by role).

## `/ai-management`
- Check page loads.

## Stage 10 role workflow safe coverage

Routes exercised per synthetic user with safe interactions (no submits/writes):

| Route | Safe interactions |
| --- | --- |
| `/dashboard` | navigation, search type/clear, tabs, role visibility |
| `/system/agent-ops` | navigation, owner-only isolation check |
| `/finance` | navigation, search, tabs, modal open/close, role visibility |
| `/finance/master-data` | navigation, search, tabs, role visibility |
| `/finance/transactions` | navigation, search, tabs, role visibility |
| `/finance/reports` | navigation, search, tabs, role visibility |
| `/ai-management` | navigation, search, tabs, role visibility |

See `workflow-scope.json` for per-user expected access matrix.

## Stage 11 write/draft safe coverage

Conservative staging-only write exploration (no Save Draft submit when real counterparty required):

| Route | Mode | Users |
| --- | --- | --- |
| `/finance/transactions/quotations` | create button visibility | finance-admin (visible), finance-viewer (hidden), owner/admin (visible) |
| `/finance/transactions/quotations/new` | form open, synthetic notes, cancel back | finance-admin only |
| `/finance/transactions/quotations/new` | blocked route | guest, finance-viewer |

Blocked for Stage 11: master-data writes, payments, payroll, reports writes, AgentOps row actions, AI Management mutation.

See `write-workflow-scope.json` for allowed/blocked write modes.

## `/dashboard`
- Check page loads.
