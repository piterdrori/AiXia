import type {
  AgentOpsGlobalMemoryCommandId,
  AgentOpsGlobalMemoryCommandRunResult,
  AgentOpsGlobalMemoryCommandRunnerStatus,
  AgentOpsReadResult,
} from "./types";

const RUN_COMMAND_ENDPOINT = "/api/agentops/global-memory/run-command";

function ok<T>(data: T): AgentOpsReadResult<T> {
  return { data, error: null };
}

function fail<T>(error: unknown): AgentOpsReadResult<T> {
  const message = error instanceof Error ? error.message : String(error);
  return { data: null, error: message };
}

const COMMAND_IDS: AgentOpsGlobalMemoryCommandId[] = [
  "static_discovery",
  "static_design_guardrails",
  "guardrail_action_plan",
  "full_read_only_scan",
];

function isCommandId(value: string): value is AgentOpsGlobalMemoryCommandId {
  return (COMMAND_IDS as readonly string[]).includes(value);
}

function parseCommandRunResult(payload: unknown): AgentOpsGlobalMemoryCommandRunResult | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  if (typeof raw.commandId !== "string" || typeof raw.startedAt !== "string") return null;
  const status = raw.status;
  if (status !== "success" && status !== "failed" && status !== "rejected") return null;
  return {
    ok: Boolean(raw.ok),
    commandId: raw.commandId,
    status,
    label: typeof raw.label === "string" ? raw.label : undefined,
    startedAt: raw.startedAt,
    finishedAt: typeof raw.finishedAt === "string" ? raw.finishedAt : raw.startedAt,
    durationMs: typeof raw.durationMs === "number" ? raw.durationMs : 0,
    outputSummary: typeof raw.outputSummary === "string" ? raw.outputSummary : "",
    reportPaths: Array.isArray(raw.reportPaths)
      ? raw.reportPaths.filter((p): p is string => typeof p === "string")
      : undefined,
    errorMessage: typeof raw.errorMessage === "string" ? raw.errorMessage : undefined,
    fullCliScanConfirmed: raw.fullCliScanConfirmed === true,
  };
}

export async function getAgentOpsGlobalMemoryCommandRunnerStatus(): Promise<
  AgentOpsReadResult<AgentOpsGlobalMemoryCommandRunnerStatus>
> {
  try {
    const response = await fetch(RUN_COMMAND_ENDPOINT, { method: "GET" });
    if (!response.ok) {
      return ok({
        available: false,
        stagingOnly: true,
        allowedCommandIds: COMMAND_IDS,
        rejectionReason: `Runner status HTTP ${response.status}`,
      });
    }
    const payload = (await response.json()) as AgentOpsGlobalMemoryCommandRunnerStatus;
    return ok({
      available: Boolean(payload.available),
      stagingOnly: Boolean(payload.stagingOnly),
      allowedCommandIds: Array.isArray(payload.allowedCommandIds)
        ? payload.allowedCommandIds.filter(isCommandId)
        : COMMAND_IDS,
      rejectionReason:
        typeof payload.rejectionReason === "string" ? payload.rejectionReason : null,
    });
  } catch (error) {
    return ok({
      available: false,
      stagingOnly: true,
      allowedCommandIds: COMMAND_IDS,
      rejectionReason:
        error instanceof Error ? error.message : "Local command runner unavailable.",
    });
  }
}

export async function runAgentOpsGlobalMemoryCommand(
  commandId: AgentOpsGlobalMemoryCommandId,
): Promise<AgentOpsReadResult<AgentOpsGlobalMemoryCommandRunResult>> {
  if (!isCommandId(commandId)) {
    return fail("Invalid command id.");
  }

  try {
    const response = await fetch(RUN_COMMAND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId }),
    });

    const payload = await response.json();
    const parsed = parseCommandRunResult(payload);
    if (!parsed) {
      return fail(
        typeof payload?.error === "string"
          ? payload.error
          : "Invalid command runner response.",
      );
    }

    if (!response.ok && parsed.status !== "rejected") {
      return ok(parsed);
    }

    return ok(parsed);
  } catch (error) {
    return fail(error);
  }
}
