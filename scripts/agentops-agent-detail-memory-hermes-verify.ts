/**
 * Phase D-E2 — Agent Detail Memory/Hermes presentation verify (static).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AGENT_DETAIL_MEMORY_COPY,
  isDiagnosticRuntimeMemory,
  mapMemoryPartitionToStripStatus,
  MEMORY_LOAD_TIMEOUT_MS,
  partitionRuntimeMemory,
  resolveAgentHermesConnectionLabel,
  resolveFleetHermesTransportLabel,
} from "../src/lib/agentops/agents/agentDetailMemoryModel.ts";
import {
  buildHermesConnectionModel,
  evaluateHermesSafeConnectionTest,
  hermesStatusForStrip,
} from "../src/lib/agentops/agents/agentDetailHermesConnection.ts";
import type { AgentOpsRuntimeMemoryRow } from "../src/lib/agentops/db/agentOpsRuntimeTypes.ts";

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

function row(
  partial: Partial<AgentOpsRuntimeMemoryRow> & { content: unknown },
): AgentOpsRuntimeMemoryRow {
  return {
    id: partial.id ?? "id",
    scope: partial.scope ?? "agent",
    agent_id: partial.agent_id ?? "uuid",
    content: partial.content,
    source: partial.source ?? "system",
    approved: partial.approved ?? false,
    created_at: partial.created_at ?? "2026-07-01T00:00:00.000Z",
    environment: partial.environment ?? "staging",
  } as AgentOpsRuntimeMemoryRow;
}

function verifyPartitionAndNoise(): void {
  const useful = row({
    id: "u1",
    content: "Prefer staging-only deploys",
    approved: true,
    source: "user",
  });
  const noisy = row({
    id: "n1",
    content: "cycle scanned for agent",
    approved: true,
    source: "system",
  });
  const marker = row({
    id: "n2",
    content: { kind: "thread-marker", text: "cross-agent marker" },
    approved: false,
    source: "system",
  });
  if (!isDiagnosticRuntimeMemory(noisy)) fail("cycle scanned must be diagnostic");
  if (!isDiagnosticRuntimeMemory(marker)) fail("thread-marker must be diagnostic");
  if (isDiagnosticRuntimeMemory(useful)) fail("useful owner fact must not be diagnostic");

  const part = partitionRuntimeMemory([useful, noisy, marker], [
    row({ id: "g1", scope: "global", content: "shared rule", approved: true }),
  ]);
  if (part.counts.runtimeTotal !== 3) fail("runtimeTotal must be 3");
  if (part.counts.diagnostic !== 2) fail("diagnostic count must be 2");
  if (part.counts.approvedUseful !== 1) fail("approvedUseful must be 1");
  if (part.counts.enabledRuntime !== 2) fail("enabledRuntime counts approved flag on all agent rows");
  if (part.approvedUsefulRows[0]?.id !== "u1") fail("approved useful must exclude diagnostics");
  if (part.counts.globalApproved !== 1) fail("globalApproved must be 1");
}

function verifyHermesSeparation(): void {
  if (resolveFleetHermesTransportLabel({ loaded: false }) !== "Unknown") {
    fail("fleet transport unknown before load");
  }
  if (
    resolveFleetHermesTransportLabel({
      loaded: true,
      ok: true,
      transportReachable: true,
    }) !== "Available"
  ) {
    fail("fleet transport available when ok+reachable");
  }
  if (
    resolveAgentHermesConnectionLabel({
      agentSpecificRecordExists: false,
      runtimeAgentId: "uuid",
    }) !== "Not configured"
  ) {
    fail("agent Hermes must be Not configured without connection record");
  }
  if (
    resolveAgentHermesConnectionLabel({
      agentSpecificRecordExists: true,
      runtimeAgentId: "uuid",
    }) !== "Connected"
  ) {
    fail("agent Hermes Connected only with dedicated record");
  }

  const model = buildHermesConnectionModel({
    agentId: "uuid",
    health: {
      ok: true,
      status: "ready",
      transportReachable: true,
      mode: "live",
      message: "ok",
      checkedAt: new Date().toISOString(),
      loadError: null,
    } as never,
    healthError: null,
    assignedMemoryCount: 5,
    enabledMemoryCount: 2,
    pendingApprovalCount: 0,
    retrievalError: null,
    lastSuccessfulRetrievalAt: new Date().toISOString(),
    tested: true,
    agentSpecificRecordExists: false,
    runtimeAgentId: "uuid",
  });
  if (model.agentSpecificRecordExists) fail("model must not invent per-agent record");
  if (model.fleetStatus !== "Fleet available") fail("fleetStatus should be Fleet available");
  const strip = hermesStatusForStrip(model);
  if (!/Agent Hermes not configured/i.test(strip.detail)) {
    fail("strip detail must say Agent Hermes not configured");
  }
  if (/Agent Hermes connected/i.test(strip.detail) && !model.agentSpecificRecordExists) {
    fail("strip must not claim Agent Hermes connected without record");
  }

  const test = evaluateHermesSafeConnectionTest({
    health: {
      ok: true,
      status: "ready",
      transportReachable: true,
      mode: "live",
      message: "ok",
      checkedAt: new Date().toISOString(),
      loadError: null,
    } as never,
    healthError: null,
    runtimeAgentId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    memoryQueryOk: true,
    memoryError: null,
    assignedMemoryCount: 12,
    agentSpecificRecordExists: false,
  });
  if (!test.fleetTransportAvailable) fail("test should report fleet transport available");
  if (test.agentHermesLabel !== "Not configured") {
    fail("test must not mark agent Hermes connected from fleet transport alone");
  }
  if (!/Agent Hermes: Not configured/i.test(test.detail)) {
    fail("test detail must state Agent Hermes not configured");
  }
  if (/Agent Hermes connected/i.test(test.detail)) {
    fail("test detail must not say Agent Hermes connected");
  }
}

function verifyStripLabels(): void {
  const mapped = mapMemoryPartitionToStripStatus({
    loaded: true,
    error: null,
    runtimeTotal: 120,
    enabledRuntime: 12,
    pendingDrafts: 0,
    diagnosticCount: 80,
  });
  if (!/120 runtime memory records · 12 enabled/i.test(mapped.status)) {
    fail(`unexpected strip status: ${mapped.status}`);
  }
  if (!/no pending drafts/i.test(mapped.status)) {
    fail("strip should include no pending drafts");
  }
  if (/ASSIGNED|ACTIVE/i.test(mapped.status)) {
    fail("strip must not use ASSIGNED · ACTIVE wording");
  }

  const timed = mapMemoryPartitionToStripStatus({
    loaded: false,
    error: AGENT_DETAIL_MEMORY_COPY.memoryLoadSlow,
    timedOut: true,
    runtimeTotal: null,
    enabledRuntime: null,
    pendingDrafts: null,
  });
  if (timed.status !== "Memory load slow") fail("timeout strip status");
  if (!timed.detail.includes("Refresh memory") && !timed.detail.includes("refresh memory")) {
    fail("timeout detail should mention refresh memory");
  }

  if (!(MEMORY_LOAD_TIMEOUT_MS >= 10_000 && MEMORY_LOAD_TIMEOUT_MS <= 60_000)) {
    fail("MEMORY_LOAD_TIMEOUT_MS should be a sensible UI timeout");
  }
}

function verifySourceFiles(): void {
  const panel = "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx";
  mustInclude(panel, "Fleet Hermes");
  mustInclude(panel, "memory-summary-fleet-hermes");
  mustInclude(panel, "memory-summary-agent-hermes");
  mustInclude(panel, "Agent Hermes");
  mustInclude(panel, "memory-summary-runtime");
  mustInclude(panel, "Runtime memory");
  mustInclude(panel, "Pending drafts");
  mustInclude(panel, "AGENT_DETAIL_MEMORY_COPY.noPerAgentBanner");
  mustInclude(
    "src/lib/agentops/agents/agentDetailMemoryModel.ts",
    AGENT_DETAIL_MEMORY_COPY.noPerAgentBanner,
  );
  mustInclude(panel, "MEMORY_LOAD_TIMEOUT_MS");
  mustInclude(panel, "withTimeout");
  mustInclude(panel, "partitionRuntimeMemory");
  mustInclude(panel, "agentops-memory-tab-diagnostics");
  mustInclude(panel, "agentops-diagnostics-toggle");
  mustInclude(panel, "Shared/global");
  mustInclude(panel, "Refresh memory");
  mustInclude(panel, "Test Hermes connection");
  mustInclude(panel, "Load more");
  mustInclude(panel, "identityReady");
  mustInclude(panel, "Waiting for runtime agent identity");
  mustNotInclude(panel, "Agent Hermes connected");
  mustNotInclude(panel, "120 ASSIGNED");

  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentStatusStrip.tsx",
    "Fleet Hermes",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "identityReady={!loading && identity != null}",
  );

  mustInclude("src/lib/agentops/agents/agentDetailMemoryModel.ts", "isDiagnosticRuntimeMemory");
  mustInclude("src/lib/agentops/agents/agentDetailMemoryModel.ts", "runtime memory records");

  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "diagnosticCount: stats.diagnostic",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "timedOut: stats.timedOut",
  );

  // Owner drafts stay pending until explicit approve — no silent apply on load
  mustInclude(panel, "Does not auto-promote");
  mustInclude(panel, "pending owner approval");

  mustInclude("package.json", '"agentops:agent-detail-memory-hermes-verify"');
  mustInclude("package.json", '"agentops:agent-detail-final-verify"');
}

function main(): void {
  verifyPartitionAndNoise();
  verifyHermesSeparation();
  verifyStripLabels();
  verifySourceFiles();

  if (failures.length > 0) {
    console.error("agentops:agent-detail-memory-hermes-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log("agentops:agent-detail-memory-hermes-verify PASS");
}

main();
