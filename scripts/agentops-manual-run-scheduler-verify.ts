/**
 * Fix C-A — staging worker scheduler verify.
 * Usage: npx tsx scripts/agentops-manual-run-scheduler-verify.ts
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
  const coreUrl = pathToFileURL(
    join(__dirname, "lib/agentops-manual-run-scheduler-core.mjs"),
  ).href;
  const core = (await import(coreUrl)) as typeof import("./lib/agentops-manual-run-scheduler-core.mjs");
  const workerUrl = pathToFileURL(
    join(__dirname, "lib/agentops-manual-run-worker-core.mjs"),
  ).href;
  const worker = (await import(workerUrl)) as typeof import("./lib/agentops-manual-run-worker-core.mjs");

  const schedule = core.parseScheduleFromTools([
    'aixia:schedule:{"enableSchedule":true,"ownerEnabled":true,"frequencyType":"every_hours","intervalValue":1,"intervalUnit":"hours","workTypes":["website_audit"],"scopeType":"selected_routes","selectedRoutes":["/system/agent-ops/agents/system-agent"],"maxDurationMinutes":15}',
  ]);
  if (!schedule.enableSchedule) fail("schedule enableSchedule parse failed");
  if (!core.expandExecutableWorkTypes(schedule.workTypes).includes("website_audit")) {
    fail("website_audit expansion failed");
  }
  if (core.expandExecutableWorkTypes(["audit_and_browser_qa"]).length !== 2) {
    fail("audit_and_browser_qa should expand to two work types");
  }

  const dueFirst = core.isScheduleDue(schedule, {}, new Date("2026-07-20T12:00:00.000Z"));
  if (!dueFirst.due) fail("first due after enable should be due");

  const notDue = core.isScheduleDue(
    schedule,
    { nextDueAt: "2026-07-20T18:00:00.000Z" },
    new Date("2026-07-20T12:00:00.000Z"),
  );
  if (notDue.due) fail("future nextDueAt must not be due");
  if (notDue.reason !== core.SKIP_NOT_DUE) fail("expected Not due yet skip");

  const key = core.buildIdempotencyKey(
    "system-agent",
    "website_audit",
    "2026-07-20T12:30:00.000Z",
  );
  if (!key.startsWith("scheduled-system-agent-website_audit-")) {
    fail(`idempotency key shape wrong: ${key}`);
  }

  const summary = core.buildScheduledRunSummary({
    agentSlug: "system-agent",
    runtimeAgentId: "uuid",
    workType: "website_audit",
    scope: { type: "selected_routes", routes: ["/system/agent-ops/agents/system-agent"] },
    selectedRoutes: ["/system/agent-ops/agents/system-agent"],
    dueAt: "2026-07-20T12:00:00.000Z",
    nextDueAt: "2026-07-20T13:00:00.000Z",
    idempotencyKey: key,
    scheduleTickId: "sched-1",
    ownerStatusAtQueue: "active",
    engineAvailabilityAtQueue: { websiteAudit: true, browserQa: true },
  });
  if (summary.trigger !== "schedule") fail("trigger must be schedule");
  if (summary.schedulerConnection !== "staging_worker") fail("schedulerConnection wrong");

  if (
    !worker.isScheduledQueuedSummary({
      trigger: "schedule",
      schedulerConnection: "staging_worker",
      workType: "website_audit",
    })
  ) {
    fail("scheduled queue matcher failed");
  }
  if (
    !worker.isWebsiteAuditQueuedSummary({
      trigger: "schedule",
      schedulerConnection: "staging_worker",
      workType: "website_audit",
    })
  ) {
    fail("scheduled website_audit should be claimable");
  }
  if (
    worker.isOwnerManualQueuedSummary({
      trigger: "schedule",
      schedulerConnection: "staging_worker",
      workType: "website_audit",
    })
  ) {
    fail("scheduled must not match owner_manual matcher");
  }

  // Engine / worker skip reasons must stay stable for UI honesty.
  if (core.SKIP_ENGINE_UNAVAILABLE !== "Engine not connected") {
    fail("engine skip reason text drift");
  }
  if (core.SKIP_WORKER_OFFLINE !== "Staging worker not connected") {
    fail("worker offline skip reason text drift");
  }
  if (core.SKIP_AGENT_PAUSED !== "Agent paused") {
    fail("paused skip reason text drift");
  }
  if (core.SKIP_EXISTING_RUN !== "Existing active or queued run") {
    fail("duplicate skip reason text drift");
  }

  const nextHourly = core.computeNextDueAt(
    schedule,
    new Date("2026-07-20T12:00:00.000Z"),
  );
  if (nextHourly !== "2026-07-20T13:00:00.000Z") {
    fail(`hourly nextDueAt wrong: ${nextHourly}`);
  }
}

function verifyWiring(): void {
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "scheduler-tick");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "scheduler-dev");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "runSchedulerTick");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", 'CI === "true"');
  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "workflow_dispatch");
  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "api.github.com");
  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "vercel cron");
  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "runPlaywright");
  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "scanStagingWebsite");

  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "schedulerConnected");
  mustInclude("api/agentops/_lib/manualRunWorkerHealth.ts", "staging_worker_scheduler");
  mustInclude(
    "src/lib/agentops/agents/agentDetailScheduleModel.ts",
    "Saved · executable by staging worker",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailScheduleModel.ts",
    "Saved · worker scheduler offline",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentSchedulePanel.tsx",
    "schedulerConnected",
  );

  mustNotInclude("api/agentops/_lib/monitoringManualRun.ts", "playwright");
  mustNotInclude("vercel.json", "agentops-scheduler");

  const pkg = readFileSync(join(REPO_ROOT, "package.json"), "utf8");
  for (const script of [
    "agentops:manual-run-worker:scheduler-tick",
    "agentops:manual-run-worker:scheduler-dev",
    "agentops:manual-run-scheduler-verify",
  ]) {
    if (!pkg.includes(script)) fail(`package.json missing script ${script}`);
  }
}

verifyWiring();
await verifyCore();

if (failures.length > 0) {
  console.error("agentops-manual-run-scheduler-verify FAILED:");
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log("agentops-manual-run-scheduler-verify PASS");
