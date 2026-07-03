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
const ISSUE_DRAFTS_TABLE = "agentops_monitoring_issue_drafts";
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

type IssueDraftRow = {
  id: string;
  run_id: string;
  github_run_id: string | null;
  source: string;
  status: string;
  agent_slug: string;
  module: string | null;
  route: string | null;
  issue_type: string | null;
  severity: string;
  title: string;
  summary: string;
  browser_qa_evidence: Record<string, unknown>;
  confidence: number | null;
  duplicate_key: string;
  created_at: string;
  updated_at: string;
  owner_decision_by: string | null;
  owner_decision_at: string | null;
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

async function listIssueDrafts(client: SupabaseClient, limit = 20, status?: string) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  let query = client
    .from(ISSUE_DRAFTS_TABLE)
    .select(
      "id, run_id, github_run_id, source, status, agent_slug, module, route, issue_type, severity, title, summary, browser_qa_evidence, confidence, duplicate_key, created_at, updated_at, owner_decision_by, owner_decision_at",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: (data ?? []) as IssueDraftRow[] };
}

async function countIssueDraftsByStatus(client: SupabaseClient) {
  const statuses = ["draft", "owner_approved", "rejected", "deferred", "promoted"] as const;
  const counts: Record<string, number> = {};
  for (const status of statuses) {
    const { count, error } = await client
      .from(ISSUE_DRAFTS_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) return { ok: false as const, error: error.message };
    counts[status] = count ?? 0;
  }
  return { ok: true as const, counts };
}

function toIssueDraftSummary(row: IssueDraftRow) {
  return {
    id: row.id,
    runId: row.run_id,
    githubRunId: row.github_run_id,
    source: row.source,
    status: row.status,
    agentSlug: row.agent_slug,
    module: row.module,
    route: row.route,
    issueType: row.issue_type,
    severity: row.severity,
    title: row.title,
    summary: row.summary,
    browserQaEvidence: row.browser_qa_evidence,
    confidence: row.confidence,
    duplicateKey: row.duplicate_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerDecisionBy: row.owner_decision_by,
    ownerDecisionAt: row.owner_decision_at,
  };
}

function buildOwnerStatusPayload(
  rows: MonitoringRunRow[],
  indexError: string | null,
  draftRows: IssueDraftRow[],
  draftCounts: Record<string, number> | null,
  draftsError: string | null,
): Record<string, unknown> {
  const latestMonitoringRuns = rows.map(toRunIndexSummary);
  const latestIssueDrafts = draftRows.map(toIssueDraftSummary);

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
    latestIssueDrafts,
    issueDraftCounts: draftCounts ?? {
      draft: 0,
      owner_approved: 0,
      rejected: 0,
      deferred: 0,
      promoted: 0,
    },
    dryRunDefault: true,
    safety: {
      productionBlocked: true,
      autoFixDeployBlocked: true,
      autoFixBlocked: true,
      memoryProposalOnly: true,
      evidenceRequiredForIssues: true,
      level4Forbidden: true,
      liveIssuesCreated: false,
      ownerApprovalRequired: true,
    },
    configError: indexError ?? draftsError,
    agentsLoaded: false,
  };
}

export async function handleMonitoringStatusRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  let indexError: string | null = null;
  let draftsError: string | null = null;
  let rows: MonitoringRunRow[] = [];
  let draftRows: IssueDraftRow[] = [];
  let draftCounts: Record<string, number> | null = null;

  if (!client) {
    indexError = "Staging Supabase is not configured for run index reads.";
    draftsError = indexError;
  } else {
    const listed = await listIndexedRuns(client, 10);
    if (listed.ok) {
      rows = listed.data;
    } else {
      indexError = listed.error;
    }

    const draftsListed = await listIssueDrafts(client, 10);
    if (draftsListed.ok) {
      draftRows = draftsListed.data;
    } else {
      draftsError = draftsListed.error;
    }

    const counts = await countIssueDraftsByStatus(client);
    if (counts.ok) {
      draftCounts = counts.counts;
    } else if (!draftsError) {
      draftsError = counts.error;
    }
  }

  return jsonResponse({
    ok: true,
    environment: "staging",
    status: buildOwnerStatusPayload(rows, indexError, draftRows, draftCounts, draftsError),
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

export async function handleMonitoringDraftsListRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  const [, queryPart = ""] = request.url.split("?");
  const params = new URLSearchParams(queryPart);
  const status = params.get("status") ?? undefined;
  const limit = Number(params.get("limit") ?? "20");
  const listed = await listIssueDrafts(client, Number.isFinite(limit) ? limit : 20, status);
  if (!listed.ok) return jsonResponse({ ok: false, error: listed.error }, 503);

  return jsonResponse({
    ok: true,
    environment: "staging",
    drafts: listed.data.map(toIssueDraftSummary),
  });
}

export async function handleMonitoringDraftDecisionRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  let body: { draftId?: string; decision?: string; ownerId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const draftId = body.draftId?.trim();
  const decision = body.decision?.trim();
  const ownerId = body.ownerId?.trim() ?? "owner";

  if (!draftId || !decision) {
    return jsonResponse({ ok: false, error: "draftId and decision are required." }, 400);
  }

  if (!["owner_approved", "rejected", "deferred"].includes(decision)) {
    return jsonResponse({ ok: false, error: "Invalid decision." }, 400);
  }

  const { data: existing, error: fetchError } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (fetchError) return jsonResponse({ ok: false, error: fetchError.message }, 503);
  if (!existing) return jsonResponse({ ok: false, error: "Draft not found." }, 404);
  if (existing.status === "promoted") {
    return jsonResponse({ ok: false, error: "Promoted drafts cannot be changed." }, 409);
  }

  const { data, error } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .update({
      status: decision,
      owner_decision_by: ownerId,
      owner_decision_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .select("*")
    .single();

  if (error) return jsonResponse({ ok: false, error: error.message }, 503);

  return jsonResponse({
    ok: true,
    environment: "staging",
    draft: toIssueDraftSummary(data as IssueDraftRow),
    promoted: false,
  });
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

function resolveMonitoringPathname(request: Request): string {
  const [pathPart, queryPart = ""] = request.url.split("?");
  const normalized = (pathPart ?? request.url).replace(/\/+$/, "");
  if (normalized.startsWith("/api/agentops/monitoring/")) {
    return normalized;
  }
  const params = new URLSearchParams(queryPart);
  const subpath = params.get("monitoringSubpath") ?? params.get("subpath");
  if (subpath) {
    return `/api/agentops/monitoring/${subpath.replace(/^\/+|\/+$/g, "")}`.replace(/\/+$/, "");
  }
  return normalized || "/api/agentops/monitoring";
}

export async function routeMonitoringRequest(request: Request): Promise<Response> {
  const pathname = resolveMonitoringPathname(request);

  if (pathname === "/api/agentops/monitoring/status") {
    return handleMonitoringStatusRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/dry-run") {
    return handleMonitoringDryRunRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/reports/latest") {
    return handleMonitoringLatestReportRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/drafts") {
    return handleMonitoringDraftsListRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/drafts/decision") {
    return handleMonitoringDraftDecisionRequest(request);
  }

  return jsonResponse({ ok: false, error: "Not found" }, 404);
}
