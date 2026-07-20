/**
 * Fix B2-D — Browser QA engine + capability verify.
 * Usage: npx tsx scripts/agentops-manual-run-browser-qa-verify.ts
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

  const bothConnected = {
    lastHeartbeatAt: new Date().toISOString(),
    websiteAuditEngine: { connected: true, version: "b2-c", reason: null },
    browserQaEngine: { connected: true, version: "b2-d", reason: null },
  };
  if (!core.isWebsiteAuditEngineConnected(bothConnected)) {
    fail("websiteAuditEngine connected should be detected");
  }
  if (!core.isBrowserQaEngineConnected(bothConnected)) {
    fail("browserQaEngine connected should be detected");
  }
  if (
    core.isBrowserQaEngineConnected({
      browserQaEngine: {
        connected: false,
        reason: "Browser QA auth not configured for staging worker.",
      },
    })
  ) {
    fail("browserQaEngine disconnected should be false");
  }

  const claim = core.buildBrowserQaClaimSummary(
    {
      trigger: "owner_manual",
      workType: "browser_qa",
      schedulerConnection: "staging_worker_pending",
    },
    { workerId: "w1", claimedAt: "2026-07-20T12:00:00.000Z" },
  );
  if (claim.workerPhase !== "b2-d" || claim.executionEngine !== "browser_qa") {
    fail("Browser QA claim markers missing");
  }
  if (claim.claimTest === true) fail("Browser QA claim must not be claimTest");

  const route = core.resolveLimitedBrowserQaRoute(
    { selectedRoutes: [] },
    "system-agent",
    "https://ai-xia-staging.vercel.app",
  );
  if (route.route !== "/system/agent-ops/agents/system-agent") {
    fail("Default limited Browser QA route for system-agent missing");
  }
  if (!route.absoluteUrl.includes("/system/agent-ops/agents/system-agent")) {
    fail("Absolute Browser QA URL missing agent route");
  }

  if (
    !core.isBrowserQaQueuedSummary({
      trigger: "owner_manual",
      schedulerConnection: "staging_worker_pending",
      workType: "browser_qa",
    })
  ) {
    fail("browser_qa queue matcher failed");
  }
  if (
    core.isBrowserQaQueuedSummary({
      trigger: "owner_manual",
      schedulerConnection: "staging_worker_pending",
      workType: "website_audit",
    })
  ) {
    fail("website_audit must not match browser_qa queue matcher");
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
  mustInclude("scripts/agentops-manual-run-browser-qa-engine.ts", "runPlaywrightBrowserQA");
  mustInclude("scripts/agentops-manual-run-browser-qa-engine.ts", "workerPhase");
  mustInclude("scripts/agentops-manual-run-browser-qa-engine.ts", "b2-d");
  mustInclude(
    "scripts/agentops-manual-run-browser-qa-engine.ts",
    "No qualifying findings were produced by this run.",
  );
  mustInclude(
    "scripts/agentops-manual-run-browser-qa-engine.ts",
    "Browser QA auth not configured for staging worker.",
  );
  mustInclude(
    "scripts/agentops-manual-run-browser-qa-engine.ts",
    "Browser QA engine must not run on Vercel",
  );
  mustNotInclude("scripts/agentops-manual-run-browser-qa-engine.ts", "workflow_dispatch");
  mustNotInclude("scripts/agentops-manual-run-browser-qa-engine.ts", "api.github.com");
  mustNotInclude("scripts/agentops-manual-run-browser-qa-engine.ts", "promoteBrowserQaFindings");

  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "browser-qa-once");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "browser-qa-dev");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "buildBrowserQaClaimSummary");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "isBrowserQaQueuedSummary");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "CI === \"true\"");
  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "workflow_dispatch");
  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "api.github.com");

  mustInclude(
    "api/agentops/_lib/manualRunWorkerHealth.ts",
    "staging_worker + browser_qa (runPlaywrightBrowserQA)",
  );
  mustInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "Browser QA running on staging worker.",
  );
  mustInclude(
    "api/agentops/_lib/monitoringManualRun.ts",
    "Browser QA run is running but worker heartbeat is stale.",
  );
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", 'workerPhase !== "b2-d"');
  mustInclude("src/lib/agentops/agents/agentDetailControlCenter.ts", "browserQaReadyBadge");
  mustInclude("src/lib/agentops/agents/agentDetailControlCenter.ts", "Audit tools ready");
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "agentops-run-browser-qa-now",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailOwnerReadability.ts",
    "Audit tools ready",
  );

  mustNotInclude("api/agentops/_lib/monitoringManualRun.ts", "playwright");
  mustNotInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "playwright");
  mustNotInclude("api/agentops/monitoring.ts", "playwright");

  const pkg = readFileSync(join(REPO_ROOT, "package.json"), "utf8");
  for (const script of [
    "agentops:manual-run-worker:browser-qa-once",
    "agentops:manual-run-worker:browser-qa-dev",
    "agentops:manual-run-browser-qa-verify",
    "agentops:manual-run-worker:website-audit-once",
  ]) {
    if (!pkg.includes(script)) fail(`package.json missing script ${script}`);
  }
}

verifyWiring();
await verifyCore();

if (failures.length > 0) {
  console.error("agentops-manual-run-browser-qa-verify FAILED:");
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log("agentops-manual-run-browser-qa-verify PASS");
