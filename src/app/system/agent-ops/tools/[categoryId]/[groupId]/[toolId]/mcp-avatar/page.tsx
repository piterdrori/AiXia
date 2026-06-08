import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryToolBySlug } from "@/lib/agentops/tools/toolRegistry";

import {
  ToolsHubHermesDetailNotFound,
  ToolsHubHermesPlannedLayerPage,
} from "../../../../hermesDetailViews";

const HERMES_REGISTRY_ID = "mct-hermes";
const HERMES_TOOL_SLUG = "hermes";

export default function AgentOpsToolsHermesMcpAvatarPage() {
  const { categoryId = "", groupId = "", toolId = "" } = useParams();
  const entry = getToolRegistryToolBySlug(categoryId, groupId, toolId);

  usePageTitle("MCP / Avatar Task Agent Support · Hermes · Tools");

  if (!entry || entry.id !== HERMES_REGISTRY_ID || toolId !== HERMES_TOOL_SLUG) {
    return (
      <ToolsHubHermesDetailNotFound
        categoryId={categoryId}
        groupId={groupId}
        toolSlug={toolId ? `${toolId}/mcp-avatar` : "mcp-avatar"}
      />
    );
  }

  return <ToolsHubHermesPlannedLayerPage layerId="mcp-avatar" />;
}
