/**
 * Canonical AgentOps agent registry — structural source of truth in code.
 * Supabase agentops_agents holds runtime state only; this list defines the 12 agents.
 */

export type CanonicalAgent = {
  id: string;
  name: string;
  role: string;
  scope?: string[];
  tools?: string[];
};

export const CANONICAL_AGENT_TOOL_PREFIX = "canonical:";

export function canonicalAgentToolTag(id: string): string {
  return `${CANONICAL_AGENT_TOOL_PREFIX}${id}`;
}

export const CANONICAL_AGENTS: CanonicalAgent[] = [
  { id: "system-agent", name: "System Agent", role: "scanner" },
  { id: "memory-agent", name: "Memory Agent", role: "memory" },
  { id: "issue-agent", name: "Issue Agent", role: "issues" },
  { id: "evolution-agent", name: "Evolution Agent", role: "learning" },
  { id: "fix-agent", name: "Fix Agent", role: "repair" },
  { id: "qa-agent", name: "QA Agent", role: "testing" },
  { id: "design-agent", name: "Design Agent", role: "ui" },
  { id: "runtime-agent", name: "Runtime Agent", role: "execution" },
  { id: "logs-agent", name: "Logs Agent", role: "logging" },
  { id: "config-agent", name: "Config Agent", role: "configuration" },
  { id: "chat-agent", name: "Chat Agent", role: "conversation" },
  { id: "analytics-agent", name: "Analytics Agent", role: "metrics" },
];

export const EXPECTED_AGENT_COUNT = CANONICAL_AGENTS.length;
