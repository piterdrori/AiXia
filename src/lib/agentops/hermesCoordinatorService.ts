/**
 * Stage C — Hermes coordinator advisory automation (read-only, staging only).
 * Owner preference + advisory artifact queue + scheduler placeholders + tool gates.
 * No AgentMemory writes, no SOT/registry writes, no tool/MCP execution.
 */

import { supabase } from "@/lib/supabase";

import { assembleAgentOpsHermesPreviewContext } from "./hermesContextAssembler";
import { getAgentOpsHermesRecommendationArtifacts } from "./hermesRecommendationArtifactService";
import { getAgentOpsOwnerStatus } from "./service";
import type {
  AgentOpsHermesCoordinatorActivationPreference,
  AgentOpsHermesCoordinatorAdvisoryQueue,
  AgentOpsHermesCoordinatorAgentMemoryReadPreview,
  AgentOpsHermesCoordinatorControlSnapshot,
  AgentOpsHermesCoordinatorQueueItem,
  AgentOpsHermesCoordinatorSchedulerPlaceholder,
  AgentOpsHermesCoordinatorToolExecutionGate,
  AgentOpsHermesCoordinatorWorkflowStepId,
  AgentOpsHermesRecommendationArtifactRecord,
  AgentOpsReadResult,
  AgentOpsWriteResult,
} from "./types";

const HERMES_COORDINATOR_ACTIVATION_ACTION = "hermes_coordinator_activation";
const COORDINATOR_PREFERENCE_READ_LIMIT = 40;

const WORKFLOW_SEQUENCE: Array<{
  stepId: AgentOpsHermesCoordinatorWorkflowStepId;
  label: string;
  workflowSource: AgentOpsHermesRecommendationArtifactRecord["workflowSource"] | null;
}> = [
  { stepId: "workflow_1", label: "Workflow 1 — Issue Advisory", workflowSource: "workflow_1" },
  { stepId: "workflow_2", label: "Workflow 2 — Cursor Prompt Review", workflowSource: "workflow_2" },
  { stepId: "workflow_3", label: "Workflow 3 — Fix Report Review", workflowSource: "workflow_3" },
  { stepId: "fix_report", label: "Fix Report synthesis", workflowSource: null },
];

const TOOL_GATE_DEFINITIONS: Array<{ toolId: string; label: string; reason: string }> = [
  {
    toolId: "codegraph_search",
    label: "CodeGraph search",
    reason: "Would enrich advisory context — blocked until Stage D approval.",
  },
  {
    toolId: "browser_qa",
    label: "Browser QA automation",
    reason: "Would verify UI fixes — blocked: Safety Only.",
  },
  {
    toolId: "cursor_execution",
    label: "Cursor task execution",
    reason: "Would dispatch Cursor work — blocked: Safety Only.",
  },
  {
    toolId: "agent_memory_write",
    label: "AgentMemory write",
    reason: "Would persist agent memory — blocked until Stage D approval.",
  },
];

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

function defaultCoordinatorPreference(): AgentOpsHermesCoordinatorActivationPreference {
  return {
    coordinatorActive: false,
    ownerApprovedAt: null,
    stagingOnly: true,
    writesBlocked: true,
    advisoryOnly: true,
    schedulerActive: false,
    agentMemoryWritesBlocked: true,
    toolExecutionBlocked: true,
  };
}

function parseCoordinatorPreferenceRow(row: {
  metadata: unknown;
  created_at: string;
}): AgentOpsHermesCoordinatorActivationPreference | null {
  const meta =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : null;
  if (!meta || meta.action !== HERMES_COORDINATOR_ACTIVATION_ACTION) return null;

  return {
    coordinatorActive: meta.coordinatorActive === true,
    ownerApprovedAt: typeof row.created_at === "string" ? row.created_at : null,
    stagingOnly: true,
    writesBlocked: true,
    advisoryOnly: true,
    schedulerActive: false,
    agentMemoryWritesBlocked: true,
    toolExecutionBlocked: true,
  };
}

/** Read latest owner coordinator activation preference (default off). */
export async function getAgentOpsHermesCoordinatorActivationPreference(): Promise<
  AgentOpsReadResult<AgentOpsHermesCoordinatorActivationPreference>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("metadata, created_at")
      .is("finding_id", null)
      .eq("feedback_type", "remark")
      .order("created_at", { ascending: false })
      .limit(COORDINATOR_PREFERENCE_READ_LIMIT);

    if (error) return fail(error);

    for (const row of data ?? []) {
      const parsed = parseCoordinatorPreferenceRow(row);
      if (parsed) return ok(parsed);
    }

    return ok(defaultCoordinatorPreference());
  } catch (error) {
    return fail(error);
  }
}

/** Owner-approved coordinator activation toggle — metadata preference only, not AgentMemory. */
export async function recordAgentOpsHermesCoordinatorActivationPreference(input: {
  coordinatorActive: boolean;
  note?: string;
}): Promise<
  AgentOpsWriteResult<{ feedbackId: string; message: string; coordinatorActive: boolean }>
> {
  try {
    const userResult = await getAuthenticatedOwnerUserId();
    if (userResult.error || !userResult.data) {
      return writeFail(userResult.error ?? "Could not resolve current owner user.");
    }

    const coordinatorActive = input.coordinatorActive === true;
    const statusWord = coordinatorActive ? "enabled" : "disabled";
    const remark =
      input.note?.trim() ||
      `Hermes coordinator activation ${statusWord} (Stage C safe-read only). No memory, SOT, registry, tool, or AgentMemory writes were executed.`;

    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .insert({
        finding_id: null,
        owner_user_id: userResult.data,
        feedback_type: "remark",
        remark,
        metadata: {
          action: HERMES_COORDINATOR_ACTIVATION_ACTION,
          stage: "hermes_stage_c",
          coordinatorActive,
          stagingOnly: true,
          writesBlocked: true,
          sotWritesBlocked: true,
          advisoryOnly: true,
          schedulerActive: false,
          agentMemoryWritesBlocked: true,
          toolExecutionBlocked: true,
          noAutoArtifactSave: true,
          noToolExecution: true,
          noAgentMemoryWrites: true,
        },
      })
      .select("id")
      .single();

    if (error) return writeFail(error);

    return writeOk({
      feedbackId: data.id as string,
      coordinatorActive,
      message: coordinatorActive
        ? "Coordinator activated for staging advisory safe-read only. Writes and tool execution remain blocked."
        : "Coordinator deactivated. Advisory runtime remains available with coordinator inactive.",
    });
  } catch (error) {
    return writeFail(error);
  }
}

function buildQueueItems(
  artifacts: AgentOpsHermesRecommendationArtifactRecord[],
  coordinatorActive: boolean,
  issueCode?: string | null,
): AgentOpsHermesCoordinatorQueueItem[] {
  const filtered = issueCode
    ? artifacts.filter((artifact) => artifact.issueCode === issueCode)
    : artifacts;

  const latestByWorkflow = new Map<
    AgentOpsHermesRecommendationArtifactRecord["workflowSource"],
    AgentOpsHermesRecommendationArtifactRecord
  >();
  for (const artifact of filtered) {
    const existing = latestByWorkflow.get(artifact.workflowSource);
    if (!existing || artifact.createdAt > existing.createdAt) {
      latestByWorkflow.set(artifact.workflowSource, artifact);
    }
  }

  return WORKFLOW_SEQUENCE.map((step, index) => {
    const priorSteps = WORKFLOW_SEQUENCE.slice(0, index);
    const priorIncomplete = priorSteps.some((prior) => {
      if (!prior.workflowSource) return false;
      return !latestByWorkflow.has(prior.workflowSource);
    });

    if (step.workflowSource) {
      const artifact = latestByWorkflow.get(step.workflowSource);
      if (artifact) {
        return {
          stepId: step.stepId,
          label: step.label,
          issueCode: artifact.issueCode,
          status: "completed_manual_save",
          artifactId: artifact.id,
          savedAt: artifact.createdAt,
          note: "Stage B manual save detected — coordinator queue read-only.",
        };
      }

      return {
        stepId: step.stepId,
        label: step.label,
        issueCode: issueCode ?? null,
        status: priorIncomplete ? "awaiting_prior_step" : "pending_manual_save",
        artifactId: null,
        savedAt: null,
        note: coordinatorActive
          ? "Awaiting owner manual save (Stage B). Coordinator will not auto-save."
          : "Coordinator inactive — manual save only when enabled.",
      };
    }

    const w3Saved = latestByWorkflow.has("workflow_3");
    return {
      stepId: step.stepId,
      label: step.label,
      issueCode: issueCode ?? null,
      status: w3Saved ? "queued_read_only" : "awaiting_prior_step",
      artifactId: null,
      savedAt: null,
      note: "Fix Report advisory review prompt placeholder — scheduler inactive.",
    };
  });
}

/** Read-only advisory artifact queue from Stage B saves (no auto-persist). */
export async function getAgentOpsHermesCoordinatorAdvisoryQueue(input?: {
  issueCode?: string | null;
  coordinatorActive?: boolean;
}): Promise<AgentOpsReadResult<AgentOpsHermesCoordinatorAdvisoryQueue>> {
  try {
    const preferenceResult = await getAgentOpsHermesCoordinatorActivationPreference();
    if (preferenceResult.error) return fail(preferenceResult.error);

    const coordinatorActive =
      input?.coordinatorActive ?? preferenceResult.data?.coordinatorActive ?? false;

    const artifactsResult = await getAgentOpsHermesRecommendationArtifacts(
      input?.issueCode?.trim() || undefined,
    );
    if (artifactsResult.error) return fail(artifactsResult.error);

    const items = buildQueueItems(
      artifactsResult.data ?? [],
      coordinatorActive,
      input?.issueCode ?? null,
    );

    return ok({
      mode: "read_only",
      coordinatorActive,
      schedulerActive: false,
      items,
      sequenceNote:
        "W1 → W2 → W3 → Fix Report sequence is read-only. Stage B manual save remains required.",
    });
  } catch (error) {
    return fail(error);
  }
}

export function getAgentOpsHermesCoordinatorSchedulerPlaceholder(): AgentOpsHermesCoordinatorSchedulerPlaceholder {
  return {
    schedulerActive: false,
    queueAdvisoryRequests: "placeholder_inactive",
    trackWorkflowCompletion: "placeholder_inactive",
    triggerReviewPrompts: "placeholder_inactive",
    sequence: WORKFLOW_SEQUENCE.map((step) => step.stepId),
    nextAction: "inactive_until_stage_d",
    note: "Scheduler integration placeholders only — no cron, no automated advisory POSTs.",
  };
}

export function getAgentOpsHermesCoordinatorToolExecutionGates(): AgentOpsHermesCoordinatorToolExecutionGate[] {
  return TOOL_GATE_DEFINITIONS.map((tool) => ({
    toolId: tool.toolId,
    label: tool.label,
    wouldExecute: true,
    executionStatus: "blocked_safety_only",
    reason: tool.reason,
  }));
}

/** Read-only AgentMemory context preview for coordinator (no writes until Stage D). */
export async function getAgentOpsHermesCoordinatorAgentMemoryReadPreview(): Promise<
  AgentOpsReadResult<AgentOpsHermesCoordinatorAgentMemoryReadPreview>
> {
  try {
    const preview = await assembleAgentOpsHermesPreviewContext();
    return ok({
      mode: "read_only",
      writesBlocked: true,
      globalMemoryCount: preview.stats.globalMemoryCount,
      perAgentMemoryCount: preview.stats.perAgentMemoryCount,
      note: "AgentMemory context readable for advisory assembly only. Writes blocked until Stage D approval.",
    });
  } catch (error) {
    return fail(error);
  }
}

/** Combined Stage C coordinator control snapshot for Hermes Control UI. */
export async function getAgentOpsHermesCoordinatorControlSnapshot(input?: {
  issueCode?: string | null;
}): Promise<AgentOpsReadResult<AgentOpsHermesCoordinatorControlSnapshot>> {
  try {
    const [preferenceResult, queueResult, agentMemoryResult] = await Promise.all([
      getAgentOpsHermesCoordinatorActivationPreference(),
      getAgentOpsHermesCoordinatorAdvisoryQueue({
        issueCode: input?.issueCode ?? null,
      }),
      getAgentOpsHermesCoordinatorAgentMemoryReadPreview(),
    ]);

    if (preferenceResult.error) return fail(preferenceResult.error);
    if (queueResult.error) return fail(queueResult.error);
    if (agentMemoryResult.error) return fail(agentMemoryResult.error);

    return ok({
      preference: preferenceResult.data ?? defaultCoordinatorPreference(),
      queue: queueResult.data ?? {
        mode: "read_only",
        coordinatorActive: false,
        schedulerActive: false,
        items: [],
        sequenceNote: "",
      },
      scheduler: getAgentOpsHermesCoordinatorSchedulerPlaceholder(),
      agentMemory: agentMemoryResult.data ?? {
        mode: "read_only",
        writesBlocked: true,
        globalMemoryCount: 0,
        perAgentMemoryCount: 0,
        note: "AgentMemory preview unavailable.",
      },
      toolGates: getAgentOpsHermesCoordinatorToolExecutionGates(),
    });
  } catch (error) {
    return fail(error);
  }
}
