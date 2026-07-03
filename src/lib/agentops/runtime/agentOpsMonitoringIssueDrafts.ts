/**
 * Phase 5C — monitoring issue draft persistence (staging Supabase only).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assertStagingSupabaseForDrafts,
  buildMonitoringIssueDraftCandidate,
  canCreateMonitoringIssueDraft,
  type MonitoringIssueDraftCandidate,
  type MonitoringIssueDraftDecision,
} from "./agentOpsMonitoringIssueDraftPolicy";
import { AGENTOPS_MONITORING_STAGING_PROJECT_REF } from "./agentOpsMonitoringRunIndex";
import type { MonitoringScheduledRunReport } from "./agentOpsMonitoringScheduledReport";
import type { StagingScanFinding } from "./stagingScanTypes";

export const ISSUE_DRAFTS_TABLE = "agentops_monitoring_issue_drafts";

export type MonitoringIssueDraftStatus =
  | "draft"
  | "owner_approved"
  | "rejected"
  | "deferred"
  | "promoted";

export type MonitoringIssueDraftRow = {
  id: string;
  monitoring_run_id: string | null;
  run_id: string;
  github_run_id: string | null;
  source: string;
  status: MonitoringIssueDraftStatus;
  agent_slug: string;
  module: string | null;
  route: string | null;
  issue_type: string | null;
  severity: string;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  browser_qa_evidence: Record<string, unknown>;
  suggested_fix_prompt: string | null;
  confidence: number | null;
  duplicate_key: string;
  duplicate_of: string | null;
  owner_decision_by: string | null;
  owner_decision_at: string | null;
  promoted_issue_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MonitoringIssueDraftInsertResult = {
  created: number;
  skippedDuplicate: number;
  skippedPolicy: number;
  errors: string[];
  draftIds: string[];
};

export type MonitoringIssueDraftRunContext = {
  monitoringRunId?: string | null;
  githubRunId?: string | null;
  source?: string;
};

function toInsertRow(
  candidate: MonitoringIssueDraftCandidate,
  report: MonitoringScheduledRunReport,
  context: MonitoringIssueDraftRunContext,
  duplicateOf: string | null,
): Omit<MonitoringIssueDraftRow, "id" | "created_at" | "updated_at" | "owner_decision_by" | "owner_decision_at" | "promoted_issue_id"> {
  return {
    monitoring_run_id: context.monitoringRunId ?? null,
    run_id: report.runId,
    github_run_id: context.githubRunId ?? null,
    source: context.source ?? "monitoring_dry_run",
    status: "draft",
    agent_slug: candidate.agentSlug,
    module: candidate.module,
    route: candidate.route,
    issue_type: candidate.issueType,
    severity: candidate.severity,
    title: candidate.title,
    summary: candidate.summary,
    evidence: candidate.evidence,
    browser_qa_evidence: candidate.browserQaEvidence,
    suggested_fix_prompt: candidate.suggestedFixPrompt,
    confidence: candidate.confidence,
    duplicate_key: candidate.duplicateKey,
    duplicate_of: duplicateOf,
  };
}

export function extractIssueDraftCandidatesFromReport(
  report: MonitoringScheduledRunReport,
): MonitoringIssueDraftCandidate[] {
  const candidates: MonitoringIssueDraftCandidate[] = [];

  for (const agent of report.agentsRun) {
    const findings = agent.findings ?? [];
    for (const finding of findings) {
      const policyError = canCreateMonitoringIssueDraft({
        report,
        finding,
        agentSlug: agent.agentSlug,
      });
      if (policyError) continue;

      candidates.push(
        buildMonitoringIssueDraftCandidate(finding, {
          report,
          agentSlug: agent.agentSlug,
        }),
      );
    }
  }

  return candidates;
}

export async function insertMonitoringIssueDrafts(
  client: SupabaseClient,
  report: MonitoringScheduledRunReport,
  candidates: MonitoringIssueDraftCandidate[],
  context: MonitoringIssueDraftRunContext = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<MonitoringIssueDraftInsertResult> {
  const stagingError = assertStagingSupabaseForDrafts(env);
  if (stagingError) {
    return { created: 0, skippedDuplicate: 0, skippedPolicy: 0, errors: [stagingError], draftIds: [] };
  }

  if (!report.dryRun || !report.productionBlocked || report.actualIssuesCreated > 0 || report.actualMemoryWrites > 0) {
    return {
      created: 0,
      skippedDuplicate: 0,
      skippedPolicy: candidates.length,
      errors: ["Report failed draft insert safety gate."],
      draftIds: [],
    };
  }

  const result: MonitoringIssueDraftInsertResult = {
    created: 0,
    skippedDuplicate: 0,
    skippedPolicy: 0,
    errors: [],
    draftIds: [],
  };

  for (const candidate of candidates) {
    const { data: existing, error: lookupError } = await client
      .from(ISSUE_DRAFTS_TABLE)
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

    const row = toInsertRow(candidate, report, context, null);
    const { data, error } = await client.from(ISSUE_DRAFTS_TABLE).insert(row).select("id").single();

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        result.skippedDuplicate += 1;
        continue;
      }
      result.errors.push(error.message);
      continue;
    }

    result.created += 1;
    if (data?.id) result.draftIds.push(data.id);
  }

  return result;
}

export async function listMonitoringIssueDrafts(
  client: SupabaseClient,
  limit = 20,
  status?: MonitoringIssueDraftStatus,
): Promise<{ ok: true; data: MonitoringIssueDraftRow[] } | { ok: false; error: string }> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  let query = client.from(ISSUE_DRAFTS_TABLE).select("*").order("created_at", { ascending: false }).limit(safeLimit);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as MonitoringIssueDraftRow[] };
}

export async function getMonitoringIssueDraft(
  client: SupabaseClient,
  id: string,
): Promise<{ ok: true; row: MonitoringIssueDraftRow } | { ok: false; error: string }> {
  const { data, error } = await client.from(ISSUE_DRAFTS_TABLE).select("*").eq("id", id).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Draft not found." };
  return { ok: true, row: data as MonitoringIssueDraftRow };
}

export async function countMonitoringIssueDraftsByStatus(
  client: SupabaseClient,
): Promise<
  | {
      ok: true;
      counts: Record<MonitoringIssueDraftStatus, number>;
    }
  | { ok: false; error: string }
> {
  const statuses: MonitoringIssueDraftStatus[] = [
    "draft",
    "owner_approved",
    "rejected",
    "deferred",
    "promoted",
  ];
  const counts = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<
    MonitoringIssueDraftStatus,
    number
  >;

  for (const status of statuses) {
    const { count, error } = await client
      .from(ISSUE_DRAFTS_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) return { ok: false, error: error.message };
    counts[status] = count ?? 0;
  }

  return { ok: true, counts };
}

export async function updateMonitoringIssueDraftDecision(
  client: SupabaseClient,
  id: string,
  decision: MonitoringIssueDraftDecision,
  ownerId: string,
): Promise<{ ok: true; row: MonitoringIssueDraftRow } | { ok: false; error: string }> {
  const existing = await getMonitoringIssueDraft(client, id);
  if (!existing.ok) return existing;

  if (existing.row.status === "promoted") {
    return { ok: false, error: "Promoted drafts cannot be changed in Phase 5C." };
  }

  const { data, error } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .update({
      status: decision,
      owner_decision_by: ownerId,
      owner_decision_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, row: data as MonitoringIssueDraftRow };
}

export function toIssueDraftSummary(row: MonitoringIssueDraftRow) {
  return {
    id: row.id,
    runId: row.run_id,
    githubRunId: row.github_run_id,
    source: row.source,
    status: row.status,
    agentSlug: row.agent_slug,
    module: row.module,
    route: row.route,
    issueType: row.issue_type,
    severity: row.severity,
    title: row.title,
    summary: row.summary,
    browserQaEvidence: row.browser_qa_evidence,
    confidence: row.confidence,
    duplicateKey: row.duplicate_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerDecisionBy: row.owner_decision_by,
    ownerDecisionAt: row.owner_decision_at,
  };
}

export async function patchMonitoringRunDraftSummary(
  client: SupabaseClient,
  runId: string,
  draftStats: Record<string, number>,
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
        issueDraftsCreated: draftStats.issueDraftsCreated ?? 0,
        issueDraftsSkippedDuplicate: draftStats.issueDraftsSkippedDuplicate ?? 0,
        issueDraftsSkippedPolicy: draftStats.issueDraftsSkippedPolicy ?? 0,
        issueDraftsErrors: draftStats.issueDraftsErrors ?? 0,
      },
    })
    .eq("id", runRow.id);
}

export { AGENTOPS_MONITORING_STAGING_PROJECT_REF };

export type { StagingScanFinding };
