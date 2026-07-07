/**
 * Phase 5F — Vercel-safe monitoring memory proposal apply handler (no src/lib imports).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { jsonResponse } from "./ollamaProxy.js";

const MEMORY_PROPOSALS_TABLE = "agentops_monitoring_memory_proposals";
const MEMORY_TABLE = "agentops_memory";
const AGENTS_TABLE = "agentops_agents";
const APPLY_RPC = "agentops_apply_monitoring_memory_proposal";

type MemoryProposalRow = {
  id: string;
  run_id: string;
  github_run_id: string | null;
  status: string;
  agent_slug: string | null;
  memory_scope: string;
  memory_type: string;
  title: string;
  proposal: string;
  rationale: string;
  evidence: Record<string, unknown>;
  confidence: number | null;
  duplicate_key: string | null;
  applied_memory_id: string | null;
  owner_decision_by: string | null;
  owner_decision_at: string | null;
};

function compactEvidenceSummary(evidence: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const key of [
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
  ]) {
    if (evidence[key] !== undefined) summary[key] = evidence[key];
  }
  const findings = evidence.findings;
  if (Array.isArray(findings)) {
    summary.findings_count = findings.length;
    summary.findings_sample = findings.slice(0, 3);
  }
  return summary;
}

function resolveTarget(
  proposal: MemoryProposalRow,
  agentId: string | null,
): { memoryScope: "global" | "agent"; agentId: string | null } | null {
  const agentSlug = proposal.agent_slug?.trim() ?? null;
  if (proposal.memory_scope === "agent" || (proposal.memory_scope === "route" && agentSlug)) {
    if (!agentSlug || !agentId) return null;
    return { memoryScope: "agent", agentId };
  }
  return { memoryScope: "global", agentId: null };
}

function validateApplyPreconditions(
  proposal: MemoryProposalRow,
  ownerId: string,
  agentId: string | null,
): string | null {
  if (!ownerId.trim()) return "Owner identity is required for memory application.";
  if (proposal.applied_memory_id) return null;
  if (proposal.status !== "owner_approved") {
    return `Proposal must be owner_approved before apply (current: ${proposal.status}).`;
  }
  if (!proposal.title?.trim() || !proposal.proposal?.trim() || !proposal.rationale?.trim()) {
    return "Proposal must include title, content, and rationale before apply.";
  }
  if (!proposal.evidence || Object.keys(proposal.evidence).length === 0) {
    return "Proposal must include evidence metadata before apply.";
  }
  const target = resolveTarget(proposal, agentId);
  if (!target) {
    return `Agent-scoped proposal requires resolvable staging agent for slug ${proposal.agent_slug ?? "unknown"}.`;
  }
  return null;
}

async function resolveAgentIdBySlug(client: SupabaseClient, slug: string): Promise<string | null> {
  const { data, error } = await client
    .from(AGENTS_TABLE)
    .select("id, name, tools")
    .eq("environment", "staging");

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

async function findExistingMemoryId(
  client: SupabaseClient,
  proposal: MemoryProposalRow,
): Promise<string | null> {
  if (proposal.applied_memory_id) return proposal.applied_memory_id;

  const { data: byProposal } = await client
    .from(MEMORY_TABLE)
    .select("id")
    .eq("environment", "staging")
    .eq("content->>source_proposal_id", proposal.id)
    .maybeSingle();
  if (byProposal?.id) return byProposal.id as string;

  if (!proposal.duplicate_key) return null;

  const { data: byDuplicate } = await client
    .from(MEMORY_TABLE)
    .select("id")
    .eq("environment", "staging")
    .eq("approved", true)
    .eq("content->>duplicate_key", proposal.duplicate_key)
    .maybeSingle();

  return (byDuplicate?.id as string | undefined) ?? null;
}

function buildMemoryContent(
  proposal: MemoryProposalRow,
  ownerId: string,
  target: { memoryScope: "global" | "agent"; agentId: string | null },
): Record<string, unknown> {
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
    applied_by: ownerId,
    applied_at: new Date().toISOString(),
    owner_decision_by: proposal.owner_decision_by,
    owner_decision_at: proposal.owner_decision_at,
  };
}

export async function applyMonitoringMemoryProposalViaApi(
  client: SupabaseClient,
  proposalId: string,
  ownerId: string,
): Promise<Response> {
  const { data: proposal, error: fetchError } = await client
    .from(MEMORY_PROPOSALS_TABLE)
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();

  if (fetchError) return jsonResponse({ ok: false, error: fetchError.message }, 503);
  if (!proposal) return jsonResponse({ ok: false, error: "Memory proposal not found." }, 404);

  const row = proposal as MemoryProposalRow;

  const existingMemoryId = await findExistingMemoryId(client, row);
  if (existingMemoryId) {
    await client
      .from(MEMORY_PROPOSALS_TABLE)
      .update({
        status: "applied",
        applied_memory_id: existingMemoryId,
        owner_decision_by: ownerId,
        owner_decision_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    return jsonResponse({
      ok: true,
      environment: "staging",
      applied: true,
      memoryId: existingMemoryId,
      proposalId: row.id,
      alreadyApplied: true,
      targetScope: row.memory_scope === "agent" ? "agent" : "global",
      targetStore: "agentops_memory",
    });
  }

  const agentId = row.agent_slug ? await resolveAgentIdBySlug(client, row.agent_slug) : null;
  const policyError = validateApplyPreconditions(row, ownerId, agentId);
  if (policyError) {
    return jsonResponse({ ok: false, error: policyError }, 409);
  }

  const target = resolveTarget(row, agentId);
  if (!target) {
    return jsonResponse({ ok: false, error: "Could not resolve memory application target." }, 409);
  }

  const content = buildMemoryContent(row, ownerId, target);

  const { data, error } = await client.rpc(APPLY_RPC, {
    p_proposal_id: row.id,
    p_owner_id: ownerId,
    p_memory_scope: target.memoryScope,
    p_agent_id: target.agentId,
    p_content: content,
  });

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 503);
  }

  const rpc = (data ?? {}) as {
    ok?: boolean;
    memory_id?: string;
    proposal_id?: string;
    already_applied?: boolean;
    duplicate_blocked?: boolean;
    target_scope?: string;
    target_store?: string;
    error?: string;
  };

  if (!rpc.ok) {
    return jsonResponse({ ok: false, error: rpc.error ?? "Memory apply failed." }, 409);
  }

  return jsonResponse({
    ok: true,
    environment: "staging",
    applied: true,
    memoryId: rpc.memory_id ?? null,
    proposalId: rpc.proposal_id ?? row.id,
    alreadyApplied: rpc.already_applied === true,
    duplicateBlocked: rpc.duplicate_blocked === true,
    targetScope: rpc.target_scope ?? target.memoryScope,
    targetStore: rpc.target_store ?? "agentops_memory",
  });
}
