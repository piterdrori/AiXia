import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryCategoryBySlug } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubCategoryPage } from "../toolsHubViews";

export default function AgentOpsToolsCategoryPage() {
  const { categoryId = "" } = useParams();
  const category = getToolRegistryCategoryBySlug(categoryId);
  usePageTitle(category ? `${category.title} · Tools` : "Tools category");

  return <ToolsHubCategoryPage categoryId={categoryId} />;
}
