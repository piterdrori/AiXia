/**
 * Fix C-A — read staging manual-run worker + scheduler health from agentops_system_config.
 * Heartbeat/tick written by external worker (service role). Vercel only reads.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const WORKER_VERSION = "c-b";
export const WORKER_HEALTH_KEY = "manualRunWorker";
export const SCHEDULER_HEALTH_KEY = "manualRunScheduler";
export const HEARTBEAT_FRESH_MS = 3 * 60 * 1000;
export const SCHEDULER_FRESH_MS = 15 * 60 * 1000;
export const WORKER_NOT_CONNECTED_REASON = "Staging worker not connected.";
export const ENGINE_NOT_CONNECTED_WEBSITE =
  "Staging worker connected. Website audit engine not connected in this phase.";
export const ENGINE_NOT_CONNECTED_BROWSER =
  "Browser QA engine not connected.";
export const SCHEDULER_NOT_CONNECTED_REASON =
  "Staging worker scheduler has not ticked recently.";
export const B2B_CLAIM_CLOSE_MESSAGE =
  "Worker claim verified. Execution engine not connected in B2-B.";

export type ManualRunEngineHealth = {
  connected: boolean;
  version?: string | null;
  lastCheckedAt?: string | null;
  reason?: string | null;
};

export type ManualRunSchedulerHealth = {
  connected: boolean;
  lastTickAt: string | null;
  lastTickId: string | null;
  lastDueCount: number;
  lastEnqueuedCount: number;
  lastSkippedCount: number;
  lastError: string | null;
  mode: string;
  agents?: Record<string, unknown>;
};

export type ManualRunWorkerHealth = {
  connected: boolean;
  lastHeartbeatAt: string | null;
  workerId: string | null;
  workerVersion: string | null;
  activeRunId: string | null;
  queueLength: number;
  lastClaimedRunId: string | null;
  lastError: string | null;
  environment: string;
  websiteAuditEngine: ManualRunEngineHealth;
  browserQaEngine: ManualRunEngineHealth;
  scheduler: ManualRunSchedulerHealth | null;
};

export type ManualRunWorkerStatus = "connected" | "offline" | "stale" | "unknown";

export function heartbeatAgeMs(lastHeartbeatAt: string | null, nowMs = Date.now()): number {
  if (!lastHeartbeatAt) return Number.POSITIVE_INFINITY;
  const ts = Date.parse(lastHeartbeatAt);
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Math.max(0, nowMs - ts);
}

export function isHeartbeatFresh(
  lastHeartbeatAt: string | null,
  nowMs = Date.now(),
  freshMs = HEARTBEAT_FRESH_MS,
): boolean {
  return heartbeatAgeMs(lastHeartbeatAt, nowMs) < freshMs;
}

function normalizeEngine(raw: unknown, fallbackReason: string): ManualRunEngineHealth {
  if (raw && typeof raw === "object") {
    const engine = raw as Record<string, unknown>;
    return {
      connected: Boolean(engine.connected),
      version: typeof engine.version === "string" ? engine.version : null,
      lastCheckedAt: typeof engine.lastCheckedAt === "string" ? engine.lastCheckedAt : null,
      reason: typeof engine.reason === "string" ? engine.reason : null,
    };
  }
  if (raw === "connected") {
    return { connected: true, version: "b2-c", lastCheckedAt: null, reason: null };
  }
  return { connected: false, version: null, lastCheckedAt: null, reason: fallbackReason };
}

function normalizeScheduler(
  raw: unknown,
  mirror: unknown,
  nowMs = Date.now(),
): ManualRunSchedulerHealth | null {
  const source =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : mirror && typeof mirror === "object"
        ? (mirror as Record<string, unknown>)
        : null;
  if (!source) return null;
  const lastTickAt = typeof source.lastTickAt === "string" ? source.lastTickAt : null;
  const fresh = isHeartbeatFresh(lastTickAt, nowMs, SCHEDULER_FRESH_MS);
  return {
    connected: Boolean(source.connected) && fresh,
    lastTickAt,
    lastTickId: typeof source.lastTickId === "string" ? source.lastTickId : null,
    lastDueCount: typeof source.lastDueCount === "number" ? source.lastDueCount : 0,
    lastEnqueuedCount:
      typeof source.lastEnqueuedCount === "number" ? source.lastEnqueuedCount : 0,
    lastSkippedCount:
      typeof source.lastSkippedCount === "number" ? source.lastSkippedCount : 0,
    lastError: typeof source.lastError === "string" ? source.lastError : null,
    mode:
      typeof source.mode === "string" ? source.mode : "staging_worker_scheduler",
    agents:
      source.agents && typeof source.agents === "object"
        ? (source.agents as Record<string, unknown>)
        : {},
  };
}

export function parseWorkerHealth(
  toolsEnabled: unknown,
  nowMs = Date.now(),
): ManualRunWorkerHealth | null {
  if (!toolsEnabled || typeof toolsEnabled !== "object") return null;
  const tools = toolsEnabled as Record<string, unknown>;
  const raw = tools[WORKER_HEALTH_KEY];
  if (!raw || typeof raw !== "object") return null;
  const health = raw as Record<string, unknown>;
  return {
    connected: Boolean(health.connected),
    lastHeartbeatAt: typeof health.lastHeartbeatAt === "string" ? health.lastHeartbeatAt : null,
    workerId: typeof health.workerId === "string" ? health.workerId : null,
    workerVersion: typeof health.workerVersion === "string" ? health.workerVersion : null,
    activeRunId: typeof health.activeRunId === "string" ? health.activeRunId : null,
    queueLength: typeof health.queueLength === "number" ? health.queueLength : 0,
    lastClaimedRunId: typeof health.lastClaimedRunId === "string" ? health.lastClaimedRunId : null,
    lastError: typeof health.lastError === "string" ? health.lastError : null,
    environment: typeof health.environment === "string" ? health.environment : "staging",
    websiteAuditEngine: normalizeEngine(health.websiteAuditEngine, ENGINE_NOT_CONNECTED_WEBSITE),
    browserQaEngine: normalizeEngine(health.browserQaEngine, ENGINE_NOT_CONNECTED_BROWSER),
    scheduler: normalizeScheduler(tools[SCHEDULER_HEALTH_KEY], health.scheduler, nowMs),
  };
}

export function classifyWorkerStatus(
  health: ManualRunWorkerHealth | null,
  nowMs = Date.now(),
): ManualRunWorkerStatus {
  if (!health) return "unknown";
  if (!health.lastHeartbeatAt) return "offline";
  if (isHeartbeatFresh(health.lastHeartbeatAt, nowMs)) return "connected";
  return "stale";
}

export function isLockExpired(
  summary: Record<string, unknown> | null | undefined,
  nowMs = Date.now(),
): boolean {
  const raw = summary?.lockExpiresAt;
  if (typeof raw !== "string") return false;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return false;
  return ts < nowMs;
}

export async function readManualRunWorkerHealth(
  client: SupabaseClient,
): Promise<ManualRunWorkerHealth | null> {
  const { data, error } = await client
    .from("agentops_system_config")
    .select("tools_enabled")
    .eq("environment", "staging")
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return parseWorkerHealth(data.tools_enabled);
}

export async function countQueuedManualRuns(client: SupabaseClient): Promise<number> {
  const { data, error } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, summary, status, mode")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .eq("status", "queued")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error || !data) return 0;
  return data.filter((row) => {
    const summary =
      row.summary && typeof row.summary === "object"
        ? (row.summary as Record<string, unknown>)
        : {};
    return (
      (summary.trigger === "owner_manual" &&
        summary.schedulerConnection === "staging_worker_pending") ||
      (summary.trigger === "schedule" && summary.schedulerConnection === "staging_worker")
    );
  }).length;
}

export function buildCapabilityFromHealth(
  health: ManualRunWorkerHealth | null,
  queueLength: number,
  nowMs = Date.now(),
) {
  const workerStatus = classifyWorkerStatus(health, nowMs);
  const workerConnected = workerStatus === "connected";
  const websiteAuditEngineConnected =
    workerConnected && Boolean(health?.websiteAuditEngine?.connected);
  const browserQaEngineConnected =
    workerConnected && Boolean(health?.browserQaEngine?.connected);
  const scheduler = health?.scheduler ?? null;
  const schedulerConnected = workerConnected && Boolean(scheduler?.connected);

  return {
    queueAvailable: true,
    workerConnected,
    workerStatus,
    lastHeartbeatAt: health?.lastHeartbeatAt ?? null,
    queueLength: health?.queueLength ?? queueLength,
    activeRunId: health?.activeRunId ?? null,
    lastError: health?.lastError ?? null,
    workerId: health?.workerId ?? null,
    workerVersion: health?.workerVersion ?? null,
    schedulerConnected,
    lastSchedulerTickAt: scheduler?.lastTickAt ?? null,
    dueAgents: scheduler?.lastDueCount ?? 0,
    queuedByLastTick: scheduler?.lastEnqueuedCount ?? 0,
    skippedByLastTick: scheduler?.lastSkippedCount ?? 0,
    scheduler: {
      connected: schedulerConnected,
      reason: schedulerConnected
        ? null
        : workerConnected
          ? SCHEDULER_NOT_CONNECTED_REASON
          : WORKER_NOT_CONNECTED_REASON,
      lastTickAt: scheduler?.lastTickAt ?? null,
      lastTickId: scheduler?.lastTickId ?? null,
      lastDueCount: scheduler?.lastDueCount ?? 0,
      lastEnqueuedCount: scheduler?.lastEnqueuedCount ?? 0,
      lastSkippedCount: scheduler?.lastSkippedCount ?? 0,
      lastError: scheduler?.lastError ?? null,
      mode: "staging_worker_scheduler",
      agents: scheduler?.agents ?? {},
    },
    websiteAudit: {
      available: websiteAuditEngineConnected,
      reason: websiteAuditEngineConnected
        ? null
        : workerConnected
          ? health?.websiteAuditEngine?.reason ?? ENGINE_NOT_CONNECTED_WEBSITE
          : WORKER_NOT_CONNECTED_REASON,
      engine: "staging_worker + website_audit (scanStagingWebsite)",
    },
    browserQa: {
      available: browserQaEngineConnected,
      reason: browserQaEngineConnected
        ? null
        : workerConnected
          ? health?.browserQaEngine?.reason ?? ENGINE_NOT_CONNECTED_BROWSER
          : WORKER_NOT_CONNECTED_REASON,
      engine: "staging_worker + browser_qa (runPlaywrightBrowserQA)",
    },
    notes: [
      "Staging queue accepts owner-gated and scheduled runs into agentops_monitoring_runs.",
      "No GitHub dispatch. No Vercel cron. No Playwright on Vercel.",
      workerConnected
        ? schedulerConnected
          ? "Staging worker connected. Scheduler tick is fresh. Engines follow heartbeat."
          : "Staging worker connected. Run scheduler-tick to enqueue due schedules."
        : "A staging worker must heartbeat and claim queued runs.",
      "Findings remain drafts; no auto-promotion, auto-fix, PR, or deploy.",
    ],
  };
}
