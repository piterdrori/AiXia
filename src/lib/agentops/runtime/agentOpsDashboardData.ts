/**
 * AgentOps runtime cockpit data — dashboard page only (4 tables).
 */

import { supabase } from "@/lib/supabase";

import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
  type AgentOpsAgentLogAction,
  type AgentOpsAgentMode,
  type AgentOpsAgentStatus,
  type AgentOpsIssueSeverity,
  type AgentOpsIssueStatus,
  type AgentOpsRuntimeAgentLogRow,
  type AgentOpsRuntimeAgentRow,
  type AgentOpsRuntimeIssueRow,
  type AgentOpsRuntimeMode,
  type AgentOpsRuntimeSystemConfigRow,
} from "../db/agentOpsRuntimeTypes";

export type AgentOpsCockpitSectionKey = "agents" | "issues" | "logs" | "config";

export type AgentOpsCockpitSectionErrors = Partial<Record<AgentOpsCockpitSectionKey, string>>;

export type AgentOpsCockpitAgentRow = AgentOpsRuntimeAgentRow & {
  last_run_time: string | null;
  last_action: string;
};

export type AgentOpsCockpitData = {
  agents: AgentOpsCockpitAgentRow[];
  issues: AgentOpsRuntimeIssueRow[];
  logs: AgentOpsRuntimeAgentLogRow[];
  config: AgentOpsRuntimeSystemConfigRow | null;
  sectionErrors: AgentOpsCockpitSectionErrors;
};

const AGENT_MODES = new Set<AgentOpsAgentMode>(["scheduled", "continuous"]);
const AGENT_STATUSES = new Set<AgentOpsAgentStatus>(["active", "paused", "blocked"]);
const ISSUE_SEVERITIES = new Set<AgentOpsIssueSeverity>(["low", "medium", "high", "critical"]);
const ISSUE_STATUSES = new Set<AgentOpsIssueStatus>([
  "open",
  "in_progress",
  "fixed",
  "verified",
]);
const LOG_ACTIONS = new Set<AgentOpsAgentLogAction>([
  "scan",
  "issue_detected",
  "memory_update",
  "cycle_complete",
]);
const RUNTIME_MODES = new Set<AgentOpsRuntimeMode>(["scheduled", "continuous"]);

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeAgent(row: Record<string, unknown>): AgentOpsRuntimeAgentRow {
  const mode = asString(row.mode);
  const status = asString(row.status);

  return {
    id: asString(row.id, "unknown"),
    name: asString(row.name, "unknown"),
    role: asString(row.role, "unknown"),
    scope: asStringArray(row.scope),
    mode: AGENT_MODES.has(mode as AgentOpsAgentMode) ? (mode as AgentOpsAgentMode) : "scheduled",
    status: AGENT_STATUSES.has(status as AgentOpsAgentStatus)
      ? (status as AgentOpsAgentStatus)
      : "paused",
    tools: asStringArray(row.tools),
    environment: AGENTOPS_RUNTIME_ENVIRONMENT,
    created_at: asString(row.created_at, new Date(0).toISOString()),
    updated_at: asString(row.updated_at, new Date(0).toISOString()),
  };
}

function normalizeIssue(row: Record<string, unknown>): AgentOpsRuntimeIssueRow {
  const severity = asString(row.severity);
  const status = asString(row.status);

  return {
    id: asString(row.id, "unknown"),
    title: asString(row.title, "Untitled issue"),
    description: asString(row.description, ""),
    severity: ISSUE_SEVERITIES.has(severity as AgentOpsIssueSeverity)
      ? (severity as AgentOpsIssueSeverity)
      : "low",
    agent_id: asString(row.agent_id, "unknown"),
    page_url: asString(row.page_url, ""),
    evidence: asRecord(row.evidence),
    fix_prompt: typeof row.fix_prompt === "string" ? row.fix_prompt : null,
    status: ISSUE_STATUSES.has(status as AgentOpsIssueStatus)
      ? (status as AgentOpsIssueStatus)
      : "open",
    environment: AGENTOPS_RUNTIME_ENVIRONMENT,
    created_at: asString(row.created_at, new Date(0).toISOString()),
    updated_at: asString(row.updated_at, new Date(0).toISOString()),
  };
}

function normalizeLog(row: Record<string, unknown>): AgentOpsRuntimeAgentLogRow {
  const action = asString(row.action);

  return {
    id: asString(row.id, "unknown"),
    agent_id: asString(row.agent_id, "unknown"),
    action: LOG_ACTIONS.has(action as AgentOpsAgentLogAction)
      ? (action as AgentOpsAgentLogAction)
      : "scan",
    payload: asRecord(row.payload),
    environment: AGENTOPS_RUNTIME_ENVIRONMENT,
    created_at: asString(row.created_at, new Date(0).toISOString()),
  };
}

function normalizeConfig(row: Record<string, unknown> | null): AgentOpsRuntimeSystemConfigRow | null {
  if (!row) return null;

  const runtimeMode = asString(row.runtime_mode);

  return {
    id: asString(row.id, "unknown"),
    runtime_mode: RUNTIME_MODES.has(runtimeMode as AgentOpsRuntimeMode)
      ? (runtimeMode as AgentOpsRuntimeMode)
      : "scheduled",
    staging_url: asString(row.staging_url, "http://127.0.0.1:5173"),
    supabase_project: asString(row.supabase_project, "unknown"),
    github_repo: asString(row.github_repo, "unknown"),
    tools_enabled: asRecord(row.tools_enabled),
    environment: AGENTOPS_RUNTIME_ENVIRONMENT,
    created_at: asString(row.created_at, new Date(0).toISOString()),
  };
}

function normalizeRows<T>(
  rows: unknown,
  normalizeRow: (row: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => normalizeRow(asRecord(row)));
}

function readImpactScore(issue: AgentOpsRuntimeIssueRow): number {
  const reasoning = issue.evidence?.reasoning;
  if (reasoning && typeof reasoning === "object" && "impact_score" in reasoning) {
    const score = (reasoning as { impact_score?: unknown }).impact_score;
    if (typeof score === "number" && Number.isFinite(score)) return score;
  }
  return 0;
}

function sortCriticalIssues(issues: AgentOpsRuntimeIssueRow[]): AgentOpsRuntimeIssueRow[] {
  return [...issues].sort((a, b) => {
    const severityDiff =
      (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (severityDiff !== 0) return severityDiff;

    const impactDiff = readImpactScore(b) - readImpactScore(a);
    if (impactDiff !== 0) return impactDiff;

    return b.created_at.localeCompare(a.created_at);
  });
}

function enrichAgentsWithLogActivity(
  agents: AgentOpsRuntimeAgentRow[],
  logs: AgentOpsRuntimeAgentLogRow[],
): AgentOpsCockpitAgentRow[] {
  const lastLogByAgent = new Map<string, AgentOpsRuntimeAgentLogRow>();

  for (const log of logs) {
    const agentId = log.agent_id;
    if (!agentId) continue;
    const existing = lastLogByAgent.get(agentId);
    if (!existing || log.created_at > existing.created_at) {
      lastLogByAgent.set(agentId, log);
    }
  }

  return agents.map((agent) => {
    const lastLog = lastLogByAgent.get(agent.id);
    const cycleLogs = logs.filter(
      (log) =>
        log.agent_id === agent.id &&
        (log.action === "cycle_complete" || log.action === "scan"),
    );
    const lastRun = cycleLogs.reduce<string | null>((latest, log) => {
      if (!latest || log.created_at > latest) return log.created_at;
      return latest;
    }, null);

    return {
      ...agent,
      last_run_time: lastRun ?? lastLog?.created_at ?? null,
      last_action: lastLog?.action ?? "unknown",
    };
  });
}

function readSupabaseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown fetch error";
}

type SettledTableResult = {
  data: unknown;
  error: unknown;
};

function settledFromPromise(result: PromiseSettledResult<SettledTableResult>): {
  rows: unknown;
  error: string | null;
} {
  if (result.status === "rejected") {
    return { rows: [], error: readSupabaseError(result.reason) };
  }

  if (result.value.error) {
    return { rows: [], error: readSupabaseError(result.value.error) };
  }

  return { rows: result.value.data ?? [], error: null };
}

export function normalizeAgentOpsDashboardData(input: {
  agents: unknown;
  issues: unknown;
  logs: unknown;
  config: unknown;
  sectionErrors?: AgentOpsCockpitSectionErrors;
}): AgentOpsCockpitData {
  const configRow = Array.isArray(input.config)
    ? ((input.config[0] as Record<string, unknown> | undefined) ?? null)
    : (input.config as Record<string, unknown> | null);

  const agentsRaw = normalizeRows(input.agents, normalizeAgent);
  const issues = sortCriticalIssues(normalizeRows(input.issues, normalizeIssue)).slice(0, 10);
  const allLogs = normalizeRows(input.logs, normalizeLog).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const logs = allLogs.slice(0, 20);

  return {
    agents: enrichAgentsWithLogActivity(agentsRaw, allLogs),
    issues,
    logs,
    config: normalizeConfig(configRow),
    sectionErrors: input.sectionErrors ?? {},
  };
}

async function queryTable(
  table: string,
  options?: { limit?: number; order?: string; ascending?: boolean },
) {
  let query = supabase
    .from(table)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT);

  if (options?.order) {
    query = query.order(options.order, { ascending: options.ascending ?? false });
  }

  if (options?.limit != null) {
    query = query.limit(options.limit);
  }

  return query;
}

/** Cockpit loader — 4 tables only, Promise.allSettled, never throws. */
export async function fetchAgentOpsCockpitData(): Promise<AgentOpsCockpitData> {
  const sectionErrors: AgentOpsCockpitSectionErrors = {};

  const results = await Promise.allSettled([
    queryTable(AGENTOPS_RUNTIME_TABLES.agents, { order: "name", ascending: true }),
    queryTable(AGENTOPS_RUNTIME_TABLES.issues, { limit: 100, order: "created_at" }),
    queryTable(AGENTOPS_RUNTIME_TABLES.agentLogs, { limit: 100, order: "created_at" }),
    queryTable(AGENTOPS_RUNTIME_TABLES.systemConfig, { limit: 1, order: "created_at" }),
  ]);

  const keys: AgentOpsCockpitSectionKey[] = ["agents", "issues", "logs", "config"];
  const settled = results.map((result) =>
    settledFromPromise(result as PromiseSettledResult<SettledTableResult>),
  );

  settled.forEach((entry, index) => {
    if (entry.error) {
      sectionErrors[keys[index]] = entry.error;
    }
  });

  const configRows = settled[3]?.rows;
  const configValue = Array.isArray(configRows) ? (configRows[0] ?? null) : null;

  return normalizeAgentOpsDashboardData({
    agents: settled[0]?.rows ?? [],
    issues: settled[1]?.rows ?? [],
    logs: settled[2]?.rows ?? [],
    config: configValue,
    sectionErrors,
  });
}

/** @deprecated Use fetchAgentOpsCockpitData */
export async function fetchRuntimeDashboardBundleSafe(): Promise<{
  data: AgentOpsCockpitData & { memory: never[] };
  error: string | null;
}> {
  const data = await fetchAgentOpsCockpitData();
  return {
    data: { ...data, memory: [] },
    error: Object.values(data.sectionErrors).join(" · ") || null,
  };
}
