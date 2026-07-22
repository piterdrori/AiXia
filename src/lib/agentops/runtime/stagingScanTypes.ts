/**
 * Shared staging scan types and route helpers (no Playwright dependency).
 * Role-first law: every agent scans the full site inventory (not per-agent subsets).
 */

import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";
import { FULL_SITE_ROUTE_INVENTORY } from "./fullSiteRouteInventory";

export type StagingScanSeverity = "low" | "medium" | "high" | "critical";

export type StagingScanFinding = {
  page_url: string;
  issue: string;
  severity: StagingScanSeverity;
  evidence: Record<string, unknown>;
};

/** @deprecated Use FULL_SITE_ROUTE_INVENTORY — kept as alias for older imports. */
export const DEFAULT_SCAN_ROUTES: readonly string[] = FULL_SITE_ROUTE_INVENTORY;

export function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Resolve routes for a staging scan.
 * Role-first: always return the full site inventory.
 * Stale agent.scope values (role tokens or leftover self-page lists) are ignored.
 * Callers that need a focused one-off list must pass `routes` on the scanner options.
 */
export function resolveScopedRoutes(_agent: AgentOpsRuntimeAgentRow): string[] {
  return [...FULL_SITE_ROUTE_INVENTORY];
}

export function buildAbsolutePageUrl(stagingUrl: string, pagePath: string): string {
  const base = stagingUrl.trim().replace(/\/+$/, "");
  const path = normalizeRoute(pagePath);
  return `${base}${path}`;
}

export { FULL_SITE_ROUTE_INVENTORY, FULL_SITE_ROUTE_COUNT } from "./fullSiteRouteInventory";
