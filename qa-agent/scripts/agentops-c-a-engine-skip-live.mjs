/**
 * Fix C-A — engine unavailable skip smoke (staging only).
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

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
process.env.AGENTOPS_ENVIRONMENT = "staging";
process.env.AGENTOPS_PRODUCTION_BLOCKED = "true";
process.env.STAGING_APP_URL =
  process.env.STAGING_APP_URL || "https://ai-xia-staging.vercel.app";
if (!process.env.STAGING_SUPABASE_URL) {
  process.env.STAGING_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}
if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
}
if (!process.env.AGENTOPS_WORKER_SECRET) {
  process.env.AGENTOPS_WORKER_SECRET = "c-a-engine-skip";
}

const client = createClient(
  process.env.STAGING_SUPABASE_URL,
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function runWorker(args) {
  const result = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-manual-run-worker.mjs", ...args],
    { cwd: process.cwd(), env: process.env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error(`worker failed: ${args.join(" ")}`);
  }
  const stdout = (result.stdout || "").trim();
  return JSON.parse(stdout.slice(stdout.indexOf("{")));
}

const { data: row } = await client
  .from("agentops_system_config")
  .select("id, tools_enabled")
  .eq("environment", "staging")
  .limit(1)
  .maybeSingle();

const tools = { ...(row.tools_enabled || {}) };
const prevWorker = { ...(tools.manualRunWorker || {}) };
const prevWebsite = prevWorker.websiteAuditEngine;
const prevBrowser = prevWorker.browserQaEngine;
tools.manualRunWorker = {
  ...prevWorker,
  connected: true,
  lastHeartbeatAt: new Date().toISOString(),
  websiteAuditEngine: {
    connected: false,
    version: "b2-c",
    reason: "Engine not connected",
  },
  browserQaEngine: prevBrowser,
};
const sched = { ...(tools.manualRunScheduler || {}) };
const agents = { ...(sched.agents || {}) };
delete agents["analytics-agent"];
sched.agents = agents;
tools.manualRunScheduler = sched;
await client.from("agentops_system_config").update({ tools_enabled: tools }).eq("id", row.id);

const { data: agentsRows } = await client
  .from("agentops_agents")
  .select("id, status, tools")
  .eq("environment", "staging");
const analytics = (agentsRows || []).find((a) =>
  (a.tools || []).includes("canonical:analytics-agent"),
);
const origTools = analytics.tools;
const origStatus = analytics.status;

// Clear leftover active runs from prior probes.
{
  const { data: active } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, summary")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .in("status", ["queued", "running"])
    .limit(80);
  for (const row of active || []) {
    const summary = row.summary && typeof row.summary === "object" ? row.summary : {};
    if (summary.agentSlug !== "analytics-agent") continue;
    await client
      .from("agentops_monitoring_runs")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        summary: {
          ...summary,
          cancelledBy: "c-a-engine-skip-cleanup",
          lastError: "Cancelled by Fix C-A engine-skip live cleanup",
        },
      })
      .eq("run_id", row.run_id);
  }
}

const schedulePayload = {
  enableSchedule: true,
  ownerEnabled: true,
  frequencyType: "every_hours",
  intervalValue: 1,
  intervalUnit: "hours",
  workTypes: ["website_audit"],
  scopeType: "selected_routes",
  selectedRoutes: ["/system/agent-ops/agents/analytics-agent"],
  maxDurationMinutes: 10,
  timezone: "UTC",
  version: 2,
};
const filtered = (analytics.tools || []).filter(
  (t) => !(typeof t === "string" && t.startsWith("aixia:schedule:")),
);
filtered.push(`aixia:schedule:${JSON.stringify(schedulePayload)}`);
await client
  .from("agentops_agents")
  .update({ tools: filtered, status: "active" })
  .eq("id", analytics.id);

const tick = runWorker(["scheduler-tick"]);
const analyticsSkips = (tick.skipped || []).filter((s) => s.agentSlug === "analytics-agent");
const skipped = analyticsSkips.find((s) => s.reason === "Engine not connected");
const enqueued = (tick.enqueued || []).filter((e) => e.agentSlug === "analytics-agent");
const dueHit = (tick.due || []).find((d) => d.agentSlug === "analytics-agent");

const { data: row2 } = await client
  .from("agentops_system_config")
  .select("id, tools_enabled")
  .eq("environment", "staging")
  .limit(1)
  .maybeSingle();
const tools2 = { ...(row2.tools_enabled || {}) };
tools2.manualRunWorker = {
  ...(tools2.manualRunWorker || {}),
  websiteAuditEngine: prevWebsite,
  browserQaEngine: prevBrowser,
};
await client.from("agentops_system_config").update({ tools_enabled: tools2 }).eq("id", row2.id);
await client
  .from("agentops_agents")
  .update({ tools: origTools, status: origStatus })
  .eq("id", analytics.id);
runWorker(["heartbeat"]);

const ok = Boolean(skipped) && enqueued.length === 0;
console.log(
  JSON.stringify(
    {
      ok,
      skipped,
      analyticsSkips,
      dueHit: dueHit || null,
      enqueuedCount: enqueued.length,
      tickDueCount: tick.dueCount,
      tickEnqueuedCount: tick.enqueuedCount,
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
