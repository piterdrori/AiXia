import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryEntry } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubGroupPage } from "../../toolsHubViews";

export default function AgentOpsToolsGroupPage() {
  const { categoryId = "", groupId = "" } = useParams();
  const group = getToolRegistryEntry(groupId);
  usePageTitle(group ? `${group.title} · Tools` : "Tools group");

  return <ToolsHubGroupPage categoryId={categoryId} groupId={groupId} />;
}
