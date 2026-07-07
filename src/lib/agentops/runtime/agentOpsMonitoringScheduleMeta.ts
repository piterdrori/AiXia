/**
 * Phase 5G — approved staging dry-run schedule metadata and run classification.
 */

export const APPROVED_OPERATIONAL_CRON = "0 */6 * * *";
export const APPROVED_WEEKLY_IMPROVEMENT_CRON = "0 2 * * 0";
export const APPROVED_STAGING_MONITORING_URL = "https://ai-xia-staging.vercel.app";

export type MonitoringScheduleType =
  | "operational_6h"
  | "weekly_improvement"
  | "daily_12_agent_review"
  | "manual";
export type MonitoringTriggerType = "schedule" | "workflow_dispatch";
export type MonitoringMode = "operational" | "weekly_improvement" | "daily_12_agent_review";

export const APPROVED_DAILY_12_AGENT_CRON = "0 1 * * *";

export type MonitoringScheduleMeta = {
  scheduleType: MonitoringScheduleType;
  triggerType: MonitoringTriggerType;
  monitoringMode: MonitoringMode;
  cronExpression: string | null;
};

export type MonitoringPipelineCounts = {
  findingsDetected: number;
  newDraftsCreated: number;
  duplicatesSkipped: number;
  regressionsDetected: number;
  improvementsProposed: number;
  issueDraftsCreated: number;
  issueDraftsSkippedDuplicate: number;
  improvementProposalsCreated: number;
  improvementProposalsSkippedDuplicate: number;
  memoryProposalsCreated: number;
};

export function normalizeMonitoringMode(raw: string | undefined | null): MonitoringMode {
  const value = raw?.trim().toLowerCase();
  if (value === "daily_12_agent_review" || value === "daily" || value === "daily_12") {
    return "daily_12_agent_review";
  }
  if (value === "weekly_improvement" || value === "weekly" || value === "improvement") {
    return "weekly_improvement";
  }
  return "operational";
}

export function resolveScheduleType(
  monitoringMode: MonitoringMode,
  triggerType: MonitoringTriggerType,
  cronExpression: string | null,
): MonitoringScheduleType {
  if (triggerType === "workflow_dispatch") {
    return monitoringMode === "weekly_improvement" ? "weekly_improvement" : "manual";
  }
  if (cronExpression === APPROVED_WEEKLY_IMPROVEMENT_CRON) {
    return "weekly_improvement";
  }
  if (cronExpression === APPROVED_DAILY_12_AGENT_CRON) {
    return "daily_12_agent_review";
  }
  if (cronExpression === APPROVED_OPERATIONAL_CRON) {
    return "operational_6h";
  }
  return monitoringMode === "weekly_improvement" ? "weekly_improvement" : "operational_6h";
}

export function loadMonitoringScheduleMetaFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): MonitoringScheduleMeta {
  const monitoringMode = normalizeMonitoringMode(env.AGENTOPS_MONITORING_MODE);
  const triggerRaw = env.AGENTOPS_MONITORING_TRIGGER_TYPE?.trim().toLowerCase();
  const triggerType: MonitoringTriggerType =
    triggerRaw === "schedule" ? "schedule" : "workflow_dispatch";
  const cronExpression = env.AGENTOPS_MONITORING_CRON_EXPRESSION?.trim() || null;
  const scheduleTypeRaw = env.AGENTOPS_MONITORING_SCHEDULE_TYPE?.trim();
  const scheduleType = scheduleTypeRaw
    ? (scheduleTypeRaw as MonitoringScheduleType)
    : resolveScheduleType(monitoringMode, triggerType, cronExpression);

  return {
    scheduleType,
    triggerType,
    monitoringMode,
    cronExpression,
  };
}

/** Compute next UTC run for a five-field cron (minute hour dom month dow). */
export function computeNextCronUtc(cronExpression: string, from = new Date()): Date | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minuteField, hourField, , , dowField] = parts;
  const cursor = new Date(from);
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  for (let i = 0; i < 60 * 24 * 14; i += 1) {
    const minute = cursor.getUTCMinutes();
    const hour = cursor.getUTCHours();
    const dow = cursor.getUTCDay();

    if (!matchesCronField(minuteField, minute, 0, 59)) {
      cursor.setUTCMinutes(minute + 1, 0, 0);
      continue;
    }
    if (!matchesCronField(hourField, hour, 0, 23)) {
      cursor.setUTCMinutes(minute + 1, 0, 0);
      continue;
    }
    if (!matchesCronField(dowField, dow, 0, 6)) {
      cursor.setUTCMinutes(minute + 1, 0, 0);
      continue;
    }
    return new Date(cursor);
  }
  return null;
}

function matchesCronField(field: string, value: number, min: number, max: number): boolean {
  if (field === "*") return true;
  if (field.startsWith("*/")) {
    const step = Number.parseInt(field.slice(2), 10);
    return Number.isFinite(step) && step > 0 && value % step === 0;
  }
  if (field.includes(",")) {
    return field.split(",").some((part) => matchesCronField(part.trim(), value, min, max));
  }
  const parsed = Number.parseInt(field, 10);
  return Number.isFinite(parsed) && parsed === value;
}

export function buildEmptyPipelineCounts(findingsDetected = 0): MonitoringPipelineCounts {
  return {
    findingsDetected,
    newDraftsCreated: 0,
    duplicatesSkipped: 0,
    regressionsDetected: 0,
    improvementsProposed: 0,
    issueDraftsCreated: 0,
    issueDraftsSkippedDuplicate: 0,
    improvementProposalsCreated: 0,
    improvementProposalsSkippedDuplicate: 0,
    memoryProposalsCreated: 0,
  };
}

export type MonitoringScheduleStatusView = {
  scheduleActive: true;
  operationalCron: string;
  weeklyCron: string;
  environment: "staging";
  modeLabel: string;
  continuousEnabled: false;
  lastOperationalRunAt: string | null;
  nextOperationalRunAt: string | null;
  lastWeeklyReviewAt: string | null;
  nextWeeklyReviewAt: string | null;
  lastRunResult: string | null;
  issueDraftsCreated: number;
  improvementsProposed: number;
  duplicatesSkipped: number;
  githubWorkflowPath: string;
};

export function buildMonitoringScheduleStatusView(
  runSummaries: Array<{
    mode?: string;
    scheduleType?: string;
    endedAt?: string | null;
    status?: string;
    summary?: Record<string, unknown>;
  }>,
): MonitoringScheduleStatusView {
  const now = new Date();
  const operationalRuns = runSummaries.filter(
    (row) =>
      row.scheduleType === "operational_6h" ||
      row.mode === "operational" ||
      row.mode === "scheduled_dry_run",
  );
  const weeklyRuns = runSummaries.filter(
    (row) => row.scheduleType === "weekly_improvement" || row.mode === "weekly_improvement",
  );

  const lastOperational = operationalRuns[0] ?? runSummaries[0] ?? null;
  const lastWeekly = weeklyRuns[0] ?? null;
  const lastAny = runSummaries[0] ?? null;

  const summary = (lastAny?.summary ?? {}) as Record<string, unknown>;
  const pipeline = (summary.pipelineCounts ?? summary) as Record<string, unknown>;

  return {
    scheduleActive: true,
    operationalCron: APPROVED_OPERATIONAL_CRON,
    weeklyCron: APPROVED_WEEKLY_IMPROVEMENT_CRON,
    environment: "staging",
    modeLabel: "Dry-run / proposals only",
    continuousEnabled: false,
    lastOperationalRunAt: lastOperational?.endedAt ?? null,
    nextOperationalRunAt: computeNextCronUtc(APPROVED_OPERATIONAL_CRON, now)?.toISOString() ?? null,
    lastWeeklyReviewAt: lastWeekly?.endedAt ?? null,
    nextWeeklyReviewAt: computeNextCronUtc(APPROVED_WEEKLY_IMPROVEMENT_CRON, now)?.toISOString() ?? null,
    lastRunResult: lastAny?.status ?? null,
    issueDraftsCreated: Number(pipeline.issueDraftsCreated ?? pipeline.newDraftsCreated ?? 0),
    improvementsProposed: Number(
      pipeline.improvementProposalsCreated ?? pipeline.improvementsProposed ?? 0,
    ),
    duplicatesSkipped: Number(pipeline.duplicatesSkipped ?? pipeline.issueDraftsSkippedDuplicate ?? 0),
    githubWorkflowPath: ".github/workflows/agentops-monitoring-scheduled-dry-run.yml",
  };
}
