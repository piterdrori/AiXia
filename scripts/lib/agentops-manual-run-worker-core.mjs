/**
 * Fix B2-B — shared pure helpers for staging manual-run worker.
 * Used by worker CLI + verify scripts (no Supabase imports).
 */

export const WORKER_VERSION = "b2-b";
export const WORKER_HEALTH_KEY = "manualRunWorker";
export const HEARTBEAT_FRESH_MS = 3 * 60 * 1000;
export const LOCK_TTL_MS = 5 * 60 * 1000;
export const B2B_CLAIM_CLOSE_MESSAGE =
  "Worker claim verified. Execution engine not connected in B2-B.";
export const ENGINE_NOT_CONNECTED_WEBSITE =
  "Staging worker connected. Website audit engine not connected in this phase.";
export const ENGINE_NOT_CONNECTED_BROWSER =
  "Staging worker connected. Browser QA engine not connected in this phase.";
export const WORKER_NOT_CONNECTED = "Staging worker not connected.";

export function validateWorkerEnv(env = process.env) {
  const errors = [];
  const url =
    env.STAGING_SUPABASE_URL?.trim() ||
    env.SUPABASE_URL?.trim() ||
    env.VITE_SUPABASE_URL?.trim() ||
    "";
  const serviceKey =
    env.STAGING_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  const appUrl = (env.STAGING_APP_URL || "https://ai-xia-staging.vercel.app").trim();
  const workerSecret = env.AGENTOPS_WORKER_SECRET?.trim() || "";
  const environment = (env.AGENTOPS_ENVIRONMENT || "staging").trim().toLowerCase();
  const productionBlocked = String(env.AGENTOPS_PRODUCTION_BLOCKED ?? "true").toLowerCase() !== "false";

  if (!url) errors.push("STAGING_SUPABASE_URL (or SUPABASE_URL) is required.");
  if (!serviceKey) errors.push("STAGING_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required.");
  if (!workerSecret) errors.push("AGENTOPS_WORKER_SECRET is required.");
  if (environment !== "staging") errors.push('AGENTOPS_ENVIRONMENT must be "staging".');
  if (!productionBlocked) errors.push("AGENTOPS_PRODUCTION_BLOCKED must be true.");

  try {
    const host = new URL(appUrl).hostname.toLowerCase();
    if (host === "aixia.app" || host.endsWith(".aixia.app") || host.includes("production")) {
      errors.push("STAGING_APP_URL must not point at production.");
    }
  } catch {
    errors.push("STAGING_APP_URL is invalid.");
  }

  try {
    const host = url ? new URL(url).hostname.toLowerCase() : "";
    if (host.includes("production") || host === "aixia.app") {
      errors.push("Supabase URL looks like production — rejected.");
    }
  } catch {
    errors.push("Supabase URL is invalid.");
  }

  return {
    ok: errors.length === 0,
    errors,
    config: {
      supabaseUrl: url,
      serviceRoleKey: serviceKey,
      appUrl: appUrl.replace(/\/+$/, ""),
      workerSecret,
      environment,
      productionBlocked,
    },
  };
}

export function heartbeatAgeMs(lastHeartbeatAt, nowMs = Date.now()) {
  if (!lastHeartbeatAt || typeof lastHeartbeatAt !== "string") return Number.POSITIVE_INFINITY;
  const ts = Date.parse(lastHeartbeatAt);
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Math.max(0, nowMs - ts);
}

export function isHeartbeatFresh(lastHeartbeatAt, nowMs = Date.now(), freshMs = HEARTBEAT_FRESH_MS) {
  return heartbeatAgeMs(lastHeartbeatAt, nowMs) < freshMs;
}

export function classifyWorkerStatus(health, nowMs = Date.now()) {
  if (!health || typeof health !== "object") return "unknown";
  const last = typeof health.lastHeartbeatAt === "string" ? health.lastHeartbeatAt : null;
  if (!last) return "offline";
  if (isHeartbeatFresh(last, nowMs)) return "connected";
  return "stale";
}

export function parseWorkerHealth(toolsEnabled) {
  const tools =
    toolsEnabled && typeof toolsEnabled === "object" ? toolsEnabled : {};
  const raw = tools[WORKER_HEALTH_KEY];
  if (!raw || typeof raw !== "object") return null;
  return {
    connected: Boolean(raw.connected),
    lastHeartbeatAt: typeof raw.lastHeartbeatAt === "string" ? raw.lastHeartbeatAt : null,
    workerId: typeof raw.workerId === "string" ? raw.workerId : null,
    workerVersion: typeof raw.workerVersion === "string" ? raw.workerVersion : null,
    activeRunId: typeof raw.activeRunId === "string" ? raw.activeRunId : null,
    queueLength: typeof raw.queueLength === "number" ? raw.queueLength : 0,
    lastClaimedRunId: typeof raw.lastClaimedRunId === "string" ? raw.lastClaimedRunId : null,
    lastError: typeof raw.lastError === "string" ? raw.lastError : null,
    environment: typeof raw.environment === "string" ? raw.environment : "staging",
    websiteAuditEngine:
      typeof raw.websiteAuditEngine === "string" ? raw.websiteAuditEngine : "not_connected",
    browserQaEngine:
      typeof raw.browserQaEngine === "string" ? raw.browserQaEngine : "not_connected",
  };
}

export function mergeWorkerHealthIntoTools(toolsEnabled, healthPatch) {
  const tools =
    toolsEnabled && typeof toolsEnabled === "object" ? { ...toolsEnabled } : {};
  const prev = parseWorkerHealth(tools) || {};
  tools[WORKER_HEALTH_KEY] = {
    ...prev,
    ...healthPatch,
    environment: "staging",
    websiteAuditEngine: "not_connected",
    browserQaEngine: "not_connected",
  };
  return tools;
}

export function isOwnerManualQueuedSummary(summary) {
  if (!summary || typeof summary !== "object") return false;
  return (
    summary.trigger === "owner_manual" &&
    summary.schedulerConnection === "staging_worker_pending"
  );
}

export function isLockExpired(summary, nowMs = Date.now()) {
  const raw = summary?.lockExpiresAt;
  if (typeof raw !== "string") return false;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return false;
  return ts < nowMs;
}

export function buildClaimSummaryPatch(summary, input) {
  const claimedAt = input.claimedAt || new Date().toISOString();
  const lockExpiresAt =
    input.lockExpiresAt || new Date(Date.parse(claimedAt) + LOCK_TTL_MS).toISOString();
  return {
    ...(summary && typeof summary === "object" ? summary : {}),
    workerId: input.workerId,
    workerVersion: input.workerVersion || WORKER_VERSION,
    claimedAt,
    lockExpiresAt,
    workerPhase: "b2-b",
    executionEngine: "not_connected",
    claimTest: true,
  };
}

export function buildClaimCloseSummary(summary, message = B2B_CLAIM_CLOSE_MESSAGE) {
  return {
    ...(summary && typeof summary === "object" ? summary : {}),
    failureReason: message,
    b2bClaimOnly: true,
    executionEngine: "not_connected",
    workerPhase: "b2-b",
    closedAt: new Date().toISOString(),
  };
}
