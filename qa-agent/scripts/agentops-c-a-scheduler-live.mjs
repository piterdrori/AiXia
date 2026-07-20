/**
 * Fix C-A live: set system-agent due → scheduler-tick → idempotent retick →
 * website-audit-once (trigger=schedule) → paused skip → manual duplicate skip.
 * Staging only. No GitHub dispatch. No Vercel cron. No Playwright on Vercel.
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
  process.env.AGENTOPS_WORKER_SECRET = "c-a-local-worker-secret";
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
const agentSlug = "system-agent";
const pauseSlug = process.env.AGENTOPS_C_A_PAUSE_AGENT || "design-agent";

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
  if (jsonStart < 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`worker produced no JSON: ${args.join(" ")}`);
  }
  return JSON.parse(stdout.slice(jsonStart));
}

function scheduleTag(payload) {
  return `aixia:schedule:${JSON.stringify(payload)}`;
}

function mergeSchedule(tools, payload) {
  const list = Array.isArray(tools) ? [...tools] : [];
  const filtered = list.filter((t) => !(typeof t === "string" && t.startsWith("aixia:schedule:")));
  filtered.push(scheduleTag(payload));
  return filtered;
}

async function loadAgentByCanonical(slug) {
  const { data, error } = await client
    .from("agentops_agents")
    .select("id, name, status, tools, environment")
    .eq("environment", "staging");
  if (error) throw new Error(error.message);
  const hit = (data || []).find((row) => {
    const tools = Array.isArray(row.tools) ? row.tools : [];
    return tools.includes(`canonical:${slug}`);
  });
  if (!hit) throw new Error(`canonical agent missing: ${slug}`);
  return hit;
}

async function setSchedule(slug, payload) {
  const agent = await loadAgentByCanonical(slug);
  const tools = mergeSchedule(agent.tools, payload);
  const { error } = await client.from("agentops_agents").update({ tools }).eq("id", agent.id);
  if (error) throw new Error(error.message);
  return agent;
}

async function setStatus(slug, status) {
  const agent = await loadAgentByCanonical(slug);
  const { error } = await client
    .from("agentops_agents")
    .update({ status })
    .eq("id", agent.id);
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

async function listScheduledQueued(slug) {
  const { data, error } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, mode, summary, created_at")
    .eq("mode", "scheduled_single_agent")
    .in("status", ["queued", "running", "completed", "failed"])
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data || []).filter((row) => {
    const summary = row.summary && typeof row.summary === "object" ? row.summary : {};
    return summary.agentSlug === slug && summary.trigger === "schedule";
  });
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
          cancelledBy: "c-a-live-cleanup",
          lastError: "Cancelled by Fix C-A live test cleanup",
        },
      })
      .eq("run_id", row.run_id);
  }
}

const dueSchedule = {
  enableSchedule: true,
  ownerEnabled: true,
  frequencyType: "every_hours",
  intervalValue: 1,
  intervalUnit: "hours",
  workTypes: ["website_audit"],
  scopeType: "selected_routes",
  selectedRoutes: ["/system/agent-ops/agents/system-agent"],
  maxDurationMinutes: 15,
  avoidOverlap: true,
  timezone: "UTC",
  version: 2,
  scheduleType: "interval",
};

const report = {
  heartbeat: null,
  tick1: null,
  tick2: null,
  auditOnce: null,
  pausedSkip: null,
  manualDupSkip: null,
  engineSkip: null,
  scheduledRunId: null,
  triggerIsSchedule: false,
  idempotencyBlocked: false,
  pausedSkipped: false,
  manualDuplicateSkipped: false,
  completedStatus: null,
};

try {
  console.log("C-A live: cleanup prior active runs for system-agent");
  await cancelQueuedForAgent(agentSlug);
  await clearSchedulerAgentState(agentSlug);

  console.log("C-A live: set system-agent schedule due (first tick)");
  const originalSystem = await loadAgentByCanonical(agentSlug);
  const originalSystemTools = originalSystem.tools;
  const originalSystemStatus = originalSystem.status;
  await setSchedule(agentSlug, dueSchedule);

  console.log("C-A live: heartbeat");
  report.heartbeat = runWorker(["heartbeat"]);

  console.log("C-A live: scheduler-tick #1");
  report.tick1 = runWorker(["scheduler-tick"]);
  const enqueued1 = report.tick1.enqueued || [];
  const systemEnqueue = enqueued1.find(
    (e) => e.agentSlug === agentSlug && e.workType === "website_audit",
  );
  if (!systemEnqueue) {
    throw new Error(
      `expected system-agent enqueue, got: ${JSON.stringify(report.tick1, null, 2)}`,
    );
  }
  report.scheduledRunId = systemEnqueue.runId;

  console.log("C-A live: scheduler-tick #2 (idempotency)");
  report.tick2 = runWorker(["scheduler-tick"]);
  const enqueued2 = (report.tick2.enqueued || []).filter(
    (e) => e.agentSlug === agentSlug && e.workType === "website_audit",
  );
  report.idempotencyBlocked = enqueued2.length === 0;
  if (!report.idempotencyBlocked) {
    throw new Error("second tick re-enqueued website_audit — idempotency failed");
  }

  console.log("C-A live: website-audit-once for scheduled row");
  report.auditOnce = runWorker(["website-audit-once"]);
  const { data: runRow, error: runErr } = await client
    .from("agentops_monitoring_runs")
    .select("run_id, status, mode, summary, duration_ms")
    .eq("run_id", report.scheduledRunId)
    .maybeSingle();
  if (runErr) throw new Error(runErr.message);
  report.completedStatus = runRow?.status ?? null;
  const summary = runRow?.summary && typeof runRow.summary === "object" ? runRow.summary : {};
  report.triggerIsSchedule = summary.trigger === "schedule";
  if (!report.triggerIsSchedule) {
    throw new Error(`expected trigger=schedule, got ${summary.trigger}`);
  }
  if (runRow?.mode !== "scheduled_single_agent") {
    throw new Error(`expected scheduled_single_agent mode, got ${runRow?.mode}`);
  }

  // Paused agent skip
  console.log(`C-A live: paused skip test (${pauseSlug})`);
  const pauseAgent = await loadAgentByCanonical(pauseSlug);
  const pauseOriginalStatus = pauseAgent.status;
  const pauseOriginalTools = pauseAgent.tools;
  await setStatus(pauseSlug, "paused");
  await clearSchedulerAgentState(pauseSlug);
  await setSchedule(pauseSlug, {
    ...dueSchedule,
    selectedRoutes: [`/system/agent-ops/agents/${pauseSlug}`],
  });
  report.pausedSkip = runWorker(["scheduler-tick"]);
  const pauseEnqueued = (report.pausedSkip.enqueued || []).filter(
    (e) => e.agentSlug === pauseSlug,
  );
  const pauseSkipped = (report.pausedSkip.skipped || []).some(
    (s) => s.agentSlug === pauseSlug && s.reason === "Agent paused",
  );
  report.pausedSkipped = pauseEnqueued.length === 0 && pauseSkipped;
  await setStatus(pauseSlug, pauseOriginalStatus);
  await client
    .from("agentops_agents")
    .update({ tools: pauseOriginalTools })
    .eq("id", pauseAgent.id);

  // Manual duplicate skip
  console.log("C-A live: manual duplicate skip");
  await cancelQueuedForAgent(agentSlug);
  await clearSchedulerAgentState(agentSlug);
  await setSchedule(agentSlug, dueSchedule);
  const manualRunId = `owner-manual-${agentSlug}-c-a-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const { error: manErr } = await client.from("agentops_monitoring_runs").insert({
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
    started_at: nowIso,
    ended_at: null,
    duration_ms: null,
    summary: {
      trigger: "owner_manual",
      agentSlug,
      workType: "website_audit",
      schedulerConnection: "staging_worker_pending",
      createdBy: "c-a-live-test",
    },
  });
  if (manErr) throw new Error(manErr.message);
  report.manualDupSkip = runWorker(["scheduler-tick"]);
  const dupEnqueued = (report.manualDupSkip.enqueued || []).filter(
    (e) => e.agentSlug === agentSlug,
  );
  const dupSkipped = (report.manualDupSkip.skipped || []).some(
    (s) => s.agentSlug === agentSlug && s.reason === "Existing active or queued run",
  );
  report.manualDuplicateSkipped = dupEnqueued.length === 0 && dupSkipped;
  await cancelQueuedForAgent(agentSlug);

  // Restore system-agent tools/status
  await client
    .from("agentops_agents")
    .update({ tools: originalSystemTools, status: originalSystemStatus })
    .eq("id", originalSystem.id);

  const scheduledRows = await listScheduledQueued(agentSlug);
  console.log(
    JSON.stringify(
      {
        ok:
          Boolean(report.scheduledRunId) &&
          report.idempotencyBlocked &&
          report.triggerIsSchedule &&
          report.pausedSkipped &&
          report.manualDuplicateSkipped &&
          (report.completedStatus === "completed" || report.completedStatus === "failed"),
        ...report,
        recentScheduledCount: scheduledRows.length,
        note:
          report.completedStatus === "failed"
            ? "Scheduled run claimed but engine reported failure — inspect summary"
            : null,
      },
      null,
      2,
    ),
  );

  if (
    !report.scheduledRunId ||
    !report.idempotencyBlocked ||
    !report.triggerIsSchedule ||
    !report.pausedSkipped ||
    !report.manualDuplicateSkipped
  ) {
    process.exit(1);
  }
} catch (err) {
  console.error("C-A live FAILED:", err instanceof Error ? err.message : err);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
