/**
 * E-A3 — limited Browser QA via staging worker (not Vercel Playwright).
 * Routes: Issues list + known draft detail (+ optional promoted).
 */
import fs from "fs";
import path from "path";
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
const url = process.env.STAGING_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.STAGING_SUPABASE_ANON_KEY;
const service = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !url || !anon || !service) {
  console.error("MISSING_ENV");
  process.exit(2);
}

const client = createClient(url, service, { auth: { persistSession: false } });
const owner = createClient(url, anon, { auth: { persistSession: false } });

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
  if (jsonStart < 0) throw new Error("worker produced no JSON");
  return JSON.parse(stdout.slice(jsonStart));
}

async function token() {
  const { data, error } = await owner.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session.access_token;
}

async function wait(runId) {
  const startAt = Date.now();
  while (Date.now() - startAt < 300_000) {
    const { data } = await client
      .from("agentops_monitoring_runs")
      .select("run_id, status, summary")
      .eq("run_id", runId)
      .maybeSingle();
    const st = String(data?.status || "").toLowerCase();
    if (["completed", "failed", "canceled", "cancelled"].includes(st)) return data;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

const routes = [
  "/system/agent-ops/issues",
  "/system/agent-ops/issues/draft-21109c88-4ca6-4afa-9546-f7db66f8bc13",
  process.env.AGENTOPS_E_A3_PROMOTED_ROUTE || "/system/agent-ops/issues/BQA-F956B002",
];

const hb = runWorker(["heartbeat"]);
const capRes = await fetch(`${base}/api/agentops/monitoring/manual-run/capability`);
const cap = await capRes.json();
if (!cap.capability?.workerConnected || !cap.capability?.browserQa?.available) {
  console.error(
    JSON.stringify({
      ok: false,
      blocker: "Browser QA worker not available",
      heartbeat: hb.health ?? hb,
      capability: cap.capability ?? cap,
    }),
  );
  process.exit(3);
}

const tok = await token();
const results = [];

for (const route of routes) {
  const acceptRes = await fetch(`${base}/api/agentops/monitoring/manual-run`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${tok}`,
    },
    body: JSON.stringify({
      agentSlug: "qa-agent",
      workType: "browser_qa",
      scope: { type: "selected_routes", routes: [route] },
      maxDurationMinutes: 12,
      avoidOverlap: true,
      requestedBy: "e-a3-issues-acceptance",
    }),
  });
  const accept = await acceptRes.json();
  const runId = accept.runId;
  if (runId) {
    runWorker(["browser-qa-once"]);
  }
  const terminal = runId ? await wait(runId) : null;
  results.push({
    route,
    accepted: accept.accepted === true,
    runId: runId ?? null,
    message: accept.message ?? null,
    terminalStatus: terminal?.status ?? null,
    summarySnippet: terminal?.summary
      ? {
          findingCount: terminal.summary.findingCount ?? terminal.summary.findingsDetected ?? null,
          rawObs: (terminal.summary.rawObservations || []).slice(0, 6),
          failedRequests: (terminal.summary.failedRequests || []).slice(0, 4),
        }
      : null,
  });
}

const out = {
  at: new Date().toISOString(),
  base,
  workerOnline: true,
  ok: results.every((r) =>
    ["completed", "failed"].includes(String(r.terminalStatus || "").toLowerCase()),
  ),
  results,
};
const outPath = path.join(
  "qa-agent",
  "reports",
  "runtime",
  `phase-e-a3-browser-qa-limited-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ outPath, ...out }, null, 2));
process.exit(out.ok ? 0 : 1);
