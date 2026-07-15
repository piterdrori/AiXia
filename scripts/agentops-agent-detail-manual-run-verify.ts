/**
 * Fix B — AgentOps per-agent manual run contract + wiring verify.
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

  const entireForbidden = validateAgentManualRunRequest(
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
  if (entireForbidden.ok) fail("browser_qa + entire_staging must be rejected");

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
  if (!AGENT_MANUAL_RUN_COPY.duplicateActive.includes("already has an active run")) {
    fail("Duplicate copy missing");
  }
  if (!AGENT_MANUAL_RUN_COPY.zeroFindings.includes("No qualifying findings")) {
    fail("Zero-findings wording missing");
  }
}

function verifyWiring(): void {
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "manual-run/capability");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "handleMonitoringManualRunStartRequest");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "owner_manual_single_agent");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "AGENTOPS_GITHUB_DISPATCH_TOKEN");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "This agent already has an active run.");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "aixia.app");
  mustInclude(
    ".github/workflows/agentops-daily-12-agent-review.yml",
    "owner_manual_run_id:",
  );
  mustInclude(
    ".github/workflows/agentops-daily-12-agent-review.yml",
    "AGENTOPS_MANUAL_WORK_TYPE",
  );
  mustInclude(
    "src/lib/agentops/runtime/agentOpsDaily12AgentReview.cli.ts",
    "AGENTOPS_OWNER_MANUAL_RUN_ID",
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

  // No auto-promotion / auto-fix language in contract summary builder.
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
