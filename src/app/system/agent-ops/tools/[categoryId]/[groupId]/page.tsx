import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryEntry } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubPerAgentMemoryHubPage } from "../../perAgentMemoryHubViews";
import { ToolsHubGroupPage } from "../../toolsHubViews";

const AGENT_BRAIN_CATEGORY_ID = "agent-brain-memory";
const PER_AGENT_MEMORY_GROUP_ID = "per-agent-memory";

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

  return <ToolsHubGroupPage categoryId={categoryId} groupId={groupId} />;
}
