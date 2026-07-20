/**
 * Phase D-E4 — owner-readable labels and summaries for Agent Detail.
 * Maps truthful internal states to short owner copy without changing semantics.
 */

import type { AgentScheduleRuntimeStatus } from "@/lib/agentops/agents/agentDetailScheduleModel";

export { isPromptLikeRuntimeMemory } from "@/lib/agentops/agents/agentDetailMemoryModel";

export const OWNER_WORKER_COPY = {
  online: "Worker online",
  offline: "Worker offline",
  offlineDetail: "Worker not currently running",
} as const;

export const OWNER_SCHEDULE_BADGE = {
  executable: "Schedule executable",
  offline: "Scheduler offline",
  manual: "Manual only",
} as const;

export const OWNER_TOOLS_BADGE = {
  ready: "Audit tools ready",
  unavailable: "Audit tools unavailable",
} as const;

/** Owner-facing worker label — stale maps to offline (not “broken”). */
export function ownerWorkerLabel(input: {
  workerConnected: boolean;
  workerStatus?: string | null;
}): string {
  if (input.workerConnected && input.workerStatus !== "stale") {
    return OWNER_WORKER_COPY.online;
  }
  return OWNER_WORKER_COPY.offline;
}

export function ownerScheduleBadge(input: {
  scheduleEnabled: boolean;
  schedulerConnected: boolean;
  isManual: boolean;
}): string {
  if (input.isManual || !input.scheduleEnabled) return OWNER_SCHEDULE_BADGE.manual;
  if (input.schedulerConnected) return OWNER_SCHEDULE_BADGE.executable;
  return OWNER_SCHEDULE_BADGE.offline;
}

export function ownerToolsBadge(input: {
  auditAvailable: boolean;
  browserQaAvailable: boolean;
}): string {
  if (input.auditAvailable || input.browserQaAvailable) return OWNER_TOOLS_BADGE.ready;
  return OWNER_TOOLS_BADGE.unavailable;
}

/**
 * One clear schedule summary for the panel banner.
 * Internal runtime status strings remain for verifies/truthfulness.
 */
export function ownerScheduleSummaryBanner(input: {
  runtimeStatus: AgentScheduleRuntimeStatus | string;
  isOwnerPaused: boolean;
  scheduleEnabled: boolean;
  isManual: boolean;
  workerConnected: boolean;
  schedulerConnected: boolean;
  hasQueuedScheduledRun: boolean;
}): { title: string; detail: string; tone: "cyan" | "gold" | "emerald" } {
  if (input.isOwnerPaused) {
    return {
      title: "Agent paused",
      detail: "Scheduled runs will not start while this agent is paused.",
      tone: "gold",
    };
  }
  if (input.isManual || !input.scheduleEnabled) {
    return {
      title: "Manual only",
      detail: "This agent is manual only. No scheduled runs will be created.",
      tone: "cyan",
    };
  }
  if (input.hasQueuedScheduledRun || /Queued/i.test(input.runtimeStatus)) {
    return {
      title: "Scheduled run waiting",
      detail: "Scheduled run queued and waiting for the staging worker.",
      tone: "gold",
    };
  }
  if (!input.workerConnected || !input.schedulerConnected) {
    return {
      title: "Schedule saved",
      detail: "Schedule saved. It will run when the staging worker is online.",
      tone: "gold",
    };
  }
  if (/Unsupported/i.test(input.runtimeStatus)) {
    return {
      title: "Schedule needs attention",
      detail: String(input.runtimeStatus),
      tone: "gold",
    };
  }
  return {
    title: "Schedule ready",
    detail: "Schedule is enabled and can enqueue when due.",
    tone: "emerald",
  };
}

export function parseCountLabel(value: string | null | undefined): number {
  if (value == null) return 0;
  const match = String(value).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function isFindingsPreviewEmpty(input: {
  findingsCount: number;
  openFindingsCountLabel: string;
  waitingApprovalLabel: string;
}): boolean {
  if (input.findingsCount > 0) return false;
  const open = parseCountLabel(input.openFindingsCountLabel);
  const waiting = parseCountLabel(input.waitingApprovalLabel);
  return open === 0 && waiting === 0;
}
