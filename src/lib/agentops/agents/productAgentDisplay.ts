import { AGENT_IDENTITY_DEFINITIONS } from "./agentIdentityDefinitions";
import { productStatusObservedValue } from "./agentDetailDisplayCopy";

/** Human-readable job titles for product UI (not runtime role slugs). */
export const AGENT_HUMAN_ROLE: Record<string, string> = {
  "system-agent": "System Health & Infrastructure Agent",
  "memory-agent": "Memory & Knowledge Agent",
  "issue-agent": "Issue Lifecycle Agent",
  "evolution-agent": "Pattern & Evolution Agent",
  "fix-agent": "Repair Planning Agent",
  "qa-agent": "Quality Assurance Agent",
  "design-agent": "UI / UX Design Agent",
  "runtime-agent": "Runtime & Scheduling Agent",
  "logs-agent": "Logs & Observability Agent",
  "config-agent": "Configuration & Safety Agent",
  "chat-agent": "Chat & Conversation Agent",
  "analytics-agent": "Analytics & KPI Agent",
};

/** Short responsibility/module line for hub cards. */
export const AGENT_RESPONSIBILITY_SUMMARY: Record<string, string> = {
  "system-agent": "AgentOps health, module readiness, infrastructure blockers",
  "memory-agent": "Hermes memory, rules, persistent knowledge",
  "issue-agent": "Issue classification, deduplication, verification tracking",
  "evolution-agent": "Regression patterns and stored evolution observations",
  "fix-agent": "Fix planning, patch safety, repair proposals",
  "qa-agent": "Browser QA, regression detection, evidence collection",
  "design-agent": "UI consistency, visual rhythm, responsive design",
  "runtime-agent": "Schedule health, execution cycles, tool-runner status",
  "logs-agent": "Log summaries, anomaly detection, activity signals",
  "config-agent": "Environment safety, feature flags, guardrails",
  "chat-agent": "Chat persistence, provider labeling, conversation UX",
  "analytics-agent": "Metrics, KPI gaps, issue and QA trends",
};

export function getAgentHumanRole(canonicalId: string, fallbackName?: string): string {
  return AGENT_HUMAN_ROLE[canonicalId] ?? fallbackName ?? "Agent";
}

export function getAgentResponsibilitySummary(canonicalId: string): string {
  if (AGENT_RESPONSIBILITY_SUMMARY[canonicalId]) {
    return AGENT_RESPONSIBILITY_SUMMARY[canonicalId];
  }
  const identity = AGENT_IDENTITY_DEFINITIONS[canonicalId];
  if (identity?.responsibilities.length) {
    return identity.responsibilities.slice(0, 2).join(" · ");
  }
  return identity?.mission ?? "AgentOps staging responsibilities";
}

export function getAgentCurrentFocus(canonicalId: string): string {
  const identity = AGENT_IDENTITY_DEFINITIONS[canonicalId];
  if (identity?.responsibilities[0]) return identity.responsibilities[0];
  return identity?.mission ?? "Ready for manual staging work when commanded.";
}

export type ProductAgentStatus = "active" | "needs_attention" | "blocked" | "quiet";

export function productStatusLabel(status: ProductAgentStatus): string {
  return productStatusObservedValue(status);
}

export {
  buildAgentReadinessHeadlineLabel,
  buildAgentReadinessHeadlineTone,
  buildAgentReadinessModel,
  type AgentReadinessInput,
  type AgentReadinessModel,
  type AgentReadinessTone,
} from "./productAgentReadiness";

export function productStatusTone(
  status: ProductAgentStatus,
): "emerald" | "amber" | "rose" | "neutral" {
  switch (status) {
    case "active":
      return "emerald";
    case "needs_attention":
      return "amber";
    case "blocked":
      return "rose";
    case "quiet":
      return "neutral";
  }
}
