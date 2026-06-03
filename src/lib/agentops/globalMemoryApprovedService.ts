import { supabase } from "@/lib/supabase";

import { getAgentOpsOwnerStatus } from "./service";
import type {
  AgentOpsCreateGlobalMemoryApprovedRecordResult,
  AgentOpsGlobalMemoryApprovedMemoryType,
  AgentOpsGlobalMemoryApprovedOverview,
  AgentOpsGlobalMemoryApprovedRecord,
  AgentOpsGlobalMemoryApprovedRecordStatus,
  AgentOpsGlobalMemoryApprovedScope,
  AgentOpsGlobalMemoryCandidate,
  AgentOpsGlobalMemoryHermesPreviewExclusionSummary,
  AgentOpsGlobalMemoryHermesPreviewResult,
  AgentOpsReadResult,
  AgentOpsWriteResult,
} from "./types";

const APPROVED_MEMORY_ACTIONS = new Set([
  "global_memory_approved_record",
  "global_memory_sot_proposal",
  "global_memory_duplicate_warning",
]);

const HERMES_PREVIEW_INCLUDED_STATUSES = new Set<AgentOpsGlobalMemoryApprovedRecordStatus>([
  "approved_memory",
  "advisory_only",
  "sot_proposal_pending",
]);

const HERMES_PREVIEW_DEFAULT_LIMIT = 10;
const HERMES_PREVIEW_HARD_MAX = 20;
const HERMES_PREVIEW_TEXT_MAX_CHARS = 200;

const HERMES_PREVIEW_SAFETY_DISCLAIMER = [
  "Preview only — Issue Chat may receive this block when VITE_AGENTOPS_ISSUE_CHAT_GLOBAL_MEMORY=true; Hermes coordinator runtime is not active.",
  "Metadata only — no durable memory or runtime write.",
  "No source-of-truth file write.",
  "No AgentMemory write.",
  "SOT proposals are not official law.",
  "Official law still comes only from src/design-system/aixia-global/**.",
] as const;

const SOT_PROPOSAL_DISCLAIMER = "SOT proposal pending — not official law";

function ok<T>(data: T): AgentOpsReadResult<T> {
  return { data, error: null };
}

function fail<T>(error: unknown): AgentOpsReadResult<T> {
  const message = error instanceof Error ? error.message : String(error);
  return { data: null, error: message };
}

function writeOk<T>(data: T): AgentOpsWriteResult<T> {
  return { data, error: null };
}

function writeFail<T>(error: unknown): AgentOpsWriteResult<T> {
  const message = error instanceof Error ? error.message : String(error);
  return { data: null, error: message };
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

function mapCandidateTypeToMemoryType(
  candidate: AgentOpsGlobalMemoryCandidate,
): AgentOpsGlobalMemoryApprovedMemoryType {
  if (
    candidate.candidateType === "design_sot" ||
    candidate.targetMemoryLevel === "source-of-truth-candidate"
  ) {
    return "source_of_truth_proposal";
  }
  switch (candidate.candidateType) {
    case "tool_rule":
      return "tool_rule";
    case "workflow":
      return "workflow_rule";
    case "route_module":
      return "route_module_rule";
    case "piter_preference":
      return "piter_preference";
    case "guardrail":
    case "global_rule":
    case "repeated_issue":
      return "global_rule";
    default:
      return "advisory";
  }
}

function mapCandidateToScope(
  candidate: AgentOpsGlobalMemoryCandidate,
): AgentOpsGlobalMemoryApprovedScope {
  switch (candidate.targetMemoryLevel) {
    case "source-of-truth-candidate":
      return "design";
    case "tool-rule":
      return "tools";
    case "workflow-rule":
      return "workflow";
    case "piter-preference":
      return "advisory";
    default:
      if (candidate.candidateType === "design_sot") return "design";
      if (candidate.candidateType === "tool_rule") return "tools";
      if (candidate.candidateType === "workflow") return "workflow";
      return "global";
  }
}

function resolveApprovedRecordStatus(
  candidate: AgentOpsGlobalMemoryCandidate,
  memoryType: AgentOpsGlobalMemoryApprovedMemoryType,
): AgentOpsGlobalMemoryApprovedRecordStatus {
  if (
    memoryType === "source_of_truth_proposal" ||
    candidate.targetMemoryLevel === "source-of-truth-candidate" ||
    Boolean(candidate.targetOwnerFile)
  ) {
    return "sot_proposal_pending";
  }
  if (memoryType === "advisory" || candidate.targetMemoryLevel === "piter-preference") {
    return "advisory_only";
  }
  return "approved_memory";
}

function shouldCreateSotProposal(
  candidate: AgentOpsGlobalMemoryCandidate,
  memoryType: AgentOpsGlobalMemoryApprovedMemoryType,
): boolean {
  return (
    memoryType === "source_of_truth_proposal" ||
    candidate.candidateType === "design_sot" ||
    candidate.targetMemoryLevel === "source-of-truth-candidate" ||
    Boolean(candidate.targetOwnerFile?.trim())
  );
}

function buildTagsForApprovedRecord(
  candidate: AgentOpsGlobalMemoryCandidate,
  memoryType: AgentOpsGlobalMemoryApprovedMemoryType,
): string[] {
  const tags = new Set<string>(["hermes_h2_f3a", "metadata_only", candidate.candidateType]);
  if (memoryType === "source_of_truth_proposal") tags.add("sot_proposal");
  if (candidate.sourceFindingId) tags.add("scan_finding");
  return [...tags];
}

export function buildAgentOpsGlobalMemoryApprovedRecordFromCandidate(
  candidate: AgentOpsGlobalMemoryCandidate,
  approvedBy: string,
): AgentOpsGlobalMemoryApprovedRecord {
  const memoryType = mapCandidateTypeToMemoryType(candidate);
  const scope = mapCandidateToScope(candidate);
  const status = resolveApprovedRecordStatus(candidate, memoryType);
  const approvedAt = new Date().toISOString();

  return {
    memoryId: `gmem-approved-${Date.now()}-${candidate.candidateId.slice(-8)}`,
    feedbackId: null,
    sourceCandidateId: candidate.candidateId,
    title: candidate.title,
    memoryText: candidate.proposedMemoryText,
    memoryType,
    scope,
    sourceReport: candidate.sourceReport,
    sourcePath: candidate.sourcePath,
    sourceFindingId: candidate.sourceFindingId,
    evidence: candidate.evidence,
    targetOwnerFile: candidate.targetOwnerFile,
    sourceCandidateStatus: candidate.status,
    approvedBy,
    approvedAt,
    status,
    dedupeKey: candidate.dedupeKey,
    tags: buildTagsForApprovedRecord(candidate, memoryType),
    requiresPiterApproval: true,
    noSotFileWrite: true,
    noRegistryWrite: true,
    noAgentMemoryWrite: true,
    noHermesRuntimeWrite: true,
    metadataOnly: true,
    hasSotProposal: shouldCreateSotProposal(candidate, memoryType),
  };
}

function parseApprovedRecordObject(value: unknown): AgentOpsGlobalMemoryApprovedRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.memoryId !== "string" || typeof raw.sourceCandidateId !== "string") {
    return null;
  }
  if (typeof raw.title !== "string" || typeof raw.memoryText !== "string") {
    return null;
  }

  return {
    memoryId: raw.memoryId,
    feedbackId: typeof raw.feedbackId === "string" ? raw.feedbackId : null,
    sourceCandidateId: raw.sourceCandidateId,
    title: raw.title,
    memoryText: raw.memoryText,
    memoryType:
      (raw.memoryType as AgentOpsGlobalMemoryApprovedMemoryType) ?? "advisory",
    scope: (raw.scope as AgentOpsGlobalMemoryApprovedScope) ?? "global",
    sourceReport: typeof raw.sourceReport === "string" ? raw.sourceReport : undefined,
    sourcePath: typeof raw.sourcePath === "string" ? raw.sourcePath : undefined,
    sourceFindingId:
      typeof raw.sourceFindingId === "string" ? raw.sourceFindingId : undefined,
    evidence: typeof raw.evidence === "string" ? raw.evidence : undefined,
    targetOwnerFile:
      typeof raw.targetOwnerFile === "string" ? raw.targetOwnerFile : undefined,
    sourceCandidateStatus:
      typeof raw.sourceCandidateStatus === "string" ? raw.sourceCandidateStatus : "approved",
    approvedBy: typeof raw.approvedBy === "string" ? raw.approvedBy : undefined,
    approvedAt:
      typeof raw.approvedAt === "string" ? raw.approvedAt : new Date().toISOString(),
    status:
      (raw.status as AgentOpsGlobalMemoryApprovedRecordStatus) ?? "approved_memory",
    dedupeKey: typeof raw.dedupeKey === "string" ? raw.dedupeKey : "",
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    requiresPiterApproval: true,
    noSotFileWrite: true,
    noRegistryWrite: true,
    noAgentMemoryWrite: true,
    noHermesRuntimeWrite: true,
    metadataOnly: true,
    hasSotProposal: raw.hasSotProposal === true,
  };
}

async function insertGlobalMemoryApprovedFeedback(input: {
  remark: string;
  metadata: Record<string, unknown>;
}): Promise<AgentOpsWriteResult<{ feedbackId: string }>> {
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
      remark: input.remark,
      metadata: {
        ...input.metadata,
        stage: "hermes_h2_f3a",
        noDurableMemoryWrite: true,
        noHermesRuntime: true,
        noSotFileWrite: true,
        noAgentmemoryWrite: true,
        noRegistryWrite: true,
        noFileWrites: true,
        metadataOnly: true,
      },
    })
    .select("id")
    .single();

  if (error) return writeFail(error);
  return writeOk({ feedbackId: data.id as string });
}

async function fetchApprovedMemoryFeedbackRows(): Promise<
  AgentOpsReadResult<Array<{ id: string; metadata: Record<string, unknown>; created_at: string }>>
> {
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return fail(ownerGate.error);

  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .select("id, metadata, created_at")
    .is("finding_id", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return fail(error);

  const rows = (data ?? [])
    .map((row) => ({
      id: row.id as string,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {},
      created_at: row.created_at as string,
    }))
    .filter((row) => {
      const action = row.metadata.action;
      return typeof action === "string" && APPROVED_MEMORY_ACTIONS.has(action);
    });

  return ok(rows);
}

export async function getAgentOpsGlobalMemoryApprovedRecords(): Promise<
  AgentOpsReadResult<AgentOpsGlobalMemoryApprovedOverview>
> {
  try {
    const rowsResult = await fetchApprovedMemoryFeedbackRows();
    if (rowsResult.error) return fail(rowsResult.error);
    const rows = rowsResult.data ?? [];

    const sotProposalMemoryIds = new Set<string>();
    for (const row of rows) {
      if (row.metadata.action !== "global_memory_sot_proposal") continue;
      const memoryId = String(row.metadata.memoryId ?? "");
      if (memoryId) sotProposalMemoryIds.add(memoryId);
    }

    const recordsByDedupeKey = new Map<string, AgentOpsGlobalMemoryApprovedRecord>();
    for (const row of rows) {
      if (row.metadata.action !== "global_memory_approved_record") continue;
      const parsed = parseApprovedRecordObject(row.metadata.record);
      if (!parsed) continue;
      const dedupeKey = parsed.dedupeKey || parsed.memoryId;
      if (recordsByDedupeKey.has(dedupeKey)) continue;

      recordsByDedupeKey.set(dedupeKey, {
        ...parsed,
        feedbackId: row.id,
        hasSotProposal: parsed.hasSotProposal || sotProposalMemoryIds.has(parsed.memoryId),
      });
    }

    const records = [...recordsByDedupeKey.values()].sort(
      (a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime(),
    );

    const counts = {
      total: records.length,
      approvedMemory: records.filter((r) => r.status === "approved_memory").length,
      advisoryOnly: records.filter((r) => r.status === "advisory_only").length,
      sotProposalPending: records.filter((r) => r.status === "sot_proposal_pending").length,
    };

    return ok({ records, counts });
  } catch (error) {
    return fail(error);
  }
}

export async function createAgentOpsGlobalMemoryApprovedRecordFromCandidate(
  candidate: AgentOpsGlobalMemoryCandidate,
  approvedBy: string,
): Promise<AgentOpsWriteResult<AgentOpsCreateGlobalMemoryApprovedRecordResult>> {
  try {
    const existingResult = await getAgentOpsGlobalMemoryApprovedRecords();
    if (existingResult.error) return writeFail(existingResult.error);

    const duplicate = (existingResult.data?.records ?? []).find(
      (record) => record.dedupeKey === candidate.dedupeKey,
    );

    if (duplicate) {
      await insertGlobalMemoryApprovedFeedback({
        remark: `Duplicate approved global memory skipped for candidate ${candidate.candidateId}.`,
        metadata: {
          action: "global_memory_duplicate_warning",
          dedupeKey: candidate.dedupeKey,
          existingMemoryId: duplicate.memoryId,
          sourceCandidateId: candidate.candidateId,
          message:
            "An approved global memory record already exists for this report finding. No duplicate was created.",
        },
      });

      return writeOk({
        created: false,
        duplicate: true,
        memoryId: duplicate.memoryId,
        feedbackId: duplicate.feedbackId,
        sotProposalCreated: false,
        message:
          "Approved for future memory recorded. Existing approved global memory already on file for this finding (metadata only — no duplicate created).",
      });
    }

    const record = buildAgentOpsGlobalMemoryApprovedRecordFromCandidate(
      candidate,
      approvedBy,
    );

    const approvedInsert = await insertGlobalMemoryApprovedFeedback({
      remark: `Approved global memory (metadata): ${record.title}`,
      metadata: {
        action: "global_memory_approved_record",
        memoryId: record.memoryId,
        sourceCandidateId: record.sourceCandidateId,
        record,
      },
    });
    if (approvedInsert.error) return writeFail(approvedInsert.error);

    let sotProposalCreated = false;
    if (shouldCreateSotProposal(candidate, record.memoryType)) {
      const sotInsert = await insertGlobalMemoryApprovedFeedback({
        remark: `Source-of-truth proposal pending (metadata only): ${record.title}`,
        metadata: {
          action: "global_memory_sot_proposal",
          memoryId: record.memoryId,
          sourceCandidateId: record.sourceCandidateId,
          targetOwnerFile: record.targetOwnerFile ?? null,
          proposalStatus: "pending",
          proposalNote:
            "Metadata-only SOT proposal. Official owner files are not modified until a separate promotion step.",
          memoryText: record.memoryText,
        },
      });
      if (sotInsert.error) return writeFail(sotInsert.error);
      sotProposalCreated = true;
    }

    return writeOk({
      created: true,
      duplicate: false,
      memoryId: record.memoryId,
      feedbackId: approvedInsert.data!.feedbackId,
      sotProposalCreated,
      message: sotProposalCreated
        ? "Approved global memory saved (metadata only). Source-of-truth proposal pending — no owner files were written."
        : "Approved global memory saved (metadata only). Hermes runtime and source-of-truth files were not updated.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

function truncateHermesPreviewText(text: string, maxChars = HERMES_PREVIEW_TEXT_MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1)}…`;
}

function isHermesPreviewEligible(record: AgentOpsGlobalMemoryApprovedRecord): {
  eligible: boolean;
  reason?: "empty_memory_text" | "unsupported_status";
} {
  if (!HERMES_PREVIEW_INCLUDED_STATUSES.has(record.status)) {
    return { eligible: false, reason: "unsupported_status" };
  }
  if (!record.memoryText.trim()) {
    return { eligible: false, reason: "empty_memory_text" };
  }
  return { eligible: true };
}

function isSotProposalPendingForPreview(record: AgentOpsGlobalMemoryApprovedRecord): boolean {
  return (
    record.status === "sot_proposal_pending" ||
    record.hasSotProposal === true ||
    record.memoryType === "source_of_truth_proposal"
  );
}

function getHermesPreviewTierRank(record: AgentOpsGlobalMemoryApprovedRecord): number {
  if (isSotProposalPendingForPreview(record)) return 0;
  switch (record.memoryType) {
    case "global_rule":
    case "design_rule":
    case "workflow_rule":
      return 1;
    case "tool_rule":
      return 2;
    case "route_module_rule":
      return 3;
    default:
      return 4;
  }
}

function getHermesPreviewMemoryTypeSubRank(
  memoryType: AgentOpsGlobalMemoryApprovedMemoryType,
): number {
  switch (memoryType) {
    case "global_rule":
      return 0;
    case "design_rule":
      return 1;
    case "workflow_rule":
      return 2;
    case "tool_rule":
      return 0;
    case "route_module_rule":
      return 0;
    case "piter_preference":
      return 0;
    case "advisory":
      return 1;
    default:
      return 2;
  }
}

function compareHermesPreviewRecords(
  a: AgentOpsGlobalMemoryApprovedRecord,
  b: AgentOpsGlobalMemoryApprovedRecord,
): number {
  const tierA = getHermesPreviewTierRank(a);
  const tierB = getHermesPreviewTierRank(b);
  if (tierA !== tierB) return tierA - tierB;

  const subA = getHermesPreviewMemoryTypeSubRank(a.memoryType);
  const subB = getHermesPreviewMemoryTypeSubRank(b.memoryType);
  if (subA !== subB) return subA - subB;

  return new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime();
}

function formatHermesPreviewMemoryTypeLabel(
  memoryType: AgentOpsGlobalMemoryApprovedMemoryType,
): string {
  return memoryType.replaceAll("_", " ");
}

function formatHermesPreviewStatusLabel(
  status: AgentOpsGlobalMemoryApprovedRecordStatus,
): string {
  if (status === "approved_memory") return "approved memory";
  if (status === "advisory_only") return "advisory only";
  return "SOT proposal pending";
}

export interface FormatAgentOpsGlobalMemoryForHermesContextOptions {
  /** Default 10; UI-only cap between 1 and hard max 20. */
  limit?: number;
}

const ISSUE_CHAT_GLOBAL_MEMORY_DEFAULT_LIMIT = 10;

function readIssueChatGlobalMemoryClientFlag(): string | undefined {
  const value = import.meta.env.VITE_AGENTOPS_ISSUE_CHAT_GLOBAL_MEMORY;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Hermes H2-F3B-2 — Issue Chat global memory preview (client flag, default off). */
export function isAgentOpsIssueChatGlobalMemoryEnabled(): boolean {
  return readIssueChatGlobalMemoryClientFlag() === "true";
}

export interface AgentOpsIssueChatGlobalMemorySnippetsResult {
  snippets: string[];
  includedCount: number;
  attached: boolean;
}

/**
 * Hermes H2-F3B-2 — load and format approved global memory for Issue Chat (owner-gated).
 */
export async function loadGlobalApprovedMemorySnippetsForIssueChat(options?: {
  limit?: number;
}): Promise<AgentOpsReadResult<AgentOpsIssueChatGlobalMemorySnippetsResult>> {
  if (!isAgentOpsIssueChatGlobalMemoryEnabled()) {
    return ok({ snippets: [], includedCount: 0, attached: false });
  }

  try {
    const overview = await getAgentOpsGlobalMemoryApprovedRecords();
    if (overview.error) return fail(overview.error);

    const preview = formatAgentOpsGlobalMemoryForHermesContext(overview.data?.records ?? [], {
      limit: options?.limit ?? ISSUE_CHAT_GLOBAL_MEMORY_DEFAULT_LIMIT,
    });
    const snippets = preview.entries.map((entry) => entry.previewLine);
    const includedCount = preview.stats.includedCount;

    return ok({
      snippets,
      includedCount,
      attached: includedCount > 0,
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Hermes H2-F3B-2 — append labeled global memory section to a system prompt (read-only context).
 */
export function appendAgentOpsGlobalApprovedMemoryPromptLines(
  lines: string[],
  snippets?: string[],
): void {
  const items = (snippets ?? []).map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) return;

  lines.push(
    "Approved global memory context — metadata only, not official source-of-truth:",
    "- These entries are owner-approved metadata from AgentOps global memory (H2-F3A).",
    "- They are NOT official design law. Official law comes only from src/design-system/aixia-global/**.",
    "- SOT proposals are pending proposals and must not override source-of-truth owner files.",
    "- Do not write memory, AgentMemory, registry, or source-of-truth files from this context.",
    ...items.map((item) => `- ${item}`),
  );
}

/**
 * Hermes H2-F3B-1 — pure read-only formatter for approved global memory preview.
 * Does not call Supabase or Hermes. Candidate rows and sidecars are excluded upstream.
 */
export function formatAgentOpsGlobalMemoryForHermesContext(
  records: AgentOpsGlobalMemoryApprovedRecord[],
  options?: FormatAgentOpsGlobalMemoryForHermesContextOptions,
): AgentOpsGlobalMemoryHermesPreviewResult {
  const requestedLimit = options?.limit ?? HERMES_PREVIEW_DEFAULT_LIMIT;
  const previewLimit = Math.min(
    Math.max(Math.trunc(requestedLimit), 1),
    HERMES_PREVIEW_HARD_MAX,
  );

  const totalApprovedRecords = records.length;
  let emptyMemoryTextCount = 0;
  let unsupportedStatusCount = 0;

  const eligible: AgentOpsGlobalMemoryApprovedRecord[] = [];
  for (const record of records) {
    const check = isHermesPreviewEligible(record);
    if (!check.eligible) {
      if (check.reason === "empty_memory_text") emptyMemoryTextCount += 1;
      if (check.reason === "unsupported_status") unsupportedStatusCount += 1;
      continue;
    }
    eligible.push(record);
  }

  eligible.sort(compareHermesPreviewRecords);

  const includedRecords = eligible.slice(0, previewLimit);
  const overLimitCount = Math.max(0, eligible.length - includedRecords.length);

  const entries = includedRecords.map((record, index) => {
    const sotProposalPending = isSotProposalPendingForPreview(record);
    const compactMemoryText = truncateHermesPreviewText(record.memoryText);
    const typeLabel = formatHermesPreviewMemoryTypeLabel(record.memoryType);
    const statusLabel = formatHermesPreviewStatusLabel(record.status);
    const previewParts = [
      `${index + 1}. ${record.title}`,
      typeLabel,
      statusLabel,
      compactMemoryText,
    ];
    if (sotProposalPending) {
      previewParts.push(SOT_PROPOSAL_DISCLAIMER);
    }
    return {
      order: index + 1,
      memoryId: record.memoryId,
      title: record.title,
      memoryType: record.memoryType,
      scope: record.scope,
      status: record.status,
      compactMemoryText,
      sotProposalPending,
      previewLine: previewParts.join(" · "),
    };
  });

  const exclusions: AgentOpsGlobalMemoryHermesPreviewExclusionSummary[] = [];
  if (emptyMemoryTextCount > 0) {
    exclusions.push({
      reason: "empty_memory_text",
      count: emptyMemoryTextCount,
      detail: "Approved record had no memory text.",
    });
  }
  if (unsupportedStatusCount > 0) {
    exclusions.push({
      reason: "unsupported_status",
      count: unsupportedStatusCount,
      detail: "Record status is not eligible for Hermes preview.",
    });
  }
  if (overLimitCount > 0) {
    exclusions.push({
      reason: "over_preview_limit",
      count: overLimitCount,
      detail: `Eligible records beyond preview limit (${previewLimit}).`,
    });
  }

  const ineligibleCount = emptyMemoryTextCount + unsupportedStatusCount;
  const excludedCount = ineligibleCount + overLimitCount;

  return {
    entries,
    safetyDisclaimer: [...HERMES_PREVIEW_SAFETY_DISCLAIMER],
    stats: {
      totalApprovedRecords,
      eligibleCount: eligible.length,
      includedCount: entries.length,
      excludedCount,
      previewLimit,
      hardMax: HERMES_PREVIEW_HARD_MAX,
      mode: "preview_only",
    },
    exclusions,
  };
}
