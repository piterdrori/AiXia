/**
 * Owner-facing Hermes connection model for Agent Detail.
 * Fleet transport health exists; per-agent Hermes connection rows do not.
 */

import {
  AGENT_DETAIL_CC_COPY,
  mapHermesRuntimeToStripStatus,
  type AgentHermesConnectionModel,
  type AgentHermesRetrievalStatus,
  type StripHermesStatus,
} from "@/lib/agentops/agents/agentDetailControlCenter";
import {
  AGENT_DETAIL_MEMORY_COPY,
  formatAgentHermesStripDetail,
  resolveAgentHermesConnectionLabel,
  type AgentHermesConnectionLabel,
} from "@/lib/agentops/agents/agentDetailMemoryModel";
import type { AgentOpsHermesRuntimeHealth } from "@/lib/agentops/types";

export type HermesTestResult = {
  status:
    | "Fleet available · memory found"
    | "Fleet available · no memory assigned"
    | "Fleet available · memory query failed"
    | "Fleet unavailable"
    | "Agent runtime identity missing"
    | "Failed";
  checkedAt: string;
  error: string | null;
  detail: string;
  /** Never "Connected" unless a dedicated per-agent record exists. */
  agentHermesLabel: AgentHermesConnectionLabel;
  fleetTransportAvailable: boolean;
};

const AGENT_HERMES_NOT_CONNECTED_NOTE =
  "Agent Hermes: Not configured — no dedicated per-agent Hermes connection record.";

export function buildHermesConnectionModel(input: {
  agentId: string;
  health: AgentOpsHermesRuntimeHealth | null;
  healthError: string | null;
  assignedMemoryCount: number | null;
  enabledMemoryCount: number | null;
  pendingApprovalCount: number | null;
  retrievalError: string | null;
  lastSuccessfulRetrievalAt: string | null;
  tested?: boolean;
  /** Future: true only when a real per-agent Hermes connection row exists. */
  agentSpecificRecordExists?: boolean;
  runtimeAgentId?: string | null;
}): AgentHermesConnectionModel {
  const mapped = mapHermesRuntimeToStripStatus({
    loaded: Boolean(input.health) || Boolean(input.healthError),
    ok: input.health?.ok,
    status: input.health?.status,
    transportReachable: input.health?.transportReachable,
    mode: input.health?.mode,
    error: input.healthError ?? input.health?.loadError ?? null,
  });

  let retrievalStatus: AgentHermesRetrievalStatus = "Not measurable";
  if (!input.tested && input.assignedMemoryCount == null && !input.retrievalError) {
    retrievalStatus = "Not tested";
  } else if (input.retrievalError) {
    retrievalStatus = "Failed";
  } else if (input.assignedMemoryCount == null) {
    retrievalStatus = "Not measurable";
  } else if (input.assignedMemoryCount === 0) {
    retrievalStatus = "No assigned memory";
  } else {
    retrievalStatus = "Retrieval verified";
  }

  const agentSpecificRecordExists = input.agentSpecificRecordExists === true;
  const agentHermesLabel = resolveAgentHermesConnectionLabel({
    agentSpecificRecordExists,
    runtimeAgentId: input.runtimeAgentId ?? input.agentId,
    retrievalError: input.retrievalError,
  });

  const notes = [
    mapped.status === "Fleet available"
      ? AGENT_DETAIL_MEMORY_COPY.noPerAgentBanner
      : mapped.detail,
    formatAgentHermesStripDetail(agentHermesLabel),
  ];

  return {
    agentId: input.agentId,
    connectionStatus: mapped.status,
    fleetStatus: mapped.status,
    lastHealthCheckAt: input.health?.checkedAt ?? null,
    lastSuccessfulRetrievalAt: input.lastSuccessfulRetrievalAt,
    assignedMemoryCount: input.assignedMemoryCount,
    enabledMemoryCount: input.enabledMemoryCount,
    pendingApprovalCount: input.pendingApprovalCount,
    retrievalStatus,
    lastError: input.healthError ?? input.retrievalError ?? input.health?.loadError ?? null,
    agentSpecificRecordExists,
    notes,
  };
}

export function evaluateHermesSafeConnectionTest(input: {
  health: AgentOpsHermesRuntimeHealth | null;
  healthError: string | null;
  runtimeAgentId: string | null;
  memoryQueryOk: boolean;
  memoryError: string | null;
  assignedMemoryCount: number;
  agentSpecificRecordExists?: boolean;
}): HermesTestResult {
  const checkedAt = new Date().toISOString();
  const agentHermesLabel = resolveAgentHermesConnectionLabel({
    agentSpecificRecordExists: input.agentSpecificRecordExists === true,
    runtimeAgentId: input.runtimeAgentId,
    retrievalError: null,
  });

  if (!input.runtimeAgentId) {
    return {
      status: "Agent runtime identity missing",
      checkedAt,
      error: "No agentops_agents UUID for this canonical agent.",
      detail: `Cannot query living memory without a runtime UUID. ${AGENT_HERMES_NOT_CONNECTED_NOTE}`,
      agentHermesLabel: "Unknown",
      fleetTransportAvailable: false,
    };
  }

  if (input.healthError || !input.health) {
    return {
      status: "Fleet unavailable",
      checkedAt,
      error: input.healthError ?? "Hermes health unavailable",
      detail: `Could not reach Hermes health endpoint. ${AGENT_HERMES_NOT_CONNECTED_NOTE}`,
      agentHermesLabel,
      fleetTransportAvailable: false,
    };
  }

  if (!input.health.transportReachable || !input.health.ok) {
    return {
      status: "Fleet unavailable",
      checkedAt,
      error: input.health.message,
      detail: `Hermes transport not fully reachable. ${AGENT_HERMES_NOT_CONNECTED_NOTE}`,
      agentHermesLabel,
      fleetTransportAvailable: false,
    };
  }

  if (!input.memoryQueryOk) {
    return {
      status: "Fleet available · memory query failed",
      checkedAt,
      error: input.memoryError ?? "Memory retrieval failed",
      detail: `Fleet Hermes transport available. Memory query failed. ${AGENT_HERMES_NOT_CONNECTED_NOTE}`,
      agentHermesLabel,
      fleetTransportAvailable: true,
    };
  }

  if (input.assignedMemoryCount === 0) {
    return {
      status: "Fleet available · no memory assigned",
      checkedAt,
      error: null,
      detail: `Fleet Hermes transport available · 0 runtime memory records (runtime ${input.runtimeAgentId.slice(0, 8)}…). ${AGENT_HERMES_NOT_CONNECTED_NOTE}`,
      agentHermesLabel,
      fleetTransportAvailable: true,
    };
  }

  return {
    status: "Fleet available · memory found",
    checkedAt,
    error: null,
    detail: `Fleet Hermes transport available · ${input.assignedMemoryCount} runtime memory records found. ${AGENT_HERMES_NOT_CONNECTED_NOTE}`,
    agentHermesLabel,
    fleetTransportAvailable: true,
  };
}

export function hermesStatusForStrip(model: AgentHermesConnectionModel | null): {
  status: StripHermesStatus;
  detail: string;
} {
  if (!model) {
    return { status: "Unknown", detail: "Hermes status not loaded." };
  }
  const agentNote =
    model.notes.find((note) => note.startsWith("Agent Hermes")) ??
    formatAgentHermesStripDetail(
      resolveAgentHermesConnectionLabel({
        agentSpecificRecordExists: model.agentSpecificRecordExists,
        runtimeAgentId: model.agentId,
      }),
    );
  return {
    status: model.fleetStatus,
    detail:
      model.fleetStatus === "Fleet available"
        ? `${AGENT_DETAIL_CC_COPY.hermesFleetAvailable} · ${agentNote}`
        : `${model.notes[0] ?? model.lastError ?? ""} · ${agentNote}`,
  };
}
