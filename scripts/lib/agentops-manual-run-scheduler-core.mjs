/**
 * Fix C-A — pure helpers for staging worker scheduler tick.
 * Queue-only: never runs Playwright / audit / Browser QA engines.
 */

export const SCHEDULER_VERSION = "fix-c-a";
export const SCHEDULER_MODE = "staging_worker_scheduler";
export const SCHEDULER_FRESH_MS = 15 * 60 * 1000;
export const QUEUE_VERSION = "fix-c-a";

export const SKIP_AGENT_PAUSED = "Agent paused";
export const SKIP_EXISTING_RUN = "Existing active or queued run";
export const SKIP_WORKER_OFFLINE = "Staging worker not connected";
export const SKIP_ENGINE_UNAVAILABLE = "Engine not connected";
export const SKIP_NOT_DUE = "Not due yet";
export const SKIP_SCHEDULE_DISABLED = "Schedule disabled";
export const SKIP_UNSUPPORTED_WORK = "Work type not supported by staging scheduler";
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
    for (let offset = 0; offset < 14; offset += 1) {
      const candidate = new Date(from);
      candidate.setDate(from.getDate() + offset);
      candidate.setHours(hh, mm, 0, 0);
      if (candidate.getTime() <= from.getTime()) continue;
      if (days.includes(candidate.getDay())) {
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
    return { due: false, reason: SKIP_SCHEDULE_DISABLED, dueAt: null, nextDueAt: null };
  }
  if (
    schedule.frequencyType !== "every_hours" &&
    schedule.frequencyType !== "every_days" &&
    schedule.frequencyType !== "every_weeks" &&
    schedule.frequencyType !== "days_and_time"
  ) {
    return { due: false, reason: SKIP_SCHEDULE_DISABLED, dueAt: null, nextDueAt: null };
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
      return { due: true, reason: null, dueAt, nextDueAt };
    }
    return {
      due: false,
      reason: SKIP_NOT_DUE,
      dueAt: null,
      nextDueAt: new Date(storedNext).toISOString(),
    };
  }

  // First tick after enable: due immediately, then advance.
  const dueAt = now.toISOString();
  const nextDueAt = computeNextDueAt(schedule, now);
  return { due: true, reason: null, dueAt, nextDueAt };
}

export function dueWindowKey(dueAtIso, workType) {
  const ts = Date.parse(dueAtIso);
  if (!Number.isFinite(ts)) return `invalid-${workType}`;
  // Hour bucket avoids duplicate enqueue within the same due hour.
  const hour = new Date(ts);
  hour.setMinutes(0, 0, 0);
  return `${hour.toISOString()}`;
}

export function buildIdempotencyKey(agentSlug, workType, dueAtIso) {
  return `scheduled-${agentSlug}-${workType}-${dueWindowKey(dueAtIso, workType)}`;
}

export function resolveScheduledRoutes(schedule, agentSlug) {
  if (
    schedule.scopeType === "selected_routes" &&
    Array.isArray(schedule.selectedRoutes) &&
    schedule.selectedRoutes.length > 0
  ) {
    return schedule.selectedRoutes
      .filter((r) => typeof r === "string" && r.trim())
      .map((r) => (r.startsWith("/") ? r : `/${r}`))
      .slice(0, 3);
  }
  // Conservative default for C-A: one Agent Detail route (never entire_staging expansion).
  return [`/system/agent-ops/agents/${agentSlug}`];
}

export function resolveScheduledScope(schedule, agentSlug) {
  const routes = resolveScheduledRoutes(schedule, agentSlug);
  return {
    type: "selected_routes",
    routes,
    modules:
      schedule.scopeType === "selected_modules" && Array.isArray(schedule.selectedModules)
        ? schedule.selectedModules.slice(0, 20)
        : [],
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
  if (typeof agent?.name === "string") {
    const normalized = agent.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (isCanonicalAgentSlug(normalized)) return normalized;
    if (normalized.endsWith("-agent") && isCanonicalAgentSlug(normalized)) return normalized;
  }
  return null;
}
