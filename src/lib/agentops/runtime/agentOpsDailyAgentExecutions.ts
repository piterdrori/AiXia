/**
 * Phase 5H — daily per-agent execution persistence (staging Supabase).
 * Phase 5H-F — canonical upsert for same-day retries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AGENTOPS_MONITORING_STAGING_PROJECT_REF } from "./agentOpsMonitoringRunIndex";
import { extractSupabaseProjectRefFromUrl } from "../execution/agentOpsStagingGuard";

export const DAILY_AGENT_EXECUTIONS_TABLE = "agentops_monitoring_daily_agent_executions";
export const DAILY_REVIEW_MODE = "daily_12_agent_review" as const;
export const DAILY_QUEUE_POLICY_VERSION = "daily-12-agent-review-v1" as const;

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

export type DailyExecutionUpsertAction =
  | { action: "insert" }
  | { action: "update"; reason: string }
  | { action: "unchanged"; reason: string }
  | { action: "skip"; reason: string };

export type DailyExecutionPersistenceMetrics = {
  executionRowsInserted: number;
  executionRowsUpdated: number;
  executionRowsUnchanged: number;
  executionRowsFailed: number;
  executionRowsSkipped: number;
  runQueueMetaPersisted: boolean;
  persistenceComplete: boolean;
};

export function createEmptyDailyExecutionPersistenceMetrics(): DailyExecutionPersistenceMetrics {
  return {
    executionRowsInserted: 0,
    executionRowsUpdated: 0,
    executionRowsUnchanged: 0,
    executionRowsFailed: 0,
    executionRowsSkipped: 0,
    runQueueMetaPersisted: false,
    persistenceComplete: false,
  };
}

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

function isCompletedStatus(status: string): boolean {
  return status === "completed";
}

/**
 * Retry authority rule (Phase 5H-F):
 * - one canonical row per (execution_date, agent_id, review_mode)
 * - completed force-retry may replace a prior completed row
 * - failed retry must not erase a prior successful row
 * - same run id replay is idempotent via update
 */
export function resolveDailyExecutionUpsertAction(
  existing: { status: string; run_id: string } | null,
  incoming: { status: string; run_id: string },
  options: { forceRetry?: boolean } = {},
): DailyExecutionUpsertAction {
  if (!existing) return { action: "insert" };

  const incomingCompleted = isCompletedStatus(incoming.status);
  const existingCompleted = isCompletedStatus(existing.status);
  const sameRun = existing.run_id === incoming.run_id;

  if (sameRun) {
    return { action: "update", reason: "same-run-id-replay" };
  }

  if (!incomingCompleted && existingCompleted) {
    return { action: "skip", reason: "preserve-completed-on-failed-retry" };
  }

  if (incomingCompleted && !existingCompleted) {
    return { action: "update", reason: "completed-replaces-non-completed" };
  }

  if (incomingCompleted && existingCompleted && options.forceRetry) {
    return { action: "update", reason: "force-retry-completed-replace" };
  }

  if (incomingCompleted && existingCompleted) {
    return { action: "skip", reason: "already-completed-no-force-retry" };
  }

  return { action: "update", reason: "non-completed-replace" };
}

function buildFinalExecutionRecord(
  record: DailyAgentExecutionInsert,
  runQueueMeta: Record<string, unknown>,
  perAgentStats: { draftsCreated: number; duplicatesSkipped: number },
): DailyAgentExecutionInsert {
  return {
    ...record,
    review_mode: record.review_mode ?? DAILY_REVIEW_MODE,
    drafts_created: perAgentStats.draftsCreated,
    duplicates_skipped: perAgentStats.duplicatesSkipped,
    evidence_summary: {
      ...record.evidence_summary,
      runQueueMeta,
    },
  };
}

async function lookupExistingDailyExecution(
  client: SupabaseClient,
  record: DailyAgentExecutionInsert,
): Promise<{ id: string; status: string; run_id: string } | null> {
  const { data, error } = await client
    .from(DAILY_AGENT_EXECUTIONS_TABLE)
    .select("id, status, run_id")
    .eq("execution_date", record.execution_date)
    .eq("agent_id", record.agent_id)
    .eq("review_mode", record.review_mode ?? DAILY_REVIEW_MODE)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: string; status: string; run_id: string } | null;
}

/**
 * @deprecated Prefer persistDailyExecutionBatch for daily worker writes.
 */
export async function insertDailyAgentExecution(
  client: SupabaseClient,
  record: DailyAgentExecutionInsert,
  options: { forceRetry?: boolean } = {},
): Promise<{ ok: true; row: DailyAgentExecutionRow } | { ok: false; error: string; duplicate?: boolean }> {
  const batch = await persistDailyExecutionBatch(client, [record], {
    forceRetry: options.forceRetry,
    runQueueMeta: (record.evidence_summary?.runQueueMeta as Record<string, unknown> | undefined) ?? {},
    perAgentStats: new Map([
      [
        record.agent_slug,
        {
          draftsCreated: record.drafts_created,
          duplicatesSkipped: record.duplicates_skipped,
        },
      ],
    ]),
  });

  if (!batch.ok) {
    return {
      ok: false,
      error: batch.errors.join("; ") || "Daily execution persistence failed.",
      duplicate: batch.metrics.executionRowsSkipped > 0,
    };
  }

  const listed = await client
    .from(DAILY_AGENT_EXECUTIONS_TABLE)
    .select("*")
    .eq("execution_date", record.execution_date)
    .eq("agent_id", record.agent_id)
    .eq("review_mode", record.review_mode ?? DAILY_REVIEW_MODE)
    .maybeSingle();

  if (listed.error || !listed.data) {
    return { ok: false, error: listed.error?.message ?? "Persisted row not found." };
  }

  return { ok: true, row: listed.data as DailyAgentExecutionRow };
}

export async function persistDailyExecutionBatch(
  client: SupabaseClient,
  records: DailyAgentExecutionInsert[],
  options: {
    forceRetry?: boolean;
    runQueueMeta: Record<string, unknown>;
    perAgentStats: Map<string, { draftsCreated: number; duplicatesSkipped: number }>;
  },
): Promise<{
  ok: boolean;
  metrics: DailyExecutionPersistenceMetrics;
  errors: string[];
}> {
  const metrics = createEmptyDailyExecutionPersistenceMetrics();
  const errors: string[] = [];

  for (const record of records) {
    const agentStats = options.perAgentStats.get(record.agent_slug) ?? {
      draftsCreated: 0,
      duplicatesSkipped: 0,
    };
    const finalRecord = buildFinalExecutionRecord(record, options.runQueueMeta, agentStats);

    try {
      const existing = await lookupExistingDailyExecution(client, finalRecord);
      const decision = resolveDailyExecutionUpsertAction(existing, finalRecord, {
        forceRetry: options.forceRetry,
      });

      if (decision.action === "skip") {
        metrics.executionRowsSkipped += 1;
        continue;
      }

      if (decision.action === "insert") {
        const { error } = await client
          .from(DAILY_AGENT_EXECUTIONS_TABLE)
          .insert({
            ...finalRecord,
            review_mode: finalRecord.review_mode ?? DAILY_REVIEW_MODE,
          });
        if (error) {
          metrics.executionRowsFailed += 1;
          errors.push(`${record.agent_slug}: insert failed — ${error.message}`);
          continue;
        }
        metrics.executionRowsInserted += 1;
        continue;
      }

      if (!existing?.id) {
        metrics.executionRowsFailed += 1;
        errors.push(`${record.agent_slug}: update requested but no existing row.`);
        continue;
      }

      const { error } = await client
        .from(DAILY_AGENT_EXECUTIONS_TABLE)
        .update({
          ...finalRecord,
          review_mode: finalRecord.review_mode ?? DAILY_REVIEW_MODE,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        metrics.executionRowsFailed += 1;
        errors.push(`${record.agent_slug}: update failed — ${error.message}`);
        continue;
      }

      if (decision.action === "unchanged") {
        metrics.executionRowsUnchanged += 1;
      } else {
        metrics.executionRowsUpdated += 1;
      }
    } catch (error) {
      metrics.executionRowsFailed += 1;
      errors.push(
        `${record.agent_slug}: persistence error — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  metrics.runQueueMetaPersisted =
    records.length > 0 &&
    metrics.executionRowsFailed === 0 &&
    metrics.executionRowsInserted + metrics.executionRowsUpdated + metrics.executionRowsUnchanged > 0 &&
    typeof options.runQueueMeta.candidatesDetected === "number";

  metrics.persistenceComplete =
    metrics.executionRowsFailed === 0 &&
    metrics.runQueueMetaPersisted &&
    (metrics.executionRowsInserted > 0 ||
      metrics.executionRowsUpdated > 0 ||
      metrics.executionRowsUnchanged > 0 ||
      metrics.executionRowsSkipped > 0);

  return {
    ok: metrics.executionRowsFailed === 0 && metrics.runQueueMetaPersisted,
    metrics,
    errors,
  };
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

/** @deprecated Use persistDailyExecutionBatch — updates by run_id miss rows on retry. */
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
