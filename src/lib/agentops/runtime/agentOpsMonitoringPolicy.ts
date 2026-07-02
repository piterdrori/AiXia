/**
 * AgentOps monitoring policy — Phase 1 safety contract.
 * Staging-only · evidence-gated issues · proposal-only memory · no auto-fix/deploy.
 */

import { CANONICAL_AGENTS } from "../canonicalAgents";
import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";
import { assertStagingScanUrl } from "./stagingScanUrlGuard";
import {
  isContinuousMonitoringActive,
  isScheduledMonitoringActive,
  loadAgentOpsMonitoringRuntimeConfig,
} from "./agentOpsMonitoringRuntimeConfig";

/** Locked monitoring levels 0–4 (Level 4 forbidden). */
export type MonitoringLevel = 0 | 1 | 2 | 3 | 4;

export type MonitoringMode = "manual" | "scheduled" | "continuous" | "tick";

export type AgentMemoryUpdatePermission = "proposal_only" | "none";

export type MonitoringDecision =
  | { allowed: true }
  | { allowed: false; reason: string; code: string };

export type AgentMonitoringRole = {
  agentSlug: string;
  participatesInScheduledMonitoring: boolean;
  participatesInContinuousMonitoring: boolean;
  canBrowseWebsite: boolean;
  canCreateIssueDraft: boolean;
  canPromoteIssue: boolean;
  canUpdateMemory: AgentMemoryUpdatePermission;
  canVerifyFix: boolean;
  monitoringRoleDescription: string;
};

export type MonitoringAction =
  | "browse_website"
  | "scan_staging"
  | "create_issue_draft"
  | "promote_issue"
  | "update_memory"
  | "verify_fix"
  | "apply_fix"
  | "deploy"
  | "start_scheduled_loop"
  | "start_continuous_loop";

export type MonitoringActionContext = {
  agentSlug: string;
  stagingUrl?: string;
  monitoringMode?: MonitoringMode;
  evidence?: Record<string, unknown>;
  memoryApproved?: boolean;
};

export type RuntimeMonitoringPolicy = {
  activeLevel: MonitoringLevel;
  scheduledEnabled: boolean;
  continuousEnabled: boolean;
  issueAutoCreateEnabled: boolean;
  productionBlocked: true;
  level4Forbidden: true;
};

const CANONICAL_AGENT_SLUGS = CANONICAL_AGENTS.map((agent) => agent.id);

const AGENT_MONITORING_ROLES: Record<string, AgentMonitoringRole> = {
  "system-agent": {
    agentSlug: "system-agent",
    participatesInScheduledMonitoring: false,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: false,
    canCreateIssueDraft: false,
    canPromoteIssue: false,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Coordination and summary only — no direct browsing or issue lifecycle.",
  },
  "memory-agent": {
    agentSlug: "memory-agent",
    participatesInScheduledMonitoring: false,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: false,
    canCreateIssueDraft: false,
    canPromoteIssue: false,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Proposal-only memory observations — no silent approval from monitoring.",
  },
  "issue-agent": {
    agentSlug: "issue-agent",
    participatesInScheduledMonitoring: true,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: false,
    canCreateIssueDraft: true,
    canPromoteIssue: true,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Issue lifecycle drafts and promotion proposals — owner gate required for promotion.",
  },
  "evolution-agent": {
    agentSlug: "evolution-agent",
    participatesInScheduledMonitoring: false,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: false,
    canCreateIssueDraft: false,
    canPromoteIssue: false,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Observation and learning proposals only — no autonomous system changes.",
  },
  "fix-agent": {
    agentSlug: "fix-agent",
    participatesInScheduledMonitoring: true,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: true,
    canCreateIssueDraft: false,
    canPromoteIssue: false,
    canUpdateMemory: "none",
    canVerifyFix: true,
    monitoringRoleDescription:
      "Verify and fix planning on staging evidence — no auto-apply or deploy.",
  },
  "qa-agent": {
    agentSlug: "qa-agent",
    participatesInScheduledMonitoring: true,
    participatesInContinuousMonitoring: true,
    canBrowseWebsite: true,
    canCreateIssueDraft: true,
    canPromoteIssue: false,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Primary Browser QA evidence collector — browse and draft issues with evidence.",
  },
  "design-agent": {
    agentSlug: "design-agent",
    participatesInScheduledMonitoring: true,
    participatesInContinuousMonitoring: true,
    canBrowseWebsite: true,
    canCreateIssueDraft: true,
    canPromoteIssue: false,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "UX and design observations on staging routes — evidence-bound drafts only.",
  },
  "runtime-agent": {
    agentSlug: "runtime-agent",
    participatesInScheduledMonitoring: true,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: true,
    canCreateIssueDraft: false,
    canPromoteIssue: false,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Runtime health observations — scan and log, no issue auto-create.",
  },
  "logs-agent": {
    agentSlug: "logs-agent",
    participatesInScheduledMonitoring: true,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: false,
    canCreateIssueDraft: true,
    canPromoteIssue: false,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Log and error signal observations — draft issues from evidence only.",
  },
  "config-agent": {
    agentSlug: "config-agent",
    participatesInScheduledMonitoring: true,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: false,
    canCreateIssueDraft: true,
    canPromoteIssue: false,
    canUpdateMemory: "none",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Configuration observation only — no config mutation from monitoring.",
  },
  "chat-agent": {
    agentSlug: "chat-agent",
    participatesInScheduledMonitoring: false,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: false,
    canCreateIssueDraft: false,
    canPromoteIssue: false,
    canUpdateMemory: "none",
    canVerifyFix: false,
    monitoringRoleDescription: "Advisory chat only — not a monitoring participant.",
  },
  "analytics-agent": {
    agentSlug: "analytics-agent",
    participatesInScheduledMonitoring: true,
    participatesInContinuousMonitoring: false,
    canBrowseWebsite: false,
    canCreateIssueDraft: true,
    canPromoteIssue: false,
    canUpdateMemory: "proposal_only",
    canVerifyFix: false,
    monitoringRoleDescription:
      "Usage and metrics observations — draft issues from evidence when enabled.",
  },
};

function readEnvFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function parseMonitoringLevel(): MonitoringLevel {
  const raw = process.env.AGENTOPS_MONITORING_LEVEL?.trim();
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3) return parsed;
  if (parsed >= 4) return 4;
  return 0;
}

/** Resolve canonical slug from runtime agent row tools or name. */
export function resolveAgentSlugFromRow(
  agent: Pick<AgentOpsRuntimeAgentRow, "tools" | "name">,
): string {
  for (const tool of agent.tools ?? []) {
    if (typeof tool === "string" && tool.startsWith("canonical:")) {
      return tool.slice("canonical:".length);
    }
  }
  const normalizedName = agent.name?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
  if (AGENT_MONITORING_ROLES[normalizedName]) return normalizedName;
  return "runtime-agent";
}

export function getRuntimeMonitoringPolicy(): RuntimeMonitoringPolicy {
  const activeLevel = parseMonitoringLevel();
  return {
    activeLevel,
    scheduledEnabled: readEnvFlag("AGENTOPS_MONITORING_SCHEDULED_ENABLED"),
    continuousEnabled: readEnvFlag("AGENTOPS_MONITORING_CONTINUOUS_ENABLED"),
    issueAutoCreateEnabled: readEnvFlag("AGENTOPS_MONITORING_ISSUE_AUTO_CREATE"),
    productionBlocked: true,
    level4Forbidden: true,
  };
}

export function getActiveMonitoringLevel(): MonitoringLevel {
  const level = getRuntimeMonitoringPolicy().activeLevel;
  return level >= 4 ? 4 : level;
}

export function isLevel4Forbidden(): boolean {
  return true;
}

export function isScheduledMonitoringEnabled(): boolean {
  return isScheduledMonitoringActive();
}

export function isContinuousMonitoringEnabled(): boolean {
  return isContinuousMonitoringActive();
}

export function isMonitoringIssueAutoCreateEnabled(): boolean {
  const config = loadAgentOpsMonitoringRuntimeConfig();
  return config.level >= 3 && readEnvFlag("AGENTOPS_MONITORING_ISSUE_AUTO_CREATE");
}

export function listCanonicalAgentSlugs(): readonly string[] {
  return CANONICAL_AGENT_SLUGS;
}

export function getAgentMonitoringRole(agentSlug: string): AgentMonitoringRole | null {
  return AGENT_MONITORING_ROLES[agentSlug] ?? null;
}

export function canAgentParticipateInMonitoring(agentSlug: string): boolean {
  const role = getAgentMonitoringRole(agentSlug);
  if (!role) return false;
  return role.participatesInScheduledMonitoring || role.participatesInContinuousMonitoring;
}

export function canAgentBrowseWebsite(agentSlug: string): boolean {
  return getAgentMonitoringRole(agentSlug)?.canBrowseWebsite ?? false;
}

export function canAgentCreateIssueDraft(agentSlug: string): boolean {
  return getAgentMonitoringRole(agentSlug)?.canCreateIssueDraft ?? false;
}

export function canAgentPromoteIssue(agentSlug: string): boolean {
  return getAgentMonitoringRole(agentSlug)?.canPromoteIssue ?? false;
}

export function canAgentUpdateMemory(agentSlug: string): AgentMemoryUpdatePermission {
  return getAgentMonitoringRole(agentSlug)?.canUpdateMemory ?? "none";
}

export function canAgentVerifyFix(agentSlug: string): boolean {
  return getAgentMonitoringRole(agentSlug)?.canVerifyFix ?? false;
}

/** Browser QA evidence required for issue create/promote from monitoring. */
export function hasBrowserQaEvidence(evidence: Record<string, unknown> | undefined): boolean {
  if (!evidence || typeof evidence !== "object") return false;
  const scanMode = evidence.scan_mode;
  const hasScanMode = scanMode === "playwright" || scanMode === "browser_qa";
  if (!hasScanMode) return false;
  const hasRoute =
    typeof evidence.route === "string" ||
    typeof evidence.page_url === "string" ||
    typeof evidence.absolute_url === "string";
  return hasRoute;
}

function deny(code: string, reason: string): MonitoringDecision {
  return { allowed: false, code, reason };
}

function allow(): MonitoringDecision {
  return { allowed: true };
}

function assertStagingUrlAllowed(stagingUrl: string | undefined): MonitoringDecision {
  if (!stagingUrl?.trim()) {
    return deny("STAGING_URL_REQUIRED", "Staging URL is required for monitoring actions.");
  }
  const guard = assertStagingScanUrl(stagingUrl);
  if (!guard.ok) {
    return deny("PRODUCTION_OR_INVALID_STAGING", guard.error);
  }
  return allow();
}

export function assertMonitoringActionAllowed(
  action: MonitoringAction,
  context: MonitoringActionContext,
): MonitoringDecision {
  if (isLevel4Forbidden() && (action === "apply_fix" || action === "deploy")) {
    return deny(
      "LEVEL_4_FORBIDDEN",
      "Auto-fix and auto-deploy (Level 4) are forbidden by monitoring contract.",
    );
  }

  const role = getAgentMonitoringRole(context.agentSlug);
  if (!role && context.agentSlug !== "runtime-agent") {
    return deny("UNKNOWN_AGENT", `No monitoring role for agent: ${context.agentSlug}`);
  }

  if (action === "start_scheduled_loop") {
    if (!isScheduledMonitoringEnabled()) {
      return deny(
        "SCHEDULED_NOT_ENABLED",
        "Scheduled monitoring is prepared but not active. Set AGENTOPS_MONITORING_LEVEL>=1 and AGENTOPS_MONITORING_SCHEDULED_ENABLED=true.",
      );
    }
    return allow();
  }

  if (action === "start_continuous_loop") {
    if (!isContinuousMonitoringEnabled()) {
      return deny(
        "CONTINUOUS_NOT_ENABLED",
        "Continuous monitoring is prepared but not active. Set AGENTOPS_MONITORING_LEVEL>=2 and AGENTOPS_MONITORING_CONTINUOUS_ENABLED=true.",
      );
    }
    return allow();
  }

  if (
    action === "browse_website" ||
    action === "scan_staging" ||
    action === "create_issue_draft" ||
    action === "promote_issue"
  ) {
    const stagingCheck = assertStagingUrlAllowed(context.stagingUrl);
    if (!stagingCheck.allowed) return stagingCheck;
  }

  switch (action) {
    case "browse_website":
    case "scan_staging":
      if (!canAgentBrowseWebsite(context.agentSlug) && context.agentSlug !== "runtime-agent") {
        if (action === "scan_staging" && canAgentParticipateInMonitoring(context.agentSlug)) {
          return allow();
        }
        return deny(
          "BROWSE_NOT_ALLOWED",
          `Agent ${context.agentSlug} is not permitted to browse staging.`,
        );
      }
      return allow();

    case "create_issue_draft": {
      if (!canAgentCreateIssueDraft(context.agentSlug)) {
        return deny(
          "ISSUE_DRAFT_NOT_ALLOWED",
          `Agent ${context.agentSlug} cannot create issue drafts from monitoring.`,
        );
      }
      if (!isMonitoringIssueAutoCreateEnabled()) {
        return deny(
          "ISSUE_AUTO_CREATE_DISABLED",
          "Monitoring issue auto-create is disabled (Level 0–2 or AGENTOPS_MONITORING_ISSUE_AUTO_CREATE not set).",
        );
      }
      if (!hasBrowserQaEvidence(context.evidence)) {
        return deny(
          "BROWSER_QA_EVIDENCE_REQUIRED",
          "Issue creation requires Browser QA evidence (scan_mode playwright/browser_qa + route).",
        );
      }
      return allow();
    }

    case "promote_issue": {
      if (!canAgentPromoteIssue(context.agentSlug)) {
        return deny(
          "PROMOTE_NOT_ALLOWED",
          `Agent ${context.agentSlug} cannot promote issues from monitoring.`,
        );
      }
      if (!hasBrowserQaEvidence(context.evidence)) {
        return deny(
          "BROWSER_QA_EVIDENCE_REQUIRED",
          "Issue promotion requires Browser QA evidence.",
        );
      }
      return deny(
        "OWNER_APPROVAL_REQUIRED",
        "Issue promotion requires explicit owner approval outside monitoring auto-path.",
      );
    }

    case "update_memory": {
      const memoryPerm = canAgentUpdateMemory(context.agentSlug);
      if (memoryPerm === "none") {
        return deny(
          "MEMORY_UPDATE_FORBIDDEN",
          `Agent ${context.agentSlug} cannot write monitoring memory.`,
        );
      }
      if (context.memoryApproved === true) {
        return deny(
          "SILENT_MEMORY_APPROVAL_FORBIDDEN",
          "Monitoring memory must remain unapproved (proposal-only).",
        );
      }
      return allow();
    }

    case "verify_fix":
      if (!canAgentVerifyFix(context.agentSlug)) {
        return deny(
          "VERIFY_FIX_NOT_ALLOWED",
          `Agent ${context.agentSlug} cannot verify fixes from monitoring.`,
        );
      }
      return allow();

    case "apply_fix":
    case "deploy":
      return deny(
        "LEVEL_4_FORBIDDEN",
        "Auto-fix and auto-deploy (Level 4) are forbidden by monitoring contract.",
      );

    default:
      return deny("UNKNOWN_ACTION", `Unknown monitoring action: ${String(action)}`);
  }
}

/** All 12 agent roles for verification and UI. */
export function getAllAgentMonitoringRoles(): AgentMonitoringRole[] {
  return CANONICAL_AGENT_SLUGS.map((slug) => AGENT_MONITORING_ROLES[slug]);
}
