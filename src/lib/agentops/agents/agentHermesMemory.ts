/**
 * Phase D-F1 — dedicated per-agent Hermes long-term memory model.
 * Fleet Hermes transport health remains separate from Agent Hermes connection records.
 */

import { fetchAgentScopedMemory } from "@/app/system/agent-ops/agents/agentIntelligenceClient";
import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
} from "@/lib/agentops/db/agentOpsRuntimeTypes";
import {
  addAgentOpsAgentMemory,
  getAgentOpsAgentMemory,
  setAgentOpsAgentMemoryActive,
} from "@/lib/agentops/service";
import type {
  AgentOpsManagedAgentMemoryItem,
  AgentOpsReadResult,
  AgentOpsWriteResult,
} from "@/lib/agentops/types";
import { supabase } from "@/lib/supabase";

import {
  partitionRuntimeMemory,
  resolveAgentHermesConnectionLabel,
  type AgentHermesConnectionLabel,
} from "@/lib/agentops/agents/agentDetailMemoryModel";
import {
  AGENT_HERMES_CONNECTION_VERSION,
  buildAgentHermesNamespace,
  isApprovedActiveAgentMemory,
  isPendingMemoryImprovement,
  resolveConnectionStatusFromRetrieval,
  selectApprovedAgentMemoryForPrompt,
  type AgentHermesConnectionStatus,
} from "@/lib/agentops/agents/agentHermesMemoryModel";

export const AGENT_HERMES_CONNECTIONS_TABLE = "agentops_agent_hermes_connections";
export {
  AGENT_HERMES_CONNECTION_VERSION,
  buildAgentHermesNamespace,
  isApprovedActiveAgentMemory,
  isPendingMemoryImprovement,
  resolveConnectionStatusFromRetrieval,
  selectApprovedAgentMemoryForPrompt,
};
export type { AgentHermesConnectionStatus };

export type AgentHermesConnectionRow = {
  id: string;
  agent_slug: string;
  runtime_agent_id: string | null;
  hermes_namespace: string;
  status: AgentHermesConnectionStatus;
  connection_version: string;
  last_health_check_at: string | null;
  last_memory_sync_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export type AgentHermesMemorySnapshot = {
  agentSlug: string;
  runtimeAgentId: string | null;
  connection: AgentHermesConnectionRow | null;
  connectionStatus: AgentHermesConnectionStatus;
  agentHermesLabel: AgentHermesConnectionLabel;
  namespace: string;
  approvedActiveCount: number;
  pendingImprovementsCount: number;
  sharedGlobalCount: number;
  diagnosticCount: number;
  runtimeTotalCount: number;
  approvedMemory: AgentOpsManagedAgentMemoryItem[];
  pendingImprovements: AgentOpsManagedAgentMemoryItem[];
  lastHealthCheckAt: string | null;
  lastMemorySyncAt: string | null;
  retrievalOk: boolean;
  retrievalError: string | null;
  banner: string;
};

function toConnectionRow(raw: Record<string, unknown>): AgentHermesConnectionRow {
  const statusRaw = String(raw.status || "not_configured");
  const status: AgentHermesConnectionStatus =
    statusRaw === "connected" ||
    statusRaw === "error" ||
    statusRaw === "disabled" ||
    statusRaw === "not_configured"
      ? statusRaw
      : "not_configured";
  return {
    id: String(raw.id),
    agent_slug: String(raw.agent_slug),
    runtime_agent_id: raw.runtime_agent_id ? String(raw.runtime_agent_id) : null,
    hermes_namespace: String(raw.hermes_namespace),
    status,
    connection_version: String(raw.connection_version || AGENT_HERMES_CONNECTION_VERSION),
    last_health_check_at: raw.last_health_check_at ? String(raw.last_health_check_at) : null,
    last_memory_sync_at: raw.last_memory_sync_at ? String(raw.last_memory_sync_at) : null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    metadata:
      raw.metadata && typeof raw.metadata === "object"
        ? (raw.metadata as Record<string, unknown>)
        : {},
  };
}

export async function getAgentHermesConnection(
  agentSlug: string,
): Promise<AgentOpsReadResult<AgentHermesConnectionRow | null>> {
  try {
    const slug = agentSlug.trim().toLowerCase();
    if (!slug) return { data: null, error: "agentSlug is required." };
    const { data, error } = await supabase
      .from(AGENT_HERMES_CONNECTIONS_TABLE)
      .select("*")
      .eq("agent_slug", slug)
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: data ? toConnectionRow(data as Record<string, unknown>) : null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function resolveRuntimeAgentId(agentSlug: string): Promise<string | null> {
  const tag = `canonical:${agentSlug}`;
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("id, tools")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .limit(80);
  if (error || !data) return null;
  const match = (data as Array<{ id: string; tools?: string[] | null }>).find((row) =>
    (row.tools || []).includes(tag),
  );
  return match?.id ?? null;
}

export async function ensureAgentHermesConnection(input: {
  agentSlug: string;
  runtimeAgentId?: string | null;
}): Promise<AgentOpsWriteResult<AgentHermesConnectionRow>> {
  try {
    const slug = input.agentSlug.trim().toLowerCase();
    if (!slug) return { data: null, error: "agentSlug is required." };
    const namespace = buildAgentHermesNamespace(slug);
    const runtimeAgentId = input.runtimeAgentId ?? (await resolveRuntimeAgentId(slug));
    const existing = await getAgentHermesConnection(slug);
    if (existing.error) return { data: null, error: existing.error };

    if (existing.data) {
      const patch: Record<string, unknown> = {
        hermes_namespace: namespace,
        connection_version: AGENT_HERMES_CONNECTION_VERSION,
      };
      if (runtimeAgentId && runtimeAgentId !== existing.data.runtime_agent_id) {
        patch.runtime_agent_id = runtimeAgentId;
      }
      const { data, error } = await supabase
        .from(AGENT_HERMES_CONNECTIONS_TABLE)
        .update(patch)
        .eq("agent_slug", slug)
        .select("*")
        .single();
      if (error) return { data: null, error: error.message };
      return { data: toConnectionRow(data as Record<string, unknown>), error: null };
    }

    const { data, error } = await supabase
      .from(AGENT_HERMES_CONNECTIONS_TABLE)
      .insert({
        agent_slug: slug,
        runtime_agent_id: runtimeAgentId,
        hermes_namespace: namespace,
        status: "not_configured",
        connection_version: AGENT_HERMES_CONNECTION_VERSION,
        metadata: { phase: "d-f1", createdBy: "ensureAgentHermesConnection" },
      })
      .select("*")
      .single();
    if (error) return { data: null, error: error.message };
    return { data: toConnectionRow(data as Record<string, unknown>), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function ensureCanonicalAgentHermesConnections(): Promise<{
  upserted: number;
  errors: string[];
  namespaces: string[];
}> {
  const errors: string[] = [];
  const namespaces: string[] = [];
  let upserted = 0;
  for (const agent of CANONICAL_AGENTS) {
    const result = await ensureAgentHermesConnection({ agentSlug: agent.id });
    if (result.error || !result.data) {
      errors.push(`${agent.id}: ${result.error ?? "upsert failed"}`);
      continue;
    }
    upserted += 1;
    namespaces.push(result.data.hermes_namespace);
  }
  return { upserted, errors, namespaces };
}

export async function updateAgentHermesConnectionHealth(input: {
  agentSlug: string;
  status: AgentHermesConnectionStatus;
  retrievalOk: boolean;
  retrievalError?: string | null;
  touchSync?: boolean;
  previousMetadata?: Record<string, unknown>;
}): Promise<AgentOpsWriteResult<AgentHermesConnectionRow>> {
  try {
    const slug = input.agentSlug.trim().toLowerCase();
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status: input.status,
      last_health_check_at: now,
      metadata: {
        ...(input.previousMetadata ?? {}),
        phase: "d-f1",
        lastRetrievalOk: input.retrievalOk,
        lastRetrievalError: input.retrievalError ?? null,
        checkedAt: now,
      },
    };
    if (input.touchSync) patch.last_memory_sync_at = now;
    const { data, error } = await supabase
      .from(AGENT_HERMES_CONNECTIONS_TABLE)
      .update(patch)
      .eq("agent_slug", slug)
      .select("*")
      .single();
    if (error) return { data: null, error: error.message };
    return { data: toConnectionRow(data as Record<string, unknown>), error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getAgentHermesMemory(input: {
  agentSlug: string;
  runtimeAgentId?: string | null;
  ensureConnection?: boolean;
  touchSync?: boolean;
}): Promise<AgentOpsReadResult<AgentHermesMemorySnapshot>> {
  const slug = input.agentSlug.trim().toLowerCase();
  if (!slug) return { data: null, error: "agentSlug is required." };

  try {
    if (input.ensureConnection !== false) {
      const ensured = await ensureAgentHermesConnection({
        agentSlug: slug,
        runtimeAgentId: input.runtimeAgentId,
      });
      if (ensured.error) {
        // Continue read path — missing write permission should not blank the panel.
      }
    }

    const connectionResult = await getAgentHermesConnection(slug);
    if (connectionResult.error) {
      return { data: null, error: connectionResult.error };
    }
    const connection = connectionResult.data;
    const runtimeAgentId =
      input.runtimeAgentId ?? connection?.runtime_agent_id ?? (await resolveRuntimeAgentId(slug));
    const namespace = connection?.hermes_namespace ?? buildAgentHermesNamespace(slug);

    const [draftResult, runtimeResult, sharedResult] = await Promise.all([
      getAgentOpsAgentMemory(slug),
      runtimeAgentId
        ? fetchAgentScopedMemory(runtimeAgentId, 500)
        : Promise.resolve({
            data: [],
            error: "Agent runtime identity missing",
          }),
      supabase
        .from(AGENTOPS_RUNTIME_TABLES.memory)
        .select("id, approved, scope")
        .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
        .eq("scope", "global")
        .eq("approved", true)
        .limit(200),
    ]);

    const draftError = draftResult.error;
    const runtimeError = runtimeResult.error;
    const sharedError = sharedResult.error?.message ?? null;
    const retrievalOk = !draftError && !runtimeError;
    const retrievalError = draftError || runtimeError || sharedError;

    const drafts = draftResult.data ?? [];
    const approvedMemory = drafts.filter(isApprovedActiveAgentMemory);
    const pendingImprovements = drafts.filter(
      (item) => item.approvalStatus === "pending_approval",
    );
    const partitioned = partitionRuntimeMemory(runtimeResult.data ?? [], []);
    const sharedGlobalCount = sharedError
      ? 0
      : ((sharedResult.data as Array<{ id: string }> | null) ?? []).length;

    const connectionStatus = resolveConnectionStatusFromRetrieval({
      recordExists: Boolean(connection),
      retrievalOk,
      retrievalError: retrievalError || null,
      disabled: connection?.status === "disabled",
    });

    const agentHermesLabel: AgentHermesConnectionLabel =
      !runtimeAgentId
        ? "Unknown"
        : connectionStatus === "connected"
          ? "Connected"
          : connectionStatus === "error"
            ? "Error"
            : resolveAgentHermesConnectionLabel({
                agentSpecificRecordExists: false,
                runtimeAgentId,
                retrievalError: null,
                identityReady: true,
              });

    if (connection) {
      await updateAgentHermesConnectionHealth({
        agentSlug: slug,
        status: connectionStatus,
        retrievalOk,
        retrievalError: retrievalError || null,
        touchSync: input.touchSync !== false,
        previousMetadata: connection.metadata,
      });
    }

    const refreshed = await getAgentHermesConnection(slug);
    const liveConnection = refreshed.data ?? connection;

    let banner: string;
    if (agentHermesLabel === "Connected") {
      banner =
        "Agent Hermes connected. This agent has a dedicated long-term memory namespace.";
    } else if (agentHermesLabel === "Error") {
      banner = `Agent Hermes error. ${retrievalError || "Memory retrieval failed for this agent namespace."}`;
    } else if (agentHermesLabel === "Unknown") {
      banner = "Agent Hermes unknown — runtime identity is still resolving.";
    } else {
      banner =
        "Agent Hermes not configured. Fleet transport is available, but this agent does not yet have its own memory namespace.";
    }

    return {
      data: {
        agentSlug: slug,
        runtimeAgentId,
        connection: liveConnection,
        connectionStatus,
        agentHermesLabel,
        namespace,
        approvedActiveCount: approvedMemory.length,
        pendingImprovementsCount: pendingImprovements.length,
        sharedGlobalCount,
        diagnosticCount: partitioned.counts.diagnostic,
        runtimeTotalCount: partitioned.counts.runtimeTotal,
        approvedMemory,
        pendingImprovements,
        lastHealthCheckAt: liveConnection?.last_health_check_at ?? null,
        lastMemorySyncAt: liveConnection?.last_memory_sync_at ?? null,
        retrievalOk,
        retrievalError: retrievalError || null,
        banner,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function proposeAgentMemoryImprovement(input: {
  agentSlug: string;
  content: string;
  title?: string;
  source?: "agent" | "owner" | "worker" | "system";
}): Promise<AgentOpsWriteResult<{ memoryId: string }>> {
  const content = input.content.trim();
  if (!content) return { data: null, error: "content is required." };
  return addAgentOpsAgentMemory({
    agentId: input.agentSlug.trim().toLowerCase(),
    memoryType: "instruction",
    content,
    source: input.source === "owner" ? "piter" : "agentops",
    priority: "medium",
    activateImmediately: false,
    approvalStatus: "pending_approval",
    title: input.title?.trim() || "Memory improvement",
    ownerFacingType: "approved_fact",
    scope: "private",
    note: `d-f1 memory improvement · proposed_by=${input.source ?? "owner"}`,
  });
}

export async function approveAgentMemoryImprovement(input: {
  agentSlug: string;
  memoryId: string;
}): Promise<AgentOpsWriteResult<{ memoryId: string }>> {
  return setAgentOpsAgentMemoryActive({
    memoryId: input.memoryId,
    agentId: input.agentSlug.trim().toLowerCase(),
    active: true,
    approvalStatus: "active",
  });
}

export async function rejectAgentMemoryImprovement(input: {
  agentSlug: string;
  memoryId: string;
}): Promise<AgentOpsWriteResult<{ memoryId: string }>> {
  return setAgentOpsAgentMemoryActive({
    memoryId: input.memoryId,
    agentId: input.agentSlug.trim().toLowerCase(),
    active: false,
    approvalStatus: "rejected",
  });
}

export function formatHermesTestDetail(snapshot: AgentHermesMemorySnapshot, fleetAvailable: boolean): string {
  return [
    `Fleet transport: ${fleetAvailable ? "Available" : "Unavailable"}`,
    `Agent Hermes: ${snapshot.agentHermesLabel}`,
    `Namespace: ${snapshot.namespace}`,
    `Approved memory loaded: ${snapshot.approvedActiveCount}`,
    `Pending drafts: ${snapshot.pendingImprovementsCount}`,
    `Shared/global: ${snapshot.sharedGlobalCount}`,
    `Diagnostics: ${snapshot.diagnosticCount}`,
  ].join(" · ");
}
