/**
 * Staging Supabase run index for AgentOps scheduled monitoring (Phase 5B).
 * Dry-run inserts only unless owner write approval is explicitly enabled later.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { extractSupabaseProjectRefFromUrl } from "../execution/agentOpsStagingGuard";
import { isOwnerMonitoringWriteApproved } from "./agentOpsMonitoringOwnerWriteGate";
import type { MonitoringScheduledRunReport } from "./agentOpsMonitoringScheduledReport";

export const AGENTOPS_MONITORING_STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";

export type AgentOpsMonitoringRunIndexRow = {
  id: string;
  run_id: string;
  source: string;
  mode: string;
  level: number;
  dry_run: boolean;
  target_base_url: string;
  target_class: string;
  production_blocked: boolean;
  production_guard_active: boolean;
  production_target_rejected: boolean;
  continuous_enabled: boolean;
  agents_considered: number;
  agents_run: number;
  findings_count: number;
  actual_issues_created: number;
  actual_memory_writes: number;
  errors_count: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  github_run_id: string | null;
  github_run_url: string | null;
  artifact_name: string | null;
  summary: Record<string, unknown>;
  created_at: string;
};

export type AgentOpsMonitoringRunIndexInsert = Omit<
  AgentOpsMonitoringRunIndexRow,
  "id" | "created_at"
>;

export type MonitoringRunIndexBuildContext = {
  source?: string;
  mode?: string;
  status?: "completed" | "partial" | "failed" | "indexed";
  githubRunId?: string | null;
  githubRunUrl?: string | null;
  artifactName?: string | null;
};

export type MonitoringRunIndexListResult =
  | { ok: true; data: AgentOpsMonitoringRunIndexRow[] }
  | { ok: false; error: string };

export type MonitoringRunIndexInsertResult =
  | { ok: true; row: AgentOpsMonitoringRunIndexRow }
  | { ok: false; error: string };

const TABLE = "agentops_monitoring_runs";

function readSupabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function assertMonitoringRunIndexSupabaseAllowed(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; projectRef: string } | { ok: false; error: string } {
  const url = readSupabaseUrl(env);
  const projectRef = extractSupabaseProjectRefFromUrl(url);
  if (!projectRef) {
    return { ok: false, error: "Missing or invalid staging Supabase URL for run index." };
  }
  if (projectRef !== AGENTOPS_MONITORING_STAGING_PROJECT_REF) {
    return {
      ok: false,
      error: `Run index blocked: Supabase project ref ${projectRef} is not staging (${AGENTOPS_MONITORING_STAGING_PROJECT_REF}).`,
    };
  }
  return { ok: true, projectRef };
}

export function validateMonitoringRunIndexInsert(
  record: Pick<AgentOpsMonitoringRunIndexInsert, "dry_run" | "actual_issues_created" | "actual_memory_writes">,
): string | null {
  if (record.actual_issues_created > 0 || record.actual_memory_writes > 0) {
    return "Run index rejects rows with issue or memory writes.";
  }
  if (!record.dry_run && !isOwnerMonitoringWriteApproved()) {
    return "Phase 5B: only dry-run inserts are allowed without owner write approval.";
  }
  return null;
}

function computeDurationMs(startedAt: string, endedAt: string): number | null {
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

function inferRunStatus(report: MonitoringScheduledRunReport): "completed" | "partial" | "failed" {
  if (report.errors.length > 0) {
    return report.agentsRun.length > 0 ? "partial" : "failed";
  }
  return "completed";
}

function buildSummaryPayload(report: MonitoringScheduledRunReport): Record<string, unknown> {
  return {
    scheduleType: report.scheduleMeta?.scheduleType ?? null,
    triggerType: report.scheduleMeta?.triggerType ?? null,
    monitoringMode: report.scheduleMeta?.monitoringMode ?? report.config.monitoringMode ?? null,
    startedAt: report.startedAt,
    completedAt: report.endedAt,
    targetUrl: report.targetBaseUrl,
    targetClass: report.targetClass,
    routesChecked: report.routesScanned,
    findingsCount: report.findingsCount,
    pipelineCounts: report.pipelineCounts,
    artifactReference: report.artifactReference,
    config: report.config,
    agentsSkipped: report.agentsSkipped,
    agentsRun: report.agentsRun.map((agent) => ({
      agentSlug: agent.agentSlug,
      agentName: agent.agentName,
      routesScanned: agent.routesScanned,
      findingsCount: agent.findingsCount,
      issuesCreated: agent.issuesCreated,
      issuesBlockedByPolicy: agent.issuesBlockedByPolicy,
      memoryProposals: agent.memoryProposals,
      errors: agent.errors,
    })),
    routesScanned: report.routesScanned,
    wouldCreateIssues: report.wouldCreateIssues,
    wouldWriteMemory: report.wouldWriteMemory,
    writesBlockedReason: report.writesBlockedReason,
    ownerWriteApproved: report.ownerWriteApproved,
    productionGuardActive: report.productionGuardActive,
    productionTargetRejected: report.productionTargetRejected,
  };
}

export function buildMonitoringRunIndexRecord(
  report: MonitoringScheduledRunReport,
  context: MonitoringRunIndexBuildContext = {},
): AgentOpsMonitoringRunIndexInsert {
  const status = context.status ?? inferRunStatus(report);
  const monitoringMode = report.scheduleMeta?.monitoringMode ?? report.config.monitoringMode ?? "operational";
  const mode =
    context.mode ??
    (monitoringMode === "weekly_improvement"
      ? "weekly_improvement"
      : monitoringMode === "daily_12_agent_review"
        ? "daily_12_agent_review"
        : "operational_dry_run");
  return {
    run_id: report.runId,
    source: context.source ?? "github_actions",
    mode,
    level: report.config.level,
    dry_run: report.dryRun,
    target_base_url: report.targetBaseUrl,
    target_class: report.targetClass,
    production_blocked: report.productionBlocked,
    production_guard_active: report.productionGuardActive,
    production_target_rejected: report.productionTargetRejected,
    continuous_enabled: report.config.continuousEnabled,
    agents_considered: report.agentsConsidered,
    agents_run: report.agentsRun.length,
    findings_count: report.findingsCount,
    actual_issues_created: report.actualIssuesCreated,
    actual_memory_writes: report.actualMemoryWrites,
    errors_count: report.errors.length,
    status,
    started_at: report.startedAt,
    ended_at: report.endedAt,
    duration_ms: computeDurationMs(report.startedAt, report.endedAt),
    github_run_id: context.githubRunId ?? null,
    github_run_url: context.githubRunUrl ?? null,
    artifact_name: context.artifactName ?? null,
    summary: buildSummaryPayload(report),
  };
}

export async function insertMonitoringRunIndexRecord(
  client: SupabaseClient,
  record: AgentOpsMonitoringRunIndexInsert,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MonitoringRunIndexInsertResult> {
  const allowed = assertMonitoringRunIndexSupabaseAllowed(env);
  if (!allowed.ok) return { ok: false, error: allowed.error };

  const validationError = validateMonitoringRunIndexInsert(record);
  if (validationError) return { ok: false, error: validationError };

  const { data, error } = await client
    .from(TABLE)
    .insert(record)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data as AgentOpsMonitoringRunIndexRow };
}

export async function listMonitoringRunIndexRecords(
  client: SupabaseClient,
  limit = 10,
): Promise<MonitoringRunIndexListResult> {
  const safeLimit = Math.min(Math.max(limit, 1), 25);
  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: (data ?? []) as AgentOpsMonitoringRunIndexRow[] };
}

export async function getLatestMonitoringRunIndexRecord(
  client: SupabaseClient,
): Promise<{ ok: true; row: AgentOpsMonitoringRunIndexRow | null } | { ok: false; error: string }> {
  const listed = await listMonitoringRunIndexRecords(client, 1);
  if (!listed.ok) return listed;
  return { ok: true, row: listed.data[0] ?? null };
}

export function toMonitoringRunIndexSummary(row: AgentOpsMonitoringRunIndexRow) {
  return {
    id: row.id,
    runId: row.run_id,
    source: row.source,
    mode: row.mode,
    level: row.level,
    dryRun: row.dry_run,
    targetBaseUrl: row.target_base_url,
    targetClass: row.target_class,
    productionBlocked: row.production_blocked,
    productionGuardActive: row.production_guard_active,
    productionTargetRejected: row.production_target_rejected,
    continuousEnabled: row.continuous_enabled,
    agentsConsidered: row.agents_considered,
    agentsRun: row.agents_run,
    findingsCount: row.findings_count,
    actualIssuesCreated: row.actual_issues_created,
    actualMemoryWrites: row.actual_memory_writes,
    errorsCount: row.errors_count,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    githubRunId: row.github_run_id,
    githubRunUrl: row.github_run_url,
    artifactName: row.artifact_name,
    createdAt: row.created_at,
  };
}
