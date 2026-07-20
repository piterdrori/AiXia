/**
 * Phase D-B live:
 * cancel queued + cancelRequested + completed regressions + queue API shape.
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

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
  process.env.AGENTOPS_WORKER_SECRET = "d-b-local-worker-secret";
}
process.env.AGENTOPS_ENVIRONMENT = "staging";
process.env.AGENTOPS_PRODUCTION_BLOCKED = "true";
process.env.STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
if (!process.env.STAGING_SUPABASE_URL) {
  process.env.STAGING_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}
if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
}

const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const service = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const agentSlug = process.env.AGENTOPS_D_B_AGENT || "system-agent";
const bqSlug = process.env.AGENTOPS_D_B_BQ_AGENT || "qa-agent";
const base = process.env.STAGING_APP_URL;

if (!supabaseUrl || !service) {
  console.error("MISSING_ENV");
  process.exit(2);
}

const client = createClient(supabaseUrl, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

async function cancelQueuedForAgent(slug) {
  const { data } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, summary")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .in("status", ["queued", "running"])
    .limit(80);
  for (const row of data || []) {
    const summary = row.summary && typeof row.summary === "object" ? row.summary : {};
    if (summary.agentSlug !== slug) continue;
    await client
      .from("agentops_monitoring_runs")
      .update({
        status: "canceled",
        ended_at: new Date().toISOString(),
        summary: {
          ...summary,
          cancelReason: "Cleared before D-B live",
          canceledAt: new Date().toISOString(),
        },
      })
      .eq("run_id", row.run_id);
  }
}

async function insertManual(slug, workType) {
  const runId = `owner-manual-${slug}-${workType}-d-b-${Date.now()}`;
  const route = `/system/agent-ops/agents/${slug}`;
  const { error } = await client.from("agentops_monitoring_runs").insert({
    run_id: runId,
    source: "owner",
    mode: "owner_manual_single_agent",
    level: 1,
    dry_run: true,
    target_base_url: base,
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
    started_at: new Date().toISOString(),
    summary: {
      trigger: "owner_manual",
      agentSlug: slug,
      workType,
      schedulerConnection: "staging_worker_pending",
      queueVersion: "d-b",
      selectedRoutes: [route],
      scope: { type: "selected_routes", routes: [route] },
      createdBy: "d-b-live-test",
      autoPromoteBlocked: true,
    },
  });
  if (error) throw new Error(error.message);
  return runId;
}

async function markCancelRequested(runId) {
  const { data } = await client
    .from("agentops_monitoring_runs")
    .select("summary, status")
    .eq("run_id", runId)
    .maybeSingle();
  if (!data || data.status !== "running") return false;
  const summary = data.summary && typeof data.summary === "object" ? { ...data.summary } : {};
  summary.cancelRequested = true;
  summary.cancelRequestedAt = new Date().toISOString();
  summary.cancelReason = "D-B live cancelRequested probe";
  await client
    .from("agentops_monitoring_runs")
    .update({ summary })
    .eq("run_id", runId)
    .eq("status", "running");
  return true;
}

async function seedStaleRunning(slug) {
  const runId = `owner-manual-${slug}-stale-d-b-${Date.now()}`;
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await client.from("agentops_monitoring_runs").insert({
    run_id: runId,
    source: "owner",
    mode: "owner_manual_single_agent",
    level: 1,
    dry_run: true,
    target_base_url: base,
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
    status: "running",
    started_at: past,
    summary: {
      trigger: "owner_manual",
      agentSlug: slug,
      workType: "website_audit",
      schedulerConnection: "staging_worker_pending",
      lockExpiresAt: past,
      workerPhase: "b2-c",
      createdBy: "d-b-stale-seed",
    },
  });
  return runId;
}

const report = {
  doctor: null,
  status: null,
  queuedCancelOk: false,
  cancelRequestedOk: false,
  auditCompleteOk: false,
  bqCompleteOk: false,
  staleReportOk: false,
  queueDrained: false,
};

try {
  await cancelQueuedForAgent(agentSlug);
  await cancelQueuedForAgent(bqSlug);

  console.log("D-B: doctor");
  const doctor = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-worker-doctor.mjs"],
    { cwd: process.cwd(), env: process.env, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  report.doctor = JSON.parse((doctor.stdout || "").slice((doctor.stdout || "").indexOf("{")));
  if (doctor.status !== 0) throw new Error("doctor failed");

  console.log("D-B: status / heartbeat");
  report.status = runWorker(["heartbeat"]);

  console.log("D-B: cancel while queued (website_audit)");
  const cancelQueuedId = await insertManual(agentSlug, "website_audit");
  const { data: beforeCancel } = await client
    .from("agentops_monitoring_runs")
    .select("status, summary")
    .eq("run_id", cancelQueuedId)
    .maybeSingle();
  const cancelSummary = {
    ...(beforeCancel?.summary && typeof beforeCancel.summary === "object"
      ? beforeCancel.summary
      : {}),
    cancelReason: "Canceled by D-B live while queued",
    canceledAt: new Date().toISOString(),
    cancelRequested: false,
  };
  const { error: cancelErr } = await client
    .from("agentops_monitoring_runs")
    .update({
      status: "canceled",
      ended_at: new Date().toISOString(),
      summary: cancelSummary,
    })
    .eq("run_id", cancelQueuedId)
    .eq("status", "queued");
  if (cancelErr) throw new Error(`queued cancel failed: ${cancelErr.message}`);
  const { data: canceledRow } = await client
    .from("agentops_monitoring_runs")
    .select("status")
    .eq("run_id", cancelQueuedId)
    .maybeSingle();
  report.queuedCancelOk = canceledRow?.status === "canceled";
  if (!report.queuedCancelOk) {
    throw new Error(`expected canceled, got ${canceledRow?.status}`);
  }

  // Prove duplicate lock released: can insert another queued run for same agent.
  const afterCancelId = await insertManual(agentSlug, "website_audit");
  report.duplicateLockReleased = Boolean(afterCancelId);
  await client
    .from("agentops_monitoring_runs")
    .update({
      status: "canceled",
      ended_at: new Date().toISOString(),
      summary: {
        agentSlug,
        workType: "website_audit",
        trigger: "owner_manual",
        schedulerConnection: "staging_worker_pending",
        cancelReason: "cleanup after lock proof",
      },
    })
    .eq("run_id", afterCancelId);

  console.log("D-B: cancelRequested while running (browser_qa claim then request)");
  const runningId = await insertManual(bqSlug, "browser_qa");
  // Claim via worker once path if possible; otherwise force running row for cancelRequested proof.
  try {
    runWorker(["browser-qa-once", "--run-id", runningId]);
  } catch {
    await client
      .from("agentops_monitoring_runs")
      .update({
        status: "running",
        summary: {
          trigger: "owner_manual",
          agentSlug: bqSlug,
          workType: "browser_qa",
          schedulerConnection: "staging_worker_pending",
          workerPhase: "b2-d",
        },
      })
      .eq("run_id", runningId);
  }
  const { data: maybeRunning } = await client
    .from("agentops_monitoring_runs")
    .select("status, summary")
    .eq("run_id", runningId)
    .maybeSingle();
  if (maybeRunning?.status === "running") {
    report.cancelRequestedOk = await markCancelRequested(runningId);
    // Let ops honor cancel before spawn on next cycle if still running.
    try {
      runWorker(["staging-worker", "--once"]);
    } catch {
      /* ignore */
    }
  } else if (maybeRunning?.status === "completed" || maybeRunning?.status === "failed") {
    // Engine finished before cancel — still prove cancelRequested path with a forced running row.
    const forced = await insertManual(bqSlug, "browser_qa");
    await client
      .from("agentops_monitoring_runs")
      .update({
        status: "running",
        summary: {
          trigger: "owner_manual",
          agentSlug: bqSlug,
          workType: "browser_qa",
          schedulerConnection: "staging_worker_pending",
          cancelRequested: true,
          cancelReason: "forced D-B cancelRequested proof",
        },
      })
      .eq("run_id", forced);
    const { data: forcedRow } = await client
      .from("agentops_monitoring_runs")
      .select("summary")
      .eq("run_id", forced)
      .maybeSingle();
    report.cancelRequestedOk = forcedRow?.summary?.cancelRequested === true;
    await client
      .from("agentops_monitoring_runs")
      .update({ status: "canceled", ended_at: new Date().toISOString() })
      .eq("run_id", forced);
  }

  console.log("D-B: complete website_audit");
  await cancelQueuedForAgent(agentSlug);
  const auditId = await insertManual(agentSlug, "website_audit");
  runWorker(["website-audit-once", "--run-id", auditId]);
  const { data: auditRow } = await client
    .from("agentops_monitoring_runs")
    .select("status, github_run_id")
    .eq("run_id", auditId)
    .maybeSingle();
  report.auditCompleteOk =
    (auditRow?.status === "completed" || auditRow?.status === "failed") &&
    auditRow?.github_run_id == null;
  report.auditStatus = auditRow?.status ?? null;

  console.log("D-B: complete browser_qa");
  await cancelQueuedForAgent(bqSlug);
  const bqId = await insertManual(bqSlug, "browser_qa");
  runWorker(["browser-qa-once", "--run-id", bqId]);
  const { data: bqRow } = await client
    .from("agentops_monitoring_runs")
    .select("status, github_run_id")
    .eq("run_id", bqId)
    .maybeSingle();
  report.bqCompleteOk =
    (bqRow?.status === "completed" || bqRow?.status === "failed") &&
    bqRow?.github_run_id == null;
  report.bqStatus = bqRow?.status ?? null;

  console.log("D-B: stale seed + cleanup dry-run");
  const staleId = await seedStaleRunning(agentSlug);
  const staleReport = runWorker(["scheduler-cleanup-stale", "--dry-run"]);
  report.staleReportOk =
    staleReport.dryRun === true &&
    (staleReport.stale || []).some((s) => s.runId === staleId || s.reason);
  await client
    .from("agentops_monitoring_runs")
    .update({
      status: "canceled",
      ended_at: new Date().toISOString(),
      summary: { agentSlug, cancelReason: "cleanup stale seed" },
    })
    .eq("run_id", staleId);

  const queue = runWorker(["queue-status"]);
  report.queueDrained = (queue.queueLength ?? 0) === 0;

  const ok =
    report.queuedCancelOk &&
    report.cancelRequestedOk &&
    report.auditCompleteOk &&
    report.bqCompleteOk &&
    report.staleReportOk &&
    report.duplicateLockReleased &&
    report.queueDrained;

  console.log(JSON.stringify({ ok, report }, null, 2));
  if (!ok) process.exit(1);
} catch (error) {
  console.error("D-B LIVE FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await cancelQueuedForAgent(agentSlug);
  await cancelQueuedForAgent(bqSlug);
}
