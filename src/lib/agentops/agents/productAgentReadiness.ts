import type { AgentRuntimeState } from "@/lib/agentops/agentRuntimeState";
import { parseScheduleFromTools } from "@/lib/agentops/agentScheduleConfig";
import type {
  AgentOpsAgentStatus,
  AgentOpsRuntimeAgentRow,
} from "@/lib/agentops/db/agentOpsRuntimeTypes";

import { AGENT_DETAIL_DISPLAY } from "./agentDetailDisplayCopy";

export type AgentReadinessTone = "emerald" | "amber" | "rose" | "neutral" | "cyan";

export type AgentReadinessModel = {
  availabilityLabel: string;
  availabilityDetail: string;
  activityLabel: string;
  activityDetail: string;
  workModeLabel: string;
  workModeDetail: string;
  issueLoadLabel: string;
  issueLoadDetail: string;
  schedulingLabel: string;
  schedulingDetail: string;
  headlineLabel: string;
  headlineTone: AgentReadinessTone;
};

export type AgentReadinessInput = {
  agent: Pick<AgentOpsRuntimeAgentRow, "status" | "mode" | "tools">;
  runtimeState: AgentRuntimeState;
  openIssueCount: number;
  isMissing?: boolean;
};

function availabilityFromStoredStatus(status: AgentOpsAgentStatus): {
  label: string;
  detail: string;
} {
  if (status === "blocked") {
    return {
      label: AGENT_DETAIL_DISPLAY.availabilityBlocked,
      detail: AGENT_DETAIL_DISPLAY.availabilityBlockedDetail,
    };
  }
  if (status === "paused") {
    return {
      label: AGENT_DETAIL_DISPLAY.availabilityPaused,
      detail: AGENT_DETAIL_DISPLAY.availabilityPausedDetail,
    };
  }
  return {
    label: AGENT_DETAIL_DISPLAY.availabilityActive,
    detail: AGENT_DETAIL_DISPLAY.availabilityActiveDetail,
  };
}

function activityFromRuntime(runtimeState: AgentRuntimeState): { label: string; detail: string } {
  if (runtimeState === "ACTIVE") {
    return {
      label: AGENT_DETAIL_DISPLAY.activityRecentlyActive,
      detail: AGENT_DETAIL_DISPLAY.activityRecentlyActiveDetail,
    };
  }
  return {
    label: AGENT_DETAIL_DISPLAY.activityIdle,
    detail: AGENT_DETAIL_DISPLAY.activityIdleDetail,
  };
}

function issueLoadFromCount(openIssueCount: number): { label: string; detail: string } {
  if (openIssueCount > 0) {
    const label =
      openIssueCount === 1
        ? AGENT_DETAIL_DISPLAY.issueLoadOneLinked
        : AGENT_DETAIL_DISPLAY.issueLoadManyLinked.replace("{count}", String(openIssueCount));
    return {
      label,
      detail: AGENT_DETAIL_DISPLAY.issueLoadLinkedDetail,
    };
  }
  return {
    label: AGENT_DETAIL_DISPLAY.issueLoadNoneLinked,
    detail: AGENT_DETAIL_DISPLAY.issueLoadNoneLinkedDetail,
  };
}

function schedulingFromAgent(agent: Pick<AgentOpsRuntimeAgentRow, "mode" | "tools">): {
  label: string;
  detail: string;
} {
  const schedule = parseScheduleFromTools(agent.tools ?? []);
  const storedSchedule =
    agent.mode === "scheduled" && schedule.enableSchedule;

  if (storedSchedule) {
    return {
      label: AGENT_DETAIL_DISPLAY.schedulingNotEnabledFromPage,
      detail: AGENT_DETAIL_DISPLAY.schedulingStoredConfigDetail,
    };
  }
  return {
    label: AGENT_DETAIL_DISPLAY.schedulingNotEnabledFromPage,
    detail: AGENT_DETAIL_DISPLAY.schedulingNotEnabledDetail,
  };
}

export function buildAgentReadinessHeadlineLabel(input: AgentReadinessInput): string {
  const { agent, runtimeState, openIssueCount, isMissing } = input;

  if (isMissing) {
    return AGENT_DETAIL_DISPLAY.headlineMissingAgent;
  }
  if (agent.status === "blocked") {
    return AGENT_DETAIL_DISPLAY.headlineBlocked;
  }
  if (agent.status === "paused") {
    return AGENT_DETAIL_DISPLAY.headlinePaused;
  }
  if (runtimeState === "ACTIVE") {
    return AGENT_DETAIL_DISPLAY.headlineRunningRecently;
  }
  if (openIssueCount > 0) {
    return AGENT_DETAIL_DISPLAY.headlineActiveWithIssues;
  }
  return AGENT_DETAIL_DISPLAY.headlineActiveNoIssues;
}

export function buildAgentReadinessHeadlineTone(input: AgentReadinessInput): AgentReadinessTone {
  if (input.isMissing) return "rose";
  if (input.agent.status === "blocked") return "rose";
  if (input.agent.status === "paused") return "amber";
  if (input.runtimeState === "ACTIVE") return "emerald";
  if (input.openIssueCount > 0) return "amber";
  return "emerald";
}

export function buildAgentReadinessModel(input: AgentReadinessInput): AgentReadinessModel {
  const availability = availabilityFromStoredStatus(input.agent.status);
  const activity = activityFromRuntime(input.runtimeState);
  const issueLoad = issueLoadFromCount(input.openIssueCount);
  const scheduling = schedulingFromAgent(input.agent);

  return {
    availabilityLabel: availability.label,
    availabilityDetail: availability.detail,
    activityLabel: activity.label,
    activityDetail: activity.detail,
    workModeLabel: AGENT_DETAIL_DISPLAY.workModeManualStaging,
    workModeDetail: AGENT_DETAIL_DISPLAY.workModeManualStagingDetail,
    issueLoadLabel: issueLoad.label,
    issueLoadDetail: issueLoad.detail,
    schedulingLabel: scheduling.label,
    schedulingDetail: scheduling.detail,
    headlineLabel: buildAgentReadinessHeadlineLabel(input),
    headlineTone: buildAgentReadinessHeadlineTone(input),
  };
}
