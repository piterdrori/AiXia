# Focus Directive Examples

## Example 1

Piter remark:  
"The Agents table alignment is terrible."

Directive:

- `directiveType`: `prioritize_issue_type`
- `target`: `route`
- `targetValue`: `system/agent-ops (Agents tab)`
- `priorityWeight`: `+25`
- `recommendedAgent`: `Design and UX Agent`

## Example 2

Piter remark:  
"Guest should never access finance."

Directive:

- `directiveType`: `permission_focus`
- `target`: `route`
- `targetValue`: `/finance/*`
- `priorityWeight`: `+50`
- `recommendedAgent`: `Security, Permissions, and Tenant Isolation Agent`

## Example 3

Piter remark:  
"Quotations are important now."

Directive:

- `directiveType`: `prioritize_module`
- `target`: `module`
- `targetValue`: `finance/quotations`
- `priorityWeight`: `+30`
- `recommendedAgent`: `Finance Workflow Agent`
