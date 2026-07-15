import { useEffect, useMemo } from "react";
import { RefreshCw } from "lucide-react";

import { AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import { AgentOpsCouncilWorkspace } from "@/components/agentops/owner/AgentOpsCouncilWorkspace";
import { useAgentOpsCouncilChat } from "@/components/agentops/owner/useAgentOpsCouncilChat";

type AgentOpsCouncilChatCardProps = {
  enabled?: boolean;
};

/**
 * Phase A.3 — single Council workspace surface (no nested AixiaSection chrome).
 * Soft-scrolls the fixed composer into the browser viewport once after mount when
 * Team status above the embed would otherwise leave the dock below the fold.
 */
export function AgentOpsCouncilChatCard({ enabled = true }: AgentOpsCouncilChatCardProps) {
  const chat = useAgentOpsCouncilChat({ enabled, recentMessageLimit: 80 });

  useEffect(() => {
    if (!chat.chatFeedback) return;
    const timer = window.setTimeout(() => {
      chat.clearChatFeedback();
    }, 6_000);
    return () => window.clearTimeout(timer);
  }, [chat.chatFeedback, chat.clearChatFeedback]);

  useEffect(() => {
    if (!enabled || chat.loading) return;
    const timer = window.setTimeout(() => {
      const dock = document.querySelector(
        '[data-testid="agentops-agents-council-messenger"] [data-testid="agentops-messenger-dock"]',
      );
      if (!(dock instanceof HTMLElement)) return;
      const rect = dock.getBoundingClientRect();
      if (rect.bottom <= window.innerHeight - 8 && rect.top >= 0) return;
      dock.scrollIntoView({ block: "end", behavior: "smooth" });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [chat.loading, enabled]);

  const embeddedStatusText = useMemo(() => {
    if (chat.chatError) return chat.chatError;
    if (chat.chatFeedback) return chat.chatFeedback;
    if (chat.activatingAgents) return "Preparing council agents…";
    return chat.statusText;
  }, [chat.activatingAgents, chat.chatError, chat.chatFeedback, chat.statusText]);

  return (
    <div className="aixia-council-embed" data-testid="agentops-agents-council-embed">
      {chat.error && !chat.error.toLowerCase().includes("owner access required") ? (
        <AixiaInfoBlock tone="gold" title="Council temporarily unavailable">
          <p className="text-sm text-white/75">{chat.error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AixiaButton variant="secondary" onClick={() => void chat.refresh()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Retry
            </AixiaButton>
          </div>
        </AixiaInfoBlock>
      ) : null}

      <AgentOpsCouncilWorkspace
        density="embedded"
        testId="agentops-agents-council-messenger"
        turns={chat.turns}
        latestTurn={chat.latestTurn}
        inFlightQuestion={chat.inFlightQuestion}
        rosterMode={chat.rosterMode}
        onRosterModeChange={chat.setRosterMode}
        participants={chat.participants}
        selectedParticipantIds={chat.selectedParticipantIds}
        onSelectedParticipantIdsChange={chat.setSelectedParticipantIds}
        composerValue={chat.composerValue}
        onComposerChange={chat.setComposerValue}
        onSend={() => void chat.send()}
        sending={chat.chatSubmitting}
        statusText={embeddedStatusText}
        errorText={chat.chatError}
      />
    </div>
  );
}
