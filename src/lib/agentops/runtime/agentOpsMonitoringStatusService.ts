/**
 * Build monitoring owner status for API/UI — uses Phase 2 eligibility module.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { listActiveAgents } from "../db/agentOpsRuntimeRepository";
import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";
import { getAgentMonitoringEligibility } from "./agentOpsMonitoringEligibility";
import { MONITORING_OWNER_DISPLAY } from "../agents/monitoringOwnerDisplayCopy";
import {
  getAgentMonitoringRole,
  isLevel4Forbidden,
  resolveAgentSlugFromRow,
} from "./agentOpsMonitoringPolicy";
import {
  isContinuousMonitoringActive,
  isScheduledMonitoringActive,
  loadAgentOpsMonitoringRuntimeConfig,
} from "./agentOpsMonitoringRuntimeConfig";
import { readLatestMonitoringReport, type MonitoringReportSummary } from "./agentOpsMonitoringReportReader";
import {
  listMonitoringRunIndexRecords,
  toMonitoringRunIndexSummary,
} from "./agentOpsMonitoringRunIndex";

export type MonitoringRunIndexSummary = ReturnType<typeof toMonitoringRunIndexSummary>;

export type AgentMonitoringEligibilityRow = {
  agentSlug: string;
  agentName: string;
  scheduledEligible: boolean;
  reason: string;
  detail: string;
  role: string;
  canBrowseWebsite: boolean;
  canCreateIssueDraft: boolean;
  memoryMode: "proposal_only" | "none";
};

export type MonitoringOwnerStatusPayload = {
  monitoringLevelLabel: string;
  activationLabel: string;
  activationDetail: string;
  writeModeLabel: string;
  writeModeDetail: string;
  targetLabel: string;
  continuousLabel: string;
  cloudActive: false;
  continuousActive: boolean;
  scheduledEnvEnabled: boolean;
  effectiveDryRun: boolean;
  ownerWriteApproved: boolean;
  eligibleCount: number;
  eligibleAgentSlugs: string[];
  eligibility: AgentMonitoringEligibilityRow[];
  lastReport: MonitoringReportSummary | null;
  latestMonitoringRuns: MonitoringRunIndexSummary[];
  latestIndexedRun: MonitoringRunIndexSummary | null;
  dryRunDefault: true;
  safety: {
    productionBlocked: true;
    autoFixDeployBlocked: true;
    memoryProposalOnly: true;
    evidenceRequiredForIssues: true;
    level4Forbidden: true;
  };
  configError: string | null;
  agentsLoaded: boolean;
};

function monitoringLevelLabel(level: number): string {
  if (level >= 1) return MONITORING_OWNER_DISPLAY.monitoringLevelPrepared;
  return MONITORING_OWNER_DISPLAY.monitoringLevelManual;
}

function activationLabels(scheduledActive: boolean): { label: string; detail: string } {
  if (scheduledActive) {
    return {
      label: MONITORING_OWNER_DISPLAY.activationLocalDryRun,
      detail: MONITORING_OWNER_DISPLAY.cloudBlockedDetail,
    };
  }
  return {
    label: MONITORING_OWNER_DISPLAY.activationNotCloud,
    detail: MONITORING_OWNER_DISPLAY.cloudBlockedDetail,
  };
}

function writeModeLabels(effectiveDryRun: boolean): { label: string; detail: string } {
  if (effectiveDryRun) {
    return {
      label: MONITORING_OWNER_DISPLAY.writeModeDryRun,
      detail: MONITORING_OWNER_DISPLAY.liveWritesBlockedDetail,
    };
  }
  return {
    label: MONITORING_OWNER_DISPLAY.writeModeOwnerApproval,
    detail: MONITORING_OWNER_DISPLAY.liveWritesBlockedDetail,
  };
}

function buildEligibilityRow(agent: AgentOpsRuntimeAgentRow): AgentMonitoringEligibilityRow {
  const config = loadAgentOpsMonitoringRuntimeConfig();
  const agentSlug = resolveAgentSlugFromRow(agent);
  const role = getAgentMonitoringRole(agentSlug);
  const result = getAgentMonitoringEligibility(agent, new Date(), config, {
    tickKind: "scheduled",
  });

  return {
    agentSlug,
    agentName: agent.name,
    scheduledEligible: result.eligible,
    reason: result.reason,
    detail: result.detail,
    role: role?.monitoringRoleDescription ?? "No monitoring role",
    canBrowseWebsite: role?.canBrowseWebsite ?? false,
    canCreateIssueDraft: role?.canCreateIssueDraft ?? false,
    memoryMode: role?.canUpdateMemory ?? "none",
  };
}

export async function buildMonitoringOwnerStatus(
  client: SupabaseClient | null,
): Promise<MonitoringOwnerStatusPayload> {
  const config = loadAgentOpsMonitoringRuntimeConfig();
  const scheduledActive = isScheduledMonitoringActive(config);
  const activation = activationLabels(scheduledActive);
  const writeMode = writeModeLabels(config.effectiveDryRun);
  const lastReportResult = await readLatestMonitoringReport();

  let latestMonitoringRuns: MonitoringRunIndexSummary[] = [];
  let latestIndexedRun: MonitoringRunIndexSummary | null = null;
  let indexError: string | null = null;

  if (client) {
    const indexResult = await listMonitoringRunIndexRecords(client, 10);
    if (indexResult.ok) {
      latestMonitoringRuns = indexResult.data.map(toMonitoringRunIndexSummary);
      latestIndexedRun = latestMonitoringRuns[0] ?? null;
    } else {
      indexError = indexResult.error;
    }
  }

  let eligibility: AgentMonitoringEligibilityRow[] = [];
  let configError: string | null = null;
  let agentsLoaded = false;

  if (client) {
    const agentsResult = await listActiveAgents(client);
    if (agentsResult.error) {
      configError = agentsResult.error;
    } else if (agentsResult.data) {
      agentsLoaded = true;
      eligibility = agentsResult.data.map(buildEligibilityRow);
    }
  } else {
    configError = "Staging Supabase is not configured.";
  }

  if (indexError && !configError) {
    configError = indexError;
  }

  const eligible = eligibility.filter((row) => row.scheduledEligible);

  return {
    monitoringLevelLabel: monitoringLevelLabel(config.level),
    activationLabel: activation.label,
    activationDetail: activation.detail,
    writeModeLabel: writeMode.label,
    writeModeDetail: writeMode.detail,
    targetLabel: MONITORING_OWNER_DISPLAY.targetStagingOnly,
    continuousLabel: MONITORING_OWNER_DISPLAY.continuousPrepared,
    cloudActive: false,
    continuousActive: isContinuousMonitoringActive(config),
    scheduledEnvEnabled: config.scheduledEnabled,
    effectiveDryRun: config.effectiveDryRun,
    ownerWriteApproved: config.ownerWriteApproved,
    eligibleCount: eligible.length,
    eligibleAgentSlugs: eligible.map((row) => row.agentSlug),
    eligibility,
    lastReport: lastReportResult?.summary ?? null,
    latestMonitoringRuns,
    latestIndexedRun,
    dryRunDefault: true,
    safety: {
      productionBlocked: true,
      autoFixDeployBlocked: isLevel4Forbidden() as true,
      memoryProposalOnly: true,
      evidenceRequiredForIssues: true,
      level4Forbidden: true,
    },
    configError,
    agentsLoaded,
  };
}
