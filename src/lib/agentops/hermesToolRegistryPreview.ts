/**
 * A4 — read-only Tool Registry context preview for Hermes.
 * Uses AGENTOPS_TOOL_REGISTRY metadata only — no execution, writes, or MCP.
 */

import type {
  AgentOpsHermesToolRegistryCategoryPreview,
  AgentOpsHermesToolRegistryPreview,
  AgentOpsHermesToolRegistryRelevantTool,
} from "./types.js";
import {
  AGENTOPS_TOOL_REGISTRY,
  formatToolRegistryStatus,
  getToolRegistryEntry,
  getToolRegistryChildren,
  getToolRegistryMainCategories,
  summarizeChildStatuses,
  type ToolRegistryEntry,
  type ToolRegistryStatus,
} from "./tools/toolRegistry.js";

const TOOL_REGISTRY_SOURCE = "src/lib/agentops/tools/toolRegistry.ts";

const EXISTING_OR_PARTIAL: ReadonlySet<ToolRegistryStatus> = new Set(["existing", "partial"]);

const PLANNED_OR_NOT_CONNECTED: ReadonlySet<ToolRegistryStatus> = new Set([
  "planned",
  "not-installed",
  "target-only",
  "placeholder",
  "cloned-only",
  "needs-setup",
]);

/** Curated Hermes-relevant tools for compact preview (registry ids). */
export const HERMES_TOOL_REGISTRY_RELEVANT_IDS: readonly string[] = [
  "mct-hermes",
  "mct-agentmemory",
  "global-memory",
  "per-agent-memory",
  "memory-coordination-tools",
  "ccu-codegraph",
  "ccu-understand-anything",
  "ccu-claude-context",
  "et-browser-qa",
  "et-playwright",
  "et-reports",
  "et-guardrails",
  "et-verification-results",
  "gm-tool-registry",
  "qa-browser-runner",
  "qa-playwright-runner",
  "qa-verification-runner",
  "build-cursor",
  "build-github-tools",
  "build-supabase-mcp",
  "build-vercel-mcp",
  "build-codegraph-mcp",
  "build-local-scripts",
  "runtime-supabase",
  "runtime-vercel",
  "runtime-auth",
  "runtime-database",
  "runtime-storage",
  "runtime-realtime",
  "runtime-edge-functions",
  "runtime-background-workers",
] as const;

const CATEGORY_HERMES_RELEVANCE: Record<string, string> = {
  "agent-brain-memory":
    "Primary — global/per-agent memory, Hermes, AgentMemory, CodeGraph, and reasoning layers.",
  "chat-voice": "Adjacent — LLM/voice surfaces; Hermes must not activate chat tools from preview.",
  "website-qa-evidence":
    "Evidence — browser QA, Playwright, reports, guardrails; advisory context only.",
  "build-development":
    "Build/dev — Cursor, GitHub, Supabase/Vercel MCP, guardrails; metadata only, no MCP execution.",
  "design-crew-references":
    "Design law — aixia-global and reference clones; read-only context, not coordinator law.",
  "automation-integrations": "Planned — webhooks and connectors not wired; Hermes must not assign tools.",
  "runtime-platform":
    "Platform — Supabase, Vercel, auth, DB, storage; awareness only, no runtime activation.",
};

const CATEGORY_SAFETY_STATUS = "Registry preview only · No tool execution · No registry writes";

function countRegistrySubtree(rootId: string): number {
  const entry = getToolRegistryEntry(rootId);
  if (!entry) return 0;
  let count = 1;
  for (const childId of entry.childrenIds) {
    count += countRegistrySubtree(childId);
  }
  return count;
}

function isHermesRelatedRegistryNode(entry: ToolRegistryEntry): boolean {
  if (entry.id.includes("hermes") || entry.relatedToolIds.some((id) => id.includes("hermes"))) {
    return true;
  }
  if ((HERMES_TOOL_REGISTRY_RELEVANT_IDS as readonly string[]).includes(entry.id)) {
    return true;
  }
  return false;
}

function resolveRegistryGroupTitle(entry: ToolRegistryEntry): string | null {
  if (!entry.parentId || entry.parentId === entry.categoryId) return null;
  const parent = getToolRegistryEntry(entry.parentId);
  if (!parent) return null;
  if (parent.level === 2) return parent.title;
  if (parent.level === 3 && parent.parentId) {
    const group = getToolRegistryEntry(parent.parentId);
    return group?.title ?? parent.title;
  }
  return parent.title;
}

function describeHermesUseToday(entry: ToolRegistryEntry): string {
  if (entry.id === "mct-hermes") {
    return "Health + assembler preview only — coordinator not active";
  }
  if (entry.id === "mct-agentmemory") {
    return "Not connected — no recall, install, or writes";
  }
  if (entry.status === "not-installed" || entry.status === "planned" || entry.status === "target-only") {
    return "Not available — metadata display only";
  }
  if (entry.status === "cloned-only") {
    return "Cloned reference only — no Hermes execution";
  }
  if (entry.status === "placeholder") {
    return "Placeholder — no connection from Hermes";
  }
  if (entry.status === "partial") {
    return "Partial — read-only or advisory metadata only";
  }
  return "Metadata display only — no tool execution from Hermes";
}

function describeFutureHermesUse(entry: ToolRegistryEntry): string {
  const target = entry.targetRuntime?.trim();
  if (target) {
    return target.length > 120 ? `${target.slice(0, 119)}…` : target;
  }
  return "Owner-approved coordinator phase only — not enabled in preview";
}

function buildCategoryPreviews(): AgentOpsHermesToolRegistryCategoryPreview[] {
  return getToolRegistryMainCategories().map((category) => {
    const children = getToolRegistryChildren(category.id);
    const keyTools = children.slice(0, 4).map((child) => child.title);
    const nodeCount = countRegistrySubtree(category.id) - 1;

    return {
      categoryId: category.id,
      title: category.title,
      nodeCount: Math.max(nodeCount, 0),
      directChildCount: category.childrenIds.length,
      statusMix: summarizeChildStatuses(category.childrenIds),
      keyTools,
      hermesRelevance:
        CATEGORY_HERMES_RELEVANCE[category.id] ??
        "Tools Hub category — registry metadata only.",
      safetyStatus: CATEGORY_SAFETY_STATUS,
    };
  });
}

function buildRelevantToolRows(): AgentOpsHermesToolRegistryRelevantTool[] {
  const rows: AgentOpsHermesToolRegistryRelevantTool[] = [];

  for (const id of HERMES_TOOL_REGISTRY_RELEVANT_IDS) {
    const entry = getToolRegistryEntry(id);
    if (!entry) continue;
    const category = entry.categoryId ? getToolRegistryEntry(entry.categoryId) : null;
    rows.push({
      id: entry.id,
      title: entry.title,
      categoryTitle: category?.title ?? "Tools Hub",
      groupTitle: resolveRegistryGroupTitle(entry),
      statusLabel: formatToolRegistryStatus(entry.status),
      installedStatus: entry.installedStatus,
      configuredStatus: entry.configuredStatus,
      currentRuntime: entry.currentRuntime,
      hermesUseToday: describeHermesUseToday(entry),
      futureHermesUse: describeFutureHermesUse(entry),
    });
  }

  return rows;
}

/** A4 read-only Tool Registry preview — sync, no side effects. */
export function buildAgentOpsHermesToolRegistryPreview(): AgentOpsHermesToolRegistryPreview {
  const allEntries = Object.values(AGENTOPS_TOOL_REGISTRY);
  const mainCategories = getToolRegistryMainCategories();

  let existingOrPartialCount = 0;
  let plannedOrNotConnectedCount = 0;

  for (const entry of allEntries) {
    if (EXISTING_OR_PARTIAL.has(entry.status)) existingOrPartialCount += 1;
    if (PLANNED_OR_NOT_CONNECTED.has(entry.status)) plannedOrNotConnectedCount += 1;
  }

  const hermesRelatedNodes = allEntries.filter(isHermesRelatedRegistryNode).length;

  return {
    mode: "preview_only",
    source: TOOL_REGISTRY_SOURCE,
    summary: {
      totalRegistryNodes: allEntries.length,
      mainCategories: mainCategories.length,
      hermesRelatedNodes,
      existingOrPartialCount,
      plannedOrNotConnectedCount,
      executionEnabled: false,
    },
    categories: buildCategoryPreviews(),
    relevantTools: buildRelevantToolRows(),
    safetyBanner:
      "Tool registry context is read-only. Hermes cannot execute, install, configure, or assign tools from this preview.",
  };
}
