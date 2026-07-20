/**
 * Phase D-A — staging worker ops verify (static + pure helpers).
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

async function verifyOpsCore(): Promise<void> {
  const opsUrl = pathToFileURL(join(__dirname, "lib/agentops-staging-worker-ops-core.mjs")).href;
  const ops = (await import(opsUrl)) as typeof import("./lib/agentops-staging-worker-ops-core.mjs");
  const workerUrl = pathToFileURL(
    join(__dirname, "lib/agentops-manual-run-worker-core.mjs"),
  ).href;
  const worker = (await import(workerUrl)) as typeof import("./lib/agentops-manual-run-worker-core.mjs");

  if (ops.OPS_VERSION !== "d-a") fail("OPS_VERSION must be d-a");
  if (worker.WORKER_VERSION !== "d-a") fail("WORKER_VERSION must be d-a");

  const badEnv = ops.validatePersistentWorkerEnv({
    AGENTOPS_ENVIRONMENT: "production",
    AGENTOPS_PRODUCTION_BLOCKED: "true",
    STAGING_APP_URL: "https://ai-xia-staging.vercel.app",
  });
  if (badEnv.ok) fail("production environment must fail persistent worker env");

  const badUrl = ops.validatePersistentWorkerEnv({
    AGENTOPS_ENVIRONMENT: "staging",
    AGENTOPS_PRODUCTION_BLOCKED: "true",
    STAGING_APP_URL: "https://ai-xia.vercel.app",
  });
  if (badUrl.ok) fail("production URL must fail persistent worker env");

  const ciBlocked = ops.validatePersistentWorkerEnv({
    AGENTOPS_ENVIRONMENT: "staging",
    AGENTOPS_PRODUCTION_BLOCKED: "true",
    STAGING_APP_URL: "https://ai-xia-staging.vercel.app",
    CI: "true",
  });
  if (ciBlocked.ok) fail("CI must block persistent worker");

  const good = ops.validatePersistentWorkerEnv({
    AGENTOPS_ENVIRONMENT: "staging",
    AGENTOPS_PRODUCTION_BLOCKED: "true",
    STAGING_APP_URL: "https://ai-xia-staging.vercel.app",
  });
  if (!good.ok) fail(`valid staging env must pass: ${good.errors.join("; ")}`);

  if (ops.resolveOpsIntervalMs({}) !== 60_000) fail("default interval must be 60s");
  if (ops.resolveOpsIntervalMs({ AGENTOPS_STAGING_WORKER_INTERVAL_MS: "10000" }) !== 30_000) {
    fail("interval minimum must be 30s");
  }
  if (ops.resolveOpsIntervalMs({ AGENTOPS_STAGING_WORKER_INTERVAL_MS: "90000" }) !== 90_000) {
    fail("custom interval must honor env when >= 30s");
  }

  const now = Date.parse("2026-07-20T12:00:00.000Z");
  const rows = [
    {
      run_id: "sched-recent",
      created_at: "2026-07-20T11:55:00.000Z",
      summary: { trigger: "schedule", workType: "website_audit" },
    },
    {
      run_id: "manual-new",
      created_at: "2026-07-20T11:55:00.000Z",
      summary: { trigger: "owner_manual", workType: "browser_qa" },
    },
    {
      run_id: "manual-old",
      created_at: "2026-07-20T11:50:00.000Z",
      summary: { trigger: "owner_manual", workType: "website_audit" },
    },
  ];
  const picked = ops.pickNextQueuedRun(rows, now);
  if (picked?.run_id !== "manual-old") {
    fail(`expected oldest manual first, got ${picked?.run_id}`);
  }

  const starved = ops.pickNextQueuedRun(
    [
      {
        run_id: "sched-starved",
        created_at: "2026-07-20T11:00:00.000Z",
        summary: { trigger: "schedule", workType: "browser_qa" },
      },
      {
        run_id: "manual-fresh",
        created_at: "2026-07-20T11:59:00.000Z",
        summary: { trigger: "owner_manual", workType: "website_audit" },
      },
    ],
    now,
  );
  if (starved?.run_id !== "sched-starved") {
    fail("scheduled run waiting >10m must beat newer manuals");
  }

  const authFail = ops.classifyWorkerError("Browser QA auth not configured");
  if (authFail.transient) fail("auth errors must not be transient");
  const netFail = ops.classifyWorkerError("fetch failed: ECONNRESET");
  if (!netFail.transient) fail("network errors must be transient");

  const retryOk = ops.canRetryFailedRun({}, "socket hang up");
  if (!retryOk.ok) fail("first transient retry must be allowed");
  const retryNo = ops.canRetryFailedRun({ retryCount: 1 }, "socket hang up");
  if (retryNo.ok) fail("second retry must be blocked");

  const labeled = ops.labelEvidenceRef("C:\\\\tmp\\\\storage-state.json");
  if (labeled?.ref !== "[redacted]") fail("storage_state evidence path must be redacted");

  const patch = ops.buildOpsHealthPatch({
    queueLength: 2,
    enginesReady: true,
    lastCompletedRunId: "r1",
  });
  if (patch.opsVersion !== "d-a" || patch.mode !== "staging_worker_ops") {
    fail("ops health patch shape invalid");
  }
}

function verifyStaticContracts(): void {
  mustInclude("package.json", '"agentops:staging-worker"');
  mustInclude("package.json", '"agentops:staging-worker-ops-verify"');
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", 'args.command === "ops"');
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "validatePersistentWorkerEnv");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "pickNextQueuedRun");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "honorCancelBeforeSpawn");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "maybeRequeueTransientFailure");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "handleMonitoringManualRunCancelRequest");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "/api/agentops/monitoring/manual-run/cancel");
  mustInclude(
    "qa-agent/reports/agentops-staging-worker-runbook.md",
    "npm run agentops:staging-worker",
  );

  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "workflow_dispatch");
  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "vercel cron");
  mustNotInclude("scripts/lib/agentops-staging-worker-ops-core.mjs", "--prod");
  mustNotInclude("scripts/agentops-staging-manual-run-worker.mjs", "gh workflow");
}

async function main(): Promise<void> {
  verifyStaticContracts();
  await verifyOpsCore();
  if (failures.length > 0) {
    console.error("agentops:staging-worker-ops-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        command: "agentops:staging-worker-ops-verify",
        opsVersion: "d-a",
        checks: "pass",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
