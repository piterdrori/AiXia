import { useCallback, useEffect, useMemo, useState } from "react";

import type { AixiaMemoryApprovalStatus } from "@/components/aixia";
import type { AixiaMessengerMessage } from "@/components/aixia/AixiaMessengerConfig";
import { AixiaMemoryApprovalPrompt } from "@/components/aixia";
import {
  commitAgentOpsMemoryFromChatApproval,
  getAgentOpsAgentChatMessages,
  getAgentOpsAgentMemory,
  recordAgentOpsAgentChatMessage,
  runAgentOpsLocalLlmChat,
  type AgentOpsAgentChatMessage,
} from "@/lib/agentops";
import { useAgentOpsLlmModelSelection } from "@/hooks/useAgentOpsLlmModelSelection";
import { useAgentOpsLlmProbe } from "@/hooks/useAgentOpsLlmProbe";

export type AgentOpsAgentChatIdentity = {
  /** Managed / runtime agent id used for persistence + LLM. */
  agentId: string;
  displayName: string;
  username: string;
  jobTitle: string;
  responsibility: string;
  statusLabel: string;
  qaSpecialty?: string | null;
  currentFocus?: string | null;
  /** Extra staging context for the system prompt (findings / today). */
  contextNotes?: string[];
};

export type UseAgentOpsAgentChatOptions = {
  enabled?: boolean;
  identity: AgentOpsAgentChatIdentity | null;
  recentMessageLimit?: number;
};

export function useAgentOpsAgentChat(options: UseAgentOpsAgentChatOptions) {
  const enabled = options.enabled !== false && Boolean(options.identity?.agentId);
  const identity = options.identity;
  const recentMessageLimit = options.recentMessageLimit ?? 80;

  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentOpsAgentChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatFeedback, setChatFeedback] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [memoryApprovalByMessageId, setMemoryApprovalByMessageId] = useState<
    Record<string, AixiaMemoryApprovalStatus>
  >({});

  const localLlmStatus = useAgentOpsLlmProbe();
  const { selectedModel: selectedLlmModel } = useAgentOpsLlmModelSelection("individual_agent");

  const loadData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled || !identity?.agentId) {
        setLoading(false);
        return;
      }
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      setError(null);

      const result = await getAgentOpsAgentChatMessages(identity.agentId);
      if (result.error) {
        setError(result.error);
        setMessages([]);
        setLoading(false);
        return;
      }
      setMessages(result.data ?? []);
      setLoading(false);
    },
    [enabled, identity?.agentId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSend = useCallback(async () => {
    if (!identity?.agentId) return;
    const message = composerValue.trim();
    if (!message || chatSubmitting) return;

    setChatSubmitting(true);
    setChatFeedback(null);
    setChatError(null);

    const ownerWrite = await recordAgentOpsAgentChatMessage({
      agentId: identity.agentId,
      sender: "piter",
      content: message,
      source: "owner",
      metadata: {
        roomId: `agent-chat:${identity.agentId}`,
        displayName: identity.displayName,
        username: identity.username,
        stagingOnly: true,
      },
    });
    if (ownerWrite.error) {
      setChatSubmitting(false);
      setChatError(ownerWrite.error);
      return;
    }

    const memoryResult = await getAgentOpsAgentMemory(identity.agentId);
    const { selectApprovedAgentMemoryForPrompt } = await import(
      "@/lib/agentops/agents/agentHermesMemoryModel"
    );
    // D-F1: approved active only — never pending drafts or diagnostics.
    const memorySnippets = selectApprovedAgentMemoryForPrompt(memoryResult.data ?? [], 8);

    const contextNotes = (identity.contextNotes ?? []).filter(Boolean).slice(0, 6);
    const focusParts = [
      identity.responsibility,
      `Status: ${identity.statusLabel}`,
      identity.currentFocus,
      ...contextNotes,
      "Environment: staging only. Respond only from this agent's job perspective.",
    ].filter(Boolean);

    const llmResult = await runAgentOpsLocalLlmChat({
      chatScope: "individual_agent",
      message,
      model: selectedLlmModel,
      selectedAgentId: identity.agentId,
      agentContext: {
        agentId: identity.agentId,
        displayName: identity.displayName,
        appRole: identity.jobTitle,
        qaSpecialty: identity.qaSpecialty ?? identity.jobTitle,
        currentFocus: focusParts.join(" · "),
        memorySnippets,
      },
    });

    const agentReply =
      llmResult.response?.trim() ||
      (llmResult.shouldFallbackToMock
        ? `${identity.displayName}: I could not reach the staging LLM just now. Ask again shortly, or check Monitoring if the runtime is down.`
        : null);

    if (agentReply) {
      await recordAgentOpsAgentChatMessage({
        agentId: identity.agentId,
        sender: "agent",
        content: agentReply,
        source: llmResult.localLlmCalled ? "local_llm_runtime" : "mock_response_layer",
        metadata: {
          roomId: `agent-chat:${identity.agentId}`,
          requestId: llmResult.requestId,
          memoryIntentDetected: llmResult.memoryIntentDetected,
          displayName: identity.displayName,
          username: identity.username,
          stagingOnly: true,
        },
      });
    }

    setComposerValue("");
    setChatSubmitting(false);

    if (!llmResult.localLlmCalled) {
      setChatError(
        llmResult.blockers[0] ??
          llmResult.limitations ??
          "Agent LLM unavailable — a fallback reply may have been recorded.",
      );
    }
    setChatFeedback(
      llmResult.localLlmCalled
        ? `${identity.displayName} replied.`
        : "Message sent — fallback reply recorded (LLM unavailable).",
    );
    await loadData({ silent: true });
  }, [chatSubmitting, composerValue, identity, loadData, selectedLlmModel]);

  const handleMemoryApproval = useCallback(
    async (messageId: string, agentId: string, content: string, approved: boolean) => {
      setMemoryApprovalByMessageId((current) => ({
        ...current,
        [messageId]: approved ? "saved" : "rejected",
      }));
      const result = await commitAgentOpsMemoryFromChatApproval({
        agentId,
        content,
        chatScope: "individual_agent",
        roomId: `agent-chat:${agentId}`,
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
    if (!identity) return [];
    const recent = messages.slice(-recentMessageLimit);
    return recent.map((entry) => {
      const memoryIntentDetected = entry.metadata.memoryIntentDetected === true;
      const approvalStatus =
        memoryApprovalByMessageId[entry.id] ?? (memoryIntentDetected ? "pending" : undefined);
      const timestamp = entry.createdAt
        ? new Date(entry.createdAt).toLocaleString()
        : undefined;

      if (entry.sender === "piter") {
        return {
          id: entry.id,
          senderType: "user" as const,
          senderName: "You",
          senderRole: timestamp,
          content: entry.content,
        };
      }

      return {
        id: entry.id,
        senderType: "agent" as const,
        senderName: identity.displayName,
        senderRole: [identity.username, identity.jobTitle, timestamp].filter(Boolean).join(" · "),
        avatarInitials:
          identity.displayName
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .slice(0, 2)
            .join("") || "AG",
        content: entry.content,
        skipAutoSpeak:
          entry.source === "mock_response_layer" ||
          /could not reach the staging LLM/i.test(entry.content),
        footer:
          memoryIntentDetected ? (
            <AixiaMemoryApprovalPrompt
              suggestedMemoryText={entry.content.slice(0, 180)}
              status={approvalStatus ?? "pending"}
              density="inline"
              scope="agent"
              agentName={identity.displayName}
              contextLabel={`Chat with ${identity.displayName}`}
              onApprove={() =>
                void handleMemoryApproval(entry.id, identity.agentId, entry.content, true)
              }
              onReject={() =>
                void handleMemoryApproval(entry.id, identity.agentId, entry.content, false)
              }
            />
          ) : null,
      };
    });
  }, [handleMemoryApproval, identity, memoryApprovalByMessageId, messages, recentMessageLimit]);

  const statusText = useMemo(() => {
    const llmLine = localLlmStatus.runtimeActive
      ? "Agent chat online · staging LLM"
      : "Agent chat online · LLM may use fallback replies";
    const parts = [
      llmLine,
      identity ? `${identity.displayName} · ${identity.statusLabel}` : null,
      chatFeedback,
    ].filter(Boolean);
    return parts.join(" · ") || undefined;
  }, [chatFeedback, identity, localLlmStatus.runtimeActive]);

  return {
    loading,
    error,
    messages,
    messengerMessages,
    composerValue,
    setComposerValue,
    chatSubmitting,
    chatError,
    chatFeedback,
    statusText,
    send: handleSend,
    refresh: loadData,
  };
}
