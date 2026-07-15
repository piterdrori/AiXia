/**
 * Agent Detail Control Center — shared status mapping and honesty copy.
 * Pure helpers; no fake green / Connected claims without real data.
 */

import type { AgentOpsManagedAgent } from "@/lib/agentops/types";
import {
  mapRosterToReviewStatus,
  ownerWorkStatusLabel,
  reviewStatusLabel,
  type AgentDetailReviewStatus,
} from "@/lib/agentops/agents/agentDetailPhaseB1Semantics";

export const AGENT_DETAIL_CC_COPY = {
  runAuditNotConnected: "Not connected yet",
  runBrowserQaNotConnected: "Not connected yet",
  schedulerPending:
    "Schedule is saved for this agent. Execution is pending hourly scheduler connection — this does not change GitHub Actions fleet cron.",
  hermesNotYetMeasurable: "Not yet measurable",
  hermesNoAgentSpecificRecord:
    "Hermes health is fleet/transport-level. No per-agent Hermes connection row exists yet.",
  permissionsReadOnly: "Read-only — no permission write API on this page",
  fileMemoryPending:
    "File memory uses secure storage plus a pending memory record. Owner approval is required before permanent Hermes use.",
} as const;

export type StripAgentStatus = "Active" | "Paused" | "Blocked" | "Running" | "Error" | "Unknown";

export type StripHermesStatus =
  | "Connected"
  | "Degraded"
  | "Disconnected"
  | "Unknown"
  | "Not yet measurable";

export type StripMemoryStatus =
  | "Connected"
  | "Synchronizing"
  | "Unavailable"
  | "No assigned memory"
  | "Unknown";

export type StripLastScanResult =
  | "Completed"
  | "Failed"
  | "Needs attention"
  | "Not run"
  | "Not recorded";

export type StripCurrentActivity =
  | "Idle"
  | "Preparing"
  | "Auditing"
  | "Running Browser QA"
  | "Processing evidence"
  | "Waiting for owner approval"
  | "Failed"
  | "Unknown";

export type AgentStatusStripModel = {
  agentStatus: StripAgentStatus;
  hermes: StripHermesStatus;
  hermesDetail: string;
  memory: StripMemoryStatus;
  memoryDetail: string;
  lastScanAt: string | null;
  lastScanLabel: string;
  lastScanResult: StripLastScanResult;
  nextRunAt: string | null;
  nextRunLabel: string;
  currentActivity: StripCurrentActivity;
};

export type AgentHermesConnectionModel = {
  agentId: string;
  connectionStatus: StripHermesStatus;
  lastHealthCheckAt: string | null;
  lastSuccessfulRetrievalAt: string | null;
  assignedMemoryCount: number | null;
  enabledMemoryCount: number | null;
  pendingApprovalCount: number | null;
  retrievalStatus: "ok" | "empty" | "failed" | "unknown" | "not_measurable";
  lastError: string | null;
  agentSpecificRecordExists: boolean;
  notes: string[];
};

export function formatStatusDateTime(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString();
}

export function mapManagedToStripAgentStatus(
  status: AgentOpsManagedAgent["status"] | null | undefined,
  reviewStatus: AgentDetailReviewStatus,
  isBlocked: boolean,
): StripAgentStatus {
  if (isBlocked || status === "blocked") return "Blocked";
  if (reviewStatus === "running") return "Running";
  if (reviewStatus === "failed") return "Error";
  if (status == null) return "Unknown";
  const owner = ownerWorkStatusLabel(status, isBlocked);
  if (owner === "Paused") return "Paused";
  if (owner === "Blocked") return "Blocked";
  return "Active";
}

export function mapReviewToLastScanResult(
  reviewStatus: AgentDetailReviewStatus,
  unavailable: boolean,
): StripLastScanResult {
  if (unavailable) return "Not recorded";
  if (reviewStatus === "completed") return "Completed";
  if (reviewStatus === "failed") return "Failed";
  if (reviewStatus === "running") return "Needs attention";
  return "Not run";
}

export function mapReviewToCurrentActivity(
  reviewStatus: AgentDetailReviewStatus,
  ownerPaused: boolean,
): StripCurrentActivity {
  if (reviewStatus === "running") return "Auditing";
  if (reviewStatus === "failed") return "Failed";
  if (ownerPaused) return "Idle";
  if (reviewStatus === "completed" || reviewStatus === "not_run") return "Idle";
  return "Unknown";
}

export function buildAgentStatusStrip(input: {
  managedStatus: AgentOpsManagedAgent["status"] | null | undefined;
  isBlocked: boolean;
  rosterRow: {
    todayStatus: string;
    todayResult: string;
    agentStatus: string;
    lastDailyRunAt: string | null;
  } | null;
  monitoringUnavailable: boolean;
  monitoringResolving: boolean;
  hermes: StripHermesStatus;
  hermesDetail: string;
  memory: StripMemoryStatus;
  memoryDetail: string;
  nextRunAt: string | null;
  nextRunLabel: string;
}): AgentStatusStripModel {
  const reviewStatus = mapRosterToReviewStatus(input.rosterRow);
  const ownerPaused =
    input.managedStatus === "quiet" ||
    input.managedStatus === "disabled" ||
    ownerWorkStatusLabel(input.managedStatus, input.isBlocked) === "Paused";

  const lastScanAt = input.rosterRow?.lastDailyRunAt ?? null;
  let lastScanLabel = formatStatusDateTime(lastScanAt);
  if (input.monitoringResolving) lastScanLabel = "…";
  else if (input.monitoringUnavailable && !input.rosterRow) lastScanLabel = "Unavailable";

  return {
    agentStatus: mapManagedToStripAgentStatus(
      input.managedStatus,
      reviewStatus,
      input.isBlocked,
    ),
    hermes: input.hermes,
    hermesDetail: input.hermesDetail,
    memory: input.memory,
    memoryDetail: input.memoryDetail,
    lastScanAt,
    lastScanLabel,
    lastScanResult: input.monitoringResolving
      ? "Not recorded"
      : mapReviewToLastScanResult(reviewStatus, input.monitoringUnavailable && !input.rosterRow),
    nextRunAt: input.nextRunAt,
    nextRunLabel: input.nextRunLabel,
    currentActivity: input.monitoringResolving
      ? "Unknown"
      : mapReviewToCurrentActivity(reviewStatus, ownerPaused),
  };
}

/** Map fleet Hermes runtime health into owner-facing strip (not agent-specific). */
export function mapHermesRuntimeToStripStatus(input: {
  loaded: boolean;
  ok?: boolean;
  status?: string;
  transportReachable?: boolean;
  mode?: string;
  error?: string | null;
}): { status: StripHermesStatus; detail: string } {
  if (!input.loaded) {
    return { status: "Unknown", detail: "Hermes health not loaded yet." };
  }
  if (input.error) {
    return { status: "Unknown", detail: input.error };
  }
  if (input.status === "blocked" || input.mode === "blocked") {
    return { status: "Disconnected", detail: "Hermes runtime gated or blocked." };
  }
  if (input.ok && input.transportReachable) {
    return {
      status: "Connected",
      detail: "Fleet Hermes advisory transport reachable (not an agent-specific connection row).",
    };
  }
  if (input.transportReachable === false) {
    return { status: "Disconnected", detail: "Hermes transport not reachable." };
  }
  if (input.mode === "unavailable" || input.status === "unavailable") {
    return { status: "Degraded", detail: "Hermes transport reported unavailable." };
  }
  return {
    status: "Not yet measurable",
    detail: AGENT_DETAIL_CC_COPY.hermesNotYetMeasurable,
  };
}

export function mapMemoryCountsToStripStatus(input: {
  loaded: boolean;
  error: string | null;
  assignedCount: number | null;
  enabledCount: number | null;
}): { status: StripMemoryStatus; detail: string } {
  if (input.error) {
    return { status: "Unavailable", detail: input.error };
  }
  if (!input.loaded || input.assignedCount == null) {
    return { status: "Unknown", detail: "Memory status not loaded." };
  }
  if (input.assignedCount === 0) {
    return { status: "No assigned memory", detail: "No memory rows assigned to this agent." };
  }
  if ((input.enabledCount ?? 0) > 0) {
    return {
      status: "Connected",
      detail: `${input.enabledCount} enabled · ${input.assignedCount} assigned`,
    };
  }
  return {
    status: "Unavailable",
    detail: `${input.assignedCount} assigned · none enabled`,
  };
}

export function reviewLabelForStrip(result: StripLastScanResult): string {
  return result;
}

export { reviewStatusLabel, mapRosterToReviewStatus, ownerWorkStatusLabel };
