# AgentOps Global UX Freeze — Final Lock Layer

**Status:** Locked — governance and verification only  
**Effective:** 2026-06-16  
**Authority chain:** Subordinate to `ACDL_SYSTEM_LOCK_v2.1.md` · complements `AGENTOPS_RUNTIME_SEMANTIC_BOUNDARY.md`  
**Verify:** `npm run agentops:global-ux-freeze-verify` · `npx tsx scripts/agentops-global-ux-freeze-verify.ts`

**Scope:** Product UI surfaces (Agents Hub, Agent Detail, Issues System). Does **not** modify ACDL engines, runtime architecture, routing, backend, or Supabase schema.

---

## Architecture principle (immutable)

| Layer | Role |
|-------|------|
| **ACDL** | Defines truth (v5–v10.4; v10.4 = only final decision gate) |
| **USL v1** | Defines product display language (`src/lib/agentops/usl/`) |
| **Product UI** | Defines structure and staging workflows |
| **Runtime** | Defines read-only observability (DB rows, logs, config) |

AgentOps product UI must **never** become:

- a reasoning engine
- a runtime mirror with inferred meaning
- a ranking or scoring system
- a recommendation system
- an autonomous execution system

---

## 1. Locked surfaces

| # | Surface | Route(s) | Layer |
|---|---------|----------|-------|
| 1 | Agents Hub | `/system/agent-ops/agents` | Preview / list |
| 2 | Agent Detail | `/system/agent-ops/agents/:agentId` | Full workspace |
| 3 | Issues Hub | `/system/agent-ops/issues` | Evidence index |
| 4 | Issue Workspace | `/system/agent-ops/issues/:issueCode` | Diagnostic trace workbench |
| 5 | Runtime observatories | `/system/agent-ops/runtime` · `/runtime/memory` · `/issues/runtime` · `/agents/runtime` | Read-only observability |

Council, Tools Hub, and developer diagnostics are **out of scope** for this freeze unless they adopt USL product vocabulary in future approved passes.

---

## 2. Locked vocabulary (product UI)

### Allowed

- observation
- status (observed)
- behavior trace
- diagnostic trace
- stored validation
- suggested trace
- evidence
- memory proposal
- platform support
- direct agent tool
- current memory
- memory insight
- advisory chat

### Forbidden (product UI copy)

Unless inside raw developer-only diagnostic JSON, exact stored DB field labels in runtime observatories, or USL mapper replacement definitions:

- decision
- recommendation / recommended action
- fix plan
- execution status
- priority (as ranking)
- ranking
- score (as ranking)
- cognition
- intelligence outcome
- autonomous action
- system truth
- status helper
- UI helper
- not wired (as failure implication for platform support)
- final verdict (outside v10.4 final gate block)

**Shared copy owners (required):**

- `src/lib/agentops/agents/agentDetailDisplayCopy.ts`
- `src/lib/agentops/issues/issueDetailDisplayCopy.ts`
- `src/lib/agentops/issues/issueDisplayMappers.ts`

---

## 3. Product vs runtime boundary

| | Product UI | Runtime observatories |
|---|------------|----------------------|
| Purpose | Staging workflows, preview, owner actions | Immutable read-only observation |
| Meaning | USL-safe display only | Stored fields as-is |
| Inference | Forbidden | Forbidden |
| Ranking | Forbidden | Forbidden |
| ACDL authority | Display labels only; v10.4 gate in reports | Never |

Runtime contracts: `registry/AGENTOPS_RUNTIME_ARCHITECTURE_FREEZE.md` · `registry/AGENTOPS_RUNTIME_SEMANTIC_BOUNDARY.md`

---

## 4. Agents Hub contract

**Route:** `/system/agent-ops/agents`  
**Reference report:** `qa-agent/reports/agents-hub-final-consistency-alignment.md`

### Allowed card hierarchy

1. Identity (name)
2. Responsibility (one line, canonical)
3. Status (observed)
4. Last behavior trace
5. Can do preview (from `productAgentWorkspaceMappers`)
6. Tools preview (direct + platform support)
7. Current memory preview (seed facts, max 3 lines)
8. Open Agent

### Forbidden

- Runtime mirror tables
- Direct ACDL authority claims
- Recommendation / ranking language
- UI helper / status helper wording
- Platform support shown as disconnected or failed

---

## 5. Agent Detail contract

**Route:** `/system/agent-ops/agents/:agentId`  
**Reference report:** `qa-agent/reports/agent-detail-consolidation-p4-final.md`

### Locked section order

1. Identity (hero)
2. Permissions | Work mode
3. Tools
4. Memory — current
5. Memory — insights
6. Memory — proposal
7. Issues
8. Chat (advisory)
9. Developer configuration (collapsed)

### Allowed

- Can do / Cannot do / Always forbidden (data-driven from identity lock)
- Direct tools vs Platform support (non-direct agent tool)
- Current memory / Memory insights (max 8) / Memory change flow
- Chat: advisory only OR Send to Memory Proposal when memory intent detected

### Forbidden

- Direct memory mutation without proposal framing
- Tool authority claims
- CodeGraph / ACDL as disconnected or unavailable
- Hidden execution or autonomous authority wording

---

## 6. Issues System contract

**Routes:** `/system/agent-ops/issues` · `/system/agent-ops/issues/:issueCode`  
**Reference report:** `qa-agent/reports/issues-system-final-semantic-freeze.md`

### Allowed

- status (observed)
- behavior trace / diagnostic trace
- stored validation / suggested trace
- evidence
- memory proposal (Send to Memory Proposal)
- advisory chat rule (same as Agent Detail)

### Forbidden

- fix plan (product copy)
- recommended action
- execution status (product copy)
- decision language outside v10.4 final gate
- priority as ranking
- resolution inference in UI

---

## 7. Runtime contract reference

**Routes:** Class A/B/C observatories per `AGENTOPS_RUNTIME_ARCHITECTURE_FREEZE.md`

Runtime is **not** part of the product UX triangle. It remains observation-only.

**Verify (authoritative, do not duplicate logic):**

- `scripts/agentops-runtime-immutability-check.ts`
- `scripts/agentops-runtime-semantic-verify.ts`

Global UX freeze script **delegates** to these checks and reports their pass/fail.

---

## 8. Forbidden drift patterns

The following regressions fail CI when detected in product UI copy:

| Pattern | Why forbidden |
|---------|----------------|
| New product runtime mirror page | Collapses product/runtime boundary |
| Recommendation panels on Hub/Detail/Issues | Product must not rank or advise as authority |
| Priority / score dashboards | Ranking system |
| Direct ACDL engine calls from product pages | Bypasses display boundary |
| Autonomous memory write from chat without proposal | Violates memory contract |
| Autonomous fix/deploy CTAs | Violates manual-first staging |
| `UI indicator` / `status helper` | Superseded by status (observed) |
| Platform tools labeled disconnected / not wired | Platform support is never failure |
| Mixed vocabulary across Hub / Detail / Issues | Breaks single semantic system |

---

## 9. Allowed future changes

- Styling and spacing polish (no semantic drift)
- Accessibility improvements
- Bug fixes that preserve contracts
- Copy fixes that **preserve or tighten** USL vocabulary
- Data-display improvements that show stored fields without inference
- CI / verify script hardening
- New agents in identity lock (data-only) if display mappers remain source-driven

---

## 10. Forbidden future changes (without new registry approval)

- New reasoning surfaces in product UI
- Product runtime mirrors or new runtime pages
- Recommendation / priority / ranking dashboards
- Direct ACDL engine invocation from product UI
- Autonomous memory mutation or fix/deploy actions
- Section order changes on Agent Detail
- Hub card hierarchy changes that drop preview contract
- Weakening USL or runtime verify scripts

---

## 11. Required verification commands

Run before merge when touching AgentOps product UI:

```bash
npx tsc -b
npx tsx scripts/agentops-usl-verify.ts
npx tsx scripts/agentops-acdl-architecture-lock-verify.ts
npx tsx scripts/agentops-runtime-immutability-check.ts
npx tsx scripts/agentops-runtime-semantic-verify.ts
npx tsx scripts/agentops-global-ux-freeze-verify.ts
```

**Build gate (includes runtime + global UX freeze after runtime checks):**

```bash
npm run build
```

**Standalone global UX freeze:**

```bash
npm run agentops:global-ux-freeze-verify
```

---

## Change control

Any change that alters locked surfaces, vocabulary, or section order requires:

1. Piter approval
2. Update to this document (proposal, not silent edit)
3. Passing all verification commands above
4. New or updated qa-agent report entry

**This document records the approved freeze. It does not grant permission to redesign product UX.**
