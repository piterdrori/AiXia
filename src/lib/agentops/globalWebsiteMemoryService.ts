import { supabase } from "@/lib/supabase";

import {
  AGENTOPS_GLOBAL_MEMORY_DEFAULT_SOURCE_IDS,
  AGENTOPS_GLOBAL_MEMORY_SCAN_FREQUENCIES,
  type AgentOpsGlobalMemoryCommandRunResult,
  type AgentOpsGlobalMemoryPartialSnapshot,
  type AgentOpsGlobalMemoryPreferences,
  type AgentOpsGlobalMemoryScanFrequency,
  type AgentOpsGlobalMemoryScanPausePreference,
  type AgentOpsGlobalMemorySourcePriorityPreference,
  type AgentOpsReadResult,
  type AgentOpsWriteResult,
} from "./types";
import { AGENTOPS_TOOL_REGISTRY } from "./tools/toolRegistry";
import { getAgentOpsOwnerStatus } from "./service";

const GLOBAL_MEMORY_FREQUENCY_LABELS: Record<AgentOpsGlobalMemoryScanFrequency, string> = {
  manual_only: "Manual only",
  daily_later: "Daily (later)",
  every_6_hours_later: "Every 6 hours (later)",
  hourly_later: "Hourly (later)",
  event_based_later: "Event-based (later)",
};

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

function isGlobalMemoryScanFrequency(value: string): value is AgentOpsGlobalMemoryScanFrequency {
  return (AGENTOPS_GLOBAL_MEMORY_SCAN_FREQUENCIES as readonly string[]).includes(value);
}

function isGlobalMemoryPausePreference(
  value: string,
): value is AgentOpsGlobalMemoryScanPausePreference {
  return value === "active" || value === "paused";
}

export function createDefaultAgentOpsGlobalMemorySourcePriority(): AgentOpsGlobalMemorySourcePriorityPreference {
  const sources: Record<string, boolean> = {};
  for (const id of AGENTOPS_GLOBAL_MEMORY_DEFAULT_SOURCE_IDS) {
    sources[id] = true;
  }
  return { orderedIds: [...AGENTOPS_GLOBAL_MEMORY_DEFAULT_SOURCE_IDS], sources };
}

function parseSourcePriorityMetadata(
  value: unknown,
): AgentOpsGlobalMemorySourcePriorityPreference | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const sourcesRaw = raw.sources;
  const orderedRaw = raw.orderedIds;
  if (!sourcesRaw || typeof sourcesRaw !== "object") return null;
  const sources: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(sourcesRaw as Record<string, unknown>)) {
    sources[key] = Boolean(enabled);
  }
  const orderedIds = Array.isArray(orderedRaw)
    ? orderedRaw.filter((id): id is string => typeof id === "string")
    : [...AGENTOPS_GLOBAL_MEMORY_DEFAULT_SOURCE_IDS];
  return { orderedIds, sources };
}

function parseCommandRunMetadata(value: unknown): AgentOpsGlobalMemoryCommandRunResult | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
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

function parsePartialSnapshotMetadata(value: unknown): AgentOpsGlobalMemoryPartialSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.generatedAt !== "string") return null;
  const sources = Array.isArray(raw.sources)
    ? raw.sources.filter((item): item is AgentOpsGlobalMemoryPartialSnapshot["sources"][number] => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        return (
          typeof row.id === "string" &&
          typeof row.title === "string" &&
          typeof row.enabled === "boolean" &&
          typeof row.priority === "number"
        );
      })
    : [];
  return {
    generatedAt: raw.generatedAt,
    mode: "read-only",
    scanMode: typeof raw.scanMode === "string" ? raw.scanMode : "Manual / not active",
    sourceCount: typeof raw.sourceCount === "number" ? raw.sourceCount : sources.length,
    enabledSourceCount:
      typeof raw.enabledSourceCount === "number"
        ? raw.enabledSourceCount
        : sources.filter((s) => s.enabled).length,
    toolsHubRegistryNodeCount:
      typeof raw.toolsHubRegistryNodeCount === "number"
        ? raw.toolsHubRegistryNodeCount
        : Object.keys(AGENTOPS_TOOL_REGISTRY).length,
    fullCliScanCompleted: false,
    cliScanStatus: raw.cliScanStatus === "requested" ? "requested" : "not_run",
    note:
      typeof raw.note === "string"
        ? raw.note
        : "Partial read-only snapshot from UI registry.",
    sources,
  };
}

async function insertGlobalMemoryOwnerFeedback(input: {
  remark: string;
  metadata: Record<string, unknown>;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
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
        stage: "hermes_h2_f1",
        noFileWrites: true,
        noLiveSync: true,
        noHermesAutomation: true,
        noSchedulerCron: true,
      },
    })
    .select("id")
    .single();

  if (error) return writeFail(error);
  return writeOk({
    feedbackId: data.id as string,
    message: "Global memory preference recorded. No automation or writeback was executed.",
  });
}

async function fetchGlobalMemoryFeedbackRows(): Promise<
  AgentOpsReadResult<
    Array<{ metadata: Record<string, unknown>; created_at: string }>
  >
> {
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return fail(ownerGate.error);

  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .select("metadata, created_at")
    .is("finding_id", null)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return fail(error);

  const rows = (data ?? []).map((row) => ({
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: row.created_at as string,
  }));

  return ok(rows);
}

function pickLatestGlobalMemoryRow(
  rows: Array<{ metadata: Record<string, unknown>; created_at: string }>,
  action: string,
): { metadata: Record<string, unknown>; created_at: string } | null {
  for (const row of rows) {
    if (row.metadata.action === action) return row;
  }
  return null;
}

export async function getAgentOpsGlobalMemoryPreferences(): Promise<
  AgentOpsReadResult<AgentOpsGlobalMemoryPreferences>
> {
  try {
    const ownerGate = await assertAgentOpsOwner();
    if (ownerGate.error) return fail(ownerGate.error);

    const rowsResult = await fetchGlobalMemoryFeedbackRows();
    if (rowsResult.error) return fail(rowsResult.error);
    const rows = rowsResult.data ?? [];

    const frequencyRow = pickLatestGlobalMemoryRow(
      rows,
      "global_memory_scan_frequency_preference",
    );
    const priorityRow = pickLatestGlobalMemoryRow(
      rows,
      "global_memory_source_priority_preference",
    );
    const pauseRow = pickLatestGlobalMemoryRow(rows, "global_memory_scan_pause_preference");
    const snapshotRow = pickLatestGlobalMemoryRow(rows, "global_memory_partial_snapshot");
    const requestRow = pickLatestGlobalMemoryRow(rows, "global_memory_scan_requested");
    const commandRunRow = pickLatestGlobalMemoryRow(rows, "global_memory_command_run");

    const frequencyRaw = frequencyRow?.metadata.frequency;
    const frequencyCandidate = String(frequencyRaw ?? "");
    const frequency: AgentOpsGlobalMemoryScanFrequency = isGlobalMemoryScanFrequency(
      frequencyCandidate,
    )
      ? frequencyCandidate
      : "manual_only";

    const pauseRaw = pauseRow?.metadata.pausePreference;
    const pauseCandidate = String(pauseRaw ?? "");
    const pausePreference: AgentOpsGlobalMemoryScanPausePreference = isGlobalMemoryPausePreference(
      pauseCandidate,
    )
      ? pauseCandidate
      : "active";

    const sourcePriority =
      parseSourcePriorityMetadata(priorityRow?.metadata.preference) ??
      createDefaultAgentOpsGlobalMemorySourcePriority();

    const lastSnapshot = parsePartialSnapshotMetadata(snapshotRow?.metadata.snapshot);
    const lastCommandRun = parseCommandRunMetadata(commandRunRow?.metadata.run);

    const nextScanLabel =
      pausePreference === "paused"
        ? "Paused — not scheduled"
        : frequency === "manual_only"
          ? "Not scheduled (manual only)"
          : "Not scheduled (future scheduler not active)";

    return ok({
      frequency,
      frequencySavedAt: frequencyRow?.created_at ?? null,
      sourcePriority,
      sourcePrioritySavedAt: priorityRow?.created_at ?? null,
      pausePreference,
      pauseSavedAt: pauseRow?.created_at ?? null,
      lastSnapshot,
      lastScanRequestedAt: requestRow?.created_at ?? null,
      lastCommandRun,
      nextScanLabel,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function recordAgentOpsGlobalMemoryCommandRun(input: {
  run: AgentOpsGlobalMemoryCommandRunResult;
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return writeFail(ownerGate.error);

  const label = input.run.label ?? input.run.commandId;
  const statusWord =
    input.run.status === "success"
      ? "completed"
      : input.run.status === "failed"
        ? "failed"
        : "rejected";

  return insertGlobalMemoryOwnerFeedback({
    remark:
      input.note?.trim() ||
      `Global memory read-only command ${statusWord}: ${label}. Hermes memory was not updated automatically.`,
    metadata: {
      action: "global_memory_command_run",
      run: input.run,
    },
  });
}

export async function recordAgentOpsGlobalMemoryScanFrequencyPreference(input: {
  frequency: AgentOpsGlobalMemoryScanFrequency;
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
  if (!isGlobalMemoryScanFrequency(input.frequency)) {
    return writeFail("Invalid scan frequency preference.");
  }
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return writeFail(ownerGate.error);

  return insertGlobalMemoryOwnerFeedback({
    remark:
      input.note?.trim() ||
      `Global memory scan frequency preference: ${GLOBAL_MEMORY_FREQUENCY_LABELS[input.frequency]}. No cron was activated.`,
    metadata: {
      action: "global_memory_scan_frequency_preference",
      frequency: input.frequency,
      frequencyLabel: GLOBAL_MEMORY_FREQUENCY_LABELS[input.frequency],
      schedulerActive: false,
      nextScan: "not_scheduled",
    },
  });
}

export async function recordAgentOpsGlobalMemorySourcePriorityPreference(input: {
  preference: AgentOpsGlobalMemorySourcePriorityPreference;
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return writeFail(ownerGate.error);

  return insertGlobalMemoryOwnerFeedback({
    remark:
      input.note?.trim() ||
      "Global memory source priority preference saved. No scan was executed automatically.",
    metadata: {
      action: "global_memory_source_priority_preference",
      preference: input.preference,
    },
  });
}

export async function recordAgentOpsGlobalMemoryScanPausePreference(input: {
  pausePreference: AgentOpsGlobalMemoryScanPausePreference;
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
  if (!isGlobalMemoryPausePreference(input.pausePreference)) {
    return writeFail("Invalid pause preference.");
  }
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return writeFail(ownerGate.error);

  return insertGlobalMemoryOwnerFeedback({
    remark:
      input.note?.trim() ||
      `Global memory scan preference: ${input.pausePreference}. No live scheduler is running.`,
    metadata: {
      action: "global_memory_scan_pause_preference",
      pausePreference: input.pausePreference,
      schedulerActive: false,
    },
  });
}

export async function recordAgentOpsGlobalMemoryScanRequested(input?: {
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return writeFail(ownerGate.error);

  return insertGlobalMemoryOwnerFeedback({
    remark:
      input?.note?.trim() ||
      "Owner requested read-only global memory scan workflow (manual CLI). No cloud automation ran.",
    metadata: {
      action: "global_memory_scan_requested",
      scanMode: "manual / not active",
      fullCliScanCompleted: false,
    },
  });
}

export async function recordAgentOpsGlobalMemoryPartialSnapshot(input: {
  snapshot: AgentOpsGlobalMemoryPartialSnapshot;
  note?: string;
}): Promise<AgentOpsWriteResult<{ feedbackId: string; message: string }>> {
  const ownerGate = await assertAgentOpsOwner();
  if (ownerGate.error) return writeFail(ownerGate.error);

  return insertGlobalMemoryOwnerFeedback({
    remark:
      input.note?.trim() ||
      "Partial read-only global memory snapshot stored. Full source scan still requires local CLI.",
    metadata: {
      action: "global_memory_partial_snapshot",
      snapshot: input.snapshot,
    },
  });
}

export function formatAgentOpsGlobalMemoryScanFrequency(
  frequency: AgentOpsGlobalMemoryScanFrequency,
): string {
  return GLOBAL_MEMORY_FREQUENCY_LABELS[frequency];
}

export const GLOBAL_MEMORY_READ_ONLY_CLI_COMMANDS = [
  "npm run qa:static-discovery",
  "npm run qa:static-design-guardrails",
  "npm run qa:guardrail-action-plan",
] as const;

export function buildAgentOpsGlobalMemoryPartialSnapshot(
  sourceTitles: Record<string, string>,
  sourcePriority: AgentOpsGlobalMemorySourcePriorityPreference,
  cliScanStatus: "not_run" | "requested" = "requested",
): AgentOpsGlobalMemoryPartialSnapshot {
  const sources = sourcePriority.orderedIds.map((id, index) => ({
    id,
    title: sourceTitles[id] ?? id,
    enabled: sourcePriority.sources[id] !== false,
    priority: index + 1,
  }));

  return {
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    scanMode: "Manual / not active",
    sourceCount: sources.length,
    enabledSourceCount: sources.filter((source) => source.enabled).length,
    toolsHubRegistryNodeCount: Object.keys(AGENTOPS_TOOL_REGISTRY).length,
    fullCliScanCompleted: false,
    cliScanStatus,
    note:
      "Partial read-only snapshot generated from current UI registry; full source scan requires local CLI command.",
    sources,
  };
}
