# AgentOps Hermes Connection Checklist

## Purpose

Before AgentOps **SQL/RLS**, **UI writes**, or **automation** relies on Hermes for memory and focus, confirm that Hermes is **connected** and can **support** the AgentOps system.

This checklist is **documentation and confirmation only** until implementation tasks explicitly wire Hermes.

**Companion specs:** `AGENTOPS_HERMES_READINESS_SPEC.md`, `AGENTOPS_HERMES_CODEGRAPH_SPEC.md`, `AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md`, `AGENTOPS_HERMES_CONNECTION_DISCOVERY.md`

---

## Discovery Result

**Status:** Cursor-Only / Project-Tooling Only

| Field | Value |
| --- | --- |
| **Current Hermes readiness** | **8 / 100** |
| **Label** | **Learning** |
| **Current MVP memory mode** | **Database-only** |

**Findings:**

- Hermes exists as project/tooling context (`.hermes.md`, analytics CLI scripts), **not** as an app/backend service.  
- CodeGraph exists as Cursor MCP/project tooling (`.cursor/mcp.json`), **not** as an app/backend service.  
- AiXia app **cannot** call Hermes directly today.  
- AiXia app **cannot** call CodeGraph directly today.  
- AgentOps **must not** depend on Hermes for MVP automation.  
- AgentOps database remains the **durable system of record**.  

Full evidence: `AGENTOPS_HERMES_CONNECTION_DISCOVERY.md`

---

## Required Checks

### 1. Hermes availability

- [ ] Confirm Hermes is installed/implemented in the project.  
- [ ] Confirm where Hermes configuration lives (paths, env, docs).  
- [ ] Confirm how AgentOps can call or communicate with Hermes (app API, Edge Function, Cursor tooling, external service).  
- [ ] Confirm whether Hermes is **local**, **server-side**, **external**, or integrated through **Cursor/project tooling** only.  

**Notes field:**

| Item | Answer |
| --- | --- |
| Hermes location in repo/project | `.hermes.md`; `scripts/query-analytics-for-hermes.mjs`; `scripts/export-analytics-for-hermes.mjs` |
| Callable from AiXia app at runtime? Yes / No / Partial | **No** |
| Callable from qa-agent scripts? Yes / No | **Partial** — analytics scripts only; no AgentOps memory |

---

### 2. Hermes memory capability

- [ ] Confirm Hermes can store owner remarks (or equivalent structured memory).  
- [ ] Confirm Hermes can retrieve previous owner remarks.  
- [ ] Confirm Hermes can remember false-positive patterns.  
- [ ] Confirm Hermes can remember approved prompt patterns.  
- [ ] Confirm Hermes can remember current sprint/focus directives.  

---

### 3. Hermes AgentOps boundary

- [ ] Confirm Hermes AgentOps memory is **Owner-only**.  
- [ ] Confirm **Personal User AI** cannot access Owner AgentOps memory.  
- [ ] Confirm **tenant/company users** cannot access global AgentOps memory.  
- [ ] Confirm Hermes **cannot** bypass permissions, RLS, or owner-only policies.  

---

### 4. Hermes focus directive capability

- [ ] Confirm Hermes can convert Piter remarks into **focus directives** (or drafts for DB insert).  
- [ ] Confirm directives can influence future agent **ranking**.  
- [ ] Confirm directives can be **disabled/deleted** by Piter.  

---

### 5. Hermes fallback behavior

- [ ] Confirm AgentOps can run **without** Hermes using **database-only** memory.  
- [ ] Confirm runs/reports can be marked **`memory-limited`** when Hermes is unavailable.  
- [ ] Confirm owner feedback is **never dropped** when Hermes fails.  

---

### 6. Hermes score readiness

- [ ] Confirm the system can calculate or **manually set** Hermes readiness score at MVP (0–100).  
- [ ] Confirm UI can display **score**, **label**, and **last check** status (per `AGENTOPS_HERMES_READINESS_SPEC.md`).  
- [ ] Confirm **memory mode** enum can be shown (Database-only / Hermes-assisted / Hermes-primary).  

---

## MVP Decision

Before **live** Hermes integration is implemented:

| Layer | Role |
| --- | --- |
| **AgentOps database** | Durable **system of record** (findings, feedback, focus directives, verifications) |
| **Hermes** | Memory-support layer; may become primary for focus/ranking over time |
| **UI** | Must show Hermes state even if first version is manual |

Hermes UI labels (from meter):

- Not connected (optional pre-score state)  
- Learning (0–20)  
- Small Help (21–40)  
- Helping (41–60)  
- Main Memory Source / Strong Support (61–80)  
- Full AgentOps Memory Support (81–100)  

---

## Open Questions

Answer before marking connection approved:

| # | Question |
| --- | --- |
| 1 | Where is Hermes implemented in the project? |
| 2 | Is Hermes callable from the **app/backend**, or only from **Cursor/project tooling**? |
| 3 | Does Hermes already have **persistent memory** storage? Where? |
| 4 | Can Hermes write **structured focus directives** into the AgentOps database later? |
| 5 | Should Hermes readiness score be **manually set** at first or **calculated automatically**? |
| 6 | Who can see Hermes status in the UI? **Recommended: Owner only.** |

---

## Approval

Piter approval:

- [x] **Piter confirmed Hermes is connected** for Cursor/project tooling (`.hermes.md` + analytics scripts).  
- [x] **Piter confirmed Hermes can support AgentOps memory** in future via adapter; **not** for MVP live automation.  
- [x] **Piter approved Hermes Memory Support Meter** (0–100 + labels).  
- [x] **Piter approved database-first fallback** if Hermes is unavailable.  
- [x] **Piter approved Owner-only Hermes AgentOps memory.**  
- [x] **Piter confirmed Hermes connection check must complete before live Hermes-dependent automation** (ranking automation, auto focus from remarks, etc.).  

**Blocked until app-callable Hermes exists (do not block SQL/RLS planning):**

- [ ] **Piter confirmed Hermes is app-callable.**  
- [ ] **Piter confirmed Hermes can support live AgentOps memory automation.**  

These unchecked items block **live Hermes-dependent automation**, but they **do not** block database-first AgentOps SQL/RLS **planning**.

**Approved by:** Piter  
**Date:** 2026-05-27  
**Hermes implementation notes:** MVP uses database-only memory; initial UI meter 8/100 Learning.  

---

## Relationship to Other Gates

| Gate | Can proceed in parallel? |
| --- | --- |
| Data model approval (`AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md`) | **Yes** |
| Supabase SQL/RLS (Stage 2) | **Yes** — DB does not require Hermes |
| UI shell with **read-only** Hermes meter (manual score OK) | **Yes** — after data model |
| Daily scheduler with **Hermes-required** ranking | **No** — after this checklist + Stage 9 |
