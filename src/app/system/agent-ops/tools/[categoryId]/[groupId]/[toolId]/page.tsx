import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getToolRegistryToolBySlug,
} from "@/lib/agentops/tools/toolRegistry";

import {
  ToolsHubHermesDetailNotFound,
  ToolsHubHermesDetailPage,
} from "../../../hermesDetailViews";

const HERMES_REGISTRY_ID = "mct-hermes";

export default function AgentOpsToolsToolDetailPage() {
  const { categoryId = "", groupId = "", toolId = "" } = useParams();
  const entry = getToolRegistryToolBySlug(categoryId, groupId, toolId);

  usePageTitle(entry ? `${entry.title} · Tools` : "Tool detail");

  if (!entry) {
    return (
      <ToolsHubHermesDetailNotFound
        categoryId={categoryId}
        groupId={groupId}
        toolSlug={toolId}
      />
    );
  }

  if (entry.id === HERMES_REGISTRY_ID) {
    return <ToolsHubHermesDetailPage registryEntry={entry} />;
  }

  return (
    <ToolsHubHermesDetailNotFound
      categoryId={categoryId}
      groupId={groupId}
      toolSlug={toolId}
    />
  );
}
