/** AgentOps read-only MVP types — aligned with staging `agentops_*` schema. */

export type AgentOpsRunType =
  | "daily"
  | "manual"
  | "pre-release"
  | "focused"
  | "retest"
  | "verification"
  | "import";

export type AgentOpsEnvironment =
  | "local"
  | "staging"
  | "preview"
  | "production-read-only";

export type AgentOpsRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentOpsFindingCategory =
  | "Design"
  | "Functional"
  | "Logical"
  | "Technical"
  | "Improvement"
  | "HR"
  | "AI/MCP"
  | "Personal AI"
  | "SaaS"
  | "Security/Permission"
  | "Performance/Reliability";

export type AgentOpsFindingSeverity =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Suggestion";

export type AgentOpsFindingStatus =
  | "New"
  | "Backlog"
  | "Active Top 10"
  | "Owner Reviewed"
  | "Approved for Fix"
  | "Rejected"
  | "Deferred"
  | "False Positive"
  | "In Progress"
  | "Marked Fixed by Piter"
  | "Verification Running"
  | "Verified Fixed"
  | "Still Broken"
  | "Needs Follow-Up Fix"
  | "Verification Blocked"
  | "Archived";

export type AgentOpsQueueState = "backlog" | "active_top_10" | "archived";

export type AgentOpsVerificationStatus =
  | "pending"
  | "running"
  | "verified_fixed"
  | "still_broken"
  | "needs_follow_up_fix"
  | "verification_blocked"
  | "cancelled";

/** Terminal verification outcomes Owner can record manually (Stage 6). */
export type AgentOpsVerificationResultStatus =
  | "verified_fixed"
  | "still_broken"
  | "needs_follow_up_fix"
  | "verification_blocked";

export type AgentOpsHermesLabel =
  | "Learning"
  | "Small Help"
  | "Helping"
  | "Main Memory Source / Strong Support"
  | "Full AgentOps Memory Support";

export type AgentOpsHermesMode =
  | "Database-only"
  | "Hermes-assisted"
  | "Hermes-primary with database system of record";

export interface AgentOpsHermesStatus {
  score: number;
  label: AgentOpsHermesLabel;
  mode: AgentOpsHermesMode;
  appCallable: boolean;
  codegraphCallable: boolean;
  lastCheckAt?: string | null;
  notes?: string | null;
}

export interface AgentOpsFinding {
  id: string;
  run_id: string | null;
  issue_code: string;
  title: string;
  category: AgentOpsFindingCategory;
  severity: AgentOpsFindingSeverity;
  status: AgentOpsFindingStatus;
  queue_state: AgentOpsQueueState;
  top10_rank: number | null;
  route: string | null;
  module: string | null;
  page_type: string | null;
  user_role: string | null;
  browser_flow: string | null;
  agent_id: string | null;
  review_panel: string | null;
  evidence_summary: string | null;
  evidence_files: unknown;
  problem: string;
  expected_result: string | null;
  actual_result: string | null;
  likely_root_cause: string | null;
  recommended_fix_strategy: string | null;
  cursor_prompt: string | null;
  non_change_rules: string | null;
  saas_impact: string | null;
  ai_mcp_impact: string | null;
  personal_ai_impact: string | null;
  hr_impact: string | null;
  security_impact: string | null;
  priority_score: number;
  piter_priority_override: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentOpsRun {
  id: string;
  run_type: AgentOpsRunType;
  environment: AgentOpsEnvironment;
  started_at: string;
  finished_at: string | null;
  status: AgentOpsRunStatus;
  triggered_by: string | null;
  focus_directive_snapshot: Record<string, unknown>;
  active_queue_count_before: number;
  active_queue_open_slots: number;
  total_findings: number;
  promoted_count: number;
  backlog_count: number;
  verified_fixed_count: number;
  still_broken_count: number;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AgentOpsOpinionPosition = "approve" | "needs_review" | "reject";

export interface AgentOpsOpinion {
  id: string;
  finding_id: string;
  agent_id: string;
  position: AgentOpsOpinionPosition;
  reason: string;
  suggested_improvement: string | null;
  blocking_concern: string | null;
  confidence_score: number | null;
  created_at: string;
}

export type AgentOpsOwnerFeedbackType =
  | "remark"
  | "approve"
  | "reject"
  | "defer"
  | "priority_change"
  | "scope_change"
  | "false_positive"
  | "focus_instruction"
  | "mark_in_progress"
  | "mark_fixed"
  | "request_verification"
  | "re_review_request";

export type AgentOpsFixPlanStatus =
  | "draft_plan"
  | "ready_for_owner_review"
  | "approved"
  | "rejected"
  | "needs_better_plan"
  | "used_manually"
  | "sent_to_cursor_later";

export type AgentOpsFixPlanDecision =
  | "approve_fix_plan"
  | "reject_fix_plan"
  | "request_better_plan"
  | "mark_prompt_used_manually"
  | "copy_prompt_only";

export interface AgentOpsGeneratedFixPlan {
  issueCode: string;
  issueTitle: string;
  issueCategory: string;
  severity: AgentOpsFindingSeverity;
  queueState: AgentOpsQueueState | "unknown";
  status: string;
  planStatus: AgentOpsFixPlanStatus;
  planId: string;
  readableSummary: string;
  whyItMatters: string;
  preferredFixStrategy: string;
  validationCommands: string[];
  cursorPrompt: string;
  affectedRoute: string | null;
  affectedModule: string | null;
  affectedRole: string | null;
  markdownPath: string;
  jsonPath: string;
  latestFixPlanDecision?: AgentOpsFixPlanDecision | null;
  latestFixPlanDecisionStatus?: AgentOpsFixPlanStatus | null;
  latestCursorHandoffStatus?: AgentOpsCursorHandoffStatus | null;
  latestCursorHandoffId?: string | null;
  verificationRequested?: boolean;
}

export interface AgentOpsGeneratedFixPlanSummary {
  generatedAt: string;
  sourceMode: string;
  dryRun: boolean;
  selectedIssueCount: number;
  generatedPlanCount: number;
  plans: AgentOpsGeneratedFixPlan[];
}

export interface AgentOpsFixPlanDecisionInput {
  issueCode: string;
  planId: string;
  decision: AgentOpsFixPlanDecision;
  note?: string;
  promptPath?: string | null;
  summaryPath?: string | null;
  cursorPromptPreview?: string | null;
  ownerApproved: boolean;
}

export interface AgentOpsFixPlanDecisionRecord {
  feedbackId: string;
  findingId: string | null;
  decision: AgentOpsFixPlanDecision;
}

export type AgentOpsLessonCandidateApprovalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_cleanup";

export type AgentOpsLessonCandidateDecision =
  | "approve_for_future_memory"
  | "reject_lesson"
  | "needs_cleanup"
  | "review_later";

export interface AgentOpsLessonCandidateDraft {
  feedbackId: string;
  lessonId: string;
  issueCode: string;
  issueTitle: string;
  sourceRoute: string | null;
  sourceCategory: string;
  sourceSeverity: string;
  sourceAgentId: string | null;
  sourceVerificationResult: string;
  sourceFixPlanId: string | null;
  sourceCursorReportId: string | null;
  sourcePromptId: string | null;
  filesOrComponentsAffected: string[];
  lessonTitle: string;
  problemPattern: string;
  rootCauseSummary: string;
  fixSummary: string;
  reusableRule: string;
  doNotRepeat: string;
  appliesTo: string[];
  targetAgents: string[];
  memoryScope: "agent_memory" | "issue_memory" | "shared_memory" | "design_system_memory" | "prompt_memory";
  confidence: number;
  requiresPiterApproval: true;
  approvalStatus: AgentOpsLessonCandidateApprovalStatus;
  proposedBy: "agent" | "hermes" | "piter" | "verification" | "cursor_report";
  createdAt: string;
  updatedAt: string;
  latestDecision: AgentOpsLessonCandidateDecision | null;
  latestDecisionAt: string | null;
}

export interface AgentOpsPrepareLessonCandidateDraftInput {
  issueCode: string;
  note?: string;
  ownerRequested: boolean;
  sourceContext?: Record<string, unknown>;
}

export interface AgentOpsPrepareLessonCandidateDraftResult {
  feedbackId: string;
  findingId: string | null;
  lessonId: string;
  issueCode: string;
  approvalStatus: AgentOpsLessonCandidateApprovalStatus;
  createdAt: string;
}

export interface AgentOpsLessonCandidateDecisionInput {
  lessonId: string;
  issueCode: string;
  decision: AgentOpsLessonCandidateDecision;
  note?: string;
}

export interface AgentOpsLessonCandidateDecisionRecord {
  feedbackId: string;
  findingId: string | null;
  lessonId: string;
  issueCode: string;
  decision: AgentOpsLessonCandidateDecision;
  approvalStatus: AgentOpsLessonCandidateApprovalStatus;
}

export type AgentOpsCursorHandoffStatus =
  | "draft_handoff"
  | "ready_for_cursor"
  | "copied_manually"
  | "cursor_working"
  | "cursor_report_received"
  | "verification_requested"
  | "verified_fixed"
  | "still_broken"
  | "cancelled";

export interface AgentOpsCursorHandoffInput {
  issueCode: string;
  planId: string;
  cursorPrompt: string;
  ownerDecisionFeedbackId?: string | null;
  note?: string;
  ownerApproved?: boolean;
  status?: AgentOpsCursorHandoffStatus;
  handoffId?: string;
}

export interface AgentOpsCursorHandoffRecord {
  feedbackId: string;
  findingId: string | null;
  handoffId: string;
  status: AgentOpsCursorHandoffStatus;
}

export interface AgentOpsCursorFixReportInput {
  issueCode: string;
  handoffId: string;
  reportText: string;
  filesChanged: string[];
  validationSummary: string;
  readyForVerification: boolean;
  note?: string;
  /** Structured intake fields stored in owner feedback metadata (no schema change). */
  validationCommandsRun?: string;
  validationResult?: string;
  remainingRisks?: string;
  followUpNeeded?: boolean;
}

export type AgentOpsManualExecutionState =
  | "no_prompt_ready"
  | "prompt_draft_ready"
  | "prompt_approved"
  | "execution_request_prepared"
  | "cursor_prompt_copied"
  | "cursor_working_manual"
  | "cursor_report_received"
  | "verification_requested"
  | "verification_running_manual"
  | "verification_passed"
  | "verification_failed"
  | "follow_up_required"
  | "closed_verified"
  | "reopened";

export interface AgentOpsIssueExecutionMetadataInput {
  issueCode: string;
  executionState: AgentOpsManualExecutionState;
  approvedPrompt?: string;
  approvedPromptAt?: string;
  executionRequestId?: string;
  cursorHandoffId?: string;
  cursorStatus?: string;
  cursorReportSummary?: string;
  verificationStatus?: string;
  latestLifecycleStep?: string;
  manualFirst?: boolean;
  note?: string;
}

export interface AgentOpsPrepareExecutionRequestInput {
  issueCode: string;
  planId: string;
  cursorPrompt: string;
  ownerApproved?: boolean;
  note?: string;
}

/** Issue Workspace mock agent clarification — sender identity. */
export type AgentOpsIssueAgentMessageSender =
  | "piter"
  | "reporting_agent_mock"
  | "reporting_agent"
  | "system";

/** Issue Workspace mock agent clarification — message classification. */
export type AgentOpsIssueAgentMessageType =
  | "clarification_question"
  | "agent_clarification"
  | "prompt_improvement_suggestion"
  | "risk_note"
  | "evidence_summary"
  | "next_step_recommendation";

/** Issue Workspace mock agent clarification — provenance. */
export type AgentOpsIssueAgentMessageSource =
  | "issue_workspace"
  | "mock_response_layer"
  | "local_llm_runtime"
  | "hermes_runtime"
  | "owner_feedback";

/** Stored issue-scoped agent clarification message (owner feedback metadata). */
export interface AgentOpsIssueAgentMessage {
  id: string;
  issueCode: string;
  agentId?: string | null;
  sender: AgentOpsIssueAgentMessageSender;
  messageType: AgentOpsIssueAgentMessageType;
  content: string;
  createdAt: string;
  source: AgentOpsIssueAgentMessageSource;
  metadata: Record<string, unknown>;
}

/** Owner intent when asking the reporting agent in Issue Workspace. */
export type AgentOpsAgentMockIntent =
  | "clarification"
  | "prompt_improvement"
  | "risk_review"
  | "next_step";

/** Input for deterministic mock agent response generation (no external AI). */
export interface AgentOpsAgentMockResponseInput {
  issueCode: string;
  question: string;
  intent: AgentOpsAgentMockIntent;
  issueSummary: string;
  evidence: string;
  fixPlan: string;
  cursorPrompt: string;
  executionState: string;
  reportingAgent: string;
  agentMemory: string[];
  timeline: string[];
  route?: string | null;
  category?: string | null;
  severity?: string | null;
  module?: string | null;
  likelyRootCause?: string | null;
  recommendedFixStrategy?: string | null;
}

/** Structured mock agent response (template/status-based only). */
export interface AgentOpsAgentMockResponse {
  response: string;
  suggestedPromptChanges: string;
  riskNotes: string;
  nextRecommendedAction: string;
  confidence: "low" | "medium" | "high";
  limitations: string;
}

/** Persist one issue-scoped agent clarification message via owner feedback. */
export interface AgentOpsIssueAgentMessageInput {
  issueCode: string;
  findingId?: string | null;
  agentId?: string | null;
  sender: AgentOpsIssueAgentMessageSender;
  messageType: AgentOpsIssueAgentMessageType;
  content: string;
  source?: AgentOpsIssueAgentMessageSource;
  metadata?: Record<string, unknown>;
}

export interface AgentOpsIssueAgentMessageRecord {
  feedbackId: string;
  findingId: string | null;
  messageId: string;
}

/** Future Hermes adapter reasoning mode (contract v1 — design only, no runtime in Phase 5A). */
export type AgentOpsHermesAdapterMode =
  | "issue_clarification"
  | "prompt_refinement"
  | "risk_review"
  | "next_step_recommendation"
  | "cursor_report_synthesis"
  | "archive_lesson_extraction";

/** Current agent response source in Issue Workspace. */
export type AgentOpsAgentResponseMode = "mock_status_based" | "mock_fallback" | "hermes_advisory";

/** Hermes endpoint configuration source (Phase 5E — design only, no runtime). */
export type AgentOpsHermesEndpointSource =
  | "not_configured"
  | "local_dev"
  | "staging_external"
  | "app_api_route";

/** Hermes adapter runtime status (Phase 5B — mock fallback default). */
export interface AgentOpsHermesAdapterStatus {
  runtimeActive: boolean;
  appCallable: boolean;
  responseMode: "mock_fallback" | "hermes_advisory";
  contractVersion: string;
  fallbackMode: "agentResponseMock";
  ownerApprovalRequired: boolean;
  safetyPolicyActive: boolean;
  endpointConfigured: boolean;
  endpointSource: AgentOpsHermesEndpointSource;
  envRequired: boolean;
  ownerSignoffRequired: boolean;
  endpointConfigDesignPath: string;
}

/** Result source from runAgentOpsHermesAdapter. */
export type AgentOpsHermesAdapterResultSource =
  | "mock_fallback"
  | "local_llm"
  | "hermes_runtime"
  | "blocked_by_safety"
  | "unavailable";

/** Hermes-shaped request per Phase 5A contract (built locally, not sent). */
export interface AgentOpsHermesAdapterRequest {
  requestId: string;
  mode: AgentOpsHermesAdapterMode;
  issueContext: {
    issueCode: string;
    title?: string;
    severity?: string;
    category?: string;
    route?: string | null;
    module?: string | null;
    summary?: string;
    evidence?: string;
    likelyRootCause?: string | null;
    recommendedFixStrategy?: string | null;
  };
  agentContext: {
    agentId?: string | null;
    agentSkillSpecialty?: string | null;
    appRole?: string | null;
    currentFocus?: string | null;
    relevantMemory: string[];
  };
  promptContext: {
    currentPrompt: string;
    promptStyleStandard: string;
    approvedPromptRequired: boolean;
  };
  lifecycleContext: {
    executionState: string;
    latestCursorReport?: string | null;
    verificationStatus?: string | null;
    timelineSummary: string[];
  };
  safety: {
    stagingOnly: true;
    noAutoCursor: true;
    noProduction: true;
    noSecrets: true;
    ownerApprovalRequired: true;
    environment?: "local" | "staging" | "preview";
  };
  requestedOutput: {
    clarification?: boolean;
    promptSuggestions?: boolean;
    riskNotes?: boolean;
    nextAction?: boolean;
    lessonSummary?: boolean;
  };
}

/** Input to build request and run adapter (Issue Workspace). */
export interface AgentOpsHermesAdapterRunInput {
  question: string;
  intent: AgentOpsAgentMockIntent;
  issueCode: string;
  issueSummary: string;
  evidence: string;
  fixPlan: string;
  cursorPrompt: string;
  executionState: string;
  reportingAgent: string;
  agentMemory: string[];
  timeline: string[];
  route?: string | null;
  category?: string | null;
  severity?: string | null;
  module?: string | null;
  likelyRootCause?: string | null;
  recommendedFixStrategy?: string | null;
  title?: string | null;
  latestCursorReport?: string | null;
  verificationStatus?: string | null;
  model?: string | null;
  /** Hermes H2-F3B-2 — approved global memory preview lines (not per-agent memory). */
  globalApprovedMemorySnippets?: string[];
  globalApprovedMemoryAttached?: boolean;
  globalApprovedMemoryIncludedCount?: number;
}

/** Unified adapter result (mock fallback or future Hermes). */
export interface AgentOpsHermesAdapterResult {
  source: AgentOpsHermesAdapterResultSource;
  hermesRuntimeCalled: boolean;
  shouldFallbackToMock: boolean;
  requestId: string;
  mode: AgentOpsHermesAdapterMode;
  response: string;
  promptSuggestions: string;
  riskNotes: string;
  nextRecommendedAction: string;
  confidence: "low" | "medium" | "high";
  limitations: string;
  safetyFlags: string[];
}

/** Local LLM chat scope per local-llm-chat-contract.json. */
export type AgentOpsChatScope = "council" | "individual_agent" | "issue";

/** Local LLM API style — Ollama native or OpenAI-compatible. */
export type AgentOpsLocalLlmApiStyle = "ollama" | "openai";

/** Read-only local LLM runtime status for AgentOps UI. */
export interface AgentOpsLocalLlmStatus {
  runtimeActive: boolean;
  configured: boolean;
  reachable: boolean | null;
  baseUrl: string;
  model: string;
  apiStyle: AgentOpsLocalLlmApiStyle;
  contractVersion: string;
  contractPath: string;
  fallbackMode: "agentResponseMock";
  ownerApprovalRequired: boolean;
  stagingOnly: true;
  blockers: string[];
}

/** Per-agent council reply from local LLM runtime. */
export interface AgentOpsLocalLlmPerAgentResponse {
  agentId: string;
  agentName: string;
  role: string;
  response: string;
  source: "local_llm" | "mock_fallback";
  memoryIntentDetected: boolean;
}

/** Proposed memory update when owner intent is detected (not auto-written). */
export interface AgentOpsLocalLlmProposedMemoryUpdate {
  targetScope: "agent" | "issue" | "shared";
  targetAgentId: string | null;
  reason: string;
  proposedText: string;
}

/** Local LLM chat request (all three scopes). */
export interface AgentOpsLocalLlmChatRequest {
  chatScope: AgentOpsChatScope;
  message: string;
  model?: string | null;
  selectedAgentId?: string | null;
  issueCode?: string | null;
  intent?: AgentOpsAgentMockIntent;
  issueContext?: {
    title?: string | null;
    summary?: string;
    evidence?: string;
    fixPlan?: string;
    cursorPrompt?: string;
    executionState?: string;
    route?: string | null;
    category?: string | null;
    severity?: string | null;
    module?: string | null;
    likelyRootCause?: string | null;
    recommendedFixStrategy?: string | null;
    reportingAgent?: string;
    agentMemory?: string[];
    timeline?: string[];
    /** Hermes H2-F3B-2 — separate from agentMemory. */
    globalApprovedMemory?: string[];
    /** Phase E finding chat — bounded extras (optional). */
    whyItMatters?: string | null;
    expectedBehavior?: string | null;
    observedBehavior?: string | null;
    statusLabel?: string | null;
    typeLabel?: string | null;
    originalPrompt?: string | null;
    promptSafetyWarnings?: string[];
    supportingAgents?: string[];
    reportingAgentRole?: string | null;
    includePromptRewriteContract?: boolean;
  };
  agentContext?: {
    agentId: string;
    displayName: string;
    appRole: string;
    qaSpecialty: string;
    currentFocus?: string | null;
    memorySnippets?: string[];
  };
  councilAgents?: Array<{
    agentId: string;
    displayName: string;
    appRole: string;
    qaSpecialty: string;
    currentFocus?: string | null;
    status: AgentOpsManagedAgentStatus;
    memorySnippets?: string[];
  }>;
  attachmentDescriptions?: string[];
}

/** Local LLM chat result (all three scopes). */
export interface AgentOpsLocalLlmChatResult {
  chatScope: AgentOpsChatScope;
  source: "local_llm" | "mock_fallback" | "unavailable";
  localLlmCalled: boolean;
  shouldFallbackToMock: boolean;
  requestId: string;
  response: string | null;
  perAgentResponses: AgentOpsLocalLlmPerAgentResponse[];
  proposedMemoryUpdate: AgentOpsLocalLlmProposedMemoryUpdate | null;
  memoryIntentDetected: boolean;
  memoryApprovalRequired: boolean;
  limitations: string;
  blockers: string[];
}

/** Persisted council chat message (owner feedback metadata). */
export interface AgentOpsCouncilChatMessage {
  id: string;
  sender: "piter" | "agent";
  agentId: string | null;
  agentName: string | null;
  content: string;
  createdAt: string;
  source: "local_llm_runtime" | "mock_response_layer" | "owner";
  metadata: Record<string, unknown>;
}

/** Persisted individual agent chat message (owner feedback metadata). */
export interface AgentOpsAgentChatMessage {
  id: string;
  agentId: string;
  sender: "piter" | "agent";
  content: string;
  createdAt: string;
  source: "local_llm_runtime" | "mock_response_layer" | "owner";
  metadata: Record<string, unknown>;
}

/** Hermes readiness gate activation state (Phase 5C — aligns with hermes-readiness-gate.json). */
export type AgentOpsHermesReadinessGateState =
  | "not_configured"
  | "contract_ready"
  | "staging_ready_pending_owner"
  | "staging_enabled"
  | "disabled_by_safety"
  | "failed_health_check";

/** Hermes staging health check status (Phase 5D — aligns with hermes-health-check-contract.json). */
export type AgentOpsHermesHealthCheckStatus =
  | "not_configured"
  | "blocked_by_gate"
  | "ready"
  | "unhealthy"
  | "timeout"
  | "disabled";

export type AgentOpsHermesRuntimeHealthMode = "advisory_transport" | "blocked" | "unavailable";

export type AgentOpsHermesEnvGateStatus = "enabled" | "disabled" | "unknown";

export type AgentOpsLlmProviderId = "ollama" | "doubao_ark";

/** Normalized Hermes runtime health (A1) — transport truth; coordinator active only when owner-enabled on staging. */
export interface AgentOpsHermesRuntimeHealth {
  status: "ok" | "blocked" | "unavailable" | "loading";
  ok: boolean;
  mode: AgentOpsHermesRuntimeHealthMode;
  provider?: AgentOpsLlmProviderId;
  providerConfigured?: boolean;
  providerModel?: string;
  runtimeGate: AgentOpsHermesEnvGateStatus;
  ownerApproved: AgentOpsHermesEnvGateStatus;
  llmRuntimeGate: AgentOpsHermesEnvGateStatus;
  clientTransportEnabled: boolean;
  coordinatorActive: boolean;
  transportReachable: boolean;
  hermesEndpointReachable: boolean;
  llmFallbackReachable: boolean;
  fallbackAvailable: boolean;
  productionBlocked: boolean;
  writesBlocked: true;
  sotWritesBlocked: true;
  advisoryOnly: true;
  contextAssemblerAvailable?: boolean;
  message: string;
  checkedAt: string;
  loadError?: string;
}

export type AgentOpsHermesContextAssemblerSectionStatus =
  | "included"
  | "empty"
  | "preview_only"
  | "not_connected"
  | "unavailable";

/** A2 read-only Hermes context assembler preview — not sent to runtime. */
export interface AgentOpsHermesContextAssemblerSection {
  sectionId: string;
  title: string;
  source: string;
  status: AgentOpsHermesContextAssemblerSectionStatus;
  entries: string[];
  safetyNote?: string;
}

export interface AgentOpsHermesContextAssemblerStats {
  globalMemoryCount: number;
  perAgentMemoryCount: number;
  toolRegistryCount: number;
  issueContextIncluded: boolean;
}

/** A4 — read-only Tools Hub registry preview for Hermes (metadata only). */
export interface AgentOpsHermesToolRegistryPreviewSummary {
  totalRegistryNodes: number;
  mainCategories: number;
  hermesRelatedNodes: number;
  existingOrPartialCount: number;
  plannedOrNotConnectedCount: number;
  executionEnabled: false;
}

export interface AgentOpsHermesToolRegistryCategoryPreview {
  categoryId: string;
  title: string;
  nodeCount: number;
  directChildCount: number;
  statusMix: string;
  keyTools: string[];
  hermesRelevance: string;
  safetyStatus: string;
}

export interface AgentOpsHermesToolRegistryRelevantTool {
  id: string;
  title: string;
  categoryTitle: string;
  groupTitle: string | null;
  statusLabel: string;
  installedStatus: string;
  configuredStatus: string;
  currentRuntime: string;
  hermesUseToday: string;
  futureHermesUse: string;
}

export interface AgentOpsHermesToolRegistryPreview {
  mode: "preview_only";
  source: string;
  summary: AgentOpsHermesToolRegistryPreviewSummary;
  categories: AgentOpsHermesToolRegistryCategoryPreview[];
  relevantTools: AgentOpsHermesToolRegistryRelevantTool[];
  safetyBanner: string;
}

export interface AgentOpsHermesContextAssemblerPreview {
  assembledAt: string;
  mode: "preview_only";
  coordinatorActive: boolean;
  writesBlocked: true;
  sourceOfTruthWritesBlocked: true;
  sections: AgentOpsHermesContextAssemblerSection[];
  stats: AgentOpsHermesContextAssemblerStats;
  toolRegistryPreview: AgentOpsHermesToolRegistryPreview;
  loadErrors: string[];
}

/** Result from checkHermesStagingHealth — live probe via getAgentOpsHermesRuntimeHealth (A1). */
export interface AgentOpsHermesStagingHealthCheck {
  checkId: string;
  status: AgentOpsHermesHealthCheckStatus;
  endpointReachable: boolean;
  runtimeAllowed: boolean;
  fallbackAvailable: boolean;
  latencyMs: number | null;
  checkedAt: string;
  blockers: string[];
  nextStep: string;
  healthCheckContractPath: string;
}

/** Read-only Hermes readiness gate for Issue Workspace and reports (Phase 5C). */
export interface AgentOpsHermesReadinessGate {
  currentState: AgentOpsHermesReadinessGateState;
  contractReady: boolean;
  safetyPolicyReady: boolean;
  fallbackReady: boolean;
  appCallable: boolean;
  runtimeActive: boolean;
  stagingOnly: boolean;
  ownerApprovalRequired: boolean;
  canEnableInStaging: boolean;
  blockers: string[];
  nextStep: string;
  gateArtifactPath: string;
  healthCheckStatus: AgentOpsHermesHealthCheckStatus;
  healthCheckPassing: boolean;
  endpointConfigured: boolean;
  endpointSource: AgentOpsHermesEndpointSource;
  envRequired: boolean;
  ownerSignoffRequired: boolean;
}

/** Stage B — Hermes recommendation artifact advisory types (not memory, not SOT). */
export type AgentOpsHermesRecommendationAdvisoryType =
  | "issue_advisory"
  | "cursor_prompt_review"
  | "fix_report_review";

export type AgentOpsHermesRecommendationWorkflowSource =
  | "workflow_1"
  | "workflow_2"
  | "workflow_3";

export type AgentOpsHermesRecommendationArtifactStatus = "saved_advisory";

export interface AgentOpsHermesRecommendationArtifactSafetyMetadata {
  coordinatorActive: boolean;
  writesBlocked: true;
  statusMutation: false;
  toolExecution: false;
}

/** Stage C — owner-gated coordinator activation preference (metadata only, not AgentMemory). */
export interface AgentOpsHermesCoordinatorActivationPreference {
  coordinatorActive: boolean;
  ownerApprovedAt: string | null;
  stagingOnly: true;
  writesBlocked: true;
  advisoryOnly: true;
  schedulerActive: false;
  agentMemoryWritesBlocked: true;
  toolExecutionBlocked: true;
}

export type AgentOpsHermesCoordinatorWorkflowStepId =
  | "workflow_1"
  | "workflow_2"
  | "workflow_3"
  | "fix_report";

export type AgentOpsHermesCoordinatorQueueItemStatus =
  | "queued_read_only"
  | "completed_manual_save"
  | "pending_manual_save"
  | "awaiting_prior_step";

export interface AgentOpsHermesCoordinatorQueueItem {
  stepId: AgentOpsHermesCoordinatorWorkflowStepId;
  label: string;
  issueCode: string | null;
  status: AgentOpsHermesCoordinatorQueueItemStatus;
  artifactId: string | null;
  savedAt: string | null;
  note: string;
}

export interface AgentOpsHermesCoordinatorAdvisoryQueue {
  mode: "read_only";
  coordinatorActive: boolean;
  schedulerActive: false;
  items: AgentOpsHermesCoordinatorQueueItem[];
  sequenceNote: string;
}

export interface AgentOpsHermesCoordinatorSchedulerPlaceholder {
  schedulerActive: false;
  queueAdvisoryRequests: "placeholder_inactive";
  trackWorkflowCompletion: "placeholder_inactive";
  triggerReviewPrompts: "placeholder_inactive";
  sequence: AgentOpsHermesCoordinatorWorkflowStepId[];
  nextAction: "inactive_until_stage_d";
  note: string;
}

export interface AgentOpsHermesCoordinatorToolExecutionGate {
  toolId: string;
  label: string;
  wouldExecute: true;
  executionStatus: "blocked_safety_only";
  reason: string;
}

export interface AgentOpsHermesCoordinatorAgentMemoryReadPreview {
  mode: "read_only";
  writesBlocked: true;
  globalMemoryCount: number;
  perAgentMemoryCount: number;
  note: string;
}

export interface AgentOpsHermesCoordinatorControlSnapshot {
  preference: AgentOpsHermesCoordinatorActivationPreference;
  queue: AgentOpsHermesCoordinatorAdvisoryQueue;
  scheduler: AgentOpsHermesCoordinatorSchedulerPlaceholder;
  agentMemory: AgentOpsHermesCoordinatorAgentMemoryReadPreview;
  toolGates: AgentOpsHermesCoordinatorToolExecutionGate[];
}

export interface AgentOpsHermesRecommendationArtifactRecord {
  id: string;
  issueCode: string;
  findingId: string | null;
  advisoryType: AgentOpsHermesRecommendationAdvisoryType;
  workflowSource: AgentOpsHermesRecommendationWorkflowSource;
  requestText: string;
  responseText: string;
  verdict: string | null;
  contextIncluded: boolean;
  provider: string | null;
  source: string | null;
  requestId: string | null;
  safetyFlags: string[];
  status: AgentOpsHermesRecommendationArtifactStatus;
  createdAt: string;
  createdBy: string | null;
  safety: AgentOpsHermesRecommendationArtifactSafetyMetadata;
}

export interface AgentOpsHermesRecommendationArtifactInput {
  issueCode: string;
  findingId?: string | null;
  advisoryType: AgentOpsHermesRecommendationAdvisoryType;
  workflowSource: AgentOpsHermesRecommendationWorkflowSource;
  requestText: string;
  responseText: string;
  verdict?: string | null;
  contextIncluded: boolean;
  provider?: string | null;
  source?: string | null;
  requestId?: string | null;
  safetyFlags?: string[];
  responseCheckedAt?: string;
  coordinatorActive?: boolean;
}

export interface AgentOpsHermesRecommendationArtifactSaveResult {
  feedbackId: string;
  artifactId: string;
  message: string;
}

/** Read-only Hermes adapter readiness for Issue Workspace UI (Phase 5A). */
export interface AgentOpsHermesAdapterReadiness {
  hermesActive: boolean;
  currentResponseMode: AgentOpsAgentResponseMode;
  contractPrepared: boolean;
  contractVersion: string;
  contractPath: string;
  fallbackLayer: "mock_response_layer";
  ownerApprovalRequired: boolean;
  appCallable: boolean;
  codegraphCallable: boolean;
  notes: string;
}

/** CodeGraph discovery mode (Phase 6A contract — design only). */
export type AgentOpsCodeGraphDiscoveryMode =
  | "issue_context_discovery"
  | "likely_files"
  | "route_ownership"
  | "component_impact"
  | "shared_source_of_truth"
  | "related_fix_lookup"
  | "recurrence_lookup"
  | "prompt_context_suggestions";

/** Suggestion provenance for CodeGraph discovery responses. */
export type AgentOpsCodeGraphSuggestionSource =
  | "route_map"
  | "static_index"
  | "codegraph"
  | "prior_issue"
  | "manual_hint";

/** Single discovery suggestion item (contract v1). */
export interface AgentOpsCodeGraphDiscoverySuggestionItem {
  label: string;
  path?: string | null;
  reason: string;
  confidence: "low" | "medium" | "high";
  evidence?: string | null;
  source: AgentOpsCodeGraphSuggestionSource;
  safeToIncludeInPrompt: boolean;
}

/** CodeGraph runtime mode (Phase 6D). */
export type AgentOpsCodeGraphRuntimeMode =
  | "mock_static_hints"
  | "sanitized_artifact"
  | "staging_endpoint";

/** CodeGraph runtime activation state (Phase 6D readiness gate). */
export type AgentOpsCodeGraphRuntimeActivationState =
  | "not_configured"
  | "contract_ready"
  | "staging_ready_pending_owner"
  | "staging_enabled_read_only"
  | "disabled_by_safety"
  | "failed_health_check";

/** Read-only CodeGraph runtime status for Issue Workspace (Phase 6D). */
export interface AgentOpsCodeGraphRuntimeStatus {
  runtimeActive: boolean;
  readOnly: true;
  runtimeMode: AgentOpsCodeGraphRuntimeMode;
  stagingOnly: boolean;
  ownerApprovalRequired: boolean;
  promptAutoMutation: false;
  cursorAutoTrigger: false;
  fallbackMode: "mock_static_hints";
  blockers: string[];
  artifactConfigured: boolean;
  gateArtifactPath: string;
  stagingRuntimePlanPath: string;
  ownerSignoffTemplatePath: string;
}

/** Read-only CodeGraph runtime readiness gate snapshot (Phase 6D). */
export interface AgentOpsCodeGraphRuntimeReadinessGate {
  currentState: AgentOpsCodeGraphRuntimeActivationState;
  contractReady: boolean;
  safetyPolicyReady: boolean;
  fallbackReady: boolean;
  readOnlyMode: boolean;
  stagingOnly: boolean;
  ownerApprovalRequired: boolean;
  runtimeActive: boolean;
  canEnableReadOnlyStaging: boolean;
  blockers: string[];
  nextStep: string;
  gateArtifactPath: string;
}

/** Read-only CodeGraph discovery readiness for Issue Workspace (Phase 6A). */
export interface AgentOpsCodeGraphDiscoveryReadiness {
  runtimeActive: boolean;
  mcpFromApp: boolean;
  statusLabel: "not_active" | "planned" | "staging_enabled";
  modeLabel: string;
  suggestionsAvailable: boolean;
  fallbackMode: "manual_inspection";
  ownerApprovalRequired: boolean;
  contractPrepared: boolean;
  contractVersion: string;
  contractPath: string;
  designPath: string;
  safetyPolicyPath: string;
  fallbackPolicyPath: string;
  nextStep: string;
  notes: string;
}

/** Default CodeGraph discovery readiness — contract prepared, runtime not connected (Phase 6A). */
export const AGENTOPS_CODEGRAPH_DISCOVERY_READINESS: AgentOpsCodeGraphDiscoveryReadiness = {
  runtimeActive: false,
  mcpFromApp: false,
  statusLabel: "not_active",
  modeLabel: "Mock static hints (runtime not connected)",
  suggestionsAvailable: true,
  fallbackMode: "manual_inspection",
  ownerApprovalRequired: true,
  contractPrepared: true,
  contractVersion: "1.0.0",
  contractPath: "qa-agent/codegraph/codegraph-discovery-contract.json",
  designPath: "qa-agent/codegraph/codegraph-discovery-design.md",
  safetyPolicyPath: "qa-agent/codegraph/codegraph-safety-policy.md",
  fallbackPolicyPath: "qa-agent/codegraph/codegraph-fallback-policy.md",
  nextStep:
    "Phase 6E sanitized artifact design — owner signoff before CODEGRAPH_RUNTIME_ACTIVE=true",
  notes:
    "CodeGraph is essential. Phase 6D adapter prepared; mock static hints remain default until owner-approved read-only staging artifact.",
};

/** Default readiness — Hermes not active, mock layer, contract prepared (Phase 5A). */
export const AGENTOPS_HERMES_ADAPTER_READINESS: AgentOpsHermesAdapterReadiness = {
  hermesActive: false,
  currentResponseMode: "mock_fallback",
  contractPrepared: true,
  contractVersion: "1.0.0",
  contractPath: "qa-agent/hermes/hermes-adapter-contract.json",
  fallbackLayer: "mock_response_layer",
  ownerApprovalRequired: true,
  appCallable: false,
  codegraphCallable: false,
  notes:
    "Hermes is essential and planned. Phase 5C readiness gate: contract ready, runtime not connected — mock fallback via runAgentOpsHermesAdapter until owner-approved staging activation.",
};

export interface AgentOpsCursorFixReportRecord {
  feedbackId: string;
  findingId: string | null;
  handoffId: string;
  readyForVerification: boolean;
}

export type AgentOpsVerificationRequestStatus =
  | "verification_requested"
  | "owner_review_required"
  | "ready_to_run"
  | "command_copied"
  | "verification_running_manual"
  | "verification_result_recorded"
  | "verification_passed"
  | "verification_failed"
  | "verification_blocked";

export interface AgentOpsVerificationCommandRecommendation {
  verificationTarget: string | null;
  reportOnlyCommand: string;
  applyCommand: string;
}

export interface AgentOpsVerificationRequestItem {
  findingId: string;
  issueCode: string;
  title: string;
  severity: AgentOpsFindingSeverity;
  queueState: AgentOpsQueueState;
  status: AgentOpsFindingStatus;
  handoffId: string | null;
  cursorReportSummary: string | null;
  filesChanged: string[];
  readyForVerification: boolean;
  requestStatus: AgentOpsVerificationRequestStatus;
  commands: AgentOpsVerificationCommandRecommendation;
  latestVerificationResult: AgentOpsVerificationResultStatus | null;
  verificationReportPath: string | null;
  rejected: boolean;
}

export interface AgentOpsApproveVerificationRequestInput {
  issueCode: string;
  handoffId?: string | null;
  note?: string;
  verificationTarget?: string | null;
  verificationCommand?: string;
}

export interface AgentOpsVerificationCommandCopiedInput {
  issueCode: string;
  handoffId?: string | null;
  commandType: "report-only" | "apply";
  command: string;
  note?: string;
}

export interface AgentOpsManualVerificationResultInput {
  issueCode: string;
  verificationResult: AgentOpsVerificationResultStatus;
  verificationReportPath?: string | null;
  summary: string;
  note?: string;
}

export interface AgentOpsVerificationRequestActionResult {
  feedbackId: string;
  findingId: string | null;
  issueCode: string;
  requestStatus: AgentOpsVerificationRequestStatus;
  message: string;
}

/** Owner feedback action type (Stage 5 write flows). */
export type AgentOpsFeedbackType = AgentOpsOwnerFeedbackType;

export interface AgentOpsFeedbackActionInput {
  findingId: string;
  feedbackType: AgentOpsFeedbackType;
  remark?: string;
  priorityOverride?: number | null;
  requestedScope?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AgentOpsWriteResult<T> {
  data: T | null;
  error: string | null;
}

export interface AgentOpsActionResult {
  finding: AgentOpsFinding | null;
  feedbackId?: string | null;
  verificationId?: string | null;
  message: string;
  refillResult?: AgentOpsRefillResult | null;
  needsNewAgentOpsScan?: boolean;
}

export interface AgentOpsOwnerFeedback {
  id: string;
  finding_id: string | null;
  owner_user_id: string;
  feedback_type: AgentOpsOwnerFeedbackType;
  remark: string | null;
  priority_override: number | null;
  requested_scope: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentOpsVerification {
  id: string;
  finding_id: string;
  verification_run_id: string | null;
  marked_fixed_feedback_id: string | null;
  verification_status: AgentOpsVerificationStatus;
  route_retested: string | null;
  workflow_retested: string | null;
  expected_fix: string | null;
  actual_result: string | null;
  regression_check_summary: string | null;
  evidence_files: unknown;
  follow_up_prompt: string | null;
  verified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AgentOpsPromptType =
  | "fix"
  | "improvement"
  | "verification"
  | "retest"
  | "implementation"
  | "browser-qa";

export interface AgentOpsPromptLibraryEntry {
  id: string;
  finding_id: string | null;
  prompt_type: AgentOpsPromptType;
  prompt_text: string;
  approved_by_owner: boolean;
  copied_by_owner: boolean;
  used_at: string | null;
  result_status: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AgentOpsEvidenceType =
  | "screenshot"
  | "trace"
  | "video"
  | "console"
  | "network"
  | "markdown"
  | "json"
  | "browser-note"
  | "codegraph-note";

export interface AgentOpsEvidenceFile {
  id: string;
  finding_id: string | null;
  verification_id: string | null;
  evidence_type: AgentOpsEvidenceType;
  file_path: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentOpsDashboardSummary {
  activeOpenCount: number;
  openSlots: number;
  backlogCount: number;
  criticalOpenCount: number;
  verificationPendingCount: number;
  latestRun: AgentOpsRun | null;
  hermesStatus: AgentOpsHermesStatus;
}

export interface AgentOpsReadResult<T> {
  data: T | null;
  error: string | null;
}

export interface AgentOpsFindingDetail {
  finding: AgentOpsFinding | null;
  opinions: AgentOpsOpinion[];
  ownerFeedback: AgentOpsOwnerFeedback[];
  verifications: AgentOpsVerification[];
  prompts: AgentOpsPromptLibraryEntry[];
  evidenceFiles: AgentOpsEvidenceFile[];
}

export interface AgentOpsVerificationResultInput {
  verificationId: string;
  findingId: string;
  verificationStatus: AgentOpsVerificationResultStatus;
  actualResult?: string | null;
  regressionCheckSummary?: string | null;
  followUpPrompt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AgentOpsVerificationActionResult {
  finding: AgentOpsFinding | null;
  verification: AgentOpsVerification | null;
  message: string;
  refillResult?: AgentOpsRefillResult | null;
  needsNewAgentOpsScan?: boolean;
}

export interface AgentOpsPendingVerificationItem {
  verification: AgentOpsVerification;
  finding: AgentOpsFinding | null;
}

/** How the refill engine was triggered (Stage 7 manual; Stage 7B auto). */
export type AgentOpsQueueRefillMode =
  | "manual"
  | "future_auto_after_slot_opened";

export interface AgentOpsPromotionCandidate {
  id: string;
  issue_code: string;
  title: string;
  severity: AgentOpsFindingSeverity;
  category: AgentOpsFindingCategory;
  route: string | null;
  priority_score: number;
  created_at: string;
}

export interface AgentOpsRefillResult {
  promotedCount: number;
  openSlotsBefore: number;
  activeOpenCountBefore: number;
  activeOpenCountAfter: number;
  backlogCountBefore: number;
  backlogCountAfter: number;
  promotedFindings: AgentOpsFinding[];
  message: string;
}

/** One backlog row from static guardrail import plan (Stage 8). */
export interface AgentOpsStaticImportCandidate {
  issueCode: string;
  title: string;
  category: AgentOpsFindingCategory;
  severity: AgentOpsFindingSeverity;
  status: AgentOpsFindingStatus;
  queueState: AgentOpsQueueState;
  route: string | null;
  module: string | null;
  pageType: string | null;
  reviewPanel: string | null;
  evidenceSummary: string;
  problem: string;
  expectedResult: string | null;
  recommendedFixStrategy: string | null;
  cursorPrompt: string;
  nonChangeRules: string | null;
  priorityScore: number;
  agentId: string;
  metadata: Record<string, unknown>;
}

export interface AgentOpsStaticImportPlan {
  generatedAt: string;
  source: string;
  sourceGeneratedAt: string | null;
  summary: {
    totalCandidates: number;
    actionable: number;
    reviewNeeded: number;
  };
  candidates: AgentOpsStaticImportCandidate[];
}

export interface AgentOpsStaticImportPreview {
  plan: AgentOpsStaticImportPlan | null;
  available: boolean;
  message: string;
}

export interface AgentOpsStaticImportResult {
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  importedIssueCodes: string[];
  skippedIssueCodes: string[];
  message: string;
}

/** Browser QA smoke import plan (Stage 9E). Same candidate row shape as static import. */
export interface AgentOpsBrowserImportPlan {
  generatedAt: string;
  source: string;
  sourceRunId: string | null;
  summary: {
    totalCandidates: number;
    fromReportFindings: number;
    loginFailures: number;
    skippedExpected: number;
  };
  skippedExpected: Array<{
    reason: string;
    qaUserId?: string;
    route?: string;
    status?: string;
  }>;
  candidates: AgentOpsStaticImportCandidate[];
}

export interface AgentOpsBrowserImportPreview {
  plan: AgentOpsBrowserImportPlan | null;
  available: boolean;
  message: string;
}

export type AgentOpsBrowserImportResult = AgentOpsStaticImportResult;

/** Write/draft safe QA import plan (Stage 11B). Same candidate row shape as static import. */
export interface AgentOpsWriteDraftImportPlan {
  generatedAt: string;
  source: string;
  sourceRunId: string | null;
  summary: {
    totalCandidates: number;
    fromReportFindings: number;
    findingsSkipped: number;
    permissionReviewCount: number;
    testabilityCount: number;
    piterDecisionNeededCount: number;
    skippedIntentional: number;
  };
  skippedIntentional: Array<{
    reason: string;
    qaUserId?: string;
    workflowId?: string;
    sourceFindingId?: string;
    title?: string;
    detail?: string;
  }>;
  candidates: AgentOpsStaticImportCandidate[];
}

export interface AgentOpsWriteDraftImportPreview {
  plan: AgentOpsWriteDraftImportPlan | null;
  available: boolean;
  message: string;
}

export type AgentOpsWriteDraftImportResult = AgentOpsStaticImportResult;

/** Role workflow QA import plan (Stage 10B). Same candidate row shape as static import. */
export interface AgentOpsWorkflowImportPlan {
  generatedAt: string;
  source: string;
  sourceRunId: string | null;
  summary: {
    totalCandidates: number;
    totalReviewed: number;
    skippedCount: number;
    classificationCounts: Record<string, number>;
    piterDecisionNeededCount: number;
  };
  skippedFindings: Array<{
    findingId?: string;
    qaUserId?: string;
    route?: string;
    classification?: string;
    reason?: string;
  }>;
  workflowScopeUpdatesRecommended: Array<{
    findingId?: string;
    qaUserId?: string;
    route?: string;
    recommendation?: string;
  }>;
  candidates: AgentOpsStaticImportCandidate[];
}

export interface AgentOpsWorkflowImportPreview {
  plan: AgentOpsWorkflowImportPlan | null;
  available: boolean;
  message: string;
}

export type AgentOpsWorkflowImportResult = AgentOpsStaticImportResult;

/** Owner-only backlog resolution (Stage 10H) — not for Active Top 10 items. */
export type AgentOpsBacklogResolutionStatus =
  | "Verified Fixed"
  | "False Positive"
  | "Deferred";

export interface AgentOpsBacklogResolutionInput {
  findingId: string;
  resolutionStatus: AgentOpsBacklogResolutionStatus;
  note?: string;
  evidenceSummary?: string;
  evidenceReportPath?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentOpsBacklogResolutionResult {
  finding: AgentOpsFinding | null;
  feedbackId?: string | null;
  message: string;
}

/** Backlog capacity relative to refill threshold (Stage 14). */
export type AgentOpsBacklogHealthStatus = "healthy" | "low" | "empty";

/** Active Top 10 fill state (Stage 14). */
export type AgentOpsActiveQueueHealthStatus = "full" | "needs_refill";

/** Owner-facing queue health recommendation (Stage 14). */
export type AgentOpsQueueHealthRecommendedAction =
  | "no_action"
  | "refill_from_backlog"
  | "generate_more_candidates"
  | "refill_and_generate_more_candidates"
  | "run_scan_import_plan";

/** Owner decision on queue health panel (Stage 14). */
export type AgentOpsQueueHealthDecision =
  | "refill_now"
  | "generate_candidates"
  | "hold"
  | "run_manual_scan"
  | "owner_note";

export interface AgentOpsQueueHealth {
  activeOpenCount: number;
  activeTarget: number;
  openSlots: number;
  backlogCount: number;
  lowBacklogThreshold: number;
  backlogStatus: AgentOpsBacklogHealthStatus;
  activeStatus: AgentOpsActiveQueueHealthStatus;
  recommendedAction: AgentOpsQueueHealthRecommendedAction;
  recommendedCommands: string[];
  explanation: string;
  canRefillNow: boolean;
  canImportCandidatesAvailable: boolean;
  lastRunSummary: string | null;
  latestOrchestratorReportPath: string;
}

export interface AgentOpsQueueHealthDecisionInput {
  decision: AgentOpsQueueHealthDecision;
  note?: string;
  recommendedAction: AgentOpsQueueHealthRecommendedAction;
  activeOpenCount: number;
  backlogCount: number;
}

export interface AgentOpsQueueHealthDecisionRecord {
  feedbackId: string;
  message: string;
}

/** Manual scan workflow step status (Stage 14B). */
export type AgentOpsManualScanWorkflowStepStatus =
  | "not_started"
  | "copied"
  | "owner_marked_running"
  | "owner_marked_completed"
  | "blocked";

/** Import / scan category for workflow steps (Stage 14B). */
export type AgentOpsManualScanWorkflowImportType =
  | "static"
  | "browser"
  | "role_workflow"
  | "write_draft"
  | "fix_plans"
  | "orchestrator"
  | "refill";

export interface AgentOpsManualScanWorkflowStep {
  stepId: string;
  label: string;
  description: string;
  command: string | null;
  expectedOutput: string;
  status: AgentOpsManualScanWorkflowStepStatus;
  relatedImportType: AgentOpsManualScanWorkflowImportType | null;
  /** When true, step is completed via an existing UI action (Refill / Import modal). */
  isUiAction?: boolean;
}

export interface AgentOpsManualScanImportShortcut {
  importType: AgentOpsManualScanWorkflowImportType;
  label: string;
  planPath: string;
  candidateCount: number;
  available: boolean;
  message: string;
}

export interface AgentOpsManualScanWorkflow {
  recommendation: string;
  workflowTitle: string;
  steps: AgentOpsManualScanWorkflowStep[];
  currentQueueHealth: AgentOpsQueueHealth;
  ownerNotes: string | null;
  latestDecision: string | null;
  importShortcuts: AgentOpsManualScanImportShortcut[];
}

export type AgentOpsManualScanStepAction =
  | "copied_command"
  | "marked_running"
  | "marked_completed"
  | "blocked"
  | "owner_note";

export interface AgentOpsManualScanStepInput {
  stepId: string;
  action: AgentOpsManualScanStepAction;
  note?: string;
  command?: string | null;
  queueHealthSnapshot: AgentOpsQueueHealth;
}

export interface AgentOpsManualScanStepRecord {
  feedbackId: string;
  message: string;
  status: AgentOpsManualScanWorkflowStepStatus;
}

export type AgentOpsImportReviewDecision =
  | "review_later"
  | "approved_for_manual_import"
  | "rejected"
  | "needs_regeneration";

export interface AgentOpsImportReviewDecisionInput {
  importType: "static" | "browser" | "role_workflow" | "write_draft";
  decision: AgentOpsImportReviewDecision;
  note?: string;
  planPath: string;
  queueHealthSnapshot?: AgentOpsQueueHealth;
}

export interface AgentOpsImportReviewDecisionRecord {
  feedbackId: string;
  message: string;
}

/** Import plan source identifiers (Stage 14C). */
export type AgentOpsImportSourceId =
  | "static"
  | "browser"
  | "role_workflow"
  | "role_workflow_approved"
  | "write_draft"
  | "write_draft_approved";

/** Per-candidate / source review status (Stage 14C). */
export type AgentOpsImportCandidateReviewStatus =
  | "not_reviewed"
  | "approved_for_manual_import"
  | "rejected"
  | "needs_regeneration"
  | "review_later"
  | "imported"
  | "duplicate_skipped";

export interface AgentOpsImportCandidateItem {
  issueCode: string;
  title: string;
  severity: AgentOpsFindingSeverity;
  category: AgentOpsFindingCategory;
  reviewStatus: AgentOpsImportCandidateReviewStatus;
  importedInDb: boolean;
  findingStatus: AgentOpsFindingStatus | null;
  queueState: AgentOpsQueueState | null;
  isHeld: boolean;
  isDuplicateRisk: boolean;
  canImportManually: boolean;
}

export interface AgentOpsImportCandidateSource {
  sourceId: AgentOpsImportSourceId;
  label: string;
  planPath: string;
  category: string;
  planAvailable: boolean;
  candidateCount: number;
  issueCodes: string[];
  severityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  alreadyImportedCount: number;
  duplicateRiskCount: number;
  approvedCount: number;
  rejectedCount: number;
  needsRegenerationCount: number;
  reviewLaterCount: number;
  notReviewedCount: number;
  readyForManualImportCount: number;
  heldIssueCodes: string[];
  recommendedDecision: AgentOpsImportCandidateReviewStatus | "review_later";
  recommendedDecisionLabel: string;
  canImportManually: boolean;
  warnings: string[];
  candidates: AgentOpsImportCandidateItem[];
}

export interface AgentOpsImportReviewSummary {
  generatedAt: string;
  sources: AgentOpsImportCandidateSource[];
  globalWarnings: string[];
}

export type AgentOpsImportCandidateDecision =
  | "approve_candidate"
  | "reject_candidate"
  | "needs_regeneration"
  | "review_later"
  | "approve_source"
  | "reject_source";

export interface AgentOpsImportCandidateDecisionInput {
  sourceId: AgentOpsImportSourceId;
  issueCode?: string;
  decision: AgentOpsImportCandidateDecision;
  note?: string;
  planPath: string;
}

export interface AgentOpsImportCandidateDecisionRecord {
  feedbackId: string;
  message: string;
  reviewStatus: AgentOpsImportCandidateReviewStatus;
}

export interface AgentOpsImportDecisionHistoryItem {
  id: string;
  createdAt: string;
  sourceId: AgentOpsImportSourceId;
  issueCode: string | null;
  decision: string;
  planPath: string;
  remark: string | null;
}

/** Scheduler lifecycle state (Stage 15 — preparation only until activated). */
export type AgentOpsSchedulerStatus = "preparation-only" | "inactive" | "active";

export type AgentOpsSchedulerPreparationDecision =
  | "review_later"
  | "approve_preparation"
  | "reject_scheduler"
  | "request_changes"
  | "keep_manual_only";

export interface AgentOpsSchedulerPreparationStatus {
  schedulerStatus: AgentOpsSchedulerStatus;
  active: boolean;
  environment: string;
  recommendedInitialCadence: string;
  allowedFutureRunModes: string[];
  neverAutoRun: string[];
  futureCadenceOptions: string[];
  ownerApprovalRequiredFor: string[];
  quietDays: string[];
  quietModeExplanation: string;
  safetyChecklistPath: string;
  runbookPath: string;
  prepRulesPath: string;
  latestQueueHealth: AgentOpsQueueHealth | null;
  latestSchedulerDecision: AgentOpsSchedulerPreparationDecision | null;
  latestSchedulerDecisionNote: string | null;
}

export interface AgentOpsSchedulerPreparationDecisionInput {
  decision: AgentOpsSchedulerPreparationDecision;
  note?: string;
}

export interface AgentOpsSchedulerPreparationDecisionRecord {
  feedbackId: string;
  message: string;
}

export type AgentOpsAutomationControlRequestType =
  | "request_qa_check"
  | "request_browser_qa"
  | "request_static_guardrail_scan"
  | "request_guardrail_action_plan"
  | "request_backlog_generation_import"
  | "request_verification_pass"
  | "request_quiet_mode"
  | "request_pause"
  | "request_resume_preparation"
  | "copy_manual_command"
  | "copy_cursor_prompt";

export type AgentOpsAutomationControlRequestStatus =
  | "requested"
  | "copied"
  | "review_later"
  | "cancelled";

export interface AgentOpsAutomationControlRequestInput {
  requestType: AgentOpsAutomationControlRequestType;
  status?: AgentOpsAutomationControlRequestStatus;
  note?: string;
  commandOrPrompt?: string | null;
}

export interface AgentOpsAutomationControlRequestItem {
  feedbackId: string;
  requestType: AgentOpsAutomationControlRequestType;
  status: AgentOpsAutomationControlRequestStatus;
  note: string | null;
  commandOrPrompt: string | null;
  createdAt: string;
  requestedBy: string;
}

export interface AgentOpsAutomationControlRequestRecord {
  feedbackId: string;
  requestType: AgentOpsAutomationControlRequestType;
  status: AgentOpsAutomationControlRequestStatus;
  message: string;
}

/** Hermes H2-F1 — global website memory scan frequency preference (no live scheduler). */
export type AgentOpsGlobalMemoryScanFrequency =
  | "manual_only"
  | "daily_later"
  | "every_6_hours_later"
  | "hourly_later"
  | "event_based_later";

export const AGENTOPS_GLOBAL_MEMORY_SCAN_FREQUENCIES: readonly AgentOpsGlobalMemoryScanFrequency[] =
  ["manual_only", "daily_later", "every_6_hours_later", "hourly_later", "event_based_later"] as const;

export const AGENTOPS_GLOBAL_MEMORY_DEFAULT_SOURCE_IDS = [
  "design-law",
  "tools-hub-registry",
  "agentops-data",
  "routes-structure",
  "guardrails",
  "verified-lessons",
  "qa-mirrors",
  "analytics",
] as const;

export type AgentOpsGlobalMemorySourceId =
  (typeof AGENTOPS_GLOBAL_MEMORY_DEFAULT_SOURCE_IDS)[number];

export type AgentOpsGlobalMemoryScanPausePreference = "active" | "paused";

export interface AgentOpsGlobalMemorySourcePriorityPreference {
  orderedIds: string[];
  sources: Record<string, boolean>;
}

export interface AgentOpsGlobalMemoryPartialSnapshot {
  generatedAt: string;
  mode: "read-only";
  scanMode: string;
  sourceCount: number;
  enabledSourceCount: number;
  toolsHubRegistryNodeCount: number;
  fullCliScanCompleted: false;
  cliScanStatus: "not_run" | "requested";
  note: string;
  sources: Array<{ id: string; title: string; enabled: boolean; priority: number }>;
}

export type AgentOpsGlobalMemoryCommandId =
  | "static_discovery"
  | "static_design_guardrails"
  | "guardrail_action_plan"
  | "full_read_only_scan";

export type AgentOpsGlobalMemoryCommandRunStatus = "success" | "failed" | "rejected";

export interface AgentOpsGlobalMemoryCommandRunResult {
  ok: boolean;
  commandId: AgentOpsGlobalMemoryCommandId | string;
  status: AgentOpsGlobalMemoryCommandRunStatus;
  label?: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  outputSummary: string;
  reportPaths?: string[];
  errorMessage?: string;
  fullCliScanConfirmed?: boolean;
}

export interface AgentOpsGlobalMemoryCommandRunnerStatus {
  available: boolean;
  stagingOnly: boolean;
  allowedCommandIds: AgentOpsGlobalMemoryCommandId[];
  rejectionReason: string | null;
}

export interface AgentOpsGlobalMemoryPreferences {
  frequency: AgentOpsGlobalMemoryScanFrequency;
  frequencySavedAt: string | null;
  sourcePriority: AgentOpsGlobalMemorySourcePriorityPreference;
  sourcePrioritySavedAt: string | null;
  pausePreference: AgentOpsGlobalMemoryScanPausePreference;
  pauseSavedAt: string | null;
  lastSnapshot: AgentOpsGlobalMemoryPartialSnapshot | null;
  lastScanRequestedAt: string | null;
  lastCommandRun: AgentOpsGlobalMemoryCommandRunResult | null;
  nextScanLabel: string;
}

/** Hermes H2-F2 — global memory candidate (metadata only; no durable write). */
export type AgentOpsGlobalMemoryCandidateType =
  | "global_rule"
  | "design_sot"
  | "tool_rule"
  | "workflow"
  | "repeated_issue"
  | "piter_preference"
  | "guardrail"
  | "route_module";

export type AgentOpsGlobalMemoryCandidateConfidence = "low" | "medium" | "high";

export type AgentOpsGlobalMemoryCandidateRisk = "low" | "medium" | "high";

export type AgentOpsGlobalMemoryCandidateStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_cleanup"
  | "review_later";

export type AgentOpsGlobalMemoryCandidateTargetLevel =
  | "global"
  | "source-of-truth-candidate"
  | "tool-rule"
  | "workflow-rule"
  | "piter-preference";

export type AgentOpsGlobalMemoryCandidateDecision =
  | "approve_for_future_memory"
  | "reject"
  | "review_later"
  | "needs_cleanup";

export interface AgentOpsGlobalMemoryCandidate {
  candidateId: string;
  feedbackId: string | null;
  candidateType: AgentOpsGlobalMemoryCandidateType;
  title: string;
  summary: string;
  proposedMemoryText: string;
  sourceReport: string;
  sourcePath?: string;
  sourceFindingId?: string;
  evidence?: string;
  targetMemoryLevel: AgentOpsGlobalMemoryCandidateTargetLevel;
  targetOwnerFile?: string;
  confidence: AgentOpsGlobalMemoryCandidateConfidence;
  risk: AgentOpsGlobalMemoryCandidateRisk;
  status: AgentOpsGlobalMemoryCandidateStatus;
  requiresPiterApproval: true;
  noDurableMemoryWrite: true;
  noHermesRuntime: true;
  noSotFileWrite: true;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  batchId?: string;
  dedupeKey: string;
}

export interface AgentOpsGlobalMemoryCandidateBatchSummary {
  batchId: string;
  sourceReport: string;
  generatedAt: string;
  candidateCount: number;
  createdAt: string;
}

export interface AgentOpsGlobalMemoryCandidatesOverview {
  candidates: AgentOpsGlobalMemoryCandidate[];
  lastBatch: AgentOpsGlobalMemoryCandidateBatchSummary | null;
  counts: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    reviewLater: number;
    needsCleanup: number;
  };
}

export interface AgentOpsGlobalMemoryCandidateGeneratorStatus {
  available: boolean;
  stagingOnly: boolean;
  primaryReport: string;
  primaryReportExists: boolean;
  allowedReportIds: string[];
  rejectionReason: string | null;
}

export interface AgentOpsGenerateGlobalMemoryCandidatesResult {
  createdCount: number;
  skippedDuplicateCount: number;
  sourceReport: string;
  batchId: string;
  message: string;
  allDuplicates: boolean;
}

export interface AgentOpsGlobalMemoryCandidateDecisionInput {
  candidateId: string;
  decision: AgentOpsGlobalMemoryCandidateDecision;
  note?: string;
}

export interface AgentOpsGlobalMemoryCandidateEditInput {
  candidateId: string;
  title?: string;
  summary?: string;
  proposedMemoryText: string;
  note?: string;
}

/** Hermes H2-F3A — approved global memory record (metadata only). */
export type AgentOpsGlobalMemoryApprovedMemoryType =
  | "advisory"
  | "global_rule"
  | "workflow_rule"
  | "design_rule"
  | "tool_rule"
  | "source_of_truth_proposal"
  | "route_module_rule"
  | "piter_preference";

export type AgentOpsGlobalMemoryApprovedScope =
  | "global"
  | "agentops"
  | "design"
  | "tools"
  | "workflow"
  | "runtime"
  | "advisory";

export type AgentOpsGlobalMemoryApprovedRecordStatus =
  | "approved_memory"
  | "advisory_only"
  | "sot_proposal_pending";

export interface AgentOpsGlobalMemoryApprovedRecord {
  memoryId: string;
  feedbackId: string | null;
  sourceCandidateId: string;
  title: string;
  memoryText: string;
  memoryType: AgentOpsGlobalMemoryApprovedMemoryType;
  scope: AgentOpsGlobalMemoryApprovedScope;
  sourceReport?: string;
  sourcePath?: string;
  sourceFindingId?: string;
  evidence?: string;
  targetOwnerFile?: string;
  sourceCandidateStatus: string;
  approvedBy?: string;
  approvedAt: string;
  status: AgentOpsGlobalMemoryApprovedRecordStatus;
  dedupeKey: string;
  tags: string[];
  requiresPiterApproval: true;
  noSotFileWrite: true;
  noRegistryWrite: true;
  noAgentMemoryWrite: true;
  noHermesRuntimeWrite: true;
  metadataOnly: true;
  hasSotProposal?: boolean;
}

export interface AgentOpsGlobalMemoryApprovedOverview {
  records: AgentOpsGlobalMemoryApprovedRecord[];
  counts: {
    total: number;
    approvedMemory: number;
    advisoryOnly: number;
    sotProposalPending: number;
  };
}

export interface AgentOpsCreateGlobalMemoryApprovedRecordResult {
  created: boolean;
  duplicate: boolean;
  memoryId: string | null;
  feedbackId: string | null;
  sotProposalCreated: boolean;
  message: string;
}

/** Hermes H2-F3B-1 — why a record was excluded from reader preview. */
export type AgentOpsGlobalMemoryHermesPreviewExclusionReason =
  | "empty_memory_text"
  | "unsupported_status"
  | "over_preview_limit";

export interface AgentOpsGlobalMemoryHermesPreviewEntry {
  order: number;
  memoryId: string;
  title: string;
  memoryType: AgentOpsGlobalMemoryApprovedMemoryType;
  scope: AgentOpsGlobalMemoryApprovedScope;
  status: AgentOpsGlobalMemoryApprovedRecordStatus;
  compactMemoryText: string;
  sotProposalPending: boolean;
  previewLine: string;
}

export interface AgentOpsGlobalMemoryHermesPreviewExclusionSummary {
  reason: AgentOpsGlobalMemoryHermesPreviewExclusionReason;
  count: number;
  detail: string;
}

/** Hermes H2-F3B-1 — read-only preview of context Hermes may receive later. */
export interface AgentOpsGlobalMemoryHermesPreviewResult {
  entries: AgentOpsGlobalMemoryHermesPreviewEntry[];
  safetyDisclaimer: string[];
  stats: {
    totalApprovedRecords: number;
    eligibleCount: number;
    includedCount: number;
    excludedCount: number;
    previewLimit: number;
    hardMax: number;
    mode: "preview_only";
  };
  exclusions: AgentOpsGlobalMemoryHermesPreviewExclusionSummary[];
}

export type AgentOpsManagedAgentStatus =
  | "active"
  | "quiet"
  | "needs_memory"
  | "blocked"
  | "disabled";

export type AgentOpsAgentMemoryInputType =
  | "instruction"
  | "preference"
  | "focus"
  | "correction"
  | "feature_idea"
  | "blocked_behavior";

export type AgentOpsAgentMemorySource = "piter" | "agentops" | "cursor_sync_later";

export type AgentOpsAgentMemoryPriority = "low" | "medium" | "high";

export interface AgentOpsManagedAgent {
  agentId: string;
  displayName: string;
  syntheticEmail: string;
  appRole: "admin" | "manager" | "employee" | "guest" | "unknown";
  qaSpecialty: string;
  purpose: string;
  allowedModules: string[];
  blockedModules: string[];
  agentOpsOwnerAccess: boolean;
  memoryMode: AgentOpsHermesMode;
  memoryCount: number;
  currentFocus: string | null;
  lastActivitySummary: string | null;
  lastRunStatus: AgentOpsRunStatus | "unknown";
  latestFindingsCount: number;
  status: AgentOpsManagedAgentStatus;
}

export type AgentOpsMemoryOwnerFacingType =
  | "instruction"
  | "approved_fact"
  | "procedure"
  | "preference"
  | "website_architecture_note"
  | "qa_rule"
  | "known_issue"
  | "lesson_learned"
  | "reference_file";

export type AgentOpsMemoryScope = "private" | "shared" | "global";

export type AgentOpsMemoryApprovalStatus =
  | "active"
  | "disabled"
  | "pending_approval"
  | "rejected"
  | "archived";

export interface AgentOpsAgentMemoryInput {
  agentId: string;
  memoryType: AgentOpsAgentMemoryInputType;
  content: string;
  source: AgentOpsAgentMemorySource;
  priority: AgentOpsAgentMemoryPriority;
  note?: string;
  /** When false, row is stored inactive pending owner approval (default true for legacy callers). */
  activateImmediately?: boolean;
  title?: string;
  ownerFacingType?: AgentOpsMemoryOwnerFacingType;
  scope?: AgentOpsMemoryScope;
  approvalStatus?: AgentOpsMemoryApprovalStatus;
  fileStoragePath?: string | null;
  fileName?: string | null;
}

export interface AgentOpsManagedAgentMemoryItem {
  id: string;
  agentId: string;
  memoryType: string;
  memoryText: string;
  active: boolean;
  confidenceScore: number | null;
  createdAt: string;
  source: AgentOpsAgentMemorySource | null;
  priority: AgentOpsAgentMemoryPriority | null;
  inputMemoryType: AgentOpsAgentMemoryInputType | null;
  note: string | null;
  title: string | null;
  ownerFacingType: AgentOpsMemoryOwnerFacingType | null;
  scope: AgentOpsMemoryScope | null;
  approvalStatus: AgentOpsMemoryApprovalStatus | null;
  fileStoragePath: string | null;
  fileName: string | null;
}

export type AgentOpsAgentInteractionMessageType =
  | "piter_note"
  | "status_question"
  | "feature_idea"
  | "correction"
  | "focus_directive"
  | "fix_instruction"
  | "test_instruction"
  | "memory_update";

export type AgentOpsAgentInteractionSource = "piter" | "agentops" | "cursor_sync_later";

export type AgentOpsAgentInteractionPriority = "low" | "medium" | "high";

export type AgentOpsAgentInteractionStatus =
  | "logged"
  | "acknowledged_later"
  | "needs_agent_review"
  | "ready_for_future_sync";

export interface AgentOpsAgentInteractionInput {
  agentId: string;
  messageType: AgentOpsAgentInteractionMessageType;
  content: string;
  priority?: AgentOpsAgentInteractionPriority;
  status?: AgentOpsAgentInteractionStatus;
  source?: AgentOpsAgentInteractionSource;
  note?: string;
}

export interface AgentOpsAgentInteractionRecord {
  feedbackId: string;
  agentId: string;
  messageType: AgentOpsAgentInteractionMessageType;
  content: string;
}

export interface AgentOpsAgentInteractionItem {
  id: string;
  agentId: string;
  messageType: AgentOpsAgentInteractionMessageType;
  content: string;
  createdAt: string;
  createdBy: string;
  source: AgentOpsAgentInteractionSource;
  priority: AgentOpsAgentInteractionPriority;
  status: AgentOpsAgentInteractionStatus;
}

export interface AgentOpsAgentStatusSummary {
  agentId: string;
  currentStatus: AgentOpsManagedAgentStatus;
  currentFocus: string | null;
  memoryCount: number;
  interactionCount: number;
  latestInteraction: AgentOpsAgentInteractionItem | null;
  latestInstruction: AgentOpsAgentInteractionItem | null;
  latestFeatureIdea: AgentOpsAgentInteractionItem | null;
  latestCorrection: AgentOpsAgentInteractionItem | null;
  latestRunSummary: string | null;
  latestFindingsCount: number;
}

export type AgentOpsAgentMemoryFileStatus = "created" | "missing" | "stale" | "not_generated";

export type AgentOpsAgentMemoryFileSafetyStatus = "safe" | "warning" | "blocked";

export interface AgentOpsAgentMemoryFileReviewItem {
  agentId: string;
  displayName: string;
  syntheticEmail: string;
  agentSkillSpecialty: string;
  targetFilePath: string;
  fileExists: boolean;
  fileStatus: AgentOpsAgentMemoryFileStatus;
  generatedAt: string | null;
  memoryCount: number;
  interactionCount: number;
  skippedItemsCount: number;
  sensitiveWarningsCount: number;
  syncStatus: string;
  safetyStatus: AgentOpsAgentMemoryFileSafetyStatus;
  notes: string;
}

export interface AgentOpsAgentMemoryFileReviewSummary {
  totalAgents: number;
  filesCreated: number;
  filesMissing: number;
  sensitiveWarningsCount: number;
  skippedItemsCount: number;
  liveSyncActive: boolean;
  hermesAutomation: boolean;
  codeGraphAutomation: boolean;
  finalRulebooksCreated: boolean;
  latestExportReportPath: string;
}

export type AgentOpsMemoryRefreshChangeType =
  | "add_memory"
  | "update_focus"
  | "add_interaction_note"
  | "add_correction"
  | "add_feature_idea"
  | "add_fix_instruction"
  | "add_test_instruction"
  | "remove_unsafe_item";

export type AgentOpsMemoryRefreshStatus =
  | "no_change"
  | "draft_ready"
  | "blocked_sensitive_content"
  | "missing_existing_file"
  | "skipped_no_memory";

export interface AgentOpsMemoryRefreshProposedChange {
  changeType: AgentOpsMemoryRefreshChangeType;
  sourceRecordId: string;
  summary: string;
  safeToExport: boolean;
  reason: string;
}

export interface AgentOpsMemoryRefreshPlanItem {
  agentId: string;
  displayName: string;
  targetFilePath: string;
  draftFilePath: string;
  existingFileFound: boolean;
  dbMemoryCount: number;
  dbInteractionCount: number;
  existingFileMemorySummary: string;
  proposedChangeCount: number;
  proposedChanges: AgentOpsMemoryRefreshProposedChange[];
  sensitiveWarnings: string[];
  skippedItems: Array<{ sourceRecordId: string; reason: string }>;
  refreshStatus: AgentOpsMemoryRefreshStatus;
  ownerReviewRequired: boolean;
}

export interface AgentOpsMemoryRefreshPlanSummary {
  totalAgents: number;
  agentsWithChanges: number;
  agentsNoChange: number;
  sensitiveWarningsCount: number;
  skippedItemsCount: number;
  draftFilesCreated: number;
}

export interface AgentOpsMemoryRefreshPlan {
  version: string;
  generatedAt: string | null;
  dryRun: boolean;
  sourceDbRead: { enabled: boolean; reason: string };
  previousExportReportPath: string;
  previousMemoryFilesFolder: string;
  draftOutputFolder: string;
  agents: AgentOpsMemoryRefreshPlanItem[];
  summary: AgentOpsMemoryRefreshPlanSummary;
  safety: {
    liveSyncActive: boolean;
    hermesAutomation: boolean;
    codeGraphAutomation: boolean;
    finalRulebooksCreated: boolean;
  };
  recommendedAction: string;
}

export type AgentOpsMemoryRefreshDecision =
  | "approve_draft_generation"
  | "review_later"
  | "needs_cleanup"
  | "reject_refresh"
  | "approve_future_manual_export";

export type AgentOpsAgentAttentionLabel =
  | "No Memory"
  | "Needs Focus"
  | "Blocked"
  | "Memory File Missing"
  | "Sensitive Warning"
  | "Refresh Blocked"
  | "Recently Updated"
  | "OK";

export interface AgentOpsAgentStatusDashboardItem {
  agentId: string;
  displayName: string;
  agentSkillSpecialty: string;
  appRole: AgentOpsManagedAgent["appRole"];
  status: AgentOpsManagedAgentStatus;
  currentFocus: string | null;
  memoryCount: number;
  interactionCount: number;
  latestInteractionAt: string | null;
  latestInteractionSummary: string | null;
  latestFindingCount: number;
  latestRunStatus: AgentOpsRunStatus | "unknown";
  memoryFileStatus: AgentOpsAgentMemoryFileStatus;
  refreshStatus: AgentOpsMemoryRefreshStatus;
  needsAttention: boolean;
  attentionReason: AgentOpsAgentAttentionLabel;
}

export interface AgentOpsAgentStatusDashboardSummary {
  totalAgents: number;
  activeAgents: number;
  quietAgents: number;
  blockedAgents: number;
  needsMemoryAgents: number;
  agentsWithRecentInteractions: number;
  agentsWithMemoryFiles: number;
  agentsNeedingAttention: number;
  sensitiveWarningsCount: number;
  liveSyncActive: boolean;
  finalRulebooksCreated: boolean;
}

export type AgentOpsAgentTimelineEventType =
  | "status_change"
  | "memory_added"
  | "focus_directive"
  | "correction"
  | "feature_idea"
  | "fix_instruction"
  | "test_instruction"
  | "interaction_note"
  | "memory_file_review"
  | "memory_refresh_decision"
  | "import_review_decision"
  | "queue_health_decision"
  | "scheduler_decision"
  | "cursor_handoff"
  | "verification_request";

export type AgentOpsAgentTimelineSource = "piter" | "agentops" | "cursor_sync_later" | "system_report";

export type AgentOpsAgentTimelineStatus = "logged" | "reviewed" | "needs_follow_up" | "archived";

export interface AgentOpsAgentTimelineItem {
  id: string;
  agentId: string;
  eventType: AgentOpsAgentTimelineEventType;
  title: string;
  summary: string;
  source: AgentOpsAgentTimelineSource;
  priority: AgentOpsAgentInteractionPriority;
  createdAt: string;
  metadata: Record<string, unknown>;
  relatedPath: string | null;
  relatedIssueCode?: string | null;
  status: AgentOpsAgentTimelineStatus;
}

export interface AgentOpsAgentTimelineSummary {
  agentId: string;
  totalEvents: number;
  latestEventAt: string | null;
  memoryEvents: number;
  interactionEvents: number;
  decisionEvents: number;
  needsFollowUpCount: number;
  latestStatus: AgentOpsManagedAgentStatus | null;
  latestFocus: string | null;
}

export type AgentOpsFocusDirectiveSource =
  | "piter_remark"
  | "agent_memory"
  | "agent_interaction"
  | "owner_feedback"
  | "scan_result"
  | "manual_entry";

export type AgentOpsFocusDirectiveType =
  | "prioritize_module"
  | "deprioritize_module"
  | "prioritize_issue_type"
  | "deprioritize_issue_type"
  | "prioritize_agent"
  | "assign_agent_focus"
  | "ignore_pattern"
  | "raise_severity_pattern"
  | "lower_severity_pattern"
  | "workflow_focus"
  | "route_focus"
  | "design_focus"
  | "permission_focus"
  | "business_logic_focus"
  | "stability_focus";

export type AgentOpsFocusDirectiveTarget =
  | "module"
  | "route"
  | "issueType"
  | "agentId"
  | "severity"
  | "workflow"
  | "keyword";

export interface AgentOpsFocusDirective {
  directiveId: string;
  title: string;
  description: string;
  source: AgentOpsFocusDirectiveSource;
  directiveType: AgentOpsFocusDirectiveType;
  target: AgentOpsFocusDirectiveTarget;
  targetValue: string;
  priorityWeight: number;
  active: boolean;
  expiresAt?: string | null;
  createdBy: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface AgentOpsFocusRankingPreviewItem {
  issueCode: string;
  title: string;
  currentPriority: number;
  focusBoostPenalty: number;
  recommendedRank: number;
  recommendedAgent: string | null;
  recommendedScanMode: string | null;
  recommendedValidationCommand: string | null;
  explanation: string;
  requiresPiterApproval: boolean;
}

export interface AgentOpsFocusRankingPreview {
  generatedAt: string;
  rulesVersion: string;
  items: AgentOpsFocusRankingPreviewItem[];
}

export type AgentOpsFocusRankingDecision =
  | "approve_preview"
  | "reject_preview"
  | "apply_later"
  | "needs_adjustment"
  | "hold";

/** Map recorded verification outcome to finding status. */
export function mapVerificationStatusToFindingStatus(
  verificationStatus: AgentOpsVerificationResultStatus,
): AgentOpsFindingStatus {
  switch (verificationStatus) {
    case "verified_fixed":
      return "Verified Fixed";
    case "still_broken":
      return "Still Broken";
    case "needs_follow_up_fix":
      return "Needs Follow-Up Fix";
    case "verification_blocked":
      return "Verification Blocked";
    default: {
      const _exhaustive: never = verificationStatus;
      return _exhaustive;
    }
  }
}

/** Map recorded verification outcome to queue_state. */
export function mapVerificationStatusToQueueState(
  verificationStatus: AgentOpsVerificationResultStatus,
): AgentOpsQueueState {
  return verificationStatus === "verified_fixed" ? "archived" : "active_top_10";
}

/** Finding statuses treated as closed for Active Top 10 open counts. */
export const AGENTOPS_CLOSED_FINDING_STATUSES: readonly AgentOpsFindingStatus[] = [
  "Verified Fixed",
  "Rejected",
  "Deferred",
  "False Positive",
  "Archived",
] as const;

/** Closed statuses (alias for write/queue rules). */
export const AGENTOPS_CLOSED_STATUSES = AGENTOPS_CLOSED_FINDING_STATUSES;

/** Statuses that may remain in the Active Top 10 queue while open. */
export const AGENTOPS_OPEN_ACTIVE_STATUSES: readonly AgentOpsFindingStatus[] = [
  "Active Top 10",
  "Owner Reviewed",
  "Approved for Fix",
  "In Progress",
  "Marked Fixed by Piter",
  "Verification Running",
] as const;
