/**
 * AgentOps monitoring policy verification — Phase 1 safety contract.
 * Usage: npx tsx scripts/agentops-monitoring-policy-verify.ts
 */
import {
  assertMonitoringActionAllowed,
  getActiveMonitoringLevel,
  getAllAgentMonitoringRoles,
  getRuntimeMonitoringPolicy,
  hasBrowserQaEvidence,
  isLevel4Forbidden,
  listCanonicalAgentSlugs,
} from "../src/lib/agentops/runtime/agentOpsMonitoringPolicy";
import { assertStagingScanUrl } from "../src/lib/agentops/runtime/stagingScanUrlGuard";

const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function verifyAllTwelveAgentsClassified(): void {
  const slugs = listCanonicalAgentSlugs();
  if (slugs.length !== 12) {
    fail(`Expected 12 canonical agents, found ${slugs.length}`);
  }
  const roles = getAllAgentMonitoringRoles();
  if (roles.length !== 12) {
    fail(`Expected 12 monitoring roles, found ${roles.length}`);
  }
  for (const slug of slugs) {
    const role = roles.find((entry) => entry.agentSlug === slug);
    if (!role) {
      fail(`Missing monitoring role for ${slug}`);
    }
    if (!role?.monitoringRoleDescription?.trim()) {
      fail(`Missing monitoringRoleDescription for ${slug}`);
    }
  }
}

function verifyNoAutoFixDeploy(): void {
  for (const slug of listCanonicalAgentSlugs()) {
    for (const action of ["apply_fix", "deploy"] as const) {
      const decision = assertMonitoringActionAllowed(action, { agentSlug: slug });
      if (decision.allowed) {
        fail(`${slug} incorrectly allowed ${action}`);
      }
    }
  }
  if (!isLevel4Forbidden()) {
    fail("Level 4 must be forbidden");
  }
}

function verifyMemorySafe(): void {
  for (const role of getAllAgentMonitoringRoles()) {
    if (role.canUpdateMemory !== "proposal_only" && role.canUpdateMemory !== "none") {
      fail(`${role.agentSlug} has invalid canUpdateMemory: ${role.canUpdateMemory}`);
    }
    if (role.canUpdateMemory === "proposal_only") {
      const approvedAttempt = assertMonitoringActionAllowed("update_memory", {
        agentSlug: role.agentSlug,
        memoryApproved: true,
      });
      if (approvedAttempt.allowed) {
        fail(`${role.agentSlug} allowed silent memory approval`);
      }
    }
  }
}

function verifyProductionBlocked(): void {
  const productionUrls = [
    "https://aixia.app/dashboard",
    "https://app.production.example/system/agent-ops",
  ];
  for (const url of productionUrls) {
    const guard = assertStagingScanUrl(url);
    if (guard.ok) {
      fail(`Production URL should be blocked: ${url}`);
    }
  }
  const stagingGuard = assertStagingScanUrl("http://127.0.0.1:5173");
  if (!stagingGuard.ok) {
    fail(`Local staging should be allowed: ${stagingGuard.error}`);
  }
  const policy = getRuntimeMonitoringPolicy();
  if (!policy.productionBlocked) {
    fail("RuntimeMonitoringPolicy.productionBlocked must be true");
  }
}

function verifyIssueCreationEvidenceGated(): void {
  const decision = assertMonitoringActionAllowed("create_issue_draft", {
    agentSlug: "qa-agent",
    stagingUrl: "http://127.0.0.1:5173",
    evidence: { scan_mode: "playwright", route: "/dashboard" },
  });
  if (decision.allowed) {
    fail("Issue auto-create should be blocked at default Level 0");
  }
  if (decision.code !== "ISSUE_AUTO_CREATE_DISABLED") {
    fail(`Expected ISSUE_AUTO_CREATE_DISABLED, got ${decision.code}`);
  }
  if (!hasBrowserQaEvidence({ scan_mode: "playwright", route: "/x" })) {
    fail("hasBrowserQaEvidence should accept playwright + route");
  }
  if (hasBrowserQaEvidence({ scan_mode: "manual_note" })) {
    fail("hasBrowserQaEvidence should reject non-browser evidence");
  }
}

function verifyDefaultLevelZero(): void {
  const level = getActiveMonitoringLevel();
  if (level !== 0 && process.env.AGENTOPS_MONITORING_LEVEL) {
    fail(`AGENTOPS_MONITORING_LEVEL env set to ${level} during verify — expected 0 for Phase 1 default test`);
  }
  if (!process.env.AGENTOPS_MONITORING_LEVEL && level !== 0) {
    fail(`Default monitoring level should be 0, got ${level}`);
  }
}

function verifyLoopsNotActiveByDefault(): void {
  const policy = getRuntimeMonitoringPolicy();
  if (policy.scheduledEnabled || policy.continuousEnabled) {
    fail("Scheduled/continuous env flags must not be set during default verify run");
  }
}

function main(): void {
  verifyAllTwelveAgentsClassified();
  verifyNoAutoFixDeploy();
  verifyMemorySafe();
  verifyProductionBlocked();
  verifyIssueCreationEvidenceGated();
  verifyDefaultLevelZero();
  verifyLoopsNotActiveByDefault();

  if (failures.length > 0) {
    console.error("AGENTOPS MONITORING POLICY VERIFY — FAILED");
    for (const message of failures) {
      console.error(`  ✗ ${message}`);
    }
    process.exit(1);
  }

  console.log("AGENTOPS MONITORING POLICY VERIFY — PASSED");
  console.log(`  agents classified: ${getAllAgentMonitoringRoles().length}`);
  console.log(`  active level (default): ${getActiveMonitoringLevel()}`);
  console.log("  Level 4 forbidden: yes");
  console.log("  production blocked: yes");
  console.log("  scheduled/continuous active: no (default)");
}

main();
