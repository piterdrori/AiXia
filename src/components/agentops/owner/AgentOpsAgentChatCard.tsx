import { MessageSquare, RefreshCw } from "lucide-react";

import { AixiaButton, AixiaInfoBlock, AixiaMessengerShell, AixiaSection } from "@/components/aixia";
import {
  useAgentOpsAgentChat,
  type AgentOpsAgentChatIdentity,
} from "@/components/agentops/owner/useAgentOpsAgentChat";

type AgentOpsAgentChatCardProps = {
  enabled?: boolean;
  identity: AgentOpsAgentChatIdentity | null;
};

/**
 * Dedicated individual-agent chat for Agent Detail.
 * Reuses the tracked agent chat persistence + /api/agentops/llm path (same stack as Council).
 */
export function AgentOpsAgentChatCard({ enabled = true, identity }: AgentOpsAgentChatCardProps) {
  const chat = useAgentOpsAgentChat({ enabled, identity });
  const agentName = identity?.displayName ?? "this agent";

  return (
    <AixiaSection
      surface="command"
      title={`Chat with ${agentName}`}
      description="Ask this agent about its work, findings, and recommendations."
      icon={MessageSquare}
      bodyClassName="aixia-section-body--messenger"
    >
      <div className="space-y-3" data-testid="agentops-agent-detail-chat">
        {chat.error ? (
          <AixiaInfoBlock tone="gold" title="Chat temporarily unavailable">
            <p className="text-sm text-white/75">{chat.error}</p>
            <div className="mt-3">
              <AixiaButton variant="secondary" onClick={() => void chat.refresh()}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Retry
              </AixiaButton>
            </div>
          </AixiaInfoBlock>
        ) : null}

        {chat.chatFeedback ? (
          <AixiaInfoBlock tone="cyan" title="Agent chat">
            {chat.chatFeedback}
          </AixiaInfoBlock>
        ) : null}

        <AixiaMessengerShell
          roomTitle={`Chat with ${agentName}`}
          chatScope="individual_agent"
          testId="agentops-agent-detail-messenger"
          messages={chat.messengerMessages}
          composerValue={chat.composerValue}
          onComposerChange={chat.setComposerValue}
          onSend={() => void chat.send()}
          sending={chat.chatSubmitting || chat.loading}
          statusText={chat.statusText}
          errorText={chat.chatError ?? undefined}
          emptyTitle={`Start a conversation with ${agentName}.`}
          emptyDescription="Ask about today's review, findings, or recommendations. History is saved for this agent."
          showTypingIndicator={chat.chatSubmitting}
          typingLabel={`${agentName} is thinking…`}
          className="min-h-[360px] max-h-[640px]"
        />
      </div>
    </AixiaSection>
  );
}
