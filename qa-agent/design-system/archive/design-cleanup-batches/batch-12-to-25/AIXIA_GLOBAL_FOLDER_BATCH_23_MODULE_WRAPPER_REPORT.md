# AiXia Global Folder — Batch 23 Module Wrapper Report

**Date:** 2026-05-30  
**Type:** Source-of-truth owner-file creation (documentation only) — no code/CSS/component/page changes, no file moves/deletes.

---

## Purpose

Create `13-module-wrapper-rules.md` as the single source-of-truth for all AiXia module wrapper rules — what Finance, AgentOps, Calendar, Tasks, Projects, HR, Mail, Inbox, Chat, and future modules may and may not customize; module scope classes; allowed module customization; forbidden module visual law; permission/refresh/workflow UI boundaries; module CSS boundary rules; exception approval; and module wrapper migration/deprecation rules.

---

## Files created

| File | Role |
|------|------|
| `src/design-system/aixia-global/13-module-wrapper-rules.md` | Canonical owner for module wrapper model, allowed/forbidden responsibilities, per-module guidance, collisions, consolidation plan, approved exceptions, migration gates |
| `qa-agent/design-system/AIXIA_GLOBAL_FOLDER_BATCH_23_MODULE_WRAPPER_REPORT.md` | This report |

## Files modified

**None.**

---

## Confirmation scope

| Item | Result |
|------|--------|
| Only `13-module-wrapper-rules.md` created as owner file in this batch | **Yes** |
| Files `14`–`15` created | **No** |
| Code changed | **No** |
| CSS changed | **No** |
| Components changed | **No** |
| Pages changed | **No** |
| Finance patched | **No** |
| AgentOps patched | **No** |
| Guardrails changed | **No** |
| Old files moved/deleted | **No** |
| Deprecation banners added | **No** |

---

## Module wrapper sources audited

- `src/components/aixia/FinancePage.tsx`
- `src/components/aixia/AixiaFinanceCommandDetailPage.tsx`
- `src/components/aixia/AixiaFinanceCommandCreatePage.tsx`
- `src/components/aixia/AixiaCommandPage.tsx`
- `src/components/aixia/AixiaCommandPageLayout.tsx`
- `src/components/aixia/FinanceModuleBridgeLoader.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/styles/finance/finance-visual.css`
- `src/styles/finance/master-data-visual.css`
- `src/styles/calendar/calendar-visual.css`
- `src/styles/chat/chat-visual.css`
- `src/styles/inbox/inbox-visual.css`
- `src/styles/tasks/tasks-visual.css`
- `src/styles/projects/projects-visual.css`
- `src/design-system/aixia-refresh-rules.md`
- `src/design-system/aixia-permission-ui-rules.md`
- `src/design-system/aixia-finance-workflow-registry-contract.md`
- AgentOps routes (`council`, `history`, hub, automation, etc.)
- Tasks/projects page scope classes
- Calendar dual scroll class pattern
- `qa-agent/design-system/AIXIA_UNIFIED_DESIGN_AUTHORITY_PLAN.md`
- `qa-agent/design-system/AIXIA_AGENTOPS_SHELL_PARITY_AND_HERO_DEFAULT_PLAN.md`
- `qa-agent/design-system/AIXIA_P0_LEGACY_FINANCE_SHELL_BRIDGE_PLAN.md`
- `qa-agent/design-system/AIXIA_P0_CALENDAR_SCROLL_AUDIT.md`
- `16-design-file-cleanup-map.md` module wrapper row

---

## Module wrapper collisions identified

1. Finance perceived as separate design law (finance-visual.css hero/hub rules).
2. Finance visual CSS defining hero/meta/card/table values under `.aixia-finance-page`.
3. AgentOps local shell/hero/cards/tables (History, Automation, etc.).
4. AgentOps History using orb/default shell + gradient XL hero.
5. Calendar hero/scroll overrides in calendar-visual.css.
6. Tasks/Projects/Inbox module scroll classes and form mode overrides.
7. Chat visual system outside global primitives (chat-visual.css workspace law).
8. Finance workflow registry contract acting as finance-specific design law.
9. Module CSS owning visual behavior (tasks/projects grid cards, tab styling).
10. Old reports/docs acting as module authority.
11. 13 legacy finance routes on orb shell without FinancePage wrapper.
12. Mixed shell on paycheck-requests detail route.
13. Finance reports page local shell padding/max-width classes.
14. `AixiaFinanceHubMetaStrip` finance naming on shared meta strip pattern.
15. Tasks/projects local grid card systems parallel to navigation cards.

---

## Canonical module wrapper model created

Documented in `13-module-wrapper-rules.md` §5:

- **A.** App chrome wrapper (`DashboardLayout`, bridge loader — not visual law)
- **B.** Global command shell wrapper (`AixiaCommandPage`, `AixiaCommandPageLayout`)
- **C.** Module wrapper layer (Finance reference, AgentOps/Calendar/Tasks/Projects/HR/Mail/Inbox/Chat targets)
- **D.** Module content layer (data/actions into shared primitives only)
- **E.** Module CSS layer (scoped bridge only; exceptions in §14)
- **F.** Module behavior/UI context (permission, refresh, workflow — not visual law)

Core principle locked verbatim in §2.

---

## Wrapper/component strategy documented

- Wrappers must be thin — data + scope class + bridge import only.
- `FinancePage` is canonical delegation example.
- `AixiaCommandPage` / `AixiaCommandPageLayout` are global command shell.
- Finance command detail/create pages are composition templates — generalize later.
- AgentOps needs thin wrapper delegating to command shell — not parallel visual system.
- Module CSS must become scoped bridge or migrate to global owners.
- Workflow registry components are shared — finance contract must generalize.

---

## Forbidden module wrapper patterns documented

- No module-specific design law in any module.
- No new module visual folders for standards.
- No module CSS with global selectors or visual aspect ownership.
- No wrapper redefining any global owner aspect (01–12).
- No treating Finance/AgentOps/Calendar/Tasks/Projects/HR/Mail/Inbox/Chat as design law.
- No reports as design law.
- No local visual patches on individual pages.
- No orb shell on new authenticated module routes.

---

## Confirmation: no implementation changes

| Area | Changed |
|------|---------|
| Page code | **No** |
| CSS | **No** |
| Components | **No** |
| File moves/deletes | **No** |
| Deprecation banners | **No** |
| Guardrails | **No** |
| Finance | **No** |
| AgentOps | **No** |
| Page migrations | **Paused** |
| Batch 9 finance proofs | **Paused** |
| Command-surface context | **Paused** |

---

## Next recommended batch

After Piter reviews and approves `13-module-wrapper-rules.md`, create:

**`14-page-migration-rules.md`**

Do **not** recommend page migration execution, command-surface context, finance route proof work, CSS split, or old-file deletion yet.

---

## Validation

Run: `npm run qa:validate-foundation` — see final check in batch completion message.
