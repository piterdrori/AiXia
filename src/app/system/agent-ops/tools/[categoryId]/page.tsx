import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryCategoryBySlug } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubChatVoicePage } from "../chatVoiceToolsViews";
import { ToolsHubDesignCrewReferencesPage } from "../designCrewReferencesViews";
import { ToolsHubCategoryPage } from "../toolsHubViews";

const CHAT_VOICE_CATEGORY_ID = "chat-voice";
const DESIGN_CREW_CATEGORY_ID = "design-crew-references";

export default function AgentOpsToolsCategoryPage() {
  const { categoryId = "" } = useParams();
  const category = getToolRegistryCategoryBySlug(categoryId);
  usePageTitle(category ? `${category.title} · Tools` : "Tools category");

  if (categoryId === CHAT_VOICE_CATEGORY_ID) {
    return <ToolsHubChatVoicePage />;
  }

  if (categoryId === DESIGN_CREW_CATEGORY_ID) {
    return <ToolsHubDesignCrewReferencesPage />;
  }

  return <ToolsHubCategoryPage categoryId={categoryId} />;
}
