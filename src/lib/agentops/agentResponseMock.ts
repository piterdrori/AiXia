import type {
  AgentOpsAgentMockIntent,
  AgentOpsAgentMockResponse,
  AgentOpsAgentMockResponseInput,
  AgentOpsIssueAgentMessage,
  AgentOpsIssueAgentMessageSender,
  AgentOpsIssueAgentMessageType,
  AgentOpsOwnerFeedback,
} from "./types";

const INSUFFICIENT_EVIDENCE =
  "I do not have enough evidence yet. Ask Cursor to inspect first and report before changing code.";

const MOCK_LIMITATIONS =
  "Mock response only — Hermes not active, CodeGraph not active, no live AI call. Piter must review and approve the final prompt.";

function hasEnoughEvidence(input: AgentOpsAgentMockResponseInput): boolean {
  const summary = input.issueSummary.trim();
  const evidence = input.evidence.trim();
  const fixPlan = input.fixPlan.trim();
  return Boolean(summary || evidence || fixPlan);
}

function knownFilesLine(input: AgentOpsAgentMockResponseInput): string {
  const parts: string[] = [];
  if (input.module?.trim()) parts.push(`module: ${input.module.trim()}`);
  if (input.route?.trim()) parts.push(`route: ${input.route.trim()}`);
  if (parts.length === 0) return "unknown — CodeGraph not active yet.";
  return parts.join(" · ");
}

function confidenceFor(input: AgentOpsAgentMockResponseInput): "low" | "medium" | "high" {
  const hasEvidence = Boolean(input.evidence.trim());
  const hasRootCause = Boolean(input.likelyRootCause?.trim());
  const hasFixPlan = Boolean(input.fixPlan.trim());
  const hasPrompt = Boolean(input.cursorPrompt.trim());
  if (hasEvidence && hasRootCause && hasFixPlan && hasPrompt) return "high";
  if (hasEvidence && (hasFixPlan || hasRootCause)) return "medium";
  return "low";
}

function memorySnippet(agentMemory: string[]): string {
  const active = agentMemory.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  if (active.length === 0) return "No agent memory on file for this reporting agent.";
  return active.map((item) => `- ${item}`).join("\n");
}

function timelineSnippet(timeline: string[]): string {
  const items = timeline.map((item) => item.trim()).filter(Boolean).slice(0, 5);
  if (items.length === 0) return "No timeline events recorded yet.";
  return items.map((item) => `- ${item}`).join("\n");
}

function buildIssueUnderstanding(input: AgentOpsAgentMockResponseInput): string {
  const parts: string[] = [];
  parts.push(`Issue ${input.issueCode}`);
  if (input.severity || input.category) {
    parts.push(`${input.severity ?? "—"} · ${input.category ?? "—"}`);
  }
  if (input.route) parts.push(`Route: ${input.route}`);
  if (input.issueSummary.trim()) parts.push(input.issueSummary.trim());
  return parts.join("\n");
}

function buildEvidenceSection(input: AgentOpsAgentMockResponseInput): string {
  if (input.evidence.trim()) return input.evidence.trim();
  if (input.issueSummary.trim()) return `Summary only: ${input.issueSummary.trim()}`;
  return "No stored evidence summary.";
}

function buildRootCauseSection(input: AgentOpsAgentMockResponseInput): string {
  if (input.likelyRootCause?.trim()) return input.likelyRootCause.trim();
  if (input.recommendedFixStrategy?.trim()) {
    return `Not confirmed — strategy hint: ${input.recommendedFixStrategy.trim()}`;
  }
  return "Likely root cause not confirmed in stored fields.";
}

function buildInspectFirst(input: AgentOpsAgentMockResponseInput): string {
  const files = knownFilesLine(input);
  const lines = [
    `Inspect route/page: ${input.route?.trim() || "unknown — CodeGraph not active yet."}`,
    `Likely files: ${files}`,
    "Reproduce from stored evidence before editing.",
  ];
  if (input.fixPlan.trim()) lines.push(`Fix plan context: ${input.fixPlan.trim().slice(0, 280)}`);
  return lines.join("\n");
}

function buildPromptImprovement(input: AgentOpsAgentMockResponseInput): string {
  const route = input.route?.trim() || "the affected route";
  const evidenceRef = input.evidence.trim()
    ? input.evidence.trim().slice(0, 200)
    : "stored evidence summary";

  return [
    "CURRENT ISSUE — add bullets:",
    `- Issue code: ${input.issueCode}`,
    `- Route: ${route}`,
    `- Evidence: ${evidenceRef}`,
    "",
    "READ FIRST — add:",
    `- Reproduce on ${route} before modifying code.`,
    `- Inspect likely module scope: ${knownFilesLine(input)}`,
    "",
    "DO NOT — reinforce:",
    "- Do not change unrelated logic",
    "- Do not touch production/main",
    "- Do not modify schema/RLS unless explicitly approved",
    "",
    "VALIDATION — ensure present:",
    "- npm run build",
    "- npm run qa:validate-foundation",
    input.route ? `- Route-specific smoke for ${route}` : "- Issue-specific QA smoke when route is known",
    "",
    "FINAL CHECK — keep numbered checklist intact (files created/modified, schema changed, production touched, validation results).",
  ].join("\n");
}

function nextActionForState(executionState: string): string {
  switch (executionState) {
    case "no_prompt_ready":
      return "Review issue summary and generated fix plan.";
    case "prompt_draft_ready":
      return "Clarify evidence gaps, edit prompt, then approve fix plan.";
    case "prompt_approved":
      return "Approve & Prepare Execution Request when prompt is ready.";
    case "execution_request_prepared":
    case "cursor_prompt_copied":
      return "Copy prompt and run Cursor manually — record status here.";
    case "cursor_working_manual":
      return "Wait for Cursor work, then record Cursor Report.";
    case "cursor_report_received":
      return "Approve verification run and record results manually.";
    case "verification_requested":
    case "verification_running_manual":
      return "Run verification commands manually and record outcome.";
    case "verification_passed":
      return "Close or archive after Piter confirms.";
    case "verification_failed":
    case "follow_up_required":
      return "Refine prompt from report feedback and prepare again.";
    case "closed_verified":
      return "Issue closed — reopen only if regression returns.";
    default:
      return "Continue manual-first workflow in Issue Workspace.";
  }
}

function buildRiskNotes(input: AgentOpsAgentMockResponseInput): string {
  const risks: string[] = [];
  if (!input.evidence.trim()) risks.push("Evidence summary is empty — high risk of fixing the wrong thing.");
  if (!input.likelyRootCause?.trim()) risks.push("Root cause not confirmed in stored fields.");
  if (!input.cursorPrompt.trim()) risks.push("No Cursor prompt draft yet — do not hand off until prompt exists.");
  if (input.executionState === "cursor_working_manual") {
    risks.push("Cursor may be in progress — wait for report before changing scope.");
  }
  if (knownFilesLine(input).includes("unknown")) {
    risks.push("Likely files unknown — inspect first; do not guess component paths.");
  }
  risks.push("Mock layer cannot validate runtime behavior — manual verification required.");
  return risks.map((item) => `- ${item}`).join("\n");
}

function buildClarificationResponse(input: AgentOpsAgentMockResponseInput): string {
  return [
    "## Issue understanding",
    buildIssueUnderstanding(input),
    "",
    "## What evidence shows",
    buildEvidenceSection(input),
    "",
    "## Likely root cause (from stored fields)",
    buildRootCauseSection(input),
    "",
    "## What to inspect first",
    buildInspectFirst(input),
    "",
    "## Reporting agent memory (if available)",
    memorySnippet(input.agentMemory),
    "",
    "## Timeline context",
    timelineSnippet(input.timeline),
    "",
    `Your question: ${input.question.trim() || "(no question text)"}`,
  ].join("\n");
}

function buildPromptImprovementResponse(input: AgentOpsAgentMockResponseInput): string {
  const hasPromptSections =
    input.cursorPrompt.includes("TASK:") || input.cursorPrompt.includes("TASK\n");
  return [
    "## Prompt review (12-section standard preserved)",
    hasPromptSections
      ? "Current draft follows structured sections — suggested additions below keep TASK → FINAL CHECK order."
      : "Current draft may be legacy — normalize to 12-section format before approval.",
    "",
    "## Suggested additions (do not auto-apply)",
    buildPromptImprovement(input),
    "",
    "Piter must edit, review, and approve the prompt manually. This mock does not approve or hand off.",
  ].join("\n");
}

function buildRiskReviewResponse(input: AgentOpsAgentMockResponseInput): string {
  return [
    "## Risk review (mock / status-based)",
    buildRiskNotes(input),
    "",
    "## Execution state",
    `Current state: ${input.executionState || "unknown"}`,
    "",
    "## Manual-first reminder",
    "No Cursor auto-run, no shell from UI, no scheduler. All changes require Piter approval.",
  ].join("\n");
}

function buildNextStepResponse(input: AgentOpsAgentMockResponseInput): string {
  return [
    "## Next recommended action",
    nextActionForState(input.executionState),
    "",
    "## Why (from stored workflow state)",
    `- Execution state: ${input.executionState || "unknown"}`,
    `- Fix plan available: ${input.fixPlan.trim() ? "yes" : "no"}`,
    `- Prompt draft available: ${input.cursorPrompt.trim() ? "yes" : "no"}`,
    "",
    "## Timeline context",
    timelineSnippet(input.timeline),
  ].join("\n");
}

/** Deterministic mock agent response — no Hermes, no LLM, no network. */
export function generateAgentOpsMockResponse(
  input: AgentOpsAgentMockResponseInput,
): AgentOpsAgentMockResponse {
  if (!hasEnoughEvidence(input)) {
    return {
      response: INSUFFICIENT_EVIDENCE,
      suggestedPromptChanges: "",
      riskNotes: "- Insufficient stored evidence for prompt suggestions.",
      nextRecommendedAction: "Ask Cursor to inspect first and report before changing code.",
      confidence: "low",
      limitations: MOCK_LIMITATIONS,
    };
  }

  const confidence = confidenceFor(input);
  let response = "";
  let suggestedPromptChanges = "";
  let riskNotes = buildRiskNotes(input);
  let nextRecommendedAction = nextActionForState(input.executionState);

  switch (input.intent) {
    case "prompt_improvement":
      response = buildPromptImprovementResponse(input);
      suggestedPromptChanges = buildPromptImprovement(input);
      nextRecommendedAction = "Review suggested blocks, append to draft if useful, then approve manually.";
      break;
    case "risk_review":
      response = buildRiskReviewResponse(input);
      nextRecommendedAction = "Address listed risks before Prepare Execution Request.";
      break;
    case "next_step":
      response = buildNextStepResponse(input);
      break;
    case "clarification":
    default:
      response = buildClarificationResponse(input);
      if (!input.cursorPrompt.trim()) {
        suggestedPromptChanges = buildPromptImprovement(input);
      }
      break;
  }

  return {
    response,
    suggestedPromptChanges,
    riskNotes,
    nextRecommendedAction,
    confidence,
    limitations: MOCK_LIMITATIONS,
  };
}

function meta(feedback: AgentOpsOwnerFeedback): Record<string, unknown> {
  if (!feedback.metadata || typeof feedback.metadata !== "object") return {};
  return feedback.metadata as Record<string, unknown>;
}

function asSender(value: unknown): AgentOpsIssueAgentMessageSender {
  if (value === "piter" || value === "reporting_agent_mock" || value === "system") return value;
  return "system";
}

function asMessageType(value: unknown): AgentOpsIssueAgentMessageType {
  const allowed: AgentOpsIssueAgentMessageType[] = [
    "clarification_question",
    "agent_clarification",
    "prompt_improvement_suggestion",
    "risk_note",
    "evidence_summary",
    "next_step_recommendation",
  ];
  if (typeof value === "string" && allowed.includes(value as AgentOpsIssueAgentMessageType)) {
    return value as AgentOpsIssueAgentMessageType;
  }
  return "agent_clarification";
}

/** Parse issue-scoped agent messages from owner feedback rows. */
export function parseAgentOpsIssueAgentMessages(
  ownerFeedback: AgentOpsOwnerFeedback[],
  issueCode: string,
): AgentOpsIssueAgentMessage[] {
  const normalizedCode = issueCode.trim();
  const messages: AgentOpsIssueAgentMessage[] = [];

  for (const row of ownerFeedback) {
    const m = meta(row);
    if (m.action !== "issue_agent_message") continue;
    const rowIssueCode = typeof m.issueCode === "string" ? m.issueCode : "";
    if (rowIssueCode && rowIssueCode !== normalizedCode) continue;

    messages.push({
      id: typeof m.messageId === "string" ? m.messageId : row.id,
      issueCode: rowIssueCode || normalizedCode,
      agentId: typeof m.agentId === "string" ? m.agentId : null,
      sender: asSender(m.sender),
      messageType: asMessageType(m.messageType),
      content: typeof m.content === "string" ? m.content : row.remark ?? "",
      createdAt: row.created_at,
      source:
        m.source === "mock_response_layer" || m.source === "owner_feedback"
          ? m.source
          : "issue_workspace",
      metadata: m,
    });
  }

  return messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function mapIntentToPiterMessageType(
  intent: AgentOpsAgentMockIntent,
): AgentOpsIssueAgentMessageType {
  switch (intent) {
    case "prompt_improvement":
      return "clarification_question";
    case "risk_review":
      return "clarification_question";
    case "next_step":
      return "clarification_question";
    case "clarification":
    default:
      return "clarification_question";
  }
}

export function mapIntentToAgentMessageType(
  intent: AgentOpsAgentMockIntent,
): AgentOpsIssueAgentMessageType {
  switch (intent) {
    case "prompt_improvement":
      return "prompt_improvement_suggestion";
    case "risk_review":
      return "risk_note";
    case "next_step":
      return "next_step_recommendation";
    case "clarification":
    default:
      return "agent_clarification";
  }
}
