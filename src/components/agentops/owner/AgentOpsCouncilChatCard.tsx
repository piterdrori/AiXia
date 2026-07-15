import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Expand, MessageSquare, RefreshCw } from "lucide-react";

import {
  AixiaButton,
  AixiaInfoBlock,
  AixiaMessengerShell,
  AixiaSection,
} from "@/components/aixia";
import { useAgentOpsCouncilChat } from "@/components/agentops/owner/useAgentOpsCouncilChat";

type AgentOpsCouncilChatCardProps = {
  enabled?: boolean;
};

/**
 * Large stable Council Chat embed for the Agents page.
 * Uses the same persistence/backend as /system/agent-ops/council.
 */
export function AgentOpsCouncilChatCard({ enabled = true }: AgentOpsCouncilChatCardProps) {
  const navigate = useNavigate();
  const chat = useAgentOpsCouncilChat({ enabled, recentMessageLimit: 36 });

  const openFullCouncil = () => navigate("/system/agent-ops/council");

  useEffect(() => {
    if (!chat.chatFeedback) return;
    const timer = window.setTimeout(() => {
      chat.clearChatFeedback();
    }, 6_000);
    return () => window.clearTimeout(timer);
  }, [chat.chatFeedback, chat.clearChatFeedback]);

  const embeddedStatusText = useMemo(() => {
    if (chat.chatError) return chat.chatError;
    if (chat.chatFeedback) return chat.chatFeedback;
    if (chat.activatingAgents) return "Preparing council agents…";
    return chat.statusText;
  }, [
    chat.activatingAgents,
    chat.chatError,
    chat.chatFeedback,
    chat.statusText,
  ]);

  return (
    <AixiaSection
      surface="command"
      title="Council Chat"
      description="Ask all 12 agents for their professional opinions."
      icon={MessageSquare}
      bodyClassName="aixia-section-body--messenger aixia-section-body--council-embed"
      badge={
        <AixiaButton variant="secondary" onClick={openFullCouncil} className="text-xs">
          <Expand className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Open full Council
        </AixiaButton>
      }
    >
      <div className="aixia-council-embed" data-testid="agentops-agents-council-embed">
        {chat.error && !chat.error.toLowerCase().includes("owner access required") ? (
          <AixiaInfoBlock tone="gold" title="Council temporarily unavailable">
            <p className="text-sm text-white/75">{chat.error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AixiaButton variant="secondary" onClick={() => void chat.refresh()}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Retry
              </AixiaButton>
              <AixiaButton variant="secondary" onClick={openFullCouncil}>
                Open full Council
              </AixiaButton>
            </div>
          </AixiaInfoBlock>
        ) : null}

        <AixiaMessengerShell
          roomTitle="Council Chat"
          chatScope="council"
          layoutMode="embedded"
          showParticipantPicker
          testId="agentops-agents-council-messenger"
          messages={chat.messengerMessages}
          composerValue={chat.composerValue}
          onComposerChange={chat.setComposerValue}
          onSend={() => void chat.send()}
          sending={chat.chatSubmitting || chat.loading}
          statusText={embeddedStatusText}
          errorText={chat.chatError}
          emptyTitle="Ask the team"
          emptyDescription="Ask all agents a question — each selected agent replies with their perspective."
          participants={chat.participants}
          selectedParticipantIds={chat.selectedParticipantIds}
          onSelectedParticipantIdsChange={chat.setSelectedParticipantIds}
          showTypingIndicator={chat.chatSubmitting}
          typingLabel="Council agents are thinking…"
        />
      </div>
    </AixiaSection>
  );
}
