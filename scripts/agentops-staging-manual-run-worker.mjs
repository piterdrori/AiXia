/**
 * Fix B2-C — staging manual-run worker (heartbeat + claim-test + website audit).
 *
 * Usage:
 *   node scripts/agentops-staging-manual-run-worker.mjs heartbeat
 *   node scripts/agentops-staging-manual-run-worker.mjs once
 *   node scripts/agentops-staging-manual-run-worker.mjs claim-test --run-id <id>
 *   node scripts/agentops-staging-manual-run-worker.mjs website-audit-once
 *   node scripts/agentops-staging-manual-run-worker.mjs website-audit-dev
 *   node scripts/agentops-staging-manual-run-worker.mjs queue-status
 *
 * Playwright / website audit runs only via spawned engine (website-audit-once).
 * Browser QA is not executed in B2-C.
 */
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  B2B_CLAIM_CLOSE_MESSAGE,
  WORKER_VERSION,
  buildClaimCloseSummary,
  buildClaimSummaryPatch,
  buildConnectedWebsiteAuditEngine,
  buildDisconnectedBrowserQaEngine,
  buildWebsiteAuditClaimSummary,
  isLockExpired,
  isOwnerManualQueuedSummary,
  isWebsiteAuditQueuedSummary,
  mergeWorkerHealthIntoTools,
  parseWorkerHealth,
  validateWorkerEnv,
} from "./lib/agentops-manual-run-worker-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MONITORING_TABLE = "agentops_monitoring_runs";
const CONFIG_TABLE = "agentops_system_config";
const ENGINE_SCRIPT = path.join(REPO_ROOT, "scripts", "agentops-manual-run-website-audit-engine.ts");

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
  const args = { command: "once", runId: null, intervalMs: 15_000 };
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
      if (Number.isFinite(n) && n >= 5_000) args.intervalMs = Math.floor(n);
      i += 1;
      continue;
    }
    if (token.startsWith("--")) continue;
    positional.push(token);
  }
  if (positional[0]) args.command = positional[0];
  if (args.command === "claim-test" && !args.runId && positional[1]) {
    args.runId = positional[1];
  }
  return args;
}

function createServiceClient(config) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function listQueuedManualRuns(client) {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("id, run_id, status, summary, started_at, created_at")
    .eq("mode", "owner_manual_single_agent")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []).filter((row) => isOwnerManualQueuedSummary(row.summary));
}

async function listQueuedWebsiteAudits(client) {
  const queued = await listQueuedManualRuns(client);
  return queued.filter((row) => isWebsiteAuditQueuedSummary(row.summary));
}

async function listRunningManualRuns(client) {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("id, run_id, status, summary, started_at, created_at")
    .eq("mode", "owner_manual_single_agent")
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
    browserQaEngine: buildDisconnectedBrowserQaEngine(),
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
    throw new Error(`Run ${runId} is not a queued website_audit owner_manual row.`);
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

function runWebsiteAuditEngine(runId, envConfig) {
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    npxCmd,
    ["tsx", ENGINE_SCRIPT, "--run-id", runId],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        STAGING_SUPABASE_URL: envConfig.supabaseUrl,
        STAGING_SUPABASE_SERVICE_ROLE_KEY: envConfig.serviceRoleKey,
        STAGING_APP_URL: envConfig.appUrl,
        AGENTOPS_ENVIRONMENT: "staging",
        AGENTOPS_PRODUCTION_BLOCKED: "true",
        AGENTOPS_RUNTIME_ALLOW_REMOTE_STAGING: "true",
      },
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      shell: process.platform === "win32",
    },
  );
  return result;
}

async function failStuckRunning(client, runId, message, claimedAt) {
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
  summary.failurePhase = "website_audit_engine_spawn";
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

  const engine = runWebsiteAuditEngine(runId, envConfig);
  let enginePayload = null;
  try {
    const stdout = (engine.stdout || "").trim();
    const jsonStart = stdout.lastIndexOf("{");
    if (jsonStart >= 0) enginePayload = JSON.parse(stdout.slice(jsonStart));
  } catch {
    enginePayload = null;
  }

  if (engine.status !== 0) {
    const message =
      (engine.stderr || "").trim().slice(0, 500) ||
      (engine.stdout || "").trim().slice(0, 500) ||
      `Website audit engine exited with code ${engine.status}`;
    await failStuckRunning(client, runId, message, claimed.started_at);
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

  return {
    ok: engine.status === 0 && finalRow?.status === "completed",
    claimed: true,
    runId,
    engineExit: engine.status,
    engine: enginePayload,
    final: finalRow,
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

  console.error(
    "Unknown command. Use: heartbeat | once | queue-status | claim-test --run-id <id> | website-audit-once | website-audit-dev",
  );
  process.exit(2);
}

main().catch((error) => {
  console.error("[manual-run-worker] FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
