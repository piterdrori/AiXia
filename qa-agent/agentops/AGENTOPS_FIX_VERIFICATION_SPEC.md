# AgentOps Fix Verification Specification

## Goal

After Piter marks an issue **fixed**, AgentOps must **verify** the fix with targeted evidence before removing the item from the **Active Top 10** and opening a promotion slot. Verification prevents the queue from clearing based on intent alone.

---

## Triggers

| Trigger | Source |
| --- | --- |
| **Mark Fixed** | Owner feedback `mark_fixed` |
| **Run Verification** | Owner feedback `request_retest` or UI button |

Both enqueue a `verification` run type linked to the finding.

---

## Verification Types

| Type | When used |
| --- | --- |
| **Browser verification** | UI, layout, workflow, modal, permission visibility |
| **Static verification** | Design-system guardrails, lint on touched files (read-only scan) |
| **Build/check verification** | `npm run build`, typecheck failures |
| **Permission verification** | Multi-role browser pass |
| **Combined verification** | Complex issues (UI + logic + permissions) |

Chair selects minimal type(s) per finding `category` and `recommended_fix_strategy`.

---

## Verification Steps

For each marked-fixed issue:

1. **Load original finding** — problem, expected, actual, severity, route.  
2. **Load original evidence** — screenshots, steps, console/network.  
3. **Load expected fix** — from approved prompt, Owner remark, or `expected_fix` field.  
4. **Select verification plan** — smallest targeted check set.  
5. **Execute checks** in configured environment (prefer same as original finding).  
6. **Capture new evidence** — after screenshots, logs.  
7. **Compare** expected vs actual.  
8. **Non-regression pass** — quick smoke on same route.  
9. **Write** `agentops_verifications` row + update finding status.  
10. **Notify UI** — verification panel update.  

---

## Result Types

| Result | Meaning |
| --- | --- |
| **Verified Fixed** | Original issue resolved; acceptable regression check |
| **Still Broken** | Original issue reproduces |
| **Needs Follow-Up Fix** | Primary issue fixed; related defect remains |
| **Verification Blocked** | Cannot complete (login, data, env, permission) |

---

## Verified Fixed

**Criteria:**

- Original reproduction steps no longer show the defect  
- Expected visual/behavior present  
- No new Critical/High regression on same route  

**Actions:**

- Finding status → `Verified Fixed`  
- `queue_state` → `archived` or removed from active (policy: archive after 7 days)  
- **Free one Top 10 slot** (`active_queue_open_slots += 1`)  
- Log verification evidence  
- Optional: auto-promote one backlog item on **next daily run** (not instant unless Owner setting)  
- Generate short success note for Owner UI  

---

## Still Broken

**Criteria:**

- Same actual_result as original (or materially same)  

**Actions:**

- Finding stays **Active Top 10** (same rank if possible)  
- Status → `Still Broken` then back to `Active Top 10` or `In Progress`  
- Generate **`follow_up_prompt`** explaining what remains wrong with new evidence refs  
- Increment `still_broken_count` on run  
- Hermes memory: optional `verification_pattern` if repeat failure (flaky fix quality)  

---

## Needs Follow-Up Fix

**Criteria:**

- Original symptom fixed  
- Related issue discovered (regression or adjacent defect)  

**Actions:**

- Original finding: `Verified Fixed` **or** remain active with linked child—**default:** close original if primary acceptance criteria met, spawn **linked finding** for follow-up  
- Child finding references parent `issue_code`  
- Follow-up prompt generated  
- Owner decides in UI whether to keep slot on parent or child  

---

## Verification Blocked

**Criteria examples:**

- Cannot log in as required role  
- Staging data missing  
- Route behind feature flag off  
- Browser automation unavailable  
- Owner marked fixed but no deploy to tested environment  

**Actions:**

- Status → `Verification Blocked`  
- Issue **remains active** (slot not freed)  
- Document blocker in verification panel  
- Owner may: change environment, provide data, or manually confirm override (future dangerous—discouraged)  

---

## Non-Regression Check

Every verification run must check:

| Check | Method |
| --- | --- |
| No new console errors | Browser console capture on route |
| No broken route / blank page | Navigation + snapshot |
| No obvious layout break | Screenshot compare (manual/agent) |
| No lost primary action | Button/modal still reachable |
| No permission regression | Quick wrong-role spot check if applicable |
| Silent refresh | No empty table flash (if original area is registry) |

Failures → **Still Broken** or **Needs Follow-Up Fix**, not Verified Fixed.

---

## Browser Verification Detail

Reuse `AGENTOPS_BROWSER_QA_SPEC.md`:

- Same `user_role` unless issue was role-specific  
- Same viewport ± one mobile check for design issues  
- Re-run numbered steps from finding  
- Attach before/after screenshots  

For design-system fixes: confirm shared class/component present in DOM (e.g. `aixia-display-block`, `aixia-workspace-card-preview-row`).

---

## Static Verification Detail

For source-only fixes (no browser required):

- Re-run targeted guardrail rule on file list from CodeGraph  
- Confirm rule no longer flags (or classification improved)  

Static pass **alone** is insufficient for workflow/functional categories.

---

## Build Verification Detail

When finding category is Technical or build-related:

- Run `npm run build` (or CI artifact check)  
- Store log excerpt as evidence  
- Failure → Still Broken  

---

## Permission Verification Detail

For Security/Permission category:

- Visit route as **allowed** role — should work  
- Visit as **denied** role — should not expose action/data  
- Document both in verification evidence  

---

## Slot Accounting

| Event | Slot change |
| --- | --- |
| Mark Fixed | **No** slot freed yet |
| Verified Fixed | +1 open slot |
| Still Broken | 0 |
| Verification Blocked | 0 |

Daily promotion: `promote_count = min(open_slots, eligible_backlog)`.

Example: 10 active → Piter fixes 5 → all 5 verified → 5 slots → next run promotes **5** items, not 10.

---

## Follow-Up Prompt Content

Must include:

- Original issue code  
- What verification observed  
- What is still wrong (specific DOM/step)  
- Files to inspect (from CodeGraph)  
- Non-changes block  
- Do not re-open full unrelated refactors  

---

## UI Requirements (Future)

Verification panel shows timeline:

1. Marked fixed (who, when)  
2. Verification run (environment, type)  
3. Result badge  
4. Evidence thumbnails  
5. Copy follow-up prompt  

---

## Audit and Metrics

Track per week:

- Mean time from Mark Fixed → Verified Fixed  
- Still Broken rate  
- Verification Blocked rate  

High Still Broken rate → prompt quality or verification environment issue.

---

## Related Documents

- `AGENTOPS_PRODUCT_SPEC.md` — queue rules  
- `AGENTOPS_DAILY_WORKFLOW.md` — verification phase  
- `AGENTOPS_BROWSER_QA_SPEC.md` — evidence  
- `AGENTOPS_DATA_MODEL_SPEC.md` — `agentops_verifications` table  
