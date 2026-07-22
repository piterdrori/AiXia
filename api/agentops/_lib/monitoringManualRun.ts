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
  computeLiveOldestQueuedAgeMs,
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
import {
  handleMonitoringArtifactUrlRequest,
  handleMonitoringHealthAlertAckRequest,
} from "./monitoringArtifactUrl.js";

const MONITORING_TABLE = "agentops_monitoring_runs";
const DAILY_EXECUTIONS_TABLE = "agentops_monitoring_daily_agent_executions";
const AGENTS_TABLE = "agentops_agents";
const ACTIVE_STATUSES = new Set(["queued", "running"]);
const QUEUE_VERSION = "b2-d";
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
  const nowMs = Date.now();
  const queueLength = health?.queueLength ?? (await countQueuedManualRuns(client));
  const liveOldestQueuedAgeMs = await computeLiveOldestQueuedAgeMs(client, nowMs);
  return {
    health,
    capability: buildCapabilityFromHealth(health, queueLength, nowMs, liveOldestQueuedAgeMs),
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
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
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
  const isBrowserQa =
    summary.workType === "browser_qa" || summary.executionEngine === "browser_qa";
  if (status === "queued") {
    return workerConnected
      ? "Waiting for staging worker."
      : "Queued. Worker not connected.";
  }
  if (status === "running") {
    if (stale) {
      if (isBrowserQa) {
        return "Browser QA run is running but worker heartbeat is stale.";
      }
      return isWebsiteAudit
        ? "Website audit run is running but worker heartbeat is stale."
        : "Run is running but worker heartbeat is stale.";
    }
    if (isBrowserQa) return "Browser QA running on staging worker.";
    return isWebsiteAudit
      ? "Website audit running on staging worker."
      : "Manual run is in progress on the staging worker.";
  }
  if (status === "canceled") {
    return typeof summary.cancelReason === "string" && summary.cancelReason.trim()
      ? summary.cancelReason
      : "Run canceled by owner.";
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
    if (isWebsiteAudit || isBrowserQa) {
      const evidence =
        summary.evidenceSummary && typeof summary.evidenceSummary === "object"
          ? (summary.evidenceSummary as Record<string, unknown>)
          : {};
      if (typeof evidence.zeroFindingsMessage === "string" && evidence.zeroFindingsMessage) {
        return evidence.zeroFindingsMessage;
      }
      if (summary.result === "findings_found") {
        return isBrowserQa
          ? "Browser QA completed with qualifying findings."
          : "Website audit completed with qualifying findings.";
      }
      return isBrowserQa ? "Browser QA completed." : "Website audit completed.";
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
  // Queued-only / B2-B claim-test / B2-C website-audit / B2-D browser-qa persist on the monitoring row itself.
  if (
    status === "running" &&
    slug &&
    startedAt &&
    summary.workerPhase !== "b2-b" &&
    summary.workerPhase !== "b2-c" &&
    summary.workerPhase !== "b2-d"
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

  // B2-C website audit / B2-D Browser QA persist evidence on the monitoring row itself.
  if (
    ((summary.workerPhase === "b2-c" && summary.executionEngine === "website_audit") ||
      (summary.workerPhase === "b2-d" && summary.executionEngine === "browser_qa")) &&
    (status === "completed" || status === "failed" || status === "running")
  ) {
    const routesScanned = Array.isArray(summary.routesScanned)
      ? (summary.routesScanned as string[])
      : Array.isArray(summary.selectedRoutes)
        ? (summary.selectedRoutes as string[])
        : typeof summary.route === "string"
          ? [summary.route]
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
      (Array.isArray(summary.screenshotRefs) && summary.screenshotRefs.length > 0) ||
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
      screenshotRefs: Array.isArray(summary.screenshotRefs) ? summary.screenshotRefs : [],
      consoleFindings: Array.isArray(summary.consoleFindings) ? summary.consoleFindings : [],
      networkFindings: Array.isArray(summary.networkFindings) ? summary.networkFindings : [],
      accessibilityFindings: Array.isArray(summary.accessibilityFindings)
        ? summary.accessibilityFindings
        : [],
      workerId: typeof summary.workerId === "string" ? summary.workerId : null,
      failurePhase:
        typeof summary.failurePhase === "string" ? summary.failurePhase : null,
      stale: status === "running" ? stale : false,
      cancelRequested: summary.cancelRequested === true,
      cancelAcknowledgedAt:
        typeof summary.cancelAcknowledgedAt === "string"
          ? summary.cancelAcknowledgedAt
          : null,
      cancelPhase: typeof summary.cancelPhase === "string" ? summary.cancelPhase : null,
      artifactVisibility:
        typeof summary.artifactVisibility === "string" ? summary.artifactVisibility : null,
      artifactNote: typeof summary.artifactNote === "string" ? summary.artifactNote : null,
      artifactUploadStatus:
        typeof summary.artifactUploadStatus === "string"
          ? summary.artifactUploadStatus
          : null,
      lockExpiresAt: typeof summary.lockExpiresAt === "string" ? summary.lockExpiresAt : null,
      trigger: typeof summary.trigger === "string" ? summary.trigger : null,
      mode: typeof row.mode === "string" ? row.mode : null,
      workerPhase: typeof summary.workerPhase === "string" ? summary.workerPhase : null,
      executionEngine:
        typeof summary.executionEngine === "string" ? summary.executionEngine : null,
    },
  });
}

/**
 * Phase D-A — owner-gated cancel for queued / cancel_requested for running.
 * Staging only. No new Vercel function (same monitoring router).
 */
export async function handleMonitoringManualRunCancelRequest(
  request: Request,
): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const owner = await assertOwnerFromRequest(request);
  if (!owner.ok) {
    return jsonResponse({ ok: false, canceled: false, message: owner.error }, owner.status);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { ok: false, canceled: false, message: "Invalid JSON body." },
      400,
    );
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const runId = typeof record.runId === "string" ? record.runId.trim() : "";
  const agentSlugFilter =
    typeof record.agentSlug === "string" ? record.agentSlug.trim().toLowerCase() : "";
  if (!runId) {
    return jsonResponse(
      { ok: false, canceled: false, message: "runId is required." },
      400,
    );
  }

  const client = createServiceClient();
  if (!client) {
    return jsonResponse(
      { ok: false, canceled: false, message: "Staging Supabase service role is not configured." },
      503,
    );
  }

  const { data: existing, error: readError } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, mode, summary, started_at")
    .eq("run_id", runId)
    .maybeSingle();
  if (readError) {
    return jsonResponse({ ok: false, canceled: false, message: readError.message }, 500);
  }
  if (!existing) {
    return jsonResponse({ ok: false, canceled: false, message: `Run not found: ${runId}` }, 404);
  }
  if (
    existing.mode !== "owner_manual_single_agent" &&
    existing.mode !== "scheduled_single_agent"
  ) {
    return jsonResponse(
      { ok: false, canceled: false, message: "Only owner_manual / scheduled runs can be canceled." },
      400,
    );
  }

  const existingSummary =
    existing.summary && typeof existing.summary === "object"
      ? (existing.summary as Record<string, unknown>)
      : {};
  const runAgentSlug =
    typeof existingSummary.agentSlug === "string"
      ? existingSummary.agentSlug.trim().toLowerCase()
      : "";
  if (agentSlugFilter && runAgentSlug && agentSlugFilter !== runAgentSlug) {
    return jsonResponse(
      { ok: false, canceled: false, message: "Cancel rejected: run belongs to a different agent." },
      403,
    );
  }

  const nowIso = new Date().toISOString();
  const summary = { ...existingSummary };
  const ownerRef = owner.userId || "owner";

  if (existing.status === "queued") {
    const nextSummary = {
      ...summary,
      cancelRequested: false,
      canceledAt: nowIso,
      cancelReason: "Canceled by owner while queued.",
      cancelRequestedBy: ownerRef,
    };
    const { data: updated, error: updateError } = await client
      .from(MONITORING_TABLE)
      .update({
        status: "canceled",
        ended_at: nowIso,
        summary: nextSummary,
      })
      .eq("run_id", runId)
      .eq("status", "queued")
      .select("run_id, status, summary")
      .maybeSingle();
    if (updateError) {
      return jsonResponse({ ok: false, canceled: false, message: updateError.message }, 500);
    }
    if (!updated) {
      return jsonResponse(
        { ok: false, canceled: false, message: "Cancel raced; run is no longer queued." },
        409,
      );
    }
    return jsonResponse({
      ok: true,
      canceled: true,
      status: "canceled",
      runId,
      message: "Queued run canceled.",
    });
  }

  if (existing.status === "running") {
    const nextSummary = {
      ...summary,
      cancelRequested: true,
      cancelRequestedAt: nowIso,
      cancelRequestedBy: ownerRef,
      cancelReason: "Cancel requested by owner; worker will honor between steps.",
    };
    const { data: updated, error: updateError } = await client
      .from(MONITORING_TABLE)
      .update({ summary: nextSummary })
      .eq("run_id", runId)
      .eq("status", "running")
      .select("run_id, status, summary")
      .maybeSingle();
    if (updateError) {
      return jsonResponse({ ok: false, canceled: false, message: updateError.message }, 500);
    }
    if (!updated) {
      return jsonResponse(
        { ok: false, canceled: false, message: "Cancel raced; run is no longer running." },
        409,
      );
    }
    return jsonResponse({
      ok: true,
      canceled: false,
      cancelRequested: true,
      status: "running",
      runId,
      message: "Cancel requested. Worker will mark canceled between steps when safe.",
    });
  }

  return jsonResponse(
    {
      ok: false,
      canceled: false,
      message: `Cannot cancel run in status=${existing.status}.`,
      status: existing.status,
      runId,
    },
    409,
  );
}

type QueueRunView = {
  runId: string;
  agentSlug: string | null;
  workType: string | null;
  trigger: string | null;
  status: string;
  mode: string;
  createdAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  lockExpiresAt: string | null;
  stale: boolean;
  cancelRequested: boolean;
  ageMs: number | null;
  waitingReason: string | null;
  suggestedAction: string | null;
  /** E-A9 — run outcome so Monitoring correlates with Issues/Agent pages. */
  result: string | null;
  draftsCreated: number | null;
  improvementDraftsCreated: number | null;
  routesCheckedCount: number | null;
};

function toQueueRunView(
  row: {
    run_id: string;
    status: string;
    mode: string;
    summary: unknown;
    created_at?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
  },
  nowMs: number,
  workerStatus: string,
): QueueRunView {
  const summary =
    row.summary && typeof row.summary === "object"
      ? (row.summary as Record<string, unknown>)
      : {};
  const createdAt =
    typeof row.created_at === "string"
      ? row.created_at
      : typeof row.started_at === "string"
        ? row.started_at
        : null;
  const createdMs = createdAt ? Date.parse(createdAt) : NaN;
  const lockExpiresAt =
    typeof summary.lockExpiresAt === "string" ? summary.lockExpiresAt : null;
  const stale =
    row.status === "running" &&
    (isLockExpired(summary, nowMs) || workerStatus === "stale" || workerStatus === "offline");
  const waitingReason =
    row.status === "queued"
      ? workerStatus === "stale" || workerStatus === "offline"
        ? "Worker offline/stale"
        : "Waiting for staging worker"
      : null;
  // E-A9 — surface run outcomes so Monitoring correlates with Issues/Agent pages.
  const evidenceSummary =
    summary.evidenceSummary && typeof summary.evidenceSummary === "object"
      ? (summary.evidenceSummary as Record<string, unknown>)
      : {};
  const draftsCreated =
    typeof evidenceSummary.draftsCreated === "number" ? evidenceSummary.draftsCreated : null;
  const improvementDraftsCreated =
    typeof evidenceSummary.improvementDraftsCreated === "number"
      ? evidenceSummary.improvementDraftsCreated
      : null;
  const routesCheckedCount = Array.isArray(summary.routesChecked)
    ? summary.routesChecked.length
    : Array.isArray(summary.routesScanned)
      ? summary.routesScanned.length
      : Array.isArray(summary.selectedRoutes)
        ? summary.selectedRoutes.length
        : null;

  return {
    runId: row.run_id,
    agentSlug: typeof summary.agentSlug === "string" ? summary.agentSlug : null,
    workType: typeof summary.workType === "string" ? summary.workType : null,
    trigger: typeof summary.trigger === "string" ? summary.trigger : null,
    status: row.status,
    mode: row.mode,
    createdAt,
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    endedAt: typeof row.ended_at === "string" ? row.ended_at : null,
    lockExpiresAt,
    stale,
    cancelRequested: summary.cancelRequested === true,
    ageMs: Number.isFinite(createdMs) ? Math.max(0, nowMs - createdMs) : null,
    waitingReason,
    result: typeof summary.result === "string" ? summary.result : null,
    draftsCreated,
    improvementDraftsCreated,
    routesCheckedCount,
    suggestedAction: stale
      ? "Run cleanup-stale dry-run on worker, or request cancel / mark failed via owner action. No auto-delete."
      : summary.cancelRequested === true
        ? "Cancel requested — worker will honor before next safe boundary."
        : waitingReason,
  };
}

/**
 * Phase D-B — owner-gated staging worker queue dashboard payload.
 * Same monitoring Vercel function. No service-role to browser.
 */
export async function handleMonitoringWorkerQueueRequest(
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
  const agentSlug = params.get("agentSlug")?.trim().toLowerCase() ?? "";
  const workType = params.get("workType")?.trim().toLowerCase() ?? "";
  const trigger = params.get("trigger")?.trim().toLowerCase() ?? "";
  const statusFilter = params.get("status")?.trim().toLowerCase() ?? "";

  const snapshot = await loadWorkerSnapshot(client);
  const nowMs = Date.now();
  const workerStatus = classifyWorkerStatus(snapshot.health, nowMs);

  const { data: activeRows, error: activeError } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, mode, summary, created_at, started_at, ended_at")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(80);
  if (activeError) {
    return jsonResponse({ ok: false, error: activeError.message }, 500);
  }

  const { data: recentTerminal, error: terminalError } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, mode, summary, created_at, started_at, ended_at")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .in("status", ["completed", "failed", "canceled"])
    .order("ended_at", { ascending: false })
    .limit(40);
  if (terminalError) {
    return jsonResponse({ ok: false, error: terminalError.message }, 500);
  }

  const matchesFilters = (view: QueueRunView): boolean => {
    if (agentSlug && view.agentSlug !== agentSlug) return false;
    if (workType && view.workType !== workType) return false;
    if (trigger && view.trigger !== trigger) return false;
    if (statusFilter && view.status !== statusFilter) return false;
    return true;
  };

  const activeViews = (activeRows || [])
    .map((row) => toQueueRunView(row, nowMs, workerStatus))
    .filter(matchesFilters);
  const queued = activeViews.filter((r) => r.status === "queued").slice(0, 10);
  const running = activeViews.filter((r) => r.status === "running");
  const stale = activeViews.filter((r) => r.stale);
  const oldestQueuedAgeMs = queued.reduce<number | null>((acc, row) => {
    if (row.ageMs == null) return acc;
    if (acc == null || row.ageMs > acc) return row.ageMs;
    return acc;
  }, null);

  const terminalViews = (recentTerminal || [])
    .map((row) => toQueueRunView(row, nowMs, workerStatus))
    .filter(matchesFilters);
  const lastCompleted =
    terminalViews.find((r) => r.status === "completed") ?? null;
  const lastFailed = terminalViews.find((r) => r.status === "failed") ?? null;
  const lastCanceled = terminalViews.find((r) => r.status === "canceled") ?? null;

  const ops = snapshot.health?.ops ?? null;
  const activeFromHealth = snapshot.capability.activeRunId
    ? running.find((r) => r.runId === snapshot.capability.activeRunId) ||
      running[0] ||
      null
    : running[0] || null;
  const metricScope = agentSlug ? "agent" : "global";
  // When scoped to an agent, do not fall back to global ops terminal ids.
  const lastCompletedRunId = lastCompleted?.runId ?? (agentSlug ? null : ops?.lastCompletedRunId ?? null);
  const lastFailedRunId = lastFailed?.runId ?? (agentSlug ? null : ops?.lastFailedRunId ?? null);

  return jsonResponse({
    ok: true,
    environment: "staging",
    capability: snapshot.capability,
    queue: {
      metricScope,
      length: queued.length,
      // Live age from current queued rows is source of truth (never prefer frozen ops age).
      oldestQueuedAgeMs,
      opsOldestQueuedAgeMs:
        typeof ops?.oldestQueuedAgeMs === "number" ? ops.oldestQueuedAgeMs : null,
      opsOldestQueuedAgeStale:
        workerStatus === "stale" ||
        workerStatus === "offline" ||
        !snapshot.capability.schedulerConnected,
      active: activeFromHealth
        ? {
            runId: activeFromHealth.runId,
            agentSlug: activeFromHealth.agentSlug,
            workType: activeFromHealth.workType,
            trigger: activeFromHealth.trigger,
            status: activeFromHealth.status,
            cancelRequested: activeFromHealth.cancelRequested,
            stale: activeFromHealth.stale,
            lockExpiresAt: activeFromHealth.lockExpiresAt,
          }
        : null,
      queued,
      running,
      stale,
      recentTerminal: terminalViews.slice(0, 10),
      lastCompletedRunId,
      lastFailedRunId,
      lastCanceledRunId: lastCanceled?.runId ?? null,
      lastError: snapshot.capability.lastError ?? null,
      workerHeartbeatAt: snapshot.capability.lastHeartbeatAt ?? null,
      schedulerHeartbeatAt: snapshot.capability.lastSchedulerTickAt ?? null,
      enginesReady: Boolean(snapshot.capability.enginesReady),
      alerts: Array.isArray((ops as { alerts?: unknown } | null)?.alerts)
        ? (ops as { alerts: unknown[] }).alerts
        : [],
      alertHistory: Array.isArray((ops as { alertHistory?: unknown } | null)?.alertHistory)
        ? (ops as { alertHistory: unknown[] }).alertHistory
        : [],
      alertFanout:
        ops && typeof ops === "object" && (ops as { alertFanout?: unknown }).alertFanout
          ? (ops as { alertFanout: unknown }).alertFanout
          : null,
      artifactCleanup:
        ops && typeof ops === "object" && (ops as { artifactCleanup?: unknown }).artifactCleanup
          ? (ops as { artifactCleanup: unknown }).artifactCleanup
          : null,
      notes: [
        "Staging worker queue only. No GitHub dispatch. No Playwright on Vercel.",
        "Private staging artifacts use short-lived signed links (owner only). Local-only refs stay host-local.",
        "Stale cleanup is dry-run by default on the worker host.",
        metricScope === "agent"
          ? "Queue metrics below are scoped to this agent."
          : "Queue metrics below are global across all staging workers runs.",
      ],
    },
  });
}

/** Phase D-C — signed private artifact URL (owner + staging + path belongs to run). */
export async function handleMonitoringManualRunArtifactUrlRequest(
  request: Request,
): Promise<Response> {
  return handleMonitoringArtifactUrlRequest(request, { assertOwnerFromRequest });
}

/** Phase D-C — acknowledge a staging worker health alert. */
export async function handleMonitoringManualRunHealthAlertAckRequest(
  request: Request,
): Promise<Response> {
  return handleMonitoringHealthAlertAckRequest(request, { assertOwnerFromRequest });
}
