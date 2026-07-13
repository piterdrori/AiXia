/**
 * AgentOps Finding Detail — owner view-model helpers (Phase D).
 * Pure mappers over Phase C lifecycle + existing finding/draft fields.
 */

import {
  OWNER_FINDING_STATUS_LABEL,
  mapDraftOwnerStatus,
  mapFindingOwnerStatus,
  mapOwnerFindingType,
  ownerFindingTypeLabel,
  type CanonicalFindingSource,
  type OwnerFindingStatus,
  type OwnerFindingType,
} from "@/lib/agentops/findings/findingsLifecycleModel";

export type PromptSourceField =
  | "owner_edited_prompt"
  | "prompt_library"
  | "cursor_prompt"
  | "suggested_fix_prompt"
  | "remediation_prompt"
  | "implementation_prompt"
  | "none";

export type OwnerDetailAction =
  | "approve"
  | "defer"
  | "reject"
  | "promote"
  | "mark_fixed"
  | "request_verification"
  | "verify"
  | "reopen"
  | "open_agent"
  | "chat_agent";

export type PromptSafetyHit = {
  pattern: string;
  label: string;
};

const PROMPT_SAFETY_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(--prod|production deploy|deploy to production)\b/i, label: "production deployment" },
  { pattern: /\b(touch(es)? main|merge to main|push to main|checkout main)\b/i, label: "touching main" },
  { pattern: /\b(disable|bypass|skip).{0,40}owner (approval|gate)\b/i, label: "disabling owner approval" },
  { pattern: /\b(auto[- ]?(fix|apply|execute)|automatically fix)\b/i, label: "automatic fixes" },
  { pattern: /\b(auto[- ]?pr|create (a )?pr automatically|open (a )?pull request automatically)\b/i, label: "automatic PR creation" },
  { pattern: /\b(service[_ -]?role|secret key|api[_ -]?key|password)\b/i, label: "secret exposure" },
  { pattern: /\b(drop table|truncate |delete from |destructive (db|database))\b/i, label: "destructive database changes" },
  { pattern: /\b(bypass staging|skip staging|deploy without staging)\b/i, label: "bypassing staging" },
];

export function inspectPromptSafety(prompt: string): PromptSafetyHit[] {
  const text = prompt ?? "";
  const hits: PromptSafetyHit[] = [];
  for (const rule of PROMPT_SAFETY_RULES) {
    if (rule.pattern.test(text)) {
      hits.push({ pattern: rule.pattern.source, label: rule.label });
    }
  }
  return hits;
}

export type PromptResolutionInput = {
  ownerEditedPrompt?: string | null;
  promptLibraryText?: string | null;
  cursorPrompt?: string | null;
  suggestedFixPrompt?: string | null;
  remediationPrompt?: string | null;
  implementationPrompt?: string | null;
};

export type PromptResolution = {
  text: string | null;
  source: PromptSourceField;
  originalText: string | null;
};

/**
 * Precedence:
 * 1. edited owner-approved prompt
 * 2. prompt library approved entry
 * 3. cursor_prompt
 * 4. suggested_fix_prompt
 * 5. remediation_prompt
 * 6. implementation_prompt
 */
export function resolveSuggestedFixPrompt(input: PromptResolutionInput): PromptResolution {
  const original =
    firstNonEmpty(
      input.cursorPrompt,
      input.suggestedFixPrompt,
      input.remediationPrompt,
      input.implementationPrompt,
    ) ?? null;

  if (firstNonEmpty(input.ownerEditedPrompt)) {
    return {
      text: input.ownerEditedPrompt!.trim(),
      source: "owner_edited_prompt",
      originalText: original,
    };
  }
  if (firstNonEmpty(input.promptLibraryText)) {
    return {
      text: input.promptLibraryText!.trim(),
      source: "prompt_library",
      originalText: original,
    };
  }
  if (firstNonEmpty(input.cursorPrompt)) {
    return { text: input.cursorPrompt!.trim(), source: "cursor_prompt", originalText: original };
  }
  if (firstNonEmpty(input.suggestedFixPrompt)) {
    return {
      text: input.suggestedFixPrompt!.trim(),
      source: "suggested_fix_prompt",
      originalText: original,
    };
  }
  if (firstNonEmpty(input.remediationPrompt)) {
    return {
      text: input.remediationPrompt!.trim(),
      source: "remediation_prompt",
      originalText: original,
    };
  }
  if (firstNonEmpty(input.implementationPrompt)) {
    return {
      text: input.implementationPrompt!.trim(),
      source: "implementation_prompt",
      originalText: original,
    };
  }
  return { text: null, source: "none", originalText: null };
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function metaString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function ownerReadableExplanation(raw: string | null | undefined): {
  display: string;
  technical: string | null;
  inferred: boolean;
} {
  const text = (raw ?? "").trim();
  if (!text) {
    return {
      display: "No explanation is available for this finding yet.",
      technical: null,
      inferred: false,
    };
  }

  // Strip common Playwright/scanner prefixes for owner readability.
  const cleaned = text
    .replace(/^\[Monitoring draft\]\s*/i, "")
    .replace(/^\[Improvement proposal\]\s*/i, "")
    .replace(/^Call log:\s*/i, "")
    .trim();

  const looksTechnical =
    /page\.goto:|Timeout \d+ms|Error:|at Object\.|waiting until/i.test(cleaned) ||
    cleaned.length > 420;

  if (!looksTechnical) {
    return { display: cleaned, technical: null, inferred: false };
  }

  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  const display =
    firstSentence.length > 280 ? `${firstSentence.slice(0, 277)}…` : firstSentence;
  return {
    display: display || "A technical failure was recorded during staging review.",
    technical: cleaned,
    inferred: true,
  };
}

export function validOwnerActionsFor(input: {
  source: CanonicalFindingSource;
  ownerStatus: OwnerFindingStatus;
  hasFindingId: boolean;
  hasDraftId: boolean;
  hasPendingVerification: boolean;
}): OwnerDetailAction[] {
  const actions: OwnerDetailAction[] = ["open_agent", "chat_agent"];
  const { source, ownerStatus, hasFindingId, hasDraftId, hasPendingVerification } = input;

  if (source === "draft") {
    if (ownerStatus === "needs_review" && hasDraftId) {
      actions.push("approve", "defer", "reject");
    }
    if (ownerStatus === "approved" && hasDraftId) {
      actions.push("promote");
    }
    if (ownerStatus === "deferred" || ownerStatus === "rejected") {
      // No safe draft restore API — omit reopen for drafts.
    }
    return actions;
  }

  // finding
  if (ownerStatus === "needs_review" || ownerStatus === "approved") {
    if (hasFindingId) actions.push("approve", "defer", "reject");
  }
  if (ownerStatus === "active" || ownerStatus === "in_progress") {
    if (hasFindingId) {
      actions.push("mark_fixed", "request_verification", "defer", "reject");
    }
  }
  if (ownerStatus === "fixed") {
    if (hasFindingId) actions.push("request_verification");
  }
  if (ownerStatus === "waiting_for_verification") {
    if (hasFindingId && hasPendingVerification) {
      actions.push("verify", "reopen");
    } else if (hasFindingId) {
      actions.push("request_verification", "reopen");
    }
  }
  if (ownerStatus === "verified" || ownerStatus === "deferred" || ownerStatus === "rejected") {
    if (hasFindingId) actions.push("reopen");
  }
  return actions;
}

export function actionLabel(action: OwnerDetailAction): string {
  switch (action) {
    case "approve":
      return "Approve";
    case "defer":
      return "Defer";
    case "reject":
      return "Reject";
    case "promote":
      return "Promote to issue";
    case "mark_fixed":
      return "Mark fixed";
    case "request_verification":
      return "Request verification";
    case "verify":
      return "Verify";
    case "reopen":
      return "Reopen";
    case "open_agent":
      return "Open agent";
    case "chat_agent":
      return "Chat with agent";
    default:
      return action;
  }
}

export function actionHelp(action: OwnerDetailAction): string {
  switch (action) {
    case "approve":
      return "Approves this finding for work. Does not promote a draft automatically.";
    case "defer":
      return "Keeps the finding available and records your deferral.";
    case "reject":
      return "Records rejection. Evidence is retained.";
    case "promote":
      return "Creates or links a promoted issue via the owner promotion service.";
    case "mark_fixed":
      return "Marks fixed and creates a pending verification when needed.";
    case "request_verification":
      return "Requests verification without auto-running fixes.";
    case "verify":
      return "Records verified fixed through the existing verification service.";
    case "reopen":
      return "Restores an active/in-progress reviewable state.";
    case "open_agent":
      return "Opens the reporting agent detail page.";
    case "chat_agent":
      return "Opens Agent Chat for the reporting agent.";
    default:
      return "";
  }
}

export type HistoryEvent = {
  id: string;
  at: string;
  actor: string;
  label: string;
  note: string | null;
};

export function mapFeedbackToHistoryLabel(feedbackType: string, metadata?: Record<string, unknown> | null): string {
  const action = typeof metadata?.action === "string" ? metadata.action : null;
  if (action === "save_suggested_fix_prompt") return "Prompt edited";
  if (action === "restore_original_prompt") return "Original prompt restored";
  switch (feedbackType) {
    case "approve":
      return "Owner approved";
    case "defer":
      return "Deferred";
    case "reject":
    case "false_positive":
      return "Rejected";
    case "mark_fixed":
      return "Marked fixed";
    case "request_verification":
      return "Verification requested";
    case "mark_in_progress":
      return "Marked in progress";
    case "re_review_request":
      return "Reopened for review";
    default:
      return feedbackType.replaceAll("_", " ");
  }
}

export function mapOwnerStatusFromSources(input: {
  source: CanonicalFindingSource;
  statusRaw: string;
}): OwnerFindingStatus {
  if (input.source === "draft") {
    const mapped = mapDraftOwnerStatus(input.statusRaw);
    if (mapped === "superseded") return "unknown";
    return mapped;
  }
  return mapFindingOwnerStatus(input.statusRaw);
}

export function buildWhyItMatters(parts: {
  saas?: string | null;
  aiMcp?: string | null;
  personalAi?: string | null;
  hr?: string | null;
  security?: string | null;
  problem?: string | null;
  severity?: string | null;
}): Array<{ label: string; text: string; inferred: boolean }> {
  const rows: Array<{ label: string; text: string; inferred: boolean }> = [];
  if (parts.saas?.trim()) rows.push({ label: "User / SaaS impact", text: parts.saas.trim(), inferred: false });
  if (parts.aiMcp?.trim()) rows.push({ label: "AI / MCP impact", text: parts.aiMcp.trim(), inferred: false });
  if (parts.personalAi?.trim()) {
    rows.push({ label: "Personal AI impact", text: parts.personalAi.trim(), inferred: false });
  }
  if (parts.hr?.trim()) rows.push({ label: "Operational / HR impact", text: parts.hr.trim(), inferred: false });
  if (parts.security?.trim()) {
    rows.push({ label: "Security impact", text: parts.security.trim(), inferred: false });
  }
  if (rows.length === 0 && parts.problem?.trim()) {
    const severity = parts.severity?.trim() || "recorded";
    rows.push({
      label: "Reliability / UX impact",
      text: `Inferred from finding severity (${severity}): ${parts.problem.trim().slice(0, 280)}`,
      inferred: true,
    });
  }
  return rows;
}

export function typeAndStatusLabels(type: OwnerFindingType, status: OwnerFindingStatus) {
  return {
    typeLabel: ownerFindingTypeLabel(type),
    statusLabel: OWNER_FINDING_STATUS_LABEL[status],
  };
}

export { mapOwnerFindingType };
