/**
 * AgentOps monitoring owner API — Vercel-safe (no src/lib imports).
 * GET  /api/agentops/monitoring/status
 * POST /api/agentops/monitoring/dry-run
 * GET  /api/agentops/monitoring/reports/latest
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";
import { jsonResponse } from "./ollamaProxy.js";

const MONITORING_TABLE = "agentops_monitoring_runs";
const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";

type MonitoringRunRow = {
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
  created_at: string;
};

function methodNotAllowed(): Response {
  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}

function extractProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

function createStagingSupabaseClient(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (extractProjectRef(url) !== STAGING_PROJECT_REF) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toRunIndexSummary(row: MonitoringRunRow) {
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

async function listIndexedRuns(client: SupabaseClient, limit = 10) {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 25));

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, data: (data ?? []) as MonitoringRunRow[] };
}

function buildOwnerStatusPayload(
  rows: MonitoringRunRow[],
  indexError: string | null,
): Record<string, unknown> {
  const latestMonitoringRuns = rows.map(toRunIndexSummary);

  return {
    monitoringLevelLabel: "Level 1 (scheduled dry-run)",
    activationLabel: "Scheduled (GHA manual dispatch)",
    activationDetail: "Cloud cron disabled. GitHub Actions dry-run indexes summaries to Supabase.",
    writeModeLabel: "Dry-run only",
    writeModeDetail: "No issue or memory writes without owner approval.",
    targetLabel: "Staging only",
    continuousLabel: "Disabled (prepared)",
    cloudActive: false,
    continuousActive: false,
    scheduledEnvEnabled: true,
    effectiveDryRun: true,
    ownerWriteApproved: false,
    eligibleCount: 0,
    eligibleAgentSlugs: [],
    eligibility: [],
    lastReport: null,
    latestMonitoringRuns,
    latestIndexedRun: latestMonitoringRuns[0] ?? null,
    dryRunDefault: true,
    safety: {
      productionBlocked: true,
      autoFixDeployBlocked: true,
      memoryProposalOnly: true,
      evidenceRequiredForIssues: true,
      level4Forbidden: true,
    },
    configError: indexError,
    agentsLoaded: false,
  };
}

export async function handleMonitoringStatusRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  let indexError: string | null = null;
  let rows: MonitoringRunRow[] = [];

  if (!client) {
    indexError = "Staging Supabase is not configured for run index reads.";
  } else {
    const listed = await listIndexedRuns(client, 10);
    if (listed.ok) {
      rows = listed.data;
    } else {
      indexError = listed.error;
    }
  }

  return jsonResponse({
    ok: true,
    environment: "staging",
    status: buildOwnerStatusPayload(rows, indexError),
  });
}

export async function handleMonitoringDryRunRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  return jsonResponse(
    {
      ok: false,
      environment: "staging",
      forcedDryRun: true,
      writesSafe: true,
      error:
        "Owner UI dry-run is not available on Vercel serverless. Use GitHub Actions workflow dispatch or local dev.",
    },
    503,
  );
}

export async function handleMonitoringLatestReportRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  return jsonResponse({
    ok: true,
    environment: "staging",
    report: null,
    summary: null,
    message: "Latest JSON reports are stored as GHA artifacts. Supabase index holds run summaries.",
  });
}

export async function routeMonitoringRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rewrittenSubpath = url.searchParams.get("monitoringSubpath")?.replace(/^\/+|\/+$/g, "");
  const pathname = rewrittenSubpath
    ? `/api/agentops/monitoring/${rewrittenSubpath}`.replace(/\/+$/, "")
    : url.pathname.replace(/\/+$/, "");

  if (pathname === "/api/agentops/monitoring/status") {
    return handleMonitoringStatusRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/dry-run") {
    return handleMonitoringDryRunRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/reports/latest") {
    return handleMonitoringLatestReportRequest(request);
  }

  return jsonResponse({ ok: false, error: "Not found" }, 404);
}
