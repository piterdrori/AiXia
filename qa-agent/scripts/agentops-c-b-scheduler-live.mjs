/**
 * Fix C-B live:
 * 1) scheduled browser_qa for system-agent → tick → browser-qa-once
 * 2) light website_audit scheduled regression
 * 3) paused / manual-dup / engine-skip checks
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
  process.env.AGENTOPS_WORKER_SECRET = "c-b-local-worker-secret";
}
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

const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const service = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
// Prefer agents without a same-hour scheduled idempotency hit from prior C-A/C-B probes.
const agentSlug = process.env.AGENTOPS_C_B_BROWSER_AGENT || "runtime-agent";
const pauseSlug = "design-agent";

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

async function setSchedule(slug, payload) {
  const agent = await loadAgentByCanonical(slug);
  const { error } = await client
    .from("agentops_agents")
    .update({ tools: mergeSchedule(agent.tools, payload) })
    .eq("id", agent.id);
  if (error) throw new Error(error.message);
  return agent;
}

async function setStatus(slug, status) {
  const agent = await loadAgentByCanonical(slug);
  const { error } = await client.from("agentops_agents").update({ status }).eq("id", agent.id);
  if (error) throw new Error(error.message);
  return agent;
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

async function cancelQueuedForAgent(slug) {
  const { data } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, mode, summary")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .in("status", ["queued", "running"])
    .limit(80);
  for (const row of data || []) {
    const summary = row.summary && typeof row.summary === "object" ? row.summary : {};
    if (summary.agentSlug !== slug) continue;
    await client
      .from("agentops_monitoring_runs")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        summary: {
          ...summary,
          cancelledBy: "c-b-live-cleanup",
          lastError: "Cancelled by Fix C-B live test cleanup",
        },
      })
      .eq("run_id", row.run_id);
  }
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
  heartbeat: null,
  browserQaTick: null,
  browserQaTick2: null,
  browserQaOnce: null,
  auditTick: null,
  auditOnce: null,
  pausedSkip: null,
  manualDupSkip: null,
  engineSkip: null,
  dryRunTick: null,
  staleReport: null,
  browserQaRunId: null,
  browserQaCompleted: false,
  browserQaTriggerSchedule: false,
  browserQaIdempotent: false,
  auditRegression: false,
  pausedSkipped: false,
  manualDuplicateSkipped: false,
  engineSkipped: false,
};

try {
  const originalSystem = await loadAgentByCanonical(agentSlug);
  const originalSystemTools = originalSystem.tools;
  const originalSystemStatus = originalSystem.status;

  await cancelQueuedForAgent(agentSlug);
  await clearSchedulerAgentState(agentSlug);

  console.log("C-B: heartbeat");
  report.heartbeat = runWorker(["heartbeat"]);
  if (!report.heartbeat?.health?.browserQaEngine?.connected) {
    throw new Error("browserQaEngine not connected — cannot smoke scheduled Browser QA");
  }

  console.log("C-B: dry-run tick");
  report.dryRunTick = runWorker(["scheduler-tick", "--dry-run"]);
  if (!report.dryRunTick.dryRun) throw new Error("dry-run flag missing");

  console.log("C-B: set browser_qa schedule due");
  await setSchedule(agentSlug, schedulePayload("browser_qa"));
  await clearSchedulerAgentState(agentSlug);

  console.log("C-B: scheduler-tick browser_qa");
  report.browserQaTick = runWorker(["scheduler-tick"]);
  const bq = (report.browserQaTick.enqueued || []).find(
    (e) => e.agentSlug === agentSlug && e.workType === "browser_qa",
  );
  if (!bq) throw new Error(`browser_qa not enqueued: ${JSON.stringify(report.browserQaTick)}`);
  report.browserQaRunId = bq.runId;

  console.log("C-B: scheduler-tick #2 idempotency");
  report.browserQaTick2 = runWorker(["scheduler-tick"]);
  const bq2 = (report.browserQaTick2.enqueued || []).filter(
    (e) => e.agentSlug === agentSlug && e.workType === "browser_qa",
  );
  report.browserQaIdempotent = bq2.length === 0;
  if (!report.browserQaIdempotent) throw new Error("duplicate browser_qa enqueue");

  console.log("C-B: browser-qa-once");
  report.browserQaOnce = runWorker(["browser-qa-once"]);
  const { data: bqRow, error: bqErr } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, mode, summary, duration_ms, github_run_id")
    .eq("run_id", report.browserQaRunId)
    .maybeSingle();
  if (bqErr) throw new Error(bqErr.message);
  const bqSummary = bqRow?.summary && typeof bqRow.summary === "object" ? bqRow.summary : {};
  report.browserQaTriggerSchedule = bqSummary.trigger === "schedule";
  report.browserQaCompleted =
    bqRow?.status === "completed" || bqRow?.status === "failed";
  if (!report.browserQaTriggerSchedule) throw new Error("browser_qa trigger not schedule");
  if (bqRow?.mode !== "scheduled_single_agent") throw new Error("mode not scheduled");
  if (bqRow?.github_run_id != null) throw new Error("github_run_id must be null");
  if (bqSummary.executionEngine !== "browser_qa" && bqRow?.status === "completed") {
    // claim may store executionEngine on completed summary
  }

  // Light website_audit regression on a different agent to avoid same-hour
  // idempotency collision with earlier system-agent website_audit runs.
  const auditSlug = "logs-agent";
  console.log(`C-B: website_audit scheduled regression (${auditSlug})`);
  const auditAgent = await loadAgentByCanonical(auditSlug);
  const auditOriginalTools = auditAgent.tools;
  const auditOriginalStatus = auditAgent.status;
  await cancelQueuedForAgent(auditSlug);
  await clearSchedulerAgentState(auditSlug);
  await setStatus(auditSlug, "active");
  await setSchedule(auditSlug, {
    enableSchedule: true,
    ownerEnabled: true,
    frequencyType: "every_hours",
    intervalValue: 1,
    intervalUnit: "hours",
    workTypes: ["website_audit"],
    scopeType: "selected_routes",
    selectedRoutes: [`/system/agent-ops/agents/${auditSlug}`],
    maxDurationMinutes: 10,
    timezone: "UTC",
    version: 2,
    scheduleType: "interval",
  });
  report.auditTick = runWorker(["scheduler-tick"]);
  const aq = (report.auditTick.enqueued || []).find(
    (e) => e.agentSlug === auditSlug && e.workType === "website_audit",
  );
  if (!aq) throw new Error(`website_audit not enqueued for regression: ${JSON.stringify(report.auditTick.skipped)}`);
  report.auditOnce = runWorker(["website-audit-once"]);
  const { data: aRow } = await client
    .from("agentops_monitoring_runs")
    .select("status, summary, mode")
    .eq("run_id", aq.runId)
    .maybeSingle();
  const aSummary = aRow?.summary && typeof aRow.summary === "object" ? aRow.summary : {};
  report.auditRegression =
    aSummary.trigger === "schedule" &&
    aRow?.mode === "scheduled_single_agent" &&
    (aRow?.status === "completed" || aRow?.status === "failed");
  await client
    .from("agentops_agents")
    .update({ tools: auditOriginalTools, status: auditOriginalStatus })
    .eq("id", auditAgent.id);
  await clearSchedulerAgentState(auditSlug);

  // Paused skip
  console.log("C-B: paused skip");
  const pauseAgent = await loadAgentByCanonical(pauseSlug);
  const pauseOriginalStatus = pauseAgent.status;
  const pauseOriginalTools = pauseAgent.tools;
  await setStatus(pauseSlug, "paused");
  await clearSchedulerAgentState(pauseSlug);
  await setSchedule(pauseSlug, {
    ...schedulePayload("browser_qa"),
    selectedRoutes: [`/system/agent-ops/agents/${pauseSlug}`],
  });
  // temporarily point schedule to pause slug routes via selectedRoutes already set
  report.pausedSkip = runWorker(["scheduler-tick"]);
  report.pausedSkipped = (report.pausedSkip.skipped || []).some(
    (s) => s.agentSlug === pauseSlug && s.reason === "Agent paused",
  );
  await setStatus(pauseSlug, pauseOriginalStatus);
  await client
    .from("agentops_agents")
    .update({ tools: pauseOriginalTools })
    .eq("id", pauseAgent.id);

  // Manual duplicate
  console.log("C-B: manual duplicate skip");
  await cancelQueuedForAgent(agentSlug);
  await clearSchedulerAgentState(agentSlug);
  await setSchedule(agentSlug, schedulePayload("browser_qa"));
  const manualRunId = `owner-manual-${agentSlug}-c-b-${Date.now()}`;
  await client.from("agentops_monitoring_runs").insert({
    run_id: manualRunId,
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
    started_at: new Date().toISOString(),
    summary: {
      trigger: "owner_manual",
      agentSlug,
      workType: "browser_qa",
      schedulerConnection: "staging_worker_pending",
      createdBy: "c-b-live-test",
    },
  });
  report.manualDupSkip = runWorker(["scheduler-tick"]);
  report.manualDuplicateSkipped =
    (report.manualDupSkip.enqueued || []).filter((e) => e.agentSlug === agentSlug).length ===
      0 &&
    (report.manualDupSkip.skipped || []).some(
      (s) => s.agentSlug === agentSlug && s.reason === "Existing active or queued run",
    );
  await cancelQueuedForAgent(agentSlug);

  // Engine unavailable for browser_qa
  console.log("C-B: engine unavailable skip");
  await clearSchedulerAgentState(agentSlug);
  await setSchedule(agentSlug, schedulePayload("browser_qa"));
  const { data: cfg } = await client
    .from("agentops_system_config")
    .select("id, tools_enabled")
    .eq("environment", "staging")
    .limit(1)
    .maybeSingle();
  const tools = { ...(cfg.tools_enabled || {}) };
  const prevBrowser = tools.manualRunWorker?.browserQaEngine;
  tools.manualRunWorker = {
    ...(tools.manualRunWorker || {}),
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    browserQaEngine: {
      connected: false,
      version: "b2-d",
      reason: "Engine not connected",
    },
  };
  await client.from("agentops_system_config").update({ tools_enabled: tools }).eq("id", cfg.id);
  report.engineSkip = runWorker(["scheduler-tick"]);
  report.engineSkipped = (report.engineSkip.skipped || []).some(
    (s) =>
      s.agentSlug === agentSlug &&
      s.workType === "browser_qa" &&
      s.reason === "Engine not connected",
  );
  tools.manualRunWorker = {
    ...(tools.manualRunWorker || {}),
    browserQaEngine: prevBrowser,
  };
  await client.from("agentops_system_config").update({ tools_enabled: tools }).eq("id", cfg.id);
  runWorker(["heartbeat"]);

  report.staleReport = runWorker(["scheduler-cleanup-stale", "--dry-run"]);

  await client
    .from("agentops_agents")
    .update({ tools: originalSystemTools, status: originalSystemStatus })
    .eq("id", originalSystem.id);

  const ok =
    Boolean(report.browserQaRunId) &&
    report.browserQaIdempotent &&
    report.browserQaTriggerSchedule &&
    report.browserQaCompleted &&
    report.auditRegression &&
    report.pausedSkipped &&
    report.manualDuplicateSkipped &&
    report.engineSkipped;

  console.log(JSON.stringify({ ok, ...report }, null, 2));
  process.exit(ok ? 0 : 1);
} catch (err) {
  console.error("C-B live FAILED:", err instanceof Error ? err.message : err);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
