/**
 * Phase D-D — staging-only health alert fanout (disabled by default).
 * Worker-host only. Never sends secrets, signed URLs, or storage_state.
 */

import { createHash } from "node:crypto";

const STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
const LEVEL_RANK = { info: 1, warning: 2, critical: 3 };

export function isAlertFanoutEnabled(env = process.env) {
  return String(env.AGENTOPS_ALERT_FANOUT_ENABLED || "").toLowerCase() === "true";
}

export function resolveAlertChannel(env = process.env) {
  const raw = String(env.AGENTOPS_ALERT_CHANNEL || "log").trim().toLowerCase();
  return raw === "webhook" ? "webhook" : "log";
}

export function resolveAlertMinLevel(env = process.env) {
  const raw = String(env.AGENTOPS_ALERT_MIN_LEVEL || "warning").trim().toLowerCase();
  return LEVEL_RANK[raw] ? raw : "warning";
}

export function resolveAlertRateLimitMinutes(env = process.env) {
  const n = Number(env.AGENTOPS_ALERT_RATE_LIMIT_MINUTES);
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(24 * 60, Math.floor(n));
}

export function validateAlertFanoutConfig(env = process.env) {
  const errors = [];
  const enabled = isAlertFanoutEnabled(env);
  const channel = resolveAlertChannel(env);
  const webhookUrl = String(env.AGENTOPS_ALERT_WEBHOOK_URL || "").trim();
  if (!enabled) {
    return {
      ok: true,
      enabled: false,
      channel,
      errors: [],
      reason: "Alert fanout disabled (safe default).",
    };
  }
  if (channel === "webhook") {
    if (!webhookUrl) {
      errors.push("AGENTOPS_ALERT_WEBHOOK_URL required when channel=webhook.");
    } else {
      try {
        const u = new URL(webhookUrl);
        const host = u.hostname.toLowerCase();
        if (host === "aixia.app" || host.endsWith(".aixia.app") || /prod(uction)?/i.test(host)) {
          errors.push("Production webhook hosts are rejected.");
        }
        if (u.protocol !== "https:" && host !== "localhost" && host !== "127.0.0.1") {
          errors.push("Webhook URL must be https (or localhost).");
        }
      } catch {
        errors.push("AGENTOPS_ALERT_WEBHOOK_URL is not a valid URL.");
      }
    }
  }
  return {
    ok: errors.length === 0,
    enabled,
    channel,
    errors,
    reason: errors[0] || null,
  };
}

export function alertDedupeKey(alert) {
  const type = String(alert?.type || "");
  const related = String(alert?.relatedRunId || "");
  const msg = String(alert?.message || "");
  const hash = createHash("sha256").update(msg).digest("hex").slice(0, 12);
  return `${type}|${related}|${hash}`;
}

export function meetsMinLevel(level, minLevel = "warning") {
  const a = LEVEL_RANK[String(level || "").toLowerCase()] || 0;
  const b = LEVEL_RANK[String(minLevel || "warning").toLowerCase()] || 2;
  return a >= b;
}

export function buildAlertFanoutPayload(alert, context = {}) {
  return {
    environment: "staging",
    alertType: String(alert?.type || "unknown"),
    level: String(alert?.level || "warning"),
    message: String(alert?.message || "").slice(0, 500),
    detectedAt: alert?.detectedAt || new Date().toISOString(),
    recommendedAction: alert?.recommendedAction
      ? String(alert.recommendedAction).slice(0, 500)
      : null,
    relatedRunId: alert?.relatedRunId ? String(alert.relatedRunId).slice(0, 200) : null,
    workerId: context.workerId ? String(context.workerId).slice(0, 120) : null,
    stagingUrl: STAGING_APP_URL,
  };
}

/** Ensure payload never contains secret-like fields. */
export function assertSafeAlertPayload(payload) {
  const json = JSON.stringify(payload);
  const banned =
    /service[_-]?role|storage[-_]?state|authorization|bearer\s+[a-z0-9]|cookie=|signedUrl|supabase\.co\/storage\/v1\/object\/sign/i;
  if (banned.test(json)) {
    return { ok: false, error: "Alert payload failed redaction/safety check." };
  }
  return { ok: true, error: null };
}

/**
 * Decide which alerts to fan out given prior fanout history (rate limit + dedupe).
 */
export function selectAlertsForFanout(alerts, fanoutState = {}, env = process.env, nowMs = Date.now()) {
  const minLevel = resolveAlertMinLevel(env);
  const rateMinutes = resolveAlertRateLimitMinutes(env);
  const lastByKey =
    fanoutState.lastByKey && typeof fanoutState.lastByKey === "object"
      ? fanoutState.lastByKey
      : {};
  const selected = [];
  let suppressedCount = 0;
  for (const alert of alerts || []) {
    if (!alert || alert.acknowledged) continue;
    if (!meetsMinLevel(alert.level, minLevel)) {
      suppressedCount += 1;
      continue;
    }
    const key = alertDedupeKey(alert);
    const lastAt = lastByKey[key] ? Date.parse(lastByKey[key]) : NaN;
    if (Number.isFinite(lastAt) && nowMs - lastAt < rateMinutes * 60_000) {
      suppressedCount += 1;
      continue;
    }
    selected.push({ alert, key });
  }
  return { selected, suppressedCount, rateMinutes, minLevel };
}

export async function sendAlertFanout(alert, context = {}, env = process.env) {
  const config = validateAlertFanoutConfig(env);
  if (!config.ok) {
    return { ok: false, channel: config.channel, error: config.errors.join("; "), skipped: true };
  }
  if (!config.enabled) {
    return { ok: true, channel: "disabled", skipped: true, error: null };
  }

  const payload = buildAlertFanoutPayload(alert, context);
  const safety = assertSafeAlertPayload(payload);
  if (!safety.ok) {
    return { ok: false, channel: config.channel, error: safety.error, skipped: false };
  }

  if (config.channel === "log") {
    console.log(`[agentops-alert-fanout] ${JSON.stringify(payload)}`);
    return { ok: true, channel: "log", skipped: false, error: null, payload };
  }

  const webhookUrl = String(env.AGENTOPS_ALERT_WEBHOOK_URL || "").trim();
  const secret = String(env.AGENTOPS_ALERT_WEBHOOK_SECRET || "").trim();
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-AgentOps-Environment": "staging",
    };
    if (secret) headers["X-AgentOps-Alert-Secret"] = secret;
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return {
        ok: false,
        channel: "webhook",
        skipped: false,
        error: `Webhook HTTP ${response.status}`,
      };
    }
    return { ok: true, channel: "webhook", skipped: false, error: null, payload };
  } catch (error) {
    return {
      ok: false,
      channel: "webhook",
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fanoutHealthAlerts(alerts, context = {}, env = process.env, priorFanout = {}) {
  const config = validateAlertFanoutConfig(env);
  const nowIso = new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  if (!config.enabled) {
    return {
      lastFanoutAt: priorFanout.lastFanoutAt ?? null,
      lastFanoutChannel: "disabled",
      lastFanoutCount: 0,
      lastFanoutError: null,
      suppressedCount: 0,
      lastByKey: priorFanout.lastByKey || {},
      enabled: false,
      configOk: true,
    };
  }
  if (!config.ok) {
    return {
      lastFanoutAt: priorFanout.lastFanoutAt ?? null,
      lastFanoutChannel: config.channel,
      lastFanoutCount: 0,
      lastFanoutError: config.errors.join("; "),
      suppressedCount: 0,
      lastByKey: priorFanout.lastByKey || {},
      enabled: true,
      configOk: false,
    };
  }

  const { selected, suppressedCount } = selectAlertsForFanout(alerts, priorFanout, env, nowMs);
  const lastByKey = { ...(priorFanout.lastByKey || {}) };
  let sent = 0;
  let lastError = null;
  let channel = config.channel;
  for (const { alert, key } of selected) {
    const result = await sendAlertFanout(alert, context, env);
    channel = result.channel || channel;
    if (result.ok && !result.skipped) {
      sent += 1;
      lastByKey[key] = nowIso;
    } else if (!result.ok && !result.skipped) {
      lastError = result.error;
    }
  }

  return {
    lastFanoutAt: sent > 0 ? nowIso : priorFanout.lastFanoutAt ?? null,
    lastFanoutChannel: channel,
    lastFanoutCount: sent,
    lastFanoutError: lastError,
    suppressedCount,
    lastByKey,
    enabled: true,
    configOk: true,
  };
}
