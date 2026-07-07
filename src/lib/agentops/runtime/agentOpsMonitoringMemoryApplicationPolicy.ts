/**
 * Phase 5F — owner-click-only monitoring memory proposal application policy.
 * Apply to agentops_memory requires explicit owner action on staging Supabase.
 */

import { extractSupabaseProjectRefFromUrl } from "../execution/agentOpsStagingGuard";
import { AGENTOPS_MONITORING_STAGING_PROJECT_REF } from "./agentOpsMonitoringRunIndex";
import type { MonitoringMemoryProposalRow } from "./agentOpsMonitoringMemoryProposals";

export type MonitoringMemoryApplicationOwnerContext = {
  ownerId: string;
  explicitOwnerClick: boolean;
  supabaseProjectRef?: string | null;
  pipelineContext?: "owner_ui" | "automatic" | "gha" | "scheduler" | null;
};

export type MemoryApplicationTarget = {
  targetStore: "agentops_memory";
  memoryScope: "global" | "agent";
  agentId: string | null;
  proposalScope: string;
};

const FORBIDDEN_PROPOSAL_STATUSES = new Set(["proposal", "rejected", "deferred", "applied"]);

function hasCompactEvidence(evidence: Record<string, unknown>): boolean {
  if (!evidence || typeof evidence !== "object") return false;
  return Object.keys(evidence).length > 0;
}

export function assertStagingSupabaseForMemoryApplication(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const ref = extractSupabaseProjectRefFromUrl(url);
  if (!ref) return "Missing staging Supabase URL.";
  if (ref !== AGENTOPS_MONITORING_STAGING_PROJECT_REF) {
    return `Memory application blocked: Supabase ref ${ref} is not staging.`;
  }
  return null;
}

export function assertMemoryApplicationAllowed(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (env.VERCEL_ENV === "production") {
    return "Memory application is blocked on production deployments.";
  }
  if (env.AGENTOPS_PRODUCTION_BLOCKED === "false") {
    return "Memory application requires productionBlocked=true.";
  }
  return assertStagingSupabaseForMemoryApplication(env);
}

export function resolveMemoryApplicationTarget(input: {
  proposal: Pick<MonitoringMemoryProposalRow, "memory_scope" | "agent_slug">;
  agentId: string | null;
}): MemoryApplicationTarget | null {
  const proposalScope = input.proposal.memory_scope;
  const agentSlug = input.proposal.agent_slug?.trim() ?? null;

  if (proposalScope === "agent" || (proposalScope === "route" && agentSlug)) {
    if (!agentSlug || !input.agentId) return null;
    return {
      targetStore: "agentops_memory",
      memoryScope: "agent",
      agentId: input.agentId,
      proposalScope,
    };
  }

  return {
    targetStore: "agentops_memory",
    memoryScope: "global",
    agentId: null,
    proposalScope,
  };
}

export function canApplyMonitoringMemoryProposal(
  proposal: MonitoringMemoryProposalRow,
  ownerContext: MonitoringMemoryApplicationOwnerContext,
): string | null {
  if (process.env.VERCEL_ENV === "production") {
    return "Memory application is blocked on production deployments.";
  }

  const stagingError = ownerContext.supabaseProjectRef
    ? ownerContext.supabaseProjectRef !== AGENTOPS_MONITORING_STAGING_PROJECT_REF
      ? `Memory application blocked: Supabase ref ${ownerContext.supabaseProjectRef} is not staging.`
      : null
    : assertStagingSupabaseForMemoryApplication();

  if (stagingError) return stagingError;

  if (!ownerContext.ownerId?.trim()) {
    return "Owner identity is required for memory application.";
  }

  if (!ownerContext.explicitOwnerClick) {
    return "Memory application requires explicit owner click.";
  }

  if (
    ownerContext.pipelineContext === "automatic" ||
    ownerContext.pipelineContext === "gha" ||
    ownerContext.pipelineContext === "scheduler"
  ) {
    return "Automatic pipeline memory application is forbidden.";
  }

  if (proposal.applied_memory_id) {
    return null;
  }

  if (FORBIDDEN_PROPOSAL_STATUSES.has(proposal.status)) {
    if (proposal.status === "applied") {
      return "Proposal is already applied.";
    }
    return `Proposal status ${proposal.status} cannot be applied.`;
  }

  if (proposal.status !== "owner_approved") {
    return `Proposal must be owner_approved before apply (current: ${proposal.status}).`;
  }

  if (!proposal.title?.trim() || !proposal.proposal?.trim() || !proposal.rationale?.trim()) {
    return "Proposal must include title, content, and rationale before apply.";
  }

  if (!hasCompactEvidence(proposal.evidence ?? {})) {
    return "Proposal must include evidence metadata before apply.";
  }

  return null;
}

export function validateMonitoringMemoryApplication(
  proposal: MonitoringMemoryProposalRow,
  ownerContext: MonitoringMemoryApplicationOwnerContext,
  agentId: string | null,
): string | null {
  const baseError = canApplyMonitoringMemoryProposal(proposal, ownerContext);
  if (baseError && !proposal.applied_memory_id) {
    return baseError;
  }

  if (proposal.applied_memory_id) {
    return null;
  }

  const target = resolveMemoryApplicationTarget({ proposal, agentId });
  if (!target) {
    if (proposal.memory_scope === "agent" || proposal.agent_slug) {
      return `Agent-scoped proposal requires resolvable staging agent for slug ${proposal.agent_slug ?? "unknown"}.`;
    }
    return "Could not resolve memory application target.";
  }

  return null;
}

export function validateMemoryApplicationPreconditions(
  proposal: MonitoringMemoryProposalRow,
  ownerContext: MonitoringMemoryApplicationOwnerContext,
  agentId: string | null,
): string | null {
  return validateMonitoringMemoryApplication(proposal, ownerContext, agentId);
}
