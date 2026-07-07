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
    "agentops_monitoring_memory_proposals",
    "agentops_issues",
    "No auto-promotion",
    "Monitoring Memory Proposal Queue — Phase 5E",
    "owner_approved` ≠ active memory",
    "Phase 5F",
    "Owner-click memory application",
    "ownerClickApplyRequired",
    "No bulk approval",
    "Phase 5G",
    "Scheduled Monitoring",
    "0 */6 * * *",
    "0 2 * * 0",
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

function verifyApprovedWorkflowSchedules(workflow: string): void {
  const activeCrons: string[] = [];
  const lines = workflow.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith("#")) continue;
    const cronMatch = line.match(/-\s*cron:\s*"([^"]+)"/);
    if (cronMatch) activeCrons.push(cronMatch[1]);
  }

  if (!workflow.includes("concurrency:")) {
    fail("Workflow must define concurrency group agentops-staging-monitoring");
  }
  if (!workflow.includes("group: agentops-staging-monitoring")) {
    fail("Workflow concurrency group must be agentops-staging-monitoring");
  }
  if (!workflow.includes('cancel-in-progress: false')) {
    fail("Workflow concurrency must set cancel-in-progress: false");
  }

  const required = ["0 */6 * * *", "0 2 * * 0"];
  for (const cron of required) {
    if (!activeCrons.includes(cron)) {
      fail(`Workflow must include approved cron "${cron}"`);
    }
  }
  if (activeCrons.length !== 2) {
    fail(`Workflow must have exactly 2 active crons, found ${activeCrons.length}: ${activeCrons.join(", ")}`);
  }

  if (!workflow.includes("monitoring_mode:")) {
    fail("Workflow workflow_dispatch must include monitoring_mode input");
  }
  if (!workflow.includes("AGENTOPS_MONITORING_MODE")) {
    fail("Workflow must set AGENTOPS_MONITORING_MODE from resolved schedule step");
  }
}

function verifyWorkflowSafety(): void {
  const workflow = mustExist(
    ".github/workflows/agentops-monitoring-scheduled-dry-run.yml",
    "monitoring GHA workflow",
  );
  if (!workflow) return;

  verifyApprovedWorkflowSchedules(workflow);

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

function verifyMemoryApplicationPhase5fSafety(): void {
  mustExist(
    "supabase/migrations/20260707120000_agentops_monitoring_memory_apply_rpc.sql",
    "memory apply RPC migration",
  );
  mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringMemoryApplicationPolicy.ts",
    "memory application policy",
  );
  mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringMemoryApplication.ts",
    "memory application repository",
  );
  mustExist("api/agentops/_lib/monitoringMemoryApplication.ts", "Vercel-safe memory apply handler");

  const policy = mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringMemoryApplicationPolicy.ts",
    "memory application policy module",
  );
  if (policy) {
    if (!policy.includes("explicitOwnerClick")) {
      fail("Memory application policy must require explicitOwnerClick");
    }
    if (!policy.includes("owner_approved")) {
      fail("Memory application policy must require owner_approved status");
    }
    if (!policy.includes("agentops_memory")) {
      fail("Memory application policy must target agentops_memory");
    }
  }

  const application = mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringMemoryApplication.ts",
    "memory application repository module",
  );
  if (application) {
    if (!application.includes("agentops_apply_monitoring_memory_proposal")) {
      fail("Memory application must use atomic apply RPC");
    }
    if (!application.includes("alreadyApplied")) {
      fail("Memory application must support idempotent alreadyApplied responses");
    }
  }

  const workflow = mustExist(
    ".github/workflows/agentops-monitoring-scheduled-dry-run.yml",
    "monitoring GHA workflow",
  );
  if (workflow) {
    if (/memory-proposals\/apply|applyMonitoringMemoryProposal/i.test(workflow)) {
      fail("GHA workflow must not call memory apply endpoint");
    }
    if (/agentops_apply_monitoring_memory_proposal/i.test(workflow)) {
      fail("GHA workflow must not call memory apply RPC");
    }
  }

  const ghaInsert = mustExist(
    "scripts/agentops-monitoring-gha-memory-proposals-insert.ts",
    "GHA memory proposals insert",
  );
  if (ghaInsert && /memory-proposals\/apply|agentops_apply_monitoring_memory_proposal/i.test(ghaInsert)) {
    fail("GHA memory proposals insert must not apply memory");
  }

  const routes = mustExist("api/agentops/_lib/monitoringRoutes.ts", "monitoring routes");
  if (routes) {
    if (!routes.includes("handleMonitoringMemoryProposalApplyRequest")) {
      fail("monitoringRoutes must handle owner-click memory proposal apply");
    }
    if (!routes.includes("/api/agentops/monitoring/memory-proposals/apply")) {
      fail("monitoringRoutes must route POST memory-proposals/apply");
    }
    if (!routes.includes("ownerClickApplyRequired: true")) {
      fail("Status API must expose ownerClickApplyRequired safety flag");
    }
    if (!routes.includes("autoApplyMemory: false")) {
      fail("Status API must expose autoApplyMemory: false");
    }
    if (routes.includes("activeMemoryWritten: false") && !routes.includes("handleMonitoringMemoryProposalDecisionRequest")) {
      fail("Decision route should still assert activeMemoryWritten: false on approve");
    }
  }

  const uiReview = mustExist(
    "src/app/system/agent-ops/memory/MonitoringMemoryProposalsReview.tsx",
    "memory proposal review UI",
  );
  if (uiReview) {
    if (!uiReview.includes("Apply to Memory")) {
      fail("Memory proposal UI must offer separate Apply to Memory action");
    }
    if (/Auto-apply|Bulk apply|apply all|Apply all/i.test(uiReview)) {
      fail("Memory proposal UI must not offer auto-apply or bulk apply");
    }
    if (!uiReview.includes("Approved — not active memory yet")) {
      fail("Memory proposal UI must show owner_approved not-yet-applied state");
    }
  }
}

function verifyMemoryProposalPhase5eSafety(): void {
  mustExist(
    "supabase/migrations/20260706120000_agentops_monitoring_memory_proposals.sql",
    "memory proposals migration",
  );
  const policy = mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringMemoryProposalPolicy.ts",
    "memory proposal policy",
  );
  mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringMemoryProposals.ts",
    "memory proposals repository",
  );
  mustExist(
    "scripts/agentops-monitoring-gha-memory-proposals-insert.ts",
    "GHA memory proposals insert",
  );
  const uiReview = mustExist(
    "src/app/system/agent-ops/memory/MonitoringMemoryProposalsReview.tsx",
    "memory proposal review UI",
  );

  if (policy) {
    if (!policy.includes("actualMemoryWrites")) {
      fail("Memory proposal policy must block when actualMemoryWrites > 0");
    }
    if (!policy.includes("canCreateMonitoringMemoryProposal")) {
      fail("Memory proposal policy must export canCreateMonitoringMemoryProposal");
    }
  }

  const ghaInsert = mustExist(
    "scripts/agentops-monitoring-gha-memory-proposals-insert.ts",
    "GHA memory proposals insert script",
  );
  if (ghaInsert) {
    if (!ghaInsert.includes("actualMemoryWrites")) {
      fail("GHA memory proposals insert must refuse when actualMemoryWrites > 0");
    }
    if (/from\(["']agentops_memory["']\)/.test(ghaInsert)) {
      fail("GHA memory proposals insert must not write to agentops_memory");
    }
  }

  const workflow = mustExist(
    ".github/workflows/agentops-monitoring-scheduled-dry-run.yml",
    "monitoring GHA workflow",
  );
  if (workflow && !workflow.includes("agentops-monitoring-gha-memory-proposals-insert.ts")) {
    fail("Workflow must insert memory proposals after issue drafts (Phase 5E)");
  }

  const routes = mustExist("api/agentops/_lib/monitoringRoutes.ts", "monitoring routes");
  if (routes) {
    if (!routes.includes("handleMonitoringMemoryProposalsListRequest")) {
      fail("monitoringRoutes must list memory proposals");
    }
    if (!routes.includes("handleMonitoringMemoryProposalDecisionRequest")) {
      fail("monitoringRoutes must handle memory proposal decisions");
    }
    if (!routes.includes("activeMemoryWritten: false")) {
      fail("Memory proposal decision API must assert activeMemoryWritten: false");
    }
    if (!routes.includes('["owner_approved", "rejected", "deferred"].includes(decision)')) {
      fail("Memory proposal decision must allow only owner_approved, rejected, deferred");
    }
    if (/agentops_memory.*insert/i.test(routes) && routes.includes("MemoryProposalDecision")) {
      fail("Memory proposal decision route must not insert into agentops_memory");
    }
  }

  const proposalsLib = mustExist(
    "src/lib/agentops/runtime/agentOpsMonitoringMemoryProposals.ts",
    "memory proposals lib",
  );
  if (proposalsLib) {
    if (/from\(["']agentops_memory["']\)/.test(proposalsLib)) {
      fail("Memory proposals lib must not write to agentops_memory");
    }
    if (!/Applied proposals cannot be changed in Phase 5E/.test(proposalsLib)) {
      fail("Memory proposals lib must block mutation of applied proposals in Phase 5E");
    }
  }

  if (uiReview) {
    if (/Auto-apply|Bulk approve|Promote all|apply all/i.test(uiReview)) {
      fail("Memory proposal UI must not offer auto-apply or bulk approve");
    }
    if (!uiReview.includes("owner_approved")) {
      fail("Memory proposal UI must support owner_approved decision");
    }
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
  verifyMemoryProposalPhase5eSafety();
  verifyMemoryApplicationPhase5fSafety();
  verifyVercelFunctionCount();

  if (failures.length > 0) {
    console.error("AGENTOPS MONITORING OWNER PROMOTION LOCK VERIFY — FAILED");
    for (const message of failures) {
      console.error(`  ✗ ${message}`);
    }
    process.exit(1);
  }

  console.log("AGENTOPS MONITORING OWNER PROMOTION LOCK VERIFY — PASSED");
  console.log("  registry lock: present (5D + 5E + 5F)");
  console.log("  phase 5C/5D reports: present");
  console.log("  browser QA report: passed");
  console.log("  cron: approved staging dry-run schedules enabled");
  console.log("  operational cron: 0 */6 * * *");
  console.log("  weekly cron: 0 2 * * 0");
  console.log("  continuous: disabled");
  console.log("  dry-run: enforced");
  console.log("  owner promotion API: present");
  console.log("  memory proposal policy: present");
  console.log("  memory owner-click apply: present");
  console.log("  memory auto-apply from GHA: blocked");
  console.log("  vercel function count: safe");
}

main();
