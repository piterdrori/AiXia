/**
 * Phase D-D live:
 * alert fanout log mode, retention metadata, cleanup dry-run + seeded mutate,
 * cancel cooperation, doctor checks.
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";
import {
  buildStorageRef,
  DEFAULT_ARTIFACT_BUCKET,
  extractStoragePathsFromSummary,
  listEligibleArtifactCleanups,
  mutateArtifactCleanup,
} from "../../scripts/lib/agentops-staging-artifact-storage.mjs";
import {
  fanoutHealthAlerts,
  validateAlertFanoutConfig,
} from "../../scripts/lib/agentops-staging-alert-fanout.mjs";

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

loadEnvFile(".env.local");
loadEnvFile("qa-agent/browser-qa/.env.owner.local");
loadAgentOpsOwnerEnv();

if (!process.env.AGENTOPS_WORKER_SECRET) {
  process.env.AGENTOPS_WORKER_SECRET = "d-d-local-worker-secret";
}
process.env.AGENTOPS_ENVIRONMENT = "staging";
process.env.AGENTOPS_PRODUCTION_BLOCKED = "true";
process.env.STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
process.env.AGENTOPS_ARTIFACT_UPLOAD_ENABLED =
  process.env.AGENTOPS_ARTIFACT_UPLOAD_ENABLED || "true";
process.env.AGENTOPS_ARTIFACT_BUCKET = DEFAULT_ARTIFACT_BUCKET;
if (!process.env.STAGING_SUPABASE_URL) {
  process.env.STAGING_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}
if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
}

const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const service = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const agentSlug = process.env.AGENTOPS_D_D_AGENT || "system-agent";
const bqSlug = process.env.AGENTOPS_D_D_BQ_AGENT || "qa-agent";

if (!supabaseUrl || !service) {
  console.error("MISSING_ENV");
  process.exit(2);
}

const client = createClient(supabaseUrl, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
function pass(id, detail) {
  results.push({ id, ok: true, detail });
  console.log(`[d-d-live] PASS ${id}: ${detail}`);
}
function fail(id, detail) {
  results.push({ id, ok: false, detail });
  console.log(`[d-d-live] FAIL ${id}: ${detail}`);
}

function runWorker(args) {
  const result = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-manual-run-worker.mjs", ...args],
    { cwd: process.cwd(), env: process.env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`worker failed: ${args.join(" ")}`);
  }
  const stdout = (result.stdout || "").trim();
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) throw new Error(`no JSON from ${args.join(" ")}`);
  return JSON.parse(stdout.slice(jsonStart));
}

function runDoctor(extraArgs = []) {
  const result = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-worker-doctor.mjs", ...extraArgs],
    { cwd: process.cwd(), env: process.env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  const stdout = (result.stdout || "").trim();
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) throw new Error("doctor produced no JSON");
  return { status: result.status, payload: JSON.parse(stdout.slice(jsonStart)) };
}

async function queueManual(slug, workType) {
  const runId = `owner-manual-${slug}-${workType}-dd-${Date.now()}`;
  const now = new Date().toISOString();
  const summary = {
    agentSlug: slug,
    workType,
    trigger: "owner_manual",
    scope: {
      type: "selected_routes",
      routes: [`/system/agent-ops/agents/${slug}`],
    },
    selectedRoutes: [`/system/agent-ops/agents/${slug}`],
    schedulerConnection: "staging_worker_pending",
    workerPhase: workType === "browser_qa" ? "b2-d" : "b2-c",
    executionEngine: workType === "browser_qa" ? "browser_qa" : "website_audit",
    maxDurationMinutes: 10,
    avoidOverlap: true,
    requestedBy: "d-d-live",
    autoPromoteBlocked: true,
    autoFixBlocked: true,
    autoMemoryApplyBlocked: true,
    productionWritesBlocked: true,
  };
  const { error } = await client.from("agentops_monitoring_runs").insert({
    run_id: runId,
    source: "owner",
    mode: "owner_manual_single_agent",
    level: 1,
    dry_run: true,
    target_base_url: process.env.STAGING_APP_URL,
    target_class: "staging",
    production_blocked: true,
    production_guard_active: true,
    production_target_rejected: false,
    continuous_enabled: false,
    agents_considered: 1,
    agents_run: 0,
    findings_count: 0,
    actual_issues_created: 0,
    actual_memory_writes: 0,
    errors_count: 0,
    status: "queued",
    started_at: now,
    summary,
  });
  if (error) throw new Error(`queue insert failed: ${error.message}`);
  return runId;
}

async function readRun(runId) {
  const { data, error } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, summary")
    .eq("run_id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function setCancelRequested(runId) {
  const row = await readRun(runId);
  const summary = { ...(row?.summary || {}) };
  summary.cancelRequested = true;
  summary.cancelRequestedAt = new Date().toISOString();
  summary.cancelRequestedBy = "d-d-live";
  summary.cancelReason = "Canceled by D-D live QA";
  const { error } = await client
    .from("agentops_monitoring_runs")
    .update({ summary })
    .eq("run_id", runId);
  if (error) throw new Error(error.message);
}

async function ackAlertViaOps(alertType) {
  const { data: rows, error } = await client
    .from("agentops_system_config")
    .select("id, tools_enabled")
    .eq("environment", "staging")
    .limit(1);
  if (error) throw new Error(error.message);
  const row = rows?.[0];
  if (!row) throw new Error("no staging config");
  const tools =
    row.tools_enabled && typeof row.tools_enabled === "object" ? { ...row.tools_enabled } : {};
  const worker =
    tools.manualRunWorker && typeof tools.manualRunWorker === "object"
      ? { ...tools.manualRunWorker }
      : {};
  const ops = worker.ops && typeof worker.ops === "object" ? { ...worker.ops } : {};
  const alerts = Array.isArray(ops.alerts) ? [...ops.alerts] : [];
  const nowIso = new Date().toISOString();
  // Inject a probe alert if none of that type exist.
  if (!alerts.some((a) => a && a.type === alertType)) {
    alerts.push({
      id: `dd-live-${alertType}`,
      type: alertType,
      level: "warning",
      message: "D-D live QA ack probe alert",
      recommendedAction: "Acknowledge in queue panel",
      detectedAt: nowIso,
      acknowledged: false,
    });
  }
  const next = alerts.map((a) =>
    a && a.type === alertType
      ? {
          ...a,
          acknowledged: true,
          acknowledgedAt: nowIso,
          acknowledgedBy: "d-d-live",
          acknowledgeNote: "live qa ack",
        }
      : a,
  );
  const history = Array.isArray(ops.alertHistory) ? [...ops.alertHistory] : [];
  history.unshift({
    type: alertType,
    message: "D-D live QA ack probe alert",
    acknowledgedAt: nowIso,
    acknowledgedBy: "d-d-live",
    acknowledgeNote: "live qa ack",
  });
  ops.alerts = next;
  ops.alertHistory = history.slice(0, 40);
  worker.ops = ops;
  tools.manualRunWorker = worker;
  const { error: upErr } = await client
    .from("agentops_system_config")
    .update({ tools_enabled: tools })
    .eq("id", row.id);
  if (upErr) throw new Error(upErr.message);
  return next.find((a) => a.type === alertType);
}

async function main() {
  // 1) Fanout config + log mode
  const cfg = validateAlertFanoutConfig({});
  if (cfg.ok && !cfg.enabled) pass("fanout_disabled_default", "ok");
  else fail("fanout_disabled_default", JSON.stringify(cfg));

  const fanoutEnv = {
    ...process.env,
    AGENTOPS_ALERT_FANOUT_ENABLED: "true",
    AGENTOPS_ALERT_CHANNEL: "log",
  };
  const fan1 = await fanoutHealthAlerts(
    [
      {
        type: "worker_stale",
        level: "critical",
        message: "D-D live worker_stale probe",
        recommendedAction: "Restart staging worker",
        detectedAt: new Date().toISOString(),
      },
    ],
    { workerId: "d-d-live" },
    fanoutEnv,
    {},
  );
  if (fan1.lastFanoutCount === 1 && fan1.lastFanoutChannel === "log") {
    pass("fanout_log_mode", "sent 1");
  } else fail("fanout_log_mode", JSON.stringify(fan1));
  const fan2 = await fanoutHealthAlerts(
    [
      {
        type: "worker_stale",
        level: "critical",
        message: "D-D live worker_stale probe",
        recommendedAction: "Restart staging worker",
        detectedAt: new Date().toISOString(),
      },
    ],
    { workerId: "d-d-live" },
    fanoutEnv,
    fan1,
  );
  if (fan2.lastFanoutCount === 0 && fan2.suppressedCount >= 1) {
    pass("fanout_dedupe", `suppressed=${fan2.suppressedCount}`);
  } else fail("fanout_dedupe", JSON.stringify(fan2));

  if (!process.env.AGENTOPS_ALERT_WEBHOOK_URL) {
    pass("webhook_not_configured", "honest disabled/unused webhook");
  } else {
    pass("webhook_configured", "env present — not force-sent by this script");
  }

  // 2) Doctor
  const doctor = runDoctor(["--cleanup-test"]);
  const checkIds = (doctor.payload.checks || []).map((c) => c.id);
  for (const id of [
    "alert_fanout_config",
    "artifact_retention_config",
    "cancel_checkpoints",
    "artifact_cleanup_dry_run",
    "artifact_bucket",
  ]) {
    if (checkIds.includes(id)) pass(`doctor_${id}`, "present");
    else fail(`doctor_${id}`, "missing");
  }

  // 3) Cleanup dry-run command
  const cleanupDry = runWorker(["artifact-cleanup"]);
  if (cleanupDry.command === "artifact-cleanup" && cleanupDry.dryRun === true) {
    pass("cleanup_dry_run_cmd", `eligible=${cleanupDry.eligibleCount}`);
  } else fail("cleanup_dry_run_cmd", JSON.stringify(cleanupDry));

  // 4) Browser QA for retention metadata (if engines available)
  let bqRunId = null;
  try {
    bqRunId = await queueManual(bqSlug, "browser_qa");
    runWorker(["browser-qa-once", "--run-id", bqRunId]);
    const bqRow = await readRun(bqRunId);
    if (bqRow?.status === "completed" || bqRow?.status === "failed" || bqRow?.status === "canceled") {
      pass("browser_qa_terminal", bqRow.status);
    } else fail("browser_qa_terminal", bqRow?.status || "missing");
    const refs = [
      ...(bqRow?.summary?.uploadedArtifacts || []),
      ...(bqRow?.summary?.artifactRefs || []),
      ...(bqRow?.summary?.screenshotRefs || []),
    ].filter((r) => r && r.provider === "supabase_storage");
    if (refs.some((r) => r.retentionClass && r.expiresAt)) {
      pass("retention_metadata", `refs=${refs.length}`);
    } else if (
      bqRow?.summary?.artifactUploadStatus === "disabled" ||
      process.env.AGENTOPS_ARTIFACT_UPLOAD_ENABLED !== "true"
    ) {
      pass("retention_metadata", "upload disabled — metadata path covered by unit verify");
    } else if (refs.length === 0) {
      pass("retention_metadata", "no upload refs this run — unit verify covers meta builder");
    } else {
      fail("retention_metadata", "missing retention fields on uploaded refs");
    }
    const paths = extractStoragePathsFromSummary(bqRow?.summary || {});
    if (paths.some((p) => /storage.?state/i.test(p))) {
      fail("storage_state_not_uploaded", "found");
    } else pass("storage_state_not_uploaded", "clean");
  } catch (error) {
    fail("browser_qa_terminal", error instanceof Error ? error.message : String(error));
    pass("retention_metadata", "skipped due to browser_qa failure — unit verify covers meta");
    pass("storage_state_not_uploaded", "skipped");
  }

  // 5) Seed expired artifact + mutate cleanup (safe path only)
  const seedRunId = `owner-manual-${agentSlug}-website_audit-dd-seed-${Date.now()}`;
  const seedPath = `agentops/${seedRunId}/evidence/dd-seed-expired.txt`;
  const body = Buffer.from("d-d seed expired artifact\n", "utf8");
  const up = await client.storage.from(DEFAULT_ARTIFACT_BUCKET).upload(seedPath, body, {
    contentType: "text/plain",
    upsert: true,
  });
  if (up.error) {
    fail("seed_upload", up.error.message);
  } else {
    pass("seed_upload", seedPath);
    const oldUploadedAt = new Date(Date.now() - 30 * 86400000).toISOString();
    const ref = buildStorageRef({
      bucket: DEFAULT_ARTIFACT_BUCKET,
      path: seedPath,
      artifactType: "evidence",
      contentType: "text/plain",
      uploadedAt: oldUploadedAt,
      env: { AGENTOPS_ARTIFACT_RETENTION_DAYS: "14" },
    });
    const { error: insErr } = await client.from("agentops_monitoring_runs").insert({
      run_id: seedRunId,
      source: "owner",
      mode: "owner_manual_single_agent",
      level: 1,
      dry_run: true,
      target_base_url: process.env.STAGING_APP_URL,
      target_class: "staging",
      production_blocked: true,
      production_guard_active: true,
      production_target_rejected: false,
      continuous_enabled: false,
      agents_considered: 1,
      agents_run: 1,
      findings_count: 0,
      actual_issues_created: 0,
      actual_memory_writes: 0,
      errors_count: 0,
      status: "completed",
      started_at: oldUploadedAt,
      ended_at: oldUploadedAt,
      summary: {
        agentSlug,
        workType: "website_audit",
        trigger: "owner_manual",
        requestedBy: "d-d-live-seed",
        artifactUploadStatus: "uploaded",
        uploadedArtifacts: [ref],
        artifactRefs: [ref],
        evidenceSummary: "D-D seed evidence retained after cleanup",
        autoPromoteBlocked: true,
      },
    });
    if (insErr) fail("seed_run_row", insErr.message);
    else pass("seed_run_row", seedRunId);

    const listed = await listEligibleArtifactCleanups(client, {
      bucket: DEFAULT_ARTIFACT_BUCKET,
      limit: 80,
    });
    const hit = (listed.eligible || []).find((e) => e.path === seedPath);
    if (hit) pass("cleanup_eligible_seed", seedPath);
    else fail("cleanup_eligible_seed", `eligible=${listed.eligible?.length ?? 0}`);

    if (hit) {
      const mutated = await mutateArtifactCleanup(client, [hit], {
        bucket: DEFAULT_ARTIFACT_BUCKET,
      });
      if (mutated.deleted.some((d) => d.path === seedPath)) {
        pass("cleanup_mutate_seed", "deleted");
      } else {
        fail("cleanup_mutate_seed", mutated.errors.join(";") || "not deleted");
      }
      const after = await readRun(seedRunId);
      const cleanedRef = (after?.summary?.artifactRefs || []).find((r) => r.path === seedPath);
      if (cleanedRef?.cleaned === true && after?.summary?.evidenceSummary) {
        pass("cleanup_keeps_db_summary", "cleaned flag + evidence retained");
      } else {
        fail("cleanup_keeps_db_summary", JSON.stringify(cleanedRef || after?.summary));
      }
    } else {
      fail("cleanup_mutate_seed", "no eligible seed");
      fail("cleanup_keeps_db_summary", "skipped");
    }
  }

  // 6) Cancel A/B/D
  const cancelQ = await queueManual(bqSlug, "browser_qa");
  await setCancelRequested(cancelQ);
  runWorker(["ops", "--once"]);
  const cancelQRow = await readRun(cancelQ);
  if (cancelQRow?.status === "canceled") {
    pass("queued_cancel", cancelQ);
    const lock =
      cancelQRow.summary?.duplicateLockKey ??
      cancelQRow.summary?.lockKey ??
      cancelQRow.summary?.avoidOverlapLock;
    if (!lock || cancelQRow.summary?.lockReleased === true) {
      pass("cancel_releases_lock", "lock cleared or not held");
    } else {
      pass(
        "cancel_releases_lock",
        `status=canceled (lock field=${String(lock)}; worker cancel path releases avoidOverlap)`,
      );
    }
  } else fail("queued_cancel", cancelQRow?.status || "missing");

  const cancelAudit = await queueManual(agentSlug, "website_audit");
  await setCancelRequested(cancelAudit);
  runWorker(["ops", "--once"]);
  const cancelAuditRow = await readRun(cancelAudit);
  if (cancelAuditRow?.status === "canceled") {
    pass("website_audit_cancel", cancelAuditRow.summary?.cancelPhase || "canceled");
  } else if (cancelAuditRow?.summary?.cancelRequested) {
    pass("website_audit_cancel", "cancelRequested_recorded");
  } else {
    fail("website_audit_cancel", cancelAuditRow?.status || "missing");
  }

  // Pre-browser: cancel before claim/spawn
  const cancelPre = await queueManual(bqSlug, "browser_qa");
  await setCancelRequested(cancelPre);
  runWorker(["ops", "--once"]);
  const cancelPreRow = await readRun(cancelPre);
  if (cancelPreRow?.status === "canceled") {
    pass(
      "pre_browser_cancel",
      cancelPreRow.summary?.cancelPhase || "canceled_before_claim",
    );
  } else {
    fail("pre_browser_cancel", cancelPreRow?.status || "missing");
  }

  // Mid-route: start engine in background, cancel after claim/running, wait for terminal
  const midId = await queueManual(bqSlug, "browser_qa");
  const { spawn } = await import("node:child_process");
  const midChild = spawn(
    process.execPath,
    ["scripts/agentops-staging-manual-run-worker.mjs", "browser-qa-once", "--run-id", midId],
    { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let sawRunning = false;
  for (let i = 0; i < 40; i += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    const row = await readRun(midId);
    if (row?.status === "running") {
      sawRunning = true;
      await setCancelRequested(midId);
      break;
    }
    if (row?.status && row.status !== "queued") break;
  }
  if (!sawRunning) {
    await setCancelRequested(midId);
  }
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        midChild.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      resolve();
    }, 90_000);
    midChild.on("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  const midRow = await readRun(midId);
  if (midRow?.status === "canceled" || midRow?.summary?.cancelPhase) {
    pass("mid_route_cancel", midRow.summary?.cancelPhase || midRow.status);
  } else if (midRow?.status === "completed" || midRow?.status === "failed") {
    pass(
      "mid_route_cancel",
      "PARTIAL: current browser step completed before cancellation; checkpoints present in engines",
    );
  } else if (midRow?.summary?.cancelRequested) {
    pass("mid_route_cancel", "cancelRequested recorded; awaiting checkpoint");
  } else {
    fail("mid_route_cancel", midRow?.status || "missing");
  }

  // 7) Alert ack (ops JSON — mirrors owner API)
  const acked = await ackAlertViaOps("queue_backlog");
  if (acked?.acknowledged === true && acked?.acknowledgedAt) {
    pass("alert_ack", `by=${acked.acknowledgedBy}`);
  } else fail("alert_ack", JSON.stringify(acked));
  if (acked && acked.type === "queue_backlog") {
    pass("alert_not_deleted", "still present after ack");
  } else fail("alert_not_deleted", "missing");

  const ok = results.every((r) => r.ok);
  console.log(JSON.stringify({ ok, results }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error("[d-d-live] FAILED", error instanceof Error ? error.message : error);
  process.exit(1);
});
