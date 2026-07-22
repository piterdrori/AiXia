/**
 * Fix C-B — staging worker scheduler helpers (queue-only).
 * Never runs Playwright / audit / Browser QA engines.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEDULER_VERSION = "fix-c-b";
export const SCHEDULER_MODE = "staging_worker_scheduler";
export const SCHEDULER_FRESH_MS = 15 * 60 * 1000;
export const QUEUE_VERSION = "fix-c-b";

/**
 * First-due policy (Fix C-B):
 * If schedule is enabled/non-manual and agent state has no nextDueAt,
 * the next scheduler tick may enqueue once (bootstrap). After enqueue
 * (or active-run skip), nextDueAt always advances. Manual/disabled never enqueue.
 */
export const FIRST_DUE_POLICY = "enqueue_once_on_first_tick_then_advance";

/**
 * Timezone policy:
 * Interval cadences use absolute UTC ms offsets (timezone-independent).
 * days_and_time uses Intl IANA timezone when schedule.timezone is a valid IANA id;
 * invalid timezone falls back to UTC with timezoneMode "utc_fallback".
 */
export const TIMEZONE_POLICY = "intl_iana_days_and_time_utc_intervals";

export const SKIP_AGENT_PAUSED = "Agent paused";
export const SKIP_EXISTING_RUN = "Existing active or queued run";
export const SKIP_WORKER_OFFLINE = "Staging worker not connected";
export const SKIP_ENGINE_UNAVAILABLE = "Engine not connected";
export const SKIP_NOT_DUE = "Not due yet";
export const SKIP_SCHEDULE_DISABLED = "Schedule disabled";
export const SKIP_UNSUPPORTED_WORK = "Work type not supported by staging scheduler";
export const SKIP_UNSUPPORTED_SCOPE = "Scope not supported by staging scheduler yet.";
export const SKIP_NOT_CANONICAL = "Agent is not canonical";

export const CANONICAL_AGENT_SLUGS = [
  "system-agent",
  "memory-agent",
  "issue-agent",
  "evolution-agent",
  "fix-agent",
  "qa-agent",
  "design-agent",
  "runtime-agent",
  "logs-agent",
  "config-agent",
  "chat-agent",
  "analytics-agent",
];

export const EXECUTABLE_WORK_TYPES = ["website_audit", "browser_qa"];

/** Staging path prefixes allowlisted for scheduled routes. */
export const ALLOWED_ROUTE_PREFIXES = [
  "/system/agent-ops",
  "/system/",
  "/finance/",
  "/finance",
  "/hub",
  "/login",
  "/dashboard",
  "/projects",
  "/tasks",
  "/calendar",
  "/chat",
  "/inbox",
  "/mail",
  "/employees",
  "/settings",
  "/ai-management",
];

/**
 * Role-first — full staging website routes for entire_staging scheduled coverage.
 * Every scheduled run uses the full inventory (same site for every agent).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const FULL_SITE_JSON = join(
  __dirname,
  "..",
  "..",
  "qa-agent",
  "agentops-agents",
  "_shared",
  "full-site-routes.json",
);

function loadFullSiteRoutes() {
  try {
    const raw = JSON.parse(readFileSync(FULL_SITE_JSON, "utf8"));
    if (Array.isArray(raw) && raw.length > 0) return raw.map(String);
  } catch {
    /* fall through */
  }
  return [
    "/dashboard",
    "/projects",
    "/tasks",
    "/calendar",
    "/chat",
    "/finance",
    "/system/agent-ops",
    "/system/agent-ops/issues",
    "/system/agent-ops/agents",
    "/system/agent-ops/monitoring",
  ];
}

export const CORE_STAGING_ROUTES = loadFullSiteRoutes();

/** Role-first: each run scans the full inventory (no rotation subset). */
export const SCHEDULED_ROUTES_PER_RUN = CORE_STAGING_ROUTES.length;

/** Returns the full site inventory every run (rotation retained for API compat). */
export function rotateCoreStagingRoutes(_nowMs = Date.now()) {
  return [...CORE_STAGING_ROUTES];
}

export const BLOCKED_HOST_SNIPPETS = [
  "ai-xia.vercel.app",
  "aixia.com",
  "localhost:3000",
  "127.0.0.1",
];

export function isCanonicalAgentSlug(slug) {
  return CANONICAL_AGENT_SLUGS.includes(slug);
}

export function parseScheduleFromTools(tools) {
  const list = Array.isArray(tools) ? tools : [];
  const tag = list.find((tool) => typeof tool === "string" && tool.startsWith("aixia:schedule:"));
  if (!tag) {
    return {
      enableSchedule: false,
      ownerEnabled: true,
      frequencyType: "manual",
      workTypes: [],
      intervalValue: 6,
      intervalUnit: "hours",
      daysOfWeek: [1],
      localTime: "09:00",
      timezone: "UTC",
      scopeType: "assigned_modules",
      selectedModules: [],
      selectedRoutes: [],
      maxDurationMinutes: 60,
      avoidOverlap: true,
      version: 2,
    };
  }
  try {
    const parsed = JSON.parse(tag.slice("aixia:schedule:".length));
    const workTypes = Array.isArray(parsed.workTypes)
      ? parsed.workTypes.filter((w) => typeof w === "string")
      : [];
    return {
      enableSchedule: Boolean(parsed.enableSchedule),
      ownerEnabled: parsed.ownerEnabled !== false,
      frequencyType: parsed.frequencyType || "manual",
      workTypes,
      intervalValue: Math.max(1, Number(parsed.intervalValue) || 1),
      intervalUnit: parsed.intervalUnit || "hours",
      daysOfWeek: Array.isArray(parsed.daysOfWeek) ? parsed.daysOfWeek : [1],
      localTime: typeof parsed.localTime === "string" ? parsed.localTime : "09:00",
      timezone: typeof parsed.timezone === "string" ? parsed.timezone : "UTC",
      scopeType: parsed.scopeType || "assigned_modules",
      selectedModules: Array.isArray(parsed.selectedModules) ? parsed.selectedModules : [],
      selectedRoutes: Array.isArray(parsed.selectedRoutes) ? parsed.selectedRoutes : [],
      maxDurationMinutes:
        typeof parsed.maxDurationMinutes === "number" ? parsed.maxDurationMinutes : 60,
      avoidOverlap: parsed.avoidOverlap !== false,
      version: parsed.version === 2 ? 2 : 2,
      scheduleType: parsed.scheduleType || "manual",
      intervalMinutes: typeof parsed.intervalMinutes === "number" ? parsed.intervalMinutes : 60,
    };
  } catch {
    return {
      enableSchedule: false,
      ownerEnabled: true,
      frequencyType: "manual",
      workTypes: [],
      intervalValue: 6,
      intervalUnit: "hours",
      daysOfWeek: [1],
      localTime: "09:00",
      timezone: "UTC",
      scopeType: "assigned_modules",
      selectedModules: [],
      selectedRoutes: [],
      maxDurationMinutes: 60,
      avoidOverlap: true,
      version: 2,
    };
  }
}

export function expandExecutableWorkTypes(workTypes) {
  const out = [];
  for (const type of workTypes || []) {
    if (type === "website_audit" || type === "browser_qa") {
      if (!out.includes(type)) out.push(type);
    } else if (type === "audit_and_browser_qa") {
      if (!out.includes("website_audit")) out.push("website_audit");
      if (!out.includes("browser_qa")) out.push("browser_qa");
    }
  }
  return out;
}

export function intervalMinutesFromSchedule(schedule) {
  const value = Math.max(1, Math.floor(schedule.intervalValue || 1));
  if (schedule.frequencyType === "every_hours") return Math.max(60, value * 60);
  if (schedule.frequencyType === "every_days") return Math.max(60, value * 24 * 60);
  if (schedule.frequencyType === "every_weeks") return Math.max(60, value * 7 * 24 * 60);
  return 60;
}

export function isValidIanaTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveScheduleTimeZone(schedule) {
  const raw = typeof schedule?.timezone === "string" ? schedule.timezone.trim() : "UTC";
  if (isValidIanaTimeZone(raw)) {
    return { timeZone: raw, mode: "iana" };
  }
  return { timeZone: "UTC", mode: "utc_fallback" };
}

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function zonedParts(date, timeZone) {
  const resolved = isValidIanaTimeZone(timeZone) ? timeZone : "UTC";
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: resolved,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  return {
    timeZone: resolved,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_MAP[parts.weekday] ?? date.getUTCDay(),
  };
}

/**
 * Compute next due after `from` (exclusive). Returns ISO string or null.
 */
export function computeNextDueAt(schedule, from = new Date()) {
  if (
    !schedule.ownerEnabled ||
    !schedule.enableSchedule ||
    schedule.frequencyType === "manual"
  ) {
    return null;
  }
  if (
    schedule.frequencyType === "every_hours" ||
    schedule.frequencyType === "every_days" ||
    schedule.frequencyType === "every_weeks"
  ) {
    const minutes = intervalMinutesFromSchedule(schedule);
    return new Date(from.getTime() + minutes * 60_000).toISOString();
  }
  if (schedule.frequencyType === "days_and_time" && schedule.localTime) {
    const [hh, mm] = schedule.localTime.split(":").map((p) => Number(p));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const days = [...(schedule.daysOfWeek || [])].sort((a, b) => a - b);
    if (days.length === 0) return null;
    const { timeZone } = resolveScheduleTimeZone(schedule);
    // Scan 1-minute steps for up to 14 days in the target IANA timezone.
    const start = from.getTime() + 60_000;
    for (let step = 0; step < 14 * 24 * 60; step += 1) {
      const candidate = new Date(start + step * 60_000);
      const z = zonedParts(candidate, timeZone);
      if (!days.includes(z.weekday)) continue;
      if (z.hour === hh && z.minute === mm) {
        return candidate.toISOString();
      }
    }
  }
  return null;
}

/**
 * Whether the schedule is due now given prior agent scheduler state.
 */
export function isScheduleDue(schedule, agentState, now = new Date()) {
  if (
    !schedule.ownerEnabled ||
    !schedule.enableSchedule ||
    schedule.frequencyType === "manual"
  ) {
    return {
      due: false,
      reason: SKIP_SCHEDULE_DISABLED,
      dueAt: null,
      nextDueAt: null,
      firstDue: false,
    };
  }
  if (
    schedule.frequencyType !== "every_hours" &&
    schedule.frequencyType !== "every_days" &&
    schedule.frequencyType !== "every_weeks" &&
    schedule.frequencyType !== "days_and_time"
  ) {
    return {
      due: false,
      reason: SKIP_SCHEDULE_DISABLED,
      dueAt: null,
      nextDueAt: null,
      firstDue: false,
    };
  }

  const nowMs = now.getTime();
  const storedNext =
    agentState && typeof agentState.nextDueAt === "string"
      ? Date.parse(agentState.nextDueAt)
      : NaN;

  if (Number.isFinite(storedNext)) {
    if (storedNext <= nowMs) {
      const dueAt = new Date(storedNext).toISOString();
      const nextDueAt = computeNextDueAt(schedule, now);
      return { due: true, reason: null, dueAt, nextDueAt, firstDue: false };
    }
    return {
      due: false,
      reason: SKIP_NOT_DUE,
      dueAt: null,
      nextDueAt: new Date(storedNext).toISOString(),
      firstDue: false,
    };
  }

  // First-due policy: enqueue once on first tick after enable, then advance.
  const dueAt = now.toISOString();
  const nextDueAt = computeNextDueAt(schedule, now);
  return { due: true, reason: null, dueAt, nextDueAt, firstDue: true };
}

export function dueWindowKey(dueAtIso) {
  const ts = Date.parse(dueAtIso);
  if (!Number.isFinite(ts)) return "invalid";
  const hour = new Date(ts);
  hour.setUTCMinutes(0, 0, 0);
  return `${hour.toISOString()}`;
}

export function buildIdempotencyKey(agentSlug, workType, dueAtIso) {
  return `scheduled-${agentSlug}-${workType}-${dueWindowKey(dueAtIso)}`;
}

export function defaultAgentDetailRoute(agentSlug) {
  return `/system/agent-ops/agents/${agentSlug}`;
}

/**
 * Normalize a route candidate to a staging-relative path, or null if rejected.
 */
export function normalizeStagingRoute(raw, agentSlug) {
  if (typeof raw !== "string") return null;
  let value = raw.trim();
  if (!value) return null;
  if (/^[a-z]+:/i.test(value) || value.includes("://") || value.startsWith("//")) {
    const lower = value.toLowerCase();
    if (BLOCKED_HOST_SNIPPETS.some((host) => lower.includes(host))) return null;
    if (lower.includes("ai-xia-staging.vercel.app")) {
      try {
        const url = new URL(value.startsWith("//") ? `https:${value}` : value);
        value = url.pathname || "/";
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }
  if (!value.startsWith("/")) value = `/${value}`;
  if (value.includes("..")) return null;
  if (value.length > 200) return null;
  const allowed =
    ALLOWED_ROUTE_PREFIXES.some((prefix) => value === prefix || value.startsWith(prefix)) ||
    value === defaultAgentDetailRoute(agentSlug);
  if (!allowed) return null;
  return value;
}

/**
 * Resolve scheduled scope with honest unsupported skips.
 * @returns {{ ok: boolean, reason: string|null, routes: string[], modules: string[], scopeType: string, mapping: string }}
 */
export function resolveScheduledScopeResult(schedule, agentSlug, nowMs = Date.now()) {
  const scopeType = schedule.scopeType || "assigned_modules";

  if (scopeType === "entire_staging") {
    // E-A8 — entire staging maps to the core website routes with deterministic
    // rotation so consecutive scheduled runs cover the whole website.
    return {
      ok: true,
      reason: null,
      routes: rotateCoreStagingRoutes(nowMs),
      modules: [],
      scopeType: "selected_routes",
      mapping: "entire_staging_core_rotation",
    };
  }

  if (scopeType === "selected_routes") {
    const routes = [];
    for (const raw of schedule.selectedRoutes || []) {
      const normalized = normalizeStagingRoute(raw, agentSlug);
      if (normalized && !routes.includes(normalized)) routes.push(normalized);
      if (routes.length >= SCHEDULED_ROUTES_PER_RUN) break;
    }
    if (routes.length === 0) {
      return {
        ok: false,
        reason: SKIP_UNSUPPORTED_SCOPE,
        routes: [],
        modules: [],
        scopeType,
        mapping: "selected_routes_empty_or_rejected",
      };
    }
    return {
      ok: true,
      reason: null,
      routes,
      modules: [],
      scopeType: "selected_routes",
      mapping: "selected_routes",
    };
  }

  // assigned_modules / selected_modules: agent detail route + normalized module roots.
  if (scopeType === "assigned_modules" || scopeType === "selected_modules") {
    const modules =
      scopeType === "selected_modules" && Array.isArray(schedule.selectedModules)
        ? schedule.selectedModules.slice(0, 20)
        : [];
    const routes = [defaultAgentDetailRoute(agentSlug)];
    for (const moduleName of modules) {
      const normalized = normalizeStagingRoute(`/${String(moduleName)}`, agentSlug);
      if (normalized && !routes.includes(normalized)) routes.push(normalized);
      if (routes.length >= SCHEDULED_ROUTES_PER_RUN) break;
    }
    return {
      ok: true,
      reason: null,
      routes,
      modules,
      scopeType: "selected_routes",
      mapping:
        routes.length > 1 ? "modules_to_module_routes" : "modules_to_agent_detail_route",
    };
  }

  return {
    ok: false,
    reason: SKIP_UNSUPPORTED_SCOPE,
    routes: [],
    modules: [],
    scopeType,
    mapping: "unknown_scope",
  };
}

/** @deprecated use resolveScheduledScopeResult — kept for callers that expect routes array */
export function resolveScheduledRoutes(schedule, agentSlug) {
  const result = resolveScheduledScopeResult(schedule, agentSlug);
  if (!result.ok) return [defaultAgentDetailRoute(agentSlug)];
  return result.routes;
}

export function resolveScheduledScope(schedule, agentSlug) {
  const result = resolveScheduledScopeResult(schedule, agentSlug);
  return {
    type: result.ok ? "selected_routes" : result.scopeType,
    routes: result.routes,
    modules: result.modules,
    mapping: result.mapping,
    unsupported: !result.ok,
    reason: result.reason,
  };
}

export function buildScheduledRunSummary(input) {
  return {
    trigger: "schedule",
    agentSlug: input.agentSlug,
    runtimeAgentId: input.runtimeAgentId,
    workType: input.workType,
    scope: input.scope,
    selectedRoutes: input.selectedRoutes,
    selectedModules: input.selectedModules || [],
    maxDurationMinutes: input.maxDurationMinutes ?? 15,
    scheduleKey: `aixia:schedule:${input.agentSlug}`,
    dueAt: input.dueAt,
    nextDueAt: input.nextDueAt,
    idempotencyKey: input.idempotencyKey,
    createdBy: "staging_worker_scheduler",
    queueVersion: QUEUE_VERSION,
    schedulerConnection: "staging_worker",
    scheduleTickId: input.scheduleTickId,
    ownerStatusAtQueue: input.ownerStatusAtQueue,
    engineAvailabilityAtQueue: input.engineAvailabilityAtQueue,
    firstDue: Boolean(input.firstDue),
    firstDuePolicy: FIRST_DUE_POLICY,
    timezonePolicy: TIMEZONE_POLICY,
    scopeMapping: input.scopeMapping || null,
    autoPromoteBlocked: true,
    autoFixBlocked: true,
    autoMemoryApplyBlocked: true,
    productionWritesBlocked: true,
  };
}

export function normalizeSchedulerHealth(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      connected: false,
      lastTickAt: null,
      lastTickId: null,
      lastDueCount: 0,
      lastEnqueuedCount: 0,
      lastSkippedCount: 0,
      lastError: null,
      mode: SCHEDULER_MODE,
      agents: {},
    };
  }
  return {
    connected: Boolean(raw.connected),
    lastTickAt: typeof raw.lastTickAt === "string" ? raw.lastTickAt : null,
    lastTickId: typeof raw.lastTickId === "string" ? raw.lastTickId : null,
    lastDueCount: typeof raw.lastDueCount === "number" ? raw.lastDueCount : 0,
    lastEnqueuedCount: typeof raw.lastEnqueuedCount === "number" ? raw.lastEnqueuedCount : 0,
    lastSkippedCount: typeof raw.lastSkippedCount === "number" ? raw.lastSkippedCount : 0,
    lastError: typeof raw.lastError === "string" ? raw.lastError : null,
    mode: SCHEDULER_MODE,
    agents: raw.agents && typeof raw.agents === "object" ? raw.agents : {},
  };
}

export function isSchedulerFresh(lastTickAt, nowMs = Date.now(), freshMs = SCHEDULER_FRESH_MS) {
  if (!lastTickAt || typeof lastTickAt !== "string") return false;
  const ts = Date.parse(lastTickAt);
  if (!Number.isFinite(ts)) return false;
  return nowMs - ts < freshMs;
}

export function resolveCanonicalSlugFromAgent(agent) {
  const tools = Array.isArray(agent?.tools) ? agent.tools : [];
  for (const tool of tools) {
    if (typeof tool === "string" && tool.startsWith("canonical:")) {
      return tool.slice("canonical:".length);
    }
  }
  return null;
}

/**
 * Detect stale scheduled/manual worker runs (report-only helper).
 * Running with lockExpiresAt in the past, or queued older than maxQueuedAgeMs.
 */
export function classifyStaleMonitoringRun(row, nowMs = Date.now(), maxQueuedAgeMs = 6 * 60 * 60 * 1000) {
  if (!row || typeof row !== "object") return null;
  const summary = row.summary && typeof row.summary === "object" ? row.summary : {};
  const status = row.status;
  if (status === "running") {
    const lock = typeof summary.lockExpiresAt === "string" ? Date.parse(summary.lockExpiresAt) : NaN;
    if (Number.isFinite(lock) && lock < nowMs) {
      return {
        runId: row.run_id,
        reason: "lock_expired",
        agentSlug: summary.agentSlug || null,
        status,
        lockExpiresAt: summary.lockExpiresAt,
      };
    }
  }
  if (status === "queued") {
    const created = Date.parse(row.created_at || row.started_at || "");
    if (Number.isFinite(created) && nowMs - created > maxQueuedAgeMs) {
      return {
        runId: row.run_id,
        reason: "queued_too_long",
        agentSlug: summary.agentSlug || null,
        status,
        ageMs: nowMs - created,
      };
    }
  }
  return null;
}
