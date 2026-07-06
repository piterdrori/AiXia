/**
 * Phase 5E — monitoring memory proposal persistence (staging Supabase only).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assertStagingSupabaseForMemoryProposals,
  buildMonitoringMemoryProposalCandidate,
  canCreateMonitoringMemoryProposal,
  normalizeIssuePattern,
  resolveModuleFromRoute,
  type MonitoringMemoryProposalCandidate,
  type MonitoringMemoryProposalDecision,
  type MonitoringMemoryProposalPolicyContext,
} from "./agentOpsMonitoringMemoryProposalPolicy";
import { AGENTOPS_MONITORING_STAGING_PROJECT_REF } from "./agentOpsMonitoringRunIndex";
import type { MonitoringScheduledRunReport } from "./agentOpsMonitoringScheduledReport";

export const MEMORY_PROPOSALS_TABLE = "agentops_monitoring_memory_proposals";

export type MonitoringMemoryProposalStatus =
  | "proposal"
  | "owner_approved"
  | "rejected"
  | "deferred"
  | "applied";

export type MonitoringMemoryProposalRow = {
  id: string;
  monitoring_run_id: string | null;
  run_id: string;
  github_run_id: string | null;
  source: string;
  status: MonitoringMemoryProposalStatus;
  agent_slug: string | null;
  memory_scope: string;
  memory_type: string;
  title: string;
  proposal: string;
  rationale: string;
  evidence: Record<string, unknown>;
  confidence: number | null;
  duplicate_key: string | null;
  duplicate_of: string | null;
  owner_decision_by: string | null;
  owner_decision_at: string | null;
  applied_memory_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MonitoringMemoryProposalInsertResult = {
  created: number;
  skippedDuplicate: number;
  skippedPolicy: number;
  errors: string[];
  proposalIds: string[];
};

export type MonitoringMemoryProposalRunContext = {
  monitoringRunId?: string | null;
  githubRunId?: string | null;
  source?: string;
};

type SignalGroup = {
  category: string;
  issuePattern: string;
  agentSlugs: Set<string>;
  routes: Set<string>;
  severities: string[];
  sampleIssues: string[];
  findings: Array<Record<string, unknown>>;
};

function readRouteFromFinding(finding: {
  page_url: string;
  evidence: Record<string, unknown>;
}): string {
  const fromEvidence = finding.evidence.route;
  if (typeof fromEvidence === "string" && fromEvidence.trim()) {
    return fromEvidence.startsWith("/") ? fromEvidence : `/${fromEvidence}`;
  }
  return finding.page_url.startsWith("/") ? finding.page_url : `/${finding.page_url}`;
}

function readCategory(finding: { evidence: Record<string, unknown> }): string {
  const category = finding.evidence.category;
  if (typeof category === "string" && category.trim()) return category.trim();
  return "monitoring_finding";
}

function aggregateSignalsFromReport(report: MonitoringScheduledRunReport): SignalGroup[] {
  const groups = new Map<string, SignalGroup>();

  for (const agent of report.agentsRun) {
    for (const finding of agent.findings ?? []) {
      const category = readCategory(finding);
      const issuePattern = normalizeIssuePattern(finding.issue);
      const key = `${category}|${issuePattern}`;
      const route = readRouteFromFinding(finding);

      let group = groups.get(key);
      if (!group) {
        group = {
          category,
          issuePattern,
          agentSlugs: new Set(),
          routes: new Set(),
          severities: [],
          sampleIssues: [],
          findings: [],
        };
        groups.set(key, group);
      }

      group.agentSlugs.add(agent.agentSlug);
      group.routes.add(route);
      group.severities.push(finding.severity);
      if (group.sampleIssues.length < 5) group.sampleIssues.push(finding.issue);
      group.findings.push({
        agent_slug: agent.agentSlug,
        route,
        issue: finding.issue,
        severity: finding.severity,
        module: resolveModuleFromRoute(route),
        category,
      });
    }
  }

  return [...groups.values()];
}

export function extractMemoryProposalCandidatesFromReport(
  report: MonitoringScheduledRunReport,
): MonitoringMemoryProposalCandidate[] {
  const policyError = canCreateMonitoringMemoryProposal({ report });
  if (policyError) return [];

  const candidates: MonitoringMemoryProposalCandidate[] = [];

  for (const group of aggregateSignalsFromReport(report)) {
    const agentSlugs = [...group.agentSlugs];
    const routes = [...group.routes];

    if (agentSlugs.length < 2 && routes.length < 2) continue;

    const candidate = buildMonitoringMemoryProposalCandidate(
      {
        category: group.category,
        issuePattern: group.issuePattern,
        agentSlugs,
        routes,
        severities: group.severities,
        sampleIssues: group.sampleIssues,
        evidence: {
          signal_key: `${group.category}|${group.issuePattern}`,
          findings: group.findings,
          agents_count: agentSlugs.length,
          routes_count: routes.length,
        },
      },
      { report },
    );

    if (candidate) candidates.push(candidate);
  }

  return candidates;
}

function toInsertRow(
  candidate: MonitoringMemoryProposalCandidate,
  report: MonitoringScheduledRunReport,
  context: MonitoringMemoryProposalRunContext,
): Omit<
  MonitoringMemoryProposalRow,
  "id" | "created_at" | "updated_at" | "owner_decision_by" | "owner_decision_at" | "applied_memory_id" | "duplicate_of"
> {
  return {
    monitoring_run_id: context.monitoringRunId ?? null,
    run_id: report.runId,
    github_run_id: context.githubRunId ?? null,
    source: context.source ?? "monitoring",
    status: "proposal",
    agent_slug: candidate.agentSlug,
    memory_scope: candidate.memoryScope,
    memory_type: candidate.memoryType,
    title: candidate.title,
    proposal: candidate.proposal,
    rationale: candidate.rationale,
    evidence: candidate.evidence,
    confidence: candidate.confidence,
    duplicate_key: candidate.duplicateKey,
  };
}

export async function insertMonitoringMemoryProposals(
  client: SupabaseClient,
  report: MonitoringScheduledRunReport,
  candidates: MonitoringMemoryProposalCandidate[],
  context: MonitoringMemoryProposalRunContext = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<MonitoringMemoryProposalInsertResult> {
  const stagingError = assertStagingSupabaseForMemoryProposals(env);
  if (stagingError) {
    return { created: 0, skippedDuplicate: 0, skippedPolicy: 0, errors: [stagingError], proposalIds: [] };
  }

  const policyError = canCreateMonitoringMemoryProposal({ report });
  if (policyError) {
    return {
      created: 0,
      skippedDuplicate: 0,
      skippedPolicy: candidates.length,
      errors: [policyError],
      proposalIds: [],
    };
  }

  const result: MonitoringMemoryProposalInsertResult = {
    created: 0,
    skippedDuplicate: 0,
    skippedPolicy: 0,
    errors: [],
    proposalIds: [],
  };

  for (const candidate of candidates) {
    if (!candidate.proposal.trim() || !candidate.rationale.trim()) {
      result.skippedPolicy += 1;
      continue;
    }

    const { data: existing, error: lookupError } = await client
      .from(MEMORY_PROPOSALS_TABLE)
      .select("id")
      .eq("duplicate_key", candidate.duplicateKey)
      .maybeSingle();

    if (lookupError) {
      result.errors.push(lookupError.message);
      continue;
    }

    if (existing?.id) {
      result.skippedDuplicate += 1;
      continue;
    }

    const row = toInsertRow(candidate, report, context);
    const { data, error } = await client.from(MEMORY_PROPOSALS_TABLE).insert(row).select("id").single();

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        result.skippedDuplicate += 1;
        continue;
      }
      result.errors.push(error.message);
      continue;
    }

    result.created += 1;
    if (data?.id) result.proposalIds.push(data.id);
  }

  return result;
}

export async function listMonitoringMemoryProposals(
  client: SupabaseClient,
  limit = 20,
  status?: MonitoringMemoryProposalStatus,
): Promise<{ ok: true; data: MonitoringMemoryProposalRow[] } | { ok: false; error: string }> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  let query = client
    .from(MEMORY_PROPOSALS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as MonitoringMemoryProposalRow[] };
}

export async function getMonitoringMemoryProposal(
  client: SupabaseClient,
  id: string,
): Promise<{ ok: true; row: MonitoringMemoryProposalRow } | { ok: false; error: string }> {
  const { data, error } = await client.from(MEMORY_PROPOSALS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Memory proposal not found." };
  return { ok: true, row: data as MonitoringMemoryProposalRow };
}

export async function countMonitoringMemoryProposalsByStatus(
  client: SupabaseClient,
): Promise<
  | { ok: true; counts: Record<MonitoringMemoryProposalStatus, number> }
  | { ok: false; error: string }
> {
  const statuses: MonitoringMemoryProposalStatus[] = [
    "proposal",
    "owner_approved",
    "rejected",
    "deferred",
    "applied",
  ];
  const counts = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<
    MonitoringMemoryProposalStatus,
    number
  >;

  for (const status of statuses) {
    const { count, error } = await client
      .from(MEMORY_PROPOSALS_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) return { ok: false, error: error.message };
    counts[status] = count ?? 0;
  }

  return { ok: true, counts };
}

export async function updateMonitoringMemoryProposalDecision(
  client: SupabaseClient,
  id: string,
  decision: MonitoringMemoryProposalDecision,
  ownerId: string,
): Promise<{ ok: true; row: MonitoringMemoryProposalRow } | { ok: false; error: string }> {
  const existing = await getMonitoringMemoryProposal(client, id);
  if (!existing.ok) return existing;

  if (existing.row.status === "applied") {
    return { ok: false, error: "Applied proposals cannot be changed in Phase 5E." };
  }

  const { data, error } = await client
    .from(MEMORY_PROPOSALS_TABLE)
    .update({
      status: decision,
      owner_decision_by: ownerId,
      owner_decision_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, row: data as MonitoringMemoryProposalRow };
}

export function toMemoryProposalSummary(row: MonitoringMemoryProposalRow) {
  return {
    id: row.id,
    runId: row.run_id,
    githubRunId: row.github_run_id,
    source: row.source,
    status: row.status,
    agentSlug: row.agent_slug,
    memoryScope: row.memory_scope,
    memoryType: row.memory_type,
    title: row.title,
    proposal: row.proposal,
    rationale: row.rationale,
    evidence: row.evidence,
    confidence: row.confidence,
    duplicateKey: row.duplicate_key,
    appliedMemoryId: row.applied_memory_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerDecisionBy: row.owner_decision_by,
    ownerDecisionAt: row.owner_decision_at,
  };
}

export async function patchMonitoringRunMemoryProposalSummary(
  client: SupabaseClient,
  runId: string,
  stats: Record<string, number>,
): Promise<void> {
  const { data: runRow } = await client
    .from("agentops_monitoring_runs")
    .select("id, summary")
    .eq("run_id", runId)
    .maybeSingle();

  if (!runRow?.id) return;

  const summary = (runRow.summary ?? {}) as Record<string, unknown>;
  await client
    .from("agentops_monitoring_runs")
    .update({
      summary: {
        ...summary,
        memoryProposalsCreated: stats.memoryProposalsCreated ?? 0,
        memoryProposalsSkippedDuplicate: stats.memoryProposalsSkippedDuplicate ?? 0,
        memoryProposalsSkippedPolicy: stats.memoryProposalsSkippedPolicy ?? 0,
        memoryProposalsErrors: stats.memoryProposalsErrors ?? 0,
      },
    })
    .eq("id", runRow.id);
}

export { AGENTOPS_MONITORING_STAGING_PROJECT_REF };
export type { MonitoringMemoryProposalPolicyContext };
