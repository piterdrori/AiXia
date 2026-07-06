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

function hasBrowserQaEvidenceDraft(draft: MonitoringIssueDraftRow): boolean {
  const evidence = draft.browser_qa_evidence ?? {};
  const scanMode = evidence.scan_mode;
  const hasRoute =
    (typeof evidence.route === "string" && evidence.route.length > 0) ||
    (typeof evidence.absolute_url === "string" && evidence.absolute_url.length > 0);
  return scanMode === "playwright" && hasRoute;
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
