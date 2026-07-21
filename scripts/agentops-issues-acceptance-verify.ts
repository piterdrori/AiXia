/**
 * Phase E-A3 — static Issues workflow acceptance verify.
 * Usage: npm run agentops:issues-acceptance-verify
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function read(rel: string): string {
  const full = join(REPO_ROOT, rel);
  if (!existsSync(full)) {
    fail(`Missing file: ${rel}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function mustInclude(rel: string, needle: string): void {
  if (!read(rel).includes(needle)) fail(`${rel} must include ${JSON.stringify(needle)}`);
}

function mustNotInclude(rel: string, needle: string): void {
  if (read(rel).includes(needle)) fail(`${rel} must NOT include ${JSON.stringify(needle)}`);
}

function main(): void {
  // Routes
  mustInclude("src/App.tsx", 'path="/system/agent-ops/issues"');
  mustInclude("src/App.tsx", 'path="/system/agent-ops/issues/:issueCode"');
  mustNotInclude("src/App.tsx", 'path="/system/agent-ops/findings"');

  // List owner acceptance fields
  mustInclude("src/app/system/agent-ops/issues/page.tsx", 'title="Issues"');
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "openHref");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "foundLabel");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "Show likely shell noise");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "needs-more-info");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "duplicates");
  mustInclude("src/components/agentops/owner/AgentOpsFindingCard.tsx", "Reported by");
  mustInclude("src/components/agentops/owner/AgentOpsFindingCard.tsx", 'data-testid="agentops-open-issue"');

  // Detail owner acceptance
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Fix Issue Prompt");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "AgentOpsFindingChatCard");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "data-testid=\"agentops-issue-header-meta\"");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Needs more info");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Mark duplicate");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Open signed link");
  mustInclude(
    "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
    "No artifact links are available for this issue",
  );
  mustInclude(
    "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
    "Approving does not change code",
  );

  // Chat-to-prompt UI
  mustInclude("src/components/agentops/owner/AgentOpsFindingChatCard.tsx", "Use as Fix Issue Prompt");
  mustInclude("src/lib/agentops/findings/findingChatModel.ts", "Improve Fix Prompt");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "saveMonitoringDraftFixPrompt");

  // Owner decisions + auth
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "needs_more_info");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "mark_duplicate");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "assertOwnerFromRequest");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "ownerActionHistory");
  mustNotInclude("src/lib/agentops/findings/findingsOwnerCatalog.ts", 'ownerId: "owner"');

  // No auto-fix / Findings route
  mustNotInclude("api/agentops/_lib/monitoringRoutes.ts", "autoFix: true");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "auto-promote");

  // Promoted BQA-* runtime issues must resolve on Issues detail (not findings-only)
  mustInclude(
    "src/lib/agentops/findings/findingsDetailLoader.ts",
    "loadPromotedRuntimeDetail",
  );
  mustInclude(
    "src/lib/agentops/findings/findingsDetailLoader.ts",
    "getProductIssueByCode",
  );
  mustInclude(
    "src/lib/agentops/findings/findingsDetailLoader.ts",
    "bridgedFromRuntime",
  );

  // Agent Detail complement — no lifecycle mutations there
  mustInclude("scripts/agentops-pre-issues-pages-verify.ts", "no_issues_approval_ui");

  // Reports present
  if (!existsSync(join(REPO_ROOT, "qa-agent/reports/agentops-phase-e-a2-issue-review-polish.md"))) {
    fail("Missing E-A2 report");
  }

  if (failures.length > 0) {
    console.error("AGENTOPS ISSUES ACCEPTANCE VERIFY — FAILED");
    for (const item of failures) console.error(`  - ${item}`);
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      ok: true,
      command: "agentops:issues-acceptance-verify",
      checks: [
        "routes_reused",
        "list_owner_fields",
        "detail_owner_fields",
        "chat_to_prompt_ui",
        "prompt_save",
        "owner_decisions",
        "needs_more_info",
        "mark_duplicate",
        "non_owner_auth_wiring",
        "no_findings_route",
        "no_auto_fix",
        "promoted_bqa_detail_bridge",
      ],
    }),
  );
}

main();
