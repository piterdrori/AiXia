import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, RefreshCw, ShieldCheck, Users } from "lucide-react";

import {
  AixiaAsyncState,
  AixiaBadge,
  AixiaButton,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaCommandHubMetaStrip,
  AixiaHero,
  AixiaInfoBlock,
  AixiaMemoryApprovalPrompt,
  AixiaMessengerShell,
  AixiaProgressiveDisclosureGroup,
  AixiaSection,
  AixiaSmartGrid,
  AixiaValueBlock,
  type AixiaMemoryApprovalStatus,
  type AixiaMessengerMessage,
} from "@/components/aixia";
import { useAgentOpsMessengerAttachments } from "@/hooks/useAgentOpsMessengerAttachments";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  activateAllAgentOpsManagedAgents,
  commitAgentOpsMemoryFromChatApproval,
  getAgentOpsAgentMemory,
  getAgentOpsAgentStatusDashboard,
  getAgentOpsCouncilChatMessages,
  getAgentOpsHermesReadinessGate,
  getAgentOpsManagedAgents,
  getAgentOpsOwnerStatus,
  parseAgentCreativeProposal,
  recordAgentOpsCouncilChatMessage,
  recordAgentOpsCreativeProposal,
  runAgentOpsLocalLlmChat,
  type AgentOpsAgentStatusDashboardItem,
  type AgentOpsCouncilChatMessage,
  type AgentOpsManagedAgent,
} from "@/lib/agentops";
import { useAgentOpsLlmProbe } from "@/hooks/useAgentOpsLlmProbe";
import { useAgentOpsLlmModelSelection } from "@/hooks/useAgentOpsLlmModelSelection";

function managedAgentStatusTone(
  status: AgentOpsManagedAgent["status"],
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "active") return "emerald";
  if (status === "quiet") return "cyan";
  if (status === "needs_memory") return "amber";
  if (status === "blocked" || status === "disabled") return "rose";
  return "neutral";
}

function attentionReasonTone(
  reason: AgentOpsAgentStatusDashboardItem["attentionReason"] | null | undefined,
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (!reason) return "neutral";
  if (reason === "OK") return "emerald";
  if (reason === "Recently Updated") return "cyan";
  if (reason === "Blocked" || reason === "Refresh Blocked") return "rose";
  return "amber";
}

export default function AgentOpsCouncilPage() {
  usePageTitle("Agent Council");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [managedAgents, setManagedAgents] = useState<AgentOpsManagedAgent[]>([]);
  const [statusDashboardItems, setStatusDashboardItems] = useState<AgentOpsAgentStatusDashboardItem[]>(
    [],
  );
  const [councilMessages, setCouncilMessages] = useState<AgentOpsCouncilChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatFeedback, setChatFeedback] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [activatingAgents, setActivatingAgents] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [creativityMode, setCreativityMode] = useState(false);
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
  } = useAgentOpsLlmModelSelection("council");
  const hermesGate = useMemo(() => getAgentOpsHermesReadinessGate(), []);
  const {
    pendingAttachments,
    readyAttachments,
    attachmentDescriptions,
    addAttachments,
    removeAttachment,
    clearAttachments,
  } = useAgentOpsMessengerAttachments("council", "agent-council");
  const agentsActivatedRef = useRef(false);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    const [ownerResult, managedResult, statusResult, councilChatResult] = await Promise.all([
      getAgentOpsOwnerStatus(),
      getAgentOpsManagedAgents(),
      getAgentOpsAgentStatusDashboard(),
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
      setStatusDashboardItems([]);
      setLoading(false);
      return;
    }

    setManagedAgents(managedResult.data ?? []);
    setStatusDashboardItems(statusResult.data?.items ?? []);
    setCouncilMessages(councilChatResult.data ?? []);
    setSelectedParticipantIds((current) =>
      current.length > 0 ? current : (managedResult.data ?? []).map((agent) => agent.agentId),
    );
    if (statusResult.error) setError(statusResult.error);
    if (councilChatResult.error && !statusResult.error) setError(councilChatResult.error);
    setLoading(false);
  }, []);

  const ensureAgentsActive = useCallback(async (agents: AgentOpsManagedAgent[]) => {
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
    await loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading || managedAgents.length === 0 || agentsActivatedRef.current) return;
    agentsActivatedRef.current = true;
    void ensureAgentsActive(managedAgents);
  }, [loading, managedAgents, ensureAgentsActive]);

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

    const outboundMessage =
      creativityMode ?
        `${message}\n\nPlease share 1–3 problem hypotheses or test ideas in your specialty.`
      : message;

    const piterResult = await recordAgentOpsCouncilChatMessage({
      sender: "piter",
      content: outboundMessage,
      source: "owner",
      metadata: {
        selectedAgentIds: selectedParticipantIds,
        attachments: readyAttachments,
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
      message: outboundMessage,
      model: selectedLlmModel,
      attachmentDescriptions,
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
        },
      });
    }

    setComposerValue("");
    clearAttachments();
    setChatSubmitting(false);
    if (!llmResult.localLlmCalled) {
      setChatError(
        llmResult.blockers[0] ??
          llmResult.limitations ??
          "Local LLM unavailable. Start Ollama with: ollama serve",
      );
    }
    setChatFeedback(
      llmResult.localLlmCalled ?
        `Council message sent — ${llmResult.perAgentResponses.length} agent(s) replied via local LLM.`
      : "Council message sent — fallback replies recorded (local LLM unavailable).",
    );
    await loadData({ silent: true });
  }, [
    attachmentDescriptions,
    chatSubmitting,
    clearAttachments,
    composerValue,
    creativityMode,
    loadData,
    managedAgents,
    readyAttachments,
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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const councilMetaStripItems = useMemo(
    () => [
      {
        key: "scope",
        label: "Council scope",
        value: "All managed agents",
        detail: "Group chat shell for the full synthetic QA roster.",
        tone: "cyan" as const,
      },
      {
        key: "runtime",
        label: "Runtime stack",
        value: loading ? "Checking…" : localLlmStatus.runtimeActive ? "Local LLM active" : "Local LLM inactive",
        detail:
          localLlmStatus.runtimeActive ?
            `Connected to ${localLlmStatus.baseUrl} · model ${localLlmStatus.model}`
          : hermesGate.runtimeActive ?
            "Hermes server route ready · local LLM inactive"
          : "Configure Ollama via VITE_AGENTOPS_LLM_* env vars.",
        tone: localLlmStatus.runtimeActive ? ("emerald" as const) : ("neutral" as const),
      },
      {
        key: "memory",
        label: "Memory policy",
        value: "Approval required",
        detail: "Memory writes need explicit Piter Yes/No approval before saving.",
        tone: "amber" as const,
      },
    ],
    [loading, localLlmStatus, hermesGate],
  );

  const statusByAgentId = useMemo(
    () => new Map(statusDashboardItems.map((item) => [item.agentId, item])),
    [statusDashboardItems],
  );

  const councilMessengerMessages = useMemo((): AixiaMessengerMessage[] => {
    if (councilMessages.length === 0) return [];

    return councilMessages.map((entry) => {
      const matchedAgent =
        entry.agentId ? managedAgents.find((agent) => agent.agentId === entry.agentId) : null;
      const dashboardItem = entry.agentId ? statusByAgentId.get(entry.agentId) : undefined;
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
        senderName: entry.agentName ?? matchedAgent?.displayName ?? "Agent",
        senderRole:
          matchedAgent ? `${matchedAgent.appRole} · ${matchedAgent.qaSpecialty}` : undefined,
        avatarInitials:
          (entry.agentName ?? matchedAgent?.displayName ?? "Agent")
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .slice(0, 2)
            .join("") || "AG",
        badges:
          matchedAgent ?
            <>
              <AixiaBadge tone={managedAgentStatusTone(matchedAgent.status)}>
                {matchedAgent.status.replaceAll("_", " ")}
              </AixiaBadge>
              <AixiaBadge tone={attentionReasonTone(dashboardItem?.attentionReason)}>
                {entry.source === "local_llm_runtime" ? "LLM" : "Fallback"}
              </AixiaBadge>
            </>
          : undefined,
        content: entry.content,
        footer:
          memoryIntentDetected && entry.agentId ?
            <AixiaMemoryApprovalPrompt
              suggestedMemoryText={entry.content.slice(0, 180)}
              status={approvalStatus ?? "pending"}
              density="inline"
              scope="agent"
              agentName={entry.agentName ?? matchedAgent?.displayName ?? "Agent"}
              contextLabel="Council group chat"
              onApprove={() =>
                void handleMemoryApproval(entry.id, entry.agentId!, entry.content, true)
              }
              onReject={() =>
                void handleMemoryApproval(entry.id, entry.agentId!, entry.content, false)
              }
            />
          : null,
      };
    });
  }, [
    councilMessages,
    handleMemoryApproval,
    managedAgents,
    memoryApprovalByMessageId,
    statusByAgentId,
  ]);

  const integrationReadinessBlocks = useMemo(
    () => [
      {
        label: "Local LLM",
        value: localLlmStatus.runtimeActive ? `Active · ${localLlmStatus.model}` : "Inactive / fallback",
      },
      { label: "agentmemory-style layer", value: "Database-only · approval required" },
      { label: "Hermes", value: hermesGate.runtimeActive ? "Active (server proxy)" : "Inactive / fallback" },
      { label: "CodeGraph", value: "Advisory / mock hints" },
      { label: "Supertonic voice", value: "Future / inactive" },
    ],
    [localLlmStatus, hermesGate],
  );

  const councilHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="Agent Council"
      subtitle="Group chat shell for all AgentOps agents. Staging only, manual-first."
      parentLabel="Control Center"
      parentPath="/system/agent-ops"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/agents")}>
            <Users className="mr-2 h-4 w-4" />
            Open Agents
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </>
      }
    />
  );

  if (!loading && (!isOwner || error?.toLowerCase().includes("owner access required"))) {
    return (
      <AixiaCommandPageLayout hero={councilHero}>
        <AixiaSection
          surface="command"
          title="Agent Council"
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
      hero={councilHero}
      scrollLead={
        <AixiaCommandHubMetaStrip variant="command" items={councilMetaStripItems} />
      }
    >
      <div data-testid="agentops-council-page">
        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaEmptyState
              icon={Users}
              title="Loading Agent Council"
              description="Council shell and participant roster are being prepared."
            />
          }
        >
          <AixiaSection
            surface="command"
            title="Group chat thread"
            description="One thread, individual named agent replies."
            icon={MessageSquare}
            bodyClassName="aixia-section-body--messenger"
          >
            {error && !error.toLowerCase().includes("owner access required") ? (
              <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Data issue">
                {error}
              </AixiaInfoBlock>
            ) : null}

            {managedAgents.length === 0 ? (
              <AixiaEmptyState
                icon={Users}
                title="No council participants available"
                description="Load managed agents first, then open Council again."
              />
            ) : (
              <div data-testid="agentops-council-chat-thread">
                {chatFeedback ? (
                  <AixiaInfoBlock tone="cyan" icon={MessageSquare} title="Council chat">
                    {chatFeedback}
                  </AixiaInfoBlock>
                ) : null}
                {activatingAgents ? (
                  <p className="mb-3 text-xs text-slate-400">Activating managed agents for council runtime…</p>
                ) : null}
                <AixiaMessengerShell
                  roomTitle="Agent Council"
                  chatScope="council"
                  showParticipantPicker
                  testId="agentops-council-messenger"
                  messages={councilMessengerMessages}
                  composerValue={composerValue}
                  onComposerChange={setComposerValue}
                  onSend={() => void handleCouncilSend()}
                  sending={chatSubmitting}
                  statusText={
                    localLlmStatus.runtimeActive ?
                      `Local LLM active · ${selectedLlmLabel} · ${selectedParticipantIds.length} selected`
                    : "Local LLM unavailable — fallback replies will be recorded."
                  }
                  errorText={chatError}
                  emptyTitle="Council chat ready"
                  emptyDescription="Select agents and send a message. Each selected agent replies individually."
                  participants={managedAgents.map((agent) => ({
                    agentId: agent.agentId,
                    displayName: agent.displayName,
                    appRole: agent.appRole,
                    qaSpecialty: agent.qaSpecialty,
                    status: agent.status,
                  }))}
                  selectedParticipantIds={selectedParticipantIds}
                  onSelectedParticipantIdsChange={setSelectedParticipantIds}
                  pendingAttachments={pendingAttachments}
                  onAddAttachments={(files) => void addAttachments(files)}
                  onRemoveAttachment={removeAttachment}
                  creativityMode={creativityMode}
                  onCreativityModeChange={setCreativityMode}
                  llmModelOptions={llmModelOptions}
                  selectedLlmModel={selectedLlmModel}
                  onLlmModelChange={setSelectedLlmModel}
                  onLlmModelRefresh={() => void refreshLlmCatalog()}
                  llmModelLoading={llmModelLoading}
                  llmModelRefreshing={llmModelRefreshing}
                  llmInstalledCount={llmInstalledCount}
                  showTypingIndicator={chatSubmitting}
                  typingLabel="Agents are thinking…"
                />
              </div>
            )}
          </AixiaSection>

          <AixiaProgressiveDisclosureGroup
            title="Council participants (compact)"
            description="Minimized participant roster for the council room."
            testId="agentops-council-participants"
            density="compact"
            className="aixia-progressive-disclosure--secondary"
          >
            {managedAgents.length === 0 ? (
              <p className="text-xs text-slate-500">No participants loaded.</p>
            ) : (
              managedAgents.map((agent) => (
                <div
                  key={`participant-${agent.agentId}`}
                  className="aixia-command-participant-row"
                >
                  <div>
                    <p className="aixia-command-participant-row__name">{agent.displayName}</p>
                    <p className="aixia-command-participant-row__meta">
                      {agent.appRole} · {agent.qaSpecialty}
                    </p>
                  </div>
                  <div className="aixia-command-participant-row__actions">
                    <AixiaBadge tone={managedAgentStatusTone(agent.status)}>
                      {agent.status.replaceAll("_", " ")}
                    </AixiaBadge>
                    <AixiaButton
                      variant="secondary"
                      className="text-xs px-2.5 py-1"
                      onClick={() =>
                        navigate(`/system/agent-ops/agents/${encodeURIComponent(agent.agentId)}`)
                      }
                    >
                      Open individual agent
                    </AixiaButton>
                  </div>
                </div>
              ))
            )}
          </AixiaProgressiveDisclosureGroup>

          <AixiaProgressiveDisclosureGroup
            title="Future integration readiness"
            description="Collapsed runtime placeholders for council integrations."
            density="compact"
            className="aixia-progressive-disclosure--secondary"
          >
            <AixiaSmartGrid mode="cards">
              {integrationReadinessBlocks.map((block) => (
                <AixiaValueBlock key={block.label} label={block.label} value={block.value} />
              ))}
            </AixiaSmartGrid>
          </AixiaProgressiveDisclosureGroup>

          <AixiaProgressiveDisclosureGroup
            title="Safety"
            description="Council shell guardrails and memory-approval model in this phase."
            density="compact"
            className="aixia-progressive-disclosure--secondary"
          >
            <AixiaInfoBlock tone="violet" icon={ShieldCheck} title="Manual-first safety rules">
              Local LLM {localLlmStatus.runtimeActive ? "active" : "inactive (fallback replies)"}. Hermes essential
              but inactive. Memory updates require explicit Piter Yes/No approval. Council cannot trigger Cursor, cannot
              close issues, cannot auto-approve prompts, and cannot modify production.
            </AixiaInfoBlock>
          </AixiaProgressiveDisclosureGroup>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}
