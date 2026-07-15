/**
 * Shared Council chat session — same persistence as /system/agent-ops/council
 * (agentops_owner_feedback, action: council_chat_message).
 *
 * Phase A.2: turn view-model + canonical/custom roster modes (UI selection only;
 * fan-out still uses runAgentOpsLocalLlmChat).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AixiaMemoryApprovalStatus } from "@/components/aixia";
import type { CouncilRosterMode } from "@/components/agentops/owner/AgentOpsCouncilWorkspace";
import { useAgentOpsLlmModelSelection } from "@/hooks/useAgentOpsLlmModelSelection";
import { useAgentOpsLlmProbe } from "@/hooks/useAgentOpsLlmProbe";
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
import {
  getAgentHumanRole,
  getAgentResponsibilitySummary,
  getAgentCurrentFocus,
} from "@/lib/agentops/agents/productAgentDisplay";
import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import {
  buildCouncilTurns,
  latestCouncilTurn,
  type CouncilTurnView,
} from "@/lib/agentops/council/councilTurnModel";

export type UseAgentOpsCouncilChatOptions = {
  enabled?: boolean;
  recentMessageLimit?: number;
};

const COUNCIL_DRAFT_STORAGE_KEY = "agentops.council.draft.agent-council";
const COUNCIL_ROSTER_MODE_KEY = "agentops.council.roster-mode";

function readCouncilDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(COUNCIL_DRAFT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeCouncilDraft(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!value.trim()) {
      window.localStorage.removeItem(COUNCIL_DRAFT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(COUNCIL_DRAFT_STORAGE_KEY, value);
  } catch {
    // ignore quota / private mode
  }
}

function readRosterMode(): CouncilRosterMode {
  if (typeof window === "undefined") return "canonical";
  try {
    const value = window.localStorage.getItem(COUNCIL_ROSTER_MODE_KEY);
    return value === "custom" ? "custom" : "canonical";
  } catch {
    return "canonical";
  }
}

function writeRosterMode(mode: CouncilRosterMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COUNCIL_ROSTER_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

function canonicalParticipantIds(): string[] {
  return CANONICAL_AGENTS.map((agent) => agent.id);
}

function mapCanonicalParticipants() {
  return CANONICAL_AGENTS.map((agent) => ({
    agentId: agent.id,
    displayName: agent.name,
    appRole: getAgentHumanRole(agent.id, agent.name),
    qaSpecialty: getAgentResponsibilitySummary(agent.id),
    status: "active",
  }));
}

function mapManagedParticipants(agents: AgentOpsManagedAgent[]) {
  return agents.map((agent) => ({
    agentId: agent.agentId,
    displayName: agent.displayName,
    appRole: agent.appRole,
    qaSpecialty: agent.qaSpecialty,
    status: agent.status.replaceAll("_", " "),
  }));
}

export function useAgentOpsCouncilChat(options: UseAgentOpsCouncilChatOptions = {}) {
  const enabled = options.enabled !== false;
  const recentMessageLimit = options.recentMessageLimit ?? 80;

  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [managedAgents, setManagedAgents] = useState<AgentOpsManagedAgent[]>([]);
  const [councilMessages, setCouncilMessages] = useState<AgentOpsCouncilChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState(() => readCouncilDraft());
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [inFlightQuestion, setInFlightQuestion] = useState<string | null>(null);
  const [chatFeedback, setChatFeedback] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [activatingAgents, setActivatingAgents] = useState(false);
  const [rosterMode, setRosterModeState] = useState<CouncilRosterMode>(() => readRosterMode());
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(() =>
    readRosterMode() === "custom" ? [] : canonicalParticipantIds(),
  );
  const [memoryApprovalByMessageId, setMemoryApprovalByMessageId] = useState<
    Record<string, AixiaMemoryApprovalStatus>
  >({});

  const agentsActivatedRef = useRef(false);
  const localLlmStatus = useAgentOpsLlmProbe();
  const {
    selectedModel: selectedLlmModel,
    selectedLabel: selectedLlmLabel,
  } = useAgentOpsLlmModelSelection("council");

  const setRosterMode = useCallback((mode: CouncilRosterMode) => {
    setRosterModeState(mode);
    writeRosterMode(mode);
    if (mode === "canonical") {
      setSelectedParticipantIds(canonicalParticipantIds());
    } else {
      setSelectedParticipantIds((current) => {
        if (current.length > 0 && !current[0]?.includes("-agent")) {
          return current;
        }
        return managedAgents.map((agent) => agent.agentId);
      });
    }
  }, [managedAgents]);

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
    setSelectedParticipantIds((current) => {
      if (current.length > 0) return current;
      return rosterMode === "canonical"
        ? canonicalParticipantIds()
        : agents.map((agent) => agent.agentId);
    });

    if (councilChatResult.error) setError(councilChatResult.error);
    setLoading(false);
  }, [enabled, rosterMode]);

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
    writeCouncilDraft(composerValue);
  }, [composerValue]);

  useEffect(() => {
    if (!enabled || loading || managedAgents.length === 0 || agentsActivatedRef.current) return;
    // Custom roster still depends on managed synthetic activation; canonical mode does not.
    if (rosterMode !== "custom") return;
    agentsActivatedRef.current = true;
    void ensureAgentsActive(managedAgents);
  }, [enabled, loading, managedAgents, ensureAgentsActive, rosterMode]);

  const handleCouncilSend = useCallback(async () => {
    const message = composerValue.trim();
    if (!message || chatSubmitting) return;
    if (selectedParticipantIds.length === 0) {
      setChatError("Select at least one council agent.");
      return;
    }

    setChatSubmitting(true);
    setInFlightQuestion(message);
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
        rosterMode,
      },
    });
    if (piterResult.error) {
      setChatSubmitting(false);
      setInFlightQuestion(null);
      setChatError(piterResult.error);
      return;
    }

    const councilAgents =
      rosterMode === "canonical"
        ? CANONICAL_AGENTS.filter((agent) => selectedParticipantIds.includes(agent.id)).map(
            (agent) => ({
              agentId: agent.id,
              displayName: agent.name,
              appRole: getAgentHumanRole(agent.id, agent.name),
              qaSpecialty: getAgentResponsibilitySummary(agent.id),
              currentFocus: getAgentCurrentFocus(agent.id),
              status: "active" as const,
              memorySnippets: [] as string[],
            }),
          )
        : managedAgents
            .filter((agent) => selectedParticipantIds.includes(agent.agentId))
            .map((agent) => ({
              agentId: agent.agentId,
              displayName: agent.displayName,
              appRole: agent.appRole,
              qaSpecialty: agent.qaSpecialty,
              currentFocus: agent.currentFocus,
              status: agent.status,
              memorySnippets: [] as string[],
            }));

    const memoryByAgent = new Map<string, string[]>();
    await Promise.all(
      councilAgents.map(async (agent) => {
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
      councilAgents: councilAgents.map((agent) => ({
        ...agent,
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
          rosterMode,
        },
      });
    }

    setComposerValue("");
    writeCouncilDraft("");
    setChatSubmitting(false);
    setInFlightQuestion(null);
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
    rosterMode,
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

  const recentMessages = useMemo(() => {
    return councilMessages.slice(-recentMessageLimit);
  }, [councilMessages, recentMessageLimit]);

  const turns: CouncilTurnView[] = useMemo(
    () =>
      buildCouncilTurns(recentMessages, {
        pendingAgentIds: chatSubmitting ? selectedParticipantIds : [],
        submitting: chatSubmitting,
      }),
    [chatSubmitting, recentMessages, selectedParticipantIds],
  );

  const latestTurn = useMemo(() => latestCouncilTurn(turns), [turns]);

  const participants = useMemo(
    () =>
      rosterMode === "canonical"
        ? mapCanonicalParticipants()
        : mapManagedParticipants(managedAgents),
    [managedAgents, rosterMode],
  );

  const statusText = localLlmStatus.runtimeActive
    ? `Council online · ${selectedLlmLabel} · ${selectedParticipantIds.length} agents selected`
    : "Council online · LLM may use fallback replies";

  const clearChatFeedback = useCallback(() => {
    setChatFeedback(null);
  }, []);

  return {
    loading,
    error,
    isOwner,
    managedAgents,
    councilMessages: recentMessages,
    turns,
    latestTurn,
    rosterMode,
    setRosterMode,
    participants,
    composerValue,
    setComposerValue,
    chatSubmitting,
    inFlightQuestion,
    chatFeedback,
    clearChatFeedback,
    chatError,
    activatingAgents,
    selectedParticipantIds,
    setSelectedParticipantIds,
    statusText,
    localLlmActive: localLlmStatus.runtimeActive,
    send: handleCouncilSend,
    refresh: loadData,
    memoryApprovalByMessageId,
    handleMemoryApproval,
  };
}
