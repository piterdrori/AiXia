/**
 * Fix B2-A — owner Detail client for manual website audit / Browser QA.
 * Queues into staging DB; worker claims later. No GitHub dispatch.
 */

import { supabase } from "@/lib/supabase";
import {
  AGENT_MANUAL_RUN_COPY,
  DEFAULT_MANUAL_MAX_DURATION_MINUTES,
  type AgentManualRunRequest,
  type AgentManualRunResult,
  type AgentManualWorkType,
} from "@/lib/agentops/agents/agentManualRunContract";

export const MANUAL_RUN_CAPABILITY_URL = "/api/agentops/monitoring/manual-run/capability";
export const MANUAL_RUN_URL = "/api/agentops/monitoring/manual-run";
export const MANUAL_RUN_QUEUE_URL = "/api/agentops/monitoring/manual-run/queue";

export type WorkerQueueRunView = {
  runId: string;
  agentSlug: string | null;
  workType: string | null;
  trigger: string | null;
  status: string;
  mode: string;
  createdAt: string | null;
  startedAt: string | null;
  lockExpiresAt: string | null;
  stale: boolean;
  cancelRequested: boolean;
  ageMs: number | null;
  suggestedAction: string | null;
};

export type WorkerQueueSnapshot = {
  length: number;
  oldestQueuedAgeMs: number | null;
  active: {
    runId: string;
    agentSlug: string | null;
    workType: string | null;
    trigger: string | null;
    status: string;
    cancelRequested: boolean;
    stale: boolean;
    lockExpiresAt: string | null;
  } | null;
  queued: WorkerQueueRunView[];
  running: WorkerQueueRunView[];
  stale: WorkerQueueRunView[];
  recentTerminal: WorkerQueueRunView[];
  lastCompletedRunId: string | null;
  lastFailedRunId: string | null;
  lastCanceledRunId: string | null;
  lastError: string | null;
  workerHeartbeatAt: string | null;
  schedulerHeartbeatAt: string | null;
  enginesReady: boolean;
  notes: string[];
};

export type ManualRunCapability = {
  queueAvailable: boolean;
  workerConnected: boolean;
  workerStatus: string;
  lastHeartbeatAt?: string | null;
  queueLength?: number;
  activeRunId?: string | null;
  activeRunType?: string | null;
  activeRunTrigger?: string | null;
  oldestQueuedAgeMs?: number | null;
  lastCompletedRunId?: string | null;
  lastFailedRunId?: string | null;
  lastError?: string | null;
  workerId?: string | null;
  workerVersion?: string | null;
  nextSchedulerTickEstimate?: string | null;
  enginesReady?: boolean;
  schedulerConnected?: boolean;
  lastSchedulerTickAt?: string | null;
  dueAgents?: number;
  queuedByLastTick?: number;
  skippedByLastTick?: number;
  scheduler?: {
    connected: boolean;
    reason: string | null;
    lastTickAt: string | null;
    lastTickId: string | null;
    lastDueCount: number;
    lastEnqueuedCount: number;
    lastSkippedCount: number;
    lastError: string | null;
    mode: string;
    agents?: Record<string, unknown>;
  };
  websiteAudit: { available: boolean; reason: string | null; engine: string };
  browserQa: { available: boolean; reason: string | null; engine: string };
  notes: string[];
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You must be signed in as AgentOps Owner.");
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchManualRunCapability(): Promise<{
  ok: boolean;
  capability: ManualRunCapability | null;
  error: string | null;
}> {
  try {
    const response = await fetch(MANUAL_RUN_CAPABILITY_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      capability?: ManualRunCapability;
      error?: string;
    };
    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        capability: null,
        error: payload.error ?? "Manual run capability unavailable.",
      };
    }
    return { ok: true, capability: payload.capability ?? null, error: null };
  } catch (error) {
    return {
      ok: false,
      capability: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function cancelOwnerManualRun(input: {
  runId: string;
  agentSlug?: string;
}): Promise<{
  ok: boolean;
  canceled: boolean;
  cancelRequested?: boolean;
  status?: string;
  message: string;
}> {
  const headers = await authHeaders();
  const response = await fetch(`${MANUAL_RUN_URL}/cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      runId: input.runId,
      ...(input.agentSlug ? { agentSlug: input.agentSlug } : {}),
    }),
  });
  const payload = (await response.json()) as {
    ok?: boolean;
    canceled?: boolean;
    cancelRequested?: boolean;
    status?: string;
    message?: string;
  };
  return {
    ok: Boolean(payload.ok),
    canceled: Boolean(payload.canceled),
    cancelRequested: Boolean(payload.cancelRequested),
    status: payload.status,
    message: payload.message ?? (response.ok ? "Cancel processed." : "Cancel failed."),
  };
}

export async function fetchWorkerQueueStatus(input?: {
  agentSlug?: string;
  workType?: string;
  trigger?: string;
  status?: string;
}): Promise<{
  ok: boolean;
  queue: WorkerQueueSnapshot | null;
  capability: ManualRunCapability | null;
  error: string | null;
}> {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (input?.agentSlug) params.set("agentSlug", input.agentSlug);
    if (input?.workType) params.set("workType", input.workType);
    if (input?.trigger) params.set("trigger", input.trigger);
    if (input?.status) params.set("status", input.status);
    const qs = params.toString();
    const response = await fetch(qs ? `${MANUAL_RUN_QUEUE_URL}?${qs}` : MANUAL_RUN_QUEUE_URL, {
      method: "GET",
      headers,
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      queue?: WorkerQueueSnapshot;
      capability?: ManualRunCapability;
      error?: string;
    };
    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        queue: null,
        capability: null,
        error: payload.error ?? "Worker queue unavailable.",
      };
    }
    return {
      ok: true,
      queue: payload.queue ?? null,
      capability: payload.capability ?? null,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      queue: null,
      capability: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function startOwnerManualRun(
  input: Omit<AgentManualRunRequest, "requestedBy"> & { requestedBy?: string },
): Promise<AgentManualRunResult> {
  const headers = await authHeaders();
  const body: AgentManualRunRequest = {
    agentSlug: input.agentSlug,
    workType: input.workType,
    scope: input.scope,
    maxDurationMinutes: input.maxDurationMinutes || DEFAULT_MANUAL_MAX_DURATION_MINUTES,
    avoidOverlap: input.avoidOverlap !== false,
    requestedBy: input.requestedBy ?? "owner",
    ownerFacingPaused: input.ownerFacingPaused,
    runOnceWhilePaused: input.runOnceWhilePaused,
    activateAndRun: input.activateAndRun,
  };

  const response = await fetch(MANUAL_RUN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as AgentManualRunResult & {
    ok?: boolean;
    agentPaused?: boolean;
  };

  return {
    accepted: Boolean(payload.accepted),
    runId: payload.runId,
    status: payload.status ?? "rejected",
    message: payload.message || AGENT_MANUAL_RUN_COPY.workerNotConnected,
    startedAt: payload.startedAt,
    completedAt: payload.completedAt,
    evidenceAvailable: payload.evidenceAvailable,
    githubRunId: payload.githubRunId ?? null,
    githubRunUrl: payload.githubRunUrl ?? null,
    workType: payload.workType ?? input.workType,
    agentSlug: payload.agentSlug ?? input.agentSlug,
    durationMs: payload.durationMs,
    routesChecked: payload.routesChecked,
    rawObservations: payload.rawObservations,
    queuedFindings: payload.queuedFindings,
    findingsCount: payload.findingsCount,
    errorsCount: payload.errorsCount,
    scope: payload.scope,
    artifactRefs: payload.artifactRefs,
    screenshotRefs: payload.screenshotRefs,
    consoleFindings: payload.consoleFindings,
    networkFindings: payload.networkFindings,
    accessibilityFindings: payload.accessibilityFindings,
    workerId: payload.workerId,
    failurePhase: payload.failurePhase,
    existingRunId: payload.existingRunId,
    workerConnected: payload.workerConnected,
    stale: payload.stale,
    cancelRequested: payload.cancelRequested,
    artifactVisibility: payload.artifactVisibility ?? null,
    artifactNote: payload.artifactNote ?? null,
    lockExpiresAt: payload.lockExpiresAt ?? null,
  };
}

export async function fetchManualRunStatus(input: {
  runId?: string;
  agentSlug?: string;
}): Promise<{
  ok: boolean;
  active: boolean;
  result: AgentManualRunResult | null;
  error: string | null;
  workerConnected?: boolean;
}> {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (input.runId) params.set("runId", input.runId);
    if (input.agentSlug) params.set("agentSlug", input.agentSlug);
    const response = await fetch(`${MANUAL_RUN_URL}?${params.toString()}`, {
      method: "GET",
      headers,
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      active?: boolean;
      result?: AgentManualRunResult | null;
      error?: string;
      workerConnected?: boolean;
    };
    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        active: false,
        result: null,
        error: payload.error ?? "Could not load manual run status.",
        workerConnected: payload.workerConnected,
      };
    }
    return {
      ok: true,
      active: Boolean(payload.active),
      result: payload.result ?? null,
      error: null,
      workerConnected: payload.workerConnected,
    };
  } catch (error) {
    return {
      ok: false,
      active: false,
      result: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function activityLabelForManualRun(
  status: string | null | undefined,
  workType: AgentManualWorkType | null | undefined,
):
  | "Queued for staging worker"
  | "Preparing"
  | "Auditing"
  | "Running Browser QA"
  | "Processing evidence"
  | "Completed"
  | "Failed"
  | "Canceled"
  | "Idle" {
  const s = (status ?? "").toLowerCase();
  if (s === "queued") return "Queued for staging worker";
  if (s === "running") {
    return workType === "browser_qa" ? "Running Browser QA" : "Auditing";
  }
  if (s === "completed") return "Completed";
  if (s === "canceled") return "Canceled";
  if (s === "failed" || s === "rejected") return "Failed";
  return "Idle";
}

export function formatLocalArtifactEvidence(
  result: Pick<
    AgentManualRunResult,
    "artifactRefs" | "screenshotRefs" | "artifactVisibility" | "artifactNote" | "evidenceAvailable"
  >,
): string {
  if (!result.evidenceAvailable) return "No evidence linked";
  const parts: string[] = [];
  if (result.screenshotRefs && result.screenshotRefs.length > 0) {
    const safe = result.screenshotRefs
      .filter((ref) => typeof ref === "string" && !/storage[-_]?state|service[_-]?role|token=/i.test(ref))
      .slice(0, 3);
    if (safe.length > 0) parts.push(`Screenshot ref(s): ${safe.join(", ")}`);
    else parts.push(`${result.screenshotRefs.length} screenshot ref(s)`);
  }
  if (result.artifactRefs && result.artifactRefs.length > 0) {
    parts.push(`${result.artifactRefs.length} artifact ref(s)`);
  }
  const visibility = result.artifactVisibility || "local_worker_only";
  if (visibility === "local_worker_only") {
    parts.push("Local worker artifact — available on the worker host, not uploaded to public storage.");
  }
  if (result.artifactNote) parts.push(result.artifactNote);
  return parts.join(" · ") || "Evidence available in Monitoring";
}

export function defaultScopeForWorkType(
  workType: AgentManualWorkType,
  agentSlug?: string,
): AgentManualRunRequest["scope"] {
  if (workType === "browser_qa") {
    return { type: "selected_routes", routes: ["/system/agent-ops"] };
  }
  const slug = (agentSlug || "system-agent").trim().toLowerCase() || "system-agent";
  return {
    type: "selected_routes",
    routes: [`/system/agent-ops/agents/${slug}`],
  };
}

export function formatManualRunResultBanner(result: AgentManualRunResult): string {
  if (result.status === "queued") {
    return result.message || AGENT_MANUAL_RUN_COPY.queuedWorkerOffline;
  }
  const parts = [
    result.status === "completed" ? "Completed" : result.status === "failed" ? "Failed" : result.status,
    result.durationMs != null ? `${Math.round(result.durationMs / 1000)}s` : null,
    result.routesChecked && result.routesChecked.length > 0
      ? `${result.routesChecked.length} route(s)`
      : null,
    result.rawObservations != null ? `${result.rawObservations} raw observation(s)` : null,
    result.queuedFindings != null
      ? result.queuedFindings > 0
        ? `${result.queuedFindings} queued finding(s)`
        : AGENT_MANUAL_RUN_COPY.zeroFindings
      : null,
    result.evidenceAvailable ? "Evidence available" : null,
  ].filter(Boolean);
  return parts.join(" · ");
}
