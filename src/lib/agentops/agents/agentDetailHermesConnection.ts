/**
 * Owner-facing Hermes connection model for Agent Detail.
 * Fleet transport health exists; per-agent Hermes connection rows do not.
 */

import {
  AGENT_DETAIL_CC_COPY,
  mapHermesRuntimeToStripStatus,
  type AgentHermesConnectionModel,
  type StripHermesStatus,
} from "@/lib/agentops/agents/agentDetailControlCenter";
import type { AgentOpsHermesRuntimeHealth } from "@/lib/agentops/types";

export type HermesTestResult = {
  status: "Connected" | "Retrieval works" | "No assigned memory" | "Degraded" | "Failed";
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
}): AgentHermesConnectionModel {
  const mapped = mapHermesRuntimeToStripStatus({
    loaded: Boolean(input.health) || Boolean(input.healthError),
    ok: input.health?.ok,
    status: input.health?.status,
    transportReachable: input.health?.transportReachable,
    mode: input.health?.mode,
    error: input.healthError ?? input.health?.loadError ?? null,
  });

  let retrievalStatus: AgentHermesConnectionModel["retrievalStatus"] = "unknown";
  if (input.retrievalError) retrievalStatus = "failed";
  else if (input.assignedMemoryCount == null) retrievalStatus = "unknown";
  else if (input.assignedMemoryCount === 0) retrievalStatus = "empty";
  else retrievalStatus = "ok";

  const notes = [
    AGENT_DETAIL_CC_COPY.hermesNoAgentSpecificRecord,
    mapped.detail,
  ];

  return {
    agentId: input.agentId,
    connectionStatus: mapped.status,
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
  memoryQueryOk: boolean;
  memoryError: string | null;
  assignedMemoryCount: number;
}): HermesTestResult {
  const checkedAt = new Date().toISOString();

  if (input.healthError || !input.health) {
    return {
      status: "Failed",
      checkedAt,
      error: input.healthError ?? "Hermes health unavailable",
      detail: "Could not reach Hermes health endpoint.",
    };
  }

  if (!input.health.transportReachable || !input.health.ok) {
    return {
      status: input.health.status === "blocked" ? "Failed" : "Degraded",
      checkedAt,
      error: input.health.message,
      detail: "Hermes transport not fully reachable.",
    };
  }

  if (!input.memoryQueryOk) {
    return {
      status: "Degraded",
      checkedAt,
      error: input.memoryError ?? "Memory retrieval failed",
      detail: "Hermes reachable, but assigned memory query failed.",
    };
  }

  if (input.assignedMemoryCount === 0) {
    return {
      status: "No assigned memory",
      checkedAt,
      error: null,
      detail: "Hermes reachable · memory query succeeded · no assigned rows.",
    };
  }

  return {
    status: "Retrieval works",
    checkedAt,
    error: null,
    detail: "Hermes reachable · agent memory query returned rows (metadata only).",
  };
}

export function hermesStatusForStrip(model: AgentHermesConnectionModel | null): {
  status: StripHermesStatus;
  detail: string;
} {
  if (!model) {
    return { status: "Unknown", detail: "Hermes status not loaded." };
  }
  return { status: model.connectionStatus, detail: model.notes[0] ?? model.lastError ?? "" };
}
