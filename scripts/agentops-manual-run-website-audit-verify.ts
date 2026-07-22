/**
 * Fix B2-C — website audit engine + capability verify.
 * Usage: npx tsx scripts/agentops-manual-run-website-audit-verify.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const failures: string[] = [];
const __dirname = dirname(fileURLToPath(import.meta.url));

function fail(message: string): void {
  failures.push(message);
}

function mustInclude(relativePath: string, needle: string): void {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing file: ${relativePath}`);
    return;
  }
  const text = readFileSync(full, "utf8");
  if (!text.includes(needle)) {
    fail(`${relativePath} must include ${JSON.stringify(needle)}`);
  }
}

function mustNotInclude(relativePath: string, needle: string): void {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing file: ${relativePath}`);
    return;
  }
  const text = readFileSync(full, "utf8");
  if (text.includes(needle)) {
    fail(`${relativePath} must NOT include ${JSON.stringify(needle)}`);
  }
}

async function verifyCore(): Promise<void> {
  const coreUrl = pathToFileURL(join(__dirname, "lib/agentops-manual-run-worker-core.mjs")).href;
  const core = (await import(coreUrl)) as typeof import("./lib/agentops-manual-run-worker-core.mjs");

  const healthConnected = {
    lastHeartbeatAt: new Date().toISOString(),
    websiteAuditEngine: { connected: true, version: "b2-c", reason: null },
    browserQaEngine: { connected: false, reason: "Browser QA engine not connected until B2-D." },
  };
  if (!core.isWebsiteAuditEngineConnected(healthConnected)) {
    fail("websiteAuditEngine connected should be detected");
  }
  if (
    core.isWebsiteAuditEngineConnected({
      websiteAuditEngine: { connected: false, reason: "x" },
    })
  ) {
    fail("websiteAuditEngine disconnected should be false");
  }

  const claim = core.buildWebsiteAuditClaimSummary(
    {
      trigger: "owner_manual",
      workType: "website_audit",
      schedulerConnection: "staging_worker_pending",
    },
    { workerId: "w1", claimedAt: "2026-07-20T12:00:00.000Z" },
  );
  if (claim.workerPhase !== "b2-c" || claim.executionEngine !== "website_audit") {
    fail("Website audit claim markers missing");
  }
  if (claim.claimTest === true) fail("Website audit claim must not be claimTest");

  const routes = core.resolveLimitedAuditRoutes(
    { selectedRoutes: [] },
    "system-agent",
  );
  if (!routes.includes("/system/agent-ops/agents/system-agent")) {
    fail("Default limited route for system-agent missing");
  }

  const fullSiteDefer = core.resolveLimitedAuditRoutes(
    {
      roleFirstFullSite: true,
      scope: { type: "entire_staging" },
      selectedRoutes: [],
    },
    "system-agent",
  );
  if (fullSiteDefer.length !== 0) {
    fail("entire_staging must defer route expansion to the website-audit engine");
  }

  if (!core.isWebsiteAuditQueuedSummary({
    trigger: "owner_manual",
    schedulerConnection: "staging_worker_pending",
    workType: "website_audit",
  })) {
    fail("website_audit queue matcher failed");
  }
  if (
    core.isWebsiteAuditQueuedSummary({
      trigger: "owner_manual",
      schedulerConnection: "staging_worker_pending",
      workType: "browser_qa",
    })
  ) {
    fail("browser_qa must not match website_audit queue matcher");
  }
}

function verifyWiring(): void {
  mustInclude("scripts/agentops-manual-run-website-audit-engine.ts", "scanStagingWebsite");
  mustInclude("scripts/agentops-manual-run-website-audit-engine.ts", "workerPhase");
  mustInclude("scripts/agentops-manual-run-website-audit-engine.ts", "b2-c");
  mustInclude(
    "scripts/agentops-manual-run-website-audit-engine.ts",
    "No qualifying findings were produced by this run.",
  );
  mustNotInclude("scripts/agentops-manual-run-website-audit-engine.ts", "workflow_dispatch");
  mustNotInclude("scripts/agentops-manual-run-website-audit-engine.ts", "api.github.com");
  mustInclude(
    "scripts/agentops-manual-run-website-audit-engine.ts",
    "Website audit engine must not run on Vercel",
  );

  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "website-audit-once");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "website-audit-dev");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "buildWebsiteAuditClaimSummary");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "CI === \"true\"");
  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "workflow_dispatch");
  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "api.github.com");

  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "scanStagingWebsite");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "Browser QA engine not connected.");
  mustInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "Website audit running on staging worker.",
  );
  mustInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "Website audit run is running but worker heartbeat is stale.",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "Website audit ready",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "Browser QA not ready",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "websiteAuditReadyBadge",
  );

  // API surface must not import Playwright
  mustNotInclude("api/agentops/_lib/monitoringManualRun.ts", "playwright");
  mustNotInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "playwright");
  mustNotInclude("api/agentops/monitoring.ts", "playwright");

  const pkg = readFileSync(join(REPO_ROOT, "package.json"), "utf8");
  for (const script of [
    "agentops:manual-run-worker:website-audit-once",
    "agentops:manual-run-worker:website-audit-dev",
    "agentops:manual-run-website-audit-verify",
    "agentops:manual-run-worker:browser-qa-once",
  ]) {
    if (!pkg.includes(script)) fail(`package.json missing script ${script}`);
  }
}

verifyWiring();
await verifyCore();

if (failures.length > 0) {
  console.error("agentops-manual-run-website-audit-verify FAILED:");
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log("agentops-manual-run-website-audit-verify PASS");
