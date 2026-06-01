# AgentOps Data Model Approval Checklist

## Purpose

This checklist must be **reviewed and approved by Piter** before creating any:

- Supabase tables or migrations  
- RLS policies  
- API routes or Edge Functions  
- AgentOps UI writes  
- Scheduled runners that persist findings  

Until approval, only documentation and read-only static QA may proceed.

**Source spec:** `AGENTOPS_DATA_MODEL_SPEC.md`

---

## Proposed Tables / Entities

### 1. `agentops_runs`

| Item | Detail |
| --- | --- |
| **Purpose** | One row per daily, manual, pre-release, focused, retest, or verification orchestration run. |
| **Must-have fields** | `run_type`, `environment`, `started_at`, `finished_at`, `status`, `focus_directive_snapshot`, `active_queue_count_before`, `active_queue_open_slots`, `promoted_count`, `verified_fixed_count`, `summary` |
| **Why needed** | Audit trail, run history UI, slot accounting per run. |
| **MVP** | **Required** |

---

### 2. `agentops_findings`

| Item | Detail |
| --- | --- |
| **Purpose** | Every issue or improvement (active, backlog, archived). |
| **Must-have fields** | `issue_code`, `title`, `category`, `severity`, `status`, `queue_state`, `top10_rank`, `route`, `module`, `agent_id`, `problem`, `expected_result`, `actual_result`, `cursor_prompt`, `priority_score` |
| **Why needed** | Core of Active Top 10, backlog, and detail UI. |
| **MVP** | **Required** |

---

### 3. `agentops_agent_opinions`

| Item | Detail |
| --- | --- |
| **Purpose** | Per-agent council position on a finding. |
| **Must-have fields** | `finding_id`, `agent_id`, `position`, `reason`, `confidence_score` |
| **Why needed** | Transparency, multi-agent review, Chair synthesis. |
| **MVP** | **Required** (can start with Chair + Synthetic User QA only in UI if opinions are sparse at first) |

---

### 4. `agentops_owner_feedback`

| Item | Detail |
| --- | --- |
| **Purpose** | Piter remarks, approve/reject/defer, mark fixed, focus instructions. |
| **Must-have fields** | `finding_id`, `owner_user_id`, `feedback_type`, `remark`, `created_at` |
| **Why needed** | Owner loop, verification trigger, audit. |
| **MVP** | **Required** |

---

### 5. `agentops_focus_directives`

| Item | Detail |
| --- | --- |
| **Purpose** | Instructions that steer future runs (module ignore, priority weights). |
| **Must-have fields** | `directive_text`, `module_focus`, `ignored_areas`, `priority_weight`, `active_from`, `status` |
| **Why needed** | “Do not focus HR yet” style rules without code changes. |
| **MVP** | **Required** |

---

### 6. `agentops_agent_memory`

| Item | Detail |
| --- | --- |
| **Purpose** | Long-term patterns (false positive, approved prompt style, rejection). |
| **Must-have fields** | `agent_id`, `memory_type`, `memory_text`, `active`, `source_finding_id` |
| **Why needed** | Hermes integration, fewer repeat false positives. |
| **MVP** | **Schema now; light use until Stage 9** (see recommendation below) |

---

### 7. `agentops_prompt_library`

| Item | Detail |
| --- | --- |
| **Purpose** | Versioned Cursor/Hermes prompts per finding. |
| **Must-have fields** | `finding_id`, `prompt_type`, `prompt_text`, `approved_by_owner`, `result_status` |
| **Why needed** | Copy prompt UI, track approved/used prompts. |
| **MVP** | **Required** |

---

### 8. `agentops_evidence_files`

| Item | Detail |
| --- | --- |
| **Purpose** | Screenshots, logs, JSON/markdown report refs, CodeGraph notes. |
| **Must-have fields** | `finding_id`, `evidence_type`, `file_path`, `summary` |
| **Why needed** | Browser QA proof, verification before/after. |
| **MVP** | **Required** |

---

### 9. `agentops_verifications`

| Item | Detail |
| --- | --- |
| **Purpose** | Targeted retest after Mark Fixed. |
| **Must-have fields** | `finding_id`, `verification_status`, `route_retested`, `expected_fix`, `actual_result`, `follow_up_prompt`, `verified_at` |
| **Why needed** | Enforce verify-before-close; free queue slots. |
| **MVP** | **Required** |

---

### 10. `agentops_backlog_promotions`

| Item | Detail |
| --- | --- |
| **Purpose** | Audit when a finding enters Active Top 10. |
| **Must-have fields** | `finding_id`, `run_id`, `promoted_from`, `queue_slot_number`, `created_at` |
| **Why needed** | Explain why item entered queue; debugging promotion logic. |
| **MVP** | **Required** |

---

## MVP Required Tables

**Recommended MVP set (all 10 tables):**

1. `agentops_runs`  
2. `agentops_findings`  
3. `agentops_agent_opinions`  
4. `agentops_owner_feedback`  
5. `agentops_focus_directives`  
6. `agentops_agent_memory`  
7. `agentops_prompt_library`  
8. `agentops_evidence_files`  
9. `agentops_verifications`  
10. `agentops_backlog_promotions`  

### `agentops_agent_memory` recommendation

| Option | Recommendation |
| --- | --- |
| Include in MVP schema? | **Yes — create table now** |
| Use in MVP product behavior? | **Lightly** — database records are the **primary memory store** for MVP; Hermes is not app-callable yet (`AGENTOPS_HERMES_CONNECTION_DISCOVERY.md`) |
| Hermes readiness in UI? | **Yes** — initial meter: **8/100**, **Learning**, **Database-only** (see Q8 approved answer) |
| System of record | **AgentOps database** remains durable even when Hermes becomes the primary memory-support layer later |
| Why include early? | Avoids migration churn when Hermes integration lands; nullable/low row count at first |

**Phase 2 alternative (not recommended):** Omit `agentops_agent_memory` until Hermes — would require a follow-up migration.

---

## Owner-Only Access Rule

Confirm:

- [ ] All AgentOps tables are **Owner-only by default** (platform owner / designated owner user id).  
- [ ] No employee, finance user, or tenant admin can read or write AgentOps findings in MVP.  
- [ ] Personal User AI has **no** SQL or API path to AgentOps tables.  

---

## RLS Requirements

Before implementation, confirm policies will enforce:

| Requirement | Detail |
| --- | --- |
| Authenticated only | No anon access to AgentOps tables |
| Platform owner role | `SELECT`/`INSERT`/`UPDATE` for owner (and system runner service role if used) |
| No normal employee | Deny by default |
| No Personal User AI | No shared views exposed to personal-ai contexts |
| No tenant user | Deny cross-tenant reads of global AgentOps |
| Attributable writes | `owner_user_id` on feedback; runs record `triggered_by` |
| Future admin read-only | Separate policy name, off by default until Piter approves |
| Service runner | Optional `agentops_runner` claim for automated inserts only (no Owner UI bypass) |

---

## Queue Rules to Enforce (Application + DB)

| Rule | Enforcement |
| --- | --- |
| Max **10** active Top 10 open issues | Service layer + partial unique index on `top10_rank` where `queue_state = active_top_10` |
| Backlog may grow unbounded | No cap on `queue_state = backlog` |
| Slot opens on Verified Fixed, Rejected, Deferred, False Positive (policy) | Status transition service |
| Next run promotes **only** `open_slots` count | Run logic in `AGENTOPS_DAILY_WORKFLOW.md` |
| Do not add 10 new items when 10 active exist | Hard check before promotion |

---

## Verification Rules to Enforce

| Rule | Behavior |
| --- | --- |
| Mark Fixed does **not** close the issue | Status → `Marked Fixed by Piter`; remains in Active Top 10 |
| Mark Fixed creates verification requirement | Row in `agentops_verifications` or status `Verification Running` |
| Leaves active queue only after **Verified Fixed** (or explicit manual override policy — default: no override) | Slot freed |
| **Still Broken** | Stays active; `follow_up_prompt` required |
| **Needs Follow-Up Fix** | Original may close; linked finding optional |
| **Verification Blocked** | Stays active; document blocker |

---

## Open Questions for Piter

**Status:** Approved 2026-05-27 (see `AGENTOPS_MVP_DECISION_RECORD.md`).

| # | Question | Approved answer |
| --- | --- | --- |
| 1 | Should AgentOps be visible **only to Piter**, or also to **admin** users later? | **Owner-only for MVP.** Later admin visibility requires explicit permission and separate policies. |
| 2 | Should production AgentOps runs be **read-only only**? | **Yes.** Production runs are read-only only by default. Any create/edit/archive/delete/write workflow testing must run only in local/staging/preview/test environments. |
| 3 | Should `agentops_agent_memory` be in MVP schema immediately? | **Yes** — include in MVP schema, use lightly. Since Hermes is not app-callable yet, **database records are the primary memory store** for MVP. Hermes integration is future. |
| 4 | Should evidence files use **repo paths** first or **Supabase Storage** URLs? | **Store file paths/report references first.** Supabase Storage references can be added later. |
| 5 | Should first UI use **database only**, or allow **JSON import** from existing reports? | **Database is the main source** for AgentOps UI. JSON report import can be added later. |
| 6 | Should Active Top 10 include **improvements** only after Critical/High/Medium backlog for current focus is empty? | **Critical/High/Medium issues take priority.** Improvement suggestions enter Active Top 10 only when there are open slots or when Piter explicitly prioritizes improvements. |
| 7 | Should **weekend quiet mode** be automatic or only via focus directive? | **Default is refill-only.** If 10 active issues are open, do not add more. If slots open, refill only the number of open slots. |
| 8 | Should Hermes readiness status be included in the MVP UI? | **Yes.** MVP UI displays Hermes Memory Support Meter with initial status: **Score 8/100**, **Label Learning**, **Mode Database-only**. Reason: Hermes is Cursor-only/project-tooling only and not app-callable today. |

---

## Approval Section

Piter approval:

- [x] **Piter approved table list** (all 10 entities or noted exceptions)  
- [x] **Piter approved Owner-only access**  
- [x] **Piter approved Active Top 10 queue rule**  
- [x] **Piter approved verification-before-close rule**  
- [x] **Piter approved MVP scope** (including memory table strategy)  
- [x] **Piter approved Hermes readiness meter in AgentOps UI**  
- [x] **Piter confirmed Hermes connection check must happen before live Hermes-dependent automation**  
- [ ] **Piter approved next step:** actual SQL/RLS implementation (migration files applied to Supabase)  
- [x] **Piter approved next step:** SQL/RLS **implementation planning** (Stage 2 plan document only; no migration until explicit approval)  

**Approved by:** Piter  
**Date:** 2026-05-27  
**Notes / exceptions:** Hermes discovery complete — database-only MVP; see `AGENTOPS_MVP_DECISION_RECORD.md`.  

---

## After Approval

Proceed only to:

1. `AGENTOPS_IMPLEMENTATION_SEQUENCE.md` — **Stage 2** (AgentOps SQL/RLS **implementation plan** — documentation only until Piter approves actual SQL)  
2. **Stage 9A** (Hermes adapter plan — documentation) before live Hermes runtime integration  
3. One implementation prompt per stage — no combined SQL+UI+cron prompt  

Do **not** implement finance local-glass fixes as part of AgentOps schema work unless explicitly scoped in a separate prompt.
