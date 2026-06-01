# AgentOps Phase 0B-prep — Operator Parity Report (Batch 95)

**Date:** 2026-05-30  
**Type:** Parity prep — app source changed (operator surfaces added)  
**Status:** COMPLETE  
**Authority:** `AGENTOPS_PHASE_0A_HUB_LEGACY_PARITY_CHECKLIST.md`, Batch 93 alignment checkpoint

---

## 1. Purpose

Batch 94 / Phase 0A audited the Hub legacy fallback and found **17 parity gaps (G1–G17)** with a **0B verdict: Not ready**. Interactive operator workflows (import modals, queue row actions, fix-plan decisions, verification queues, scheduler prep, automation Create Request) were reachable mainly from the Hub inner legacy panel.

Batch 95 / Phase 0B-prep closes the **P0/P1 targets G1–G9** by adding equivalent operator triggers on dedicated routes **without** removing, hiding, or deleting the Hub legacy fallback. Business logic is preserved by reusing the same `@/lib/agentops` API calls and modal/action patterns extracted from the Hub page.

---

## 2. Files changed

### New files

| File | Purpose |
|------|---------|
| `src/app/system/agent-ops/operators/agentOpsOperatorLabels.ts` | Shared labels, tones, and action constants reused across operator surfaces |
| `src/app/system/agent-ops/operators/AgentOpsImportOperatorSurface.tsx` | G1/G2 — import modals + import candidate review row actions |
| `src/app/system/agent-ops/operators/AgentOpsFixPlanOperatorSurface.tsx` | G8 — multi-plan fix review interactive actions + modals |
| `src/app/system/agent-ops/operators/AgentOpsVerificationRequestOperatorSurface.tsx` | G9 — verification request queue interactive actions |
| `src/app/system/agent-ops/operators/AgentOpsQueueOperatorSurface.tsx` | G3/G4/G5 — Active Top 10 row actions, pending verification result actions, backlog Mark Verified Fixed |
| `src/app/system/agent-ops/operators/AgentOpsAutomationRequestOperatorSurface.tsx` | G6/G7 — scheduler preparation decision buttons + Create Request grid + modal |

### Modified files

| File | Change summary |
|------|----------------|
| `src/app/system/agent-ops/advanced/page.tsx` | Replaced read-only summaries and legacy link-back buttons with three operator surfaces; legacy section replaced with informational block only |
| `src/app/system/agent-ops/issues/page.tsx` | Added `<AgentOpsQueueOperatorSurface onRefresh={loadIssues} />` after issue list |
| `src/app/system/agent-ops/automation/page.tsx` | Replaced read-only scheduler prep disclosure with `<AgentOpsAutomationRequestOperatorSurface />` |
| `src/app/system/agent-ops/page.tsx` | **Minimal Hub change only:** Today's Priority “Generate More Issues” now navigates to `/system/agent-ops/advanced` (label: “Open Advanced import tools”) instead of `openLegacyTools("issues")` |

### Report file (this document)

| File | Purpose |
|------|---------|
| `qa-agent/agentops/AGENTOPS_PHASE_0B_PREP_OPERATOR_PARITY_REPORT.md` | Batch 95 completion report |

**Not changed:** Supabase, migrations, RLS, API contracts, runtime systems, production/main.

---

## 3. Gaps targeted

Minimum P0/P1 parity prep from Phase 0A:

| ID | Gap | Target route |
|----|-----|--------------|
| G1 | Import Static / Browser / Workflow / Write-Draft modals | Advanced |
| G2 | Import candidate review row actions | Advanced |
| G3 | Active Top 10 row actions | Issues |
| G4 | Pending verification queue result actions | Issues |
| G5 | Backlog Mark Verified Fixed | Issues |
| G6 | Scheduler preparation decision buttons | Automation |
| G7 | Full automation Create Request grid + modal | Automation |
| G8 | Fix Plan Review multi-plan interactive actions | Advanced |
| G9 | Verification Requests queue interactive actions | Advanced |

**Preserved on Hub primary (not removal targets):** G15 Today's Priority, G16 Refill Queue + refill modal, Navigate grid.

**Explicitly out of scope this batch:** G10–G14 (focus directives, ranking, memory refresh, agent interaction window).

---

## 4. Gaps closed

| ID | Status | Evidence |
|----|--------|----------|
| G1 | **Closed** | `AgentOpsImportOperatorSurface` — four import modal triggers + confirm import flows on Advanced |
| G2 | **Closed** | Same surface — import candidate review table with per-row `AixiaRowActionMenu` decisions |
| G3 | **Closed** | `AgentOpsQueueOperatorSurface` — Active Top 10 row action menus on Issues |
| G4 | **Closed** | Same surface — pending verification result modal + record actions (when rows exist) |
| G5 | **Closed** | Same surface — backlog Mark Verified Fixed buttons + confirmation modal |
| G6 | **Closed** | `AgentOpsAutomationRequestOperatorSurface` — Keep Manual Only / Approve Preparation / Request Changes / Review Later |
| G7 | **Closed** | Same surface — Create Request grid for all automation control types + request modal |
| G8 | **Closed** | `AgentOpsFixPlanOperatorSurface` — multi-plan review decisions, Cursor handoff, fix report modals |
| G9 | **Closed** | `AgentOpsVerificationRequestOperatorSurface` — verification request queue row actions |

**G15 / G16 / Navigate:** Preserved on Hub primary; G15 routing improved to point at Advanced for import workflows.

---

## 5. Gaps deferred

| ID | Gap | Reason |
|----|-----|--------|
| G10 | Focus Directives CRUD + table | P2 — per Phase 0A, needs Agents route work or Piter decision |
| G11 | Focus Ranking Preview + decisions | P2 — Piter approval batch |
| G12 | Memory file review decision actions | P2 — belongs on Knowledge route |
| G13 | Memory refresh plan decision actions | P2 — belongs on Knowledge route |
| G14 | Agent Interaction Window modal (legacy path) | P2 — merge with Agent Workspace |
| G17 (partial) | Hub-only import review shortcut via `recordAgentOpsImportReviewDecision` + queue health | Hub legacy retains this shortcut; not duplicated on Advanced (low-risk delta — see §6) |

---

## 6. Handler / modals reuse strategy

**Strategy used: Option B** — extract small shared operator surface components from Hub handler patterns; wire into dedicated routes without changing `@/lib/agentops` contracts.

### Pre-edit parity review (Part 1)

1. **Handlers only on Hub legacy today:** Import modals, import candidate decisions, Active Top 10 row actions, pending verification recording, backlog verified-fixed, scheduler prep decisions, automation Create Request modal, fix plan multi-plan actions, verification request queue actions — all triggered from Hub inner legacy panel (and page-level modals on `AgentOpsPage`).

2. **Safe reuse:** All targeted flows call existing `@/lib/agentops` functions already imported on Hub (`recordAgentOpsFindingAction`, `recordAgentOpsImportCandidateDecision`, `recordAgentOpsSchedulerPreparationDecision`, `createAgentOpsAutomationControlRequest`, `recordAgentOpsFixPlanDecision`, etc.). Extraction copies UI + call wiring, not new business logic.

3. **Definition location:** Handlers were page-local on `page.tsx` (~8,575 lines). No pre-existing shared operator package — extraction to `operators/` was the safest path to avoid blind duplication.

4. **Extraction vs duplication:** Extraction chosen — five focused surfaces + one labels module. Hub legacy panel left **unchanged** (except Today's Priority navigation tweak).

5. **Closed without logic changes:** G1–G9 — UI triggers relocated; same API payloads and modal fields.

6. **Deferred / blocked:** G10–G14 unchanged. Import review shortcut (`recordAgentOpsImportReviewDecision` at Hub ~1778) remains Hub-only until a later batch if needed.

### Known minor delta (non-blocking)

- Advanced import surface does **not** include the Hub shortcut that calls `recordAgentOpsImportReviewDecision` tied to queue-health context. Full import candidate review (G2) **is** present. Legacy fallback still provides the shortcut.

---

## 7. Advanced parity result

**Route:** `/system/agent-ops/advanced`  
**File:** `src/app/system/agent-ops/advanced/page.tsx`

| Before | After |
|--------|-------|
| Read-only import/fix-plan/verification summaries | Interactive operator surfaces |
| “Open legacy import operators” / “Open legacy fix-plan actions” link-backs | Removed — replaced by in-route controls |
| Legacy tools section pointing to Hub | Informational block noting legacy fallback still on Hub |

**Surfaces wired:**

- `AgentOpsImportOperatorSurface` — G1, G2  
- `AgentOpsFixPlanOperatorSurface` — G8  
- `AgentOpsVerificationRequestOperatorSurface` — G9  

**Browser QA:** Import Static/Browser/Workflow/Write-Draft buttons visible; Import Candidate Review section with row menus; Fix Plan Review and Verification Requests sections present; no legacy link-back text; no console errors observed.

---

## 8. Issues parity result

**Route:** `/system/agent-ops/issues`  
**File:** `src/app/system/agent-ops/issues/page.tsx`

| Before | After |
|--------|-------|
| Clean issue list + filters only | Issue list preserved + `AgentOpsQueueOperatorSurface` below list |
| Queue actions only in Hub legacy | Active Top 10 row actions, pending verification, backlog Mark Verified Fixed on Issues |

**Design choice:** Queue operator section placed **after** the issue registry table so the Issues page stays a queue-first list; dense row actions live in a dedicated operator section rather than overloading list rows.

**Related route:** `/system/agent-ops/issues/[issueCode]` unchanged — Issue Workspace remains primary for single-issue work; browser QA confirmed workspace loads for `AIXIA-BROWSER-LOGIN-finance-admin`.

**Browser QA:** Active Top 10 section with row “More actions” menus; Mark Verified Fixed on backlog preview; pending verification section renders when data exists (0 rows in current staging snapshot).

---

## 9. Automation parity result

**Route:** `/system/agent-ops/automation`  
**File:** `src/app/system/agent-ops/automation/page.tsx`

| Before | After |
|--------|-------|
| Read-only scheduler prep `<details>` | `AgentOpsAutomationRequestOperatorSurface` with interactive buttons |
| Partial Create Request exposure | Full Create Request grid + modal parity |

**Scheduler decisions:** Keep Manual Only, Approve Preparation, Request Changes, Review Later (`review_later` — matches Hub legacy, not `reject_scheduler`).

**Safety preserved:** Request/copy only; no scheduler activation, no shell execution from UI.

**Browser QA:** Scheduler preparation decision buttons and Create Request buttons visible; manual-first info blocks present.

---

## 10. Hub primary preservation result

| Hub primary control | Status |
|---------------------|--------|
| Hero **Refill Queue** button | **Preserved** — opens refill modal when eligible |
| **Today's Priority** section | **Preserved** — behavior updated for “Generate More Issues” → navigate to Advanced |
| **Navigate** grid | **Preserved** — all dedicated route cards intact |
| **Legacy fallback** (`#agentops-legacy-tools`) | **Preserved** — outer shell + inner full legacy panel unchanged |
| Refill modal wiring | **Preserved** — page-level modal handlers unchanged |

**Only Hub code change:** Today's Priority handler for “Generate More Issues” routes to `/system/agent-ops/advanced` instead of opening legacy Issues tab (aligns G15 with new Advanced parity).

---

## 11. Confirmation legacy fallback was not removed/hidden

| Check | Result |
|-------|--------|
| `#agentops-legacy-tools` present | **Yes** — browser snapshot shows “Legacy tools fallback (minimal)” and “Open full legacy panel (temporary)” |
| Inner legacy tab nav (Today/Issues/Agents/Automation/Advanced/History) | **Yes** — visible when legacy panel expanded |
| Legacy JSX deleted | **No** |
| Legacy hidden via CSS or conditional | **No** |

---

## 12. Validation results

### `npm run qa:validate-foundation`

```text
Result: PASS
```

| Check | Result |
|-------|--------|
| Markdown files | OK |
| Template files | OK |
| Registry JSON parse | OK |
| Registry schema | OK |
| Cross-reference checks | OK |
| Important content checks | OK |

### `npm run build`

```text
Result: PASS (exit code 0)
```

TypeScript production build completed successfully after operator surface wiring.

---

## 13. Browser QA results

**Environment:** `http://127.0.0.1:5173/` (local Vite dev server)  
**User:** Owner session (piter@karimchina.com)

| Route | Result | Notes |
|-------|--------|-------|
| `/system/agent-ops` | **PASS** | Refill Queue, Today's Priority, Navigate grid, legacy fallback all present |
| `/system/agent-ops/advanced` | **PASS** | All four import buttons, candidate review, fix plan + verification operator sections; no legacy link-backs |
| `/system/agent-ops/issues` | **PASS** | Queue operator surface with Active Top 10 row menus and backlog Mark Verified Fixed |
| `/system/agent-ops/issues/AIXIA-BROWSER-LOGIN-finance-admin` | **PASS** | Issue Workspace loads correctly |
| `/system/agent-ops/automation` | **PASS** | Scheduler prep decisions + Create Request grid visible |

| QA criterion | Result |
|--------------|--------|
| Hub legacy fallback still exists | **Yes** |
| Hub Refill Queue works | **Yes** (button present; modal wiring unchanged) |
| No feature removed | **Yes** |
| No console errors observed | **Yes** (empty error array on Hub) |
| Scroll/filter/tab/modal reset during navigation | **Not observed** — standard route navigation only |

**Browser QA verdict:** **PASS**

---

## 14. 0B readiness update

### Phase 0A verdict

**Not ready** — 17 gaps; interactive workflows mainly in Hub legacy.

### Phase 0B-prep verdict (after Batch 95)

**Conditionally ready for Phase 0B hide/remove of inner legacy panel** — **with documented exceptions**

| Area | Status |
|------|--------|
| G1–G9 (P0/P1 operator parity) | **Closed** on dedicated routes |
| G10–G14 | **Still deferred** — legacy Agents/Knowledge dense tools remain hub-only |
| G17 (modal orphan risk) | **Substantially reduced** for import/queue/fix/verification/automation flows |
| Hub primary (G15/G16/Navigate) | **Preserved** |
| Import review shortcut (Hub-only) | **Minor delta** — acceptable if legacy removed in stages; or close in 0B-prep-2 |

**Recommended:** Proceed to **Batch 96 / Phase 0B** for **inner legacy panel hide/remove** after Piter sign-off, with explicit note that G10–G14 remain on legacy until Agents/Knowledge batches. Alternatively run **Batch 96 / Phase 0B-prep-2** first if Piter wants zero hub-only operator tools before any legacy removal.

---

## 15. Recommended next batch

### If Piter approves G1–G9 parity sign-off

```
Batch 96 / Phase 0B — Hide or remove Hub inner legacy panel safely,
preserving Hub primary (Refill Queue, Today's Priority, Navigate grid)
and documenting G10–G14 as temporary legacy-only until Agents/Knowledge prep.
```

### If Piter wants zero hub-only gaps first

```
Batch 96 / Phase 0B-prep-2 — Close G10–G14 blockers (Agents focus/ranking,
Knowledge memory refresh) and Hub import-review shortcut before legacy removal.
```

**Do not recommend yet:** Hermes, CodeGraph, local LLM, AgentMemory, scheduler activation, Supabase changes, or runtime integration.

---

## FINAL CHECK (Batch 95)

| # | Item | Answer |
|---|------|--------|
| 1 | Report created | **Yes** |
| 2 | App source changed | **Yes** |
| 3 | Hub legacy fallback removed/hidden | **No** |
| 4 | Features removed | **No** |
| 5 | Business logic changed | **No** (same `@/lib/agentops` calls; UI extraction only) |
| 6 | Supabase/RLS/schema changed | **No** |
| 7 | Runtime systems activated | **No** |
| 8 | Production/main touched | **No** |
| 9 | Advanced parity added or blocker documented | **Yes** — parity added (G1, G2, G8, G9) |
| 10 | Issues parity added or blocker documented | **Yes** — parity added (G3, G4, G5) |
| 11 | Automation parity added or blocker documented | **Yes** — parity added (G6, G7) |
| 12 | Hub primary Refill Queue preserved | **Yes** |
| 13 | Today's Priority preserved | **Yes** (routing tweak to Advanced for import) |
| 14 | Navigate grid preserved | **Yes** |
| 15 | `npm run qa:validate-foundation` | **PASS** |
| 16 | `npm run build` | **PASS** |
| 17 | Browser QA | **PASS** |
| 18 | 0B readiness verdict updated | **Yes** — conditionally ready with G10–G14 exceptions |
| 19 | Final status | Batch 95 complete — operator parity prep done for G1–G9 |
| 20 | Next recommended prompt | **Batch 96 / Phase 0B** (see §15) |

---

## Related documents

| Document | Role |
|----------|------|
| `AGENTOPS_PHASE_0A_HUB_LEGACY_PARITY_CHECKLIST.md` | Gap source of truth |
| `AGENTOPS_BATCH_93_FINAL_PAGE_MIGRATION_COMPLETION_AND_PHASE_0_ALIGNMENT.md` | Migration completion checkpoint |
| `AGENTOPS_PHASE_0_UI_UX_CONSOLIDATION_PLAN.md` | Phase 0 master plan |
