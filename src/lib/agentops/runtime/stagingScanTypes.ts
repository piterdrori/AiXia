/**
 * Shared staging scan types and route helpers (no Playwright dependency).
 */

import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";

export type StagingScanSeverity = "low" | "medium" | "high" | "critical";

export type StagingScanFinding = {
  page_url: string;
  issue: string;
  severity: StagingScanSeverity;
  evidence: Record<string, unknown>;
};

export const DEFAULT_SCAN_ROUTES: readonly string[] = [
  "/system/agent-ops",
  "/system/agent-ops/agents",
  "/system/agent-ops/issues",
  "/system/agent-ops/tools",
  "/finance/transactions",
  "/finance/master-data",
  "/dashboard",
  "/calendar",
];

export function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function resolveScopedRoutes(agent: AgentOpsRuntimeAgentRow): string[] {
  if (agent.scope.length > 0) {
    return agent.scope.map(normalizeRoute);
  }
  return [...DEFAULT_SCAN_ROUTES];
}

export function buildAbsolutePageUrl(stagingUrl: string, pagePath: string): string {
  const base = stagingUrl.trim().replace(/\/+$/, "");
  const path = normalizeRoute(pagePath);
  return `${base}${path}`;
}
