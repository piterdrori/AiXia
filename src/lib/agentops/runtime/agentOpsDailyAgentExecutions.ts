/**
 * Phase 5H — daily per-agent execution persistence (staging Supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AGENTOPS_MONITORING_STAGING_PROJECT_REF } from "./agentOpsMonitoringRunIndex";
import { extractSupabaseProjectRefFromUrl } from "../execution/agentOpsStagingGuard";

export const DAILY_AGENT_EXECUTIONS_TABLE = "agentops_monitoring_daily_agent_executions";
export const DAILY_REVIEW_MODE = "daily_12_agent_review" as const;

export type DailyAgentExecutionStatus = "completed" | "failed" | "blocked" | "skipped_ineligible";

export type DailyAgentExecutionInsert = {
  monitoring_run_id?: string | null;
  run_id: string;
  github_run_id?: string | null;
  execution_date: string;
  review_mode?: typeof DAILY_REVIEW_MODE;
  agent_id: string;
  agent_slug: string;
  username: string;
  job_title?: string | null;
  perspective?: string | null;
  status: DailyAgentExecutionStatus;
  routes_reviewed: string[];
  errors_found: number;
  improvements_found: number;
  features_found: number;
  drafts_created: number;
  duplicates_skipped: number;
  no_findings: boolean;
  evidence_summary: Record<string, unknown>;
  failure_reason?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
};

export type DailyAgentExecutionRow = DailyAgentExecutionInsert & {
  id: string;
  created_at: string;
  updated_at: string;
};

export function assertDailyExecutionsSupabaseAllowed(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true } | { ok: false; error: string } {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const ref = extractSupabaseProjectRefFromUrl(url);
  if (!ref) return { ok: false, error: "Missing staging Supabase URL." };
  if (ref !== AGENTOPS_MONITORING_STAGING_PROJECT_REF) {
    return { ok: false, error: `Daily executions blocked: ref ${ref} is not staging.` };
  }
  return { ok: true };
}

export function utcExecutionDate(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

export async function insertDailyAgentExecution(
  client: SupabaseClient,
  record: DailyAgentExecutionInsert,
  options: { forceRetry?: boolean } = {},
): Promise<{ ok: true; row: DailyAgentExecutionRow } | { ok: false; error: string; duplicate?: boolean }> {
  if (!options.forceRetry) {
    const { data: existing } = await client
      .from(DAILY_AGENT_EXECUTIONS_TABLE)
      .select("id, status")
      .eq("execution_date", record.execution_date)
      .eq("agent_id", record.agent_id)
      .eq("review_mode", record.review_mode ?? DAILY_REVIEW_MODE)
      .maybeSingle();

    if (existing?.id && existing.status === "completed") {
      return { ok: false, error: "Daily execution already completed for agent/date.", duplicate: true };
    }
    if (existing?.id) {
      const { data, error } = await client
        .from(DAILY_AGENT_EXECUTIONS_TABLE)
        .update({
          ...record,
          review_mode: record.review_mode ?? DAILY_REVIEW_MODE,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, row: data as DailyAgentExecutionRow };
    }
  }

  const { data, error } = await client
    .from(DAILY_AGENT_EXECUTIONS_TABLE)
    .insert({
      ...record,
      review_mode: record.review_mode ?? DAILY_REVIEW_MODE,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: error.message, duplicate: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, row: data as DailyAgentExecutionRow };
}

export async function listDailyAgentExecutions(
  client: SupabaseClient,
  options: { executionDate?: string; limit?: number; agentSlug?: string } = {},
): Promise<{ ok: true; data: DailyAgentExecutionRow[] } | { ok: false; error: string }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  let query = client
    .from(DAILY_AGENT_EXECUTIONS_TABLE)
    .select("*")
    .order("execution_date", { ascending: false })
    .order("agent_slug", { ascending: true })
    .limit(limit);

  if (options.executionDate) query = query.eq("execution_date", options.executionDate);
  if (options.agentSlug) query = query.eq("agent_slug", options.agentSlug);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as DailyAgentExecutionRow[] };
}

export async function getLatestDailyExecutionForAgent(
  client: SupabaseClient,
  agentSlug: string,
): Promise<{ ok: true; row: DailyAgentExecutionRow | null } | { ok: false; error: string }> {
  const { data, error } = await client
    .from(DAILY_AGENT_EXECUTIONS_TABLE)
    .select("*")
    .eq("agent_slug", agentSlug)
    .order("execution_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, row: (data as DailyAgentExecutionRow | null) ?? null };
}

export async function updateDailyAgentExecutionQueueStats(
  client: SupabaseClient,
  runId: string,
  perAgentStats: Map<string, { draftsCreated: number; duplicatesSkipped: number }>,
  runQueueMeta: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await client
    .from(DAILY_AGENT_EXECUTIONS_TABLE)
    .select("id, agent_slug, evidence_summary")
    .eq("run_id", runId);

  if (error) return { ok: false, error: error.message };

  for (const row of data ?? []) {
    const agentSlug = String(row.agent_slug);
    const stats = perAgentStats.get(agentSlug) ?? { draftsCreated: 0, duplicatesSkipped: 0 };
    const evidenceSummary = {
      ...((row.evidence_summary as Record<string, unknown> | null) ?? {}),
      runQueueMeta,
    };

    const { error: updateError } = await client
      .from(DAILY_AGENT_EXECUTIONS_TABLE)
      .update({
        drafts_created: stats.draftsCreated,
        duplicates_skipped: stats.duplicatesSkipped,
        evidence_summary: evidenceSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export function toDailyAgentExecutionSummary(row: DailyAgentExecutionRow) {
  return {
    id: row.id,
    runId: row.run_id,
    executionDate: row.execution_date,
    agentSlug: row.agent_slug,
    username: row.username,
    jobTitle: row.job_title,
    perspective: row.perspective,
    status: row.status,
    routesReviewed: row.routes_reviewed,
    errorsFound: row.errors_found,
    improvementsFound: row.improvements_found,
    featuresFound: row.features_found,
    draftsCreated: row.drafts_created,
    duplicatesSkipped: row.duplicates_skipped,
    noFindings: row.no_findings,
    evidenceSummary: row.evidence_summary,
    failureReason: row.failure_reason,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    githubRunId: row.github_run_id,
  };
}
