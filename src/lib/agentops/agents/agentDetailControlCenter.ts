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
import type { OwnerFacingAgentStatus } from "@/lib/agentops/agents/agentRuntimeIdentityModel";

export const AGENT_DETAIL_CC_COPY = {
  runAuditNotConnected: "Staging worker not connected.",
  runBrowserQaNotConnected: "Staging worker not connected.",
  runAuditEnginePending: "Website audit engine not connected yet.",
  runBrowserQaEnginePending: "Browser QA engine not connected.",
  runAuditConnected: "Website audit ready",
  runBrowserQaConnected: "Browser QA ready",
  workerOffline: "Worker offline",
  workerOnline: "Worker connected",
  workerStale: "Worker stale",
  schedulerExecutable: "Scheduler executable",
  schedulerNotExecutable: "Scheduler not executable",
  enginesReady: "Engines ready",
  enginesNotReady: "Engines not ready",
  executionWorkerLabel: "Execution worker",
  stagingQueueBadge: "Staging worker · No GitHub dependency",
  websiteAuditReadyBadge: "Website audit ready",
  browserQaReadyBadge: "Browser QA ready",
  browserQaPendingBadge: "Browser QA not ready",
  schedulerPending:
    "This time is calculated from the saved preference. Staging worker scheduler-tick enqueues due runs when connected.",
  scheduleExecutionNotConnected: "Saved · worker scheduler offline",
  scheduleExecutionConnected: "Saved · executable by staging worker",
  hermesNotYetMeasurable: "Not measurable",
  hermesFleetAvailable:
    "Hermes transport is available. This agent does not yet have a dedicated connection record.",
  hermesNoAgentSpecificRecord:
    "Hermes transport is available. This agent does not yet have a dedicated connection record.",
  permissionsReadOnly: "Read-only — no permission write API on this page",
  fileMemoryPending:
    "File memory uses secure storage plus a pending memory record. Owner approval is required before permanent Hermes use.",
  ownerStatusHelper:
    "This controls the owner-facing agent state. It does not yet exclude the agent from fleet monitoring runs.",
} as const;

export type StripAgentStatus = "Active" | "Paused" | "Blocked" | "Error" | "Unknown";

/** Fleet Hermes transport health — never claim per-agent Connected. */
export type StripHermesStatus =
  | "Fleet available"
  | "Fleet degraded"
  | "Fleet unavailable"
  | "Unknown";

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
  | "Not recorded"
  | "Unavailable";

export type StripCurrentActivity =
  | "Idle"
  | "Preparing"
  | "Auditing"
  | "Running Browser QA"
  | "Processing evidence"
  | "Waiting for owner approval"
  | "Failed"
  | "Unknown";

export type StripScheduleLabel =
  | "Saved · not executable"
  | "Saved · worker scheduler offline"
  | "Saved · executable by staging worker"
  | "Manual only"
  | "Not configured"
  | "Unavailable";

export type AgentStatusStripModel = {
  agentStatus: StripAgentStatus;
  hermes: StripHermesStatus;
  hermesDetail: string;
  memory: string;
  memoryDetail: string;
  lastScanAt: string | null;
  lastScanLabel: string;
  lastScanResult: StripLastScanResult;
  /** Schedule cell primary label (not a theoretical timestamp). */
  scheduleLabel: StripScheduleLabel | string;
  scheduleDetail: string;
  currentActivity: StripCurrentActivity;
  /** @deprecated use scheduleLabel — kept for transitional callers */
  nextRunAt?: string | null;
  nextRunLabel?: string;
};

export type AgentHermesRetrievalStatus =
  | "Retrieval verified"
  | "No assigned memory"
  | "Not tested"
  | "Failed"
  | "Not measurable";

export type AgentHermesConnectionModel = {
  agentId: string;
  /** Fleet-facing strip status. */
  connectionStatus: StripHermesStatus;
  fleetStatus: StripHermesStatus;
  retrievalStatus: AgentHermesRetrievalStatus;
  lastHealthCheckAt: string | null;
  lastSuccessfulRetrievalAt: string | null;
  assignedMemoryCount: number | null;
  enabledMemoryCount: number | null;
  pendingApprovalCount: number | null;
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

export function mapOwnerFacingToStripStatus(
  status: OwnerFacingAgentStatus,
  reviewStatus: AgentDetailReviewStatus,
): StripAgentStatus {
  if (status === "Blocked") return "Blocked";
  if (status === "Paused") return "Paused";
  if (status === "Error") return "Error";
  if (status === "Unknown") return "Unknown";
  if (reviewStatus === "failed") return "Error";
  return "Active";
}

export function mapManagedToStripAgentStatus(
  status: AgentOpsManagedAgent["status"] | null | undefined,
  reviewStatus: AgentDetailReviewStatus,
  isBlocked: boolean,
): StripAgentStatus {
  if (isBlocked || status === "blocked") return "Blocked";
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
  if (unavailable) return "Unavailable";
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

export function buildScheduleStripLabel(input: {
  configured: boolean;
  manualOnly: boolean;
  unavailable?: boolean;
  schedulerConnected?: boolean;
}): { label: StripScheduleLabel | string; detail: string } {
  if (input.unavailable) {
    return { label: "Unavailable", detail: "Schedule could not be loaded." };
  }
  if (!input.configured) {
    return { label: "Not configured", detail: "No saved preference yet." };
  }
  if (input.manualOnly) {
    return {
      label: "Manual only",
      detail: AGENT_DETAIL_CC_COPY.schedulerPending,
    };
  }
  if (input.schedulerConnected) {
    return {
      label: "Saved · executable by staging worker",
      detail: AGENT_DETAIL_CC_COPY.schedulerPending,
    };
  }
  return {
    label: "Saved · worker scheduler offline",
    detail: AGENT_DETAIL_CC_COPY.schedulerPending,
  };
}

export function buildAgentStatusStrip(input: {
  ownerStatus: OwnerFacingAgentStatus | null | undefined;
  /** Legacy managed status — preferred path uses ownerStatus. */
  managedStatus?: AgentOpsManagedAgent["status"] | null | undefined;
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
  memory: string;
  memoryDetail: string;
  scheduleLabel: string;
  scheduleDetail: string;
  currentActivityOverride?: StripCurrentActivity | null;
}): AgentStatusStripModel {
  const reviewStatus = mapRosterToReviewStatus(input.rosterRow);
  const ownerStatus: OwnerFacingAgentStatus =
    input.ownerStatus ??
    (input.isBlocked
      ? "Blocked"
      : input.managedStatus == null
        ? "Unknown"
        : ownerWorkStatusLabel(input.managedStatus, input.isBlocked) === "Paused"
          ? "Paused"
          : ownerWorkStatusLabel(input.managedStatus, input.isBlocked) === "Blocked"
            ? "Blocked"
            : "Active");

  const ownerPaused = ownerStatus === "Paused";

  const lastScanAt = input.rosterRow?.lastDailyRunAt ?? null;
  let lastScanLabel = formatStatusDateTime(lastScanAt);
  if (input.monitoringResolving) lastScanLabel = "…";
  else if (input.monitoringUnavailable && !input.rosterRow) lastScanLabel = "Unavailable";

  return {
    agentStatus: mapOwnerFacingToStripStatus(ownerStatus, reviewStatus),
    hermes: input.hermes,
    hermesDetail: input.hermesDetail,
    memory: input.memory,
    memoryDetail: input.memoryDetail,
    lastScanAt,
    lastScanLabel,
    lastScanResult: input.monitoringResolving
      ? "Not recorded"
      : mapReviewToLastScanResult(reviewStatus, input.monitoringUnavailable && !input.rosterRow),
    scheduleLabel: input.scheduleLabel,
    scheduleDetail: input.scheduleDetail,
    currentActivity:
      input.currentActivityOverride ??
      (input.monitoringResolving
        ? "Unknown"
        : mapReviewToCurrentActivity(reviewStatus, ownerPaused)),
    nextRunAt: null,
    nextRunLabel: input.scheduleLabel,
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
    return { status: "Fleet unavailable", detail: input.error };
  }
  if (input.status === "blocked" || input.mode === "blocked") {
    return { status: "Fleet unavailable", detail: "Hermes runtime gated or blocked." };
  }
  if (input.ok && input.transportReachable) {
    return {
      status: "Fleet available",
      detail: AGENT_DETAIL_CC_COPY.hermesFleetAvailable,
    };
  }
  if (input.transportReachable === false) {
    return { status: "Fleet unavailable", detail: "Hermes transport not reachable." };
  }
  if (input.mode === "unavailable" || input.status === "unavailable") {
    return { status: "Fleet degraded", detail: "Hermes transport reported unavailable." };
  }
  return {
    status: "Unknown",
    detail: AGENT_DETAIL_CC_COPY.hermesNotYetMeasurable,
  };
}

export function mapMemoryCountsToStripStatus(input: {
  loaded: boolean;
  error: string | null;
  assignedCount: number | null;
  enabledCount: number | null;
}): { status: string; detail: string } {
  if (input.error) {
    return { status: "Memory unavailable", detail: input.error };
  }
  if (!input.loaded || input.assignedCount == null) {
    return { status: "Unknown", detail: "Memory status not loaded." };
  }
  if (input.assignedCount === 0) {
    return { status: "No assigned memory", detail: "No runtime memory rows for this agent." };
  }
  if (input.enabledCount != null) {
    return {
      status: `${input.assignedCount} runtime memory records · ${input.enabledCount} enabled`,
      detail: "Runtime memory records (agentops_memory) — not all are active/approved current memory.",
    };
  }
  return {
    status: `${input.assignedCount} runtime memory records`,
    detail: "Runtime memory records (agentops_memory) — not all are active/approved current memory.",
  };
}

export function reviewLabelForStrip(result: StripLastScanResult): string {
  return result;
}

export { reviewStatusLabel, mapRosterToReviewStatus, ownerWorkStatusLabel };
