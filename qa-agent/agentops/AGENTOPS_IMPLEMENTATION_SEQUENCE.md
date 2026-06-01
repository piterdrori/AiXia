# AgentOps Implementation Sequence

## Rule

**One prompt at a time. No jumping ahead.**

Each stage must be stable (and approved where noted) before the next stage starts. Do not combine SQL + UI + browser runner + cron in a single task.

**Gates:**

| Before | Requirement |
| --- | --- |
| **Stage 2 (SQL/RLS plan)** | Stage 1 + 1B complete; `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` approved |
| **Stage 2 (actual SQL migration)** | Piter explicitly approves applying migration files to Supabase |
| **Live Hermes-dependent automation** | Hermes app-callable + Stage 9A adapter plan + Stage 9 |
| **Hermes meter in UI** | Spec approved; implement in Stage 4 (initial: 8/100, Learning, Database-only) |

---

## Stage 1 — Data Model Approval

| Field | Value |
| --- | --- |
| **Status** | **Complete** (2026-05-27) |
| **Goal** | Review and approve `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` |
| **Deliverables** | Checked approval boxes; answers to open questions (including Hermes UI readiness Q8) |
| **Code** | **None** — documentation only |

---

## Stage 1B — Hermes Connection Confirmation

| Field | Value |
| --- | --- |
| **Status** | **Complete for MVP decision** (2026-05-27) |
| **Goal** | Identify where Hermes is implemented, whether AgentOps can call it, and whether it can support memory/focus directives |
| **Result** | Hermes is **Cursor-only / project-tooling only**. CodeGraph is **Cursor MCP / tooling only**. Neither is app-callable today. |
| **Decision** | Proceed with **database-only** AgentOps MVP. Keep Hermes readiness visible in UI as **Learning / 8 out of 100**. Do **not** build Hermes-dependent automation until a future Hermes adapter is designed. |
| **Deliverables** | `AGENTOPS_HERMES_CONNECTION_DISCOVERY.md`; updated `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md`; `AGENTOPS_MVP_DECISION_RECORD.md` |
| **Excludes** | Live Hermes automation; Hermes writer; API routes |
| **Verify** | Discovery documented; Piter approval boxes checked for MVP path |

---

## Stage 2 — AgentOps SQL/RLS Implementation Plan

| Field | Value |
| --- | --- |
| **Status** | **Current** |
| **Goal** | Document the Supabase schema + RLS plan for AgentOps (tables, indexes, policies, service-role boundaries) — **plan only** |
| **Includes** | Migration file outline; RLS policy names and rules; owner-only enforcement; optional `agentops_hermes_readiness` columns/table only if listed in plan |
| **Excludes** | Applying migrations to Supabase unless Piter explicitly approves in a separate prompt; UI, API routes, browser runner, cron, Hermes automation |
| **Verify** | Plan reviewed against `AGENTOPS_DATA_MODEL_SPEC.md` and approved checklist |
| **Note** | Actual SQL migration is a **separate** stage/prompt after this plan is approved |

---

## Stage 2B — Supabase Schema + RLS (Apply Migration)

| Field | Value |
| --- | --- |
| **Status** | Future (after Stage 2 plan approved + explicit Piter approval for SQL) |
| **Goal** | SQL migration for AgentOps tables and Owner-only RLS |
| **Includes** | Tables, indexes, constraints, RLS policies, helper functions if needed |
| **Excludes** | UI, API routes, browser runner, cron |
| **Verify** | Migration applies cleanly; RLS denies non-owner test user |

---

## Stage 3 — TypeScript Types / Service Layer

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Safe AgentOps service functions (no page UI yet) |
| **Includes** | Read active Top 10; read backlog; create run; create finding; add owner feedback; mark fixed; create verification; promote backlog to slots (enforce cap 10) |
| **Excludes** | Automated daily run; Hermes writer |
| **Verify** | Unit/integration tests against staging DB optional; manual script smoke OK |

---

## Stage 4 — UI Shell

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | `/system/agent-ops` **read-only** dashboard |
| **Includes** | Command hero; **Hermes Memory Support Meter** (initial: **8/100**, **Learning**, **Database-only**); Hermes Status Panel (read-only); Active Top 10 table; backlog count; finding detail; prompt panel (read/copy) |
| **Excludes** | Write actions; verification runner; live Hermes Check automation (until Stage 9) |
| **Design** | Shared AiXia components only (`AGENTOPS_UI_SPEC.md`) |

---

## Stage 5 — Owner Feedback Actions

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Piter can change finding state from UI |
| **Includes** | Remark; approve; reject; defer; false positive; mark in progress; mark fixed; request verification |
| **Excludes** | Automated verification execution (Stage 6) |
| **Side effect** | Focus directives created from `focus_instruction` feedback |

---

## Stage 6 — Verification Runner

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Targeted verification after Mark Fixed |
| **Includes** | Manual “Run verification” trigger; persist `agentops_verifications`; update finding status; follow-up prompt on failure |
| **Excludes** | Full browser suite (can be manual/browser-assisted first) |
| **Rule** | Slot opens only on Verified Fixed |

---

## Stage 7 — JSON / Static Report Import

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Seed AgentOps DB from existing `qa-agent/reports/*` |
| **Includes** | Import guardrail action plan, static findings (classified), optional browser verification markdown |
| **Excludes** | Replacing live browser runner |
| **Use** | Bootstrap backlog and demo UI |

---

## Stage 8 — Browser QA Runner

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Real browser QA on local/staging |
| **Includes** | Role login; route flows; screenshots; console/network capture; write `agentops_evidence_files` |
| **Excludes** | Production destructive tests; daily cron |
| **Note** | Package install (e.g. Playwright) requires **explicit** approval prompt |

---

## Stage 9A — Hermes Adapter Plan

| Field | Value |
| --- | --- |
| **Status** | Future (documentation before runtime integration) |
| **Goal** | Design how Cursor-only Hermes/project memory could later sync with AgentOps DB without exposing Owner AgentOps memory to Personal User AI |
| **Includes** | Call paths (Edge Function vs batch vs manual sync); namespace boundaries; readiness score automation; failure/fallback rules |
| **Excludes** | Live Hermes writer; app routes; bypassing RLS |
| **Prerequisite** | Hermes app-callable OR approved bridge pattern; Stage 2B schema exists |
| **Verify** | Piter approves adapter plan before Stage 9 implementation |

---

## Stage 9 — Hermes Memory Integration

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Convert Piter remarks to `agentops_agent_memory` and focus directives via approved adapter |
| **Includes** | Parse feedback; score adjustments; explainability in run summary; **automated Hermes readiness scoring** (when app-callable) |
| **Prerequisite** | Stage 9A approved; Hermes app-callable confirmed |
| **Excludes** | Personal User AI access to AgentOps memory |

---

## Stage 10 — CodeGraph Integration

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Map findings to source files/components in DB/UI |
| **Includes** | `codegraph-note` evidence; `recommended_fix_strategy`; prompt file lists |
| **Fallback** | Tag `codegraph-limited` when MCP unavailable |

---

## Stage 11 — Daily Scheduler

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Scheduled daily run (Vercel cron or external) |
| **Gate** | Stages 4–6 stable manually; Piter approves schedule |
| **Includes** | Quiet mode when queue full; promote only open slots |
| **Excludes** | Production write tests |

---

## Stage 12 — Full Agent Council Automation

| Field | Value |
| --- | --- |
| **Status** | Future |
| **Goal** | Automated daily Top 10 with 12-agent opinions, prompts, verification loop |
| **Includes** | Full `AGENTOPS_DAILY_WORKFLOW.md` pipeline |
| **Excludes** | Unsupervised production mutation |

---

## Hard Stop Rules

| Stop rule | Reason |
| --- | --- |
| Do not implement later stages until earlier ones are stable | Prevents fragile mega-PRs |
| Do not schedule daily runs before UI + verification exist | Owner cannot act on noise |
| Do not allow production write tests | Safety |
| Do not expose AgentOps to normal users | Owner-only product |
| Do not skip data model approval | Schema churn and wrong RLS |
| Do not merge AgentOps with finance local-glass fix batch | Separate prompts |

---

## Mapping to NEXT_PHASES.md

| Implementation stage | Phase 13 subphase |
| --- | --- |
| 1 | 13B (complete) |
| 1B | 13B (complete — Hermes discovery) |
| 2 | 13C (SQL/RLS **plan** — current) |
| 2B | 13C (apply SQL/RLS) |
| 3 | 13D |
| 4 | 13E |
| 5 | 13F |
| 6 | 13G |
| 7 | (supports 13D/E) |
| 8 | 13H |
| 9A | 13I (Hermes adapter plan) |
| 9 | 13I (Hermes integration) |
| 10 | 13J |
| 11 | 13K |
| 12 | 13K + council automation |

---

## Suggested Next Prompt (After This Doc)

**For implementation (Stage 2 — current):**  
*“Create AgentOps Stage 2 SQL/RLS **implementation plan** only: document migration outline, table definitions, indexes, and Owner-only RLS policies per `AGENTOPS_DATA_MODEL_SPEC.md` and approved checklist. Database-only MVP memory. No migration files applied to Supabase, no UI, no API routes, no cron, no Hermes automation.”*

**After Stage 2 plan is reviewed:**  
*“Implement AgentOps Stage 2B: Supabase schema + Owner-only RLS per approved SQL/RLS plan. No UI, no API routes, no cron, no Hermes automation.”*

---

## Out of Scope (All Stages Unless Explicit)

- Finance local-glass page fixes  
- App feature work unrelated to AgentOps  
- Personal AI memory product implementation  
- SaaS billing  
- Real MCP tool servers  
