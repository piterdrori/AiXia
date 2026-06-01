# AiXia Global Design System — Batch 36 — Downgrade AIXIA_STANDARD to Secondary Legacy Sync Check

**Date:** 2026-05-30  
**Scope:** Guardrail read-path ordering + message wording only — **zero behavior change at 13/13 coverage**

---

## 1. Purpose

Batch 35 added parallel owner-file phrase checking alongside the legacy `AIXIA_STANDARD.md` check. Batch 36 completes read-path dependency reduction by:

1. Making `inspectGlobalOwnerPhraseAnchors()` the **primary** phrase coverage check (runs first).
2. Downgrading `inspectSharedStandardDocument()` to **secondary legacy sync** (comments + warning text only).
3. Preserving warn-only tier, all 13 phrases, and both checks when phrases are present.

---

## 2. Files modified

| File | Change |
|------|--------|
| `scripts/aixia-guardrails.mjs` | Reordered checks; updated primary/secondary comments and warning messages |
| `src/design-system/aixia-global/16-design-file-cleanup-map.md` | §4.4, §4.8, §7 Batch 36 status |

## Files created

| File |
|------|
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_36_AIXIA_STANDARD_SECONDARY_SYNC_REPORT.md` |

**Not modified:** `AIXIA_STANDARD.md`, `package.json`, owner phrase anchors, allowlists, pages, CSS, components.

---

## 3. Baseline results before edits

| Metric | Result |
|--------|--------|
| Owner phrase coverage | **13/13 PASS** |
| `qa:validate-foundation` | **PASS** |
| `qa:static-design-guardrails` | **185 findings** |
| `qa:guardrail-action-plan` | **PASS** |
| `npm run build` | **PASS** |
| Hard errors | **0** |
| Build warnings (approx.) | **~195** |
| Owner phrase warnings | **0** |
| AIXIA_STANDARD phrase warnings | **0** |

---

## 4. Results after edits

| Metric | Result |
|--------|--------|
| Owner phrase coverage | **13/13 PASS** |
| `qa:validate-foundation` | **PASS** |
| `qa:static-design-guardrails` | **185 findings** (unchanged) |
| `qa:guardrail-action-plan` | **PASS** |
| `npm run build` | **PASS** |
| Hard errors | **0** |
| Build warnings (approx.) | **~195** (unchanged) |
| Owner phrase warnings | **0** |
| AIXIA_STANDARD phrase warnings | **0** |
| New warnings introduced | **No** |

---

## 5. Owner-file phrase check — primary status

| Aspect | Batch 36 state |
|--------|----------------|
| Function | `inspectGlobalOwnerPhraseAnchors()` |
| Run order | **First** in `main()` (before legacy check) |
| Read path | `src/design-system/aixia-global/` via `runOwnerPhraseCoverageReport()` |
| Missing phrase message | *Canonical aixia-global/ owner file is missing required guardrail phrase anchor… Primary read path: …* |
| Tier | Warn-only (`addError`) |
| Hard errors | **None** |

---

## 6. AIXIA_STANDARD — secondary legacy sync status

| Aspect | Batch 36 state |
|--------|----------------|
| Function | `inspectSharedStandardDocument()` — **preserved** |
| Run order | **Second** (after primary owner check) |
| Role | Secondary legacy implementation sync bridge |
| Missing phrase message | *AIXIA_STANDARD.md (secondary legacy sync bridge) is missing phrase… Legacy compatibility warning only; primary phrase coverage reads aixia-global/ owner files.* |
| Tier | Warn-only (`addError`) — unchanged |
| File removed | **No** |
| Phrases removed | **No** |

---

## 7. Confirmation — phrase list unchanged

Both functions retain the same 13 inline strings in `inspectSharedStandardDocument()`. No rename, removal, or text change to required phrases.

---

## 8. Confirmation — AIXIA_STANDARD check preserved

- `inspectSharedStandardDocument()` still runs on every build.
- Still validates all 13 phrases in `AIXIA_STANDARD.md`.
- Still uses `addError` / warn-only tier.
- `REQUIRED_AIXIA_COMPONENT_FILES` unchanged.

---

## 9. Confirmation — no warning/hard-error behavior changed

At current 13/13 coverage:

- **0** new warnings vs baseline.
- **0** hard errors before and after.
- Allowlists unchanged.
- Static scan count unchanged (185).
- Only delta: check **order** and **message wording** when warnings would fire (none fire today).

---

## 10. Cleanup map update summary

Updated `16-design-file-cleanup-map.md`:

- **§4.4** — Batch 36: owner primary, `AIXIA_STANDARD.md` secondary; not archive-ready.
- **§4.8** — Runner row reflects primary/secondary split.
- **§7 step 11** — Owner read primary / legacy secondary recorded.

Classifications unchanged. **Not** marked archive-ready.

---

## 11. Remaining dependency on AIXIA_STANDARD.md

| Dependency | Status |
|------------|--------|
| Secondary phrase sync | Still active (warn-only) |
| Primary phrase sync | **Owner files** (`aixia-global/`) |
| File existence | Still in `REQUIRED_AIXIA_COMPONENT_FILES` |
| Appendix phrases | Still required for secondary check |
| Archive readiness | **Not ready** — secondary check + component index remain |
| Hermes manifest | Still lists path (unchanged) |

---

## 12. Recommended next batch

### **Batch 37 — AIXIA_STANDARD thinning readiness audit**

With primary read path on owner files and stable builds:

1. Audit what still references `AIXIA_STANDARD.md` (guardrails, Hermes, memory, components folder proximity).
2. Define safe appendix removal criteria while keeping secondary sync or single drift warning.
3. **Do not thin or archive** until audit + Piter approval.

**Alternates:** qa-agent old authority banner/archive plan; owner-file implementation alignment plan.

**Do not recommend yet:** page migration, AgentOps History, finance shell proofs, command-surface context, CSS split, file deletion, guardrail hard-error escalation.

---

## Final check

| # | Item | Result |
|---|------|--------|
| 1 | Files created | Batch 36 report |
| 2 | Files modified | `aixia-guardrails.mjs`, `16-design-file-cleanup-map.md` |
| 3 | Code behavior changed | **No** |
| 4 | CSS changed | **No** |
| 5 | Pages changed | **No** |
| 6 | Components changed | **No** |
| 7 | Guardrail build behavior changed | **No** (0 new warnings) |
| 8 | Package scripts changed | **No** |
| 9 | AIXIA_STANDARD.md checks preserved | **Yes** |
| 10 | AIXIA_STANDARD.md changed | **No** |
| 11 | Required phrases changed/renamed | **No** |
| 12 | Owner-file phrase check primary | **Yes** |
| 13 | AIXIA_STANDARD secondary legacy sync | **Yes** |
| 14 | Owner phrase coverage | **13/13 Yes** |
| 15 | New warnings introduced | **No** |
| 16 | Cleanup map updated | **Yes** |
| 17 | Old files moved/deleted/archived | **No** |
| 18 | Page migrations remain paused | **Yes** |
| 19 | Batch 9 finance proofs paused | **Yes** |
| 20 | Command-surface context paused | **Yes** |
| 21 | Command results | All PASS (see §4) |
| 22 | Final status | **Batch 36 complete** |
| 23 | Recommended next batch | **Batch 37 — AIXIA_STANDARD thinning readiness audit** |
