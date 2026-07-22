/**
 * Phase E-A6 — static Issue detail fix-with-Cursor workflow verify.
 * Usage: npm run agentops:issue-fix-workflow-verify
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildOwnerSuggestedSolution,
  buildStructuredFixIssuePrompt,
  isStructuredFixPrompt,
  ownerActivityLabel,
  stagingPageUrl,
} from "../src/lib/agentops/findings/issueFixWorkflow.ts";
import { mapDraftStatusWithEvidence } from "../src/lib/agentops/findings/draftOwnerLifecycle.ts";
import {
  FINDINGS_TABS,
  findingMatchesTab,
  toCanonicalFindingView,
} from "../src/lib/agentops/findings/findingsLifecycleModel.ts";

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

const DETAIL = "src/app/system/agent-ops/issues/[issueCode]/page.tsx";
const LIST = "src/app/system/agent-ops/issues/page.tsx";
const API = "api/agentops/_lib/monitoringRoutes.ts";

function verifyPrimeActions(): void {
  mustInclude(DETAIL, "Fix with Cursor");
  mustInclude(DETAIL, "Delete issue");
  mustInclude(DETAIL, 'data-testid="agentops-fix-with-cursor"');
  mustInclude(DETAIL, 'data-testid="agentops-delete-issue"');
  mustInclude(DETAIL, "Fix with Cursor uses the Fix Issue Prompt on staging only");
  mustInclude(DETAIL, "Delete issue removes this issue from the active list");
  // Prime Approve/Defer/Reject removed — old prime label helper is gone.
  mustNotInclude(DETAIL, "actionLabelSafe");
  // Renamed labels exist only via advanced label mapper.
  mustInclude(DETAIL, 'return "Accept as real issue"');
  mustInclude(DETAIL, 'return "Review later"');
  mustInclude(DETAIL, 'return "Dismiss"');
  mustInclude(DETAIL, "advancedActionLabel");
  mustInclude(DETAIL, "Advanced actions");
}

function verifyOwnerCopy(): void {
  mustInclude(DETAIL, "Page checked by the agent");
  mustInclude(DETAIL, "Technical source run");
  mustInclude(DETAIL, 'data-testid="agentops-suggested-solution"');
  mustInclude(DETAIL, "Activity log");
  mustInclude(
    DETAIL,
    "Records what happened to this issue: when it was created, prompt changes, owner",
  );
  mustInclude(DETAIL, "Use this only when two issue records describe the same problem");
  // Mark duplicate advanced-only: it renders inside the Advanced actions disclosure list.
  mustInclude(DETAIL, 'data-testid="agentops-advanced-actions"');
}

function verifyFixHandoff(): void {
  mustInclude(DETAIL, "buildStructuredFixIssuePrompt");
  mustInclude(DETAIL, "downloadPromptFile");
  mustInclude(DETAIL, "mark_fixing");
  mustInclude(DETAIL, "Mark as fixed");
  mustInclude(DETAIL, 'data-testid="agentops-mark-as-fixed"');
  mustInclude(DETAIL, 'data-testid="agentops-mark-fixed-confirm"');
  mustInclude(DETAIL, 'data-testid="agentops-delete-confirm"');
  mustInclude(DETAIL, "Use structured template");
  // Honest handoff — no fake direct Cursor launch claims.
  mustNotInclude(DETAIL, "Sent to Cursor automatically");
  mustInclude(DETAIL, "open Cursor and paste this prompt");
  // E-A7 — local bridge integration on the detail page.
  mustInclude(DETAIL, "probeCursorBridge");
  mustInclude(DETAIL, "sendFixIssueToBridge");
  mustInclude(DETAIL, "Local bridge connected");
  mustInclude(DETAIL, "Local Cursor bridge is not running.");
  mustInclude(DETAIL, "Cursor opened with this fix prompt.");
}

function verifyStructuredPrompt(): void {
  const prompt = buildStructuredFixIssuePrompt({
    title: "Sample issue",
    agentName: "QA Agent",
    agentSlug: "qa-agent",
    route: "/system/agent-ops/issues",
    module: "agent-ops",
    createdAt: "2026-07-22T00:00:00.000Z",
    runId: "run-e-a6",
    severity: "medium",
    explanation: "Sample explanation.",
    evidenceSummary: "Sample evidence.",
    rawObservations: ["GET /api/x — 500"],
    artifactNote: null,
    ownerNotes: "Prior owner prompt.",
  });
  const requiredSections = [
    "AGENTOPS ISSUE FIX — STAGING ONLY",
    "Issue:",
    "Reported by:",
    "Page checked by the agent:",
    "Found:",
    "Source run:",
    "Severity:",
    "Simple explanation:",
    "Evidence:",
    "Task:",
    "Required steps:",
    "Strict constraints:",
    "Expected output:",
    "Do not touch main.",
    "Do not touch production.",
    "Do not use --prod.",
    "Do not create PRs.",
  ];
  for (const section of requiredSections) {
    if (!prompt.includes(section)) fail(`Structured prompt missing section ${JSON.stringify(section)}`);
  }
  if (!isStructuredFixPrompt(prompt)) fail("isStructuredFixPrompt must accept generated template");
  if (isStructuredFixPrompt("free text")) fail("isStructuredFixPrompt must reject free text");
  if (stagingPageUrl("/system/agent-ops") !== "https://ai-xia-staging.vercel.app/system/agent-ops") {
    fail("stagingPageUrl must build staging links for app routes");
  }
  if (stagingPageUrl("https://evil.example.com/x") !== null) {
    fail("stagingPageUrl must reject non-staging absolute URLs");
  }
  // No secrets in the template inputs/outputs.
  for (const banned of ["service_role", "SERVICE_ROLE", "storage_state", "Authorization:"]) {
    if (prompt.includes(banned)) fail(`Structured prompt must not include ${banned}`);
  }
}

function verifySuggestedSolution(): void {
  const strong = buildOwnerSuggestedSolution({
    suggestedSolution: null,
    route: "/system/agent-ops/issues",
    module: "agent-ops",
    typeLabel: "Issue",
    hasEvidence: true,
    likelyShellNoise: false,
  });
  if (!strong.includes("reproduce the problem on staging")) {
    fail("Suggested solution paragraph must describe reproduce-fix-recheck flow");
  }
  const weak = buildOwnerSuggestedSolution({
    suggestedSolution: null,
    route: null,
    module: null,
    typeLabel: "Issue",
    hasEvidence: false,
    likelyShellNoise: false,
  });
  if (!weak.includes("limited evidence")) {
    fail("Weak-evidence suggested solution must ask Cursor to verify reproduction first");
  }
}

function verifyLifecycleOverlays(): void {
  // API accepts the new owner decisions and keeps DB status within its constraint.
  mustInclude(API, '"mark_fixing"');
  mustInclude(API, '"mark_fixed"');
  mustInclude(API, '"delete_issue"');
  mustInclude(API, '"fixing"');
  mustInclude(API, '"fixed_by_owner"');
  mustInclude(API, '"deleted_by_owner"');
  mustNotInclude(API, 'nextStatus = "fixing"');
  mustNotInclude(API, 'nextStatus = "deleted"');

  if (mapDraftStatusWithEvidence("deferred", { ownerDecisionKind: "fixing" }) !== "fixing") {
    fail("deferred + fixing overlay must map to fixing");
  }
  if (
    mapDraftStatusWithEvidence("deferred", { ownerDecisionKind: "fixed_by_owner" }) !== "fixed"
  ) {
    fail("deferred + fixed_by_owner overlay must map to fixed");
  }
  if (
    mapDraftStatusWithEvidence("rejected", { ownerDecisionKind: "deleted_by_owner" }) !== "deleted"
  ) {
    fail("rejected + deleted_by_owner overlay must map to deleted");
  }
  if (mapDraftStatusWithEvidence("rejected", {}) !== "rejected") {
    fail("plain rejected must stay rejected");
  }

  const labels = ["fixing", "fixed_by_owner", "deleted_by_owner"].map(ownerActivityLabel);
  if (labels.some((label) => label.includes("_"))) {
    fail("Activity log labels must be owner-readable (no raw underscores)");
  }
}

function verifyListBehavior(): void {
  const tabIds = FINDINGS_TABS.map((tab) => tab.id);
  for (const id of ["fixing", "fixed", "deleted"]) {
    if (!tabIds.includes(id as (typeof FINDINGS_TABS)[number]["id"])) {
      fail(`Findings tabs must include ${id}`);
    }
  }
  const mk = (override: "fixing" | "fixed" | "deleted") =>
    toCanonicalFindingView({
      source: "draft",
      id: `e-a6-${override}`,
      draftId: `e-a6-${override}`,
      title: "Sample",
      statusRaw: override === "deleted" ? "rejected" : "deferred",
      agentSlug: "qa-agent",
      createdAt: "2026-07-22T00:00:00.000Z",
      ownerStatusOverride: override,
    });
  const fixing = mk("fixing");
  const fixed = mk("fixed");
  const deleted = mk("deleted");
  if (!fixing || !fixed || !deleted) {
    fail("Canonical views for fixing/fixed/deleted must build");
    return;
  }
  // Default list = Needs review tab: none of these may appear.
  for (const [name, item] of Object.entries({ fixing, fixed, deleted })) {
    if (findingMatchesTab(item, "needs-review")) {
      fail(`${name} issues must not appear in default Needs review tab`);
    }
  }
  if (!findingMatchesTab(fixing, "fixing")) fail("fixing must appear in Fixing tab");
  if (!findingMatchesTab(fixed, "fixed")) fail("fixed must appear in Fixed tab");
  if (!findingMatchesTab(deleted, "deleted")) fail("deleted must appear in Deleted tab");
  if (findingMatchesTab(deleted, "all")) fail("deleted must be hidden from All by default");

  // List stays browse/open only.
  mustNotInclude(LIST, "onApprove");
  mustNotInclude(LIST, "onDefer");
  mustNotInclude(LIST, "onReject");
  mustInclude(LIST, 'openLabel="Open issue"');
}

function verifyNoAutoProd(): void {
  mustNotInclude(DETAIL, "--prod");
  mustNotInclude(DETAIL, "createPullRequest");
  mustNotInclude(DETAIL, "workflow_dispatch");
  mustInclude(API, "assertOwnerFromRequest");
  // Client-supplied ownerId stays ignored.
  mustInclude(API, "Ignore client-supplied ownerId");
}

function main(): void {
  verifyPrimeActions();
  verifyOwnerCopy();
  verifyFixHandoff();
  verifyStructuredPrompt();
  verifySuggestedSolution();
  verifyLifecycleOverlays();
  verifyListBehavior();
  verifyNoAutoProd();

  if (failures.length > 0) {
    console.error("AGENTOPS ISSUE FIX WORKFLOW VERIFY — FAILED");
    for (const item of failures) console.error(`  - ${item}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      command: "agentops:issue-fix-workflow-verify",
      checks: [
        "prime_fix_with_cursor",
        "prime_delete_issue",
        "prime_approve_defer_reject_removed",
        "advanced_renamed_labels",
        "page_checked_by_agent",
        "suggested_solution_paragraph",
        "structured_prompt_template",
        "honest_cursor_handoff",
        "fixing_fixed_deleted_overlays",
        "mark_fixed_confirmation",
        "delete_confirmation",
        "mark_duplicate_advanced_only",
        "activity_log_copy",
        "fixed_deleted_hidden_from_default_list",
        "list_browse_open_only",
        "owner_auth_enforced",
        "no_auto_prod_pr",
      ],
    }),
  );
}

main();
