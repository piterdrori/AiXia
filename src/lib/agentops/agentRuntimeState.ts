/**
 * Derived agent runtime state — agentops_agent_logs are runtime truth.
 * agentops_agents.status is configuration only (blocked flag).
 */

import type { AgentOpsRuntimeAgentLogRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";

export const RUNTIME_ACTIVITY_WINDOW_MS = 10 * 60 * 1000;

export type AgentRuntimeState = "ACTIVE" | "IDLE" | "BLOCKED" | "MISSING";

export type AgentRuntimeInput = {
  isMissing: boolean;
  blocked?: boolean;
  dbAgentId?: string | null;
  canonicalId?: string;
};

export function runtimeStateLabel(state: AgentRuntimeState): string {
  return state;
}

function collectAgentIds(agent: AgentRuntimeInput): Set<string> {
  const ids = new Set<string>();
  if (agent.dbAgentId?.trim()) ids.add(agent.dbAgentId.trim());
  if (agent.canonicalId?.trim()) ids.add(agent.canonicalId.trim());
  return ids;
}

export function getLastLogTime(
  agent: AgentRuntimeInput | string,
  logs: AgentOpsRuntimeAgentLogRow[],
): Date | null {
  const ids =
    typeof agent === "string"
      ? new Set([agent.trim()].filter(Boolean))
      : collectAgentIds(agent);

  if (ids.size === 0) return null;

  let latest: Date | null = null;
  for (const log of logs) {
    if (!ids.has(log.agent_id)) continue;
    const parsed = new Date(log.created_at);
    if (Number.isNaN(parsed.getTime())) continue;
    if (!latest || parsed > latest) latest = parsed;
  }

  return latest;
}

export function formatLastActivityTime(value: Date | null): string {
  if (!value) return "never";
  return value.toLocaleString();
}

export function hasRecentLogActivity(
  agent: AgentRuntimeInput,
  logs: AgentOpsRuntimeAgentLogRow[],
  nowMs: number = Date.now(),
): boolean {
  const lastActivity = getLastLogTime(agent, logs);
  return Boolean(lastActivity && nowMs - lastActivity.getTime() < RUNTIME_ACTIVITY_WINDOW_MS);
}

/**
 * Runtime activity rule (logs-first):
 * - MISSING: no DB row / not reconciled
 * - BLOCKED: DB config flag
 * - ACTIVE: log within last 10 minutes
 * - IDLE: exists in DB, no recent logs
 */
export function computeAgentRuntimeState(
  agent: AgentRuntimeInput | null | undefined,
  logs: AgentOpsRuntimeAgentLogRow[],
  nowMs: number = Date.now(),
): AgentRuntimeState {
  if (!agent || agent.isMissing || !agent.dbAgentId) {
    return "MISSING";
  }

  if (agent.blocked) {
    return "BLOCKED";
  }

  if (hasRecentLogActivity(agent, logs, nowMs)) {
    return "ACTIVE";
  }

  return "IDLE";
}

export function resolveAgentLastActivity(
  agent: AgentRuntimeInput,
  logs: AgentOpsRuntimeAgentLogRow[],
): string {
  if (agent.isMissing || !agent.dbAgentId) return "never";
  return formatLastActivityTime(getLastLogTime(agent, logs));
}
