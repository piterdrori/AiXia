import { usePageTitle } from "@/hooks/usePageTitle";

import { ToolsHubMainPage } from "./toolsHubViews";

export default function AgentOpsToolsPage() {
  usePageTitle("AgentOps Tools Hub");
  return <ToolsHubMainPage />;
}
