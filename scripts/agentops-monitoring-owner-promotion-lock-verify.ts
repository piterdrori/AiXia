/**
 * Phase 5D final lock verification — registry + reports + safety invariants.
 * Usage: npm run agentops:monitoring-owner-promotion-lock-verify
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function mustExist(relativePath: string, label: string): string {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing ${label}: ${relativePath}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function verifyRegistryLock(): void {
  const content = mustExist(
    "registry/AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK.md",
    "registry lock",
  );
  if (!content) return;

  const requiredPhrases = [
    "owner-click",
    "owner_approved",
    "promoted",
    "ydppcpbxrvvardeslzrk",
    "agentops_monitoring_issue_drafts",
    "agentops_issues",
    "No auto-promotion",
    "Phase 5E",
    "ACDL_SYSTEM_LOCK_v2.1",
    "AGENTOPS_MONITORING_RUNTIME_CONTRACT",
  ];
  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) {
      fail(`Registry lock missing required phrase: ${phrase}`);
    }
  }
}

function verifyReports(): void {
  mustExist(
    "qa-agent/reports/agentops-monitoring-phase5c-issue-draft-pipeline.md",
    "Phase 5C report",
  );
  mustExist(
    "qa-agent/reports/agentops-monitoring-phase5d-owner-click-issue-promotion.md",
    "Phase 5D report",
  );

  const browserReport = mustExist(
    "qa-agent/reports/browser-qa/monitoring-phase5d-promote-smoke-report.json",
    "browser QA report",
  );
  if (browserReport) {
    try {
      const parsed = JSON.parse(browserReport) as {
        status?: string;
        loginSuccessful?: boolean;
        configDraftPromoted?: boolean;
        existingIssueVisibleInHub?: boolean;
      };
      if (parsed.status !== "passed") {
        fail(`Browser QA report status must be passed, got ${parsed.status ?? "unknown"}`);
      }
      if (!parsed.loginSuccessful) fail("Browser QA report loginSuccessful must be true");
      if (!parsed.configDraftPromoted) fail("Browser QA report configDraftPromoted must be true");
      if (!parsed.existingIssueVisibleInHub) {
        fail("Browser QA report existingIssueVisibleInHub must be true");
      }
    } catch {
      fail("Browser QA report is not valid JSON");
    }
  }
}

function verifyRegistryReadme(): void {
  const readme = mustExist("registry/README.md", "registry README");
  if (!readme) return;
  if (!readme.includes("AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK")) {
    fail("registry/README.md must reference AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK");
  }
  if (!readme.includes("AGENTOPS_MONITORING_RUNTIME_CONTRACT")) {
    fail("registry/README.md must reference AGENTOPS_MONITORING_RUNTIME_CONTRACT");
  }
}

function verifyWorkflowSafety(): void {
  const workflow = mustExist(
    ".github/workflows/agentops-monitoring-scheduled-dry-run.yml",
    "monitoring GHA workflow",
  );
  if (!workflow) return;

  const lines = workflow.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith("#")) continue;
    if (/^\s*schedule:\s*$/.test(line) || /^\s*-\s*cron:/.test(line)) {
      fail("Monitoring workflow must not have active schedule/cron");
    }
  }

  if (!workflow.includes('AGENTOPS_MONITORING_DRY_RUN: "true"')) {
    fail("Workflow must keep AGENTOPS_MONITORING_DRY_RUN=true");
  }
  if (!workflow.includes('AGENTOPS_MONITORING_CONTINUOUS_ENABLED: "false"')) {
    fail("Workflow must keep AGENTOPS_MONITORING_CONTINUOUS_ENABLED=false");
  }
  if (workflow.includes("AGENTOPS_OWNER_APPROVED_MONITORING_WRITE")) {
    fail("Workflow must not enable owner-approved live monitoring writes");
  }
  if (/AGENTOPS_MONITORING_DRY_RUN:\s*"false"/.test(workflow)) {
    fail("Workflow must not set AGENTOPS_MONITORING_DRY_RUN=false");
  }
  if (workflow.includes("drafts/promote")) {
    fail("GHA workflow must not call promotion API — drafts only");
  }
}

function verifyPromotionApi(): void {
  const routes = mustExist("api/agentops/_lib/monitoringRoutes.ts", "monitoring routes");
  if (!routes) return;

  if (!routes.includes("handleMonitoringDraftPromoteRequest")) {
    fail("monitoringRoutes must export handleMonitoringDraftPromoteRequest");
  }
  if (!routes.includes("/api/agentops/monitoring/drafts/promote")) {
    fail("monitoringRoutes must route POST drafts/promote");
  }
  if (!routes.includes("validateDraftPromotion")) {
    fail("monitoringRoutes must validate promotion preconditions");
  }
}

function verifyNoUnsafeAutoPromoteInMonitoringPaths(): void {
  const scanPaths = [
    "scripts/agentops-monitoring-gha-issue-drafts-insert.ts",
    "src/lib/agentops/runtime/agentOpsMonitoringIssueDrafts.ts",
    "src/lib/agentops/runtime/agentOpsMonitoringIssuePromotion.ts",
    "src/lib/agentops/runtime/agentOpsMonitoringIssuePromotionPolicy.ts",
    ".github/workflows/agentops-monitoring-scheduled-dry-run.yml",
  ];

  const allowPatterns = [
    /no auto-promotion/i,
    /No auto-promotion/i,
    /never auto-promote/i,
    /auto-promotion is forbidden/i,
    /Automatic pipeline promotion is forbidden/i,
    /Promote to live issue is disabled/i,
    /does not auto-promote/i,
    /No automatic promotion/i,
    /auto-promote drafts/i,
    /No auto-promote/i,
  ];

  for (const relativePath of scanPaths) {
    const content = mustExist(relativePath, "monitoring path");
    if (!content) continue;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/auto-promote|autoPromote|auto_promote/i.test(line)) continue;
      const context = [lines[i - 1] ?? "", line, lines[i + 1] ?? ""].join(" ");
      if (allowPatterns.some((pattern) => pattern.test(context))) continue;
      fail(`Unsafe auto-promote reference in ${relativePath}:${i + 1}`);
    }
  }
}

function verifyPolicyModules(): void {
  mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringIssuePromotionPolicy.ts",
    "promotion policy",
  );
  mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringIssuePromotion.ts",
    "promotion repository",
  );
  mustExist("qa-agent/browser-qa/tests/monitoring-phase5d-promote-smoke.spec.mjs", "browser QA spec");
}

function verifyVercelFunctionCount(): void {
  try {
    execSync("npm run agentops:vercel-function-count-verify", {
      cwd: REPO_ROOT,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    const message =
      error instanceof Error && "stdout" in error
        ? String((error as { stdout?: string }).stdout ?? error.message)
        : String(error);
    fail(`Vercel function count verify failed: ${message.slice(0, 400)}`);
  }
}

function main(): void {
  verifyRegistryLock();
  verifyReports();
  verifyRegistryReadme();
  verifyWorkflowSafety();
  verifyPromotionApi();
  verifyNoUnsafeAutoPromoteInMonitoringPaths();
  verifyPolicyModules();
  verifyVercelFunctionCount();

  if (failures.length > 0) {
    console.error("AGENTOPS MONITORING OWNER PROMOTION LOCK VERIFY — FAILED");
    for (const message of failures) {
      console.error(`  ✗ ${message}`);
    }
    process.exit(1);
  }

  console.log("AGENTOPS MONITORING OWNER PROMOTION LOCK VERIFY — PASSED");
  console.log("  registry lock: present");
  console.log("  phase 5C/5D reports: present");
  console.log("  browser QA report: passed");
  console.log("  cron: disabled");
  console.log("  continuous: disabled");
  console.log("  dry-run: enforced");
  console.log("  owner promotion API: present");
  console.log("  vercel function count: safe");
}

main();
