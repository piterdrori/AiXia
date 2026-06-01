# AiXia QA Agent Next Phases

Future implementation must proceed **one phase at a time** (or one small part of a phase per prompt). Do not skip ahead to browser automation, Supabase test users, MCP tools, or SaaS billing before the foundation and static discovery layers are stable.

---

## Phase 1 — Foundation docs

**Status:** Complete.

**Includes:**

- Issue taxonomy (`qa-agent/qa-issue-taxonomy.md`)
- Agent council (`qa-agent/qa-agent-council.md`)
- AI access boundaries (`qa-agent/ai-access-boundary.md`)
- Personal AI memory and tool rules (`qa-agent/personal-ai-memory-and-tools.md`)
- SaaS readiness rules (`qa-agent/saas-readiness-council.md`)
- Configuration docs (`qa-config-overview`, `qa-user-roles`, `qa-route-registry`, `qa-review-panel-map`, `ai-function-access-map`)
- Report templates (`qa-agent/templates/`)
- JSON registries (`qa-agent/registry/`)
- Validation script (`qa-agent/scripts/validate-qa-foundation.mjs`)
- Sample report generator (`qa-agent/scripts/generate-sample-qa-report.mjs`)
- Master index (`qa-agent/README.md`, `FOUNDATION_INDEX.md`, this file)

**Safe commands:** `npm run qa:validate-foundation`, `npm run qa:sample-report`

---

## Phase 2 — Static app discovery

**Status:** Complete (read-only scripts and reports).

**Goal:** Create read-only scripts that scan the app folder and discover routes, components, and imports **without** running the website.

**Should include:**

- Discover route files (e.g. under `src/app` or project routing convention)
- Compare discovered routes against `qa-agent/registry/route-groups.json`
- Identify likely modules (Core, Finance, HR, AI, SaaS)
- Identify imports from shared AiXia components
- Detect obvious forbidden imports (e.g. `@/components/ui` on Finance pages per project rules)
- Generate a static discovery report under `qa-agent/reports/`

**Must not:**

- Modify app files
- Connect to Supabase
- Run browser tests
- Install Playwright
- Change business logic, permissions, or routes in the app

---

## Phase 3 — Static design-system guardrails

**Status:** Complete (read-only scanner, action plan generator, classified reports).

**Goal:** Read-only guardrail scripts for AiXia source-of-truth rules.

**Should include:**

- Detect page-local card, table, modal, or button systems
- Detect forbidden UI imports
- Detect local Tailwind-heavy design systems on standardized pages where patterns exist
- Detect missing shared component usage where heuristics are reliable
- Generate a guardrail report under `qa-agent/reports/`

**Must not:** Auto-fix app code without an approved implementation task.

---

## Phase 4 — Browser QA setup

**Goal:** Install and configure Playwright when explicitly approved for that phase.

**Should include:**

- Playwright config
- Safe local or staging base URL support
- Screenshot, video, and trace output folders under `qa-agent/` or a dedicated test artifacts path
- No production write tests

**Must not:** Run destructive or data-mutating tests in production.

---

## Phase 5 — Read-only browser smoke tests

**Goal:** Test page loading, routes, console errors, screenshots, and responsive viewports.

**Should include:**

- Smoke navigation for allowed roles (staging first)
- Console and network error capture
- Viewport snapshots

**Must not:**

- Create, edit, archive, or delete records in initial smoke pass
- Run destructive tests
- Use production for anything beyond read-only unless explicitly approved

---

## Phase 6 — Synthetic user auth setup

**Goal:** Define controlled test users in **staging only**.

**Should include:**

- Auth storage states per synthetic role
- Role-based sessions aligned with `qa-agent/registry/synthetic-roles.json`
- Documentation for credential handling (never commit secrets)

**Must not:**

- Create production synthetic write users without explicit approval
- Store secrets in the repository

---

## Phase 7 — Functional workflow tests

**Goal:** Test buttons, forms, modals, tabs, search/filter/sort, archive flows, and create/edit draft flows in staging.

**Should include:**

- Evidence aligned with `qa-agent/templates/issue-report-template.md`
- Council routing per `qa-agent/qa-review-panel-map.md`

**Must not:** Bypass archive or permission standards for convenience.

---

## Phase 8 — Logic and permission tests

**Goal:** Test employee visibility, finance viewer restrictions, HR privacy, tenant boundaries, and AI access boundaries.

**Should include:**

- Role matrix tests from `qa-agent/qa-user-roles.md`
- Logical issues per `qa-agent/qa-issue-taxonomy.md`

**Must not:** Weaken RLS or permission checks in tests to make tests pass.

---

## Phase 9 — AI/MCP readiness audits

**Goal:** Evaluate which functions can be explained, navigated, drafted, executed after confirmation, or must never be exposed to AI.

**Should include:**

- Reports using `qa-agent/templates/ai-mcp-readiness-report-template.md`
- Classification against `qa-agent/registry/ai-access-levels.json`

**Must not:** Ship real MCP tools without security and audit review.

---

## Phase 10 — Personal AI memory and productivity audits

**Goal:** Evaluate personal AI maturity, memory controls, document/PDF/image tools, voice/avatar UX, and user-specific boundaries.

**Should include:**

- Reports using `qa-agent/templates/personal-ai-review-template.md`
- Scoring against `personal-ai-maturity` in `qa-agent/registry/readiness-scores.json`

**Must not:** Cross user or tenant memory boundaries.

---

## Phase 11 — SaaS readiness audits

**Goal:** Evaluate tenant isolation, onboarding, billing/plan logic, feature flags, analytics, and customer success readiness.

**Should include:**

- Reports using `qa-agent/templates/saas-readiness-report-template.md`
- Scoring against `saas-readiness` in `qa-agent/registry/readiness-scores.json`

**Must not:** Approve features that break tenant isolation.

---

## Phase 12 — GitHub Actions / scheduled QA

**Goal:** Run safe validation, sample/static reports, and eventually browser QA on a schedule.

**Should include:**

- `qa:validate-foundation` on every relevant CI run
- Static discovery and guardrail reports when Phase 2–3 exist
- Playwright jobs only after Phases 4–7 are defined and staging-safe

**Must not:** Schedule production write tests without explicit policy.

---

## Phase 13 — AgentOps Productization

**Status:** Specification started.

AgentOps is the Owner-only in-app system where the 12 combined agents, Hermes, CodeGraph, and browser QA maintain an **Active Top 10** queue for Piter. See `qa-agent/agentops/`.

**Rule:** Implement **one subphase per prompt**. Do not jump ahead to SQL, UI, browser runner, or cron until earlier subphases are stable and approved.

| Subphase | Description | Status |
| --- | --- | --- |
| **13A** | AgentOps product specification (`AGENTOPS_*.md` suite) | **Complete** |
| **13B** | Foundation index + data model approval pack (`README`, approval checklist, implementation sequence) | **Current** |
| **13C** | AgentOps Supabase schema + RLS | **Future** — only after Piter approves the data model |
| **13D** | AgentOps read-only service layer | **Future** |
| **13E** | AgentOps UI shell at `/system/agent-ops` | **Future** |
| **13F** | Owner feedback + Mark Fixed flow | **Future** |
| **13G** | Targeted verification queue | **Future** |
| **13H** | Browser QA runner integration | **Future** |
| **13I** | Hermes memory/focus directive integration | **Future** |
| **13J** | CodeGraph source mapping integration | **Future** |
| **13K** | Daily scheduler / cron | **Future** — only after manual and read-only flows are stable |

**13C gate:** Piter completes `qa-agent/agentops/AGENTOPS_DATA_MODEL_APPROVAL_CHECKLIST.md` before any SQL migration.

**13K gate:** No scheduled daily runs until UI (13E), owner actions (13F), and verification (13G) work manually.

---

## Rule for all future prompts

**Implement only one phase—or one small, bounded part of a phase—per task.**

Before starting a new phase:

1. Run `npm run qa:validate-foundation`
2. Read `qa-agent/README.md` and the phase section in this file
3. Confirm scope, non-changes, and safety rules in the task description
