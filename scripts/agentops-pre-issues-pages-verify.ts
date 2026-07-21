/**
 * Phase D-G0 — static pre-Issues pages verify.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CANONICAL_AGENTS } from "../src/lib/agentops/canonicalAgents.ts";
import { buildAgentHermesNamespace } from "../src/lib/agentops/agents/agentHermesMemoryModel.ts";
import {
  mapOwnerFacingToStripStatus,
  mapLatestAgentRunToStripScan,
} from "../src/lib/agentops/agents/agentDetailControlCenter.ts";

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
  if (!read(rel).includes(needle)) fail(`${rel} must include ${JSON.stringify(needle)}`);
}

function mustNotInclude(rel: string, needle: string): void {
  if (read(rel).includes(needle)) fail(`${rel} must NOT include ${JSON.stringify(needle)}`);
}

function verifyRoutesExist(): void {
  mustInclude("src/app/system/agent-ops/page.tsx", "AgentOps");
  mustInclude("src/app/system/agent-ops/agents/page.tsx", "agents");
  mustInclude("src/app/system/agent-ops/agents/page.tsx", "StagingWorkerHealthStrip");
  mustInclude("src/components/agentops/owner/AgentOpsAgentCard.tsx", "agentops-open-agent-");
  mustInclude("src/app/system/agent-ops/agents/[agentId]/page.tsx", "AgentMemoryHermesPanel");
  mustInclude("src/app/system/agent-ops/agents/[agentId]/page.tsx", "buildAgentStatusStrip");
  mustInclude("src/app/system/agent-ops/agents/[agentId]/page.tsx", "selectLatestAgentRun");
  // Control Center lock: overview stays module-focused (no worker/scheduler dashboard blocks).
  mustNotInclude("src/app/system/agent-ops/page.tsx", "StagingWorkerHealthStrip");
}

function verifyCanonicalDetailCoverage(): void {
  const required = [
    "system-agent",
    "design-agent",
    "qa-agent",
    "analytics-agent",
    "runtime-agent",
    "logs-agent",
  ];
  for (const slug of required) {
    if (!CANONICAL_AGENTS.some((a) => a.id === slug)) {
      fail(`canonical roster missing ${slug}`);
    }
    const ns = buildAgentHermesNamespace(slug);
    if (ns !== `agentops.agent.${slug}`) fail(`bad namespace for ${slug}: ${ns}`);
  }
  const allNs = CANONICAL_AGENTS.map((a) => buildAgentHermesNamespace(a.id));
  if (new Set(allNs).size !== allNs.length) fail("Hermes namespaces must be unique");
}

function verifyNoStatusContradictions(): void {
  if (mapOwnerFacingToStripStatus("Active", "failed") !== "Active") {
    fail("Active owner must not become Error from fleet failed");
  }
  const scan = mapLatestAgentRunToStripScan({
    latestAgentRun: {
      status: "completed",
      endedAt: "2026-07-21T00:00:00.000Z",
      trigger: "owner_manual",
      mode: "owner_manual_single_agent",
    },
    fleetReviewFailed: true,
  });
  if (scan.result !== "Completed") {
    fail("agent-scoped completed must beat fleet failed");
  }
}

function verifyNoIssuesApprovalStarted(): void {
  const detail = "src/app/system/agent-ops/agents/[agentId]/page.tsx";
  const panel = "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx";
  mustInclude(panel, "Preview only");
  mustNotInclude(detail, "Promote finding to issue");
  mustNotInclude(panel, "auto-promote");
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "getAgentHermesMemory",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "memory-summary-namespace",
  );
}

function verifyPackageAndBudget(): void {
  mustInclude("package.json", '"agentops:pre-issues-pages-verify"');
  mustInclude("package.json", '"agentops:agent-hermes-memory-verify"');
  // Function count stays on monitoring router — no new route files for D-G0.
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "/api/agentops/monitoring/manual-run/queue");
}

function main(): void {
  verifyRoutesExist();
  verifyCanonicalDetailCoverage();
  verifyNoStatusContradictions();
  verifyNoIssuesApprovalStarted();
  verifyPackageAndBudget();

  if (failures.length) {
    console.error("agentops:pre-issues-pages-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      command: "agentops:pre-issues-pages-verify",
      canonicalAgents: CANONICAL_AGENTS.length,
      checks: [
        "routes_exist",
        "canonical_detail_coverage",
        "no_status_contradictions",
        "no_issues_approval_ui",
        "hermes_namespaces_unique",
      ],
    }),
  );
}

main();
