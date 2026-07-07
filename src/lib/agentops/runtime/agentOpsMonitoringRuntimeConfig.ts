/**
 * AgentOps monitoring runtime config — centralized env reader with safe fallbacks.
 * Phase 2: scheduled/continuous wiring; loops remain off unless explicitly enabled.
 */

import type { MonitoringLevel } from "./agentOpsMonitoringPolicy";
import { resolveOwnerWriteGate } from "./agentOpsMonitoringOwnerWriteGate";
import {
  normalizeMonitoringMode,
  type MonitoringMode,
} from "./agentOpsMonitoringScheduleMeta";
import { assertStagingScanUrl } from "./stagingScanUrlGuard";

export const MONITORING_CONFIG_DEFAULTS = {
  level: 0 as MonitoringLevel,
  scheduledEnabled: false,
  continuousEnabled: false,
  dryRun: true,
  targetBaseUrl: "http://127.0.0.1:5173",
  defaultIntervalMinutes: 60,
  continuousCooldownSeconds: 15,
  maxAgentsPerTick: 2,
  maxRoutesPerAgent: 4,
} as const;

export type AgentOpsMonitoringRuntimeConfig = {
  level: MonitoringLevel;
  scheduledEnabled: boolean;
  continuousEnabled: boolean;
  /** Phase 5G — operational vs weekly improvement scan profile. */
  monitoringMode: MonitoringMode;
  targetBaseUrl: string;
  defaultIntervalMinutes: number;
  continuousCooldownSeconds: number;
  maxAgentsPerTick: number;
  maxRoutesPerAgent: number;
  /** Env AGENTOPS_MONITORING_DRY_RUN (requested). */
  dryRunRequested: boolean;
  /** @deprecated Use dryRunRequested */
  dryRun: boolean;
  ownerWriteApproved: boolean;
  effectiveDryRun: boolean;
  writesBlockedReason: string | null;
  valid: boolean;
  fallbackReasons: string[];
};

function readEnvFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1" || raw === "yes";
}

function readScheduledEnabledFlag(): boolean {
  if (readEnvFlag("AGENTOPS_MONITORING_SCHEDULED_ENABLED", false)) return true;
  return readEnvFlag("AGENTOPS_MONITORING_SCHEDULED", false);
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseLevel(): { level: MonitoringLevel; reasons: string[] } {
  const reasons: string[] = [];
  const raw = process.env.AGENTOPS_MONITORING_LEVEL?.trim();
  if (!raw) return { level: 0, reasons };

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    reasons.push(`Invalid AGENTOPS_MONITORING_LEVEL="${raw}" — falling back to 0.`);
    return { level: 0, reasons };
  }
  if (parsed >= 4) {
    reasons.push(`Level ${parsed} is forbidden (Level 4 auto-fix/deploy blocked) — falling back to 0.`);
    return { level: 0, reasons };
  }
  if (parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3) {
    return { level: parsed as MonitoringLevel, reasons };
  }
  reasons.push(`Unsupported AGENTOPS_MONITORING_LEVEL=${parsed} — falling back to 0.`);
  return { level: 0, reasons };
}

function resolveTargetBaseUrl(reasons: string[]): string {
  const fromEnv = process.env.AGENTOPS_MONITORING_TARGET_BASE_URL?.trim();
  const candidate = fromEnv || MONITORING_CONFIG_DEFAULTS.targetBaseUrl;
  const guard = assertStagingScanUrl(candidate);
  if (!guard.ok) {
    reasons.push(`Production or invalid AGENTOPS_MONITORING_TARGET_BASE_URL — using ${MONITORING_CONFIG_DEFAULTS.targetBaseUrl}.`);
    return MONITORING_CONFIG_DEFAULTS.targetBaseUrl;
  }
  return guard.normalizedUrl;
}

/** Load and validate monitoring runtime config from environment. */
export function loadAgentOpsMonitoringRuntimeConfig(): AgentOpsMonitoringRuntimeConfig {
  const fallbackReasons: string[] = [];
  const { level, reasons: levelReasons } = parseLevel();
  fallbackReasons.push(...levelReasons);

  let scheduledEnabled = readScheduledEnabledFlag();
  let continuousEnabled = readEnvFlag("AGENTOPS_MONITORING_CONTINUOUS_ENABLED", false);
  const monitoringMode = normalizeMonitoringMode(process.env.AGENTOPS_MONITORING_MODE);

  if (scheduledEnabled && level < 1) {
    fallbackReasons.push("Scheduled monitoring requires AGENTOPS_MONITORING_LEVEL>=1 — scheduled disabled.");
    scheduledEnabled = false;
  }
  if (continuousEnabled && level < 2) {
    fallbackReasons.push("Continuous monitoring requires AGENTOPS_MONITORING_LEVEL>=2 — continuous disabled.");
    continuousEnabled = false;
  }

  const targetBaseUrl = resolveTargetBaseUrl(fallbackReasons);
  const dryRunRequested = readEnvFlag("AGENTOPS_MONITORING_DRY_RUN", MONITORING_CONFIG_DEFAULTS.dryRun);
  const ownerGate = resolveOwnerWriteGate(dryRunRequested);

  const modeLimits =
    monitoringMode === "weekly_improvement"
      ? { maxAgentsPerTick: 6, maxRoutesPerAgent: 12 }
      : { maxAgentsPerTick: 3, maxRoutesPerAgent: 6 };

  const config: AgentOpsMonitoringRuntimeConfig = {
    level,
    scheduledEnabled,
    continuousEnabled,
    monitoringMode,
    targetBaseUrl,
    defaultIntervalMinutes: readPositiveInt(
      "AGENTOPS_MONITORING_DEFAULT_INTERVAL_MINUTES",
      MONITORING_CONFIG_DEFAULTS.defaultIntervalMinutes,
    ),
    continuousCooldownSeconds: readPositiveInt(
      "AGENTOPS_MONITORING_CONTINUOUS_COOLDOWN_SECONDS",
      MONITORING_CONFIG_DEFAULTS.continuousCooldownSeconds,
    ),
    maxAgentsPerTick: readPositiveInt(
      "AGENTOPS_MONITORING_MAX_AGENTS_PER_TICK",
      modeLimits.maxAgentsPerTick,
    ),
    maxRoutesPerAgent: readPositiveInt(
      "AGENTOPS_MONITORING_MAX_ROUTES_PER_AGENT",
      modeLimits.maxRoutesPerAgent,
    ),
    dryRunRequested,
    dryRun: dryRunRequested,
    ownerWriteApproved: ownerGate.ownerWriteApproved,
    effectiveDryRun: ownerGate.effectiveDryRun,
    writesBlockedReason: ownerGate.writesBlockedReason,
    valid: levelReasons.length === 0 || level < 4,
    fallbackReasons,
  };

  if (fallbackReasons.length > 0) {
    console.warn("[agentops-monitoring] config fallbacks:", fallbackReasons);
  }

  return config;
}

export function isScheduledMonitoringActive(
  config: AgentOpsMonitoringRuntimeConfig = loadAgentOpsMonitoringRuntimeConfig(),
): boolean {
  return config.level >= 1 && config.scheduledEnabled;
}

export function isContinuousMonitoringActive(
  config: AgentOpsMonitoringRuntimeConfig = loadAgentOpsMonitoringRuntimeConfig(),
): boolean {
  return config.level >= 2 && config.continuousEnabled;
}
