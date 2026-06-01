# Synthetic User Browser Interaction Plan

## Purpose
Define how the **12 staging synthetic QA accounts** will interact with the AiXia web app during future Playwright/browser QA. These accounts are **browser identities**, not the AgentOps agent brains themselves.

## Principles
- **Staging only** — never production credentials or production writes.
- **Evidence-first** — expert agents consume screenshots, route outcomes, and console/network summaries from these users.
- **Read-only first** — all browser QA starts with navigation and visibility checks; staged writes require explicit approval and synthetic test data.
- **One Owner** — only `qa+agentops-owner@aixia.local` may access `/system/agent-ops` via `agentops_owners`.
- **Role realism** — each account maps to an allowed `profiles.role` plus optional `permissions` overrides.

## How agents use these users
The 12 AgentOps expert agents do not log in directly. They receive **objective browser evidence** produced when Playwright (or a human) runs flows as a given synthetic user:
- route reached / blocked / redirect
- visible UI regions and labels
- permission-denied states
- console and network errors (non-secret)

## Per-user interaction scope

| QA user | Primary routes / modules | AgentOps | Interaction mode |
|---------|--------------------------|----------|------------------|
| AgentOps Owner QA | `/system/agent-ops`, dashboard, global nav | Yes | Owner smoke, global visibility |
| Platform Admin QA | dashboard, settings, employees, finance entry | No | Admin without Owner AgentOps |
| Finance Admin QA | `/finance/*`, master data, transactions, reports | No | Finance workflows (read-first) |
| Finance Viewer QA | finance read routes, reports | No | Blocked writes, read-only finance |
| Employee QA | dashboard, projects, tasks, self-service | No | Restricted internal data |
| HR Admin QA | `/employees`, payroll-related visibility | No | HR admin workflows |
| HR Employee QA | expenses, own paychecks | No | HR self-service boundaries |
| Manager QA | projects, tasks, team views | No | Approvals / team visibility |
| AI User QA | chat, `/ai-management` | No | AI features, no Owner memory |
| Guest QA | limited dashboard/projects | No | Redirects and guards |
| Vendor External QA | minimal dashboard | No | External boundary tests |
| Tenant Admin QA | tenant-style admin surfaces | No | SaaS admin without AgentOps |

## Workflow phases
1. **Read-only smoke** — login, navigate, assert visibility (current Stage 9 pattern).
2. **Visual navigation** — deeper module walkthroughs per role.
3. **Functional-safe (later)** — staging-only drafts with synthetic records, never real customers/employees.
4. **Production** — remain read-only forever for these accounts.

## Safety
- No Refill Queue, Import Static Findings, or row destructive actions in read-only smokes.
- No Hermes/CodeGraph runtime automation from browser tests.
- No service role key in frontend or Playwright browser context.
