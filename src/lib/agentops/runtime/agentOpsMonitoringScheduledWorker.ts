/**
 * Phase 3 scheduled monitoring worker — local/staging activation with reports.
 */

import { randomUUID } from "node:crypto";

import { resolveOwnerWriteGate, type OwnerWriteGateStatus } from "./agentOpsMonitoringOwnerWriteGate";
import { validatePhase3MonitoringTarget } from "./agentOpsMonitoringPhase3Target";
import {
  buildMonitoringScheduledRunReport,
  writeMonitoringScheduledRunReport,
  type MonitoringScheduledRunReport,
} from "./agentOpsMonitoringScheduledReport";
import { buildOwnerUiDryRunMonitoringConfig } from "./agentOpsMonitoringUiDryRunConfig";
import {
  isContinuousMonitoringActive,
  isScheduledMonitoringActive,
  loadAgentOpsMonitoringRuntimeConfig,
  type AgentOpsMonitoringRuntimeConfig,
} from "./agentOpsMonitoringRuntimeConfig";
import { logMonitoringEvent } from "./agentOpsMonitoringLogger";
import {
  runScheduledMonitoringTick,
  type AgentOpsRuntimeTickResult,
} from "./agentOpsRuntimeEngine";
import { requestAgentRuntimeStop } from "./agentOpsRuntimeWorker";
import { createAgentOpsRuntimeSupabaseClient } from "./agentOpsRuntimeSupabase";

export type ScheduledMonitoringWorkerMode = "once" | "loop";

export type RunScheduledMonitoringActivationOptions = {
  mode: ScheduledMonitoringWorkerMode;
  /** When true, refuse startup if non-dry-run without owner approval. */
  strictOwnerApproval?: boolean;
  maxLoopTicks?: number;
  scheduledPollMs?: number;
  monitoringConfigOverride?: AgentOpsMonitoringRuntimeConfig;
};

export type ScheduledMonitoringActivationResult = {
  reportPath: string | null;
  exitCode: number;
  report: MonitoringScheduledRunReport | null;
};

/** Owner UI — one scheduled dry-run tick; always forces dryRun and Level 1 scheduled. */
export async function runOwnerUiScheduledDryRun(): Promise<ScheduledMonitoringActivationResult> {
  const target = validatePhase3MonitoringTarget(
    process.env.AGENTOPS_MONITORING_TARGET_BASE_URL ?? "http://127.0.0.1:5173",
  );
  const targetUrl = target.ok ? target.normalizedUrl : "http://127.0.0.1:5173";
  const monitoringConfig = buildOwnerUiDryRunMonitoringConfig(targetUrl);
  return runScheduledMonitoringActivation({
    mode: "once",
    strictOwnerApproval: false,
    monitoringConfigOverride: monitoringConfig,
  });
}

function bindStopSignals(): void {
  const handleStop = (signal: string) => {
    console.info(`[agentops-monitoring] received ${signal} — stopping after current cycle`);
    requestAgentRuntimeStop();
  };
  process.once("SIGINT", () => handleStop("SIGINT"));
  process.once("SIGTERM", () => handleStop("SIGTERM"));
}

function assertScheduledEnv(config: AgentOpsMonitoringRuntimeConfig): string[] {
  const errors: string[] = [];
  if (!isScheduledMonitoringActive(config)) {
    errors.push(
      "Scheduled monitoring is not active. Set AGENTOPS_MONITORING_LEVEL>=1 and AGENTOPS_MONITORING_SCHEDULED_ENABLED=true.",
    );
  }
  if (isContinuousMonitoringActive(config)) {
    console.warn(
      "[agentops-monitoring] continuous env is set but Phase 3 runs scheduled Level 1 only.",
    );
  }
  return errors;
}

export async function runScheduledMonitoringActivation(
  options: RunScheduledMonitoringActivationOptions,
): Promise<ScheduledMonitoringActivationResult> {
  bindStopSignals();
  const startedAt = new Date().toISOString();
  const runId = randomUUID();
  const monitoringConfig =
    options.monitoringConfigOverride ?? loadAgentOpsMonitoringRuntimeConfig();
  const ownerGate: OwnerWriteGateStatus = monitoringConfig.effectiveDryRun
    ? {
        dryRunRequested: true,
        ownerWriteApproved: monitoringConfig.ownerWriteApproved,
        effectiveDryRun: true,
        writesBlocked: true,
        writesBlockedReason: monitoringConfig.writesBlockedReason,
        refuseStartup: false,
        refuseStartupReason: null,
      }
    : resolveOwnerWriteGate(monitoringConfig.dryRunRequested, {
        strictStartup: options.strictOwnerApproval ?? false,
      });

  if (ownerGate.refuseStartup) {
    console.error(`[agentops-monitoring] ${ownerGate.refuseStartupReason}`);
    return { reportPath: null, exitCode: 1, report: null };
  }

  if (ownerGate.writesBlocked && ownerGate.writesBlockedReason) {
    console.warn(`[agentops-monitoring] ${ownerGate.writesBlockedReason}`);
  }

  const target = validatePhase3MonitoringTarget(
    process.env.AGENTOPS_MONITORING_TARGET_BASE_URL ?? monitoringConfig.targetBaseUrl,
  );
  if (!target.ok) {
    console.error(`[agentops-monitoring] invalid target: ${target.error}`);
    const endedAt = new Date().toISOString();
    const report = buildMonitoringScheduledRunReport({
      runId,
      startedAt,
      endedAt,
      monitoringConfig,
      ownerGate,
      tick: {
        config: null,
        agents: [],
        cycles: [],
        skipped: [],
        errors: [target.error],
        tickKind: "scheduled",
        dryRun: ownerGate.effectiveDryRun,
      },
      targetBaseUrl: monitoringConfig.targetBaseUrl,
      extraErrors: [target.error],
    });
    const reportPath = await writeMonitoringScheduledRunReport(report);
    return { reportPath, exitCode: 1, report };
  }

  const envErrors =
    options.monitoringConfigOverride != null ? [] : assertScheduledEnv(monitoringConfig);
  if (envErrors.length > 0) {
    for (const message of envErrors) console.error(`[agentops-monitoring] ${message}`);
    return { reportPath: null, exitCode: 1, report: null };
  }

  const bootstrap = createAgentOpsRuntimeSupabaseClient();
  if (!bootstrap.ok) {
    console.error(`[agentops-monitoring] supabase bootstrap failed: ${bootstrap.error}`);
    const endedAt = new Date().toISOString();
    const report = buildMonitoringScheduledRunReport({
      runId,
      startedAt,
      endedAt,
      monitoringConfig,
      ownerGate,
      tick: {
        config: null,
        agents: [],
        cycles: [],
        skipped: [],
        errors: [bootstrap.error],
        tickKind: "scheduled",
        dryRun: ownerGate.effectiveDryRun,
      },
      targetBaseUrl: target.normalizedUrl,
      extraErrors: [bootstrap.error],
    });
    const reportPath = await writeMonitoringScheduledRunReport(report);
    return { reportPath, exitCode: 1, report };
  }

  logMonitoringEvent("config_loaded", {
    runId,
    mode: options.mode,
    level: monitoringConfig.level,
    scheduledEnabled: monitoringConfig.scheduledEnabled,
    dryRunRequested: monitoringConfig.dryRunRequested,
    effectiveDryRun: monitoringConfig.effectiveDryRun,
    targetUrl: target.normalizedUrl,
    ownerWriteApproved: ownerGate.ownerWriteApproved,
  });

  const engineOptions = {
    stagingUrl: target.normalizedUrl,
    dryRun: monitoringConfig.effectiveDryRun,
    monitoringConfig,
    scheduledIntervalMs: options.scheduledPollMs ?? 60_000,
    shouldStop: () => false,
  };

  if (options.mode === "loop") {
    const maxTicks = options.maxLoopTicks ?? 1;
    const pollMs = options.scheduledPollMs ?? 60_000;
    let lastTick: AgentOpsRuntimeTickResult | null = null;

    for (let tickIndex = 0; tickIndex < maxTicks; tickIndex += 1) {
      lastTick = await runScheduledMonitoringTick(bootstrap.client, engineOptions);
      if (tickIndex < maxTicks - 1) {
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      }
    }

    const endedAt = new Date().toISOString();
    const tick =
      lastTick ??
      ({
        config: null,
        agents: [],
        cycles: [],
        skipped: [],
        errors: ["No scheduled tick executed."],
        tickKind: "scheduled",
        dryRun: ownerGate.effectiveDryRun,
      } satisfies AgentOpsRuntimeTickResult);

    const report = buildMonitoringScheduledRunReport({
      runId,
      startedAt,
      endedAt,
      monitoringConfig,
      ownerGate,
      tick,
      targetBaseUrl: target.normalizedUrl,
    });
    const reportPath = await writeMonitoringScheduledRunReport(report);
    console.info(`[agentops-monitoring] loop completed ticks=${maxTicks} report=${reportPath}`);
    return { reportPath, exitCode: tick.errors.length > 0 ? 2 : 0, report };
  }

  const tick = await runScheduledMonitoringTick(bootstrap.client, engineOptions);
  const endedAt = new Date().toISOString();
  const report = buildMonitoringScheduledRunReport({
    runId,
    startedAt,
    endedAt,
    monitoringConfig,
    ownerGate,
    tick,
    targetBaseUrl: target.normalizedUrl,
  });
  const reportPath = await writeMonitoringScheduledRunReport(report);

  console.info(`[agentops-monitoring] scheduled once complete report=${reportPath}`);
  console.info(
    `[agentops-monitoring] agents run=${report.agentsRun.length} skipped=${report.agentsSkipped.length} findings=${report.findingsCount} issuesCreated=${report.actualIssuesCreated} memoryWrites=${report.actualMemoryWrites} dryRun=${report.dryRun}`,
  );

  if (monitoringConfig.writesBlockedReason && !monitoringConfig.dryRunRequested) {
    console.info(`[agentops-monitoring] ${monitoringConfig.writesBlockedReason}`);
  }

  return { reportPath, exitCode: tick.errors.length > 0 ? 2 : 0, report };
}
