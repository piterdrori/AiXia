import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryToolBySlug } from "@/lib/agentops/tools/toolRegistry";

import {
  ToolsHubHermesDetailNotFound,
  ToolsHubHermesGlobalWebsiteMemoryPage,
} from "../../../../hermesDetailViews";

const HERMES_REGISTRY_ID = "mct-hermes";
const HERMES_TOOL_SLUG = "hermes";

export default function AgentOpsToolsHermesGlobalWebsiteMemoryPage() {
  const { categoryId = "", groupId = "", toolId = "" } = useParams();
  const entry = getToolRegistryToolBySlug(categoryId, groupId, toolId);

  usePageTitle("Global Website Memory · Hermes · Tools");

  if (!entry || entry.id !== HERMES_REGISTRY_ID || toolId !== HERMES_TOOL_SLUG) {
    return (
      <ToolsHubHermesDetailNotFound
        categoryId={categoryId}
        groupId={groupId}
        toolSlug={toolId ? `${toolId}/global-website-memory` : "global-website-memory"}
      />
    );
  }

  return <ToolsHubHermesGlobalWebsiteMemoryPage />;
}
