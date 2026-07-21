/**
 * Phase 5D — owner-click-only monitoring issue draft promotion policy.
 * Promotion to live agentops_issues requires explicit owner action on staging Supabase.
 */

import { extractSupabaseProjectRefFromUrl } from "../execution/agentOpsStagingGuard";
import { AGENTOPS_MONITORING_STAGING_PROJECT_REF } from "./agentOpsMonitoringRunIndex";
import type { MonitoringIssueDraftRow } from "./agentOpsMonitoringIssueDrafts";

export type MonitoringIssuePromotionOwnerContext = {
  ownerId: string;
  /** Must be true — blocks automatic pipeline promotion. */
  explicitOwnerClick: boolean;
  supabaseProjectRef?: string | null;
  /** When set to "automatic", promotion is forbidden. */
  pipelineContext?: "owner_ui" | "automatic" | null;
};

const FORBIDDEN_DRAFT_STATUSES = new Set(["draft", "rejected", "deferred", "promoted"]);

/**
 * Accept classic dry-run Playwright evidence OR equivalent verified worker Browser QA shape.
 * Does not weaken staging / owner-approved / explicit-click gates.
 */
export function hasBrowserQaEvidenceDraft(draft: MonitoringIssueDraftRow): boolean {
  const evidence = draft.browser_qa_evidence ?? {};
  const draftEvidence = draft.evidence ?? {};
  const scanMode = evidence.scan_mode;
  const hasRoute =
    (typeof evidence.route === "string" && evidence.route.trim().length > 0) ||
    (typeof evidence.absolute_url === "string" && evidence.absolute_url.trim().length > 0) ||
    (typeof draft.route === "string" && draft.route.trim().length > 0);

  if (!hasRoute) return false;

  if (scanMode === "playwright") return true;

  // Worker Browser QA / website audit drafts store type + evidence without scan_mode.
  const workerSource =
    draft.source === "owner_manual_browser_qa" ||
    draft.source === "owner_manual_website_audit" ||
    draftEvidence.ownerManual === true ||
    evidence.source === "owner_manual_browser_qa" ||
    evidence.source === "owner_manual_website_audit";
  const hasFindingType =
    typeof evidence.type === "string" && evidence.type.trim().length > 0;
  const hasEvidencePayload =
    evidence.evidence != null ||
    typeof evidence.summary === "string" ||
    typeof draftEvidence.evidence === "string";

  return workerSource && (hasFindingType || hasEvidencePayload);
}

function draftRequestsAutoFixOrDeploy(draft: MonitoringIssueDraftRow): boolean {
  const evidence = draft.evidence ?? {};
  if (evidence.auto_fix === true || evidence.autoFix === true) return true;
  if (evidence.auto_deploy === true || evidence.autoDeploy === true) return true;
  if (evidence.requested_action === "apply_fix" || evidence.requested_action === "deploy") {
    return true;
  }
  return false;
}

export function assertStagingSupabaseForPromotion(env: NodeJS.ProcessEnv = process.env): string | null {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const ref = extractSupabaseProjectRefFromUrl(url);
  if (!ref) return "Missing staging Supabase URL.";
  if (ref !== AGENTOPS_MONITORING_STAGING_PROJECT_REF) {
    return `Promotion blocked: Supabase ref ${ref} is not staging.`;
  }
  return null;
}

export function validatePromotionPreconditions(
  draft: MonitoringIssueDraftRow,
  ownerContext: MonitoringIssuePromotionOwnerContext,
): string | null {
  const stagingError = ownerContext.supabaseProjectRef
    ? ownerContext.supabaseProjectRef !== AGENTOPS_MONITORING_STAGING_PROJECT_REF
      ? `Promotion blocked: Supabase ref ${ownerContext.supabaseProjectRef} is not staging.`
      : null
    : assertStagingSupabaseForPromotion();

  if (stagingError) return stagingError;

  if (!ownerContext.ownerId?.trim()) {
    return "Owner identity is required for promotion.";
  }

  if (!ownerContext.explicitOwnerClick) {
    return "Promotion requires explicit owner click.";
  }

  if (ownerContext.pipelineContext === "automatic") {
    return "Automatic pipeline promotion is forbidden.";
  }

  if (FORBIDDEN_DRAFT_STATUSES.has(draft.status)) {
    if (draft.status === "promoted" || draft.promoted_issue_id) {
      return "Draft is already promoted.";
    }
    return `Draft status ${draft.status} cannot be promoted.`;
  }

  if (draft.status !== "owner_approved") {
    return `Draft must be owner_approved before promotion (current: ${draft.status}).`;
  }

  if (draft.promoted_issue_id) {
    return "Draft already has promoted_issue_id.";
  }

  if (!hasBrowserQaEvidenceDraft(draft)) {
    return "Draft lacks Browser QA evidence.";
  }

  if (!draft.title?.trim() || !draft.summary?.trim()) {
    return "Draft must have title and summary.";
  }

  if (!draft.route?.trim() && !draft.module?.trim()) {
    return "Draft must have route or module.";
  }

  if (draftRequestsAutoFixOrDeploy(draft)) {
    return "Draft requests auto-fix or deploy — promotion blocked.";
  }

  return null;
}

export function isPromotionAllowed(
  draft: MonitoringIssueDraftRow,
  ownerContext: MonitoringIssuePromotionOwnerContext,
): boolean {
  return validatePromotionPreconditions(draft, ownerContext) === null;
}
