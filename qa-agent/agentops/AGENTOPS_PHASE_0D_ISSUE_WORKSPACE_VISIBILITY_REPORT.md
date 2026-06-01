# AgentOps Batch 98 / Phase 0D — Issue Workspace Visibility Report

**Date:** 2026-05-30  
**Status:** COMPLETE

---

## Goal

Reorder disclosures so primary workbench stays visible; technical/supporting artifacts collapsed by default.

---

## Changes

| Item | Change |
|------|--------|
| Supporting artifacts | Wrapped evidence, fix plan, CodeGraph, post-Cursor review, timeline, and technical status in outer collapsed `<details>` |
| Primary surface | Lifecycle rail + issue-solving workbench remain above fold |

**File:** `src/app/system/agent-ops/issues/[issueCode]/page.tsx`

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` | PASS |

---

## Next

Batch 99 / Phase 0E — Agents polish.
