# AgentOps Batch 97 / Phase 0C — Issues List Polish Report

**Date:** 2026-05-30  
**Status:** COMPLETE

---

## Goal

Reduce KPI/guardrail noise on the canonical Issues queue route.

---

## Changes

| Item | Change |
|------|--------|
| Meta strip | Trimmed to Environment + Loaded scope (removed duplicate manual-first rows) |
| Command metrics | Reduced from 6 to 4 cards (removed Open slots + Follow-up/blocked duplicates) |
| Queue guardrails | Collapsed into `<details>` (closed by default) |

**File:** `src/app/system/agent-ops/issues/page.tsx`

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` | PASS |

---

## Next

Batch 98 / Phase 0D — Issue Workspace visibility pass.
