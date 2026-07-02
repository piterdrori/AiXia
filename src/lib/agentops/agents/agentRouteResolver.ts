/**
 * Agent route param resolution — canonical slug vs Supabase UUID.
 * Display/routing only; does not change agent registry structure.
 */

import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import { mergeAgentsWithDB } from "@/lib/agentops/agentRegistryReconciliation";
import type { AgentOpsRuntimeAgentRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAgentDbUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function resolveCanonicalIdFromRouteParam(routeParam: string): string | null {
  const trimmed = routeParam.trim();
  if (!trimmed || isAgentDbUuid(trimmed)) return null;

  const normalized = trimmed.toLowerCase();
  const match = CANONICAL_AGENTS.find(
    (entry) =>
      entry.id.toLowerCase() === normalized ||
      entry.name.toLowerCase().replace(/\s+/g, "-") === normalized,
  );
  return match?.id ?? null;
}

export function resolveDbAgentIdFromRouteParam(
  routeParam: string,
  dbAgents: AgentOpsRuntimeAgentRow[],
): { dbAgentId: string | null; canonicalId: string | null } {
  const trimmed = routeParam.trim();
  if (!trimmed) return { dbAgentId: null, canonicalId: null };

  if (isAgentDbUuid(trimmed)) {
    const row = dbAgents.find((agent) => agent.id === trimmed);
    return { dbAgentId: row?.id ?? trimmed, canonicalId: null };
  }

  const canonicalId = resolveCanonicalIdFromRouteParam(trimmed);
  if (!canonicalId) return { dbAgentId: null, canonicalId: null };

  const reconciled = mergeAgentsWithDB(dbAgents);
  const match = reconciled.find((row) => row.canonicalId === canonicalId);
  if (!match || match.isMissing || !match.dbAgentId) {
    return { dbAgentId: null, canonicalId };
  }

  return { dbAgentId: match.dbAgentId, canonicalId };
}

export function canonicalAgentDisplayName(canonicalId: string | null): string | null {
  if (!canonicalId) return null;
  return CANONICAL_AGENTS.find((entry) => entry.id === canonicalId)?.name ?? canonicalId;
}
