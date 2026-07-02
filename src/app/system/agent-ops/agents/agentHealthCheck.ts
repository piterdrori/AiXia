/**
 * Agent registry health check — canonical-first reconciliation with Supabase.
 * Runtime activity derived from agentops_agent_logs, not agentops_agents.status.
 */

import {
  computeAgentRuntimeState,
  resolveAgentLastActivity,
  runtimeStateLabel,
} from "@/lib/agentops/agentRuntimeState";
import { EXPECTED_AGENT_COUNT } from "@/lib/agentops/canonicalAgents";
import { supabase } from "@/lib/supabase";

import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
  type AgentOpsRuntimeAgentLogRow,
  type AgentOpsRuntimeAgentRow,
} from "@/lib/agentops/db/agentOpsRuntimeTypes";

import {
  countExtraDbAgents,
  mergeAgentsWithDB,
  type ReconciledAgentRow,
} from "@/lib/agentops/agentRegistryReconciliation";

export { EXPECTED_AGENT_COUNT };

export interface AgentSystemHealth {
  total: number;
  loaded: number;
  missing: number;
  active: number;
  idle: number;
  blocked: number;
  errors: number;
  missingFields: number;
  expectedTotal: number;
  extraDbAgents: number;
  isHealthy: boolean;
}

export type AgentHealthRow = ReconciledAgentRow;

export type AgentRegistryHealthResult = {
  agents: AgentHealthRow[];
  health: AgentSystemHealth;
  fetchError: string | null;
  logsWarning: string | null;
  registryWarning: string | null;
  systemStatus: "healthy" | "degraded" | "broken";
};

/** Single Supabase request — agents roster (configuration). */
export async function fetchAllAgentsHealth() {
  return supabase
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("name", { ascending: true });
}

/** Single Supabase request — runtime logs (activity truth). */
export async function fetchAllAgentLogs() {
  return supabase
    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("created_at", { ascending: false })
    .limit(500);
}

function applyRuntimeState(
  agents: ReconciledAgentRow[],
  logs: AgentOpsRuntimeAgentLogRow[],
): ReconciledAgentRow[] {
  return agents.map((agent) => {
    const runtimeInput = {
      isMissing: agent.isMissing,
      blocked: agent.blocked,
      dbAgentId: agent.dbAgentId,
      canonicalId: agent.canonicalId,
    };

    const runtimeState = computeAgentRuntimeState(runtimeInput, logs);

    return {
      ...agent,
      runtimeState,
      displayStatus: runtimeStateLabel(runtimeState),
      last_activity: agent.isMissing ? "never" : resolveAgentLastActivity(runtimeInput, logs),
    };
  });
}

function buildHealthSummary(
  agents: AgentHealthRow[],
  dbAgents: AgentOpsRuntimeAgentRow[],
  agentsFetchError: string | null,
  logsWarning: string | null,
): AgentRegistryHealthResult {
  const present = agents.filter((agent) => !agent.isMissing);
  const missingFromDb = agents.filter((agent) => agent.isMissing).length;
  const loaded = present.length;

  const active = agents.filter((agent) => agent.runtimeState === "ACTIVE").length;
  const idle = agents.filter((agent) => agent.runtimeState === "IDLE").length;
  const blocked = agents.filter((agent) => agent.runtimeState === "BLOCKED").length;
  const missingRuntime = agents.filter((agent) => agent.runtimeState === "MISSING").length;

  const missingFields = present.reduce((sum, agent) => sum + agent.missingFields.length, 0);
  const rowErrors = present.filter((agent) => agent.hasError).length;
  const extraDbAgents = countExtraDbAgents(dbAgents, agents);

  const errors = agentsFetchError ? 1 : rowErrors;

  const health: AgentSystemHealth = {
    total: EXPECTED_AGENT_COUNT,
    loaded,
    missing: missingFromDb,
    active,
    idle,
    blocked,
    errors,
    missingFields,
    expectedTotal: EXPECTED_AGENT_COUNT,
    extraDbAgents,
    isHealthy: missingFromDb === 0 && errors === 0 && missingFields === 0,
  };

  let registryWarning: string | null = null;
  if (!agentsFetchError && missingFromDb > 0) {
    registryWarning = `Agent registry incomplete — ${missingFromDb} canonical agent${missingFromDb === 1 ? "" : "s"} not in Supabase`;
  }
  if (!agentsFetchError && extraDbAgents > 0) {
    const extraNote = `${extraDbAgents} extra DB row${extraDbAgents === 1 ? "" : "s"} not mapped to canonical registry`;
    registryWarning = registryWarning ? `${registryWarning}. ${extraNote}` : extraNote;
  }
  if (!agentsFetchError && missingRuntime > 0 && missingFromDb !== missingRuntime) {
    registryWarning = registryWarning
      ? `${registryWarning}. ${missingRuntime} agents have no runtime DB row.`
      : `${missingRuntime} agents have no runtime DB row.`;
  }

  let systemStatus: AgentRegistryHealthResult["systemStatus"];
  if (agentsFetchError || errors > 0) {
    systemStatus = "broken";
  } else if (health.isHealthy) {
    systemStatus = "healthy";
  } else {
    systemStatus = "degraded";
  }

  return {
    agents,
    health,
    fetchError: agentsFetchError,
    logsWarning,
    registryWarning,
    systemStatus,
  };
}

export async function runAgentRegistryHealthCheck(): Promise<AgentRegistryHealthResult> {
  const [agentsResult, logsResult] = await Promise.all([
    fetchAllAgentsHealth(),
    fetchAllAgentLogs(),
  ]);

  const agentsFetchError = agentsResult.error?.message ?? null;
  const logsWarning = logsResult.error?.message
    ? `Runtime logs unavailable — activity falls back to IDLE for loaded agents. (${logsResult.error.message})`
    : null;

  const dbAgents = agentsFetchError ? [] : ((agentsResult.data ?? []) as AgentOpsRuntimeAgentRow[]);
  const logs = (logsResult.data ?? []) as AgentOpsRuntimeAgentLogRow[];

  const merged = mergeAgentsWithDB(dbAgents);
  const agents = applyRuntimeState(merged, logs);

  return buildHealthSummary(agents, dbAgents, agentsFetchError, logsWarning);
}
