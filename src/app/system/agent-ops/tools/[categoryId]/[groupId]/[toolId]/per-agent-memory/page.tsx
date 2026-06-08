import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryToolBySlug } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubHermesDetailNotFound } from "../../../../hermesDetailViews";
import { ToolsHubPerAgentMemoryHubPage } from "../../../../perAgentMemoryHubViews";

const HERMES_REGISTRY_ID = "mct-hermes";
const HERMES_TOOL_SLUG = "hermes";

export default function AgentOpsToolsHermesPerAgentMemoryPage() {
  const { categoryId = "", groupId = "", toolId = "" } = useParams();
  const entry = getToolRegistryToolBySlug(categoryId, groupId, toolId);

  usePageTitle("Per-Agent Memory Support · Hermes · Tools");

  if (!entry || entry.id !== HERMES_REGISTRY_ID || toolId !== HERMES_TOOL_SLUG) {
    return (
      <ToolsHubHermesDetailNotFound
        categoryId={categoryId}
        groupId={groupId}
        toolSlug={toolId ? `${toolId}/per-agent-memory` : "per-agent-memory"}
      />
    );
  }

  const hermesPath = `/system/agent-ops/tools/${categoryId}/${groupId}/${toolId}`;

  return (
    <ToolsHubPerAgentMemoryHubPage parentLabel="Hermes" parentPath={hermesPath} />
  );
}
