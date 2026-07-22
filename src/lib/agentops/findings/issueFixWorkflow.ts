/**
 * E-A6 — Issue detail fix-with-Cursor workflow helpers.
 * Structured Fix Issue Prompt template, owner-readable suggested solution,
 * staging page link, and owner-friendly activity log labels.
 * Pure functions only — no network, no secrets, no execution.
 */

export const STRUCTURED_FIX_PROMPT_HEADER = "AGENTOPS ISSUE FIX — STAGING ONLY";

const STAGING_BASE_URL = "https://ai-xia-staging.vercel.app";

/** Build a safe, clickable staging URL for an app route. Returns null for non-app routes. */
export function stagingPageUrl(route: string | null | undefined): string | null {
  const value = (route ?? "").trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    // Only trust staging URLs — never link owner clicks to arbitrary hosts.
    return value.startsWith(STAGING_BASE_URL) ? value : null;
  }
  if (!value.startsWith("/")) return null;
  return `${STAGING_BASE_URL}${value}`;
}

export type StructuredFixPromptInput = {
  title: string;
  agentName: string | null;
  agentSlug: string | null;
  route: string | null;
  module: string | null;
  createdAt: string | null;
  runId: string | null;
  severity: string | null;
  explanation: string | null;
  evidenceSummary: string | null;
  rawObservations: string[];
  artifactNote: string | null;
  ownerNotes?: string | null;
};

export function isStructuredFixPrompt(text: string | null | undefined): boolean {
  return (text ?? "").trimStart().startsWith(STRUCTURED_FIX_PROMPT_HEADER);
}

/** Owner-editable Cursor-quality Fix Issue Prompt. Never includes secrets or auth data. */
export function buildStructuredFixIssuePrompt(input: StructuredFixPromptInput): string {
  const pageUrl = stagingPageUrl(input.route);
  const reportedBy = input.agentName
    ? `${input.agentName}${input.agentSlug ? ` (${input.agentSlug})` : ""}`
    : input.agentSlug ?? "Unknown agent";

  const evidenceLines: string[] = [];
  if (input.evidenceSummary?.trim()) evidenceLines.push(input.evidenceSummary.trim());
  for (const line of input.rawObservations.slice(0, 8)) {
    if (line.trim()) evidenceLines.push(`- ${line.trim()}`);
  }
  if (input.artifactNote?.trim()) evidenceLines.push(input.artifactNote.trim());
  if (evidenceLines.length === 0) {
    evidenceLines.push(
      "No artifact links are available for this issue. The issue was created from text evidence only.",
    );
  }

  const sections = [
    STRUCTURED_FIX_PROMPT_HEADER,
    "",
    "Issue:",
    input.title.trim() || "Untitled issue",
    "",
    "Reported by:",
    reportedBy,
    "",
    "Page checked by the agent:",
    pageUrl ?? input.route ?? "Route not recorded",
    ...(input.module ? ["", "Module:", input.module] : []),
    "",
    "Found:",
    input.createdAt ?? "Unknown",
    "",
    "Source run:",
    input.runId ?? "Not recorded",
    "",
    "Severity:",
    input.severity ?? "Not set",
    "",
    "Simple explanation:",
    input.explanation?.trim() || "No owner-readable explanation was recorded for this issue.",
    "",
    "Evidence:",
    ...evidenceLines,
    ...(input.ownerNotes?.trim()
      ? ["", "Owner notes / prior fix prompt:", input.ownerNotes.trim()]
      : []),
    "",
    "Task:",
    "Investigate and fix this issue on staging only.",
    "",
    "Required steps:",
    "1. Reproduce the issue on the staging route.",
    "2. Identify the root cause.",
    "3. Fix only the files required for this issue.",
    "4. Keep owner-facing copy truthful.",
    "5. Run the relevant tests and Browser QA.",
    "6. Confirm the issue no longer reproduces.",
    "7. Update the issue status to Fixed only after verification.",
    "",
    "Strict constraints:",
    "- Do not touch main.",
    "- Do not touch production.",
    "- Do not use --prod.",
    "- Do not create PRs.",
    "- Do not deploy production.",
    "- Do not modify unrelated files.",
    "- Do not auto-promote unrelated issues.",
    "- Do not expose secrets.",
    "",
    "Expected output:",
    "- root cause",
    "- files changed",
    "- tests run",
    "- screenshots/evidence",
    "- final verdict",
  ];

  return sections.join("\n");
}

export type OwnerSuggestedSolutionInput = {
  suggestedSolution: string | null;
  route: string | null;
  module: string | null;
  typeLabel: string;
  hasEvidence: boolean;
  likelyShellNoise: boolean;
};

/** Owner-readable Suggested solution paragraph — no raw technical dump. */
export function buildOwnerSuggestedSolution(input: OwnerSuggestedSolutionInput): string {
  if (input.suggestedSolution?.trim()) return input.suggestedSolution.trim();
  const where = input.route
    ? `the ${input.route} page`
    : input.module
      ? `the ${input.module} module`
      : "the reported page";
  if (!input.hasEvidence || input.likelyShellNoise) {
    return (
      `This issue has limited evidence. Cursor should first verify whether the problem still ` +
      `reproduces on ${where} (staging) before changing code. If it does not reproduce, ` +
      `report that honestly instead of changing files.`
    );
  }
  return (
    `The issue appears to come from ${where} behavior during AgentOps review. ` +
    `The fix should inspect the page, reproduce the problem on staging, correct the UI or ` +
    `data flow causing it, and then rerun the relevant QA checks to confirm the issue is gone.`
  );
}

/** Owner-friendly Activity log labels for stored owner action history entries. */
export function ownerActivityLabel(action: string): string {
  switch (action) {
    case "owner_approved":
      return "Accepted as real issue";
    case "rejected":
      return "Dismissed";
    case "deferred":
      return "Moved to review later";
    case "needs_more_info":
      return "More information requested";
    case "marked_duplicate":
      return "Marked as duplicate";
    case "fixing":
      return "Sent to Cursor — marked Fixing";
    case "fixed_by_owner":
      return "Marked fixed by owner";
    case "deleted_by_owner":
      return "Deleted by owner";
    case "save_fix_prompt":
      return "Fix prompt saved";
    case "promote":
      return "Promoted to issue";
    default:
      return action;
  }
}
