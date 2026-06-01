# AgentOps Hermes Readiness Specification

## Purpose

**Hermes** is expected to support AgentOps **memory**, **focus directives**, **repeated issue tracking**, **prompt style learning**, and **agent coordination**. Before AgentOps automation or daily runs **depend** on Hermes, the system must show whether Hermes is **connected** and how much memory support it is currently providing.

The **AgentOps database** remains the **durable system of record** even when Hermes becomes the primary memory-support layer.

**Related:** `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md`, `AGENTOPS_UI_SPEC.md`, `AGENTOPS_HERMES_CODEGRAPH_SPEC.md`

---

## Hermes Memory Support Meter

A single score from **0 to 100** displayed in the AgentOps UI (Command Hero and Hermes Status Panel).

### Score ranges

| Score | Label | Meaning |
| --- | --- | --- |
| **0–20** | **Learning** | Hermes is connected or partially connected but only collecting basic context. It is **not** yet reliable as the main memory source. |
| **20–40** | **Small Help** | Hermes can provide small memory assistance (a few owner remarks, some false-positive memory) but is **not** yet the main planning/memory layer. |
| **40–60** | **Helping** | Hermes actively helps with focus, repeated issues, and prompt style, but AgentOps **still needs** stored database records as backup. |
| **60–80** | **Main Memory Source / Strong Support** | Hermes is the **main memory-support source** for focus, prioritization, and repeated patterns. The AgentOps database remains the durable system of record. |
| **80–100** | **Full AgentOps Memory Support** | Hermes fully supports AgentOps agents with memory, owner preferences, focus directives, rejection patterns, approved patterns, prompt style, and repeated issue tracking. Hermes still does **not** bypass permissions, owner approval, RLS, or the database system of record. |

### Label helper (UI)

Map score to label:

```text
0–20   → Learning
21–40  → Small Help
41–60  → Helping
61–80  → Main Memory Source / Strong Support
81–100 → Full AgentOps Memory Support
```

---

## Important Safety Wording

| Correct | Incorrect |
| --- | --- |
| Hermes **fully supports** AgentOps memory and agent focus. | Hermes is in **full control** of the system. |
| Hermes is the **main memory-support layer** for AgentOps. | Hermes **controls** AiXia or the website. |
| Hermes **assists** ranking and coordination. | Hermes **replaces** Owner approval or the Active Top 10 rules. |

---

## Meter Inputs (Future Calculation)

The score should eventually be calculated from:

| Input | Weight toward readiness |
| --- | --- |
| Hermes connection status | Required gate |
| Hermes can read AgentOps context | Yes/No |
| Hermes can store/retrieve owner remarks | Yes/No |
| Hermes can generate focus directives from Piter remarks | Yes/No |
| Hermes can remember rejected/false-positive patterns | Yes/No |
| Hermes can remember approved prompt styles | Yes/No |
| Hermes can support repeated issue detection | Yes/No |
| Hermes can support daily ranking | Yes/No |
| Hermes can support verification feedback memory | Yes/No |
| Hermes can recover or fail gracefully | Yes/No |
| Hermes respects Owner-only memory boundaries | Yes/No |

---

## Suggested Scoring Components (100 Points)

| Component | Points | Pass criteria (example) |
| --- | ---: | --- |
| Connection available | 10 | Health check succeeds |
| Read AgentOps context | 10 | Can load active queue summary + focus snapshot |
| Write/retrieve owner remarks memory | 15 | Round-trip remark test |
| Generate focus directives | 15 | Remark → structured directive draft |
| Remember false-positive/rejected patterns | 10 | Similar finding deprioritized in test |
| Remember approved prompt styles | 10 | Prompt template reused in test |
| Support ranking/prioritization | 10 | Score adjustment applied in test run |
| Support verification learning | 10 | Verification outcome stored/recalled |
| Owner-only boundary confirmed | 10 | Personal/tenant isolation test passes |

**Total: 100 points.**

### MVP scoring modes

| Mode | When |
| --- | --- |
| **Manual** | Piter or operator sets score + label until automated checks exist |
| **Semi-automatic** | Connection checklist items auto-score; memory features manual |
| **Automatic** | Full component scoring after Hermes integration (Stage 9) |

---

## Memory Mode (UI Enum)

Display alongside the meter:

| Mode | When |
| --- | --- |
| **Database-only** | Hermes unavailable or score 0–20; all focus from `agentops_focus_directives` + DB memory tables |
| **Hermes-assisted** | Score 21–60; Hermes supplements DB |
| **Hermes-primary with database system of record** | Score 61–100; Hermes leads memory/focus; DB still authoritative for findings, feedback, audit |

---

## UI Display

The AgentOps UI must show (see `AGENTOPS_UI_SPEC.md`):

| Element | Description |
| --- | --- |
| Hermes status label | One of five labels above |
| Hermes score | 0–100 (integer or one decimal) |
| Last memory sync | When Hermes last read/wrote AgentOps memory context |
| Last successful Hermes check | When health/score job last passed |
| Hermes unavailable warning | Banner if connection failed |
| Memory mode | Database-only / Hermes-assisted / Hermes-primary |
| Help text | Bullet list of what Hermes is **currently** helping with (e.g. “focus directives”, “false-positive patterns”) |

**Visual:** Use `AixiaMetricCard` or dedicated meter component in shared AiXia layer—do not invent page-local gauge CSS on first implementation.

---

## Failure Modes

When Hermes is **unavailable** or **not yet confirmed**:

| Behavior | Requirement |
| --- | --- |
| AgentOps continues | Using database records only |
| UI status | “Unavailable” or “Learning” (score 0–20) |
| Critical QA | **Not blocked** — browser/static findings still work |
| Runs | Tagged `memory-limited` in run summary |
| Owner feedback | **Never lost** — always written to `agentops_owner_feedback` and `agentops_focus_directives` |
| Automation | Must **not** require Hermes for promotion or verification |

---

## Boundaries

| Rule | Detail |
| --- | --- |
| Hermes AgentOps memory | **Owner-only** |
| Personal User AI | **Cannot** access Hermes AgentOps memory |
| Tenant users | **Cannot** access Hermes AgentOps memory |
| Permissions / RLS | Hermes memory **cannot override** |
| Owner approval | Hermes **cannot** auto-approve findings or prompts |
| Database | Durable **system of record** for findings, feedback, verifications, audit |

---

## Gates Before Dependency

AgentOps must **not** treat Hermes as required until:

1. `AGENTOPS_HERMES_CONNECTION_CHECKLIST.md` is completed by Piter  
2. MVP UI can display score + label (even if manual at first)  
3. Daily workflow documents Hermes check + fallback (see `AGENTOPS_DAILY_WORKFLOW.md`)  

SQL/RLS implementation may proceed in parallel with Hermes **confirmation** docs, but **live Hermes-dependent automation** waits for Stage 9 in `AGENTOPS_IMPLEMENTATION_SEQUENCE.md`.

---

## Future Data Model Note (Not Approved Yet)

A future optional table `agentops_hermes_readiness` may store:

- `score`, `label`, `memory_mode`, `last_check_at`, `last_sync_at`, `check_result_json`, `limitations_text`

Include in a later schema revision only if Piter approves—**not** part of initial SQL until checklist + product spec explicitly add it.
