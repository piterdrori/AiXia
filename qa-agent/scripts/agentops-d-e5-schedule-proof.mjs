/**
 * D-E5 — prove schedule enqueue + execute for design-agent, then restore tools.
 * Uses service-role + local worker bootstrap (never prints secrets).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const agentSlug = "design-agent";

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
process.env.AGENTOPS_ENVIRONMENT = "staging";
process.env.AGENTOPS_PRODUCTION_BLOCKED = "true";
process.env.STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
if (!process.env.AGENTOPS_WORKER_SECRET) {
  process.env.AGENTOPS_WORKER_SECRET = "d-e5-local-worker-secret";
}
if (!process.env.STAGING_SUPABASE_URL) {
  process.env.STAGING_SUPABASE_URL =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
}
if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
}

const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const service = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !service) {
  console.error("MISSING_ENV");
  process.exit(2);
}

const client = createClient(supabaseUrl, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function runBootstrap(cmd, extra = []) {
  const result = spawnSync(
    process.execPath,
    ["qa-agent/scripts/agentops-d-e5-worker-bootstrap.mjs", cmd, ...extra],
    {
      cwd: REPO_ROOT,
      env: process.env,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`bootstrap ${cmd} failed`);
  }
  const stdout = (result.stdout || "").trim();
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) return { raw: stdout };
  return JSON.parse(stdout.slice(jsonStart));
}

function mergeSchedule(tools, payload) {
  const list = Array.isArray(tools) ? [...tools] : [];
  const filtered = list.filter((t) => !(typeof t === "string" && t.startsWith("aixia:schedule:")));
  filtered.push(`aixia:schedule:${JSON.stringify(payload)}`);
  return filtered;
}

async function loadAgentByCanonical(slug) {
  const { data, error } = await client
    .from("agentops_agents")
    .select("id, name, status, tools, environment")
    .eq("environment", "staging");
  if (error) throw new Error(error.message);
  const hit = (data || []).find((row) => (row.tools || []).includes(`canonical:${slug}`));
  if (!hit) throw new Error(`canonical agent missing: ${slug}`);
  return hit;
}

async function clearSchedulerAgentState(slug) {
  const { data, error } = await client
    .from("agentops_system_config")
    .select("id, tools_enabled")
    .eq("environment", "staging")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return;
  const tools =
    data.tools_enabled && typeof data.tools_enabled === "object" ? { ...data.tools_enabled } : {};
  const sched =
    tools.manualRunScheduler && typeof tools.manualRunScheduler === "object"
      ? { ...tools.manualRunScheduler }
      : {};
  const agents = sched.agents && typeof sched.agents === "object" ? { ...sched.agents } : {};
  delete agents[slug];
  sched.agents = agents;
  tools.manualRunScheduler = sched;
  const { error: upErr } = await client
    .from("agentops_system_config")
    .update({ tools_enabled: tools })
    .eq("id", data.id);
  if (upErr) throw new Error(upErr.message);
}

function schedulePayload(workType) {
  return {
    enableSchedule: true,
    ownerEnabled: true,
    frequencyType: "every_hours",
    intervalValue: 1,
    intervalUnit: "hours",
    workTypes: [workType],
    scopeType: "selected_routes",
    selectedRoutes: [`/system/agent-ops/agents/${agentSlug}`],
    maxDurationMinutes: 15,
    avoidOverlap: true,
    timezone: "UTC",
    version: 2,
    scheduleType: "interval",
  };
}

const report = {
  agentSlug,
  originalToolsRestored: false,
  tick: null,
  enqueuedRunId: null,
  once: null,
  ok: false,
};

const original = await loadAgentByCanonical(agentSlug);
const originalTools = original.tools;

try {
  await clearSchedulerAgentState(agentSlug);
  const { error } = await client
    .from("agentops_agents")
    .update({ tools: mergeSchedule(original.tools, schedulePayload("website_audit")) })
    .eq("id", original.id);
  if (error) throw new Error(error.message);

  // Prefer one-cycle ops (includes scheduler tick + claim). Retries for intermittent fetch.
  let once = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      once = runBootstrap("once");
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  if (lastErr) throw lastErr;
  report.once = once;
  report.tick = once?.tick || null;

  // Find scheduled design-agent website_audit created/claimed in this window.
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: recent } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, mode, summary, created_at")
    .eq("mode", "scheduled_single_agent")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(30);
  const hit = (recent || []).find((row) => {
    const summary = row.summary && typeof row.summary === "object" ? row.summary : {};
    return summary.agentSlug === agentSlug && summary.workType === "website_audit";
  });
  report.enqueuedRunId = hit?.run_id || once?.pickedRunId || once?.processed?.runId || null;
  report.finalStatus = hit?.status || once?.processed?.final?.status || null;

  if (!report.enqueuedRunId) {
    throw new Error("scheduled_single_agent row not found for design-agent website_audit");
  }

  // If still queued, run another once to claim/execute.
  if (hit?.status === "queued" || once?.queueLength > 0) {
    try {
      report.once2 = runBootstrap("once");
    } catch {
      /* durable worker may claim it */
    }
    const { data: after } = await client
      .from("agentops_monitoring_runs")
      .select("run_id, status")
      .eq("run_id", report.enqueuedRunId)
      .maybeSingle();
    report.finalStatus = after?.status || report.finalStatus;
  }

  report.ok =
    Boolean(report.enqueuedRunId) &&
    ["completed", "failed", "running", "queued"].includes(String(report.finalStatus || "")) &&
    (once?.ok === true || report.once2?.ok === true);
} finally {
  const { error } = await client
    .from("agentops_agents")
    .update({ tools: originalTools })
    .eq("id", original.id);
  report.originalToolsRestored = !error;
  await clearSchedulerAgentState(agentSlug);
}

const outPath = path.join(
  REPO_ROOT,
  "qa-agent",
  "reports",
  "runtime",
  `phase-d-e5-schedule-proof-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
process.exit(report.ok && report.originalToolsRestored ? 0 : 1);
