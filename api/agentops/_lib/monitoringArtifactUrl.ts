/**
 * Phase D-C — owner-gated short-lived signed URLs for private staging artifacts.
 * Same monitoring Vercel function. No service-role to browser. No arbitrary path signing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";
import { createMonitoringReadClient } from "./monitoringReadClient.js";
import { jsonResponse } from "./ollamaProxy.js";

const MONITORING_TABLE = "agentops_monitoring_runs";
const CONFIG_TABLE = "agentops_system_config";
const STAGING_ARTIFACT_BUCKET = "agentops-artifacts-staging";
const SIGNED_URL_TTL_SECONDS = 10 * 60;

type OwnerGate = {
  assertOwnerFromRequest: (request: Request) => Promise<
    { ok: true; userId: string } | { ok: false; status: number; error: string }
  >;
};

function methodNotAllowed(): Response {
  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}

function createServiceClient(): SupabaseClient | null {
  const readClient = createMonitoringReadClient(process.env);
  return readClient.ok ? readClient.client : null;
}

export function validateStagingArtifactPath(runId: string, artifactPath: string, bucket: string): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const rid = runId.trim();
  const path = artifactPath.trim();
  if (!rid) errors.push("runId required");
  if (!path) errors.push("artifactPath required");
  if (bucket !== STAGING_ARTIFACT_BUCKET) errors.push("bucket must be staging artifact bucket");
  if (path.includes("..") || path.includes("\\") || path.startsWith("/")) {
    errors.push("path traversal rejected");
  }
  if (path && !path.startsWith(`agentops/${rid}/`)) {
    errors.push("artifactPath must belong to run");
  }
  if (path && !/^agentops\/[a-zA-Z0-9._:-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(path)) {
    errors.push("artifactPath shape invalid");
  }
  return { ok: errors.length === 0, errors };
}

function collectStoragePaths(summary: Record<string, unknown>): Set<string> {
  const paths = new Set<string>();
  const visit = (item: unknown): void => {
    if (!item) return;
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item === "object") {
      const rec = item as Record<string, unknown>;
      if (
        rec.provider === "supabase_storage" &&
        typeof rec.path === "string" &&
        rec.path.startsWith("agentops/")
      ) {
        paths.add(rec.path);
      }
      Object.values(rec).forEach(visit);
    }
  };
  visit(summary.artifactRefs);
  visit(summary.screenshotRefs);
  visit(summary.uploadedArtifacts);
  return paths;
}

export async function handleMonitoringArtifactUrlRequest(
  request: Request,
  ownerGate: OwnerGate,
): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const owner = await ownerGate.assertOwnerFromRequest(request);
  if (!owner.ok) {
    return jsonResponse({ ok: false, error: owner.error }, owner.status);
  }

  const [, queryPart = ""] = request.url.split("?");
  const params = new URLSearchParams(queryPart);
  const runId = params.get("runId")?.trim() ?? "";
  const artifactPath = params.get("artifactPath")?.trim() ?? "";
  const bucket = params.get("bucket")?.trim() || STAGING_ARTIFACT_BUCKET;

  const validation = validateStagingArtifactPath(runId, artifactPath, bucket);
  if (!validation.ok) {
    return jsonResponse(
      { ok: false, error: validation.errors.join("; "), signedUrl: null },
      400,
    );
  }

  const client = createServiceClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured.", signedUrl: null }, 503);
  }

  const { data: row, error } = await client
    .from(MONITORING_TABLE)
    .select("run_id, mode, summary, status")
    .eq("run_id", runId)
    .maybeSingle();
  if (error) {
    return jsonResponse({ ok: false, error: error.message, signedUrl: null }, 500);
  }
  if (!row) {
    return jsonResponse({ ok: false, error: `Run not found: ${runId}`, signedUrl: null }, 404);
  }
  if (
    row.mode !== "owner_manual_single_agent" &&
    row.mode !== "scheduled_single_agent"
  ) {
    return jsonResponse(
      { ok: false, error: "Signed artifacts only for owner_manual / scheduled runs.", signedUrl: null },
      400,
    );
  }

  const summary =
    row.summary && typeof row.summary === "object"
      ? (row.summary as Record<string, unknown>)
      : {};
  const allowed = collectStoragePaths(summary);
  if (!allowed.has(artifactPath)) {
    return jsonResponse(
      {
        ok: false,
        error: "artifactPath is not registered on this run summary.",
        signedUrl: null,
      },
      403,
    );
  }

  const { data: signed, error: signError } = await client.storage
    .from(bucket)
    .createSignedUrl(artifactPath, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) {
    return jsonResponse(
      {
        ok: false,
        error: signError?.message || "Failed to create signed URL.",
        signedUrl: null,
      },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    signedUrl: signed.signedUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
    expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    bucket,
    path: artifactPath,
    visibility: "private",
    note: "Signed link expires shortly. Owner-only. Staging private bucket.",
  });
}

/**
 * Optional owner ack for staging worker health alerts (display-only persistence in tools_enabled).
 */
export async function handleMonitoringHealthAlertAckRequest(
  request: Request,
  ownerGate: OwnerGate,
): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const owner = await ownerGate.assertOwnerFromRequest(request);
  if (!owner.ok) {
    return jsonResponse({ ok: false, error: owner.error }, owner.status);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const alertType = typeof record.alertType === "string" ? record.alertType.trim() : "";
  if (!alertType) {
    return jsonResponse({ ok: false, error: "alertType is required." }, 400);
  }

  const client = createServiceClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  const { data: rows, error } = await client
    .from(CONFIG_TABLE)
    .select("id, tools_enabled")
    .eq("environment", "staging")
    .limit(1);
  if (error) return jsonResponse({ ok: false, error: error.message }, 500);
  const row = rows?.[0];
  if (!row) return jsonResponse({ ok: false, error: "Staging worker config not found." }, 404);

  const tools =
    row.tools_enabled && typeof row.tools_enabled === "object"
      ? ({ ...(row.tools_enabled as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const worker =
    tools.manualRunWorker && typeof tools.manualRunWorker === "object"
      ? ({ ...(tools.manualRunWorker as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const ops =
    worker.ops && typeof worker.ops === "object"
      ? ({ ...(worker.ops as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const alerts = Array.isArray(ops.alerts) ? [...ops.alerts] : [];
  const nowIso = new Date().toISOString();
  let matched = false;
  const nextAlerts = alerts.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const alert = { ...(raw as Record<string, unknown>) };
    if (alert.type === alertType) {
      matched = true;
      return {
        ...alert,
        acknowledged: true,
        acknowledgedAt: nowIso,
        acknowledgedBy: owner.userId || "owner",
      };
    }
    return alert;
  });
  if (!matched) {
    return jsonResponse({ ok: false, error: `Alert type not found: ${alertType}` }, 404);
  }

  ops.alerts = nextAlerts;
  ops.alertCount = nextAlerts.filter(
    (a) => a && typeof a === "object" && (a as Record<string, unknown>).acknowledged !== true,
  ).length;
  worker.ops = ops;
  tools.manualRunWorker = worker;

  const { error: updateError } = await client
    .from(CONFIG_TABLE)
    .update({ tools_enabled: tools })
    .eq("id", row.id);
  if (updateError) return jsonResponse({ ok: false, error: updateError.message }, 500);

  return jsonResponse({
    ok: true,
    acknowledged: true,
    alertType,
    acknowledgedAt: nowIso,
  });
}
