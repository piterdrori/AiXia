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
};

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

  const notes = [AGENT_DETAIL_CC_COPY.hermesFleetAvailable, mapped.detail];

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
    agentSpecificRecordExists: false,
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
}): HermesTestResult {
  const checkedAt = new Date().toISOString();

  if (!input.runtimeAgentId) {
    return {
      status: "Agent runtime identity missing",
      checkedAt,
      error: "No agentops_agents UUID for this canonical agent.",
      detail: "Cannot query living memory without a runtime UUID.",
    };
  }

  if (input.healthError || !input.health) {
    return {
      status: "Fleet unavailable",
      checkedAt,
      error: input.healthError ?? "Hermes health unavailable",
      detail: "Could not reach Hermes health endpoint.",
    };
  }

  if (!input.health.transportReachable || !input.health.ok) {
    return {
      status: "Fleet unavailable",
      checkedAt,
      error: input.health.message,
      detail: "Hermes transport not fully reachable.",
    };
  }

  if (!input.memoryQueryOk) {
    return {
      status: "Fleet available · memory query failed",
      checkedAt,
      error: input.memoryError ?? "Memory retrieval failed",
      detail: "Fleet Hermes available, but agentops_memory query failed.",
    };
  }

  if (input.assignedMemoryCount === 0) {
    return {
      status: "Fleet available · no memory assigned",
      checkedAt,
      error: null,
      detail: `Fleet available · no memory assigned (runtime ${input.runtimeAgentId.slice(0, 8)}…)`,
    };
  }

  return {
    status: "Fleet available · memory found",
    checkedAt,
    error: null,
    detail: `Fleet available · ${input.assignedMemoryCount} memory records found`,
  };
}

export function hermesStatusForStrip(model: AgentHermesConnectionModel | null): {
  status: StripHermesStatus;
  detail: string;
} {
  if (!model) {
    return { status: "Unknown", detail: "Hermes status not loaded." };
  }
  return {
    status: model.fleetStatus,
    detail: model.notes[0] ?? model.lastError ?? "",
  };
}
