/**
 * Idempotent staging initializer — inserts missing canonical agents and emits activation logs.
 */

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { mergeAgentsWithDB } from "@/lib/agentops/agentRegistryReconciliation";
import { RUNTIME_ACTIVITY_WINDOW_MS } from "@/lib/agentops/agentRuntimeState";
import {
  CANONICAL_AGENTS,
  canonicalAgentToolTag,
  EXPECTED_AGENT_COUNT,
  type CanonicalAgent,
} from "@/lib/agentops/canonicalAgents";
import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
  type AgentOpsRuntimeAgentLogRow,
  type AgentOpsRuntimeAgentRow,
} from "@/lib/agentops/db/agentOpsRuntimeTypes";
export const AGENT_ACTIVATION_LOG_ACTION = "cycle_complete" as const;
export const INITIALIZE_CANONICAL_AGENTS_API = "/api/agentops/initialize-canonical-agents";

export interface EnsureCanonicalAgentsResult {
  expected: number;
  loadedBefore: number;
  inserted: number;
  activated: number;
  totalAfter: number;
  rawDbRowCount: number;
  verifiedLogs: number;
  errors: string[];
}

export type EnsureCanonicalAgentsApiResponse = EnsureCanonicalAgentsResult & {
  success: boolean;
  error?: string;
};

export type InitializeCanonicalAgentsCallResult = {
  result: EnsureCanonicalAgentsApiResponse;
  httpStatus: number;
};

/** @deprecated Use EnsureCanonicalAgentsResult */
export type CanonicalAgentsInitResult = EnsureCanonicalAgentsResult;

function isDevEnvironment(): boolean {
  return import.meta.env.DEV;
}

function logInitializerDev(message: string, payload?: unknown): void {
  if (!isDevEnvironment()) return;
  if (payload !== undefined) {
    console.log(`[AgentOps initializer] ${message}`, payload);
  } else {
    console.log(`[AgentOps initializer] ${message}`);
  }
}

function formatSupabaseError(context: string, error: PostgrestError | Error | { message: string; code?: string }): string {
  const code = "code" in error && error.code ? ` [${error.code}]` : "";
  const message = error.message || "Unknown Supabase error";
  const lower = message.toLowerCase();

  if (
    code.includes("42501") ||
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("violates row-level security")
  ) {
    return (
      `${context}: Supabase write blocked${code} — ${message}. ` +
      "You may not be authenticated as owner or agentops_is_owner() is false. " +
      "Use the server initializer API with SUPABASE_SERVICE_ROLE_KEY configured."
    );
  }

  if (code.includes("23505") || lower.includes("duplicate key")) {
    return `${context}: duplicate agent row${code} — ${message}`;
  }

  return `${context}${code}: ${message}`;
}

function assertStagingInitializerAllowed(): string | null {
  if (AGENTOPS_RUNTIME_ENVIRONMENT !== "staging") {
    return "Canonical agent initializer is staging-only.";
  }

  if (typeof import.meta !== "undefined") {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const runtimeEnv = env?.VITE_AGENTOPS_ENVIRONMENT?.trim();
    if (runtimeEnv && runtimeEnv !== "staging") {
      return "Canonical agent initializer blocked — VITE_AGENTOPS_ENVIRONMENT is not staging.";
    }
  }

  if (typeof process !== "undefined") {
    const runtimeEnv = process.env.AGENTOPS_ENVIRONMENT?.trim() ?? process.env.VITE_AGENTOPS_ENVIRONMENT?.trim();
    if (runtimeEnv && runtimeEnv !== "staging") {
      return "Canonical agent initializer blocked — AGENTOPS_ENVIRONMENT is not staging.";
    }
  }

  return null;
}

async function fetchDbAgents(client: SupabaseClient): Promise<{
  agents: AgentOpsRuntimeAgentRow[];
  error: string | null;
}> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("name", { ascending: true });

  if (error) return { agents: [], error: formatSupabaseError("Select agentops_agents", error) };
  return { agents: (data ?? []) as AgentOpsRuntimeAgentRow[], error: null };
}

function canonicalInsertPayload(canonical: CanonicalAgent) {
  return {
    name: canonical.name,
    role: canonical.role,
    status: "active" as const,
    mode: "scheduled" as const,
    scope: canonical.scope ?? [canonical.role],
    tools: canonical.tools ?? [canonicalAgentToolTag(canonical.id)],
    environment: AGENTOPS_RUNTIME_ENVIRONMENT,
  };
}

async function insertMissingCanonicalAgents(
  client: SupabaseClient,
  dbAgents: AgentOpsRuntimeAgentRow[],
): Promise<{ inserted: number; errors: string[] }> {
  const reconciled = mergeAgentsWithDB(dbAgents);
  const missing = reconciled.filter((row) => row.isMissing);
  const errors: string[] = [];
  let inserted = 0;

  for (const slot of missing) {
    const canonical = CANONICAL_AGENTS.find((entry) => entry.id === slot.canonicalId);
    if (!canonical) continue;

    const { data, error } = await client
      .from(AGENTOPS_RUNTIME_TABLES.agents)
      .insert(canonicalInsertPayload(canonical))
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        logInitializerDev(`Skipped duplicate insert for ${canonical.name}`, error);
        continue;
      }
      errors.push(formatSupabaseError(`Insert ${canonical.name}`, error));
      continue;
    }

    if (!data) {
      errors.push(`Insert ${canonical.name}: Supabase returned no row after insert.`);
      continue;
    }

    inserted += 1;
    logInitializerDev(`Inserted ${canonical.name}`, data);
  }

  return { inserted, errors };
}

async function repairCanonicalAgentDrift(
  client: SupabaseClient,
  reconciled: ReturnType<typeof mergeAgentsWithDB>,
): Promise<{ repaired: number; errors: string[] }> {
  const errors: string[] = [];
  let repaired = 0;

  for (const row of reconciled) {
    if (row.isMissing || !row.dbAgentId) continue;

    const canonical = CANONICAL_AGENTS.find((entry) => entry.id === row.canonicalId);
    if (!canonical) continue;

    const expectedCanonicalTool = canonicalAgentToolTag(canonical.id);
    const currentTools = row.tools ?? [];
    const hasCanonicalTool = currentTools.includes(expectedCanonicalTool);
    const needsNameFix = row.name.trim() !== canonical.name;
    const needsToolsFix = !hasCanonicalTool;

    if (!needsNameFix && !needsToolsFix) continue;

    const preservedTools = currentTools.filter(
      (tool) =>
        !tool.startsWith("canonical:") &&
        tool !== "playwright" &&
        tool.trim().length > 0,
    );
    const nextTools = [...new Set([expectedCanonicalTool, ...preservedTools])];

    const updatePayload: {
      name?: string;
      tools?: string[];
    } = {};

    if (needsNameFix) updatePayload.name = canonical.name;
    if (needsToolsFix) updatePayload.tools = nextTools;

    const { data, error } = await client
      .from(AGENTOPS_RUNTIME_TABLES.agents)
      .update(updatePayload)
      .eq("id", row.dbAgentId)
      .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
      .select("id")
      .maybeSingle();

    if (error) {
      errors.push(formatSupabaseError(`Repair drift ${row.name}`, error));
      continue;
    }

    if (!data) {
      errors.push(`Repair drift ${row.name}: no row updated.`);
      continue;
    }

    repaired += 1;
    logInitializerDev(`Repaired canonical drift for ${canonical.name}`, updatePayload);
  }

  return { repaired, errors };
}

async function activateCanonicalAgents(
  client: SupabaseClient,
  reconciled: ReturnType<typeof mergeAgentsWithDB>,
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  const targets = reconciled.filter((row) => !row.isMissing && row.dbAgentId && !row.blocked);

  for (const row of targets) {
    const { data, error } = await client
      .from(AGENTOPS_RUNTIME_TABLES.agents)
      .update({ status: "active", mode: "scheduled" })
      .eq("id", row.dbAgentId!)
      .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
      .select("id")
      .maybeSingle();

    if (error) {
      errors.push(formatSupabaseError(`Update config ${row.name}`, error));
      continue;
    }

    if (!data) {
      errors.push(`Update config ${row.name}: no row updated (agent may be missing or blocked by RLS).`);
    }
  }

  return { errors };
}

async function writeActivationLogs(
  client: SupabaseClient,
  reconciled: ReturnType<typeof mergeAgentsWithDB>,
): Promise<{ activated: number; errors: string[]; agentIds: string[] }> {
  const errors: string[] = [];
  const targets = reconciled.filter((row) => !row.isMissing && row.dbAgentId && !row.blocked);

  if (targets.length === 0) {
    return { activated: 0, errors: ["No loaded agents available for activation logs."], agentIds: [] };
  }

  const logRows = targets.map((row) => ({
    agent_id: row.dbAgentId!,
    action: AGENT_ACTIVATION_LOG_ACTION,
    payload: {
      source: "agentops-initializer",
      kind: "activation",
      canonical_id: row.canonicalId,
      message: "Agent initialized and activated",
      emitted_at: new Date().toISOString(),
    },
    environment: AGENTOPS_RUNTIME_ENVIRONMENT,
  }));

  const { data, error } = await client.from(AGENTOPS_RUNTIME_TABLES.agentLogs).insert(logRows).select("id, agent_id");

  if (error) {
    errors.push(formatSupabaseError("Insert agentops_agent_logs", error));
    return { activated: 0, errors, agentIds: [] };
  }

  const written = (data ?? []).length;
  if (written !== logRows.length) {
    errors.push(
      `Insert agentops_agent_logs: expected ${logRows.length} rows, Supabase returned ${written}.`,
    );
  }

  return {
    activated: written,
    errors,
    agentIds: targets.map((row) => row.dbAgentId!),
  };
}

async function verifyRecentActivationLogs(
  client: SupabaseClient,
  agentIds: string[],
): Promise<{ verifiedLogs: number; errors: string[] }> {
  if (agentIds.length === 0) {
    return { verifiedLogs: 0, errors: [] };
  }

  const since = new Date(Date.now() - RUNTIME_ACTIVITY_WINDOW_MS).toISOString();
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)
    .select("agent_id, created_at, payload")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .eq("action", AGENT_ACTIVATION_LOG_ACTION)
    .gte("created_at", since)
    .in("agent_id", agentIds);

  if (error) {
    return { verifiedLogs: 0, errors: [formatSupabaseError("Verify agentops_agent_logs", error)] };
  }

  const rows = (data ?? []) as AgentOpsRuntimeAgentLogRow[];
  const agentsWithLogs = new Set(rows.map((row) => row.agent_id));
  return { verifiedLogs: agentsWithLogs.size, errors: [] };
}

export async function ensureCanonicalAgentsInitializedWithClient(
  client: SupabaseClient,
): Promise<EnsureCanonicalAgentsResult> {
  const guardError = assertStagingInitializerAllowed();
  if (guardError) {
    return {
      expected: EXPECTED_AGENT_COUNT,
      loadedBefore: 0,
      inserted: 0,
      activated: 0,
      totalAfter: 0,
      rawDbRowCount: 0,
      verifiedLogs: 0,
      errors: [guardError],
    };
  }

  const errors: string[] = [];

  const initialFetch = await fetchDbAgents(client);
  if (initialFetch.error) errors.push(initialFetch.error);

  const loadedBefore = mergeAgentsWithDB(initialFetch.agents).filter((row) => !row.isMissing).length;

  const insertResult = await insertMissingCanonicalAgents(client, initialFetch.agents);
  errors.push(...insertResult.errors);

  const afterInsertFetch = await fetchDbAgents(client);
  if (afterInsertFetch.error) errors.push(afterInsertFetch.error);

  let reconciled = mergeAgentsWithDB(afterInsertFetch.agents);
  const repairResult = await repairCanonicalAgentDrift(client, reconciled);
  errors.push(...repairResult.errors);

  if (repairResult.repaired > 0) {
    const afterRepairFetch = await fetchDbAgents(client);
    if (afterRepairFetch.error) errors.push(afterRepairFetch.error);
    reconciled = mergeAgentsWithDB(afterRepairFetch.agents);
  }

  const rawDbRowCount = afterInsertFetch.agents.length;
  const totalAfter = reconciled.filter((row) => !row.isMissing).length;

  if (insertResult.inserted > 0 && totalAfter <= loadedBefore) {
    errors.push(
      `Insert verification failed: reported ${insertResult.inserted} inserts but reconciled count stayed at ${totalAfter}.`,
    );
  }

  const configResult = await activateCanonicalAgents(client, reconciled);
  errors.push(...configResult.errors);

  const logResult = await writeActivationLogs(client, reconciled);
  errors.push(...logResult.errors);

  const verifyResult = await verifyRecentActivationLogs(client, logResult.agentIds);
  errors.push(...verifyResult.errors);

  if (logResult.activated > 0 && verifyResult.verifiedLogs < logResult.agentIds.length) {
    errors.push(
      `Activation log verification: expected recent logs for ${logResult.agentIds.length} agents, verified ${verifyResult.verifiedLogs}.`,
    );
  }

  const result: EnsureCanonicalAgentsResult = {
    expected: EXPECTED_AGENT_COUNT,
    loadedBefore,
    inserted: insertResult.inserted,
    activated: logResult.activated,
    totalAfter,
    rawDbRowCount,
    verifiedLogs: verifyResult.verifiedLogs,
    errors,
  };

  if (isDevEnvironment()) {
    console.group("AgentOps initializer");
    console.log(result);
    console.groupEnd();
  }

  return result;
}

function emptyApiResult(errors: string[], error?: string): EnsureCanonicalAgentsApiResponse {
  return {
    success: false,
    expected: EXPECTED_AGENT_COUNT,
    loadedBefore: 0,
    inserted: 0,
    activated: 0,
    totalAfter: 0,
    rawDbRowCount: 0,
    verifiedLogs: 0,
    errors,
    ...(error ? { error } : {}),
  };
}

export async function callInitializeCanonicalAgentsApi(): Promise<InitializeCanonicalAgentsCallResult> {
  let response: Response;

  try {
    response = await fetch(INITIALIZE_CANONICAL_AGENTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Network error calling initializer API (is the dev server running?)";
    return {
      httpStatus: 0,
      result: emptyApiResult([message], message),
    };
  }

  let payload: EnsureCanonicalAgentsApiResponse;
  try {
    payload = (await response.json()) as EnsureCanonicalAgentsApiResponse;
  } catch {
    const message = `Initializer API returned non-JSON response (HTTP ${response.status}).`;
    return {
      httpStatus: response.status,
      result: emptyApiResult([message], message),
    };
  }

  if (!response.ok) {
    const apiError =
      payload.error ??
      payload.errors[0] ??
      response.statusText ??
      `Initializer API failed with HTTP ${response.status}`;
    return {
      httpStatus: response.status,
      result: {
        ...emptyApiResult([apiError], apiError),
        ...payload,
        success: false,
        errors: payload.errors?.length ? payload.errors : [apiError],
        error: apiError,
      },
    };
  }

  return {
    httpStatus: response.status,
    result: {
      ...payload,
      success: isInitializerSuccess(payload),
    },
  };
}

/** Calls POST /api/agentops/initialize-canonical-agents only (no browser Supabase writes). */
export async function ensureCanonicalAgentsInitialized(): Promise<InitializeCanonicalAgentsCallResult> {
  return callInitializeCanonicalAgentsApi();
}

export function isInitializerSuccess(result: EnsureCanonicalAgentsResult): boolean {
  return (
    result.errors.length === 0 &&
    result.totalAfter === result.expected &&
    result.verifiedLogs === result.expected
  );
}
