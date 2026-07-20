/**
 * Agent Detail Control Center — static verify for shared page + schedule + honesty.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CANONICAL_AGENTS } from "../src/lib/agentops/canonicalAgents.ts";
import {
  buildAgentStatusStrip,
  mapHermesRuntimeToStripStatus,
  mapManagedToStripAgentStatus,
  mapMemoryCountsToStripStatus,
} from "../src/lib/agentops/agents/agentDetailControlCenter.ts";
import {
  computeNextExpectedRunAt,
  DEFAULT_AGENT_DETAIL_SCHEDULE,
  frequencyToIntervalMinutes,
  MIN_SCHEDULE_INTERVAL_MINUTES,
  normalizeDetailSchedule,
  validateAgentDetailSchedule,
} from "../src/lib/agentops/agents/agentDetailScheduleModel.ts";
import { evaluateHermesSafeConnectionTest } from "../src/lib/agentops/agents/agentDetailHermesConnection.ts";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`AGENT DETAIL CONTROL CENTER REGRESSION: ${message}`);
  }
}

function main(): void {
  assert(CANONICAL_AGENTS.length === 12, "exactly 12 canonical agents");

  const page = read("src/app/system/agent-ops/agents/[agentId]/page.tsx");
  assert(page.includes("AgentControlHeader"), "shared header");
  assert(page.includes("AgentStatusStrip"), "status strip");
  assert(page.includes("AgentChatWorkspace"), "chat workspace");
  assert(page.includes("AgentSchedulePanel"), "schedule panel");
  assert(page.includes("AgentMemoryHermesPanel"), "memory panel");
  assert(page.includes("AgentResultsPanel"), "results panel");
  assert(page.includes("AgentPermissionsPanel"), "permissions panel");
  assert(page.includes("AgentActivityPanel"), "activity panel");
  assert(!page.includes("Latest work"), "old Latest work removed");
  assert(!page.includes("Work mode and automation"), "old work mode removed");
  assert(!page.includes("AgentOpsAdvancedDisclosure"), "old advanced disclosure removed");
  assert(!page.includes("AgentOpsAgentScheduleBox"), "old schedule box removed");

  assert(mapManagedToStripAgentStatus("active", "not_run", false) === "Active", "active status");
  assert(mapManagedToStripAgentStatus("quiet", "not_run", false) === "Paused", "paused status");
  assert(mapManagedToStripAgentStatus(null, "not_run", false) === "Unknown", "unknown honesty");

  const hermesUnknown = mapHermesRuntimeToStripStatus({ loaded: false });
  assert(hermesUnknown.status === "Unknown", "hermes unknown before load");

  const memoryEmpty = mapMemoryCountsToStripStatus({
    loaded: true,
    error: null,
    assignedCount: 0,
    enabledCount: 0,
  });
  assert(memoryEmpty.status === "No assigned memory", "empty memory honesty");

  const strip = buildAgentStatusStrip({
    ownerStatus: "Active",
    managedStatus: "active",
    isBlocked: false,
    rosterRow: null,
    monitoringUnavailable: false,
    monitoringResolving: false,
    hermes: "Unknown",
    hermesDetail: "x",
    memory: "Unknown",
    memoryDetail: "y",
    scheduleLabel: "Manual only",
    scheduleDetail: "Not configured",
  });
  assert(strip.lastScanResult === "Not run", "last scan not run");
  assert(strip.currentActivity === "Idle", "idle activity");

  assert(MIN_SCHEDULE_INTERVAL_MINUTES === 60, "hourly minimum");
  assert(frequencyToIntervalMinutes("every_hours", 1, "hours") === 60, "1h = 60m");
  assert(
    validateAgentDetailSchedule({
      ...DEFAULT_AGENT_DETAIL_SCHEDULE,
      frequencyType: "every_hours",
      intervalValue: 0,
      enableSchedule: true,
      workTypes: ["browser_qa"],
    }).ok === false,
    "reject sub-hour / zero interval",
  );

  const every6 = normalizeDetailSchedule({
    ...DEFAULT_AGENT_DETAIL_SCHEDULE,
    frequencyType: "every_hours",
    intervalValue: 6,
    intervalUnit: "hours",
    enableSchedule: true,
    ownerEnabled: true,
    workTypes: ["website_audit", "browser_qa"],
  });
  const next6 = computeNextExpectedRunAt(every6, new Date("2026-07-15T00:00:00.000Z"));
  assert(Boolean(next6), "next run for 6h");
  assert(
    new Date(next6!).getTime() - Date.parse("2026-07-15T00:00:00.000Z") === 6 * 60 * 60 * 1000,
    "6h delta",
  );

  const daily = normalizeDetailSchedule({
    ...DEFAULT_AGENT_DETAIL_SCHEDULE,
    frequencyType: "every_days",
    intervalValue: 2,
    intervalUnit: "days",
    enableSchedule: true,
    ownerEnabled: true,
  });
  const nextDaily = computeNextExpectedRunAt(daily, new Date("2026-07-15T00:00:00.000Z"));
  assert(
    new Date(nextDaily!).getTime() - Date.parse("2026-07-15T00:00:00.000Z") === 2 * 24 * 60 * 60 * 1000,
    "2 day delta",
  );

  const weekly = normalizeDetailSchedule({
    ...DEFAULT_AGENT_DETAIL_SCHEDULE,
    frequencyType: "every_weeks",
    intervalValue: 1,
    intervalUnit: "weeks",
    enableSchedule: true,
    ownerEnabled: true,
  });
  assert(Boolean(computeNextExpectedRunAt(weekly)), "weekly next run");

  assert(every6.avoidOverlap === true, "overlap prevention default");
  assert(every6.schedulerExecutionConnected === false, "scheduler honesty");

  const hermesTest = evaluateHermesSafeConnectionTest({
    health: null,
    healthError: "down",
    runtimeAgentId: "a27b8930-bad9-43e7-892d-00236e7c7d64",
    memoryQueryOk: false,
    memoryError: "x",
    assignedMemoryCount: 0,
  });
  assert(hermesTest.status === "Fleet unavailable", "hermes test failed honesty");

  const schedulePanel = read(
    "src/components/agentops/owner/agent-detail/AgentSchedulePanel.tsx",
  );
  assert(schedulePanel.includes("worker scheduler offline") || schedulePanel.includes("executable by staging worker"), "pending scheduler label");
  assert(schedulePanel.includes("Edit schedule"), "progressive schedule editor");

  const memoryPanel = read(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
  );
  assert(memoryPanel.includes("Approve and activate"), "owner approve path");
  assert(memoryPanel.includes("Save draft"), "draft path");
  assert(memoryPanel.includes("pending_approval"), "pending approval");

  const permissions = read(
    "src/components/agentops/owner/agent-detail/AgentPermissionsPanel.tsx",
  );
  assert(permissions.includes("Modify code"), "modify code row");
  assert(permissions.includes("Blocked"), "code change blocked");

  console.log(
    JSON.stringify(
      {
        ok: true,
        canonicalAgents: CANONICAL_AGENTS.length,
        sharedPage: true,
        schedulerExecutionConnected: false,
      },
      null,
      2,
    ),
  );
}

main();
