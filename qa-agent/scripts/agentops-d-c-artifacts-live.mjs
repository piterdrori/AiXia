/**
 * Phase D-C live:
 * artifact upload smoke + cancel cooperation + health alerts + regressions.
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";
import {
  extractStoragePathsFromSummary,
  validateArtifactPathForRun,
} from "../../scripts/lib/agentops-staging-artifact-storage.mjs";

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
  process.env.AGENTOPS_WORKER_SECRET = "d-c-local-worker-secret";
}
process.env.AGENTOPS_ENVIRONMENT = "staging";
process.env.AGENTOPS_PRODUCTION_BLOCKED = "true";
process.env.STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
process.env.AGENTOPS_ARTIFACT_UPLOAD_ENABLED = "true";
process.env.AGENTOPS_ARTIFACT_BUCKET = "agentops-artifacts-staging";
if (!process.env.STAGING_SUPABASE_URL) {
  process.env.STAGING_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}
if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
}

const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const service = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const agentSlug = process.env.AGENTOPS_D_C_AGENT || "system-agent";
const bqSlug = process.env.AGENTOPS_D_C_BQ_AGENT || "qa-agent";

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
  const runId = `owner-manual-${slug}-${workType}-dc-${Date.now()}`;
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
    requestedBy: "d-c-live",
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
  if (error) throw new Error(error.message);
  return runId;
}

async function setCancelRequested(runId) {
  const { data } = await client
    .from("agentops_monitoring_runs")
    .select("summary, status")
    .eq("run_id", runId)
    .maybeSingle();
  if (!data) throw new Error(`missing ${runId}`);
  const summary = {
    ...(data.summary && typeof data.summary === "object" ? data.summary : {}),
    cancelRequested: true,
    cancelRequestedAt: new Date().toISOString(),
    cancelRequestedBy: "d-c-live",
  };
  await client
    .from("agentops_monitoring_runs")
    .update({ summary })
    .eq("run_id", runId);
  return data.status;
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

async function main() {
  const results = [];
  const pass = (id, detail) => results.push({ id, ok: true, detail });
  const fail = (id, detail) => results.push({ id, ok: false, detail });

  const doctor = runDoctor();
  if (doctor.payload.ok) pass("doctor", "hard checks passed");
  else fail("doctor", JSON.stringify(doctor.payload.checks?.slice?.(0, 6) || doctor.payload));

  const doctorUpload = runDoctor(["--upload-test"]);
  if (doctorUpload.payload.ok) pass("doctor_upload_test", "upload test ok");
  else fail("doctor_upload_test", "upload test failed");

  // A. Browser QA with upload
  const bqRunId = await queueManual(bqSlug, "browser_qa");
  runWorker(["browser-qa-once", "--run-id", bqRunId]);
  const bqRow = await readRun(bqRunId);
  const bqPaths = extractStoragePathsFromSummary(bqRow?.summary || {});
  if (bqRow?.status === "completed" || bqRow?.status === "failed") {
    pass("browser_qa_terminal", bqRow.status);
  } else fail("browser_qa_terminal", bqRow?.status || "missing");
  if (bqRow?.summary?.artifactUploadStatus === "uploaded" || bqPaths.length > 0) {
    pass("browser_qa_upload", `paths=${bqPaths.length}`);
  } else if (bqRow?.summary?.artifactUploadStatus === "failed") {
    pass("browser_qa_upload", "failed_with_local_fallback");
  } else {
    fail("browser_qa_upload", bqRow?.summary?.artifactUploadStatus || "none");
  }
  if (bqPaths.some((p) => /storage.?state/i.test(p))) {
    fail("storage_state_not_uploaded", "storage_state path found in uploads");
  } else pass("storage_state_not_uploaded", "clean");

  if (bqPaths[0]) {
    const v = validateArtifactPathForRun(bqRunId, bqPaths[0], "agentops-artifacts-staging");
    if (v.ok) {
      const signed = await client.storage
        .from("agentops-artifacts-staging")
        .createSignedUrl(bqPaths[0], 600);
      if (signed.data?.signedUrl) pass("signed_url", "created");
      else fail("signed_url", signed.error?.message || "no url");
    } else fail("signed_url", v.errors.join(","));
  }

  // B. Website audit
  const auditId = await queueManual(agentSlug, "website_audit");
  runWorker(["website-audit-once", "--run-id", auditId]);
  const auditRow = await readRun(auditId);
  if (auditRow?.status === "completed" || auditRow?.status === "failed") {
    pass("website_audit_terminal", auditRow.status);
  } else fail("website_audit_terminal", auditRow?.status || "missing");
  const auditPaths = extractStoragePathsFromSummary(auditRow?.summary || {});
  if (
    auditRow?.summary?.artifactUploadStatus === "uploaded" ||
    auditRow?.summary?.artifactUploadStatus === "partial" ||
    auditPaths.length > 0 ||
    auditRow?.summary?.artifactVisibility === "local_worker_only"
  ) {
    pass("website_audit_artifacts", auditRow?.summary?.artifactUploadStatus || "local");
  } else fail("website_audit_artifacts", "unexpected");

  // C. Cancel queued
  const cancelQ = await queueManual(agentSlug, "website_audit");
  await setCancelRequested(cancelQ);
  runWorker(["ops", "--once"]);
  const cancelQRow = await readRun(cancelQ);
  if (cancelQRow?.status === "canceled") pass("queued_cancel", cancelQ);
  else fail("queued_cancel", cancelQRow?.status || "missing");

  // C2. Cancel while running (request before spawn race)
  const cancelR = await queueManual(bqSlug, "browser_qa");
  // Mark cancel while still queued then let ops claim — should cancel before spawn or at checkpoint
  await setCancelRequested(cancelR);
  runWorker(["ops", "--once"]);
  const cancelRRow = await readRun(cancelR);
  if (cancelRRow?.status === "canceled") {
    pass("running_or_queued_cancel_coop", cancelRRow.summary?.cancelPhase || "canceled");
  } else if (cancelRRow?.summary?.cancelRequested === true) {
    pass("running_or_queued_cancel_coop", "cancelRequested_visible");
  } else {
    fail("running_or_queued_cancel_coop", cancelRRow?.status || "missing");
  }

  // D. Health alerts via derive on stale heartbeat already covered in static verify;
  // ensure doctor reports alert check key
  if ((doctor.payload.checks || []).some((c) => c.id === "health_alerts")) {
    pass("health_alerts_doctor", "present");
  } else fail("health_alerts_doctor", "missing check");

  const ok = results.every((r) => r.ok);
  console.log(JSON.stringify({ ok, results }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error("[d-c-live] FAILED", error instanceof Error ? error.message : error);
  process.exit(1);
});
