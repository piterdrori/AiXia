/**
 * A2-runtime — server-safe read-only Hermes context assembler wrapper.
 * Mirrors src/lib/agentops/hermesContextAssembler.ts without @/ imports or owner gates.
 */

import fs from "node:fs";
import path from "node:path";

import { buildAgentOpsHermesToolRegistryPreview } from "../../src/lib/agentops/hermesToolRegistryPreview.js";
import {
  formatToolRegistryStatus,
  getToolRegistryEntry,
  summarizeChildStatuses,
} from "../../src/lib/agentops/tools/toolRegistry.js";

import {
  getAgentOpsServerSupabase,
  isAgentOpsServerSupabaseConfigured,
} from "./agentopsServerSupabase.js";
import {
  formatHermesReadOnlyContextPrompt,
  type HermesReadOnlyContextSection,
} from "./hermesContextPrompt.js";

const DEFAULT_GLOBAL_LIMIT = 10;
const MAX_AGENTS = 12;
const MAX_SNIPPETS_PER_AGENT = 2;
const SNIPPET_TEXT_MAX = 140;
type SyntheticBrowserUserRegistry = {
  users?: Array<{ qaUserId?: string; displayName?: string }>;
};

function readSyntheticBrowserUsers(): SyntheticBrowserUserRegistry {
  try {
    const filePath = path.join(
      process.cwd(),
      "qa-agent",
      "browser-qa",
      "synthetic-browser-users.json",
    );
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as SyntheticBrowserUserRegistry;
  } catch {
    return { users: [] };
  }
}

const HERMES_PREVIEW_INCLUDED_STATUSES = new Set([
  "approved_memory",
  "advisory_only",
  "sot_proposal_pending",
]);

type GlobalMemoryRecord = {
  memoryId: string;
  title: string;
  memoryText: string;
  status: string;
  memoryType: string;
  approvedAt: string;
  hasSotProposal?: boolean;
};

export type AssembleHermesReadOnlyContextOptions = {
  globalLimit?: number;
  perAgentSnippetLimit?: number;
  issueCode?: string | null;
};

export type HermesReadOnlyContextAssemblyResult = {
  promptBlock: string;
  sections: HermesReadOnlyContextSection[];
  stats: {
    globalMemoryCount: number;
    perAgentMemoryCount: number;
    toolRegistryCount: number;
    issueContextIncluded: boolean;
  };
  loadErrors: string[];
};

function truncateSnippet(text: string, max = SNIPPET_TEXT_MAX): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function parseApprovedRecord(value: unknown): GlobalMemoryRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.memoryId !== "string" || typeof raw.title !== "string") return null;
  if (typeof raw.memoryText !== "string" || typeof raw.status !== "string") return null;
  return {
    memoryId: raw.memoryId,
    title: raw.title,
    memoryText: raw.memoryText,
    status: raw.status,
    memoryType: typeof raw.memoryType === "string" ? raw.memoryType : "advisory",
    approvedAt: typeof raw.approvedAt === "string" ? raw.approvedAt : "",
    hasSotProposal: raw.hasSotProposal === true,
  };
}

async function loadGlobalMemorySection(
  globalLimit: number,
  loadErrors: string[],
): Promise<{ section: HermesReadOnlyContextSection; includedCount: number }> {
  const supabase = getAgentOpsServerSupabase();
  if (!supabase) {
    loadErrors.push("Global memory: Supabase not configured.");
    return {
      section: {
        sectionId: "global-memory",
        title: "Global approved memory",
        entries: ["Global memory preview unavailable (Supabase not configured)."],
        safetyNote: "Metadata only — read-only advisory context.",
      },
      includedCount: 0,
    };
  }

  try {
    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("id, metadata, created_at")
      .is("finding_id", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      loadErrors.push(`Global memory: ${error.message}`);
      return {
        section: {
          sectionId: "global-memory",
          title: "Global approved memory",
          entries: ["Could not load approved global memory records."],
          safetyNote: "Metadata only — read-only advisory context.",
        },
        includedCount: 0,
      };
    }

    const records: GlobalMemoryRecord[] = [];
    for (const row of data ?? []) {
      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null;
      if (!metadata || metadata.action !== "global_memory_approved_record") continue;
      const parsed = parseApprovedRecord(metadata.record);
      if (!parsed) continue;
      if (!HERMES_PREVIEW_INCLUDED_STATUSES.has(parsed.status)) continue;
      if (!parsed.memoryText.trim()) continue;
      records.push(parsed);
    }

    records.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
    const included = records.slice(0, globalLimit);
    const entries: string[] = [];

    if (included.length === 0) {
      entries.push("No eligible approved global memory lines for preview.");
    } else {
      for (const [index, record] of included.entries()) {
        const compact = truncateSnippet(record.memoryText, 200);
        entries.push(
          `${index + 1}. ${record.title} · ${record.memoryType} · ${record.status} · ${compact}`,
        );
      }
    }

    if (records.length > included.length) {
      entries.push(`Excluded from preview: ${records.length - included.length} record(s) over limit.`);
    }

    entries.push(
      "Metadata only · SOT proposals are not law · official law is src/design-system/aixia-global/** only.",
    );

    return {
      section: {
        sectionId: "global-memory",
        title: "Global approved memory",
        entries,
        safetyNote: "Metadata only — not coordinator law.",
      },
      includedCount: included.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    loadErrors.push(`Global memory: ${message}`);
    return {
      section: {
        sectionId: "global-memory",
        title: "Global approved memory",
        entries: ["Global memory preview unavailable."],
      },
      includedCount: 0,
    };
  }
}

async function loadPerAgentMemorySection(
  snippetLimit: number,
  loadErrors: string[],
): Promise<{ section: HermesReadOnlyContextSection; activeRowCount: number }> {
  const supabase = getAgentOpsServerSupabase();
  const users = readSyntheticBrowserUsers().users ?? [];

  const agents = users
    .map((user) => ({
      agentId: (user.qaUserId ?? "").trim(),
      displayName: (user.displayName ?? user.qaUserId ?? "Agent").trim(),
    }))
    .filter((agent) => agent.agentId)
    .slice(0, MAX_AGENTS);

  if (!supabase) {
    loadErrors.push("Per-agent memory: Supabase not configured.");
    return {
      section: {
        sectionId: "per-agent-memory",
        title: "Per-agent memory",
        entries: ["Per-agent memory preview unavailable (Supabase not configured)."],
        safetyNote: "AgentMemory not connected — Supabase rows only.",
      },
      activeRowCount: 0,
    };
  }

  if (agents.length === 0) {
    return {
      section: {
        sectionId: "per-agent-memory",
        title: "Per-agent memory",
        entries: ["No managed agents found."],
        safetyNote: "AgentMemory not connected.",
      },
      activeRowCount: 0,
    };
  }

  try {
    const agentIds = agents.map((agent) => agent.agentId);
    const { data, error } = await supabase
      .from("agentops_agent_memory")
      .select("id, agent_id, memory_type, memory_text, active, created_at")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: false });

    if (error) {
      loadErrors.push(`Per-agent memory: ${error.message}`);
      return {
        section: {
          sectionId: "per-agent-memory",
          title: "Per-agent memory",
          entries: ["Could not load per-agent memory rows."],
          safetyNote: "AgentMemory not connected — Supabase rows only.",
        },
        activeRowCount: 0,
      };
    }

    const rowsByAgent = new Map<string, Array<{ memory_type: string; memory_text: string; active: boolean }>>();
    for (const row of data ?? []) {
      const agentId = String(row.agent_id ?? "");
      if (!agentId) continue;
      const bucket = rowsByAgent.get(agentId) ?? [];
      bucket.push({
        memory_type: String(row.memory_type ?? "memory"),
        memory_text: String(row.memory_text ?? ""),
        active: row.active !== false,
      });
      rowsByAgent.set(agentId, bucket);
    }

    const entries: string[] = [];
    let activeRowCount = 0;

    for (const agent of agents) {
      const rows = (rowsByAgent.get(agent.agentId) ?? []).filter((row) => row.active);
      activeRowCount += rows.length;

      if (rows.length === 0) {
        entries.push(`${agent.displayName}: 0 active rows`);
        continue;
      }

      const snippets = rows
        .slice(0, snippetLimit)
        .map((row) => truncateSnippet(`${row.memory_type}: ${row.memory_text}`));
      const overflow = rows.length > snippetLimit ? ` (+${rows.length - snippetLimit} more)` : "";
      entries.push(
        `${agent.displayName}: ${rows.length} active — ${snippets.join(" | ")}${overflow}`,
      );
    }

    if (activeRowCount === 0) {
      entries.unshift("No active Supabase memory rows found across managed agents.");
    } else {
      entries.unshift(
        `Aggregate preview for ${agents.length} managed agent(s) — max ${snippetLimit} snippet(s) per agent.`,
      );
    }

    return {
      section: {
        sectionId: "per-agent-memory",
        title: "Per-agent memory",
        entries,
        safetyNote: "Summary only · AgentMemory not connected from Hermes runtime.",
      },
      activeRowCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    loadErrors.push(`Per-agent memory: ${message}`);
    return {
      section: {
        sectionId: "per-agent-memory",
        title: "Per-agent memory",
        entries: ["Per-agent memory preview unavailable."],
      },
      activeRowCount: 0,
    };
  }
}

function buildToolRegistrySection(): HermesReadOnlyContextSection {
  const registryPreview = buildAgentOpsHermesToolRegistryPreview();
  const { summary, categories, relevantTools } = registryPreview;
  const hermesTool = getToolRegistryEntry("mct-hermes");
  const agentMemoryTool = getToolRegistryEntry("mct-agentmemory");
  const memoryCoordEntry = getToolRegistryEntry("memory-coordination-tools");

  const entries = [
    `${summary.mainCategories} categories tracked in Tools Hub registry (${summary.totalRegistryNodes} nodes).`,
    `Agent Brain & Memory — ${memoryCoordEntry ? summarizeChildStatuses(memoryCoordEntry.childrenIds) : "see registry"}.`,
    `Existing/partial: ${summary.existingOrPartialCount} · Planned/not connected: ${summary.plannedOrNotConnectedCount} · Hermes-related nodes: ${summary.hermesRelatedNodes}.`,
    `Hermes tool (${hermesTool?.title ?? "Hermes"}): ${hermesTool ? formatToolRegistryStatus(hermesTool.status) : "unknown"} — ${hermesTool?.configuredStatus ?? "coordinator not active"}.`,
    `AgentMemory: ${agentMemoryTool ? formatToolRegistryStatus(agentMemoryTool.status) : "not connected"} — not connected from Hermes preview.`,
    `Tool execution enabled: No — registry is metadata display only in this phase.`,
    ...categories.map(
      (cat) =>
        `${cat.title}: ${cat.nodeCount} node(s), ${cat.directChildCount} group(s) — ${cat.statusMix}. ${cat.hermesRelevance}`,
    ),
    ...relevantTools.slice(0, 8).map(
      (tool) =>
        `${tool.title} (${tool.categoryTitle}): ${tool.statusLabel} — today: ${tool.hermesUseToday}`,
    ),
    ...(relevantTools.length > 8
      ? [`+${relevantTools.length - 8} more Hermes-relevant tools in UI preview (not listed here).`]
      : []),
    "No MCP execution, shell commands, API keys, or registry writes from Hermes preview.",
  ];

  return {
    sectionId: "tool_registry",
    title: "Tool Registry Context",
    entries,
    safetyNote: "Tool registry context is read-only. Hermes must not execute or configure tools.",
  };
}

function buildIssueContextSection(issueCode?: string | null): HermesReadOnlyContextSection {
  const trimmed = issueCode?.trim();
  if (!trimmed) {
    return {
      sectionId: "issue-context",
      title: "Issue / finding context",
      entries: [
        "No issue context selected.",
        "Issue-scoped context is optional and not wired to Issue Chat in A2-runtime.",
      ],
      safetyNote: "Issue-scoped context will be optional in a later phase.",
    };
  }

  return {
    sectionId: "issue-context",
    title: "Issue / finding context",
    entries: [
      `Issue code provided: ${trimmed} — full finding payload not loaded in A2-runtime.`,
      "Placeholder only — not Issue Chat history.",
    ],
    safetyNote: "Structured issue context may expand in a later phase.",
  };
}

function buildSafetySection(): HermesReadOnlyContextSection {
  return {
    sectionId: "safety-rules",
    title: "Runtime safety rules",
    entries: [
      "Coordinator not fully active — advisory read-only context only.",
      "No memory writes.",
      "No source-of-truth file writes.",
      "No AgentMemory writes.",
      "No registry file writes.",
      "Official law remains src/design-system/aixia-global/** only.",
      "SOT proposals and approved metadata are not coordinator law.",
      "Do not claim tools executed or coordinator fully active in responses.",
    ],
  };
}

/** Lightweight availability probe for GET health — no model call, no large context. */
export function isHermesContextAssemblerAvailable(): boolean {
  try {
    buildAgentOpsHermesToolRegistryPreview();
    return isAgentOpsServerSupabaseConfigured();
  } catch {
    return false;
  }
}

export async function assembleHermesReadOnlyContextForRuntime(
  options?: AssembleHermesReadOnlyContextOptions,
): Promise<HermesReadOnlyContextAssemblyResult> {
  const globalLimit = Math.min(Math.max(options?.globalLimit ?? DEFAULT_GLOBAL_LIMIT, 1), 10);
  const perAgentSnippetLimit = Math.min(
    Math.max(options?.perAgentSnippetLimit ?? MAX_SNIPPETS_PER_AGENT, 1),
    MAX_SNIPPETS_PER_AGENT,
  );
  const loadErrors: string[] = [];

  const [globalResult, perAgentResult] = await Promise.all([
    loadGlobalMemorySection(globalLimit, loadErrors),
    loadPerAgentMemorySection(perAgentSnippetLimit, loadErrors),
  ]);

  const registryPreview = buildAgentOpsHermesToolRegistryPreview();
  const toolSection = buildToolRegistrySection();
  const issueSection = buildIssueContextSection(options?.issueCode);
  const safetySection = buildSafetySection();

  const sections = [
    globalResult.section,
    perAgentResult.section,
    toolSection,
    issueSection,
    safetySection,
  ];

  return {
    promptBlock: formatHermesReadOnlyContextPrompt(sections),
    sections,
    stats: {
      globalMemoryCount: globalResult.includedCount,
      perAgentMemoryCount: perAgentResult.activeRowCount,
      toolRegistryCount: registryPreview.summary.totalRegistryNodes,
      issueContextIncluded: Boolean(options?.issueCode?.trim()),
    },
    loadErrors,
  };
}
