/**
 * Per-agent audit/QA schedule model for Agent Detail Control Center.
 * Persists in agentops_agents.tools via aixia:schedule:<json> (compatible with legacy parse).
 * Execution uses staging worker scheduler tick (Fix C-A) — UI stays honest about connection.
 */

import {
  DEFAULT_AGENT_SCHEDULE,
  type AgentScheduleConfig,
  type AgentScheduleType,
  type AgentWorkType,
} from "@/lib/agentops/agentScheduleConfig";

export const MIN_SCHEDULE_INTERVAL_MINUTES = 60;

export type AgentDetailWorkType =
  | "website_audit"
  | "browser_qa"
  | "audit_and_browser_qa"
  | "verify_findings"
  | "improvement_review";

export type AgentDetailFrequencyType =
  | "manual"
  | "every_hours"
  | "every_days"
  | "every_weeks"
  | "days_and_time";

export type AgentDetailScopeType =
  | "entire_staging"
  | "assigned_modules"
  | "selected_modules"
  | "selected_routes";

export type AgentDetailScheduleConfig = AgentScheduleConfig & {
  version: 2;
  ownerEnabled: boolean;
  workTypes: AgentDetailWorkType[];
  frequencyType: AgentDetailFrequencyType;
  intervalValue: number;
  intervalUnit: "hours" | "days" | "weeks";
  daysOfWeek: number[];
  localTime: string | null;
  timezone: string;
  scopeType: AgentDetailScopeType;
  selectedModules: string[];
  selectedRoutes: string[];
  avoidOverlap: boolean;
  runOnlyWhenPreviousCompleted: boolean;
  notifyOnFindings: boolean;
  notifyOnFailure: boolean;
  maxDurationMinutes: number | null;
  requiresOwnerApproval: boolean;
  /** True when staging worker scheduler tick is fresh (capability-driven). */
  schedulerExecutionConnected: boolean;
};

export const ALL_DETAIL_WORK_TYPES: AgentDetailWorkType[] = [
  "website_audit",
  "browser_qa",
  "audit_and_browser_qa",
  "verify_findings",
  "improvement_review",
];

export const DEFAULT_AGENT_DETAIL_SCHEDULE: AgentDetailScheduleConfig = {
  ...DEFAULT_AGENT_SCHEDULE,
  enableSchedule: false,
  scheduleType: "manual",
  intervalMinutes: MIN_SCHEDULE_INTERVAL_MINUTES,
  version: 2,
  ownerEnabled: true,
  workTypes: ["website_audit", "browser_qa"],
  frequencyType: "manual",
  intervalValue: 6,
  intervalUnit: "hours",
  daysOfWeek: [1],
  localTime: "09:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  scopeType: "entire_staging",
  selectedModules: [],
  selectedRoutes: [],
  avoidOverlap: true,
  runOnlyWhenPreviousCompleted: true,
  notifyOnFindings: true,
  notifyOnFailure: true,
  maxDurationMinutes: 60,
  requiresOwnerApproval: true,
  schedulerExecutionConnected: false,
};

const DETAIL_TO_LEGACY_WORK: Partial<Record<AgentDetailWorkType, AgentWorkType>> = {
  website_audit: "system_analysis",
  browser_qa: "browser_qa",
  audit_and_browser_qa: "browser_qa",
  verify_findings: "system_analysis",
  improvement_review: "improvement_suggestions",
};

export function resolveOwnerTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function coerceIntervalMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < MIN_SCHEDULE_INTERVAL_MINUTES) {
    return MIN_SCHEDULE_INTERVAL_MINUTES;
  }
  return Math.floor(minutes);
}

export function frequencyToIntervalMinutes(
  frequencyType: AgentDetailFrequencyType,
  intervalValue: number,
  intervalUnit: "hours" | "days" | "weeks",
): number {
  const value = Math.max(1, Math.floor(intervalValue || 1));
  if (frequencyType === "manual" || frequencyType === "days_and_time") {
    return MIN_SCHEDULE_INTERVAL_MINUTES;
  }
  if (intervalUnit === "hours" || frequencyType === "every_hours") {
    return coerceIntervalMinutes(value * 60);
  }
  if (intervalUnit === "days" || frequencyType === "every_days") {
    return coerceIntervalMinutes(value * 24 * 60);
  }
  return coerceIntervalMinutes(value * 7 * 24 * 60);
}

export function validateAgentDetailSchedule(
  config: AgentDetailScheduleConfig,
): { ok: true } | { ok: false; error: string } {
  if (config.workTypes.length === 0) {
    return { ok: false, error: "Select at least one work type." };
  }
  if (config.frequencyType === "every_hours") {
    if (config.intervalValue < 1) {
      return { ok: false, error: "Hourly interval must be at least 1 hour." };
    }
    if (frequencyToIntervalMinutes(config.frequencyType, config.intervalValue, "hours") < 60) {
      return { ok: false, error: "Minimum recurrence is once per hour." };
    }
  }
  if (config.frequencyType === "every_days" && config.intervalValue < 1) {
    return { ok: false, error: "Day interval must be at least 1." };
  }
  if (config.frequencyType === "every_weeks" && config.intervalValue < 1) {
    return { ok: false, error: "Week interval must be at least 1." };
  }
  if (config.frequencyType === "days_and_time") {
    if (!config.daysOfWeek.length) {
      return { ok: false, error: "Select at least one weekday." };
    }
    if (!config.localTime || !/^\d{2}:\d{2}$/.test(config.localTime)) {
      return { ok: false, error: "Provide a valid local time (HH:MM)." };
    }
  }
  if (config.scopeType === "selected_modules" && config.selectedModules.length === 0) {
    return { ok: false, error: "Select at least one module, or change scope." };
  }
  if (config.scopeType === "selected_routes" && config.selectedRoutes.length === 0) {
    return { ok: false, error: "Select at least one route, or change scope." };
  }
  if (
    config.maxDurationMinutes != null &&
    (!Number.isFinite(config.maxDurationMinutes) || config.maxDurationMinutes < 5)
  ) {
    return { ok: false, error: "Maximum run duration must be at least 5 minutes." };
  }
  return { ok: true };
}

export function computeNextExpectedRunAt(
  config: AgentDetailScheduleConfig,
  from: Date = new Date(),
): string | null {
  if (!config.ownerEnabled || !config.enableSchedule || config.frequencyType === "manual") {
    return null;
  }

  if (
    config.frequencyType === "every_hours" ||
    config.frequencyType === "every_days" ||
    config.frequencyType === "every_weeks"
  ) {
    const minutes = frequencyToIntervalMinutes(
      config.frequencyType,
      config.intervalValue,
      config.intervalUnit,
    );
    return new Date(from.getTime() + minutes * 60_000).toISOString();
  }

  if (config.frequencyType === "days_and_time" && config.localTime) {
    const [hh, mm] = config.localTime.split(":").map((part) => Number(part));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const days = [...config.daysOfWeek].sort((a, b) => a - b);
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

export function nextRunDisplayLabel(config: AgentDetailScheduleConfig, nextAt: string | null): string {
  if (!config.ownerEnabled) return "Manual only";
  if (!config.enableSchedule || config.frequencyType === "manual") return "Manual only";
  if (!config.schedulerExecutionConnected) {
    return "Saved · worker scheduler offline";
  }
  if (!nextAt) return "Not scheduled";
  return new Date(nextAt).toLocaleString();
}

/** Theoretical next-due label — must not imply execution when scheduler is offline. */
export function theoreticalNextDueLabel(
  config: AgentDetailScheduleConfig,
  nextAt: string | null,
): string {
  if (!config.ownerEnabled || !config.enableSchedule || config.frequencyType === "manual") {
    return "Manual only";
  }
  if (!nextAt) return "Not calculated";
  return new Date(nextAt).toLocaleString();
}

export function scheduleExecutionConnectionLabel(schedulerConnected = false): string {
  return schedulerConnected
    ? "Saved · executable by staging worker"
    : "Saved · worker scheduler offline";
}

export type AgentScheduleRuntimeStatus =
  | "Active"
  | "Paused"
  | "Paused · scheduled runs will not enqueue"
  | "Worker offline"
  | "Saved · worker scheduler offline"
  | "Engine unavailable"
  | "Duplicate active run"
  | "Existing active or queued run"
  | "Queued · waiting for staging worker"
  | "Not due yet"
  | "Manual only"
  | "Unsupported scope"
  | "Unsupported work type";

export function resolveAgentScheduleRuntimeStatus(input: {
  config: AgentDetailScheduleConfig;
  isOwnerPaused: boolean;
  workerConnected: boolean;
  schedulerConnected: boolean;
  websiteAuditAvailable: boolean;
  browserQaAvailable: boolean;
  hasActiveRun: boolean;
  /** True when this agent already has a queued/running scheduled (or any) worker run. */
  hasQueuedScheduledRun?: boolean;
  nextAt: string | null;
  lastSkippedReason?: string | null;
}): AgentScheduleRuntimeStatus {
  const { config } = input;
  if (!config.ownerEnabled || input.isOwnerPaused) {
    return input.isOwnerPaused
      ? "Paused · scheduled runs will not enqueue"
      : "Paused";
  }
  if (!config.enableSchedule || config.frequencyType === "manual") return "Manual only";
  if (input.lastSkippedReason === "Scope not supported by staging scheduler yet.") {
    return "Unsupported scope";
  }
  const executableTypes = config.workTypes.filter(
    (type) =>
      type === "website_audit" || type === "browser_qa" || type === "audit_and_browser_qa",
  );
  if (
    executableTypes.length === 0 ||
    input.lastSkippedReason === "Work type not supported by staging scheduler"
  ) {
    return "Unsupported work type";
  }
  // Queued scheduled run dominates skip/due copy so Idle/Not due do not contradict.
  if (input.hasQueuedScheduledRun) {
    return "Queued · waiting for staging worker";
  }
  if (!input.workerConnected || !input.schedulerConnected) {
    return "Saved · worker scheduler offline";
  }
  if (input.hasActiveRun || input.lastSkippedReason === "Existing active or queued run") {
    return "Existing active or queued run";
  }
  const wantsAudit =
    config.workTypes.includes("website_audit") ||
    config.workTypes.includes("audit_and_browser_qa");
  const wantsBrowser =
    config.workTypes.includes("browser_qa") ||
    config.workTypes.includes("audit_and_browser_qa");
  if (
    (wantsAudit && !input.websiteAuditAvailable) ||
    (wantsBrowser && !input.browserQaAvailable)
  ) {
    return "Engine unavailable";
  }
  if (input.lastSkippedReason === "Not due yet") return "Not due yet";
  if (input.nextAt && Date.parse(input.nextAt) > Date.now()) return "Not due yet";
  return "Active";
}

export function detailWorkTypesToLegacy(workTypes: AgentDetailWorkType[]): AgentWorkType[] {
  const set = new Set<AgentWorkType>();
  for (const type of workTypes) {
    const mapped = DETAIL_TO_LEGACY_WORK[type];
    if (mapped) set.add(mapped);
  }
  if (set.size === 0) set.add("browser_qa");
  return [...set];
}

export function normalizeDetailSchedule(
  partial: Partial<AgentDetailScheduleConfig> | AgentScheduleConfig | null | undefined,
): AgentDetailScheduleConfig {
  const base = { ...DEFAULT_AGENT_DETAIL_SCHEDULE };
  if (!partial) return base;

  const asAny = partial as Partial<AgentDetailScheduleConfig>;
  const frequencyType =
    asAny.frequencyType ??
    (asAny.enableSchedule
      ? asAny.scheduleType === "manual"
        ? "manual"
        : "every_hours"
      : "manual");

  const intervalMinutes = coerceIntervalMinutes(
    typeof asAny.intervalMinutes === "number"
      ? asAny.intervalMinutes
      : DEFAULT_AGENT_DETAIL_SCHEDULE.intervalMinutes,
  );

  const intervalValue =
    typeof asAny.intervalValue === "number" && asAny.intervalValue > 0
      ? asAny.intervalValue
      : Math.max(1, Math.round(intervalMinutes / 60));

  const workTypes =
    Array.isArray(asAny.workTypes) && asAny.workTypes.length > 0
      ? asAny.workTypes.filter((value): value is AgentDetailWorkType =>
          ALL_DETAIL_WORK_TYPES.includes(value as AgentDetailWorkType),
        )
      : [...DEFAULT_AGENT_DETAIL_SCHEDULE.workTypes];

  const scheduleType: AgentScheduleType =
    frequencyType === "manual" ? "manual" : asAny.scheduleType === "cron" ? "cron" : "interval";

  return {
    ...base,
    ...asAny,
    version: 2,
    enableSchedule: Boolean(asAny.enableSchedule) && frequencyType !== "manual",
    scheduleType,
    intervalMinutes:
      frequencyType === "manual"
        ? MIN_SCHEDULE_INTERVAL_MINUTES
        : coerceIntervalMinutes(
            frequencyToIntervalMinutes(
              frequencyType,
              intervalValue,
              asAny.intervalUnit ?? "hours",
            ),
          ),
    cronPreset: asAny.cronPreset ?? null,
    allowedWorkTypes: detailWorkTypesToLegacy(workTypes),
    ownerEnabled: asAny.ownerEnabled !== false,
    workTypes,
    frequencyType,
    intervalValue,
    intervalUnit: asAny.intervalUnit ?? "hours",
    daysOfWeek: Array.isArray(asAny.daysOfWeek) ? asAny.daysOfWeek : base.daysOfWeek,
    localTime: typeof asAny.localTime === "string" ? asAny.localTime : base.localTime,
    timezone: typeof asAny.timezone === "string" && asAny.timezone ? asAny.timezone : resolveOwnerTimezone(),
    scopeType:
      asAny.scopeType === "selected_routes" ||
      asAny.scopeType === "assigned_modules" ||
      asAny.scopeType === "selected_modules" ||
      !asAny.scopeType
        ? "entire_staging"
        : asAny.scopeType,
    selectedModules: [],
    selectedRoutes: [],
    avoidOverlap: asAny.avoidOverlap !== false,
    runOnlyWhenPreviousCompleted: asAny.runOnlyWhenPreviousCompleted !== false,
    notifyOnFindings: asAny.notifyOnFindings !== false,
    notifyOnFailure: asAny.notifyOnFailure !== false,
    maxDurationMinutes:
      typeof asAny.maxDurationMinutes === "number" ? asAny.maxDurationMinutes : base.maxDurationMinutes,
    requiresOwnerApproval: asAny.requiresOwnerApproval !== false,
    schedulerExecutionConnected: Boolean(asAny.schedulerExecutionConnected),
  };
}

export function parseDetailScheduleFromTools(tools: string[]): AgentDetailScheduleConfig {
  const tag = tools.find((tool) => tool.startsWith("aixia:schedule:"));
  if (!tag) return { ...DEFAULT_AGENT_DETAIL_SCHEDULE, timezone: resolveOwnerTimezone() };
  try {
    const json = tag.slice("aixia:schedule:".length);
    const parsed = JSON.parse(json) as Partial<AgentDetailScheduleConfig>;
    return normalizeDetailSchedule(parsed);
  } catch {
    return { ...DEFAULT_AGENT_DETAIL_SCHEDULE, timezone: resolveOwnerTimezone() };
  }
}
