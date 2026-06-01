# AgentOps UI Route and Layout Inspection

## Purpose
Confirm where the AgentOps read-only UI page route and `DashboardLayout` navigation entry should be implemented after Stage 3 (`src/lib/agentops/*`). This is inspection only — no UI, routing, or layout code was changed.

---

## Routing System Found

**Primary system:** **React Router v6** (`BrowserRouter`, `Routes`, `Route`, `Navigate`, `ProtectedRoute`) in `src/App.tsx`.

**Page file convention:** **Mixed structure**
- Page components live under `src/app/**/page.tsx` (Next-like folder naming).
- Routes are **not** auto-discovered; each page is **imported and registered manually** in `src/App.tsx`.
- Authenticated app pages are wrapped as:

```tsx
<Route
  path="/example"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <ExamplePage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>
```

There is **no** Next.js App Router file-based routing. This is a **Vite + React SPA**.

### Relevant files inspected

| File | Role |
|------|------|
| `src/App.tsx` | Central route registry, `ProtectedRoute`, `PublicRoute`, auth context, wraps most app pages in `DashboardLayout` |
| `src/lib/permissions.ts` | `canAccessRoute()`, `ROUTE_PERMISSIONS`, role/permission maps |
| `src/components/layout/DashboardLayout.tsx` | Sidebar nav (`navItems`), header, notifications, profile load |
| `src/app/dashboard/components/DashboardWorkspaceRail.tsx` | Secondary workspace shortcuts (mirrors some nav links) |
| `src/lib/agentops/service.ts` | `getAgentOpsOwnerStatus()` and read-only queries |
| `src/lib/agentops/index.ts` | Public AgentOps exports |
| `src/app/ai-management/page.tsx` | Closest existing “system/admin studio” page pattern (`AixiaPage` + `AixiaHero`) |
| `src/app/finance/page.tsx` | Finance permission gating pattern (in-page, not route-only) |
| `qa-agent/agentops/AGENTOPS_UI_SPEC.md` | Specifies `/system/agent-ops` |
| `qa-agent/agentops/AGENTOPS_STAGE_3_SERVICE_LAYER_REPORT.md` | Stage 3 complete |

### `/system` routes today
**None.** `src/app/system/` does not exist. AgentOps will be the first `/system/*` route.

### Closest existing patterns

| Pattern | Route | Nav visibility | Route guard |
|---------|-------|----------------|-------------|
| AI Management | `/ai-management` (+ children) | **Always** in `DashboardLayout` nav (no permission spread) | `ProtectedRoute` only; **not** in `ROUTE_PERMISSIONS` → any authenticated user can open URL |
| Finance | `/finance` (+ children) | Shown when `effectivePermissions.accessFinance` | `ROUTE_PERMISSIONS` + `canAccessRoute` → non-permitted users **redirect to `/dashboard`** |
| Employees | `/employees` | Shown when `effectivePermissions.viewEmployeeDirectory` | Permission-based route rules |

**Important for AgentOps:** Do **not** reuse `role === 'admin'` or finance permissions. Owner access is **`agentops_owners` allowlist** via `getAgentOpsOwnerStatus()` / RLS, not `permissions.ts` admin flags.

---

## Recommended AgentOps Route

**Route:** `/system/agent-ops`

**Why this route (confirmed):**
1. Documented in `AGENTOPS_UI_SPEC.md` and `qa-agent/agentops/README.md`.
2. Separates platform Owner QA from `/ai-management` (Personal AI / studio config) and `/finance`.
3. Leaves room for future system routes under `/system/*` without colliding with business modules.
4. Matches analytics module naming intent (`moduleFromPath` can add `/system` later if desired — optional, not required for MVP shell).

**Alternatives considered (not recommended):**
| Route | Reason to avoid |
|-------|-----------------|
| `/ai-management/agent-ops` | Wrong domain; AI Management is visible to all authenticated users today |
| `/qa-agent` or `/agent-ops` | Not aligned with spec; `/qa-agent` collides with repo docs folder mentally |
| `/admin/agent-ops` | Implies all admins; AgentOps is **Owner allowlist only** |

---

## AgentOps Page File Recommendation

**Recommended page path:**

`src/app/system/agent-ops/page.tsx`

**Why:**
- Matches existing convention: `src/app/<segment>/page.tsx`.
- Parallel to `src/app/ai-management/page.tsx`, `src/app/finance/page.tsx`, `src/app/settings/page.tsx`.
- No `src/pages/` directory is used in this project.

**Optional future detail route (not Stage 4):**

`src/app/system/agent-ops/findings/[id]/page.tsx` — only when finding detail UI is approved; Stage 4 shell can use in-page panels or defer.

**Registration in `src/App.tsx` (next prompt):**

```tsx
import AgentOpsPage from "@/app/system/agent-ops/page";

<Route
  path="/system/agent-ops"
  element={
    <ProtectedRoute>
      <DashboardLayout>
        <AgentOpsPage />
      </DashboardLayout>
    </ProtectedRoute>
  }
/>
```

Do **not** add `/system/agent-ops` to `ROUTE_PERMISSIONS` unless a deliberate decision is made to map it to a generic permission. That would incorrectly treat “admin” or “manageUsers” as AgentOps access. **Page-level + nav-level `getAgentOpsOwnerStatus()` is the correct gate.**

---

## DashboardLayout Role

**Yes — `src/components/layout/DashboardLayout.tsx` is the correct place for the sidebar menu entry.**

It owns:
| Concern | How today | AgentOps recommendation |
|---------|-----------|---------------------------|
| Sidebar / menu links | `navItems` `useMemo` (~line 754) | Add conditional item when Owner check passes |
| Icon + label | `NavItem` `{ label, icon, href }` | e.g. `ShieldCheck` or `Gauge`, label **AgentOps** |
| Menu group placement | Flat list after Finance block | Place **after Finance** (if visible) and **before or after AI Management** — recommend **after AI Management**, before Settings, as a “system” item |
| Owner-only visibility | Finance uses `effectivePermissions?.accessFinance` spread | Use **`getAgentOpsOwnerStatus()`** async state (e.g. `agentOpsIsOwner`), **not** `isAdminRole` or `manageUsers` |
| Active nav state | `isActive(href)` uses `location.pathname.startsWith(href)` | Works for `/system/agent-ops` |

**Also update (optional but consistent):** `src/app/dashboard/components/DashboardWorkspaceRail.tsx` — duplicates Finance / AI Management shortcuts; add AgentOps shortcut only when `agentOpsIsOwner` if dashboard rail should stay in sync.

**DashboardLayout does NOT:**
- Register routes (that is `App.tsx`).
- Enforce page access by itself (nav hide is UX only; page must still gate).

---

## Access Gate Recommendation

### Layered model (required)

| Layer | Mechanism | AgentOps behavior |
|-------|-----------|-------------------|
| 1. Auth | `ProtectedRoute` in `App.tsx` | Must be logged in |
| 2. App route permissions | `canAccessRoute` in `permissions.ts` | **No entry** for `/system/agent-ops` → authenticated users can hit URL (same as `/ai-management` today) |
| 3. **AgentOps Owner** | `getAgentOpsOwnerStatus()` on page load | **Required** — if `isOwner === false`, show access denied UI (do not render data panels) |
| 4. Nav visibility | `DashboardLayout` conditional `navItems` | Hide link unless `isOwner === true` |
| 5. Database | RLS + `agentops_is_owner()` | Final enforcement; non-owner gets empty data / errors from service |

### Page behavior (next prompt)
1. On mount: `getAgentOpsOwnerStatus()`.
2. While loading: use existing `PageLoader` pattern (see dashboard / finance pages).
3. If not owner: **`AixiaEmptyState`** or **`AixiaInfoBlock`** with clear “Owner-only” message — **prefer in-page denied state** over silent redirect, so direct URL navigation is understandable. Redirect to `/dashboard` is acceptable as secondary action button only.
4. If owner: call read-only services (`getAgentOpsDashboardSummary`, `getAgentOpsActiveTop10`, `getAgentOpsBacklogSummary`).
5. **Do not** expose menu entry to non-owners (including other admins not on `agentops_owners`).
6. **Do not** rely on hidden menu alone.

### What NOT to use
- `isAdminRole()` / `role === 'admin'` for AgentOps UI or nav.
- `effectivePermissions.manageUsers` or finance permissions.
- Service role / RLS bypass.
- New SQL or `permissions.ts` changes unless explicitly approved later.

---

## Shared UI Components To Use Later

From `src/components/aixia/index.ts` and `AGENTOPS_UI_SPEC.md`:

| Component | Stage 4 use |
|-----------|-------------|
| `AixiaPage` | Shell with `surface="command"` and `className="aixia-command-page"` (same as AI Management) |
| `AixiaHero` | Command hero — metrics via `AixiaCommandMetrics` |
| `AixiaCommandMetrics` | Active Top 10 count, open slots, backlog, critical, verification pending, Hermes score |
| `AixiaMetricGrid` / `AixiaMetricCard` | Secondary metrics in scroll body if not all in hero |
| `AixiaSection` | Active Top 10, backlog preview, Hermes panel sections |
| `AixiaTableShell` | Active Top 10 table (`variant="registry"` or default) |
| `AixiaStatusBadge` | Severity / status on finding rows |
| `AixiaBadge` | Category / agent labels |
| `AixiaButton` | Refresh only (read-only shell) |
| `AixiaInfoBlock` | Hermes status panel, MVP database-only notes |
| `AixiaEmptyState` | No findings / access denied |
| `AixiaValueBlock` | Hermes detail fields |
| `AixiaWorkspaceCard` | Optional backlog preview cards |
| `PageLoader` / `PageError` | Loading and error states (`@/components/ui/`) |
| `usePageTitle` | `AgentOps · AiXia` tab title |

**Do not use:** `FinancePage` (finance-specific shell).

---

## Implementation Scope For Next Prompt

**Stage 4 — read-only AgentOps UI shell**

1. Create `src/app/system/agent-ops/page.tsx`:
   - Owner gate via `getAgentOpsOwnerStatus()`.
   - Load `getAgentOpsDashboardSummary()`, `getAgentOpsActiveTop10()`, `getAgentOpsBacklogSummary()`.
   - Render Command Hero (metrics + Hermes default 8/100 Learning unless run metadata overrides).
   - Active Top 10 table (read-only rows).
   - Backlog summary preview (count + up to 10 rows).
   - Hermes status info block (database-only MVP copy).
   - Refresh button re-fetches only (no writes).

2. Register route in `src/App.tsx` with `ProtectedRoute` + `DashboardLayout`.

3. Update `DashboardLayout.tsx`:
   - `useEffect` + `getAgentOpsOwnerStatus()` when profile loaded.
   - Add nav item `{ label: "AgentOps", href: "/system/agent-ops", icon: ShieldCheck }` only when `isOwner`.

4. **Explicitly out of scope:**
   - Write actions, mark fixed, feedback, verification runner, prompts, browser automation, Hermes runtime, finding detail route (unless trivial read-only link placeholder).

---

## Files To Modify In Next Prompt

| File | Change |
|------|--------|
| `src/app/system/agent-ops/page.tsx` | **Create** — read-only UI shell |
| `src/App.tsx` | Import + `<Route path="/system/agent-ops" ...>` |
| `src/components/layout/DashboardLayout.tsx` | Owner-gated nav item + optional owner state |
| `src/app/dashboard/components/DashboardWorkspaceRail.tsx` | **Optional** — mirror AgentOps shortcut for owners |

**Do not modify:** `src/lib/agentops/*` unless a small helper hook is justified (prefer inline page logic first).

---

## Files Not To Modify

- Database / SQL / migrations / Supabase policies
- `supabase/migrations/*`
- API routes, Edge Functions, Vercel Cron
- Playwright / browser tests
- Hermes / CodeGraph runtime automation
- Finance / HR business logic
- `src/lib/permissions.ts` (unless later explicit Owner route policy — not recommended for MVP)
- Unrelated components or CSS files

---

## Final Recommendation

**Proceed with `/system/agent-ops` UI shell and DashboardLayout menu entry**

Conditions:
- Menu entry gated by `getAgentOpsOwnerStatus()`, not admin role.
- Page gated independently with access-denied UI.
- Read-only service calls only.
- Route registered in `App.tsx` following existing `ProtectedRoute` + `DashboardLayout` pattern.

---

## Inspection metadata

- **Date:** 2026-05-27
- **Staging AgentOps DB:** validated (see `AGENTOPS_STAGING_MIGRATION_VALIDATION.md`)
- **Stage 3 service:** complete (`AGENTOPS_STAGE_3_SERVICE_LAYER_REPORT.md`)
