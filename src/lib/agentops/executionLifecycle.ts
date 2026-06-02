import type {
  AgentOpsFinding,
  AgentOpsGeneratedFixPlan,
  AgentOpsManualExecutionState,
  AgentOpsOwnerFeedback,
  AgentOpsVerificationRequestItem,
} from "./types";

export type { AgentOpsManualExecutionState };

export type LifecycleStepStatus = "complete" | "current" | "blocked" | "pending";

export type LifecycleRailStep = {
  id: string;
  label: string;
  status: LifecycleStepStatus;
  timestamp: string | null;
  explanation: string;
  nextAction: string;
};

export type IssueTimelineEvent = {
  id: string;
  at: string;
  title: string;
  summary: string;
  source: string;
};

export type ExecutionLifecycleContext = {
  issueCode: string;
  finding: AgentOpsFinding | null;
  fixPlan: AgentOpsGeneratedFixPlan | null;
  verificationItem: AgentOpsVerificationRequestItem | null;
  handoffHistory: AgentOpsOwnerFeedback[];
  fixDecisionHistory: AgentOpsOwnerFeedback[];
  ownerFeedback: AgentOpsOwnerFeedback[];
  approvedPrompt: string;
};

function meta(feedback: AgentOpsOwnerFeedback): Record<string, unknown> {
  if (!feedback.metadata || typeof feedback.metadata !== "object") return {};
  return feedback.metadata as Record<string, unknown>;
}

function findingMeta(finding: AgentOpsFinding | null): Record<string, unknown> {
  return finding?.metadata && typeof finding.metadata === "object" ? finding.metadata : {};
}

export function readStoredExecutionState(finding: AgentOpsFinding | null): AgentOpsManualExecutionState | null {
  const raw = findingMeta(finding).executionState;
  if (typeof raw !== "string") return null;
  return raw as AgentOpsManualExecutionState;
}

function latestHandoffFeedback(handoffHistory: AgentOpsOwnerFeedback[]): AgentOpsOwnerFeedback | null {
  return handoffHistory.find((row) => meta(row).action === "cursor_handoff") ?? null;
}

function hasApprovedFixPlan(fixDecisionHistory: AgentOpsOwnerFeedback[]): boolean {
  return fixDecisionHistory.some((row) => {
    const m = meta(row);
    return m.action === "fix_plan_decision" && m.decision === "approve_fix_plan";
  });
}

function latestCursorReport(handoffHistory: AgentOpsOwnerFeedback[]): AgentOpsOwnerFeedback | null {
  return handoffHistory.find((row) => meta(row).action === "cursor_fix_report") ?? null;
}

export function deriveExecutionState(ctx: ExecutionLifecycleContext): AgentOpsManualExecutionState {
  const stored = readStoredExecutionState(ctx.finding);
  if (stored) return stored;

  const fm = findingMeta(ctx.finding);
  const handoff = latestHandoffFeedback(ctx.handoffHistory);
  const handoffStatus =
    (typeof fm.latestCursorHandoffStatus === "string" ? fm.latestCursorHandoffStatus : null) ??
    (typeof meta(handoff ?? ({} as AgentOpsOwnerFeedback)).handoffStatus === "string"
      ? (meta(handoff!).handoffStatus as string)
      : null);

  const verificationStatus =
    typeof fm.verificationRequestStatus === "string" ? fm.verificationRequestStatus : null;
  const latestVerification =
    typeof fm.latestVerificationResult === "string" ? fm.latestVerificationResult : null;

  if (ctx.finding?.status === "Verified Fixed" || ctx.finding?.queue_state === "archived") {
    return "closed_verified";
  }
  if (
    ctx.finding?.status === "Still Broken" ||
    ctx.finding?.status === "Needs Follow-Up Fix" ||
    latestVerification === "needs_follow_up_fix"
  ) {
    return "follow_up_required";
  }
  if (latestVerification === "still_broken" || verificationStatus === "verification_failed") {
    return "verification_failed";
  }
  if (latestVerification === "verified_fixed" || verificationStatus === "verification_passed") {
    return "verification_passed";
  }
  if (verificationStatus === "verification_running_manual") {
    return "verification_running_manual";
  }
  if (
    verificationStatus === "verification_requested" ||
    verificationStatus === "ready_to_run" ||
    verificationStatus === "command_copied" ||
    handoffStatus === "verification_requested" ||
    fm.verificationRequested === true
  ) {
    return "verification_requested";
  }
  if (handoffStatus === "cursor_report_received" || handoffStatus === "cursor_report_received") {
    return "cursor_report_received";
  }
  if (handoffStatus === "cursor_working") {
    return "cursor_working_manual";
  }
  if (handoffStatus === "copied_manually") {
    return "cursor_prompt_copied";
  }
  if (handoffStatus === "ready_for_cursor" || handoff) {
    return "execution_request_prepared";
  }
  if (hasApprovedFixPlan(ctx.fixDecisionHistory) || ctx.fixPlan?.latestFixPlanDecision === "approve_fix_plan") {
    return "prompt_approved";
  }
  if (ctx.approvedPrompt.trim() || ctx.fixPlan?.cursorPrompt || ctx.finding?.cursor_prompt) {
    return "prompt_draft_ready";
  }
  return "no_prompt_ready";
}

export function executionStateLabel(state: AgentOpsManualExecutionState): string {
  return state.replaceAll("_", " ");
}

const RAIL_DEFINITIONS: Array<{ id: string; label: string; gate: (s: AgentOpsManualExecutionState) => boolean }> = [
  { id: "found", label: "Issue Found", gate: () => true },
  { id: "summary", label: "Summary Ready", gate: (s) => s !== "no_prompt_ready" },
  { id: "fix_plan", label: "Fix Plan Ready", gate: (s) => ["prompt_draft_ready", "prompt_approved", "execution_request_prepared", "cursor_prompt_copied", "cursor_working_manual", "cursor_report_received", "verification_requested", "verification_running_manual", "verification_passed", "verification_failed", "follow_up_required", "closed_verified", "reopened"].includes(s) },
  { id: "prompt_approved", label: "Prompt Approved", gate: (s) => ["prompt_approved", "execution_request_prepared", "cursor_prompt_copied", "cursor_working_manual", "cursor_report_received", "verification_requested", "verification_running_manual", "verification_passed", "verification_failed", "follow_up_required", "closed_verified", "reopened"].includes(s) },
  { id: "execution_prepared", label: "Execution Request Prepared", gate: (s) => ["execution_request_prepared", "cursor_prompt_copied", "cursor_working_manual", "cursor_report_received", "verification_requested", "verification_running_manual", "verification_passed", "verification_failed", "follow_up_required", "closed_verified", "reopened"].includes(s) },
  { id: "cursor_working", label: "Cursor Working", gate: (s) => ["cursor_working_manual", "cursor_report_received", "verification_requested", "verification_running_manual", "verification_passed", "verification_failed", "follow_up_required", "closed_verified", "reopened"].includes(s) },
  { id: "cursor_reported", label: "Cursor Reported", gate: (s) => ["cursor_report_received", "verification_requested", "verification_running_manual", "verification_passed", "verification_failed", "follow_up_required", "closed_verified", "reopened"].includes(s) },
  { id: "verification", label: "Verification", gate: (s) => ["verification_requested", "verification_running_manual", "verification_passed", "verification_failed", "follow_up_required", "closed_verified", "reopened"].includes(s) },
  { id: "closure", label: "Closure", gate: (s) => ["closed_verified", "reopened"].includes(s) },
];

function stepIndexForState(state: AgentOpsManualExecutionState): number {
  if (state === "no_prompt_ready") return 0;
  if (state === "prompt_draft_ready") return 2;
  if (state === "prompt_approved") return 3;
  if (state === "execution_request_prepared" || state === "cursor_prompt_copied") return 4;
  if (state === "cursor_working_manual") return 5;
  if (state === "cursor_report_received") return 6;
  if (
    state === "verification_requested" ||
    state === "verification_running_manual" ||
    state === "verification_passed" ||
    state === "verification_failed" ||
    state === "follow_up_required"
  ) {
    return 7;
  }
  if (state === "closed_verified" || state === "reopened") return 8;
  return 0;
}

export function buildLifecycleRail(
  ctx: ExecutionLifecycleContext,
  executionState: AgentOpsManualExecutionState,
): LifecycleRailStep[] {
  const currentIdx = stepIndexForState(executionState);
  const fm = findingMeta(ctx.finding);
  const handoff = latestHandoffFeedback(ctx.handoffHistory);

  return RAIL_DEFINITIONS.map((def, index) => {
    let status: LifecycleStepStatus = "pending";
    if (index < currentIdx) status = "complete";
    else if (index === currentIdx) status = "current";
    else if (def.id === "prompt_approved" && !def.gate(executionState)) status = "blocked";
    else if (def.id === "fix_plan" && executionState === "no_prompt_ready") status = "blocked";

    let timestamp: string | null = ctx.finding?.created_at ?? null;
    if (def.id === "execution_prepared" && typeof fm.latestCursorHandoffAt === "string") {
      timestamp = fm.latestCursorHandoffAt;
    }
    if (def.id === "cursor_reported" && typeof fm.latestCursorFixReportAt === "string") {
      timestamp = fm.latestCursorFixReportAt;
    }
    if (def.id === "prompt_approved" && typeof fm.latestFixPlanDecisionAt === "string") {
      timestamp = fm.latestFixPlanDecisionAt;
    }
    if (handoff && (def.id === "execution_prepared" || def.id === "cursor_working")) {
      timestamp = handoff.created_at;
    }

    const nextAction =
      status === "complete"
        ? "Recorded"
        : status === "current"
          ? nextActionForState(executionState)
          : "Waiting for prior step";

    return {
      id: def.id,
      label: def.label,
      status,
      timestamp,
      explanation: explanationForStep(def.id, ctx),
      nextAction,
    };
  });
}

function nextActionForState(state: AgentOpsManualExecutionState): string {
  switch (state) {
    case "no_prompt_ready":
      return "Review summary and fix plan";
    case "prompt_draft_ready":
      return "Approve fix plan and edit prompt";
    case "prompt_approved":
      return "Approve & Prepare Execution Request";
    case "execution_request_prepared":
      return "Copy prompt and run Cursor manually";
    case "cursor_prompt_copied":
      return "Mark Cursor Working when started";
    case "cursor_working_manual":
      return "Record Cursor Report when done";
    case "cursor_report_received":
      return "Approve verification run";
    case "verification_requested":
    case "verification_running_manual":
      return "Record verification result";
    case "verification_passed":
      return "Close or archive issue";
    case "verification_failed":
    case "follow_up_required":
      return "Refine prompt and prepare again";
    case "closed_verified":
      return "Issue closed — reopen if regression returns";
    case "reopened":
      return "Continue manual workflow";
    default:
      return "Review issue workspace";
  }
}

function explanationForStep(stepId: string, ctx: ExecutionLifecycleContext): string {
  switch (stepId) {
    case "found":
      return "Issue is tracked in AgentOps staging queue.";
    case "summary":
      return ctx.finding?.evidence_summary ?? "Summary available from finding record.";
    case "fix_plan":
      return ctx.fixPlan
        ? `Fix plan ${ctx.fixPlan.planId} loaded (${ctx.fixPlan.planStatus}).`
        : "No generated fix plan in current summary JSON.";
    case "prompt_approved":
      return hasApprovedFixPlan(ctx.fixDecisionHistory)
        ? "Owner approved fix plan for this issue."
        : "Approve fix plan before preparing execution.";
    case "execution_prepared":
      return "Manual execution request prepared — Cursor is not auto-started.";
    case "cursor_working":
      return "Cursor work is manual; status is logged here only.";
    case "cursor_reported":
      return "Latest Cursor report intake is stored on this issue.";
    case "verification":
      return ctx.verificationItem?.requestStatus
        ? `Verification status: ${ctx.verificationItem.requestStatus}`
        : "Verification not requested yet.";
    case "closure":
      return `${ctx.finding?.status ?? "Unknown"} · ${ctx.finding?.queue_state ?? "—"}`;
    default:
      return "";
  }
}

export function buildIssueTimeline(ctx: ExecutionLifecycleContext): IssueTimelineEvent[] {
  const events: IssueTimelineEvent[] = [];

  if (ctx.finding?.created_at) {
    events.push({
      id: "finding-created",
      at: ctx.finding.created_at,
      title: "Issue found / imported",
      summary: `${ctx.issueCode} · ${ctx.finding.title}`,
      source: "finding",
    });
  }

  for (const row of ctx.fixDecisionHistory) {
    const m = meta(row);
    if (m.action !== "fix_plan_decision") continue;
    events.push({
      id: row.id,
      at: row.created_at,
      title: "Fix plan decision",
      summary: typeof m.decision === "string" ? String(m.decision) : row.remark ?? "Decision recorded",
      source: "fix_plan",
    });
  }

  for (const row of ctx.handoffHistory) {
    const m = meta(row);
    if (m.action === "cursor_handoff") {
      events.push({
        id: row.id,
        at: row.created_at,
        title: "Cursor handoff",
        summary: typeof m.handoffStatus === "string" ? `Status: ${m.handoffStatus}` : "Handoff logged",
        source: "cursor",
      });
    }
    if (m.action === "cursor_fix_report") {
      const files = Array.isArray(m.filesChanged) ? (m.filesChanged as string[]).join(", ") : "";
      events.push({
        id: row.id,
        at: row.created_at,
        title: "Cursor report received",
        summary: [
          typeof m.validationSummary === "string" ? m.validationSummary : "",
          files ? `Files: ${files}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        source: "cursor",
      });
    }
  }

  for (const row of ctx.ownerFeedback) {
    const m = meta(row);
    if (m.action === "execution_lifecycle_update") {
      events.push({
        id: row.id,
        at: row.created_at,
        title: "Execution lifecycle update",
        summary:
          typeof m.executionState === "string"
            ? `State → ${executionStateLabel(m.executionState as AgentOpsManualExecutionState)}`
            : row.remark ?? "Lifecycle metadata updated",
        source: "lifecycle",
      });
    }
    if (m.action === "issue_agent_message") {
      const sender = typeof m.sender === "string" ? m.sender : "system";
      events.push({
        id: row.id,
        at: row.created_at,
        title: sender === "piter" ? "Agent clarification question" : "Mock agent response",
        summary: typeof m.content === "string" ? m.content.slice(0, 160) : row.remark ?? "Message recorded",
        source: "agent_clarification",
      });
    }
    if (m.action === "manual_verification_result") {
      events.push({
        id: row.id,
        at: row.created_at,
        title: "Verification result",
        summary: typeof m.verificationResult === "string" ? String(m.verificationResult) : "Recorded",
        source: "verification",
      });
    }
    if (m.action === "verification_request_approved") {
      events.push({
        id: row.id,
        at: row.created_at,
        title: "Verification run approved",
        summary: "Owner approved manual verification commands.",
        source: "verification",
      });
    }
    if (m.action === "request_follow_up_fix") {
      events.push({
        id: row.id,
        at: row.created_at,
        title: "Follow-up fix requested",
        summary: row.remark ?? "Issue stays active for another fix cycle.",
        source: "verification",
      });
    }
  }

  if (ctx.verificationItem?.latestVerificationResult) {
    events.push({
      id: `verification-meta-${ctx.issueCode}`,
      at: findingMeta(ctx.finding).latestVerificationResultAt as string | undefined ?? ctx.finding?.updated_at ?? new Date().toISOString(),
      title: "Latest verification outcome",
      summary: ctx.verificationItem.latestVerificationResult,
      source: "finding_metadata",
    });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export function parseCursorReportFromHistory(
  handoffHistory: AgentOpsOwnerFeedback[],
): {
  reportText: string;
  filesChanged: string;
  validationSummary: string;
  validationCommandsRun: string;
  validationResult: string;
  remainingRisks: string;
  followUpNeeded: boolean;
  reportedAt: string | null;
} | null {
  const latest = latestCursorReport(handoffHistory);
  if (!latest) return null;
  const m = meta(latest);
  return {
    reportText: typeof m.reportText === "string" ? m.reportText : "",
    filesChanged: Array.isArray(m.filesChanged) ? (m.filesChanged as string[]).join(", ") : "",
    validationSummary: typeof m.validationSummary === "string" ? m.validationSummary : "",
    validationCommandsRun: typeof m.validationCommandsRun === "string" ? m.validationCommandsRun : "",
    validationResult: typeof m.validationResult === "string" ? m.validationResult : "",
    remainingRisks: typeof m.remainingRisks === "string" ? m.remainingRisks : "",
    followUpNeeded: m.followUpNeeded === true,
    reportedAt: latest.created_at,
  };
}
