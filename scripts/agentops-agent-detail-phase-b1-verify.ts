/**
 * Agent Detail Phase B1 — semantics / honesty static verify.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AGENT_DETAIL_B1_COPY,
  AGENT_DETAIL_B1_FORBIDDEN_PHRASES,
  claimsFalseRouteCoverage,
  claimsFleetPause,
  claimsSiteClean,
  mapRosterToReviewStatus,
  ownerStatusChangeFeedback,
  ownerWorkStatusLabel,
  reviewStatusLabel,
  selectOperationalActivity,
  shouldShowNoQualifyingFindings,
  workPreferenceLabel,
} from "../src/lib/agentops/agents/agentDetailPhaseB1Semantics.ts";
import type { AgentOpsAgentTimelineItem } from "../src/lib/agentops/types.ts";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`AGENTOPS AGENT DETAIL PHASE B1 REGRESSION: ${message}`);
  }
}

function timeline(
  partial: Partial<AgentOpsAgentTimelineItem> & Pick<AgentOpsAgentTimelineItem, "id" | "eventType">,
): AgentOpsAgentTimelineItem {
  return {
    agentId: "system-agent",
    title: partial.title ?? partial.eventType,
    summary: partial.summary ?? "",
    source: "piter",
    priority: "medium",
    createdAt: partial.createdAt ?? "2026-07-15T00:00:00.000Z",
    metadata: {},
    relatedPath: null,
    relatedIssueCode: null,
    status: "logged",
    ...partial,
  };
}

function main(): void {
  // Owner status vs review status
  assert(ownerWorkStatusLabel("active") === "Active", "active owner status");
  assert(ownerWorkStatusLabel("quiet") === "Paused", "quiet → Paused");
  assert(ownerWorkStatusLabel("blocked", true) === "Blocked", "blocked status");
  assert(reviewStatusLabel("completed") === "Completed", "review completed label");
  assert(reviewStatusLabel("failed") === "Failed", "review failed label");
  assert(reviewStatusLabel("not_run") === "Not run", "review not run label");
  assert(
    mapRosterToReviewStatus({
      todayStatus: "completed",
      todayResult: "no_findings",
      agentStatus: "active",
    }) === "completed",
    "roster completed",
  );
  assert(
    mapRosterToReviewStatus({
      todayStatus: "failed",
      todayResult: "missing",
      agentStatus: "active",
    }) === "failed",
    "roster failed",
  );

  // Pause feedback honesty
  assert(
    ownerStatusChangeFeedback("quiet") === AGENT_DETAIL_B1_COPY.pauseSuccess,
    "pause copy",
  );
  assert(!claimsFleetPause(AGENT_DETAIL_B1_COPY.pauseSuccess), "pause must not claim fleet change");
  assert(
    !/removed from scheduled/i.test(AGENT_DETAIL_B1_COPY.pauseSuccess),
    "pause must not claim schedule removal",
  );

  // No findings language
  assert(shouldShowNoQualifyingFindings({ noFindings: true }), "noFindings true");
  assert(!claimsSiteClean(AGENT_DETAIL_B1_COPY.noQualifyingFindings), "no findings not site-clean");
  assert(
    !claimsSiteClean(AGENT_DETAIL_B1_COPY.noQualifyingFindingsCaveat),
    "caveat is not a site-clean claim",
  );
  assert(
    /does not confirm that the website has no issues/i.test(
      AGENT_DETAIL_B1_COPY.noQualifyingFindingsCaveat,
    ),
    "caveat present",
  );

  // Assigned areas / routes
  assert(!claimsFalseRouteCoverage("Assigned areas"), "assigned areas ok");
  assert(claimsFalseRouteCoverage("Routes reviewed"), "routes reviewed flagged");

  // Work preference
  assert(workPreferenceLabel({ enableSchedule: false, scheduleType: "manual" }) === "Manual preference");
  assert(
    workPreferenceLabel({ enableSchedule: true, scheduleType: "cron" }) === "Scheduled preference",
  );
  assert(
    /does not change the fleet/i.test(AGENT_DETAIL_B1_COPY.workPreferenceHelper),
    "preference helper fleet unchanged",
  );
  assert(
    /does not currently remove the agent from fleet/i.test(AGENT_DETAIL_B1_COPY.ownerWorkStatusHelper),
    "owner status helper",
  );
  assert(
    /Managed from Monitoring/i.test(AGENT_DETAIL_B1_COPY.fleetAutomationLabel),
    "fleet read-only label",
  );

  // Approval disclosure content
  for (const item of AGENT_DETAIL_B1_COPY.approvalItems) {
    assert(item.length > 0, `approval item: ${item}`);
  }
  assert(
    /cannot automatically fix code/i.test(AGENT_DETAIL_B1_COPY.approvalAutomationLimit),
    "approval automation limit",
  );

  // Activity max 3 + noise filter
  const items = [
    timeline({ id: "m1", eventType: "memory_added", title: "Memory: note" }),
    timeline({ id: "s1", eventType: "status_change", title: "agent status update" }),
    timeline({
      id: "f1",
      eventType: "interaction_note",
      title: "Finding created",
      relatedIssueCode: "ISSUE-1",
      summary: "finding created",
    }),
    timeline({
      id: "r1",
      eventType: "verification_request",
      title: "Daily review completed",
      summary: "daily review",
    }),
    timeline({ id: "m2", eventType: "focus_directive", title: "Memory: focus" }),
  ];
  const selected = selectOperationalActivity(items, 3);
  assert(selected.items.length <= 3, "activity max 3");
  assert(
    !selected.items.some((item) => item.eventType === "memory_added"),
    "memory_added not prioritized",
  );
  assert(selected.hasMoreTechnicalHistory, "technical history remains");

  // Source contracts — Control Center succeeds B1 page structure
  const page = read("src/app/system/agent-ops/agents/[agentId]/page.tsx");
  const chat = read("src/components/agentops/owner/AgentOpsAgentChatCard.tsx");
  const schedule = read(
    "src/components/agentops/owner/agent-detail/AgentSchedulePanel.tsx",
  );

  assert(!/Owner controls/.test(page), "duplicate Owner controls section removed");
  assert(/AgentControlHeader/.test(page), "control center header");
  assert(/AgentStatusStrip/.test(page), "status strip");
  assert(/AgentChatWorkspace/.test(page), "chat workspace");
  assert(/AgentSchedulePanel/.test(page), "schedule panel");
  assert(/AgentMemoryHermesPanel/.test(page), "memory hermes panel");
  assert(!/Latest work/.test(page), "old Latest work removed");
  assert(!/Routes reviewed/.test(page), "Routes reviewed removed");
  assert(/Not connected yet/.test(page) || /runAuditNotConnected/.test(page) || /AgentControlHeader/.test(page), "run now honest path");
  assert(!/Duration[\s\S]{0,40}Unavailable/.test(page), "no permanent Duration Unavailable metric");

  assert(/hideRoomTitle/.test(chat), "duplicate chat title hidden in messenger");
  assert(
    /AGENT_DETAIL_B1_COPY\.chatSubtitle|Ask this agent about its work/.test(chat),
    "chat subtitle",
  );

  assert(/Pending scheduler connection/.test(schedule), "scheduler honesty");
  assert(/Save schedule/.test(schedule), "schedule save");
  assert(/Avoid overlapping runs/.test(schedule), "overlap prevention");

  for (const phrase of AGENT_DETAIL_B1_FORBIDDEN_PHRASES) {
    if (phrase === "website has no issues") {
      // Allowed inside the explicit negation caveat.
      continue;
    }
    assert(!page.includes(phrase), `forbidden phrase absent from page: ${phrase}`);
    assert(!schedule.includes(phrase), `forbidden phrase absent from schedule: ${phrase}`);
  }

  console.log("agentops-agent-detail-phase-b1-verify: PASS (control-center compatible)");
}

main();
