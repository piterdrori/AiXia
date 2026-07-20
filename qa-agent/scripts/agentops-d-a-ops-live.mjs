/**
 * Phase D-A live ops:
 * persistent worker --once cycles process manual + scheduled website_audit / browser_qa.
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
  process.env.AGENTOPS_WORKER_SECRET = "d-a-local-worker-secret";
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
const manualAuditSlug = process.env.AGENTOPS_D_A_MANUAL_AUDIT_AGENT || "system-agent";
const manualBqSlug = process.env.AGENTOPS_D_A_MANUAL_BQ_AGENT || "qa-agent";
const schedAuditSlug = process.env.AGENTOPS_D_A_SCHED_AUDIT_AGENT || "logs-agent";
const schedBqSlug = process.env.AGENTOPS_D_A_SCHED_BQ_AGENT || "runtime-agent";

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

async function clearScheduleTag(slug) {
  const agent = await loadAgentByCanonical(slug);
  const tools = (Array.isArray(agent.tools) ? agent.tools : []).filter(
    (t) => !(typeof t === "string" && t.startsWith("aixia:schedule:")),
  );
  const { error } = await client
    .from("agentops_agents")
    .update({ tools })
    .eq("id", agent.id);
  if (error) throw new Error(error.message);
}

function findFreshEnqueue(tick, slug, workType) {
  const enq = (tick.enqueued || []).find(
    (e) => e.agentSlug === slug && e.workType === workType && e.runId,
  );
  return enq?.runId || null;
}

async function hardClearAgentRuns(slug) {
  await cancelQueuedForAgent(slug);
  const { data } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, summary, mode")
    .eq("mode", "scheduled_single_agent")
    .in("status", ["queued", "running", "completed"])
    .order("created_at", { ascending: false })
    .limit(80);
  for (const row of data || []) {
    const summary = row.summary && typeof row.summary === "object" ? row.summary : {};
    if (summary.agentSlug !== slug) continue;
    if (row.status === "queued" || row.status === "running") {
      await client
        .from("agentops_monitoring_runs")
        .update({
          status: "canceled",
          ended_at: new Date().toISOString(),
          summary: {
            ...summary,
            cancelReason: "Hard-cleared before D-A scheduled proof",
            canceledAt: new Date().toISOString(),
            idempotencyKey: `${summary.idempotencyKey || row.run_id}::retired-d-a`,
          },
        })
        .eq("run_id", row.run_id);
      continue;
    }
    // Retire completed same-hour idempotency keys so a fresh scheduled enqueue can prove D-A.
    if (typeof summary.idempotencyKey === "string" && summary.idempotencyKey) {
      await client
        .from("agentops_monitoring_runs")
        .update({
          summary: {
            ...summary,
            idempotencyKey: `${summary.idempotencyKey}::retired-d-a-${Date.now()}`,
            idempotencyRetiredBy: "d-a-live-test",
          },
        })
        .eq("run_id", row.run_id);
    }
  }
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
        status: "canceled",
        ended_at: new Date().toISOString(),
        summary: {
          ...summary,
          cancelReason: "Cancelled by Phase D-A live test cleanup",
          canceledAt: new Date().toISOString(),
        },
      })
      .eq("run_id", row.run_id);
  }
}

async function insertManual(slug, workType) {
  const runId = `owner-manual-${slug}-${workType}-d-a-${Date.now()}`;
  const route = `/system/agent-ops/agents/${slug}`;
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
    started_at: new Date().toISOString(),
    summary: {
      trigger: "owner_manual",
      agentSlug: slug,
      workType,
      schedulerConnection: "staging_worker_pending",
      queueVersion: "d-a",
      selectedRoutes: [route],
      scope: { type: "selected_routes", routes: [route] },
      createdBy: "d-a-live-test",
      autoPromoteBlocked: true,
      autoFixBlocked: true,
    },
  });
  if (error) throw new Error(error.message);
  return runId;
}

function schedulePayload(slug, workType) {
  return {
    enableSchedule: true,
    ownerEnabled: true,
    frequencyType: "every_hours",
    intervalValue: 1,
    intervalUnit: "hours",
    workTypes: [workType],
    scopeType: "selected_routes",
    selectedRoutes: [`/system/agent-ops/agents/${slug}`],
    maxDurationMinutes: 15,
    avoidOverlap: true,
    timezone: "UTC",
    version: 2,
    scheduleType: "interval",
  };
}

async function waitTerminal(runId, label) {
  const { data, error } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, mode, summary, github_run_id")
    .eq("run_id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${label}: missing ${runId}`);
  if (data.github_run_id != null) throw new Error(`${label}: github_run_id must be null`);
  const terminal = ["completed", "failed", "canceled"].includes(data.status);
  if (!terminal) throw new Error(`${label}: expected terminal, got ${data.status}`);
  return data;
}

const report = {
  opsOnce1: null,
  manualAuditRunId: null,
  manualBqRunId: null,
  schedAuditRunId: null,
  schedBqRunId: null,
  manualAuditOk: false,
  manualBqOk: false,
  schedAuditOk: false,
  schedBqOk: false,
  queueDrained: false,
  healthHasLastCompleted: false,
  noGithub: true,
};

const originals = {};

try {
  for (const slug of [manualAuditSlug, manualBqSlug, schedAuditSlug, schedBqSlug]) {
    const agent = await loadAgentByCanonical(slug);
    originals[slug] = { tools: agent.tools, status: agent.status, id: agent.id };
    await cancelQueuedForAgent(slug);
    await clearSchedulerAgentState(slug);
    await clearScheduleTag(slug);
    await setStatus(slug, "active");
  }

  console.log("D-A: staging-worker --once (heartbeat + tick)");
  report.opsOnce1 = runWorker(["staging-worker", "--once"]);
  if (!report.opsOnce1?.health?.lastHeartbeatAt) {
    throw new Error("ops once did not write heartbeat");
  }

  console.log(`D-A: queue manual website_audit (${manualAuditSlug})`);
  report.manualAuditRunId = await insertManual(manualAuditSlug, "website_audit");
  const auditCycle = runWorker(["staging-worker", "--once"]);
  const auditRow = await waitTerminal(report.manualAuditRunId, "manual website_audit");
  report.manualAuditOk =
    auditRow.status === "completed" || auditRow.status === "failed";
  if (auditRow.summary?.trigger !== "owner_manual") {
    throw new Error("manual audit trigger mismatch");
  }
  console.log("manual audit", auditRow.status, auditCycle.processed?.runId);

  console.log(`D-A: queue manual browser_qa (${manualBqSlug})`);
  report.manualBqRunId = await insertManual(manualBqSlug, "browser_qa");
  const bqCycle = runWorker(["staging-worker", "--once"]);
  const bqRow = await waitTerminal(report.manualBqRunId, "manual browser_qa");
  report.manualBqOk = bqRow.status === "completed" || bqRow.status === "failed";
  if (bqRow.summary?.trigger !== "owner_manual") {
    throw new Error("manual browser_qa trigger mismatch");
  }
  console.log("manual browser_qa", bqRow.status, bqCycle.processed?.runId);

  console.log(`D-A: schedule website_audit (${schedAuditSlug})`);
  await hardClearAgentRuns(schedAuditSlug);
  await setSchedule(schedAuditSlug, schedulePayload(schedAuditSlug, "website_audit"));
  await clearSchedulerAgentState(schedAuditSlug);
  const auditTick = runWorker(["scheduler-tick"]);
  report.schedAuditRunId = findFreshEnqueue(auditTick, schedAuditSlug, "website_audit");
  if (!report.schedAuditRunId) {
    throw new Error(`scheduled website_audit not freshly enqueued: ${JSON.stringify(auditTick)}`);
  }
  const auditOps = runWorker(["staging-worker", "--once"]);
  if (auditOps.processed?.runId !== report.schedAuditRunId) {
    throw new Error(
      `ops did not process scheduled audit ${report.schedAuditRunId}, got ${auditOps.processed?.runId}`,
    );
  }
  const schedAuditRow = await waitTerminal(report.schedAuditRunId, "scheduled website_audit");
  report.schedAuditOk =
    (schedAuditRow.status === "completed" || schedAuditRow.status === "failed") &&
    schedAuditRow.summary?.trigger === "schedule";

  console.log(`D-A: schedule browser_qa (${schedBqSlug})`);
  await hardClearAgentRuns(schedBqSlug);
  await setSchedule(schedBqSlug, schedulePayload(schedBqSlug, "browser_qa"));
  await clearSchedulerAgentState(schedBqSlug);
  const bqTick = runWorker(["scheduler-tick"]);
  report.schedBqRunId = findFreshEnqueue(bqTick, schedBqSlug, "browser_qa");
  if (!report.schedBqRunId) {
    throw new Error(`scheduled browser_qa not freshly enqueued: ${JSON.stringify(bqTick)}`);
  }
  const finalCycle = runWorker(["staging-worker", "--once"]);
  if (finalCycle.processed?.runId !== report.schedBqRunId) {
    throw new Error(
      `ops did not process scheduled browser_qa ${report.schedBqRunId}, got ${finalCycle.processed?.runId}`,
    );
  }
  const schedBqRow = await waitTerminal(report.schedBqRunId, "scheduled browser_qa");
  report.schedBqOk =
    (schedBqRow.status === "completed" || schedBqRow.status === "failed") &&
    schedBqRow.summary?.trigger === "schedule";

  const queue = runWorker(["queue-status"]);
  report.queueDrained = (queue.queueLength ?? 0) === 0;
  report.healthHasLastCompleted = Boolean(
    finalCycle.health?.ops?.lastCompletedRunId || finalCycle.health?.lastClaimedRunId,
  );
  report.noGithub =
    auditRow.github_run_id == null &&
    bqRow.github_run_id == null &&
    schedAuditRow.github_run_id == null &&
    schedBqRow.github_run_id == null;

  console.log(
    JSON.stringify(
      {
        ok:
          report.manualAuditOk &&
          report.manualBqOk &&
          report.schedAuditOk &&
          report.schedBqOk &&
          report.queueDrained &&
          report.noGithub,
        report,
      },
      null,
      2,
    ),
  );

  if (
    !(
      report.manualAuditOk &&
      report.manualBqOk &&
      report.schedAuditOk &&
      report.schedBqOk &&
      report.queueDrained &&
      report.noGithub
    )
  ) {
    process.exit(1);
  }
} catch (error) {
  console.error("D-A LIVE FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  for (const [slug, orig] of Object.entries(originals)) {
    try {
      await cancelQueuedForAgent(slug);
      await clearSchedulerAgentState(slug);
      await client
        .from("agentops_agents")
        .update({ tools: orig.tools, status: orig.status })
        .eq("id", orig.id);
    } catch {
      /* best-effort restore */
    }
  }
}
