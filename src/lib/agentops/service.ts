import { supabase } from "@/lib/supabase";
import {
  AGENTOPS_CLOSED_FINDING_STATUSES,
  type AgentOpsActionResult,
  type AgentOpsBacklogResolutionInput,
  type AgentOpsBacklogResolutionResult,
  type AgentOpsBacklogResolutionStatus,
  type AgentOpsDashboardSummary,
  type AgentOpsEvidenceFile,
  type AgentOpsFeedbackActionInput,
  type AgentOpsFixPlanDecision,
  type AgentOpsFixPlanDecisionInput,
  type AgentOpsFixPlanDecisionRecord,
  type AgentOpsLessonCandidateApprovalStatus,
  type AgentOpsLessonCandidateDecision,
  type AgentOpsLessonCandidateDecisionInput,
  type AgentOpsLessonCandidateDecisionRecord,
  type AgentOpsLessonCandidateDraft,
  type AgentOpsPrepareLessonCandidateDraftInput,
  type AgentOpsPrepareLessonCandidateDraftResult,
  type AgentOpsFixPlanStatus,
  type AgentOpsCursorFixReportInput,
  type AgentOpsCursorFixReportRecord,
  type AgentOpsCursorHandoffInput,
  type AgentOpsCursorHandoffRecord,
  type AgentOpsCursorHandoffStatus,
  type AgentOpsManualExecutionState,
  type AgentOpsIssueExecutionMetadataInput,
  type AgentOpsPrepareExecutionRequestInput,
  type AgentOpsIssueAgentMessageInput,
  type AgentOpsIssueAgentMessageRecord,
  type AgentOpsApproveVerificationRequestInput,
  type AgentOpsVerificationCommandCopiedInput,
  type AgentOpsManualVerificationResultInput,
  type AgentOpsVerificationRequestItem,
  type AgentOpsVerificationRequestStatus,
  type AgentOpsVerificationRequestActionResult,
  type AgentOpsVerificationCommandRecommendation,
  type AgentOpsFinding,
  type AgentOpsFindingDetail,
  type AgentOpsFindingStatus,
  type AgentOpsHermesLabel,
  type AgentOpsHermesMode,
  type AgentOpsHermesStatus,
  type AgentOpsPromptLibraryEntry,
  type AgentOpsGeneratedFixPlanSummary,
  type AgentOpsGeneratedFixPlan,
  type AgentOpsOwnerFeedback,
  type AgentOpsPendingVerificationItem,
  type AgentOpsFindingSeverity,
  type AgentOpsQueueState,
  type AgentOpsReadResult,
  type AgentOpsRefillResult,
  type AgentOpsRun,
  type AgentOpsBrowserImportPlan,
  type AgentOpsBrowserImportPreview,
  type AgentOpsBrowserImportResult,
  type AgentOpsWriteDraftImportPlan,
  type AgentOpsWriteDraftImportPreview,
  type AgentOpsWriteDraftImportResult,
  type AgentOpsWorkflowImportPlan,
  type AgentOpsWorkflowImportPreview,
  type AgentOpsWorkflowImportResult,
  type AgentOpsStaticImportCandidate,
  type AgentOpsStaticImportPlan,
  type AgentOpsStaticImportPreview,
  type AgentOpsStaticImportResult,
  type AgentOpsVerification,
  type AgentOpsVerificationActionResult,
  type AgentOpsVerificationResultInput,
  type AgentOpsVerificationResultStatus,
  type AgentOpsQueueHealth,
  type AgentOpsQueueHealthDecision,
  type AgentOpsQueueHealthDecisionInput,
  type AgentOpsQueueHealthDecisionRecord,
  type AgentOpsQueueHealthRecommendedAction,
  type AgentOpsManualScanWorkflow,
  type AgentOpsManualScanWorkflowStep,
  type AgentOpsManualScanWorkflowStepStatus,
  type AgentOpsManualScanImportShortcut,
  type AgentOpsManualScanStepAction,
  type AgentOpsManualScanStepInput,
  type AgentOpsManualScanStepRecord,
  type AgentOpsImportReviewDecision,
  type AgentOpsImportReviewDecisionInput,
  type AgentOpsImportReviewDecisionRecord,
  type AgentOpsImportSourceId,
  type AgentOpsImportCandidateReviewStatus,
  type AgentOpsImportCandidateItem,
  type AgentOpsImportCandidateSource,
  type AgentOpsImportReviewSummary,
  type AgentOpsImportCandidateDecision,
  type AgentOpsImportCandidateDecisionInput,
  type AgentOpsImportCandidateDecisionRecord,
  type AgentOpsImportDecisionHistoryItem,
  type AgentOpsManagedAgent,
  type AgentOpsManagedAgentMemoryItem,
  type AgentOpsAgentChatMessage,
  type AgentOpsCouncilChatMessage,
  type AgentOpsAgentMemoryInput,
  type AgentOpsAgentInteractionInput,
  type AgentOpsAgentInteractionRecord,
  type AgentOpsAgentInteractionItem,
  type AgentOpsAgentStatusSummary,
  type AgentOpsAgentMemoryFileReviewItem,
  type AgentOpsAgentMemoryFileReviewSummary,
  type AgentOpsAgentMemoryFileSafetyStatus,
  type AgentOpsAgentMemoryFileStatus,
  type AgentOpsMemoryRefreshPlan,
  type AgentOpsMemoryRefreshDecision,
  type AgentOpsAgentStatusDashboardItem,
  type AgentOpsAgentStatusDashboardSummary,
  type AgentOpsAgentTimelineItem,
  type AgentOpsAgentTimelineSummary,
  type AgentOpsAgentTimelineStatus,
  type AgentOpsAgentTimelineEventType,
  type AgentOpsAgentTimelineSource,
  type AgentOpsFocusDirective,
  type AgentOpsFocusDirectiveSource,
  type AgentOpsFocusDirectiveType,
  type AgentOpsFocusDirectiveTarget,
  type AgentOpsFocusRankingPreview,
  type AgentOpsFocusRankingDecision,
  type AgentOpsFocusRankingPreviewItem,
  type AgentOpsAgentInteractionStatus,
  type AgentOpsAgentInteractionPriority,
  type AgentOpsAgentInteractionSource,
  type AgentOpsAgentInteractionMessageType,
  type AgentOpsAgentMemoryPriority,
  type AgentOpsAgentMemorySource,
  type AgentOpsAgentMemoryInputType,
  type AgentOpsManagedAgentStatus,
  type AgentOpsSchedulerStatus,
  type AgentOpsSchedulerPreparationStatus,
  type AgentOpsSchedulerPreparationDecision,
  type AgentOpsSchedulerPreparationDecisionInput,
  type AgentOpsSchedulerPreparationDecisionRecord,
  type AgentOpsAutomationControlRequestType,
  type AgentOpsAutomationControlRequestStatus,
  type AgentOpsAutomationControlRequestInput,
  type AgentOpsAutomationControlRequestItem,
  type AgentOpsAutomationControlRequestRecord,
  type AgentOpsActiveQueueHealthStatus,
  type AgentOpsBacklogHealthStatus,
  type AgentOpsWriteResult,
  mapVerificationStatusToFindingStatus,
  mapVerificationStatusToQueueState,
} from "./types";

import lowBacklogTriggerRules from "../../../qa-agent/orchestrator/low-backlog-trigger-rules.json";
import schedulerPrepRules from "../../../qa-agent/scheduler/scheduler-prep-rules.json";
import syntheticBrowserUsers from "../../../qa-agent/browser-qa/synthetic-browser-users.json";
import focusRankingRules from "../../../qa-agent/focus-directives/focus-ranking-rules.json";

const CLOSED_STATUS_FILTER = `(${AGENTOPS_CLOSED_FINDING_STATUSES.map((s) => `"${s}"`).join(",")})`;

const BACKLOG_PROMOTABLE_STATUSES = ["Backlog", "New"] as const;

const BACKLOG_RESOLVABLE_STATUSES: readonly AgentOpsFindingStatus[] = [
  "Backlog",
  "New",
  "Owner Reviewed",
  "Approved for Fix",
] as const;

const BACKLOG_RESOLUTION_STATUSES: readonly AgentOpsBacklogResolutionStatus[] = [
  "Verified Fixed",
  "False Positive",
  "Deferred",
] as const;

const SEVERITY_RANK: Record<AgentOpsFindingSeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Suggestion: 4,
};

const MANUAL_REFILL_PROMOTION_REASON = "Manual owner refill from AgentOps UI";

const STATIC_IMPORT_PLAN_URL = "/agentops/static-import-plan.json";
const BROWSER_IMPORT_PLAN_URL = "/agentops/browser-findings-import-plan.json";
const WRITE_DRAFT_IMPORT_PLAN_URL = "/agentops/write-draft-findings-import-plan.json";
const WORKFLOW_IMPORT_PLAN_URL = "/agentops/role-workflow-import-plan.json";
const FIX_PLAN_SUMMARY_URL = "/agentops/fix-plan-summary.json";
const LATEST_ORCHESTRATOR_REPORT_PATH =
  "qa-agent/reports/orchestrator/agentops-orchestrator-run.json";

const QUEUE_HEALTH_RULES = lowBacklogTriggerRules as {
  activeTarget: number;
  lowBacklogThreshold: number;
  emptyBacklogThreshold: number;
  allowedManualCommands: string[];
};

const STATIC_IMPORT_AGENT_ID = "static-guardrail-import";
const BROWSER_IMPORT_AGENT_ID = "browser-qa-import";
const WRITE_DRAFT_IMPORT_AGENT_ID = "write-draft-qa-import";
const WORKFLOW_IMPORT_AGENT_ID = "role-workflow-qa-import";

const FIX_PLAN_DECISIONS: readonly AgentOpsFixPlanDecision[] = [
  "approve_fix_plan",
  "reject_fix_plan",
  "request_better_plan",
  "mark_prompt_used_manually",
  "copy_prompt_only",
] as const;

const LESSON_CANDIDATE_DECISIONS: readonly AgentOpsLessonCandidateDecision[] = [
  "approve_for_future_memory",
  "reject_lesson",
  "needs_cleanup",
  "review_later",
] as const;

/** Issue code → verification-targets.json targetId (Stage 13E). */
const ISSUE_TO_VERIFICATION_TARGET: Record<string, string> = {
  "AIXIA-WORKFLOW-RWF-28": "guest-finance-access",
  "AIXIA-WORKFLOW-RWF-29": "guest-finance-access",
  "AIXIA-WRITE-WDS-1": "quotation-create-shell-access",
  "AIXIA-WRITE-WDS-2": "quotation-create-shell-access",
};

const VERIFICATION_REQUEST_STATUSES: readonly AgentOpsVerificationRequestStatus[] = [
  "verification_requested",
  "owner_review_required",
  "ready_to_run",
  "command_copied",
  "verification_running_manual",
  "verification_result_recorded",
  "verification_passed",
  "verification_failed",
  "verification_blocked",
] as const;

const VERIFICATION_RESULT_STATUSES: readonly AgentOpsVerificationResultStatus[] = [
  "verified_fixed",
  "still_broken",
  "needs_follow_up_fix",
  "verification_blocked",
] as const;

function isVerificationResultStatus(
  value: string,
): value is AgentOpsVerificationResultStatus {
  return (VERIFICATION_RESULT_STATUSES as readonly string[]).includes(value);
}

function isLessonCandidateDecision(
  value: string,
): value is AgentOpsLessonCandidateDecision {
  return (LESSON_CANDIDATE_DECISIONS as readonly string[]).includes(value);
}

const CURSOR_HANDOFF_STATUSES: readonly AgentOpsCursorHandoffStatus[] = [
  "draft_handoff",
  "ready_for_cursor",
  "copied_manually",
  "cursor_working",
  "cursor_report_received",
  "verification_requested",
  "verified_fixed",
  "still_broken",
  "cancelled",
] as const;

function sortBacklogPromotionCandidates(
  a: AgentOpsFinding,
  b: AgentOpsFinding,
): number {
  const severityDiff =
    (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99);
  if (severityDiff !== 0) return severityDiff;
  if (b.priority_score !== a.priority_score) {
    return b.priority_score - a.priority_score;
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function getAvailableTop10Ranks(
  activeFindings: Pick<AgentOpsFinding, "top10_rank">[],
): number[] {
  const occupied = new Set<number>();
  for (const finding of activeFindings) {
    if (
      finding.top10_rank != null &&
      finding.top10_rank >= 1 &&
      finding.top10_rank <= 10
    ) {
      occupied.add(finding.top10_rank);
    }
  }
  const available: number[] = [];
  for (let rank = 1; rank <= 10; rank += 1) {
    if (!occupied.has(rank)) available.push(rank);
  }
  return available;
}

const DEFAULT_HERMES_STATUS: AgentOpsHermesStatus = {
  score: 8,
  label: "Learning",
  mode: "Database-only",
  appCallable: false,
  codegraphCallable: false,
  notes: "Hermes is Cursor-only / project-tooling only for MVP.",
};

function toErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    const code = (error as { code?: unknown }).code;
    const details = (error as { details?: unknown }).details;
    if (typeof code === "string" || typeof details === "string") {
      return [code, details].filter((part) => typeof part === "string" && part.trim()).join(": ");
    }
  }
  return "An unexpected error occurred.";
}

function ok<T>(data: T): AgentOpsReadResult<T> {
  return { data, error: null };
}

function fail<T>(error: unknown): AgentOpsReadResult<T> {
  return { data: null, error: toErrorMessage(error) };
}

function activeTop10Query() {
  return supabase
    .from("agentops_findings")
    .select("*")
    .eq("queue_state", "active_top_10")
    .not("status", "in", CLOSED_STATUS_FILTER);
}

function activeTop10CountQuery() {
  return supabase
    .from("agentops_findings")
    .select("id", { count: "exact", head: true })
    .eq("queue_state", "active_top_10")
    .not("status", "in", CLOSED_STATUS_FILTER);
}

function isHermesLabel(value: unknown): value is AgentOpsHermesLabel {
  return (
    value === "Learning" ||
    value === "Small Help" ||
    value === "Helping" ||
    value === "Main Memory Source / Strong Support" ||
    value === "Full AgentOps Memory Support"
  );
}

function isHermesMode(value: unknown): value is AgentOpsHermesMode {
  return (
    value === "Database-only" ||
    value === "Hermes-assisted" ||
    value === "Hermes-primary with database system of record"
  );
}

export function getDefaultAgentOpsHermesStatus(): AgentOpsHermesStatus {
  return { ...DEFAULT_HERMES_STATUS };
}

/** Parse Hermes snapshot from run metadata when present and well-formed. */
export function parseHermesStatusFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): AgentOpsHermesStatus | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.hermes;
  if (!raw || typeof raw !== "object") return null;

  const hermes = raw as Record<string, unknown>;
  const score = typeof hermes.score === "number" ? hermes.score : null;
  const label = hermes.label;
  const mode = hermes.mode;
  const appCallable = hermes.appCallable;
  const codegraphCallable = hermes.codegraphCallable;

  if (score === null || !isHermesLabel(label) || !isHermesMode(mode)) {
    return null;
  }
  if (typeof appCallable !== "boolean" || typeof codegraphCallable !== "boolean") {
    return null;
  }

  return {
    score,
    label,
    mode,
    appCallable,
    codegraphCallable,
    lastCheckAt:
      typeof hermes.lastCheckAt === "string" ? hermes.lastCheckAt : null,
    notes: typeof hermes.notes === "string" ? hermes.notes : null,
  };
}

export function resolveAgentOpsHermesStatus(
  latestRun: AgentOpsRun | null,
): AgentOpsHermesStatus {
  const fromRun = parseHermesStatusFromMetadata(latestRun?.metadata ?? null);
  return fromRun ?? getDefaultAgentOpsHermesStatus();
}

/** Whether the current authenticated user is on the AgentOps Owner allowlist. */
export async function getAgentOpsOwnerStatus(): Promise<
  AgentOpsReadResult<{ isOwner: boolean }>
> {
  try {
    const { data, error } = await supabase.rpc("agentops_is_owner");
    if (error) {
      return {
        data: { isOwner: false },
        error: toErrorMessage(error),
      };
    }
    return ok({ isOwner: Boolean(data) });
  } catch (error) {
    return {
      data: { isOwner: false },
      error: toErrorMessage(error),
    };
  }
}

/** Open Active Top 10 findings (excludes closed statuses). */
export async function getAgentOpsActiveTop10(): Promise<
  AgentOpsReadResult<AgentOpsFinding[]>
> {
  try {
    const { data, error } = await activeTop10Query()
      .order("top10_rank", { ascending: true, nullsFirst: false })
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return fail(error);
    return ok((data ?? []) as AgentOpsFinding[]);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Owner catalog read — broader findings list for Findings page tabs
 * (active, fixed, deferred, rejected, verification). Does not change queue rules.
 */
export async function listAgentOpsFindingsCatalog(
  limit = 200,
): Promise<AgentOpsReadResult<AgentOpsFinding[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const safeLimit = Math.min(Math.max(limit, 1), 300);
    const { data, error } = await supabase
      .from("agentops_findings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(safeLimit);

    if (error) return fail(error);
    return ok((data ?? []) as AgentOpsFinding[]);
  } catch (error) {
    return fail(error);
  }
}

/** Owner read — resolve a finding by issue_code (latest updated). */
export async function getAgentOpsFindingByIssueCode(
  issueCode: string,
): Promise<AgentOpsReadResult<AgentOpsFinding | null>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const code = issueCode.trim();
    if (!code) return fail("issueCode is required.");

    const { data, error } = await supabase
      .from("agentops_findings")
      .select("*")
      .eq("issue_code", code)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return fail(error);
    return ok((data as AgentOpsFinding | null) ?? null);
  } catch (error) {
    return fail(error);
  }
}

/** Owner read — resolve a finding by id. */
export async function getAgentOpsFindingById(
  findingId: string,
): Promise<AgentOpsReadResult<AgentOpsFinding | null>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const id = findingId.trim();
    if (!id) return fail("findingId is required.");

    const { data, error } = await supabase
      .from("agentops_findings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return fail(error);
    return ok((data as AgentOpsFinding | null) ?? null);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Persist an owner-edited suggested fix prompt without overwriting cursor_prompt.
 * Stores in metadata.owner_edited_prompt + prompt_library + owner_feedback audit.
 */
export async function saveAgentOpsSuggestedFixPrompt(input: {
  findingId: string;
  promptText: string;
  originalPrompt?: string | null;
  restoreOriginal?: boolean;
}): Promise<
  AgentOpsWriteResult<{ feedbackId: string; promptLibraryId: string | null; message: string }>
> {
  try {
    const findingId = input.findingId?.trim();
    if (!findingId) return writeFail("findingId is required.");

    const promptText = input.promptText?.trim() ?? "";
    if (!promptText) return writeFail("Prompt text is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current user.");
    }

    const findingResult = await fetchAgentOpsFindingById(findingId);
    if (findingResult.error || !findingResult.data) {
      return writeFail(findingResult.error ?? "Finding not found.");
    }

    const finding = findingResult.data;
    const existingMetadata =
      finding.metadata && typeof finding.metadata === "object" ? { ...finding.metadata } : {};

    const originalPrompt =
      input.originalPrompt?.trim() ||
      (typeof existingMetadata.original_cursor_prompt === "string"
        ? existingMetadata.original_cursor_prompt
        : null) ||
      finding.cursor_prompt ||
      null;

    if (!existingMetadata.original_cursor_prompt && originalPrompt) {
      existingMetadata.original_cursor_prompt = originalPrompt;
    }

    if (input.restoreOriginal) {
      delete existingMetadata.owner_edited_prompt;
      delete existingMetadata.owner_edited_prompt_at;
    } else {
      existingMetadata.owner_edited_prompt = promptText;
      existingMetadata.owner_edited_prompt_at = new Date().toISOString();
    }

    const { error: metaError } = await supabase
      .from("agentops_findings")
      .update({ metadata: existingMetadata })
      .eq("id", findingId);
    if (metaError) return writeFail(metaError);

    let promptLibraryId: string | null = null;
    const { data: promptRow, error: promptError } = await supabase
      .from("agentops_prompt_library")
      .insert({
        finding_id: findingId,
        prompt_type: "fix",
        prompt_text: promptText,
        approved_by_owner: true,
        copied_by_owner: false,
        metadata: {
          action: input.restoreOriginal ? "restore_original_prompt" : "save_suggested_fix_prompt",
          original_prompt: originalPrompt,
        },
      })
      .select("id")
      .single();

    if (!promptError && promptRow?.id) {
      promptLibraryId = promptRow.id as string;
    }

    const feedback = await addAgentOpsOwnerFeedback({
      findingId,
      feedbackType: "remark",
      remark: input.restoreOriginal
        ? "Owner restored the original suggested fix prompt."
        : "Owner saved an edited suggested fix prompt.",
      metadata: {
        action: input.restoreOriginal ? "restore_original_prompt" : "save_suggested_fix_prompt",
        promptLibraryId,
        originalPrompt,
        promptLength: promptText.length,
      },
    });
    if (feedback.error || !feedback.data) {
      return writeFail(feedback.error ?? "Could not record prompt save feedback.");
    }

    return writeOk({
      feedbackId: feedback.data.feedbackId,
      promptLibraryId,
      message: input.restoreOriginal
        ? "Original prompt restored."
        : "Suggested fix prompt saved.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Owner reopen — restores In Progress via existing mark-in-progress path. */
export async function reopenAgentOpsFinding(
  findingId: string,
  remark?: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "re_review_request",
    remark: remark ?? "Owner reopened finding for review.",
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not record reopen feedback.");
  }

  const updated = await updateAgentOpsFindingStatus(findingId, "In Progress", {
    queueState: "active_top_10",
  });
  if (updated.error) return writeFail(updated.error);

  return writeOk({
    finding: updated.data,
    feedbackId: feedback.data.feedbackId,
    message: "Finding reopened and marked in progress.",
  });
}

/** Backlog total count plus top preview rows. */
export async function getAgentOpsBacklogSummary(): Promise<
  AgentOpsReadResult<{ count: number; preview: AgentOpsFinding[] }>
> {
  try {
    const [countResult, previewResult] = await Promise.all([
      supabase
        .from("agentops_findings")
        .select("id", { count: "exact", head: true })
        .eq("queue_state", "backlog"),
      supabase
        .from("agentops_findings")
        .select("*")
        .eq("queue_state", "backlog")
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (countResult.error) return fail(countResult.error);
    if (previewResult.error) return fail(previewResult.error);

    return ok({
      count: countResult.count ?? 0,
      preview: (previewResult.data ?? []) as AgentOpsFinding[],
    });
  } catch (error) {
    return fail(error);
  }
}

/** Most recent AgentOps run by started_at. */
export async function getAgentOpsLatestRun(): Promise<
  AgentOpsReadResult<AgentOpsRun | null>
> {
  try {
    const { data, error } = await supabase
      .from("agentops_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return fail(error);
    return ok((data as AgentOpsRun | null) ?? null);
  } catch (error) {
    return fail(error);
  }
}

/** Recent AgentOps runs. */
export async function getAgentOpsRunHistory(
  limit = 20,
): Promise<AgentOpsReadResult<AgentOpsRun[]>> {
  try {
    const { data, error } = await supabase
      .from("agentops_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) return fail(error);
    return ok((data ?? []) as AgentOpsRun[]);
  } catch (error) {
    return fail(error);
  }
}

/** Finding detail with related read-only child rows. */
export async function getAgentOpsFindingDetail(
  findingId: string,
): Promise<AgentOpsReadResult<AgentOpsFindingDetail>> {
  try {
    const [
      findingResult,
      opinionsResult,
      feedbackResult,
      verificationsResult,
      promptsResult,
      evidenceResult,
    ] = await Promise.all([
      supabase
        .from("agentops_findings")
        .select("*")
        .eq("id", findingId)
        .maybeSingle(),
      supabase
        .from("agentops_agent_opinions")
        .select("*")
        .eq("finding_id", findingId)
        .order("created_at", { ascending: false }),
      supabase
        .from("agentops_owner_feedback")
        .select("*")
        .eq("finding_id", findingId)
        .order("created_at", { ascending: false }),
      supabase
        .from("agentops_verifications")
        .select("*")
        .eq("finding_id", findingId)
        .order("created_at", { ascending: false }),
      supabase
        .from("agentops_prompt_library")
        .select("*")
        .eq("finding_id", findingId)
        .order("created_at", { ascending: false }),
      supabase
        .from("agentops_evidence_files")
        .select("*")
        .eq("finding_id", findingId)
        .order("created_at", { ascending: false }),
    ]);

    const firstError =
      findingResult.error ??
      opinionsResult.error ??
      feedbackResult.error ??
      verificationsResult.error ??
      promptsResult.error ??
      evidenceResult.error;

    if (firstError) return fail(firstError);

    return ok({
      finding: (findingResult.data as AgentOpsFinding | null) ?? null,
      opinions: (opinionsResult.data ?? []) as AgentOpsFindingDetail["opinions"],
      ownerFeedback: (feedbackResult.data ??
        []) as AgentOpsFindingDetail["ownerFeedback"],
      verifications: (verificationsResult.data ??
        []) as AgentOpsFindingDetail["verifications"],
      prompts: (promptsResult.data ?? []) as AgentOpsPromptLibraryEntry[],
      evidenceFiles: (evidenceResult.data ?? []) as AgentOpsEvidenceFile[],
    });
  } catch (error) {
    return fail(error);
  }
}

/** Command dashboard aggregates for future AgentOps UI. */
export async function getAgentOpsDashboardSummary(): Promise<
  AgentOpsReadResult<AgentOpsDashboardSummary>
> {
  try {
    const [
      activeOpenResult,
      backlogCountResult,
      criticalOpenResult,
      verificationPendingResult,
      latestRunResult,
    ] = await Promise.all([
      activeTop10CountQuery(),
      supabase
        .from("agentops_findings")
        .select("id", { count: "exact", head: true })
        .eq("queue_state", "backlog"),
      activeTop10CountQuery().eq("severity", "Critical"),
      supabase
        .from("agentops_verifications")
        .select("id", { count: "exact", head: true })
        .in("verification_status", ["pending", "running"]),
      getAgentOpsLatestRun(),
    ]);

    const firstError =
      activeOpenResult.error ??
      backlogCountResult.error ??
      criticalOpenResult.error ??
      verificationPendingResult.error ??
      latestRunResult.error;

    if (firstError) return fail(firstError);

    const activeOpenCount = activeOpenResult.count ?? 0;
    const latestRun = latestRunResult.data ?? null;

    return ok({
      activeOpenCount,
      openSlots: Math.max(0, 10 - activeOpenCount),
      backlogCount: backlogCountResult.count ?? 0,
      criticalOpenCount: criticalOpenResult.count ?? 0,
      verificationPendingCount: verificationPendingResult.count ?? 0,
      latestRun,
      hermesStatus: resolveAgentOpsHermesStatus(latestRun),
    });
  } catch (error) {
    return fail(error);
  }
}

function resolveBacklogHealthStatus(backlogCount: number): AgentOpsBacklogHealthStatus {
  if (backlogCount <= QUEUE_HEALTH_RULES.emptyBacklogThreshold) return "empty";
  if (backlogCount < QUEUE_HEALTH_RULES.lowBacklogThreshold) return "low";
  return "healthy";
}

function resolveActiveQueueHealthStatus(
  activeOpenCount: number,
): AgentOpsActiveQueueHealthStatus {
  return activeOpenCount >= QUEUE_HEALTH_RULES.activeTarget ? "full" : "needs_refill";
}

function resolveQueueHealthRecommendedAction(
  activeStatus: AgentOpsActiveQueueHealthStatus,
  backlogStatus: AgentOpsBacklogHealthStatus,
): AgentOpsQueueHealthRecommendedAction {
  if (backlogStatus === "empty") return "run_scan_import_plan";
  if (activeStatus === "needs_refill") {
    return backlogStatus === "low"
      ? "refill_and_generate_more_candidates"
      : "refill_from_backlog";
  }
  return backlogStatus === "low" ? "generate_more_candidates" : "no_action";
}

function buildQueueHealthExplanation(
  activeOpenCount: number,
  openSlots: number,
  backlogCount: number,
  activeStatus: AgentOpsActiveQueueHealthStatus,
  backlogStatus: AgentOpsBacklogHealthStatus,
  recommendedAction: AgentOpsQueueHealthRecommendedAction,
): string {
  const target = QUEUE_HEALTH_RULES.activeTarget;
  if (recommendedAction === "no_action") {
    return `Active Top 10 is full (${activeOpenCount}/${target}) and backlog is healthy (${backlogCount} items). No refill or scan action needed right now.`;
  }
  if (recommendedAction === "refill_from_backlog") {
    return `Active Top 10 has ${openSlots} open slot${openSlots === 1 ? "" : "s"} (${activeOpenCount}/${target}) and backlog has ${backlogCount} promotable finding${backlogCount === 1 ? "" : "s"}. Use Refill Queue to promote from backlog — no automatic promotion.`;
  }
  if (recommendedAction === "refill_and_generate_more_candidates") {
    return `Active Top 10 needs refill (${activeOpenCount}/${target}, ${openSlots} open slot${openSlots === 1 ? "" : "s"}) but backlog is low (${backlogCount} < ${QUEUE_HEALTH_RULES.lowBacklogThreshold}). Refill what is available, then run a manual scan/import plan to add more backlog candidates.`;
  }
  if (recommendedAction === "generate_more_candidates") {
    return `Active Top 10 is full (${activeOpenCount}/${target}) but backlog is low (${backlogCount} items). Prepare more candidates via manual orchestrator or import-plan commands before the next slot opens.`;
  }
  return `Backlog is ${backlogStatus} (${backlogCount} items) while Active Top 10 is ${activeStatus === "needs_refill" ? `below target (${activeOpenCount}/${target})` : `full (${activeOpenCount}/${target})`}. Run a manual scan/import plan to generate new backlog findings — nothing is auto-imported.`;
}

function resolveQueueHealthRecommendedCommands(
  recommendedAction: AgentOpsQueueHealthRecommendedAction,
): string[] {
  const commands = QUEUE_HEALTH_RULES.allowedManualCommands;
  if (recommendedAction === "no_action" || recommendedAction === "refill_from_backlog") {
    return [];
  }
  if (recommendedAction === "generate_more_candidates") {
    return commands;
  }
  return commands;
}

async function countImportPlanCandidatesAvailable(): Promise<number> {
  const [staticPlan, browserPlan, workflowPlan, writeDraftPlan] = await Promise.all([
    fetchAgentOpsStaticImportPlan(),
    fetchAgentOpsBrowserImportPlan(),
    fetchAgentOpsWorkflowImportPlan(),
    fetchAgentOpsWriteDraftImportPlan(),
  ]);

  return [staticPlan, browserPlan, workflowPlan, writeDraftPlan].reduce(
    (total, plan) => total + (plan?.candidates?.length ?? 0),
    0,
  );
}

function summarizeLatestRun(run: AgentOpsRun | null): string | null {
  if (!run) return null;
  const meta =
    run.metadata && typeof run.metadata === "object"
      ? (run.metadata as Record<string, unknown>)
      : {};
  const summary =
    typeof meta.summary === "string"
      ? meta.summary
      : typeof meta.message === "string"
        ? meta.message
        : null;
  if (summary) return summary;
  return `${run.run_type} · ${run.status} · ${formatRunTimestamp(run.started_at)}`;
}

function formatRunTimestamp(value: string | null | undefined): string {
  if (!value) return "unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

const QUEUE_HEALTH_DECISIONS: readonly AgentOpsQueueHealthDecision[] = [
  "refill_now",
  "generate_candidates",
  "hold",
  "run_manual_scan",
  "owner_note",
] as const;

function isQueueHealthDecision(value: string): value is AgentOpsQueueHealthDecision {
  return (QUEUE_HEALTH_DECISIONS as readonly string[]).includes(value);
}

/** Queue health + scan/refill recommendation (Stage 14). Owner read. */
export async function getAgentOpsQueueHealth(): Promise<AgentOpsReadResult<AgentOpsQueueHealth>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const [activeOpenResult, backlogCountResult, latestRunResult, importCandidateCount] =
      await Promise.all([
        activeTop10CountQuery(),
        supabase
          .from("agentops_findings")
          .select("id", { count: "exact", head: true })
          .eq("queue_state", "backlog"),
        getAgentOpsLatestRun(),
        countImportPlanCandidatesAvailable(),
      ]);

    const firstError =
      activeOpenResult.error ?? backlogCountResult.error ?? latestRunResult.error;
    if (firstError) return fail(firstError);

    const activeOpenCount = activeOpenResult.count ?? 0;
    const activeTarget = QUEUE_HEALTH_RULES.activeTarget;
    const openSlots = Math.max(0, activeTarget - activeOpenCount);
    const backlogCount = backlogCountResult.count ?? 0;
    const backlogStatus = resolveBacklogHealthStatus(backlogCount);
    const activeStatus = resolveActiveQueueHealthStatus(activeOpenCount);
    const recommendedAction = resolveQueueHealthRecommendedAction(
      activeStatus,
      backlogStatus,
    );
    const latestRun = latestRunResult.data ?? null;

    return ok({
      activeOpenCount,
      activeTarget,
      openSlots,
      backlogCount,
      lowBacklogThreshold: QUEUE_HEALTH_RULES.lowBacklogThreshold,
      backlogStatus,
      activeStatus,
      recommendedAction,
      recommendedCommands: resolveQueueHealthRecommendedCommands(recommendedAction),
      explanation: buildQueueHealthExplanation(
        activeOpenCount,
        openSlots,
        backlogCount,
        activeStatus,
        backlogStatus,
        recommendedAction,
      ),
      canRefillNow: openSlots > 0 && backlogCount > 0,
      canImportCandidatesAvailable: importCandidateCount > 0,
      lastRunSummary: summarizeLatestRun(latestRun),
      latestOrchestratorReportPath: LATEST_ORCHESTRATOR_REPORT_PATH,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Record Owner decision on queue health panel (Stage 14). Does not run commands. */
export async function recordAgentOpsQueueHealthDecision(
  input: AgentOpsQueueHealthDecisionInput,
): Promise<AgentOpsWriteResult<AgentOpsQueueHealthDecisionRecord>> {
  try {
    if (!isQueueHealthDecision(input.decision)) {
      return writeFail("Invalid queue health decision.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const note = input.note?.trim() || null;
    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "queue_health_decision",
          decision: input.decision,
          recommendedAction: input.recommendedAction,
          activeOpenCount: input.activeOpenCount,
          backlogCount: input.backlogCount,
          stage: "14",
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    return writeOk({
      feedbackId: data.id as string,
      message: "Queue health decision recorded.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Mark manual scan needed (Stage 14). Records feedback only — does not run scan. */
export async function markAgentOpsScanNeeded(input?: {
  note?: string;
  recommendedAction?: AgentOpsQueueHealthRecommendedAction;
  activeOpenCount?: number;
  backlogCount?: number;
}): Promise<AgentOpsWriteResult<AgentOpsQueueHealthDecisionRecord>> {
  try {
    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const note = input?.note?.trim() || "Owner marked scan needed from Queue Health panel.";
    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "scan_needed",
          recommendedAction: input?.recommendedAction ?? null,
          activeOpenCount: input?.activeOpenCount ?? null,
          backlogCount: input?.backlogCount ?? null,
          stage: "14",
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    return writeOk({
      feedbackId: data.id as string,
      message: "Scan needed recorded. Run CLI commands manually when ready.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

const MANUAL_SCAN_CMD = {
  foundation: "npm run qa:agentops-run -- --mode foundation",
  browserSmoke:
    "npm run qa:agentops-run -- --mode browser-smoke --continue-on-failure",
  workflowSafe:
    "npm run qa:agentops-run -- --mode workflow-safe --continue-on-failure",
  verificationDryRun: "npm run qa:agentops-run -- --mode verification-dry-run",
  guardrailActionPlan: "npm run qa:guardrail-action-plan",
  staticImportPlan: "npm run qa:agentops-static-import-plan",
  browserImportPlan: "npm run qa:agentops-browser-findings-import-plan",
  workflowReview: "npm run qa:agentops-role-workflow-review",
  writeDraftImportPlan: "npm run qa:agentops-write-draft-findings-import-plan",
  fixPlans: "npm run qa:agentops-fix-plans",
} as const;

const IMPORT_PLAN_PATHS = {
  static: "public/agentops/static-import-plan.json",
  browser: "public/agentops/browser-findings-import-plan.json",
  role_workflow: "public/agentops/role-workflow-import-plan.json",
  role_workflow_approved: "public/agentops/role-workflow-approved-import-plan.json",
  write_draft: "public/agentops/write-draft-findings-import-plan.json",
  write_draft_approved: "public/agentops/write-draft-approved-import-plan.json",
  fix_plans: "qa-agent/reports/fix-plans/agentops-fix-plan-summary.json",
} as const;

const ROLE_WORKFLOW_APPROVED_IMPORT_PLAN_URL =
  "/agentops/role-workflow-approved-import-plan.json";
const WRITE_DRAFT_APPROVED_IMPORT_PLAN_URL =
  "/agentops/write-draft-approved-import-plan.json";

const IMPORT_CANDIDATE_DECISIONS: readonly AgentOpsImportCandidateDecision[] = [
  "approve_candidate",
  "reject_candidate",
  "needs_regeneration",
  "review_later",
  "approve_source",
  "reject_source",
] as const;

const HELD_WRITE_DRAFT_ISSUE = "AIXIA-WRITE-WDS-3";
const RESOLVED_APPROVED_WRITE_DRAFT = ["AIXIA-WRITE-WDS-1", "AIXIA-WRITE-WDS-2"] as const;
const RESOLVED_APPROVED_ROLE_WORKFLOW = [
  "AIXIA-WORKFLOW-RWF-28",
  "AIXIA-WORKFLOW-RWF-29",
] as const;

const SCHEDULER_PREP_RULES = schedulerPrepRules as {
  environment: string;
  schedulerStatus: AgentOpsSchedulerStatus;
  active: boolean;
  allowedFutureRunModes: string[];
  neverAutoRun: string[];
  futureCadenceOptions: string[];
  recommendedInitialCadence: string;
  quietDays: string[];
  quietModeRule: string;
  ownerApprovalRequiredFor: string[];
  safetyChecklistPath: string;
  runbookPath: string;
  prepRulesPath: string;
};

const SCHEDULER_PREPARATION_DECISIONS: readonly AgentOpsSchedulerPreparationDecision[] = [
  "review_later",
  "approve_preparation",
  "reject_scheduler",
  "request_changes",
  "keep_manual_only",
] as const;

const AUTOMATION_CONTROL_REQUEST_TYPES: readonly AgentOpsAutomationControlRequestType[] = [
  "request_qa_check",
  "request_browser_qa",
  "request_static_guardrail_scan",
  "request_guardrail_action_plan",
  "request_backlog_generation_import",
  "request_verification_pass",
  "request_quiet_mode",
  "request_pause",
  "request_resume_preparation",
  "copy_manual_command",
  "copy_cursor_prompt",
] as const;

const AUTOMATION_CONTROL_REQUEST_STATUSES: readonly AgentOpsAutomationControlRequestStatus[] = [
  "requested",
  "copied",
  "review_later",
  "cancelled",
] as const;

function isSchedulerPreparationDecision(
  value: string,
): value is AgentOpsSchedulerPreparationDecision {
  return (SCHEDULER_PREPARATION_DECISIONS as readonly string[]).includes(value);
}

function isAutomationControlRequestType(
  value: string,
): value is AgentOpsAutomationControlRequestType {
  return (AUTOMATION_CONTROL_REQUEST_TYPES as readonly string[]).includes(value);
}

function isAutomationControlRequestStatus(
  value: string,
): value is AgentOpsAutomationControlRequestStatus {
  return (AUTOMATION_CONTROL_REQUEST_STATUSES as readonly string[]).includes(value);
}

const MANUAL_SCAN_STEP_ACTIONS: readonly AgentOpsManualScanStepAction[] = [
  "copied_command",
  "marked_running",
  "marked_completed",
  "blocked",
  "owner_note",
] as const;

const IMPORT_REVIEW_DECISIONS: readonly AgentOpsImportReviewDecision[] = [
  "review_later",
  "approved_for_manual_import",
  "rejected",
  "needs_regeneration",
] as const;

function isManualScanStepAction(value: string): value is AgentOpsManualScanStepAction {
  return (MANUAL_SCAN_STEP_ACTIONS as readonly string[]).includes(value);
}

function isImportReviewDecision(value: string): value is AgentOpsImportReviewDecision {
  return (IMPORT_REVIEW_DECISIONS as readonly string[]).includes(value);
}

function mapStepActionToStatus(
  action: AgentOpsManualScanStepAction,
): AgentOpsManualScanWorkflowStepStatus | null {
  switch (action) {
    case "copied_command":
      return "copied";
    case "marked_running":
      return "owner_marked_running";
    case "marked_completed":
      return "owner_marked_completed";
    case "blocked":
      return "blocked";
    case "owner_note":
      return null;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function makeWorkflowStep(
  partial: Omit<AgentOpsManualScanWorkflowStep, "status"> & {
    status?: AgentOpsManualScanWorkflowStepStatus;
  },
  statusMap: Map<string, AgentOpsManualScanWorkflowStepStatus>,
): AgentOpsManualScanWorkflowStep {
  return {
    ...partial,
    status: statusMap.get(partial.stepId) ?? partial.status ?? "not_started",
  };
}

function buildManualScanWorkflowSteps(
  queueHealth: AgentOpsQueueHealth,
  statusMap: Map<string, AgentOpsManualScanWorkflowStepStatus>,
): AgentOpsManualScanWorkflowStep[] {
  const { recommendedAction } = queueHealth;

  const orchestratorFoundation = (
    stepId: string,
    orderLabel: string,
  ): AgentOpsManualScanWorkflowStep =>
    makeWorkflowStep(
      {
        stepId,
        label: `${orderLabel}. Run orchestrator (foundation)`,
        description:
          "Manual CLI on staging. Writes orchestrator summary only — no DB import or auto-fix.",
        command: MANUAL_SCAN_CMD.foundation,
        expectedOutput: "qa-agent/reports/orchestrator/agentops-orchestrator-run.json",
        relatedImportType: "orchestrator",
      },
      statusMap,
    );

  const browserScan = (stepId: string, orderLabel: string): AgentOpsManualScanWorkflowStep =>
    makeWorkflowStep(
      {
        stepId,
        label: `${orderLabel}. Browser smoke scan (dev server required)`,
        description:
          "Requires local dev server at http://127.0.0.1:5173. UI does not start the server.",
        command: MANUAL_SCAN_CMD.browserSmoke,
        expectedOutput: "qa-agent/reports/browser-qa/synthetic-users-smoke-report.json",
        relatedImportType: "orchestrator",
      },
      statusMap,
    );

  const workflowScan = (stepId: string, orderLabel: string): AgentOpsManualScanWorkflowStep =>
    makeWorkflowStep(
      {
        stepId,
        label: `${orderLabel}. Workflow-safe scan (dev server required)`,
        description: "Safe role workflow checks. Run only when dev server is available.",
        command: MANUAL_SCAN_CMD.workflowSafe,
        expectedOutput: "qa-agent/reports/role-workflow/role-workflow-review-report.json",
        relatedImportType: "orchestrator",
      },
      statusMap,
    );

  const generateImportPlans = (stepId: string, orderLabel: string): AgentOpsManualScanWorkflowStep =>
    makeWorkflowStep(
      {
        stepId,
        label: `${orderLabel}. Generate import plans`,
        description:
          "Run guardrail plan + import-plan generators. Review JSON plans before any import.",
        command: [
          MANUAL_SCAN_CMD.guardrailActionPlan,
          MANUAL_SCAN_CMD.staticImportPlan,
          MANUAL_SCAN_CMD.browserImportPlan,
          MANUAL_SCAN_CMD.workflowReview,
          MANUAL_SCAN_CMD.writeDraftImportPlan,
        ].join("\n"),
        expectedOutput:
          "public/agentops/*-import-plan.json and qa-agent/reports/guardrail-action-plan.json",
        relatedImportType: "static",
      },
      statusMap,
    );

  const reviewImportPlans = (stepId: string, orderLabel: string): AgentOpsManualScanWorkflowStep =>
    makeWorkflowStep(
      {
        stepId,
        label: `${orderLabel}. Review import plans`,
        description:
          "Use Import Review decisions below. Approve only findings you want in backlog.",
        command: null,
        expectedOutput: "Owner review decisions recorded in agentops_owner_feedback",
        relatedImportType: null,
        isUiAction: true,
      },
      statusMap,
    );

  const manualImport = (stepId: string, orderLabel: string): AgentOpsManualScanWorkflowStep =>
    makeWorkflowStep(
      {
        stepId,
        label: `${orderLabel}. Import approved findings (manual)`,
        description:
          "Use Import Static/Browser/Workflow/Write-Draft buttons. Skips duplicate issue codes.",
        command: null,
        expectedOutput: "New rows in agentops_findings with queue_state = backlog",
        relatedImportType: null,
        isUiAction: true,
      },
      statusMap,
    );

  const refillQueue = (stepId: string, orderLabel: string): AgentOpsManualScanWorkflowStep =>
    makeWorkflowStep(
      {
        stepId,
        label: `${orderLabel}. Refill Active Top 10`,
        description: "Use Refill Queue when open slots exist and backlog has promotable items.",
        command: null,
        expectedOutput: "Up to openSlots findings promoted from backlog",
        relatedImportType: "refill",
        isUiAction: true,
      },
      statusMap,
    );

  if (recommendedAction === "no_action") {
    return [
      orchestratorFoundation("maintain-foundation", "1"),
      makeWorkflowStep(
        {
          stepId: "maintain-verification-dry-run",
          label: "2. Optional verification dry-run",
          description: "Report-only verification orchestration. No --apply.",
          command: MANUAL_SCAN_CMD.verificationDryRun,
          expectedOutput: "qa-agent/reports/verification/verification-foundation-run.json",
          relatedImportType: "orchestrator",
        },
        statusMap,
      ),
    ];
  }

  if (recommendedAction === "refill_from_backlog") {
    return [
      refillQueue("refill-primary", "1"),
      generateImportPlans("refill-generate-if-low", "2"),
      makeWorkflowStep(
        {
          stepId: "refill-fix-plans-optional",
          label: "3. Optional: generate fix plans for active issues",
          description: "Planning only — does not run Cursor.",
          command: MANUAL_SCAN_CMD.fixPlans,
          expectedOutput: "qa-agent/reports/fix-plans/agentops-fix-plan-summary.json",
          relatedImportType: "fix_plans",
        },
        statusMap,
      ),
    ];
  }

  if (recommendedAction === "generate_more_candidates") {
    return [
      orchestratorFoundation("gen-foundation", "1"),
      browserScan("gen-browser", "2"),
      workflowScan("gen-workflow", "3"),
      generateImportPlans("gen-import-plans", "4"),
      reviewImportPlans("gen-review", "5"),
      manualImport("gen-import", "6"),
    ];
  }

  if (recommendedAction === "refill_and_generate_more_candidates") {
    return [
      refillQueue("refill-gen-refill", "1"),
      orchestratorFoundation("refill-gen-foundation", "2"),
      browserScan("refill-gen-browser", "3"),
      generateImportPlans("refill-gen-plans", "4"),
      reviewImportPlans("refill-gen-review", "5"),
      manualImport("refill-gen-import", "6"),
    ];
  }

  return [
    orchestratorFoundation("scan-foundation", "1"),
    browserScan("scan-browser", "2"),
    workflowScan("scan-workflow", "3"),
    generateImportPlans("scan-plans", "4"),
    reviewImportPlans("scan-review", "5"),
    manualImport("scan-import", "6"),
    refillQueue("scan-refill", "7"),
  ];
}

function resolveWorkflowTitle(action: AgentOpsQueueHealthRecommendedAction): string {
  switch (action) {
    case "no_action":
      return "Maintenance workflow (queue healthy)";
    case "refill_from_backlog":
      return "Refill from backlog";
    case "generate_more_candidates":
      return "Grow backlog before next slot opens";
    case "refill_and_generate_more_candidates":
      return "Refill now and grow backlog";
    case "run_scan_import_plan":
      return "Scan, import plan, and refill";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

async function fetchManualScanWorkflowStatuses(): Promise<
  Map<string, AgentOpsManualScanWorkflowStepStatus>
> {
  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .select("metadata, remark, created_at")
    .is("finding_id", null)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error || !data) return new Map();

  const statusMap = new Map<string, AgentOpsManualScanWorkflowStepStatus>();
  for (const row of data) {
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};
    if (meta.action !== "manual_scan_workflow_step") continue;
    const stepId = typeof meta.stepId === "string" ? meta.stepId : null;
    if (!stepId || statusMap.has(stepId)) continue;
    const stepAction = meta.stepAction;
    if (typeof stepAction === "string" && isManualScanStepAction(stepAction)) {
      const mapped = mapStepActionToStatus(stepAction);
      if (mapped) statusMap.set(stepId, mapped);
    }
  }
  return statusMap;
}

async function fetchLatestWorkflowOwnerContext(): Promise<{
  ownerNotes: string | null;
  latestDecision: string | null;
}> {
  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .select("remark, metadata")
    .is("finding_id", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) {
    return { ownerNotes: null, latestDecision: null };
  }

  let ownerNotes: string | null = null;
  let latestDecision: string | null = null;

  for (const row of data) {
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};
    if (!latestDecision && meta.action === "queue_health_decision") {
      latestDecision =
        typeof meta.decision === "string" ? meta.decision.replaceAll("_", " ") : null;
    }
    if (
      !ownerNotes &&
      (meta.action === "manual_scan_workflow_step" ||
        meta.action === "import_review_decision") &&
      typeof row.remark === "string" &&
      row.remark.trim()
    ) {
      ownerNotes = row.remark.trim();
    }
    if (latestDecision && ownerNotes) break;
  }

  return { ownerNotes, latestDecision };
}

async function buildImportShortcuts(): Promise<AgentOpsManualScanImportShortcut[]> {
  const [staticPreview, browserPreview, workflowPreview, writeDraftPreview, fixPlans] =
    await Promise.all([
      getAgentOpsStaticImportPreview(),
      getAgentOpsBrowserImportPreview(),
      getAgentOpsWorkflowImportPreview(),
      getAgentOpsWriteDraftImportPreview(),
      getAgentOpsGeneratedFixPlans(),
    ]);

  return [
    {
      importType: "static",
      label: "Static guardrail findings",
      planPath: IMPORT_PLAN_PATHS.static,
      candidateCount: staticPreview.data?.plan?.summary.totalCandidates ?? 0,
      available: staticPreview.data?.available ?? false,
      message: staticPreview.data?.message ?? staticPreview.error ?? "Unavailable",
    },
    {
      importType: "browser",
      label: "Browser QA findings",
      planPath: IMPORT_PLAN_PATHS.browser,
      candidateCount: browserPreview.data?.plan?.candidates.length ?? 0,
      available: browserPreview.data?.available ?? false,
      message: browserPreview.data?.message ?? browserPreview.error ?? "Unavailable",
    },
    {
      importType: "role_workflow",
      label: "Role workflow findings",
      planPath: IMPORT_PLAN_PATHS.role_workflow,
      candidateCount: workflowPreview.data?.plan?.candidates.length ?? 0,
      available: workflowPreview.data?.available ?? false,
      message: workflowPreview.data?.message ?? workflowPreview.error ?? "Unavailable",
    },
    {
      importType: "write_draft",
      label: "Write/draft QA findings",
      planPath: IMPORT_PLAN_PATHS.write_draft,
      candidateCount: writeDraftPreview.data?.plan?.candidates.length ?? 0,
      available: writeDraftPreview.data?.available ?? false,
      message: writeDraftPreview.data?.message ?? writeDraftPreview.error ?? "Unavailable",
    },
    {
      importType: "fix_plans",
      label: "Generated fix plans",
      planPath: IMPORT_PLAN_PATHS.fix_plans,
      candidateCount: fixPlans.data?.plans.length ?? 0,
      available: (fixPlans.data?.plans.length ?? 0) > 0,
      message:
        fixPlans.error ??
        (fixPlans.data?.plans.length
          ? `${fixPlans.data.plans.length} fix plan(s) in summary.`
          : "Run npm run qa:agentops-fix-plans to generate."),
    },
  ];
}

/** Manual scan/import workflow for Queue Health panel (Stage 14B). Owner read. */
export async function getAgentOpsManualScanWorkflow(): Promise<
  AgentOpsReadResult<AgentOpsManualScanWorkflow>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const [queueHealthResult, statusMap, ownerContext, importShortcuts] = await Promise.all([
      getAgentOpsQueueHealth(),
      fetchManualScanWorkflowStatuses(),
      fetchLatestWorkflowOwnerContext(),
      buildImportShortcuts(),
    ]);

    if (queueHealthResult.error || !queueHealthResult.data) {
      return fail(queueHealthResult.error ?? "Queue health unavailable.");
    }

    const queueHealth = queueHealthResult.data;
    const steps = buildManualScanWorkflowSteps(queueHealth, statusMap);

    return ok({
      recommendation: queueHealth.explanation,
      workflowTitle: resolveWorkflowTitle(queueHealth.recommendedAction),
      steps,
      currentQueueHealth: queueHealth,
      ownerNotes: ownerContext.ownerNotes,
      latestDecision: ownerContext.latestDecision,
      importShortcuts,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Record Owner progress on a manual scan workflow step (Stage 14B). */
export async function recordAgentOpsManualScanStep(
  input: AgentOpsManualScanStepInput,
): Promise<AgentOpsWriteResult<AgentOpsManualScanStepRecord>> {
  try {
    if (!input.stepId?.trim()) return writeFail("stepId is required.");
    if (!isManualScanStepAction(input.action)) {
      return writeFail("Invalid manual scan step action.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const note = input.note?.trim() || null;
    const mappedStatus = mapStepActionToStatus(input.action);

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "manual_scan_workflow_step",
          stepId: input.stepId.trim(),
          stepAction: input.action,
          command: input.command?.trim() || null,
          queueHealthSnapshot: {
            activeOpenCount: input.queueHealthSnapshot.activeOpenCount,
            backlogCount: input.queueHealthSnapshot.backlogCount,
            recommendedAction: input.queueHealthSnapshot.recommendedAction,
            backlogStatus: input.queueHealthSnapshot.backlogStatus,
            activeStatus: input.queueHealthSnapshot.activeStatus,
          },
          stage: "14B",
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    return writeOk({
      feedbackId: data.id as string,
      message: "Workflow step updated.",
      status: mappedStatus ?? "not_started",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Record Owner import-plan review decision — does not import (Stage 14B). */
export async function recordAgentOpsImportReviewDecision(
  input: AgentOpsImportReviewDecisionInput,
): Promise<AgentOpsWriteResult<AgentOpsImportReviewDecisionRecord>> {
  try {
    if (!isImportReviewDecision(input.decision)) {
      return writeFail("Invalid import review decision.");
    }
    if (!input.planPath?.trim()) {
      return writeFail("planPath is required.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const note = input.note?.trim() || null;
    const snapshot = input.queueHealthSnapshot;

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "import_review_decision",
          importType: input.importType,
          decision: input.decision,
          planPath: input.planPath.trim(),
          queueHealthSnapshot: snapshot
            ? {
                activeOpenCount: snapshot.activeOpenCount,
                backlogCount: snapshot.backlogCount,
                recommendedAction: snapshot.recommendedAction,
              }
            : null,
          stage: "14B",
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    return writeOk({
      feedbackId: data.id as string,
      message: "Import review decision recorded. Use Import buttons only when ready.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

function isImportCandidateDecision(value: string): value is AgentOpsImportCandidateDecision {
  return (IMPORT_CANDIDATE_DECISIONS as readonly string[]).includes(value);
}

function mapCandidateDecisionToReviewStatus(
  decision: AgentOpsImportCandidateDecision,
): AgentOpsImportCandidateReviewStatus {
  switch (decision) {
    case "approve_candidate":
    case "approve_source":
      return "approved_for_manual_import";
    case "reject_candidate":
    case "reject_source":
      return "rejected";
    case "needs_regeneration":
      return "needs_regeneration";
    case "review_later":
      return "review_later";
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }
}

function countCandidateField(
  items: AgentOpsStaticImportCandidate[],
  field: "severity" | "category",
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const value = item[field];
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

type AgentOpsImportPlanWithCandidates = {
  candidates: AgentOpsStaticImportCandidate[];
};

function extractHeldIssueCodesFromPlan(plan: unknown): string[] {
  if (!plan || typeof plan !== "object") return [];
  const record = plan as Record<string, unknown>;
  const held: string[] = [];
  if (Array.isArray(record.heldIssueCodes)) {
    for (const code of record.heldIssueCodes) {
      if (typeof code === "string") held.push(code);
    }
  }
  if (Array.isArray(record.heldFindings)) {
    for (const entry of record.heldFindings) {
      if (entry && typeof entry === "object" && typeof (entry as { issueCode?: string }).issueCode === "string") {
        held.push((entry as { issueCode: string }).issueCode);
      }
    }
  }
  return [...new Set(held)];
}

function builtInSourceWarnings(sourceId: AgentOpsImportSourceId): string[] {
  switch (sourceId) {
    case "write_draft":
      return [
        `Full write-draft plan includes ${HELD_WRITE_DRAFT_ISSUE}, which was held in Stage 11C — do not import from the full plan.`,
        "Prefer write-draft-approved-import-plan.json (WDS-1/WDS-2 only) after review.",
      ];
    case "write_draft_approved":
      return [
        "Approved write-draft plan includes only WDS-1/WDS-2. If already Verified Fixed/archived in staging, manual import skips duplicates.",
      ];
    case "role_workflow":
      return [
        "Full role-workflow plan includes held needs-piter-decision items — use role-workflow-approved-import-plan.json when importing.",
      ];
    case "role_workflow_approved":
      return [
        "Approved role-workflow plan only had RWF-28/RWF-29. If already Verified Fixed/archived, manual import skips duplicates.",
      ];
    default:
      return [];
  }
}

async function fetchApprovedImportPlan(
  url: string,
): Promise<AgentOpsStaticImportPlan | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    return isStaticImportPlan(json) ? json : null;
  } catch {
    return null;
  }
}

type ImportDecisionMaps = {
  byIssue: Map<string, AgentOpsImportCandidateReviewStatus>;
  bySource: Map<AgentOpsImportSourceId, AgentOpsImportCandidateReviewStatus>;
  approvedCountBySource: Map<AgentOpsImportSourceId, number>;
  rejectedCountBySource: Map<AgentOpsImportSourceId, number>;
  needsRegenerationBySource: Map<AgentOpsImportSourceId, number>;
  reviewLaterBySource: Map<AgentOpsImportSourceId, number>;
};

function mapLegacyImportReviewDecision(
  decision: string,
): AgentOpsImportCandidateReviewStatus | null {
  if (decision === "approved_for_manual_import") return "approved_for_manual_import";
  if (decision === "rejected") return "rejected";
  if (decision === "needs_regeneration") return "needs_regeneration";
  if (decision === "review_later") return "review_later";
  return null;
}

async function fetchImportDecisionMaps(): Promise<ImportDecisionMaps> {
  const byIssue = new Map<string, AgentOpsImportCandidateReviewStatus>();
  const bySource = new Map<AgentOpsImportSourceId, AgentOpsImportCandidateReviewStatus>();
  const approvedCountBySource = new Map<AgentOpsImportSourceId, number>();
  const rejectedCountBySource = new Map<AgentOpsImportSourceId, number>();
  const needsRegenerationBySource = new Map<AgentOpsImportSourceId, number>();
  const reviewLaterBySource = new Map<AgentOpsImportSourceId, number>();

  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .select("metadata")
    .is("finding_id", null)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error || !data) {
    return {
      byIssue,
      bySource,
      approvedCountBySource,
      rejectedCountBySource,
      needsRegenerationBySource,
      reviewLaterBySource,
    };
  }

  const bump = (
    map: Map<AgentOpsImportSourceId, number>,
    sourceId: AgentOpsImportSourceId,
  ) => {
    map.set(sourceId, (map.get(sourceId) ?? 0) + 1);
  };

  for (const row of data) {
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};

    if (meta.action === "import_candidate_decision") {
      const sourceId = meta.sourceId;
      const issueCode = typeof meta.issueCode === "string" ? meta.issueCode : null;
      const decision = meta.decision;
      if (typeof decision !== "string" || !isImportCandidateDecision(decision)) continue;
      const status = mapCandidateDecisionToReviewStatus(decision);
      const sourceKey =
        typeof sourceId === "string" ? (sourceId as AgentOpsImportSourceId) : null;
      if (!sourceKey) continue;

      if (issueCode && !byIssue.has(issueCode)) {
        byIssue.set(issueCode, status);
      }
      if (!issueCode && !bySource.has(sourceKey)) {
        bySource.set(sourceKey, status);
      }

      if (status === "approved_for_manual_import") bump(approvedCountBySource, sourceKey);
      if (status === "rejected") bump(rejectedCountBySource, sourceKey);
      if (status === "needs_regeneration") bump(needsRegenerationBySource, sourceKey);
      if (status === "review_later") bump(reviewLaterBySource, sourceKey);
      continue;
    }

    if (meta.action === "import_review_decision") {
      const importType = meta.importType;
      const decision = meta.decision;
      if (typeof decision !== "string") continue;
      const status = mapLegacyImportReviewDecision(decision);
      if (!status) continue;
      const sourceKey = mapImportTypeToSourceId(importType);
      if (!sourceKey || bySource.has(sourceKey)) continue;
      bySource.set(sourceKey, status);
      if (status === "approved_for_manual_import") bump(approvedCountBySource, sourceKey);
      if (status === "rejected") bump(rejectedCountBySource, sourceKey);
      if (status === "needs_regeneration") bump(needsRegenerationBySource, sourceKey);
      if (status === "review_later") bump(reviewLaterBySource, sourceKey);
    }
  }

  return {
    byIssue,
    bySource,
    approvedCountBySource,
    rejectedCountBySource,
    needsRegenerationBySource,
    reviewLaterBySource,
  };
}

function mapImportTypeToSourceId(
  importType: unknown,
): AgentOpsImportSourceId | null {
  if (importType === "static") return "static";
  if (importType === "browser") return "browser";
  if (importType === "role_workflow") return "role_workflow";
  if (importType === "write_draft") return "write_draft";
  return null;
}

async function fetchFindingsByIssueCodes(
  issueCodes: string[],
): Promise<Map<string, AgentOpsFinding>> {
  const map = new Map<string, AgentOpsFinding>();
  if (issueCodes.length === 0) return map;

  const unique = [...new Set(issueCodes.filter(Boolean))];
  const chunkSize = 40;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("agentops_findings")
      .select("*")
      .in("issue_code", chunk);
    if (error) continue;
    for (const row of (data ?? []) as AgentOpsFinding[]) {
      if (!map.has(row.issue_code)) {
        map.set(row.issue_code, row);
      }
    }
  }
  return map;
}

function resolveCandidateReviewStatus(
  issueCode: string,
  finding: AgentOpsFinding | undefined,
  decisionMaps: ImportDecisionMaps,
  sourceId: AgentOpsImportSourceId,
): AgentOpsImportCandidateReviewStatus {
  if (finding) {
    if (
      finding.status === "Verified Fixed" ||
      finding.queue_state === "archived" ||
      finding.status === "False Positive"
    ) {
      return "imported";
    }
    return "duplicate_skipped";
  }

  const issueDecision = decisionMaps.byIssue.get(issueCode);
  if (issueDecision) return issueDecision;

  const sourceDecision = decisionMaps.bySource.get(sourceId);
  if (sourceDecision) return sourceDecision;

  return "not_reviewed";
}

function buildImportCandidateItem(
  candidate: AgentOpsStaticImportCandidate,
  sourceId: AgentOpsImportSourceId,
  findingMap: Map<string, AgentOpsFinding>,
  decisionMaps: ImportDecisionMaps,
  heldIssueCodes: string[],
): AgentOpsImportCandidateItem {
  const finding = findingMap.get(candidate.issueCode);
  const isHeld = heldIssueCodes.includes(candidate.issueCode);
  const reviewStatus = resolveCandidateReviewStatus(
    candidate.issueCode,
    finding,
    decisionMaps,
    sourceId,
  );
  const importedInDb = Boolean(finding);
  const isDuplicateRisk = importedInDb || candidate.metadata?.sample === true;
  const canImportManually =
    !importedInDb &&
    !isHeld &&
    reviewStatus === "approved_for_manual_import" &&
    candidate.metadata?.sample !== true;

  return {
    issueCode: candidate.issueCode,
    title: candidate.title,
    severity: candidate.severity,
    category: candidate.category,
    reviewStatus,
    importedInDb,
    findingStatus: finding?.status ?? null,
    queueState: finding?.queue_state ?? null,
    isHeld,
    isDuplicateRisk,
    canImportManually,
  };
}

function resolveRecommendedSourceDecision(
  source: Omit<
    AgentOpsImportCandidateSource,
    "recommendedDecision" | "recommendedDecisionLabel" | "canImportManually" | "warnings"
  >,
  heldIssueCodes: string[],
): { decision: AgentOpsImportCandidateReviewStatus; label: string } {
  if (!source.planAvailable || source.candidateCount === 0) {
    return {
      decision: "needs_regeneration",
      label: "Regenerate import plan — no candidates in plan file",
    };
  }
  if (source.alreadyImportedCount === source.candidateCount && source.candidateCount > 0) {
    return {
      decision: "imported",
      label: "All candidates already exist in AgentOps — import will skip duplicates",
    };
  }
  if (heldIssueCodes.length > 0 && source.sourceId === "write_draft") {
    return {
      decision: "review_later",
      label: "Review held findings — do not import full write-draft plan",
    };
  }
  if (source.readyForManualImportCount > 0) {
    return {
      decision: "approved_for_manual_import",
      label: "Approved candidates ready — use manual Import button",
    };
  }
  if (source.notReviewedCount > 0) {
    return {
      decision: "review_later",
      label: "Review candidates before manual import",
    };
  }
  if (source.rejectedCount > 0 && source.approvedCount === 0) {
    return { decision: "rejected", label: "Source rejected — regenerate or use another plan" };
  }
  return { decision: "review_later", label: "Review plan before manual import" };
}

function buildImportCandidateSource(
  config: {
    sourceId: AgentOpsImportSourceId;
    label: string;
    planPath: string;
    category: string;
    plan: AgentOpsImportPlanWithCandidates | null;
  },
  findingMap: Map<string, AgentOpsFinding>,
  decisionMaps: ImportDecisionMaps,
): AgentOpsImportCandidateSource {
  const plan = config.plan;
  const planAvailable = Boolean(plan);
  const rawCandidates = plan?.candidates ?? [];
  const heldFromPlan = extractHeldIssueCodesFromPlan(plan);
  const heldIssueCodes = [...new Set([...heldFromPlan, ...builtInHeldCodes(config.sourceId)])];

  const candidates = rawCandidates.map((candidate) =>
    buildImportCandidateItem(
      candidate,
      config.sourceId,
      findingMap,
      decisionMaps,
      heldIssueCodes,
    ),
  );

  const issueCodes = candidates.map((c) => c.issueCode);
  const alreadyImportedCount = candidates.filter((c) => c.importedInDb).length;
  const duplicateRiskCount = candidates.filter((c) => c.isDuplicateRisk).length;
  const approvedCount = candidates.filter(
    (c) => c.reviewStatus === "approved_for_manual_import",
  ).length;
  const rejectedCount = candidates.filter((c) => c.reviewStatus === "rejected").length;
  const needsRegenerationCount = candidates.filter(
    (c) => c.reviewStatus === "needs_regeneration",
  ).length;
  const reviewLaterCount = candidates.filter((c) => c.reviewStatus === "review_later").length;
  const notReviewedCount = candidates.filter((c) => c.reviewStatus === "not_reviewed").length;
  const readyForManualImportCount = candidates.filter((c) => c.canImportManually).length;

  const base = {
    sourceId: config.sourceId,
    label: config.label,
    planPath: config.planPath,
    category: config.category,
    planAvailable,
    candidateCount: candidates.length,
    issueCodes,
    severityCounts: countCandidateField(rawCandidates, "severity"),
    categoryCounts: countCandidateField(rawCandidates, "category"),
    alreadyImportedCount,
    duplicateRiskCount,
    approvedCount,
    rejectedCount,
    needsRegenerationCount,
    reviewLaterCount,
    notReviewedCount,
    readyForManualImportCount,
    heldIssueCodes,
    candidates,
  };

  const recommended = resolveRecommendedSourceDecision(base, heldIssueCodes);
  const warnings = [...builtInSourceWarnings(config.sourceId)];
  if (!planAvailable) {
    warnings.push("Import plan file is missing — run the matching npm import-plan generator.");
  }
  if (base.candidateCount === 0 && planAvailable) {
    warnings.push("Plan has zero candidates.");
  }
  if (base.alreadyImportedCount === base.candidateCount && base.candidateCount > 0) {
    warnings.push("All candidates already exist in agentops_findings (import will skip).");
  }
  if (base.notReviewedCount > 0) {
    warnings.push(`${base.notReviewedCount} candidate(s) not reviewed yet.`);
  }
  if (base.readyForManualImportCount === 0 && base.candidateCount > 0 && base.notReviewedCount > 0) {
    warnings.push("Unapproved candidates remain — manual import may skip or duplicate.");
  }
  if (heldIssueCodes.length > 0) {
    warnings.push(`Held issue codes in plan: ${heldIssueCodes.join(", ")}`);
  }

  return {
    ...base,
    recommendedDecision: recommended.decision,
    recommendedDecisionLabel: recommended.label,
    canImportManually: planAvailable && readyForManualImportCount > 0,
    warnings,
  };
}

function builtInHeldCodes(sourceId: AgentOpsImportSourceId): string[] {
  if (sourceId === "write_draft") return [HELD_WRITE_DRAFT_ISSUE];
  return [];
}

function buildGlobalImportWarnings(sources: AgentOpsImportCandidateSource[]): string[] {
  const warnings: string[] = [
    "Manual import only. Approval recommended before import. UI never runs CLI or auto-imports.",
  ];

  const writeDraftFull = sources.find((s) => s.sourceId === "write_draft");
  const writeDraftApproved = sources.find((s) => s.sourceId === "write_draft_approved");
  const roleFull = sources.find((s) => s.sourceId === "role_workflow");
  const roleApproved = sources.find((s) => s.sourceId === "role_workflow_approved");

  if (writeDraftFull?.issueCodes.includes(HELD_WRITE_DRAFT_ISSUE)) {
    warnings.push(
      `${HELD_WRITE_DRAFT_ISSUE} is in the full write-draft plan but was held — use approved plan only.`,
    );
  }

  if (writeDraftApproved) {
    const resolved = writeDraftApproved.candidates.filter(
      (c) =>
        (RESOLVED_APPROVED_WRITE_DRAFT as readonly string[]).includes(c.issueCode) &&
        (c.findingStatus === "Verified Fixed" || c.queueState === "archived"),
    );
    if (resolved.length > 0) {
      warnings.push(
        `Approved write-draft targets (${resolved.map((c) => c.issueCode).join(", ")}) are already Verified Fixed/archived in staging.`,
      );
    }
  }

  if (roleFull && roleFull.candidateCount > (roleApproved?.candidateCount ?? 0)) {
    warnings.push(
      "Full role-workflow plan has more candidates than the approved subset — prefer approved plan for import.",
    );
  }

  if (roleApproved) {
    const resolved = roleApproved.candidates.filter(
      (c) =>
        (RESOLVED_APPROVED_ROLE_WORKFLOW as readonly string[]).includes(c.issueCode) &&
        (c.findingStatus === "Verified Fixed" || c.queueState === "archived"),
    );
    if (resolved.length > 0) {
      warnings.push(
        `Approved role-workflow targets (${resolved.map((c) => c.issueCode).join(", ")}) are already Verified Fixed/archived in staging.`,
      );
    }
  }

  return warnings;
}

/** Rich import candidate review summary (Stage 14C). Owner read; no import. */
export async function getAgentOpsImportReviewSummary(): Promise<
  AgentOpsReadResult<AgentOpsImportReviewSummary>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const [
      staticPlan,
      browserPlan,
      roleWorkflowPlan,
      roleWorkflowApprovedPlan,
      writeDraftPlan,
      writeDraftApprovedPlan,
      decisionMaps,
    ] = await Promise.all([
      fetchAgentOpsStaticImportPlan(),
      fetchAgentOpsBrowserImportPlan(),
      fetchAgentOpsWorkflowImportPlan(),
      fetchApprovedImportPlan(ROLE_WORKFLOW_APPROVED_IMPORT_PLAN_URL),
      fetchAgentOpsWriteDraftImportPlan(),
      fetchApprovedImportPlan(WRITE_DRAFT_APPROVED_IMPORT_PLAN_URL),
      fetchImportDecisionMaps(),
    ]);

    const allIssueCodes = new Set<string>();
    for (const plan of [
      staticPlan,
      browserPlan,
      roleWorkflowPlan,
      roleWorkflowApprovedPlan,
      writeDraftPlan,
      writeDraftApprovedPlan,
    ]) {
      for (const candidate of plan?.candidates ?? []) {
        if (candidate.issueCode) allIssueCodes.add(candidate.issueCode);
      }
    }

    const findingMap = await fetchFindingsByIssueCodes([...allIssueCodes]);

    const sources: AgentOpsImportCandidateSource[] = [
      buildImportCandidateSource(
        {
          sourceId: "static",
          label: "Static guardrail findings",
          planPath: IMPORT_PLAN_PATHS.static,
          category: "static-guardrail",
          plan: staticPlan,
        },
        findingMap,
        decisionMaps,
      ),
      buildImportCandidateSource(
        {
          sourceId: "browser",
          label: "Browser QA findings",
          planPath: IMPORT_PLAN_PATHS.browser,
          category: "browser-qa",
          plan: browserPlan as AgentOpsImportPlanWithCandidates | null,
        },
        findingMap,
        decisionMaps,
      ),
      buildImportCandidateSource(
        {
          sourceId: "role_workflow",
          label: "Role workflow findings (full plan)",
          planPath: IMPORT_PLAN_PATHS.role_workflow,
          category: "role-workflow",
          plan: roleWorkflowPlan as AgentOpsImportPlanWithCandidates | null,
        },
        findingMap,
        decisionMaps,
      ),
      buildImportCandidateSource(
        {
          sourceId: "role_workflow_approved",
          label: "Role workflow findings (approved subset)",
          planPath: IMPORT_PLAN_PATHS.role_workflow_approved,
          category: "role-workflow-approved",
          plan: roleWorkflowApprovedPlan,
        },
        findingMap,
        decisionMaps,
      ),
      buildImportCandidateSource(
        {
          sourceId: "write_draft",
          label: "Write/draft findings (full plan)",
          planPath: IMPORT_PLAN_PATHS.write_draft,
          category: "write-draft",
          plan: writeDraftPlan as AgentOpsImportPlanWithCandidates | null,
        },
        findingMap,
        decisionMaps,
      ),
      buildImportCandidateSource(
        {
          sourceId: "write_draft_approved",
          label: "Write/draft findings (approved subset)",
          planPath: IMPORT_PLAN_PATHS.write_draft_approved,
          category: "write-draft-approved",
          plan: writeDraftApprovedPlan,
        },
        findingMap,
        decisionMaps,
      ),
    ];

    return ok({
      generatedAt: new Date().toISOString(),
      sources,
      globalWarnings: buildGlobalImportWarnings(sources),
    });
  } catch (error) {
    return fail(error);
  }
}

/** Record per-candidate or per-source import review (Stage 14C). No import. */
export async function recordAgentOpsImportCandidateDecision(
  input: AgentOpsImportCandidateDecisionInput,
): Promise<AgentOpsWriteResult<AgentOpsImportCandidateDecisionRecord>> {
  try {
    if (!isImportCandidateDecision(input.decision)) {
      return writeFail("Invalid import candidate decision.");
    }
    if (!input.planPath?.trim()) {
      return writeFail("planPath is required.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const reviewStatus = mapCandidateDecisionToReviewStatus(input.decision);
    const note = input.note?.trim() || null;

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "import_candidate_decision",
          sourceId: input.sourceId,
          issueCode: input.issueCode?.trim() || null,
          decision: input.decision,
          reviewStatus,
          planPath: input.planPath.trim(),
          stage: "14C",
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    return writeOk({
      feedbackId: data.id as string,
      message: "Import candidate decision recorded. Manual import only when you choose.",
      reviewStatus,
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Prior import/candidate review feedback (Stage 14C). */
export async function getAgentOpsImportDecisionHistory(
  sourceId?: AgentOpsImportSourceId,
  issueCode?: string,
): Promise<AgentOpsReadResult<AgentOpsImportDecisionHistoryItem[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("id, created_at, remark, metadata")
      .is("finding_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return fail(error);

    const items: AgentOpsImportDecisionHistoryItem[] = [];
    for (const row of data ?? []) {
      const meta =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {};
      if (
        meta.action !== "import_candidate_decision" &&
        meta.action !== "import_review_decision"
      ) {
        continue;
      }
      const rowSourceId =
        typeof meta.sourceId === "string"
          ? (meta.sourceId as AgentOpsImportSourceId)
          : mapImportTypeToSourceId(meta.importType);
      const rowIssueCode =
        typeof meta.issueCode === "string"
          ? meta.issueCode
          : null;
      if (sourceId && rowSourceId !== sourceId) continue;
      if (issueCode && rowIssueCode !== issueCode) continue;

      const decision =
        typeof meta.decision === "string"
          ? meta.decision
          : typeof meta.reviewStatus === "string"
            ? meta.reviewStatus
            : "unknown";
      const planPath =
        typeof meta.planPath === "string" ? meta.planPath : "—";

      items.push({
        id: row.id as string,
        createdAt: row.created_at as string,
        sourceId: rowSourceId ?? "static",
        issueCode: rowIssueCode,
        decision,
        planPath,
        remark: typeof row.remark === "string" ? row.remark : null,
      });
    }

    return ok(items);
  } catch (error) {
    return fail(error);
  }
}

async function fetchLatestSchedulerPreparationDecision(): Promise<{
  decision: AgentOpsSchedulerPreparationDecision | null;
  note: string | null;
}> {
  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .select("remark, metadata")
    .is("finding_id", null)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error || !data) {
    return { decision: null, note: null };
  }

  for (const row of data) {
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};
    if (meta.action !== "scheduler_preparation_decision") continue;
    const decision = meta.decision;
    if (typeof decision === "string" && isSchedulerPreparationDecision(decision)) {
      return {
        decision,
        note: typeof row.remark === "string" && row.remark.trim() ? row.remark.trim() : null,
      };
    }
  }

  return { decision: null, note: null };
}

/** Scheduler preparation status (Stage 15). Inactive — no runs scheduled. */
export async function getAgentOpsSchedulerPreparationStatus(): Promise<
  AgentOpsReadResult<AgentOpsSchedulerPreparationStatus>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const [queueHealthResult, latestDecision] = await Promise.all([
      getAgentOpsQueueHealth(),
      fetchLatestSchedulerPreparationDecision(),
    ]);

    const rules = SCHEDULER_PREP_RULES;
    const active = rules.active === true;

    return ok({
      schedulerStatus: active ? "active" : rules.schedulerStatus,
      active,
      environment: rules.environment,
      recommendedInitialCadence: rules.recommendedInitialCadence,
      allowedFutureRunModes: [...rules.allowedFutureRunModes],
      neverAutoRun: [...rules.neverAutoRun],
      futureCadenceOptions: [...rules.futureCadenceOptions],
      ownerApprovalRequiredFor: [...rules.ownerApprovalRequiredFor],
      quietDays: [...rules.quietDays],
      quietModeExplanation: rules.quietModeRule,
      safetyChecklistPath: rules.safetyChecklistPath,
      runbookPath: rules.runbookPath,
      prepRulesPath: rules.prepRulesPath,
      latestQueueHealth: queueHealthResult.data ?? null,
      latestSchedulerDecision: latestDecision.decision,
      latestSchedulerDecisionNote: latestDecision.note,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Record Owner scheduler preparation decision — does not activate scheduler (Stage 15). */
export async function recordAgentOpsSchedulerDecision(
  input: AgentOpsSchedulerPreparationDecisionInput,
): Promise<AgentOpsWriteResult<AgentOpsSchedulerPreparationDecisionRecord>> {
  try {
    if (!isSchedulerPreparationDecision(input.decision)) {
      return writeFail("Invalid scheduler preparation decision.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const note = input.note?.trim() || null;
    const rules = SCHEDULER_PREP_RULES;

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "scheduler_preparation_decision",
          decision: input.decision,
          schedulerStatus: rules.schedulerStatus,
          schedulerActive: rules.active,
          recommendedInitialCadence: rules.recommendedInitialCadence,
          stage: "15",
          note: "Does not activate scheduler or cron.",
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    const activationMessage =
      input.decision === "approve_preparation"
        ? "Preparation approved for future design — scheduler remains inactive until a separate activation stage."
        : "Scheduler preparation decision recorded. No scheduler or cron was activated.";

    return writeOk({
      feedbackId: data.id as string,
      message: activationMessage,
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Stage 16G: Record automation control request (request/copy only, no execution). */
export async function recordAgentOpsAutomationControlRequest(
  input: AgentOpsAutomationControlRequestInput,
): Promise<AgentOpsWriteResult<AgentOpsAutomationControlRequestRecord>> {
  try {
    if (!isAutomationControlRequestType(input.requestType)) {
      return writeFail("Invalid automation control request type.");
    }

    const status = input.status ?? "requested";
    if (!isAutomationControlRequestStatus(status)) {
      return writeFail("Invalid automation control request status.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const note = input.note?.trim() || null;
    const commandOrPrompt = input.commandOrPrompt?.trim() || null;

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "automation_control_request",
          requestType: input.requestType,
          requestStatus: status,
          commandOrPrompt,
          stage: "16G",
          note: "Request/copy only. Does not execute commands, activate scheduler, or modify production.",
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    return writeOk({
      feedbackId: data.id as string,
      requestType: input.requestType,
      status,
      message: "Automation request recorded. No command was executed from UI.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Stage 16G: Read latest automation control requests logged in owner feedback. */
export async function getAgentOpsAutomationControlRequests(
  limit = 8,
): Promise<AgentOpsReadResult<AgentOpsAutomationControlRequestItem[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, Math.floor(limit)), 30) : 8;
    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("id, owner_user_id, remark, metadata, created_at")
      .is("finding_id", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return fail(error);

    const items: AgentOpsAutomationControlRequestItem[] = [];
    for (const row of data ?? []) {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {};
      if (metadata.action !== "automation_control_request") continue;

      const requestTypeRaw = metadata.requestType;
      const requestStatusRaw = metadata.requestStatus;
      if (typeof requestTypeRaw !== "string" || !isAutomationControlRequestType(requestTypeRaw)) {
        continue;
      }
      const status =
        typeof requestStatusRaw === "string" && isAutomationControlRequestStatus(requestStatusRaw)
          ? requestStatusRaw
          : "requested";
      const commandOrPrompt =
        typeof metadata.commandOrPrompt === "string" && metadata.commandOrPrompt.trim()
          ? metadata.commandOrPrompt.trim()
          : null;
      const note = typeof row.remark === "string" && row.remark.trim() ? row.remark.trim() : null;

      items.push({
        feedbackId: row.id as string,
        requestType: requestTypeRaw,
        status,
        note,
        commandOrPrompt,
        createdAt: row.created_at as string,
        requestedBy: (row.owner_user_id as string) ?? "owner",
      });
      if (items.length >= safeLimit) break;
    }

    return ok(items);
  } catch (error) {
    return fail(error);
  }
}

function isGeneratedFixPlan(value: unknown): value is AgentOpsGeneratedFixPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as AgentOpsGeneratedFixPlan;
  return (
    typeof plan.issueCode === "string" &&
    typeof plan.issueTitle === "string" &&
    typeof plan.planId === "string" &&
    typeof plan.planStatus === "string" &&
    typeof plan.cursorPrompt === "string" &&
    Array.isArray(plan.validationCommands)
  );
}

function isGeneratedFixPlanSummary(
  value: unknown,
): value is AgentOpsGeneratedFixPlanSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as AgentOpsGeneratedFixPlanSummary;
  return (
    typeof summary.generatedAt === "string" &&
    Array.isArray(summary.plans) &&
    summary.plans.every((plan) => isGeneratedFixPlan(plan))
  );
}

/** Read generated fix plans from public summary JSON (Stage 13C). */
export async function getAgentOpsGeneratedFixPlans(): Promise<
  AgentOpsReadResult<AgentOpsGeneratedFixPlanSummary>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const response = await fetch(FIX_PLAN_SUMMARY_URL, { cache: "no-store" });
    if (!response.ok) {
      return fail(
        "Fix plan summary not found. Run npm run qa:agentops-fix-plans and refresh.",
      );
    }

    const json: unknown = await response.json();
    if (!isGeneratedFixPlanSummary(json)) {
      return fail("Fix plan summary format is invalid.");
    }

    const issueCodes = [...new Set(json.plans.map((plan) => plan.issueCode).filter(Boolean))];
    if (issueCodes.length === 0) {
      return ok(json);
    }

    const { data: findings, error: findingsError } = await supabase
      .from("agentops_findings")
      .select("issue_code, metadata, created_at")
      .in("issue_code", issueCodes)
      .order("created_at", { ascending: false });
    if (findingsError) return fail(findingsError);

    const metadataByIssueCode = new Map<string, Record<string, unknown>>();
    for (const row of findings ?? []) {
      const code = row.issue_code as string;
      if (!code || metadataByIssueCode.has(code)) continue;
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {};
      metadataByIssueCode.set(code, metadata);
    }

    const enrichedPlans = json.plans.map((plan) => {
      const metadata = metadataByIssueCode.get(plan.issueCode) ?? {};
      const latestFixPlanDecision =
        typeof metadata.latestFixPlanDecision === "string" &&
        isFixPlanDecision(metadata.latestFixPlanDecision)
          ? metadata.latestFixPlanDecision
          : null;
      const latestFixPlanDecisionStatus =
        typeof metadata.latestFixPlanDecisionStatus === "string"
          ? (metadata.latestFixPlanDecisionStatus as AgentOpsFixPlanStatus)
          : null;
      const latestCursorHandoffStatus =
        typeof metadata.latestCursorHandoffStatus === "string" &&
        isCursorHandoffStatus(metadata.latestCursorHandoffStatus)
          ? metadata.latestCursorHandoffStatus
          : null;
      const latestCursorHandoffId =
        typeof metadata.latestCursorHandoffId === "string"
          ? metadata.latestCursorHandoffId
          : null;

      return {
        ...plan,
        latestFixPlanDecision,
        latestFixPlanDecisionStatus,
        latestCursorHandoffStatus,
        latestCursorHandoffId,
        verificationRequested: metadata.verificationRequested === true,
      };
    });

    return ok({
      ...json,
      plans: enrichedPlans,
    });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Owner write flows (Stage 5) — authenticated client + RLS only
// ---------------------------------------------------------------------------

function writeOk<T>(data: T): AgentOpsWriteResult<T> {
  return { data, error: null };
}

function writeFail<T>(error: unknown): AgentOpsWriteResult<T> {
  return { data: null, error: toErrorMessage(error) };
}

function isFixPlanDecision(value: string): value is AgentOpsFixPlanDecision {
  return (FIX_PLAN_DECISIONS as readonly string[]).includes(value);
}

function isCursorHandoffStatus(value: string): value is AgentOpsCursorHandoffStatus {
  return (CURSOR_HANDOFF_STATUSES as readonly string[]).includes(value);
}

function mapDecisionToPlanStatus(decision: AgentOpsFixPlanDecision): AgentOpsFixPlanStatus {
  switch (decision) {
    case "approve_fix_plan":
      return "approved";
    case "reject_fix_plan":
      return "rejected";
    case "request_better_plan":
      return "needs_better_plan";
    case "mark_prompt_used_manually":
      return "used_manually";
    case "copy_prompt_only":
      return "sent_to_cursor_later";
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }
}

async function assertAgentOpsOwner(): Promise<AgentOpsWriteResult<true>> {
  const ownerResult = await getAgentOpsOwnerStatus();
  if (ownerResult.error) return writeFail(ownerResult.error);
  if (!ownerResult.data?.isOwner) {
    return writeFail("AgentOps Owner access required.");
  }
  return writeOk(true);
}

async function getAuthenticatedOwnerUserId(): Promise<AgentOpsWriteResult<string>> {
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return writeFail(ownerGate.error);

  const { data, error } = await supabase.auth.getUser();
  if (error) return writeFail(error);
  if (!data.user?.id) {
    return writeFail("You must be signed in to perform AgentOps actions.");
  }
  return writeOk(data.user.id);
}

const MEMORY_TYPE_MAP: Record<AgentOpsAgentMemoryInputType, string> = {
  instruction: "implementation_rule",
  preference: "preference",
  focus: "focus_rule",
  correction: "rejection_pattern",
  feature_idea: "approved_pattern",
  blocked_behavior: "rejection_pattern",
};

const MEMORY_PRIORITY_CONFIDENCE: Record<AgentOpsAgentMemoryPriority, number> = {
  low: 40,
  medium: 70,
  high: 90,
};

const AGENT_INTERACTION_DEFAULT_SOURCE: AgentOpsAgentInteractionSource = "piter";
const AGENT_INTERACTION_DEFAULT_PRIORITY: AgentOpsAgentInteractionPriority = "medium";
const AGENT_INTERACTION_DEFAULT_STATUS: AgentOpsAgentInteractionStatus = "logged";
const AGENT_MEMORY_EXPORT_REPORT_PATH = "qa-agent/memory-sync/agent-memory-file-export-report.json";
const AGENT_MEMORY_REFRESH_PLAN_PATH = "qa-agent/memory-sync/agent-memory-refresh-plan.json";

type AgentMemoryFileExportReportSnapshot = {
  generatedAt?: string | null;
  dryRunSource?: string;
  filesCreated?: string[];
  skippedItems?: Array<{ agentId?: string }>;
  sensitiveWarningsCount?: number;
  liveSyncActive?: boolean;
  hermesAutomation?: boolean;
  codeGraphAutomation?: boolean;
  finalRulebooksCreated?: boolean;
};

type AgentMemorySyncDryRunSnapshot = {
  agents?: Array<{
    agentId: string;
    displayName: string;
    syntheticEmail: string;
    agentSkillSpecialty: string;
    targetFilePath: string;
    syncStatus?: string;
    sourceRecords?: {
      memoryRecordCount?: number;
      interactionRecordCount?: number;
    };
  }>;
};

const EMPTY_AGENT_MEMORY_FILE_EXPORT_REPORT: AgentMemoryFileExportReportSnapshot = {
  generatedAt: null,
  filesCreated: [],
  skippedItems: [],
  sensitiveWarningsCount: 0,
  liveSyncActive: false,
  hermesAutomation: false,
  codeGraphAutomation: false,
  finalRulebooksCreated: false,
};

const EMPTY_AGENT_MEMORY_SYNC_DRY_RUN: AgentMemorySyncDryRunSnapshot = {
  agents: [],
};

const EMPTY_AGENT_MEMORY_REFRESH_PLAN: AgentOpsMemoryRefreshPlan = {
  version: "1.0.0",
  generatedAt: null,
  dryRun: true,
  sourceDbRead: {
    enabled: false,
    reason: "Memory-sync export report has not been generated yet.",
  },
  previousExportReportPath: AGENT_MEMORY_EXPORT_REPORT_PATH,
  previousMemoryFilesFolder: "qa-agent/agent-memory",
  draftOutputFolder: "qa-agent/agent-memory/drafts",
  agents: [],
  summary: {
    totalAgents: 0,
    agentsWithChanges: 0,
    agentsNoChange: 0,
    sensitiveWarningsCount: 0,
    skippedItemsCount: 0,
    draftFilesCreated: 0,
  },
  safety: {
    liveSyncActive: false,
    hermesAutomation: false,
    codeGraphAutomation: false,
    finalRulebooksCreated: false,
  },
  recommendedAction:
    "Run npm run qa:agentops-agent-memory-export-files and npm run qa:agentops-agent-memory-refresh-plan to generate local snapshots.",
};

const MEMORY_REFRESH_DECISIONS: readonly AgentOpsMemoryRefreshDecision[] = [
  "approve_draft_generation",
  "review_later",
  "needs_cleanup",
  "reject_refresh",
  "approve_future_manual_export",
] as const;

const AGENT_STATUS_REVIEW_DECISIONS = [
  "reviewed",
  "needs_memory",
  "needs_focus",
  "needs_cleanup",
  "hold",
] as const;
const AGENT_TIMELINE_REVIEW_DECISIONS = [
  "reviewed",
  "needs_follow_up",
  "archive_note",
  "keep_active",
] as const;
const FOCUS_RANKING_DECISIONS = [
  "approve_preview",
  "reject_preview",
  "apply_later",
  "needs_adjustment",
  "hold",
] as const;
const FOCUS_DIRECTIVE_SOURCES: readonly AgentOpsFocusDirectiveSource[] = [
  "piter_remark",
  "agent_memory",
  "agent_interaction",
  "owner_feedback",
  "scan_result",
  "manual_entry",
] as const;
const FOCUS_DIRECTIVE_TYPES: readonly AgentOpsFocusDirectiveType[] = [
  "prioritize_module",
  "deprioritize_module",
  "prioritize_issue_type",
  "deprioritize_issue_type",
  "prioritize_agent",
  "assign_agent_focus",
  "ignore_pattern",
  "raise_severity_pattern",
  "lower_severity_pattern",
  "workflow_focus",
  "route_focus",
  "design_focus",
  "permission_focus",
  "business_logic_focus",
  "stability_focus",
] as const;
const FOCUS_DIRECTIVE_TARGETS: readonly AgentOpsFocusDirectiveTarget[] = [
  "module",
  "route",
  "issueType",
  "agentId",
  "severity",
  "workflow",
  "keyword",
] as const;

type SyntheticBrowserUserRegistry = {
  users?: Array<{
    qaUserId?: string;
    displayName?: string;
    email?: string;
    intendedPlatformRole?: string;
    intendedAgentUse?: string;
    allowedModules?: string[];
    blockedModules?: string[];
    agentOpsOwnerAccess?: boolean;
    profileRole?: string;
    profileStatus?: string;
    notes?: string;
  }>;
};

const QA_SPECIALTY_BY_QA_USER_ID: Record<string, string> = {
  "agentops-owner": "Final Council Chair and Implementation Planner",
  "platform-admin": "Design and UX Excellence Agent",
  "finance-admin": "Business Logic and Operations Agent",
  "finance-viewer": "Finance Workflow Agent",
  employee: "Synthetic User QA Agent",
  "hr-admin": "HR and People Operations Agent",
  "hr-employee": "HR and People Operations Agent",
  manager: "Business Logic and Operations Agent",
  "ai-user": "Personal AI Productivity Agent",
  guest: "Security, Permissions, and Tenant Isolation Agent",
  "vendor-external": "Security, Permissions, and Tenant Isolation Agent",
  "tenant-admin": "Security, Permissions, and Tenant Isolation Agent",
};

function normalizeMemoryMetadata(
  value: unknown,
): {
  source: AgentOpsAgentMemorySource | null;
  priority: AgentOpsAgentMemoryPriority | null;
  inputMemoryType: AgentOpsAgentMemoryInputType | null;
  note: string | null;
  title: string | null;
  ownerFacingType: import("./types").AgentOpsMemoryOwnerFacingType | null;
  scope: import("./types").AgentOpsMemoryScope | null;
  approvalStatus: import("./types").AgentOpsMemoryApprovalStatus | null;
  fileStoragePath: string | null;
  fileName: string | null;
} {
  const metadata = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const source =
    metadata.source === "piter" ||
    metadata.source === "agentops" ||
    metadata.source === "cursor_sync_later"
      ? metadata.source
      : null;
  const priority =
    metadata.priority === "low" || metadata.priority === "medium" || metadata.priority === "high"
      ? metadata.priority
      : null;
  const inputMemoryType =
    metadata.inputMemoryType === "instruction" ||
    metadata.inputMemoryType === "preference" ||
    metadata.inputMemoryType === "focus" ||
    metadata.inputMemoryType === "correction" ||
    metadata.inputMemoryType === "feature_idea" ||
    metadata.inputMemoryType === "blocked_behavior"
      ? metadata.inputMemoryType
      : null;
  const note = typeof metadata.note === "string" ? metadata.note : null;
  const title = typeof metadata.title === "string" ? metadata.title : null;
  const ownerFacingTypeCandidates = [
    "instruction",
    "approved_fact",
    "procedure",
    "preference",
    "website_architecture_note",
    "qa_rule",
    "known_issue",
    "lesson_learned",
    "reference_file",
  ] as const;
  const ownerFacingType =
    typeof metadata.ownerFacingType === "string" &&
    ownerFacingTypeCandidates.includes(
      metadata.ownerFacingType as (typeof ownerFacingTypeCandidates)[number],
    )
      ? (metadata.ownerFacingType as import("./types").AgentOpsMemoryOwnerFacingType)
      : null;
  const scope =
    metadata.scope === "private" || metadata.scope === "shared" || metadata.scope === "global"
      ? metadata.scope
      : null;
  const approvalStatus =
    metadata.approvalStatus === "active" ||
    metadata.approvalStatus === "disabled" ||
    metadata.approvalStatus === "pending_approval" ||
    metadata.approvalStatus === "rejected" ||
    metadata.approvalStatus === "archived"
      ? metadata.approvalStatus
      : null;
  const fileStoragePath =
    typeof metadata.fileStoragePath === "string" ? metadata.fileStoragePath : null;
  const fileName = typeof metadata.fileName === "string" ? metadata.fileName : null;
  return {
    source,
    priority,
    inputMemoryType,
    note,
    title,
    ownerFacingType,
    scope,
    approvalStatus,
    fileStoragePath,
    fileName,
  };
}

function normalizeManagedAgentStatus(
  statusValue: unknown,
  memoryCount: number,
  profileStatus?: string,
): AgentOpsManagedAgentStatus {
  if (
    statusValue === "active" ||
    statusValue === "quiet" ||
    statusValue === "needs_memory" ||
    statusValue === "blocked" ||
    statusValue === "disabled"
  ) {
    return statusValue;
  }
  if (profileStatus && profileStatus !== "active") return "disabled";
  if (memoryCount === 0) return "needs_memory";
  return "active";
}

function isAgentInteractionMessageType(value: unknown): value is AgentOpsAgentInteractionMessageType {
  return (
    value === "piter_note" ||
    value === "status_question" ||
    value === "feature_idea" ||
    value === "correction" ||
    value === "focus_directive" ||
    value === "fix_instruction" ||
    value === "test_instruction" ||
    value === "memory_update"
  );
}

function normalizeInteractionSource(value: unknown): AgentOpsAgentInteractionSource {
  if (value === "agentops" || value === "cursor_sync_later") return value;
  return "piter";
}

function normalizeInteractionPriority(value: unknown): AgentOpsAgentInteractionPriority {
  if (value === "low" || value === "high") return value;
  return "medium";
}

function normalizeInteractionStatus(value: unknown): AgentOpsAgentInteractionStatus {
  if (
    value === "acknowledged_later" ||
    value === "needs_agent_review" ||
    value === "ready_for_future_sync"
  ) {
    return value;
  }
  return "logged";
}

function parseAgentInteractionRow(row: {
  id: string;
  owner_user_id: string | null;
  remark: string | null;
  created_at: string;
  metadata?: unknown;
}): AgentOpsAgentInteractionItem | null {
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : null;
  if (!metadata || metadata.action !== "agent_interaction_note") return null;
  const agentId = typeof metadata.agentId === "string" ? metadata.agentId : null;
  if (!agentId) return null;
  const messageType = metadata.messageType;
  if (!isAgentInteractionMessageType(messageType)) return null;
  return {
    id: row.id,
    agentId,
    messageType,
    content: row.remark?.trim() || "",
    createdAt: row.created_at,
    createdBy: row.owner_user_id ?? "unknown",
    source: normalizeInteractionSource(metadata.source),
    priority: normalizeInteractionPriority(metadata.priority),
    status: normalizeInteractionStatus(metadata.interactionStatus),
  };
}

function normalizeTimelinePriority(value: unknown): AgentOpsAgentInteractionPriority {
  if (value === "low" || value === "high") return value;
  return "medium";
}

function normalizeTimelineSource(value: unknown): AgentOpsAgentTimelineSource {
  if (value === "piter" || value === "agentops" || value === "cursor_sync_later") return value;
  return "system_report";
}

function normalizeTimelineStatus(value: unknown): AgentOpsAgentTimelineStatus {
  if (value === "reviewed" || value === "needs_follow_up" || value === "archived") return value;
  return "logged";
}

function mapMemoryTypeToTimelineEventType(memoryType: string): AgentOpsAgentTimelineEventType {
  if (memoryType.includes("focus")) return "focus_directive";
  if (memoryType.includes("correction")) return "correction";
  if (memoryType.includes("feature")) return "feature_idea";
  return "memory_added";
}

function normalizeMemoryFileStatus(
  fileExists: boolean,
  sourceSyncStatus: unknown,
): AgentOpsAgentMemoryFileStatus {
  if (!fileExists) return "missing";
  if (sourceSyncStatus === "dry_run_only" || sourceSyncStatus === "not_generated") return "not_generated";
  if (sourceSyncStatus === "stale") return "stale";
  return "created";
}

function normalizeMemorySafetyStatus(
  sensitiveWarningsCount: number,
  skippedItemsCount: number,
): AgentOpsAgentMemoryFileSafetyStatus {
  if (sensitiveWarningsCount > 0) return "blocked";
  if (skippedItemsCount > 0) return "warning";
  return "safe";
}

/** Stage 16 foundation: list 12 managed synthetic agents with memory summary. */
export async function getAgentOpsManagedAgents(): Promise<
  AgentOpsReadResult<AgentOpsManagedAgent[]>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const userRegistry = syntheticBrowserUsers as SyntheticBrowserUserRegistry;
    const users = userRegistry.users ?? [];
    if (users.length === 0) return ok([]);

    const agentIds = users.map((user) => (user.qaUserId ?? "").trim()).filter(Boolean);

    const [memoryResult, interactionResult, statusUpdateResult, latestRunResult] = await Promise.all([
      supabase
        .from("agentops_agent_memory")
        .select("id, agent_id, memory_type, memory_text, confidence_score, active, created_at, metadata")
        .in("agent_id", agentIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("agentops_owner_feedback")
        .select("id, remark, metadata, created_at")
        .contains("metadata", { action: "agent_interaction_note" })
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("agentops_owner_feedback")
        .select("id, remark, metadata, created_at")
        .contains("metadata", { action: "agent_status_update" })
        .order("created_at", { ascending: false })
        .limit(500),
      getAgentOpsLatestRun(),
    ]);

    if (memoryResult.error) return fail(memoryResult.error);
    if (interactionResult.error) return fail(interactionResult.error);
    if (statusUpdateResult.error) return fail(statusUpdateResult.error);
    if (latestRunResult.error) return fail(latestRunResult.error);

    const memoryRows = (memoryResult.data ?? []) as Array<{
      id: string;
      agent_id: string;
      memory_type: string;
      memory_text: string;
      confidence_score: number | null;
      active: boolean;
      created_at: string;
      metadata?: unknown;
    }>;
    const interactions = (interactionResult.data ?? []) as Array<{
      remark: string | null;
      metadata?: unknown;
      created_at: string;
    }>;
    const statusUpdates = (statusUpdateResult.data ?? []) as Array<{
      remark: string | null;
      metadata?: unknown;
      created_at: string;
    }>;
    const latestRun = latestRunResult.data;

    const memoryByAgent = new Map<string, typeof memoryRows>();
    for (const row of memoryRows) {
      const list = memoryByAgent.get(row.agent_id) ?? [];
      list.push(row);
      memoryByAgent.set(row.agent_id, list);
    }

    const latestInteractionByAgent = new Map<
      string,
      { summary: string; statusValue: unknown; messageType: string | null }
    >();
    for (const row of interactions) {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null;
      const agentId = typeof metadata?.agentId === "string" ? metadata.agentId : null;
      if (!agentId || latestInteractionByAgent.has(agentId)) continue;
      latestInteractionByAgent.set(agentId, {
        summary: row.remark?.trim() || "Interaction note recorded.",
        statusValue: metadata?.agentStatus,
        messageType: typeof metadata?.messageType === "string" ? metadata.messageType : null,
      });
    }

    const latestStatusUpdateByAgent = new Map<string, AgentOpsManagedAgentStatus>();
    for (const row of statusUpdates) {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null;
      const agentId = typeof metadata?.agentId === "string" ? metadata.agentId : null;
      if (!agentId || latestStatusUpdateByAgent.has(agentId)) continue;
      const rawStatus = metadata?.status ?? metadata?.agentStatus;
      if (
        rawStatus === "active" ||
        rawStatus === "quiet" ||
        rawStatus === "needs_memory" ||
        rawStatus === "blocked" ||
        rawStatus === "disabled"
      ) {
        latestStatusUpdateByAgent.set(agentId, rawStatus);
      }
    }

    const managed = users.map((user) => {
      const agentId = (user.qaUserId ?? "").trim();
      const agentMemories = memoryByAgent.get(agentId) ?? [];
      const activeMemories = agentMemories.filter((row) => row.active !== false);
      const latestFocus = activeMemories.find(
        (row) =>
          row.memory_type === "focus_rule" ||
          normalizeMemoryMetadata(row.metadata).inputMemoryType === "focus",
      );
      const latestInteraction = latestInteractionByAgent.get(agentId);
      const memoryCount = activeMemories.length;
      const explicitStatus = latestStatusUpdateByAgent.get(agentId);
      const status = explicitStatus ??
        normalizeManagedAgentStatus(
          latestInteraction?.statusValue,
          memoryCount,
          user.profileStatus,
        );
      const lastRunStatus = latestRun?.status ?? "unknown";

      const rawAppRole = (user.profileRole ?? user.intendedPlatformRole ?? "unknown")
        .trim()
        .toLowerCase();
      const appRole =
        rawAppRole === "admin" ||
        rawAppRole === "manager" ||
        rawAppRole === "employee" ||
        rawAppRole === "guest"
          ? rawAppRole
          : "unknown";

      return {
        agentId,
        displayName: user.displayName?.trim() || agentId,
        syntheticEmail: user.email?.trim() || "—",
        appRole,
        qaSpecialty: QA_SPECIALTY_BY_QA_USER_ID[agentId] ?? "General synthetic QA",
        purpose: user.intendedAgentUse?.trim() || "QA workflow support",
        allowedModules: user.allowedModules ?? [],
        blockedModules: user.blockedModules ?? [],
        agentOpsOwnerAccess: Boolean(user.agentOpsOwnerAccess),
        memoryMode: "Database-only" as const,
        memoryCount,
        currentFocus: latestFocus?.memory_text?.trim() || null,
        lastActivitySummary: latestInteraction?.summary ?? null,
        lastRunStatus,
        latestFindingsCount: latestRun?.total_findings ?? 0,
        status,
      } satisfies AgentOpsManagedAgent;
    });

    return ok(managed);
  } catch (error) {
    return fail(error);
  }
}

/** Stage 16 foundation: owner adds database-only agent memory note. */
export async function addAgentOpsAgentMemory(
  input: AgentOpsAgentMemoryInput,
): Promise<AgentOpsWriteResult<{ memoryId: string }>> {
  try {
    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const agentId = input.agentId?.trim();
    const content = input.content?.trim();
    if (!agentId) return writeFail("agentId is required.");
    if (!content) return writeFail("content is required.");

    const mappedType = MEMORY_TYPE_MAP[input.memoryType];
    if (!mappedType) return writeFail("Invalid memoryType.");

    const activateImmediately = input.activateImmediately !== false;
    const approvalStatus =
      input.approvalStatus ??
      (activateImmediately ? "active" : ("pending_approval" as const));

    const { data, error } = await supabase
      .from("agentops_agent_memory")
      .insert({
        agent_id: agentId,
        memory_type: mappedType,
        memory_text: content,
        source_finding_id: null,
        source_feedback_id: null,
        confidence_score: MEMORY_PRIORITY_CONFIDENCE[input.priority],
        active: activateImmediately && approvalStatus === "active",
        metadata: {
          action: "agent_memory_note",
          source: input.source,
          priority: input.priority,
          inputMemoryType: input.memoryType,
          note: input.note?.trim() || null,
          title: input.title?.trim() || null,
          ownerFacingType: input.ownerFacingType ?? null,
          scope: input.scope ?? "private",
          approvalStatus,
          fileStoragePath: input.fileStoragePath ?? null,
          fileName: input.fileName ?? null,
          ownerUserId: userResult.data,
          memoryMode: "Database-only",
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);
    return writeOk({ memoryId: data.id as string });
  } catch (error) {
    return writeFail(error);
  }
}

/** Owner enable/disable or approval status for one agent memory row (no Hermes auto-write). */
export async function setAgentOpsAgentMemoryActive(input: {
  memoryId: string;
  agentId: string;
  active: boolean;
  approvalStatus?: import("./types").AgentOpsMemoryApprovalStatus;
}): Promise<AgentOpsWriteResult<{ memoryId: string }>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);
    const memoryId = input.memoryId?.trim();
    const agentId = input.agentId?.trim();
    if (!memoryId) return writeFail("memoryId is required.");
    if (!agentId) return writeFail("agentId is required.");

    const { data: existing, error: readError } = await supabase
      .from("agentops_agent_memory")
      .select("id, metadata")
      .eq("id", memoryId)
      .eq("agent_id", agentId)
      .maybeSingle();
    if (readError) return writeFail(readError);
    if (!existing) return writeFail("Memory row not found for this agent.");

    const metadata =
      existing.metadata && typeof existing.metadata === "object"
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};
    const approvalStatus =
      input.approvalStatus ?? (input.active ? "active" : ("disabled" as const));
    metadata.approvalStatus = approvalStatus;

    const { error } = await supabase
      .from("agentops_agent_memory")
      .update({
        active: input.active && approvalStatus === "active",
        metadata,
      })
      .eq("id", memoryId)
      .eq("agent_id", agentId);
    if (error) return writeFail(error);
    return writeOk({ memoryId });
  } catch (error) {
    return writeFail(error);
  }
}

/** Owner edit of title/content/metadata for one agent memory row. */
export async function updateAgentOpsAgentMemory(input: {
  memoryId: string;
  agentId: string;
  content?: string;
  title?: string;
  note?: string;
  scope?: import("./types").AgentOpsMemoryScope;
  ownerFacingType?: import("./types").AgentOpsMemoryOwnerFacingType;
  approvalStatus?: import("./types").AgentOpsMemoryApprovalStatus;
  active?: boolean;
}): Promise<AgentOpsWriteResult<{ memoryId: string }>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);
    const memoryId = input.memoryId?.trim();
    const agentId = input.agentId?.trim();
    if (!memoryId) return writeFail("memoryId is required.");
    if (!agentId) return writeFail("agentId is required.");

    const { data: existing, error: readError } = await supabase
      .from("agentops_agent_memory")
      .select("id, metadata, active")
      .eq("id", memoryId)
      .eq("agent_id", agentId)
      .maybeSingle();
    if (readError) return writeFail(readError);
    if (!existing) return writeFail("Memory row not found for this agent.");

    const metadata =
      existing.metadata && typeof existing.metadata === "object"
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};
    if (input.title !== undefined) metadata.title = input.title.trim() || null;
    if (input.note !== undefined) metadata.note = input.note.trim() || null;
    if (input.scope !== undefined) metadata.scope = input.scope;
    if (input.ownerFacingType !== undefined) metadata.ownerFacingType = input.ownerFacingType;
    if (input.approvalStatus !== undefined) metadata.approvalStatus = input.approvalStatus;

    const patch: Record<string, unknown> = { metadata };
    if (input.content !== undefined) {
      const content = input.content.trim();
      if (!content) return writeFail("content is required.");
      patch.memory_text = content;
    }
    if (input.active !== undefined) {
      patch.active =
        input.active && (input.approvalStatus ?? metadata.approvalStatus) === "active";
    } else if (input.approvalStatus === "active") {
      patch.active = true;
    } else if (
      input.approvalStatus === "disabled" ||
      input.approvalStatus === "pending_approval" ||
      input.approvalStatus === "rejected" ||
      input.approvalStatus === "archived"
    ) {
      patch.active = false;
    }

    const { error } = await supabase
      .from("agentops_agent_memory")
      .update(patch)
      .eq("id", memoryId)
      .eq("agent_id", agentId);
    if (error) return writeFail(error);
    return writeOk({ memoryId });
  } catch (error) {
    return writeFail(error);
  }
}

/** Chat memory approval — Yes writes to one agent only; No logs rejection metadata. */
export async function commitAgentOpsMemoryFromChatApproval(input: {
  agentId: string;
  content: string;
  chatScope: import("./types").AgentOpsChatScope;
  roomId?: string | null;
  approved: boolean;
  note?: string;
}): Promise<AgentOpsWriteResult<{ memoryId?: string; feedbackId?: string }>> {
  try {
    const agentId = input.agentId?.trim();
    const content = input.content?.trim();
    if (!agentId) return writeFail("agentId is required.");
    if (!content) return writeFail("content is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    if (input.approved) {
      const memoryResult = await addAgentOpsAgentMemory({
        agentId,
        memoryType: "instruction",
        content,
        source: "piter",
        priority: "medium",
        note:
          input.note?.trim() ||
          `Approved from ${input.chatScope} chat${input.roomId ? ` (${input.roomId})` : ""}.`,
      });
      if (memoryResult.error || !memoryResult.data) {
        return writeFail(memoryResult.error ?? "Could not save approved memory.");
      }
      return writeOk({ memoryId: memoryResult.data.memoryId });
    }

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: `Memory approval rejected for ${agentId}.`,
        metadata: {
          action: "memory_approval_rejected",
          agentId,
          chatScope: input.chatScope,
          roomId: input.roomId?.trim() || null,
          suggestedContent: content.slice(0, 500),
          note: input.note?.trim() || null,
          stagingOnly: true,
          manualFirst: true,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);
    return writeOk({ feedbackId: data.id as string });
  } catch (error) {
    return writeFail(error);
  }
}

/** Owner-reviewed creative proposal from agent chat (no auto-issue creation). */
export async function recordAgentOpsCreativeProposal(input: {
  agentId: string;
  proposalType: "problem_hypothesis" | "feature_idea" | "test_idea";
  title: string;
  summary: string;
  suggestedRoute?: string | null;
  confidence?: "low" | "medium" | "high";
  chatScope: import("./types").AgentOpsChatScope;
  roomId?: string | null;
}): Promise<AgentOpsWriteResult<{ feedbackId: string }>> {
  try {
    const agentId = input.agentId?.trim();
    const title = input.title?.trim();
    const summary = input.summary?.trim();
    if (!agentId) return writeFail("agentId is required.");
    if (!title) return writeFail("title is required.");
    if (!summary) return writeFail("summary is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: title,
        metadata: {
          action: "agent_creative_proposal",
          agentId,
          proposalType: input.proposalType,
          title,
          summary,
          suggestedRoute: input.suggestedRoute?.trim() || null,
          confidence: input.confidence ?? "medium",
          chatScope: input.chatScope,
          roomId: input.roomId?.trim() || null,
          reviewRequired: true,
          autoIssueCreation: false,
          stagingOnly: true,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);
    return writeOk({ feedbackId: data.id as string });
  } catch (error) {
    return writeFail(error);
  }
}

const AGENTOPS_CHAT_ATTACHMENT_BUCKET = "agentops-chat-attachments";

/** Upload chat attachment to Supabase Storage for AgentOps messenger. */
export async function uploadAgentOpsChatAttachment(input: {
  file: File;
  chatScope: import("./types").AgentOpsChatScope;
  roomId?: string | null;
}): Promise<
  AgentOpsReadResult<{
    fileName: string;
    fileType: string;
    storagePath: string;
    publicUrl: string | null;
  }>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return fail(userResult.error ?? "Could not resolve current owner user.");
    }

    const safeName = input.file.name.replace(/[^\w.\-()+ ]+/g, "_");
    const storagePath = `${input.chatScope}/${input.roomId ?? "general"}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(AGENTOPS_CHAT_ATTACHMENT_BUCKET)
      .upload(storagePath, input.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: input.file.type || undefined,
      });

    if (uploadError) {
      return fail(uploadError.message);
    }

    const { data: publicData } = supabase.storage
      .from(AGENTOPS_CHAT_ATTACHMENT_BUCKET)
      .getPublicUrl(storagePath);

    return ok({
      fileName: input.file.name,
      fileType: input.file.type || "application/octet-stream",
      storagePath,
      publicUrl: publicData.publicUrl ?? null,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Stage 16 foundation: owner fetches one managed agent memory history. */
export async function getAgentOpsAgentMemory(
  agentId: string,
): Promise<AgentOpsReadResult<AgentOpsManagedAgentMemoryItem[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const resolvedAgentId = agentId.trim();
    if (!resolvedAgentId) return fail("agentId is required.");

    const { data, error } = await supabase
      .from("agentops_agent_memory")
      .select("id, agent_id, memory_type, memory_text, active, confidence_score, created_at, metadata")
      .eq("agent_id", resolvedAgentId)
      .order("created_at", { ascending: false });

    if (error) return fail(error);

    const mapped = ((data ?? []) as Array<{
      id: string;
      agent_id: string;
      memory_type: string;
      memory_text: string;
      active: boolean;
      confidence_score: number | null;
      created_at: string;
      metadata?: unknown;
    }>).map((row) => {
      const normalized = normalizeMemoryMetadata(row.metadata);
      return {
        id: row.id,
        agentId: row.agent_id,
        memoryType: row.memory_type,
        memoryText: row.memory_text,
        active: row.active,
        confidenceScore: row.confidence_score,
        createdAt: row.created_at,
        source: normalized.source,
        priority: normalized.priority,
        inputMemoryType: normalized.inputMemoryType,
        note: normalized.note,
        title: normalized.title,
        ownerFacingType: normalized.ownerFacingType,
        scope: normalized.scope,
        approvalStatus:
          normalized.approvalStatus ??
          (row.active ? "active" : ("pending_approval" as const)),
        fileStoragePath: normalized.fileStoragePath,
        fileName: normalized.fileName,
      } satisfies AgentOpsManagedAgentMemoryItem;
    });

    return ok(mapped);
  } catch (error) {
    return fail(error);
  }
}

/** Stage 16B foundation: owner reads interaction log for one agent. */
export async function getAgentOpsAgentInteractions(
  agentId: string,
): Promise<AgentOpsReadResult<AgentOpsAgentInteractionItem[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);
    const resolvedAgentId = agentId.trim();
    if (!resolvedAgentId) return fail("agentId is required.");

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("id, owner_user_id, remark, metadata, created_at")
      .contains("metadata", { action: "agent_interaction_note", agentId: resolvedAgentId })
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) return fail(error);

    const interactions = ((data ?? []) as Array<{
      id: string;
      owner_user_id: string | null;
      remark: string | null;
      metadata?: unknown;
      created_at: string;
    }>)
      .map(parseAgentInteractionRow)
      .filter((item): item is AgentOpsAgentInteractionItem => Boolean(item));
    return ok(interactions);
  } catch (error) {
    return fail(error);
  }
}

/** Stage 16B foundation: owner reads status summary for one agent. */
export async function getAgentOpsAgentStatusSummary(
  agentId: string,
): Promise<AgentOpsReadResult<AgentOpsAgentStatusSummary>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);
    const resolvedAgentId = agentId.trim();
    if (!resolvedAgentId) return fail("agentId is required.");

    const [memoryResult, interactionResult, latestRunResult] = await Promise.all([
      getAgentOpsAgentMemory(resolvedAgentId),
      getAgentOpsAgentInteractions(resolvedAgentId),
      getAgentOpsLatestRun(),
    ]);
    if (memoryResult.error) return fail(memoryResult.error);
    if (interactionResult.error) return fail(interactionResult.error);
    if (latestRunResult.error) return fail(latestRunResult.error);

    const memories = memoryResult.data ?? [];
    const interactions = interactionResult.data ?? [];
    const latestInteraction = interactions[0] ?? null;
    const latestInstruction =
      interactions.find(
        (item) =>
          item.messageType === "focus_directive" ||
          item.messageType === "fix_instruction" ||
          item.messageType === "test_instruction" ||
          item.messageType === "memory_update",
      ) ?? null;
    const latestFeatureIdea =
      interactions.find((item) => item.messageType === "feature_idea") ?? null;
    const latestCorrection =
      interactions.find((item) => item.messageType === "correction") ?? null;
    const latestFocus =
      memories.find(
        (item) => item.memoryType === "focus_rule" || item.inputMemoryType === "focus",
      )?.memoryText ?? null;

    const currentStatus = normalizeManagedAgentStatus(
      latestInteraction?.status === "needs_agent_review"
        ? "blocked"
        : latestInteraction?.status === "ready_for_future_sync"
          ? "active"
          : null,
      memories.length,
    );

    return ok({
      agentId: resolvedAgentId,
      currentStatus,
      currentFocus: latestFocus,
      memoryCount: memories.length,
      interactionCount: interactions.length,
      latestInteraction,
      latestInstruction,
      latestFeatureIdea,
      latestCorrection,
      latestRunSummary: latestRunResult.data?.summary ?? null,
      latestFindingsCount: latestRunResult.data?.total_findings ?? 0,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Stage 16E foundation: read-only memory file review status for all managed agents. */
export async function getAgentOpsAgentMemoryFileReview(): Promise<
  AgentOpsReadResult<{
    summary: AgentOpsAgentMemoryFileReviewSummary;
    items: AgentOpsAgentMemoryFileReviewItem[];
  }>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const exportReport = EMPTY_AGENT_MEMORY_FILE_EXPORT_REPORT;
    const dryRun = EMPTY_AGENT_MEMORY_SYNC_DRY_RUN;
    const snapshotNotGenerated = (dryRun.agents ?? []).length === 0;

    const createdPathSet = new Set((exportReport.filesCreated ?? []).map((path) => path.replaceAll("\\", "/")));
    const skippedByAgentCount = new Map<string, number>();
    for (const item of exportReport.skippedItems ?? []) {
      const key = item.agentId?.trim();
      if (!key) continue;
      skippedByAgentCount.set(key, (skippedByAgentCount.get(key) ?? 0) + 1);
    }

    const items: AgentOpsAgentMemoryFileReviewItem[] = (dryRun.agents ?? []).map((agent) => {
      const targetPathNormalized = agent.targetFilePath.replaceAll("\\", "/");
      const fileExists = createdPathSet.has(targetPathNormalized);
      const skippedItemsCount = skippedByAgentCount.get(agent.agentId) ?? 0;
      const sensitiveWarningsCount = 0;
      const fileStatus = normalizeMemoryFileStatus(fileExists, agent.syncStatus);
      const safetyStatus = normalizeMemorySafetyStatus(sensitiveWarningsCount, skippedItemsCount);
      const notes = fileExists
        ? "Static reviewed memory file exists from Stage 16D export."
        : snapshotNotGenerated
          ? "Memory-sync export report has not been generated yet."
          : "Memory file missing from last export report.";

      return {
        agentId: agent.agentId,
        displayName: agent.displayName,
        syntheticEmail: agent.syntheticEmail,
        agentSkillSpecialty: agent.agentSkillSpecialty,
        targetFilePath: agent.targetFilePath,
        fileExists,
        fileStatus,
        generatedAt: exportReport.generatedAt ?? null,
        memoryCount: agent.sourceRecords?.memoryRecordCount ?? 0,
        interactionCount: agent.sourceRecords?.interactionRecordCount ?? 0,
        skippedItemsCount,
        sensitiveWarningsCount,
        syncStatus: agent.syncStatus ?? "unknown",
        safetyStatus,
        notes,
      } satisfies AgentOpsAgentMemoryFileReviewItem;
    });

    const filesMissing = items.filter((item) => !item.fileExists).length;
    const summary: AgentOpsAgentMemoryFileReviewSummary = {
      totalAgents: items.length,
      filesCreated: items.filter((item) => item.fileExists).length,
      filesMissing,
      sensitiveWarningsCount: exportReport.sensitiveWarningsCount ?? 0,
      skippedItemsCount: (exportReport.skippedItems ?? []).length,
      liveSyncActive: Boolean(exportReport.liveSyncActive),
      hermesAutomation: Boolean(exportReport.hermesAutomation),
      codeGraphAutomation: Boolean(exportReport.codeGraphAutomation),
      finalRulebooksCreated: Boolean(exportReport.finalRulebooksCreated),
      latestExportReportPath: AGENT_MEMORY_EXPORT_REPORT_PATH,
    };

    return ok({ summary, items });
  } catch (error) {
    return fail(error);
  }
}

/** Stage 16F foundation: owner reads latest refresh plan metadata (read-only). */
export async function getAgentOpsAgentMemoryRefreshPlan(): Promise<
  AgentOpsReadResult<AgentOpsMemoryRefreshPlan>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);
    const plan = EMPTY_AGENT_MEMORY_REFRESH_PLAN;
    return ok({
      ...plan,
      previousExportReportPath:
        plan.previousExportReportPath || AGENT_MEMORY_EXPORT_REPORT_PATH,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Stage 16F foundation: owner records refresh review decision (metadata-only). */
export async function recordAgentOpsMemoryRefreshDecision(input: {
  agentId?: string;
  decision: AgentOpsMemoryRefreshDecision;
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string }>> {
  try {
    if (!(MEMORY_REFRESH_DECISIONS as readonly string[]).includes(input.decision)) {
      return writeFail("Invalid refresh decision.");
    }
    const ownerUserResult = await getAuthenticatedOwnerUserId();
    if (ownerUserResult.error || !ownerUserResult.data) {
      return writeFail(ownerUserResult.error ?? "Could not resolve current owner user.");
    }

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: ownerUserResult.data,
        feedback_type: "remark",
        remark:
          input.note?.trim() ||
          `Memory refresh decision recorded: ${input.decision.replaceAll("_", " ")}`,
        metadata: {
          action: "memory_refresh_decision",
          decision: input.decision,
          agentId: input.agentId?.trim() || null,
          latestRefreshPlanPath: AGENT_MEMORY_REFRESH_PLAN_PATH,
          noFileWrites: true,
          noLiveSync: true,
          noHermesAutomation: true,
          noCodeGraphAutomation: true,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);
    return writeOk({ feedbackId: data.id as string });
  } catch (error) {
    return writeFail(error);
  }
}

/** Stage 17 foundation: owner reads combined agent status dashboard. */
export async function getAgentOpsAgentStatusDashboard(): Promise<
  AgentOpsReadResult<{
    summary: AgentOpsAgentStatusDashboardSummary;
    items: AgentOpsAgentStatusDashboardItem[];
  }>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const [managedResult, memoryReviewResult, refreshPlanResult] = await Promise.all([
      getAgentOpsManagedAgents(),
      getAgentOpsAgentMemoryFileReview(),
      getAgentOpsAgentMemoryRefreshPlan(),
    ]);
    if (managedResult.error) return fail(managedResult.error);
    if (memoryReviewResult.error) return fail(memoryReviewResult.error);
    if (refreshPlanResult.error) return fail(refreshPlanResult.error);

    const managedAgents = managedResult.data ?? [];
    const memoryReview = memoryReviewResult.data;
    const refreshPlan = refreshPlanResult.data;
    const memoryReviewByAgent = new Map(
      (memoryReview?.items ?? []).map((item) => [item.agentId, item]),
    );
    const refreshByAgent = new Map(
      (refreshPlan?.agents ?? []).map((item) => [item.agentId, item]),
    );

    const interactionResults = await Promise.all(
      managedAgents.map(async (agent) => {
        const result = await getAgentOpsAgentInteractions(agent.agentId);
        return { agentId: agent.agentId, result };
      }),
    );
    const interactionsByAgent = new Map(
      interactionResults.map((entry) => [entry.agentId, entry.result.data ?? []]),
    );

    const now = Date.now();
    const items = managedAgents.map((agent) => {
      const interactions = interactionsByAgent.get(agent.agentId) ?? [];
      const latestInteraction = interactions[0] ?? null;
      const memoryFile = memoryReviewByAgent.get(agent.agentId);
      const refresh = refreshByAgent.get(agent.agentId);

      let needsAttention = false;
      let attentionReason: AgentOpsAgentStatusDashboardItem["attentionReason"] = "OK";

      if (agent.status === "blocked") {
        needsAttention = true;
        attentionReason = "Blocked";
      } else if (agent.status === "needs_memory" || agent.memoryCount === 0) {
        needsAttention = true;
        attentionReason = "No Memory";
      } else if (!agent.currentFocus) {
        needsAttention = true;
        attentionReason = "Needs Focus";
      } else if (memoryFile && !memoryFile.fileExists) {
        needsAttention = true;
        attentionReason = "Memory File Missing";
      } else if ((memoryFile?.sensitiveWarningsCount ?? 0) > 0) {
        needsAttention = true;
        attentionReason = "Sensitive Warning";
      } else if (refresh?.refreshStatus === "blocked_sensitive_content") {
        needsAttention = true;
        attentionReason = "Refresh Blocked";
      } else if (
        latestInteraction?.createdAt &&
        now - new Date(latestInteraction.createdAt).getTime() < 1000 * 60 * 60 * 24 * 3
      ) {
        attentionReason = "Recently Updated";
      }

      return {
        agentId: agent.agentId,
        displayName: agent.displayName,
        agentSkillSpecialty: agent.qaSpecialty,
        appRole: agent.appRole,
        status: agent.status,
        currentFocus: agent.currentFocus,
        memoryCount: agent.memoryCount,
        interactionCount: interactions.length,
        latestInteractionAt: latestInteraction?.createdAt ?? null,
        latestInteractionSummary: latestInteraction?.content ?? null,
        latestFindingCount: agent.latestFindingsCount,
        latestRunStatus: agent.lastRunStatus,
        memoryFileStatus:
          memoryFile?.fileStatus ??
          ((memoryReview?.summary.totalAgents ?? 0) > 0 ? "missing" : "not_generated"),
        refreshStatus: refresh?.refreshStatus ?? "skipped_no_memory",
        needsAttention,
        attentionReason,
      } satisfies AgentOpsAgentStatusDashboardItem;
    });

    const summary: AgentOpsAgentStatusDashboardSummary = {
      totalAgents: items.length,
      activeAgents: items.filter((item) => item.status === "active").length,
      quietAgents: items.filter((item) => item.status === "quiet").length,
      blockedAgents: items.filter((item) => item.status === "blocked").length,
      needsMemoryAgents: items.filter((item) => item.status === "needs_memory").length,
      agentsWithRecentInteractions: items.filter((item) => Boolean(item.latestInteractionAt)).length,
      agentsWithMemoryFiles: items.filter((item) => item.memoryFileStatus === "created").length,
      agentsNeedingAttention: items.filter((item) => item.needsAttention).length,
      sensitiveWarningsCount: memoryReview?.summary.sensitiveWarningsCount ?? 0,
      liveSyncActive: memoryReview?.summary.liveSyncActive ?? false,
      finalRulebooksCreated: memoryReview?.summary.finalRulebooksCreated ?? false,
    };

    return ok({ summary, items });
  } catch (error) {
    return fail(error);
  }
}

/** Stage 17 foundation: owner records status review decision metadata only. */
export async function recordAgentOpsAgentStatusReview(input: {
  agentId?: string;
  decision: (typeof AGENT_STATUS_REVIEW_DECISIONS)[number];
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string }>> {
  try {
    if (!(AGENT_STATUS_REVIEW_DECISIONS as readonly string[]).includes(input.decision)) {
      return writeFail("Invalid status review decision.");
    }
    const ownerResult = await getAuthenticatedOwnerUserId();
    if (ownerResult.error || !ownerResult.data) {
      return writeFail(ownerResult.error ?? "Could not resolve current owner user.");
    }
    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: ownerResult.data,
        feedback_type: "remark",
        remark:
          input.note?.trim() ||
          `Agent status review decision: ${input.decision.replaceAll("_", " ")}`,
        metadata: {
          action: "agent_status_review_decision",
          agentId: input.agentId?.trim() || null,
          decision: input.decision,
          noAutomation: true,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);
    return writeOk({ feedbackId: data.id as string });
  } catch (error) {
    return writeFail(error);
  }
}

/** Stage 17B foundation: owner reads per-agent timeline with summary. */
export async function getAgentOpsAgentTimeline(
  agentId: string,
): Promise<AgentOpsReadResult<{ items: AgentOpsAgentTimelineItem[]; summary: AgentOpsAgentTimelineSummary }>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);
    const resolvedAgentId = agentId.trim();
    if (!resolvedAgentId) return fail("agentId is required.");

    const [memoryResult, feedbackResult, managedResult] = await Promise.all([
      supabase
        .from("agentops_agent_memory")
        .select("id, memory_type, memory_text, metadata, created_at")
        .eq("agent_id", resolvedAgentId)
        .order("created_at", { ascending: false })
        .limit(400),
      supabase
        .from("agentops_owner_feedback")
        .select("id, remark, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(800),
      getAgentOpsManagedAgents(),
    ]);
    if (memoryResult.error) return fail(memoryResult.error);
    if (feedbackResult.error) return fail(feedbackResult.error);
    if (managedResult.error) return fail(managedResult.error);
    const managed = (managedResult.data ?? []).find((item) => item.agentId === resolvedAgentId);

    const memoryItems: AgentOpsAgentTimelineItem[] = (memoryResult.data ?? []).map((row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {};
      return {
        id: row.id,
        agentId: resolvedAgentId,
        eventType: mapMemoryTypeToTimelineEventType(String(row.memory_type ?? "")),
        title: `Memory: ${String(row.memory_type ?? "note").replaceAll("_", " ")}`,
        summary: String(row.memory_text ?? "").slice(0, 300) || "Memory entry",
        source: normalizeTimelineSource(metadata.source),
        priority: normalizeTimelinePriority(metadata.priority),
        createdAt: row.created_at,
        metadata,
        relatedPath: null,
        relatedIssueCode: null,
        status: normalizeTimelineStatus(metadata.timelineStatus),
      };
    });

    const feedbackItems: AgentOpsAgentTimelineItem[] = [];
    for (const row of feedbackResult.data ?? []) {
        const metadata =
          row.metadata && typeof row.metadata === "object"
            ? (row.metadata as Record<string, unknown>)
            : {};
        const metadataAgentId = typeof metadata.agentId === "string" ? metadata.agentId : null;
        const action = typeof metadata.action === "string" ? metadata.action : "";
        if (
          metadataAgentId !== resolvedAgentId &&
          action !== "memory_refresh_decision" &&
          action !== "agent_status_review_decision" &&
          action !== "agent_timeline_review"
        ) {
          continue;
        }

        let eventType: AgentOpsAgentTimelineEventType = "interaction_note";
        if (action === "agent_status_update") eventType = "status_change";
        else if (action === "memory_refresh_decision") eventType = "memory_refresh_decision";
        else if (action === "memory_file_review_decision") eventType = "memory_file_review";
        else if (action === "import_review_decision") eventType = "import_review_decision";
        else if (action === "queue_health_decision") eventType = "queue_health_decision";
        else if (action === "scheduler_preparation_decision") eventType = "scheduler_decision";
        else if (action === "cursor_handoff_created") eventType = "cursor_handoff";
        else if (action === "verification_request_approved") eventType = "verification_request";

        feedbackItems.push({
          id: row.id,
          agentId: metadataAgentId ?? resolvedAgentId,
          eventType,
          title: action ? action.replaceAll("_", " ") : "Owner feedback",
          summary: String(row.remark ?? "").slice(0, 300) || "Feedback entry",
          source: normalizeTimelineSource(metadata.source),
          priority: normalizeTimelinePriority(metadata.priority),
          createdAt: row.created_at,
          metadata,
          relatedPath:
            typeof metadata.planPath === "string"
              ? metadata.planPath
              : typeof metadata.latestRefreshPlanPath === "string"
                ? metadata.latestRefreshPlanPath
                : null,
          relatedIssueCode:
            typeof metadata.issueCode === "string" ? metadata.issueCode : null,
          status: normalizeTimelineStatus(metadata.timelineStatus),
        } satisfies AgentOpsAgentTimelineItem);
      }

    const items = [...memoryItems, ...feedbackItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const summary: AgentOpsAgentTimelineSummary = {
      agentId: resolvedAgentId,
      totalEvents: items.length,
      latestEventAt: items[0]?.createdAt ?? null,
      memoryEvents: items.filter(
        (item) =>
          item.eventType === "memory_added" ||
          item.eventType === "focus_directive" ||
          item.eventType === "correction" ||
          item.eventType === "feature_idea",
      ).length,
      interactionEvents: items.filter(
        (item) =>
          item.eventType === "interaction_note" ||
          item.eventType === "fix_instruction" ||
          item.eventType === "test_instruction",
      ).length,
      decisionEvents: items.filter(
        (item) =>
          item.eventType === "memory_file_review" ||
          item.eventType === "memory_refresh_decision" ||
          item.eventType === "import_review_decision" ||
          item.eventType === "queue_health_decision" ||
          item.eventType === "scheduler_decision",
      ).length,
      needsFollowUpCount: items.filter((item) => item.status === "needs_follow_up").length,
      latestStatus: managed?.status ?? null,
      latestFocus: managed?.currentFocus ?? null,
    };

    return ok({ items, summary });
  } catch (error) {
    return fail(error);
  }
}

/** Stage 17B foundation: owner records timeline review decision metadata. */
export async function recordAgentOpsAgentTimelineReview(input: {
  agentId: string;
  timelineItemId?: string;
  decision: (typeof AGENT_TIMELINE_REVIEW_DECISIONS)[number];
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string }>> {
  try {
    if (!(AGENT_TIMELINE_REVIEW_DECISIONS as readonly string[]).includes(input.decision)) {
      return writeFail("Invalid timeline review decision.");
    }
    const ownerResult = await getAuthenticatedOwnerUserId();
    if (ownerResult.error || !ownerResult.data) {
      return writeFail(ownerResult.error ?? "Could not resolve current owner user.");
    }
    const agentId = input.agentId?.trim();
    if (!agentId) return writeFail("agentId is required.");

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: ownerResult.data,
        feedback_type: "remark",
        remark:
          input.note?.trim() ||
          `Timeline review decision: ${input.decision.replaceAll("_", " ")}`,
        metadata: {
          action: "agent_timeline_review",
          agentId,
          timelineItemId: input.timelineItemId ?? null,
          decision: input.decision,
          noAutomation: true,
          noFileWrites: true,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);
    return writeOk({ feedbackId: data.id as string });
  } catch (error) {
    return writeFail(error);
  }
}

/** Optional Stage 17B: quick latest-event overview for all managed agents. */
export async function getAgentOpsAgentTimelineOverview(): Promise<
  AgentOpsReadResult<Array<{ agentId: string; latestEventAt: string | null; totalEvents: number }>>
> {
  try {
    const managedResult = await getAgentOpsManagedAgents();
    if (managedResult.error) return fail(managedResult.error);
    const agents = managedResult.data ?? [];
    const timelineResults = await Promise.all(
      agents.map(async (agent) => {
        const result = await getAgentOpsAgentTimeline(agent.agentId);
        return {
          agentId: agent.agentId,
          latestEventAt: result.data?.summary.latestEventAt ?? null,
          totalEvents: result.data?.summary.totalEvents ?? 0,
        };
      }),
    );
    return ok(timelineResults);
  } catch (error) {
    return fail(error);
  }
}

function isFocusDirectiveType(value: unknown): value is AgentOpsFocusDirectiveType {
  return (FOCUS_DIRECTIVE_TYPES as readonly string[]).includes(String(value));
}

function isFocusDirectiveTarget(value: unknown): value is AgentOpsFocusDirectiveTarget {
  return (FOCUS_DIRECTIVE_TARGETS as readonly string[]).includes(String(value));
}

function normalizeDirectiveSource(value: unknown): AgentOpsFocusDirectiveSource {
  return (FOCUS_DIRECTIVE_SOURCES as readonly string[]).includes(String(value))
    ? (value as AgentOpsFocusDirectiveSource)
    : "owner_feedback";
}

/** Stage 18 foundation: owner reads active focus directives. */
export async function getAgentOpsFocusDirectives(): Promise<AgentOpsReadResult<AgentOpsFocusDirective[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const directives: AgentOpsFocusDirective[] = [];

    const tableAttempt = await supabase
      .from("agentops_focus_directives")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!tableAttempt.error) {
      for (const row of tableAttempt.data ?? []) {
        const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
        if (!isFocusDirectiveType(row.directive_type) || !isFocusDirectiveTarget(row.target_type)) continue;
        directives.push({
          directiveId: row.id,
          title: row.title ?? "Focus directive",
          description: row.description ?? "",
          source: normalizeDirectiveSource(row.source_type),
          directiveType: row.directive_type,
          target: row.target_type,
          targetValue: row.target_value ?? "",
          priorityWeight: Number(row.priority_weight ?? 0),
          active: Boolean(row.active),
          expiresAt: row.expires_at ?? null,
          createdBy: row.created_by ?? "owner",
          createdAt: row.created_at,
          metadata: metadata as Record<string, unknown>,
        });
      }
    }

    const feedback = await supabase
      .from("agentops_owner_feedback")
      .select("id, remark, metadata, created_at, owner_user_id")
      .order("created_at", { ascending: false })
      .limit(800);
    if (feedback.error) return fail(feedback.error);

    for (const row of feedback.data ?? []) {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {};
      const action = typeof metadata.action === "string" ? metadata.action : "";
      if (action !== "focus_directive_created" && action !== "focus_directive_updated") continue;
      const directiveType = metadata.directiveType;
      const target = metadata.target;
      if (!isFocusDirectiveType(directiveType) || !isFocusDirectiveTarget(target)) continue;
      directives.push({
        directiveId: `feedback-${row.id}`,
        title: (typeof metadata.title === "string" ? metadata.title : null) ?? "Focus directive",
        description:
          (typeof metadata.description === "string" ? metadata.description : null) ??
          (row.remark ?? ""),
        source: normalizeDirectiveSource(metadata.source),
        directiveType,
        target,
        targetValue: typeof metadata.targetValue === "string" ? metadata.targetValue : "",
        priorityWeight: Number(metadata.priorityWeight ?? 0),
        active: metadata.active !== false,
        expiresAt: typeof metadata.expiresAt === "string" ? metadata.expiresAt : null,
        createdBy: row.owner_user_id ?? "owner",
        createdAt: row.created_at,
        metadata,
      });
    }

    const deduped = directives.filter(
      (item, index, list) => list.findIndex((test) => test.directiveId === item.directiveId) === index,
    );
    return ok(deduped);
  } catch (error) {
    return fail(error);
  }
}

/** Stage 18 foundation: owner creates focus directive (no automation). */
export async function createAgentOpsFocusDirective(input: {
  title: string;
  description: string;
  directiveType: AgentOpsFocusDirectiveType;
  target: AgentOpsFocusDirectiveTarget;
  targetValue: string;
  priorityWeight: number;
  agentId?: string;
  expiresAt?: string | null;
  note?: string;
}): Promise<AgentOpsWriteResult<{ directiveId: string; storedIn: "focus_directives_table" | "owner_feedback" }>> {
  try {
    const ownerResult = await getAuthenticatedOwnerUserId();
    if (ownerResult.error || !ownerResult.data) {
      return writeFail(ownerResult.error ?? "Could not resolve current owner user.");
    }
    if (!isFocusDirectiveType(input.directiveType)) return writeFail("Invalid directiveType.");
    if (!isFocusDirectiveTarget(input.target)) return writeFail("Invalid target.");
    if (!input.title.trim()) return writeFail("title is required.");
    if (!input.targetValue.trim()) return writeFail("targetValue is required.");

    const tableInsert = await supabase
      .from("agentops_focus_directives")
      .insert({
        title: input.title.trim(),
        description: input.description.trim(),
        directive_type: input.directiveType,
        target_type: input.target,
        target_value: input.targetValue.trim(),
        priority_weight: input.priorityWeight,
        source_type: "manual_entry",
        active: true,
        expires_at: input.expiresAt ?? null,
        created_by: ownerResult.data,
        metadata: {
          agentId: input.agentId ?? null,
          note: input.note?.trim() ?? null,
          previewOnly: true,
        },
      })
      .select("id")
      .single();

    if (!tableInsert.error && tableInsert.data?.id) {
      return writeOk({ directiveId: tableInsert.data.id as string, storedIn: "focus_directives_table" });
    }

    const feedback = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: ownerResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || `Focus directive created: ${input.title.trim()}`,
        metadata: {
          action: "focus_directive_created",
          title: input.title.trim(),
          description: input.description.trim(),
          directiveType: input.directiveType,
          target: input.target,
          targetValue: input.targetValue.trim(),
          priorityWeight: input.priorityWeight,
          source: "manual_entry",
          active: true,
          agentId: input.agentId ?? null,
          expiresAt: input.expiresAt ?? null,
          previewOnly: true,
        },
      })
      .select("id")
      .single();
    if (feedback.error) return writeFail(feedback.error);
    return writeOk({ directiveId: `feedback-${feedback.data.id as string}`, storedIn: "owner_feedback" });
  } catch (error) {
    return writeFail(error);
  }
}

/** Stage 18 foundation: owner updates directive metadata/active state only. */
export async function updateAgentOpsFocusDirective(input: {
  directiveId: string;
  active?: boolean;
  title?: string;
  description?: string;
  priorityWeight?: number;
  expiresAt?: string | null;
  note?: string;
}): Promise<AgentOpsWriteResult<{ directiveId: string }>> {
  try {
    const ownerResult = await getAuthenticatedOwnerUserId();
    if (ownerResult.error || !ownerResult.data) {
      return writeFail(ownerResult.error ?? "Could not resolve current owner user.");
    }
    const directiveId = input.directiveId.trim();
    if (!directiveId) return writeFail("directiveId is required.");

    const tableUpdate = await supabase
      .from("agentops_focus_directives")
      .update({
        ...(input.active == null ? {} : { active: input.active }),
        ...(input.title == null ? {} : { title: input.title.trim() }),
        ...(input.description == null ? {} : { description: input.description.trim() }),
        ...(input.priorityWeight == null ? {} : { priority_weight: input.priorityWeight }),
        ...(input.expiresAt === undefined ? {} : { expires_at: input.expiresAt }),
      })
      .eq("id", directiveId)
      .select("id")
      .maybeSingle();

    if (!tableUpdate.error && tableUpdate.data?.id) return writeOk({ directiveId });

    const feedback = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: ownerResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || `Focus directive updated: ${directiveId}`,
        metadata: {
          action: "focus_directive_updated",
          directiveId,
          active: input.active ?? null,
          title: input.title ?? null,
          description: input.description ?? null,
          priorityWeight: input.priorityWeight ?? null,
          expiresAt: input.expiresAt ?? null,
          previewOnly: true,
        },
      })
      .select("id")
      .single();
    if (feedback.error) return writeFail(feedback.error);
    return writeOk({ directiveId });
  } catch (error) {
    return writeFail(error);
  }
}

/** Stage 18 foundation: preview ranking impact from active directives. */
export async function getAgentOpsFocusRankingPreview(): Promise<AgentOpsReadResult<AgentOpsFocusRankingPreview>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const [directivesResult, activeTopResult, backlogResult] = await Promise.all([
      getAgentOpsFocusDirectives(),
      getAgentOpsActiveTop10(),
      getAgentOpsBacklogSummary(),
    ]);
    if (directivesResult.error) return fail(directivesResult.error);
    if (activeTopResult.error) return fail(activeTopResult.error);
    if (backlogResult.error) return fail(backlogResult.error);

    const directives = (directivesResult.data ?? []).filter((item) => item.active);
    const candidates = [...(activeTopResult.data ?? []), ...(backlogResult.data?.preview ?? [])];
    const rules = focusRankingRules as {
      version?: string;
      priorityWeights?: Record<string, number>;
      agentMatching?: Array<{ agentSkill: string; matches: string[] }>;
    };
    const weights = rules.priorityWeights ?? {};
    const previewItems: AgentOpsFocusRankingPreviewItem[] = candidates.map((finding, index) => {
      let delta = 0;
      const reasons: string[] = [];
      for (const directive of directives) {
        const target = directive.targetValue.toLowerCase();
        const title = `${finding.title} ${finding.module ?? ""} ${finding.route ?? ""} ${finding.category}`.toLowerCase();
        if (target && title.includes(target)) {
          delta += directive.priorityWeight;
          reasons.push(`${directive.directiveType} (${directive.priorityWeight >= 0 ? "+" : ""}${directive.priorityWeight})`);
        }
      }
      if (finding.status === "Verified Fixed") delta += weights.verifiedFixed ?? -100;
      if (finding.status === "False Positive") delta += weights.falsePositive ?? -100;
      if (finding.status === "Deferred") delta += weights.deferred ?? -60;

      const combinedText = `${finding.title} ${finding.category} ${finding.module ?? ""} ${finding.route ?? ""}`.toLowerCase();
      const recommendedAgent =
        (rules.agentMatching ?? []).find((agentRule) =>
          agentRule.matches.some((keyword) => combinedText.includes(keyword.toLowerCase())),
        )?.agentSkill ?? null;

      return {
        issueCode: finding.issue_code,
        title: finding.title,
        currentPriority: finding.priority_score,
        focusBoostPenalty: delta,
        recommendedRank: Math.max(1, index + 1 - Math.floor(delta / 10)),
        recommendedAgent,
        recommendedScanMode: delta >= 20 ? "focused" : "manual",
        recommendedValidationCommand:
          finding.route && finding.route.includes("finance")
            ? "npm run qa:agentops-role-workflow-safe"
            : "npm run qa:validate-foundation",
        explanation:
          reasons.length > 0
            ? `Focus directives impacted ranking: ${reasons.join(", ")}.`
            : "No active focus directive matched this finding.",
        requiresPiterApproval: true,
      };
    });

    return ok({
      generatedAt: new Date().toISOString(),
      rulesVersion: rules.version ?? "1.0.0",
      items: previewItems,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Stage 18 foundation: record preview decision only, no automatic apply. */
export async function recordAgentOpsFocusRankingDecision(input: {
  decision: AgentOpsFocusRankingDecision;
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string }>> {
  try {
    if (!(FOCUS_RANKING_DECISIONS as readonly string[]).includes(input.decision)) {
      return writeFail("Invalid focus ranking decision.");
    }
    const ownerResult = await getAuthenticatedOwnerUserId();
    if (ownerResult.error || !ownerResult.data) {
      return writeFail(ownerResult.error ?? "Could not resolve current owner user.");
    }
    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: ownerResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || `Focus ranking preview decision: ${input.decision}`,
        metadata: {
          action: "focus_ranking_decision",
          decision: input.decision,
          noAutomaticApply: true,
          noAutomation: true,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);
    return writeOk({ feedbackId: data.id as string });
  } catch (error) {
    return writeFail(error);
  }
}

/** Stage 16B foundation: owner logs an interaction note (no live AI response). */
export async function recordAgentOpsAgentInteraction(
  input: AgentOpsAgentInteractionInput,
): Promise<AgentOpsWriteResult<AgentOpsAgentInteractionRecord>> {
  try {
    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const agentId = input.agentId?.trim();
    const content = input.content?.trim();
    if (!agentId) return writeFail("agentId is required.");
    if (!content) return writeFail("content is required.");
    if (!isAgentInteractionMessageType(input.messageType)) {
      return writeFail("Invalid messageType.");
    }

    const source = normalizeInteractionSource(input.source);
    const priority = normalizeInteractionPriority(input.priority);
    const interactionStatus = normalizeInteractionStatus(input.status);

    const lowerContent = content.toLowerCase();
    const agentStatus: AgentOpsManagedAgentStatus | null = lowerContent.includes("mark quiet")
      ? "quiet"
      : lowerContent.includes("mark active")
        ? "active"
        : null;

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: content,
        metadata: {
          action: "agent_interaction_note",
          agentId,
          messageType: input.messageType,
          memoryMode: "Database-only",
          noLiveAiResponse: true,
          source,
          priority,
          interactionStatus,
          note: input.note?.trim() || null,
          agentStatus,
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);
    return writeOk({
      feedbackId: data.id as string,
      agentId,
      messageType: input.messageType,
      content,
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Stage 16B foundation: owner records an explicit agent status update. */
export async function updateAgentOpsAgentStatus(input: {
  agentId: string;
  status: AgentOpsManagedAgentStatus;
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; agentId: string; status: AgentOpsManagedAgentStatus }>> {
  try {
    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }
    const agentId = input.agentId?.trim();
    if (!agentId) return writeFail("agentId is required.");

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || `Status set to ${input.status}`,
        metadata: {
          action: "agent_status_update",
          agentId,
          status: input.status,
          agentStatus: input.status,
          source: AGENT_INTERACTION_DEFAULT_SOURCE,
          priority: AGENT_INTERACTION_DEFAULT_PRIORITY,
          interactionStatus: AGENT_INTERACTION_DEFAULT_STATUS,
          memoryMode: "Database-only",
          noLiveAiResponse: true,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);

    return writeOk({ feedbackId: data.id as string, agentId, status: input.status });
  } catch (error) {
    return writeFail(error);
  }
}

/** Activate all managed synthetic agents (sets status active for each roster member). */
export async function activateAllAgentOpsManagedAgents(): Promise<
  AgentOpsWriteResult<{ activated: number; agentIds: string[]; failures: string[] }>
> {
  try {
    const managedResult = await getAgentOpsManagedAgents();
    if (managedResult.error) return writeFail(managedResult.error);
    const agents = managedResult.data ?? [];
    if (agents.length === 0) {
      return writeOk({ activated: 0, agentIds: [], failures: [] });
    }

    const failures: string[] = [];
    const activatedIds: string[] = [];

    for (const agent of agents) {
      const result = await updateAgentOpsAgentStatus({
        agentId: agent.agentId,
        status: "active",
        note: `Activated all agents via AgentOps runtime (${agent.agentId}).`,
      });
      if (result.error) {
        failures.push(`${agent.agentId}: ${result.error}`);
        continue;
      }
      activatedIds.push(agent.agentId);
    }

    return writeOk({
      activated: activatedIds.length,
      agentIds: activatedIds,
      failures,
    });
  } catch (error) {
    return writeFail(error);
  }
}

function normalizeCouncilChatMessage(row: {
  id: string;
  remark: string | null;
  metadata?: unknown;
  created_at: string;
}): AgentOpsCouncilChatMessage | null {
  const metadata =
    row.metadata && typeof row.metadata === "object" ?
      (row.metadata as Record<string, unknown>)
    : null;
  if (metadata?.action !== "council_chat_message") return null;
  const sender = metadata.sender === "agent" ? "agent" : "piter";
  const source =
    metadata.source === "local_llm_runtime" ?
      "local_llm_runtime"
    : metadata.source === "mock_response_layer" ?
      "mock_response_layer"
    : "owner";
  return {
    id: row.id,
    sender,
    agentId: typeof metadata.agentId === "string" ? metadata.agentId : null,
    agentName: typeof metadata.agentName === "string" ? metadata.agentName : null,
    content: row.remark?.trim() || "",
    createdAt: row.created_at,
    source,
    metadata,
  };
}

function normalizeAgentChatMessage(row: {
  id: string;
  remark: string | null;
  metadata?: unknown;
  created_at: string;
}): AgentOpsAgentChatMessage | null {
  const metadata =
    row.metadata && typeof row.metadata === "object" ?
      (row.metadata as Record<string, unknown>)
    : null;
  if (metadata?.action !== "agent_chat_message") return null;
  const agentId = typeof metadata.agentId === "string" ? metadata.agentId : null;
  if (!agentId) return null;
  const sender = metadata.sender === "agent" ? "agent" : "piter";
  const source =
    metadata.source === "local_llm_runtime" ?
      "local_llm_runtime"
    : metadata.source === "mock_response_layer" ?
      "mock_response_layer"
    : "owner";
  return {
    id: row.id,
    agentId,
    sender,
    content: row.remark?.trim() || "",
    createdAt: row.created_at,
    source,
    metadata,
  };
}

/** Load persisted council chat messages (newest last). */
export async function getAgentOpsCouncilChatMessages(): Promise<
  AgentOpsReadResult<AgentOpsCouncilChatMessage[]>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("id, remark, metadata, created_at")
      .contains("metadata", { action: "council_chat_message" })
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) return fail(error);

    const messages = (data ?? [])
      .map((row) => normalizeCouncilChatMessage(row))
      .filter((item): item is AgentOpsCouncilChatMessage => item !== null);
    return ok(messages);
  } catch (error) {
    return fail(error);
  }
}

/** Persist one council chat message. */
export async function recordAgentOpsCouncilChatMessage(input: {
  sender: "piter" | "agent";
  content: string;
  agentId?: string | null;
  agentName?: string | null;
  source?: AgentOpsCouncilChatMessage["source"];
  metadata?: Record<string, unknown>;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; messageId: string }>> {
  try {
    const content = input.content?.trim();
    if (!content) return writeFail("content is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const messageId = `council-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const source = input.source ?? "owner";

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: content,
        metadata: {
          action: "council_chat_message",
          messageId,
          sender: input.sender,
          agentId: input.agentId?.trim() || null,
          agentName: input.agentName?.trim() || null,
          source,
          mockResponseLayer: source !== "local_llm_runtime",
          noLiveAiResponse: source !== "local_llm_runtime",
          manualFirst: true,
          stagingOnly: true,
          ...input.metadata,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);

    return writeOk({ feedbackId: data.id as string, messageId });
  } catch (error) {
    return writeFail(error);
  }
}

/** Load persisted individual agent chat messages (newest last). */
export async function getAgentOpsAgentChatMessages(
  agentId: string,
): Promise<AgentOpsReadResult<AgentOpsAgentChatMessage[]>> {
  try {
    const normalizedAgentId = agentId?.trim();
    if (!normalizedAgentId) return fail("agentId is required.");

    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("id, remark, metadata, created_at")
      .contains("metadata", { action: "agent_chat_message", agentId: normalizedAgentId })
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) return fail(error);

    const messages = (data ?? [])
      .map((row) => normalizeAgentChatMessage(row))
      .filter((item): item is AgentOpsAgentChatMessage => item !== null)
      // Keep Agent Detail chat distinct from Finding Chat rooms.
      .filter((item) => {
        const roomId =
          typeof item.metadata.roomId === "string" ? item.metadata.roomId : `agent-chat:${normalizedAgentId}`;
        return !roomId.startsWith("finding:");
      });
    return ok(messages);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Load finding-scoped chat messages for one reporting agent + room id set
 * (primary room + draft/promoted aliases). Reuses agent_chat_message persistence.
 */
export async function getAgentOpsFindingChatMessages(input: {
  agentId: string;
  roomIds: string[];
}): Promise<AgentOpsReadResult<AgentOpsAgentChatMessage[]>> {
  try {
    const normalizedAgentId = input.agentId?.trim();
    const roomIds = [...new Set((input.roomIds ?? []).map((id) => id.trim()).filter(Boolean))];
    if (!normalizedAgentId) return fail("agentId is required.");
    if (roomIds.length === 0) return fail("roomIds are required.");

    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("id, remark, metadata, created_at")
      .contains("metadata", { action: "agent_chat_message", agentId: normalizedAgentId })
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) return fail(error);

    const roomSet = new Set(roomIds);
    const messages = (data ?? [])
      .map((row) => normalizeAgentChatMessage(row))
      .filter((item): item is AgentOpsAgentChatMessage => item !== null)
      .filter((item) => {
        const roomId = typeof item.metadata.roomId === "string" ? item.metadata.roomId : "";
        if (roomSet.has(roomId)) return true;
        const aliases = item.metadata.threadAliases;
        if (Array.isArray(aliases)) {
          return aliases.some((alias) => typeof alias === "string" && roomSet.has(alias));
        }
        return false;
      });
    return ok(messages);
  } catch (error) {
    return fail(error);
  }
}

/** Persist one individual agent chat message. */
export async function recordAgentOpsAgentChatMessage(input: {
  agentId: string;
  sender: "piter" | "agent";
  content: string;
  source?: AgentOpsAgentChatMessage["source"];
  metadata?: Record<string, unknown>;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; messageId: string }>> {
  try {
    const agentId = input.agentId?.trim();
    const content = input.content?.trim();
    if (!agentId) return writeFail("agentId is required.");
    if (!content) return writeFail("content is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const messageId = `agent-chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const source = input.source ?? "owner";

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: content,
        metadata: {
          action: "agent_chat_message",
          messageId,
          agentId,
          sender: input.sender,
          source,
          mockResponseLayer: source !== "local_llm_runtime",
          noLiveAiResponse: source !== "local_llm_runtime",
          manualFirst: true,
          stagingOnly: true,
          ...input.metadata,
        },
      })
      .select("id")
      .single();
    if (error) return writeFail(error);

    return writeOk({ feedbackId: data.id as string, messageId });
  } catch (error) {
    return writeFail(error);
  }
}

async function fetchAgentOpsFindingById(
  findingId: string,
): Promise<AgentOpsWriteResult<AgentOpsFinding>> {
  const { data, error } = await supabase
    .from("agentops_findings")
    .select("*")
    .eq("id", findingId)
    .maybeSingle();

  if (error) return writeFail(error);
  if (!data) return writeFail("Finding not found.");
  return writeOk(data as AgentOpsFinding);
}

/** Insert Owner feedback row (RLS-gated). */
export async function addAgentOpsOwnerFeedback(
  input: AgentOpsFeedbackActionInput,
): Promise<AgentOpsWriteResult<{ feedbackId: string }>> {
  try {
    if (!input.findingId?.trim()) {
      return writeFail("findingId is required.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current user.");
    }

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: input.findingId,
        owner_user_id: userResult.data,
        feedback_type: input.feedbackType,
        remark: input.remark?.trim() || null,
        priority_override: input.priorityOverride ?? null,
        requested_scope: input.requestedScope?.trim() || null,
        metadata: input.metadata ?? {},
      })
      .select("id")
      .single();

    if (error) return writeFail(error);
    return writeOk({ feedbackId: data.id as string });
  } catch (error) {
    return writeFail(error);
  }
}

/** Record Owner decision for a generated fix plan (Stage 13C). */
export async function recordAgentOpsFixPlanDecision(
  input: AgentOpsFixPlanDecisionInput,
): Promise<AgentOpsWriteResult<AgentOpsFixPlanDecisionRecord>> {
  try {
    if (!input.issueCode?.trim() || !input.planId?.trim()) {
      return writeFail("issueCode and planId are required.");
    }
    if (!isFixPlanDecision(input.decision)) {
      return writeFail("Invalid fix plan decision.");
    }
    if (!input.ownerApproved) {
      return writeFail("Owner approval confirmation is required.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const decisionStatus = mapDecisionToPlanStatus(input.decision);

    const { data: finding, error: findingError } = await supabase
      .from("agentops_findings")
      .select("id, metadata")
      .eq("issue_code", input.issueCode.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findingError) return writeFail(findingError);

    const findingId = (finding?.id as string | undefined) ?? null;
    const note = input.note?.trim() || null;

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: findingId,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "fix_plan_decision",
          decision: input.decision,
          decisionStatus,
          planId: input.planId.trim(),
          issueCode: input.issueCode.trim(),
          promptPath: input.promptPath?.trim() || null,
          summaryPath: input.summaryPath?.trim() || null,
          ownerApproved: input.ownerApproved,
          cursorPromptPreview: input.cursorPromptPreview?.trim() || null,
        },
      })
      .select("id")
      .single();

    if (feedbackError) return writeFail(feedbackError);

    if (findingId) {
      const existingMetadata =
        finding?.metadata && typeof finding.metadata === "object"
          ? (finding.metadata as Record<string, unknown>)
          : {};
      const nextMetadata: Record<string, unknown> = {
        ...existingMetadata,
        latestFixPlanDecision: input.decision,
        latestFixPlanDecisionStatus: decisionStatus,
        latestFixPlanDecisionAt: new Date().toISOString(),
        latestFixPlanPlanId: input.planId.trim(),
      };

      const { error: metadataUpdateError } = await supabase
        .from("agentops_findings")
        .update({ metadata: nextMetadata })
        .eq("id", findingId);
      if (metadataUpdateError) return writeFail(metadataUpdateError);
    }

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId,
      decision: input.decision,
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Optional history lookup for fix plan decisions by issue code (Stage 13C). */
export async function getAgentOpsFixPlanDecisionHistory(
  issueCode: string,
): Promise<AgentOpsReadResult<AgentOpsOwnerFeedback[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const code = issueCode.trim();
    if (!code) return fail("issueCode is required.");

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("*")
      .contains("metadata", { action: "fix_plan_decision", issueCode: code })
      .order("created_at", { ascending: false });

    if (error) return fail(error);
    return ok((data ?? []) as AgentOpsOwnerFeedback[]);
  } catch (error) {
    return fail(error);
  }
}

async function fetchLatestFindingByIssueCode(
  issueCode: string,
): Promise<AgentOpsWriteResult<{ id: string; metadata: Record<string, unknown> } | null>> {
  const { data, error } = await supabase
    .from("agentops_findings")
    .select("id, metadata")
    .eq("issue_code", issueCode)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return writeFail(error);
  if (!data) return writeOk(null);
  return writeOk({
    id: data.id as string,
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : {},
  });
}

function sanitizeLessonText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 800) : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function mapLessonDecisionToApprovalStatus(
  decision: AgentOpsLessonCandidateDecision,
): AgentOpsLessonCandidateApprovalStatus {
  switch (decision) {
    case "approve_for_future_memory":
      return "approved";
    case "reject_lesson":
      return "rejected";
    case "needs_cleanup":
      return "needs_cleanup";
    case "review_later":
      return "pending_review";
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }
}

function toLessonDraftFromMetadata(
  feedback: AgentOpsOwnerFeedback,
): AgentOpsLessonCandidateDraft | null {
  const metadata =
    feedback.metadata && typeof feedback.metadata === "object"
      ? (feedback.metadata as Record<string, unknown>)
      : null;
  if (!metadata || metadata.action !== "lesson_candidate_draft") return null;

  const lessonCandidateDraft =
    metadata.lessonCandidateDraft && typeof metadata.lessonCandidateDraft === "object"
      ? (metadata.lessonCandidateDraft as Record<string, unknown>)
      : metadata;

  const lessonId = sanitizeLessonText(lessonCandidateDraft.lessonId, "");
  const issueCode = sanitizeLessonText(lessonCandidateDraft.sourceIssueCode ?? metadata.issueCode, "");
  if (!lessonId || !issueCode) return null;

  const approvalStatusRaw = sanitizeLessonText(
    lessonCandidateDraft.approvalStatus ?? "pending_review",
    "pending_review",
  );
  const approvalStatus: AgentOpsLessonCandidateApprovalStatus =
    approvalStatusRaw === "draft" ||
    approvalStatusRaw === "pending_review" ||
    approvalStatusRaw === "approved" ||
    approvalStatusRaw === "rejected" ||
    approvalStatusRaw === "needs_cleanup"
      ? approvalStatusRaw
      : "pending_review";

  return {
    feedbackId: feedback.id,
    lessonId,
    issueCode,
    issueTitle: sanitizeLessonText(lessonCandidateDraft.sourceIssueTitle, "Needs review"),
    sourceRoute: sanitizeLessonText(lessonCandidateDraft.sourceRoute, "") || null,
    sourceCategory: sanitizeLessonText(lessonCandidateDraft.sourceCategory, "Unknown from available context"),
    sourceSeverity: sanitizeLessonText(lessonCandidateDraft.sourceSeverity, "Unknown from available context"),
    sourceAgentId: sanitizeLessonText(lessonCandidateDraft.sourceAgentId, "") || null,
    sourceVerificationResult: sanitizeLessonText(
      lessonCandidateDraft.sourceVerificationResult,
      "Unknown from available context",
    ),
    sourceFixPlanId: sanitizeLessonText(lessonCandidateDraft.sourceFixPlanId, "") || null,
    sourceCursorReportId: sanitizeLessonText(lessonCandidateDraft.sourceCursorReportId, "") || null,
    sourcePromptId: sanitizeLessonText(lessonCandidateDraft.sourcePromptId, "") || null,
    filesOrComponentsAffected: asStringArray(lessonCandidateDraft.filesOrComponentsAffected),
    lessonTitle: sanitizeLessonText(lessonCandidateDraft.lessonTitle, "Needs review"),
    problemPattern: sanitizeLessonText(lessonCandidateDraft.problemPattern, "Needs review"),
    rootCauseSummary: sanitizeLessonText(
      lessonCandidateDraft.rootCauseSummary,
      "Unknown from available context",
    ),
    fixSummary: sanitizeLessonText(lessonCandidateDraft.fixSummary, "Unknown from available context"),
    reusableRule: sanitizeLessonText(lessonCandidateDraft.reusableRule, "Needs review"),
    doNotRepeat: sanitizeLessonText(lessonCandidateDraft.doNotRepeat, "Needs review"),
    appliesTo: asStringArray(lessonCandidateDraft.appliesTo),
    targetAgents: asStringArray(lessonCandidateDraft.targetAgents),
    memoryScope:
      sanitizeLessonText(lessonCandidateDraft.memoryScope, "prompt_memory") === "agent_memory" ||
      sanitizeLessonText(lessonCandidateDraft.memoryScope, "prompt_memory") === "issue_memory" ||
      sanitizeLessonText(lessonCandidateDraft.memoryScope, "prompt_memory") === "shared_memory" ||
      sanitizeLessonText(lessonCandidateDraft.memoryScope, "prompt_memory") === "design_system_memory" ||
      sanitizeLessonText(lessonCandidateDraft.memoryScope, "prompt_memory") === "prompt_memory"
        ? (sanitizeLessonText(
            lessonCandidateDraft.memoryScope,
            "prompt_memory",
          ) as AgentOpsLessonCandidateDraft["memoryScope"])
        : "prompt_memory",
    confidence:
      typeof lessonCandidateDraft.confidence === "number"
        ? Math.max(0, Math.min(1, lessonCandidateDraft.confidence))
        : 0.6,
    requiresPiterApproval: true,
    approvalStatus,
    proposedBy:
      sanitizeLessonText(lessonCandidateDraft.proposedBy, "verification") === "agent" ||
      sanitizeLessonText(lessonCandidateDraft.proposedBy, "verification") === "hermes" ||
      sanitizeLessonText(lessonCandidateDraft.proposedBy, "verification") === "piter" ||
      sanitizeLessonText(lessonCandidateDraft.proposedBy, "verification") === "verification" ||
      sanitizeLessonText(lessonCandidateDraft.proposedBy, "verification") === "cursor_report"
        ? (sanitizeLessonText(
            lessonCandidateDraft.proposedBy,
            "verification",
          ) as AgentOpsLessonCandidateDraft["proposedBy"])
        : "verification",
    createdAt: sanitizeLessonText(lessonCandidateDraft.createdAt, feedback.created_at),
    updatedAt: sanitizeLessonText(lessonCandidateDraft.updatedAt, feedback.created_at),
    latestDecision: null,
    latestDecisionAt: null,
  };
}

function collectDraftFilesOrComponents(
  finding: AgentOpsFinding,
  issueFeedbackRows: AgentOpsOwnerFeedback[],
): string[] {
  const fromEvidence = Array.isArray(finding.evidence_files)
    ? finding.evidence_files
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const fromCursorReport = issueFeedbackRows
    .map((row) => (row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null))
    .filter((meta): meta is Record<string, unknown> => Boolean(meta))
    .filter((meta) => meta.action === "cursor_fix_report")
    .flatMap((meta) => asStringArray(meta.filesChanged));

  const unique = [...new Set([...fromCursorReport, ...fromEvidence])];
  return unique.length > 0 ? unique.slice(0, 12) : ["Unknown from available context"];
}

function pickLatestIssueFeedbackAction(
  issueFeedbackRows: AgentOpsOwnerFeedback[],
  action: string,
): AgentOpsOwnerFeedback | null {
  return (
    issueFeedbackRows.find((row) => {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null;
      return metadata?.action === action;
    }) ?? null
  );
}

/** Prepare manual-first lesson candidate draft from verified issue context (Phase 7C). */
export async function prepareAgentOpsLessonCandidateDraft(
  input: AgentOpsPrepareLessonCandidateDraftInput,
): Promise<AgentOpsWriteResult<AgentOpsPrepareLessonCandidateDraftResult>> {
  try {
    const issueCode = input.issueCode?.trim();
    if (!issueCode) return writeFail("issueCode is required.");
    if (!input.ownerRequested) return writeFail("Owner request confirmation is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingLookup = await fetchLatestFindingByIssueCode(issueCode);
    if (findingLookup.error) return writeFail(findingLookup.error);
    if (!findingLookup.data) return writeFail("Issue not found.");

    const findingResult = await fetchAgentOpsFindingById(findingLookup.data.id);
    if (findingResult.error || !findingResult.data) {
      return writeFail(findingResult.error ?? "Issue context not found.");
    }
    const finding = findingResult.data;
    const findingMetadata =
      finding.metadata && typeof finding.metadata === "object"
        ? (finding.metadata as Record<string, unknown>)
        : {};

    const verificationStatus =
      sanitizeLessonText(
        findingMetadata.latestVerificationResult,
        finding.status === "Verified Fixed" ? "verified_fixed" : finding.status,
      ) || "Unknown from available context";
    const isVerifiedFixed =
      finding.status === "Verified Fixed" ||
      verificationStatus === "verified_fixed" ||
      findingMetadata.verificationRequestStatus === "verification_passed";
    if (!isVerifiedFixed) {
      return writeFail("Lesson candidate draft can only be prepared after verified fixed lifecycle state.");
    }

    const { data: issueFeedbackRowsRaw, error: issueFeedbackError } = await supabase
      .from("agentops_owner_feedback")
      .select("*")
      .contains("metadata", { issueCode })
      .order("created_at", { ascending: false })
      .limit(200);
    if (issueFeedbackError) return writeFail(issueFeedbackError);
    const issueFeedbackRows = (issueFeedbackRowsRaw ?? []) as AgentOpsOwnerFeedback[];

    const existingDraft = issueFeedbackRows
      .map((row) => toLessonDraftFromMetadata(row))
      .find((candidate) => candidate !== null && candidate.approvalStatus !== "approved" && candidate.approvalStatus !== "rejected");

    if (existingDraft) {
      return writeOk({
        feedbackId: existingDraft.feedbackId,
        findingId: finding.id,
        lessonId: existingDraft.lessonId,
        issueCode,
        approvalStatus: existingDraft.approvalStatus,
        createdAt: existingDraft.createdAt,
      });
    }

    const latestFixPlanDecision = pickLatestIssueFeedbackAction(issueFeedbackRows, "fix_plan_decision");
    const latestFixPlanMetadata =
      latestFixPlanDecision?.metadata && typeof latestFixPlanDecision.metadata === "object"
        ? (latestFixPlanDecision.metadata as Record<string, unknown>)
        : {};
    const latestCursorReport = pickLatestIssueFeedbackAction(issueFeedbackRows, "cursor_fix_report");

    const nowIso = new Date().toISOString();
    const lessonId = `lesson-${issueCode}-${Date.now()}`;

    const appliesTo = [
      "agentops_pages",
      ...(finding.route?.startsWith("/finance") ? ["finance_pages"] : []),
      ...(finding.category === "Design" ? ["shared_design_system"] : []),
      ...(finding.agent_id ? ["agent_specific"] : []),
    ];
    const uniqueAppliesTo = [...new Set(appliesTo)];
    const targetAgents = finding.agent_id ? [finding.agent_id] : ["Unknown from available context"];
    const memoryScope: AgentOpsLessonCandidateDraft["memoryScope"] = finding.agent_id
      ? "agent_memory"
      : "prompt_memory";

    const lessonCandidateDraft = {
      lessonId,
      sourceIssueCode: issueCode,
      sourceIssueTitle: sanitizeLessonText(finding.title, "Needs review"),
      sourceRoute: finding.route ?? null,
      sourceCategory: sanitizeLessonText(finding.category, "Unknown from available context"),
      sourceSeverity: sanitizeLessonText(finding.severity, "Unknown from available context"),
      sourceAgentId: finding.agent_id ?? null,
      sourceAgentRole: null,
      sourceVerificationResult: verificationStatus,
      sourceCursorReportId: latestCursorReport?.id ?? null,
      sourceFixPlanId: sanitizeLessonText(latestFixPlanMetadata.planId, "") || null,
      sourcePromptId: sanitizeLessonText(findingMetadata.promptId, "") || null,
      lessonType: "qa_workflow",
      lessonTitle: sanitizeLessonText(
        finding.title ? `Lesson: ${finding.title}` : "Needs review",
        "Needs review",
      ),
      problemPattern: sanitizeLessonText(finding.problem, "Needs review"),
      rootCauseSummary: sanitizeLessonText(
        finding.likely_root_cause,
        "Unknown from available context",
      ),
      fixSummary: sanitizeLessonText(
        finding.recommended_fix_strategy ??
          (latestCursorReport?.metadata as Record<string, unknown> | undefined)?.validationSummary,
        "Unknown from available context",
      ),
      filesOrComponentsAffected: collectDraftFilesOrComponents(finding, issueFeedbackRows),
      reusableRule: sanitizeLessonText(
        finding.recommended_fix_strategy
          ? `Follow this fix pattern for similar issue scope: ${finding.recommended_fix_strategy}`
          : "Needs review",
        "Needs review",
      ),
      doNotRepeat:
        "Do not mark issue states as resolved without explicit verification evidence and summary.",
      appliesTo: uniqueAppliesTo,
      targetAgents,
      memoryScope,
      confidence: 0.6,
      proposedBy: "verification" as const,
      requiresPiterApproval: true,
      approvalStatus: "pending_review" as const,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      indexedInAgentMemory: false,
      indexedInHermesContext: false,
      indexedInAgentmemoryLayer: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: finding.id,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || "Lesson candidate draft prepared for review.",
        metadata: {
          action: "lesson_candidate_draft",
          issueCode,
          lessonId,
          ownerRequested: true,
          manualFirst: true,
          noDurableMemoryWrite: true,
          noAgentmemoryIndexing: true,
          noHermesRuntime: true,
          noLocalLlmRuntime: true,
          sourceContext: input.sourceContext ?? null,
          lessonCandidateDraft,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: finding.id,
      lessonId,
      issueCode,
      approvalStatus: "pending_review",
      createdAt: nowIso,
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Read reviewable lesson candidate drafts from owner feedback metadata (Phase 7C). */
export async function getAgentOpsLessonCandidateDrafts(): Promise<
  AgentOpsReadResult<AgentOpsLessonCandidateDraft[]>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("*")
      .or(
        "metadata->>action.eq.lesson_candidate_draft,metadata->>action.eq.lesson_candidate_decision",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return fail(error);

    const rows = (data ?? []) as AgentOpsOwnerFeedback[];
    const draftsByLessonId = new Map<string, AgentOpsLessonCandidateDraft>();
    const decisionsByLessonId = new Map<
      string,
      {
        decision: AgentOpsLessonCandidateDecision;
        approvalStatus: AgentOpsLessonCandidateApprovalStatus;
        createdAt: string;
      }
    >();

    for (const row of rows) {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null;
      if (!metadata) continue;

      if (metadata.action === "lesson_candidate_draft") {
        const draft = toLessonDraftFromMetadata(row);
        if (!draft) continue;
        if (!draftsByLessonId.has(draft.lessonId)) {
          draftsByLessonId.set(draft.lessonId, draft);
        }
        continue;
      }

      if (metadata.action === "lesson_candidate_decision") {
        const lessonId = sanitizeLessonText(metadata.lessonId, "");
        const decision = sanitizeLessonText(metadata.decision, "");
        if (!lessonId || !isLessonCandidateDecision(decision)) continue;
        if (!decisionsByLessonId.has(lessonId)) {
          decisionsByLessonId.set(lessonId, {
            decision,
            approvalStatus: mapLessonDecisionToApprovalStatus(decision),
            createdAt: row.created_at,
          });
        }
      }
    }

    const drafts = [...draftsByLessonId.values()]
      .map((draft) => {
        const latestDecision = decisionsByLessonId.get(draft.lessonId);
        if (!latestDecision) return draft;
        return {
          ...draft,
          approvalStatus: latestDecision.approvalStatus,
          latestDecision: latestDecision.decision,
          latestDecisionAt: latestDecision.createdAt,
          updatedAt: latestDecision.createdAt,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return ok(drafts);
  } catch (error) {
    return fail(error);
  }
}

/** Record lesson-candidate review decision metadata only (no durable memory write in Phase 7C). */
export async function recordAgentOpsLessonCandidateDecision(
  input: AgentOpsLessonCandidateDecisionInput,
): Promise<AgentOpsWriteResult<AgentOpsLessonCandidateDecisionRecord>> {
  try {
    const lessonId = input.lessonId?.trim();
    const issueCode = input.issueCode?.trim();
    if (!lessonId || !issueCode) {
      return writeFail("lessonId and issueCode are required.");
    }
    if (!isLessonCandidateDecision(input.decision)) {
      return writeFail("Invalid lesson decision.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingLookup = await fetchLatestFindingByIssueCode(issueCode);
    if (findingLookup.error) return writeFail(findingLookup.error);

    const drafts = await getAgentOpsLessonCandidateDrafts();
    if (drafts.error) return writeFail(drafts.error);
    const draftExists = (drafts.data ?? []).some(
      (draft) => draft.lessonId === lessonId && draft.issueCode === issueCode,
    );
    if (!draftExists) {
      return writeFail("Lesson candidate draft not found for this issue.");
    }

    const approvalStatus = mapLessonDecisionToApprovalStatus(input.decision);
    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: findingLookup.data?.id ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || null,
        metadata: {
          action: "lesson_candidate_decision",
          issueCode,
          lessonId,
          decision: input.decision,
          approvalStatus,
          manualFirst: true,
          noDurableMemoryWrite: true,
          noAgentmemoryIndexing: true,
          noHermesRuntime: true,
          noLocalLlmRuntime: true,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: findingLookup.data?.id ?? null,
      lessonId,
      issueCode,
      decision: input.decision,
      approvalStatus,
    });
  } catch (error) {
    return writeFail(error);
  }
}

async function fetchLatestFixPlanDecisionFeedback(
  issueCode: string,
): Promise<AgentOpsWriteResult<{ id: string; decisionStatus: string | null } | null>> {
  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .select("id, metadata, created_at")
    .contains("metadata", { action: "fix_plan_decision", issueCode })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return writeFail(error);
  if (!data) return writeOk(null);
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {};
  return writeOk({
    id: data.id as string,
    decisionStatus:
      typeof metadata.decisionStatus === "string" ? metadata.decisionStatus : null,
  });
}

/** Create or update controlled Cursor handoff metadata (Stage 13D). */
export async function createAgentOpsCursorHandoff(
  input: AgentOpsCursorHandoffInput,
): Promise<AgentOpsWriteResult<AgentOpsCursorHandoffRecord>> {
  try {
    const issueCode = input.issueCode?.trim();
    const planId = input.planId?.trim();
    const cursorPrompt = input.cursorPrompt?.trim();
    if (!issueCode || !planId || !cursorPrompt) {
      return writeFail("issueCode, planId, and cursorPrompt are required.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);
    const finding = findingResult.data;

    const latestDecision = await fetchLatestFixPlanDecisionFeedback(issueCode);
    if (latestDecision.error) return writeFail(latestDecision.error);

    const explicitApproved = input.ownerApproved === true;
    const decisionIsApproved = latestDecision.data?.decisionStatus === "approved";
    if (!decisionIsApproved && !explicitApproved) {
      return writeFail(
        "Latest fix plan decision is not approved. Approve plan first or confirm explicit ownerApproved.",
      );
    }

    const handoffStatus = input.status ?? "ready_for_cursor";
    if (!isCursorHandoffStatus(handoffStatus)) {
      return writeFail("Invalid cursor handoff status.");
    }

    const nowIso = new Date().toISOString();
    const handoffId = input.handoffId?.trim() || `handoff-${issueCode}-${Date.now()}`;
    const note = input.note?.trim() || null;

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: finding?.id ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "cursor_handoff",
          issueCode,
          planId,
          handoffId,
          handoffStatus,
          cursorPrompt,
          ownerApproved: explicitApproved || decisionIsApproved,
          ownerApprovedAt: nowIso,
          decisionId: input.ownerDecisionFeedbackId?.trim() || latestDecision.data?.id || null,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    if (finding?.id) {
      const executionStateFromHandoff = mapHandoffStatusToExecutionState(handoffStatus);
      const nextMetadata: Record<string, unknown> = {
        ...finding.metadata,
        issueCode,
        latestCursorHandoffStatus: handoffStatus,
        latestCursorHandoffId: handoffId,
        latestCursorHandoffAt: nowIso,
        cursorHandoffId: handoffId,
        cursorStatus: handoffStatus,
        executionRequestId: handoffId,
        executionState: executionStateFromHandoff,
        approvedPrompt: cursorPrompt,
        approvedPromptAt: nowIso,
        manualFirst: true,
        latestLifecycleStep: handoffStatus,
        updatedAt: nowIso,
      };
      if (handoffStatus === "verification_requested") {
        nextMetadata.verificationRequested = true;
      }
      const { error: metadataError } = await supabase
        .from("agentops_findings")
        .update({ metadata: nextMetadata })
        .eq("id", finding.id);
      if (metadataError) return writeFail(metadataError);
    }

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: finding?.id ?? null,
      handoffId,
      status: handoffStatus,
    });
  } catch (error) {
    return writeFail(error);
  }
}

function mapHandoffStatusToExecutionState(
  handoffStatus: AgentOpsCursorHandoffStatus,
): AgentOpsManualExecutionState {
  switch (handoffStatus) {
    case "ready_for_cursor":
      return "execution_request_prepared";
    case "copied_manually":
      return "cursor_prompt_copied";
    case "cursor_working":
      return "cursor_working_manual";
    case "cursor_report_received":
      return "cursor_report_received";
    case "verification_requested":
      return "verification_requested";
    case "verified_fixed":
      return "verification_passed";
    case "still_broken":
      return "verification_failed";
    case "cancelled":
      return "follow_up_required";
    default:
      return "prompt_draft_ready";
  }
}

/** Prepare manual-first execution request (handoff + normalized execution metadata). */
export async function prepareAgentOpsExecutionRequest(
  input: AgentOpsPrepareExecutionRequestInput,
): Promise<AgentOpsWriteResult<AgentOpsCursorHandoffRecord>> {
  const handoffResult = await createAgentOpsCursorHandoff({
    issueCode: input.issueCode,
    planId: input.planId,
    cursorPrompt: input.cursorPrompt,
    status: "ready_for_cursor",
    ownerApproved: input.ownerApproved ?? true,
    note: input.note?.trim() || "Approve & Prepare Execution Request",
  });
  if (handoffResult.error || !handoffResult.data) return handoffResult;

  const metadataResult = await recordAgentOpsIssueExecutionMetadata({
    issueCode: input.issueCode,
    executionState: "execution_request_prepared",
    approvedPrompt: input.cursorPrompt,
    approvedPromptAt: new Date().toISOString(),
    executionRequestId: handoffResult.data.handoffId,
    cursorHandoffId: handoffResult.data.handoffId,
    cursorStatus: "ready_for_cursor",
    manualFirst: true,
    latestLifecycleStep: "execution_request_prepared",
    note: input.note,
  });
  if (metadataResult.error) return writeFail(metadataResult.error);

  return handoffResult;
}

/** Record normalized manual execution lifecycle metadata on a finding (no schema change). */
export async function recordAgentOpsIssueExecutionMetadata(
  input: AgentOpsIssueExecutionMetadataInput,
): Promise<AgentOpsWriteResult<{ feedbackId: string; findingId: string | null }>> {
  try {
    const issueCode = input.issueCode?.trim();
    if (!issueCode) return writeFail("issueCode is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);
    const finding = findingResult.data;

    const nowIso = new Date().toISOString();
    const note = input.note?.trim() || null;

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: finding?.id ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "execution_lifecycle_update",
          issueCode,
          executionState: input.executionState,
          approvedPrompt: input.approvedPrompt ?? null,
          approvedPromptAt: input.approvedPromptAt ?? null,
          executionRequestId: input.executionRequestId ?? null,
          cursorHandoffId: input.cursorHandoffId ?? null,
          cursorStatus: input.cursorStatus ?? null,
          cursorReportSummary: input.cursorReportSummary ?? null,
          verificationStatus: input.verificationStatus ?? null,
          latestLifecycleStep: input.latestLifecycleStep ?? input.executionState,
          manualFirst: input.manualFirst ?? true,
          updatedAt: nowIso,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    if (finding?.id) {
      const nextMetadata: Record<string, unknown> = {
        ...finding.metadata,
        issueCode,
        executionState: input.executionState,
        updatedAt: nowIso,
      };
      if (input.approvedPrompt) nextMetadata.approvedPrompt = input.approvedPrompt;
      if (input.approvedPromptAt) nextMetadata.approvedPromptAt = input.approvedPromptAt;
      if (input.executionRequestId) nextMetadata.executionRequestId = input.executionRequestId;
      if (input.cursorHandoffId) nextMetadata.cursorHandoffId = input.cursorHandoffId;
      if (input.cursorStatus) nextMetadata.cursorStatus = input.cursorStatus;
      if (input.cursorReportSummary) nextMetadata.cursorReportSummary = input.cursorReportSummary;
      if (input.verificationStatus) nextMetadata.verificationStatus = input.verificationStatus;
      if (input.latestLifecycleStep) nextMetadata.latestLifecycleStep = input.latestLifecycleStep;
      if (input.manualFirst !== undefined) nextMetadata.manualFirst = input.manualFirst;

      const { error: metadataError } = await supabase
        .from("agentops_findings")
        .update({ metadata: nextMetadata })
        .eq("id", finding.id);
      if (metadataError) return writeFail(metadataError);
    }

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: finding?.id ?? null,
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Record one issue-scoped agent clarification message (owner feedback metadata only). */
export async function recordAgentOpsIssueAgentMessage(
  input: AgentOpsIssueAgentMessageInput,
): Promise<AgentOpsWriteResult<AgentOpsIssueAgentMessageRecord>> {
  try {
    const issueCode = input.issueCode?.trim();
    const content = input.content?.trim();
    if (!issueCode) return writeFail("issueCode is required.");
    if (!content) return writeFail("content is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    let findingId = input.findingId?.trim() || null;
    if (!findingId) {
      const findingResult = await fetchLatestFindingByIssueCode(issueCode);
      if (findingResult.error) return writeFail(findingResult.error);
      findingId = findingResult.data?.id ?? null;
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const source = input.source ?? "issue_workspace";

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: findingId,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: content,
        metadata: {
          action: "issue_agent_message",
          issueCode,
          messageId,
          agentId: input.agentId?.trim() || null,
          sender: input.sender,
          messageType: input.messageType,
          content,
          source,
          mockResponseLayer: true,
          noLiveAiResponse: true,
          noHermes: true,
          noCodeGraph: true,
          manualFirst: true,
          ...input.metadata,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId,
      messageId,
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Record manual Cursor fix report intake for an issue (Stage 13D). */
export async function recordAgentOpsCursorFixReport(
  input: AgentOpsCursorFixReportInput,
): Promise<AgentOpsWriteResult<AgentOpsCursorFixReportRecord>> {
  try {
    const issueCode = input.issueCode?.trim();
    const handoffId = input.handoffId?.trim();
    const reportText = input.reportText?.trim();
    const validationSummary = input.validationSummary?.trim();
    if (!issueCode || !handoffId || !reportText || !validationSummary) {
      return writeFail(
        "issueCode, handoffId, reportText, and validationSummary are required.",
      );
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);
    const finding = findingResult.data;

    const filesChanged = (input.filesChanged ?? [])
      .map((item) => item.trim())
      .filter(Boolean);
    const readyForVerification = input.readyForVerification === true;
    const note = input.note?.trim() || null;

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: finding?.id ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: note,
        metadata: {
          action: "cursor_fix_report",
          issueCode,
          handoffId,
          reportText,
          filesChanged,
          validationSummary,
          validationCommandsRun: input.validationCommandsRun?.trim() || null,
          validationResult: input.validationResult?.trim() || null,
          remainingRisks: input.remainingRisks?.trim() || null,
          followUpNeeded: input.followUpNeeded === true,
          readyForVerification,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    const reportAt = new Date().toISOString();
    if (finding?.id) {
      const nextMetadata: Record<string, unknown> = {
        ...finding.metadata,
        issueCode,
        latestCursorHandoffStatus: readyForVerification
          ? "verification_requested"
          : "cursor_report_received",
        latestCursorHandoffId: handoffId,
        latestCursorFixReportAt: reportAt,
        verificationRequested: readyForVerification,
        cursorReportSummary: reportText,
        executionState: readyForVerification ? "verification_requested" : "cursor_report_received",
        latestLifecycleStep: readyForVerification ? "verification_requested" : "cursor_report_received",
        updatedAt: reportAt,
      };
      const { error: metadataError } = await supabase
        .from("agentops_findings")
        .update({ metadata: nextMetadata })
        .eq("id", finding.id);
      if (metadataError) return writeFail(metadataError);
    }

    await recordAgentOpsIssueExecutionMetadata({
      issueCode,
      executionState: readyForVerification ? "verification_requested" : "cursor_report_received",
      cursorHandoffId: handoffId,
      cursorReportSummary: reportText,
      verificationStatus: readyForVerification ? "verification_requested" : undefined,
      latestLifecycleStep: readyForVerification ? "verification_requested" : "cursor_report_received",
      manualFirst: true,
      note: note ?? undefined,
    });

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: finding?.id ?? null,
      handoffId,
      readyForVerification,
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Handoff/fix-report history for one issue code (Stage 13D). */
export async function getAgentOpsCursorHandoffHistory(
  issueCode: string,
): Promise<AgentOpsReadResult<AgentOpsOwnerFeedback[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const code = issueCode.trim();
    if (!code) return fail("issueCode is required.");

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("*")
      .or(
        `metadata->>action.eq.cursor_handoff,metadata->>action.eq.cursor_fix_report,metadata->>action.eq.execution_lifecycle_update`,
      )
      .contains("metadata", { issueCode: code })
      .order("created_at", { ascending: false });
    if (error) return fail(error);
    return ok((data ?? []) as AgentOpsOwnerFeedback[]);
  } catch (error) {
    return fail(error);
  }
}

function isVerificationRequestStatus(
  value: string,
): value is AgentOpsVerificationRequestStatus {
  return (VERIFICATION_REQUEST_STATUSES as readonly string[]).includes(value);
}

function buildVerificationCommands(
  issueCode: string,
  targetOverride?: string | null,
): AgentOpsVerificationCommandRecommendation {
  const targetId =
    targetOverride?.trim() || ISSUE_TO_VERIFICATION_TARGET[issueCode] || null;
  if (targetId) {
    return {
      verificationTarget: targetId,
      reportOnlyCommand: `npm run qa:agentops-verify -- --target ${targetId}`,
      applyCommand: `npm run qa:agentops-verify -- --target ${targetId} --apply --owner-approved`,
    };
  }
  return {
    verificationTarget: null,
    reportOnlyCommand: `npm run qa:agentops-verify -- --issue ${issueCode}`,
    applyCommand: `npm run qa:agentops-verify -- --issue ${issueCode} --apply --owner-approved`,
  };
}

function mapVerificationResultToRequestStatus(
  result: AgentOpsVerificationResultStatus,
): AgentOpsVerificationRequestStatus {
  switch (result) {
    case "verified_fixed":
      return "verification_passed";
    case "still_broken":
    case "needs_follow_up_fix":
      return "verification_failed";
    case "verification_blocked":
      return "verification_blocked";
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

async function updateFindingVerificationRequestMetadata(
  findingId: string,
  existingMetadata: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<AgentOpsWriteResult<true>> {
  const { error } = await supabase
    .from("agentops_findings")
    .update({ metadata: { ...existingMetadata, ...patch } })
    .eq("id", findingId);
  if (error) return writeFail(error);
  return writeOk(true);
}

type CursorFixReportSnapshot = {
  handoffId: string | null;
  reportText: string | null;
  filesChanged: string[];
  validationSummary: string | null;
  readyForVerification: boolean;
};

function parseCursorFixReportFeedback(
  feedback: AgentOpsOwnerFeedback,
): CursorFixReportSnapshot | null {
  const meta =
    feedback.metadata && typeof feedback.metadata === "object"
      ? (feedback.metadata as Record<string, unknown>)
      : null;
  if (!meta || meta.action !== "cursor_fix_report") return null;
  const issueCode = typeof meta.issueCode === "string" ? meta.issueCode : "";
  if (!issueCode) return null;
  return {
    handoffId: typeof meta.handoffId === "string" ? meta.handoffId : null,
    reportText: typeof meta.reportText === "string" ? meta.reportText : null,
    filesChanged: Array.isArray(meta.filesChanged)
      ? meta.filesChanged.filter((item): item is string => typeof item === "string")
      : [],
    validationSummary:
      typeof meta.validationSummary === "string" ? meta.validationSummary : null,
    readyForVerification: meta.readyForVerification === true,
  };
}

function deriveVerificationRequestStatus(
  metadata: Record<string, unknown>,
  readyForVerification: boolean,
  rejected: boolean,
): AgentOpsVerificationRequestStatus {
  if (rejected) return "owner_review_required";
  const stored = metadata.verificationRequestStatus;
  if (typeof stored === "string" && isVerificationRequestStatus(stored)) {
    return stored;
  }
  const latestResult = metadata.latestVerificationResult;
  if (latestResult === "verified_fixed") return "verification_passed";
  if (latestResult === "verification_blocked") return "verification_blocked";
  if (
    latestResult === "still_broken" ||
    latestResult === "needs_follow_up_fix"
  ) {
    return "verification_failed";
  }
  if (metadata.verificationApprovedAt) return "ready_to_run";
  if (readyForVerification || metadata.verificationRequested === true) {
    return "verification_requested";
  }
  return "owner_review_required";
}

function findingQualifiesForVerificationRequest(
  finding: AgentOpsFinding,
  latestReport: CursorFixReportSnapshot | null,
): boolean {
  const metadata = finding.metadata ?? {};
  if (metadata.verificationRequestRejected === true) return false;
  if (metadata.verificationRequested === true) return true;
  const handoffStatus = metadata.latestCursorHandoffStatus;
  if (
    handoffStatus === "cursor_report_received" ||
    handoffStatus === "verification_requested"
  ) {
    return true;
  }
  if (latestReport?.readyForVerification) return true;
  if (
    typeof metadata.verificationRequestStatus === "string" &&
    metadata.verificationRequestStatus !== "verification_passed"
  ) {
    return true;
  }
  return false;
}

/** List Owner verification requests after Cursor fix report intake (Stage 13E). */
export async function getAgentOpsVerificationRequests(): Promise<
  AgentOpsReadResult<AgentOpsVerificationRequestItem[]>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const [findingsResult, feedbackResult] = await Promise.all([
      supabase
        .from("agentops_findings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("agentops_owner_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (findingsResult.error) return fail(findingsResult.error);
    if (feedbackResult.error) return fail(feedbackResult.error);

    const findings = (findingsResult.data ?? []) as AgentOpsFinding[];
    const feedbackRows = (feedbackResult.data ?? []) as AgentOpsOwnerFeedback[];

    const latestReportByIssue = new Map<string, CursorFixReportSnapshot>();
    const rejectedIssues = new Set<string>();
    const latestManualResultByIssue = new Map<
      string,
      { result: AgentOpsVerificationResultStatus; reportPath: string | null }
    >();

    for (const row of feedbackRows) {
      const meta =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {};
      const issueCode = typeof meta.issueCode === "string" ? meta.issueCode : "";
      if (!issueCode) continue;

      if (meta.action === "cursor_fix_report") {
        const parsed = parseCursorFixReportFeedback(row);
        if (parsed && !latestReportByIssue.has(issueCode)) {
          latestReportByIssue.set(issueCode, parsed);
        }
      }

      if (meta.action === "verification_request_rejected") {
        rejectedIssues.add(issueCode);
      }

      if (meta.action === "manual_verification_result") {
        const result = meta.verificationResult;
        if (
          typeof result === "string" &&
          isVerificationResultStatus(result) &&
          !latestManualResultByIssue.has(issueCode)
        ) {
          latestManualResultByIssue.set(issueCode, {
            result,
            reportPath:
              typeof meta.verificationReportPath === "string"
                ? meta.verificationReportPath
                : null,
          });
        }
      }
    }

    const items: AgentOpsVerificationRequestItem[] = [];

    for (const finding of findings) {
      const latestReport = latestReportByIssue.get(finding.issue_code) ?? null;
      if (!findingQualifiesForVerificationRequest(finding, latestReport)) {
        continue;
      }

      const metadata = finding.metadata ?? {};
      const rejected = rejectedIssues.has(finding.issue_code);
      const approvedTarget =
        typeof metadata.approvedVerificationTarget === "string"
          ? metadata.approvedVerificationTarget
          : null;
      const commands = buildVerificationCommands(
        finding.issue_code,
        approvedTarget,
      );
      const manualResult = latestManualResultByIssue.get(finding.issue_code);

      const reportSummary =
        latestReport?.reportText?.slice(0, 500) ||
        latestReport?.validationSummary ||
        null;

      items.push({
        findingId: finding.id,
        issueCode: finding.issue_code,
        title: finding.title,
        severity: finding.severity,
        queueState: finding.queue_state,
        status: finding.status,
        handoffId:
          (typeof metadata.latestCursorHandoffId === "string"
            ? metadata.latestCursorHandoffId
            : null) ??
          latestReport?.handoffId ??
          null,
        cursorReportSummary: reportSummary,
        filesChanged: latestReport?.filesChanged ?? [],
        readyForVerification:
          latestReport?.readyForVerification === true ||
          metadata.verificationRequested === true,
        requestStatus: deriveVerificationRequestStatus(
          metadata,
          latestReport?.readyForVerification === true,
          rejected,
        ),
        commands,
        latestVerificationResult:
          manualResult?.result ??
          (typeof metadata.latestVerificationResult === "string" &&
          isVerificationResultStatus(metadata.latestVerificationResult)
            ? metadata.latestVerificationResult
            : null),
        verificationReportPath:
          manualResult?.reportPath ??
          (typeof metadata.latestVerificationReportPath === "string"
            ? metadata.latestVerificationReportPath
            : null),
        rejected,
      });
    }

    return ok(items);
  } catch (error) {
    return fail(error);
  }
}

/** Owner approves running verification for an issue (Stage 13E; no command execution). */
export async function approveAgentOpsVerificationRequest(
  input: AgentOpsApproveVerificationRequestInput,
): Promise<AgentOpsWriteResult<AgentOpsVerificationRequestActionResult>> {
  try {
    const issueCode = input.issueCode?.trim();
    if (!issueCode) return writeFail("issueCode is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);
    if (!findingResult.data) {
      return writeFail("Finding not found for verification request.");
    }

    const commands = buildVerificationCommands(
      issueCode,
      input.verificationTarget,
    );
    const approvedCommand =
      input.verificationCommand?.trim() || commands.reportOnlyCommand;
    const nowIso = new Date().toISOString();

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: findingResult.data.id,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || null,
        metadata: {
          action: "verification_request_approved",
          issueCode,
          handoffId: input.handoffId?.trim() || findingResult.data.metadata.latestCursorHandoffId || null,
          verificationTarget: commands.verificationTarget,
          approvedVerificationCommand: approvedCommand,
          reportOnlyCommand: commands.reportOnlyCommand,
          applyCommand: commands.applyCommand,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    const metadataPatch = {
      verificationRequestStatus: "ready_to_run" as const,
      approvedVerificationCommand: approvedCommand,
      approvedVerificationTarget: commands.verificationTarget,
      verificationApprovedAt: nowIso,
      verificationRequestRejected: false,
    };
    const metaUpdate = await updateFindingVerificationRequestMetadata(
      findingResult.data.id,
      findingResult.data.metadata,
      metadataPatch,
    );
    if (metaUpdate.error) return writeFail(metaUpdate.error);

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: findingResult.data.id,
      issueCode,
      requestStatus: "ready_to_run",
      message: "Verification run approved. Use the recommended CLI command manually.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Record that Owner copied a verification command (Stage 13E). */
export async function recordAgentOpsVerificationCommandCopied(
  input: AgentOpsVerificationCommandCopiedInput,
): Promise<AgentOpsWriteResult<AgentOpsVerificationRequestActionResult>> {
  try {
    const issueCode = input.issueCode?.trim();
    const command = input.command?.trim();
    if (!issueCode || !command) {
      return writeFail("issueCode and command are required.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: findingResult.data?.id ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || null,
        metadata: {
          action: "verification_command_copied",
          issueCode,
          handoffId: input.handoffId?.trim() || null,
          commandType: input.commandType,
          command,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    if (findingResult.data?.id) {
      const metaUpdate = await updateFindingVerificationRequestMetadata(
        findingResult.data.id,
        findingResult.data.metadata,
        { verificationRequestStatus: "command_copied" },
      );
      if (metaUpdate.error) return writeFail(metaUpdate.error);
    }

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: findingResult.data?.id ?? null,
      issueCode,
      requestStatus: "command_copied",
      message: "Verification command copy recorded. Run it manually in your terminal.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Mark verification as running manually (Stage 13E). */
export async function markAgentOpsVerificationRunning(input: {
  issueCode: string;
  handoffId?: string | null;
  note?: string;
}): Promise<AgentOpsWriteResult<AgentOpsVerificationRequestActionResult>> {
  try {
    const issueCode = input.issueCode?.trim();
    if (!issueCode) return writeFail("issueCode is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: findingResult.data?.id ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || null,
        metadata: {
          action: "verification_running_manual",
          issueCode,
          handoffId: input.handoffId?.trim() || null,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    if (findingResult.data?.id) {
      const metaUpdate = await updateFindingVerificationRequestMetadata(
        findingResult.data.id,
        findingResult.data.metadata,
        { verificationRequestStatus: "verification_running_manual" },
      );
      if (metaUpdate.error) return writeFail(metaUpdate.error);
    }

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: findingResult.data?.id ?? null,
      issueCode,
      requestStatus: "verification_running_manual",
      message: "Marked verification as running manually.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Reject a verification request (Stage 13E). */
export async function rejectAgentOpsVerificationRequest(input: {
  issueCode: string;
  note?: string;
}): Promise<AgentOpsWriteResult<AgentOpsVerificationRequestActionResult>> {
  try {
    const issueCode = input.issueCode?.trim();
    if (!issueCode) return writeFail("issueCode is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: findingResult.data?.id ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || null,
        metadata: {
          action: "verification_request_rejected",
          issueCode,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    if (findingResult.data?.id) {
      const metaUpdate = await updateFindingVerificationRequestMetadata(
        findingResult.data.id,
        findingResult.data.metadata,
        {
          verificationRequestStatus: "owner_review_required",
          verificationRequestRejected: true,
          verificationRequested: false,
        },
      );
      if (metaUpdate.error) return writeFail(metaUpdate.error);
    }

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: findingResult.data?.id ?? null,
      issueCode,
      requestStatus: "owner_review_required",
      message: "Verification request rejected.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Record manual verification result after CLI run (Stage 13E). */
export async function recordAgentOpsManualVerificationResult(
  input: AgentOpsManualVerificationResultInput,
): Promise<AgentOpsWriteResult<AgentOpsVerificationRequestActionResult>> {
  try {
    const issueCode = input.issueCode?.trim();
    const summary = input.summary?.trim();
    if (!issueCode || !summary) {
      return writeFail("issueCode and summary are required.");
    }
    if (!isVerificationResultStatus(input.verificationResult)) {
      return writeFail("Invalid verification result.");
    }

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);
    if (!findingResult.data) {
      return writeFail("Finding not found.");
    }

    const findingMeta = findingResult.data;
    const fullFindingResult = await fetchAgentOpsFindingById(findingMeta.id);
    if (fullFindingResult.error || !fullFindingResult.data) {
      return writeFail(fullFindingResult.error ?? "Finding not found.");
    }
    const finding = fullFindingResult.data;
    const reportPath = input.verificationReportPath?.trim() || null;
    const requestStatus = mapVerificationResultToRequestStatus(
      input.verificationResult,
    );

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: finding.id,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || null,
        metadata: {
          action: "manual_verification_result",
          issueCode,
          verificationResult: input.verificationResult,
          verificationReportPath: reportPath,
          summary,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    const metadataPatch: Record<string, unknown> = {
      latestVerificationResult: input.verificationResult,
      latestVerificationReportPath: reportPath,
      latestVerificationResultAt: new Date().toISOString(),
      verificationRequestStatus:
        input.verificationResult === "verified_fixed"
          ? "verification_passed"
          : requestStatus,
    };

    if (input.verificationResult === "verified_fixed") {
      if (finding.queue_state === "backlog") {
        const backlogResult = await resolveAgentOpsBacklogFinding({
          findingId: finding.id,
          resolutionStatus: "Verified Fixed",
          note: input.note?.trim() || summary,
          evidenceReportPath: reportPath ?? undefined,
          evidenceSummary: summary,
          metadata: { source: "stage_13e_manual_verification" },
        });
        if (backlogResult.error) return writeFail(backlogResult.error);
        return writeOk({
          feedbackId: feedbackData.id as string,
          findingId: finding.id,
          issueCode,
          requestStatus: "verification_passed",
          message:
            backlogResult.data?.message ??
            "Manual verification recorded; backlog finding archived as Verified Fixed.",
        });
      }

      const pending = await getPendingVerificationForFinding(finding.id);
      if (pending.error) return writeFail(pending.error);
      if (pending.data?.id) {
        const verifyResult = await recordAgentOpsVerificationResult({
          verificationId: pending.data.id,
          findingId: finding.id,
          verificationStatus: input.verificationResult,
          actualResult: summary,
          regressionCheckSummary: reportPath,
          metadata: { source: "stage_13e_manual_verification", verificationReportPath: reportPath },
        });
        if (verifyResult.error) return writeFail(verifyResult.error);
        return writeOk({
          feedbackId: feedbackData.id as string,
          findingId: finding.id,
          issueCode,
          requestStatus: "verification_passed",
          message:
            verifyResult.data?.message ??
            "Manual verification recorded via existing verification queue.",
        });
      }
    }

    const metaUpdate = await updateFindingVerificationRequestMetadata(
      finding.id,
      finding.metadata,
      metadataPatch,
    );
    if (metaUpdate.error) return writeFail(metaUpdate.error);

  if (
      input.verificationResult === "still_broken" ||
      input.verificationResult === "needs_follow_up_fix" ||
      input.verificationResult === "verification_blocked"
    ) {
      // Keep issue open — metadata only unless pending verification exists.
      const pending = await getPendingVerificationForFinding(finding.id);
      if (pending.error) return writeFail(pending.error);
      if (pending.data?.id) {
        const verifyResult = await recordAgentOpsVerificationResult({
          verificationId: pending.data.id,
          findingId: finding.id,
          verificationStatus: input.verificationResult,
          actualResult: summary,
          metadata: { source: "stage_13e_manual_verification", verificationReportPath: reportPath },
        });
        if (verifyResult.error) return writeFail(verifyResult.error);
        return writeOk({
          feedbackId: feedbackData.id as string,
          findingId: finding.id,
          issueCode,
          requestStatus,
          message:
            verifyResult.data?.message ?? "Manual verification result recorded.",
        });
      }
    }

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: finding.id,
      issueCode,
      requestStatus,
      message: "Manual verification result recorded. Issue status unchanged.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Request follow-up fix after verification review (Stage 13E). */
export async function requestAgentOpsFollowUpFix(input: {
  issueCode: string;
  note?: string;
}): Promise<AgentOpsWriteResult<AgentOpsVerificationRequestActionResult>> {
  try {
    const issueCode = input.issueCode?.trim();
    if (!issueCode) return writeFail("issueCode is required.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const findingResult = await fetchLatestFindingByIssueCode(issueCode);
    if (findingResult.error) return writeFail(findingResult.error);

    const { data: feedbackData, error: feedbackError } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: findingResult.data?.id ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark: input.note?.trim() || null,
        metadata: {
          action: "request_follow_up_fix",
          issueCode,
        },
      })
      .select("id")
      .single();
    if (feedbackError) return writeFail(feedbackError);

    if (findingResult.data?.id) {
      const metaUpdate = await updateFindingVerificationRequestMetadata(
        findingResult.data.id,
        findingResult.data.metadata,
        {
          verificationRequestStatus: "verification_failed",
          latestVerificationResult: "needs_follow_up_fix",
        },
      );
      if (metaUpdate.error) return writeFail(metaUpdate.error);
    }

    return writeOk({
      feedbackId: feedbackData.id as string,
      findingId: findingResult.data?.id ?? null,
      issueCode,
      requestStatus: "verification_failed",
      message: "Follow-up fix requested.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

type UpdateFindingOptions = {
  queueState?: AgentOpsQueueState;
  clearRank?: boolean;
};

/** Update finding status (and optional queue_state) for Owner actions. */
export async function updateAgentOpsFindingStatus(
  findingId: string,
  status: AgentOpsFindingStatus,
  options?: UpdateFindingOptions,
): Promise<AgentOpsWriteResult<AgentOpsFinding>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);

    const patch: Record<string, unknown> = { status };
    if (options?.queueState) patch.queue_state = options.queueState;
    if (options?.clearRank) patch.top10_rank = null;

    const { data, error } = await supabase
      .from("agentops_findings")
      .update(patch)
      .eq("id", findingId)
      .select("*")
      .single();

    if (error) return writeFail(error);
    return writeOk(data as AgentOpsFinding);
  } catch (error) {
    return writeFail(error);
  }
}

async function getPendingVerificationForFinding(
  findingId: string,
): Promise<AgentOpsWriteResult<{ id: string } | null>> {
  const { data, error } = await supabase
    .from("agentops_verifications")
    .select("id")
    .eq("finding_id", findingId)
    .in("verification_status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return writeFail(error);
  return writeOk(data ? { id: data.id as string } : null);
}

function buildExpectedFixSummary(finding: AgentOpsFinding): string {
  const strategy = finding.recommended_fix_strategy?.trim();
  if (strategy) return strategy;
  const prompt = finding.cursor_prompt?.trim();
  if (prompt) return prompt.slice(0, 4000);
  return finding.problem;
}

async function createPendingVerification(
  findingId: string,
  markedFixedFeedbackId: string | null,
  finding: AgentOpsFinding,
): Promise<AgentOpsWriteResult<{ verificationId: string }>> {
  const { data, error } = await supabase
    .from("agentops_verifications")
    .insert({
      finding_id: findingId,
      marked_fixed_feedback_id: markedFixedFeedbackId,
      verification_status: "pending",
      expected_fix: buildExpectedFixSummary(finding),
      metadata: {},
    })
    .select("id")
    .single();

  if (error) return writeFail(error);
  return writeOk({ verificationId: data.id as string });
}

export async function approveAgentOpsFinding(
  findingId: string,
  remark?: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "approve",
    remark,
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not record approval.");
  }

  const updated = await updateAgentOpsFindingStatus(findingId, "Approved for Fix", {
    queueState: "active_top_10",
  });
  if (updated.error) return writeFail(updated.error);

  return writeOk({
    finding: updated.data,
    feedbackId: feedback.data.feedbackId,
    message: "Finding approved for fix.",
  });
}

export async function rejectAgentOpsFinding(
  findingId: string,
  remark?: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "reject",
    remark,
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not record rejection.");
  }

  const updated = await updateAgentOpsFindingStatus(findingId, "Rejected", {
    queueState: "archived",
    clearRank: true,
  });
  if (updated.error) return writeFail(updated.error);

  return attachAutoRefillAfterSlotOpened(
    writeOk({
      finding: updated.data,
      feedbackId: feedback.data.feedbackId,
      message: "Finding rejected and archived from Active Top 10.",
    }),
    await maybeRefillAgentOpsAfterSlotOpened({
      enabled: true,
      reason: "reject",
    }),
  );
}

export async function deferAgentOpsFinding(
  findingId: string,
  remark?: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "defer",
    remark,
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not record deferral.");
  }

  const updated = await updateAgentOpsFindingStatus(findingId, "Deferred", {
    queueState: "archived",
    clearRank: true,
  });
  if (updated.error) return writeFail(updated.error);

  return attachAutoRefillAfterSlotOpened(
    writeOk({
      finding: updated.data,
      feedbackId: feedback.data.feedbackId,
      message: "Finding deferred and archived from Active Top 10.",
    }),
    await maybeRefillAgentOpsAfterSlotOpened({
      enabled: true,
      reason: "defer",
    }),
  );
}

export async function markAgentOpsFalsePositive(
  findingId: string,
  remark?: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "false_positive",
    remark,
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not record false positive.");
  }

  const updated = await updateAgentOpsFindingStatus(findingId, "False Positive", {
    queueState: "archived",
    clearRank: true,
  });
  if (updated.error) return writeFail(updated.error);

  return attachAutoRefillAfterSlotOpened(
    writeOk({
      finding: updated.data,
      feedbackId: feedback.data.feedbackId,
      message: "Finding marked false positive and archived from Active Top 10.",
    }),
    await maybeRefillAgentOpsAfterSlotOpened({
      enabled: true,
      reason: "false_positive",
    }),
  );
}

export async function markAgentOpsInProgress(
  findingId: string,
  remark?: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "mark_in_progress",
    remark,
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not record in-progress feedback.");
  }

  const updated = await updateAgentOpsFindingStatus(findingId, "In Progress", {
    queueState: "active_top_10",
  });
  if (updated.error) return writeFail(updated.error);

  return writeOk({
    finding: updated.data,
    feedbackId: feedback.data.feedbackId,
    message: "Finding marked in progress.",
  });
}

export async function markAgentOpsFixed(
  findingId: string,
  remark?: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const findingResult = await fetchAgentOpsFindingById(findingId);
  if (findingResult.error || !findingResult.data) {
    return writeFail(findingResult.error ?? "Finding not found.");
  }

  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "mark_fixed",
    remark,
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not record mark-fixed feedback.");
  }

  const updated = await updateAgentOpsFindingStatus(
    findingId,
    "Marked Fixed by Piter",
    { queueState: "active_top_10" },
  );
  if (updated.error || !updated.data) {
    return writeFail(updated.error ?? "Could not update finding status.");
  }

  const pending = await getPendingVerificationForFinding(findingId);
  if (pending.error) return writeFail(pending.error);

  let verificationId = pending.data?.id ?? null;
  if (!verificationId) {
    const created = await createPendingVerification(
      findingId,
      feedback.data.feedbackId,
      updated.data,
    );
    if (created.error || !created.data) {
      return writeFail(created.error ?? "Could not create verification record.");
    }
    verificationId = created.data.verificationId;
  }

  return writeOk({
    finding: updated.data,
    feedbackId: feedback.data.feedbackId,
    verificationId,
    message:
      "Finding marked fixed. Pending verification created — item stays in Active Top 10 until verified.",
  });
}

export async function requestAgentOpsVerification(
  findingId: string,
  remark?: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const findingResult = await fetchAgentOpsFindingById(findingId);
  if (findingResult.error || !findingResult.data) {
    return writeFail(findingResult.error ?? "Finding not found.");
  }

  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "request_verification",
    remark,
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not record verification request.");
  }

  const pending = await getPendingVerificationForFinding(findingId);
  if (pending.error) return writeFail(pending.error);

  let verificationId = pending.data?.id ?? null;
  let finding = findingResult.data;

  if (verificationId) {
    const updated = await updateAgentOpsFindingStatus(
      findingId,
      "Verification Running",
      { queueState: "active_top_10" },
    );
    if (updated.error) return writeFail(updated.error);
    finding = updated.data ?? finding;
  } else {
    const created = await createPendingVerification(
      findingId,
      feedback.data.feedbackId,
      finding,
    );
    if (created.error || !created.data) {
      return writeFail(created.error ?? "Could not create verification record.");
    }
    verificationId = created.data.verificationId;
  }

  return writeOk({
    finding,
    feedbackId: feedback.data.feedbackId,
    verificationId,
    message: "Verification requested. Finding remains active until verified.",
  });
}

export async function addAgentOpsRemark(
  findingId: string,
  remark: string,
): Promise<AgentOpsWriteResult<AgentOpsActionResult>> {
  const trimmed = remark.trim();
  if (!trimmed) {
    return writeFail("Remark text is required.");
  }

  const feedback = await addAgentOpsOwnerFeedback({
    findingId,
    feedbackType: "remark",
    remark: trimmed,
  });
  if (feedback.error || !feedback.data) {
    return writeFail(feedback.error ?? "Could not save remark.");
  }

  const finding = await fetchAgentOpsFindingById(findingId);
  if (finding.error) return writeFail(finding.error);

  return writeOk({
    finding: finding.data,
    feedbackId: feedback.data.feedbackId,
    message: "Remark saved.",
  });
}

// ---------------------------------------------------------------------------
// Verification result flow (Stage 6) — manual Owner recording only
// ---------------------------------------------------------------------------

/** Pending or running verifications with related finding rows. */
export async function getAgentOpsPendingVerifications(): Promise<
  AgentOpsReadResult<AgentOpsPendingVerificationItem[]>
> {
  try {
    const { data: verifications, error } = await supabase
      .from("agentops_verifications")
      .select("*")
      .in("verification_status", ["pending", "running"])
      .order("created_at", { ascending: false });

    if (error) return fail(error);

    const rows = (verifications ?? []) as AgentOpsVerification[];
    const findingIds = [
      ...new Set(rows.map((row) => row.finding_id).filter(Boolean)),
    ];

    const findingsById = new Map<string, AgentOpsFinding>();
    if (findingIds.length > 0) {
      const { data: findings, error: findingsError } = await supabase
        .from("agentops_findings")
        .select("*")
        .in("id", findingIds);

      if (findingsError) return fail(findingsError);

      for (const finding of findings ?? []) {
        findingsById.set(finding.id as string, finding as AgentOpsFinding);
      }
    }

    return ok(
      rows.map((verification) => ({
        verification,
        finding: findingsById.get(verification.finding_id) ?? null,
      })),
    );
  } catch (error) {
    return fail(error);
  }
}

/** Record a manual targeted verification result (no automated runner). */
export async function recordAgentOpsVerificationResult(
  input: AgentOpsVerificationResultInput,
): Promise<AgentOpsWriteResult<AgentOpsVerificationActionResult>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);

    if (!input.verificationId?.trim() || !input.findingId?.trim()) {
      return writeFail("verificationId and findingId are required.");
    }

    if (!isVerificationResultStatus(input.verificationStatus)) {
      return writeFail("Invalid verification result status.");
    }

    const blockedReason = input.actualResult?.trim() ?? "";
    if (input.verificationStatus === "verification_blocked" && !blockedReason) {
      return writeFail("Blocked reason is required for Verification Blocked.");
    }

    const { data: existingVerification, error: loadError } = await supabase
      .from("agentops_verifications")
      .select("*")
      .eq("id", input.verificationId)
      .eq("finding_id", input.findingId)
      .maybeSingle();

    if (loadError) return writeFail(loadError);
    if (!existingVerification) {
      return writeFail("Verification record not found for this finding.");
    }

    const currentStatus = existingVerification.verification_status as string;
    if (currentStatus !== "pending" && currentStatus !== "running") {
      return writeFail(
        "Only pending or running verifications can receive a result.",
      );
    }

    const verifiedAt = new Date().toISOString();
    const verificationPatch: Record<string, unknown> = {
      verification_status: input.verificationStatus,
      actual_result: input.actualResult?.trim() || null,
      regression_check_summary: input.regressionCheckSummary?.trim() || null,
      follow_up_prompt: input.followUpPrompt?.trim() || null,
      verified_at: verifiedAt,
    };

    if (input.metadata) {
      const existingMeta =
        (existingVerification.metadata as Record<string, unknown>) ?? {};
      verificationPatch.metadata = { ...existingMeta, ...input.metadata };
    }

    const { data: updatedVerification, error: verificationError } = await supabase
      .from("agentops_verifications")
      .update(verificationPatch)
      .eq("id", input.verificationId)
      .select("*")
      .single();

    if (verificationError) return writeFail(verificationError);

    const findingStatus = mapVerificationStatusToFindingStatus(
      input.verificationStatus,
    );
    const queueState = mapVerificationStatusToQueueState(input.verificationStatus);
    const archiveOnVerify = input.verificationStatus === "verified_fixed";

    const updatedFinding = await updateAgentOpsFindingStatus(
      input.findingId,
      findingStatus,
      {
        queueState,
        clearRank: archiveOnVerify,
      },
    );
    if (updatedFinding.error) return writeFail(updatedFinding.error);

    const messages: Record<AgentOpsVerificationResultStatus, string> = {
      verified_fixed:
        "Finding verified fixed and archived from Active Top 10.",
      still_broken:
        "Recorded still broken. Finding remains in Active Top 10.",
      needs_follow_up_fix:
        "Recorded needs follow-up fix. Finding remains in Active Top 10.",
      verification_blocked:
        "Verification blocked. Finding remains in Active Top 10.",
    };

    const baseResult = writeOk({
      finding: updatedFinding.data,
      verification: updatedVerification as AgentOpsVerification,
      message: messages[input.verificationStatus],
    });

    if (input.verificationStatus !== "verified_fixed") {
      return baseResult;
    }

    return attachAutoRefillAfterSlotOpened(
      baseResult,
      await maybeRefillAgentOpsAfterSlotOpened({
        enabled: true,
        reason: "verified_fixed",
      }),
    );
  } catch (error) {
    return writeFail(error);
  }
}

// ---------------------------------------------------------------------------
// Active Top 10 refill (Stage 7) — manual + Stage 7B auto after slot opened
// ---------------------------------------------------------------------------

type AutoRefillAttachable = {
  message: string;
  refillResult?: AgentOpsRefillResult | null;
  needsNewAgentOpsScan?: boolean;
};

function isEmptyBacklogRefill(refill: AgentOpsRefillResult): boolean {
  return (
    refill.promotedCount === 0 &&
    refill.openSlotsBefore > 0 &&
    (refill.backlogCountBefore === 0 ||
      refill.message.includes("No backlog findings available"))
  );
}

function composeMessageWithAutoRefill(
  baseMessage: string,
  refill: AgentOpsRefillResult | null,
  needsNewAgentOpsScan: boolean,
): string {
  if (!refill) return baseMessage;

  if (refill.promotedCount > 0) {
    const countLabel =
      refill.promotedCount === 1
        ? "1 backlog finding"
        : `${refill.promotedCount} backlog findings`;
    return `${baseMessage} AgentOps promoted ${countLabel} to keep the queue filled.`;
  }

  if (needsNewAgentOpsScan) {
    return `${baseMessage} No backlog findings were available. New AgentOps scan needed to create more tasks.`;
  }

  if (refill.openSlotsBefore <= 0) {
    return `${baseMessage} Active Top 10 is already full.`;
  }

  return baseMessage;
}

function attachAutoRefillAfterSlotOpened<T extends AutoRefillAttachable>(
  actionResult: AgentOpsWriteResult<T>,
  refillResult: AgentOpsWriteResult<AgentOpsRefillResult | null>,
): AgentOpsWriteResult<T> {
  if (actionResult.error || !actionResult.data) {
    return actionResult;
  }

  if (refillResult.error) {
    return writeOk({
      ...actionResult.data,
      refillResult: null,
      needsNewAgentOpsScan: false,
      message: `${actionResult.data.message} Auto-refill could not run: ${refillResult.error}`,
    });
  }

  const refill = refillResult.data;
  if (!refill) {
    return actionResult;
  }

  const needsNewAgentOpsScan = isEmptyBacklogRefill(refill);

  return writeOk({
    ...actionResult.data,
    refillResult: refill,
    needsNewAgentOpsScan,
    message: composeMessageWithAutoRefill(
      actionResult.data.message,
      refill,
      needsNewAgentOpsScan,
    ),
  });
}

/** Auto-refill open Active Top 10 slots after an owner action archives a finding. */
export async function maybeRefillAgentOpsAfterSlotOpened(options?: {
  enabled?: boolean;
  reason?: string;
}): Promise<AgentOpsWriteResult<AgentOpsRefillResult | null>> {
  try {
    if (options?.enabled === false) {
      return writeOk(null);
    }

    void options?.reason;

    return await refillAgentOpsActiveTop10FromBacklog();
  } catch (error) {
    return writeFail(error);
  }
}

/** Promote backlog findings into open Active Top 10 slots (max 10 open). */
export async function refillAgentOpsActiveTop10FromBacklog(): Promise<
  AgentOpsWriteResult<AgentOpsRefillResult>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);

    const backlogCountBeforeQuery = await supabase
      .from("agentops_findings")
      .select("id", { count: "exact", head: true })
      .eq("queue_state", "backlog");

    if (backlogCountBeforeQuery.error) {
      return writeFail(backlogCountBeforeQuery.error);
    }

    const backlogCountBefore = backlogCountBeforeQuery.count ?? 0;

    const { data: activeRows, error: activeError } = await activeTop10Query().select(
      "id, top10_rank",
    );

    if (activeError) return writeFail(activeError);

    const activeOpenCountBefore = activeRows?.length ?? 0;
    const openSlotsBefore = Math.max(0, 10 - activeOpenCountBefore);

    if (openSlotsBefore <= 0) {
      return writeOk({
        promotedCount: 0,
        openSlotsBefore: 0,
        activeOpenCountBefore,
        activeOpenCountAfter: activeOpenCountBefore,
        backlogCountBefore,
        backlogCountAfter: backlogCountBefore,
        promotedFindings: [],
        message: "Active Top 10 is already full.",
      });
    }

    const { data: backlogPool, error: backlogError } = await supabase
      .from("agentops_findings")
      .select("*")
      .eq("queue_state", "backlog")
      .in("status", [...BACKLOG_PROMOTABLE_STATUSES])
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (backlogError) return writeFail(backlogError);

    const sortedCandidates = [...((backlogPool ?? []) as AgentOpsFinding[])].sort(
      sortBacklogPromotionCandidates,
    );
    const toPromote = sortedCandidates.slice(0, openSlotsBefore);

    if (toPromote.length === 0) {
      return writeOk({
        promotedCount: 0,
        openSlotsBefore,
        activeOpenCountBefore,
        activeOpenCountAfter: activeOpenCountBefore,
        backlogCountBefore,
        backlogCountAfter: backlogCountBefore,
        promotedFindings: [],
        message:
          "No backlog findings available. Run AgentOps scan to generate more findings.",
      });
    }

    const availableRanks = getAvailableTop10Ranks(
      (activeRows ?? []) as Pick<AgentOpsFinding, "top10_rank">[],
    );

    if (availableRanks.length < toPromote.length) {
      return writeFail("Not enough open Top 10 rank slots for promotion.");
    }

    const promotedFindings: AgentOpsFinding[] = [];

    for (let index = 0; index < toPromote.length; index += 1) {
      const candidate = toPromote[index];
      const rank = availableRanks[index];
      if (rank == null) break;

      const { data: updatedFinding, error: updateError } = await supabase
        .from("agentops_findings")
        .update({
          queue_state: "active_top_10",
          status: "Active Top 10",
          top10_rank: rank,
        })
        .eq("id", candidate.id)
        .select("*")
        .single();

      if (updateError) return writeFail(updateError);

      const { error: promotionError } = await supabase
        .from("agentops_backlog_promotions")
        .insert({
          finding_id: candidate.id,
          run_id: null,
          promoted_from: "backlog",
          promoted_reason: MANUAL_REFILL_PROMOTION_REASON,
          queue_slot_number: rank,
        });

      if (promotionError) return writeFail(promotionError);

      promotedFindings.push(updatedFinding as AgentOpsFinding);
    }

    const activeOpenAfterQuery = await activeTop10CountQuery();
    if (activeOpenAfterQuery.error) return writeFail(activeOpenAfterQuery.error);

    const backlogCountAfterQuery = await supabase
      .from("agentops_findings")
      .select("id", { count: "exact", head: true })
      .eq("queue_state", "backlog");

    if (backlogCountAfterQuery.error) {
      return writeFail(backlogCountAfterQuery.error);
    }

    const activeOpenCountAfter = activeOpenAfterQuery.count ?? activeOpenCountBefore;
    const backlogCountAfter = backlogCountAfterQuery.count ?? backlogCountBefore;
    const promotedCount = promotedFindings.length;

    return writeOk({
      promotedCount,
      openSlotsBefore,
      activeOpenCountBefore,
      activeOpenCountAfter,
      backlogCountBefore,
      backlogCountAfter,
      promotedFindings,
      message:
        promotedCount === 1
          ? "Promoted 1 backlog finding into Active Top 10."
          : `Promoted ${promotedCount} backlog findings into Active Top 10.`,
    });
  } catch (error) {
    return writeFail(error);
  }
}

// ---------------------------------------------------------------------------
// Stage 8 — static backlog import from guardrail action plan
// ---------------------------------------------------------------------------

function isStaticImportPlan(value: unknown): value is AgentOpsStaticImportPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as AgentOpsStaticImportPlan;
  return Array.isArray(plan.candidates) && typeof plan.generatedAt === "string";
}

async function fetchAgentOpsStaticImportPlan(): Promise<AgentOpsStaticImportPlan | null> {
  try {
    const response = await fetch(STATIC_IMPORT_PLAN_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    return isStaticImportPlan(json) ? json : null;
  } catch {
    return null;
  }
}

function buildStaticImportInsertRow(candidate: AgentOpsStaticImportCandidate) {
  return {
    issue_code: candidate.issueCode,
    title: candidate.title,
    category: candidate.category,
    severity: candidate.severity,
    status: candidate.status,
    queue_state: candidate.queueState,
    top10_rank: null,
    route: candidate.route,
    module: candidate.module,
    page_type: candidate.pageType,
    review_panel: candidate.reviewPanel,
    evidence_summary: candidate.evidenceSummary,
    problem: candidate.problem,
    expected_result: candidate.expectedResult,
    recommended_fix_strategy: candidate.recommendedFixStrategy,
    cursor_prompt: candidate.cursorPrompt,
    non_change_rules: candidate.nonChangeRules,
    priority_score: candidate.priorityScore,
    agent_id: candidate.agentId || STATIC_IMPORT_AGENT_ID,
    metadata: {
      ...candidate.metadata,
      imported: true,
      sample: false,
    },
    run_id: null,
  };
}

/** Preview static import plan served from public/agentops/static-import-plan.json. */
export async function getAgentOpsStaticImportPreview(): Promise<
  AgentOpsReadResult<AgentOpsStaticImportPreview>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const plan = await fetchAgentOpsStaticImportPlan();
    if (!plan) {
      return ok({
        plan: null,
        available: false,
        message:
          "Static import plan not found. Run npm run qa:agentops-static-import-plan, then refresh.",
      });
    }

    return ok({
      plan,
      available: true,
      message: `${plan.summary.totalCandidates} static findings ready to import (${plan.summary.actionable} actionable, ${plan.summary.reviewNeeded} review-needed).`,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Import backlog findings from static plan (owner-confirmed; skips duplicate issue_code). */
export async function importAgentOpsStaticFindingsFromPlan(): Promise<
  AgentOpsWriteResult<AgentOpsStaticImportResult>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);

    const plan = await fetchAgentOpsStaticImportPlan();
    if (!plan || plan.candidates.length === 0) {
      return writeFail(
        "Static import plan is unavailable. Run npm run qa:agentops-static-import-plan first.",
      );
    }

    const importedIssueCodes: string[] = [];
    const skippedIssueCodes: string[] = [];
    let failedCount = 0;

    for (const candidate of plan.candidates) {
      if (!candidate.issueCode?.trim()) {
        failedCount += 1;
        continue;
      }

      if (candidate.metadata?.sample === true) {
        skippedIssueCodes.push(candidate.issueCode);
        continue;
      }

      const { data: existing, error: existingError } = await supabase
        .from("agentops_findings")
        .select("id")
        .eq("issue_code", candidate.issueCode)
        .maybeSingle();

      if (existingError) return writeFail(existingError);
      if (existing?.id) {
        skippedIssueCodes.push(candidate.issueCode);
        continue;
      }

      const { error: insertError } = await supabase
        .from("agentops_findings")
        .insert(buildStaticImportInsertRow(candidate));

      if (insertError) {
        if (insertError.code === "23505") {
          skippedIssueCodes.push(candidate.issueCode);
          continue;
        }
        failedCount += 1;
        continue;
      }

      importedIssueCodes.push(candidate.issueCode);
    }

    const importedCount = importedIssueCodes.length;
    const skippedCount = skippedIssueCodes.length;

    const message =
      importedCount === 0 && skippedCount > 0
        ? `No new findings imported (${skippedCount} already present or skipped).`
        : importedCount === 1
          ? `Imported 1 static backlog finding. ${skippedCount} skipped as duplicates.`
          : `Imported ${importedCount} static backlog findings. ${skippedCount} skipped as duplicates.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`;

    return writeOk({
      importedCount,
      skippedCount,
      failedCount,
      importedIssueCodes,
      skippedIssueCodes,
      message,
    });
  } catch (error) {
    return writeFail(error);
  }
}

// ---------------------------------------------------------------------------
// Stage 9E — browser QA smoke backlog import
// ---------------------------------------------------------------------------

function isBrowserImportPlan(value: unknown): value is AgentOpsBrowserImportPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as AgentOpsBrowserImportPlan;
  return Array.isArray(plan.candidates) && typeof plan.generatedAt === "string";
}

async function fetchAgentOpsBrowserImportPlan(): Promise<AgentOpsBrowserImportPlan | null> {
  try {
    const response = await fetch(BROWSER_IMPORT_PLAN_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    return isBrowserImportPlan(json) ? json : null;
  } catch {
    return null;
  }
}

function buildBrowserImportInsertRow(candidate: AgentOpsStaticImportCandidate) {
  return {
    ...buildStaticImportInsertRow(candidate),
    agent_id: candidate.agentId || BROWSER_IMPORT_AGENT_ID,
    metadata: {
      ...candidate.metadata,
      imported: true,
      importSource: candidate.metadata?.importSource ?? "synthetic-users-smoke",
      sample: false,
    },
  };
}

/** Preview browser smoke import plan from public/agentops/browser-findings-import-plan.json. */
export async function getAgentOpsBrowserImportPreview(): Promise<
  AgentOpsReadResult<AgentOpsBrowserImportPreview>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const plan = await fetchAgentOpsBrowserImportPlan();
    if (!plan) {
      return ok({
        plan: null,
        available: false,
        message:
          "Browser import plan not found. Run npm run qa:agentops-browser-findings-import-plan, then refresh.",
      });
    }

    return ok({
      plan,
      available: true,
      message: `${plan.summary.totalCandidates} browser QA findings ready to import (${plan.summary.loginFailures} login-related).`,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Import backlog findings from browser smoke plan (owner-confirmed; skips duplicate issue_code). */
export async function importAgentOpsBrowserFindingsFromPlan(): Promise<
  AgentOpsWriteResult<AgentOpsBrowserImportResult>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);

    const plan = await fetchAgentOpsBrowserImportPlan();
    if (!plan || plan.candidates.length === 0) {
      return writeFail(
        "Browser import plan is unavailable. Run npm run qa:agentops-browser-findings-import-plan first.",
      );
    }

    const importedIssueCodes: string[] = [];
    const skippedIssueCodes: string[] = [];
    let failedCount = 0;

    for (const candidate of plan.candidates) {
      if (!candidate.issueCode?.trim()) {
        failedCount += 1;
        continue;
      }

      if (candidate.metadata?.sample === true) {
        skippedIssueCodes.push(candidate.issueCode);
        continue;
      }

      const { data: existing, error: existingError } = await supabase
        .from("agentops_findings")
        .select("id")
        .eq("issue_code", candidate.issueCode)
        .maybeSingle();

      if (existingError) return writeFail(existingError);
      if (existing?.id) {
        skippedIssueCodes.push(candidate.issueCode);
        continue;
      }

      const { error: insertError } = await supabase
        .from("agentops_findings")
        .insert(buildBrowserImportInsertRow(candidate));

      if (insertError) {
        if (insertError.code === "23505") {
          skippedIssueCodes.push(candidate.issueCode);
          continue;
        }
        failedCount += 1;
        continue;
      }

      importedIssueCodes.push(candidate.issueCode);
    }

    const importedCount = importedIssueCodes.length;
    const skippedCount = skippedIssueCodes.length;

    const message =
      importedCount === 0 && skippedCount > 0
        ? `No new browser findings imported (${skippedCount} already present or skipped).`
        : importedCount === 1
          ? `Imported 1 browser backlog finding. ${skippedCount} skipped as duplicates.`
          : `Imported ${importedCount} browser backlog findings. ${skippedCount} skipped as duplicates.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`;

    return writeOk({
      importedCount,
      skippedCount,
      failedCount,
      importedIssueCodes,
      skippedIssueCodes,
      message,
    });
  } catch (error) {
    return writeFail(error);
  }
}

// ---------------------------------------------------------------------------
// Stage 11B — write/draft safe QA backlog import
// ---------------------------------------------------------------------------

function isWriteDraftImportPlan(value: unknown): value is AgentOpsWriteDraftImportPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as AgentOpsWriteDraftImportPlan;
  return Array.isArray(plan.candidates) && typeof plan.generatedAt === "string";
}

async function fetchAgentOpsWriteDraftImportPlan(): Promise<AgentOpsWriteDraftImportPlan | null> {
  try {
    const response = await fetch(WRITE_DRAFT_IMPORT_PLAN_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    return isWriteDraftImportPlan(json) ? json : null;
  } catch {
    return null;
  }
}

function buildWriteDraftImportInsertRow(candidate: AgentOpsStaticImportCandidate) {
  return {
    ...buildStaticImportInsertRow(candidate),
    agent_id: candidate.agentId || WRITE_DRAFT_IMPORT_AGENT_ID,
    metadata: {
      ...candidate.metadata,
      imported: true,
      importSource: candidate.metadata?.importSource ?? "write-draft-safe",
      sample: false,
    },
  };
}

/** Preview write/draft import plan from public/agentops/write-draft-findings-import-plan.json. */
export async function getAgentOpsWriteDraftImportPreview(): Promise<
  AgentOpsReadResult<AgentOpsWriteDraftImportPreview>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const plan = await fetchAgentOpsWriteDraftImportPlan();
    if (!plan) {
      return ok({
        plan: null,
        available: false,
        message:
          "Write/draft import plan not found. Run npm run qa:agentops-write-draft-findings-import-plan, then refresh.",
      });
    }

    return ok({
      plan,
      available: true,
      message: `${plan.summary.totalCandidates} write/draft QA candidates ready (${plan.summary.piterDecisionNeededCount} need Piter decision).`,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Import backlog findings from write/draft plan (owner-confirmed; skips duplicate issue_code). */
export async function importAgentOpsWriteDraftFindingsFromPlan(): Promise<
  AgentOpsWriteResult<AgentOpsWriteDraftImportResult>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);

    const plan = await fetchAgentOpsWriteDraftImportPlan();
    if (!plan || plan.candidates.length === 0) {
      return writeFail(
        "Write/draft import plan is unavailable. Run npm run qa:agentops-write-draft-findings-import-plan first.",
      );
    }

    const importedIssueCodes: string[] = [];
    const skippedIssueCodes: string[] = [];
    let failedCount = 0;

    for (const candidate of plan.candidates) {
      if (!candidate.issueCode?.trim()) {
        failedCount += 1;
        continue;
      }

      if (candidate.metadata?.sample === true) {
        skippedIssueCodes.push(candidate.issueCode);
        continue;
      }

      const { data: existing, error: existingError } = await supabase
        .from("agentops_findings")
        .select("id")
        .eq("issue_code", candidate.issueCode)
        .maybeSingle();

      if (existingError) {
        failedCount += 1;
        continue;
      }

      if (existing) {
        skippedIssueCodes.push(candidate.issueCode);
        continue;
      }

      const row = buildWriteDraftImportInsertRow(candidate);
      const { error: insertError } = await supabase.from("agentops_findings").insert(row);

      if (insertError) {
        failedCount += 1;
        continue;
      }

      importedIssueCodes.push(candidate.issueCode);
    }

    const importedCount = importedIssueCodes.length;
    const skippedCount = skippedIssueCodes.length;

    const message =
      importedCount === 0 && skippedCount > 0
        ? `No new write/draft findings imported (${skippedCount} already present or skipped).`
        : importedCount === 1
          ? `Imported 1 write/draft backlog finding. ${skippedCount} skipped as duplicates.`
          : `Imported ${importedCount} write/draft backlog findings. ${skippedCount} skipped as duplicates.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`;

    return writeOk({
      importedCount,
      skippedCount,
      failedCount,
      importedIssueCodes,
      skippedIssueCodes,
      message,
    });
  } catch (error) {
    return writeFail(error);
  }
}

// ---------------------------------------------------------------------------
// Stage 10B — role workflow QA backlog import
// ---------------------------------------------------------------------------

function isWorkflowImportPlan(value: unknown): value is AgentOpsWorkflowImportPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as AgentOpsWorkflowImportPlan;
  return Array.isArray(plan.candidates) && typeof plan.generatedAt === "string";
}

async function fetchAgentOpsWorkflowImportPlan(): Promise<AgentOpsWorkflowImportPlan | null> {
  try {
    const response = await fetch(WORKFLOW_IMPORT_PLAN_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    return isWorkflowImportPlan(json) ? json : null;
  } catch {
    return null;
  }
}

function buildWorkflowImportInsertRow(candidate: AgentOpsStaticImportCandidate) {
  return {
    ...buildStaticImportInsertRow(candidate),
    agent_id: candidate.agentId || WORKFLOW_IMPORT_AGENT_ID,
    metadata: {
      ...candidate.metadata,
      imported: true,
      importSource: candidate.metadata?.importSource ?? "role-workflow-safe",
      sample: false,
    },
  };
}

/** Preview role workflow import plan from public/agentops/role-workflow-import-plan.json. */
export async function getAgentOpsWorkflowImportPreview(): Promise<
  AgentOpsReadResult<AgentOpsWorkflowImportPreview>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const plan = await fetchAgentOpsWorkflowImportPlan();
    if (!plan) {
      return ok({
        plan: null,
        available: false,
        message:
          "Workflow import plan not found. Run npm run qa:agentops-role-workflow-review, then refresh.",
      });
    }

    const piterCount = plan.summary.piterDecisionNeededCount ?? 0;
    return ok({
      plan,
      available: true,
      message: `${plan.summary.totalCandidates} workflow QA backlog candidates ready (${piterCount} need Piter decision).`,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Import backlog findings from role workflow plan (owner-confirmed; skips duplicate issue_code). */
export async function importAgentOpsWorkflowFindingsFromPlan(): Promise<
  AgentOpsWriteResult<AgentOpsWorkflowImportResult>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);

    const plan = await fetchAgentOpsWorkflowImportPlan();
    if (!plan || plan.candidates.length === 0) {
      return writeFail(
        "Workflow import plan is unavailable. Run npm run qa:agentops-role-workflow-review first.",
      );
    }

    const importedIssueCodes: string[] = [];
    const skippedIssueCodes: string[] = [];
    let failedCount = 0;

    for (const candidate of plan.candidates) {
      if (!candidate.issueCode?.trim()) {
        failedCount += 1;
        continue;
      }

      if (candidate.metadata?.sample === true) {
        skippedIssueCodes.push(candidate.issueCode);
        continue;
      }

      const { data: existing, error: existingError } = await supabase
        .from("agentops_findings")
        .select("id")
        .eq("issue_code", candidate.issueCode)
        .maybeSingle();

      if (existingError) return writeFail(existingError);
      if (existing?.id) {
        skippedIssueCodes.push(candidate.issueCode);
        continue;
      }

      const { error: insertError } = await supabase
        .from("agentops_findings")
        .insert(buildWorkflowImportInsertRow(candidate));

      if (insertError) {
        if (insertError.code === "23505") {
          skippedIssueCodes.push(candidate.issueCode);
          continue;
        }
        failedCount += 1;
        continue;
      }

      importedIssueCodes.push(candidate.issueCode);
    }

    const importedCount = importedIssueCodes.length;
    const skippedCount = skippedIssueCodes.length;

    const message =
      importedCount === 0 && skippedCount > 0
        ? `No new workflow findings imported (${skippedCount} already present or skipped).`
        : importedCount === 1
          ? `Imported 1 workflow backlog finding. ${skippedCount} skipped as duplicates.`
          : `Imported ${importedCount} workflow backlog findings. ${skippedCount} skipped as duplicates.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`;

    return writeOk({
      importedCount,
      skippedCount,
      failedCount,
      importedIssueCodes,
      skippedIssueCodes,
      message,
    });
  } catch (error) {
    return writeFail(error);
  }
}

// ---------------------------------------------------------------------------
// Stage 10H — backlog verified-fixed resolution (Owner-only; backlog queue only)
// ---------------------------------------------------------------------------

function mapBacklogResolutionToFindingStatus(
  resolution: AgentOpsBacklogResolutionStatus,
): AgentOpsFindingStatus {
  return resolution;
}

function mapBacklogResolutionToFeedbackType(
  resolution: AgentOpsBacklogResolutionStatus,
): AgentOpsFeedbackActionInput["feedbackType"] {
  switch (resolution) {
    case "Verified Fixed":
      return "remark";
    case "False Positive":
      return "false_positive";
    case "Deferred":
      return "defer";
    default: {
      const _exhaustive: never = resolution;
      return _exhaustive;
    }
  }
}

/** Resolve a backlog finding after QA verification (not for Active Top 10). */
export async function resolveAgentOpsBacklogFinding(
  input: AgentOpsBacklogResolutionInput,
): Promise<AgentOpsWriteResult<AgentOpsBacklogResolutionResult>> {
  try {
    const findingId = input.findingId?.trim();
    if (!findingId) {
      return writeFail("findingId is required.");
    }

    if (!BACKLOG_RESOLUTION_STATUSES.includes(input.resolutionStatus)) {
      return writeFail("Invalid backlog resolution status.");
    }

    const findingResult = await fetchAgentOpsFindingById(findingId);
    if (findingResult.error || !findingResult.data) {
      return writeFail(findingResult.error ?? "Finding not found.");
    }

    const finding = findingResult.data;

    if (finding.queue_state !== "backlog") {
      return writeFail(
        "Only backlog queue findings can use Mark Verified Fixed. Active Top 10 issues must use Mark Fixed and the Verification Queue.",
      );
    }

    if (!BACKLOG_RESOLVABLE_STATUSES.includes(finding.status)) {
      return writeFail(
        `Finding status "${finding.status}" cannot be resolved from backlog with this action.`,
      );
    }

    const resolution = input.resolutionStatus;
    const targetStatus = mapBacklogResolutionToFindingStatus(resolution);
    const feedbackType = mapBacklogResolutionToFeedbackType(resolution);

    const feedbackMetadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      resolution_status: resolution,
      evidence_report_path: input.evidenceReportPath?.trim() || null,
      evidence_summary: input.evidenceSummary?.trim() || null,
    };

    if (resolution === "Verified Fixed") {
      feedbackMetadata.action = "backlog_verified_fixed";
    }

    const feedback = await addAgentOpsOwnerFeedback({
      findingId,
      feedbackType,
      remark: input.note?.trim() || undefined,
      metadata: feedbackMetadata,
    });
    if (feedback.error || !feedback.data) {
      return writeFail(feedback.error ?? "Could not record backlog resolution feedback.");
    }

    const updated = await updateAgentOpsFindingStatus(findingId, targetStatus, {
      queueState: "archived",
      clearRank: true,
    });
    if (updated.error || !updated.data) {
      return writeFail(updated.error ?? "Could not update finding status.");
    }

    return writeOk({
      finding: updated.data,
      feedbackId: feedback.data.feedbackId,
      message: `Backlog finding ${finding.issue_code} marked as ${resolution} and archived.`,
    });
  } catch (error) {
    return writeFail(error);
  }
}
