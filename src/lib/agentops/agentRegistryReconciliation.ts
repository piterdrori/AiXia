/**
 * Merge canonical agent structure with Supabase runtime rows.
 * Canonical-first: always returns exactly one row per canonical agent.
 */

import type { AgentRuntimeState } from "@/lib/agentops/agentRuntimeState";
import {
  CANONICAL_AGENTS,
  EXPECTED_AGENT_COUNT,
  type CanonicalAgent,
} from "@/lib/agentops/canonicalAgents";
import type {
  AgentOpsAgentMode,
  AgentOpsRuntimeAgentRow,
} from "@/lib/agentops/db/agentOpsRuntimeTypes";

export type ReconciledAgentRow = {
  canonicalId: string;
  id: string;
  name: string;
  role: string;
  runtimeState: AgentRuntimeState;
  displayStatus: string;
  mode: AgentOpsAgentMode | null;
  displayMode: string;
  last_activity: string;
  scope: string[];
  tools: string[];
  isMissing: boolean;
  blocked: boolean;
  dbAgentId: string | null;
  missingFields: string[];
  hasError: boolean;
  dbRow: AgentOpsRuntimeAgentRow | null;
};

type DbAgentLike = {
  id?: string;
  name?: string;
  role?: string;
  status?: string;
  mode?: string;
  scope?: string[];
  tools?: string[];
  updated_at?: string;
};

const VALID_MODES = new Set<AgentOpsAgentMode>(["scheduled", "continuous"]);

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildDbLookup(dbAgents: DbAgentLike[]): Map<string, AgentOpsRuntimeAgentRow> {
  const byKey = new Map<string, AgentOpsRuntimeAgentRow>();
  const usedRowIds = new Set<string>();

  const register = (key: string, row: AgentOpsRuntimeAgentRow) => {
    if (!key || byKey.has(key)) return;
    byKey.set(key, row);
  };

  for (const raw of dbAgents) {
    const row = raw as AgentOpsRuntimeAgentRow;
    if (!row.id || usedRowIds.has(row.id)) continue;
    usedRowIds.add(row.id);

    register(normalizeKey(row.id), row);
    if (row.name) register(normalizeKey(row.name), row);
    if (row.role) register(normalizeKey(row.role), row);
    for (const tool of row.tools ?? []) {
      if (typeof tool !== "string" || !tool.startsWith("canonical:")) continue;
      register(normalizeKey(tool), row);
      register(normalizeKey(tool.slice("canonical:".length)), row);
    }
  }

  return byKey;
}

function findDbMatch(
  canonical: CanonicalAgent,
  lookup: Map<string, AgentOpsRuntimeAgentRow>,
): AgentOpsRuntimeAgentRow | null {
  return (
    lookup.get(normalizeKey(canonical.id)) ??
    lookup.get(normalizeKey(`canonical:${canonical.id}`)) ??
    lookup.get(normalizeKey(canonical.name)) ??
    lookup.get(normalizeKey(canonical.role)) ??
    null
  );
}

function normalizeDbMode(mode: string | undefined): {
  mode: AgentOpsAgentMode | null;
  displayMode: string;
  missing: boolean;
  invalid: boolean;
} {
  if (!mode?.trim()) {
    return { mode: null, displayMode: "scheduled", missing: true, invalid: false };
  }
  const normalized = mode.trim().toLowerCase() as AgentOpsAgentMode;
  if (!VALID_MODES.has(normalized)) {
    return { mode: null, displayMode: "scheduled", missing: false, invalid: true };
  }
  return { mode: normalized, displayMode: normalized, missing: false, invalid: false };
}

function createMissingPlaceholder(canonical: CanonicalAgent): ReconciledAgentRow {
  return {
    canonicalId: canonical.id,
    id: canonical.id,
    name: canonical.name,
    role: canonical.role,
    runtimeState: "MISSING",
    displayStatus: "MISSING",
    mode: null,
    displayMode: "not_initialized",
    last_activity: "never",
    scope: [],
    tools: [],
    isMissing: true,
    blocked: false,
    dbAgentId: null,
    missingFields: [],
    hasError: false,
    dbRow: null,
  };
}

function createDbRow(canonical: CanonicalAgent, db: AgentOpsRuntimeAgentRow): ReconciledAgentRow {
  const missingFields: string[] = [];
  let hasError = false;

  if (!db.id?.trim()) {
    missingFields.push("id");
    hasError = true;
  }
  if (!db.name?.trim()) missingFields.push("name");

  const blocked = db.status?.trim().toLowerCase() === "blocked";
  if (!db.status?.trim()) missingFields.push("status");

  const modeResult = normalizeDbMode(db.mode);
  if (modeResult.missing) missingFields.push("mode");
  if (modeResult.invalid) hasError = true;

  return {
    canonicalId: canonical.id,
    id: db.id,
    name: db.name?.trim() || canonical.name,
    role: db.role?.trim() || canonical.role,
    runtimeState: "IDLE",
    displayStatus: "IDLE",
    mode: modeResult.mode,
    displayMode: modeResult.displayMode,
    last_activity: "never",
    scope: Array.isArray(db.scope) ? db.scope.filter((v): v is string => typeof v === "string") : [],
    tools: Array.isArray(db.tools) ? db.tools.filter((v): v is string => typeof v === "string") : [],
    isMissing: false,
    blocked,
    dbAgentId: db.id,
    missingFields,
    hasError,
    dbRow: db,
  };
}

export function mergeAgentsWithDB(
  dbAgents: DbAgentLike[],
  canonicalAgents: CanonicalAgent[] = CANONICAL_AGENTS,
): ReconciledAgentRow[] {
  const lookup = buildDbLookup(dbAgents);
  const consumedDbIds = new Set<string>();

  return canonicalAgents.map((canonical) => {
    const dbMatch = findDbMatch(canonical, lookup);
    if (!dbMatch || consumedDbIds.has(dbMatch.id)) {
      return createMissingPlaceholder(canonical);
    }
    consumedDbIds.add(dbMatch.id);
    return createDbRow(canonical, dbMatch);
  });
}

export function countExtraDbAgents(
  dbAgents: DbAgentLike[],
  reconciled: ReconciledAgentRow[],
): number {
  const matchedIds = new Set(
    reconciled.filter((row) => row.dbRow?.id).map((row) => row.dbRow!.id),
  );
  return dbAgents.filter((row) => row.id && !matchedIds.has(row.id)).length;
}

export { EXPECTED_AGENT_COUNT };
