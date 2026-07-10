import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  History,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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
  AixiaMemoryApprovalPrompt,
  AixiaMessengerShell,
  AixiaSection,
  AixiaStatusBadge,
  type AixiaMemoryApprovalStatus,
  type AixiaMessengerMessage,
} from "@/components/aixia";
import { useAgentOpsMessengerAttachments } from "@/hooks/useAgentOpsMessengerAttachments";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  approveAgentOpsVerificationRequest,
  commitAgentOpsMemoryFromChatApproval,
  createAgentOpsCursorHandoff,
  prepareAgentOpsExecutionRequest,
  deferAgentOpsFinding,
  getAgentOpsActiveTop10,
  getAgentOpsBacklogSummary,
  getAgentOpsCursorHandoffHistory,
  getAgentOpsFindingDetail,
  getAgentOpsFixPlanDecisionHistory,
  getAgentOpsAgentMemory,
  getAgentOpsGeneratedFixPlans,
  getAgentOpsOwnerStatus,
  getAgentOpsVerificationRequests,
  getAgentOpsHermesAdapterStatus,
  getAgentOpsHermesReadinessGate,
  checkHermesStagingHealth,
  mapIntentToPiterMessageType,
  mapHermesModeToAgentMessageType,
  parseAgentOpsIssueAgentMessages,
  parseAgentCreativeProposal,
  recordAgentOpsCreativeProposal,
  recordAgentOpsIssueAgentMessage,
  prepareAgentOpsLessonCandidateDraft,
  runAgentOpsIssueChatAdapter,
  isAgentOpsIssueChatGlobalMemoryEnabled,
  loadGlobalApprovedMemorySnippetsForIssueChat,
  markAgentOpsFalsePositive,
  markAgentOpsInProgress,
  markAgentOpsVerificationRunning,
  recordAgentOpsCursorFixReport,
  recordAgentOpsFixPlanDecision,
  recordAgentOpsManualVerificationResult,
  recordAgentOpsVerificationCommandCopied,
  rejectAgentOpsVerificationRequest,
  requestAgentOpsFollowUpFix,
  type AgentOpsFinding,
  type AgentOpsFindingDetail,
  type AgentOpsGeneratedFixPlan,
  type AgentOpsOwnerFeedback,
  type AgentOpsAgentMockIntent,
  type AgentOpsHermesAdapterResult,
  type AgentOpsManagedAgentMemoryItem,
  type AgentOpsVerificationRequestItem,
  AGENTOPS_HERMES_ADAPTER_READINESS,
  runAgentOpsCodeGraphDiscoveryAdapter,
  getAgentOpsCodeGraphRuntimeStatus,
  getAgentOpsCodeGraphRuntimeReadinessGate,
  flattenCodeGraphMockSuggestions,
  formatCodeGraphHintsForPromptDraft,
} from "@/lib/agentops";
import { useAgentOpsLlmProbe } from "@/hooks/useAgentOpsLlmProbe";
import { useAgentOpsLlmModelSelection } from "@/hooks/useAgentOpsLlmModelSelection";

import {
  buildIssueTimeline,
  buildLifecycleRail,
  deriveExecutionState,
  executionStateLabel,
  parseCursorReportFromHistory,
  type ExecutionLifecycleContext,
} from "@/lib/agentops/executionLifecycle";
import { IssueHermesAdvisoryAssist } from "../IssueHermesAdvisoryAssist";
import { IssueLifecycleRail } from "../IssueLifecycleRail";
import { normalizeCursorPrompt } from "../normalizeCursorPrompt";

function decodeIssueCode(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readMetadata(feedback: AgentOpsOwnerFeedback): Record<string, unknown> {
  if (!feedback.metadata || typeof feedback.metadata !== "object") return {};
  return feedback.metadata as Record<string, unknown>;
}

export default function AgentOpsIssueWorkspacePage() {
  const params = useParams<{ issueCode: string }>();
  const navigate = useNavigate();
  const issueCode = decodeIssueCode(params.issueCode);
  usePageTitle(`Finding ${issueCode}`);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionalWarnings, setOptionalWarnings] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [finding, setFinding] = useState<AgentOpsFinding | null>(null);
  const [detail, setDetail] = useState<AgentOpsFindingDetail | null>(null);
  const [fixPlan, setFixPlan] = useState<AgentOpsGeneratedFixPlan | null>(null);
  const [verificationItem, setVerificationItem] = useState<AgentOpsVerificationRequestItem | null>(null);
  const [handoffHistory, setHandoffHistory] = useState<AgentOpsOwnerFeedback[]>([]);
  const [fixDecisionHistory, setFixDecisionHistory] = useState<AgentOpsOwnerFeedback[]>([]);

  const [note, setNote] = useState("");
  const [cursorReportText, setCursorReportText] = useState("");
  const [cursorFilesChanged, setCursorFilesChanged] = useState("");
  const [cursorValidationSummary, setCursorValidationSummary] = useState("");
  const [cursorValidationCommands, setCursorValidationCommands] = useState("");
  const [cursorValidationResult, setCursorValidationResult] = useState("");
  const [cursorRemainingRisks, setCursorRemainingRisks] = useState("");
  const [cursorFollowUpNeeded, setCursorFollowUpNeeded] = useState(false);
  const [readyForVerification, setReadyForVerification] = useState(true);
  const [verificationSummary, setVerificationSummary] = useState("");
  const [verificationReportPath, setVerificationReportPath] = useState("");
  const [editedCursorPrompt, setEditedCursorPrompt] = useState("");
  const cursorPromptSourceKey = useRef("");
  const [agentQuestion, setAgentQuestion] = useState("");
  const [agentIntent, setAgentIntent] = useState<AgentOpsAgentMockIntent>("clarification");
  const [agentMemoryItems, setAgentMemoryItems] = useState<AgentOpsManagedAgentMemoryItem[]>([]);
  const [globalApprovedMemoryIncludedCount, setGlobalApprovedMemoryIncludedCount] = useState(0);
  const [lastAdapterResponse, setLastAdapterResponse] = useState<AgentOpsHermesAdapterResult | null>(null);
  const issueChatGlobalMemoryEnabled = useMemo(
    () => isAgentOpsIssueChatGlobalMemoryEnabled(),
    [],
  );
  const globalApprovedMemoryAttached =
    issueChatGlobalMemoryEnabled && globalApprovedMemoryIncludedCount > 0;
  const [chatError, setChatError] = useState<string | null>(null);
  const [memoryApprovalByMessageId, setMemoryApprovalByMessageId] = useState<
    Record<string, AixiaMemoryApprovalStatus>
  >({});
  const hermesAdapterStatus = useMemo(() => getAgentOpsHermesAdapterStatus(), []);
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
  } = useAgentOpsLlmModelSelection(`issue:${issueCode}`);
  const {
    pendingAttachments,
    readyAttachments,
    attachmentDescriptions,
    addAttachments,
    removeAttachment,
    clearAttachments,
  } = useAgentOpsMessengerAttachments("issue", issueCode);
  const hermesReadinessGate = useMemo(() => getAgentOpsHermesReadinessGate(), []);
  const hermesStagingHealth = useMemo(() => checkHermesStagingHealth(), []);
  const codegraphRuntimeStatus = useMemo(() => getAgentOpsCodeGraphRuntimeStatus(), []);
  const codegraphRuntimeGate = useMemo(() => getAgentOpsCodeGraphRuntimeReadinessGate(), []);
  const codegraphDiscovery = useMemo(() => {
    if (!finding) return null;
    return runAgentOpsCodeGraphDiscoveryAdapter({
      issueCode,
      title: finding.title ?? null,
      route: finding.route ?? null,
      module: finding.module ?? null,
      category: finding.category ?? null,
      severity: finding.severity ?? null,
      summary: [finding.title, finding.problem].filter(Boolean).join(" — ") || null,
      evidence: finding.evidence_summary ?? null,
      likelyRootCause: finding.likely_root_cause ?? null,
      recommendedFixStrategy:
        finding.recommended_fix_strategy ?? fixPlan?.preferredFixStrategy ?? null,
    });
  }, [finding, issueCode, fixPlan?.preferredFixStrategy]);

  const codegraphFlatSuggestions = useMemo(
    () => (codegraphDiscovery ? flattenCodeGraphMockSuggestions(codegraphDiscovery) : []),
    [codegraphDiscovery],
  );

  const loadIssue = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!issueCode) {
      setError("Missing issue code.");
      if (!silent) setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
      setOptionalWarnings([]);
      setFeedback(null);
    }

    const warnings: string[] = [];

    const ownerResult = await getAgentOpsOwnerStatus();
    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setError(ownerResult.error ?? "AgentOps Owner access required.");
      setLoading(false);
      return;
    }

    const [activeResult, backlogResult, verificationResult, fixPlansResult] = await Promise.all([
      getAgentOpsActiveTop10(),
      getAgentOpsBacklogSummary(),
      getAgentOpsVerificationRequests(),
      getAgentOpsGeneratedFixPlans(),
    ]);

    if (activeResult.error || backlogResult.error || verificationResult.error) {
      setError(
        activeResult.error ??
          backlogResult.error ??
          verificationResult.error ??
          "Could not load issue context.",
      );
      setLoading(false);
      return;
    }

    if (fixPlansResult.error) {
      warnings.push(`Fix plan summary unavailable: ${fixPlansResult.error}`);
    }

    const activeFinding = (activeResult.data ?? []).find((item) => item.issue_code === issueCode) ?? null;
    const backlogFinding =
      (backlogResult.data?.preview ?? []).find((item) => item.issue_code === issueCode) ?? null;
    const verificationMatch = (verificationResult.data ?? []).find((item) => item.issueCode === issueCode) ?? null;
    const selectedFinding = activeFinding ?? backlogFinding;
    setVerificationItem(verificationMatch);
    setFixPlan(
      fixPlansResult.error
        ? null
        : (fixPlansResult.data?.plans ?? []).find((item) => item.issueCode === issueCode) ?? null,
    );

    let findingId: string | null = selectedFinding?.id ?? verificationMatch?.findingId ?? null;
    let detailFinding: AgentOpsFinding | null = selectedFinding;
    let detailPayload: AgentOpsFindingDetail | null = null;

    if (findingId) {
      const detailResult = await getAgentOpsFindingDetail(findingId);
      if (detailResult.error) {
        setError(detailResult.error);
        setLoading(false);
        return;
      }
      detailPayload = detailResult.data ?? null;
      detailFinding = detailPayload?.finding ?? detailFinding;
      findingId = detailFinding?.id ?? findingId;
    }

    if (!detailFinding) {
      setFinding(null);
      setDetail(null);
      setHandoffHistory([]);
      setFixDecisionHistory([]);
      setAgentMemoryItems([]);
      setError("Issue not found in current staging issue sources.");
      setLoading(false);
      return;
    }

    const [handoffResult, fixHistoryResult] = await Promise.all([
      getAgentOpsCursorHandoffHistory(issueCode),
      getAgentOpsFixPlanDecisionHistory(issueCode),
    ]);

    if (handoffResult.error) {
      warnings.push(`Cursor handoff history unavailable: ${handoffResult.error}`);
    }
    if (fixHistoryResult.error) {
      warnings.push(`Fix plan decision history unavailable: ${fixHistoryResult.error}`);
    }

    setFinding(detailFinding);
    setDetail(detailPayload);
    setHandoffHistory(handoffResult.error ? [] : (handoffResult.data ?? []));
    setFixDecisionHistory(fixHistoryResult.error ? [] : (fixHistoryResult.data ?? []));
    setOptionalWarnings(warnings);

    if (detailFinding.agent_id) {
      const memoryResult = await getAgentOpsAgentMemory(detailFinding.agent_id);
      setAgentMemoryItems(memoryResult.data ?? []);
    } else {
      setAgentMemoryItems([]);
    }

    if (issueChatGlobalMemoryEnabled) {
      const globalMemoryResult = await loadGlobalApprovedMemorySnippetsForIssueChat();
      if (!globalMemoryResult.error && globalMemoryResult.data) {
        setGlobalApprovedMemoryIncludedCount(globalMemoryResult.data.includedCount);
      } else {
        setGlobalApprovedMemoryIncludedCount(0);
      }
    } else {
      setGlobalApprovedMemoryIncludedCount(0);
    }

    setLoading(false);
  }, [issueCode, issueChatGlobalMemoryEnabled]);

  useEffect(() => {
    void loadIssue();
  }, [loadIssue]);

  const latestHandoffId = useMemo(() => {
    for (const row of handoffHistory) {
      const meta = readMetadata(row);
      if (typeof meta.handoffId === "string" && meta.handoffId) return meta.handoffId;
    }
    return verificationItem?.handoffId ?? fixPlan?.latestCursorHandoffId ?? null;
  }, [handoffHistory, verificationItem, fixPlan]);

  const rawCursorPrompt = fixPlan?.cursorPrompt ?? finding?.cursor_prompt ?? "";

  const normalizedCursorPrompt = useMemo(
    () =>
      normalizeCursorPrompt({
        rawPrompt: rawCursorPrompt,
        finding,
        fixPlan,
        issueCode,
      }),
    [rawCursorPrompt, finding, fixPlan, issueCode],
  );

  useEffect(() => {
    const sourceKey = `${issueCode}:${fixPlan?.planId ?? ""}:${rawCursorPrompt.length}:${rawCursorPrompt.slice(0, 80)}`;
    if (cursorPromptSourceKey.current === sourceKey) return;
    cursorPromptSourceKey.current = sourceKey;
    setEditedCursorPrompt(normalizedCursorPrompt);
  }, [issueCode, fixPlan?.planId, rawCursorPrompt, normalizedCursorPrompt]);

  const approvedCursorPrompt = editedCursorPrompt.trim();

  const lifecycleContext = useMemo<ExecutionLifecycleContext>(
    () => ({
      issueCode,
      finding,
      fixPlan,
      verificationItem,
      handoffHistory,
      fixDecisionHistory,
      ownerFeedback: detail?.ownerFeedback ?? [],
      approvedPrompt: approvedCursorPrompt,
    }),
    [
      issueCode,
      finding,
      fixPlan,
      verificationItem,
      handoffHistory,
      fixDecisionHistory,
      detail?.ownerFeedback,
      approvedCursorPrompt,
    ],
  );

  const executionState = useMemo(
    () => deriveExecutionState(lifecycleContext),
    [lifecycleContext],
  );

  const lifecycleRailSteps = useMemo(
    () => buildLifecycleRail(lifecycleContext, executionState),
    [lifecycleContext, executionState],
  );

  const issueTimeline = useMemo(
    () => buildIssueTimeline(lifecycleContext),
    [lifecycleContext],
  );

  const latestCursorReport = useMemo(
    () => parseCursorReportFromHistory(handoffHistory),
    [handoffHistory],
  );

  const agentMessages = useMemo(
    () => parseAgentOpsIssueAgentMessages(detail?.ownerFeedback ?? [], issueCode),
    [detail?.ownerFeedback, issueCode],
  );

  const reportingAgentLabel = finding?.agent_id ?? "Not linked yet";

  const executionPrepared = useMemo(
    () =>
      [
        "execution_request_prepared",
        "cursor_prompt_copied",
        "cursor_working_manual",
        "cursor_report_received",
        "verification_requested",
        "verification_running_manual",
        "verification_passed",
        "verification_failed",
        "follow_up_required",
        "closed_verified",
        "reopened",
      ].includes(executionState),
    [executionState],
  );

  const nextRecommendedAction = useMemo(() => {
    const currentStep = lifecycleRailSteps.find((step) => step.status === "current");
    if (currentStep) return currentStep.nextAction;
    if (!finding) return "Load issue";
    return "Review summary and decide next manual step";
  }, [finding, lifecycleRailSteps]);

  const runAction = useCallback(
    async (action: () => Promise<{ error: string | null; data: unknown }>, successMessage: string) => {
      setSubmitting(true);
      setFeedback(null);
      const result = await action();
      setSubmitting(false);
      if (result.error) {
        setFeedback(result.error);
        return;
      }
      setFeedback(successMessage);
      await loadIssue();
    },
    [loadIssue],
  );

  const handleAskAgent = useCallback(async () => {
    const question = agentQuestion.trim();
    if (!question || !issueCode) return;

    setSubmitting(true);
    setFeedback(null);
    setChatError(null);

    const piterResult = await recordAgentOpsIssueAgentMessage({
      issueCode,
      findingId: finding?.id ?? null,
      agentId: finding?.agent_id ?? null,
      sender: "piter",
      messageType: mapIntentToPiterMessageType(agentIntent),
      content: question,
      source: "issue_workspace",
      metadata: { intent: agentIntent, attachments: readyAttachments },
    });

    if (piterResult.error) {
      setSubmitting(false);
      setFeedback(piterResult.error);
      return;
    }

    let chatGlobalSnippets: string[] = [];
    let chatGlobalIncludedCount = 0;
    if (issueChatGlobalMemoryEnabled) {
      const globalMemoryResult = await loadGlobalApprovedMemorySnippetsForIssueChat();
      if (!globalMemoryResult.error && globalMemoryResult.data) {
        chatGlobalSnippets = globalMemoryResult.data.snippets;
        chatGlobalIncludedCount = globalMemoryResult.data.includedCount;
        setGlobalApprovedMemoryIncludedCount(chatGlobalIncludedCount);
      }
    }

    const chatGlobalAttached = issueChatGlobalMemoryEnabled && chatGlobalIncludedCount > 0;

    const adapterResult = await runAgentOpsIssueChatAdapter({
      issueCode,
      question,
      model: selectedLlmModel,
      intent: agentIntent,
      attachmentDescriptions,
      issueSummary: [finding?.title, finding?.problem].filter(Boolean).join(" — "),
      evidence: finding?.evidence_summary ?? "",
      fixPlan: fixPlan?.readableSummary ?? finding?.recommended_fix_strategy ?? "",
      cursorPrompt: approvedCursorPrompt,
      executionState,
      reportingAgent: reportingAgentLabel,
      agentMemory: agentMemoryItems.filter((item) => item.active).map((item) => item.memoryText),
      timeline: issueTimeline.slice(0, 8).map((event) => `${event.title}: ${event.summary}`),
      route: finding?.route ?? null,
      category: finding?.category ?? null,
      severity: finding?.severity ?? null,
      module: finding?.module ?? null,
      likelyRootCause: finding?.likely_root_cause ?? null,
      recommendedFixStrategy: finding?.recommended_fix_strategy ?? fixPlan?.preferredFixStrategy ?? null,
      title: finding?.title ?? null,
      latestCursorReport: latestCursorReport?.reportText ?? null,
      verificationStatus: verificationItem?.requestStatus ?? null,
      globalApprovedMemorySnippets: chatGlobalAttached ? chatGlobalSnippets : undefined,
      globalApprovedMemoryAttached: chatGlobalAttached,
      globalApprovedMemoryIncludedCount: chatGlobalAttached ? chatGlobalIncludedCount : 0,
    });

    const parsed = parseAgentCreativeProposal(adapterResult.response);
    if (parsed.proposal && finding?.agent_id) {
      await recordAgentOpsCreativeProposal({
        agentId: finding.agent_id,
        proposalType: parsed.proposal.proposalType,
        title: parsed.proposal.title,
        summary: parsed.proposal.summary,
        suggestedRoute: parsed.proposal.suggestedRoute,
        confidence: parsed.proposal.confidence,
        chatScope: "issue",
        roomId: issueCode,
      });
    }

    const usedLiveResponse =
      adapterResult.source === "local_llm" || adapterResult.source === "hermes_runtime";
    const agentResult = await recordAgentOpsIssueAgentMessage({
      issueCode,
      findingId: finding?.id ?? null,
      agentId: finding?.agent_id ?? null,
      sender: usedLiveResponse ? "reporting_agent" : "reporting_agent_mock",
      messageType: mapHermesModeToAgentMessageType(adapterResult.mode),
      content: parsed.cleanedResponse || adapterResult.response,
      source:
        adapterResult.source === "hermes_runtime" ? "hermes_runtime"
        : usedLiveResponse ? "local_llm_runtime"
        : "mock_response_layer",
      metadata: {
        intent: agentIntent,
        adapterSource: adapterResult.source,
        hermesRuntimeCalled: adapterResult.hermesRuntimeCalled,
        shouldFallbackToMock: adapterResult.shouldFallbackToMock,
        requestId: adapterResult.requestId,
        hermesMode: adapterResult.mode,
        suggestedPromptChanges: adapterResult.promptSuggestions,
        riskNotes: adapterResult.riskNotes,
        nextRecommendedAction: adapterResult.nextRecommendedAction,
        confidence: adapterResult.confidence,
        limitations: adapterResult.limitations,
        safetyFlags: adapterResult.safetyFlags,
        piterMessageId: piterResult.data?.messageId ?? null,
        localLlmCalled: adapterResult.localLlmCalled,
        memoryIntentDetected: adapterResult.memoryIntentDetected,
        memorySourceText: adapterResult.memoryIntentDetected ? question : null,
        mockResponseLayer: !usedLiveResponse,
        noLiveAiResponse: !usedLiveResponse,
        noHermes: !adapterResult.hermesRuntimeCalled,
        creativeProposal: parsed.proposal,
        globalMemoryAttached: chatGlobalAttached,
        globalMemorySnippetCount: chatGlobalAttached ? chatGlobalIncludedCount : 0,
        globalMemoryPreviewOnly: chatGlobalAttached,
      },
    });

    setSubmitting(false);

    if (agentResult.error) {
      setChatError(agentResult.error);
      setFeedback(agentResult.error);
      return;
    }

    setLastAdapterResponse(adapterResult);
    setAgentQuestion("");
    clearAttachments();
    if (!usedLiveResponse) {
      setChatError(
        adapterResult.limitations ||
          "Local LLM and Hermes are unavailable. Start Ollama with: ollama serve",
      );
    }
    setFeedback(
      adapterResult.source === "hermes_runtime" ?
        "Hermes advisory response recorded."
      : usedLiveResponse ?
        "Local LLM response recorded."
      : "Mock fallback recorded (Hermes/local LLM unavailable).",
    );
    await loadIssue({ silent: true });
  }, [
    agentIntent,
    agentMemoryItems,
    agentQuestion,
    attachmentDescriptions,
    approvedCursorPrompt,
    clearAttachments,
    executionState,
    finding,
    fixPlan,
    issueCode,
    issueTimeline,
    latestCursorReport,
    loadIssue,
    readyAttachments,
    reportingAgentLabel,
    selectedLlmModel,
    verificationItem,
    issueChatGlobalMemoryEnabled,
  ]);

  const handleIssueMemoryApproval = useCallback(
    async (messageId: string, content: string, approved: boolean) => {
      const agentId = finding?.agent_id;
      if (!agentId) {
        setChatError("No reporting agent linked for memory approval.");
        return;
      }
      setMemoryApprovalByMessageId((current) => ({
        ...current,
        [messageId]: approved ? "saved" : "rejected",
      }));
      const result = await commitAgentOpsMemoryFromChatApproval({
        agentId,
        content,
        chatScope: "issue",
        roomId: issueCode,
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
    [finding?.agent_id, issueCode],
  );

  const issueMessengerMessages = useMemo((): AixiaMessengerMessage[] => {
    return agentMessages.map((message) => {
      const isPiter = message.sender === "piter";
      const memoryIntentDetected = message.metadata.memoryIntentDetected === true;
      const approvalStatus =
        memoryApprovalByMessageId[message.id] ?? (memoryIntentDetected ? "pending" : undefined);
      const memorySourceText =
        typeof message.metadata.memorySourceText === "string" ?
          message.metadata.memorySourceText
        : message.content;
      const sourceLabel =
        message.source === "hermes_runtime" ? "Hermes"
        : message.source === "local_llm_runtime" ? "LLM"
        : message.sender === "reporting_agent_mock" ? "Fallback"
        : null;

      if (isPiter) {
        return {
          id: message.id,
          senderType: "user",
          senderName: "Piter",
          content: message.content,
        };
      }

      return {
        id: message.id,
        senderType: "agent",
        senderName: "Reporting agent",
        senderRole: message.messageType.replaceAll("_", " "),
        badges: sourceLabel ? <AixiaBadge tone="cyan">{sourceLabel}</AixiaBadge> : undefined,
        content: message.content,
        footer:
          memoryIntentDetected && finding?.agent_id ?
            <AixiaMemoryApprovalPrompt
              suggestedMemoryText={memorySourceText.slice(0, 180)}
              status={approvalStatus ?? "pending"}
              density="inline"
              scope="issue"
              agentName={reportingAgentLabel}
              contextLabel={`Issue ${issueCode}`}
              onApprove={() =>
                void handleIssueMemoryApproval(message.id, memorySourceText, true)
              }
              onReject={() =>
                void handleIssueMemoryApproval(message.id, memorySourceText, false)
              }
            />
          : null,
      };
    });
  }, [
    agentMessages,
    finding?.agent_id,
    handleIssueMemoryApproval,
    issueCode,
    memoryApprovalByMessageId,
    reportingAgentLabel,
  ]);

  const showPostCursorReview =
    executionPrepared ||
    !!latestCursorReport ||
    executionState === "verification_requested" ||
    executionState === "verification_running_manual" ||
    executionState === "verification_passed" ||
    executionState === "verification_failed" ||
    executionState === "follow_up_required" ||
    executionState === "closed_verified" ||
    executionState === "reopened";

  const showVerificationPanel =
    !!verificationItem ||
    executionState === "verification_requested" ||
    executionState === "verification_running_manual" ||
    executionState === "verification_passed" ||
    executionState === "verification_failed" ||
    executionState === "follow_up_required";

  const showClosurePanel =
    executionState === "verification_passed" ||
    executionState === "verification_failed" ||
    executionState === "follow_up_required" ||
    executionState === "closed_verified" ||
    executionState === "reopened";

  const chatRoleLabel = latestCursorReport
    ? "Post-fix review agent"
    : "Prompt-solving agent";

  const lessonDraftForIssue = useMemo(() => {
    const fromFeedback = (detail?.ownerFeedback ?? []).find((row) => {
      const metadata = readMetadata(row);
      return metadata.action === "lesson_candidate_draft" && metadata.issueCode === issueCode;
    });
    if (fromFeedback) {
      const metadata = readMetadata(fromFeedback);
      const draftMeta =
        metadata.lessonCandidateDraft && typeof metadata.lessonCandidateDraft === "object"
          ? (metadata.lessonCandidateDraft as Record<string, unknown>)
          : metadata;
      return {
        lessonId:
          typeof draftMeta.lessonId === "string" && draftMeta.lessonId.trim()
            ? draftMeta.lessonId.trim()
            : null,
        approvalStatus:
          typeof draftMeta.approvalStatus === "string" && draftMeta.approvalStatus.trim()
            ? draftMeta.approvalStatus.trim()
            : "pending_review",
      };
    }
    return null;
  }, [detail?.ownerFeedback, issueCode]);

  const isVerifiedFixedLifecycle =
    finding?.status === "Verified Fixed" ||
    executionState === "closed_verified" ||
    verificationItem?.latestVerificationResult === "verified_fixed";

  const isNotFound = !loading && !finding && !!error?.toLowerCase().includes("not found");

  const issueMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first issue workspace on staging data.",
        tone: "amber" as const,
      },
      {
        key: "runtime",
        label: "Runtime mode",
        value: "Manual-first",
        detail: "No automatic Cursor, Hermes, or scheduler execution.",
        tone: "cyan" as const,
      },
      {
        key: "issue",
        label: "Issue code",
        value: issueCode || "—",
        detail: "Canonical issue identifier for this workspace.",
        tone: "neutral" as const,
      },
      {
        key: "scope",
        label: "Workspace scope",
        value: "Issue-solving workbench",
        detail: "Lifecycle rail, agent chat, prompt, verification, and closure.",
        tone: "violet" as const,
      },
    ],
    [issueCode],
  );

  const issueCommandMetrics = useMemo(
    () => [
      {
        key: "severity",
        title: "Severity",
        value: loading ? "Checking…" : (finding?.severity ?? "—"),
        subtitle: finding?.category ?? "Category pending",
        icon: AlertTriangle,
        tone: "rose" as const,
      },
      {
        key: "status",
        title: "Issue status",
        value: loading ? "Checking…" : (finding?.status ?? "—"),
        subtitle: finding?.queue_state?.replaceAll("_", " ") ?? "Queue state",
        icon: ShieldCheck,
        tone: "amber" as const,
      },
      {
        key: "execution",
        title: "Execution state",
        value: loading ? "Checking…" : executionStateLabel(executionState),
        subtitle: nextRecommendedAction,
        icon: Activity,
        tone: "cyan" as const,
      },
      {
        key: "timeline",
        title: "Timeline events",
        value: loading ? "Checking…" : String(issueTimeline.length),
        subtitle: "Owner, cursor, and verification signals",
        icon: History,
        tone: "indigo" as const,
      },
      {
        key: "messages",
        title: "Agent messages",
        value: loading ? "Checking…" : String(agentMessages.length),
        subtitle: "Issue workspace chat thread",
        icon: Sparkles,
        tone: "emerald" as const,
      },
      {
        key: "fix-plan",
        title: "Fix plan",
        value: loading ? "Checking…" : (fixPlan?.planStatus?.replaceAll("_", " ") ?? "None"),
        subtitle: fixPlan?.planId ? `Plan ${fixPlan.planId}` : "No generated plan loaded",
        icon: CheckCircle2,
        tone: "violet" as const,
      },
    ],
    [
      agentMessages.length,
      executionState,
      finding?.category,
      finding?.queue_state,
      finding?.severity,
      finding?.status,
      fixPlan?.planId,
      fixPlan?.planStatus,
      issueTimeline.length,
      loading,
      nextRecommendedAction,
    ],
  );

  const issueHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="Issue Workspace"
      title={finding?.title ?? issueCode ?? "Issue Workspace"}
      subtitle={
        finding
          ? `${finding.issue_code} · Manual-first issue-solving workbench`
          : "Loading issue details"
      }
      parentLabel="Issues"
      parentPath="/system/agent-ops/issues"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Issues
          </AixiaButton>
          <AixiaButton variant="secondary" disabled={loading || submitting} onClick={() => void loadIssue()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
          {finding ? <AixiaStatusBadge value={finding.status} /> : null}
        </>
      }
    >
      <AixiaCommandMetrics items={issueCommandMetrics} />
    </AixiaHero>
  );

  if (!issueCode) {
    return (
      <AixiaCommandPageLayout hero={issueHero}>
        <AixiaSection surface="command" title="Issue Workspace" description="Missing route parameter" icon={AlertTriangle}>
          <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Missing issue code">
            Route parameter `issueCode` is required.
          </AixiaInfoBlock>
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  if (isNotFound) {
    return (
      <AixiaCommandPageLayout
        hero={issueHero}
        scrollLead={<AixiaCommandHubMetaStrip variant="command" items={issueMetaStripItems} />}
      >
        <AixiaSection surface="command" title="Issue not found" description="Unknown or unavailable issue code." icon={AlertTriangle}>
          <AixiaEmptyState
            icon={AlertTriangle}
            title="Issue not found"
            description={error ?? "This issue code is not available in current staging issue sources."}
          />
          <div className="mt-4">
            <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
              Back to Issues
            </AixiaButton>
          </div>
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  return (
    <AixiaCommandPageLayout
      hero={issueHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={issueMetaStripItems} />}
    >
      <div data-testid="agentops-issue-workspace" className="flex flex-col gap-6">
        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaSection
              surface="command"
              title="Issue workspace"
              description="Loading issue detail, lifecycle, and workbench data."
              icon={History}
            >
              <AixiaEmptyState
                icon={History}
                title="Loading issue workspace"
                description="Issue detail, fix plan, verification, and timeline are being prepared."
              />
            </AixiaSection>
          }
        >
          <>
            {error ? (
              <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Could not load issue workspace">
                {error}
              </AixiaInfoBlock>
            ) : null}
            {!error && optionalWarnings.length > 0 ? (
              <AixiaInfoBlock tone="gold" icon={AlertTriangle} title="Some optional workspace data is unavailable">
                <ul className="list-disc space-y-1 pl-5">
                  {optionalWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AixiaInfoBlock>
            ) : null}
            {feedback ? (
              <AixiaInfoBlock tone="emerald" icon={CheckCircle2} title="Update saved">
                {feedback}
              </AixiaInfoBlock>
            ) : null}

            {finding ? (
              <div data-testid="agentops-lifecycle-rail">
                <AixiaSection
                surface="command"
                title="Lifecycle rail"
                description="Manual-first path from issue discovery to closure."
                icon={History}
              >
                <IssueLifecycleRail
                  steps={lifecycleRailSteps}
                  executionStateLabel={executionStateLabel(executionState)}
                />
                </AixiaSection>
              </div>
            ) : null}

            {finding ? (
              <div data-testid="agentops-issue-hermes-advisory">
                <AixiaSection
                  surface="command"
                  title="Hermes Advisory Assist"
                  description="Ask Hermes for issue advisory, Cursor prompt review, or fix report verification guidance. No writes, no verification, no tools."
                  icon={Sparkles}
                >
                  <IssueHermesAdvisoryAssist
                    issueCode={issueCode}
                    finding={finding}
                    fixPlan={fixPlan}
                    approvedCursorPrompt={approvedCursorPrompt}
                    executionStateLabel={executionStateLabel(executionState)}
                  />
                </AixiaSection>
              </div>
            ) : null}

            <div data-testid="agentops-issue-workbench">
              <AixiaSection
              surface="command"
              title="Issue-solving workbench"
              description="Chat with the reporting agent and prepare the Cursor prompt in one place."
              icon={Sparkles}
            >
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
                <div
                  data-testid="agentops-issue-context"
                  className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
                >
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-slate-400">What is wrong</p>
                    <p className="mt-1 text-sm text-white">{finding?.problem ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-slate-400">Expected behavior</p>
                    <p className="mt-1 text-sm text-white">{finding?.expected_result ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-slate-400">Why it matters</p>
                    <p className="mt-1 text-sm text-white">
                      {finding?.saas_impact ?? finding?.security_impact ?? finding?.ai_mcp_impact ?? "Review issue impact in details."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                <div
                  data-testid="agentops-agent-chat"
                  className="min-w-0 aixia-section-body--messenger"
                >
                    {globalApprovedMemoryAttached ? (
                      <div
                        className="mb-2 flex flex-wrap items-center gap-2"
                        data-testid="agentops-issue-global-memory-badge"
                      >
                        <AixiaBadge tone="amber">
                          Global memory preview attached ({globalApprovedMemoryIncludedCount})
                        </AixiaBadge>
                        <span className="text-xs text-slate-400">
                          Metadata only · not official source-of-truth · Hermes preview context
                        </span>
                      </div>
                    ) : null}
                    <AixiaMessengerShell
                      roomTitle={`Issue agent · ${issueCode}`}
                      chatScope="issue"
                      testId="agentops-issue-messenger"
                      messages={issueMessengerMessages}
                      composerValue={agentQuestion}
                      onComposerChange={setAgentQuestion}
                      onSend={() => void handleAskAgent()}
                      sending={submitting}
                      statusText={`${chatRoleLabel} · ${selectedLlmLabel} · Hermes ${hermesAdapterStatus.runtimeActive ? "ready" : "fallback"} · LLM ${localLlmStatus.runtimeActive ? "active" : "inactive"}${globalApprovedMemoryAttached ? ` · Global memory preview attached (${globalApprovedMemoryIncludedCount})` : ""}`}
                      errorText={chatError}
                      emptyTitle="Issue agent chat"
                      emptyDescription="Ask the reporting agent for clarification, prompt improvements, or next steps."
                      composerPresets={[
                        { label: "Clarify issue", value: "clarification" },
                        { label: "Improve prompt", value: "prompt_improvement" },
                        { label: "Review risks", value: "risk_review" },
                        { label: "Next step", value: "next_step" },
                      ]}
                      onPresetSelect={(value) =>
                        setAgentIntent(value as AgentOpsAgentMockIntent)
                      }
                      pendingAttachments={pendingAttachments}
                      onAddAttachments={(files) => void addAttachments(files)}
                      onRemoveAttachment={removeAttachment}
                      showTypingIndicator={submitting}
                      typingLabel="Reporting agent is thinking…"
                      llmModelOptions={llmModelOptions}
                      selectedLlmModel={selectedLlmModel}
                      onLlmModelChange={setSelectedLlmModel}
                      onLlmModelRefresh={() => void refreshLlmCatalog()}
                      llmModelLoading={llmModelLoading}
                      llmModelRefreshing={llmModelRefreshing}
                      llmInstalledCount={llmInstalledCount}
                    />
                  </div>

                  <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Cursor prompt / execution
                      </p>
                      <p className="text-xs text-slate-500">{executionStateLabel(executionState)}</p>
                    </div>
                    {executionPrepared ? (
                      <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-2">
                        <p className="text-xs text-cyan-100">
                          Execution request prepared. Prompt remains editable until manual handoff decisions.
                        </p>
                      </div>
                    ) : null}
                    <textarea
                      data-testid="agentops-cursor-prompt-editor"
                      value={approvedCursorPrompt}
                      onChange={(event) => setEditedCursorPrompt(event.target.value)}
                      placeholder="No prompt available yet. Ask agent or review fix plan details."
                      className="h-[280px] w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-slate-200"
                      spellCheck={false}
                    />
                    <div data-testid="agentops-prompt-actions" className="flex flex-wrap gap-2">
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={!lastAdapterResponse?.promptSuggestions}
                        onClick={() => {
                          if (!lastAdapterResponse?.promptSuggestions) return;
                          setEditedCursorPrompt((current) =>
                            current.trim()
                              ? `${current.trim()}\n\n---\n\n${lastAdapterResponse.promptSuggestions}`
                              : lastAdapterResponse.promptSuggestions,
                          );
                          setFeedback("Suggestion appended to local prompt draft only.");
                        }}
                      >
                        Append Suggestion
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={!approvedCursorPrompt}
                        onClick={async () => {
                          if (!approvedCursorPrompt) return;
                          await navigator.clipboard.writeText(approvedCursorPrompt);
                          setFeedback("Cursor prompt copied.");
                        }}
                      >
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Copy Prompt
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={!fixPlan || !approvedCursorPrompt || submitting}
                        onClick={() =>
                          void runAction(
                            () =>
                              prepareAgentOpsExecutionRequest({
                                issueCode,
                                planId: fixPlan?.planId ?? "unknown-plan",
                                cursorPrompt: approvedCursorPrompt,
                                ownerApproved: true,
                                note: note || "Approve & Prepare Execution Request",
                              }),
                            "Execution request prepared (manual-first — Cursor not started).",
                          )
                        }
                      >
                        Approve Prompt
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={!fixPlan || !approvedCursorPrompt || submitting}
                        onClick={() =>
                          void runAction(
                            () =>
                              prepareAgentOpsExecutionRequest({
                                issueCode,
                                planId: fixPlan?.planId ?? "unknown-plan",
                                cursorPrompt: approvedCursorPrompt,
                                ownerApproved: true,
                                note: note || "Prepare execution request",
                              }),
                            "Execution request prepared (manual-first — Cursor not started).",
                          )
                        }
                      >
                        Prepare Execution Request
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={!fixPlan || !approvedCursorPrompt || submitting}
                        onClick={() =>
                          void runAction(
                            () =>
                              createAgentOpsCursorHandoff({
                                issueCode,
                                planId: fixPlan?.planId ?? "unknown-plan",
                                cursorPrompt: approvedCursorPrompt,
                                status: "copied_manually",
                                ownerApproved: true,
                                note: note || "Prompt copied manually.",
                              }),
                            "Prompt copy status recorded.",
                          )
                        }
                      >
                        Mark Prompt Copied
                      </AixiaButton>
                    </div>
                    <details className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <summary className="cursor-pointer text-xs text-slate-400">
                        Optional action note (used by workflow actions)
                      </summary>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Optional note for actions in this workspace"
                        className="mt-2 h-16 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      />
                    </details>
                  </div>
                </div>
              </div>
              </AixiaSection>
            </div>

            <details
              data-testid="agentops-workspace-secondary-details"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                Supporting artifacts (evidence, fix plan, verification, timeline)
              </summary>
              <div className="mt-4 space-y-6">
              <details
                data-testid="agentops-evidence-disclosure"
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                Evidence / Source
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-400">Evidence summary</p>
                <p className="text-sm text-white">{finding?.evidence_summary ?? "—"}</p>
                <p className="text-xs text-slate-400">Evidence files</p>
                {detail?.evidenceFiles?.length ? (
                  <ul className="space-y-1 text-xs text-slate-300">
                    {detail.evidenceFiles.map((item) => (
                      <li key={item.id}>
                        <code>{item.file_path}</code> — {item.summary ?? item.evidence_type}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No linked evidence paths.</p>
                )}
              </div>
              </details>

              <details
                data-testid="agentops-fix-plan-disclosure"
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                Fix plan details
              </summary>
              <div className="mt-3 space-y-3">
                {fixPlan ? (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-400">Readable summary</p>
                      <p className="mt-1 text-sm text-white">{fixPlan.readableSummary}</p>
                      <p className="mt-2 text-xs text-slate-400">Plan status: {fixPlan.planStatus}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={submitting}
                        onClick={() =>
                          void runAction(
                            () =>
                              recordAgentOpsFixPlanDecision({
                                issueCode,
                                planId: fixPlan.planId,
                                decision: "approve_fix_plan",
                                ownerApproved: true,
                                note: note || "Approved in Issue Workspace.",
                              }),
                            "Fix plan approved.",
                          )
                        }
                      >
                        Approve Plan
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={submitting}
                        onClick={() =>
                          void runAction(
                            () =>
                              recordAgentOpsFixPlanDecision({
                                issueCode,
                                planId: fixPlan.planId,
                                decision: "reject_fix_plan",
                                ownerApproved: true,
                                note: note || "Rejected in Issue Workspace.",
                              }),
                            "Fix plan rejected.",
                          )
                        }
                      >
                        Reject
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        disabled={submitting}
                        onClick={() =>
                          void runAction(
                            () =>
                              recordAgentOpsFixPlanDecision({
                                issueCode,
                                planId: fixPlan.planId,
                                decision: "request_better_plan",
                                ownerApproved: true,
                                note: note || "Needs better plan.",
                              }),
                            "Needs better plan recorded.",
                          )
                        }
                      >
                        Needs Better Plan
                      </AixiaButton>
                    </div>
                  </>
                ) : (
                  <AixiaInfoBlock tone="gold" icon={AlertTriangle} title="No generated fix plan found">
                    This issue is not present in current generated fix plan summary.
                  </AixiaInfoBlock>
                )}
              </div>
              </details>

              <details
                data-testid="agentops-codegraph-details"
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                CodeGraph technical details
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-300">
                  CodeGraph hints prepared in background ({codegraphRuntimeStatus.runtimeMode === "mock_static_hints" ? "mock static hints" : codegraphRuntimeStatus.runtimeMode}).
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <p className="text-xs text-slate-400">Runtime: {codegraphRuntimeStatus.runtimeActive ? "Active (read-only)" : "Not connected"}</p>
                  <p className="text-xs text-slate-400">Owner review required: Yes</p>
                  <p className="text-xs text-slate-400">Gate state: {codegraphRuntimeGate.currentState.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-400">Fallback: {codegraphRuntimeStatus.fallbackMode.replace(/_/g, " ")}</p>
                </div>
                {codegraphFlatSuggestions.length > 0 ? (
                  <>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {codegraphFlatSuggestions.slice(0, 8).map(({ group, item }, index) => (
                        <li key={`${group}-${item.label}-${index}`}>
                          [{group}] {item.label} — {item.confidence}
                        </li>
                      ))}
                    </ul>
                    <AixiaButton
                      variant="secondary"
                      className="text-xs px-3 py-1.5"
                      disabled={!codegraphDiscovery}
                      onClick={() => {
                        if (!codegraphDiscovery) return;
                        const block = formatCodeGraphHintsForPromptDraft(codegraphDiscovery);
                        setEditedCursorPrompt((current) =>
                          current.trim() ? `${current.trim()}\n\n${block}` : block,
                        );
                        setFeedback("CodeGraph hints appended to prompt draft.");
                      }}
                    >
                      Append CodeGraph Hints to Prompt
                    </AixiaButton>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">No hints generated for this issue.</p>
                )}
              </div>
              </details>

            <details
              data-testid="agentops-post-cursor-review"
              open={showPostCursorReview}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                Post-Cursor Review (report and verification)
              </summary>
              <div className="mt-3 space-y-4">
                {latestCursorReport ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Cursor status</p>
                      <AixiaBadge tone="cyan">Report received</AixiaBadge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {latestCursorReport.reportedAt
                        ? new Date(latestCursorReport.reportedAt).toLocaleString()
                        : "—"}
                    </p>
                    <p className="text-xs text-slate-300">
                      <span className="text-slate-500">Summary:</span>{" "}
                      {latestCursorReport.reportText || "—"}
                    </p>
                    <p className="text-xs text-slate-300">
                      <span className="text-slate-500">Files changed:</span>{" "}
                      {latestCursorReport.filesChanged || "—"}
                    </p>
                    <p className="text-xs text-slate-300">
                      <span className="text-slate-500">Validation:</span>{" "}
                      {latestCursorReport.validationSummary || "—"}
                    </p>
                    {latestCursorReport.remainingRisks ? (
                      <p className="text-xs text-amber-200/90">
                        <span className="text-slate-500">Risks / follow-up:</span>{" "}
                        {latestCursorReport.remainingRisks}
                      </p>
                    ) : null}
                    <p className="text-xs text-cyan-200/90">
                      Next recommended action:{" "}
                      {showVerificationPanel
                        ? "Record or review verification result."
                        : "Request verification to complete post-fix review."}
                    </p>
                  </div>
                ) : executionPrepared ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-sm text-white">Waiting for Cursor report.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Execution request is prepared. Record Cursor report when work is finished.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Post-Cursor review stays hidden until execution is prepared.
                  </p>
                )}

                <details
                  data-testid="agentops-cursor-report-form"
                  open={!!latestCursorReport || executionPrepared}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <summary className="cursor-pointer text-xs text-slate-300">Record Cursor report</summary>
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={cursorReportText}
                      onChange={(event) => setCursorReportText(event.target.value)}
                      placeholder="Summary"
                      className="h-24 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={cursorFilesChanged}
                      onChange={(event) => setCursorFilesChanged(event.target.value)}
                      placeholder="Files changed (comma-separated)"
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={cursorValidationSummary}
                      onChange={(event) => setCursorValidationSummary(event.target.value)}
                      placeholder="Validation result / summary (required)"
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                    <textarea
                      value={cursorRemainingRisks}
                      onChange={(event) => setCursorRemainingRisks(event.target.value)}
                      placeholder="Remaining risks / follow-up notes"
                      className="h-16 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={cursorFollowUpNeeded}
                        onChange={(event) => setCursorFollowUpNeeded(event.target.checked)}
                      />
                      Follow-up needed
                    </label>
                    <details className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <summary className="cursor-pointer text-xs text-slate-400">Advanced report fields</summary>
                      <div className="mt-2 space-y-2">
                        <input
                          value={cursorValidationCommands}
                          onChange={(event) => setCursorValidationCommands(event.target.value)}
                          placeholder="Validation commands run"
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                        <input
                          value={cursorValidationResult}
                          onChange={(event) => setCursorValidationResult(event.target.value)}
                          placeholder="Validation result (pass/fail summary)"
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={readyForVerification}
                            onChange={(event) => setReadyForVerification(event.target.checked)}
                          />
                          Ready for verification
                        </label>
                      </div>
                    </details>
                    <AixiaButton
                      variant="primary"
                      className="text-xs px-3 py-1.5"
                      disabled={
                        submitting ||
                        !latestHandoffId ||
                        !cursorReportText.trim() ||
                        !cursorValidationSummary.trim()
                      }
                      onClick={() =>
                        void runAction(
                          () =>
                            recordAgentOpsCursorFixReport({
                              issueCode,
                              handoffId: latestHandoffId ?? "",
                              reportText: cursorReportText,
                              filesChanged: cursorFilesChanged
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean),
                              validationSummary: cursorValidationSummary,
                              validationCommandsRun: cursorValidationCommands || undefined,
                              validationResult: cursorValidationResult || undefined,
                              remainingRisks: cursorRemainingRisks || undefined,
                              followUpNeeded: cursorFollowUpNeeded,
                              readyForVerification,
                              note: note || undefined,
                            }),
                          "Cursor report recorded.",
                        )
                      }
                    >
                      Record Cursor Report
                    </AixiaButton>
                  </div>
                </details>

                <details
                  data-testid="agentops-verification-area"
                  open={showVerificationPanel}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <summary className="cursor-pointer text-xs text-slate-300">Verification</summary>
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-slate-400">
                      Verification status: {verificationItem?.requestStatus ?? "Not requested"}
                    </p>
                    <input
                      value={verificationSummary}
                      onChange={(event) => setVerificationSummary(event.target.value)}
                      placeholder="Verification result summary"
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={verificationReportPath}
                      onChange={(event) => setVerificationReportPath(event.target.value)}
                      placeholder="Evidence / report path (optional)"
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <AixiaButton
                        variant="primary"
                        className="text-xs px-3 py-1.5"
                        disabled={submitting}
                        onClick={() =>
                          void runAction(
                            () =>
                              approveAgentOpsVerificationRequest({
                                issueCode,
                                handoffId: latestHandoffId,
                                note: note || undefined,
                              }),
                            "Verification run approved.",
                          )
                        }
                      >
                        Request Verification
                      </AixiaButton>
                      <AixiaButton
                        variant="primary"
                        className="text-xs px-3 py-1.5"
                        disabled={submitting || !verificationSummary.trim()}
                        onClick={() =>
                          void runAction(
                            () =>
                              recordAgentOpsManualVerificationResult({
                                issueCode,
                                verificationResult: "verified_fixed",
                                summary: verificationSummary,
                                verificationReportPath: verificationReportPath || undefined,
                                note: note || undefined,
                              }),
                            "Verification result recorded (verified fixed).",
                          )
                        }
                      >
                        Mark Verified Fixed
                      </AixiaButton>
                      <AixiaButton
                        variant="primary"
                        className="text-xs px-3 py-1.5"
                        disabled={submitting || !verificationSummary.trim()}
                        onClick={() =>
                          void runAction(
                            () =>
                              recordAgentOpsManualVerificationResult({
                                issueCode,
                                verificationResult: "needs_follow_up_fix",
                                summary: verificationSummary,
                                note: note || undefined,
                              }),
                            "Follow-up needed recorded.",
                          )
                        }
                      >
                        Mark Follow-up Needed
                      </AixiaButton>
                    </div>
                    <details className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <summary className="cursor-pointer text-xs text-slate-400">
                        Secondary / exceptional actions
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting}
                          onClick={() =>
                            void runAction(
                              () =>
                                markAgentOpsVerificationRunning({
                                  issueCode,
                                  handoffId: latestHandoffId,
                                  note: note || undefined,
                                }),
                              "Verification marked running.",
                            )
                          }
                        >
                          Mark Running
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting}
                          onClick={() =>
                            void runAction(
                              () =>
                                recordAgentOpsVerificationCommandCopied({
                                  issueCode,
                                  handoffId: latestHandoffId,
                                  commandType: "report-only",
                                  command:
                                    verificationItem?.commands.reportOnlyCommand ??
                                    `npm run qa:agentops-verify -- --issue ${issueCode}`,
                                }),
                              "Verification command copy recorded.",
                            )
                          }
                        >
                          Copy Command
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting}
                          onClick={() =>
                            void runAction(
                              () => requestAgentOpsFollowUpFix({ issueCode, note: note || undefined }),
                              "Follow-up fix requested.",
                            )
                          }
                        >
                          Request Follow-up Fix
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting}
                          onClick={() =>
                            void runAction(
                              () => rejectAgentOpsVerificationRequest({ issueCode, note: note || undefined }),
                              "Verification request rejected.",
                            )
                          }
                        >
                          Reject Verification Request
                        </AixiaButton>
                      </div>
                    </details>
                  </div>
                </details>

                {showClosurePanel ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Closure state</p>
                    <p className="text-sm text-white">
                      {executionState === "closed_verified"
                        ? "Issue verified fixed."
                        : executionState === "follow_up_required"
                          ? "Follow-up required."
                          : "Review closure status."}
                    </p>
                    <p className="text-xs text-slate-400">
                      Learning lesson will be created after verified fix in Phase 7.
                    </p>
                    <div
                      data-testid="agentops-lesson-learning-area"
                      className="rounded-lg border border-white/10 bg-black/20 p-3"
                    >
                      {!isVerifiedFixedLifecycle ? (
                        <p className="text-xs text-slate-400">
                          Prepare Lesson Candidate is enabled after verified fixed lifecycle state.
                        </p>
                      ) : lessonDraftForIssue ? (
                        <div data-testid="agentops-lesson-candidate-status" className="space-y-2">
                          <p className="text-xs text-emerald-200/90">
                            Lesson candidate prepared — review in Knowledge.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <AixiaBadge tone="amber">
                              {lessonDraftForIssue.approvalStatus.replaceAll("_", " ")}
                            </AixiaBadge>
                            {lessonDraftForIssue.lessonId ? (
                              <AixiaBadge tone="neutral">{lessonDraftForIssue.lessonId}</AixiaBadge>
                            ) : null}
                            <AixiaButton
                              variant="secondary"
                              className="text-xs px-3 py-1.5"
                              onClick={() => navigate("/system/agent-ops/knowledge")}
                            >
                              Open Knowledge
                            </AixiaButton>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-300">
                            Verified fixed reached. Prepare a review-only draft lesson candidate from issue context.
                          </p>
                          <AixiaButton
                            data-testid="agentops-prepare-lesson-candidate"
                            variant="secondary"
                            className="text-xs px-3 py-1.5"
                            disabled={submitting}
                            onClick={() =>
                              void runAction(
                                () =>
                                  prepareAgentOpsLessonCandidateDraft({
                                    issueCode,
                                    ownerRequested: true,
                                    note: note || "Prepared from verified fixed lifecycle.",
                                    sourceContext: {
                                      from: "issue_workspace",
                                      executionState,
                                    },
                                  }),
                                "Lesson candidate draft prepared. Review in Knowledge.",
                              )
                            }
                          >
                            Prepare Lesson Candidate
                          </AixiaButton>
                        </div>
                      )}
                    </div>
                    <details className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <summary className="cursor-pointer text-xs text-slate-400">
                        Additional safe actions
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting || !verificationSummary.trim()}
                          onClick={() =>
                            void runAction(
                              () =>
                                recordAgentOpsManualVerificationResult({
                                  issueCode,
                                  verificationResult: "still_broken",
                                  summary: verificationSummary,
                                  note: note || undefined,
                                }),
                              "Still broken recorded.",
                            )
                          }
                        >
                          Still Broken
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting || !verificationSummary.trim()}
                          onClick={() =>
                            void runAction(
                              () =>
                                recordAgentOpsManualVerificationResult({
                                  issueCode,
                                  verificationResult: "verification_blocked",
                                  summary: verificationSummary,
                                  note: note || undefined,
                                }),
                              "Blocked status recorded.",
                            )
                          }
                        >
                          Blocked
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting || !finding}
                          onClick={() =>
                            void runAction(
                              () => markAgentOpsFalsePositive(finding?.id ?? "", note || undefined),
                              "Marked false positive.",
                            )
                          }
                        >
                          False Positive
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting || !finding}
                          onClick={() =>
                            void runAction(
                              () => deferAgentOpsFinding(finding?.id ?? "", note || undefined),
                              "Deferred.",
                            )
                          }
                        >
                          Deferred
                        </AixiaButton>
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={submitting || !finding}
                          onClick={() =>
                            void runAction(
                              () => markAgentOpsInProgress(finding?.id ?? "", note || undefined),
                              "Reopened as In Progress.",
                            )
                          }
                        >
                          Reopen
                        </AixiaButton>
                      </div>
                    </details>
                  </div>
                ) : null}
              </div>
              </details>

              <details
                data-testid="agentops-timeline-disclosure"
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">Timeline</summary>
              <div className="mt-3 space-y-2">
                {issueTimeline.slice(0, 40).map((event) => (
                  <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-white">{event.title}</p>
                      <p className="text-xs text-slate-500">{new Date(event.at).toLocaleString()}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{event.source}</p>
                    <p className="mt-1 text-xs text-slate-300">{event.summary}</p>
                  </div>
                ))}
                {issueTimeline.length === 0 ? (
                  <p className="text-sm text-slate-400">Timeline data not available yet for this issue.</p>
                ) : null}
              </div>
              </details>

              <details
                data-testid="agentops-technical-status"
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                Technical status
              </summary>
              <div className="mt-3 space-y-2 text-xs text-slate-400">
                <p>
                  Hermes gate: <code>{hermesReadinessGate.currentState}</code> · Runtime active:{" "}
                  {hermesAdapterStatus.runtimeActive ? "yes" : "no"} · Health: {hermesStagingHealth.status}
                </p>
                <p>
                  CodeGraph gate: <code>{codegraphRuntimeGate.currentState}</code> · Runtime active:{" "}
                  {codegraphRuntimeStatus.runtimeActive ? "yes" : "no"} · Source:{" "}
                  {codegraphDiscovery?.source ?? "none"}
                </p>
                <p>
                  Contract: <code>{AGENTOPS_HERMES_ADAPTER_READINESS.contractPath}</code> · Gate:{" "}
                  <code>{hermesReadinessGate.gateArtifactPath}</code>
                </p>
              </div>
              </details>
              </div>
            </details>
          </>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}

