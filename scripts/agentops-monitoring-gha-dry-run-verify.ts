/**
 * Phase 5A GitHub Actions scheduled dry-run workflow verification.
 * Usage: npm run agentops:monitoring-gha-dry-run-verify
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildMonitoringScheduledRunReport } from "../src/lib/agentops/runtime/agentOpsMonitoringScheduledReport";
import { buildMonitoringRunIndexRecord } from "../src/lib/agentops/runtime/agentOpsMonitoringRunIndex";
import { MONITORING_CONFIG_DEFAULTS } from "../src/lib/agentops/runtime/agentOpsMonitoringRuntimeConfig";
import { resolveOwnerWriteGate } from "../src/lib/agentops/runtime/agentOpsMonitoringOwnerWriteGate";
import { resolveMonitoringProductionGuardReport } from "../src/lib/agentops/runtime/stagingScanUrlGuard";

const REPO_ROOT = process.cwd();
const WORKFLOW_PATH = join(
  REPO_ROOT,
  ".github/workflows/agentops-monitoring-scheduled-dry-run.yml",
);
const PACKAGE_JSON = join(REPO_ROOT, "package.json");
const RUNNER_SCRIPT = join(REPO_ROOT, "scripts/agentops-monitoring-scheduled-run.mjs");
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function verifyProductionBlockedReportSemantics(): void {
  const stagingGuard = resolveMonitoringProductionGuardReport("https://ai-xia-staging.vercel.app");
  if (!stagingGuard.productionGuardActive) {
    fail("productionGuardActive must be true for staging monitoring dry-run reports");
  }
  if (!stagingGuard.productionTargetRejected) {
    fail("productionTargetRejected must be true when canonical production URL is blocked");
  }
  if (!stagingGuard.productionBlocked) {
    fail("productionBlocked must be true for approved staging monitoring targets");
  }
  if (stagingGuard.targetClass !== "staging") {
    fail(`Expected targetClass staging for ai-xia-staging host, got ${stagingGuard.targetClass}`);
  }

  const productionRejected = resolveMonitoringProductionGuardReport("https://aixia.app/dashboard");
  if (!productionRejected.productionBlocked) {
    fail("productionBlocked must be true when production target is rejected");
  }
  if (productionRejected.targetClass !== "production_rejected") {
    fail("Production hostname must classify as production_rejected");
  }

  const report = buildMonitoringScheduledRunReport({
    runId: "verify-run",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    monitoringConfig: {
      ...MONITORING_CONFIG_DEFAULTS,
      level: 1,
      scheduledEnabled: true,
      monitoringMode: "operational",
      dryRunRequested: true,
      dryRun: true,
      effectiveDryRun: true,
      ownerWriteApproved: false,
      writesBlockedReason: "dry-run mode — mutations disabled",
      valid: true,
      fallbackReasons: [],
    },
    ownerGate: resolveOwnerWriteGate(true),
    tick: {
      config: null,
      agents: [],
      skipped: [],
      cycles: [],
      errors: [],
      tickKind: "scheduled",
      dryRun: true,
    },
    targetBaseUrl: "https://ai-xia-staging.vercel.app",
  });

  if (!report.productionBlocked) {
    fail("buildMonitoringScheduledRunReport must set productionBlocked=true for staging dry-run");
  }
  if (!report.productionGuardActive) {
    fail("buildMonitoringScheduledRunReport must set productionGuardActive=true");
  }

  const indexRecord = buildMonitoringRunIndexRecord(report, {
    source: "verify",
    mode: "scheduled_dry_run",
  });
  if (!indexRecord.dry_run) fail("Run index record must be dry_run=true for staging dry-run");
  if (!indexRecord.production_blocked) {
    fail("Run index record must set production_blocked=true for staging dry-run");
  }
  if (indexRecord.actual_issues_created !== 0 || indexRecord.actual_memory_writes !== 0) {
    fail("Run index record must have zero writes");
  }
}

function main(): void {
  let workflow: string;
  try {
    workflow = readFileSync(WORKFLOW_PATH, "utf8");
  } catch {
    fail("Missing .github/workflows/agentops-monitoring-scheduled-dry-run.yml");
    workflow = "";
  }

  if (workflow) {
    if (!/workflow_dispatch:/m.test(workflow)) {
      fail("Workflow must include workflow_dispatch trigger");
    }

    const scheduleActive =
      /^\s*schedule:\s*$/m.test(workflow) &&
      !workflow.includes("# schedule:") &&
      workflow.match(/^[^#]*schedule:/m);
    const hasUncommentedSchedule = (() => {
      const lines = workflow.split("\n");
      const crons: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith("#")) continue;
        const cronMatch = line.match(/-\s*cron:\s*"([^"]+)"/);
        if (cronMatch) crons.push(cronMatch[1]);
      }
      return crons;
    })();
    if (!hasUncommentedSchedule.includes("0 */6 * * *")) {
      fail('Workflow must include operational cron "0 */6 * * *"');
    }
    if (!hasUncommentedSchedule.includes("0 2 * * 0")) {
      fail('Workflow must include weekly improvement cron "0 2 * * 0"');
    }
    if (hasUncommentedSchedule.length !== 2) {
      fail(`Workflow must have exactly 2 active crons, found ${hasUncommentedSchedule.length}`);
    }
    if (!workflow.includes("concurrency:")) {
      fail("Workflow must define concurrency protection");
    }

    if (!workflow.includes('AGENTOPS_MONITORING_DRY_RUN: "true"')) {
      fail("Workflow must set AGENTOPS_MONITORING_DRY_RUN=true");
    }
    if (!workflow.includes('AGENTOPS_MONITORING_CONTINUOUS_ENABLED: "false"')) {
      fail("Workflow must set AGENTOPS_MONITORING_CONTINUOUS_ENABLED=false");
    }
    if (!workflow.includes('AGENTOPS_MONITORING_LEVEL: "1"')) {
      fail("Workflow must set AGENTOPS_MONITORING_LEVEL=1");
    }
    if (!workflow.includes("secrets.AGENTOPS_QA_BASE_URL")) {
      fail("Workflow target must use secrets.AGENTOPS_QA_BASE_URL");
    }
    if (workflow.includes("AGENTOPS_OWNER_APPROVED_MONITORING_WRITE")) {
      fail("Workflow must not reference AGENTOPS_OWNER_APPROVED_MONITORING_WRITE");
    }
    if (/AGENTOPS_MONITORING_DRY_RUN:\s*"false"/.test(workflow)) {
      fail("Workflow must not set AGENTOPS_MONITORING_DRY_RUN=false");
    }

    const runLines = workflow
      .split("\n")
      .filter((line) => /^\s+run:/.test(line))
      .join("\n");
    const forbidden = [/vercel\s+--prod/i, /deploy\s+--prod/i, /npm run build.*deploy/i];
    for (const pattern of forbidden) {
      if (pattern.test(runLines)) {
        fail(`Workflow run step contains forbidden pattern: ${pattern}`);
      }
    }

    if (!workflow.includes("agentops:monitoring:scheduled:gha-dry-run")) {
      fail("Workflow must run npm run agentops:monitoring:scheduled:gha-dry-run");
    }
    if (!workflow.includes("actions/upload-artifact@v4")) {
      fail("Workflow must upload artifacts");
    }
    if (!workflow.includes("monitoring-scheduled-dry-run-")) {
      fail("Artifact upload must include monitoring-scheduled-dry-run JSON reports");
    }
    if (!workflow.includes("retention-days: 14")) {
      fail("Artifact retention must be 14 days");
    }
    if (!workflow.includes("agentops-monitoring-gha-preflight.mjs")) {
      fail("Workflow must run agentops-monitoring-gha-preflight.mjs");
    }
    if (!workflow.includes("agentops-monitoring-gha-run-index-insert.ts")) {
      fail("Workflow must insert monitoring run index to staging Supabase after dry-run");
    }
    if (!workflow.includes("agentops-monitoring-gha-issue-drafts-insert.ts")) {
      fail("Workflow must insert monitoring issue drafts after run index (Phase 5C)");
    }
    if (!workflow.includes("agentops-monitoring-gha-memory-proposals-insert.ts")) {
      fail("Workflow must insert monitoring memory proposals after issue drafts (Phase 5E)");
    }
  }

  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
    scripts?: Record<string, string>;
  };
  if (!pkg.scripts?.["agentops:monitoring:scheduled:gha-dry-run"]) {
    fail("Missing npm script agentops:monitoring:scheduled:gha-dry-run");
  }
  if (!pkg.scripts?.["agentops:monitoring-gha-dry-run-verify"]) {
    fail("Missing npm script agentops:monitoring-gha-dry-run-verify");
  }

  const runner = readFileSync(RUNNER_SCRIPT, "utf8");
  if (!runner.includes('"gha-dry-run"')) {
    fail("Runner script must define gha-dry-run preset");
  }
  if (!runner.includes('"gha-weekly-improvement"')) {
    fail("Runner script must define gha-weekly-improvement preset");
  }
  if (!runner.includes("AGENTOPS_OWNER_APPROVED_MONITORING_WRITE")) {
    fail("gha-dry-run preset must reject owner write approval env");
  }

  const vercelJson = join(REPO_ROOT, "vercel.json");
  try {
    const raw = readFileSync(vercelJson, "utf8");
    if (/^\s*"crons"/m.test(raw) || /^\s*crons:/m.test(raw)) {
      fail("vercel.json must not define crons for Phase 5A");
    }
  } catch {
    // ok
  }

  verifyProductionBlockedReportSemantics();

  if (failures.length > 0) {
    console.error("AGENTOPS MONITORING GHA DRY-RUN VERIFY — FAILED");
    for (const message of failures) {
      console.error(`  ✗ ${message}`);
    }
    process.exit(1);
  }

  console.log("AGENTOPS MONITORING GHA DRY-RUN VERIFY — PASSED");
}

main();
