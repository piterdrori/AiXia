/**
 * Phase 5F — apply owner-approved monitoring memory proposals to agentops_memory.
 * Owner-click only; staging Supabase only; no automatic application.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AGENTOPS_RUNTIME_ENVIRONMENT, AGENTOPS_RUNTIME_TABLES } from "../db/agentOpsRuntimeTypes";
import {
  getMonitoringMemoryProposal,
  MEMORY_PROPOSALS_TABLE,
  type MonitoringMemoryProposalRow,
} from "./agentOpsMonitoringMemoryProposals";
import {
  assertStagingSupabaseForMemoryApplication,
  type MemoryApplicationTarget,
  type MonitoringMemoryApplicationOwnerContext,
  resolveMemoryApplicationTarget,
  validateMemoryApplicationPreconditions,
} from "./agentOpsMonitoringMemoryApplicationPolicy";

export type MonitoringMemoryApplicationResult = {
  ok: boolean;
  memoryId: string | null;
  proposalId: string | null;
  alreadyApplied: boolean;
  duplicateBlocked: boolean;
  targetScope: "global" | "agent" | null;
  targetStore: "agentops_memory" | null;
  error: string | null;
};

export const MONITORING_MEMORY_APPLY_RPC = "agentops_apply_monitoring_memory_proposal";

function compactEvidenceSummary(evidence: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  const copyKeys = [
    "category",
    "issue_pattern",
    "agent_slugs",
    "routes",
    "agents_count",
    "routes_count",
    "signal_key",
    "run_id",
    "target_base_url",
    "target_class",
    "dry_run",
    "production_blocked",
  ] as const;

  for (const key of copyKeys) {
    if (evidence[key] !== undefined) summary[key] = evidence[key];
  }

  const findings = evidence.findings;
  if (Array.isArray(findings)) {
    summary.findings_count = findings.length;
    summary.findings_sample = findings.slice(0, 3).map((entry) => {
      if (!entry || typeof entry !== "object") return entry;
      const row = entry as Record<string, unknown>;
      return {
        agent_slug: row.agent_slug,
        route: row.route,
        issue: row.issue,
        severity: row.severity,
        category: row.category,
      };
    });
  }

  return summary;
}

export function buildActiveMemoryRecordFromProposal(
  proposal: MonitoringMemoryProposalRow,
  ownerContext: MonitoringMemoryApplicationOwnerContext,
  target: MemoryApplicationTarget,
): Record<string, unknown> {
  const appliedAt = new Date().toISOString();
  return {
    title: proposal.title.trim(),
    text: proposal.proposal.trim(),
    rationale: proposal.rationale.trim(),
    memory_type: proposal.memory_type,
    memory_scope_proposal: proposal.memory_scope,
    memory_scope_applied: target.memoryScope,
    agent_slug: proposal.agent_slug,
    confidence: proposal.confidence,
    source: "monitoring_memory_proposal",
    source_proposal_id: proposal.id,
    source_run_id: proposal.run_id,
    github_run_id: proposal.github_run_id,
    duplicate_key: proposal.duplicate_key,
    evidence_summary: compactEvidenceSummary(proposal.evidence ?? {}),
    applied_by: ownerContext.ownerId,
    applied_at: appliedAt,
    owner_decision_by: proposal.owner_decision_by,
    owner_decision_at: proposal.owner_decision_at,
  };
}

export async function findExistingMemoryFromProposal(
  client: SupabaseClient,
  proposal: MonitoringMemoryProposalRow,
): Promise<string | null> {
  if (proposal.applied_memory_id) return proposal.applied_memory_id;

  const { data: byProposal, error: byProposalError } = await client
    .from(AGENTOPS_RUNTIME_TABLES.memory)
    .select("id")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .eq("content->>source_proposal_id", proposal.id)
    .maybeSingle();

  if (!byProposalError && byProposal?.id) {
    return byProposal.id as string;
  }

  if (!proposal.duplicate_key) return null;

  const { data: byDuplicate, error: byDuplicateError } = await client
    .from(AGENTOPS_RUNTIME_TABLES.memory)
    .select("id")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .eq("approved", true)
    .eq("content->>duplicate_key", proposal.duplicate_key)
    .maybeSingle();

  if (byDuplicateError || !byDuplicate?.id) return null;
  return byDuplicate.id as string;
}

async function resolveAgentIdBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("id, name, tools")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT);

  if (error || !data) return null;

  for (const agent of data) {
    const tools = (agent.tools ?? []) as string[];
    if (tools.includes(`canonical:${slug}`)) return agent.id as string;
    const normalizedName =
      typeof agent.name === "string"
        ? agent.name.trim().toLowerCase().replace(/\s+/g, "-")
        : "";
    if (normalizedName === slug) return agent.id as string;
  }

  return null;
}

export async function markMonitoringProposalApplied(
  client: SupabaseClient,
  proposalId: string,
  memoryId: string,
  ownerContext: MonitoringMemoryApplicationOwnerContext,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client
    .from(MEMORY_PROPOSALS_TABLE)
    .update({
      status: "applied",
      applied_memory_id: memoryId,
      owner_decision_by: ownerContext.ownerId,
      owner_decision_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type RpcApplyResult = {
  ok?: boolean;
  memory_id?: string;
  proposal_id?: string;
  already_applied?: boolean;
  duplicate_blocked?: boolean;
  target_scope?: string;
  target_store?: string;
  error?: string;
};

export async function applyMonitoringMemoryProposal(
  client: SupabaseClient,
  proposalId: string,
  ownerContext: MonitoringMemoryApplicationOwnerContext,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MonitoringMemoryApplicationResult> {
  const stagingError = assertStagingSupabaseForMemoryApplication(env);
  if (stagingError) {
    return {
      ok: false,
      memoryId: null,
      proposalId: null,
      alreadyApplied: false,
      duplicateBlocked: false,
      targetScope: null,
      targetStore: null,
      error: stagingError,
    };
  }

  const proposalResult = await getMonitoringMemoryProposal(client, proposalId);
  if (!proposalResult.ok) {
    return {
      ok: false,
      memoryId: null,
      proposalId: null,
      alreadyApplied: false,
      duplicateBlocked: false,
      targetScope: null,
      targetStore: null,
      error: proposalResult.error,
    };
  }

  const proposal = proposalResult.row;

  if (proposal.applied_memory_id) {
    return {
      ok: true,
      memoryId: proposal.applied_memory_id,
      proposalId: proposal.id,
      alreadyApplied: true,
      duplicateBlocked: true,
      targetScope: proposal.memory_scope === "agent" ? "agent" : "global",
      targetStore: "agentops_memory",
      error: null,
    };
  }

  const existingMemoryId = await findExistingMemoryFromProposal(client, proposal);
  if (existingMemoryId) {
    await markMonitoringProposalApplied(client, proposal.id, existingMemoryId, ownerContext);
    return {
      ok: true,
      memoryId: existingMemoryId,
      proposalId: proposal.id,
      alreadyApplied: true,
      duplicateBlocked: true,
      targetScope: proposal.memory_scope === "agent" ? "agent" : "global",
      targetStore: "agentops_memory",
      error: null,
    };
  }

  const agentId = proposal.agent_slug
    ? await resolveAgentIdBySlug(client, proposal.agent_slug)
    : null;

  const policyError = validateMemoryApplicationPreconditions(proposal, ownerContext, agentId);
  if (policyError) {
    return {
      ok: false,
      memoryId: null,
      proposalId: proposal.id,
      alreadyApplied: proposal.status === "applied",
      duplicateBlocked: false,
      targetScope: null,
      targetStore: null,
      error: policyError,
    };
  }

  const target = resolveMemoryApplicationTarget({ proposal, agentId });
  if (!target) {
    return {
      ok: false,
      memoryId: null,
      proposalId: proposal.id,
      alreadyApplied: false,
      duplicateBlocked: false,
      targetScope: null,
      targetStore: null,
      error: "Could not resolve memory application target.",
    };
  }

  const content = buildActiveMemoryRecordFromProposal(proposal, ownerContext, target);

  const { data, error } = await client.rpc(MONITORING_MEMORY_APPLY_RPC, {
    p_proposal_id: proposal.id,
    p_owner_id: ownerContext.ownerId,
    p_memory_scope: target.memoryScope,
    p_agent_id: target.agentId,
    p_content: content,
  });

  if (error) {
    return {
      ok: false,
      memoryId: null,
      proposalId: proposal.id,
      alreadyApplied: false,
      duplicateBlocked: false,
      targetScope: target.memoryScope,
      targetStore: target.targetStore,
      error: error.message,
    };
  }

  const rpcResult = (data ?? {}) as RpcApplyResult;
  if (!rpcResult.ok) {
    return {
      ok: false,
      memoryId: null,
      proposalId: proposal.id,
      alreadyApplied: false,
      duplicateBlocked: false,
      targetScope: target.memoryScope,
      targetStore: target.targetStore,
      error: rpcResult.error ?? "Memory apply RPC failed.",
    };
  }

  return {
    ok: true,
    memoryId: rpcResult.memory_id ?? null,
    proposalId: (rpcResult.proposal_id as string | undefined) ?? proposal.id,
    alreadyApplied: rpcResult.already_applied === true,
    duplicateBlocked: rpcResult.duplicate_blocked === true,
    targetScope: (rpcResult.target_scope as "global" | "agent" | undefined) ?? target.memoryScope,
    targetStore: "agentops_memory",
    error: null,
  };
}

export { validateMemoryApplicationPreconditions };
