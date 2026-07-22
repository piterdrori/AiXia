/**
 * Phase E-A3/E-A4 — static Issues workflow acceptance verify.
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

  // List owner acceptance fields — browse + Open issue only
  mustInclude("src/app/system/agent-ops/issues/page.tsx", 'title="Issues"');
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "openHref");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "foundLabel");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", 'openLabel="Open issue"');
  mustInclude(
    "src/app/system/agent-ops/issues/page.tsx",
    "This is your Issues inbox. Open an issue to review the evidence",
  );
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "Show likely shell noise");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "needs-more-info");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "duplicates");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "onDraftsReady");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "onApprove");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "onDefer");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "onReject");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "onSecondary");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "Promote to issue");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "applyMonitoringDraftDecision");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "promoteMonitoringDraft");
  mustInclude("src/components/agentops/owner/AgentOpsFindingCard.tsx", "Reported by");
  mustInclude("src/components/agentops/owner/AgentOpsFindingCard.tsx", 'data-testid="agentops-open-issue"');

  // Detail owner acceptance — full decision workflow retained
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Fix Issue Prompt");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "AgentOpsFindingChatCard");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", 'data-testid="agentops-issue-header-meta"');
  // E-A6 — prime actions replaced; workflow decisions live in collapsed Advanced actions.
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Fix with Cursor");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Delete issue");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Mark as fixed");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", 'return "Accept as real issue"');
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", 'return "Review later"');
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", 'return "Dismiss"');
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", 'return "Promote approved issue"');
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Needs more info");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Mark duplicate");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Open signed link");
  mustInclude(
    "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
    "No artifact links are available for this issue",
  );
  mustInclude(
    "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
    "Fix with Cursor uses the Fix Issue Prompt on staging only",
  );
  mustInclude("src/components/agentops/owner/AgentOpsPageHeader.tsx", 'data-testid="agentops-page-h1"');
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Loading issue…");

  // Chat-to-prompt — deterministic closure (E-A4)
  mustInclude("src/components/agentops/owner/AgentOpsFindingChatCard.tsx", "Use as Fix Issue Prompt");
  mustInclude("src/components/agentops/owner/AgentOpsFindingChatCard.tsx", "Suggested Fix Prompt");
  mustInclude("src/lib/agentops/findings/findingChatModel.ts", "Improve Fix Prompt");
  mustInclude("src/lib/agentops/findings/findingChatModel.ts", "buildDeterministicFixPromptSuggestion");
  mustInclude("src/lib/agentops/findings/findingChatModel.ts", "resolvePromptRewriteProposal");
  mustInclude("src/lib/agentops/findings/findingChatModel.ts", "deterministic_fallback");
  mustInclude("src/lib/agentops/findings/findingChatModel.ts", "fixPromptSuggestion");
  mustInclude("src/components/agentops/owner/useAgentOpsFindingChat.tsx", "resolvePromptRewriteProposal");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "saveMonitoringDraftFixPrompt");

  // Overlay labels not hidden behind Deferred
  mustInclude("src/lib/agentops/findings/findingsLifecycleModel.ts", 'needs_more_info: "Needs more info"');
  mustInclude("src/lib/agentops/findings/findingsLifecycleModel.ts", 'duplicate: "Marked duplicate"');
  mustInclude("src/lib/agentops/findings/draftOwnerLifecycle.ts", "needs_more_info");
  mustInclude("src/lib/agentops/findings/draftOwnerLifecycle.ts", "marked_duplicate");

  // Owner decisions + auth
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "needs_more_info");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "mark_duplicate");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "assertOwnerFromRequest");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "ownerActionHistory");
  mustNotInclude("src/lib/agentops/findings/findingsOwnerCatalog.ts", 'ownerId: "owner"');

  // No auto-fix / Findings route
  mustNotInclude("api/agentops/_lib/monitoringRoutes.ts", "autoFix: true");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "auto-promote");

  // Promoted BQA-* runtime issues must resolve on Issues detail
  mustInclude("src/lib/agentops/findings/findingsDetailLoader.ts", "loadPromotedRuntimeDetail");
  mustInclude("src/lib/agentops/findings/findingsDetailLoader.ts", "getProductIssueByCode");
  mustInclude("src/lib/agentops/findings/findingsDetailLoader.ts", "bridgedFromRuntime");

  // Agent Detail complement — no lifecycle mutations there
  mustInclude("scripts/agentops-pre-issues-pages-verify.ts", "no_issues_approval_ui");

  // Reports present
  if (!existsSync(join(REPO_ROOT, "qa-agent/reports/agentops-phase-e-a3-issues-acceptance.md"))) {
    fail("Missing E-A3 report");
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
        "list_open_only",
        "list_no_decision_actions",
        "inbox_helper_copy",
        "detail_owner_fields",
        "detail_keeps_decision_actions",
        "chat_to_prompt_deterministic",
        "use_as_fix_prompt_ui",
        "prompt_save",
        "promoted_h1",
        "owner_decisions",
        "needs_more_info_label",
        "marked_duplicate_label",
        "non_owner_auth_wiring",
        "no_findings_route",
        "no_auto_fix",
        "promoted_bqa_detail_bridge",
        "drafts_first_paint",
      ],
    }),
  );
}

main();
