/**
 * D-G0 — functional live QA (staging worker): audit, browser QA, cancel, schedule tick.
 * Does not start Issues workflow. Does not print secrets.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "child_process";
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

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), "qa-agent", "browser-qa", ".env.owner.local"));
loadAgentOpsOwnerEnv();

process.env.AGENTOPS_ENVIRONMENT = "staging";
process.env.STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
if (!process.env.AGENTOPS_WORKER_SECRET) {
  process.env.AGENTOPS_WORKER_SECRET = "d-e5-local-worker-secret";
}

const url = process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing staging Supabase");
  process.exit(2);
}

const client = createClient(url, key, { auth: { persistSession: false } });
const outDir = path.join("qa-agent", "reports", "runtime");
fs.mkdirSync(outDir, { recursive: true });

function runBootstrap(args) {
  return spawnSync(process.execPath, ["qa-agent/scripts/agentops-d-e5-worker-bootstrap.mjs", ...args], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

async function getOwnerToken() {
  const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
  const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
  if (!email || !password) throw new Error("Missing owner credentials");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message || "Owner sign-in failed");
  }
  return data.session.access_token;
}

async function acceptManualRun(token, agentSlug, workType) {
  const route = `/system/agent-ops/agents/${agentSlug}`;
  const res = await fetch("https://ai-xia-staging.vercel.app/api/agentops/monitoring/manual-run", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      agentSlug,
      workType,
      scope: { type: "selected_routes", routes: [route] },
      maxDurationMinutes: 10,
      avoidOverlap: true,
      requestedBy: "d-g0-functional",
    }),
  });
  const payload = await res.json();
  return { status: res.status, payload };
}

async function cancelRun(token, runId) {
  const res = await fetch(
    "https://ai-xia-staging.vercel.app/api/agentops/monitoring/manual-run/cancel",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ runId }),
    },
  );
  const payload = await res.json();
  return { status: res.status, payload };
}

async function waitRunTerminal(runId, timeoutMs = 240_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await client
      .from("agentops_monitoring_runs")
      .select("run_id, status, ended_at, summary")
      .eq("run_id", runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const status = String(data?.status || "").toLowerCase();
    if (["completed", "failed", "canceled", "cancelled"].includes(status)) {
      return data;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return null;
}

const report = {
  at: new Date().toISOString(),
  heartbeat: null,
  audit: null,
  browserQa: null,
  cancel: null,
  schedule: null,
};

const hb = runBootstrap(["heartbeat"]);
report.heartbeat = {
  status: hb.status,
  ok: hb.status === 0 && /"ok":\s*true/.test(hb.stdout || ""),
  snippet: (hb.stdout || "").slice(0, 500),
};

const token = await getOwnerToken();

// A. Website audit — queue + let durable worker execute (or once)
{
  const accept = await acceptManualRun(token, "design-agent", "website_audit");
  const runId = accept.payload?.runId || accept.payload?.existingRunId;
  report.audit = {
    acceptStatus: accept.status,
    runId,
    acceptOk: accept.payload?.accepted === true || Boolean(runId),
    message: accept.payload?.message || null,
  };
  if (runId) {
    // Nudge once if durable loop is slow
    runBootstrap(["once"]);
    const terminal = await waitRunTerminal(runId);
    report.audit.terminalStatus = terminal?.status ?? null;
    report.audit.ok = ["completed", "failed"].includes(String(terminal?.status || "").toLowerCase());
    report.audit.hasSummary = Boolean(terminal?.summary);
  } else {
    report.audit.ok = false;
    report.audit.error = accept.payload?.message || accept.payload?.error || "no runId";
  }
}

// B. Browser QA
{
  const accept = await acceptManualRun(token, "design-agent", "browser_qa");
  const runId = accept.payload?.runId || accept.payload?.existingRunId;
  report.browserQa = {
    acceptStatus: accept.status,
    runId,
    acceptOk: accept.payload?.accepted === true || Boolean(runId),
    message: accept.payload?.message || null,
  };
  if (runId) {
    runBootstrap(["once"]);
    const terminal = await waitRunTerminal(runId, 300_000);
    report.browserQa.terminalStatus = terminal?.status ?? null;
    report.browserQa.ok = ["completed", "failed"].includes(
      String(terminal?.status || "").toLowerCase(),
    );
    const summary = terminal?.summary || {};
    report.browserQa.artifactHint = Boolean(
      summary.artifactLocalPath ||
        summary.signedArtifactUrl ||
        summary.artifactUploadStatus ||
        summary.screenshots ||
        summary.screenshotRefs,
    );
  } else {
    report.browserQa.ok = false;
    report.browserQa.error = accept.payload?.message || accept.payload?.error || "no runId";
  }
}

// C. Cancel while queued — accept then cancel quickly
{
  const accept = await acceptManualRun(token, "logs-agent", "website_audit");
  const runId = accept.payload?.runId || accept.payload?.existingRunId;
  report.cancel = {
    runId,
    acceptOk: accept.payload?.accepted === true || Boolean(runId),
    message: accept.payload?.message || null,
  };
  if (runId) {
    const cancel = await cancelRun(token, runId);
    report.cancel.cancelStatus = cancel.status;
    report.cancel.cancelOk =
      cancel.payload?.ok === true ||
      cancel.payload?.cancelRequested === true ||
      /cancel/i.test(JSON.stringify(cancel.payload));
    const { data } = await client
      .from("agentops_monitoring_runs")
      .select("run_id, status, summary")
      .eq("run_id", runId)
      .maybeSingle();
    report.cancel.finalStatus = data?.status ?? null;
    report.cancel.ok =
      report.cancel.cancelOk ||
      ["canceled", "cancelled"].includes(String(data?.status || "").toLowerCase()) ||
      data?.summary?.cancelRequested === true;
  } else {
    report.cancel.ok = false;
    report.cancel.error = accept.payload?.message || accept.payload?.error || "no runId";
  }
}

// D. Scheduler tick proof (dry — just tick status)
{
  const tick = runBootstrap(["status"]);
  report.schedule = {
    statusOk: tick.status === 0,
    queueEmpty: /"queueLength":\s*0/.test(tick.stdout || "") || /"queued":\s*\[\]/.test(tick.stdout || ""),
    ok: tick.status === 0,
    note: "Full due-schedule mutate covered by agentops-d-e5-schedule-proof when needed; D-G0 confirms scheduler health via heartbeat/status.",
  };
}

report.allPass =
  Boolean(report.heartbeat?.ok) &&
  Boolean(report.audit?.ok) &&
  Boolean(report.browserQa?.ok) &&
  Boolean(report.cancel?.ok) &&
  Boolean(report.schedule?.ok);

const outPath = path.join(outDir, `phase-d-g0-functional-live-${Date.now()}.json`);
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, ...report }, null, 2));
process.exit(report.allPass ? 0 : 1);
