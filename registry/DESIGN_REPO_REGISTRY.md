# Design Repository Registry

Design and admin **template repositories** live under `../reference/`. They are **read-only inspiration** for Cursor. They are **not** AiXia source of truth.

**Global rules**

- Design repos are **reference only** — do not treat their README or components as law.
- **Do not copy code directly** into `AiXia-github/src/` or page files.
- **AiXia source of truth always wins:** `src/design-system/aixia-global/` and shared AiXia components (`src/components/aixia/`, `src/styles/aixia-design-system.css`).
- Any useful pattern must be **translated** into shared components and owner-file rules, not pasted page-by-page.
- **Install rule:** `npm` / `pnpm` / `yarn` only inside a specific reference subfolder if Piter approves a local preview — never from `AiXia-github` root for reference deps.
- **Copy rule:** no direct copy; use approved migration plan → shared component → aixia-global update (if needed).

---

## shadcn-admin

| Field | Value |
|-------|--------|
| **GitHub URL** | https://github.com/satnaing/shadcn-admin |
| **Local path** | `../reference/shadcn-admin/` |
| **Stack** | React, Vite, shadcn/ui, Tailwind — closest stack match to AiXia |
| **Best for** | Admin shell density, sidebar/nav patterns, shadcn table/form composition, dashboard card grids, filter bars |
| **Consult when** | New admin-style layout; sidebar behavior; shadcn-aligned table/toolbar patterns; auth-style layout inspiration (not AiXia auth logic) |
| **Do not consult when** | Finance process-book flows; paycheck/expense business rules; Supabase permissions; AiXia-specific modals already in shared components |
| **Compare against AiXia SOT** | `aixia-global` 04 (layout), 07 (components), 12 (tables), 13 (forms), shared `AixiaPage` / `AixiaTable` patterns |
| **Install rule** | Optional `pnpm install` inside reference repo only for local preview |
| **Copy rule** | Translate patterns to `src/components/aixia/` — no raw copy from `reference/shadcn-admin/src` |
| **Status** | active reference-only |

---

## free-react-tailwind-admin-dashboard (tailadmin-react)

| Field | Value |
|-------|--------|
| **GitHub URL** | https://github.com/TailAdmin/free-react-tailwind-admin-dashboard |
| **Local path** | `../reference/free-react-tailwind-admin-dashboard/` |
| **Stack** | React, Tailwind CSS — TailAdmin marketing/dashboard components |
| **Best for** | Tailwind utility layouts, chart/dashboard widget density, marketing-style admin pages |
| **Consult when** | Tailwind spacing/visual rhythm for dashboards; widget card layout; simple list/table chrome (non-Finance) |
| **Do not consult when** | AiXia Finance command pages; registry toolbars with AiXia-specific lifecycle; anything covered by existing finance-visual.css |
| **Compare against AiXia SOT** | `aixia-global` 03 (tokens), 04 (layout), 08 (finance surfaces), `finance-visual.css` |
| **Install rule** | Optional `npm install` inside reference repo only |
| **Copy rule** | Extract **ideas** (spacing, hierarchy) into shared CSS/components — no JSX paste |
| **Status** | active reference-only |

---

## free-tailwind-admin-dashboard-template (tailadmin-multi)

| Field | Value |
|-------|--------|
| **GitHub URL** | https://github.com/Tailwind-Admin/free-tailwind-admin-dashboard-template |
| **Local path** | `../reference/free-tailwind-admin-dashboard-template/` |
| **Stack** | Multi-variant monorepo: React, Next, Vue, Angular, HTML, TanStack, etc. |
| **Best for** | Comparing framework variants; **prefer** `tailwind-admin-reactjs-free/package/` for React-relevant patterns only |
| **Consult when** | Cross-checking TailAdmin layout variants; static HTML/React bundle structure (not for porting Vue/Angular) |
| **Do not consult when** | Default choice over shadcn-admin for React admin UX; importing non-React variants into AiXia |
| **Compare against AiXia SOT** | Same as tailadmin-react; avoid multi-stack drift |
| **Install rule** | Do not install all six variants; at most one `package/` subfolder if preview needed |
| **Copy rule** | No copy from Vue/Angular/HTML variants; React subfolder ideas only via shared components |
| **Status** | active reference-only |

---

## Auto-selection hint (for Cursor)

| Task signal | Primary design repo |
|-------------|---------------------|
| shadcn/ui alignment, dense admin table | shadcn-admin |
| Tailwind dashboard/widget feel | tailadmin-react |
| Unsure / multi-framework browse | tailadmin-multi (React subpath only) |
| Finance / process-book / paycheck | **No design repo** — aixia-global + existing finance components only |

After consulting a design repo, document deltas in `../repo-analysis/comparisons/<repo-id>/` when useful — not in `src/`.
