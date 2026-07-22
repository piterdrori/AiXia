/**
 * Fix C-B — scheduler hardening verify (static + pure helpers).
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

  if (core.SCHEDULER_VERSION !== "fix-c-b") fail("SCHEDULER_VERSION must be fix-c-b");
  if (core.FIRST_DUE_POLICY !== "enqueue_once_on_first_tick_then_advance") {
    fail("first-due policy constant missing");
  }

  const hourly = {
    enableSchedule: true,
    ownerEnabled: true,
    frequencyType: "every_hours",
    intervalValue: 1,
    workTypes: ["browser_qa"],
    timezone: "UTC",
    scopeType: "selected_routes",
    selectedRoutes: ["/system/agent-ops/agents/system-agent"],
  };
  const first = core.isScheduleDue(hourly, {}, new Date("2026-07-20T12:00:00.000Z"));
  if (!first.due || !first.firstDue) fail("first enable must be due once");

  const notDue = core.isScheduleDue(
    hourly,
    { nextDueAt: "2026-07-20T18:00:00.000Z" },
    new Date("2026-07-20T12:00:00.000Z"),
  );
  if (notDue.due) fail("future nextDueAt must not be due");

  const dueNow = core.isScheduleDue(
    hourly,
    { nextDueAt: "2026-07-20T11:00:00.000Z" },
    new Date("2026-07-20T12:00:00.000Z"),
  );
  if (!dueNow.due) fail("past nextDueAt must be due");

  const nextHour = core.computeNextDueAt(hourly, new Date("2026-07-20T12:00:00.000Z"));
  if (nextHour !== "2026-07-20T13:00:00.000Z") fail(`hourly next wrong: ${nextHour}`);

  const daily = { ...hourly, frequencyType: "every_days", intervalValue: 1 };
  const nextDay = core.computeNextDueAt(daily, new Date("2026-07-20T12:00:00.000Z"));
  if (nextDay !== "2026-07-21T12:00:00.000Z") fail(`daily next wrong: ${nextDay}`);

  const weekly = { ...hourly, frequencyType: "every_weeks", intervalValue: 1 };
  const nextWeek = core.computeNextDueAt(weekly, new Date("2026-07-20T12:00:00.000Z"));
  if (nextWeek !== "2026-07-27T12:00:00.000Z") fail(`weekly next wrong: ${nextWeek}`);

  const daysTime = {
    ...hourly,
    frequencyType: "days_and_time",
    daysOfWeek: [1],
    localTime: "09:00",
    timezone: "UTC",
  };
  const nextDays = core.computeNextDueAt(daysTime, new Date("2026-07-20T08:00:00.000Z"));
  if (!nextDays) fail("days_and_time must compute next");

  const key1 = core.buildIdempotencyKey(
    "system-agent",
    "browser_qa",
    "2026-07-20T12:30:00.000Z",
  );
  const key2 = core.buildIdempotencyKey(
    "system-agent",
    "browser_qa",
    "2026-07-20T12:55:00.000Z",
  );
  if (key1 !== key2) fail("same hour window must share idempotency key");

  if (core.normalizeStagingRoute("https://evil.example/x", "system-agent") !== null) {
    fail("external URL must be rejected");
  }
  if (core.normalizeStagingRoute("../etc/passwd", "system-agent") !== null) {
    fail("path traversal must be rejected");
  }
  if (
    core.normalizeStagingRoute("/system/agent-ops/agents/system-agent", "system-agent") !==
    "/system/agent-ops/agents/system-agent"
  ) {
    fail("agent detail route must be allowed");
  }

  // Role-first — entire_staging maps to the full website inventory every run.
  const entire = core.resolveScheduledScopeResult(
    { ...hourly, scopeType: "entire_staging", selectedRoutes: [] },
    "system-agent",
  );
  if (!entire.ok || entire.mapping !== "entire_staging_core_rotation") {
    fail("entire_staging must map to full-site staging routes");
  }
  if (entire.routes.length !== core.CORE_STAGING_ROUTES.length) {
    fail("entire_staging must return the full CORE_STAGING_ROUTES inventory");
  }
  const covered = new Set(core.rotateCoreStagingRoutes(Date.now()));
  if (covered.size !== core.CORE_STAGING_ROUTES.length) {
    fail("entire_staging must cover all core routes each run");
  }

  const selected = core.resolveScheduledScopeResult(hourly, "system-agent");
  if (!selected.ok || selected.routes[0] !== "/system/agent-ops/agents/system-agent") {
    fail("selected_routes must normalize");
  }

  const modules = core.resolveScheduledScopeResult(
    { ...hourly, scopeType: "assigned_modules", selectedRoutes: [] },
    "system-agent",
  );
  if (!modules.ok || modules.mapping !== "modules_to_agent_detail_route") {
    fail("assigned_modules must map conservatively");
  }

  if (
    !worker.isBrowserQaQueuedSummary({
      trigger: "schedule",
      schedulerConnection: "staging_worker",
      workType: "browser_qa",
    })
  ) {
    fail("scheduled browser_qa must be claimable");
  }

  const stale = core.classifyStaleMonitoringRun({
    run_id: "r1",
    status: "running",
    summary: { lockExpiresAt: "2020-01-01T00:00:00.000Z", agentSlug: "system-agent" },
  });
  if (!stale || stale.reason !== "lock_expired") fail("stale lock detection failed");
}

function verifyWiring(): void {
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "--dry-run");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "scheduler-cleanup-stale");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "AGENTOPS_ENVIRONMENT");
  mustInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "dryRun");
  mustInclude("scripts/lib/agentops-manual-run-scheduler-core.mjs", "FIRST_DUE_POLICY");
  mustInclude("scripts/lib/agentops-manual-run-scheduler-core.mjs", "SKIP_UNSUPPORTED_SCOPE");
  mustInclude("scripts/lib/agentops-manual-run-scheduler-core.mjs", "Intl");
  mustInclude(
    "src/lib/agentops/agents/agentDetailScheduleModel.ts",
    "Unsupported scope",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailScheduleModel.ts",
    "Unsupported work type",
  );

  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "workflow_dispatch");
  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "api.github.com");
  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "runPlaywright");
  mustNotInclude("scripts/agentops-manual-run-scheduler-tick.mjs", "scanStagingWebsite");
  mustNotInclude("vercel.json", "agentops-scheduler");

  const pkg = readFileSync(join(REPO_ROOT, "package.json"), "utf8");
  for (const script of [
    "agentops:manual-run-scheduler-hardening-verify",
    "agentops:manual-run-worker:scheduler-cleanup-stale",
  ]) {
    if (!pkg.includes(script)) fail(`package.json missing ${script}`);
  }
}

verifyWiring();
await verifyCore();

if (failures.length > 0) {
  console.error("agentops-manual-run-scheduler-hardening-verify FAILED:");
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log("agentops-manual-run-scheduler-hardening-verify PASS");
