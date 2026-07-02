/**
 * Phase 3 local/staging activation verification.
 * Usage: npx tsx scripts/agentops-monitoring-phase3-activation-verify.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  OWNER_MONITORING_WRITE_APPROVAL_ENV,
  resolveOwnerWriteGate,
} from "../src/lib/agentops/runtime/agentOpsMonitoringOwnerWriteGate";
import { MONITORING_REPORT_DIR } from "../src/lib/agentops/runtime/agentOpsMonitoringScheduledReport";
import { validatePhase3MonitoringTarget } from "../src/lib/agentops/runtime/agentOpsMonitoringPhase3Target";
import { assertMonitoringActionAllowed } from "../src/lib/agentops/runtime/agentOpsMonitoringPolicy";
import {
  MONITORING_CONFIG_DEFAULTS,
  loadAgentOpsMonitoringRuntimeConfig,
} from "../src/lib/agentops/runtime/agentOpsMonitoringRuntimeConfig";

const REPO_ROOT = process.cwd();
const PACKAGE_JSON = join(REPO_ROOT, "package.json");
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function verifyNpmScripts(): void {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const required = [
    "agentops:monitoring:scheduled:dry-run",
    "agentops:monitoring:scheduled:loop:dry-run",
    "agentops:monitoring:scheduled:once",
    "agentops:monitoring-phase3-verify",
  ];
  for (const script of required) {
    if (!pkg.scripts?.[script]) fail(`Missing npm script: ${script}`);
  }
}

function verifyOwnerApprovalGate(): void {
  const blocked = resolveOwnerWriteGate(false, { strictStartup: true });
  if (!blocked.refuseStartup) {
    fail("Non-dry-run without owner approval must refuse strict startup");
  }
  const writesBlocked = resolveOwnerWriteGate(false, { strictStartup: false });
  if (!writesBlocked.writesBlocked || writesBlocked.effectiveDryRun !== true) {
    fail("Non-dry-run without owner approval must block writes via effectiveDryRun");
  }
  const approvedGate = (() => {
    process.env[OWNER_MONITORING_WRITE_APPROVAL_ENV] = "true";
    const gate = resolveOwnerWriteGate(false, { strictStartup: true });
    delete process.env[OWNER_MONITORING_WRITE_APPROVAL_ENV];
    return gate;
  })();
  if (approvedGate.refuseStartup) {
    fail("Non-dry-run with owner approval should not refuse startup");
  }
}

function verifyProductionRejected(): void {
  const target = validatePhase3MonitoringTarget("https://aixia.app/dashboard");
  if (target.ok) fail("Production target must be rejected for Phase 3");
}

function verifyReportPath(): void {
  if (!MONITORING_REPORT_DIR.includes("qa-agent")) {
    fail("Report dir must be under qa-agent/reports/runtime");
  }
  if (!MONITORING_REPORT_DIR.endsWith("runtime")) {
    fail("Report dir must end with runtime");
  }
}

function verifyContinuousNotActivatedByPhase3(): void {
  const config = loadAgentOpsMonitoringRuntimeConfig();
  if (config.continuousEnabled && process.env.AGENTOPS_MONITORING_CONTINUOUS_ENABLED) {
    fail("Continuous should not be enabled during default phase3 verify");
  }
}

function verifyNoCloudCron(): void {
  const vercelJson = join(REPO_ROOT, "vercel.json");
  try {
    const raw = readFileSync(vercelJson, "utf8");
    if (/cron/i.test(raw) && /agentops/i.test(raw)) {
      fail("vercel.json appears to define agentops cron — Phase 3 must not activate cloud cron");
    }
  } catch {
    // no vercel.json cron — ok
  }
}

function verifyLevel4Forbidden(): void {
  for (const action of ["apply_fix", "deploy"] as const) {
    const decision = assertMonitoringActionAllowed(action, { agentSlug: "qa-agent" });
    if (decision.allowed) fail(`${action} must be forbidden`);
  }
}

function verifyRunnerScriptExists(): void {
  const runner = join(REPO_ROOT, "scripts/agentops-monitoring-scheduled-run.mjs");
  try {
    readFileSync(runner, "utf8");
  } catch {
    fail("scripts/agentops-monitoring-scheduled-run.mjs missing");
  }
}

function main(): void {
  verifyNpmScripts();
  verifyRunnerScriptExists();
  verifyOwnerApprovalGate();
  verifyProductionRejected();
  verifyReportPath();
  verifyContinuousNotActivatedByPhase3();
  verifyNoCloudCron();
  verifyLevel4Forbidden();

  if (MONITORING_CONFIG_DEFAULTS.dryRun !== true) {
    fail("Default dryRun must remain true");
  }

  if (failures.length > 0) {
    console.error("AGENTOPS MONITORING PHASE 3 VERIFY — FAILED");
    for (const message of failures) {
      console.error(`  ✗ ${message}`);
    }
    process.exit(1);
  }

  console.log("AGENTOPS MONITORING PHASE 3 VERIFY — PASSED");
}

main();
