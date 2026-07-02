/**
 * Machine-readable scheduled monitoring run reports — Phase 3.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AgentOpsMonitoringRuntimeConfig } from "./agentOpsMonitoringRuntimeConfig";
import type { AgentOpsRuntimeTickResult } from "./agentOpsRuntimeEngine";
import type { OwnerWriteGateStatus } from "./agentOpsMonitoringOwnerWriteGate";
import { assertStagingScanUrl } from "./stagingScanUrlGuard";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
export const MONITORING_REPORT_DIR = join(REPO_ROOT, "qa-agent", "reports", "runtime");

export type MonitoringScheduledRunReport = {
  runId: string;
  startedAt: string;
  endedAt: string;
  config: {
    level: number;
    scheduledEnabled: boolean;
    continuousEnabled: boolean;
    dryRunRequested: boolean;
    effectiveDryRun: boolean;
    maxAgentsPerTick: number;
    maxRoutesPerAgent: number;
    defaultIntervalMinutes: number;
  };
  targetBaseUrl: string;
  agentsConsidered: number;
  agentsSkipped: Array<{ agentId: string; agentSlug: string; reason: string; detail: string }>;
  agentsRun: Array<{
    agentId: string;
    agentSlug: string;
    agentName: string;
    routesScanned: string[];
    findingsCount: number;
    issuesCreated: number;
    issuesBlockedByPolicy: number;
    memoryProposals: number;
    errors: string[];
  }>;
  routesScanned: string[];
  findingsCount: number;
  wouldCreateIssues: number;
  wouldWriteMemory: number;
  actualIssuesCreated: number;
  actualMemoryWrites: number;
  dryRun: boolean;
  ownerWriteApproved: boolean;
  writesBlockedReason: string | null;
  productionBlocked: boolean;
  errors: string[];
};

function formatTimestampForFilename(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

export function buildMonitoringScheduledRunReport(input: {
  runId: string;
  startedAt: string;
  endedAt: string;
  monitoringConfig: AgentOpsMonitoringRuntimeConfig;
  ownerGate: OwnerWriteGateStatus;
  tick: AgentOpsRuntimeTickResult;
  targetBaseUrl: string;
  extraErrors?: string[];
}): MonitoringScheduledRunReport {
  const productionGuard = assertStagingScanUrl(input.targetBaseUrl);
  const agentsRun = input.tick.cycles.map((cycle) => ({
    agentId: cycle.agentId,
    agentSlug: cycle.agentSlug,
    agentName: cycle.agentName,
    routesScanned: cycle.routesScanned ?? [],
    findingsCount: cycle.findingsCount,
    issuesCreated: cycle.issuesCreated,
    issuesBlockedByPolicy: cycle.issuesBlockedByPolicy,
    memoryProposals: cycle.memoryProposals,
    errors: cycle.errors,
  }));

  const routesScanned = [...new Set(agentsRun.flatMap((agent) => agent.routesScanned))];
  const findingsCount = agentsRun.reduce((sum, agent) => sum + agent.findingsCount, 0);
  const actualIssuesCreated = agentsRun.reduce((sum, agent) => sum + agent.issuesCreated, 0);
  const actualMemoryWrites = agentsRun.reduce((sum, agent) => sum + agent.memoryProposals, 0);
  const wouldCreateIssues = agentsRun.reduce(
    (sum, agent) => sum + agent.issuesBlockedByPolicy + agent.issuesCreated,
    0,
  );
  const wouldWriteMemory = input.ownerGate.effectiveDryRun
    ? agentsRun.filter((agent) => agent.findingsCount > 0).length
    : actualMemoryWrites;

  return {
    runId: input.runId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    config: {
      level: input.monitoringConfig.level,
      scheduledEnabled: input.monitoringConfig.scheduledEnabled,
      continuousEnabled: input.monitoringConfig.continuousEnabled,
      dryRunRequested: input.monitoringConfig.dryRunRequested,
      effectiveDryRun: input.monitoringConfig.effectiveDryRun,
      maxAgentsPerTick: input.monitoringConfig.maxAgentsPerTick,
      maxRoutesPerAgent: input.monitoringConfig.maxRoutesPerAgent,
      defaultIntervalMinutes: input.monitoringConfig.defaultIntervalMinutes,
    },
    targetBaseUrl: input.targetBaseUrl,
    agentsConsidered: input.tick.agents.length,
    agentsSkipped: input.tick.skipped,
    agentsRun,
    routesScanned,
    findingsCount,
    wouldCreateIssues,
    wouldWriteMemory,
    actualIssuesCreated,
    actualMemoryWrites,
    dryRun: input.ownerGate.effectiveDryRun,
    ownerWriteApproved: input.ownerGate.ownerWriteApproved,
    writesBlockedReason: input.ownerGate.writesBlockedReason,
    productionBlocked: !productionGuard.ok,
    errors: [...input.tick.errors, ...(input.extraErrors ?? [])],
  };
}

export async function writeMonitoringScheduledRunReport(
  report: MonitoringScheduledRunReport,
): Promise<string> {
  await mkdir(MONITORING_REPORT_DIR, { recursive: true });
  const filename = `monitoring-scheduled-dry-run-${formatTimestampForFilename(report.startedAt)}.json`;
  const fullPath = join(MONITORING_REPORT_DIR, filename);
  await writeFile(fullPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return fullPath;
}
