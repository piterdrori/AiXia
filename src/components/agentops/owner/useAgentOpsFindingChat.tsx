import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AixiaMessengerMessage } from "@/components/aixia/AixiaMessengerConfig";
import {
  getAgentOpsAgentMemory,
  getAgentOpsFindingChatMessages,
  recordAgentOpsAgentChatMessage,
  runAgentOpsLocalLlmChat,
  type AgentOpsAgentChatMessage,
  type AgentOpsAgentMockIntent,
} from "@/lib/agentops";
import {
  buildFindingChatContextPacket,
  buildFindingChatRoomIds,
  comparePromptTexts,
  detectPromptRewriteIntent,
  FINDING_CHAT_QUICK_QUESTIONS,
  FINDING_CHAT_SCOPE,
  parsePromptRewriteProposal,
  type FindingChatContextPacket,
  type PromptRewriteProposal,
} from "@/lib/agentops/findings/findingChatModel";
import type { CanonicalFindingDetailView } from "@/lib/agentops/findings/findingsDetailLoader";
import { useAgentOpsLlmModelSelection } from "@/hooks/useAgentOpsLlmModelSelection";
import { useAgentOpsLlmProbe } from "@/hooks/useAgentOpsLlmProbe";
import type { AgentOpsAgentChatIdentity } from "@/components/agentops/owner/useAgentOpsAgentChat";

export type FindingChatProposalUiState = "open" | "accepted" | "dismissed" | "comparing";

export type UseAgentOpsFindingChatOptions = {
  enabled?: boolean;
  identity: AgentOpsAgentChatIdentity | null;
  detail: CanonicalFindingDetailView | null;
  recentMessageLimit?: number;
};

function resolveProposalFromMessage(
  entry: AgentOpsAgentChatMessage,
): PromptRewriteProposal | null {
  const meta = entry.metadata.promptRewriteProposal;
  if (meta && typeof meta === "object") {
    const raw = meta as Record<string, unknown>;
    const rewritten =
      (typeof raw.rewrittenPrompt === "string" && raw.rewrittenPrompt) ||
      (typeof raw.rewritten_prompt === "string" && raw.rewritten_prompt) ||
      "";
    if (rewritten.trim()) {
      return {
        explanation:
          (typeof raw.explanation === "string" && raw.explanation) || "Proposed prompt rewrite.",
        rewrittenPrompt: rewritten.trim(),
        changesMade: Array.isArray(raw.changesMade)
          ? raw.changesMade.filter((item): item is string => typeof item === "string")
          : Array.isArray(raw.changes_made)
            ? raw.changes_made.filter((item): item is string => typeof item === "string")
            : [],
        safetyNotes: Array.isArray(raw.safetyNotes)
          ? raw.safetyNotes.filter((item): item is string => typeof item === "string")
          : Array.isArray(raw.safety_notes)
            ? raw.safety_notes.filter((item): item is string => typeof item === "string")
            : [],
        validationSteps: Array.isArray(raw.validationSteps)
          ? raw.validationSteps.filter((item): item is string => typeof item === "string")
          : Array.isArray(raw.validation_steps)
            ? raw.validation_steps.filter((item): item is string => typeof item === "string")
            : [],
        safetyHits: Array.isArray(raw.safetyHits)
          ? (raw.safetyHits as PromptRewriteProposal["safetyHits"])
          : [],
        parseSource:
          raw.parseSource === "json_object" || raw.parseSource === "markdown_fenced"
            ? raw.parseSource
            : "json_block",
        rawExcerpt: typeof raw.rawExcerpt === "string" ? raw.rawExcerpt : "",
      };
    }
  }
  if (entry.sender === "agent") {
    return parsePromptRewriteProposal(entry.content);
  }
  return null;
}

function deriveProposalUiState(
  messages: AgentOpsAgentChatMessage[],
  messageId: string,
): FindingChatProposalUiState {
  for (const entry of messages) {
    if (entry.metadata.acceptedProposalMessageId === messageId) return "accepted";
    if (entry.metadata.dismissedProposalMessageId === messageId) return "dismissed";
  }
  return "open";
}

export function useAgentOpsFindingChat(options: UseAgentOpsFindingChatOptions) {
  const enabled =
    options.enabled !== false && Boolean(options.identity?.agentId) && Boolean(options.detail);
  const identity = options.identity;
  const detail = options.detail;
  const recentMessageLimit = options.recentMessageLimit ?? 100;

  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentOpsAgentChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatFeedback, setChatFeedback] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [proposalUiByMessageId, setProposalUiByMessageId] = useState<
    Record<string, FindingChatProposalUiState>
  >({});
  const [compareMessageId, setCompareMessageId] = useState<string | null>(null);

  const pendingOwnerContentRef = useRef<string | null>(null);
  const localLlmStatus = useAgentOpsLlmProbe();
  const { selectedModel: selectedLlmModel } = useAgentOpsLlmModelSelection("issue");

  const contextPacket = useMemo((): FindingChatContextPacket | null => {
    if (!detail || !identity?.agentId) return null;
    const whyItMatters = detail.whyItMatters.map((row) => `${row.label}: ${row.text}`).join(" · ");
    return buildFindingChatContextPacket({
      issueCode: detail.issueCode,
      findingId: detail.findingId,
      draftId: detail.draftId,
      title: detail.title,
      typeLabel: detail.typeLabel,
      statusLabel: detail.ownerStatusLabel,
      explanation: detail.explanationDisplay,
      whyItMatters,
      evidenceSummary: detail.evidenceSummary,
      observedBehavior: detail.actualResult,
      expectedBehavior: detail.expectedResult,
      route: detail.route,
      module: detail.module,
      reportingAgentId: identity.agentId,
      reportingAgentName: identity.displayName,
      reportingAgentRole: identity.jobTitle,
      supportingAgents: detail.supportingAgentSlugs,
      suggestedSolution: detail.suggestedSolution,
      activePrompt: detail.promptText,
      originalPrompt: detail.originalPrompt,
      promptSafetyHits: detail.promptSafetyHits,
      ownerQuestion: composerValue,
    });
  }, [composerValue, detail, identity]);

  const roomIds = useMemo(() => {
    if (!identity?.agentId || !detail) return [];
    return buildFindingChatRoomIds({
      issueCode: detail.issueCode,
      findingId: detail.findingId,
      draftId: detail.draftId,
      agentId: identity.agentId,
    }).allRoomIds;
  }, [detail, identity?.agentId]);

  const loadData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled || !identity?.agentId || roomIds.length === 0) {
        setLoading(false);
        return;
      }
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      setError(null);

      const result = await getAgentOpsFindingChatMessages({
        agentId: identity.agentId,
        roomIds,
      });
      if (result.error) {
        setError(result.error);
        setMessages([]);
        setLoading(false);
        return;
      }
      setMessages(result.data ?? []);
      setLoading(false);
    },
    [enabled, identity?.agentId, roomIds],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      if (!identity?.agentId || !detail || !contextPacket) return;
      const message = rawMessage.trim();
      if (!message || chatSubmitting) return;

      setChatSubmitting(true);
      setChatFeedback(null);
      setChatError(null);
      setLastFailedMessage(null);
      pendingOwnerContentRef.current = message;

      const roomMeta = {
        roomId: contextPacket.roomId,
        threadAliases: contextPacket.aliasRoomIds,
        chatScope: FINDING_CHAT_SCOPE,
        canonicalFindingKey: contextPacket.canonicalFindingKey,
        issueCode: contextPacket.issueCode,
        findingId: contextPacket.findingId,
        draftId: contextPacket.draftId,
        displayName: identity.displayName,
        username: identity.username,
        stagingOnly: true,
        doesNotMutateLifecycle: true,
      };

      const ownerWrite = await recordAgentOpsAgentChatMessage({
        agentId: identity.agentId,
        sender: "piter",
        content: message,
        source: "owner",
        metadata: roomMeta,
      });
      if (ownerWrite.error) {
        setChatSubmitting(false);
        setChatError(ownerWrite.error);
        setLastFailedMessage(message);
        return;
      }

      setComposerValue("");
      await loadData({ silent: true });

      const memoryResult = await getAgentOpsAgentMemory(identity.agentId);
      const memorySnippets = (memoryResult.data ?? [])
        .filter((item) => item.active)
        .map((item) => item.memoryText)
        .slice(0, 8);

      const wantsRewrite = detectPromptRewriteIntent(message);
      const intent: AgentOpsAgentMockIntent = wantsRewrite
        ? "prompt_improvement"
        : /\brisk\b/i.test(message)
          ? "risk_review"
          : "clarification";

      let llmResult: Awaited<ReturnType<typeof runAgentOpsLocalLlmChat>>;
      try {
        llmResult = await runAgentOpsLocalLlmChat({
          chatScope: "issue",
          message,
          model: selectedLlmModel,
          selectedAgentId: identity.agentId,
          issueCode: contextPacket.issueCode ?? contextPacket.draftId ?? contextPacket.findingId,
          intent,
          issueContext: {
            title: contextPacket.title,
            summary: contextPacket.explanation,
            evidence: contextPacket.evidenceSummary,
            fixPlan: contextPacket.suggestedSolution,
            cursorPrompt: contextPacket.activePrompt,
            originalPrompt: contextPacket.originalPrompt,
            executionState: "discussion_only_no_execution",
            route: contextPacket.route,
            module: contextPacket.module,
            category: contextPacket.type,
            statusLabel: contextPacket.status,
            typeLabel: contextPacket.type,
            whyItMatters: contextPacket.whyItMatters,
            observedBehavior: contextPacket.observedBehavior,
            expectedBehavior: contextPacket.expectedBehavior,
            reportingAgent: identity.displayName,
            reportingAgentRole: identity.jobTitle,
            supportingAgents: contextPacket.supportingAgents,
            promptSafetyWarnings: contextPacket.promptSafetyWarnings,
            includePromptRewriteContract: wantsRewrite,
            agentMemory: memorySnippets,
            recommendedFixStrategy: detail.suggestedSolution,
            likelyRootCause: detail.likelyRootCause,
          },
          agentContext: {
            agentId: identity.agentId,
            displayName: identity.displayName,
            appRole: identity.jobTitle,
            qaSpecialty: identity.qaSpecialty ?? identity.jobTitle,
            currentFocus: `Finding discussion · ${contextPacket.title}`,
            memorySnippets,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const timedOut = /abort|timeout|timed out/i.test(msg);
        setChatSubmitting(false);
        setChatError(
          timedOut
            ? "The agent did not respond in time."
            : msg || "The agent did not respond.",
        );
        setLastFailedMessage(message);
        pendingOwnerContentRef.current = null;
        return;
      }

      const timedOut =
        llmResult.blockers.some((item) => /abort|timeout|timed out/i.test(item)) ||
        /abort|timeout|timed out/i.test(llmResult.limitations ?? "");

      const agentReply =
        llmResult.response?.trim() ||
        (llmResult.shouldFallbackToMock
          ? `${identity.displayName}: I could not reach the staging LLM just now. Ask again shortly.`
          : null);

      if (!agentReply) {
        setChatSubmitting(false);
        setChatError(
          timedOut
            ? "The agent did not respond in time."
            : llmResult.blockers[0] ?? "The agent did not respond.",
        );
        setLastFailedMessage(message);
        pendingOwnerContentRef.current = null;
        return;
      }

      const proposal = parsePromptRewriteProposal(agentReply);
      const displayContent =
        proposal != null
          ? proposal.explanation || "Proposed a rewritten suggested fix prompt."
          : agentReply;

      await recordAgentOpsAgentChatMessage({
        agentId: identity.agentId,
        sender: "agent",
        content: displayContent,
        source: llmResult.localLlmCalled ? "local_llm_runtime" : "mock_response_layer",
        metadata: {
          ...roomMeta,
          requestId: llmResult.requestId,
          fullAgentReply: agentReply,
          promptRewriteProposal: proposal
            ? {
                explanation: proposal.explanation,
                rewrittenPrompt: proposal.rewrittenPrompt,
                changesMade: proposal.changesMade,
                safetyNotes: proposal.safetyNotes,
                validationSteps: proposal.validationSteps,
                safetyHits: proposal.safetyHits,
                parseSource: proposal.parseSource,
                rawExcerpt: proposal.rawExcerpt,
              }
            : null,
        },
      });

      setChatSubmitting(false);
      pendingOwnerContentRef.current = null;

      if (timedOut) {
        setChatError("The agent did not respond in time.");
        setLastFailedMessage(message);
      } else if (!llmResult.localLlmCalled) {
        setChatError(
          llmResult.blockers[0] ??
            llmResult.limitations ??
            "Agent LLM unavailable — a fallback reply may have been recorded.",
        );
      }
      setChatFeedback(
        llmResult.localLlmCalled
          ? `${identity.displayName} replied about this finding.`
          : "Message sent — fallback reply recorded (LLM unavailable).",
      );
      await loadData({ silent: true });
    },
    [chatSubmitting, contextPacket, detail, identity, loadData, selectedLlmModel],
  );

  const handleSend = useCallback(async () => {
    await sendMessage(composerValue);
  }, [composerValue, sendMessage]);

  const handleRetry = useCallback(async () => {
    const retry = lastFailedMessage ?? pendingOwnerContentRef.current;
    if (!retry) return;
    setComposerValue(retry);
    await sendMessage(retry);
  }, [lastFailedMessage, sendMessage]);

  const handleQuickQuestion = useCallback(
    (message: string, mode: "insert" | "send" = "send") => {
      if (mode === "insert") {
        setComposerValue(message);
        return;
      }
      void sendMessage(message);
    },
    [sendMessage],
  );

  const markProposal = useCallback(
    async (
      messageId: string,
      kind: "accepted" | "dismissed",
      note: string,
    ) => {
      if (!identity?.agentId || !contextPacket) return;
      setProposalUiByMessageId((current) => ({ ...current, [messageId]: kind }));
      await recordAgentOpsAgentChatMessage({
        agentId: identity.agentId,
        sender: "piter",
        content: note,
        source: "owner",
        metadata: {
          roomId: contextPacket.roomId,
          threadAliases: contextPacket.aliasRoomIds,
          chatScope: FINDING_CHAT_SCOPE,
          canonicalFindingKey: contextPacket.canonicalFindingKey,
          stagingOnly: true,
          doesNotMutateLifecycle: true,
          ...(kind === "accepted"
            ? { acceptedProposalMessageId: messageId }
            : { dismissedProposalMessageId: messageId }),
        },
      });
      await loadData({ silent: true });
    },
    [contextPacket, identity?.agentId, loadData],
  );

  const messengerMessages = useMemo((): AixiaMessengerMessage[] => {
    if (!identity) return [];
    const recent = messages.slice(-recentMessageLimit);
    return recent.map((entry) => {
      const timestamp = entry.createdAt
        ? new Date(entry.createdAt).toLocaleString()
        : undefined;
      const proposal = resolveProposalFromMessage(entry);
      const derived = deriveProposalUiState(messages, entry.id);
      const uiState = proposalUiByMessageId[entry.id] ?? derived;

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
        badges: proposal ? (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-200">
            Prompt rewrite
          </span>
        ) : null,
        // Footer rendered by card via proposal map — keep message clean here.
        footer: proposal
          ? (
              <span className="sr-only" data-proposal-state={uiState}>
                Proposed prompt rewrite available
              </span>
            )
          : null,
      };
    });
  }, [identity, messages, proposalUiByMessageId, recentMessageLimit]);

  const proposalsByMessageId = useMemo(() => {
    const map: Record<
      string,
      { proposal: PromptRewriteProposal; uiState: FindingChatProposalUiState }
    > = {};
    for (const entry of messages) {
      const proposal = resolveProposalFromMessage(entry);
      if (!proposal) continue;
      map[entry.id] = {
        proposal,
        uiState: proposalUiByMessageId[entry.id] ?? deriveProposalUiState(messages, entry.id),
      };
    }
    return map;
  }, [messages, proposalUiByMessageId]);

  const compareView = useMemo(() => {
    if (!compareMessageId || !detail) return null;
    const entry = proposalsByMessageId[compareMessageId];
    if (!entry) return null;
    return comparePromptTexts(detail.promptText ?? "", entry.proposal.rewrittenPrompt);
  }, [compareMessageId, detail, proposalsByMessageId]);

  const statusText = useMemo(() => {
    const llmLine = localLlmStatus.runtimeActive
      ? "Finding chat online · staging LLM"
      : "Finding chat online · LLM may use fallback replies";
    const parts = [
      llmLine,
      detail ? `Lifecycle: ${detail.ownerStatusLabel}` : null,
      identity ? identity.displayName : null,
      chatFeedback,
    ].filter(Boolean);
    return parts.join(" · ") || undefined;
  }, [chatFeedback, detail, identity, localLlmStatus.runtimeActive]);

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
    contextPacket,
    quickQuestions: FINDING_CHAT_QUICK_QUESTIONS,
    proposalsByMessageId,
    compareMessageId,
    setCompareMessageId,
    compareView,
    send: handleSend,
    sendMessage,
    retry: handleRetry,
    canRetry: Boolean(lastFailedMessage),
    handleQuickQuestion,
    markProposalAccepted: (messageId: string) =>
      markProposal(messageId, "accepted", "Accepted prompt rewrite into the editor (not saved yet)."),
    markProposalDismissed: (messageId: string) =>
      markProposal(messageId, "dismissed", "Dismissed prompt rewrite proposal."),
    setProposalComparing: (messageId: string | null) => {
      setCompareMessageId(messageId);
      if (messageId) {
        setProposalUiByMessageId((current) => ({ ...current, [messageId]: "comparing" }));
      }
    },
    refresh: loadData,
  };
}
