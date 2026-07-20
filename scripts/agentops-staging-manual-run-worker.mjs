/**
 * Staging manual-run worker (B2 + C + D-A ops).
 *
 * Usage:
 *   node scripts/agentops-staging-manual-run-worker.mjs heartbeat
 *   node scripts/agentops-staging-manual-run-worker.mjs once
 *   node scripts/agentops-staging-manual-run-worker.mjs claim-test --run-id <id>
 *   node scripts/agentops-staging-manual-run-worker.mjs website-audit-once
 *   node scripts/agentops-staging-manual-run-worker.mjs website-audit-dev
 *   node scripts/agentops-staging-manual-run-worker.mjs browser-qa-once
 *   node scripts/agentops-staging-manual-run-worker.mjs browser-qa-dev
 *   node scripts/agentops-staging-manual-run-worker.mjs scheduler-tick
 *   node scripts/agentops-staging-manual-run-worker.mjs scheduler-dev
 *   node scripts/agentops-staging-manual-run-worker.mjs queue-status
 *   node scripts/agentops-staging-manual-run-worker.mjs ops [--once]
 *   node scripts/agentops-staging-manual-run-worker.mjs staging-worker [--once]
 *   node scripts/agentops-staging-manual-run-worker.mjs scheduler-cleanup-stale [--dry-run|--mutate]
 *
 * Playwright runs only via spawned engines (off Vercel). Scheduler only enqueues.
 * Persistent ops loop: heartbeat → scheduler tick → one claim/execute → health.
 * No GitHub dispatch. No Vercel cron. No production.
 */
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  B2B_CLAIM_CLOSE_MESSAGE,
  BROWSER_QA_AUTH_NOT_CONFIGURED,
  WORKER_VERSION,
  buildBrowserQaClaimSummary,
  buildClaimCloseSummary,
  buildClaimSummaryPatch,
  buildConnectedBrowserQaEngine,
  buildConnectedWebsiteAuditEngine,
  buildDisconnectedBrowserQaEngine,
  buildWebsiteAuditClaimSummary,
  isBrowserQaQueuedSummary,
  isClaimableQueuedSummary,
  isLockExpired,
  isOwnerManualQueuedSummary,
  isWebsiteAuditQueuedSummary,
  mergeWorkerHealthIntoTools,
  parseWorkerHealth,
  validateWorkerEnv,
} from "./lib/agentops-manual-run-worker-core.mjs";
import {
  reportStaleSchedulerRuns,
  runSchedulerTick,
} from "./agentops-manual-run-scheduler-tick.mjs";
import {
  OPS_VERSION,
  buildCanceledSummary,
  buildOpsHealthPatch,
  buildRetrySummary,
  canRetryFailedRun,
  estimateNextSchedulerTickAt,
  isCancelRequested,
  oldestQueuedAgeMs,
  pickNextQueuedRun,
  resolveOpsIntervalMs,
  validatePersistentWorkerEnv,
} from "./lib/agentops-staging-worker-ops-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MONITORING_TABLE = "agentops_monitoring_runs";
const CONFIG_TABLE = "agentops_system_config";
const WEBSITE_AUDIT_ENGINE_SCRIPT = path.join(
  REPO_ROOT,
  "scripts",
  "agentops-manual-run-website-audit-engine.ts",
);
const BROWSER_QA_ENGINE_SCRIPT = path.join(
  REPO_ROOT,
  "scripts",
  "agentops-manual-run-browser-qa-engine.ts",
);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(REPO_ROOT, ".env.local"));
loadEnvFile(path.join(REPO_ROOT, "qa-agent", "browser-qa", ".env.owner.local"));

function parseArgs(argv) {
  const args = {
    command: "once",
    runId: null,
    intervalMs: 60_000,
    dryRun: false,
    once: false,
    mutate: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--run-id" || token === "--claim-once-test") {
      args.runId = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--interval-ms") {
      const n = Number(argv[i + 1]);
      // Ops / scheduler-dev: min 30s to avoid thrashing; default 60s.
      if (Number.isFinite(n) && n >= 30_000) args.intervalMs = Math.floor(n);
      i += 1;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      args.mutate = false;
      continue;
    }
    if (token === "--mutate") {
      args.mutate = true;
      args.dryRun = false;
      continue;
    }
    if (token === "--once") {
      args.once = true;
      continue;
    }
    if (token.startsWith("--")) continue;
    positional.push(token);
  }
  if (positional[0]) args.command = positional[0];
  if (args.command === "claim-test" && !args.runId && positional[1]) {
    args.runId = positional[1];
  }
  if (args.command === "staging-worker") args.command = "ops";
  return args;
}

function createServiceClient(config) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveStorageStatePath() {
  const raw =
    process.env.AGENTOPS_BROWSER_QA_STORAGE_STATE?.trim() ||
    "qa-agent/browser-qa-auth/storage-state.json";
  const resolved = path.isAbsolute(raw) ? raw : path.join(REPO_ROOT, raw);
  return fs.existsSync(resolved) ? resolved : null;
}

function resolveBrowserQaEngineHealth(nowIso) {
  if (!resolveStorageStatePath()) {
    return buildDisconnectedBrowserQaEngine(BROWSER_QA_AUTH_NOT_CONFIGURED);
  }
  const playwrightPkg = path.join(REPO_ROOT, "node_modules", "playwright");
  if (!fs.existsSync(playwrightPkg)) {
    return buildDisconnectedBrowserQaEngine(
      "Playwright is not installed on the staging worker.",
    );
  }
  return buildConnectedBrowserQaEngine(nowIso);
}

function engineEnv(envConfig) {
  return {
    ...process.env,
    STAGING_SUPABASE_URL: envConfig.supabaseUrl,
    STAGING_SUPABASE_SERVICE_ROLE_KEY: envConfig.serviceRoleKey,
    STAGING_APP_URL: envConfig.appUrl,
    AGENTOPS_ENVIRONMENT: "staging",
    AGENTOPS_PRODUCTION_BLOCKED: "true",
    AGENTOPS_RUNTIME_ALLOW_REMOTE_STAGING: "true",
  };
}

function spawnEngine(scriptPath, runId, envConfig) {
  const tsxCli = path.join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const env = engineEnv(envConfig);
  if (fs.existsSync(tsxCli)) {
    return spawnSync(process.execPath, [tsxCli, scriptPath, "--run-id", runId], {
      cwd: REPO_ROOT,
      env,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    });
  }
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(npxCmd, ["tsx", scriptPath, "--run-id", runId], {
    cwd: REPO_ROOT,
    env,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
}

async function listQueuedManualRuns(client) {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("id, run_id, status, summary, started_at, created_at, mode")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []).filter((row) => isClaimableQueuedSummary(row.summary));
}

async function listQueuedWebsiteAudits(client) {
  const queued = await listQueuedManualRuns(client);
  return queued.filter((row) => isWebsiteAuditQueuedSummary(row.summary));
}

async function listQueuedBrowserQa(client) {
  const queued = await listQueuedManualRuns(client);
  return queued.filter((row) => isBrowserQaQueuedSummary(row.summary));
}

async function listRunningManualRuns(client) {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("id, run_id, status, summary, started_at, created_at, mode")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .eq("status", "running")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data || [];
}

async function writeHeartbeat(client, patch) {
  const { data: rows, error } = await client
    .from(CONFIG_TABLE)
    .select("id, tools_enabled")
    .eq("environment", "staging")
    .limit(1);
  if (error) throw new Error(error.message);

  const row = rows?.[0] ?? null;
  const nowIso = new Date().toISOString();
  const tools = mergeWorkerHealthIntoTools(row?.tools_enabled, {
    ...patch,
    websiteAuditEngine: buildConnectedWebsiteAuditEngine(nowIso),
    browserQaEngine: resolveBrowserQaEngineHealth(nowIso),
  });

  if (!row) {
    const { error: insertError } = await client.from(CONFIG_TABLE).insert({
      runtime_mode: "scheduled",
      staging_url: process.env.STAGING_APP_URL || "https://ai-xia-staging.vercel.app",
      supabase_project: "staging",
      github_repo: "piterdrori/AiXia",
      tools_enabled: tools,
      environment: "staging",
    });
    if (insertError) throw new Error(insertError.message);
    return parseWorkerHealth(tools);
  }

  const { error: updateError } = await client
    .from(CONFIG_TABLE)
    .update({ tools_enabled: tools })
    .eq("id", row.id);
  if (updateError) throw new Error(updateError.message);
  return parseWorkerHealth(tools);
}

async function heartbeat(client, workerId) {
  const queued = await listQueuedManualRuns(client);
  const running = await listRunningManualRuns(client);
  const active = running[0] ?? null;
  const stale = running.filter((row) => isLockExpired(row.summary));

  const health = await writeHeartbeat(client, {
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    workerId,
    workerVersion: WORKER_VERSION,
    activeRunId: active?.run_id ?? null,
    queueLength: queued.length,
    lastError: stale.length
      ? `Stale running lock(s): ${stale.map((r) => r.run_id).join(", ")}`
      : null,
  });

  return { health, queued, running, stale };
}

async function claimOnceTest(client, workerId, runId) {
  if (!runId) throw new Error("--run-id is required for claim-test");

  const { data: existing, error: readError } = await client
    .from(MONITORING_TABLE)
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!existing) throw new Error(`Run not found: ${runId}`);
  if (existing.status !== "queued") {
    throw new Error(`Run ${runId} is not queued (status=${existing.status}).`);
  }
  if (!isOwnerManualQueuedSummary(existing.summary)) {
    throw new Error(`Run ${runId} is not an owner_manual staging_worker_pending row.`);
  }

  const claimedAt = new Date().toISOString();
  const claimedSummary = buildClaimSummaryPatch(existing.summary, {
    workerId,
    workerVersion: WORKER_VERSION,
    claimedAt,
  });

  const { data: claimed, error: claimError } = await client
    .from(MONITORING_TABLE)
    .update({
      status: "running",
      started_at: claimedAt,
      agents_run: 1,
      summary: claimedSummary,
    })
    .eq("run_id", runId)
    .eq("status", "queued")
    .select("run_id, status, summary")
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);
  if (!claimed) {
    throw new Error(`Atomic claim failed for ${runId} (already claimed or status changed).`);
  }

  const closedAt = new Date().toISOString();
  const closedSummary = buildClaimCloseSummary(claimed.summary, B2B_CLAIM_CLOSE_MESSAGE);
  const { data: closed, error: closeError } = await client
    .from(MONITORING_TABLE)
    .update({
      status: "failed",
      ended_at: closedAt,
      duration_ms: Math.max(0, Date.parse(closedAt) - Date.parse(claimedAt)),
      errors_count: 0,
      summary: closedSummary,
    })
    .eq("run_id", runId)
    .eq("status", "running")
    .select("run_id, status, summary, ended_at")
    .maybeSingle();

  if (closeError) throw new Error(closeError.message);
  if (!closed) throw new Error(`Claim close failed for ${runId}.`);

  await writeHeartbeat(client, {
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    workerId,
    workerVersion: WORKER_VERSION,
    activeRunId: null,
    lastClaimedRunId: runId,
    lastError: null,
    queueLength: (await listQueuedManualRuns(client)).length,
  });

  return { claimed, closed, message: B2B_CLAIM_CLOSE_MESSAGE };
}

async function claimWebsiteAudit(client, workerId, runId) {
  const { data: existing, error: readError } = await client
    .from(MONITORING_TABLE)
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!existing) throw new Error(`Run not found: ${runId}`);
  if (existing.status !== "queued") {
    throw new Error(`Run ${runId} is not queued (status=${existing.status}).`);
  }
  if (!isWebsiteAuditQueuedSummary(existing.summary)) {
    throw new Error(`Run ${runId} is not a claimable queued website_audit row.`);
  }
  if (isCancelRequested(existing.summary)) {
    throw new Error(`Run ${runId} has cancelRequested; refusing claim.`);
  }

  const claimedAt = new Date().toISOString();
  const claimedSummary = buildWebsiteAuditClaimSummary(existing.summary, {
    workerId,
    workerVersion: WORKER_VERSION,
    claimedAt,
  });

  const { data: claimed, error: claimError } = await client
    .from(MONITORING_TABLE)
    .update({
      status: "running",
      started_at: claimedAt,
      agents_run: 1,
      summary: claimedSummary,
    })
    .eq("run_id", runId)
    .eq("status", "queued")
    .select("run_id, status, summary, started_at")
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);
  if (!claimed) {
    throw new Error(`Atomic claim failed for ${runId}.`);
  }
  return claimed;
}

async function claimBrowserQa(client, workerId, runId) {
  const { data: existing, error: readError } = await client
    .from(MONITORING_TABLE)
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!existing) throw new Error(`Run not found: ${runId}`);
  if (existing.status !== "queued") {
    throw new Error(`Run ${runId} is not queued (status=${existing.status}).`);
  }
  if (!isBrowserQaQueuedSummary(existing.summary)) {
    throw new Error(`Run ${runId} is not a claimable queued browser_qa row.`);
  }
  if (isCancelRequested(existing.summary)) {
    throw new Error(`Run ${runId} has cancelRequested; refusing claim.`);
  }

  const claimedAt = new Date().toISOString();
  const claimedSummary = buildBrowserQaClaimSummary(existing.summary, {
    workerId,
    workerVersion: WORKER_VERSION,
    claimedAt,
  });

  const { data: claimed, error: claimError } = await client
    .from(MONITORING_TABLE)
    .update({
      status: "running",
      started_at: claimedAt,
      agents_run: 1,
      summary: claimedSummary,
    })
    .eq("run_id", runId)
    .eq("status", "queued")
    .select("run_id, status, summary, started_at")
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);
  if (!claimed) {
    throw new Error(`Atomic claim failed for ${runId}.`);
  }
  return claimed;
}

async function failStuckRunning(client, runId, message, claimedAt, failurePhase) {
  const endedAt = new Date().toISOString();
  const { data: existing } = await client
    .from(MONITORING_TABLE)
    .select("summary, status")
    .eq("run_id", runId)
    .maybeSingle();
  if (!existing || existing.status !== "running") return null;
  const summary =
    existing.summary && typeof existing.summary === "object" ? { ...existing.summary } : {};
  summary.error = message;
  summary.failureReason = message;
  summary.failurePhase = failurePhase || "engine_spawn";
  summary.closedAt = endedAt;
  const { data } = await client
    .from(MONITORING_TABLE)
    .update({
      status: "failed",
      ended_at: endedAt,
      duration_ms: Math.max(0, Date.parse(endedAt) - Date.parse(claimedAt || endedAt)),
      summary,
    })
    .eq("run_id", runId)
    .eq("status", "running")
    .select("run_id, status")
    .maybeSingle();
  return data;
}

async function markRunCanceled(client, runId, reason) {
  const endedAt = new Date().toISOString();
  const { data: existing } = await client
    .from(MONITORING_TABLE)
    .select("summary, status, started_at")
    .eq("run_id", runId)
    .maybeSingle();
  if (!existing) return null;
  if (existing.status !== "queued" && existing.status !== "running") return null;
  const summary = buildCanceledSummary(existing.summary, reason, endedAt);
  const { data } = await client
    .from(MONITORING_TABLE)
    .update({
      status: "canceled",
      ended_at: endedAt,
      duration_ms: existing.started_at
        ? Math.max(0, Date.parse(endedAt) - Date.parse(existing.started_at))
        : null,
      summary,
    })
    .eq("run_id", runId)
    .in("status", ["queued", "running"])
    .select("run_id, status, summary")
    .maybeSingle();
  return data;
}

async function maybeRequeueTransientFailure(client, runId) {
  const { data: row } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, summary")
    .eq("run_id", runId)
    .maybeSingle();
  if (!row || row.status !== "failed") return { retried: false };
  const summary =
    row.summary && typeof row.summary === "object" ? row.summary : {};
  const err =
    (typeof summary.failureReason === "string" && summary.failureReason) ||
    (typeof summary.error === "string" && summary.error) ||
    "";
  const decision = canRetryFailedRun(summary, err);
  if (!decision.ok) return { retried: false, reason: decision.reason };
  const nextSummary = buildRetrySummary(summary, decision.reason);
  const { data } = await client
    .from(MONITORING_TABLE)
    .update({
      status: "queued",
      ended_at: null,
      duration_ms: null,
      summary: nextSummary,
    })
    .eq("run_id", runId)
    .eq("status", "failed")
    .select("run_id, status, summary")
    .maybeSingle();
  return { retried: Boolean(data), reason: decision.reason, runId };
}

async function honorCancelBeforeSpawn(client, runId) {
  const { data } = await client
    .from(MONITORING_TABLE)
    .select("summary, status")
    .eq("run_id", runId)
    .maybeSingle();
  if (!data || data.status !== "running") return false;
  if (!isCancelRequested(data.summary)) return false;
  await markRunCanceled(client, runId, "Canceled before engine spawn (cancel_requested).");
  return true;
}

function parseEngineStdout(engine) {
  let enginePayload = null;
  try {
    const stdout = (engine.stdout || "").trim();
    const jsonStart = stdout.indexOf("{");
    if (jsonStart >= 0) enginePayload = JSON.parse(stdout.slice(jsonStart));
  } catch {
    enginePayload = null;
  }
  return enginePayload;
}

async function websiteAuditOnce(client, workerId, envConfig, preferredRunId = null) {
  await heartbeat(client, workerId);

  let runId = preferredRunId;
  if (!runId) {
    const queued = await listQueuedWebsiteAudits(client);
    if (queued.length === 0) {
      return { ok: true, claimed: false, message: "No queued website_audit runs." };
    }
    runId = queued[0].run_id;
  }

  const claimed = await claimWebsiteAudit(client, workerId, runId);
  await writeHeartbeat(client, {
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    workerId,
    workerVersion: WORKER_VERSION,
    activeRunId: runId,
    lastClaimedRunId: runId,
    queueLength: (await listQueuedManualRuns(client)).length,
    lastError: null,
  });

  if (await honorCancelBeforeSpawn(client, runId)) {
    await writeHeartbeat(client, {
      connected: true,
      lastHeartbeatAt: new Date().toISOString(),
      workerId,
      workerVersion: WORKER_VERSION,
      activeRunId: null,
      lastClaimedRunId: runId,
      queueLength: (await listQueuedManualRuns(client)).length,
      lastError: null,
    });
    return { ok: true, claimed: true, canceled: true, runId, engineExit: 0 };
  }

  const engine = spawnEngine(WEBSITE_AUDIT_ENGINE_SCRIPT, runId, envConfig);
  const enginePayload = parseEngineStdout(engine);

  if (engine.status !== 0) {
    const message =
      (engine.stderr || "").trim().slice(0, 500) ||
      (engine.stdout || "").trim().slice(0, 500) ||
      `Website audit engine exited with code ${engine.status}`;
    await failStuckRunning(
      client,
      runId,
      message,
      claimed.started_at,
      "website_audit_engine_spawn",
    );
  }

  await writeHeartbeat(client, {
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    workerId,
    workerVersion: WORKER_VERSION,
    activeRunId: null,
    lastClaimedRunId: runId,
    queueLength: (await listQueuedManualRuns(client)).length,
    lastError: engine.status === 0 ? null : `Website audit engine failed for ${runId}`,
  });

  const { data: finalRow } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, duration_ms, findings_count, errors_count, summary")
    .eq("run_id", runId)
    .maybeSingle();

  let retry = { retried: false };
  if (finalRow?.status === "failed") {
    retry = await maybeRequeueTransientFailure(client, runId);
  }

  return {
    ok: engine.status === 0 && finalRow?.status === "completed",
    claimed: true,
    runId,
    engineExit: engine.status,
    engine: enginePayload,
    final: finalRow,
    retry,
  };
}

async function browserQaOnce(client, workerId, envConfig, preferredRunId = null) {
  await heartbeat(client, workerId);

  if (!resolveStorageStatePath()) {
    return {
      ok: false,
      claimed: false,
      message: BROWSER_QA_AUTH_NOT_CONFIGURED,
    };
  }

  let runId = preferredRunId;
  if (!runId) {
    const queued = await listQueuedBrowserQa(client);
    if (queued.length === 0) {
      return { ok: true, claimed: false, message: "No queued browser_qa runs." };
    }
    runId = queued[0].run_id;
  }

  const claimed = await claimBrowserQa(client, workerId, runId);
  await writeHeartbeat(client, {
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    workerId,
    workerVersion: WORKER_VERSION,
    activeRunId: runId,
    lastClaimedRunId: runId,
    queueLength: (await listQueuedManualRuns(client)).length,
    lastError: null,
  });

  if (await honorCancelBeforeSpawn(client, runId)) {
    await writeHeartbeat(client, {
      connected: true,
      lastHeartbeatAt: new Date().toISOString(),
      workerId,
      workerVersion: WORKER_VERSION,
      activeRunId: null,
      lastClaimedRunId: runId,
      queueLength: (await listQueuedManualRuns(client)).length,
      lastError: null,
    });
    return { ok: true, claimed: true, canceled: true, runId, engineExit: 0 };
  }

  const engine = spawnEngine(BROWSER_QA_ENGINE_SCRIPT, runId, envConfig);
  const enginePayload = parseEngineStdout(engine);

  if (engine.status !== 0) {
    const message =
      (engine.stderr || "").trim().slice(0, 500) ||
      (engine.stdout || "").trim().slice(0, 500) ||
      `Browser QA engine exited with code ${engine.status}`;
    await failStuckRunning(
      client,
      runId,
      message,
      claimed.started_at,
      "browser_qa_engine_spawn",
    );
  }

  await writeHeartbeat(client, {
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    workerId,
    workerVersion: WORKER_VERSION,
    activeRunId: null,
    lastClaimedRunId: runId,
    queueLength: (await listQueuedManualRuns(client)).length,
    lastError: engine.status === 0 ? null : `Browser QA engine failed for ${runId}`,
  });

  const { data: finalRow } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, duration_ms, findings_count, errors_count, summary")
    .eq("run_id", runId)
    .maybeSingle();

  let retry = { retried: false };
  if (finalRow?.status === "failed") {
    retry = await maybeRequeueTransientFailure(client, runId);
  }

  return {
    ok:
      engine.status === 0 &&
      (finalRow?.status === "completed" || finalRow?.status === "failed"),
    claimed: true,
    runId,
    engineExit: engine.status,
    engine: enginePayload,
    final: finalRow,
    retry,
  };
}

async function cancelQueuedIfRequested(client, row) {
  if (!row || !isCancelRequested(row.summary)) return null;
  return markRunCanceled(client, row.run_id, "Canceled while queued (cancel_requested).");
}

async function runOpsCycle(client, workerId, envConfig, intervalMs) {
  const nowIso = new Date().toISOString();
  const heartbeatResult = await heartbeat(client, workerId);

  let tickResult = null;
  let tickError = null;
  try {
    tickResult = await runSchedulerTick(client, workerId, envConfig, { dryRun: false });
  } catch (error) {
    tickError = error instanceof Error ? error.message : String(error);
  }

  const queued = await listQueuedManualRuns(client);
  const next = pickNextQueuedRun(queued);
  let processResult = null;
  let canceledWhileQueued = null;

  if (next) {
    canceledWhileQueued = await cancelQueuedIfRequested(client, next);
    if (!canceledWhileQueued) {
      const workType = next.summary?.workType;
      if (workType === "website_audit") {
        processResult = await websiteAuditOnce(client, workerId, envConfig, next.run_id);
      } else if (workType === "browser_qa") {
        processResult = await browserQaOnce(client, workerId, envConfig, next.run_id);
      } else {
        processResult = {
          ok: false,
          claimed: false,
          message: `Unsupported workType for ops: ${workType}`,
          runId: next.run_id,
        };
      }
    }
  }

  const staleReport = await reportStaleSchedulerRuns(client, { dryRun: true });
  const remainingQueued = await listQueuedManualRuns(client);
  const browserEngine = resolveBrowserQaEngineHealth(nowIso);
  const enginesReady = Boolean(browserEngine.connected);
  const finalStatus = processResult?.final?.status ?? null;
  const lastCompletedRunId =
    finalStatus === "completed"
      ? processResult?.runId ?? null
      : heartbeatResult.health?.ops?.lastCompletedRunId ?? null;
  const lastFailedRunId =
    finalStatus === "failed"
      ? processResult?.runId ?? null
      : heartbeatResult.health?.ops?.lastFailedRunId ?? null;
  const activeSummary =
    processResult?.final?.summary && typeof processResult.final.summary === "object"
      ? processResult.final.summary
      : next?.summary && typeof next.summary === "object"
        ? next.summary
        : {};

  const opsPatch = buildOpsHealthPatch({
    activeRunId: null,
    activeRunType: null,
    activeRunTrigger: null,
    queueLength: remainingQueued.length,
    oldestQueuedAgeMs: oldestQueuedAgeMs(remainingQueued),
    lastCompletedRunId,
    lastFailedRunId,
    lastError: tickError || processResult?.final?.summary?.failureReason || null,
    lastOpsCycleAt: nowIso,
    nextSchedulerTickEstimate: estimateNextSchedulerTickAt(
      tickResult?.scheduler?.lastTickAt || nowIso,
      intervalMs,
    ),
    enginesReady,
  });

  // Keep last active metadata readable when a run is still mid-flight elsewhere.
  if (processResult?.claimed && processResult?.final?.status === "running") {
    opsPatch.activeRunId = processResult.runId;
    opsPatch.activeRunType = activeSummary.workType ?? null;
    opsPatch.activeRunTrigger = activeSummary.trigger ?? null;
  }

  const health = await writeHeartbeat(client, {
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    workerId,
    workerVersion: WORKER_VERSION,
    activeRunId: opsPatch.activeRunId,
    lastClaimedRunId: processResult?.runId ?? heartbeatResult.health?.lastClaimedRunId ?? null,
    queueLength: remainingQueued.length,
    lastError:
      typeof opsPatch.lastError === "string" ? opsPatch.lastError : null,
    ops: opsPatch,
  });

  return {
    ok: true,
    opsVersion: OPS_VERSION,
    workerId,
    queueLength: remainingQueued.length,
    oldestQueuedAgeMs: opsPatch.oldestQueuedAgeMs,
    pickedRunId: next?.run_id ?? null,
    processed: processResult,
    canceledWhileQueued: canceledWhileQueued?.run_id ?? null,
    tick: tickResult
      ? {
          tickId: tickResult.tickId,
          dueCount: tickResult.dueCount,
          enqueuedCount: tickResult.enqueuedCount,
          skippedCount: tickResult.skippedCount,
        }
      : null,
    tickError,
    staleCount: staleReport.staleCount,
    enginesReady,
    health,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const validated = validateWorkerEnv(process.env);
  if (!validated.ok) {
    console.error("[manual-run-worker] env validation failed:");
    for (const err of validated.errors) console.error(` - ${err}`);
    process.exit(2);
  }

  const workerId =
    process.env.AGENTOPS_WORKER_ID?.trim() || `staging-worker-${randomUUID().slice(0, 8)}`;
  const client = createServiceClient(validated.config);

  if (args.command === "heartbeat" || args.command === "once") {
    const result = await heartbeat(client, workerId);
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: args.command,
          workerId,
          workerVersion: WORKER_VERSION,
          health: result.health,
          queueLength: result.queued.length,
          websiteAuditQueued: result.queued.filter((r) =>
            isWebsiteAuditQueuedSummary(r.summary),
          ).length,
          browserQaQueued: result.queued.filter((r) => isBrowserQaQueuedSummary(r.summary))
            .length,
          runningCount: result.running.length,
          staleCount: result.stale.length,
          queuedRunIds: result.queued.map((r) => r.run_id),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args.command === "queue-status") {
    const queued = await listQueuedManualRuns(client);
    const running = await listRunningManualRuns(client);
    console.log(
      JSON.stringify(
        {
          ok: true,
          queueLength: queued.length,
          queued: queued.map((r) => ({
            runId: r.run_id,
            agentSlug: r.summary?.agentSlug ?? null,
            workType: r.summary?.workType ?? null,
          })),
          running: running.map((r) => ({
            runId: r.run_id,
            stale: isLockExpired(r.summary),
            lockExpiresAt: r.summary?.lockExpiresAt ?? null,
            workType: r.summary?.workType ?? null,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args.command === "claim-test") {
    await heartbeat(client, workerId);
    const result = await claimOnceTest(client, workerId, args.runId);
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: "claim-test",
          workerId,
          runId: args.runId,
          claimedStatus: result.claimed.status,
          closedStatus: result.closed.status,
          message: result.message,
          summary: result.closed.summary,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args.command === "website-audit-once") {
    const result = await websiteAuditOnce(client, workerId, validated.config, args.runId);
    console.log(JSON.stringify({ ok: true, command: "website-audit-once", workerId, ...result }, null, 2));
    if (result.claimed && result.engineExit !== 0) process.exit(1);
    return;
  }

  if (args.command === "website-audit-dev") {
    if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
      console.error("website-audit-dev must not run in CI.");
      process.exit(2);
    }
    console.error(`[manual-run-worker] website-audit-dev loop interval=${args.intervalMs}ms`);
    for (;;) {
      try {
        const result = await websiteAuditOnce(client, workerId, validated.config);
        console.log(JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2));
      } catch (error) {
        console.error(
          "[manual-run-worker] website-audit-dev tick failed:",
          error instanceof Error ? error.message : error,
        );
      }
      await sleep(args.intervalMs);
    }
  }

  if (args.command === "browser-qa-once") {
    const result = await browserQaOnce(client, workerId, validated.config, args.runId);
    console.log(JSON.stringify({ ok: true, command: "browser-qa-once", workerId, ...result }, null, 2));
    if (!result.ok && result.claimed && result.engineExit !== 0) process.exit(1);
    if (!result.ok && !result.claimed && result.message === BROWSER_QA_AUTH_NOT_CONFIGURED) {
      process.exit(1);
    }
    return;
  }

  if (args.command === "browser-qa-dev") {
    if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
      console.error("browser-qa-dev must not run in CI.");
      process.exit(2);
    }
    console.error(`[manual-run-worker] browser-qa-dev loop interval=${args.intervalMs}ms`);
    for (;;) {
      try {
        const result = await browserQaOnce(client, workerId, validated.config);
        console.log(JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2));
      } catch (error) {
        console.error(
          "[manual-run-worker] browser-qa-dev tick failed:",
          error instanceof Error ? error.message : error,
        );
      }
      await sleep(args.intervalMs);
    }
  }

  if (args.command === "scheduler-tick") {
    // Do not force engine connectivity via writeHeartbeat — tick heartbeats lightly
    // and preserves existing engine availability (honest Engine not connected skips).
    const result = await runSchedulerTick(client, workerId, validated.config, {
      dryRun: args.dryRun,
    });
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: "scheduler-tick",
          workerId,
          dryRun: Boolean(args.dryRun),
          ...result,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args.command === "scheduler-cleanup-stale") {
    const result = await reportStaleSchedulerRuns(client, {
      dryRun: !args.mutate,
      mutate: Boolean(args.mutate),
    });
    console.log(JSON.stringify({ ok: true, workerId, ...result }, null, 2));
    return;
  }

  if (args.command === "ops") {
    const opsEnv = validatePersistentWorkerEnv(process.env);
    if (!opsEnv.ok) {
      console.error("[staging-worker] persistent ops env validation failed:");
      for (const err of opsEnv.errors) console.error(` - ${err}`);
      process.exit(2);
    }
    const intervalMs = args.intervalMs || resolveOpsIntervalMs(process.env);
    console.error(
      `[staging-worker] ops loop version=${OPS_VERSION} interval=${intervalMs}ms once=${args.once}`,
    );
    for (;;) {
      try {
        const result = await runOpsCycle(client, workerId, validated.config, intervalMs);
        console.log(
          JSON.stringify(
            {
              at: new Date().toISOString(),
              command: "ops",
              ...result,
            },
            null,
            2,
          ),
        );
      } catch (error) {
        console.error(
          "[staging-worker] ops cycle failed:",
          error instanceof Error ? error.message : error,
        );
      }
      if (args.once) return;
      await sleep(intervalMs);
    }
  }

  if (args.command === "scheduler-dev") {
    if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
      console.error("scheduler-dev must not run in CI.");
      process.exit(2);
    }
    if (process.env.AGENTOPS_ENVIRONMENT !== "staging") {
      console.error("scheduler-dev requires AGENTOPS_ENVIRONMENT=staging.");
      process.exit(2);
    }
    const appUrl = (validated.config.appUrl || "").toLowerCase();
    if (appUrl.includes("ai-xia.vercel.app") && !appUrl.includes("staging")) {
      console.error("scheduler-dev refuses production URL.");
      process.exit(2);
    }
    console.error(
      `[manual-run-worker] scheduler-dev loop interval=${args.intervalMs}ms dryRun=${args.dryRun}`,
    );
    for (;;) {
      try {
        const result = await runSchedulerTick(client, workerId, validated.config, {
          dryRun: args.dryRun,
        });
        console.log(
          JSON.stringify(
            {
              at: new Date().toISOString(),
              tickId: result.tickId,
              dueCount: result.dueCount,
              enqueuedCount: result.enqueuedCount,
              skippedCount: result.skippedCount,
              dryRun: Boolean(result.dryRun),
            },
            null,
            2,
          ),
        );
      } catch (error) {
        console.error(
          "[manual-run-worker] scheduler-dev tick failed:",
          error instanceof Error ? error.message : error,
        );
      }
      await sleep(args.intervalMs);
    }
  }

  console.error(
    "Unknown command. Use: heartbeat | once | queue-status | claim-test --run-id <id> | website-audit-once | website-audit-dev | browser-qa-once | browser-qa-dev | scheduler-tick [--dry-run] | scheduler-dev | scheduler-cleanup-stale [--dry-run|--mutate] | ops|staging-worker [--once]",
  );
  process.exit(2);
}

main().catch((error) => {
  console.error("[manual-run-worker] FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
