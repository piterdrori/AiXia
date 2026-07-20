/**
 * Agent Detail Phase B1 — truthful owner copy and display helpers.
 * Pure helpers only (no API / DB writes).
 */

import type { AgentOpsAgentTimelineItem, AgentOpsManagedAgent } from "@/lib/agentops/types";

export type AgentDetailReviewStatus = "completed" | "running" | "failed" | "not_run";

export type AgentDetailOwnerWorkStatus = "Active" | "Paused" | "Blocked";

export const AGENT_DETAIL_B1_COPY = {
  chatSubtitle: "Ask this agent about its work, findings, and recommendations.",
  runNowDisabled: "Single-agent review is not connected yet.",
  runNowHint:
    "Single-agent runs use the staging worker. Fleet daily review stays on Monitoring.",
  noQualifyingFindings: "No qualifying findings were produced by this review.",
  noQualifyingFindingsCaveat: "This result does not confirm that the website has no issues.",
  assignedAreasHelper:
    "These are the agent’s assigned areas, not proof that every route was reviewed in the latest run.",
  findingsScope: "Showing the latest active findings linked to this agent.",
  ownerWorkStatusHelper:
    "This controls the agent’s owner-facing work status. It does not currently remove the agent from fleet monitoring reviews.",
  workPreferenceHelper:
    "This preference is stored on the agent record. It does not change the fleet daily, six-hour, or weekly monitoring schedules.",
  fleetAutomationLabel: "Managed from Monitoring. Read-only on this page.",
  pauseSuccess: "Agent owner status changed to Paused.",
  activateSuccess: "Agent owner status changed to Active.",
  statusProgress: "Updating owner work status…",
  preferenceManualSuccess: "Work preference set to Manual preference.",
  preferenceScheduledSuccess: "Work preference set to Scheduled preference.",
  activityEmpty: "No recent operational activity.",
  durationNotRecorded: "Duration was not recorded.",
  approvalTitle: "What requires owner approval?",
  approvalItems: [
    "approving or rejecting findings",
    "promoting a draft to an active issue",
    "applying memory",
    "saving an edited fix prompt",
    "marking fixed or verifying where supported",
  ] as const,
  approvalAutomationLimit:
    "Scheduled reviews may run automatically, but they cannot automatically fix code, promote findings, apply memory, open pull requests, or deploy.",
  reviewType: "Daily agent review",
} as const;

/** Forbidden Phase B1 phrases — regressions if they reappear as owner-facing claims. */
export const AGENT_DETAIL_B1_FORBIDDEN_PHRASES = [
  "Routes reviewed",
  "No findings: Yes",
  "No findings\nYes",
  "website has no issues",
  "site is clean",
  "removed from scheduled reviews",
  "Agent removed from scheduled",
] as const;

export function ownerWorkStatusLabel(
  status: AgentOpsManagedAgent["status"] | null | undefined,
  isBlocked = false,
): AgentDetailOwnerWorkStatus {
  if (isBlocked || status === "blocked") return "Blocked";
  if (status === "quiet" || status === "disabled") return "Paused";
  return "Active";
}

export function mapRosterToReviewStatus(row: {
  todayStatus: string;
  todayResult: string;
  agentStatus: string;
} | null): AgentDetailReviewStatus {
  if (!row) return "not_run";
  const status = row.todayStatus.toLowerCase();
  if (status.includes("running") || status.includes("in_progress")) return "running";
  if (status.includes("fail") || status.includes("blocked") || status.includes("missing")) {
    return "failed";
  }
  if (
    status.includes("complete") ||
    row.todayResult === "no_findings" ||
    row.todayResult === "findings"
  ) {
    return "completed";
  }
  if (status.includes("not_run") || row.todayResult === "not_run" || row.todayResult === "missing") {
    return "not_run";
  }
  // Agent paused on roster is not a review outcome.
  if (
    row.agentStatus.toLowerCase().includes("paused") ||
    row.agentStatus.toLowerCase().includes("disabled")
  ) {
    return "not_run";
  }
  return "failed";
}

export function reviewStatusLabel(status: AgentDetailReviewStatus): string {
  if (status === "completed") return "Completed";
  if (status === "running") return "Running";
  if (status === "failed") return "Failed";
  return "Not run";
}

export function ownerStatusChangeFeedback(
  next: AgentOpsManagedAgent["status"],
): string {
  if (next === "active") return AGENT_DETAIL_B1_COPY.activateSuccess;
  if (next === "quiet" || next === "disabled") return AGENT_DETAIL_B1_COPY.pauseSuccess;
  if (next === "blocked") return "Agent owner status changed to Blocked.";
  return `Agent owner status changed to ${next}.`;
}

export function workPreferenceLabel(
  schedule: { enableSchedule?: boolean; scheduleType?: string | null } | null,
): string {
  if (!schedule) return "Unavailable";
  if (!schedule.enableSchedule || schedule.scheduleType === "manual") {
    return "Manual preference";
  }
  return "Scheduled preference";
}

type OperationalKind = "review" | "finding" | "owner_control" | "other";

const NOISE_EVENT_TYPES = new Set<AgentOpsAgentTimelineItem["eventType"]>([
  "memory_added",
  "focus_directive",
  "correction",
  "feature_idea",
  "fix_instruction",
  "test_instruction",
  "interaction_note",
  "memory_file_review",
  "memory_refresh_decision",
  "import_review_decision",
  "queue_health_decision",
  "cursor_handoff",
]);

function operationalKind(item: AgentOpsAgentTimelineItem): OperationalKind {
  const type = item.eventType;
  const blob = `${type} ${item.title} ${item.summary}`.toLowerCase();

  if (type === "status_change" || type === "scheduler_decision") return "owner_control";
  if (/chat activity|^memory:/i.test(item.title)) return "other";
  if (Boolean(item.relatedIssueCode) || /finding|issue|promot|defer|reject/i.test(blob)) {
    return "finding";
  }
  if (type === "verification_request" || /daily|review|run complete|cycle|execution/i.test(blob)) {
    return "review";
  }
  if (/status|schedule|preference|work mode|paused|activat|hermes|memory approval|draft/i.test(blob)) {
    return "owner_control";
  }
  if (NOISE_EVENT_TYPES.has(type)) return "other";
  return "other";
}

/** Prefer review / finding / owner status-preference events; max N; skip raw memory/chat noise. */
export function selectOperationalActivity(
  items: AgentOpsAgentTimelineItem[],
  max = 3,
): { items: AgentOpsAgentTimelineItem[]; hasMoreTechnicalHistory: boolean } {
  const byKind: Record<"review" | "finding" | "owner_control", AgentOpsAgentTimelineItem[]> = {
    review: [],
    finding: [],
    owner_control: [],
  };
  for (const item of items) {
    const kind = operationalKind(item);
    if (kind === "other") continue;
    byKind[kind].push(item);
  }

  const selected: AgentOpsAgentTimelineItem[] = [];
  for (const kind of ["review", "finding", "owner_control"] as const) {
    if (selected.length >= max) break;
    const next = byKind[kind][0];
    if (next) selected.push(next);
  }
  // Fill remaining slots with any leftover operational events (newest-first input order).
  if (selected.length < max) {
    const chosen = new Set(selected.map((item) => item.id));
    for (const item of items) {
      if (selected.length >= max) break;
      if (chosen.has(item.id)) continue;
      if (operationalKind(item) === "other") continue;
      selected.push(item);
      chosen.add(item.id);
    }
  }

  return {
    items: selected.slice(0, max),
    hasMoreTechnicalHistory: items.length > selected.length,
  };
}

export function operationalActivityLabel(item: AgentOpsAgentTimelineItem): string {
  const kind = operationalKind(item);
  if (kind === "review") return "Latest review";
  if (kind === "finding") return "Finding update";
  if (kind === "owner_control") {
    if (/schedule|preference|work mode/i.test(`${item.title} ${item.summary}`)) {
      return "Work preference changed";
    }
    return "Owner status changed";
  }
  return item.title || item.eventType.replaceAll("_", " ");
}

export function formatAssignedAreas(
  allowedModules: string[] | null | undefined,
  responsibilitySummary: string | null | undefined,
): string {
  if (allowedModules && allowedModules.length > 0) {
    return allowedModules.slice(0, 8).join(" · ");
  }
  const summary = (responsibilitySummary ?? "").trim();
  return summary || "Unavailable";
}

export function shouldShowNoQualifyingFindings(row: {
  noFindings?: boolean;
} | null): boolean {
  return Boolean(row?.noFindings);
}

export function claimsFalseRouteCoverage(text: string): boolean {
  return /routes reviewed/i.test(text);
}

export function claimsSiteClean(text: string): boolean {
  if (/does not confirm that the website has no issues/i.test(text)) return false;
  return /(?:website is clean|site is clean|website has no issues|no issues on (the )?website)/i.test(
    text,
  );
}

export function claimsFleetPause(text: string): boolean {
  return /removed from scheduled|stops? (fleet|github|daily.?12)|excludes? from fleet/i.test(
    text,
  );
}
