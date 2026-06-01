# AiXia AgentOps Specification

## What AgentOps Is

**AgentOps** is the future **Owner-only, in-app control center** where the **12 combined expert agents** (see `qa-agent/qa-agent-council.md`), **Hermes**, **CodeGraph**, and **real browser QA** work together to maintain an **Active Top 10** queue of open issues and improvements for Piter.

Agents **observe and recommend**; they do **not** directly edit production code, Supabase, or deployments. Piter reviews findings inside AiXia, fixes daily, adds remarks, and marks items fixed or rejected. The system **verifies** fixes before freeing queue slots and promoting new backlog items.

---

## What AgentOps Does Later

When implemented, AgentOps will:

- Use the **website through browser QA** (roles, flows, evidence)
- Produce **objective findings** with screenshots, steps, console/network context
- Let **Hermes** remember Piter’s remarks, rejections, and focus priorities
- Use **CodeGraph** to map issues to source files, shared components, and impact
- Have the **Final Council Chair** create **Cursor/Hermes** implementation prompts
- Show Piter an **in-app dashboard** at `/system/agent-ops` (see `AGENTOPS_UI_SPEC.md`)
- Allow Piter to **remark**, **approve**, **reject**, **defer**, mark **false positive**, **mark in progress**, and **mark fixed**
- **Verify** marked-fixed items before they leave the Active Top 10
- **Refill** the queue only up to 10 open items (not 10 new items every day when the queue is full)

Supporting specs:

| Topic | File |
| --- | --- |
| Product rules | `AGENTOPS_PRODUCT_SPEC.md` |
| Data model (future DB) | `AGENTOPS_DATA_MODEL_SPEC.md` |
| UI | `AGENTOPS_UI_SPEC.md` |
| Daily runs | `AGENTOPS_DAILY_WORKFLOW.md` |
| Feedback & memory | `AGENTOPS_FEEDBACK_MEMORY_SPEC.md` |
| Browser QA | `AGENTOPS_BROWSER_QA_SPEC.md` |
| Hermes & CodeGraph | `AGENTOPS_HERMES_CODEGRAPH_SPEC.md` |
| Hermes readiness meter | `AGENTOPS_HERMES_READINESS_SPEC.md` |
| Hermes connection checklist | `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md` |
| Hermes connection discovery | `AGENTOPS_HERMES_CONNECTION_DISCOVERY.md` |
| MVP decision record | `AGENTOPS_MVP_DECISION_RECORD.md` |
| Fix verification | `AGENTOPS_FIX_VERIFICATION_SPEC.md` |
| Pre-SQL approval | `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` |
| Build order | `AGENTOPS_IMPLEMENTATION_SEQUENCE.md` |

---

## Current Hermes Status

| Field | Value |
| --- | --- |
| Hermes readiness score | **8 / 100** |
| Label | **Learning** |
| MVP memory mode | **Database-only** |
| Hermes app-callable | **No** |
| CodeGraph app-callable | **No** |

Hermes and CodeGraph may still help through **Cursor/project tooling**, but AgentOps MVP must **not** depend on live runtime Hermes automation.

---

## Current Status

| Layer | Status |
| --- | --- |
| Product & workflow specs | **Written** (`qa-agent/agentops/`) |
| Foundation index links | **Updated** (`qa-agent/README.md`, `FOUNDATION_INDEX.md`, `NEXT_PHASES.md` Phase 13) |
| Data model approval | **Approved** (2026-05-27 — `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md`) |
| Hermes connection confirmation | **Complete for MVP** (`AGENTOPS_HERMES_CONNECTION_DISCOVERY.md`) |
| MVP decision record | **Recorded** (`AGENTOPS_MVP_DECISION_RECORD.md`) |
| SQL/RLS implementation plan | **Next** (Stage 2 — plan only) |
| Supabase tables / RLS (applied) | **Not started** |
| In-app UI | **Not started** |
| Browser automation runner | **Not started** |
| Hermes writer integration | **Not started** |
| CodeGraph runtime in runs | **Not started** |
| Daily scheduler / cron | **Not started** |

Existing **static** QA tooling (`qa:static-discovery`, `qa:static-design-guardrails`, `qa:guardrail-action-plan`) remains separate; AgentOps will **consume** those reports as inputs when automation exists.

---

## Read Order

1. `qa-agent/agentops/README.md` (this file)  
2. `AGENTOPS_PRODUCT_SPEC.md`  
3. `AGENTOPS_DATA_MODEL_SPEC.md`  
4. `AGENTOPS_UI_SPEC.md`  
5. `AGENTOPS_DAILY_WORKFLOW.md`  
6. `AGENTOPS_FEEDBACK_MEMORY_SPEC.md`  
7. `AGENTOPS_BROWSER_QA_SPEC.md`  
8. `AGENTOPS_HERMES_CODEGRAPH_SPEC.md`  
9. `AGENTOPS_HERMES_READINESS_SPEC.md`  
10. `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md` — **before Hermes-dependent automation**  
11. `AGENTOPS_FIX_VERIFICATION_SPEC.md`  
12. `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` — **before any SQL**  
13. `AGENTOPS_IMPLEMENTATION_SEQUENCE.md` — **after approval**  

Also read foundation context first: `qa-agent/README.md`, `qa-agent/qa-agent-council.md`, `qa-agent/qa-issue-taxonomy.md`, `qa-agent/ai-access-boundary.md`.

---

## Safety Rules

- **Owner-only by default** — AgentOps data, memory, and UI are not for normal employees or tenant admins unless a future policy explicitly allows a read-only subset.
- **No Personal User AI access** to Owner AgentOps memory, focus directives, or system-improvement prompts.
- **No tenant user access** to global AgentOps findings unless explicitly designed and approved later.
- **No production destructive actions** in browser QA (read-only default on production).
- **No direct production edits** by agents; implementation is Owner-approved separate work.
- **Verification required** before an item is treated as done and removed from the Active Top 10.
- **Critical security/tenant issues** must not be suppressed by focus directives or memory (see product spec).

---

## Related QA Foundation

| Asset | Use |
| --- | --- |
| `qa-agent/registry/*` | Roles, routes, panels, agents |
| `qa-agent/reports/*` | Static/guardrail reports; future evidence import |
| `qa-agent/NEXT_PHASES.md` | Phase 13 subphases |

**Next step:** Create AgentOps **SQL/RLS implementation plan** (Stage 2 — documentation only). See `AGENTOPS_IMPLEMENTATION_SEQUENCE.md`.
