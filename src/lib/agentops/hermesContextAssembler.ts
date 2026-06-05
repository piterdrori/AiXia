import {
  formatAgentOpsGlobalMemoryForHermesContext,
  getAgentOpsGlobalMemoryApprovedRecords,
} from "./globalMemoryApprovedService";
import { getAgentOpsAgentMemory, getAgentOpsManagedAgents } from "./service";
import type {
  AgentOpsHermesContextAssemblerPreview,
  AgentOpsHermesContextAssemblerSection,
  AgentOpsHermesContextAssemblerSectionStatus,
  AgentOpsManagedAgent,
  AgentOpsManagedAgentMemoryItem,
} from "./types";
import { buildAgentOpsHermesToolRegistryPreview } from "./hermesToolRegistryPreview";
import {
  formatToolRegistryStatus,
  getToolRegistryEntry,
  summarizeChildStatuses,
} from "./tools/toolRegistry";

const DEFAULT_GLOBAL_LIMIT = 10;
const MAX_AGENTS = 12;
const MAX_SNIPPETS_PER_AGENT = 3;
const SNIPPET_TEXT_MAX = 140;

export type AssembleAgentOpsHermesPreviewContextOptions = {
  globalLimit?: number;
  perAgentSnippetLimit?: number;
  issueCode?: string | null;
};

function truncateSnippet(text: string, max = SNIPPET_TEXT_MAX): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function buildSection(
  sectionId: string,
  title: string,
  source: string,
  status: AgentOpsHermesContextAssemblerSectionStatus,
  entries: string[],
  safetyNote?: string,
): AgentOpsHermesContextAssemblerSection {
  return { sectionId, title, source, status, entries, safetyNote };
}

async function buildGlobalMemorySection(
  globalLimit: number,
  loadErrors: string[],
): Promise<{ section: AgentOpsHermesContextAssemblerSection; includedCount: number }> {
  try {
    const result = await getAgentOpsGlobalMemoryApprovedRecords();
    if (result.error) {
      loadErrors.push(`Global memory: ${result.error}`);
      return {
        section: buildSection(
          "global-memory",
          "Global approved memory",
          "getAgentOpsGlobalMemoryApprovedRecords",
          "unavailable",
          ["Could not load approved global memory records."],
          "Metadata only — not sent to Hermes runtime.",
        ),
        includedCount: 0,
      };
    }

    const records = result.data?.records ?? [];
    const preview = formatAgentOpsGlobalMemoryForHermesContext(records, { limit: globalLimit });
    const entries: string[] = [];

    if (preview.entries.length === 0) {
      entries.push("No eligible approved global memory lines for preview.");
    } else {
      for (const entry of preview.entries) {
        entries.push(entry.previewLine);
      }
    }

    for (const disclaimer of preview.safetyDisclaimer) {
      entries.push(disclaimer);
    }

    if (preview.stats.excludedCount > 0) {
      entries.push(
        `Excluded from preview: ${preview.stats.excludedCount} record(s) (ineligible or over limit).`,
      );
    }

    return {
      section: buildSection(
        "global-memory",
        "Global approved memory",
        "formatAgentOpsGlobalMemoryForHermesContext",
        preview.entries.length > 0 ? "preview_only" : "empty",
        entries,
        "Metadata only · SOT proposals are not law · not sent to Hermes.",
      ),
      includedCount: preview.stats.includedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    loadErrors.push(`Global memory: ${message}`);
    return {
      section: buildSection(
        "global-memory",
        "Global approved memory",
        "getAgentOpsGlobalMemoryApprovedRecords",
        "unavailable",
        ["Global memory preview unavailable."],
      ),
      includedCount: 0,
    };
  }
}

function formatAgentMemorySnippet(item: AgentOpsManagedAgentMemoryItem): string {
  const typeLabel = item.memoryType || item.inputMemoryType || "memory";
  return truncateSnippet(`${typeLabel}: ${item.memoryText}`);
}

async function buildPerAgentMemorySection(
  snippetLimit: number,
  loadErrors: string[],
): Promise<{ section: AgentOpsHermesContextAssemblerSection; activeRowCount: number }> {
  try {
    const managedResult = await getAgentOpsManagedAgents();
    if (managedResult.error) {
      loadErrors.push(`Per-agent memory: ${managedResult.error}`);
      return {
        section: buildSection(
          "per-agent-memory",
          "Per-agent memory",
          "getAgentOpsManagedAgents / getAgentOpsAgentMemory",
          "unavailable",
          ["Could not load managed agents."],
          "AgentMemory not connected — Supabase rows only.",
        ),
        activeRowCount: 0,
      };
    }

    const agents = (managedResult.data ?? []).slice(0, MAX_AGENTS);
    const entries: string[] = [];
    let activeRowCount = 0;

    if (agents.length === 0) {
      entries.push("No managed agents found.");
      return {
        section: buildSection(
          "per-agent-memory",
          "Per-agent memory",
          "getAgentOpsManagedAgents",
          "empty",
          entries,
          "AgentMemory not connected.",
        ),
        activeRowCount: 0,
      };
    }

    const memoryResults = await Promise.all(
      agents.map((agent) => getAgentOpsAgentMemory(agent.agentId)),
    );

    for (let index = 0; index < agents.length; index += 1) {
      const agent: AgentOpsManagedAgent = agents[index];
      const memoryResult = memoryResults[index];

      if (memoryResult.error) {
        entries.push(`${agent.displayName}: unavailable (${memoryResult.error})`);
        continue;
      }

      const activeRows = (memoryResult.data ?? []).filter((row) => row.active !== false);
      activeRowCount += activeRows.length;

      if (activeRows.length === 0) {
        entries.push(`${agent.displayName}: 0 active rows`);
        continue;
      }

      const snippets = activeRows
        .slice(0, snippetLimit)
        .map((row) => formatAgentMemorySnippet(row));
      const overflow =
        activeRows.length > snippetLimit
          ? ` (+${activeRows.length - snippetLimit} more)`
          : "";
      entries.push(
        `${agent.displayName}: ${activeRows.length} active — ${snippets.join(" | ")}${overflow}`,
      );
    }

    const status: AgentOpsHermesContextAssemblerSectionStatus =
      activeRowCount > 0 ? "preview_only" : "empty";

    if (activeRowCount === 0) {
      entries.unshift("No active Supabase memory rows found across managed agents.");
    } else {
      entries.unshift(
        `Aggregate preview for ${agents.length} managed agent(s) — max ${snippetLimit} snippet(s) per agent.`,
      );
    }

    return {
      section: buildSection(
        "per-agent-memory",
        "Per-agent memory",
        "getAgentOpsManagedAgents · getAgentOpsAgentMemory",
        status,
        entries,
        "UI pass-through only · Hermes runtime does not load these rows · AgentMemory not connected.",
      ),
      activeRowCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    loadErrors.push(`Per-agent memory: ${message}`);
    return {
      section: buildSection(
        "per-agent-memory",
        "Per-agent memory",
        "getAgentOpsManagedAgents",
        "unavailable",
        ["Per-agent memory preview unavailable."],
      ),
      activeRowCount: 0,
    };
  }
}

function buildToolRegistrySection(
  registryPreview: ReturnType<typeof buildAgentOpsHermesToolRegistryPreview>,
): AgentOpsHermesContextAssemblerSection {
  const { summary, categories, relevantTools } = registryPreview;
  const hermesTool = getToolRegistryEntry("mct-hermes");
  const agentMemoryTool = getToolRegistryEntry("mct-agentmemory");
  const memoryCoordEntry = getToolRegistryEntry("memory-coordination-tools");

  const entries = [
    `${summary.mainCategories} categories tracked in Tools Hub registry (${summary.totalRegistryNodes} nodes).`,
    `Agent Brain & Memory includes Hermes, AgentMemory, CodeGraph, evidence tools, and reasoning layer — ${memoryCoordEntry ? summarizeChildStatuses(memoryCoordEntry.childrenIds) : "see registry"}.`,
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

  return buildSection(
    "tool_registry",
    "Tool Registry Context",
    "src/lib/agentops/tools/toolRegistry.ts",
    "preview_only",
    entries,
    "Tool registry context is read-only. Hermes must not execute or configure tools from this preview.",
  );
}

function buildIssueContextSection(
  issueCode?: string | null,
): AgentOpsHermesContextAssemblerSection {
  const trimmed = issueCode?.trim();
  if (!trimmed) {
    return buildSection(
      "issue-context",
      "Issue / finding context",
      "Issue Workspace (not wired in A2)",
      "empty",
      ["No issue context selected.", "A2 does not connect to Issue Chat or finding history yet."],
      "Issue-scoped context will be optional in a later phase.",
    );
  }

  return buildSection(
    "issue-context",
    "Issue / finding context",
    "Issue Workspace (placeholder)",
    "preview_only",
    [
      `Issue code provided: ${trimmed} — full finding payload not loaded in A2 preview.`,
      "Not sent to Hermes runtime.",
    ],
    "A3 may add structured issue context without changing chat behavior.",
  );
}

function buildSafetySection(): AgentOpsHermesContextAssemblerSection {
  return buildSection(
    "safety-rules",
    "Runtime safety rules",
    "Hermes safety policy (read-only)",
    "included",
    [
      "Coordinator not active — preview only.",
      "Not sent to Hermes runtime or LLM.",
      "No memory writes.",
      "No source-of-truth file writes.",
      "No AgentMemory writes.",
      "No registry file writes.",
      "Official law remains src/design-system/aixia-global/** only.",
      "SOT proposals and approved metadata are not coordinator law.",
    ],
  );
}

/**
 * A2 — read-only Hermes context assembler preview.
 * Never writes, never calls Hermes/LLM, never requires runtime active.
 */
export async function assembleAgentOpsHermesPreviewContext(
  options?: AssembleAgentOpsHermesPreviewContextOptions,
): Promise<AgentOpsHermesContextAssemblerPreview> {
  const globalLimit = Math.min(Math.max(options?.globalLimit ?? DEFAULT_GLOBAL_LIMIT, 1), 10);
  const perAgentSnippetLimit = Math.min(
    Math.max(options?.perAgentSnippetLimit ?? MAX_SNIPPETS_PER_AGENT, 1),
    MAX_SNIPPETS_PER_AGENT,
  );
  const loadErrors: string[] = [];

  const toolRegistryPreview = buildAgentOpsHermesToolRegistryPreview();

  const [globalResult, perAgentResult, issueSection, safetySection] = await Promise.all([
    buildGlobalMemorySection(globalLimit, loadErrors),
    buildPerAgentMemorySection(perAgentSnippetLimit, loadErrors),
    Promise.resolve(buildIssueContextSection(options?.issueCode)),
    Promise.resolve(buildSafetySection()),
  ]);

  const toolSection = buildToolRegistrySection(toolRegistryPreview);

  return {
    assembledAt: new Date().toISOString(),
    mode: "preview_only",
    coordinatorActive: false,
    writesBlocked: true,
    sourceOfTruthWritesBlocked: true,
    sections: [
      globalResult.section,
      perAgentResult.section,
      toolSection,
      issueSection,
      safetySection,
    ],
    stats: {
      globalMemoryCount: globalResult.includedCount,
      perAgentMemoryCount: perAgentResult.activeRowCount,
      toolRegistryCount: toolRegistryPreview.summary.totalRegistryNodes,
      issueContextIncluded: Boolean(options?.issueCode?.trim()),
    },
    toolRegistryPreview,
    loadErrors,
  };
}
