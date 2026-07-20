/**
 * Phase D-A — staging worker operations helpers (pure).
 * Queue policy, retry classification, cancel/stale, evidence labels.
 */

export const OPS_VERSION = "d-a";
export const REQUIRED_STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
export const DEFAULT_OPS_INTERVAL_MS = 60_000;
export const MIN_OPS_INTERVAL_MS = 30_000;
export const SCHEDULED_STARVATION_MS = 10 * 60 * 1000;
export const MAX_TRANSIENT_RETRIES = 1;

export const ARTIFACT_VISIBILITY = {
  localWorkerOnly: "local_worker_only",
  stagingReadable: "staging_readable",
};

export function resolveOpsIntervalMs(env = process.env) {
  const raw = Number(env.AGENTOPS_STAGING_WORKER_INTERVAL_MS);
  if (!Number.isFinite(raw)) return DEFAULT_OPS_INTERVAL_MS;
  return Math.max(MIN_OPS_INTERVAL_MS, Math.floor(raw));
}

export function validatePersistentWorkerEnv(env = process.env) {
  const errors = [];
  const environment = (env.AGENTOPS_ENVIRONMENT || "").trim().toLowerCase();
  const productionBlocked =
    String(env.AGENTOPS_PRODUCTION_BLOCKED ?? "").toLowerCase() === "true";
  const appUrl = (env.STAGING_APP_URL || "").trim().replace(/\/+$/, "");

  if (environment !== "staging") {
    errors.push('AGENTOPS_ENVIRONMENT must be "staging".');
  }
  if (!productionBlocked) {
    errors.push("AGENTOPS_PRODUCTION_BLOCKED must be true.");
  }
  if (appUrl !== REQUIRED_STAGING_APP_URL) {
    errors.push(`STAGING_APP_URL must be exactly ${REQUIRED_STAGING_APP_URL}.`);
  }
  if (env.CI === "true" || env.GITHUB_ACTIONS === "true") {
    errors.push("Persistent staging worker must not run in CI.");
  }

  return { ok: errors.length === 0, errors };
}

export function queuePriority(summary) {
  if (!summary || typeof summary !== "object") return 99;
  if (summary.trigger === "owner_manual") return 0;
  if (summary.trigger === "schedule") return 1;
  return 50;
}

export function sortQueuedRuns(rows) {
  return [...(rows || [])].sort((a, b) => {
    const sa = a.summary && typeof a.summary === "object" ? a.summary : {};
    const sb = b.summary && typeof b.summary === "object" ? b.summary : {};
    const pa = queuePriority(sa);
    const pb = queuePriority(sb);
    if (pa !== pb) return pa - pb;
    const ta = Date.parse(a.created_at || a.started_at || 0);
    const tb = Date.parse(b.created_at || b.started_at || 0);
    return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
  });
}

/**
 * Pick next run: owner_manual first, then scheduled; oldest within priority.
 * Anti-starvation: scheduled waiting > SCHEDULED_STARVATION_MS wins over newer manuals.
 */
export function pickNextQueuedRun(rows, nowMs = Date.now()) {
  const sorted = sortQueuedRuns(rows);
  if (sorted.length === 0) return null;

  const scheduled = sorted.filter((r) => r.summary?.trigger === "schedule");
  for (const row of scheduled) {
    const created = Date.parse(row.created_at || row.started_at || "");
    if (Number.isFinite(created) && nowMs - created >= SCHEDULED_STARVATION_MS) {
      return row;
    }
  }
  return sorted[0];
}

export function oldestQueuedAgeMs(rows, nowMs = Date.now()) {
  let oldest = null;
  for (const row of rows || []) {
    const created = Date.parse(row.created_at || row.started_at || "");
    if (!Number.isFinite(created)) continue;
    const age = Math.max(0, nowMs - created);
    if (oldest == null || age > oldest) oldest = age;
  }
  return oldest;
}

export function classifyWorkerError(message) {
  const m = String(message || "").toLowerCase();
  if (!m) return { transient: false, reason: "empty_error" };

  if (
    m.includes("auth") ||
    m.includes("storage_state") ||
    m.includes("not configured") ||
    m.includes("production") ||
    m.includes("unsupported scope") ||
    m.includes("unsupported work") ||
    m.includes("invalid") ||
    m.includes("paused") ||
    m.includes("forbidden") ||
    m.includes("permission")
  ) {
    return { transient: false, reason: "non_retryable" };
  }

  if (
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("econnrefused") ||
    m.includes("socket hang up") ||
    m.includes("temporar") ||
    m.includes("network") ||
    m.includes("fetch failed") ||
    m.includes("503") ||
    m.includes("502")
  ) {
    return { transient: true, reason: "transient_network" };
  }

  return { transient: false, reason: "unknown_non_retryable" };
}

export function canRetryFailedRun(summary, errorMessage) {
  const retryCount =
    summary && typeof summary.retryCount === "number" ? summary.retryCount : 0;
  if (retryCount >= MAX_TRANSIENT_RETRIES) {
    return { ok: false, reason: "max_retries" };
  }
  const classified = classifyWorkerError(errorMessage);
  if (!classified.transient) {
    return { ok: false, reason: classified.reason };
  }
  return { ok: true, reason: classified.reason };
}

export function buildRetrySummary(summary, reason, nowIso = new Date().toISOString()) {
  const prev =
    summary && typeof summary === "object" ? summary : {};
  const retryCount = typeof prev.retryCount === "number" ? prev.retryCount + 1 : 1;
  return {
    ...prev,
    retryCount,
    lastRetryAt: nowIso,
    retryReason: reason,
    statusHint: "requeued_after_transient_failure",
  };
}

export function isCancelRequested(summary) {
  return Boolean(summary && typeof summary === "object" && summary.cancelRequested === true);
}

export function buildCancelRequestedSummary(summary, requestedBy, nowIso = new Date().toISOString()) {
  return {
    ...(summary && typeof summary === "object" ? summary : {}),
    cancelRequested: true,
    cancelRequestedAt: nowIso,
    cancelRequestedBy: requestedBy || "owner",
  };
}

export function buildCanceledSummary(summary, reason, nowIso = new Date().toISOString()) {
  return {
    ...(summary && typeof summary === "object" ? summary : {}),
    canceledAt: nowIso,
    cancelReason: reason || "Canceled by owner",
    cancelRequested: false,
  };
}

export function labelEvidenceRef(ref, visibility = ARTIFACT_VISIBILITY.localWorkerOnly) {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  if (!trimmed) return null;
  // Never embed secrets / storage_state paths as primary evidence labels.
  if (/storage[-_]?state|service[_-]?role|password|token=/i.test(trimmed)) {
    return {
      ref: "[redacted]",
      visibility,
      note: "Sensitive path redacted",
    };
  }
  return {
    ref: trimmed,
    visibility,
    note:
      visibility === ARTIFACT_VISIBILITY.localWorkerOnly
        ? "Local worker artifact — may not be reachable from the browser."
        : null,
  };
}

export function estimateNextSchedulerTickAt(lastTickAt, intervalMs = DEFAULT_OPS_INTERVAL_MS) {
  if (!lastTickAt || typeof lastTickAt !== "string") return null;
  const ts = Date.parse(lastTickAt);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts + intervalMs).toISOString();
}

export function buildOpsHealthPatch(input) {
  return {
    opsVersion: OPS_VERSION,
    activeRunId: input.activeRunId ?? null,
    activeRunType: input.activeRunType ?? null,
    activeRunTrigger: input.activeRunTrigger ?? null,
    queueLength: typeof input.queueLength === "number" ? input.queueLength : 0,
    oldestQueuedAgeMs:
      typeof input.oldestQueuedAgeMs === "number" ? input.oldestQueuedAgeMs : null,
    lastCompletedRunId: input.lastCompletedRunId ?? null,
    lastFailedRunId: input.lastFailedRunId ?? null,
    lastError: input.lastError ?? null,
    lastOpsCycleAt: input.lastOpsCycleAt ?? null,
    nextSchedulerTickEstimate: input.nextSchedulerTickEstimate ?? null,
    enginesReady: Boolean(input.enginesReady),
    mode: "staging_worker_ops",
  };
}
