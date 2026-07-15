import { AgentOpsAgentChatCard } from "@/components/agentops/owner/AgentOpsAgentChatCard";
import type { AgentOpsAgentChatIdentity } from "@/components/agentops/owner/useAgentOpsAgentChat";

type AgentChatWorkspaceProps = {
  enabled: boolean;
  identity: AgentOpsAgentChatIdentity | null;
};

/** Primary chat surface — preserves history, Doubao TTS/STT, draft stability. */
export function AgentChatWorkspace({ enabled, identity }: AgentChatWorkspaceProps) {
  return (
    <div data-testid="agentops-agent-chat-workspace">
      <AgentOpsAgentChatCard enabled={enabled} identity={identity} />
    </div>
  );
}
