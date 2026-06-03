import { supabase } from "@/lib/supabase";

import { fetchAgentOpsGlobalMemoryCandidateDraftsFromReport } from "./globalMemoryCandidateClient";
import { createAgentOpsGlobalMemoryApprovedRecordFromCandidate } from "./globalMemoryApprovedService";
import { getAgentOpsOwnerStatus } from "./service";
import type {
  AgentOpsGenerateGlobalMemoryCandidatesResult,
  AgentOpsGlobalMemoryCandidate,
  AgentOpsGlobalMemoryCandidateDecision,
  AgentOpsGlobalMemoryCandidateDecisionInput,
  AgentOpsGlobalMemoryCandidateEditInput,
  AgentOpsGlobalMemoryCandidateStatus,
  AgentOpsGlobalMemoryCandidatesOverview,
  AgentOpsReadResult,
  AgentOpsWriteResult,
} from "./types";

const CANDIDATE_ACTIONS = new Set([
  "global_memory_candidate_batch",
  "global_memory_candidate_draft",
  "global_memory_candidate_edit",
  "global_memory_candidate_decision",
  "global_memory_candidate_source_report",
]);

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

function buildDedupeKey(candidate: Pick<
  AgentOpsGlobalMemoryCandidate,
  "sourceReport" | "sourceFindingId" | "candidateType"
>): string {
  return `${candidate.sourceReport}|${candidate.sourceFindingId ?? ""}|${candidate.candidateType}`;
}

function isCandidateDecision(value: string): value is AgentOpsGlobalMemoryCandidateDecision {
  return (
    value === "approve_for_future_memory" ||
    value === "reject" ||
    value === "review_later" ||
    value === "needs_cleanup"
  );
}

function mapDecisionToStatus(
  decision: AgentOpsGlobalMemoryCandidateDecision,
): AgentOpsGlobalMemoryCandidateStatus {
  switch (decision) {
    case "approve_for_future_memory":
      return "approved";
    case "reject":
      return "rejected";
    case "review_later":
      return "review_later";
    case "needs_cleanup":
      return "needs_cleanup";
    default:
      return "pending_review";
  }
}

function parseCandidateObject(value: unknown): AgentOpsGlobalMemoryCandidate | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.candidateId !== "string") return null;
  if (typeof raw.title !== "string" || typeof raw.proposedMemoryText !== "string") {
    return null;
  }
  if (typeof raw.sourceReport !== "string" || typeof raw.candidateType !== "string") {
    return null;
  }

  const candidate: AgentOpsGlobalMemoryCandidate = {
    candidateId: raw.candidateId,
    feedbackId: typeof raw.feedbackId === "string" ? raw.feedbackId : null,
    candidateType: raw.candidateType as AgentOpsGlobalMemoryCandidate["candidateType"],
    title: raw.title,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    proposedMemoryText: raw.proposedMemoryText,
    sourceReport: raw.sourceReport,
    sourcePath: typeof raw.sourcePath === "string" ? raw.sourcePath : undefined,
    sourceFindingId: typeof raw.sourceFindingId === "string" ? raw.sourceFindingId : undefined,
    evidence: typeof raw.evidence === "string" ? raw.evidence : undefined,
    targetMemoryLevel:
      (raw.targetMemoryLevel as AgentOpsGlobalMemoryCandidate["targetMemoryLevel"]) ?? "global",
    targetOwnerFile: typeof raw.targetOwnerFile === "string" ? raw.targetOwnerFile : undefined,
    confidence:
      (raw.confidence as AgentOpsGlobalMemoryCandidate["confidence"]) ?? "medium",
    risk: (raw.risk as AgentOpsGlobalMemoryCandidate["risk"]) ?? "low",
    status: (raw.status as AgentOpsGlobalMemoryCandidateStatus) ?? "pending_review",
    requiresPiterApproval: true,
    noDurableMemoryWrite: true,
    noHermesRuntime: true,
    noSotFileWrite: true,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    decidedAt: typeof raw.decidedAt === "string" ? raw.decidedAt : undefined,
    decidedBy: typeof raw.decidedBy === "string" ? raw.decidedBy : undefined,
    decisionNote: typeof raw.decisionNote === "string" ? raw.decisionNote : undefined,
    batchId: typeof raw.batchId === "string" ? raw.batchId : undefined,
    dedupeKey:
      typeof raw.dedupeKey === "string"
        ? raw.dedupeKey
        : buildDedupeKey({
            sourceReport: raw.sourceReport,
            sourceFindingId:
              typeof raw.sourceFindingId === "string" ? raw.sourceFindingId : undefined,
            candidateType: raw.candidateType as AgentOpsGlobalMemoryCandidate["candidateType"],
          }),
  };

  return candidate;
}

async function insertGlobalMemoryCandidateFeedback(input: {
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
        stage: "hermes_h2_f2",
        noDurableMemoryWrite: true,
        noHermesRuntime: true,
        noSotFileWrite: true,
        noAgentmemoryWrite: true,
        noFileWrites: true,
      },
    })
    .select("id")
    .single();

  if (error) return writeFail(error);
  return writeOk({ feedbackId: data.id as string });
}

async function fetchCandidateFeedbackRows(): Promise<
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
      return typeof action === "string" && CANDIDATE_ACTIONS.has(action);
    });

  return ok(rows);
}

export async function getAgentOpsGlobalMemoryCandidates(): Promise<
  AgentOpsReadResult<AgentOpsGlobalMemoryCandidatesOverview>
> {
  try {
    const rowsResult = await fetchCandidateFeedbackRows();
    if (rowsResult.error) return fail(rowsResult.error);
    const rows = rowsResult.data ?? [];

    let lastBatch: AgentOpsGlobalMemoryCandidatesOverview["lastBatch"] = null;
    const candidatesById = new Map<string, AgentOpsGlobalMemoryCandidate>();

    for (const row of rows) {
      const action = row.metadata.action;
      if (action === "global_memory_candidate_batch" && !lastBatch) {
        lastBatch = {
          batchId: String(row.metadata.batchId ?? ""),
          sourceReport: String(row.metadata.sourceReport ?? ""),
          generatedAt: String(row.metadata.generatedAt ?? row.created_at),
          candidateCount: Number(row.metadata.candidateCount ?? 0),
          createdAt: row.created_at,
        };
      }
    }

    for (const row of rows) {
      if (row.metadata.action !== "global_memory_candidate_draft") continue;
      const parsed = parseCandidateObject(row.metadata.candidate);
      if (!parsed) continue;
      if (!candidatesById.has(parsed.candidateId)) {
        candidatesById.set(parsed.candidateId, { ...parsed, feedbackId: row.id });
      }
    }

    const editsApplied = new Set<string>();
    for (const row of rows) {
      if (row.metadata.action !== "global_memory_candidate_edit") continue;
      const candidateId = String(row.metadata.candidateId ?? "");
      if (editsApplied.has(candidateId)) continue;
      const existing = candidatesById.get(candidateId);
      if (!existing) continue;
      const patch = row.metadata.patch;
      if (!patch || typeof patch !== "object") continue;
      const patchRaw = patch as Record<string, unknown>;
      editsApplied.add(candidateId);
      candidatesById.set(candidateId, {
        ...existing,
        title: typeof patchRaw.title === "string" ? patchRaw.title : existing.title,
        summary: typeof patchRaw.summary === "string" ? patchRaw.summary : existing.summary,
        proposedMemoryText:
          typeof patchRaw.proposedMemoryText === "string"
            ? patchRaw.proposedMemoryText
            : existing.proposedMemoryText,
        updatedAt: String(row.metadata.editedAt ?? row.created_at),
        status:
          existing.status === "approved" || existing.status === "rejected"
            ? existing.status
            : "pending_review",
      });
    }

    const decisionsApplied = new Set<string>();
    for (const row of rows) {
      if (row.metadata.action !== "global_memory_candidate_decision") continue;
      const candidateId = String(row.metadata.candidateId ?? "");
      if (decisionsApplied.has(candidateId)) continue;
      const existing = candidatesById.get(candidateId);
      if (!existing) continue;

      const decision = String(row.metadata.decision ?? "");
      if (!isCandidateDecision(decision)) continue;

      decisionsApplied.add(candidateId);
      candidatesById.set(candidateId, {
        ...existing,
        status: mapDecisionToStatus(decision),
        decidedAt: row.created_at,
        decidedBy: typeof row.metadata.decidedBy === "string" ? row.metadata.decidedBy : undefined,
        decisionNote: typeof row.metadata.note === "string" ? row.metadata.note : undefined,
        updatedAt: row.created_at,
      });
    }

    const candidates = [...candidatesById.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const counts = {
      total: candidates.length,
      pending: candidates.filter(
        (c) => c.status === "pending_review" || c.status === "draft",
      ).length,
      approved: candidates.filter((c) => c.status === "approved").length,
      rejected: candidates.filter((c) => c.status === "rejected").length,
      reviewLater: candidates.filter((c) => c.status === "review_later").length,
      needsCleanup: candidates.filter((c) => c.status === "needs_cleanup").length,
    };

    return ok({ candidates, lastBatch, counts });
  } catch (error) {
    return fail(error);
  }
}

export async function generateAgentOpsGlobalMemoryCandidatesFromLastScan(): Promise<
  AgentOpsWriteResult<AgentOpsGenerateGlobalMemoryCandidatesResult>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return writeFail(ownerGate.error);

    const draftResult = await fetchAgentOpsGlobalMemoryCandidateDraftsFromReport();
    if (draftResult.error || !draftResult.data) {
      return writeFail(
        draftResult.error ??
          "No guardrail action plan report found. Run full read-only scan first.",
      );
    }

    const existingResult = await getAgentOpsGlobalMemoryCandidates();
    if (existingResult.error) return writeFail(existingResult.error);

    const existingKeys = new Set(
      (existingResult.data?.candidates ?? []).map((candidate) => candidate.dedupeKey),
    );

    const toCreate = draftResult.data.candidates.filter(
      (candidate) => !existingKeys.has(buildDedupeKey(candidate)),
    );

    if (toCreate.length === 0) {
      return writeOk({
        createdCount: 0,
        skippedDuplicateCount: draftResult.data.candidates.length,
        sourceReport: draftResult.data.sourceReport,
        batchId: "",
        message: "Existing candidates already found for this report. No duplicates were created.",
        allDuplicates: draftResult.data.candidates.length > 0,
      });
    }

    const batchId = `gmem-batch-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const batchInsert = await insertGlobalMemoryCandidateFeedback({
      remark: `Global memory candidate batch (${toCreate.length} draft(s)). Approval records intent only.`,
      metadata: {
        action: "global_memory_candidate_batch",
        batchId,
        sourceReport: draftResult.data.sourceReport,
        generatedAt: nowIso,
        candidateCount: toCreate.length,
        skippedDuplicateCount: draftResult.data.candidates.length - toCreate.length,
      },
    });
    if (batchInsert.error) return writeFail(batchInsert.error);

    await insertGlobalMemoryCandidateFeedback({
      remark: "Global memory candidate source report reference (read-only).",
      metadata: {
        action: "global_memory_candidate_source_report",
        batchId,
        sourceReport: draftResult.data.sourceReport,
        sourceReportGeneratedAt: draftResult.data.sourceReportGeneratedAt,
        candidateCount: toCreate.length,
      },
    });

    for (const draft of toCreate) {
      const candidate: AgentOpsGlobalMemoryCandidate = {
        ...draft,
        batchId,
        dedupeKey: buildDedupeKey(draft),
        status: "pending_review",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const insertResult = await insertGlobalMemoryCandidateFeedback({
        remark: `Global memory candidate draft: ${candidate.title}`,
        metadata: {
          action: "global_memory_candidate_draft",
          batchId,
          candidate,
        },
      });
      if (insertResult.error) return writeFail(insertResult.error);
    }

    return writeOk({
      createdCount: toCreate.length,
      skippedDuplicateCount: draftResult.data.candidates.length - toCreate.length,
      sourceReport: draftResult.data.sourceReport,
      batchId,
      message: `Created ${toCreate.length} global memory candidate draft(s). Approved for future memory only — no memory or source-of-truth files were written.`,
      allDuplicates: false,
    });
  } catch (error) {
    return writeFail(error);
  }
}

export async function recordAgentOpsGlobalMemoryCandidateDecision(
  input: AgentOpsGlobalMemoryCandidateDecisionInput,
): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
  try {
    const candidateId = input.candidateId?.trim();
    if (!candidateId) return writeFail("candidateId is required.");
    if (!isCandidateDecision(input.decision)) {
      return writeFail("Invalid candidate decision.");
    }

    const overview = await getAgentOpsGlobalMemoryCandidates();
    if (overview.error) return writeFail(overview.error);
    const candidate = (overview.data?.candidates ?? []).find(
      (row) => row.candidateId === candidateId,
    );
    if (!candidate) return writeFail("Global memory candidate not found.");

    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const status = mapDecisionToStatus(input.decision);
    const label =
      input.decision === "approve_for_future_memory"
        ? "Approved for future memory"
        : input.decision === "reject"
          ? "Rejected"
          : input.decision === "review_later"
            ? "Review later"
            : "Needs cleanup";

    const insertResult = await insertGlobalMemoryCandidateFeedback({
      remark:
        input.note?.trim() ||
        `Global memory candidate ${label} (metadata only). Hermes memory was not updated.`,
      metadata: {
        action: "global_memory_candidate_decision",
        candidateId,
        decision: input.decision,
        approvalStatus: status,
        decidedBy: userResult.data,
        note: input.note?.trim() || null,
      },
    });
    if (insertResult.error) return writeFail(insertResult.error);

    if (input.decision === "approve_for_future_memory") {
      const approvedResult = await createAgentOpsGlobalMemoryApprovedRecordFromCandidate(
        candidate,
        userResult.data,
      );
      if (approvedResult.error) return writeFail(approvedResult.error);

      const approvedMessage = approvedResult.data?.message ?? label;
      return writeOk({
        feedbackId: insertResult.data!.feedbackId,
        message: approvedMessage,
      });
    }

    return writeOk({
      feedbackId: insertResult.data!.feedbackId,
      message: `${label} recorded. No durable memory or source-of-truth write was performed.`,
    });
  } catch (error) {
    return writeFail(error);
  }
}

export async function recordAgentOpsGlobalMemoryCandidateEdit(
  input: AgentOpsGlobalMemoryCandidateEditInput,
): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
  try {
    const candidateId = input.candidateId?.trim();
    const proposedMemoryText = input.proposedMemoryText?.trim();
    if (!candidateId || !proposedMemoryText) {
      return writeFail("candidateId and proposedMemoryText are required.");
    }

    const overview = await getAgentOpsGlobalMemoryCandidates();
    if (overview.error) return writeFail(overview.error);
    const candidate = (overview.data?.candidates ?? []).find(
      (row) => row.candidateId === candidateId,
    );
    if (!candidate) return writeFail("Global memory candidate not found.");

    const nowIso = new Date().toISOString();
    const patch = {
      title: input.title?.trim() || candidate.title,
      summary: input.summary?.trim() || candidate.summary,
      proposedMemoryText,
    };

    const insertResult = await insertGlobalMemoryCandidateFeedback({
      remark: input.note?.trim() || `Edited global memory candidate draft: ${patch.title}`,
      metadata: {
        action: "global_memory_candidate_edit",
        candidateId,
        editedAt: nowIso,
        patch,
      },
    });
    if (insertResult.error) return writeFail(insertResult.error);

    return writeOk({
      feedbackId: insertResult.data!.feedbackId,
      message: "Edited draft saved. No durable memory or source-of-truth write was performed.",
    });
  } catch (error) {
    return writeFail(error);
  }
}
