# AiXia AgentOps Daily Review System

## Product Goal

AiXia AgentOps is a **private Owner-only** in-app system where the **12 combined expert agents** (defined in `qa-agent/qa-agent-council.md`) use and analyze the live AiXia website like real users—not only static files—perform **real browser QA**, produce **objective findings**, rank them, and maintain an **active queue of up to 10 open issues/improvements** for Piter inside the AiXia website.

Each active item must show:

| Field | Purpose |
| --- | --- |
| Reporting agent | Which combined agent surfaced or owns the finding |
| Issue | Clear title, category, severity, problem statement |
| Route / page / workflow | Where the issue was observed |
| Browser evidence | Screenshots, steps, console/network, traces |
| Agent opinions | Approve / needs review / reject from participating agents |
| Root cause hypothesis | Separated from observation (not stated as fact without evidence) |
| Suggested improvement | Actionable recommendation |
| Cursor/Hermes prompt | Copy-ready implementation prompt |
| Owner remarks | Piter’s feedback thread |
| Fix status | Lifecycle status including verification |
| Verification result | Verified Fixed / Still Broken / etc. |

Piter reviews daily (or on demand), fixes issues, adds remarks, marks fixed/not fixed, and the system **verifies fixes** before freeing queue slots and promoting new backlog items.

---

## Core Principle

**Agents observe; they do not directly modify production.**

Agents and automation must:

- Observe the application in browser and static analysis
- Browse and use the website as role-appropriate synthetic users
- Test workflows within safety boundaries
- Analyze findings with specialist lenses
- Remember Owner feedback through Hermes
- Recommend and rank improvements
- Generate Cursor/Hermes prompts
- Learn from Piter’s remarks and refocus future runs
- Run **targeted verification** after Piter marks items fixed

Agents must **not**:

- Commit code, deploy, or mutate production data without an explicit Owner-approved implementation step outside AgentOps
- Bypass permissions or tenant boundaries
- Overwhelm Piter with unbounded queues

---

## Primary User

| User | Access |
| --- | --- |
| **Piter / Owner AI user** | Full AgentOps: queue, backlog, memory, focus directives, prompts, verification, run history |
| **Admins (future, optional)** | Limited read-only AgentOps summaries only if explicitly enabled by Owner policy |
| **Normal users / Personal User AI** | **No access** to Owner AgentOps memory, prompts, or system-improvement queue |

AgentOps aligns with `qa-agent/ai-access-boundary.md`: Owner AI capabilities stay Owner-only; Personal User AI cannot read AgentOps memory or coordinate system fixes.

---

## System Components

### 1. Twelve Combined Agents

Use the canonical council from `qa-agent/qa-agent-council.md`:

1. Product & SaaS Strategy Agent  
2. Design & UX Excellence Agent  
3. Design System & Frontend Quality Agent  
4. Business Logic & Operations Agent  
5. HR & People Operations Agent  
6. Security, Permissions & Tenant Isolation Agent  
7. Backend, Database & Reliability Agent  
8. AI / MCP Architecture Agent  
9. Personal AI Productivity Agent  
10. Tools, Integrations & Commercial Open Source Agent  
11. Synthetic User QA Agent  
12. Final Council Chair / Implementation Planner  

Each agent contributes specialist review on findings that match its domain. The **Final Council Chair** synthesizes ranking, prompts, and implementation scope.

### 2. Hermes

Hermes is the **memory, planning, prioritization, focus-directive, and coordination brain** for AgentOps:

- Long-term Owner preferences and rejection patterns  
- Focus directives derived from Piter’s remarks  
- Sprint/module priority weights  
- Prompt style memory  
- Coordination of multi-agent opinions  
- Repeated-issue tracking across runs  

AgentOps must **not depend** on Hermes for core QA until connection and memory support are confirmed (`AGENTOPS_HERMES_CONNECTION_CHECKLIST.md`).

### 3. Hermes Readiness Meter

The in-app AgentOps UI must show whether Hermes is **connected** and how much it currently supports memory and focus:

| UI element | Purpose |
| --- | --- |
| **Hermes Memory Support Meter** | Score **0–100** with label (Learning → Full AgentOps Memory Support) |
| **Memory mode** | Database-only / Hermes-assisted / Hermes-primary (DB still system of record) |
| **Last Hermes check** | When connection/readiness was last validated |

See `AGENTOPS_HERMES_READINESS_SPEC.md`. The database remains the **durable system of record** even when Hermes is the primary memory-support layer.

### 4. CodeGraph

CodeGraph is the **codebase search and dependency intelligence** layer:

- Map routes and UI symptoms to files and symbols  
- Identify shared vs page-local fix targets  
- Blast-radius awareness for prompts  
- Reduce false positives from static-only guesses  

### 5. Browser QA

Browser QA provides **real evidence** by using the website:

- Navigation, clicks, forms, modals, tabs  
- Role-based visibility checks  
- Screenshots, console errors, network failures  
- User-flow clarity and blocker detection  

Static guardrails (e.g. `qa-agent/scripts/static-design-guardrails.mjs`) supplement but **do not replace** browser QA for AgentOps.

### 6. In-App AgentOps UI

Owner-facing UI at **`/system/agent-ops`** (see `AGENTOPS_UI_SPEC.md`) for:

- Active Top 10 queue  
- Backlog and run history  
- Finding detail, evidence, prompts  
- Owner feedback and verification panels  
- Memory and focus directive management  

---

## What the Twelve Agents Do

Agents must **not** only scan files. For each candidate finding they must:

1. Apply specialist skills (design, logic, security, SaaS, etc.)  
2. Review **browser evidence** when the finding is UI or workflow related  
3. State **objective** observations separate from hypotheses  
4. Classify **category** and **severity** per `qa-agent/qa-issue-taxonomy.md`  
5. Suggest improvements and **non-changes** (Supabase, permissions, routing, etc.)  
6. Contribute to or approve **Cursor/Hermes prompts**  
7. Use **Hermes memory** to avoid repeats and honor focus  
8. Use **CodeGraph** to pinpoint fix location (shared component vs page)  

**Synthetic User QA Agent** leads evidence collection; **Final Council Chair** owns prompt quality and queue promotion decisions.

---

## Finding Types

Categories (align with QA taxonomy and extend for AgentOps):

| Type | Description |
| --- | --- |
| Design | Visual, UX, responsiveness, shared design-system drift |
| Functional | Broken interactions, forms, modals, tables, actions |
| Logical | Wrong lifecycle, visibility, finance/HR business behavior |
| Technical | Build, TypeScript, performance, reliability, data loading |
| Improvement | Non-blocking enhancement with clear value |
| HR | People operations, employee workflows |
| AI/MCP | Tool exposure, boundaries, agent-ready APIs |
| Personal AI | Per-user productivity and memory boundaries |
| SaaS | Multi-tenant, onboarding, billing readiness |
| Security/Permission | Tenant isolation, role leaks, destructive access |
| Performance/Reliability | Slow, flaky, silent refresh, data loss on refresh |

---

## Priority Order

Ranking for promotion into Active Top 10 (after focus weights and memory):

1. **Critical** — security/tenant leak, broken finance/HR logic, build failure, data corruption risk, AI boundary violation  
2. **High** — broken workflow, failed CRUD/archive, serious UX blocker, broken route, wrong permission behavior  
3. **Medium** — design inconsistency, confusing flow, table/header issues, repeated UI drift, slow but usable  
4. **Low** — spacing, labels, minor polish  
5. **Improvement** — UX/SaaS/AI/HR/automation ideas without blocking defect  

Critical and High issues can preempt Improvement items when slots are limited.

---

## Active Top 10 Queue Rule

AgentOps maintains **up to 10** active open issues/improvements for Piter.

| Rule | Behavior |
| --- | --- |
| Queue full (10 active open) | **Do not** add new Top 10 items; agents may run quiet scans and append **backlog** only |
| Piter fixes N items | Run verification on those N; only after **Verified Fixed** do slots open |
| N slots open after verification | Promote **at most N** new findings (not 10) |
| Piter fixes nothing | No new Top 10 promotions |
| Weekends / inactive days | No forced new issues unless slots open |
| Steady state | Queue stays ~10 items; backlog holds the rest |

“Active open” means status in Active Top 10 and not yet Verified Fixed or Archived/Rejected/False Positive.

---

## Backlog Rule

Backlog findings:

- Are **not** shown as Piter’s daily active work unless promoted  
- Refill the Active Top 10 when slots open  
- Respect **rejection** and **false-positive** memory (similar items deprioritized)  
- Rank by severity, focus directive, module priority, business value, and evidence strength  

Promotion is logged in `agentops_backlog_promotions` (future data model).

---

## Finding Lifecycle

Statuses (single finding may progress through subsets):

| Status | Meaning |
| --- | --- |
| New | Just created, not triaged |
| Backlog | Stored, not in Top 10 |
| Active Top 10 | In Owner daily queue |
| Owner Reviewed | Piter opened/commented |
| Approved for Fix | Owner approved prompt/scope |
| Rejected | Owner rejected; learn pattern |
| Deferred | Explicitly postponed |
| False Positive | Owner or verification dismissed |
| In Progress | Owner indicated work started |
| Marked Fixed by Piter | Awaiting verification |
| Verification Running | Targeted retest in progress |
| Verified Fixed | Fix confirmed; slot can open |
| Still Broken | Verification failed |
| Needs Follow-Up Fix | Partial fix or related defect remains |
| Verification Blocked | Cannot verify (env, data, permission) |
| Archived | Closed historically |

---

## Fix Verification Rule

When Piter marks **Fixed** (or requests verification):

1. Load original finding, evidence, and reproduction steps  
2. Revisit route/workflow in browser (or static/build check as appropriate)  
3. Confirm expected fix is present  
4. Check related regressions  
5. Capture updated evidence  
6. Set result: **Verified Fixed** | **Still Broken** | **Needs Follow-Up Fix** | **Verification Blocked**  

| Result | Action |
| --- | --- |
| Verified Fixed | Leave Active Top 10; open slot; optional backlog promotion on next run |
| Still Broken | Remain active; generate follow-up prompt |
| Needs Follow-Up Fix | Keep active or spawn linked finding |
| Verification Blocked | Remain active or Owner Reviewed; document blocker |

See `AGENTOPS_FIX_VERIFICATION_SPEC.md`.

---

## Relationship to Existing QA Foundation

| Existing asset | AgentOps use |
| --- | --- |
| `qa-agent/qa-agent-council.md` | Agent identities and panels |
| `qa-agent/qa-issue-taxonomy.md` | Categories, severity, evidence rules |
| `qa-agent/ai-access-boundary.md` | Owner vs Personal AI boundaries |
| `qa-agent/registry/*` | Routes, roles, panels (machine-readable) |
| `qa-agent/scripts/static-*` | Supplementary signals, not sole source |
| `qa-agent/reports/*` | Importable evidence artifacts |
| CodeGraph MCP | Structural mapping |
| Hermes | Memory and focus (Owner-only) |

---

## Safety

Agents and AgentOps automation **cannot**:

- Directly edit production app code or database  
- Deploy or change infrastructure without Owner implementation workflow  
- Bypass permissions or access another tenant’s data  
- Expose Owner AgentOps memory to Personal User AI or tenant users  
- Execute destructive browser actions in production without explicit approval  
- Create unlimited work items that overwhelm Piter  
- Auto-close Critical security issues without Owner visibility  

Production browser QA defaults to **read-only** unless Owner enables scoped write tests in staging.

---

## Success Metrics (Product)

- Active queue stays at ~10 actionable items  
- Each item has browser or strong static evidence  
- Verification runs within 24h of Mark Fixed when automation is enabled  
- False-positive rate decreases via memory  
- Piter spends review time on ranked, prompt-ready work—not raw scan dumps  

---

## Out of Scope for This Spec Phase

- UI implementation  
- Database tables and RLS  
- Browser automation implementation  
- Cron/schedulers  
- Finance local-glass implementation batch  

See companion specs in `qa-agent/agentops/` for data model, UI, workflow, memory, browser QA, Hermes/CodeGraph, and verification.
