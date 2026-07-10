export type AgentOwnerMeta = {
  jobTitle: string;
  responsibility: string;
  username: string;
};

export const AGENT_OWNER_META: Record<string, AgentOwnerMeta> = {
  "system-agent": {
    username: "@aixia.system-agent",
    jobTitle: "System reviewer",
    responsibility: "Reviews core platform routes, navigation, and system health.",
  },
  "memory-agent": {
    username: "@aixia.memory-agent",
    jobTitle: "Memory curator",
    responsibility: "Finds memory gaps and proposes what AgentOps should remember.",
  },
  "issue-agent": {
    username: "@aixia.issue-agent",
    jobTitle: "Issue analyst",
    responsibility: "Turns findings into clear, actionable issue drafts.",
  },
  "evolution-agent": {
    username: "@aixia.evolution-agent",
    jobTitle: "Improvement scout",
    responsibility: "Looks for workflow and product improvements across staging.",
  },
  "fix-agent": {
    username: "@aixia.fix-agent",
    jobTitle: "Fix planner",
    responsibility: "Suggests safe fixes for confirmed problems.",
  },
  "qa-agent": {
    username: "@aixia.qa-agent",
    jobTitle: "Quality reviewer",
    responsibility: "Runs browser checks and validates user-facing quality.",
  },
  "design-agent": {
    username: "@aixia.design-agent",
    jobTitle: "Design reviewer",
    responsibility: "Reviews UI consistency against the AiXia design system.",
  },
  "runtime-agent": {
    username: "@aixia.runtime-agent",
    jobTitle: "Runtime checker",
    responsibility: "Monitors runtime behavior, APIs, and execution safety.",
  },
  "logs-agent": {
    username: "@aixia.logs-agent",
    jobTitle: "Logs reviewer",
    responsibility: "Scans logs and operational signals for anomalies.",
  },
  "config-agent": {
    username: "@aixia.config-agent",
    jobTitle: "Config reviewer",
    responsibility: "Checks configuration, env boundaries, and staging setup.",
  },
  "chat-agent": {
    username: "@aixia.chat-agent",
    jobTitle: "Chat reviewer",
    responsibility: "Reviews chat flows, voice surfaces, and agent messaging.",
  },
  "analytics-agent": {
    username: "@aixia.analytics-agent",
    jobTitle: "Analytics reviewer",
    responsibility: "Reviews metrics, dashboards, and reporting surfaces.",
  },
};

export function getAgentOwnerMeta(agentSlug: string, fallback?: Partial<AgentOwnerMeta>): AgentOwnerMeta {
  const base = AGENT_OWNER_META[agentSlug];
  if (base) return base;
  return {
    username: fallback?.username ?? `@aixia.${agentSlug}`,
    jobTitle: fallback?.jobTitle ?? "Agent reviewer",
    responsibility: fallback?.responsibility ?? "Reviews assigned staging areas daily.",
  };
}
