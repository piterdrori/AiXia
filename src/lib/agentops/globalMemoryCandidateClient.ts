import type {
  AgentOpsGlobalMemoryCandidate,
  AgentOpsGlobalMemoryCandidateGeneratorStatus,
  AgentOpsReadResult,
} from "./types";

const GENERATE_CANDIDATES_ENDPOINT = "/api/agentops/global-memory/generate-candidates";

function ok<T>(data: T): AgentOpsReadResult<T> {
  return { data, error: null };
}

function fail<T>(error: unknown): AgentOpsReadResult<T> {
  const message = error instanceof Error ? error.message : String(error);
  return { data: null, error: message };
}

function parseCandidate(raw: unknown): AgentOpsGlobalMemoryCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.candidateId !== "string" || typeof row.title !== "string") return null;
  if (typeof row.proposedMemoryText !== "string" || typeof row.sourceReport !== "string") {
    return null;
  }
  return {
    ...row,
    feedbackId: null,
    dedupeKey:
      typeof row.dedupeKey === "string"
        ? row.dedupeKey
        : `${row.sourceReport}|${row.sourceFindingId ?? ""}|${row.candidateType ?? ""}`,
  } as AgentOpsGlobalMemoryCandidate;
}

export async function getAgentOpsGlobalMemoryCandidateGeneratorStatus(): Promise<
  AgentOpsReadResult<AgentOpsGlobalMemoryCandidateGeneratorStatus>
> {
  try {
    const response = await fetch(GENERATE_CANDIDATES_ENDPOINT, { method: "GET" });
    if (!response.ok) {
      return ok({
        available: false,
        stagingOnly: true,
        primaryReport: "qa-agent/reports/guardrail-action-plan.json",
        primaryReportExists: false,
        allowedReportIds: ["guardrail_action_plan"],
        rejectionReason: `Generator status HTTP ${response.status}`,
      });
    }
    const payload = (await response.json()) as AgentOpsGlobalMemoryCandidateGeneratorStatus;
    return ok({
      available: Boolean(payload.available),
      stagingOnly: Boolean(payload.stagingOnly),
      primaryReport:
        typeof payload.primaryReport === "string"
          ? payload.primaryReport
          : "qa-agent/reports/guardrail-action-plan.json",
      primaryReportExists: Boolean(payload.primaryReportExists),
      allowedReportIds: Array.isArray(payload.allowedReportIds)
        ? payload.allowedReportIds.filter((id): id is string => typeof id === "string")
        : ["guardrail_action_plan"],
      rejectionReason:
        typeof payload.rejectionReason === "string" ? payload.rejectionReason : null,
    });
  } catch (error) {
    return ok({
      available: false,
      stagingOnly: true,
      primaryReport: "qa-agent/reports/guardrail-action-plan.json",
      primaryReportExists: false,
      allowedReportIds: ["guardrail_action_plan"],
      rejectionReason:
        error instanceof Error ? error.message : "Candidate generator unavailable.",
    });
  }
}

export async function fetchAgentOpsGlobalMemoryCandidateDraftsFromReport(): Promise<
  AgentOpsReadResult<{
    candidates: AgentOpsGlobalMemoryCandidate[];
    sourceReport: string;
    sourceReportGeneratedAt: string | null;
    message: string;
  }>
> {
  try {
    const response = await fetch(GENERATE_CANDIDATES_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: "guardrail_action_plan" }),
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errorMessage =
        typeof payload.error === "string"
          ? payload.error
          : "No guardrail action plan report found. Run full read-only scan first.";
      return fail(errorMessage);
    }

    const candidates = Array.isArray(payload.candidates)
      ? payload.candidates
          .map(parseCandidate)
          .filter((row): row is AgentOpsGlobalMemoryCandidate => row !== null)
      : [];

    return ok({
      candidates,
      sourceReport:
        typeof payload.sourceReport === "string"
          ? payload.sourceReport
          : "qa-agent/reports/guardrail-action-plan.json",
      sourceReportGeneratedAt:
        typeof payload.sourceReportGeneratedAt === "string"
          ? payload.sourceReportGeneratedAt
          : null,
      message:
        typeof payload.message === "string"
          ? payload.message
          : `Prepared ${candidates.length} candidate draft(s).`,
    });
  } catch (error) {
    return fail(error);
  }
}
