# AgentOps Feedback and Memory

## Purpose

Define how Piter’s remarks and decisions become **Hermes memory** and **focus directives** that steer future AgentOps runs—without implementing storage or UI in this phase.

---

## Hermes Unavailable Fallback

If Hermes is **unavailable** or not yet connected:

| Rule | Behavior |
| --- | --- |
| Owner feedback | Always stored in **AgentOps database** (`agentops_owner_feedback`, `agentops_focus_directives`) |
| Focus for next run | Applied as **database focus directives** until Hermes is available |
| Hermes memory rows | Optional `agentops_agent_memory` may still be written manually or by import; not required for MVP |
| Runs | Marked **memory-limited**; ranking uses DB directives + stored scores only |
| Never drop feedback | Remarks and approvals must persist even when Hermes health check fails |

When Hermes reconnects, sync DB directives into Hermes memory without overwriting Owner-approved DB state without explicit merge rules (Stage 9).

---

## Feedback Types

| Type | Owner intent | Typical finding status change |
| --- | --- | --- |
| `remark` | Note only; no status change | Owner Reviewed |
| `approve` | Agree issue is real; approve fix scope/prompt | Approved for Fix |
| `reject` | Not valid or won’t fix | Rejected |
| `defer` | Valid but later | Deferred |
| `priority_change` | Boost or lower rank | Updated `piter_priority_override` |
| `scope_change` | Narrow/widen fix scope | Approved for Fix + prompt revision |
| `false_positive` | Not a real issue | False Positive |
| `focus_instruction` | Steer future runs globally | Creates focus directive |
| `mark_in_progress` | Work started | In Progress |
| `mark_fixed` | Believes fix done | Marked Fixed by Piter → verification |
| `request_retest` | Ask for new evidence | triggers retest run slice |
| `re_review_request` | Council should reconsider | Owner Reviewed + new opinions |

---

## How Feedback Changes Future Runs

### Example 1 — Module deprioritization

**Piter says:** “Do not focus on HR yet.”

**System actions:**

1. Create focus directive:  
   - `ignored_areas`: `['hr', 'hr-future']`  
   - `severity_focus`: only promote HR if `critical` (security)  
2. Hermes memory:  
   - `memory_type`: `module_priority`  
   - `memory_text`: “Deprioritize HR standardization debt unless critical security.”  
3. Next run: HR medium/low findings stay backlog; HR critical still visible.

---

### Example 2 — Design-system priority

**Piter says:** “UI consistency is more important.”

**System actions:**

1. Focus directive `priority_weight`: `{ "Design": 1.5, "improvement_design": 1.2 }`  
2. Memory: `preference` — “Prefer shared AiXia source-of-truth fixes.”  
3. Design & UX + Design System agents get higher vote weight in Chair ranking.

---

### Example 3 — False positive

**Piter says:** “This is not a problem.”

**System actions:**

1. Finding → `False Positive`  
2. Memory: `false_positive_pattern` — e.g. “FlowConnector arrow on transactions hub is not glass-card drift.”  
3. Future similar static/browser fingerprints penalized in score.

---

### Example 4 — Approved prompt

**Piter approves** a Cursor prompt structure.

**System actions:**

1. `agentops_prompt_library.approved_by_owner = true`  
2. Memory: `approved_pattern` / `prompt_style` — store template sections (read-first docs, non-changes block).  
3. Chair reuses structure for similar categories.

---

### Example 5 — Mark fixed

**Piter marks fixed.**

**System actions:**

1. Status → `Marked Fixed by Piter`  
2. Queue **remains** Active Top 10 until verification completes  
3. Trigger `verification` run (async or inline)  
4. On `Verified Fixed` only: free slot + optional promotion on next daily run  

---

## Memory Types

| Memory type | Use |
| --- | --- |
| `owner preference` | General taste and workflow preferences |
| `module priority` | finance-first, defer HR, etc. |
| `rejected pattern` | “Don’t file X again” |
| `approved pattern` | “This kind of issue is valuable” |
| `false_positive_pattern` | Scanner/browser fingerprint to ignore |
| `prompt_style` | Headings, required read-first files |
| `implementation_rule` | “Always fix shared CSS first” |
| `focus_rule` | Duplicate of directive for fast lookup |
| `current sprint priority` | Time-boxed focus text |
| `verification_pattern` | “After glass fix, check modal in browser” |

Stored in `agentops_agent_memory` with `agent_id` = specific agent or `owner-coordinator`.

---

## Memory Safety

| Rule | Requirement |
| --- | --- |
| Access | **Owner-only**; no Personal User AI read |
| Tenants | No global AgentOps memory exposed to company users |
| Editability | Piter can disable/delete any memory entry in UI |
| Security override | Memory **cannot** suppress Critical security/tenant findings |
| Critical visibility | Critical issues always eligible for Top 10 regardless of “ignore HR” style directives unless explicitly “security-only mode” (future, dangerous—Owner only) |
| PII | Memory text must not store customer/employee PII from evidence |
| Audit | `source_finding_id` / `source_feedback_id` on each memory row |

---

## Agent Focus Rules

Owner (via Main Owner AI or AgentOps UI) can focus runs by:

| Dimension | Example |
| --- | --- |
| Module | `finance-current` only |
| Route group | `/finance/transactions/**` |
| Category | Design + Functional only |
| Severity | minimum `medium` |
| Agent | elevate Synthetic User QA weight |
| Time window | focus until end of sprint |
| Ignored areas | `ai-future`, `saas-future` |
| Current sprint | “Finance hub polish week” |

Encoded in `agentops_focus_directives` and mirrored in Hermes.

---

## Focus Directive Lifecycle

1. Created from `focus_instruction` feedback or Owner AI chat (future).  
2. `status = active` between `active_from` and `active_until`.  
3. Included in run `focus_directive_snapshot`.  
4. Owner can **pause** or **disable** without deleting history.  
5. Expired directives remain for audit but don’t affect scoring.

---

## Required UI Controls (Future)

Piter needs in AgentOps UI:

- Add remark  
- Approve prompt / finding  
- Reject finding  
- Mark false positive  
- Defer  
- Change priority  
- Mark in progress  
- Mark fixed  
- Run verification  
- Create focus directive (manual form)  
- Disable focus directive  
- Delete memory entry  
- Ask agents to re-review  

See `AGENTOPS_UI_SPEC.md`.

---

## Hermes Integration (Conceptual)

| Operation | Hermes responsibility |
| --- | --- |
| Parse remark | NLP/structured extraction → directive fields |
| Merge memories | Resolve conflicts (newer Owner instruction wins) |
| Prompt for run | Inject active memories into agent system prompts |
| Explainability | “Ranked lower because you rejected similar item AOPS-…” |

Hermes **AgentOps memory** is a separate namespace from Personal User memory (`qa-agent/personal-ai-memory-and-tools.md`).

---

## Conflict Resolution

When memories conflict:

1. Explicit **focus directive** beats implicit memory.  
2. Newer **Owner feedback** beats older memory.  
3. **Security-critical** findings ignore “defer module” unless directive explicitly allows only security exceptions (default: security always on).  
4. Chair logs conflict resolution in run summary.

---

## Feedback → Memory Mapping Table

| feedback_type | Creates memory? | Creates directive? |
| --- | --- | --- |
| remark | optional if pattern detected | rare |
| approve | approved_pattern | no |
| reject | rejection_pattern | optional ignore |
| false_positive | false_positive_pattern | optional |
| focus_instruction | focus_rule | yes |
| priority_change | module_priority | optional weight |
| mark_fixed | verification_pattern | no |

---

## Testing Memory (Future QA)

When implementing:

- Unit test: false positive memory reduces score of duplicate candidate  
- Unit test: full queue blocks promotion  
- Unit test: 5 verified fixes → max 5 promotions  

---

## Related Documents

- `AGENTOPS_DATA_MODEL_SPEC.md` — tables  
- `AGENTOPS_DAILY_WORKFLOW.md` — when memory applies  
- `AGENTOPS_HERMES_CODEGRAPH_SPEC.md` — Hermes role  
