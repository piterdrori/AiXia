/**
 * Owner-facing Hermes connection model for Agent Detail.
 * Fleet transport health + dedicated per-agent Hermes connection (D-F1).
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
import type { AgentHermesMemorySnapshot } from "@/lib/agentops/agents/agentHermesMemory";
import type { AgentOpsHermesRuntimeHealth } from "@/lib/agentops/types";

export type HermesTestResult = {
  status:
    | "Agent Hermes connected"
    | "Agent Hermes not configured"
    | "Agent Hermes error"
    | "Fleet available · memory found"
    | "Fleet available · no memory assigned"
    | "Fleet available · memory query failed"
    | "Fleet unavailable"
    | "Agent runtime identity missing"
    | "Failed";
  checkedAt: string;
  error: string | null;
  detail: string;
  /** Never "Connected" unless dedicated per-agent record + retrieval works. */
  agentHermesLabel: AgentHermesConnectionLabel;
  fleetTransportAvailable: boolean;
  namespace?: string | null;
  approvedMemoryCount?: number;
  pendingDraftsCount?: number;
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
  /** True only when a real per-agent Hermes connection row exists and retrieval works. */
  agentSpecificRecordExists?: boolean;
  runtimeAgentId?: string | null;
  namespace?: string | null;
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
    agentHermesLabel === "Connected"
      ? AGENT_DETAIL_MEMORY_COPY.agentHermesConnectedBanner
      : agentHermesLabel === "Error"
        ? AGENT_DETAIL_MEMORY_COPY.agentHermesErrorBanner
        : mapped.status === "Fleet available"
          ? AGENT_DETAIL_MEMORY_COPY.noPerAgentBanner
          : mapped.detail,
    formatAgentHermesStripDetail(agentHermesLabel),
    input.namespace ? `Namespace: ${input.namespace}` : null,
  ].filter(Boolean) as string[];

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
  snapshot?: AgentHermesMemorySnapshot | null;
}): HermesTestResult {
  const checkedAt = new Date().toISOString();
  const snapshot = input.snapshot ?? null;
  const agentHermesLabel =
    snapshot?.agentHermesLabel ??
    resolveAgentHermesConnectionLabel({
      agentSpecificRecordExists: input.agentSpecificRecordExists === true,
      runtimeAgentId: input.runtimeAgentId,
      retrievalError: input.memoryError,
    });

  const namespace = snapshot?.namespace ?? null;
  const approved = snapshot?.approvedActiveCount ?? input.assignedMemoryCount;
  const pending = snapshot?.pendingImprovementsCount ?? 0;

  const baseDetail = [
    `Fleet transport: ${
      input.health && !input.healthError && input.health.transportReachable && input.health.ok
        ? "Available"
        : "Unavailable"
    }`,
    `Agent Hermes: ${agentHermesLabel}`,
    namespace ? `Namespace: ${namespace}` : null,
    `Approved memory loaded: ${approved}`,
    `Pending drafts: ${pending}`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!input.runtimeAgentId) {
    return {
      status: "Agent runtime identity missing",
      checkedAt,
      error: "No agentops_agents UUID for this canonical agent.",
      detail: `${baseDetail} · Cannot query living memory without a runtime UUID.`,
      agentHermesLabel: "Unknown",
      fleetTransportAvailable: false,
      namespace,
      approvedMemoryCount: approved,
      pendingDraftsCount: pending,
    };
  }

  if (input.healthError || !input.health) {
    return {
      status: "Fleet unavailable",
      checkedAt,
      error: input.healthError ?? "Hermes health unavailable",
      detail: baseDetail,
      agentHermesLabel,
      fleetTransportAvailable: false,
      namespace,
      approvedMemoryCount: approved,
      pendingDraftsCount: pending,
    };
  }

  if (!input.health.transportReachable || !input.health.ok) {
    return {
      status: "Fleet unavailable",
      checkedAt,
      error: input.health.message,
      detail: baseDetail,
      agentHermesLabel,
      fleetTransportAvailable: false,
      namespace,
      approvedMemoryCount: approved,
      pendingDraftsCount: pending,
    };
  }

  if (!input.memoryQueryOk || agentHermesLabel === "Error") {
    return {
      status: "Agent Hermes error",
      checkedAt,
      error: input.memoryError ?? snapshot?.retrievalError ?? "Memory retrieval failed",
      detail: baseDetail,
      agentHermesLabel: "Error",
      fleetTransportAvailable: true,
      namespace,
      approvedMemoryCount: approved,
      pendingDraftsCount: pending,
    };
  }

  if (agentHermesLabel === "Connected") {
    return {
      status: "Agent Hermes connected",
      checkedAt,
      error: null,
      detail: baseDetail,
      agentHermesLabel: "Connected",
      fleetTransportAvailable: true,
      namespace,
      approvedMemoryCount: approved,
      pendingDraftsCount: pending,
    };
  }

  return {
    status: "Agent Hermes not configured",
    checkedAt,
    error: null,
    detail: baseDetail,
    agentHermesLabel,
    fleetTransportAvailable: true,
    namespace,
    approvedMemoryCount: approved,
    pendingDraftsCount: pending,
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
