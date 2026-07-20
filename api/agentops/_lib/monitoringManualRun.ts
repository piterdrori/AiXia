/**
 * Fix B2-B — owner-gated per-agent manual run accept / status (staging only).
 * Accept queues into agentops_monitoring_runs. Worker heartbeats via agentops_system_config.
 * No GitHub dispatch. No Playwright on Vercel.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";
import {
  B2B_CLAIM_CLOSE_MESSAGE,
  buildCapabilityFromHealth,
  classifyWorkerStatus,
  countQueuedManualRuns,
  isLockExpired,
  readManualRunWorkerHealth,
  type ManualRunWorkerHealth,
} from "./manualRunWorkerHealth.js";
import {
  createMonitoringReadClient,
  resolveMonitoringSupabaseUrl,
} from "./monitoringReadClient.js";
import { jsonResponse } from "./ollamaProxy.js";
import {
  buildManualRunSummary,
  validateAgentManualRunRequest,
  type AgentManualRunRequest,
} from "./manualRunContract.js";

const MONITORING_TABLE = "agentops_monitoring_runs";
const DAILY_EXECUTIONS_TABLE = "agentops_monitoring_daily_agent_executions";
const AGENTS_TABLE = "agentops_agents";
const ACTIVE_STATUSES = new Set(["queued", "running"]);
const QUEUE_VERSION = "b2-c";
const DUPLICATE_LOCK_MESSAGE = "This agent already has an active or queued run.";

function methodNotAllowed(): Response {
  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}

function createServiceClient(): SupabaseClient | null {
  const readClient = createMonitoringReadClient(process.env);
  return readClient.ok ? readClient.client : null;
}

async function loadWorkerSnapshot(client: SupabaseClient | null): Promise<{
  health: ManualRunWorkerHealth | null;
  capability: ReturnType<typeof buildCapabilityFromHealth>;
}> {
  if (!client) {
    return {
      health: null,
      capability: buildCapabilityFromHealth(null, 0),
    };
  }
  const health = await readManualRunWorkerHealth(client);
  const queueLength = health?.queueLength ?? (await countQueuedManualRuns(client));
  return {
    health,
    capability: buildCapabilityFromHealth(health, queueLength),
  };
}

function isAllowedStagingTarget(url: string | undefined | null): { ok: true; url: string } | { ok: false; error: string } {
  const raw =
    url?.trim() ||
    process.env.AGENTOPS_QA_BASE_URL?.trim() ||
    process.env.AGENTOPS_MONITORING_TARGET_BASE_URL?.trim() ||
    "https://ai-xia-staging.vercel.app";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid staging target URL." };
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "aixia.app" || host.endsWith(".aixia.app") || host.includes("production")) {
    return { ok: false, error: "Production hosts are blocked for manual AgentOps runs." };
  }
  const allowed =
    host.includes("staging") ||
    host.endsWith(".vercel.app") ||
    host === "localhost" ||
    host === "127.0.0.1";
  if (!allowed) {
    return { ok: false, error: `Target host "${host}" is not an allowed staging host.` };
  }
  return { ok: true, url: raw.replace(/\/+$/, "") };
}

async function assertOwnerFromRequest(
  request: Request,
): Promise<{ ok: true; userId: string } | { ok: false; error: string; status: number }> {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return { ok: false, error: "Authorization Bearer token required.", status: 401 };
  }
  const supabaseUrl = resolveMonitoringSupabaseUrl(process.env);
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  if (!supabaseUrl || !anonKey) {
    return { ok: false, error: "Staging Supabase auth is not configured.", status: 503 };
  }
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user?.id) {
    return { ok: false, error: "You must be signed in.", status: 401 };
  }
  const { data: isOwner, error: ownerError } = await client.rpc("agentops_is_owner");
  if (ownerError) {
    return { ok: false, error: ownerError.message, status: 503 };
  }
  if (!isOwner) {
    return { ok: false, error: "AgentOps Owner access required.", status: 403 };
  }
  return { ok: true, userId: userData.user.id };
}

async function resolveRuntimeAgentId(
  client: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from(AGENTS_TABLE)
    .select("id, name, tools, status")
    .eq("environment", "staging");
  if (error || !data) return null;
  for (const agent of data) {
    const tools = (agent.tools ?? []) as string[];
    if (tools.includes(`canonical:${slug}`)) return agent.id as string;
    const normalizedName =
      typeof agent.name === "string" ? agent.name.trim().toLowerCase().replace(/\s+/g, "-") : "";
    if (normalizedName === slug) return agent.id as string;
  }
  return null;
}

async function resolveRuntimeAgentStatus(
  client: SupabaseClient,
  runtimeAgentId: string | null,
): Promise<string | null> {
  if (!runtimeAgentId) return null;
  const { data } = await client
    .from(AGENTS_TABLE)
    .select("status")
    .eq("id", runtimeAgentId)
    .eq("environment", "staging")
    .maybeSingle();
  return typeof data?.status === "string" ? data.status : null;
}

async function findActiveManualRun(
  client: SupabaseClient,
  agentSlug: string,
): Promise<{ id: string; run_id: string; status: string; summary: Record<string, unknown> } | null> {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("id, run_id, status, summary, started_at, created_at")
    .eq("mode", "owner_manual_single_agent")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !data) return null;
  for (const row of data) {
    const summary =
      row.summary && typeof row.summary === "object"
        ? (row.summary as Record<string, unknown>)
        : {};
    if (summary.agentSlug !== agentSlug) continue;
    if (!ACTIVE_STATUSES.has(String(row.status ?? ""))) continue;
    return {
      id: String(row.id),
      run_id: String(row.run_id),
      status: String(row.status),
      summary,
    };
  }
  return null;
}

function statusMessageForRow(input: {
  status: string;
  workerConnected: boolean;
  stale: boolean;
  summary: Record<string, unknown>;
}): string {
  const { status, workerConnected, stale, summary } = input;
  const isWebsiteAudit =
    summary.workType === "website_audit" || summary.executionEngine === "website_audit";
  if (status === "queued") {
    return workerConnected
      ? "Waiting for staging worker."
      : "Queued. Worker not connected.";
  }
  if (status === "running") {
    if (stale) {
      return isWebsiteAudit
        ? "Website audit run is running but worker heartbeat is stale."
        : "Run is running but worker heartbeat is stale.";
    }
    return isWebsiteAudit
      ? "Website audit running on staging worker."
      : "Manual run is in progress on the staging worker.";
  }
  if (status === "failed") {
    if (summary.b2bClaimOnly === true || summary.workerPhase === "b2-b") {
      return typeof summary.failureReason === "string"
        ? summary.failureReason
        : B2B_CLAIM_CLOSE_MESSAGE;
    }
    if (typeof summary.failureReason === "string" && summary.failureReason.trim()) {
      return summary.failureReason;
    }
    if (typeof summary.error === "string" && summary.error.trim()) {
      return summary.error;
    }
    return "Manual run failed.";
  }
  if (status === "completed") {
    if (isWebsiteAudit) {
      const evidence =
        summary.evidenceSummary && typeof summary.evidenceSummary === "object"
          ? (summary.evidenceSummary as Record<string, unknown>)
          : {};
      if (typeof evidence.zeroFindingsMessage === "string" && evidence.zeroFindingsMessage) {
        return evidence.zeroFindingsMessage;
      }
      if (summary.result === "findings_found") {
        return "Website audit completed with qualifying findings.";
      }
      return "Website audit completed.";
    }
    return "Manual run completed.";
  }
  return `Manual run status: ${status}`;
}

export async function handleMonitoringManualRunCapabilityRequest(
  request: Request,
): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const client = createServiceClient();
  const snapshot = await loadWorkerSnapshot(client);
  return jsonResponse({
    ok: true,
    environment: "staging",
    capability: snapshot.capability,
  });
}

export async function handleMonitoringManualRunStartRequest(
  request: Request,
): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const owner = await assertOwnerFromRequest(request);
  if (!owner.ok) {
    return jsonResponse({ ok: false, accepted: false, status: "rejected", message: owner.error }, owner.status);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { ok: false, accepted: false, status: "rejected", message: "Invalid JSON body." },
      400,
    );
  }

  const validated = validateAgentManualRunRequest(body);
  if (!validated.ok) {
    return jsonResponse(
      { ok: false, accepted: false, status: "rejected", message: validated.error },
      400,
    );
  }
  const runRequest: AgentManualRunRequest = validated.request;

  const target = isAllowedStagingTarget(
    process.env.AGENTOPS_QA_BASE_URL ?? process.env.AGENTOPS_MONITORING_TARGET_BASE_URL,
  );
  if (!target.ok) {
    return jsonResponse(
      { ok: false, accepted: false, status: "rejected", message: target.error },
      403,
    );
  }

  const client = createServiceClient();
  if (!client) {
    return jsonResponse(
      {
        ok: false,
        accepted: false,
        status: "rejected",
        message: "Staging Supabase service role is not configured.",
      },
      503,
    );
  }

  const runtimeAgentId = await resolveRuntimeAgentId(client, runRequest.agentSlug);
  const runtimeStatus = await resolveRuntimeAgentStatus(client, runtimeAgentId);
  const paused =
    runRequest.ownerFacingPaused === true ||
    runtimeStatus === "paused" ||
    runtimeStatus === "quiet" ||
    runtimeStatus === "disabled";
  if (paused && !runRequest.runOnceWhilePaused && !runRequest.activateAndRun) {
    return jsonResponse(
      {
        ok: false,
        accepted: false,
        status: "rejected",
        message:
          "This agent is paused. Confirm Run once without activating it, or Activate and run.",
        agentPaused: true,
      },
      409,
    );
  }

  if (runRequest.avoidOverlap !== false) {
    const active = await findActiveManualRun(client, runRequest.agentSlug);
    if (active) {
      return jsonResponse(
        {
          ok: false,
          accepted: false,
          status: "rejected",
          message: DUPLICATE_LOCK_MESSAGE,
          existingRunId: active.run_id,
          runId: active.run_id,
          existingStatus: active.status,
        },
        409,
      );
    }
  }

  const runId = `owner-manual-${runRequest.agentSlug}-${randomUUID()}`;
  const startedAt = new Date().toISOString();
  const selectedRoutes =
    runRequest.scope.routes && runRequest.scope.routes.length > 0
      ? runRequest.scope.routes
      : runRequest.workType === "browser_qa"
        ? ["/system/agent-ops"]
        : runRequest.workType === "website_audit"
          ? [`/system/agent-ops/agents/${runRequest.agentSlug}`]
          : [];
  const selectedModules = runRequest.scope.modules ?? [];

  const summary = buildManualRunSummary({
    agentSlug: runRequest.agentSlug,
    runtimeAgentId,
    workType: runRequest.workType,
    scope: runRequest.scope,
    requestedBy: owner.userId,
    maxDurationMinutes: runRequest.maxDurationMinutes,
  });
  summary.runOnceWhilePaused = Boolean(runRequest.runOnceWhilePaused);
  summary.activateAndRun = Boolean(runRequest.activateAndRun);
  summary.selectedRoutes = selectedRoutes;
  summary.selectedModules = selectedModules;
  summary.createdByAgentDetail = true;
  summary.queueVersion = QUEUE_VERSION;
  summary.schedulerConnection = "staging_worker_pending";
  summary.activity = {
    event: "manual_run_queued",
    agentSlug: runRequest.agentSlug,
    workType: runRequest.workType,
    scope: runRequest.scope,
    requestedBy: owner.userId,
  };

  const insertRow = {
    run_id: runId,
    source: "owner_manual",
    mode: "owner_manual_single_agent",
    level: 1,
    dry_run: true,
    target_base_url: target.url,
    target_class: "staging",
    production_blocked: true,
    production_guard_active: true,
    production_target_rejected: false,
    continuous_enabled: false,
    agents_considered: 1,
    agents_run: 0,
    findings_count: 0,
    actual_issues_created: 0,
    actual_memory_writes: 0,
    errors_count: 0,
    status: "queued",
    started_at: startedAt,
    ended_at: null,
    duration_ms: null,
    github_run_id: null,
    github_run_url: null,
    artifact_name: null,
    summary,
  };

  const { data: inserted, error: insertError } = await client
    .from(MONITORING_TABLE)
    .insert(insertRow)
    .select("id, run_id")
    .single();

  if (insertError || !inserted) {
    return jsonResponse(
      {
        ok: false,
        accepted: false,
        status: "rejected",
        message: insertError?.message ?? "Failed to persist manual run lock.",
      },
      503,
    );
  }

  const snapshot = await loadWorkerSnapshot(client);

  return jsonResponse({
    ok: true,
    accepted: true,
    runId,
    status: "queued",
    message: "Run queued for staging worker.",
    startedAt,
    githubRunId: null,
    githubRunUrl: null,
    workType: runRequest.workType,
    agentSlug: runRequest.agentSlug,
    evidenceAvailable: false,
    durationMs: null,
    workerConnected: snapshot.capability.workerConnected,
    capability: snapshot.capability,
  });
}

export async function handleMonitoringManualRunStatusRequest(
  request: Request,
): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const owner = await assertOwnerFromRequest(request);
  if (!owner.ok) {
    return jsonResponse({ ok: false, error: owner.error }, owner.status);
  }

  const client = createServiceClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  const [, queryPart = ""] = request.url.split("?");
  const params = new URLSearchParams(queryPart);
  const runId = params.get("runId")?.trim() ?? "";
  const agentSlug = params.get("agentSlug")?.trim().toLowerCase() ?? "";
  const snapshot = await loadWorkerSnapshot(client);
  const workerConnected = snapshot.capability.workerConnected;

  let row: Record<string, unknown> | null = null;
  if (runId) {
    const { data } = await client
      .from(MONITORING_TABLE)
      .select("*")
      .eq("run_id", runId)
      .maybeSingle();
    row = (data as Record<string, unknown> | null) ?? null;
  } else if (agentSlug) {
    const active = await findActiveManualRun(client, agentSlug);
    if (active) {
      const { data } = await client
        .from(MONITORING_TABLE)
        .select("*")
        .eq("run_id", active.run_id)
        .maybeSingle();
      row = (data as Record<string, unknown> | null) ?? null;
    }
  }

  if (!row) {
    return jsonResponse({
      ok: true,
      active: false,
      result: null,
      workerConnected,
      capability: snapshot.capability,
    });
  }

  const summary =
    row.summary && typeof row.summary === "object"
      ? (row.summary as Record<string, unknown>)
      : {};
  const slug = typeof summary.agentSlug === "string" ? summary.agentSlug : agentSlug;
  const startedAt = typeof row.started_at === "string" ? row.started_at : null;
  let status = String(row.status ?? "unknown");
  let completedAt = typeof row.ended_at === "string" ? row.ended_at : null;
  let durationMs =
    typeof row.duration_ms === "number" && Number.isFinite(row.duration_ms)
      ? row.duration_ms
      : null;
  let routesChecked: string[] = [];
  let queuedFindings: number | null = null;
  let rawObservations: number | null = null;
  let evidenceAvailable = false;
  const stale =
    status === "running" &&
    (isLockExpired(summary) || classifyWorkerStatus(snapshot.health) === "stale");

  // Only look for worker/execution evidence once a worker has claimed the run (running+).
  // Queued-only / B2-B claim-test / B2-C website-audit persist on the monitoring row itself.
  if (
    status === "running" &&
    slug &&
    startedAt &&
    summary.workerPhase !== "b2-b" &&
    summary.workerPhase !== "b2-c"
  ) {
    const { data: execution } = await client
      .from(DAILY_EXECUTIONS_TABLE)
      .select(
        "id, status, started_at, completed_at, duration_ms, routes_reviewed, drafts_created, evidence_summary, failure_reason",
      )
      .eq("agent_slug", slug)
      .gte("started_at", startedAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (execution) {
      const execStatus = String(execution.status ?? "");
      if (execStatus === "completed" || execStatus === "failed" || execStatus === "blocked") {
        status = execStatus === "completed" ? "completed" : "failed";
        completedAt =
          typeof execution.completed_at === "string"
            ? execution.completed_at
            : new Date().toISOString();
        durationMs =
          typeof execution.duration_ms === "number" ? execution.duration_ms : durationMs;
        routesChecked = Array.isArray(execution.routes_reviewed)
          ? (execution.routes_reviewed as string[])
          : [];
        queuedFindings =
          typeof execution.drafts_created === "number" ? execution.drafts_created : null;
        const evidence =
          execution.evidence_summary && typeof execution.evidence_summary === "object"
            ? (execution.evidence_summary as Record<string, unknown>)
            : {};
        rawObservations =
          typeof evidence.scanFindingsCount === "number"
            ? evidence.scanFindingsCount
            : Array.isArray(evidence.findings)
              ? evidence.findings.length
              : null;
        evidenceAvailable = Boolean(execution.evidence_summary);

        await client
          .from(MONITORING_TABLE)
          .update({
            status,
            ended_at: completedAt,
            duration_ms: durationMs,
            findings_count: queuedFindings ?? 0,
            summary: {
              ...summary,
              linkedExecutionId: execution.id,
              failureReason: execution.failure_reason ?? null,
            },
          })
          .eq("run_id", row.run_id);
      }
    }
  }

  if (status === "queued" || (status === "failed" && summary.b2bClaimOnly === true)) {
    if (status === "queued") {
      durationMs = null;
    }
    evidenceAvailable = false;
    routesChecked = [];
    queuedFindings = null;
    rawObservations = null;
  }

  // B2-C website audit persists evidence on the monitoring row itself.
  if (
    summary.workerPhase === "b2-c" &&
    summary.executionEngine === "website_audit" &&
    (status === "completed" || status === "failed" || status === "running")
  ) {
    const routesScanned = Array.isArray(summary.routesScanned)
      ? (summary.routesScanned as string[])
      : Array.isArray(summary.selectedRoutes)
        ? (summary.selectedRoutes as string[])
        : [];
    if (routesScanned.length > 0) routesChecked = routesScanned;
    const evidence =
      summary.evidenceSummary && typeof summary.evidenceSummary === "object"
        ? (summary.evidenceSummary as Record<string, unknown>)
        : {};
    if (typeof evidence.qualifyingFindingsCount === "number") {
      queuedFindings = evidence.qualifyingFindingsCount;
    } else if (typeof row.findings_count === "number") {
      queuedFindings = row.findings_count as number;
    }
    if (typeof evidence.scanFindingsCount === "number") {
      rawObservations = evidence.scanFindingsCount;
    } else if (Array.isArray(summary.rawObservations)) {
      rawObservations = summary.rawObservations.length;
    }
    evidenceAvailable =
      Boolean(summary.evidenceSummary) ||
      (Array.isArray(summary.artifactRefs) && summary.artifactRefs.length > 0) ||
      (Array.isArray(summary.rawObservations) && summary.rawObservations.length > 0);
  }

  const findingsCount =
    typeof row.findings_count === "number" ? (row.findings_count as number) : queuedFindings;
  const errorsCount =
    typeof row.errors_count === "number" ? (row.errors_count as number) : null;

  return jsonResponse({
    ok: true,
    active: ACTIVE_STATUSES.has(status),
    workerConnected,
    capability: snapshot.capability,
    result: {
      accepted: true,
      runId: row.run_id,
      status,
      message: statusMessageForRow({
        status,
        workerConnected,
        stale,
        summary,
      }),
      startedAt,
      completedAt,
      evidenceAvailable,
      githubRunId: null,
      githubRunUrl: null,
      workType: summary.workType ?? null,
      agentSlug: slug || null,
      durationMs,
      routesChecked,
      rawObservations,
      queuedFindings,
      findingsCount,
      errorsCount,
      scope: summary.scope ?? null,
      artifactRefs: Array.isArray(summary.artifactRefs) ? summary.artifactRefs : [],
      workerId: typeof summary.workerId === "string" ? summary.workerId : null,
      failurePhase:
        typeof summary.failurePhase === "string" ? summary.failurePhase : null,
      stale: status === "running" ? stale : false,
    },
  });
}
