import type { ReconciledAgentRow } from "@/lib/agentops/agentRegistryReconciliation";
import { compareProductIssuesBySeverity } from "@/lib/agentops/issues/productIssueMappers";
import type { ProductIssue } from "@/lib/agentops/issues/productIssueTypes";

import { AGENT_IDENTITY_DEFINITIONS } from "./agentIdentityDefinitions";

const BROWSER_QA_AGENT_ALIASES = new Set([
  "browser qa",
  "browser-qa",
  "browser_qa",
  "static qa",
  "static-qa",
]);

/** Open statuses for per-agent issue counts (product spec). */
export function isOpenIssueForAgentCount(issue: ProductIssue): boolean {
  const ns = issue.normalizedStatus;
  if (
    ns === "open" ||
    ns === "in_progress" ||
    ns === "pending_verification"
  ) {
    return true;
  }
  const raw = (issue.status ?? "").toLowerCase().replace(/\s+/g, "_");
  if (raw === "needs_attention" || raw.includes("needs_attention")) return true;
  if (raw === "blocked") return true;
  return false;
}

function normalizeMatchKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildAgentMatchKeys(agent: ReconciledAgentRow): Set<string> {
  const keys = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (!value?.trim()) return;
    keys.add(normalizeMatchKey(value));
    keys.add(normalizeMatchKey(value.replace(/-/g, " ")));
    keys.add(normalizeMatchKey(value.replace(/\s+/g, "-")));
  };

  add(agent.canonicalId);
  add(agent.name);
  add(agent.id);
  add(agent.role);

  const identity = AGENT_IDENTITY_DEFINITIONS[agent.canonicalId];
  if (identity) {
    add(identity.displayName);
    add(identity.role);
  }

  for (const tool of agent.tools ?? []) {
    if (typeof tool !== "string") continue;
    if (tool.startsWith("canonical:")) {
      add(tool.slice("canonical:".length));
    }
    add(tool);
  }

  return keys;
}

function reportingAgentMatches(issue: ProductIssue, matchKeys: Set<string>): boolean {
  const reporting = normalizeMatchKey(issue.reportingAgent);
  if (matchKeys.has(reporting)) return true;

  for (const key of matchKeys) {
    if (reporting.includes(key) || key.includes(reporting)) return true;
  }

  if (BROWSER_QA_AGENT_ALIASES.has(reporting)) {
    return matchKeys.has("qa agent") || matchKeys.has("qa-agent");
  }

  return false;
}

export function filterIssuesForAgent(
  issues: ProductIssue[],
  agent: ReconciledAgentRow,
): ProductIssue[] {
  const matchKeys = buildAgentMatchKeys(agent);
  return issues
    .filter(isOpenIssueForAgentCount)
    .filter((issue) => reportingAgentMatches(issue, matchKeys))
    .sort(compareProductIssuesBySeverity);
}

export function countOpenIssuesForAgent(
  issues: ProductIssue[],
  agent: ReconciledAgentRow,
): number {
  return filterIssuesForAgent(issues, agent).length;
}

export function countHighSeverityOpenIssues(
  issues: ProductIssue[],
  agent: ReconciledAgentRow,
): number {
  return filterIssuesForAgent(issues, agent).filter(
    (issue) => issue.severity === "critical" || issue.severity === "high",
  ).length;
}

export function topIssuesForAgent(
  issues: ProductIssue[],
  agent: ReconciledAgentRow,
  limit = 5,
): ProductIssue[] {
  return filterIssuesForAgent(issues, agent).slice(0, limit);
}
