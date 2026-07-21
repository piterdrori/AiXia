/**
 * Phase D-F1 — per-agent Hermes memory model verify (static).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAgentHermesNamespace,
  isApprovedActiveAgentMemory,
  isPendingMemoryImprovement,
  resolveConnectionStatusFromRetrieval,
  selectApprovedAgentMemoryForPrompt,
} from "../src/lib/agentops/agents/agentHermesMemoryModel.ts";
import { resolveAgentHermesConnectionLabel } from "../src/lib/agentops/agents/agentDetailMemoryModel.ts";
import type { AgentOpsManagedAgentMemoryItem } from "../src/lib/agentops/types.ts";

const CANONICAL_AGENT_IDS = [
  "system-agent",
  "memory-agent",
  "issue-agent",
  "evolution-agent",
  "fix-agent",
  "qa-agent",
  "design-agent",
  "runtime-agent",
  "logs-agent",
  "config-agent",
  "chat-agent",
  "analytics-agent",
] as const;

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

function item(
  partial: Partial<AgentOpsManagedAgentMemoryItem> & { memoryText: string },
): AgentOpsManagedAgentMemoryItem {
  return {
    id: partial.id ?? "id",
    agentId: partial.agentId ?? "design-agent",
    memoryType: partial.memoryType ?? "instruction",
    memoryText: partial.memoryText,
    active: partial.active ?? false,
    confidenceScore: null,
    createdAt: "2026-07-21T00:00:00.000Z",
    source: "manual",
    priority: "medium",
    inputMemoryType: "instruction",
    note: null,
    title: partial.title ?? null,
    ownerFacingType: "approved_fact",
    scope: "private",
    approvalStatus: partial.approvalStatus ?? "pending_approval",
    fileStoragePath: null,
    fileName: null,
  };
}

function verifyNamespaces(): void {
  const namespaces = CANONICAL_AGENT_IDS.map((id) => buildAgentHermesNamespace(id));
  if (namespaces.length !== CANONICAL_AGENT_IDS.length) fail("namespace count mismatch");
  if (new Set(namespaces).size !== namespaces.length) fail("namespaces must be unique");
  if (!namespaces.includes("agentops.agent.design-agent")) {
    fail("design-agent namespace missing");
  }
  for (const ns of namespaces) {
    if (!/^agentops\.agent\.[a-z0-9-]+$/.test(ns)) fail(`bad namespace: ${ns}`);
  }
}

function verifyConnectionStatusRules(): void {
  if (
    resolveConnectionStatusFromRetrieval({
      recordExists: false,
      retrievalOk: true,
    }) !== "not_configured"
  ) {
    fail("missing record => not_configured");
  }
  if (
    resolveConnectionStatusFromRetrieval({
      recordExists: true,
      retrievalOk: false,
      retrievalError: "boom",
    }) !== "error"
  ) {
    fail("record + failed retrieval => error");
  }
  if (
    resolveConnectionStatusFromRetrieval({
      recordExists: true,
      retrievalOk: true,
    }) !== "connected"
  ) {
    fail("record + retrieval ok => connected");
  }
  if (
    resolveAgentHermesConnectionLabel({
      agentSpecificRecordExists: false,
      runtimeAgentId: "uuid",
    }) !== "Not configured"
  ) {
    fail("label Not configured without record");
  }
  if (
    resolveAgentHermesConnectionLabel({
      agentSpecificRecordExists: true,
      runtimeAgentId: "uuid",
    }) !== "Connected"
  ) {
    fail("label Connected with record");
  }
}

function verifyMemoryScopes(): void {
  const approved = item({
    id: "a1",
    active: true,
    approvalStatus: "active",
    memoryText: "Prefer owner-readable status",
  });
  const pending = item({
    id: "p1",
    active: false,
    approvalStatus: "pending_approval",
    memoryText: "Pending improvement text",
  });
  const rejected = item({
    id: "r1",
    active: false,
    approvalStatus: "rejected",
    memoryText: "Rejected text",
  });

  if (!isApprovedActiveAgentMemory(approved)) fail("approved active must pass");
  if (isApprovedActiveAgentMemory(pending)) fail("pending must not be approved active");
  if (isApprovedActiveAgentMemory(rejected)) fail("rejected must not be approved active");
  if (!isPendingMemoryImprovement(pending)) fail("pending improvement detector");
  if (isPendingMemoryImprovement(approved)) fail("approved is not pending");

  const prompt = selectApprovedAgentMemoryForPrompt([approved, pending, rejected], 8);
  if (prompt.length !== 1 || prompt[0] !== "Prefer owner-readable status") {
    fail("prompt context must include only approved active memory");
  }
  if (prompt.some((t) => /Pending|Rejected/i.test(t))) {
    fail("prompt must exclude pending/rejected");
  }
}

function verifySourceContracts(): void {
  mustInclude("src/lib/agentops/agents/agentHermesMemory.ts", "getAgentHermesMemory");
  mustInclude("src/lib/agentops/agents/agentHermesMemoryModel.ts", "buildAgentHermesNamespace");
  mustInclude("src/lib/agentops/agents/agentHermesMemory.ts", "proposeAgentMemoryImprovement");
  mustInclude("src/lib/agentops/agents/agentHermesMemory.ts", "approveAgentMemoryImprovement");
  mustInclude("src/lib/agentops/agents/agentHermesMemory.ts", "rejectAgentMemoryImprovement");
  mustInclude("src/lib/agentops/agents/agentHermesMemoryModel.ts", "selectApprovedAgentMemoryForPrompt");
  mustInclude(
    "supabase/migrations/20260721120000_agentops_agent_hermes_connections.sql",
    "agentops_agent_hermes_connections",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "getAgentHermesMemory",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "memory-summary-namespace",
  );
  mustInclude(
    "src/components/agentops/owner/useAgentOpsAgentChat.tsx",
    "selectApprovedAgentMemoryForPrompt",
  );
  mustInclude("package.json", '"agentops:agent-hermes-memory-verify"');
}

function main(): void {
  verifyNamespaces();
  verifyConnectionStatusRules();
  verifyMemoryScopes();
  verifySourceContracts();

  if (failures.length > 0) {
    console.error("agentops:agent-hermes-memory-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      command: "agentops:agent-hermes-memory-verify",
      canonicalAgents: CANONICAL_AGENT_IDS.length,
      namespaces: CANONICAL_AGENT_IDS.map((id) => buildAgentHermesNamespace(id)),
    }),
  );
}

main();
