import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Brain,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import {
  AixiaAsyncState,
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaCommandMetrics,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaHero,
  AixiaInfoBlock,
  AixiaInputField,
  AixiaMemoryApprovalPrompt,
  AixiaMessengerShell,
  AixiaSection,
  AixiaTextareaField,
  type AixiaMemoryApprovalStatus,
  type AixiaMessengerMessage,
} from "@/components/aixia";
import { useAgentOpsMessengerAttachments } from "@/hooks/useAgentOpsMessengerAttachments";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  addAgentOpsAgentMemory,
  commitAgentOpsMemoryFromChatApproval,
  getAgentOpsActiveTop10,
  getAgentOpsAgentInteractions,
  getAgentOpsAgentMemory,
  getAgentOpsAgentStatusSummary,
  getAgentOpsAgentTimeline,
  getAgentOpsManagedAgents,
  getAgentOpsOwnerStatus,
  getAgentOpsAgentChatMessages,
  parseAgentCreativeProposal,
  recordAgentOpsAgentChatMessage,
  recordAgentOpsAgentInteraction,
  recordAgentOpsAgentTimelineReview,
  recordAgentOpsCreativeProposal,
  runAgentOpsLocalLlmChat,
  updateAgentOpsAgentStatus,
  type AgentOpsAgentChatMessage,
  type AgentOpsAgentInteractionItem,
  type AgentOpsAgentInteractionMessageType,
  type AgentOpsAgentMemoryInputType,
  type AgentOpsAgentTimelineItem,
  type AgentOpsAgentStatusSummary,
  type AgentOpsFinding,
  type AgentOpsManagedAgent,
  type AgentOpsManagedAgentMemoryItem,
} from "@/lib/agentops";
import { useAgentOpsLlmProbe } from "@/hooks/useAgentOpsLlmProbe";
import { useAgentOpsLlmModelSelection } from "@/hooks/useAgentOpsLlmModelSelection";
import { AgentDailyReviewStatusSection } from "@/app/system/agent-ops/agents/AgentDailyReviewStatusSection";

function managedAgentStatusTone(
  status: AgentOpsManagedAgent["status"],
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "active") return "emerald";
  if (status === "quiet") return "cyan";
  if (status === "needs_memory") return "amber";
  if (status === "blocked" || status === "disabled") return "rose";
  return "neutral";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

const MEMORY_TYPES: AgentOpsAgentMemoryInputType[] = [
  "focus",
  "instruction",
  "correction",
  "feature_idea",
  "preference",
  "blocked_behavior",
];

const INTERACTION_TYPES: AgentOpsAgentInteractionMessageType[] = [
  "piter_note",
  "focus_directive",
  "correction",
  "feature_idea",
  "status_question",
];

export default function AgentOpsAgentWorkspacePage() {
  const { agentId = "" } = useParams<{ agentId: string }>();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialMode = searchParams.get("mode")?.toLowerCase();
  const initialPanel = searchParams.get("panel")?.toLowerCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [agent, setAgent] = useState<AgentOpsManagedAgent | null>(null);
  usePageTitle(agent?.displayName ? `${agent.displayName} · AgentOps` : `Agent · ${agentId || "AgentOps"}`);
  const [statusSummary, setStatusSummary] = useState<AgentOpsAgentStatusSummary | null>(null);
  const [memoryItems, setMemoryItems] = useState<AgentOpsManagedAgentMemoryItem[]>([]);
  const [interactionItems, setInteractionItems] = useState<AgentOpsAgentInteractionItem[]>([]);
  const [timelineItems, setTimelineItems] = useState<AgentOpsAgentTimelineItem[]>([]);
  const [issuesFound, setIssuesFound] = useState<AgentOpsFinding[]>([]);

  const [memoryType, setMemoryType] = useState<AgentOpsAgentMemoryInputType>(
    initialMode && MEMORY_TYPES.includes(initialMode as AgentOpsAgentMemoryInputType)
      ? (initialMode as AgentOpsAgentMemoryInputType)
      : "focus",
  );
  const [memoryText, setMemoryText] = useState("");
  const [memorySubmitting, setMemorySubmitting] = useState(false);

  const [interactionType, setInteractionType] = useState<AgentOpsAgentInteractionMessageType>(
    initialMode === "interaction_note" ? "piter_note" : "focus_directive",
  );
  const [interactionText, setInteractionText] = useState("");
  const [interactionSubmitting, setInteractionSubmitting] = useState(false);
  const [timelineReviewSubmitting, setTimelineReviewSubmitting] = useState(false);
  const [chatMessages, setChatMessages] = useState<AgentOpsAgentChatMessage[]>([]);
  const [chatComposerValue, setChatComposerValue] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [memoryApprovalByMessageId, setMemoryApprovalByMessageId] = useState<
    Record<string, AixiaMemoryApprovalStatus>
  >({});

  const localLlmStatus = useAgentOpsLlmProbe();
  const {
    models: llmModelOptions,
    selectedModel: selectedLlmModel,
    selectedLabel: selectedLlmLabel,
    setSelectedModel: setSelectedLlmModel,
    refreshCatalog: refreshLlmCatalog,
    loading: llmModelLoading,
    refreshing: llmModelRefreshing,
    installedCount: llmInstalledCount,
  } = useAgentOpsLlmModelSelection(`agent:${agentId}`);
  const {
    pendingAttachments,
    readyAttachments,
    attachmentDescriptions,
    addAttachments,
    removeAttachment,
    clearAttachments,
  } = useAgentOpsMessengerAttachments("individual_agent", agentId);

  const loadWorkspace = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    const [ownerResult, managedAgentsResult, statusSummaryResult, memoryResult, interactionsResult, timelineResult, activeIssuesResult, chatResult] =
      await Promise.all([
        getAgentOpsOwnerStatus(),
        getAgentOpsManagedAgents(),
        getAgentOpsAgentStatusSummary(agentId),
        getAgentOpsAgentMemory(agentId),
        getAgentOpsAgentInteractions(agentId),
        getAgentOpsAgentTimeline(agentId),
        getAgentOpsActiveTop10(),
        getAgentOpsAgentChatMessages(agentId),
      ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setIsOwner(false);
      setError(ownerResult.error ?? "AgentOps Owner access required.");
      setLoading(false);
      return;
    }

    setIsOwner(true);

    if (managedAgentsResult.error) {
      setError(managedAgentsResult.error);
      setLoading(false);
      return;
    }

    const matched = (managedAgentsResult.data ?? []).find(
      (candidate) =>
        candidate.agentId.toLowerCase() === agentId.toLowerCase() ||
        candidate.displayName.toLowerCase().replace(/\s+/g, "-") === agentId.toLowerCase(),
    );

    if (!matched) {
      setAgent(null);
      setError(`Agent not found for id: ${agentId}`);
      setLoading(false);
      return;
    }

    setAgent(matched);
    setStatusSummary(statusSummaryResult.data ?? null);
    setMemoryItems(memoryResult.data ?? []);
    setInteractionItems(interactionsResult.data ?? []);
    setTimelineItems(timelineResult.data?.items ?? []);
    setIssuesFound((activeIssuesResult.data ?? []).filter((issue) => issue.agent_id === matched.agentId));
    setChatMessages(chatResult.data ?? []);

    const firstError =
      statusSummaryResult.error ??
      memoryResult.error ??
      interactionsResult.error ??
      timelineResult.error ??
      activeIssuesResult.error ??
      chatResult.error;
    if (firstError) setError(firstError);
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    void loadWorkspace();
  }, [agentId, loadWorkspace]);

  const workspaceModeLabel = useMemo(() => {
    if (initialPanel === "memory" && initialMode === "view") return "View memory";
    if (initialPanel === "memory" && initialMode) return `Add ${initialMode.replaceAll("_", " ")}`;
    if (initialPanel === "chat") return "Add interaction note";
    return null;
  }, [initialMode, initialPanel]);

  const updateStatus = useCallback(
    async (nextStatus: AgentOpsManagedAgent["status"]) => {
      if (!agent) return;
      setActionFeedback(null);
      const result = await updateAgentOpsAgentStatus({
        agentId: agent.agentId,
        status: nextStatus,
        note: `Status updated in Agent Workspace (${agent.agentId}).`,
      });
      if (result.error) {
        setActionFeedback(result.error);
        return;
      }
      setActionFeedback(`Status updated to ${nextStatus.replaceAll("_", " ")}.`);
      await loadWorkspace();
    },
    [agent, loadWorkspace],
  );

  const submitMemory = useCallback(async () => {
    if (!agent || !memoryText.trim()) return;
    setMemorySubmitting(true);
    setActionFeedback(null);
    const result = await addAgentOpsAgentMemory({
      agentId: agent.agentId,
      memoryType,
      content: memoryText.trim(),
      source: "piter",
      priority: "medium",
      note: `Added from Agent Workspace (${agent.agentId}).`,
    });
    setMemorySubmitting(false);
    if (result.error) {
      setActionFeedback(result.error);
      return;
    }
    setMemoryText("");
    setActionFeedback(`Memory saved (${memoryType.replaceAll("_", " ")}).`);
    await loadWorkspace();
  }, [agent, loadWorkspace, memoryText, memoryType]);

  const submitInteraction = useCallback(async () => {
    if (!agent || !interactionText.trim()) return;
    setInteractionSubmitting(true);
    setActionFeedback(null);
    const result = await recordAgentOpsAgentInteraction({
      agentId: agent.agentId,
      messageType: interactionType,
      content: interactionText.trim(),
      source: "piter",
      priority: "medium",
      status: "logged",
      note: `Logged from Agent Workspace (${agent.agentId}).`,
    });
    setInteractionSubmitting(false);
    if (result.error) {
      setActionFeedback(result.error);
      return;
    }
    setInteractionText("");
    setActionFeedback("Interaction note saved.");
    await loadWorkspace();
  }, [agent, interactionText, interactionType, loadWorkspace]);

  const handleAgentChatSend = useCallback(async () => {
    if (!agent || !chatComposerValue.trim() || chatSubmitting) return;

    const message = chatComposerValue.trim();
    setChatSubmitting(true);
    setActionFeedback(null);
    setChatError(null);

    const piterResult = await recordAgentOpsAgentChatMessage({
      agentId: agent.agentId,
      sender: "piter",
      content: message,
      source: "owner",
      metadata: { attachments: readyAttachments },
    });
    if (piterResult.error) {
      setChatSubmitting(false);
      setChatError(piterResult.error);
      return;
    }

    const llmResult = await runAgentOpsLocalLlmChat({
      chatScope: "individual_agent",
      message,
      model: selectedLlmModel,
      attachmentDescriptions,
      selectedAgentId: agent.agentId,
      agentContext: {
        agentId: agent.agentId,
        displayName: agent.displayName,
        appRole: agent.appRole,
        qaSpecialty: agent.qaSpecialty,
        currentFocus: agent.currentFocus,
        memorySnippets: memoryItems.filter((item) => item.active).map((item) => item.memoryText),
      },
    });

    const parsed = parseAgentCreativeProposal(llmResult.response ?? "");
    if (parsed.proposal) {
      await recordAgentOpsCreativeProposal({
        agentId: agent.agentId,
        proposalType: parsed.proposal.proposalType,
        title: parsed.proposal.title,
        summary: parsed.proposal.summary,
        suggestedRoute: parsed.proposal.suggestedRoute,
        confidence: parsed.proposal.confidence,
        chatScope: "individual_agent",
        roomId: agent.agentId,
      });
    }

    const agentReply = parsed.cleanedResponse || llmResult.response || "No response generated.";
    await recordAgentOpsAgentChatMessage({
      agentId: agent.agentId,
      sender: "agent",
      content: agentReply,
      source: llmResult.localLlmCalled ? "local_llm_runtime" : "mock_response_layer",
      metadata: {
        requestId: llmResult.requestId,
        memoryIntentDetected: llmResult.memoryIntentDetected,
        creativeProposal: parsed.proposal,
      },
    });

    setChatComposerValue("");
    clearAttachments();
    setChatSubmitting(false);
    if (!llmResult.localLlmCalled) {
      setChatError(
        llmResult.blockers[0] ??
          llmResult.limitations ??
          "Local LLM unavailable. Start Ollama with: ollama serve",
      );
    }
    setActionFeedback(
      llmResult.localLlmCalled ?
        "Agent chat response recorded via local LLM."
      : "Agent chat fallback response recorded (local LLM unavailable).",
    );
    await loadWorkspace({ silent: true });
  }, [
    agent,
    attachmentDescriptions,
    chatComposerValue,
    chatSubmitting,
    clearAttachments,
    loadWorkspace,
    memoryItems,
    readyAttachments,
    selectedLlmModel,
  ]);

  const handleMemoryApproval = useCallback(
    async (messageId: string, content: string, approved: boolean) => {
      if (!agent) return;
      setMemoryApprovalByMessageId((current) => ({
        ...current,
        [messageId]: approved ? "saved" : "rejected",
      }));
      const result = await commitAgentOpsMemoryFromChatApproval({
        agentId: agent.agentId,
        content,
        chatScope: "individual_agent",
        roomId: agent.agentId,
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
    [agent],
  );

  const agentMessengerMessages = useMemo((): AixiaMessengerMessage[] => {
    if (!agent) return [];
    return chatMessages.map((entry) => {
      const memoryIntentDetected = entry.metadata.memoryIntentDetected === true;
      const approvalStatus =
        memoryApprovalByMessageId[entry.id] ?? (memoryIntentDetected ? "pending" : undefined);

      if (entry.sender === "piter") {
        return {
          id: entry.id,
          senderType: "user",
          senderName: "Piter",
          content: entry.content,
        };
      }

      return {
        id: entry.id,
        senderType: "agent",
        senderName: agent.displayName,
        senderRole: `${agent.appRole} · ${agent.qaSpecialty}`,
        badges: (
          <AixiaBadge tone={entry.source === "local_llm_runtime" ? "emerald" : "neutral"}>
            {entry.source === "local_llm_runtime" ? "LLM" : "Fallback"}
          </AixiaBadge>
        ),
        content: entry.content,
        footer:
          memoryIntentDetected ?
            <AixiaMemoryApprovalPrompt
              suggestedMemoryText={entry.content.slice(0, 180)}
              status={approvalStatus ?? "pending"}
              density="inline"
              scope="agent"
              agentName={agent.displayName}
              contextLabel="Agent Workspace chat"
              onApprove={() => void handleMemoryApproval(entry.id, entry.content, true)}
              onReject={() => void handleMemoryApproval(entry.id, entry.content, false)}
            />
          : null,
      };
    });
  }, [agent, chatMessages, handleMemoryApproval, memoryApprovalByMessageId]);

  const submitTimelineReview = useCallback(
    async (
      decision: "reviewed" | "needs_follow_up" | "archive_note" | "keep_active",
      timelineItemId: string,
    ) => {
      if (!agent) return;
      setTimelineReviewSubmitting(true);
      setActionFeedback(null);
      const result = await recordAgentOpsAgentTimelineReview({
        agentId: agent.agentId,
        timelineItemId,
        decision,
        note: `Timeline review from Agent Workspace: ${decision.replaceAll("_", " ")}.`,
      });
      setTimelineReviewSubmitting(false);
      if (result.error) {
        setActionFeedback(result.error);
        return;
      }
      setActionFeedback(`Timeline decision recorded: ${decision.replaceAll("_", " ")}.`);
      await loadWorkspace();
    },
    [agent, loadWorkspace],
  );

  const agentStatusLabel = agent
    ? (statusSummary?.currentStatus ?? agent.status).replaceAll("_", " ")
    : "Unknown";

  const workspaceMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first AgentOps staging surface.",
        tone: "amber" as const,
      },
      {
        key: "runtime",
        label: "Runtime mode",
        value: localLlmStatus.runtimeActive ? "Local LLM active" : "Fallback mode",
        detail:
          localLlmStatus.runtimeActive ?
            `${localLlmStatus.model} · ${localLlmStatus.baseUrl}`
          : "Configure Ollama via VITE_AGENTOPS_LLM_* env vars.",
        tone: localLlmStatus.runtimeActive ? ("emerald" as const) : ("cyan" as const),
      },
      {
        key: "status",
        label: "Agent status",
        value: loading ? "Checking…" : agentStatusLabel,
        detail: "Current managed agent state.",
        tone: managedAgentStatusTone(statusSummary?.currentStatus ?? agent?.status ?? "active"),
      },
      {
        key: "scope",
        label: "Workspace scope",
        value: "Memory, notes, timeline",
        detail: "Single-agent owner workspace shell.",
        tone: "neutral" as const,
      },
    ],
    [agent?.status, agentStatusLabel, loading, localLlmStatus, statusSummary?.currentStatus],
  );

  const workspaceCommandMetrics = useMemo(
    () => [
      {
        key: "memory-count",
        title: "Memory count",
        value: loading
          ? "Checking…"
          : String(statusSummary?.memoryCount ?? agent?.memoryCount ?? 0),
        subtitle: "Reported memory total",
        icon: Brain,
        tone: "cyan" as const,
      },
      {
        key: "memory-records",
        title: "Memory records",
        value: loading ? "Checking…" : String(memoryItems.length),
        subtitle: "Loaded memory entries",
        icon: Brain,
        tone: "indigo" as const,
      },
      {
        key: "issues-linked",
        title: "Active issues",
        value: loading ? "Checking…" : String(issuesFound.length),
        subtitle: "Linked active top-10 issues",
        icon: Users,
        tone: "rose" as const,
      },
      {
        key: "timeline-events",
        title: "Timeline events",
        value: loading ? "Checking…" : String(timelineItems.length),
        subtitle: "Recent workspace events",
        icon: Activity,
        tone: "violet" as const,
      },
      {
        key: "interaction-notes",
        title: "Interaction notes",
        value: loading ? "Checking…" : String(interactionItems.length),
        subtitle: "Logged owner interactions",
        icon: MessageSquare,
        tone: "emerald" as const,
      },
      {
        key: "latest-findings",
        title: "Latest findings",
        value: loading ? "Checking…" : String(agent?.latestFindingsCount ?? 0),
        subtitle: `Run: ${agent?.lastRunStatus ?? "—"}`,
        icon: Sparkles,
        tone: "amber" as const,
      },
    ],
    [
      agent?.lastRunStatus,
      agent?.latestFindingsCount,
      agent?.memoryCount,
      interactionItems.length,
      issuesFound.length,
      loading,
      memoryItems.length,
      statusSummary?.memoryCount,
      timelineItems.length,
    ],
  );

  const workspaceHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title={agent ? agent.displayName : "Agent Workspace"}
      subtitle={agent ? `${agent.appRole} · ${agent.qaSpecialty}` : "Loading agent details"}
      parentLabel="AgentOps Agents"
      parentPath="/system/agent-ops/agents"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/agents")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </AixiaButton>
          <AixiaButton variant="secondary" disabled={loading} onClick={() => void loadWorkspace()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </>
      }
    >
      <AixiaCommandMetrics items={workspaceCommandMetrics} />
    </AixiaHero>
  );

  if (!loading && (!isOwner || error?.toLowerCase().includes("owner access required"))) {
    return (
      <AixiaCommandPageLayout hero={workspaceHero}>
        <AixiaSection
          surface="command"
          title="Agent Workspace"
          description="Owner access required"
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Access restricted">
            {error ?? "Only AgentOps owner users can view this page."}
          </AixiaInfoBlock>
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  return (
    <AixiaCommandPageLayout
      hero={workspaceHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={workspaceMetaStripItems} />}
    >
      <div data-testid="agentops-agent-workspace">
        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaSection
              surface="command"
              title="Agent workspace"
              description="Loading agent status, memory, and timeline."
              icon={Users}
            >
              <AixiaEmptyState
                icon={Users}
                title="Loading Agent Workspace"
                description="Agent profile, memory, interactions, and timeline are being prepared."
              />
            </AixiaSection>
          }
        >
          <>
            {error && !error.toLowerCase().includes("owner access required") ? (
              <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Workspace notice">
                {error}
              </AixiaInfoBlock>
            ) : null}

            {workspaceModeLabel ? (
              <AixiaInfoBlock tone="cyan" icon={Sparkles} title="Quick action mode">
                This workspace opened in quick mode: {workspaceModeLabel}.
              </AixiaInfoBlock>
            ) : null}

            <AgentDailyReviewStatusSection agentSlug={agentId} />

            <AixiaSection
              surface="command"
              title="Status controls"
              description="Update managed agent status. Runtime workspace features remain planned."
              icon={Activity}
            >
              {agent ? (
                <AixiaInfoBlock tone="cyan" icon={Activity} title="Current focus">
                  {statusSummary?.currentFocus ?? agent.currentFocus ?? "No focus directive recorded yet."}
                </AixiaInfoBlock>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <AixiaButton variant="secondary" className="text-xs px-3 py-1.5" onClick={() => void updateStatus("active")}>
                  Mark Active
                </AixiaButton>
                <AixiaButton variant="secondary" className="text-xs px-3 py-1.5" onClick={() => void updateStatus("quiet")}>
                  Mark Quiet
                </AixiaButton>
                <AixiaButton variant="secondary" className="text-xs px-3 py-1.5" onClick={() => void updateStatus("blocked")}>
                  Mark Blocked
                </AixiaButton>
                <AixiaButton
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  onClick={() => void updateStatus("needs_memory")}
                >
                  Mark Needs Memory
                </AixiaButton>
              </div>
            </AixiaSection>

            {agent ? (
            <AixiaSection
              surface="command"
              title="Agent Chat"
              description="Live local LLM chat for this agent. Memory updates still require explicit Yes/No approval."
              icon={MessageSquare}
              bodyClassName="aixia-section-body--messenger"
            >
              <div data-testid="agentops-agent-chat-thread">
                <AixiaMessengerShell
                  roomTitle={agent.displayName}
                  chatScope="individual_agent"
                  testId="agentops-agent-messenger"
                  messages={agentMessengerMessages}
                  composerValue={chatComposerValue}
                  onComposerChange={setChatComposerValue}
                  onSend={() => void handleAgentChatSend()}
                  sending={chatSubmitting}
                  statusText={
                    localLlmStatus.runtimeActive ?
                      `Local LLM active · ${selectedLlmLabel}`
                    : "Local LLM unavailable — fallback replies will be recorded."
                  }
                  errorText={chatError}
                  emptyTitle="Agent chat ready"
                  emptyDescription={`Start a conversation with ${agent.displayName}. Memory updates require explicit Yes approval.`}
                  pendingAttachments={pendingAttachments}
                  onAddAttachments={(files) => void addAttachments(files)}
                  onRemoveAttachment={removeAttachment}
                  showTypingIndicator={chatSubmitting}
                  typingLabel={`${agent.displayName} is thinking…`}
                  llmModelOptions={llmModelOptions}
                  selectedLlmModel={selectedLlmModel}
                  onLlmModelChange={setSelectedLlmModel}
                  onLlmModelRefresh={() => void refreshLlmCatalog()}
                  llmModelLoading={llmModelLoading}
                  llmModelRefreshing={llmModelRefreshing}
                  llmInstalledCount={llmInstalledCount}
                />
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Owner interaction notes</p>
                <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Interaction type</span>
                  <select
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={interactionType}
                    onChange={(event) =>
                      setInteractionType(event.target.value as AgentOpsAgentInteractionMessageType)
                    }
                  >
                    {INTERACTION_TYPES.map((type) => (
                      <option key={`interaction-type-${type}`} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Interaction note</span>
                  <AixiaTextareaField
                    value={interactionText}
                    onChange={(event) => setInteractionText(event.target.value)}
                    placeholder="Record a note, directive, correction, or follow-up. Memory confirmation appears only for clear remember/apply intent."
                    rows={4}
                  />
                </label>
                </div>
              <div className="mt-3">
                <AixiaButton
                  variant="primary"
                  disabled={interactionSubmitting || interactionText.trim().length === 0}
                  onClick={() => void submitInteraction()}
                >
                  Add Interaction Note
                </AixiaButton>
              </div>
              {interactionItems.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {interactionItems.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <AixiaBadge tone="neutral">{entry.messageType.replaceAll("_", " ")}</AixiaBadge>
                        <span className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span>
                      </div>
                      <p className="mt-1">{entry.content}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              </div>
            </AixiaSection>
            ) : null}

            <AixiaSection
              surface="command"
              title="Memory"
              description="Owner-managed memory records for this agent."
              icon={Brain}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Memory type</span>
                  <select
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={memoryType}
                    onChange={(event) => setMemoryType(event.target.value as AgentOpsAgentMemoryInputType)}
                  >
                    {MEMORY_TYPES.map((type) => (
                      <option key={`memory-type-${type}`} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Memory content</span>
                  <AixiaTextareaField
                    value={memoryText}
                    onChange={(event) => setMemoryText(event.target.value)}
                    placeholder="Add memory/focus content for this agent."
                    rows={4}
                  />
                </label>
              </div>
              <div className="mt-3">
                <AixiaButton
                  variant="primary"
                  disabled={memorySubmitting || memoryText.trim().length === 0}
                  onClick={() => void submitMemory()}
                >
                  Add Memory / Focus
                </AixiaButton>
              </div>

              {memoryItems.length === 0 ? (
                <AixiaEmptyState
                  icon={Brain}
                  title="No memory entries yet"
                  description="Add focus/correction/idea notes from this workspace."
                />
              ) : (
                <div className="mt-4 space-y-2">
                  {memoryItems.slice(0, 12).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <AixiaBadge tone="cyan">{entry.memoryType.replaceAll("_", " ")}</AixiaBadge>
                        <span className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span>
                      </div>
                      <p className="mt-1">{entry.memoryText}</p>
                    </div>
                  ))}
                </div>
              )}
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Focus"
              description="Current focus and quick update controls."
              icon={Sparkles}
            >
              <AixiaInfoBlock tone="cyan" icon={Brain} title="Current focus">
                {statusSummary?.currentFocus ?? agent?.currentFocus ?? "No focus directive recorded yet."}
              </AixiaInfoBlock>
              <div className="grid gap-3 sm:grid-cols-2">
                <AixiaInputField
                  value={memoryType === "focus" ? memoryText : ""}
                  onChange={(event) => {
                    setMemoryType("focus");
                    setMemoryText(event.target.value);
                  }}
                  placeholder="Set a concise focus directive..."
                />
                <AixiaButton
                  variant="secondary"
                  disabled={memorySubmitting || memoryText.trim().length === 0 || memoryType !== "focus"}
                  onClick={() => void submitMemory()}
                >
                  Save Focus Directive
                </AixiaButton>
              </div>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Timeline"
              description="Recent agent events with G14 timeline review actions (Agent Interaction Window parity)."
              icon={Activity}
            >
              {timelineItems.length === 0 ? (
                <AixiaEmptyState
                  icon={Activity}
                  title="No timeline events yet"
                  description="Timeline will populate as owner actions and agent updates are logged."
                />
              ) : (
                <div className="space-y-2">
                  {timelineItems.slice(0, 12).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <AixiaBadge tone="neutral">{entry.eventType.replaceAll("_", " ")}</AixiaBadge>
                        <span className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span>
                      </div>
                      <p className="mt-1 font-medium text-white">{entry.title}</p>
                      <p className="mt-1">{entry.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(
                          [
                            ["reviewed", "Reviewed"],
                            ["needs_follow_up", "Needs Follow-up"],
                            ["archive_note", "Archive Note"],
                            ["keep_active", "Keep Active"],
                          ] as const
                        ).map(([decision, label]) => (
                          <AixiaButton
                            key={`${entry.id}-${decision}`}
                            variant="secondary"
                            className="text-xs px-2 py-1"
                            disabled={timelineReviewSubmitting}
                            onClick={() => void submitTimelineReview(decision, entry.id)}
                          >
                            {label}
                          </AixiaButton>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Issues Found"
              description="Current active issues linked to this agent."
              icon={Users}
            >
              {issuesFound.length === 0 ? (
                <AixiaEmptyState
                  icon={Users}
                  title="No active issues linked"
                  description="This agent currently has no active top-10 issues assigned."
                />
              ) : (
                <div className="space-y-2">
                  {issuesFound.slice(0, 8).map((issue) => (
                    <div
                      key={issue.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div>
                        <p className="font-medium text-white">{issue.issue_code}</p>
                        <p className="text-sm text-slate-300">{issue.title}</p>
                        <p className="text-xs text-slate-500">
                          {issue.severity} · {issue.status}
                        </p>
                      </div>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        onClick={() =>
                          navigate(`/system/agent-ops/issues/${encodeURIComponent(issue.issue_code)}`)
                        }
                      >
                        Open Issue Workspace
                      </AixiaButton>
                    </div>
                  ))}
                </div>
              )}
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Workspace guardrails"
              description="Batch scope limits for this agent workspace shell."
              icon={ShieldCheck}
            >
              <AixiaInfoBlock tone="violet" icon={ShieldCheck} title="Batch 8 scope guardrail">
                This route is a UI shell for Agent Workspace preparation. No local LLM runtime, no Hermes activation, no
                CodeGraph runtime activation, no scheduler activation, and no automatic Cursor execution are enabled.
              </AixiaInfoBlock>
            </AixiaSection>

            {actionFeedback ? (
              <AixiaInfoBlock tone="cyan" icon={ShieldCheck} title="Update">
                {actionFeedback}
              </AixiaInfoBlock>
            ) : null}
          </>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}
