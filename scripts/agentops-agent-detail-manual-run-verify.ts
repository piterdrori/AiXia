/**
 * Fix B2-A — AgentOps per-agent manual run queue-accept verify.
 * Usage: npx tsx scripts/agentops-agent-detail-manual-run-verify.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AGENT_MANUAL_RUN_COPY,
  validateAgentManualRunRequest,
} from "../src/lib/agentops/agents/agentManualRunContract";
import { CANONICAL_AGENTS } from "../src/lib/agentops/canonicalAgents";

const REPO_ROOT = process.cwd();
const failures: string[] = [];
const slugs = CANONICAL_AGENTS.map((agent) => agent.id);

function fail(message: string): void {
  failures.push(message);
}

function mustInclude(relativePath: string, needle: string, label?: string): void {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing file: ${relativePath}`);
    return;
  }
  const text = readFileSync(full, "utf8");
  if (!text.includes(needle)) {
    fail(`${label ?? relativePath} must include ${JSON.stringify(needle)}`);
  }
}

function mustNotInclude(relativePath: string, needle: string, label?: string): void {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing file: ${relativePath}`);
    return;
  }
  const text = readFileSync(full, "utf8");
  if (text.includes(needle)) {
    fail(`${label ?? relativePath} must NOT include ${JSON.stringify(needle)}`);
  }
}

function verifyContract(): void {
  const valid = validateAgentManualRunRequest(
    {
      agentSlug: "system-agent",
      workType: "website_audit",
      scope: { type: "assigned_modules" },
      maxDurationMinutes: 15,
      avoidOverlap: true,
      requestedBy: "owner",
    },
    slugs,
  );
  if (!valid.ok) fail(`Expected valid website_audit request: ${valid.error}`);

  const browser = validateAgentManualRunRequest(
    {
      agentSlug: "system-agent",
      workType: "browser_qa",
      scope: { type: "selected_routes", routes: ["/system/agent-ops"] },
      maxDurationMinutes: 10,
      avoidOverlap: true,
      requestedBy: "owner",
    },
    slugs,
  );
  if (!browser.ok) fail(`Expected valid browser_qa request: ${browser.error}`);

  const entireAllowed = validateAgentManualRunRequest(
    {
      agentSlug: "system-agent",
      workType: "browser_qa",
      scope: { type: "entire_staging" },
      maxDurationMinutes: 10,
      avoidOverlap: true,
      requestedBy: "owner",
    },
    slugs,
  );
  if (!entireAllowed.ok) {
    fail(`browser_qa + entire_staging must be allowed: ${entireAllowed.error}`);
  }

  const badSlug = validateAgentManualRunRequest(
    {
      agentSlug: "not-an-agent",
      workType: "website_audit",
      scope: { type: "assigned_modules" },
      maxDurationMinutes: 15,
      avoidOverlap: true,
      requestedBy: "owner",
    },
    slugs,
  );
  if (badSlug.ok) fail("Unknown agentSlug must be rejected");

  const injection = validateAgentManualRunRequest(
    {
      agentSlug: "system-agent; rm -rf /",
      workType: "website_audit",
      scope: { type: "assigned_modules" },
      maxDurationMinutes: 15,
      avoidOverlap: true,
      requestedBy: "owner",
    },
    slugs,
  );
  if (injection.ok) fail("Command-like agentSlug must be rejected");

  if (!AGENT_MANUAL_RUN_COPY.confirmSideEffects.includes("cannot modify code or deploy")) {
    fail("Confirm copy must state cannot modify code or deploy");
  }
  if (!AGENT_MANUAL_RUN_COPY.duplicateActive.includes("active or queued run")) {
    fail("Duplicate copy must mention active or queued run");
  }
  if (!AGENT_MANUAL_RUN_COPY.workerNotConnected.includes("Staging worker not connected")) {
    fail("Worker offline copy missing");
  }
  if (!AGENT_MANUAL_RUN_COPY.queueAcceptMessage.includes("Run queued for staging worker")) {
    fail("Queue accept message missing");
  }
  if (!AGENT_MANUAL_RUN_COPY.zeroFindings.includes("No qualifying findings")) {
    fail("Zero-findings wording missing");
  }
  if (AGENT_MANUAL_RUN_COPY.vercelCannotScan.toLowerCase().includes("github actions")) {
    fail("Contract copy must not claim GitHub Actions execution");
  }
}

function verifyWiring(): void {
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "manual-run/capability");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "handleMonitoringManualRunStartRequest");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "owner_manual_single_agent");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "buildCapabilityFromHealth");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "Run queued for staging worker.");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "This agent already has an active or queued run.");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "readManualRunWorkerHealth");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "queueAvailable: true");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "Staging worker not connected.");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "Website audit engine not connected");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "Browser QA engine not connected.");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "scanStagingWebsite");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "HEARTBEAT_FRESH_MS");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "Website audit running on staging worker.");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "aixia.app");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "schedulerConnection");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "queueVersion");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", 'status: "queued"');
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "website-audit-once");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "claim-test");
  mustInclude("scripts/agentops-manual-run-website-audit-engine.ts", "scanStagingWebsite");

  mustNotInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "AGENTOPS_GITHUB_DISPATCH_TOKEN",
    "manual-run accept must not require GitHub dispatch token",
  );
  mustNotInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "workflow_dispatch",
    "manual-run accept must not call workflow_dispatch",
  );
  mustNotInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "api.github.com",
    "manual-run accept must not call GitHub API",
  );
  mustNotInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "dispatchDaily12Workflow",
    "manual-run must not dispatch Daily-12",
  );

  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "agentops-run-audit-now",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "agentops-run-browser-qa-now",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "agentops-execution-worker-status",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "stagingQueueBadge",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "Staging worker · No GitHub dependency",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "Website audit ready",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "Browser QA not ready",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "GHA",
    "Detail header must not show GHA badge wording",
  );

  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "AgentManualRunConfirmModal",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "fetchManualRunStatus",
  );
  mustInclude(
    "src/lib/agentops/agents/agentManualRunClient.ts",
    "/api/agentops/monitoring/manual-run",
  );
  mustInclude(
    "src/lib/agentops/agents/agentManualRunClient.ts",
    "queueAvailable",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "Staging worker not connected.",
  );
  mustNotInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "GHA Playwright",
    "Control center copy must not advertise GHA Playwright",
  );

  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentManualRunConfirmModal.tsx",
    "queued for staging worker",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentManualRunConfirmModal.tsx",
    "GitHub Actions",
    "Confirm modal must not say GitHub Actions",
  );

  const contract = readFileSync(
    join(REPO_ROOT, "src/lib/agentops/agents/agentManualRunContract.ts"),
    "utf8",
  );
  if (!contract.includes("autoPromoteBlocked: true")) {
    fail("Manual run summary must set autoPromoteBlocked");
  }
  if (!contract.includes("autoFixBlocked: true")) {
    fail("Manual run summary must set autoFixBlocked");
  }

  const migration = join(
    REPO_ROOT,
    "supabase/migrations/20260717160000_agentops_monitoring_runs_owner_manual_statuses.sql",
  );
  if (!existsSync(migration)) {
    fail("Missing queued/running status migration file");
  } else {
    const sql = readFileSync(migration, "utf8");
    if (!sql.includes("'queued'") || !sql.includes("'running'")) {
      fail("Migration must allow queued and running statuses");
    }
  }
}

function verifyNoNewTopLevelFunction(): void {
  const vercelJson = join(REPO_ROOT, "vercel.json");
  if (!existsSync(vercelJson)) return;
  const text = readFileSync(vercelJson, "utf8");
  if (text.includes("api/agentops/manual-run")) {
    fail("Do not add a separate top-level manual-run Vercel function");
  }
}

verifyContract();
verifyWiring();
verifyNoNewTopLevelFunction();

if (failures.length > 0) {
  console.error("agentops-agent-detail-manual-run-verify FAILED:");
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log("agentops-agent-detail-manual-run-verify PASS");
