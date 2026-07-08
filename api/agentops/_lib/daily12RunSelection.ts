/**
 * Phase 5H-E — aggregate daily 12-agent run selection (read path only).
 * Vercel-safe: no src/lib imports.
 */

export type Daily12ExecutionRow = {
  run_id: string;
  agent_slug: string;
  status: string;
  errors_found: number;
  improvements_found: number;
  features_found: number;
  drafts_created: number;
  evidence_summary: Record<string, unknown> | null;
  completed_at: string | null;
  started_at: string | null;
  username?: string;
  job_title?: string | null;
  no_findings?: boolean;
  routes_reviewed?: string[];
  failure_reason?: string | null;
};

export type Daily12MonitoringRunRow = {
  run_id: string;
  mode: string;
  status: string;
  agents_run: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  summary?: Record<string, unknown> | null;
};

export type Daily12DraftRunHint = {
  run_id: string;
  latest_created_at: string;
};

export type Daily12RunQueueMeta = {
  candidatesDetected?: number;
  candidatesQueued?: number;
  candidatesNotQueued?: number;
  duplicatesConsolidated?: number;
  dbDuplicatesSkipped?: number;
};

export type Daily12SelectedRun = {
  runId: string;
  completedAt: string | null;
  runQueueMeta: Daily12RunQueueMeta | null;
  executionsForRun: Daily12ExecutionRow[];
};

const COMPLETED_STATUSES = new Set(["completed"]);

export function isDaily12MonitoringRun(row: Daily12MonitoringRunRow): boolean {
  return (
    row.mode === "daily_12_agent_review" ||
    row.summary?.scheduleType === "daily_12_agent_review" ||
    row.summary?.monitoringMode === "daily_12_agent_review"
  );
}

export function utcDateFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function readRunQueueMeta(
  evidenceSummary: Record<string, unknown> | null | undefined,
): Daily12RunQueueMeta | null {
  const meta = evidenceSummary?.runQueueMeta;
  if (!meta || typeof meta !== "object") return null;
  const record = meta as Record<string, unknown>;
  return {
    candidatesDetected:
      typeof record.candidatesDetected === "number" ? record.candidatesDetected : undefined,
    candidatesQueued:
      typeof record.candidatesQueued === "number" ? record.candidatesQueued : undefined,
    candidatesNotQueued:
      typeof record.candidatesNotQueued === "number" ? record.candidatesNotQueued : undefined,
    duplicatesConsolidated:
      typeof record.duplicatesConsolidated === "number" ? record.duplicatesConsolidated : undefined,
    dbDuplicatesSkipped:
      typeof record.dbDuplicatesSkipped === "number" ? record.dbDuplicatesSkipped : undefined,
  };
}

function hasQueueMeta(meta: Daily12RunQueueMeta | null): boolean {
  return meta !== null && typeof meta.candidatesDetected === "number";
}

function maxIso(values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (!value) continue;
    if (!latest || value > latest) latest = value;
  }
  return latest;
}

type RunCandidate = {
  runId: string;
  completedAt: string | null;
  startedAt: string | null;
  status: string;
  agentsCompleted: number;
  agentsAttempted: number;
  runQueueMeta: Daily12RunQueueMeta | null;
  sources: Set<string>;
};

function upsertCandidate(
  map: Map<string, RunCandidate>,
  partial: Omit<RunCandidate, "sources"> & { source: string },
): void {
  const existing = map.get(partial.runId);
  if (!existing) {
    map.set(partial.runId, {
      runId: partial.runId,
      completedAt: partial.completedAt,
      startedAt: partial.startedAt,
      status: partial.status,
      agentsCompleted: partial.agentsCompleted,
      agentsAttempted: partial.agentsAttempted,
      runQueueMeta: partial.runQueueMeta,
      sources: new Set([partial.source]),
    });
    return;
  }

  existing.sources.add(partial.source);
  existing.completedAt = maxIso([existing.completedAt, partial.completedAt]);
  existing.startedAt = maxIso([existing.startedAt, partial.startedAt]);
  existing.agentsCompleted = Math.max(existing.agentsCompleted, partial.agentsCompleted);
  existing.agentsAttempted = Math.max(existing.agentsAttempted, partial.agentsAttempted);
  if (!existing.runQueueMeta && partial.runQueueMeta) {
    existing.runQueueMeta = partial.runQueueMeta;
  }
  if (COMPLETED_STATUSES.has(partial.status)) {
    existing.status = partial.status;
  }
}

function compareCandidates(a: RunCandidate, b: RunCandidate, expectedAgents: number): number {
  const aComplete = a.agentsCompleted >= expectedAgents;
  const bComplete = b.agentsCompleted >= expectedAgents;
  if (aComplete !== bComplete) return aComplete ? -1 : 1;

  const aCompletedStatus = COMPLETED_STATUSES.has(a.status);
  const bCompletedStatus = COMPLETED_STATUSES.has(b.status);
  if (aCompletedStatus !== bCompletedStatus) return aCompletedStatus ? -1 : 1;

  const aHasMeta = hasQueueMeta(a.runQueueMeta);
  const bHasMeta = hasQueueMeta(b.runQueueMeta);
  if (aHasMeta !== bHasMeta) return aHasMeta ? -1 : 1;

  const aCompletedAt = a.completedAt ?? a.startedAt ?? "";
  const bCompletedAt = b.completedAt ?? b.startedAt ?? "";
  if (aCompletedAt !== bCompletedAt) return bCompletedAt.localeCompare(aCompletedAt);

  return b.agentsAttempted - a.agentsAttempted;
}

export function selectLatestCompletedDaily12Run(input: {
  executionDate: string;
  executions: Daily12ExecutionRow[];
  monitoringRuns: Daily12MonitoringRunRow[];
  draftRunHints?: Daily12DraftRunHint[];
  expectedAgentCount?: number;
}): Daily12SelectedRun | null {
  const expectedAgents = input.expectedAgentCount ?? 12;
  const candidates = new Map<string, RunCandidate>();
  const executionsByRun = new Map<string, Daily12ExecutionRow[]>();

  for (const row of input.executions) {
    const bucket = executionsByRun.get(row.run_id) ?? [];
    bucket.push(row);
    executionsByRun.set(row.run_id, bucket);

    const completedCount = bucket.filter((entry) => entry.status === "completed").length;
    const runQueueMeta = readRunQueueMeta(row.evidence_summary);
    upsertCandidate(candidates, {
      runId: row.run_id,
      completedAt: maxIso(bucket.map((entry) => entry.completed_at)),
      startedAt: maxIso(bucket.map((entry) => entry.started_at)),
      status: completedCount === bucket.length && completedCount > 0 ? "completed" : "partial",
      agentsCompleted: completedCount,
      agentsAttempted: bucket.length,
      runQueueMeta,
      source: "execution",
    });
  }

  for (const row of input.monitoringRuns) {
    if (!isDaily12MonitoringRun(row)) continue;
    const runDate =
      utcDateFromIso(row.ended_at) ??
      utcDateFromIso(row.started_at) ??
      utcDateFromIso(row.created_at);
    if (runDate !== input.executionDate) continue;

    const summaryQueue =
      row.summary?.queueSummary && typeof row.summary.queueSummary === "object"
        ? (row.summary.queueSummary as Record<string, unknown>)
        : null;
    const pipeline =
      row.summary?.pipelineCounts && typeof row.summary.pipelineCounts === "object"
        ? (row.summary.pipelineCounts as Record<string, unknown>)
        : null;

    upsertCandidate(candidates, {
      runId: row.run_id,
      completedAt: row.ended_at ?? row.started_at,
      startedAt: row.started_at,
      status: row.status,
      agentsCompleted: row.agents_run,
      agentsAttempted: row.agents_run,
      runQueueMeta: summaryQueue
        ? {
            candidatesDetected:
              typeof summaryQueue.candidatesDetected === "number"
                ? summaryQueue.candidatesDetected
                : undefined,
            candidatesQueued:
              typeof summaryQueue.candidatesQueued === "number"
                ? summaryQueue.candidatesQueued
                : undefined,
            candidatesNotQueued:
              typeof summaryQueue.candidatesNotQueued === "number"
                ? summaryQueue.candidatesNotQueued
                : undefined,
            duplicatesConsolidated:
              typeof summaryQueue.duplicatesConsolidated === "number"
                ? summaryQueue.duplicatesConsolidated
                : undefined,
          }
        : pipeline
          ? {
              candidatesQueued:
                typeof pipeline.issueDraftsCreated === "number"
                  ? pipeline.issueDraftsCreated
                  : undefined,
            }
          : null,
      source: "monitoring",
    });
  }

  for (const hint of input.draftRunHints ?? []) {
    if (utcDateFromIso(hint.latest_created_at) !== input.executionDate) continue;
    upsertCandidate(candidates, {
      runId: hint.run_id,
      completedAt: hint.latest_created_at,
      startedAt: hint.latest_created_at,
      status: "completed",
      agentsCompleted: 0,
      agentsAttempted: 0,
      runQueueMeta: null,
      source: "draft",
    });
  }

  const ranked = [...candidates.values()].sort((a, b) =>
    compareCandidates(a, b, expectedAgents),
  );
  const selected =
    ranked.find((candidate) => candidate.agentsCompleted >= expectedAgents) ??
    ranked.find((candidate) => COMPLETED_STATUSES.has(candidate.status)) ??
    ranked[0] ??
    null;

  if (!selected) return null;

  const executionsForRun = executionsByRun.get(selected.runId) ?? [];
  let runQueueMeta = selected.runQueueMeta;
  if (!hasQueueMeta(runQueueMeta)) {
    for (const row of executionsForRun) {
      const meta = readRunQueueMeta(row.evidence_summary);
      if (hasQueueMeta(meta)) {
        runQueueMeta = meta;
        break;
      }
    }
  }

  return {
    runId: selected.runId,
    completedAt: selected.completedAt,
    runQueueMeta,
    executionsForRun,
  };
}

export function buildExecutionMapForSelectedRun(
  executions: Daily12ExecutionRow[],
  selectedRunId: string | null,
): Map<string, Daily12ExecutionRow> {
  const map = new Map<string, Daily12ExecutionRow>();
  for (const slug of new Set(executions.map((row) => row.agent_slug))) {
    const rowsForSlug = executions.filter((row) => row.agent_slug === slug);
    const preferred =
      (selectedRunId
        ? rowsForSlug.find((row) => row.run_id === selectedRunId)
        : undefined) ??
      [...rowsForSlug].sort((a, b) =>
        (b.completed_at ?? b.started_at ?? "").localeCompare(a.completed_at ?? a.started_at ?? ""),
      )[0];
    if (preferred) map.set(slug, preferred);
  }
  return map;
}
