/**
 * Agent monitoring eligibility — DB schedule + policy + runtime config gates.
 */

import { parseScheduleFromTools } from "../agentScheduleConfig";
import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";
import {
  getAgentMonitoringRole,
  resolveAgentSlugFromRow,
} from "./agentOpsMonitoringPolicy";
import type { AgentOpsMonitoringRuntimeConfig } from "./agentOpsMonitoringRuntimeConfig";
import {
  isContinuousMonitoringActive,
  isScheduledMonitoringActive,
  loadAgentOpsMonitoringRuntimeConfig,
} from "./agentOpsMonitoringRuntimeConfig";
import { assertStagingScanUrl } from "./stagingScanUrlGuard";

export type AgentMonitoringMode = "manual" | "scheduled" | "continuous";

export type MonitoringEligibilityBlockReason =
  | "eligible"
  | "env_disabled"
  | "level_too_low"
  | "agent_not_active"
  | "policy_disallows"
  | "schedule_disabled"
  | "interval_not_due"
  | "continuous_disabled"
  | "production_blocked"
  | "missing_target"
  | "dry_run_only"
  | "wrong_mode";

export type AgentMonitoringEligibility = {
  eligible: boolean;
  reason: MonitoringEligibilityBlockReason;
  detail: string;
  agentSlug: string;
  mode: AgentMonitoringMode;
  intervalMinutes: number;
};

export function getAgentMonitoringMode(
  agent: Pick<AgentOpsRuntimeAgentRow, "mode" | "tools">,
): AgentMonitoringMode {
  if (agent.mode === "continuous") return "continuous";
  const schedule = parseScheduleFromTools(agent.tools ?? []);
  if (agent.mode === "scheduled" && schedule.enableSchedule) return "scheduled";
  return "manual";
}

export function getAgentScheduleIntervalMinutes(
  agent: Pick<AgentOpsRuntimeAgentRow, "tools">,
  config: AgentOpsMonitoringRuntimeConfig,
): number {
  const schedule = parseScheduleFromTools(agent.tools ?? []);
  if (schedule.intervalMinutes > 0) return schedule.intervalMinutes;
  return config.defaultIntervalMinutes;
}

export function isAgentDueForScheduledRun(
  lastRunAt: Date | null,
  now: Date,
  intervalMinutes: number,
): boolean {
  if (!lastRunAt) return true;
  const elapsedMs = now.getTime() - lastRunAt.getTime();
  return elapsedMs >= intervalMinutes * 60_000;
}

export function isAgentAllowedForContinuousRun(
  lastRunAt: Date | null,
  now: Date,
  cooldownSeconds: number,
): boolean {
  if (!lastRunAt) return true;
  const elapsedMs = now.getTime() - lastRunAt.getTime();
  return elapsedMs >= cooldownSeconds * 1_000;
}

function resolveStagingTarget(
  config: AgentOpsMonitoringRuntimeConfig,
  override?: string,
): { ok: true; url: string } | { ok: false; reason: MonitoringEligibilityBlockReason; detail: string } {
  const candidate = override?.trim() || config.targetBaseUrl;
  if (!candidate) {
    return { ok: false, reason: "missing_target", detail: "Monitoring target base URL is missing." };
  }
  const guard = assertStagingScanUrl(candidate);
  if (!guard.ok) {
    return { ok: false, reason: "production_blocked", detail: guard.error };
  }
  return { ok: true, url: guard.normalizedUrl };
}

export function getAgentMonitoringEligibility(
  agent: AgentOpsRuntimeAgentRow,
  now: Date,
  config: AgentOpsMonitoringRuntimeConfig = loadAgentOpsMonitoringRuntimeConfig(),
  options: {
    tickKind: "manual" | "scheduled" | "continuous";
    lastRunAt?: Date | null;
    stagingUrlOverride?: string;
  },
): AgentMonitoringEligibility {
  const agentSlug = resolveAgentSlugFromRow(agent);
  const mode = getAgentMonitoringMode(agent);
  const intervalMinutes = getAgentScheduleIntervalMinutes(agent, config);
  const role = getAgentMonitoringRole(agentSlug);
  const lastRunAt = options.lastRunAt ?? null;

  const base: AgentMonitoringEligibility = {
    eligible: false,
    reason: "env_disabled",
    detail: "",
    agentSlug,
    mode,
    intervalMinutes,
  };

  const target = resolveStagingTarget(config, options.stagingUrlOverride);
  if (!target.ok) {
    return { ...base, reason: target.reason, detail: target.detail };
  }

  if (agent.status !== "active") {
    return {
      ...base,
      reason: "agent_not_active",
      detail: `Agent status is ${agent.status}.`,
    };
  }

  if (options.tickKind === "manual") {
    return {
      eligible: true,
      reason: "eligible",
      detail: "Owner-commanded manual tick.",
      agentSlug,
      mode,
      intervalMinutes,
    };
  }

  if (options.tickKind === "scheduled") {
    if (!isScheduledMonitoringActive(config)) {
      return {
        ...base,
        reason: "env_disabled",
        detail: "Scheduled monitoring env flags are not enabled.",
      };
    }
    if (config.level < 1) {
      return { ...base, reason: "level_too_low", detail: "Monitoring level < 1." };
    }
    if (agent.mode !== "scheduled") {
      return { ...base, reason: "wrong_mode", detail: `Agent DB mode is ${agent.mode}, not scheduled.` };
    }
    const schedule = parseScheduleFromTools(agent.tools ?? []);
    if (!schedule.enableSchedule) {
      return {
        ...base,
        reason: "schedule_disabled",
        detail: "tools.enableSchedule is false.",
      };
    }
    if (mode !== "scheduled") {
      return { ...base, reason: "wrong_mode", detail: `Agent mode is ${mode}, not scheduled.` };
    }
    if (!role?.participatesInScheduledMonitoring) {
      return {
        ...base,
        reason: "policy_disallows",
        detail: `Policy blocks scheduled participation for ${agentSlug}.`,
      };
    }
    if (!isAgentDueForScheduledRun(lastRunAt, now, intervalMinutes)) {
      return {
        ...base,
        reason: "interval_not_due",
        detail: `Interval ${intervalMinutes}m not elapsed since last run.`,
      };
    }
    return {
      eligible: true,
      reason: "eligible",
      detail: "Scheduled run due.",
      agentSlug,
      mode,
      intervalMinutes,
    };
  }

  // continuous tick kind
  if (!isContinuousMonitoringActive(config)) {
    return {
      ...base,
      reason: "env_disabled",
      detail: "Continuous monitoring env flags are not enabled.",
    };
  }
  if (config.level < 2) {
    return { ...base, reason: "level_too_low", detail: "Monitoring level < 2." };
  }
  if (agent.mode !== "continuous") {
    return { ...base, reason: "wrong_mode", detail: `Agent DB mode is ${agent.mode}, not continuous.` };
  }
  if (mode !== "continuous") {
    return { ...base, reason: "wrong_mode", detail: `Agent mode is ${mode}, not continuous.` };
  }
  if (!role?.participatesInContinuousMonitoring) {
    return {
      ...base,
      reason: "policy_disallows",
      detail: `Policy blocks continuous participation for ${agentSlug}.`,
    };
  }
  if (!isAgentAllowedForContinuousRun(lastRunAt, now, config.continuousCooldownSeconds)) {
    return {
      ...base,
      reason: "interval_not_due",
      detail: `Cooldown ${config.continuousCooldownSeconds}s not elapsed.`,
    };
  }
  return {
    eligible: true,
    reason: "eligible",
    detail: "Continuous run allowed.",
    agentSlug,
    mode,
    intervalMinutes,
  };
}
