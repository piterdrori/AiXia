/**
 * Phase D-E1 — Agent Detail truthfulness final verify (static).
 * Covers latest-run preference, live queue age, scope labels, schedule honesty,
 * legacy GHA copy removal from normal Agent Detail flow.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildFleetFallbackDrawer,
  drawerFieldRows,
  FLEET_DAILY_FALLBACK_BANNER,
  selectLatestAgentRun,
} from "../src/lib/agentops/agents/agentDetailLatestRun.ts";
import {
  normalizeDetailSchedule,
  resolveAgentScheduleRuntimeStatus,
  DEFAULT_AGENT_DETAIL_SCHEDULE,
} from "../src/lib/agentops/agents/agentDetailScheduleModel.ts";
import { mapMemoryCountsToStripStatus } from "../src/lib/agentops/agents/agentDetailControlCenter.ts";

const REPO_ROOT = process.cwd();
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function read(rel: string): string {
  const full = join(REPO_ROOT, rel);
  if (!existsSync(full)) {
    fail(`Missing file: ${rel}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function mustInclude(rel: string, needle: string): void {
  if (!read(rel).includes(needle)) {
    fail(`${rel} must include ${JSON.stringify(needle)}`);
  }
}

function mustNotInclude(rel: string, needle: string): void {
  if (read(rel).includes(needle)) {
    fail(`${rel} must NOT include ${JSON.stringify(needle)}`);
  }
}

function verifyLatestRunSelection(): void {
  const workerManual = {
    runId: "manual-1",
    status: "completed",
    trigger: "owner_manual",
    mode: "owner_manual_single_agent",
    workType: "website_audit",
  };
  const workerScheduled = {
    runId: "sched-1",
    status: "completed",
    trigger: "schedule",
    mode: "scheduled_single_agent",
    workType: "browser_qa",
  };
  const queued = {
    runId: "queued-1",
    status: "queued",
    trigger: "schedule",
    mode: "scheduled_single_agent",
    workType: "website_audit",
  };

  const prefersQueued = selectLatestAgentRun({
    queued: [queued],
    running: [],
    recentTerminal: [workerManual, workerScheduled],
  });
  if (prefersQueued?.runId !== "queued-1") {
    fail("selectLatestAgentRun must prefer active queued/running over terminal");
  }

  const prefersManual = selectLatestAgentRun({
    queued: [],
    running: [],
    recentTerminal: [workerScheduled, workerManual],
  });
  if (prefersManual?.runId !== "manual-1") {
    fail("selectLatestAgentRun must prefer owner_manual completed/failed over scheduled");
  }

  const prefersScheduled = selectLatestAgentRun({
    queued: [],
    running: [],
    recentTerminal: [workerScheduled],
  });
  if (prefersScheduled?.runId !== "sched-1") {
    fail("selectLatestAgentRun must select scheduled worker run when no manual");
  }

  const none = selectLatestAgentRun({ queued: [], running: [], recentTerminal: [] });
  if (none != null) fail("selectLatestAgentRun must return null when no worker runs exist");

  const fleet = buildFleetFallbackDrawer({
    open: true,
    executionStatus: "completed",
    startedAt: null,
    endedAt: null,
    duration: "",
    routesModules: "",
    queuedFindings: "",
    failureReason: "",
  });
  if (!fleet.isFleetFallback || fleet.trigger !== "fleet_daily_review") {
    fail("fleet fallback drawer must be clearly labeled fleet_daily_review");
  }
  if (!fleet.banner?.includes("no newer staging-worker run")) {
    fail("fleet fallback banner missing required label");
  }
  if (fleet.banner !== FLEET_DAILY_FALLBACK_BANNER) {
    fail("fleet fallback banner constant mismatch");
  }
  const fleetRows = drawerFieldRows(fleet);
  if (fleetRows.some(([, value]) => /GitHub Actions/i.test(value))) {
    fail("fleet fallback drawer fields must not say bare GitHub Actions");
  }
  if (fleetRows.some(([, value]) => value === "Not recorded")) {
    fail("drawerFieldRows must hide Not recorded fields");
  }
}

function verifyScheduleHonesty(): void {
  const config = normalizeDetailSchedule({
    ...DEFAULT_AGENT_DETAIL_SCHEDULE,
    enableSchedule: true,
    frequencyType: "every_hours",
    intervalValue: 6,
    ownerEnabled: true,
    schedulerExecutionConnected: true,
  });

  const queuedStatus = resolveAgentScheduleRuntimeStatus({
    config,
    isOwnerPaused: false,
    workerConnected: false,
    schedulerConnected: false,
    websiteAuditAvailable: true,
    browserQaAvailable: true,
    hasActiveRun: false,
    hasQueuedScheduledRun: true,
    nextAt: new Date(Date.now() + 3600_000).toISOString(),
    lastSkippedReason: "Not due yet",
  });
  if (queuedStatus !== "Queued · waiting for staging worker") {
    fail(`expected Queued · waiting for staging worker, got ${queuedStatus}`);
  }

  const staleStatus = resolveAgentScheduleRuntimeStatus({
    config,
    isOwnerPaused: false,
    workerConnected: true,
    schedulerConnected: false,
    websiteAuditAvailable: true,
    browserQaAvailable: true,
    hasActiveRun: false,
    hasQueuedScheduledRun: false,
    nextAt: null,
    lastSkippedReason: "Not due yet",
  });
  if (staleStatus !== "Saved · worker scheduler offline") {
    fail(`expected Saved · worker scheduler offline, got ${staleStatus}`);
  }

  const paused = resolveAgentScheduleRuntimeStatus({
    config,
    isOwnerPaused: true,
    workerConnected: true,
    schedulerConnected: true,
    websiteAuditAvailable: true,
    browserQaAvailable: true,
    hasActiveRun: false,
    nextAt: null,
  });
  if (paused !== "Paused · scheduled runs will not enqueue") {
    fail(`expected Paused · scheduled runs will not enqueue, got ${paused}`);
  }
}

function verifyMemoryCopy(): void {
  const mapped = mapMemoryCountsToStripStatus({
    loaded: true,
    error: null,
    assignedCount: 120,
    enabledCount: 10,
    pendingDrafts: 0,
    diagnosticCount: 80,
  });
  if (!/120 runtime memory records · 10 enabled/i.test(mapped.status)) {
    fail(`memory strip must label runtime/enabled counts clearly, got ${mapped.status}`);
  }
  if (/Agent Hermes connected/i.test(mapped.status + mapped.detail)) {
    fail("memory/hermes copy must not claim Agent Hermes connected");
  }
  if (/ASSIGNED/i.test(mapped.status)) {
    fail("memory strip must not use ASSIGNED wording");
  }

  mustInclude(
    "src/lib/agentops/agents/agentDetailMemoryModel.ts",
    "isDiagnosticRuntimeMemory",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "Agent Hermes connection",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "MEMORY_LOAD_TIMEOUT_MS",
  );
  mustInclude("package.json", '"agentops:agent-detail-memory-hermes-verify"');
}

function verifySourceFiles(): void {
  mustInclude(
    "api/agentops/_lib/manualRunWorkerHealth.ts",
    "computeLiveOldestQueuedAgeMs",
  );
  mustInclude(
    "api/agentops/_lib/manualRunWorkerHealth.ts",
    "liveOldestQueuedAgeMs != null ? liveOldestQueuedAgeMs : opsOldestQueuedAgeMs",
  );
  mustInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    // live age first — frozen ops must not win
    "oldestQueuedAgeMs,",
  );
  mustNotInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "oldestQueuedAgeMs: ops?.oldestQueuedAgeMs ?? oldestQueuedAgeMs",
  );
  mustInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "opsOldestQueuedAgeMs",
  );
  mustInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    'metricScope === "agent"',
  );

  mustInclude(
    "src/lib/agentops/agents/agentDetailLatestRun.ts",
    "selectLatestAgentRun",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailLatestRun.ts",
    FLEET_DAILY_FALLBACK_BANNER,
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "openLatestRunDrawer",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "selectLatestAgentRun",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "buildFleetFallbackDrawer",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "Next tick unknown — scheduler offline/stale",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "agentHasQueuedScheduled",
  );
  mustNotInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "Fleet monitoring / GitHub Actions",
  );
  mustNotInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "Daily agent review",
  );
  mustNotInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "daily-agent execution",
  );

  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "Global queue:",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "Latest global completed:",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "This agent queue:",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "Latest completed for this agent",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "agentops-queued-scheduled-run-row",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "agentops-queue-row-cancel",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "Waiting for staging worker",
  );

  mustInclude(
    "src/lib/agentops/agents/agentDetailScheduleModel.ts",
    "Queued · waiting for staging worker",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentSchedulePanel.tsx",
    "Next due after queued run",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentSchedulePanel.tsx",
    "fleet GHA",
  );

  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "agentops-drawer-fleet-fallback",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "drawerFieldRows",
  );

  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "runtime memory records",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "Runtime memory records",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "Fleet Hermes",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "Agent Hermes connected",
  );

  mustInclude("package.json", '"agentops:agent-detail-final-verify"');

  // Function count budget unchanged by this phase (no new Vercel entry).
  const routes = read("api/agentops/_lib/monitoringRoutes.ts");
  if (!routes.includes("/api/agentops/monitoring/manual-run/queue")) {
    fail("queue route must remain on existing monitoring router (no new function)");
  }
}

function main(): void {
  verifyLatestRunSelection();
  verifyScheduleHonesty();
  verifyMemoryCopy();
  verifySourceFiles();

  if (failures.length > 0) {
    console.error("agentops:agent-detail-final-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log("agentops:agent-detail-final-verify PASS");
}

main();
