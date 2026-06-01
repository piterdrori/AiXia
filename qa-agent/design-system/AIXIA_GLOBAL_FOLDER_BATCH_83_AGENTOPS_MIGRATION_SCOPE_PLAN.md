# AiXia Global Design System — Batch 83 — AgentOps Controlled Migration Scope Plan

**Date:** 2026-05-30  
**Type:** Planning / scope only — no page, code, CSS, or route changes  
**Status:** COMPLETE  
**Predecessor:** Batch 82 global cleanup final checkpoint  
**Authority:** `src/design-system/aixia-global/` owners `00`–`16`

---

## 1. Purpose

Define an exact, approval-ready migration scope for AgentOps shell/parity cleanup. Identifies legacy/orb routes, priority order, migration types, shared components, non-changes, browser QA, and Batch 84 approval gates. **Page migrations remain paused until Piter approves this scope.**

---

## 2. AgentOps route inventory

Reference pattern (best match): **`/system/agent-ops/council`** — `AixiaCommandPageLayout` + `AixiaHero surface="command"` + `scrollLead` meta strip + `AixiaSection surface="command"`.

| Route | File | Shell type | Hero | Meta strip | Local cards/grids | Orb/default | Parity vs `aixia-global/` | Need | Risk | Migrate now? |
|-------|------|------------|------|------------|-------------------|-------------|----------------------------|------|------|--------------|
| `/system/agent-ops` | `src/app/system/agent-ops/page.tsx` | Command (`AixiaPage surface="command"`) | `AixiaHero surface="command"` ✓ | **None** | Local Tailwind KPI + nav button grids in scroll | No orb | **Partial** — shell OK; KPIs/nav cards not shared components; no `AixiaCommandPageLayout`; no meta strip | **Medium** | **High** (8.5k-line hub + legacy fallback) | **Later** (wave 2) |
| `/system/agent-ops/council` | `src/app/system/agent-ops/council/page.tsx` | **`AixiaCommandPageLayout`** ✓ | `AixiaHero surface="command"` ✓ | `AixiaFinanceHubMetaStrip variant="command"` ✓ | `AixiaSection`, chat components | No | **Best match** — minor alias naming only | **Low** | Low | **Later** (normalize alias optional) |
| `/system/agent-ops/history` | `src/app/system/agent-ops/history/page.tsx` | **Orb/default** (`AixiaPage` no surface) | `AixiaHero` **no** `surface="command"` | **None** | 6-col + 4-col Tailwind summary grids; local timeline cards; raw `<input>`/`<select>` filters | Default hero rhythm | **Largest gap** | **High** | **Medium** | **Yes — Batch 84 target** |
| `/system/agent-ops/issues` | `src/app/system/agent-ops/issues/page.tsx` | Command shell classes | **Local h1** — no `AixiaHero` | **None** | Local KPI button-grid in scroll | No | **Partial** — command scroll only | **Medium** | Medium | **Wave 2** (after History) |
| `/system/agent-ops/issues/[issueCode]` | `src/app/system/agent-ops/issues/[issueCode]/page.tsx` | Command shell | `AixiaHero surface="command"` ✓ | **None** | Hero-child KPI grid; complex workspace sections | No | **Partial** | **Medium** | **High** (1.6k lines, lifecycle workflows) | **Later** |
| `/system/agent-ops/advanced` | `src/app/system/agent-ops/advanced/page.tsx` | Orb/default | Hero no `surface="command"` | None | Local 6-col summary grid | Default | **Low parity** | **Medium** | Low | **Wave 3** |
| `/system/agent-ops/knowledge` | `src/app/system/agent-ops/knowledge/page.tsx` | Orb/default | Hero no `surface="command"` | None | Local grids + tables | Default | **Low parity** | **Medium** | Medium | **Wave 3** |
| `/system/agent-ops/automation` | `src/app/system/agent-ops/automation/page.tsx` | Orb/default | Hero no `surface="command"` | None | Local cards | Default | **Low parity** | **Medium** | Medium | **Wave 3** |
| `/system/agent-ops/agents` | `src/app/system/agent-ops/agents/page.tsx` | Orb/default | Hero no `surface="command"` | None | Local 6-col overview grid | Default | **Low parity** | **Medium** | Low | **Wave 3** |
| `/system/agent-ops/agents/[agentId]` | `src/app/system/agent-ops/agents/[agentId]/page.tsx` | Orb/default | Hero no `surface="command"` | None | Form + section layout | Default | **Low parity** | **Medium** | Medium | **Wave 3** |

**Guardrail debt list (`LEGACY_SHELL_HERO_DEBT_FILES`):** History, Advanced, Agents, Agent detail, Automation, Knowledge — **not** Council, Hub, Issues queue, Issue workspace.

**Supporting files (no shell migration in Batch 84):**

- `src/app/system/agent-ops/issues/IssueLifecycleRail.tsx`
- `src/app/system/agent-ops/issues/normalizeCursorPrompt.ts`

---

## 3. Parity findings

| Finding | Routes affected |
|---------|-----------------|
| **Council = canonical AgentOps command pattern** | Council |
| **Hub = partial command shell** — hero OK; missing `AixiaCommandPageLayout`, meta strip, shared KPI/nav components; large legacy fallback block | Hub |
| **History = largest visual gap** — orb/default shell, hero without `surface="command"`, no meta strip, extensive local Tailwind card grids | History |
| **Issues queue = command structure without hero** — manual h1 header block | Issues |
| **Issue workspace = hero OK** — missing layout wrapper + meta strip; hero embeds local KPI cards | Issue detail |
| **Six orb routes share same debt pattern** — `AixiaPage` without command surface + default hero + local grids | Advanced, Knowledge, Automation, Agents, Agent detail (+ History) |

---

## 4. Priority order

1. **Highest:** `/system/agent-ops/history` — largest parity gap; read-only; isolated file (~670 lines); on guardrail debt list; clear Council template.
2. **Second:** `/system/agent-ops/issues` — daily queue; hero/meta gap; moderate size; high product value after History proof.
3. **Wave 2 (grouped):** Hub `/system/agent-ops` — meta strip + shared nav/KPI components; defer legacy fallback trim to separate scoped batch.
4. **Wave 3 (grouped orb routes):** Advanced, Knowledge, Automation, Agents, Agent detail — same migration recipe as History; lower daily traffic.
5. **Deferred / minimal:** Council — already compliant; optional alias rename (`AixiaCommandHubMetaStrip` vs finance alias).
6. **Deferred / high complexity:** Issue workspace — migrate after Issues queue + History prove silent refresh on filters.

---

## 5. Recommended first implementation route

**Batch 84 target:** `/system/agent-ops/history`  
**File:** `src/app/system/agent-ops/history/page.tsx`  
**Template:** Council (`AixiaCommandPageLayout` + command hero + scroll meta strip + command sections)  
**Design-only:** No data, action, route, permission, or workflow logic changes.

---

## 6. Migration type per route

| Route | Type | Shared components | CSS changes | Logic changes |
|-------|------|-------------------|-------------|---------------|
| Hub | **E** — Full command-page migration (partial first: hero/meta/KPI/nav only) | `AixiaCommandPageLayout`, `AixiaCommandHubMetaStrip`, `AixiaCommandMetrics`, `AixiaNavigationGrid`/`AixiaNavigationCard`, `AixiaSection` | **No** new module CSS | **No** |
| Council | **A** — No migration needed (optional alias normalize) | Already uses layout + hero + meta + sections | **No** | **No** |
| **History** | **E** — Full AgentOps command-page migration | `AixiaCommandPageLayout`, `AixiaHero surface="command"`, `AixiaCommandHubMetaStrip`, `AixiaSmartGrid`, `AixiaValueBlock`, `AixiaSection surface="command"`, `AixiaTableShell` (existing tables unchanged) | **No** | **No** |
| Issues | **C + D** — Hero/meta + card standardization | `AixiaCommandPageLayout`, `AixiaHero`, `AixiaCommandHubMetaStrip`, `AixiaValueBlock`/`AixiaSmartGrid` for queue summary | **No** | **No** |
| Issue workspace | **C + D** — Hero/meta + hero KPI standardization | `AixiaCommandPageLayout`, `AixiaCommandHubMetaStrip`; move hero KPI grid to `AixiaCommandMetrics` or `AixiaValueBlock` | **No** | **No** |
| Advanced | **B + C + D** — Shell + hero/meta + grids | Same as History recipe | **No** | **No** |
| Knowledge | **B + C + D** | Same as History recipe | **No** | **No** |
| Automation | **B + C + D** | Same as History recipe | **No** | **No** |
| Agents | **B + C + D** | Same as History recipe | **No** | **No** |
| Agent detail | **B + C + D** | Same as History recipe | **No** | **No** |

**Type key:** A = none · B = shell-only · C = hero/meta · D = card/grid · E = full command-page · F = deferred

---

## 7. Shared component / pattern plan

### Batch 84 (History) — use existing components only

| Pattern | Component | Owner refs |
|---------|-----------|------------|
| Command shell | `AixiaCommandPageLayout` → `AixiaCommandPage` | `03`, `13` |
| Hero | `AixiaHero surface="command"` + `gradientTitle="AgentOps"` | `04` |
| Scroll meta strip | `AixiaCommandHubMetaStrip variant="command"` | `05` |
| Summary metrics | `AixiaSmartGrid` + `AixiaValueBlock` (replace 6-col Tailwind grid) | `06`, `12` |
| Sections | `AixiaSection surface="command"` | `06` |
| Timeline list rows | Keep structure; optional card class → section body rhythm only | `06`, `08` |
| Tables | Existing `AixiaTableShell` usage — preserve | `08` |
| Loading | Existing `AixiaAsyncState` — preserve | `11` |

**Proposed History meta strip items (data-only mapping, no new logic):**

- Recent runs count · verification records · owner decisions · cursor handoffs · archived/verified · follow-up/blocked — sourced from existing `summary` useMemo.

**Component gap proposals (owner-file route — not local page hacks):**

| Gap | Proposal | Batch |
|-----|----------|-------|
| Filter row uses raw `<input>`/`<select>` | If shared field components exist (`AixiaInputField`, select pattern), use in History migration without changing filter state keys/handlers; else report to owner `07`/`08` | 84 optional / owner proposal |
| Hub nav uses `<button>` cards not `AixiaNavigationGrid` | Wave 2 — use `AixiaNavigationGrid` + `AixiaNavigationCard` per `12` | Hub batch |
| Council uses `AixiaFinanceHubMetaStrip` import name | Optional rename to `AixiaCommandHubMetaStrip` for clarity — wrapper-only | Low-priority cleanup |

**Do not create** new standards or module-specific CSS for AgentOps.

---

## 8. Non-changes

All future AgentOps migration batches must preserve:

- All Supabase/API calls and data loading (`getAgentOpsRunHistory`, verification, automation, import, scheduler, dashboard, fix plans)
- All actions (refresh, copy path, navigate to issue, filter changes)
- All AgentOps workflows and issue states
- Filter/search/sort state (`actionFilter`, `statusFilter`, `rangeFilter`, `issueFilter`) — **silent refresh rule**
- All modals and feedback toasts
- All route paths and permissions (`getAgentOpsOwnerStatus`)
- Hermes/memory/CodeGraph references (read-only staging notes)
- AgentMemory local/staging notes
- `data-testid="agentops-history"` and existing test hooks where present
- No scroll reset, tab reset, or form loss on refresh

**Design-only** = JSX/layout/class/component shell changes only.

---

## 9. Browser QA plan (Batch 84 — History)

| Step | Check |
|------|-------|
| 1 | Open `/system/agent-ops/history` as AgentOps owner |
| 2 | Verify command shell: locked hero + scroll region; hero uses command surface |
| 3 | Verify meta strip visible below hero in scroll lead |
| 4 | Verify summary metrics use shared grid/value blocks (not raw Tailwind KPI cards) |
| 5 | Verify sections match owner `06` rhythm |
| 6 | Apply filters (issue code, action type, status, range) — list updates; **no scroll jump to top** |
| 7 | Click Refresh — data reloads; **filters preserved**; **no full-page flash** |
| 8 | Copy path action — clipboard feedback still works |
| 9 | Navigate to issue from timeline row — route works |
| 10 | Open/close any `<details>` blocks — state preserved on refresh |
| 11 | Responsive: 1280×800 and normal desktop — no horizontal overflow regressions |
| 12 | Console: no new errors |
| 13 | Run `npm run qa:validate-foundation` — PASS |
| 14 | Run `npm run build` — only in implementation batch after code change |

---

## 10. Batch 84 approval checklist

Piter must approve **before** any History page edit:

- [ ] **Target route:** `/system/agent-ops/history` approved
- [ ] **File scope:** `src/app/system/agent-ops/history/page.tsx` only (unless shared import cleanup explicitly added)
- [ ] **Migration type:** Full command-page migration (type E) using Council pattern approved
- [ ] **Non-changes:** Data, filters, actions, routes, permissions, silent refresh — approved
- [ ] **Shared components list:** §7 approved
- [ ] **Browser QA plan:** §9 approved
- [ ] **No CSS split**
- [ ] **No command-surface context**
- [ ] **No guardrail hard-error escalation** (optional: remove History from `LEGACY_SHELL_HERO_DEBT_FILES` warn list as post-migration doc-only follow-up — separate approval)
- [ ] **No finance proof route**
- [ ] **No production/main**
- [ ] **No hub/issues/orb-route scope creep in Batch 84**

---

## 11. What was not changed

- No page, component, CSS, route, guardrail, package, or Hermes config edits
- No files moved, archived, or deleted
- No AgentMemory server start
- No page migration implementation
- Page migrations remain **paused** pending Batch 84 approval

---

## 12. Recommended next batch

**Batch 84 — Migrate AgentOps History to global command shell**

- **Route:** `/system/agent-ops/history`
- **File:** `src/app/system/agent-ops/history/page.tsx`
- **Method:** Council pattern; design-only; existing shared components
- **Gate:** Piter signs Batch 84 approval checklist (§10)
- **Validation:** Browser QA §9 + `npm run qa:validate-foundation` + `npm run build`

Do **not** start Batch 84 until checklist approved.

---

## 13. Page migrations remain paused

Confirmed. Batch 83 produced scope only. No implementation authorized.

---

## Validation

| Command | Result |
|---------|--------|
| `npm run qa:validate-foundation` | **PASS** |

Build not run — planning batch only.

---

## FINAL CHECK

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_83_AGENTOPS_MIGRATION_SCOPE_PLAN.md` |
| 2 | Files modified | `src/design-system/aixia-global/16-design-file-cleanup-map.md` (§7 step 38 status only) |
| 3 | AgentOps route inventory completed | **Yes** |
| 4 | Priority order created | **Yes** |
| 5 | First implementation route recommended | **Yes** — `/system/agent-ops/history` |
| 6 | Migration type per route created | **Yes** |
| 7 | Shared component plan created | **Yes** |
| 8 | Non-changes listed | **Yes** |
| 9 | Browser QA plan created | **Yes** |
| 10 | Batch 84 approval checklist created | **Yes** |
| 11 | Code changed | **No** |
| 12 | CSS changed | **No** |
| 13 | Pages changed | **No** |
| 14 | Components changed | **No** |
| 15 | Guardrail scripts changed | **No** |
| 16 | Package scripts changed | **No** |
| 17 | Hermes runtime config changed | **No** |
| 18 | AgentMemory server started | **No** |
| 19 | Page migrations remain paused | **Yes** |
| 20 | Batch 9 finance proofs paused | **Yes** |
| 21 | Command-surface context paused | **Yes** |
| 22 | Command results | `npm run qa:validate-foundation` — **PASS** |
| 23 | Final status | **COMPLETE** |
| 24 | Recommended next batch | **Batch 84** — History command-shell migration (pending approval) |

---

## Related

- Batch 82: `AIXIA_GLOBAL_FOLDER_BATCH_82_GLOBAL_CLEANUP_FINAL_STATUS_AND_NEXT_GATE.md`
- Council reference: `src/app/system/agent-ops/council/page.tsx`
- Migration law: `src/design-system/aixia-global/14-page-migration-rules.md`
- Guardrail debt list: `scripts/guardrails/aixia-guardrail-allowlists.mjs`
