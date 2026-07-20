/**
 * Fix C-B — staging worker scheduler tick (queue due runs only).
 * Invoked by: node scripts/agentops-staging-manual-run-worker.mjs scheduler-tick
 */
import { randomUUID } from "node:crypto";

import {
  buildIdempotencyKey,
  buildScheduledRunSummary,
  classifyStaleMonitoringRun,
  computeNextDueAt,
  expandExecutableWorkTypes,
  FIRST_DUE_POLICY,
  isCanonicalAgentSlug,
  isScheduleDue,
  normalizeSchedulerHealth,
  parseScheduleFromTools,
  resolveCanonicalSlugFromAgent,
  resolveScheduledScopeResult,
  SCHEDULER_MODE,
  SCHEDULER_VERSION,
  SKIP_AGENT_PAUSED,
  SKIP_ENGINE_UNAVAILABLE,
  SKIP_EXISTING_RUN,
  SKIP_SCHEDULE_DISABLED,
  SKIP_UNSUPPORTED_SCOPE,
  SKIP_UNSUPPORTED_WORK,
  SKIP_WORKER_OFFLINE,
  TIMEZONE_POLICY,
} from "./lib/agentops-manual-run-scheduler-core.mjs";
import {
  mergeWorkerHealthIntoTools,
  parseWorkerHealth,
  WORKER_VERSION,
} from "./lib/agentops-manual-run-worker-core.mjs";

const MONITORING_TABLE = "agentops_monitoring_runs";
const CONFIG_TABLE = "agentops_system_config";
const AGENTS_TABLE = "agentops_agents";

function isAgentPausedStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "paused" || s === "quiet" || s === "disabled" || s === "blocked";
}

async function loadConfigRow(client) {
  const { data: rows, error } = await client
    .from(CONFIG_TABLE)
    .select("id, tools_enabled")
    .eq("environment", "staging")
    .limit(1);
  if (error) throw new Error(error.message);
  return rows?.[0] ?? null;
}

async function writeSchedulerHealth(client, workerId, schedulerPatch, workerPatch = {}) {
  const row = await loadConfigRow(client);
  const nowIso = new Date().toISOString();
  const tools = mergeWorkerHealthIntoTools(row?.tools_enabled, {
    connected: true,
    lastHeartbeatAt: nowIso,
    workerId,
    workerVersion: WORKER_VERSION,
    ...workerPatch,
  });
  const prevHealth = parseWorkerHealth(tools) || {};
  const prevScheduler = normalizeSchedulerHealth(
    row?.tools_enabled && typeof row.tools_enabled === "object"
      ? row.tools_enabled.manualRunScheduler
      : null,
  );
  const nextScheduler = {
    ...prevScheduler,
    ...schedulerPatch,
    connected: true,
    mode: SCHEDULER_MODE,
    lastTickAt: schedulerPatch.lastTickAt || nowIso,
  };
  const nextTools = {
    ...tools,
    manualRunScheduler: nextScheduler,
  };
  // Keep a compact mirror on worker health for capability readers.
  nextTools.manualRunWorker = {
    ...prevHealth,
    ...tools.manualRunWorker,
    scheduler: {
      connected: true,
      lastTickAt: nextScheduler.lastTickAt,
      lastTickId: nextScheduler.lastTickId,
      lastDueCount: nextScheduler.lastDueCount,
      lastEnqueuedCount: nextScheduler.lastEnqueuedCount,
      lastSkippedCount: nextScheduler.lastSkippedCount,
      lastError: nextScheduler.lastError,
      mode: SCHEDULER_MODE,
    },
  };

  if (!row) {
    const { error: insertError } = await client.from(CONFIG_TABLE).insert({
      runtime_mode: "scheduled",
      staging_url: process.env.STAGING_APP_URL || "https://ai-xia-staging.vercel.app",
      supabase_project: "staging",
      github_repo: "piterdrori/AiXia",
      tools_enabled: nextTools,
      environment: "staging",
    });
    if (insertError) throw new Error(insertError.message);
    return nextScheduler;
  }

  const { error: updateError } = await client
    .from(CONFIG_TABLE)
    .update({ tools_enabled: nextTools })
    .eq("id", row.id);
  if (updateError) throw new Error(updateError.message);
  return nextScheduler;
}

async function listActiveRuns(client) {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, mode, summary, created_at")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

async function findIdempotencyHit(client, idempotencyKey) {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, summary, created_at")
    .eq("mode", "scheduled_single_agent")
    .in("status", ["queued", "running", "completed"])
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  for (const row of data || []) {
    const summary =
      row.summary && typeof row.summary === "object" ? row.summary : {};
    if (summary.idempotencyKey === idempotencyKey) return row;
  }
  return null;
}

async function loadCanonicalAgents(client) {
  const { data, error } = await client
    .from(AGENTS_TABLE)
    .select("id, name, status, tools, environment")
    .eq("environment", "staging");
  if (error) throw new Error(error.message);
  const bySlug = new Map();
  for (const agent of data || []) {
    const slug = resolveCanonicalSlugFromAgent(agent);
    if (!slug || !isCanonicalAgentSlug(slug)) continue;
    bySlug.set(slug, agent);
  }
  return bySlug;
}

function engineAvailableForWork(health, workType) {
  if (!health || !health.connected) return false;
  if (workType === "website_audit") {
    return Boolean(health.websiteAuditEngine?.connected);
  }
  if (workType === "browser_qa") {
    return Boolean(health.browserQaEngine?.connected);
  }
  return false;
}

export async function runSchedulerTick(client, workerId, envConfig, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const tickId = `sched-${randomUUID().slice(0, 8)}`;
  const now = new Date();
  const nowIso = now.toISOString();
  const stagingUrl = (envConfig.appUrl || "https://ai-xia-staging.vercel.app").replace(
    /\/+$/,
    "",
  );

  // Heartbeat first (light) — preserve engine connectivity; never execute engines here.
  if (!dryRun) {
    await writeSchedulerHealth(
      client,
      workerId,
      {
        lastTickAt: nowIso,
        lastTickId: tickId,
        lastDueCount: 0,
        lastEnqueuedCount: 0,
        lastSkippedCount: 0,
        lastError: null,
      },
      { queueLength: 0, lastError: null },
    );
  }

  const configRow = await loadConfigRow(client);
  const workerHealth = parseWorkerHealth(configRow?.tools_enabled);
  const schedulerPrev = normalizeSchedulerHealth(
    configRow?.tools_enabled && typeof configRow.tools_enabled === "object"
      ? configRow.tools_enabled.manualRunScheduler
      : workerHealth?.scheduler,
  );
  const agentStates = { ...(schedulerPrev.agents || {}) };

  const due = [];
  const enqueued = [];
  const skipped = [];

  if (!workerHealth || !workerHealth.connected) {
    skipped.push({ agentSlug: "*", reason: SKIP_WORKER_OFFLINE });
    const scheduler = dryRun
      ? {
          connected: false,
          lastTickAt: nowIso,
          lastTickId: tickId,
          lastDueCount: 0,
          lastEnqueuedCount: 0,
          lastSkippedCount: skipped.length,
          lastError: SKIP_WORKER_OFFLINE,
          mode: SCHEDULER_MODE,
          agents: agentStates,
          dryRun: true,
        }
      : await writeSchedulerHealth(
          client,
          workerId,
          {
            lastTickAt: nowIso,
            lastTickId: tickId,
            lastDueCount: 0,
            lastEnqueuedCount: 0,
            lastSkippedCount: skipped.length,
            lastError: SKIP_WORKER_OFFLINE,
            agents: agentStates,
          },
          { queueLength: 0, lastError: SKIP_WORKER_OFFLINE },
        );
    return {
      ok: true,
      dryRun,
      tickId,
      dueCount: 0,
      enqueuedCount: 0,
      skippedCount: skipped.length,
      due,
      enqueued,
      skipped,
      scheduler,
      firstDuePolicy: FIRST_DUE_POLICY,
      timezonePolicy: TIMEZONE_POLICY,
    };
  }

  const agents = await loadCanonicalAgents(client);
  const activeRuns = await listActiveRuns(client);

  for (const [slug, agent] of agents.entries()) {
    const schedule = parseScheduleFromTools(agent.tools);
    const state = agentStates[slug] || {};
    const ownerStatus = typeof agent.status === "string" ? agent.status : "active";

    if (isAgentPausedStatus(ownerStatus) || schedule.ownerEnabled === false) {
      skipped.push({ agentSlug: slug, reason: SKIP_AGENT_PAUSED });
      agentStates[slug] = {
        ...state,
        lastScheduledCheckAt: nowIso,
        lastSkippedReason: SKIP_AGENT_PAUSED,
        scheduleVersion: SCHEDULER_VERSION,
      };
      continue;
    }

    if (!schedule.enableSchedule || schedule.frequencyType === "manual") {
      skipped.push({ agentSlug: slug, reason: SKIP_SCHEDULE_DISABLED });
      agentStates[slug] = {
        ...state,
        lastScheduledCheckAt: nowIso,
        lastSkippedReason: SKIP_SCHEDULE_DISABLED,
        scheduleVersion: SCHEDULER_VERSION,
      };
      continue;
    }

    const dueInfo = isScheduleDue(schedule, state, now);
    agentStates[slug] = {
      ...state,
      lastScheduledCheckAt: nowIso,
      nextDueAt: dueInfo.nextDueAt || state.nextDueAt || null,
      scheduleVersion: SCHEDULER_VERSION,
    };

    if (!dueInfo.due) {
      skipped.push({
        agentSlug: slug,
        reason: dueInfo.reason || SKIP_SCHEDULE_DISABLED,
      });
      agentStates[slug].lastSkippedReason = dueInfo.reason || SKIP_SCHEDULE_DISABLED;
      continue;
    }

    const workTypes = expandExecutableWorkTypes(schedule.workTypes);
    if (workTypes.length === 0) {
      skipped.push({ agentSlug: slug, reason: SKIP_UNSUPPORTED_WORK });
      agentStates[slug].lastSkippedReason = SKIP_UNSUPPORTED_WORK;
      continue;
    }

    const scopeResult = resolveScheduledScopeResult(schedule, slug);
    if (!scopeResult.ok) {
      skipped.push({
        agentSlug: slug,
        reason: scopeResult.reason || SKIP_UNSUPPORTED_SCOPE,
      });
      agentStates[slug].lastSkippedReason = scopeResult.reason || SKIP_UNSUPPORTED_SCOPE;
      agentStates[slug].nextDueAt = dueInfo.nextDueAt;
      continue;
    }

    due.push({
      agentSlug: slug,
      dueAt: dueInfo.dueAt,
      workTypes,
      firstDue: Boolean(dueInfo.firstDue),
      routes: scopeResult.routes,
    });

    const hasActive = activeRuns.some((row) => {
      const summary =
        row.summary && typeof row.summary === "object" ? row.summary : {};
      return summary.agentSlug === slug && (row.status === "queued" || row.status === "running");
    });
    if (hasActive) {
      skipped.push({ agentSlug: slug, reason: SKIP_EXISTING_RUN });
      agentStates[slug].lastSkippedReason = SKIP_EXISTING_RUN;
      // Advance nextDueAt so we do not spin forever while a run is active.
      agentStates[slug].nextDueAt = dueInfo.nextDueAt;
      continue;
    }

    for (const workType of workTypes) {
      if (!engineAvailableForWork(workerHealth, workType)) {
        skipped.push({
          agentSlug: slug,
          workType,
          reason: SKIP_ENGINE_UNAVAILABLE,
        });
        agentStates[slug].lastSkippedReason = SKIP_ENGINE_UNAVAILABLE;
        continue;
      }

      const idempotencyKey = buildIdempotencyKey(slug, workType, dueInfo.dueAt);
      const existingIdem = await findIdempotencyHit(client, idempotencyKey);
      if (existingIdem) {
        skipped.push({
          agentSlug: slug,
          workType,
          reason: SKIP_EXISTING_RUN,
          existingRunId: existingIdem.run_id,
        });
        agentStates[slug].lastSkippedReason = SKIP_EXISTING_RUN;
        agentStates[slug].nextDueAt = dueInfo.nextDueAt;
        continue;
      }

      const selectedRoutes = scopeResult.routes;
      const scope = {
        type: "selected_routes",
        routes: selectedRoutes,
        modules: scopeResult.modules || [],
        mapping: scopeResult.mapping,
      };
      const maxDuration = Math.min(
        30,
        Math.max(5, Number(schedule.maxDurationMinutes) || 15),
      );
      const runId = `scheduled-${slug}-${workType}-${randomUUID().slice(0, 8)}`;
      const summary = buildScheduledRunSummary({
        agentSlug: slug,
        runtimeAgentId: agent.id,
        workType,
        scope,
        selectedRoutes,
        selectedModules: scope.modules || [],
        maxDurationMinutes: maxDuration,
        dueAt: dueInfo.dueAt,
        nextDueAt: dueInfo.nextDueAt,
        idempotencyKey,
        scheduleTickId: tickId,
        ownerStatusAtQueue: ownerStatus,
        firstDue: Boolean(dueInfo.firstDue),
        scopeMapping: scopeResult.mapping,
        engineAvailabilityAtQueue: {
          websiteAudit: Boolean(workerHealth.websiteAuditEngine?.connected),
          browserQa: Boolean(workerHealth.browserQaEngine?.connected),
        },
      });

      if (dryRun) {
        enqueued.push({
          agentSlug: slug,
          workType,
          runId,
          idempotencyKey,
          dryRun: true,
          selectedRoutes,
        });
        agentStates[slug] = {
          ...agentStates[slug],
          lastDueAt: dueInfo.dueAt,
          nextDueAt: dueInfo.nextDueAt || computeNextDueAt(schedule, now),
          lastEnqueuedRunId: runId,
          lastSkippedReason: null,
          lastWorkType: workType,
          scheduleVersion: SCHEDULER_VERSION,
        };
        continue;
      }

      const insertRow = {
        run_id: runId,
        source: "schedule",
        mode: "scheduled_single_agent",
        level: 1,
        dry_run: true,
        target_base_url: stagingUrl,
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
        github_run_id: null,
        github_run_url: null,
        artifact_name: null,
        summary,
      };

      const { data: inserted, error: insertError } = await client
        .from(MONITORING_TABLE)
        .insert(insertRow)
        .select("run_id")
        .single();

      if (insertError || !inserted) {
        skipped.push({
          agentSlug: slug,
          workType,
          reason: insertError?.message || "Insert failed",
        });
        agentStates[slug].lastSkippedReason = insertError?.message || "Insert failed";
        continue;
      }

      enqueued.push({ agentSlug: slug, workType, runId, idempotencyKey, selectedRoutes });
      activeRuns.push({
        run_id: runId,
        status: "queued",
        mode: "scheduled_single_agent",
        summary,
      });
      agentStates[slug] = {
        ...agentStates[slug],
        lastDueAt: dueInfo.dueAt,
        nextDueAt: dueInfo.nextDueAt || computeNextDueAt(schedule, now),
        lastEnqueuedRunId: runId,
        lastSkippedReason: null,
        lastWorkType: workType,
        scheduleVersion: SCHEDULER_VERSION,
      };
    }
  }

  const scheduler = dryRun
    ? {
        connected: true,
        lastTickAt: nowIso,
        lastTickId: tickId,
        lastDueCount: due.length,
        lastEnqueuedCount: enqueued.length,
        lastSkippedCount: skipped.length,
        lastError: null,
        mode: SCHEDULER_MODE,
        agents: agentStates,
        dryRun: true,
      }
    : await writeSchedulerHealth(
        client,
        workerId,
        {
          lastTickAt: nowIso,
          lastTickId: tickId,
          lastDueCount: due.length,
          lastEnqueuedCount: enqueued.length,
          lastSkippedCount: skipped.length,
          lastError: null,
          agents: agentStates,
        },
        {
          queueLength: activeRuns.filter((r) => r.status === "queued").length,
          lastError: null,
        },
      );

  return {
    ok: true,
    dryRun,
    tickId,
    schedulerVersion: SCHEDULER_VERSION,
    dueCount: due.length,
    enqueuedCount: enqueued.length,
    skippedCount: skipped.length,
    due,
    enqueued,
    skipped,
    scheduler,
    firstDuePolicy: FIRST_DUE_POLICY,
    timezonePolicy: TIMEZONE_POLICY,
  };
}

export async function reportStaleSchedulerRuns(client, options = {}) {
  const dryRun = options.dryRun !== false;
  const nowMs = Date.now();
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("run_id, status, mode, summary, created_at, started_at")
    .in("mode", ["owner_manual_single_agent", "scheduled_single_agent"])
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const stale = [];
  for (const row of data || []) {
    const hit = classifyStaleMonitoringRun(row, nowMs);
    if (hit) stale.push(hit);
  }
  return {
    ok: true,
    dryRun,
    command: "scheduler-cleanup-stale",
    staleCount: stale.length,
    stale,
    note: dryRun
      ? "Report-only. No rows deleted or mutated. Owner can inspect stuck runs in Agent Detail / monitoring."
      : "Destructive cleanup is not enabled in Fix C-B.",
  };
}
