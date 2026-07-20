/**
 * AgentOps monitoring owner API — Vercel-safe (no src/lib imports).
 * GET  /api/agentops/monitoring/status
 * POST /api/agentops/monitoring/dry-run
 * GET  /api/agentops/monitoring/reports/latest
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  buildExecutionMapForSelectedRun,
  selectLatestCompletedDaily12Run,
  type Daily12DraftRunHint,
  type Daily12RunQueueMeta,
  utcDateFromIso,
} from "./daily12RunSelection.js";
import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";
import { applyMonitoringMemoryProposalViaApi } from "./monitoringMemoryApplication.js";
import { createMonitoringReadClient, extractSupabaseProjectRef, resolveMonitoringSupabaseUrl } from "./monitoringReadClient.js";
import {
  handleMonitoringManualRunCancelRequest,
  handleMonitoringManualRunCapabilityRequest,
  handleMonitoringManualRunStartRequest,
  handleMonitoringManualRunStatusRequest,
} from "./monitoringManualRun.js";
import { jsonResponse } from "./ollamaProxy.js";

const MONITORING_TABLE = "agentops_monitoring_runs";
const ISSUE_DRAFTS_TABLE = "agentops_monitoring_issue_drafts";
const MEMORY_PROPOSALS_TABLE = "agentops_monitoring_memory_proposals";
const DAILY_EXECUTIONS_TABLE = "agentops_monitoring_daily_agent_executions";
const AGENTS_TABLE = "agentops_agents";
const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";

type MonitoringRunRow = {
  id: string;
  run_id: string;
  source: string;
  mode: string;
  level: number;
  dry_run: boolean;
  target_base_url: string;
  target_class: string;
  production_blocked: boolean;
  production_guard_active: boolean;
  production_target_rejected: boolean;
  continuous_enabled: boolean;
  agents_considered: number;
  agents_run: number;
  findings_count: number;
  actual_issues_created: number;
  actual_memory_writes: number;
  errors_count: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  github_run_id: string | null;
  github_run_url: string | null;
  artifact_name: string | null;
  summary?: Record<string, unknown> | null;
  created_at: string;
};

type IssueDraftRow = {
  id: string;
  run_id: string;
  github_run_id: string | null;
  source: string;
  status: string;
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
  promoted_issue_id: string | null;
  created_at: string;
  updated_at: string;
  owner_decision_by: string | null;
  owner_decision_at: string | null;
};

type MemoryProposalRow = {
  id: string;
  run_id: string;
  github_run_id: string | null;
  source: string;
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
  created_at: string;
  updated_at: string;
  owner_decision_by: string | null;
  owner_decision_at: string | null;
};

function methodNotAllowed(): Response {
  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}

function createStagingSupabaseClient(): SupabaseClient | null {
  const readClient = createMonitoringReadClient(process.env);
  return readClient.ok ? readClient.client : null;
}

function guardMonitoringStatusReadResponse(): Response | null {
  const projectRef = extractSupabaseProjectRef(resolveMonitoringSupabaseUrl(process.env));
  if (projectRef && projectRef !== STAGING_PROJECT_REF) {
    return jsonResponse(
      {
        ok: false,
        error: `Monitoring status reads require staging Supabase ref ${STAGING_PROJECT_REF}.`,
        readPathState: { configured: false, emptyReason: "wrong_project_ref" },
      },
      403,
    );
  }
  return null;
}

type MonitoringReadPathState = {
  configured: boolean;
  authMode: "service_role" | null;
  projectRef: string | null;
  runIndexRowCount: number;
  executionRowCount: number;
  agentsRowCount: number;
  emptyReason: "no_runs" | "no_executions_today" | "no_agents" | null;
  queryErrors: {
    runIndex?: string;
    executions?: string;
    agents?: string;
    drafts?: string;
    proposals?: string;
  };
};

function toRunIndexSummary(row: MonitoringRunRow) {
  return {
    id: row.id,
    runId: row.run_id,
    source: row.source,
    mode: row.mode,
    level: row.level,
    dryRun: row.dry_run,
    targetBaseUrl: row.target_base_url,
    targetClass: row.target_class,
    productionBlocked: row.production_blocked,
    productionGuardActive: row.production_guard_active,
    productionTargetRejected: row.production_target_rejected,
    continuousEnabled: row.continuous_enabled,
    agentsConsidered: row.agents_considered,
    agentsRun: row.agents_run,
    findingsCount: row.findings_count,
    actualIssuesCreated: row.actual_issues_created,
    actualMemoryWrites: row.actual_memory_writes,
    errorsCount: row.errors_count,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    githubRunId: row.github_run_id,
    githubRunUrl: row.github_run_url,
    artifactName: row.artifact_name,
    createdAt: row.created_at,
    summary: row.summary ?? null,
    scheduleType:
      typeof row.summary?.scheduleType === "string" ? row.summary.scheduleType : null,
  };
}

const APPROVED_OPERATIONAL_CRON = "0 */6 * * *";
const APPROVED_WEEKLY_CRON = "0 2 * * 0";
const APPROVED_DAILY_12_AGENT_CRON = "0 1 * * *";
const EXPECTED_DAILY_AGENT_COUNT = 12;
const GITHUB_REPO_ACTIONS_URL =
  "https://github.com/piterdrori/AiXia/actions/workflows/agentops-monitoring-scheduled-dry-run.yml";
const GITHUB_DAILY_12_ACTIONS_URL =
  "https://github.com/piterdrori/AiXia/actions/workflows/agentops-daily-12-agent-review.yml";

const CANONICAL_DAILY_AGENT_SLUGS = [
  "system-agent",
  "memory-agent",
  "issue-agent",
  "evolution-agent",
  "fix-agent",
  "qa-agent",
  "design-agent",
  "runtime-agent",
  "logs-agent",
  "config-agent",
  "chat-agent",
  "analytics-agent",
] as const;

const CANONICAL_DAILY_JOB_TITLES: Record<string, string> = {
  "system-agent": "System Health & Infrastructure Agent",
  "memory-agent": "Memory & Knowledge Agent",
  "issue-agent": "Issue Lifecycle Agent",
  "evolution-agent": "Pattern & Evolution Agent",
  "fix-agent": "Repair Planning Agent",
  "qa-agent": "Quality Assurance Agent",
  "design-agent": "UI / UX Design Agent",
  "runtime-agent": "Runtime & Scheduling Agent",
  "logs-agent": "Logs & Observability Agent",
  "config-agent": "Configuration & Safety Agent",
  "chat-agent": "Chat & Conversation Agent",
  "analytics-agent": "Analytics & KPI Agent",
};

function utcDateOnly(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

function parseCanonicalSlugFromTools(tools: string[] | null | undefined): string | null {
  for (const tool of tools ?? []) {
    if (typeof tool === "string" && tool.startsWith("canonical:")) {
      return tool.slice("canonical:".length);
    }
  }
  return null;
}

function parseUsernameFromTools(tools: string[] | null | undefined): string | null {
  for (const tool of tools ?? []) {
    if (typeof tool === "string" && tool.startsWith("username:")) {
      return tool.slice("username:".length);
    }
  }
  return null;
}

type DailyExecutionRow = {
  id: string;
  run_id: string;
  execution_date: string;
  agent_id: string;
  agent_slug: string;
  username: string;
  job_title: string | null;
  perspective: string | null;
  status: string;
  routes_reviewed: string[];
  errors_found: number;
  improvements_found: number;
  features_found: number;
  drafts_created: number;
  duplicates_skipped: number;
  no_findings: boolean;
  evidence_summary: Record<string, unknown> | null;
  failure_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type AgentRow = {
  id: string;
  name: string;
  tools: string[] | null;
  status: string;
};

async function listDailyExecutionsForDate(client: SupabaseClient, executionDate: string) {
  const { data, error } = await client
    .from(DAILY_EXECUTIONS_TABLE)
    .select(
      "id, run_id, execution_date, agent_id, agent_slug, username, job_title, perspective, status, routes_reviewed, errors_found, improvements_found, features_found, drafts_created, duplicates_skipped, no_findings, evidence_summary, failure_reason, started_at, completed_at",
    )
    .eq("execution_date", executionDate)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("agent_slug", { ascending: true });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: (data ?? []) as DailyExecutionRow[] };
}

async function listDailyExecutionsForRunId(client: SupabaseClient, runId: string) {
  const { data, error } = await client
    .from(DAILY_EXECUTIONS_TABLE)
    .select(
      "id, run_id, execution_date, agent_id, agent_slug, username, job_title, perspective, status, routes_reviewed, errors_found, improvements_found, features_found, drafts_created, duplicates_skipped, no_findings, evidence_summary, failure_reason, started_at, completed_at",
    )
    .eq("run_id", runId)
    .order("agent_slug", { ascending: true });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: (data ?? []) as DailyExecutionRow[] };
}

function buildDaily12DraftRunHints(
  draftRows: IssueDraftRow[],
  executionDate: string,
): Daily12DraftRunHint[] {
  const hints = new Map<string, string>();
  for (const draft of draftRows) {
    if (draft.source !== "daily_12_agent_review") continue;
    if (utcDateFromIso(draft.created_at) !== executionDate) continue;
    const existing = hints.get(draft.run_id);
    if (!existing || draft.created_at > existing) {
      hints.set(draft.run_id, draft.created_at);
    }
  }
  return [...hints.entries()].map(([run_id, latest_created_at]) => ({
    run_id,
    latest_created_at,
  }));
}

async function listStagingAgents(client: SupabaseClient) {
  const { data, error } = await client
    .from(AGENTS_TABLE)
    .select("id, name, tools, status")
    .eq("environment", "staging")
    .order("name", { ascending: true });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: (data ?? []) as AgentRow[] };
}

function buildDaily12ReviewStatus(
  rows: MonitoringRunRow[],
  executionDate: string,
  executions: DailyExecutionRow[],
  agents: AgentRow[],
  dailyDraftCounts: { errors: number; improvements: number; features: number; duplicates: number },
  draftRunHints: Daily12DraftRunHint[] = [],
  draftRows: IssueDraftRow[] = [],
) {
  const selectedRun = selectLatestCompletedDaily12Run({
    executionDate,
    executions,
    monitoringRuns: rows,
    draftRunHints,
    expectedAgentCount: EXPECTED_DAILY_AGENT_COUNT,
  });
  const executionBySlug = buildExecutionMapForSelectedRun(
    executions,
    selectedRun?.runId ?? null,
  );
  const agentBySlug = new Map<string, AgentRow>();
  for (const agent of agents) {
    const slug = parseCanonicalSlugFromTools(agent.tools);
    if (slug) agentBySlug.set(slug, agent);
  }

  const roster = CANONICAL_DAILY_AGENT_SLUGS.map((slug) => {
    const execution = executionBySlug.get(slug);
    const agent = agentBySlug.get(slug);
    const username =
      parseUsernameFromTools(agent?.tools) ?? execution?.username ?? `@aixia.${slug}`;
    return {
      agentSlug: slug,
      displayName: agent?.name ?? slug,
      username,
      jobTitle: CANONICAL_DAILY_JOB_TITLES[slug] ?? execution?.job_title ?? slug,
      agentStatus: agent?.status ?? "missing",
      lastDailyRunAt: execution?.completed_at ?? execution?.started_at ?? null,
      todayStatus: execution?.status ?? "missing",
      todayResult:
        execution?.status === "completed"
          ? execution.no_findings
            ? "no_findings"
            : "findings"
          : execution?.status ?? "not_run",
      errorsFound: execution?.errors_found ?? 0,
      improvementsFound: execution?.improvements_found ?? 0,
      featuresFound: execution?.features_found ?? 0,
      draftsQueued: execution?.drafts_created ?? 0,
      noFindings: execution?.no_findings ?? false,
      routesReviewed: execution?.routes_reviewed ?? [],
      failureReason: execution?.failure_reason ?? null,
    };
  });

  const attemptedToday = executionBySlug.size;
  const completedToday = [...executionBySlug.values()].filter((row) => row.status === "completed")
    .length;
  const failedToday = [...executionBySlug.values()].filter((row) => row.status === "failed").length;
  const blockedToday = [...executionBySlug.values()].filter((row) => row.status === "blocked").length;
  const missingToday = CANONICAL_DAILY_AGENT_SLUGS.filter((slug) => !executionBySlug.has(slug));
  const usernamesConfigured = roster.filter((row) => row.username.startsWith("@aixia.")).length;

  const healthWarnings: string[] = [];
  if (agents.length < EXPECTED_DAILY_AGENT_COUNT) {
    healthWarnings.push(
      `Registered agents ${agents.length}/${EXPECTED_DAILY_AGENT_COUNT} — registry drift detected.`,
    );
  }
  if (usernamesConfigured < EXPECTED_DAILY_AGENT_COUNT) {
    healthWarnings.push(
      `Usernames configured ${usernamesConfigured}/${EXPECTED_DAILY_AGENT_COUNT} — run canonical initializer.`,
    );
  }
  if (attemptedToday < EXPECTED_DAILY_AGENT_COUNT) {
    healthWarnings.push(
      `Daily coverage incomplete: attempted ${attemptedToday}/${EXPECTED_DAILY_AGENT_COUNT} for ${executionDate}.`,
    );
  }
  if (missingToday.length > 0) {
    healthWarnings.push(`Missing agents today: ${missingToday.join(", ")}`);
  }
  if (failedToday > 0) {
    healthWarnings.push(`${failedToday} agent run(s) failed today.`);
  }

  const rosterExecutions = selectedRun?.executionsForRun.length
    ? selectedRun.executionsForRun
    : [...executionBySlug.values()];
  const lastExecutionCompletedAt =
    selectedRun?.completedAt ??
    rosterExecutions.reduce<string | null>((latest, row) => {
      if (!row.completed_at) return latest;
      if (!latest) return row.completed_at;
      return row.completed_at > latest ? row.completed_at : latest;
    }, null);
  const selectedRunRow = selectedRun?.runId
    ? rows.find((row) => row.run_id === selectedRun.runId)
    : undefined;
  const persistenceMetrics =
    selectedRunRow?.summary?.persistenceMetrics &&
    typeof selectedRunRow.summary.persistenceMetrics === "object"
      ? (selectedRunRow.summary.persistenceMetrics as Record<string, unknown>)
      : null;
  const persistenceComplete =
    typeof persistenceMetrics?.persistenceComplete === "boolean"
      ? persistenceMetrics.persistenceComplete
      : missingToday.length === 0 &&
        attemptedToday === EXPECTED_DAILY_AGENT_COUNT &&
        completedToday === EXPECTED_DAILY_AGENT_COUNT;

  const runQueueMeta = selectedRun?.runQueueMeta ?? null;
  const candidatesDetectedToday =
    typeof runQueueMeta?.candidatesDetected === "number"
      ? runQueueMeta.candidatesDetected
      : rosterExecutions.reduce(
          (sum, row) => sum + row.errors_found + row.improvements_found + row.features_found,
          0,
        );
  const draftsQueuedToday =
    typeof runQueueMeta?.candidatesQueued === "number"
      ? runQueueMeta.candidatesQueued
      : selectedRun?.runId
        ? draftRows.filter(
            (draft) =>
              draft.source === "daily_12_agent_review" && draft.run_id === selectedRun.runId,
          ).length
        : dailyDraftCounts.errors + dailyDraftCounts.improvements + dailyDraftCounts.features;
  const candidatesNotQueuedToday =
    typeof runQueueMeta?.candidatesNotQueued === "number" ? runQueueMeta.candidatesNotQueued : 0;
  const duplicatesConsolidatedToday =
    typeof runQueueMeta?.duplicatesConsolidated === "number" ? runQueueMeta.duplicatesConsolidated : 0;

  return {
    schedule: `Daily at 01:00 UTC (${APPROVED_DAILY_12_AGENT_CRON})`,
    environment: "staging" as const,
    modeLabel: "Evidence and proposals only",
    registeredAgents: agents.length,
    expectedAgents: EXPECTED_DAILY_AGENT_COUNT,
    usernamesConfigured,
    executionDate,
    agentsExpectedToday: EXPECTED_DAILY_AGENT_COUNT,
    agentsAttemptedToday: attemptedToday,
    agentsCompletedToday: completedToday,
    agentsFailedToday: failedToday,
    agentsBlockedToday: blockedToday,
    agentsMissingToday: missingToday,
    lastCompletedDailyReviewAt: lastExecutionCompletedAt,
    nextExpectedDailyReviewAt: computeNextCronUtc(APPROVED_DAILY_12_AGENT_CRON, new Date()),
    errorsFoundToday: rosterExecutions.reduce((sum, row) => sum + row.errors_found, 0),
    improvementsSuggestedToday: rosterExecutions.reduce((sum, row) => sum + row.improvements_found, 0),
    newFeaturesSuggestedToday: rosterExecutions.reduce((sum, row) => sum + row.features_found, 0),
    candidatesDetectedToday,
    draftsQueuedToday,
    candidatesNotQueuedToday,
    duplicatesConsolidatedToday,
    duplicatesSkippedToday: dailyDraftCounts.duplicates,
    noFindingsAgentsToday: rosterExecutions.filter((row) => row.no_findings).length,
    draftsCreatedToday: draftsQueuedToday,
    allAgentsAccountedFor:
      missingToday.length === 0 &&
      attemptedToday === EXPECTED_DAILY_AGENT_COUNT &&
      usernamesConfigured === EXPECTED_DAILY_AGENT_COUNT,
    healthWarnings,
    roster,
    githubWorkflowUrl: GITHUB_DAILY_12_ACTIONS_URL,
    latestDailyRunId: selectedRun?.runId ?? null,
    latestRunStatus: selectedRunRow?.status ?? null,
    persistenceComplete,
    runQueueMetaPersisted:
      typeof persistenceMetrics?.runQueueMetaPersisted === "boolean"
        ? persistenceMetrics.runQueueMetaPersisted
        : hasQueueMeta(runQueueMeta),
    runIndexPersisted:
      typeof persistenceMetrics?.runIndexPersisted === "boolean"
        ? persistenceMetrics.runIndexPersisted
        : Boolean(selectedRunRow),
  };
}

function hasQueueMeta(meta: Daily12RunQueueMeta | null): boolean {
  return meta !== null && typeof meta.candidatesDetected === "number";
}

function computeNextCronUtc(cronExpression: string, from = new Date()): string | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minuteField, hourField, , , dowField] = parts;
  const cursor = new Date(from);
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  for (let i = 0; i < 60 * 24 * 14; i += 1) {
    const minute = cursor.getUTCMinutes();
    const hour = cursor.getUTCHours();
    const dow = cursor.getUTCDay();
    const minuteOk =
      minuteField === "*" ||
      (minuteField.startsWith("*/") && minute % Number.parseInt(minuteField.slice(2), 10) === 0) ||
      Number.parseInt(minuteField, 10) === minute;
    const hourOk =
      hourField === "*" ||
      (hourField.startsWith("*/") && hour % Number.parseInt(hourField.slice(2), 10) === 0) ||
      Number.parseInt(hourField, 10) === hour;
    const dowOk = dowField === "*" || Number.parseInt(dowField, 10) === dow;
    if (minuteOk && hourOk && dowOk) return cursor.toISOString();
    cursor.setUTCMinutes(minute + 1, 0, 0);
  }
  return null;
}

function buildScheduleStatus(rows: MonitoringRunRow[]) {
  const summaries = rows.map((row) => ({
    mode: row.mode,
    scheduleType:
      typeof row.summary?.scheduleType === "string" ? row.summary.scheduleType : undefined,
    endedAt: row.ended_at,
    status: row.status,
    summary: row.summary ?? undefined,
  }));
  const operationalRuns = summaries.filter(
    (row) => row.scheduleType === "operational_6h" || row.mode === "operational_dry_run",
  );
  const weeklyRuns = summaries.filter(
    (row) => row.scheduleType === "weekly_improvement" || row.mode === "weekly_improvement",
  );
  const lastOperational = operationalRuns[0] ?? summaries[0] ?? null;
  const lastWeekly = weeklyRuns[0] ?? null;
  const lastAny = summaries[0] ?? null;
  const pipeline = (lastAny?.summary?.pipelineCounts ?? lastAny?.summary ?? {}) as Record<
    string,
    unknown
  >;
  const now = new Date();
  return {
    scheduleActive: true,
    operationalCron: APPROVED_OPERATIONAL_CRON,
    weeklyCron: APPROVED_WEEKLY_CRON,
    environment: "staging" as const,
    modeLabel: "Dry-run / proposals only",
    continuousEnabled: false as const,
    lastOperationalRunAt: lastOperational?.endedAt ?? null,
    nextOperationalRunAt: computeNextCronUtc(APPROVED_OPERATIONAL_CRON, now),
    lastWeeklyReviewAt: lastWeekly?.endedAt ?? null,
    nextWeeklyReviewAt: computeNextCronUtc(APPROVED_WEEKLY_CRON, now),
    lastRunResult: lastAny?.status ?? null,
    issueDraftsCreated: Number(pipeline.issueDraftsCreated ?? pipeline.newDraftsCreated ?? 0),
    improvementsProposed: Number(
      pipeline.improvementProposalsCreated ?? pipeline.improvementsProposed ?? 0,
    ),
    duplicatesSkipped: Number(pipeline.duplicatesSkipped ?? pipeline.issueDraftsSkippedDuplicate ?? 0),
    githubWorkflowUrl: GITHUB_REPO_ACTIONS_URL,
  };
}

async function listIndexedRuns(client: SupabaseClient, limit = 10) {
  const { data, error } = await client
    .from(MONITORING_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 25));

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, data: (data ?? []) as MonitoringRunRow[] };
}

async function listIssueDrafts(client: SupabaseClient, limit = 20, status?: string) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  let query = client
    .from(ISSUE_DRAFTS_TABLE)
    .select(
      "id, run_id, github_run_id, source, status, agent_slug, module, route, issue_type, severity, title, summary, evidence, browser_qa_evidence, suggested_fix_prompt, confidence, duplicate_key, promoted_issue_id, created_at, updated_at, owner_decision_by, owner_decision_at",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: (data ?? []) as IssueDraftRow[] };
}

async function countIssueDraftsByStatus(client: SupabaseClient) {
  const statuses = ["draft", "owner_approved", "rejected", "deferred", "promoted"] as const;
  const counts: Record<string, number> = {};
  for (const status of statuses) {
    const { count, error } = await client
      .from(ISSUE_DRAFTS_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) return { ok: false as const, error: error.message };
    counts[status] = count ?? 0;
  }
  return { ok: true as const, counts };
}

async function listMemoryProposals(client: SupabaseClient, limit = 20, status?: string) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  let query = client
    .from(MEMORY_PROPOSALS_TABLE)
    .select(
      "id, run_id, github_run_id, source, status, agent_slug, memory_scope, memory_type, title, proposal, rationale, evidence, confidence, duplicate_key, applied_memory_id, created_at, updated_at, owner_decision_by, owner_decision_at",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: (data ?? []) as MemoryProposalRow[] };
}

async function countMemoryProposalsByStatus(client: SupabaseClient) {
  const statuses = ["proposal", "owner_approved", "rejected", "deferred", "applied"] as const;
  const counts: Record<string, number> = {};
  for (const status of statuses) {
    const { count, error } = await client
      .from(MEMORY_PROPOSALS_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) return { ok: false as const, error: error.message };
    counts[status] = count ?? 0;
  }
  return { ok: true as const, counts };
}

async function countOwnerAppliedMonitoringMemory(client: SupabaseClient) {
  const { count, error } = await client
    .from("agentops_memory")
    .select("*", { count: "exact", head: true })
    .eq("environment", "staging")
    .eq("content->>source", "monitoring_memory_proposal");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, count: count ?? 0 };
}

function runtimeIssueDisplayCode(issueId: string): string {
  return `BQA-${issueId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function normalizePageUrl(pageUrl: string): string {
  const trimmed = pageUrl.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function isDuplicateIssueError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("duplicate key") ||
    normalized.includes("unique constraint") ||
    normalized.includes("idx_agentops_issues_open_dedupe")
  );
}

function hasBrowserQaEvidenceDraft(draft: IssueDraftRow): boolean {
  const evidence = draft.browser_qa_evidence ?? {};
  const scanMode = evidence.scan_mode;
  const hasRoute =
    (typeof evidence.route === "string" && evidence.route.length > 0) ||
    (typeof evidence.absolute_url === "string" && evidence.absolute_url.length > 0);
  return scanMode === "playwright" && hasRoute;
}

function validateDraftPromotion(draft: IssueDraftRow, ownerId: string): string | null {
  if (!ownerId.trim()) return "Owner identity is required for promotion.";
  if (draft.status === "promoted" || draft.promoted_issue_id) return "Draft is already promoted.";
  if (draft.status !== "owner_approved") {
    return `Draft must be owner_approved before promotion (current: ${draft.status}).`;
  }
  if (["draft", "rejected", "deferred"].includes(draft.status)) {
    return `Draft status ${draft.status} cannot be promoted.`;
  }
  if (!hasBrowserQaEvidenceDraft(draft)) return "Draft lacks Browser QA evidence.";
  if (!draft.title?.trim() || !draft.summary?.trim()) return "Draft must have title and summary.";
  if (!draft.route?.trim() && !draft.module?.trim()) return "Draft must have route or module.";
  return null;
}

async function resolveAgentIdBySlug(client: SupabaseClient, slug: string): Promise<string | null> {
  const { data, error } = await client
    .from("agentops_agents")
    .select("id, name, tools")
    .eq("environment", "staging");
  if (error || !data) return null;
  for (const agent of data) {
    const tools = (agent.tools ?? []) as string[];
    if (tools.includes(`canonical:${slug}`)) return agent.id as string;
    const normalizedName =
      typeof agent.name === "string" ? agent.name.trim().toLowerCase().replace(/\s+/g, "-") : "";
    if (normalizedName === slug) return agent.id as string;
  }
  return null;
}

function toIssueDraftSummary(row: IssueDraftRow) {
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
    suggestedFixPrompt: row.suggested_fix_prompt,
    confidence: row.confidence,
    duplicateKey: row.duplicate_key,
    promotedIssueId: row.promoted_issue_id,
    issueDisplayCode: row.promoted_issue_id ? runtimeIssueDisplayCode(row.promoted_issue_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerDecisionBy: row.owner_decision_by,
    ownerDecisionAt: row.owner_decision_at,
  };
}

function toMemoryProposalSummary(row: MemoryProposalRow) {
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

function buildOwnerStatusPayload(
  rows: MonitoringRunRow[],
  indexError: string | null,
  draftRows: IssueDraftRow[],
  draftCounts: Record<string, number> | null,
  draftsError: string | null,
  proposalRows: MemoryProposalRow[],
  appliedProposalRows: MemoryProposalRow[],
  proposalCounts: Record<string, number> | null,
  proposalsError: string | null,
  ownerAppliedMemoryCount: number,
  daily12ReviewStatus: Record<string, unknown> | null = null,
  dailyStatusError: string | null = null,
  agentsLoaded = false,
  readPathState: MonitoringReadPathState | null = null,
): Record<string, unknown> {
  const latestMonitoringRuns = rows.map(toRunIndexSummary);
  const latestIssueDrafts = draftRows.map(toIssueDraftSummary);
  const latestMemoryProposals = proposalRows.map(toMemoryProposalSummary);
  const latestAppliedMemoryProposals = appliedProposalRows.map(toMemoryProposalSummary);

  return {
    monitoringLevelLabel: "Level 1 (scheduled dry-run)",
    activationLabel: "Scheduled cloud monitoring active",
    activationDetail:
      "Approved staging dry-run schedules: operational every 6h + weekly improvement Sunday 02:00 UTC + daily 12-agent review 01:00 UTC.",
    writeModeLabel: "Dry-run only",
    writeModeDetail: "Issue drafts and improvement proposals only — owner promotion/apply required.",
    targetLabel: "Staging only",
    continuousLabel: "Disabled",
    scheduleStatus: buildScheduleStatus(rows),
    daily12ReviewStatus,
    dailyStatusError,
    cloudActive: false,
    continuousActive: false,
    scheduledEnvEnabled: true,
    effectiveDryRun: true,
    ownerWriteApproved: false,
    eligibleCount: 0,
    eligibleAgentSlugs: [],
    eligibility: [],
    lastReport: null,
    latestMonitoringRuns,
    latestIndexedRun: latestMonitoringRuns[0] ?? null,
    latestIssueDrafts,
    issueDraftCounts: draftCounts ?? {
      draft: 0,
      owner_approved: 0,
      rejected: 0,
      deferred: 0,
      promoted: 0,
    },
    latestMemoryProposals,
    latestAppliedMemoryProposals,
    memoryProposalCounts: proposalCounts ?? {
      proposal: 0,
      owner_approved: 0,
      rejected: 0,
      deferred: 0,
      applied: 0,
    },
    dryRunDefault: true,
    safety: {
      productionBlocked: true,
      autoFixDeployBlocked: true,
      autoFixBlocked: true,
      memoryProposalOnly: true,
      memoryProposalOnlyForAutomation: true,
      autoApplyMemory: false,
      ownerClickApplyRequired: true,
      scheduledMemoryApplication: false,
      automaticActiveMemoryWrites: false,
      ownerAppliedMemoryWrites: ownerAppliedMemoryCount > 0,
      evidenceRequiredForIssues: true,
      level4Forbidden: true,
      liveIssuesCreated: false,
      ownerApprovalRequired: true,
    },
    configError: indexError ?? draftsError ?? proposalsError ?? dailyStatusError,
    agentsLoaded,
    readPathState,
  };
}

export async function handleMonitoringStatusRequest(request: Request): Promise<Response> {
  const blocked = guardMonitoringStatusReadResponse();
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const readClient = createMonitoringReadClient(process.env);
  let indexError: string | null = null;
  let draftsError: string | null = null;
  let rows: MonitoringRunRow[] = [];
  let draftRows: IssueDraftRow[] = [];
  let draftCounts: Record<string, number> | null = null;
  let proposalRows: MemoryProposalRow[] = [];
  let appliedProposalRows: MemoryProposalRow[] = [];
  let proposalCounts: Record<string, number> | null = null;
  let proposalsError: string | null = null;
  let ownerAppliedMemoryCount = 0;
  let daily12ReviewStatus: Record<string, unknown> | null = null;
  let dailyStatusError: string | null = null;
  let agentsLoaded = false;
  let executionRowCount = 0;
  let agentsRowCount = 0;

  const readPathState: MonitoringReadPathState = {
    configured: readClient.ok,
    authMode: readClient.ok ? readClient.authMode : null,
    projectRef: readClient.ok ? readClient.projectRef : readClient.projectRef,
    runIndexRowCount: 0,
    executionRowCount: 0,
    agentsRowCount: 0,
    emptyReason: null,
    queryErrors: {},
  };

  if (!readClient.ok) {
    indexError = readClient.error;
    draftsError = readClient.error;
    proposalsError = readClient.error;
    dailyStatusError = readClient.error;
    readPathState.queryErrors.runIndex = readClient.error;

    return jsonResponse(
      {
        ok: false,
        environment: "staging",
        error: readClient.error,
        readPathReason: readClient.reason,
        readPathState,
        status: buildOwnerStatusPayload(
          rows,
          indexError,
          draftRows,
          draftCounts,
          draftsError,
          proposalRows,
          appliedProposalRows,
          proposalCounts,
          proposalsError,
          ownerAppliedMemoryCount,
          daily12ReviewStatus,
          dailyStatusError,
          agentsLoaded,
          readPathState,
        ),
      },
      503,
    );
  }

  const client = readClient.client;

  const listed = await listIndexedRuns(client, 25);
  if (listed.ok) {
    rows = listed.data;
    readPathState.runIndexRowCount = rows.length;
  } else {
    indexError = listed.error;
    readPathState.queryErrors.runIndex = listed.error;
  }

  const draftsListed = await listIssueDrafts(client, 50);
  if (draftsListed.ok) {
    draftRows = draftsListed.data;
  } else {
    draftsError = draftsListed.error;
    readPathState.queryErrors.drafts = draftsListed.error;
  }

  const counts = await countIssueDraftsByStatus(client);
  if (counts.ok) {
    draftCounts = counts.counts;
  } else if (!draftsError) {
    draftsError = counts.error;
    readPathState.queryErrors.drafts = counts.error;
  }

  const proposalsListed = await listMemoryProposals(client, 10);
  if (proposalsListed.ok) {
    proposalRows = proposalsListed.data;
  } else {
    proposalsError = proposalsListed.error;
    readPathState.queryErrors.proposals = proposalsListed.error;
  }

  const appliedListed = await listMemoryProposals(client, 5, "applied");
  if (appliedListed.ok) {
    appliedProposalRows = appliedListed.data;
  } else if (!proposalsError) {
    proposalsError = appliedListed.error;
    readPathState.queryErrors.proposals = appliedListed.error;
  }

  const proposalStatusCounts = await countMemoryProposalsByStatus(client);
  if (proposalStatusCounts.ok) {
    proposalCounts = proposalStatusCounts.counts;
  } else if (!proposalsError) {
    proposalsError = proposalStatusCounts.error;
    readPathState.queryErrors.proposals = proposalStatusCounts.error;
  }

  const ownerApplied = await countOwnerAppliedMonitoringMemory(client);
  if (ownerApplied.ok) {
    ownerAppliedMemoryCount = ownerApplied.count;
  } else if (!proposalsError) {
    proposalsError = ownerApplied.error;
    readPathState.queryErrors.proposals = ownerApplied.error;
  }

  const today = utcDateOnly();
  const [executionsListed, agentsListed] = await Promise.all([
    listDailyExecutionsForDate(client, today),
    listStagingAgents(client),
  ]);

  let dailyDraftCounts = { errors: 0, improvements: 0, features: 0, duplicates: 0 };
  if (draftRows.length > 0) {
    for (const draft of draftRows) {
      if (draft.source !== "daily_12_agent_review") continue;
      const kind =
        typeof draft.evidence?.draftKind === "string" ? draft.evidence.draftKind : "error";
      if (kind === "improvement") dailyDraftCounts.improvements += 1;
      else if (kind === "new_feature") dailyDraftCounts.features += 1;
      else dailyDraftCounts.errors += 1;
    }
  }

  if (!executionsListed.ok) {
    dailyStatusError = executionsListed.error;
    readPathState.queryErrors.executions = executionsListed.error;
  } else {
    executionRowCount = executionsListed.data.length;
    readPathState.executionRowCount = executionRowCount;
  }

  if (!agentsListed.ok) {
    dailyStatusError = dailyStatusError ?? agentsListed.error;
    readPathState.queryErrors.agents = agentsListed.error;
  } else {
    agentsRowCount = agentsListed.data.length;
    readPathState.agentsRowCount = agentsRowCount;
    agentsLoaded = true;
  }

  if (executionsListed.ok && agentsListed.ok) {
    let executionRows = executionsListed.data;
    const draftRunHints = buildDaily12DraftRunHints(draftRows, today);
    const preliminarySelected = selectLatestCompletedDaily12Run({
      executionDate: today,
      executions: executionRows,
      monitoringRuns: rows,
      draftRunHints,
      expectedAgentCount: EXPECTED_DAILY_AGENT_COUNT,
    });

    if (
      preliminarySelected?.runId &&
      !preliminarySelected.runQueueMeta &&
      preliminarySelected.executionsForRun.length === 0
    ) {
      const byRunId = await listDailyExecutionsForRunId(client, preliminarySelected.runId);
      if (byRunId.ok && byRunId.data.length > 0) {
        executionRows = [...executionRows, ...byRunId.data];
        readPathState.executionRowCount = executionRows.length;
      } else if (byRunId.ok === false) {
        dailyStatusError = dailyStatusError ?? byRunId.error;
        readPathState.queryErrors.executions = byRunId.error;
      }
    }

    daily12ReviewStatus = buildDaily12ReviewStatus(
      rows,
      today,
      executionRows,
      agentsListed.data,
      dailyDraftCounts,
      draftRunHints,
      draftRows,
    );
  }

  if (!indexError && rows.length === 0) {
    readPathState.emptyReason = "no_runs";
  }
  if (!dailyStatusError && executionRowCount === 0) {
    readPathState.emptyReason = readPathState.emptyReason ?? "no_executions_today";
  }
  if (!readPathState.queryErrors.agents && agentsRowCount === 0) {
    readPathState.emptyReason = readPathState.emptyReason ?? "no_agents";
  }

  const hasQueryFailure = Boolean(
    indexError || draftsError || proposalsError || dailyStatusError,
  );

  return jsonResponse({
    ok: !hasQueryFailure,
    environment: "staging",
    error: hasQueryFailure
      ? (indexError ?? draftsError ?? proposalsError ?? dailyStatusError)
      : null,
    readPathState,
    status: buildOwnerStatusPayload(
      rows,
      indexError,
      draftRows,
      draftCounts,
      draftsError,
      proposalRows,
      appliedProposalRows,
      proposalCounts,
      proposalsError,
      ownerAppliedMemoryCount,
      daily12ReviewStatus,
      dailyStatusError,
      agentsLoaded,
      readPathState,
    ),
  }, hasQueryFailure ? 503 : 200);
}

export async function handleMonitoringDryRunRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  return jsonResponse(
    {
      ok: false,
      environment: "staging",
      forcedDryRun: true,
      writesSafe: true,
      error:
        "Owner UI dry-run is not available on Vercel serverless. Use GitHub Actions workflow dispatch or local dev.",
    },
    503,
  );
}

export async function handleMonitoringDraftsListRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  const [, queryPart = ""] = request.url.split("?");
  const params = new URLSearchParams(queryPart);
  const status = params.get("status") ?? undefined;
  const limit = Number(params.get("limit") ?? "20");
  const listed = await listIssueDrafts(client, Number.isFinite(limit) ? limit : 20, status);
  if (!listed.ok) return jsonResponse({ ok: false, error: listed.error }, 503);

  return jsonResponse({
    ok: true,
    environment: "staging",
    drafts: listed.data.map(toIssueDraftSummary),
  });
}

export async function handleMonitoringDraftDecisionRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  let body: { draftId?: string; decision?: string; ownerId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const draftId = body.draftId?.trim();
  const decision = body.decision?.trim();
  const ownerId = body.ownerId?.trim() ?? "owner";

  if (!draftId || !decision) {
    return jsonResponse({ ok: false, error: "draftId and decision are required." }, 400);
  }

  if (!["owner_approved", "rejected", "deferred"].includes(decision)) {
    return jsonResponse({ ok: false, error: "Invalid decision." }, 400);
  }

  const { data: existing, error: fetchError } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (fetchError) return jsonResponse({ ok: false, error: fetchError.message }, 503);
  if (!existing) return jsonResponse({ ok: false, error: "Draft not found." }, 404);
  if (existing.status === "promoted") {
    return jsonResponse({ ok: false, error: "Promoted drafts cannot be changed." }, 409);
  }

  const { data, error } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .update({
      status: decision,
      owner_decision_by: ownerId,
      owner_decision_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .select("*")
    .single();

  if (error) return jsonResponse({ ok: false, error: error.message }, 503);

  return jsonResponse({
    ok: true,
    environment: "staging",
    draft: toIssueDraftSummary(data as IssueDraftRow),
    promoted: false,
  });
}

export async function handleMonitoringDraftPromoteRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  let body: { draftId?: string; ownerId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const draftId = body.draftId?.trim();
  const ownerId = body.ownerId?.trim() ?? "owner";

  if (!draftId) {
    return jsonResponse({ ok: false, error: "draftId is required." }, 400);
  }

  const { data: draft, error: fetchError } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (fetchError) return jsonResponse({ ok: false, error: fetchError.message }, 503);
  if (!draft) return jsonResponse({ ok: false, error: "Draft not found." }, 404);

  const row = draft as IssueDraftRow;

  if (row.promoted_issue_id) {
    return jsonResponse({
      ok: true,
      environment: "staging",
      issueId: row.promoted_issue_id,
      issueDisplayCode: runtimeIssueDisplayCode(row.promoted_issue_id),
      alreadyPromoted: true,
      duplicateBlocked: true,
      draft: toIssueDraftSummary(row),
    });
  }

  const policyError = validateDraftPromotion(row, ownerId);
  if (policyError) {
    return jsonResponse({ ok: false, error: policyError }, 409);
  }

  const { data: existingByDraft } = await client
    .from("agentops_issues")
    .select("id")
    .eq("environment", "staging")
    .contains("evidence", { source_draft_id: draftId })
    .maybeSingle();

  if (existingByDraft?.id) {
    await client
      .from(ISSUE_DRAFTS_TABLE)
      .update({
        status: "promoted",
        promoted_issue_id: existingByDraft.id,
        owner_decision_by: ownerId,
        owner_decision_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    return jsonResponse({
      ok: true,
      environment: "staging",
      issueId: existingByDraft.id,
      issueDisplayCode: runtimeIssueDisplayCode(existingByDraft.id as string),
      alreadyPromoted: true,
      duplicateBlocked: true,
      draft: toIssueDraftSummary({ ...row, status: "promoted", promoted_issue_id: existingByDraft.id as string }),
    });
  }

  const { data: duplicateDraft } = await client
    .from(ISSUE_DRAFTS_TABLE)
    .select("promoted_issue_id")
    .eq("duplicate_key", row.duplicate_key)
    .eq("status", "promoted")
    .not("promoted_issue_id", "is", null)
    .neq("id", draftId)
    .limit(1)
    .maybeSingle();

  if (duplicateDraft?.promoted_issue_id) {
    const issueId = duplicateDraft.promoted_issue_id as string;
    await client
      .from(ISSUE_DRAFTS_TABLE)
      .update({
        status: "promoted",
        promoted_issue_id: issueId,
        owner_decision_by: ownerId,
        owner_decision_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    return jsonResponse({
      ok: true,
      environment: "staging",
      issueId,
      issueDisplayCode: runtimeIssueDisplayCode(issueId),
      alreadyPromoted: false,
      duplicateBlocked: true,
      draft: toIssueDraftSummary({ ...row, status: "promoted", promoted_issue_id: issueId }),
    });
  }

  const agentId = await resolveAgentIdBySlug(client, row.agent_slug);
  if (!agentId) {
    return jsonResponse(
      { ok: false, error: `No staging agent found for slug ${row.agent_slug}.` },
      503,
    );
  }

  const route = normalizePageUrl(row.route ?? row.module ?? "/");
  const pageUrl = `${route}#monitoring-draft:${row.id}`;
  const severity = ["low", "medium", "high", "critical"].includes(row.severity)
    ? row.severity
    : "medium";

  const issueRow = {
    title: row.title.trim(),
    description: row.summary.trim(),
    severity,
    agent_id: agentId,
    page_url: pageUrl,
    evidence: {
      ...row.evidence,
      browser_qa: row.browser_qa_evidence,
      source: "monitoring_issue_draft",
      source_draft_id: row.id,
      source_run_id: row.run_id,
      github_run_id: row.github_run_id,
      issue_type: row.issue_type,
      module: row.module,
      route: row.route,
      agent_slug: row.agent_slug,
      duplicate_key: row.duplicate_key,
      owner_decision_by: row.owner_decision_by,
      promoted_at: new Date().toISOString(),
    },
    fix_prompt: row.suggested_fix_prompt,
    status: "open",
    environment: "staging",
  };

  const { data: createdIssue, error: insertError } = await client
    .from("agentops_issues")
    .insert(issueRow)
    .select("id")
    .single();

  if (insertError) {
    if (isDuplicateIssueError(insertError.message)) {
      const { data: openMatch } = await client
        .from("agentops_issues")
        .select("id")
        .eq("environment", "staging")
        .eq("agent_id", agentId)
        .in("status", ["open", "in_progress"])
        .eq("page_url", pageUrl)
        .maybeSingle();

      if (openMatch?.id) {
        const issueId = openMatch.id as string;
        await client
          .from(ISSUE_DRAFTS_TABLE)
          .update({
            status: "promoted",
            promoted_issue_id: issueId,
            owner_decision_by: ownerId,
            owner_decision_at: new Date().toISOString(),
          })
          .eq("id", draftId);

        return jsonResponse({
          ok: true,
          environment: "staging",
          issueId,
          issueDisplayCode: runtimeIssueDisplayCode(issueId),
          alreadyPromoted: false,
          duplicateBlocked: true,
          draft: toIssueDraftSummary({ ...row, status: "promoted", promoted_issue_id: issueId }),
        });
      }
    }
    return jsonResponse({ ok: false, error: insertError.message }, 503);
  }

  const issueId = createdIssue.id as string;

  await client
    .from(ISSUE_DRAFTS_TABLE)
    .update({
      status: "promoted",
      promoted_issue_id: issueId,
      owner_decision_by: ownerId,
      owner_decision_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  await client.from("agentops_agent_logs").insert({
    agent_id: agentId,
    action: "issue_detected",
    payload: {
      source: "monitoring_issue_draft_promotion",
      draft_id: draftId,
      issue_id: issueId,
      owner_id: ownerId,
    },
    environment: "staging",
  });

  return jsonResponse({
    ok: true,
    environment: "staging",
    issueId,
    issueDisplayCode: runtimeIssueDisplayCode(issueId),
    alreadyPromoted: false,
    duplicateBlocked: false,
    draft: toIssueDraftSummary({ ...row, status: "promoted", promoted_issue_id: issueId }),
  });
}

export async function handleMonitoringMemoryProposalsListRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  const [, queryPart = ""] = request.url.split("?");
  const params = new URLSearchParams(queryPart);
  const status = params.get("status") ?? undefined;
  const limit = Number(params.get("limit") ?? "20");
  const listed = await listMemoryProposals(client, Number.isFinite(limit) ? limit : 20, status);
  if (!listed.ok) return jsonResponse({ ok: false, error: listed.error }, 503);

  return jsonResponse({
    ok: true,
    environment: "staging",
    proposals: listed.data.map(toMemoryProposalSummary),
  });
}

export async function handleMonitoringMemoryProposalDecisionRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  let body: { proposalId?: string; decision?: string; ownerId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const proposalId = body.proposalId?.trim();
  const decision = body.decision?.trim();
  const ownerId = body.ownerId?.trim() ?? "owner";

  if (!proposalId || !decision) {
    return jsonResponse({ ok: false, error: "proposalId and decision are required." }, 400);
  }

  if (!["owner_approved", "rejected", "deferred"].includes(decision)) {
    return jsonResponse({ ok: false, error: "Invalid decision." }, 400);
  }

  const { data: existing, error: fetchError } = await client
    .from(MEMORY_PROPOSALS_TABLE)
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();

  if (fetchError) return jsonResponse({ ok: false, error: fetchError.message }, 503);
  if (!existing) return jsonResponse({ ok: false, error: "Memory proposal not found." }, 404);

  const row = existing as MemoryProposalRow;
  if (row.status === "applied") {
    return jsonResponse({ ok: false, error: "Applied proposals cannot be changed in Phase 5E." }, 409);
  }

  const { data, error } = await client
    .from(MEMORY_PROPOSALS_TABLE)
    .update({
      status: decision,
      owner_decision_by: ownerId,
      owner_decision_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select("*")
    .single();

  if (error) return jsonResponse({ ok: false, error: error.message }, 503);

  return jsonResponse({
    ok: true,
    environment: "staging",
    proposal: toMemoryProposalSummary(data as MemoryProposalRow),
    applied: false,
    activeMemoryWritten: false,
  });
}

export async function handleMonitoringMemoryProposalApplyRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const client = createStagingSupabaseClient();
  if (!client) {
    return jsonResponse({ ok: false, error: "Staging Supabase not configured." }, 503);
  }

  let body: { proposalId?: string; ownerId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const proposalId = body.proposalId?.trim();
  const ownerId = body.ownerId?.trim() ?? "owner";

  if (!proposalId) {
    return jsonResponse({ ok: false, error: "proposalId is required." }, 400);
  }

  return applyMonitoringMemoryProposalViaApi(client, proposalId, ownerId);
}

export async function handleMonitoringLatestReportRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  return jsonResponse({
    ok: true,
    environment: "staging",
    report: null,
    summary: null,
    message: "Latest JSON reports are stored as GHA artifacts. Supabase index holds run summaries.",
  });
}

function resolveMonitoringPathname(request: Request): string {
  const [pathPart, queryPart = ""] = request.url.split("?");
  const normalized = (pathPart ?? request.url).replace(/\/+$/, "");
  if (normalized.startsWith("/api/agentops/monitoring/")) {
    return normalized;
  }
  const params = new URLSearchParams(queryPart);
  const subpath = params.get("monitoringSubpath") ?? params.get("subpath");
  if (subpath) {
    return `/api/agentops/monitoring/${subpath.replace(/^\/+|\/+$/g, "")}`.replace(/\/+$/, "");
  }
  return normalized || "/api/agentops/monitoring";
}

export async function routeMonitoringRequest(request: Request): Promise<Response> {
  const pathname = resolveMonitoringPathname(request);

  if (pathname === "/api/agentops/monitoring/status") {
    return handleMonitoringStatusRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/dry-run") {
    return handleMonitoringDryRunRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/reports/latest") {
    return handleMonitoringLatestReportRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/drafts") {
    return handleMonitoringDraftsListRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/drafts/decision") {
    return handleMonitoringDraftDecisionRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/drafts/promote") {
    return handleMonitoringDraftPromoteRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/memory-proposals") {
    return handleMonitoringMemoryProposalsListRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/memory-proposals/decision") {
    return handleMonitoringMemoryProposalDecisionRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/memory-proposals/apply") {
    return handleMonitoringMemoryProposalApplyRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/manual-run/capability") {
    return handleMonitoringManualRunCapabilityRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/manual-run/cancel") {
    return handleMonitoringManualRunCancelRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/manual-run") {
    if (request.method === "GET") return handleMonitoringManualRunStatusRequest(request);
    if (request.method === "POST") return handleMonitoringManualRunStartRequest(request);
    return methodNotAllowed();
  }

  return jsonResponse({ ok: false, error: "Not found" }, 404);
}
