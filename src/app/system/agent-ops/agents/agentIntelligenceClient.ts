/**
 * Browser client for Agent Intelligence pages only.
 * Tables: agentops_agents, agentops_memory, agentops_agent_logs
 */

import { supabase } from "@/lib/supabase";

import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
  type AgentOpsAgentLogAction,
  type AgentOpsAgentMode,
  type AgentOpsAgentStatus,
  type AgentOpsRuntimeAgentLogRow,
  type AgentOpsRuntimeAgentRow,
  type AgentOpsRuntimeMemoryRow,
  type StoreAgentOpsRuntimeMemoryInput,
} from "@/lib/agentops/db/agentOpsRuntimeTypes";
import {
  canonicalAgentDisplayName,
  isAgentDbUuid,
  resolveCanonicalIdFromRouteParam,
  resolveDbAgentIdFromRouteParam,
} from "@/lib/agentops/agents/agentRouteResolver";
import { resolveCanonicalIdFromTools } from "@/lib/agentops/agentSeedMemoryLoader";

export type AgentIntelligenceResult<T> = {
  data: T;
  error: string | null;
};

function toError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Agent intelligence request failed";
}

export type AgentListRow = AgentOpsRuntimeAgentRow & {
  last_activity: string;
};

export type UpdateAgentInput = {
  role?: string;
  status?: AgentOpsAgentStatus;
  mode?: AgentOpsAgentMode;
  scope?: string[];
  tools?: string[];
};

export async function fetchAgentRegistry(): Promise<AgentIntelligenceResult<AgentListRow[]>> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("name", { ascending: true });

  if (error) return { data: [], error: toError(error) };

  const rows = ((data ?? []) as AgentOpsRuntimeAgentRow[]).map((agent) => ({
    ...agent,
    last_activity: agent.updated_at,
  }));

  return { data: rows, error: null };
}

export async function fetchAgentById(
  agentId: string,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeAgentRow | null>> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("*")
    .eq("id", agentId)
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .maybeSingle();

  if (error) return { data: null, error: toError(error) };
  return { data: (data as AgentOpsRuntimeAgentRow | null) ?? null, error: null };
}

export type AgentRouteResolution = {
  routeParam: string;
  dbAgentId: string | null;
  canonicalId: string | null;
};

/** Resolve canonical slug or UUID route params without crashing the UI. */
export async function fetchAgentByRouteParam(
  routeParam: string,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeAgentRow | null> & AgentRouteResolution> {
  const trimmed = routeParam.trim();
  if (!trimmed) {
    return {
      data: null,
      error: "Missing agent id.",
      routeParam: trimmed,
      dbAgentId: null,
      canonicalId: null,
    };
  }

  if (isAgentDbUuid(trimmed)) {
    const result = await fetchAgentById(trimmed);
    return {
      ...result,
      routeParam: trimmed,
      dbAgentId: result.data?.id ?? null,
      canonicalId: resolveCanonicalIdFromTools(result.data?.tools ?? []) ?? null,
    };
  }

  const canonicalId = resolveCanonicalIdFromRouteParam(trimmed);
  if (!canonicalId) {
    return {
      data: null,
      error: `Unknown agent route "${trimmed}". Open the Agents hub and pick a roster entry.`,
      routeParam: trimmed,
      dbAgentId: null,
      canonicalId: null,
    };
  }

  const registry = await fetchAgentRegistry();
  if (registry.error && registry.data.length === 0) {
    return {
      data: null,
      error: registry.error,
      routeParam: trimmed,
      dbAgentId: null,
      canonicalId,
    };
  }

  const { dbAgentId } = resolveDbAgentIdFromRouteParam(trimmed, registry.data);
  if (!dbAgentId) {
    const label = canonicalAgentDisplayName(canonicalId) ?? canonicalId;
    return {
      data: null,
      error: `${label} is not initialized in staging runtime. Initialize missing agents from the Agents hub.`,
      routeParam: trimmed,
      dbAgentId: null,
      canonicalId,
    };
  }

  const result = await fetchAgentById(dbAgentId);
  if (result.error) {
    return {
      ...result,
      routeParam: trimmed,
      dbAgentId,
      canonicalId,
    };
  }

  if (!result.data) {
    const label = canonicalAgentDisplayName(canonicalId) ?? canonicalId;
    return {
      data: null,
      error: `${label} runtime row was not found. Try refreshing the Agents hub.`,
      routeParam: trimmed,
      dbAgentId,
      canonicalId,
    };
  }

  return {
    ...result,
    routeParam: trimmed,
    dbAgentId,
    canonicalId,
  };
}

export async function fetchAgentScopedMemory(
  agentId: string,
  limit = 50,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeMemoryRow[]>> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.memory)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .eq("scope", "agent")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: toError(error) };
  return { data: (data ?? []) as AgentOpsRuntimeMemoryRow[], error: null };
}

export async function fetchAgentRuntimeLogs(
  agentId: string,
  limit = 100,
  order: "asc" | "desc" = "desc",
): Promise<AgentIntelligenceResult<AgentOpsRuntimeAgentLogRow[]>> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: order === "asc" })
    .limit(limit);

  if (error) return { data: [], error: toError(error) };
  return { data: (data ?? []) as AgentOpsRuntimeAgentLogRow[], error: null };
}

export async function fetchAgentChatLogs(
  agentId: string,
  limit = 300,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeAgentLogRow[]>> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .eq("agent_id", agentId)
    .eq("action", "memory_update")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return { data: [], error: toError(error) };

  const rows = ((data ?? []) as AgentOpsRuntimeAgentLogRow[]).filter((row) => {
    const kind = row.payload?.kind;
    return kind === "chat" || kind === "reasoning_step";
  });

  return { data: rows, error: null };
}

export async function updateAgentMemoryEntry(
  memoryId: string,
  content: Record<string, unknown>,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeMemoryRow | null>> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.memory)
    .update({ content, approved: true })
    .eq("id", memoryId)
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .select("*")
    .single();

  if (error) return { data: null, error: toError(error) };
  return { data: data as AgentOpsRuntimeMemoryRow, error: null };
}

export async function updateAgentRecord(
  agentId: string,
  input: UpdateAgentInput,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeAgentRow | null>> {
  const patch: Record<string, unknown> = {};
  if (input.role !== undefined) patch.role = input.role.trim();
  if (input.status !== undefined) patch.status = input.status;
  if (input.mode !== undefined) patch.mode = input.mode;
  if (input.scope !== undefined) patch.scope = input.scope;
  if (input.tools !== undefined) patch.tools = input.tools;

  if (Object.keys(patch).length === 0) {
    return { data: null, error: "No configuration changes to save." };
  }

  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .update(patch)
    .eq("id", agentId)
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .select("*")
    .single();

  if (error) return { data: null, error: toError(error) };
  return { data: data as AgentOpsRuntimeAgentRow, error: null };
}

export async function storeAgentMemoryEntry(
  input: StoreAgentOpsRuntimeMemoryInput,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeMemoryRow | null>> {
  if (input.scope !== "agent" || !input.agent_id) {
    return { data: null, error: "Agent-scoped memory requires agent_id." };
  }

  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.memory)
    .insert({
      scope: "agent",
      agent_id: input.agent_id,
      content: input.content,
      source: input.source,
      approved: input.approved ?? false,
      environment: AGENTOPS_RUNTIME_ENVIRONMENT,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: toError(error) };
  return { data: data as AgentOpsRuntimeMemoryRow, error: null };
}

export async function logAgentChatAction(
  agentId: string,
  action: AgentOpsAgentLogAction,
  payload: Record<string, unknown>,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeAgentLogRow | null>> {
  return logAgentRuntimeAction(agentId, action, payload);
}

export async function logAgentRuntimeAction(
  agentId: string,
  action: AgentOpsAgentLogAction,
  payload: Record<string, unknown>,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeAgentLogRow | null>> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)
    .insert({
      agent_id: agentId,
      action,
      payload,
      environment: AGENTOPS_RUNTIME_ENVIRONMENT,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: toError(error) };
  return { data: data as AgentOpsRuntimeAgentLogRow, error: null };
}

export async function setAgentBlocked(
  agentId: string,
  blocked: boolean,
): Promise<AgentIntelligenceResult<AgentOpsRuntimeAgentRow | null>> {
  return updateAgentRecord(agentId, { status: blocked ? "blocked" : "active" });
}

export async function deleteAgentScopedMemory(
  agentId: string,
): Promise<{ error: string | null; deleted: number }> {
  const { data, error } = await supabase
    .from(AGENTOPS_RUNTIME_TABLES.memory)
    .delete()
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .eq("scope", "agent")
    .eq("agent_id", agentId)
    .select("id");

  if (error) return { error: toError(error), deleted: 0 };
  return { error: null, deleted: (data ?? []).length };
}
