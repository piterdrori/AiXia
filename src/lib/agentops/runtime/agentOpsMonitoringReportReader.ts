/**
 * Read latest monitoring report JSON from qa-agent/reports/runtime (server/worker only).
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  MONITORING_REPORT_DIR,
  type MonitoringScheduledRunReport,
} from "./agentOpsMonitoringScheduledReport";

export type MonitoringReportSummary = {
  runId: string;
  startedAt: string;
  endedAt: string;
  targetBaseUrl: string;
  dryRun: boolean;
  ownerWriteApproved: boolean;
  agentsConsidered: number;
  agentsRunCount: number;
  agentsSkippedCount: number;
  findingsCount: number;
  actualIssuesCreated: number;
  actualMemoryWrites: number;
  wouldCreateIssues: number;
  wouldWriteMemory: number;
  productionBlocked: boolean;
  productionGuardActive?: boolean;
  productionTargetRejected?: boolean;
  targetClass?: string;
  errors: string[];
  reportFilename: string;
};

function toSummary(
  report: MonitoringScheduledRunReport,
  reportFilename: string,
): MonitoringReportSummary {
  return {
    runId: report.runId,
    startedAt: report.startedAt,
    endedAt: report.endedAt,
    targetBaseUrl: report.targetBaseUrl,
    dryRun: report.dryRun,
    ownerWriteApproved: report.ownerWriteApproved,
    agentsConsidered: report.agentsConsidered,
    agentsRunCount: report.agentsRun.length,
    agentsSkippedCount: report.agentsSkipped.length,
    findingsCount: report.findingsCount,
    actualIssuesCreated: report.actualIssuesCreated,
    actualMemoryWrites: report.actualMemoryWrites,
    wouldCreateIssues: report.wouldCreateIssues,
    wouldWriteMemory: report.wouldWriteMemory,
    productionBlocked: report.productionBlocked,
    productionGuardActive: report.productionGuardActive,
    productionTargetRejected: report.productionTargetRejected,
    targetClass: report.targetClass,
    errors: report.errors,
    reportFilename,
  };
}

export async function readLatestMonitoringReport(): Promise<{
  report: MonitoringScheduledRunReport;
  summary: MonitoringReportSummary;
} | null> {
  let entries: string[];
  try {
    entries = await readdir(MONITORING_REPORT_DIR);
  } catch {
    return null;
  }

  const jsonFiles = entries
    .filter((name) => name.startsWith("monitoring-scheduled-dry-run-") && name.endsWith(".json"))
    .sort()
    .reverse();

  if (jsonFiles.length === 0) return null;

  const reportFilename = jsonFiles[0];
  const raw = await readFile(join(MONITORING_REPORT_DIR, reportFilename), "utf8");
  const report = JSON.parse(raw) as MonitoringScheduledRunReport;
  return { report, summary: toSummary(report, reportFilename) };
}

export function summarizeMonitoringReport(
  report: MonitoringScheduledRunReport,
  reportFilename = "inline",
): MonitoringReportSummary {
  return toSummary(report, reportFilename);
}
