/**
 * Stage B — Hermes Recommendation Artifact Store.
 * Persists owner-triggered advisory records in agentops_owner_feedback metadata only.
 * Not memory, not SOT, not issue status, not verification.
 */

import { supabase } from "@/lib/supabase";

import { getAgentOpsOwnerStatus } from "./service";
import type {
  AgentOpsHermesRecommendationArtifactInput,
  AgentOpsHermesRecommendationArtifactRecord,
  AgentOpsHermesRecommendationArtifactSaveResult,
  AgentOpsHermesRecommendationAdvisoryType,
  AgentOpsHermesRecommendationWorkflowSource,
  AgentOpsReadResult,
  AgentOpsWriteResult,
} from "./types";

const HERMES_RECOMMENDATION_ARTIFACT_ACTION = "hermes_recommendation_artifact";
const ARTIFACT_READ_LIMIT = 50;
const RESPONSE_PREVIEW_MAX = 160;

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

/** Best-effort verdict extraction from Workflow 3 structured responses. */
export function extractHermesRecommendationVerdict(responseText: string): string | null {
  const patterns = [
    /1\.\s*\*?\*?Verification verdict\*?\*?[:\s]+([^\n]+)/i,
    /\*?\*?Verification verdict\*?\*?[:\s]+([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = responseText.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].replace(/\*+/g, "").trim();
    }
  }
  return null;
}

export function buildHermesRecommendationResponsePreview(
  responseText: string,
  max = RESPONSE_PREVIEW_MAX,
): string {
  const trimmed = responseText.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function mapWorkflowSourceToAdvisoryType(
  workflowSource: AgentOpsHermesRecommendationWorkflowSource,
): AgentOpsHermesRecommendationAdvisoryType {
  switch (workflowSource) {
    case "workflow_1":
      return "issue_advisory";
    case "workflow_2":
      return "cursor_prompt_review";
    case "workflow_3":
      return "fix_report_review";
    default:
      return "issue_advisory";
  }
}

function parseArtifactRow(row: {
  id: string;
  finding_id: string | null;
  owner_user_id: string;
  remark: string | null;
  metadata: unknown;
  created_at: string;
}): AgentOpsHermesRecommendationArtifactRecord | null {
  const meta =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  if (meta.action !== HERMES_RECOMMENDATION_ARTIFACT_ACTION) return null;

  const issueCode = typeof meta.issueCode === "string" ? meta.issueCode : "";
  const advisoryType =
    typeof meta.advisoryType === "string"
      ? (meta.advisoryType as AgentOpsHermesRecommendationAdvisoryType)
      : mapWorkflowSourceToAdvisoryType(
          (meta.workflowSource as AgentOpsHermesRecommendationWorkflowSource) ?? "workflow_1",
        );
  const workflowSource =
    typeof meta.workflowSource === "string"
      ? (meta.workflowSource as AgentOpsHermesRecommendationWorkflowSource)
      : "workflow_1";
  const responseText = typeof meta.responseText === "string" ? meta.responseText : "";
  if (!issueCode || !responseText) return null;

  return {
    id: row.id,
    issueCode,
    findingId:
      typeof meta.findingId === "string"
        ? meta.findingId
        : row.finding_id
          ? String(row.finding_id)
          : null,
    advisoryType,
    workflowSource,
    requestText: typeof meta.requestText === "string" ? meta.requestText : "",
    responseText,
    verdict: typeof meta.verdict === "string" ? meta.verdict : null,
    contextIncluded: meta.contextIncluded === true,
    provider: typeof meta.provider === "string" ? meta.provider : null,
    source: typeof meta.source === "string" ? meta.source : null,
    requestId: typeof meta.requestId === "string" ? meta.requestId : null,
    safetyFlags: Array.isArray(meta.safetyFlags)
      ? meta.safetyFlags.filter((flag): flag is string => typeof flag === "string")
      : [],
    status: "saved_advisory",
    createdAt: row.created_at,
    createdBy: row.owner_user_id ?? null,
    safety: {
      coordinatorActive: false,
      writesBlocked: true,
      statusMutation: false,
      toolExecution: false,
    },
  };
}

/**
 * Owner-triggered save — one advisory artifact row in agentops_owner_feedback.
 * Does not change issue status, memory, SOT, or execute tools.
 */
export async function recordAgentOpsHermesRecommendationArtifact(
  input: AgentOpsHermesRecommendationArtifactInput,
): Promise<AgentOpsWriteResult<AgentOpsHermesRecommendationArtifactSaveResult>> {
  try {
    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const issueCode = input.issueCode.trim();
    const responseText = input.responseText.trim();
    const requestText = input.requestText.trim();
    if (!issueCode) return writeFail("Issue code is required.");
    if (!responseText) return writeFail("Hermes response text is required to save an artifact.");

    const verdict =
      input.verdict?.trim() ||
      (input.advisoryType === "fix_report_review"
        ? extractHermesRecommendationVerdict(responseText)
        : null);

    const remark = `Hermes recommendation artifact — ${input.advisoryType} — ${issueCode}`;

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: input.findingId ?? null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark,
        metadata: {
          action: HERMES_RECOMMENDATION_ARTIFACT_ACTION,
          stage: "hermes_stage_b",
          status: "saved_advisory",
          issueCode,
          findingId: input.findingId ?? null,
          advisoryType: input.advisoryType,
          workflowSource: input.workflowSource,
          requestText: requestText || null,
          responseText,
          verdict,
          contextIncluded: input.contextIncluded === true,
          provider: input.provider ?? null,
          source: input.source ?? null,
          requestId: input.requestId ?? null,
          safetyFlags: input.safetyFlags ?? [],
          responseCheckedAt: input.responseCheckedAt ?? null,
          advisoryArtifactOnly: true,
          noMemoryWrite: true,
          noSotWrite: true,
          noRegistryWrite: true,
          noAgentmemoryWrite: true,
          noIssueStatusChange: true,
          noVerification: true,
          noToolExecution: true,
          coordinatorActive: false,
          safety: {
            coordinatorActive: false,
            writesBlocked: true,
            statusMutation: false,
            toolExecution: false,
          },
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    return writeOk({
      feedbackId: data.id as string,
      artifactId: data.id as string,
      message: "Hermes recommendation saved as advisory artifact.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

/** Read saved Hermes recommendation artifacts for an issue (newest first). */
export async function getAgentOpsHermesRecommendationArtifacts(
  issueCode: string,
): Promise<AgentOpsReadResult<AgentOpsHermesRecommendationArtifactRecord[]>> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const normalizedCode = issueCode.trim();
    if (!normalizedCode) return ok([]);

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("id, finding_id, owner_user_id, remark, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(ARTIFACT_READ_LIMIT);

    if (error) return fail(error);

    const artifacts: AgentOpsHermesRecommendationArtifactRecord[] = [];
    for (const row of data ?? []) {
      const parsed = parseArtifactRow({
        id: row.id as string,
        finding_id: (row.finding_id as string | null) ?? null,
        owner_user_id: row.owner_user_id as string,
        remark: (row.remark as string | null) ?? null,
        metadata: row.metadata,
        created_at: row.created_at as string,
      });
      if (!parsed || parsed.issueCode !== normalizedCode) continue;
      artifacts.push(parsed);
    }

    return ok(artifacts);
  } catch (error) {
    return fail(error);
  }
}

export function formatHermesRecommendationAdvisoryTypeLabel(
  advisoryType: AgentOpsHermesRecommendationAdvisoryType,
): string {
  switch (advisoryType) {
    case "issue_advisory":
      return "Issue advisory";
    case "cursor_prompt_review":
      return "Cursor prompt review";
    case "fix_report_review":
      return "Fix report review";
    default:
      return advisoryType;
  }
}
