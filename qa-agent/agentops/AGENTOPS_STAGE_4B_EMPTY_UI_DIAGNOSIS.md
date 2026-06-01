# AgentOps Stage 4B Empty UI Diagnosis

## Problem

The AgentOps UI at `http://localhost:5173/system/agent-ops` loads the Owner-gated Control Center shell but shows **no Stage 4B sample data** after the staging seed reported success. Metrics and tables are empty despite SQL verification on staging showing 1 run, 5 active findings, and 3 backlog findings.

## Screenshot Observation

Reported UI state (manual / screenshot):

| Metric | Observed | Expected (Stage 4B) |
|--------|----------|----------------------|
| Active Top 10 | **0** | 5 |
| Open slots | **10** | 5 |
| Backlog | **0** | 3 |
| Critical open | **0** | 1 |
| Last run | **No runs yet** | 1 completed sample run |
| Hermes | **8 / 100 Learning** (default) | 8 / 100 Learning from sample run metadata |

**Interpretation:** `openSlots = 10 - activeOpenCount` implies `getAgentOpsDashboardSummary()` **completed without error** and returned `activeOpenCount = 0`. Hermes showing default values is consistent with `latestRun = null` (no run returned to the client). The page is **not** showing the access-denied empty state, so `getAgentOpsOwnerStatus()` likely returned `isOwner: true` for the browser session on whatever Supabase project the app is using at runtime.

---

## Environment Check

| Item | Result |
|------|--------|
| Local app URL | `http://localhost:5173/system/agent-ops` |
| `.env.local` comment | Local dev → aixia-staging |
| `VITE_SUPABASE_URL` host | `ydppcpbxrvvardeslzrk.supabase.co` |
| Frontend Supabase project ref (from `.env.local`) | `ydppcpbxrvvardeslzrk` |
| Expected staging ref | `ydppcpbxrvvardeslzrk` |
| **Config file match** | **Yes** |

**Caveat:** Vite injects `import.meta.env` at **dev-server start**. If `npm run dev` was started before `.env.local` was pointed at staging, the browser may still be calling a **different** Supabase URL until the dev server is restarted. `.env.local` also notes Vercel development env was previously pointed at production — a stale dev process or stale `taskflow-auth` session is a common cause of this mismatch.

**Runtime confirmation:** Not verified in-browser (see Browser Console/Network Check). **Manual step required:** confirm Network requests go to `ydppcpbxrvvardeslzrk.supabase.co`, not another project ref.

---

## Database Sample Data Check

Read-only SQL on **aixia-staging** (`ydppcpbxrvvardeslzrk`) via Supabase MCP `execute_sql` (bypasses RLS; same DB Stage 4B used).

| Check | Result |
|-------|--------|
| Sample data exists | **Yes** |
| `agentops_runs` count | **1** |
| Active open count (`active_top_10`, non-closed status) | **5** |
| Backlog count (`queue_state = backlog`) | **3** |
| Sample backlog rows (`AIXIA-SAMPLE-BACKLOG%`) | **3** |
| Critical open (active queue, severity Critical) | **1** (per Stage 4B doc; SQL active_open=5 includes SAMPLE-001) |

**Sample issue codes (expected):**

- Active: `AIXIA-SAMPLE-001` … `AIXIA-SAMPLE-005` — status `Active Top 10`, ranks 1–5
- Backlog: `AIXIA-SAMPLE-BACKLOG-001` … `003`

**Sample run ID (Stage 4B):** `392f45fb-bbab-402c-8b01-d63d6f24c59b`

**RLS simulation (authenticated as bootstrap owner `2826e36f-22ad-4403-bad5-57b85e011d88`):**

| Check | Result |
|-------|--------|
| `agentops_is_owner()` | **true** (in transaction test) |
| Findings visible | **8** (5 active + 3 backlog) |
| Active `active_top_10` visible | **5** |
| Runs visible | **1** |

**Conclusion:** Sample data is present and readable under Owner RLS on staging. Seed did **not** fail or roll back on the staging project.

---

## Owner/Auth Check

| Item | Result |
|------|--------|
| `agentops_owners` rows | **1** active row |
| Bootstrap owner `user_id` | `2826e36f-22ad-4403-bad5-57b85e011d88` (Piter Drori) |
| Browser user is Piter/owner | **Unknown** (no browser session inspected) |
| Owner row exists for current browser user | **Unknown** |

**Code behavior:**

- Page gate: `getAgentOpsOwnerStatus()` → `supabase.rpc('agentops_is_owner')`
- Non-owners see **“AgentOps is Owner-only”** — not the Control Center metrics
- Observed Control Center with zeros ⇒ RPC returned **`true`** for the **current browser JWT** on the **project the app is calling**

If the browser user is **not** `2826e36f-…` but still sees the Control Center, they must be an owner on **that** project’s `agentops_owners` table (only one row on staging). If they are **not** an owner, they should see access denied — unless they are on a different project where another owner row exists (unlikely on staging).

---

## Service Query Check

### Code inspection (`src/lib/agentops/service.ts`)

| Function | Filters / notes |
|----------|-----------------|
| `getAgentOpsOwnerStatus` | RPC `agentops_is_owner` |
| `getAgentOpsDashboardSummary` | `activeTop10CountQuery()`, backlog count, critical count, verifications, `getAgentOpsLatestRun()` |
| `getAgentOpsActiveTop10` | `queue_state = active_top_10` + `.not("status", "in", CLOSED_STATUS_FILTER)` |
| `getAgentOpsBacklogSummary` | `queue_state = backlog` |
| `getAgentOpsRunHistory` | `agentops_runs` ordered by `started_at` |

Closed filter string:

```text
("Verified Fixed","Rejected","Deferred","False Positive","Archived")
```

Sample rows use `status = 'Active Top 10'` — **not** in the closed list. Status casing matches DB check constraint values.

### PostgREST filter test (staging, service role — bypasses RLS only)

Executed locally with `@supabase/supabase-js` against `VITE_SUPABASE_URL` from `.env.local` (no secrets logged):

| Query | Count | Error |
|-------|------:|-------|
| Active + closed-status `.not("status", "in", …)` | **5** | none |
| Active without closed filter | **5** | none |
| Runs | **1** | none |

**Service filter bug:** **Ruled out** — same filters return 5 active rows on staging when RLS is bypassed.

### Anon session (no browser login)

| Query | Count | `agentops_is_owner` |
|-------|------:|---------------------|
| Active / backlog / runs | **0** | **false** |

Expected RLS behavior.

### Authenticated owner session (browser-equivalent)

**Not executed** — requires Piter’s live JWT from the browser. Anon cannot reproduce owner reads.

### UI error handling (`src/app/system/agent-ops/page.tsx`)

- If any service returns `error`, page sets `dataError` and clears dashboard data.
- Observed **zeros without reported error banner** ⇒ queries returned **success with empty counts**, not thrown/PostgREST errors.

---

## Browser Console/Network Check

| Item | Result |
|------|--------|
| Performed | **No** (task constraint: no browser automation) |
| Console errors | **Unknown** — manual check required |
| Network: Supabase host | **Unknown** — confirm `ydppcpbxrvvardeslzrk.supabase.co` |
| 401/403 / RLS errors | **Unknown** |
| `agentops_findings` / `agentops_runs` response rows | **Unknown** |

**Manual checklist for Piter:**

1. DevTools → Network → filter `supabase` → confirm request host ref.
2. Check responses for `agentops_findings?select=` — body should list 5+ rows if session is Owner on staging.
3. Check `rpc/agentops_is_owner` — should be `true`.
4. Console: `await supabase.auth.getUser()` (or app profile) — `id` should be `2826e36f-22ad-4403-bad5-57b85e011d88` when testing as bootstrap owner.
5. If host is wrong: stop dev server, restart `npm run dev`, hard refresh.
6. If host is correct but rows empty: sign out, clear `localStorage` key `taskflow-auth`, sign in again to **staging** credentials.

---

## Root Cause

**Primary (most likely): Frontend runtime and/or auth session is not reading the seeded staging database as the bootstrap Owner, despite `.env.local` pointing at staging.**

Evidence:

1. Staging DB **has** sample data and Owner RLS allows reads (SQL + JWT simulation).
2. Service-layer PostgREST filters **work** on staging (count 5 / 1 with service-role test).
3. UI shows **Owner shell + zero counts + no error** ⇒ authenticated Owner RPC on **some** project, but **zero rows** returned for findings/runs on **that** project.

Typical causes:

| Cause | Fits symptoms? |
|-------|----------------|
| Vite dev server started before `.env.local` switched to staging | **Yes** — wrong project, possible empty AgentOps or owner on wrong DB |
| Browser `taskflow-auth` session from **production** while URL now staging (or vice versa) | **Yes** — mismatched JWT/project; odd auth behavior |
| Logged-in user not bootstrap owner on the DB the app hits | **Partial** — would need another `agentops_owners` row on that DB |
| Service query / closed-status filter bug | **No** — ruled out on staging |
| Seed failed on staging | **No** — data confirmed |
| RLS broken for owners on staging | **No** — simulation shows 8 findings |

**Classification:** **Sample data inserted into staging (`ydppcpbxrvvardeslzrk`), but the localhost browser session is likely querying a different effective Supabase project and/or not using the bootstrap Owner session on that seeded database.**

---

## Recommended Fix

**Do not implement Stage 5 or change `service.ts` until the UI shows 5 / 3 / 1 / latest run on localhost.**

### Step 1 — Confirm runtime Supabase project (2 min)

1. Stop the Vite dev server (`Ctrl+C`).
2. Confirm `.env.local` has `VITE_SUPABASE_URL=https://ydppcpbxrvvardeslzrk.supabase.co` (and matching anon key for **that** project).
3. Run `npm run dev` again.
4. In browser Network tab, confirm API host is **`ydppcpbxrvvardeslzrk`**.

### Step 2 — Reset auth session (2 min)

1. Sign out of the app.
2. Remove `localStorage` item `taskflow-auth` (see `src/lib/supabase.ts`).
3. Sign in as **Piter** (`piter@karimchina.com`) on **staging**.
4. Reload `/system/agent-ops`.

### Step 3 — Verify in Network tab

- `POST …/rest/v1/rpc/agentops_is_owner` → `true`
- `GET …/rest/v1/agentops_findings?…` → JSON array length **≥ 5** for active query
- `GET …/rest/v1/agentops_runs?…` → **≥ 1** row

### Step 4 — If still empty after Steps 1–3

Capture (no secrets):

- Supabase host from Network
- `auth.getUser().data.user.id`
- One redacted `agentops_findings` response status + row count

Then run a **follow-up diagnosis prompt** — do **not** change `service.ts` unless Network proves staging + Owner JWT + empty 200 responses (would indicate a deeper PostgREST/RLS edge case).

### Do not do yet

- Reseed sample data (unless confirmed app points at staging and DB is empty)
- Service role in frontend
- RLS bypass
- Stage 5 write flows

---

## Do-Not-Change Reminder

- Do not bypass RLS.
- Do not use service role in frontend.
- Do not expose AgentOps to non-owners.
- Do not implement Stage 5 until Stage 4B UI data displays correctly.
- Do not modify `src/lib/agentops/service.ts`, `src/app/system/agent-ops/page.tsx`, or schema without explicit approval after runtime verification.

---

## Diagnosis Session Summary (FINAL CHECK)

| # | Item | Answer |
|---|------|--------|
| 1 | Files created | `qa-agent/agentops/AGENTOPS_STAGE_4B_EMPTY_UI_DIAGNOSIS.md` |
| 2 | Files modified | **None** (app source unchanged; temporary local diagnostic script was created and deleted) |
| 3 | Root cause | **Runtime project and/or auth session mismatch** — seeded data exists on staging; service filters OK; UI reads empty as Owner on effective client DB |
| 4 | Frontend Supabase project ref (`.env.local`) | `ydppcpbxrvvardeslzrk` |
| 5 | Matches expected staging ref? | **Yes** (config file); **runtime unconfirmed** in browser |
| 6 | Sample data count in staging | runs **1**, active open **5**, backlog **3**, sample codes present |
| 7 | Service query summary | Filters correct; staging PostgREST returns 5/1 with service role; anon 0; owner browser session not tested |
| 8 | Browser console/network | **Not performed** — manual verification required |
| 9 | Recommended next prompt | *“After restarting dev server and re-login to staging as Piter, Network tab still shows `ydppcpbxrvvardeslzrk` and `agentops_is_owner` true but `agentops_findings` returns 0 rows — diagnose further.”* OR if fixed: *“Stage 4B UI sign-off complete — proceed to Stage 5 planning.”* |
| 10 | App source files modified? | **No** |
| 11 | Database/schema changes? | **No** |
| 12 | Packages installed? | **No** |
