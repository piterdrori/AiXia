/**
 * Phase 5H — daily 12-agent staging website review worker.
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { mergeAgentsWithDB } from "../agentRegistryReconciliation";
import { CANONICAL_AGENTS } from "../canonicalAgents";
import { listActiveAgents } from "../db/agentOpsRuntimeRepository";
import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";
import { resolveAgentSlugFromRow } from "./agentOpsMonitoringPolicy";
import { resolveOwnerWriteGate } from "./agentOpsMonitoringOwnerWriteGate";
import { validatePhase3MonitoringTarget } from "./agentOpsMonitoringPhase3Target";
import {
  buildMonitoringScheduledRunReport,
  MONITORING_REPORT_DIR,
  type MonitoringScheduledRunReport,
} from "./agentOpsMonitoringScheduledReport";
import { loadAgentOpsMonitoringRuntimeConfig } from "./agentOpsMonitoringRuntimeConfig";
import {
  insertDailyAgentExecution,
  updateDailyAgentExecutionQueueStats,
  utcExecutionDate,
  type DailyAgentExecutionInsert,
} from "./agentOpsDailyAgentExecutions";
import {
  buildNoFindingDailyResult,
  classifyScanFindingForDaily,
  dailyFindingToIssueDraftCandidate,
  type DailyReviewFinding,
} from "./agentOpsDailyReviewFindingPolicy";
import {
  applyDailyDraftQueueCaps,
  buildDailyQueueInputs,
  type CandidateNotQueued,
  type DailyQueueRunSummary,
} from "./agentOpsDailyReviewQueuePolicy";
import {
  canonicalAgentUsernameToolTag,
  parseUsernameFromTools,
  routesForDailyReviewProfile,
  validateCanonicalDailyReviewRegistry,
  type CanonicalAgentDailyReviewProfile,
} from "./canonicalAgentDailyReview";
import { insertMonitoringIssueDrafts } from "./agentOpsMonitoringIssueDrafts";
import { createAgentOpsRuntimeSupabaseClient } from "./agentOpsRuntimeSupabase";
import { scanStagingWebsite } from "./scanStagingWebsite";
import type { SupabaseClient } from "@supabase/supabase-js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

export type Daily12AgentCoverage = {
  expectedAgents: number;
  registeredAgents: number;
  attemptedAgents: number;
  completedAgents: number;
  failedAgents: number;
  blockedAgents: number;
  missingAgents: string[];
  allAgentsAccountedFor: boolean;
};

export type Daily12AgentReviewResult = {
  runId: string;
  reportPath: string;
  report: MonitoringScheduledRunReport;
  dailyReportPath: string;
  coverage: Daily12AgentCoverage;
  perAgentResults: Array<Record<string, unknown>>;
  draftInsertSummary: { created: number; skippedDuplicate: number; errors: string[] };
  exitCode: number;
  registryErrors: string[];
};

function agentRowForProfile(
  dbAgent: AgentOpsRuntimeAgentRow,
  profile: CanonicalAgentDailyReviewProfile,
): AgentOpsRuntimeAgentRow {
  const routes = routesForDailyReviewProfile(profile);
  const usernameTag = canonicalAgentUsernameToolTag(profile.username);
  const tools = [...(dbAgent.tools ?? [])];
  if (!tools.includes(usernameTag)) tools.push(usernameTag);
  return {
    ...dbAgent,
    scope: routes,
    tools,
  };
}

async function runSingleAgentDailyReview(input: {
  client: SupabaseClient;
  dbAgent: AgentOpsRuntimeAgentRow;
  profile: CanonicalAgentDailyReviewProfile;
  stagingUrl: string;
  runId: string;
  executionDate: string;
  githubRunId?: string | null;
  forceRetry?: boolean;
}): Promise<{
  execution: DailyAgentExecutionInsert;
  draftCandidates: ReturnType<typeof dailyFindingToIssueDraftCandidate>[];
  findings: DailyReviewFinding[];
}> {
  const startedAt = new Date().toISOString();
  const routes = routesForDailyReviewProfile(input.profile);
  const scanAgent = agentRowForProfile(input.dbAgent, input.profile);

  if (input.dbAgent.status === "blocked") {
    const completedAt = new Date().toISOString();
    return {
      execution: {
        monitoring_run_id: null,
        run_id: input.runId,
        github_run_id: input.githubRunId ?? null,
        execution_date: input.executionDate,
        agent_id: input.dbAgent.id,
        agent_slug: input.profile.agentSlug,
        username: input.profile.username,
        job_title: input.profile.jobTitle,
        perspective: input.profile.perspectiveTitle,
        status: "blocked",
        routes_reviewed: routes,
        errors_found: 0,
        improvements_found: 0,
        features_found: 0,
        drafts_created: 0,
        duplicates_skipped: 0,
        no_findings: false,
        evidence_summary: { blocked: true, reason: "Agent status is blocked." },
        failure_reason: "Agent blocked in roster.",
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: 0,
      },
      draftCandidates: [],
      findings: [],
    };
  }

  let scanFindings: import("./stagingScanTypes").StagingScanFinding[] = [];
  let failureReason: string | null = null;
  try {
    scanFindings = await scanStagingWebsite(scanAgent, input.stagingUrl, {
      maxRoutes: Math.min(routes.length, 6),
    });
  } catch (error) {
    failureReason = error instanceof Error ? error.message : String(error);
  }

  const classified: DailyReviewFinding[] = [];
  for (const finding of scanFindings) {
    const daily = classifyScanFindingForDaily(finding, input.profile.agentSlug);
    if (daily) classified.push(daily);
  }

  const errorsFound = classified.filter((f) => f.findingKind === "ERROR").length;
  const improvementsFound = classified.filter((f) => f.findingKind === "IMPROVEMENT").length;
  const featuresFound = classified.filter((f) => f.findingKind === "NEW_FEATURE").length;

  if (classified.length === 0 && !failureReason) {
    classified.push(
      buildNoFindingDailyResult({
        agentSlug: input.profile.agentSlug,
        routesReviewed: routes,
        note: `No credible error or high-value improvement found from ${input.profile.perspectiveTitle} lens.`,
      }),
    );
  }

  const draftCandidates = classified
    .map((finding) => dailyFindingToIssueDraftCandidate(finding, input.profile.agentSlug))
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);

  const completedAt = new Date().toISOString();
  const durationMs = Date.parse(completedAt) - Date.parse(startedAt);

  return {
    execution: {
      monitoring_run_id: null,
      run_id: input.runId,
      github_run_id: input.githubRunId ?? null,
      execution_date: input.executionDate,
      agent_id: input.dbAgent.id,
      agent_slug: input.profile.agentSlug,
      username: input.profile.username,
      job_title: input.profile.jobTitle,
      perspective: input.profile.perspectiveTitle,
      status: failureReason ? "failed" : "completed",
      routes_reviewed: routes,
      errors_found: errorsFound,
      improvements_found: improvementsFound,
      features_found: featuresFound,
      drafts_created: 0,
      duplicates_skipped: 0,
      no_findings: classified.some((f) => f.findingKind === "NO_FINDING"),
      evidence_summary: {
        perspective: input.profile.perspectiveTitle,
        routesReviewed: routes,
        findings: classified.map((f) => ({
          kind: f.findingKind,
          route: f.route,
          title: f.title,
          confidence: f.confidence,
        })),
        scanFindingsCount: scanFindings.length,
      },
      failure_reason: failureReason,
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: Number.isFinite(durationMs) ? durationMs : null,
    },
    draftCandidates,
    findings: classified,
  };
}

export async function runDaily12AgentReview(options: {
  forceRetry?: boolean;
  agentScope?: string;
} = {}): Promise<Daily12AgentReviewResult> {
  const registry = validateCanonicalDailyReviewRegistry();
  const registryErrors = registry.ok ? [] : registry.errors;

  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const executionDate = utcExecutionDate(startedAt);
  const monitoringConfig = loadAgentOpsMonitoringRuntimeConfig();
  const ownerGate = resolveOwnerWriteGate(true);

  const target = validatePhase3MonitoringTarget(
    process.env.AGENTOPS_MONITORING_TARGET_BASE_URL ?? monitoringConfig.targetBaseUrl,
  );

  if (!target.ok || registryErrors.length > 0) {
    const endedAt = new Date().toISOString();
    const report = buildMonitoringScheduledRunReport({
      runId,
      startedAt,
      endedAt,
      monitoringConfig: { ...monitoringConfig, monitoringMode: "daily_12_agent_review" },
      ownerGate,
      tick: {
        config: null,
        agents: [],
        cycles: [],
        skipped: [],
        errors: [...registryErrors, ...(target.ok ? [] : [target.error])],
        tickKind: "scheduled",
        dryRun: true,
      },
      targetBaseUrl: monitoringConfig.targetBaseUrl,
      scheduleMeta: {
        scheduleType: "daily_12_agent_review",
        triggerType:
          process.env.AGENTOPS_MONITORING_TRIGGER_TYPE === "schedule" ? "schedule" : "workflow_dispatch",
        monitoringMode: "daily_12_agent_review",
        cronExpression: process.env.AGENTOPS_MONITORING_CRON_EXPRESSION ?? "0 1 * * *",
      },
      extraErrors: registryErrors,
    });
    const reportPath = await writeDailyArtifacts(report, [], registryErrors);
    return {
      runId,
      reportPath,
      report,
      dailyReportPath: reportPath,
      coverage: {
        expectedAgents: 12,
        registeredAgents: 0,
        attemptedAgents: 0,
        completedAgents: 0,
        failedAgents: 0,
        blockedAgents: 0,
        missingAgents: CANONICAL_AGENTS.map((a) => a.id),
        allAgentsAccountedFor: false,
      },
      perAgentResults: [],
      draftInsertSummary: { created: 0, skippedDuplicate: 0, errors: registryErrors },
      exitCode: 1,
      registryErrors,
    };
  }

  const bootstrap = createAgentOpsRuntimeSupabaseClient();
  if (!bootstrap.ok) {
    throw new Error(bootstrap.error);
  }

  if (!registry.ok) {
    throw new Error(`Daily registry invalid: ${registry.errors.join("; ")}`);
  }

  const agentsResult = await listActiveAgents(bootstrap.client);
  const dbAgents = agentsResult.data ?? [];
  const reconciled = mergeAgentsWithDB(dbAgents);
  const slugToDb = new Map<string, AgentOpsRuntimeAgentRow>();
  for (const row of dbAgents) {
    slugToDb.set(resolveAgentSlugFromRow(row), row);
  }

  const profiles =
    options.agentScope && options.agentScope !== "all"
      ? registry.profiles.filter((p) => p.agentSlug === options.agentScope)
      : registry.profiles;

  const missingAgents: string[] = [];
  const perAgentResults: Array<Record<string, unknown>> = [];
  const perAgentFindings: Array<{ agentSlug: string; findings: DailyReviewFinding[] }> = [];
  let attemptedAgents = 0;
  let completedAgents = 0;
  let failedAgents = 0;
  let blockedAgents = 0;

  for (const profile of profiles) {
    const dbAgent = slugToDb.get(profile.agentSlug);
    if (!dbAgent) {
      missingAgents.push(profile.agentSlug);
      perAgentResults.push({
        agentSlug: profile.agentSlug,
        username: profile.username,
        status: "missing",
      });
      continue;
    }

    const username = parseUsernameFromTools(dbAgent.tools) ?? profile.username;
    if (username !== profile.username) {
      registryErrors.push(`${profile.agentSlug}: username mismatch (${username})`);
    }

    attemptedAgents += 1;
    const single = await runSingleAgentDailyReview({
      client: bootstrap.client,
      dbAgent,
      profile,
      stagingUrl: target.normalizedUrl,
      runId,
      executionDate,
      githubRunId: process.env.GITHUB_RUN_ID ?? null,
      forceRetry: options.forceRetry,
    });

    const inserted = await insertDailyAgentExecution(bootstrap.client, single.execution, {
      forceRetry: options.forceRetry,
    });
    if (!inserted.ok && !inserted.duplicate) {
      registryErrors.push(`${profile.agentSlug}: execution insert failed — ${inserted.error}`);
    }

    if (single.execution.status === "completed") completedAgents += 1;
    if (single.execution.status === "failed") failedAgents += 1;
    if (single.execution.status === "blocked") blockedAgents += 1;

    perAgentFindings.push({ agentSlug: profile.agentSlug, findings: single.findings });
    perAgentResults.push({
      agentSlug: profile.agentSlug,
      username: profile.username,
      jobTitle: profile.jobTitle,
      perspective: profile.perspectiveTitle,
      status: single.execution.status,
      routesReviewed: single.execution.routes_reviewed,
      errorsFound: single.execution.errors_found,
      improvementsFound: single.execution.improvements_found,
      featuresFound: single.execution.features_found,
      noFindings: single.execution.no_findings,
      findings: single.findings.map((f) => ({
        kind: f.findingKind,
        route: f.route,
        title: f.title,
        confidence: f.confidence,
      })),
    });
  }

  const endedAt = new Date().toISOString();
  const report = buildMonitoringScheduledRunReport({
    runId,
    startedAt,
    endedAt,
    monitoringConfig: { ...monitoringConfig, monitoringMode: "daily_12_agent_review" },
    ownerGate,
    tick: {
      config: null,
      agents: dbAgents,
      cycles: perAgentResults.map((result) => ({
        agentId: String(result.agentSlug),
        agentSlug: String(result.agentSlug),
        agentName: String(result.agentSlug),
        startedAt,
        finishedAt: endedAt,
        routesScanned: (result.routesReviewed as string[]) ?? [],
        findingsCount: Number(result.errorsFound ?? 0) + Number(result.improvementsFound ?? 0),
        findings: [],
        issuesCreated: 0,
        issuesSkipped: 0,
        issuesBlockedByPolicy: 0,
        memoryProposals: 0,
        dryRun: true,
        monitoringMode: "scheduled" as const,
        errors: [],
      })),
      skipped: [],
      errors: registryErrors,
      tickKind: "scheduled",
      dryRun: true,
    },
    targetBaseUrl: target.normalizedUrl,
    scheduleMeta: {
      scheduleType: "daily_12_agent_review",
      triggerType:
        process.env.AGENTOPS_MONITORING_TRIGGER_TYPE === "schedule" ? "schedule" : "workflow_dispatch",
      monitoringMode: "daily_12_agent_review",
      cronExpression: process.env.AGENTOPS_MONITORING_CRON_EXPRESSION ?? "0 1 * * *",
    },
  });

  const queueInputs = buildDailyQueueInputs(perAgentFindings);
  const queueResult = applyDailyDraftQueueCaps(queueInputs);
  const draftCandidates = queueResult.queued;

  const perAgentQueued = new Map<string, number>();
  for (const candidate of draftCandidates) {
    perAgentQueued.set(candidate.agentSlug, (perAgentQueued.get(candidate.agentSlug) ?? 0) + 1);
  }

  const draftInsert = await insertMonitoringIssueDrafts(
    bootstrap.client,
    report,
    draftCandidates,
    {
      githubRunId: process.env.GITHUB_RUN_ID ?? null,
      source: "daily_12_agent_review",
    },
  );

  const perAgentStats = new Map<string, { draftsCreated: number; duplicatesSkipped: number }>();
  for (const profile of profiles) {
    perAgentStats.set(profile.agentSlug, {
      draftsCreated: perAgentQueued.get(profile.agentSlug) ?? 0,
      duplicatesSkipped: 0,
    });
  }

  const runQueueMeta = {
    ...queueResult.summary,
    candidateNotQueued: queueResult.notQueued,
    dbDuplicatesSkipped: draftInsert.skippedDuplicate,
    duplicatesConsolidated:
      queueResult.summary.duplicatesConsolidated + draftInsert.skippedDuplicate,
  };

  const queueStatsUpdate = await updateDailyAgentExecutionQueueStats(
    bootstrap.client,
    runId,
    perAgentStats,
    runQueueMeta,
  );
  if (!queueStatsUpdate.ok) {
    registryErrors.push(`Queue stats update failed: ${queueStatsUpdate.error}`);
  }

  const coverage: Daily12AgentCoverage = {
    expectedAgents: 12,
    registeredAgents: reconciled.filter((r) => !r.isMissing).length,
    attemptedAgents,
    completedAgents,
    failedAgents,
    blockedAgents,
    missingAgents,
    allAgentsAccountedFor:
      missingAgents.length === 0 &&
      attemptedAgents === profiles.length &&
      attemptedAgents === 12 &&
      registryErrors.length === 0,
  };

  const dailyReportPath = await writeDailyArtifacts(
    report,
    perAgentResults,
    registryErrors,
    coverage,
    draftInsert,
    queueResult.summary,
    queueResult.notQueued,
  );

  const exitCode =
    registryErrors.length > 0 || missingAgents.length > 0
      ? 1
      : failedAgents > 0
        ? 2
        : 0;

  return {
    runId,
    reportPath: join(MONITORING_REPORT_DIR, `monitoring-scheduled-dry-run-${startedAt.replace(/[:.]/g, "-")}.json`),
    report,
    dailyReportPath,
    coverage,
    perAgentResults,
    draftInsertSummary: {
      created: draftInsert.created,
      skippedDuplicate: draftInsert.skippedDuplicate,
      errors: draftInsert.errors,
    },
    exitCode,
    registryErrors,
  };
}

async function writeDailyArtifacts(
  report: MonitoringScheduledRunReport,
  perAgentResults: Array<Record<string, unknown>>,
  registryErrors: string[],
  coverage?: Daily12AgentCoverage,
  draftInsert?: { created: number; skippedDuplicate: number; errors: string[] },
  queueSummary?: DailyQueueRunSummary,
  candidateNotQueued?: CandidateNotQueued[],
): Promise<string> {
  await mkdir(MONITORING_REPORT_DIR, { recursive: true });
  const date = utcExecutionDate(report.startedAt);
  const dailyPath = join(REPO_ROOT, "qa-agent", "reports", "runtime", `agentops-daily-12-agent-review-${date}.json`);
  const monitoringPath = join(
    MONITORING_REPORT_DIR,
    `monitoring-scheduled-dry-run-${report.startedAt.replace(/[:.]/g, "-")}.json`,
  );

  const payload = {
    date,
    runId: report.runId,
    expectedAgents: 12,
    registeredAgents: coverage?.registeredAgents ?? 0,
    attempted: coverage?.attemptedAgents ?? 0,
    completed: coverage?.completedAgents ?? 0,
    failed: coverage?.failedAgents ?? 0,
    blocked: coverage?.blockedAgents ?? 0,
    missing: coverage?.missingAgents ?? [],
    errorsFound: perAgentResults.reduce((sum, row) => sum + Number(row.errorsFound ?? 0), 0),
    improvementOpportunities: perAgentResults.reduce(
      (sum, row) => sum + Number(row.improvementsFound ?? 0),
      0,
    ),
    newFeaturesProposed: perAgentResults.reduce((sum, row) => sum + Number(row.featuresFound ?? 0), 0),
    noFindingsAgents: perAgentResults.filter((row) => row.noFindings === true).length,
    draftsCreated: draftInsert?.created ?? 0,
    duplicatesSkipped: draftInsert?.skippedDuplicate ?? 0,
    queueSummary: queueSummary ?? null,
    candidateNotQueued: candidateNotQueued ?? [],
    candidatesDetected: queueSummary?.candidatesDetected ?? 0,
    candidatesQueued: queueSummary?.candidatesQueued ?? draftInsert?.created ?? 0,
    candidatesNotQueued: queueSummary?.candidatesNotQueued ?? 0,
    duplicatesConsolidated: queueSummary?.duplicatesConsolidated ?? 0,
    perAgentResults,
    registryErrors,
    safety: {
      stagingOnly: true,
      dryRun: true,
      automaticIssuePromotion: false,
      automaticMemoryApplication: false,
      automaticFix: false,
      automaticDeploy: false,
      continuousEnabled: false,
      productionBlocked: true,
    },
  };

  await writeFile(dailyPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(monitoringPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return dailyPath;
}
