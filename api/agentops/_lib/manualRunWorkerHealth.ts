/**
 * Fix B2-B — read staging manual-run worker health from agentops_system_config.
 * Heartbeat is written by the external worker (service role). Vercel only reads.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const WORKER_VERSION = "b2-b";
export const WORKER_HEALTH_KEY = "manualRunWorker";
export const HEARTBEAT_FRESH_MS = 3 * 60 * 1000;
export const WORKER_NOT_CONNECTED_REASON = "Staging worker not connected.";
export const ENGINE_NOT_CONNECTED_WEBSITE =
  "Staging worker connected. Website audit engine not connected in this phase.";
export const ENGINE_NOT_CONNECTED_BROWSER =
  "Staging worker connected. Browser QA engine not connected in this phase.";
export const B2B_CLAIM_CLOSE_MESSAGE =
  "Worker claim verified. Execution engine not connected in B2-B.";

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
  websiteAuditEngine: string;
  browserQaEngine: string;
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

export function parseWorkerHealth(toolsEnabled: unknown): ManualRunWorkerHealth | null {
  if (!toolsEnabled || typeof toolsEnabled !== "object") return null;
  const raw = (toolsEnabled as Record<string, unknown>)[WORKER_HEALTH_KEY];
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
    websiteAuditEngine:
      typeof health.websiteAuditEngine === "string" ? health.websiteAuditEngine : "not_connected",
    browserQaEngine:
      typeof health.browserQaEngine === "string" ? health.browserQaEngine : "not_connected",
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
    .select("run_id, summary, status")
    .eq("mode", "owner_manual_single_agent")
    .eq("status", "queued")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return 0;
  return data.filter((row) => {
    const summary =
      row.summary && typeof row.summary === "object"
        ? (row.summary as Record<string, unknown>)
        : {};
    return (
      summary.trigger === "owner_manual" &&
      summary.schedulerConnection === "staging_worker_pending"
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
    websiteAudit: {
      available: false,
      reason: workerConnected ? ENGINE_NOT_CONNECTED_WEBSITE : WORKER_NOT_CONNECTED_REASON,
      engine: "staging_worker + website_audit (pending B2-C)",
    },
    browserQa: {
      available: false,
      reason: workerConnected ? ENGINE_NOT_CONNECTED_BROWSER : WORKER_NOT_CONNECTED_REASON,
      engine: "staging_worker + browser_qa (pending B2-D)",
    },
    notes: [
      "Staging queue accepts owner-gated runs into agentops_monitoring_runs.",
      "No GitHub dispatch. No Playwright on Vercel.",
      workerConnected
        ? "Staging worker heartbeat is fresh. Engine execution arrives in B2-C / B2-D."
        : "A staging worker must heartbeat and claim queued runs (Fix B2-B).",
      "Findings remain drafts; no auto-promotion, auto-fix, PR, or deploy.",
    ],
  };
}
