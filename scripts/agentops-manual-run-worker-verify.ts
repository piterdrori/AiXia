/**
 * Fix B2-B/B2-C — staging manual-run worker foundation verify.
 * Usage: npx tsx scripts/agentops-manual-run-worker-verify.ts
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

  const badProd = core.validateWorkerEnv({
    STAGING_SUPABASE_URL: "https://example.supabase.co",
    STAGING_SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    STAGING_APP_URL: "https://aixia.app",
    AGENTOPS_WORKER_SECRET: "secret",
    AGENTOPS_ENVIRONMENT: "staging",
    AGENTOPS_PRODUCTION_BLOCKED: "true",
  });
  if (badProd.ok) fail("Production app URL must be rejected");

  const badEnv = core.validateWorkerEnv({
    STAGING_SUPABASE_URL: "https://example.supabase.co",
    STAGING_SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    STAGING_APP_URL: "https://ai-xia-staging.vercel.app",
    AGENTOPS_WORKER_SECRET: "secret",
    AGENTOPS_ENVIRONMENT: "production",
    AGENTOPS_PRODUCTION_BLOCKED: "true",
  });
  if (badEnv.ok) fail("Non-staging AGENTOPS_ENVIRONMENT must be rejected");

  const good = core.validateWorkerEnv({
    STAGING_SUPABASE_URL: "https://ydppcpbxrvvardeslzrk.supabase.co",
    STAGING_SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    STAGING_APP_URL: "https://ai-xia-staging.vercel.app",
    AGENTOPS_WORKER_SECRET: "secret",
    AGENTOPS_ENVIRONMENT: "staging",
    AGENTOPS_PRODUCTION_BLOCKED: "true",
  });
  if (!good.ok) fail(`Valid staging env rejected: ${good.errors.join("; ")}`);

  const now = Date.parse("2026-07-20T12:00:00.000Z");
  if (!core.isHeartbeatFresh("2026-07-20T11:58:00.000Z", now)) {
    fail("Fresh heartbeat should be connected");
  }
  if (core.isHeartbeatFresh("2026-07-20T11:50:00.000Z", now)) {
    fail("Stale heartbeat should not be fresh");
  }
  if (core.classifyWorkerStatus({ lastHeartbeatAt: "2026-07-20T11:58:00.000Z" }, now) !== "connected") {
    fail("classifyWorkerStatus connected failed");
  }
  if (core.classifyWorkerStatus({ lastHeartbeatAt: "2026-07-20T11:50:00.000Z" }, now) !== "stale") {
    fail("classifyWorkerStatus stale failed");
  }
  if (core.classifyWorkerStatus(null, now) !== "unknown") {
    fail("classifyWorkerStatus unknown failed");
  }

  const claim = core.buildClaimSummaryPatch(
    { trigger: "owner_manual", schedulerConnection: "staging_worker_pending" },
    { workerId: "w1", claimedAt: "2026-07-20T12:00:00.000Z" },
  );
  if (claim.workerPhase !== "b2-b" || claim.executionEngine !== "not_connected") {
    fail("Claim summary patch missing B2-B markers");
  }
  const closed = core.buildClaimCloseSummary(claim);
  if (!String(closed.failureReason).includes("Execution engine not connected")) {
    fail("Claim close message missing");
  }
  if (
    !core.isOwnerManualQueuedSummary({
      trigger: "owner_manual",
      schedulerConnection: "staging_worker_pending",
    })
  ) {
    fail("Queued summary matcher failed");
  }
  if (
    !core.isLockExpired({
      lockExpiresAt: "2026-07-20T11:00:00.000Z",
    }, now)
  ) {
    fail("Expired lock should be detected");
  }

  const tools = core.mergeWorkerHealthIntoTools(
    {},
    {
      connected: true,
      lastHeartbeatAt: "2026-07-20T12:00:00.000Z",
      workerId: "w1",
      websiteAuditEngine: core.buildConnectedWebsiteAuditEngine("2026-07-20T12:00:00.000Z"),
      browserQaEngine: core.buildDisconnectedBrowserQaEngine(),
    },
  );
  const parsed = core.parseWorkerHealth(tools);
  if (!parsed?.websiteAuditEngine?.connected) {
    fail("Heartbeat merge must mark websiteAuditEngine connected");
  }
  if (parsed?.browserQaEngine?.connected) {
    fail("Heartbeat merge must keep browserQaEngine disconnected");
  }
}

function verifyWiring(): void {
  mustInclude("scripts/lib/agentops-manual-run-worker-core.mjs", "Worker claim verified");
  mustInclude("scripts/lib/agentops-manual-run-worker-core.mjs", "buildWebsiteAuditClaimSummary");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "claim-test");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "heartbeat");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "website-audit-once");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "agentops_system_config");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "B2B_CLAIM_CLOSE_MESSAGE");
  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "workflow_dispatch");
  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "api.github.com");

  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "HEARTBEAT_FRESH_MS");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "buildCapabilityFromHealth");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "Browser QA engine not connected until B2-D.");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "readManualRunWorkerHealth");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "Waiting for staging worker.");
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "agentops-worker-queue-length",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailControlCenter.ts",
    "Browser QA engine not connected until B2-D.",
  );

  const pkg = readFileSync(join(REPO_ROOT, "package.json"), "utf8");
  for (const script of [
    "agentops:manual-run-worker:once",
    "agentops:manual-run-worker:heartbeat",
    "agentops:manual-run-worker:claim-test",
    "agentops:manual-run-worker:website-audit-once",
    "agentops:manual-run-worker-verify",
  ]) {
    if (!pkg.includes(script)) fail(`package.json missing script ${script}`);
  }
}

verifyWiring();
await verifyCore();

if (failures.length > 0) {
  console.error("agentops-manual-run-worker-verify FAILED:");
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log("agentops-manual-run-worker-verify PASS");
