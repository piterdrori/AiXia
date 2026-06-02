import type {
  AgentOpsAutomationControlRequestStatus,
  AgentOpsAutomationControlRequestType,
  AgentOpsCursorHandoffStatus,
  AgentOpsFinding,
  AgentOpsFindingStatus,
  AgentOpsFixPlanDecision,
  AgentOpsVerificationResultStatus,
} from "@/lib/agentops";

export type AgentOpsRowActionKind =
  | "remark"
  | "approve"
  | "reject"
  | "defer"
  | "false_positive"
  | "in_progress"
  | "mark_fixed";

export type VerificationResultKind = AgentOpsVerificationResultStatus;

export type CursorHandoffActionKind =
  | "prepare_handoff"
  | "mark_prompt_copied"
  | "mark_cursor_working"
  | "request_verification";

export const STAGE_10G_EVIDENCE_REPORT_PATH =
  "qa-agent/agentops/AGENTOPS_STAGE_10G_GUEST_FINANCE_VERIFICATION_REPORT.md";

export const GUEST_FINANCE_VERIFIED_ISSUE_CODES = new Set([
  "AIXIA-WORKFLOW-RWF-28",
  "AIXIA-WORKFLOW-RWF-29",
]);

export function defaultBacklogEvidencePath(finding: AgentOpsFinding): string {
  if (GUEST_FINANCE_VERIFIED_ISSUE_CODES.has(finding.issue_code)) {
    return STAGE_10G_EVIDENCE_REPORT_PATH;
  }
  return "";
}

export const ROW_ACTION_LABELS: Record<
  AgentOpsRowActionKind,
  { title: string; description: string; requireRemark: boolean }
> = {
  remark: {
    title: "Add remark",
    description: "Save an Owner note on this finding. Status will not change.",
    requireRemark: true,
  },
  approve: {
    title: "Approve for fix",
    description: "Approve this finding for implementation. Optional note below.",
    requireRemark: false,
  },
  reject: {
    title: "Reject finding",
    description: "Reject and archive from Active Top 10. Optional reason below.",
    requireRemark: false,
  },
  defer: {
    title: "Defer finding",
    description: "Defer and archive from Active Top 10. Optional reason below.",
    requireRemark: false,
  },
  false_positive: {
    title: "Mark false positive",
    description:
      "Mark as false positive and archive from Active Top 10. Optional reason below.",
    requireRemark: false,
  },
  in_progress: {
    title: "Mark in progress",
    description: "Mark that you are working on this item. Optional note below.",
    requireRemark: false,
  },
  mark_fixed: {
    title: "Mark fixed",
    description:
      "Mark as fixed by you. Creates pending verification; item stays in Active Top 10 until verified.",
    requireRemark: false,
  },
};

export function getFindingStatusPresentation(status: AgentOpsFindingStatus): {
  hint: string | null;
} {
  if (status === "Marked Fixed by Piter") {
    return { hint: "Waiting for verification" };
  }
  if (status === "Still Broken") {
    return { hint: "Verification failed — still broken" };
  }
  if (status === "Needs Follow-Up Fix") {
    return { hint: "Follow-up fix required" };
  }
  if (status === "Verification Blocked") {
    return { hint: "Verification blocked" };
  }
  if (status === "In Progress") {
    return { hint: "Piter is working on this" };
  }
  if (status === "Approved for Fix") {
    return { hint: "Approved for implementation" };
  }
  return { hint: null };
}

export const FIX_PLAN_DECISION_LABELS: Record<
  AgentOpsFixPlanDecision,
  { title: string; description: string; buttonLabel: string }
> = {
  approve_fix_plan: {
    title: "Approve Plan",
    description:
      "Record Owner approval for this generated fix plan. This does not execute Cursor or modify code.",
    buttonLabel: "Approve Plan",
  },
  reject_fix_plan: {
    title: "Reject Plan",
    description:
      "Record that this generated fix plan is rejected. Finding status remains unchanged in Stage 13C.",
    buttonLabel: "Reject Plan",
  },
  request_better_plan: {
    title: "Request Better Plan",
    description:
      "Record that this plan needs improvement before it can be approved.",
    buttonLabel: "Request Better Plan",
  },
  mark_prompt_used_manually: {
    title: "Mark Prompt Used Manually",
    description:
      "Record that you copied/used the prompt manually. No automated execution is triggered.",
    buttonLabel: "Mark Used Manually",
  },
  copy_prompt_only: {
    title: "Copy Prompt Only",
    description:
      "Record prompt handoff for later manual Cursor use. No execution occurs in this workflow.",
    buttonLabel: "Record Prompt Copy",
  },
};

export const CURSOR_HANDOFF_ACTION_LABELS: Record<
  CursorHandoffActionKind,
  { title: string; description: string; status: AgentOpsCursorHandoffStatus; button: string }
> = {
  prepare_handoff: {
    title: "Prepare Cursor Handoff",
    description:
      "Prepare a controlled handoff package for manual Cursor use. No automatic execution will run.",
    status: "ready_for_cursor",
    button: "Prepare Handoff",
  },
  mark_prompt_copied: {
    title: "Mark Prompt Copied",
    description:
      "Record that the prompt was copied/exported for manual use. Cursor is not executed from AgentOps.",
    status: "copied_manually",
    button: "Mark Copied",
  },
  mark_cursor_working: {
    title: "Mark Cursor Working",
    description:
      "Record that manual Cursor work is in progress for this approved fix plan.",
    status: "cursor_working",
    button: "Mark Working",
  },
  request_verification: {
    title: "Request Verification",
    description:
      "Record verification request after manual Cursor handoff/fix intake. This does not run verification automatically.",
    status: "verification_requested",
    button: "Request Verification",
  },
};

export const VERIFICATION_RESULT_LABELS: Record<
  VerificationResultKind,
  {
    title: string;
    description: string;
    requireBlockedReason: boolean;
    showFollowUpPrompt: boolean;
  }
> = {
  verified_fixed: {
    title: "Mark verified fixed",
    description:
      "Record that targeted verification passed. Finding will archive and leave Active Top 10.",
    requireBlockedReason: false,
    showFollowUpPrompt: false,
  },
  still_broken: {
    title: "Record still broken",
    description:
      "Record that the issue still reproduces. Finding stays in Active Top 10.",
    requireBlockedReason: false,
    showFollowUpPrompt: true,
  },
  needs_follow_up_fix: {
    title: "Record needs follow-up fix",
    description:
      "Primary issue may be fixed but follow-up work remains. Finding stays active.",
    requireBlockedReason: false,
    showFollowUpPrompt: true,
  },
  verification_blocked: {
    title: "Record verification blocked",
    description:
      "Verification could not complete (environment, login, data, etc.). Reason required.",
    requireBlockedReason: true,
    showFollowUpPrompt: false,
  },
};

export const AUTOMATION_CONTROL_ACTIONS: Array<{
  type: AgentOpsAutomationControlRequestType;
  title: string;
  note: string;
  commandOrPrompt?: string;
  status?: AgentOpsAutomationControlRequestStatus;
}> = [
  {
    type: "request_qa_check",
    title: "Request QA Check",
    note: "Record Owner request for a safe QA check run.",
  },
  {
    type: "request_browser_qa",
    title: "Request Browser QA",
    note: "Record Owner request for browser QA smoke workflow.",
  },
  {
    type: "request_static_guardrail_scan",
    title: "Request Static Guardrail Scan",
    note: "Record request to run static guardrail scan manually.",
  },
  {
    type: "request_guardrail_action_plan",
    title: "Request Guardrail Action Plan",
    note: "Record request to generate guardrail action plan manually.",
  },
  {
    type: "request_backlog_generation_import",
    title: "Request Backlog Generation/Import",
    note: "Record request to generate/import backlog candidates manually.",
  },
  {
    type: "request_verification_pass",
    title: "Request Verification Pass",
    note: "Record request for manual verification pass planning.",
  },
  {
    type: "request_quiet_mode",
    title: "Request Quiet Mode",
    note: "Record request to keep quiet mode constraints active.",
  },
  {
    type: "request_pause",
    title: "Request Pause",
    note: "Record request to pause preparation activity.",
  },
  {
    type: "request_resume_preparation",
    title: "Request Resume Preparation",
    note: "Record request to resume preparation-only status.",
  },
];

export function formatImportReviewStatus(status: string): string {
  return status.replaceAll("_", " ");
}

export function importReviewStatusTone(
  status: string,
): "neutral" | "cyan" | "amber" | "emerald" | "rose" | "violet" {
  if (status === "approved_for_manual_import") return "emerald";
  if (status === "imported" || status === "duplicate_skipped") return "cyan";
  if (status === "rejected" || status === "blocked") return "rose";
  if (status === "needs_regeneration") return "violet";
  if (status === "review_later") return "amber";
  return "neutral";
}

export function formatCountMap(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
}

export function severityTone(
  severity: string,
): "rose" | "amber" | "gold" | "cyan" | "neutral" {
  if (severity === "Critical") return "rose";
  if (severity === "High") return "amber";
  if (severity === "Medium") return "gold";
  if (severity === "Low") return "cyan";
  return "neutral";
}

export function verificationStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export function memoryReviewFileStatusTone(
  status: "created" | "stale" | "missing" | "not_generated" | string,
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "created") return "emerald";
  if (status === "stale") return "amber";
  if (status === "missing") return "rose";
  if (status === "not_generated") return "cyan";
  return "neutral";
}

export function memoryReviewSafetyTone(
  status: "safe" | "warning" | "blocked" | string,
): "emerald" | "amber" | "rose" | "neutral" {
  if (status === "safe") return "emerald";
  if (status === "warning") return "amber";
  if (status === "blocked") return "rose";
  return "neutral";
}
