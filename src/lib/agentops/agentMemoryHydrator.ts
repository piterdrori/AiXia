/**
 * Agent brain hydration — single source of truth from agentops_memory + agentops_agent_logs.
 */

import {
  classifyMemory,
  isSystemEventMemoryContent,
  normalizeStoredMemoryType,
  type ClassifiedMemoryType,
} from "@/lib/agentops/hermes/memoryClassifier";
import { isStaleRefusalMemoryContent } from "@/lib/agentops/memory/staleAgentMemoryFilter";
import {
  loadAgentSeedMemory,
  type AgentSeedMemoryItem,
} from "@/lib/agentops/agentSeedMemoryLoader";
import { supabase } from "@/lib/supabase";

import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
  type AgentOpsRuntimeAgentLogRow,
  type AgentOpsRuntimeMemoryRow,
} from "./db/agentOpsRuntimeTypes";

export type AgentBrainMemoryType = "FACT" | "RULE" | "PREFERENCE" | "BEHAVIOR";

export type AgentBrainMemorySourceKind = "SEED" | "HERMES" | "CHAT" | "SYSTEM" | "MANUAL";

export type AgentBrainMemoryItem = {
  id: string;
  type: AgentBrainMemoryType;
  memoryType: ClassifiedMemoryType;
  content: string;
  source: string;
  sourceKind: AgentBrainMemorySourceKind;
  isSeed: boolean;
  seedId?: string;
  createdAt: string;
  hermesValidated: boolean;
  row: AgentOpsRuntimeMemoryRow | null;
};

export type AgentBrainSystemObservation = {
  id: string;
  action: string;
  kind: string;
  summary: string;
  createdAt: string;
  log: AgentOpsRuntimeAgentLogRow;
};

export type AgentBrainReasoningTrace = {
  id: string;
  turnId?: string;
  intent: string;
  steps: string[];
  memoryUsed: string[];
  memoryUsedIds: string[];
  memoryTypesUsed: string[];
  decision: string;
  decisionOutput: string;
  toolsUsed: string[];
  result: string;
  confidenceScore: number | null;
  createdAt: string;
  log: AgentOpsRuntimeAgentLogRow;
};

export type AgentBrainChatEntry = {
  id: string;
  turnId?: string;
  role: "user" | "agent";
  message: string;
  createdAt: string;
  log: AgentOpsRuntimeAgentLogRow;
};

export type AgentBrainInsight = {
  id: string;
  label: string;
  value: string;
};

export type AgentBrainState = {
  agentId: string;
  facts: AgentBrainMemoryItem[];
  rules: AgentBrainMemoryItem[];
  preferences: AgentBrainMemoryItem[];
  behavior: AgentBrainMemoryItem[];
  systemObservations: AgentBrainSystemObservation[];
  reasoning: AgentBrainReasoningTrace[];
  chat: AgentBrainChatEntry[];
  derivedInsights: AgentBrainInsight[];
  memoryRows: AgentOpsRuntimeMemoryRow[];
  classifiedMemoryRows: AgentOpsRuntimeMemoryRow[];
  seedMemoryRows: AgentSeedMemoryItem[];
  hasSeedMemory: boolean;
  hasDbMemory: boolean;
  logs: AgentOpsRuntimeAgentLogRow[];
  hydratedAt: string;
};

export type HydrateAgentBrainContext = {
  agentName?: string;
  role?: string;
  canonicalId?: string;
};

export type HydrateAgentBrainResult = {
  brain: AgentBrainState | null;
  error: string | null;
};

function readPayloadString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function readPayloadStringArray(payload: Record<string, unknown>, key: string): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readPayloadNumber(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readMemoryContent(row: AgentOpsRuntimeMemoryRow): string {
  if (typeof row.content === "string") return row.content;
  if (row.content && typeof row.content === "object") {
    const content = row.content as Record<string, unknown>;
    const summary =
      (typeof content.message_summary === "string" && content.message_summary) ||
      (typeof content.summary === "string" && content.summary) ||
      (typeof content.learned_rule === "string" && content.learned_rule) ||
      (typeof content.text === "string" && content.text);
    if (summary) return summary;
    return JSON.stringify(content).slice(0, 500);
  }
  return "";
}

function readRecordClass(row: AgentOpsRuntimeMemoryRow): string | null {
  if (row.content && typeof row.content === "object") {
    const value = (row.content as Record<string, unknown>).record_class;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function resolveMemoryType(row: AgentOpsRuntimeMemoryRow): ClassifiedMemoryType {
  if (row.content && typeof row.content === "object") {
    const content = row.content as Record<string, unknown>;
    const stored = normalizeStoredMemoryType(content.memory_type);
    if (stored) return stored;
    const legacy = content.memory_type;
    if (typeof legacy === "string") {
      const normalized = normalizeStoredMemoryType(legacy.toLowerCase());
      if (normalized) return normalized;
    }
  }
  return classifyMemory({ content: readMemoryContent(row) });
}

function isClassifiedMemoryRow(row: AgentOpsRuntimeMemoryRow): boolean {
  const recordClass = readRecordClass(row);
  if (recordClass === "system_event") return false;

  const content = readMemoryContent(row);
  if (isSystemEventMemoryContent(content)) return false;

  if (row.content && typeof row.content === "object") {
    const kind = (row.content as Record<string, unknown>).content_kind;
    if (kind === "system_event" || kind === "observation") return false;
  }

  return true;
}

function readMemorySource(row: AgentOpsRuntimeMemoryRow): string {
  if (row.content && typeof row.content === "object") {
    const source = (row.content as Record<string, unknown>).source;
    if (typeof source === "string" && source.trim()) return source;
  }
  return row.source;
}

function readHermesValidated(row: AgentOpsRuntimeMemoryRow): boolean {
  if (row.content && typeof row.content === "object") {
    return (row.content as Record<string, unknown>).hermes_validated === true;
  }
  return row.approved;
}

function normalizeContentKey(content: string): string {
  return content.toLowerCase().trim().replace(/\s+/g, " ");
}

function resolveSourceKind(source: string, row: AgentOpsRuntimeMemoryRow | null, isSeed: boolean): AgentBrainMemorySourceKind {
  if (isSeed) return "SEED";
  if (row?.content && typeof row.content === "object") {
    const content = row.content as Record<string, unknown>;
    if (content.source === "manual_override" || content.overrides_seed_id) return "MANUAL";
    if (content.source === "hermes") return "HERMES";
    if (content.source === "chat") return "CHAT";
    if (content.source === "system" || content.source === "schedule") return "SYSTEM";
  }
  const normalized = source.toLowerCase();
  if (normalized === "hermes") return "HERMES";
  if (normalized === "chat" || normalized === "agent") return "CHAT";
  if (normalized === "system" || normalized === "schedule") return "SYSTEM";
  if (normalized === "manual" || normalized === "manual_override") return "MANUAL";
  return "CHAT";
}

function readOverridesSeedId(row: AgentOpsRuntimeMemoryRow): string | null {
  if (row.content && typeof row.content === "object") {
    const value = (row.content as Record<string, unknown>).overrides_seed_id;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function toUpperMemoryType(type: ClassifiedMemoryType): AgentBrainMemoryType {
  switch (type) {
    case "rule":
      return "RULE";
    case "preference":
      return "PREFERENCE";
    case "behavior":
      return "BEHAVIOR";
    default:
      return "FACT";
  }
}

function toSeedMemoryItem(seed: AgentSeedMemoryItem): AgentBrainMemoryItem {
  return {
    id: seed.id,
    type: toUpperMemoryType(seed.type),
    memoryType: seed.type,
    content: seed.content,
    source: "seed_file",
    sourceKind: "SEED",
    isSeed: true,
    seedId: seed.id,
    createdAt: seed.created_at ?? "1970-01-01T00:00:00.000Z",
    hermesValidated: false,
    row: null,
  };
}

function toMemoryItem(row: AgentOpsRuntimeMemoryRow): AgentBrainMemoryItem {
  const memoryType = resolveMemoryType(row);
  const source = readMemorySource(row);
  return {
    id: row.id,
    type: toUpperMemoryType(memoryType),
    memoryType,
    content: readMemoryContent(row),
    source,
    sourceKind: resolveSourceKind(source, row, false),
    isSeed: false,
    createdAt: row.created_at,
    hermesValidated: readHermesValidated(row),
    row,
  };
}

function mergeDbAndSeedMemory(
  dbItems: AgentBrainMemoryItem[],
  seedItems: AgentBrainMemoryItem[],
  classifiedRows: AgentOpsRuntimeMemoryRow[],
): AgentBrainMemoryItem[] {
  const dbContentKeys = new Set(dbItems.map((item) => normalizeContentKey(item.content)));
  const overriddenSeedIds = new Set(
    classifiedRows
      .map(readOverridesSeedId)
      .filter((value): value is string => Boolean(value)),
  );

  const filteredSeed = seedItems.filter((item) => {
    if (item.seedId && overriddenSeedIds.has(item.seedId)) return false;
    return !dbContentKeys.has(normalizeContentKey(item.content));
  });

  return [...dbItems, ...filteredSeed].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function bucketMergedMemory(
  dbRows: AgentOpsRuntimeMemoryRow[],
  seedRows: AgentSeedMemoryItem[],
): {
  facts: AgentBrainMemoryItem[];
  rules: AgentBrainMemoryItem[];
  preferences: AgentBrainMemoryItem[];
  behavior: AgentBrainMemoryItem[];
} {
  const dbItems = dbRows
    .filter(isClassifiedMemoryRow)
    .filter((row) => !isStaleRefusalMemoryContent(row.content))
    .map(toMemoryItem);
  const seedItems = seedRows.map(toSeedMemoryItem);
  const merged = mergeDbAndSeedMemory(dbItems, seedItems, dbRows);

  return {
    facts: merged.filter((item) => item.memoryType === "fact"),
    rules: merged.filter((item) => item.memoryType === "rule"),
    preferences: merged.filter((item) => item.memoryType === "preference"),
    behavior: merged.filter((item) => item.memoryType === "behavior"),
  };
}

function isChatLog(log: AgentOpsRuntimeAgentLogRow): boolean {
  return log.payload?.kind === "chat";
}

function isReasoningLog(log: AgentOpsRuntimeAgentLogRow): boolean {
  return log.payload?.kind === "reasoning_step";
}

function isSystemObservationLog(log: AgentOpsRuntimeAgentLogRow): boolean {
  if (log.action === "scan" || log.action === "cycle_complete" || log.action === "issue_detected") {
    return true;
  }
  const kind = log.payload?.kind;
  return kind === "scheduled_cycle" || kind === "activation" || kind === "memory_auto_write";
}

function summarizeObservationLog(log: AgentOpsRuntimeAgentLogRow): string {
  const payload = log.payload ?? {};
  const message = readPayloadString(payload, "message");
  if (message) return message;

  const findings = payload.findings;
  if (Array.isArray(findings) && findings.length > 0) {
    const first = findings[0] as Record<string, unknown>;
    if (typeof first.message === "string") return first.message;
  }

  if (log.action === "scan") return "Scheduled work cycle scan completed.";
  if (log.action === "cycle_complete") return "Agent cycle completed.";
  if (log.action === "issue_detected") return "Issue detected during agent work.";
  return `${log.action} event`;
}

function parseSystemObservations(logs: AgentOpsRuntimeAgentLogRow[]): AgentBrainSystemObservation[] {
  return logs
    .filter(isSystemObservationLog)
    .map((log) => ({
      id: log.id,
      action: log.action,
      kind: readPayloadString(log.payload, "kind") || log.action,
      summary: summarizeObservationLog(log),
      createdAt: readPayloadString(log.payload, "emitted_at") || log.created_at,
      log,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function parseChatEntries(logs: AgentOpsRuntimeAgentLogRow[]): AgentBrainChatEntry[] {
  return logs
    .filter(isChatLog)
    .map((log) => ({
      id: log.id,
      turnId: readPayloadString(log.payload, "turn_id") || undefined,
      role: (log.payload?.role === "agent" ? "agent" : "user") as "user" | "agent",
      message: readPayloadString(log.payload, "message"),
      createdAt: readPayloadString(log.payload, "emitted_at") || log.created_at,
      log,
    }))
    .filter((entry) => entry.message.length > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function parseReasoningTraces(logs: AgentOpsRuntimeAgentLogRow[]): AgentBrainReasoningTrace[] {
  return logs
    .filter(isReasoningLog)
    .map((log) => {
      const decisionOutput =
        readPayloadString(log.payload, "decision_output") ||
        readPayloadString(log.payload, "decision") ||
        readPayloadString(log.payload, "result");

      return {
        id: log.id,
        turnId: readPayloadString(log.payload, "turn_id") || undefined,
        intent: readPayloadString(log.payload, "intent") || "Reasoning step",
        steps: readPayloadStringArray(log.payload, "steps"),
        memoryUsed: readPayloadStringArray(log.payload, "memory_used"),
        memoryUsedIds: readPayloadStringArray(log.payload, "memory_used_ids"),
        memoryTypesUsed: readPayloadStringArray(log.payload, "memory_types_used"),
        decision: readPayloadString(log.payload, "decision"),
        decisionOutput,
        toolsUsed: readPayloadStringArray(log.payload, "tools_used"),
        result: decisionOutput,
        confidenceScore: readPayloadNumber(log.payload, "confidence_score"),
        createdAt: readPayloadString(log.payload, "emitted_at") || log.created_at,
        log,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function generateInsights(
  classifiedRows: AgentOpsRuntimeMemoryRow[],
  seedRows: AgentSeedMemoryItem[],
  systemObservations: AgentBrainSystemObservation[],
  chat: AgentBrainChatEntry[],
  reasoning: AgentBrainReasoningTrace[],
): AgentBrainInsight[] {
  const hermesCount = classifiedRows.filter(readHermesValidated).length;
  const latestSignal = [...chat, ...reasoning.map((entry) => ({ createdAt: entry.createdAt }))]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return [
    { id: "memory-total", label: "Classified memory", value: String(classifiedRows.length) },
    { id: "seed-memory", label: "Seed memory", value: String(seedRows.length) },
    { id: "hermes-validated", label: "Hermes validated", value: String(hermesCount) },
    { id: "system-events", label: "System observations", value: String(systemObservations.length) },
    { id: "chat-signals", label: "Chat log signals", value: String(chat.length) },
    { id: "reasoning-signals", label: "Reasoning traces", value: String(reasoning.length) },
    {
      id: "last-signal",
      label: "Last behavior trace",
      value: latestSignal ? new Date(latestSignal.createdAt).toLocaleString() : "none",
    },
  ];
}

export function isAgentBrainEmpty(brain: AgentBrainState): boolean {
  return (
    brain.facts.length === 0 &&
    brain.rules.length === 0 &&
    brain.preferences.length === 0 &&
    brain.behavior.length === 0 &&
    brain.systemObservations.length === 0 &&
    brain.reasoning.length === 0 &&
    brain.chat.length === 0
  );
}

export async function hydrateAgentBrain(
  agentId: string,
  context?: HydrateAgentBrainContext,
): Promise<HydrateAgentBrainResult> {
  if (!agentId.trim()) {
    return { brain: null, error: "Missing agent id." };
  }

  const [memoryResult, logsResult, seedMemoryRows] = await Promise.all([
    supabase
      .from(AGENTOPS_RUNTIME_TABLES.memory)
      .select("*")
      .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
      .eq("scope", "agent")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false }),
    supabase
      .from(AGENTOPS_RUNTIME_TABLES.agentLogs)
      .select("*")
      .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true }),
    loadAgentSeedMemory({
      agentId,
      agentName: context?.agentName,
      role: context?.role,
      canonicalId: context?.canonicalId,
    }),
  ]);

  const memoryError = memoryResult.error?.message ?? null;
  const logsError = logsResult.error?.message ?? null;
  if (memoryError || logsError) {
    return { brain: null, error: memoryError ?? logsError ?? "Failed to hydrate agent brain." };
  }

  const memoryRows = (memoryResult.data ?? []) as AgentOpsRuntimeMemoryRow[];
  const classifiedMemoryRows = memoryRows.filter(isClassifiedMemoryRow);
  const logs = (logsResult.data ?? []) as AgentOpsRuntimeAgentLogRow[];
  const chat = parseChatEntries(logs);
  const reasoning = parseReasoningTraces(logs);
  const systemObservations = parseSystemObservations(logs);
  const buckets = bucketMergedMemory(classifiedMemoryRows, seedMemoryRows);

  const brain: AgentBrainState = {
    agentId,
    facts: buckets.facts,
    rules: buckets.rules,
    preferences: buckets.preferences,
    behavior: buckets.behavior,
    systemObservations,
    reasoning,
    chat,
    derivedInsights: generateInsights(classifiedMemoryRows, seedMemoryRows, systemObservations, chat, reasoning),
    memoryRows,
    classifiedMemoryRows,
    seedMemoryRows,
    hasSeedMemory: seedMemoryRows.length > 0,
    hasDbMemory: classifiedMemoryRows.length > 0,
    logs,
    hydratedAt: new Date().toISOString(),
  };

  return { brain, error: null };
}
