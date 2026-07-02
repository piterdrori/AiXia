/**
 * Owner UI dry-run config — always forces safe scheduled dry-run regardless of env.
 */

import {
  MONITORING_CONFIG_DEFAULTS,
  type AgentOpsMonitoringRuntimeConfig,
} from "./agentOpsMonitoringRuntimeConfig";

export function buildOwnerUiDryRunMonitoringConfig(
  targetBaseUrl: string,
): AgentOpsMonitoringRuntimeConfig {
  return {
    level: 1,
    scheduledEnabled: true,
    continuousEnabled: false,
    targetBaseUrl,
    defaultIntervalMinutes: MONITORING_CONFIG_DEFAULTS.defaultIntervalMinutes,
    continuousCooldownSeconds: MONITORING_CONFIG_DEFAULTS.continuousCooldownSeconds,
    maxAgentsPerTick: MONITORING_CONFIG_DEFAULTS.maxAgentsPerTick,
    maxRoutesPerAgent: MONITORING_CONFIG_DEFAULTS.maxRoutesPerAgent,
    dryRunRequested: true,
    dryRun: true,
    ownerWriteApproved: false,
    effectiveDryRun: true,
    writesBlockedReason: "UI dry-run — mutations disabled",
    valid: true,
    fallbackReasons: [],
  };
}
