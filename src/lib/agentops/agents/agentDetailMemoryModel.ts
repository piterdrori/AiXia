/**
 * Phase D-E2 — Agent Detail Memory/Hermes presentation model (pure helpers).
 * Separates fleet transport, per-agent Hermes, runtime/approved/diagnostic memory, and drafts.
 */

import { isSystemEventMemoryContent } from "@/lib/agentops/hermes/memoryClassifier";
import type { AgentOpsRuntimeMemoryRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";

export const MEMORY_LOAD_TIMEOUT_MS = 18_000;
export const MEMORY_LIST_PAGE_SIZE = 8;

export const AGENT_DETAIL_MEMORY_COPY = {
  fleetTransportAvailable: "Fleet Hermes transport: Available",
  fleetTransportUnavailable: "Fleet Hermes transport: Unavailable",
  fleetTransportUnknown: "Fleet Hermes transport: Unknown",
  agentHermesConnected: "Agent Hermes: Connected",
  agentHermesNotConfigured: "Agent Hermes: Not configured",
  agentHermesUnknown: "Agent Hermes: Unknown",
  agentHermesError: "Agent Hermes: Error",
  noPerAgentBanner:
    "Hermes transport is available at fleet level, but this agent does not yet have a dedicated Hermes connection record.",
  memoryLoadSlow:
    "Memory load is slow or unavailable. Try refresh memory.",
  noPendingDrafts: "No pending owner drafts",
  noApprovedMemory: "No approved memory for this agent",
  noRuntimeMemory: "No runtime memory records for this agent",
  runtimeUnavailable: "Runtime memory unavailable",
  sharedGlobalLabel: "Shared/global approved memory",
  diagnosticsCollapsed: "Diagnostics / runtime history",
} as const;

export type AgentHermesConnectionLabel =
  | "Connected"
  | "Not configured"
  | "Unknown"
  | "Error";

export type FleetHermesTransportLabel = "Available" | "Unavailable" | "Unknown";

const DIAGNOSTIC_SOURCE_RE =
  /marker|diagnostic|scan|cycle|thread|cross[-_]?agent|chat[-_]?marker|initializer|heartbeat|simulation|conversation|user[_-]?message|prompt|test[_-]?message/i;

const DIAGNOSTIC_TEXT_RE =
  /thread[-_]?marker|cross[-_]?agent marker|cycle scanned|scan marker|scheduled_cycle|work cycle|browser qa simulation|activation log|initializer returned|chat marker|diagnostic|scan\/test|test marker/i;

/** Starts-with + anywhere prompt/conversation markers (owner Runtime list noise). */
const PROMPT_LIKE_RE =
  /^(please |can you |could you |i need |help me |review |check |look at |audit |run |test |inspect |remember |hello[, ]|hi[, ]|hey[, ]|tell me |describe |what is broken)/i;

const PROMPT_LIKE_ANYWHERE_RE =
  /\b(inspect this page|tell me:\s*what is broken|remember this( test)?( rule)?|hello,\s*describe|describe your role|localhost(:\d+)?\/|127\.0\.0\.1|internal url|user prompt|test prompt|conversation message|scan\/test|cross[-_]?agent|thread[-_]?marker)\b/i;

/** Preview text from a runtime memory content payload. */
export function runtimeMemoryPreview(
  content: AgentOpsRuntimeMemoryRow["content"],
): string {
  if (content == null) return "(empty)";
  if (typeof content === "string") return content;
  if (typeof content === "number" || typeof content === "boolean") return String(content);
  if (typeof content === "object") {
    const record = content as Record<string, unknown>;
    if (typeof record.title === "string") return record.title;
    if (typeof record.text === "string") return record.text;
    if (typeof record.summary === "string") return record.summary;
    if (typeof record.kind === "string") return record.kind;
    try {
      return JSON.stringify(content).slice(0, 160);
    } catch {
      return "(object)";
    }
  }
  return String(content);
}

/** Prompt-like / chat-user text — hide from owner-facing runtime list (Diagnostics). */
export function isPromptLikeRuntimeMemory(row: AgentOpsRuntimeMemoryRow): boolean {
  const preview = runtimeMemoryPreview(row.content).trim();
  if (!preview) return false;
  if (PROMPT_LIKE_RE.test(preview)) return true;
  if (PROMPT_LIKE_ANYWHERE_RE.test(preview)) return true;
  if (preview.length > 120 && /\?\s*$/.test(preview) && /\b(page|broken|role|remember|inspect|describe)\b/i.test(preview)) {
    return true;
  }
  if (preview.length > 220 && /\?\s*$/.test(preview)) return true;
  if (/^user[:\s]/i.test(preview) || /^human[:\s]/i.test(preview)) return true;
  if (/^assistant[:\s]/i.test(preview) || /^system[:\s]/i.test(preview)) return true;
  const source = String(row.source ?? "").toLowerCase();
  if (
    source.includes("chat") ||
    source.includes("prompt") ||
    source.includes("user_message") ||
    source.includes("conversation") ||
    source.includes("test_message") ||
    source.includes("thread")
  ) {
    return true;
  }
  if (typeof row.content === "object" && row.content) {
    const record = row.content as Record<string, unknown>;
    const role = typeof record.role === "string" ? record.role.toLowerCase() : "";
    const kind = typeof record.kind === "string" ? record.kind.toLowerCase() : "";
    const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
    if (role === "user" || role === "human" || role === "assistant") return true;
    if (
      kind.includes("prompt") ||
      kind.includes("message") ||
      kind.includes("conversation") ||
      type.includes("prompt") ||
      type.includes("chat")
    ) {
      return true;
    }
  }
  return false;
}

/** Noisy/diagnostic runtime history — keep, but do not treat as approved active memory. */
export function isDiagnosticRuntimeMemory(row: AgentOpsRuntimeMemoryRow): boolean {
  const preview = runtimeMemoryPreview(row.content);
  if (isPromptLikeRuntimeMemory(row)) return true;
  if (isSystemEventMemoryContent(preview)) return true;
  if (DIAGNOSTIC_TEXT_RE.test(preview)) return true;
  if (DIAGNOSTIC_SOURCE_RE.test(String(row.source ?? ""))) return true;
  if (typeof row.content === "object" && row.content) {
    const record = row.content as Record<string, unknown>;
    const kind = typeof record.kind === "string" ? record.kind : "";
    const type = typeof record.type === "string" ? record.type : "";
    const tag = typeof record.tag === "string" ? record.tag : "";
    if (DIAGNOSTIC_TEXT_RE.test(`${kind} ${type} ${tag}`)) return true;
    if (DIAGNOSTIC_SOURCE_RE.test(`${kind} ${type} ${tag}`)) return true;
  }
  return false;
}

export type PartitionedRuntimeMemory = {
  agentRows: AgentOpsRuntimeMemoryRow[];
  globalRows: AgentOpsRuntimeMemoryRow[];
  usefulAgentRows: AgentOpsRuntimeMemoryRow[];
  diagnosticAgentRows: AgentOpsRuntimeMemoryRow[];
  approvedUsefulRows: AgentOpsRuntimeMemoryRow[];
  inactiveUsefulRows: AgentOpsRuntimeMemoryRow[];
  counts: {
    runtimeTotal: number;
    enabledRuntime: number;
    inactiveRuntime: number;
    approvedUseful: number;
    diagnostic: number;
    globalApproved: number;
  };
  lastRuntimeUpdateAt: string | null;
};

export function partitionRuntimeMemory(
  agentRows: AgentOpsRuntimeMemoryRow[],
  globalRows: AgentOpsRuntimeMemoryRow[] = [],
): PartitionedRuntimeMemory {
  const diagnosticAgentRows = agentRows.filter(isDiagnosticRuntimeMemory);
  const usefulAgentRows = agentRows.filter((row) => !isDiagnosticRuntimeMemory(row));
  const approvedUsefulRows = usefulAgentRows.filter((row) => row.approved);
  const inactiveUsefulRows = usefulAgentRows.filter((row) => !row.approved);
  const enabledRuntime = agentRows.filter((row) => row.approved).length;
  const lastRuntimeUpdateAt =
    agentRows
      .map((row) => row.created_at)
      .filter(Boolean)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;

  return {
    agentRows,
    globalRows,
    usefulAgentRows,
    diagnosticAgentRows,
    approvedUsefulRows,
    inactiveUsefulRows,
    counts: {
      runtimeTotal: agentRows.length,
      enabledRuntime,
      inactiveRuntime: agentRows.length - enabledRuntime,
      approvedUseful: approvedUsefulRows.length,
      diagnostic: diagnosticAgentRows.length,
      globalApproved: globalRows.filter((row) => row.approved).length,
    },
    lastRuntimeUpdateAt,
  };
}

export function resolveFleetHermesTransportLabel(input: {
  loaded: boolean;
  ok?: boolean;
  transportReachable?: boolean;
  error?: string | null;
}): FleetHermesTransportLabel {
  if (!input.loaded) return "Unknown";
  if (input.error) return "Unavailable";
  if (input.ok && input.transportReachable) return "Available";
  if (input.transportReachable === false) return "Unavailable";
  return "Unavailable";
}

/**
 * Per-agent Hermes connection — currently no dedicated connection table/record.
 * Always Not configured unless a future record exists.
 */
export function resolveAgentHermesConnectionLabel(input: {
  agentSpecificRecordExists: boolean;
  runtimeAgentId: string | null;
  retrievalError?: string | null;
  /** False while parent is still resolving agentops_agents UUID. */
  identityReady?: boolean;
}): AgentHermesConnectionLabel {
  if (input.identityReady === false) return "Unknown";
  // Identity missing is Unknown — not a Hermes connection Error.
  if (!input.runtimeAgentId) return "Unknown";
  if (input.retrievalError && /hermes|transport|health/i.test(input.retrievalError)) {
    return "Error";
  }
  if (input.agentSpecificRecordExists) return "Connected";
  return "Not configured";
}

export function formatAgentHermesStripDetail(
  agentLabel: AgentHermesConnectionLabel,
): string {
  if (agentLabel === "Connected") return "Agent Hermes connected";
  if (agentLabel === "Error") return "Agent Hermes error";
  if (agentLabel === "Unknown") return "Agent Hermes unknown (runtime identity missing)";
  return "Agent Hermes not configured";
}

export function mapMemoryPartitionToStripStatus(input: {
  loaded: boolean;
  error: string | null;
  timedOut?: boolean;
  runtimeTotal: number | null;
  enabledRuntime: number | null;
  pendingDrafts: number | null;
  diagnosticCount?: number | null;
}): { status: string; detail: string } {
  if (input.timedOut) {
    return {
      status: "Memory load slow",
      detail: AGENT_DETAIL_MEMORY_COPY.memoryLoadSlow,
    };
  }
  if (input.error) {
    return { status: "Memory unavailable", detail: input.error };
  }
  if (!input.loaded || input.runtimeTotal == null) {
    return { status: "Unknown", detail: "Memory status not loaded." };
  }
  if (input.runtimeTotal === 0) {
    const pending =
      input.pendingDrafts != null && input.pendingDrafts > 0
        ? ` · ${input.pendingDrafts} pending drafts`
        : input.pendingDrafts === 0
          ? ` · ${AGENT_DETAIL_MEMORY_COPY.noPendingDrafts}`
          : "";
    return {
      status: `0 runtime memory records${pending}`,
      detail: "No agentops_memory rows for this runtime UUID.",
    };
  }
  const enabled = input.enabledRuntime ?? 0;
  const pendingPart =
    input.pendingDrafts != null && input.pendingDrafts > 0
      ? ` · ${input.pendingDrafts} pending drafts`
      : input.pendingDrafts === 0
        ? " · no pending drafts"
        : "";
  const diagPart =
    input.diagnosticCount != null && input.diagnosticCount > 0
      ? ` · ${input.diagnosticCount} diagnostic`
      : "";
  return {
    status: `${input.runtimeTotal} runtime memory records · ${enabled} enabled${pendingPart}`,
    detail: `Runtime memory (agentops_memory). Diagnostics${diagPart || " collapsed"}. Not all records are approved active memory.`,
  };
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<{ ok: true; value: T } | { ok: false; error: string; timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const value = await Promise.race([
      promise.then((v) => ({ kind: "ok" as const, v })),
      new Promise<{ kind: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
      }),
    ]);
    if (value.kind === "timeout") {
      return { ok: false, error: timeoutMessage, timedOut: true };
    }
    return { ok: true, value: value.v };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      timedOut: false,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
