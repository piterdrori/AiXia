/**
 * Fix B — owner-gated per-agent manual run accept / status (staging only).
 * Playwright executes on GitHub Actions daily-12 workflow with agent_scope.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";
import {
  createMonitoringReadClient,
  resolveMonitoringSupabaseUrl,
} from "./monitoringReadClient.js";
import { jsonResponse } from "./ollamaProxy.js";
import {
  buildManualRunSummary,
  DAILY12_WORKFLOW_FILE,
  GITHUB_REF,
  GITHUB_REPO,
  validateAgentManualRunRequest,
  type AgentManualRunRequest,
} from "./manualRunContract.js";

const MONITORING_TABLE = "agentops_monitoring_runs";
const DAILY_EXECUTIONS_TABLE = "agentops_monitoring_daily_agent_executions";
const AGENTS_TABLE = "agentops_agents";
const ACTIVE_STATUSES = new Set(["queued", "running"]);

function methodNotAllowed(): Response {
  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}

function createServiceClient(): SupabaseClient | null {
  const readClient = createMonitoringReadClient(process.env);
  return readClient.ok ? readClient.client : null;
}

function readDispatchToken(): string | null {
  const token =
    process.env.AGENTOPS_GITHUB_DISPATCH_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    "";
  return token || null;
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

async function dispatchDaily12Workflow(input: {
  agentSlug: string;
  workType: string;
  ownerManualRunId: string;
  selectedRoutes: string[];
  maxDurationMinutes: number;
}): Promise<{ ok: true; githubRunUrl: string | null } | { ok: false; error: string }> {
  const token = readDispatchToken();
  if (!token) {
    return {
      ok: false,
      error:
        "Manual run dispatch is not configured (missing AGENTOPS_GITHUB_DISPATCH_TOKEN on staging).",
    };
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${DAILY12_WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: GITHUB_REF,
        inputs: {
          agent_scope: input.agentSlug,
          force_retry: "true",
          work_type: input.workType,
          owner_manual_run_id: input.ownerManualRunId,
          selected_routes: input.selectedRoutes.join(","),
          max_duration_minutes: String(input.maxDurationMinutes),
        },
      }),
    },
  );

  if (response.status !== 204 && !response.ok) {
    const text = await response.text();
    return {
      ok: false,
      error: `GitHub workflow dispatch failed (${response.status}): ${text.slice(0, 300)}`,
    };
  }

  return {
    ok: true,
    githubRunUrl: `https://github.com/${GITHUB_REPO}/actions/workflows/${DAILY12_WORKFLOW_FILE}`,
  };
}

async function maybeResolveGithubRunId(
  token: string,
  startedAfterIso: string,
): Promise<{ githubRunId: string | null; githubRunUrl: string | null }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${DAILY12_WORKFLOW_FILE}/runs?event=workflow_dispatch&per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!response.ok) return { githubRunId: null, githubRunUrl: null };
    const payload = (await response.json()) as {
      workflow_runs?: Array<{ id: number; html_url: string; created_at: string; status: string }>;
    };
    const startedAfter = Date.parse(startedAfterIso);
    const match = (payload.workflow_runs ?? []).find(
      (run) => Date.parse(run.created_at) >= startedAfter - 15_000,
    );
    if (!match) return { githubRunId: null, githubRunUrl: null };
    return {
      githubRunId: String(match.id),
      githubRunUrl: match.html_url,
    };
  } catch {
    return { githubRunId: null, githubRunUrl: null };
  }
}

function capabilityPayload(dispatchConfigured: boolean) {
  return {
    websiteAudit: {
      available: dispatchConfigured,
      reason: dispatchConfigured
        ? null
        : "Missing AGENTOPS_GITHUB_DISPATCH_TOKEN — Website audit dispatches Daily-12 GHA.",
      engine: "daily_12_agent_review + playwrightStagingScanner",
    },
    browserQa: {
      available: dispatchConfigured,
      reason: dispatchConfigured
        ? null
        : "Missing AGENTOPS_GITHUB_DISPATCH_TOKEN — Browser QA uses same GHA engine with limited scope.",
      engine: "daily_12_agent_review + playwrightStagingScanner (limited routes)",
    },
    notes: [
      "Vercel does not run Playwright. Manual runs are accepted here and executed on GitHub Actions.",
      "Findings remain drafts; no auto-promotion, auto-fix, PR, or deploy.",
    ],
  };
}

export async function handleMonitoringManualRunCapabilityRequest(
  request: Request,
): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const dispatchConfigured = Boolean(readDispatchToken());
  return jsonResponse({
    ok: true,
    environment: "staging",
    capability: capabilityPayload(dispatchConfigured),
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
          message: "This agent already has an active run.",
          existingRunId: active.run_id,
          runId: active.run_id,
        },
        409,
      );
    }
  }

  if (!readDispatchToken()) {
    return jsonResponse(
      {
        ok: false,
        accepted: false,
        status: "rejected",
        message:
          "Manual run dispatch is not configured (missing AGENTOPS_GITHUB_DISPATCH_TOKEN on staging).",
        capability: capabilityPayload(false),
      },
      503,
    );
  }

  const runId = `owner-manual-${runRequest.agentSlug}-${randomUUID()}`;
  const startedAt = new Date().toISOString();
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

  const routes =
    runRequest.scope.routes && runRequest.scope.routes.length > 0
      ? runRequest.scope.routes
      : runRequest.workType === "browser_qa"
        ? ["/system/agent-ops"]
        : [];

  const dispatch = await dispatchDaily12Workflow({
    agentSlug: runRequest.agentSlug,
    workType: runRequest.workType,
    ownerManualRunId: runId,
    selectedRoutes: routes,
    maxDurationMinutes: runRequest.maxDurationMinutes,
  });

  if (!dispatch.ok) {
    await client
      .from(MONITORING_TABLE)
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        summary: { ...summary, dispatchError: dispatch.error },
        errors_count: 1,
      })
      .eq("run_id", runId);

    return jsonResponse(
      {
        ok: false,
        accepted: false,
        status: "failed",
        runId,
        message: dispatch.error,
      },
      503,
    );
  }

  const token = readDispatchToken()!;
  const github = await maybeResolveGithubRunId(token, startedAt);

  await client
    .from(MONITORING_TABLE)
    .update({
      status: "running",
      agents_run: 1,
      github_run_id: github.githubRunId,
      github_run_url: github.githubRunUrl ?? dispatch.githubRunUrl,
      summary: {
        ...summary,
        dispatchAccepted: true,
        githubWorkflow: DAILY12_WORKFLOW_FILE,
      },
    })
    .eq("run_id", runId);

  return jsonResponse({
    ok: true,
    accepted: true,
    runId,
    status: "running",
    message: "Owner manual run accepted. Playwright execution started on GitHub Actions.",
    startedAt,
    githubRunId: github.githubRunId,
    githubRunUrl: github.githubRunUrl ?? dispatch.githubRunUrl,
    workType: runRequest.workType,
    agentSlug: runRequest.agentSlug,
    evidenceAvailable: false,
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

  if (ACTIVE_STATUSES.has(status) && slug && startedAt) {
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

  return jsonResponse({
    ok: true,
    active: ACTIVE_STATUSES.has(status),
    result: {
      accepted: true,
      runId: row.run_id,
      status,
      message:
        status === "running"
          ? "Manual run is in progress on GitHub Actions."
          : status === "completed"
            ? "Manual run completed."
            : status === "failed"
              ? "Manual run failed."
              : `Manual run status: ${status}`,
      startedAt,
      completedAt,
      evidenceAvailable,
      githubRunId: row.github_run_id ?? null,
      githubRunUrl: row.github_run_url ?? null,
      workType: summary.workType ?? null,
      agentSlug: slug || null,
      durationMs,
      routesChecked,
      rawObservations,
      queuedFindings,
    },
  });
}
