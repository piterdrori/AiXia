import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getToolRegistryToolBySlug,
} from "@/lib/agentops/tools/toolRegistry";

import {
  ToolsHubClaudeContextFoundationPage,
  ToolsHubCodeGraphFoundationPage,
  ToolsHubUnderstandAnythingFoundationPage,
} from "../../../codeContextUnderstandingViews";
import {
  ToolsHubHermesDetailNotFound,
  ToolsHubHermesDetailPage,
} from "../../../hermesDetailViews";

const HERMES_REGISTRY_ID = "mct-hermes";
const CODEGRAPH_REGISTRY_ID = "ccu-codegraph";
const UNDERSTAND_ANYTHING_REGISTRY_ID = "ccu-understand-anything";
const CLAUDE_CONTEXT_REGISTRY_ID = "ccu-claude-context";

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

  if (entry.id === CODEGRAPH_REGISTRY_ID) {
    return <ToolsHubCodeGraphFoundationPage />;
  }

  if (entry.id === UNDERSTAND_ANYTHING_REGISTRY_ID) {
    return <ToolsHubUnderstandAnythingFoundationPage />;
  }

  if (entry.id === CLAUDE_CONTEXT_REGISTRY_ID) {
    return <ToolsHubClaudeContextFoundationPage />;
  }

  return (
    <ToolsHubHermesDetailNotFound
      categoryId={categoryId}
      groupId={groupId}
      toolSlug={toolId}
    />
  );
}
