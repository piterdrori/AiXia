import { useParams } from "react-router-dom";

import { usePageTitle } from "@/hooks/usePageTitle";
import { getToolRegistryEntry } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubCodeContextUnderstandingPage } from "../../codeContextUnderstandingViews";
import { ToolsHubEvidenceToolsPage } from "../../evidenceToolsViews";
import { ToolsHubMemoryCoordinationToolsPage } from "../../memoryCoordinationToolsViews";
import { ToolsHubPerAgentMemoryHubPage } from "../../perAgentMemoryHubViews";
import { ToolsHubVoiceInputSttPage } from "../../chatVoiceSttToolsView";
import { ToolsHubVoiceOutputTtsPage } from "../../chatVoiceTtsToolsView";
import { ToolsHubDoubaoLlmApiPage } from "../../chatVoiceLlmToolsView";
import { ToolsHubDesignCrewToolPage } from "../../designCrewReferencesViews";
import { ToolsHubReasoningLayerPage } from "../../reasoningLayerViews";
import { ToolsHubGroupPage } from "../../toolsHubViews";

const AGENT_BRAIN_CATEGORY_ID = "agent-brain-memory";
const CHAT_VOICE_CATEGORY_ID = "chat-voice";
const VOICE_INPUT_STT_GROUP_ID = "voice-input-stt";
const VOICE_OUTPUT_TTS_GROUP_ID = "voice-output-tts";
const DOUBAO_LLM_API_GROUP_ID = "doubao-llm-api";
const PER_AGENT_MEMORY_GROUP_ID = "per-agent-memory";
const MEMORY_COORDINATION_GROUP_ID = "memory-coordination-tools";
const CODE_CONTEXT_GROUP_ID = "code-context-understanding";
const EVIDENCE_GROUP_ID = "evidence-tools";
const REASONING_GROUP_ID = "reasoning-layer";
const DESIGN_CREW_CATEGORY_ID = "design-crew-references";

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

  if (categoryId === AGENT_BRAIN_CATEGORY_ID && groupId === MEMORY_COORDINATION_GROUP_ID) {
    return <ToolsHubMemoryCoordinationToolsPage />;
  }

  if (categoryId === AGENT_BRAIN_CATEGORY_ID && groupId === CODE_CONTEXT_GROUP_ID) {
    return <ToolsHubCodeContextUnderstandingPage />;
  }

  if (categoryId === AGENT_BRAIN_CATEGORY_ID && groupId === EVIDENCE_GROUP_ID) {
    return <ToolsHubEvidenceToolsPage />;
  }

  if (categoryId === AGENT_BRAIN_CATEGORY_ID && groupId === REASONING_GROUP_ID) {
    return <ToolsHubReasoningLayerPage />;
  }

  if (categoryId === CHAT_VOICE_CATEGORY_ID && groupId === VOICE_INPUT_STT_GROUP_ID) {
    return <ToolsHubVoiceInputSttPage />;
  }

  if (categoryId === CHAT_VOICE_CATEGORY_ID && groupId === VOICE_OUTPUT_TTS_GROUP_ID) {
    return <ToolsHubVoiceOutputTtsPage />;
  }

  if (categoryId === CHAT_VOICE_CATEGORY_ID && groupId === DOUBAO_LLM_API_GROUP_ID) {
    return <ToolsHubDoubaoLlmApiPage />;
  }

  if (categoryId === DESIGN_CREW_CATEGORY_ID) {
    return <ToolsHubDesignCrewToolPage routeSlug={groupId} />;
  }

  return <ToolsHubGroupPage categoryId={categoryId} groupId={groupId} />;
}
