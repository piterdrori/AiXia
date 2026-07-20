/**
 * Phase D-A — staging worker operations helpers (pure).
 * Queue policy, retry classification, cancel/stale, evidence labels.
 */

export const OPS_VERSION = "d-d";
export const REQUIRED_STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
export const DEFAULT_OPS_INTERVAL_MS = 60_000;
export const MIN_OPS_INTERVAL_MS = 30_000;
export const SCHEDULED_STARVATION_MS = 10 * 60 * 1000;
export const MAX_TRANSIENT_RETRIES = 1;
export const WORKER_STALE_MS = 3 * 60 * 1000;
export const SCHEDULER_STALE_MS = 5 * 60 * 1000;
export const QUEUE_BACKLOG_WARN = 8;
export const OLDEST_QUEUED_WARN_MS = 15 * 60 * 1000;
export const REPEATED_FAILURES_WARN = 3;

export const ARTIFACT_VISIBILITY = {
  localWorkerOnly: "local_worker_only",
  stagingReadable: "staging_readable",
  privateStagingStorage: "private_staging_storage",
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

export function buildCancelAcknowledgedSummary(
  summary,
  phase,
  nowIso = new Date().toISOString(),
  extras = {},
) {
  return {
    ...buildCanceledSummary(summary, `Canceled at checkpoint: ${phase}`, nowIso),
    cancelAcknowledgedAt: nowIso,
    cancelPhase: phase || "unknown",
    ...extras,
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

export function buildHealthAlert({
  type,
  level = "warning",
  message,
  relatedRunId = null,
  recommendedAction = null,
  detectedAt = new Date().toISOString(),
  acknowledged = false,
  id = null,
}) {
  const alertId =
    id ||
    `alert-${String(type || "unknown")}-${relatedRunId || "none"}-${String(detectedAt).slice(0, 19)}`;
  return {
    id: alertId,
    type,
    level,
    message,
    detectedAt,
    relatedRunId,
    recommendedAction,
    acknowledged: Boolean(acknowledged),
  };
}

/**
 * Derive durable staging-only health alerts (no external notify).
 * Keep noise low: one alert per type.
 */
export function deriveHealthAlerts(input, nowMs = Date.now()) {
  const alerts = [];
  const lastHb = input.lastHeartbeatAt ? Date.parse(input.lastHeartbeatAt) : NaN;
  const lastSched = input.lastSchedulerTickAt ? Date.parse(input.lastSchedulerTickAt) : NaN;
  const queueLength = typeof input.queueLength === "number" ? input.queueLength : 0;
  const oldestQueuedAgeMs =
    typeof input.oldestQueuedAgeMs === "number" ? input.oldestQueuedAgeMs : null;
  const staleRunningCount =
    typeof input.staleRunningCount === "number" ? input.staleRunningCount : 0;
  const recentFailureCount =
    typeof input.recentFailureCount === "number" ? input.recentFailureCount : 0;

  if (Number.isFinite(lastHb) && nowMs - lastHb > WORKER_STALE_MS) {
    alerts.push(
      buildHealthAlert({
        type: "worker_stale",
        level: "critical",
        message: "Worker heartbeat is stale.",
        recommendedAction: "Restart staging worker (pm2/systemd) and run doctor.",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  if (Number.isFinite(lastSched) && nowMs - lastSched > SCHEDULER_STALE_MS) {
    alerts.push(
      buildHealthAlert({
        type: "scheduler_stale",
        level: "warning",
        message: "Scheduler tick is stale.",
        recommendedAction: "Confirm staging-worker loop is running (not :once).",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  if (queueLength >= QUEUE_BACKLOG_WARN) {
    alerts.push(
      buildHealthAlert({
        type: "queue_backlog",
        level: "warning",
        message: `Queue backlog is ${queueLength} runs.`,
        recommendedAction: "Let worker drain; pause new manuals if needed.",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  if (oldestQueuedAgeMs != null && oldestQueuedAgeMs >= OLDEST_QUEUED_WARN_MS) {
    alerts.push(
      buildHealthAlert({
        type: "oldest_queued_too_old",
        level: "warning",
        message: "Oldest queued run is older than 15 minutes.",
        recommendedAction: "Check worker connected + engines ready; cancel stuck queued if needed.",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  if (staleRunningCount > 0) {
    alerts.push(
      buildHealthAlert({
        type: "running_lock_expired",
        level: "critical",
        message: `${staleRunningCount} running run(s) have expired locks.`,
        relatedRunId: input.staleRunId ?? null,
        recommendedAction: "Run cleanup-stale dry-run on worker, then owner cancel/mark failed.",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  if (recentFailureCount >= REPEATED_FAILURES_WARN) {
    alerts.push(
      buildHealthAlert({
        type: "repeated_failures",
        level: "warning",
        message: `${recentFailureCount} recent failures detected.`,
        recommendedAction: "Inspect lastError and engine readiness; run doctor.",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  if (input.artifactUploadFailed) {
    alerts.push(
      buildHealthAlert({
        type: "artifact_upload_failed",
        level: "warning",
        message: "Artifact upload failed; local fallback retained.",
        relatedRunId: input.artifactUploadFailedRunId ?? null,
        recommendedAction: "Check AGENTOPS_ARTIFACT_UPLOAD_ENABLED + private bucket + service role.",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  if (input.browserAuthStale) {
    alerts.push(
      buildHealthAlert({
        type: "browser_auth_stale",
        level: "warning",
        message: "Browser QA storage_state missing or stale.",
        recommendedAction: "Recapture storage_state on the worker host (never commit it).",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  if (input.enginesReady === false) {
    alerts.push(
      buildHealthAlert({
        type: "engine_unavailable",
        level: "critical",
        message: "One or more staging engines are not ready.",
        recommendedAction: "Install Playwright browsers; verify website_audit + browser_qa engines.",
        detectedAt: new Date(nowMs).toISOString(),
      }),
    );
  }

  // Deduplicate by type (keep first / highest severity order already set).
  const byType = new Map();
  for (const alert of alerts) {
    if (!byType.has(alert.type)) byType.set(alert.type, alert);
  }
  return [...byType.values()];
}

export function mergeAcknowledgedAlerts(previousAlerts, nextAlerts) {
  const prev = Array.isArray(previousAlerts) ? previousAlerts : [];
  const ackMap = new Map(
    prev.filter((a) => a && a.acknowledged && a.type).map((a) => [a.type, a]),
  );
  const history = Array.isArray(
    prev.find((a) => a && a.__historyMarker)?.history,
  )
    ? prev.find((a) => a && a.__historyMarker).history
    : [];
  const merged = (nextAlerts || []).map((alert) => {
    const prior = ackMap.get(alert.type);
    if (prior && prior.acknowledged && prior.message === alert.message) {
      return {
        ...alert,
        id: prior.id || alert.id,
        acknowledged: true,
        acknowledgedAt: prior.acknowledgedAt ?? null,
        acknowledgedBy: prior.acknowledgedBy ?? null,
        acknowledgeNote: prior.acknowledgeNote ?? null,
      };
    }
    return alert;
  });
  // Preserve recent ack history separately via ops.alertHistory (caller merges).
  void history;
  return merged;
}

export function appendAlertHistory(previousHistory, alerts, max = 40) {
  const hist = Array.isArray(previousHistory) ? [...previousHistory] : [];
  for (const alert of alerts || []) {
    if (!alert?.acknowledged) continue;
    const key = `${alert.type}|${alert.message}|${alert.acknowledgedAt || ""}`;
    if (hist.some((h) => `${h.type}|${h.message}|${h.acknowledgedAt || ""}` === key)) continue;
    hist.unshift({
      id: alert.id || null,
      type: alert.type,
      level: alert.level,
      message: alert.message,
      acknowledgedAt: alert.acknowledgedAt || null,
      acknowledgedBy: alert.acknowledgedBy || null,
      acknowledgeNote: alert.acknowledgeNote || null,
      relatedRunId: alert.relatedRunId || null,
    });
  }
  return hist.slice(0, max);
}

// Re-export artifact env helpers for worker convenience (implementation lives in artifact-storage).
export { isArtifactUploadEnabled, resolveArtifactBucket } from "./agentops-staging-artifact-storage.mjs";

export function buildOpsHealthPatch(input) {
  const alerts =
    Array.isArray(input.alerts) && input.alerts.length > 0
      ? input.alerts
      : deriveHealthAlerts(input);
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
    alerts,
    alertCount: alerts.filter((a) => !a.acknowledged).length,
    artifactUploadEnabled: Boolean(input.artifactUploadEnabled),
    artifactBucket: input.artifactBucket ?? null,
    lastArtifactUploadStatus: input.lastArtifactUploadStatus ?? null,
    alertFanout: input.alertFanout && typeof input.alertFanout === "object" ? input.alertFanout : null,
    alertHistory: Array.isArray(input.alertHistory) ? input.alertHistory : [],
    artifactCleanup: input.artifactCleanup && typeof input.artifactCleanup === "object"
      ? input.artifactCleanup
      : null,
  };
}
