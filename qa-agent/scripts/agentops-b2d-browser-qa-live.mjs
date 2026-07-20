/**
 * Fix B2-D live: heartbeat → capability → queue browser_qa → browser-qa-once → status.
 * Also smoke-checks websiteAudit.available remains true.
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
  process.env.AGENTOPS_WORKER_SECRET = "b2d-local-worker-secret";
}
process.env.AGENTOPS_ENVIRONMENT = "staging";
process.env.AGENTOPS_PRODUCTION_BLOCKED = "true";
process.env.AGENTOPS_RUNTIME_ALLOW_REMOTE_STAGING = "true";
process.env.STAGING_APP_URL =
  process.env.STAGING_APP_URL || "https://ai-xia-staging.vercel.app";
if (!process.env.STAGING_SUPABASE_URL) {
  process.env.STAGING_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}
if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
}

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const service = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const agentSlug = process.env.AGENTOPS_B2D_AGENT_SLUG || "system-agent";
const route =
  process.env.AGENTOPS_B2D_ROUTE || `/system/agent-ops/agents/${agentSlug}`;

if (!email || !password || !supabaseUrl || !anon || !service) {
  console.error("MISSING_ENV");
  process.exit(2);
}

function runWorker(args) {
  const result = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-manual-run-worker.mjs", ...args],
    { cwd: process.cwd(), env: process.env, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`worker failed: ${args.join(" ")}`);
  }
  const stdout = (result.stdout || "").trim();
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`worker produced no JSON: ${args.join(" ")}`);
  }
  return JSON.parse(stdout.slice(jsonStart));
}

const hb = runWorker(["heartbeat"]);
console.log("HEARTBEAT", JSON.stringify(hb.health, null, 2));

const capRes = await fetch(`${base}/api/agentops/monitoring/manual-run/capability`);
const cap = await capRes.json();
console.log("CAPABILITY", JSON.stringify(cap.capability, null, 2));

if (
  !cap.capability?.workerConnected ||
  !cap.capability?.websiteAudit?.available ||
  !cap.capability?.browserQa?.available
) {
  console.error("CAPABILITY_NOT_READY — deploy B2-D API first, then re-heartbeat.");
  process.exit(3);
}

const authClient = createClient(supabaseUrl, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: signed, error: signErr } = await authClient.auth.signInWithPassword({
  email,
  password,
});
if (signErr || !signed.session?.access_token) {
  console.error("SIGNIN_FAIL", signErr?.message);
  process.exit(2);
}
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${signed.session.access_token}`,
};

const admin = createClient(supabaseUrl, service, { auth: { persistSession: false } });
const { data: activeRows } = await admin
  .from("agentops_monitoring_runs")
  .select("run_id, status, summary")
  .eq("mode", "owner_manual_single_agent")
  .in("status", ["queued", "running"])
  .limit(40);
for (const row of activeRows || []) {
  const summary = row.summary && typeof row.summary === "object" ? row.summary : {};
  if (summary.agentSlug === agentSlug) {
    await admin
      .from("agentops_monitoring_runs")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        summary: {
          ...summary,
          failureReason: "Cleared stale active run before B2-D live proof.",
          b2dPreflightCleanup: true,
        },
      })
      .eq("run_id", row.run_id);
  }
}

const acceptRes = await fetch(`${base}/api/agentops/monitoring/manual-run`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    agentSlug,
    workType: "browser_qa",
    scope: {
      type: "selected_routes",
      routes: [route],
    },
    maxDurationMinutes: 15,
    avoidOverlap: true,
  }),
});
const accept = await acceptRes.json();
console.log("ACCEPT", acceptRes.status, JSON.stringify(accept, null, 2));
if (!accept.accepted || !accept.runId) {
  process.exit(4);
}

const dupRes = await fetch(`${base}/api/agentops/monitoring/manual-run`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    agentSlug,
    workType: "browser_qa",
    scope: {
      type: "selected_routes",
      routes: [route],
    },
    maxDurationMinutes: 15,
    avoidOverlap: true,
  }),
});
const dup = await dupRes.json();
console.log("DUPLICATE", dupRes.status, JSON.stringify(dup, null, 2));
if (dupRes.status !== 409) {
  console.error("EXPECTED_409_DUPLICATE");
  process.exit(5);
}

const exec = runWorker(["browser-qa-once", "--run-id", accept.runId]);
console.log("EXECUTE", JSON.stringify(exec, null, 2));

const statusRes = await fetch(
  `${base}/api/agentops/monitoring/manual-run?runId=${encodeURIComponent(accept.runId)}`,
  { headers },
);
const status = await statusRes.json();
console.log("STATUS", statusRes.status, JSON.stringify(status, null, 2));

const { data: dbRow } = await admin
  .from("agentops_monitoring_runs")
  .select("run_id, status, duration_ms, findings_count, errors_count, github_run_id, summary")
  .eq("run_id", accept.runId)
  .maybeSingle();
console.log("DB_ROW", JSON.stringify(dbRow, null, 2));

const ok =
  (dbRow?.status === "completed" || dbRow?.status === "failed") &&
  dbRow?.summary?.workerPhase === "b2-d" &&
  dbRow?.summary?.executionEngine === "browser_qa" &&
  dbRow?.github_run_id == null &&
  typeof dbRow?.duration_ms === "number" &&
  Array.isArray(dbRow?.summary?.selectedRoutes);

console.log(
  JSON.stringify(
    {
      LIVE_OK: ok,
      runId: accept.runId,
      status: dbRow?.status,
      durationMs: dbRow?.duration_ms,
      route: dbRow?.summary?.route ?? dbRow?.summary?.selectedRoutes?.[0] ?? null,
      findingsCount: dbRow?.findings_count,
      screenshots: Array.isArray(dbRow?.summary?.screenshotRefs)
        ? dbRow.summary.screenshotRefs.length
        : 0,
      websiteAuditStillAvailable: Boolean(cap.capability?.websiteAudit?.available),
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
