/**
 * Fix B2-D — shared pure helpers for staging manual-run worker.
 * Used by worker CLI + verify scripts (no Supabase imports).
 */

export const WORKER_VERSION = "c-a";
export const WORKER_HEALTH_KEY = "manualRunWorker";
export const HEARTBEAT_FRESH_MS = 3 * 60 * 1000;
export const LOCK_TTL_MS = 5 * 60 * 1000;
export const WEBSITE_AUDIT_LOCK_TTL_MS = 15 * 60 * 1000;
export const BROWSER_QA_LOCK_TTL_MS = 15 * 60 * 1000;
export const B2B_CLAIM_CLOSE_MESSAGE =
  "Worker claim verified. Execution engine not connected in B2-B.";
export const ENGINE_NOT_CONNECTED_WEBSITE =
  "Staging worker connected. Website audit engine not connected in this phase.";
export const ENGINE_NOT_CONNECTED_BROWSER =
  "Browser QA engine not connected.";
export const BROWSER_QA_AUTH_NOT_CONFIGURED =
  "Browser QA auth not configured for staging worker.";
export const WORKER_NOT_CONNECTED = "Staging worker not connected.";
export const WEBSITE_AUDIT_ENGINE_VERSION = "b2-c";
export const BROWSER_QA_ENGINE_VERSION = "b2-d";

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

export function normalizeWebsiteAuditEngine(raw) {
  if (raw && typeof raw === "object") {
    return {
      connected: Boolean(raw.connected),
      version: typeof raw.version === "string" ? raw.version : WEBSITE_AUDIT_ENGINE_VERSION,
      lastCheckedAt: typeof raw.lastCheckedAt === "string" ? raw.lastCheckedAt : null,
      reason: typeof raw.reason === "string" ? raw.reason : null,
    };
  }
  if (raw === "connected") {
    return {
      connected: true,
      version: WEBSITE_AUDIT_ENGINE_VERSION,
      lastCheckedAt: null,
      reason: null,
    };
  }
  return {
    connected: false,
    version: WEBSITE_AUDIT_ENGINE_VERSION,
    lastCheckedAt: null,
    reason: ENGINE_NOT_CONNECTED_WEBSITE,
  };
}

export function normalizeBrowserQaEngine(raw) {
  if (raw && typeof raw === "object") {
    return {
      connected: Boolean(raw.connected),
      version: typeof raw.version === "string" ? raw.version : BROWSER_QA_ENGINE_VERSION,
      lastCheckedAt: typeof raw.lastCheckedAt === "string" ? raw.lastCheckedAt : null,
      reason:
        typeof raw.reason === "string"
          ? raw.reason
          : raw.connected
            ? null
            : ENGINE_NOT_CONNECTED_BROWSER,
    };
  }
  return {
    connected: false,
    version: BROWSER_QA_ENGINE_VERSION,
    lastCheckedAt: null,
    reason: ENGINE_NOT_CONNECTED_BROWSER,
  };
}

export function isWebsiteAuditEngineConnected(health) {
  if (!health || typeof health !== "object") return false;
  const engine = normalizeWebsiteAuditEngine(health.websiteAuditEngine);
  return engine.connected === true;
}

export function isBrowserQaEngineConnected(health) {
  if (!health || typeof health !== "object") return false;
  const engine = normalizeBrowserQaEngine(health.browserQaEngine);
  return engine.connected === true;
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
    websiteAuditEngine: normalizeWebsiteAuditEngine(raw.websiteAuditEngine),
    browserQaEngine: normalizeBrowserQaEngine(raw.browserQaEngine),
    scheduler:
      raw.scheduler && typeof raw.scheduler === "object"
        ? {
            connected: Boolean(raw.scheduler.connected),
            lastTickAt:
              typeof raw.scheduler.lastTickAt === "string" ? raw.scheduler.lastTickAt : null,
            lastTickId:
              typeof raw.scheduler.lastTickId === "string" ? raw.scheduler.lastTickId : null,
            lastDueCount:
              typeof raw.scheduler.lastDueCount === "number" ? raw.scheduler.lastDueCount : 0,
            lastEnqueuedCount:
              typeof raw.scheduler.lastEnqueuedCount === "number"
                ? raw.scheduler.lastEnqueuedCount
                : 0,
            lastSkippedCount:
              typeof raw.scheduler.lastSkippedCount === "number"
                ? raw.scheduler.lastSkippedCount
                : 0,
            lastError:
              typeof raw.scheduler.lastError === "string" ? raw.scheduler.lastError : null,
            mode:
              typeof raw.scheduler.mode === "string"
                ? raw.scheduler.mode
                : "staging_worker_scheduler",
          }
        : null,
  };
}

export function buildConnectedWebsiteAuditEngine(nowIso = new Date().toISOString()) {
  return {
    connected: true,
    version: WEBSITE_AUDIT_ENGINE_VERSION,
    lastCheckedAt: nowIso,
    reason: null,
  };
}

export function buildDisconnectedWebsiteAuditEngine(reason = ENGINE_NOT_CONNECTED_WEBSITE) {
  return {
    connected: false,
    version: WEBSITE_AUDIT_ENGINE_VERSION,
    lastCheckedAt: null,
    reason,
  };
}

export function buildDisconnectedBrowserQaEngine(reason = ENGINE_NOT_CONNECTED_BROWSER) {
  return {
    connected: false,
    version: BROWSER_QA_ENGINE_VERSION,
    lastCheckedAt: null,
    reason,
  };
}

export function buildConnectedBrowserQaEngine(nowIso = new Date().toISOString()) {
  return {
    connected: true,
    version: BROWSER_QA_ENGINE_VERSION,
    lastCheckedAt: nowIso,
    reason: null,
  };
}

export function isBrowserQaQueuedSummary(summary) {
  return isClaimableQueuedSummary(summary) && summary.workType === "browser_qa";
}

/** B2-D Browser QA claim — execution follows. */
export function buildBrowserQaClaimSummary(summary, input) {
  const claimedAt = input.claimedAt || new Date().toISOString();
  const lockExpiresAt =
    input.lockExpiresAt ||
    new Date(Date.parse(claimedAt) + BROWSER_QA_LOCK_TTL_MS).toISOString();
  return {
    ...(summary && typeof summary === "object" ? summary : {}),
    workerId: input.workerId,
    workerVersion: input.workerVersion || WORKER_VERSION,
    claimedAt,
    lockExpiresAt,
    workerPhase: "b2-d",
    executionEngine: "browser_qa",
    claimTest: false,
    b2bClaimOnly: false,
  };
}

export function resolveLimitedBrowserQaRoute(summary, agentSlug, appUrl) {
  const routes = resolveLimitedAuditRoutes(summary, agentSlug);
  const route = routes[0] || `/system/agent-ops/agents/${agentSlug || "system-agent"}`;
  const base = String(appUrl || "https://ai-xia-staging.vercel.app").replace(/\/+$/, "");
  const path = route.startsWith("/") ? route : `/${route}`;
  return { route: path, absoluteUrl: `${base}${path}` };
}

export function mergeWorkerHealthIntoTools(toolsEnabled, healthPatch) {
  const tools =
    toolsEnabled && typeof toolsEnabled === "object" ? { ...toolsEnabled } : {};
  const prev = parseWorkerHealth(tools) || {};
  const nowIso = new Date().toISOString();
  tools[WORKER_HEALTH_KEY] = {
    ...prev,
    ...healthPatch,
    environment: "staging",
    // Do not invent engine connectivity on scheduler-tick / partial heartbeats.
    // Explicit worker heartbeat / audit commands set engines connected.
    websiteAuditEngine:
      healthPatch.websiteAuditEngine !== undefined
        ? normalizeWebsiteAuditEngine(healthPatch.websiteAuditEngine)
        : prev.websiteAuditEngine ?? buildDisconnectedWebsiteAuditEngine(),
    browserQaEngine:
      healthPatch.browserQaEngine !== undefined
        ? normalizeBrowserQaEngine(healthPatch.browserQaEngine)
        : prev.browserQaEngine ?? buildDisconnectedBrowserQaEngine(),
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

export function isScheduledQueuedSummary(summary) {
  if (!summary || typeof summary !== "object") return false;
  return (
    summary.trigger === "schedule" &&
    summary.schedulerConnection === "staging_worker"
  );
}

/** Queued rows the staging worker may claim (manual or scheduled). */
export function isClaimableQueuedSummary(summary) {
  return isOwnerManualQueuedSummary(summary) || isScheduledQueuedSummary(summary);
}

export function isWebsiteAuditQueuedSummary(summary) {
  return isClaimableQueuedSummary(summary) && summary.workType === "website_audit";
}

export function isLockExpired(summary, nowMs = Date.now()) {
  const raw = summary?.lockExpiresAt;
  if (typeof raw !== "string") return false;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return false;
  return ts < nowMs;
}

/** B2-B claim-test only — closes without engine execution. */
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

/** B2-C website audit claim — execution follows. */
export function buildWebsiteAuditClaimSummary(summary, input) {
  const claimedAt = input.claimedAt || new Date().toISOString();
  const lockExpiresAt =
    input.lockExpiresAt ||
    new Date(Date.parse(claimedAt) + WEBSITE_AUDIT_LOCK_TTL_MS).toISOString();
  return {
    ...(summary && typeof summary === "object" ? summary : {}),
    workerId: input.workerId,
    workerVersion: input.workerVersion || WORKER_VERSION,
    claimedAt,
    lockExpiresAt,
    workerPhase: "b2-c",
    executionEngine: "website_audit",
    claimTest: false,
    b2bClaimOnly: false,
  };
}

export function resolveLimitedAuditRoutes(summary, agentSlug) {
  const selected =
    Array.isArray(summary?.selectedRoutes) && summary.selectedRoutes.length > 0
      ? summary.selectedRoutes.filter((r) => typeof r === "string" && r.trim())
      : [];
  if (selected.length > 0) {
    return selected.map((r) => (r.startsWith("/") ? r : `/${r}`)).slice(0, 3);
  }
  const scopeRoutes =
    summary?.scope &&
    typeof summary.scope === "object" &&
    Array.isArray(summary.scope.routes)
      ? summary.scope.routes.filter((r) => typeof r === "string" && r.trim())
      : [];
  if (scopeRoutes.length > 0) {
    return scopeRoutes.map((r) => (r.startsWith("/") ? r : `/${r}`)).slice(0, 3);
  }
  const slug = typeof agentSlug === "string" && agentSlug ? agentSlug : "system-agent";
  return [`/system/agent-ops/agents/${slug}`];
}
