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
import { mapMemoryPartitionToStripStatus } from "@/lib/agentops/agents/agentDetailMemoryModel";

export const AGENT_DETAIL_CC_COPY = {
  runAuditNotConnected: "Staging worker offline.",
  runBrowserQaNotConnected: "Staging worker offline.",
  runAuditEnginePending: "Audit tools unavailable until worker is running.",
  runBrowserQaEnginePending: "Audit tools unavailable until worker is running.",
  runAuditConnected: "Audit tools ready",
  runBrowserQaConnected: "Audit tools ready",
  workerOffline: "Worker offline",
  workerOnline: "Worker online",
  /** Owner copy — stale is presented as offline, not a broken page. */
  workerStale: "Worker offline",
  schedulerExecutable: "Schedule executable",
  schedulerNotExecutable: "Scheduler offline",
  enginesReady: "Audit tools ready",
  enginesNotReady: "Audit tools unavailable until worker is running",
  executionWorkerLabel: "Staging worker",
  stagingQueueBadge: "Worker online",
  websiteAuditReadyBadge: "Audit tools ready",
  browserQaReadyBadge: "Audit tools ready",
  browserQaPendingBadge: "Audit tools unavailable",
  schedulerPending:
    "Saved schedule preference. Runs enqueue when the staging worker is online.",
  scheduleExecutionNotConnected: "Schedule saved · worker offline",
  scheduleExecutionConnected: "Schedule saved · can run when due",
  hermesNotYetMeasurable: "Not measurable",
  hermesFleetAvailable:
    "Hermes transport is available. Check Agent Hermes for this agent's dedicated namespace.",
  hermesNoAgentSpecificRecord:
    "Hermes transport is available. Agent Hermes is not configured for this agent yet.",
  permissionsReadOnly: "Read-only — no permission write API on this page",
  fileMemoryPending:
    "File memory uses secure storage plus a pending memory record. Owner approval is required before permanent Hermes use.",
  ownerStatusHelper:
    "Owner work status for this agent. Fleet monitoring may still include this agent until paused/excluded separately.",
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
  | "Queued"
  | "Running"
  | "Needs attention"
  | "Not run"
  | "No agent runs yet"
  | "Fleet fallback failed"
  | "Not recorded"
  | "Unavailable";

/** Minimal agent-scoped run shape for last-run strip (from selectLatestAgentRun). */
export type StripLatestAgentRunInput = {
  status: string;
  createdAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  trigger?: string | null;
  mode?: string | null;
  workType?: string | null;
};

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

/**
 * Owner-status strip cell — must match header owner status.
 * Fleet daily review failure must NOT become OWNER STATUS: ERROR.
 * Error is reserved for real load/identity/API failures (status === "Error").
 */
export function mapOwnerFacingToStripStatus(
  status: OwnerFacingAgentStatus,
  _reviewStatus?: AgentDetailReviewStatus,
): StripAgentStatus {
  if (status === "Blocked") return "Blocked";
  if (status === "Paused") return "Paused";
  if (status === "Error") return "Error";
  if (status === "Unknown") return "Unknown";
  return "Active";
}

export function mapManagedToStripAgentStatus(
  status: AgentOpsManagedAgent["status"] | null | undefined,
  _reviewStatus: AgentDetailReviewStatus,
  isBlocked: boolean,
): StripAgentStatus {
  if (isBlocked || status === "blocked") return "Blocked";
  if (status == null) return "Unknown";
  const owner = ownerWorkStatusLabel(status, isBlocked);
  if (owner === "Paused") return "Paused";
  if (owner === "Blocked") return "Blocked";
  return "Active";
}

/** @deprecated Prefer mapLatestAgentRunToStripScan — fleet roster alone is not prime last-run. */
export function mapReviewToLastScanResult(
  reviewStatus: AgentDetailReviewStatus,
  unavailable: boolean,
): StripLastScanResult {
  if (unavailable) return "Unavailable";
  if (reviewStatus === "completed") return "Completed";
  // Stale fleet failure is not a prime "Failed" scan — callers should use fleet fallback label.
  if (reviewStatus === "failed") return "Fleet fallback failed";
  if (reviewStatus === "running") return "Needs attention";
  return "Not run";
}

/** Map agent-scoped worker run (or absence) into the prime Last run strip cell. */
export function mapLatestAgentRunToStripScan(input: {
  latestAgentRun: StripLatestAgentRunInput | null | undefined;
  fleetReviewFailed?: boolean;
  monitoringUnavailable?: boolean;
  monitoringResolving?: boolean;
}): { result: StripLastScanResult; at: string | null; label: string } {
  if (input.monitoringResolving) {
    return { result: "Not recorded", at: null, label: "…" };
  }
  if (input.monitoringUnavailable && !input.latestAgentRun && !input.fleetReviewFailed) {
    return { result: "Unavailable", at: null, label: "Unavailable" };
  }

  const run = input.latestAgentRun;
  if (run) {
    const status = String(run.status || "").toLowerCase();
    const at = run.endedAt || run.startedAt || run.createdAt || null;
    const when = formatStatusDateTime(at);
    if (status === "queued") {
      return { result: "Queued", at, label: when === "Not recorded" ? "Queued for staging worker" : when };
    }
    if (status === "running" || status === "claimed" || status === "in_progress") {
      return { result: "Running", at, label: when === "Not recorded" ? "Running on staging worker" : when };
    }
    if (status === "completed") {
      return { result: "Completed", at, label: when };
    }
    if (status === "failed") {
      return { result: "Failed", at, label: when };
    }
    if (status === "canceled" || status === "cancelled") {
      return { result: "Needs attention", at, label: when === "Not recorded" ? "Canceled" : when };
    }
  }

  if (input.fleetReviewFailed) {
    return {
      result: "Fleet fallback failed",
      at: null,
      label: "Fleet daily review fallback — not an agent-scoped worker run",
    };
  }

  return { result: "No agent runs yet", at: null, label: "No agent-scoped staging-worker runs yet" };
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
      label: "Schedule executable",
      detail: AGENT_DETAIL_CC_COPY.schedulerPending,
    };
  }
  return {
    label: "Scheduler offline",
    detail: "Schedule saved. It will run when the staging worker is online.",
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
  /** Agent-scoped staging-worker run from selectLatestAgentRun — preferred for Last run. */
  latestAgentRun?: StripLatestAgentRunInput | null;
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
  const lastRun = mapLatestAgentRunToStripScan({
    latestAgentRun: input.latestAgentRun,
    fleetReviewFailed: reviewStatus === "failed" && !input.latestAgentRun,
    monitoringUnavailable: input.monitoringUnavailable,
    monitoringResolving: input.monitoringResolving,
  });

  return {
    agentStatus: mapOwnerFacingToStripStatus(ownerStatus, reviewStatus),
    hermes: input.hermes,
    hermesDetail: input.hermesDetail,
    memory: input.memory,
    memoryDetail: input.memoryDetail,
    lastScanAt: lastRun.at,
    lastScanLabel: lastRun.label,
    lastScanResult: lastRun.result,
    scheduleLabel: input.scheduleLabel,
    scheduleDetail: input.scheduleDetail,
    currentActivity:
      input.currentActivityOverride ??
      (input.monitoringResolving
        ? "Unknown"
        : input.latestAgentRun
          ? mapLatestRunToCurrentActivity(input.latestAgentRun, ownerPaused)
          : // Fleet review failure is not current agent activity.
            mapReviewToCurrentActivity(
              reviewStatus === "failed" ? "not_run" : reviewStatus,
              ownerPaused,
            )),
    nextRunAt: null,
    nextRunLabel: input.scheduleLabel,
  };
}

function mapLatestRunToCurrentActivity(
  run: StripLatestAgentRunInput,
  ownerPaused: boolean,
): StripCurrentActivity {
  const status = String(run.status || "").toLowerCase();
  if (status === "queued") return "Preparing";
  if (status === "running" || status === "claimed" || status === "in_progress") {
    return run.workType === "browser_qa" ? "Running Browser QA" : "Auditing";
  }
  if (status === "failed") return "Failed";
  if (ownerPaused) return "Idle";
  return "Idle";
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
  pendingDrafts?: number | null;
  diagnosticCount?: number | null;
  timedOut?: boolean;
}): { status: string; detail: string } {
  // Phase D-E2: clear "runtime memory records · enabled" wording — not "ASSIGNED · ACTIVE".
  return mapMemoryPartitionToStripStatus({
    loaded: input.loaded,
    error: input.error,
    timedOut: input.timedOut,
    runtimeTotal: input.assignedCount,
    enabledRuntime: input.enabledCount,
    pendingDrafts: input.pendingDrafts ?? null,
    diagnosticCount: input.diagnosticCount ?? null,
  });
}

export function reviewLabelForStrip(result: StripLastScanResult): string {
  return result;
}

export { reviewStatusLabel, mapRosterToReviewStatus, ownerWorkStatusLabel };
