/**
 * Phase D-E6 — Agent Detail status strip alignment verify (static).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAgentStatusStrip,
  mapLatestAgentRunToStripScan,
  mapOwnerFacingToStripStatus,
} from "../src/lib/agentops/agents/agentDetailControlCenter.ts";
import { usefulRuntimeEmptyCopy } from "../src/lib/agentops/agents/agentDetailMemoryModel.ts";
import { selectLatestAgentRun } from "../src/lib/agentops/agents/agentDetailLatestRun.ts";

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

function verifyOwnerStatusAlignment(): void {
  if (mapOwnerFacingToStripStatus("Active", "failed") !== "Active") {
    fail("Active owner must stay Active when fleet review failed");
  }
  if (mapOwnerFacingToStripStatus("Paused", "failed") !== "Paused") {
    fail("Paused owner must stay Paused when fleet review failed");
  }
  if (mapOwnerFacingToStripStatus("Error", "completed") !== "Error") {
    fail("real Error status still maps to Error");
  }
  if (mapOwnerFacingToStripStatus("Unknown", "not_run") !== "Unknown") {
    fail("Unknown stays Unknown");
  }

  const strip = buildAgentStatusStrip({
    ownerStatus: "Active",
    isBlocked: false,
    rosterRow: {
      todayStatus: "failed",
      todayResult: "failed",
      agentStatus: "active",
      lastDailyRunAt: "2026-07-20T00:00:00.000Z",
    },
    latestAgentRun: {
      status: "completed",
      endedAt: "2026-07-21T03:00:00.000Z",
      trigger: "owner_manual",
      mode: "owner_manual_single_agent",
    },
    monitoringUnavailable: false,
    monitoringResolving: false,
    hermes: "Fleet available",
    hermesDetail: "ok",
    memory: "61 runtime memory records · 7 enabled",
    memoryDetail: "x",
    scheduleLabel: "Schedule executable",
    scheduleDetail: "y",
  });

  if (strip.agentStatus !== "Active") {
    fail(`strip owner must be Active, got ${strip.agentStatus}`);
  }
  if (strip.lastScanResult !== "Completed") {
    fail(`agent-scoped completed must win over fleet failed, got ${strip.lastScanResult}`);
  }
}

function verifyFleetFallbackLabeled(): void {
  const scan = mapLatestAgentRunToStripScan({
    latestAgentRun: null,
    fleetReviewFailed: true,
  });
  if (scan.result !== "Fleet fallback failed") {
    fail(`expected Fleet fallback failed, got ${scan.result}`);
  }
  if (!/fallback/i.test(scan.label)) {
    fail("fleet fallback detail must mention fallback");
  }

  const strip = buildAgentStatusStrip({
    ownerStatus: "Active",
    isBlocked: false,
    rosterRow: {
      todayStatus: "failed",
      todayResult: "failed",
      agentStatus: "active",
      lastDailyRunAt: "2026-07-20T00:00:00.000Z",
    },
    latestAgentRun: null,
    monitoringUnavailable: false,
    monitoringResolving: false,
    hermes: "Fleet available",
    hermesDetail: "ok",
    memory: "0 runtime memory records",
    memoryDetail: "x",
    scheduleLabel: "Schedule executable",
    scheduleDetail: "y",
  });
  if (strip.agentStatus === "Error") {
    fail("fleet failed must not set OWNER STATUS Error");
  }
  if (strip.lastScanResult === "Failed") {
    fail("stale fleet failure must not show prime Failed");
  }
  if (strip.lastScanResult !== "Fleet fallback failed") {
    fail(`expected Fleet fallback failed on strip, got ${strip.lastScanResult}`);
  }
}

function verifyLatestRunSelectorPriority(): void {
  const selected = selectLatestAgentRun({
    queued: [],
    running: [],
    recentTerminal: [
      {
        runId: "fleet-old",
        status: "failed",
        trigger: "other",
        mode: "daily_12",
        createdAt: "2026-07-19T00:00:00.000Z",
      },
      {
        runId: "owner-1",
        status: "completed",
        trigger: "owner_manual",
        mode: "owner_manual_single_agent",
        createdAt: "2026-07-21T01:00:00.000Z",
        endedAt: "2026-07-21T01:05:00.000Z",
      },
    ],
  });
  if (selected?.runId !== "owner-1") {
    fail("selectLatestAgentRun must prefer owner_manual over other terminal");
  }
}

function verifyMemoryUsefulEmptyCopy(): void {
  const copy = usefulRuntimeEmptyCopy({ runtimeTotal: 61, diagnosticCount: 61 });
  if (!/diagnostic/i.test(copy) || !/61/.test(copy)) {
    fail("useful-empty copy must mention diagnostics count");
  }
  if (/^No runtime memory records for this agent$/.test(copy)) {
    fail("must not use bare no-runtime copy when totals exist");
  }
}

function verifyUiContracts(): void {
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentStatusStrip.tsx",
    'label="Last run"',
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "latestAgentRun: selectedLatestRun",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "latestRunStripLabel",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "usefulRuntimeEmptyCopy",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "mapLatestAgentRunToStripScan",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "Fleet fallback failed",
  );
}

function main(): void {
  verifyOwnerStatusAlignment();
  verifyFleetFallbackLabeled();
  verifyLatestRunSelectorPriority();
  verifyMemoryUsefulEmptyCopy();
  verifyUiContracts();

  if (failures.length > 0) {
    console.error(
      JSON.stringify({ ok: false, command: "agentops:agent-detail-status-strip-verify", failures }, null, 2),
    );
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      command: "agentops:agent-detail-status-strip-verify",
      checks: [
        "owner_status_alignment",
        "fleet_fallback_labeled",
        "latest_run_priority",
        "memory_useful_empty_copy",
        "ui_contracts",
      ],
    }),
  );
}

main();
