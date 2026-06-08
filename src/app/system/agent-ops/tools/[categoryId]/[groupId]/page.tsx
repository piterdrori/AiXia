import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryEntry } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubCodeContextUnderstandingPage } from "../../codeContextUnderstandingViews";
import { ToolsHubPerAgentMemoryHubPage } from "../../perAgentMemoryHubViews";
import { ToolsHubGroupPage } from "../../toolsHubViews";

const AGENT_BRAIN_CATEGORY_ID = "agent-brain-memory";
const PER_AGENT_MEMORY_GROUP_ID = "per-agent-memory";
const CODE_CONTEXT_GROUP_ID = "code-context-understanding";

export default function AgentOpsToolsGroupPage() {
  const { categoryId = "", groupId = "" } = useParams();
  const group = getToolRegistryEntry(groupId);
  usePageTitle(
    categoryId === AGENT_BRAIN_CATEGORY_ID && groupId === PER_AGENT_MEMORY_GROUP_ID
      ? "Per-Agent Memory Support · Tools"
      : group
        ? `${group.title} · Tools`
        : "Tools group",
  );

  if (categoryId === AGENT_BRAIN_CATEGORY_ID && groupId === PER_AGENT_MEMORY_GROUP_ID) {
    return <ToolsHubPerAgentMemoryHubPage />;
  }

  if (categoryId === AGENT_BRAIN_CATEGORY_ID && groupId === CODE_CONTEXT_GROUP_ID) {
    return <ToolsHubCodeContextUnderstandingPage />;
  }

  return <ToolsHubGroupPage categoryId={categoryId} groupId={groupId} />;
}
