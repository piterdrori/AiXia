/**
 * Phase E-A1 — static Issues review workflow verify.
 * Usage: npm run agentops:issues-verify
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { classifyLikelyShellNoiseDraft, shouldSkipFailedRequestDraft } from "../src/lib/agentops/findings/issueDraftNoise.ts";
import { hasBrowserQaEvidenceDraft } from "../src/lib/agentops/runtime/agentOpsMonitoringIssuePromotionPolicy.ts";
import type { MonitoringIssueDraftRow } from "../src/lib/agentops/runtime/agentOpsMonitoringIssueDrafts.ts";
import { toCanonicalFindingView } from "../src/lib/agentops/findings/findingsLifecycleModel.ts";

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

function verifyRoutesAndCopy(): void {
  mustInclude("src/App.tsx", 'path="/system/agent-ops/issues"');
  mustInclude("src/App.tsx", 'path="/system/agent-ops/issues/:issueCode"');
  mustNotInclude("src/App.tsx", 'path="/system/agent-ops/findings"');
  mustInclude("src/app/system/agent-ops/issues/page.tsx", 'title="Issues"');
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "openHref");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "foundLabel");
  mustInclude("src/components/agentops/owner/AgentOpsFindingCard.tsx", "Reported by");
  mustInclude("src/components/agentops/owner/AgentOpsFindingCard.tsx", "openHref");
  mustInclude("src/components/agentops/owner/AgentOpsFindingCard.tsx", 'data-testid="agentops-issue-reported-by"');
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Fix Issue Prompt");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "AgentOpsFindingChatCard");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "saveMonitoringDraftFixPrompt");
  mustInclude(
    "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
    "Approving does not change code",
  );
}

function verifyAuthHardening(): void {
  mustInclude("api/agentops/_lib/monitoringOwnerAuth.ts", "assertOwnerFromRequest");
  mustInclude("api/agentops/_lib/monitoringOwnerAuth.ts", "agentops_is_owner");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "assertOwnerFromRequest");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "handleMonitoringDraftPromptSaveRequest");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "getIssueDraftById");
  mustInclude("src/lib/agentops/findings/findingsOwnerCatalog.ts", "Authorization");
  mustNotInclude("src/lib/agentops/findings/findingsOwnerCatalog.ts", 'ownerId: "owner"');
  mustNotInclude(
    "src/app/system/agent-ops/issues/MonitoringIssueDraftsReview.tsx",
    'ownerId: "owner"',
  );
}

function verifyNoAutoFix(): void {
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "does not");
  mustNotInclude("src/app/system/agent-ops/issues/page.tsx", "auto-promote");
  mustNotInclude("api/agentops/_lib/monitoringRoutes.ts", "autoFix: true");
}

function verifyEa2Polish(): void {
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "needs_more_info");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "mark_duplicate");
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "ownerActionHistory");
  mustInclude("src/lib/agentops/findings/draftOwnerLifecycle.ts", "mapDraftStatusWithEvidence");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Needs more info");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Mark duplicate");
  mustInclude("src/app/system/agent-ops/issues/[issueCode]/page.tsx", "Open signed link");
  mustInclude("src/components/agentops/owner/AgentOpsFindingChatCard.tsx", "Use as Fix Issue Prompt");
  mustInclude("src/lib/agentops/findings/findingChatModel.ts", "Improve Fix Prompt");
  mustInclude("src/app/system/agent-ops/issues/page.tsx", "Show likely shell noise");
  mustInclude("src/lib/agentops/findings/findingsLifecycleModel.ts", "needs-more-info");
  mustInclude("src/lib/agentops/findings/findingsLifecycleModel.ts", "duplicates");
  mustInclude(
    "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
    "No artifact links are available for this issue",
  );
}

function verifyOpenPath(): void {
  const view = toCanonicalFindingView({
    source: "draft",
    id: "21109c88-4ca6-4afa-9546-f7db66f8bc13",
    draftId: "21109c88-4ca6-4afa-9546-f7db66f8bc13",
    title: "Sample",
    statusRaw: "draft",
    agentSlug: "qa-agent",
    createdAt: "2026-07-20T00:00:00.000Z",
  });
  if (!view?.openPath?.includes("draft-21109c88-4ca6-4afa-9546-f7db66f8bc13")) {
    fail("Draft openPath must use draft-<uuid> href");
  }
}

function verifyNoiseFilter(): void {
  const skip = shouldSkipFailedRequestDraft({
    pageUrl: "/system/agent-ops/agents/qa-agent",
    findingType: "failed_requests",
    evidenceText: "HEAD https://ai-xia-staging.vercel.app/tasks — net::ERR_ABORTED",
  });
  if (!skip) fail("Shell HEAD abort should skip draft creation");

  const keep = shouldSkipFailedRequestDraft({
    pageUrl: "/system/agent-ops/agents/qa-agent",
    findingType: "failed_requests",
    evidenceText: "GET https://ai-xia-staging.vercel.app/api/agentops/monitoring/status — 500",
  });
  if (keep) fail("Real AgentOps API 500 must still create a draft");

  const noise = classifyLikelyShellNoiseDraft({
    title: "Failed or errored network requests",
    summary: "2 failed...",
    route: "/system/agent-ops/agents/qa-agent",
    module: "agent-ops",
    browserQaEvidence: {
      evidence: "HEAD https://x/tasks — net::ERR_ABORTED | HEAD https://x/calendar_events — abort",
    },
  });
  if (!noise.likelyShellNoise) fail("Existing shell-noise draft should be labeled");
}

function verifyPromotionEvidence(): void {
  const workerDraft = {
    id: "d1",
    monitoring_run_id: null,
    run_id: "run-1",
    github_run_id: null,
    source: "owner_manual_browser_qa",
    status: "owner_approved",
    agent_slug: "qa-agent",
    module: "agent-ops",
    route: "/system/agent-ops/agents/qa-agent",
    issue_type: "failed_requests",
    severity: "medium",
    title: "Sample",
    summary: "Sample summary",
    evidence: { ownerManual: true, evidence: "GET /api/agentops/x — 500" },
    browser_qa_evidence: {
      scan_mode: "playwright",
      route: "/system/agent-ops/agents/qa-agent",
      type: "failed_requests",
      evidence: "GET /api/agentops/x — 500",
      source: "owner_manual_browser_qa",
    },
    suggested_fix_prompt: "Investigate",
    confidence: 0.5,
    duplicate_key: "abc",
    duplicate_of: null,
    owner_decision_by: "owner-user",
    owner_decision_at: "2026-07-21T00:00:00.000Z",
    promoted_issue_id: null,
    created_at: "2026-07-21T00:00:00.000Z",
    updated_at: "2026-07-21T00:00:00.000Z",
  } satisfies MonitoringIssueDraftRow;

  if (!hasBrowserQaEvidenceDraft(workerDraft)) {
    fail("Worker Browser QA draft with playwright scan_mode must satisfy promotion evidence");
  }

  const legacyWorker = {
    ...workerDraft,
    browser_qa_evidence: {
      type: "failed_requests",
      evidence: "GET /api/agentops/x — 500",
      source: "owner_manual_browser_qa",
    },
  };
  if (!hasBrowserQaEvidenceDraft(legacyWorker)) {
    fail("Equivalent worker evidence without scan_mode must still be accepted");
  }
}

function verifyFunctionCountSafe(): void {
  mustInclude("api/agentops/monitoring.ts", "routeMonitoringRequest");
  // No new Vercel function file — drafts routes stay on monitoring.ts
  if (!existsSync(join(REPO_ROOT, "api/agentops/monitoring.ts"))) {
    fail("monitoring.ts missing");
  }
  if (existsSync(join(REPO_ROOT, "api/agentops/drafts.ts"))) {
    fail("Do not add a separate drafts Vercel function file");
  }
}

function main(): void {
  verifyRoutesAndCopy();
  verifyAuthHardening();
  verifyNoAutoFix();
  verifyOpenPath();
  verifyNoiseFilter();
  verifyPromotionEvidence();
  verifyFunctionCountSafe();
  verifyEa2Polish();

  if (failures.length > 0) {
    console.error("AGENTOPS ISSUES VERIFY — FAILED");
    for (const item of failures) console.error(`  - ${item}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      command: "agentops:issues-verify",
      checks: [
        "routes_reused",
        "no_findings_route",
        "owner_auth",
        "draft_get_by_id",
        "fix_prompt_save",
        "open_href",
        "noise_filter",
        "promotion_evidence",
        "function_count_safe",
        "needs_more_info",
        "mark_duplicate",
        "owner_history",
        "evidence_artifact_ux",
        "chat_to_prompt",
      ],
    }),
  );
}

main();
