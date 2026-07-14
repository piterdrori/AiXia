/**
 * Shared Council chat session — same persistence as /system/agent-ops/council
 * (agentops_owner_feedback, action: council_chat_message).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AixiaMemoryApprovalStatus, AixiaMessengerMessage } from "@/components/aixia";
import { AixiaBadge, AixiaMemoryApprovalPrompt } from "@/components/aixia";
import { useAgentOpsLlmModelSelection } from "@/hooks/useAgentOpsLlmModelSelection";
import { useAgentOpsLlmProbe } from "@/hooks/useAgentOpsLlmProbe";
import { getAgentOwnerMeta } from "@/components/agentops/owner/agentDisplayMeta";
import {
  activateAllAgentOpsManagedAgents,
  commitAgentOpsMemoryFromChatApproval,
  getAgentOpsAgentMemory,
  getAgentOpsCouncilChatMessages,
  getAgentOpsManagedAgents,
  getAgentOpsOwnerStatus,
  parseAgentCreativeProposal,
  recordAgentOpsCouncilChatMessage,
  recordAgentOpsCreativeProposal,
  runAgentOpsLocalLlmChat,
  type AgentOpsCouncilChatMessage,
  type AgentOpsManagedAgent,
} from "@/lib/agentops";

function managedAgentStatusTone(
  status: AgentOpsManagedAgent["status"],
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "active") return "emerald";
  if (status === "quiet") return "cyan";
  if (status === "needs_memory") return "amber";
  if (status === "blocked" || status === "disabled") return "rose";
  return "neutral";
}

function resolveAgentUsername(agent: AgentOpsManagedAgent): string {
  const slugGuess = agent.agentId.replace(/^aixia\./, "").toLowerCase();
  return getAgentOwnerMeta(slugGuess, {
    username: `@aixia.${slugGuess}`,
    jobTitle: agent.appRole,
  }).username;
}

export type UseAgentOpsCouncilChatOptions = {
  /** When false, skip loading (e.g. owner gate not ready). */
  enabled?: boolean;
  /** How many recent messages to show in compact embeds. */
  recentMessageLimit?: number;
};

export function useAgentOpsCouncilChat(options: UseAgentOpsCouncilChatOptions = {}) {
  const enabled = options.enabled !== false;
  const recentMessageLimit = options.recentMessageLimit ?? 40;

  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [managedAgents, setManagedAgents] = useState<AgentOpsManagedAgent[]>([]);
  const [councilMessages, setCouncilMessages] = useState<AgentOpsCouncilChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatFeedback, setChatFeedback] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [activatingAgents, setActivatingAgents] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [memoryApprovalByMessageId, setMemoryApprovalByMessageId] = useState<
    Record<string, AixiaMemoryApprovalStatus>
  >({});

  const agentsActivatedRef = useRef(false);
  const localLlmStatus = useAgentOpsLlmProbe();
  const {
    selectedModel: selectedLlmModel,
    selectedLabel: selectedLlmLabel,
  } = useAgentOpsLlmModelSelection("council");

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!enabled) return;
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    setError(null);

    const [ownerResult, managedResult, councilChatResult] = await Promise.all([
      getAgentOpsOwnerStatus(),
      getAgentOpsManagedAgents(),
      getAgentOpsCouncilChatMessages(),
    ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setIsOwner(false);
      setError(ownerResult.error ?? "AgentOps Owner access required.");
      setLoading(false);
      return;
    }

    setIsOwner(true);

    if (managedResult.error) {
      setError(managedResult.error);
      setManagedAgents([]);
      setLoading(false);
      return;
    }

    const agents = managedResult.data ?? [];
    setManagedAgents(agents);
    setCouncilMessages(councilChatResult.data ?? []);
    setSelectedParticipantIds((current) =>
      current.length > 0 ? current : agents.map((agent) => agent.agentId),
    );

    if (councilChatResult.error) setError(councilChatResult.error);
    setLoading(false);
  }, [enabled]);

  const ensureAgentsActive = useCallback(
    async (agents: AgentOpsManagedAgent[]) => {
      const inactiveCount = agents.filter((agent) => agent.status !== "active").length;
      if (inactiveCount === 0) return;
      setActivatingAgents(true);
      const result = await activateAllAgentOpsManagedAgents();
      setActivatingAgents(false);
      if (result.error) {
        setChatFeedback(result.error);
        return;
      }
      setChatFeedback(`Activated ${result.data?.activated ?? 0} agents for council runtime.`);
      await loadData({ silent: true });
    },
    [loadData],
  );

  useEffect(() => {
    if (!enabled) return;
    void loadData();
  }, [enabled, loadData]);

  useEffect(() => {
    if (!enabled || loading || managedAgents.length === 0 || agentsActivatedRef.current) return;
    agentsActivatedRef.current = true;
    void ensureAgentsActive(managedAgents);
  }, [enabled, loading, managedAgents, ensureAgentsActive]);

  const handleCouncilSend = useCallback(async () => {
    const message = composerValue.trim();
    if (!message || chatSubmitting) return;
    if (selectedParticipantIds.length === 0) {
      setChatError("Select at least one council agent.");
      return;
    }

    setChatSubmitting(true);
    setChatFeedback(null);
    setChatError(null);

    const piterResult = await recordAgentOpsCouncilChatMessage({
      sender: "piter",
      content: message,
      source: "owner",
      metadata: {
        selectedAgentIds: selectedParticipantIds,
        roomId: "agent-council",
        embeddedSurface: true,
      },
    });
    if (piterResult.error) {
      setChatSubmitting(false);
      setChatError(piterResult.error);
      return;
    }

    const selectedAgents = managedAgents.filter((agent) =>
      selectedParticipantIds.includes(agent.agentId),
    );
    const memoryByAgent = new Map<string, string[]>();
    await Promise.all(
      selectedAgents.map(async (agent) => {
        const memoryResult = await getAgentOpsAgentMemory(agent.agentId);
        memoryByAgent.set(
          agent.agentId,
          (memoryResult.data ?? []).filter((item) => item.active).map((item) => item.memoryText),
        );
      }),
    );

    const llmResult = await runAgentOpsLocalLlmChat({
      chatScope: "council",
      message,
      model: selectedLlmModel,
      councilAgents: selectedAgents.map((agent) => ({
        agentId: agent.agentId,
        displayName: agent.displayName,
        appRole: agent.appRole,
        qaSpecialty: agent.qaSpecialty,
        currentFocus: agent.currentFocus,
        status: agent.status,
        memorySnippets: memoryByAgent.get(agent.agentId) ?? [],
      })),
    });

    for (const agentReply of llmResult.perAgentResponses) {
      const parsed = parseAgentCreativeProposal(agentReply.response);
      if (parsed.proposal && agentReply.agentId) {
        await recordAgentOpsCreativeProposal({
          agentId: agentReply.agentId,
          proposalType: parsed.proposal.proposalType,
          title: parsed.proposal.title,
          summary: parsed.proposal.summary,
          suggestedRoute: parsed.proposal.suggestedRoute,
          confidence: parsed.proposal.confidence,
          chatScope: "council",
          roomId: "agent-council",
        });
      }

      await recordAgentOpsCouncilChatMessage({
        sender: "agent",
        agentId: agentReply.agentId,
        agentName: agentReply.agentName,
        content: parsed.cleanedResponse,
        source: agentReply.source === "local_llm" ? "local_llm_runtime" : "mock_response_layer",
        metadata: {
          requestId: llmResult.requestId,
          memoryIntentDetected: agentReply.memoryIntentDetected,
          role: agentReply.role,
          selectedAgentIds: selectedParticipantIds,
          creativeProposal: parsed.proposal,
          roomId: "agent-council",
        },
      });
    }

    setComposerValue("");
    setChatSubmitting(false);
    if (!llmResult.localLlmCalled) {
      setChatError(
        llmResult.blockers[0] ??
          llmResult.limitations ??
          "Council LLM unavailable — fallback replies may be recorded.",
      );
    }
    setChatFeedback(
      llmResult.localLlmCalled
        ? `Council message sent — ${llmResult.perAgentResponses.length} agent(s) replied.`
        : "Council message sent — fallback replies recorded (LLM unavailable).",
    );
    await loadData({ silent: true });
  }, [
    chatSubmitting,
    composerValue,
    loadData,
    managedAgents,
    selectedLlmModel,
    selectedParticipantIds,
  ]);

  const handleMemoryApproval = useCallback(
    async (messageId: string, agentId: string, content: string, approved: boolean) => {
      setMemoryApprovalByMessageId((current) => ({
        ...current,
        [messageId]: approved ? "saved" : "rejected",
      }));
      const result = await commitAgentOpsMemoryFromChatApproval({
        agentId,
        content,
        chatScope: "council",
        roomId: "agent-council",
        approved,
      });
      if (result.error) {
        setMemoryApprovalByMessageId((current) => ({
          ...current,
          [messageId]: "error",
        }));
        setChatError(result.error);
      }
    },
    [],
  );

  const messengerMessages = useMemo((): AixiaMessengerMessage[] => {
    const recent = councilMessages.slice(-recentMessageLimit);
    return recent.map((entry) => {
      const matchedAgent =
        entry.agentId ? managedAgents.find((agent) => agent.agentId === entry.agentId) : null;
      const memoryIntentDetected = entry.metadata.memoryIntentDetected === true;
      const approvalStatus =
        memoryApprovalByMessageId[entry.id] ?? (memoryIntentDetected ? "pending" : undefined);
      const username = matchedAgent ? resolveAgentUsername(matchedAgent) : null;
      const timestamp = entry.createdAt
        ? new Date(entry.createdAt).toLocaleString()
        : undefined;

      if (entry.sender === "piter") {
        return {
          id: entry.id,
          senderType: "user" as const,
          senderName: "Piter",
          senderRole: timestamp,
          content: entry.content,
        };
      }

      const displayName = entry.agentName ?? matchedAgent?.displayName ?? "Agent";
      const roleLine = matchedAgent
        ? `${matchedAgent.appRole}${matchedAgent.qaSpecialty ? ` · ${matchedAgent.qaSpecialty}` : ""}`
        : undefined;

      return {
        id: entry.id,
        senderType: "agent" as const,
        senderName: displayName,
        senderRole: [username, roleLine, timestamp].filter(Boolean).join(" · ") || undefined,
        avatarInitials:
          displayName
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .slice(0, 2)
            .join("") || "AG",
        badges: matchedAgent ? (
          <AixiaBadge tone={managedAgentStatusTone(matchedAgent.status)}>
            {matchedAgent.status.replaceAll("_", " ")}
          </AixiaBadge>
        ) : undefined,
        content: entry.content,
        skipAutoSpeak:
          entry.source === "mock_response_layer" ||
          /could not reach the staging LLM/i.test(entry.content),
        footer:
          memoryIntentDetected && entry.agentId ? (
            <AixiaMemoryApprovalPrompt
              suggestedMemoryText={entry.content.slice(0, 180)}
              status={approvalStatus ?? "pending"}
              density="inline"
              scope="agent"
              agentName={displayName}
              contextLabel="Council group chat"
              onApprove={() =>
                void handleMemoryApproval(entry.id, entry.agentId!, entry.content, true)
              }
              onReject={() =>
                void handleMemoryApproval(entry.id, entry.agentId!, entry.content, false)
              }
            />
          ) : null,
      };
    });
  }, [
    councilMessages,
    handleMemoryApproval,
    managedAgents,
    memoryApprovalByMessageId,
    recentMessageLimit,
  ]);

  const participants = useMemo(
    () =>
      managedAgents.map((agent) => ({
        agentId: agent.agentId,
        displayName: agent.displayName,
        appRole: agent.appRole,
        qaSpecialty: agent.qaSpecialty,
        status: agent.status.replaceAll("_", " "),
      })),
    [managedAgents],
  );

  const statusText = localLlmStatus.runtimeActive
    ? `Council online · ${selectedLlmLabel} · ${selectedParticipantIds.length} agents selected`
    : "Council online · LLM may use fallback replies";

  return {
    loading,
    error,
    isOwner,
    managedAgents,
    messengerMessages,
    participants,
    composerValue,
    setComposerValue,
    chatSubmitting,
    chatFeedback,
    chatError,
    activatingAgents,
    selectedParticipantIds,
    setSelectedParticipantIds,
    statusText,
    localLlmActive: localLlmStatus.runtimeActive,
    send: handleCouncilSend,
    refresh: loadData,
  };
}
