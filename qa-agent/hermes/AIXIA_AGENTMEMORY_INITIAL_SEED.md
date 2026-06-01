# AiXia AgentMemory Initial Seed (Batch 43)

**Project:** AiXia staging repo only  
**Purpose:** Safe summarized memory for local/staging AgentMemory test — **not** design law  
**Canonical law remains:** `src/design-system/aixia-global/` owner files `00`–`16`

**Safety:** No secrets, no Supabase keys, no production credentials, no customer/private data.

---

## 1. Memory hierarchy (mandatory)

- **Canonical design law:** `src/design-system/aixia-global/00-README-SOURCE-OF-TRUTH.md` through `16-design-file-cleanup-map.md`
- **Memory role:** mirror, summarize, and route agents back to owner files
- **Conflict rule:** if memory conflicts with `aixia-global/`, **`aixia-global/` wins**
- **New design rules:** must be written into the correct owner file — **not only memory**
- **Living law (Batch 51):** source of truth is not frozen; agents propose improvements with evidence; memory records proposals — not law; Piter approves before owner/guardrail/code/CSS/schema/workflow changes — see `00` §0.4
- **Implementation reference:** `src/components/aixia/*`, `src/styles/aixia-design-system.css`, guardrail scripts; thinned `AIXIA_STANDARD.md` is legacy bridge only

---

## 2. Owner files 00–16 summary

| File | Owns |
|------|------|
| `00-README-SOURCE-OF-TRUTH.md` | Authority root, one-owner rule, reading order, approval gates |
| `01-design-tokens.md` | Colors, glass, borders, radius, spacing, z-index, motion, breakpoints, status colors |
| `02-typography-standard.md` | Fonts, type scale, headings, labels, table/button text |
| `03-page-shell-standard.md` | Authenticated shell, layout, padding, rhythm, atmosphere |
| `04-hero-header-standard.md` | Hero/header, command surface, KPI placement, `AixiaHero` |
| `05-meta-status-strip-standard.md` | Meta strips, hub meta rows, runtime strip separation |
| `06-card-section-standard.md` | Sections, KPI/summary cards, grids, two-column rhythm |
| `07-button-action-standard.md` | Buttons, actions, archive/delete/restore patterns |
| `08-table-list-standard.md` | Registry/archive tables, lists, sticky headers, cells |
| `09-form-input-standard.md` | Forms, inputs, labels, validation layout |
| `10-modal-drawer-standard.md` | Modals, drawers, archive manager |
| `11-scroll-responsive-standard.md` | Scroll, overflow, responsive rules, silent refresh preservation |
| `12-navigation-workspace-standard.md` | Navigation/workspace cards, hub pages |
| `13-module-wrapper-rules.md` | Module wrappers delegate only; no module visual law |
| `14-page-migration-rules.md` | Migration gates, shell-only meaning, forbidden local invention |
| `15-guardrail-rules.md` | Build/QA guardrails, warn vs hard-error, owner phrase anchors |
| `16-design-file-cleanup-map.md` | File disposition, cleanup order, archive/delete gates |

---

## 3. Current paused states (locked)

- Page migrations — **PAUSED**
- Batch 9 finance proofs — **PAUSED**
- Command-surface context — **PAUSED**
- CSS split — **PAUSED**
- Archive/delete execution — **PAUSED**
- Guardrail hard-error escalation — **PAUSED**

Do not migrate pages, run finance shell proof batches, split CSS, or archive/delete files without explicit Piter approval and completed gates.

---

## 4. Silent refresh hard rule

Silent refresh is mandatory. Any realtime refresh, manual refresh, fallback refresh, data sync, browser QA rerun, AgentOps sync, memory sync, analytics sync, or AI-driven update must **not** cause page jump, scroll reset, filter reset, sort reset, tab reset, modal close, form edit loss, section collapse, chat/conversation interruption, or visible full-page reload after initial load. Refresh must preserve current user state and update only affected data in place unless Piter explicitly approves different behavior.

**Owner mapping:** `11-scroll-responsive-standard.md`, `13-module-wrapper-rules.md`, `14-page-migration-rules.md`, `15-guardrail-rules.md`; input doc `src/design-system/aixia-refresh-rules.md`.

---

## 5. No local design law rule

Finance and product pages must not define repeated local visual systems. Extend shared components and shared CSS first; pages consume only. Preserve business logic, Supabase, routing, permissions, validation, and handlers unless explicitly requested.

---

## 6. Exact code-instruction rule

Future code edits must use **exact file paths** and **exact full block/section replacements**. No vague anchors like "update the hero section" without naming the file and the precise replacement block. Inspect target file and owner files before editing.

---

## 7. Hermes role

Hermes is AiXia operational memory and agent coordination — **not** a second law source. Hermes must read `aixia-global/` first, know paused states and batch history, prevent repeated mistakes, and route agents to correct owner files. Hermes must not invent design rules, override owners, silently migrate pages, or bypass guardrails.

---

## 8. Current cleanup state

- Global owner files `00`–`16` are the only active design law
- Old `src/design-system/aixia-*-rules.md` files are bannered deprecated references
- `AIXIA_STANDARD.md` thinned in Batch 41 — legacy implementation reference only; **not archive-ready**
- Batch 42 Hermes/memory integration plan complete; Batch 43 tests AgentMemory locally
- No archive/delete executed

---

## 9. Future post-memory resume point

After Hermes/AgentMemory install/test track completes, return to the design cleanup sequence from Batch 40/41 (Hermes manifest update, qa-agent memory mirror refresh, eventual AIXIA_STANDARD archive gates). **Do not jump into page migration.**

Recommended next batch after memory test: **Batch 44 — Hermes manifest/context script update + qa-agent memory mirror refresh.**

---

## 10. Safety restrictions

Never store in AgentMemory:

- Secrets, API keys, Supabase service role keys
- `.env` contents or production credentials
- Private customer/vendor data
- Production-only endpoints
- Outdated qa-agent shell-law reports as current authority

---

## Seed memory entries (for programmatic import)

Each entry below is a discrete `memory_save` unit for Batch 43 recall testing.

### SEED-A — Authority

AiXia active design source of truth is `src/design-system/aixia-global/` owner files 00 through 16 only. ONE STANDARD. ONE OWNER PER ASPECT. ONE GLOBAL DESIGN FOLDER. NO COMPETING DESIGN AUTHORITIES. Memory mirrors law but does not override law. If memory conflicts with aixia-global, aixia-global wins.

### SEED-B — Conflict rule

If AgentMemory or Hermes memory conflicts with any file in src/design-system/aixia-global/, the owner file wins. Memory must cite owner path and be corrected or deleted on conflict.

### SEED-C — Silent refresh

Silent refresh is mandatory: no page jump, scroll reset, filter reset, sort reset, tab reset, modal close, form edit loss, section collapse, chat interruption, or visible full-page reload after initial load. Preserve user state; update affected data in place only. Owners: 11, 13, 14, 15.

### SEED-D — Paused migrations

Page migrations remain PAUSED. AgentOps History migration is NOT approved. Do not migrate pages unless Piter explicitly approves after cleanup gates. Batch 9 finance proofs paused. Command-surface context paused.

### SEED-E — Next step after memory track

After Hermes AgentMemory local test track, next step is Batch 44 Hermes manifest and qa-agent memory mirror refresh pointing to aixia-global. Return to design cleanup from Batch 40/41. Do NOT jump to page migration.

### SEED-F — Design rules in memory only

New design rules must NOT be stored only in memory. Write new or changed design law only into the correct aixia-global owner file 01-16 per 00 section 0.2.

### SEED-G — No local design law

No page-local visual systems for repeated patterns. Extend shared components in src/components/aixia and shared CSS first. Pages consume only.

### SEED-H — AIXIA_STANDARD status

AIXIA_STANDARD.md is thinned legacy implementation reference only after Batch 41. Not active design law. Not archive-ready until Hermes manifest, memory mirrors, dependency checks, stable validation, and Piter approval.

### SEED-I — Hermes role

Hermes is operational memory and agent coordination for AiXia, not a competing law source. Read aixia-global first. Do not invent design rules or silently migrate pages.

### SEED-J — Exact code edits

Code instructions must name exact file paths and exact full replacement blocks. No vague anchors. Inspect owner files and target files before editing.

### SEED-K — Living source-of-truth (Batch 51 seed note — not reseeded in Batch 51)

AiXia design law in src/design-system/aixia-global/ is living law not frozen law. Follow current owner files 00-16 during implementation and QA. Agents must not blindly follow outdated rules when evidence shows gaps. Agents propose improvements with evidence to Piter; they do not silently change law or implementation. Memory and Hermes record proposals and lessons only — not law. Piter approval required before owner files guardrails code CSS schemas workflows or page behavior change. Full loop: 00-README section 0.4.
