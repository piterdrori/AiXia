/**
 * Fix B2-C — website audit execution for one owner_manual monitoring run.
 * Invoked by the staging worker (off Vercel). Uses scanStagingWebsite only.
 *
 * Usage:
 *   npx tsx scripts/agentops-manual-run-website-audit-engine.ts --run-id <id>
 *
 * Env: STAGING_APP_URL, STAGING_SUPABASE_*, AGENTOPS_ENVIRONMENT=staging
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentOpsRuntimeAgentRow } from "../src/lib/agentops/db/agentOpsRuntimeTypes";
import { scanStagingWebsite } from "../src/lib/agentops/runtime/scanStagingWebsite";
import type { StagingScanFinding } from "../src/lib/agentops/runtime/stagingScanTypes";
import { assertStagingScanUrl } from "../src/lib/agentops/runtime/stagingScanUrlGuard";

const MONITORING_TABLE = "agentops_monitoring_runs";
const DRAFTS_TABLE = "agentops_monitoring_issue_drafts";
const ZERO_FINDINGS = "No qualifying findings were produced by this run.";
const WORKER_VERSION = "b2-c";

function resolveLimitedAuditRoutes(
  summary: Record<string, unknown>,
  agentSlug: string,
): string[] {
  const selected =
    Array.isArray(summary.selectedRoutes) && summary.selectedRoutes.length > 0
      ? summary.selectedRoutes.filter((r): r is string => typeof r === "string" && Boolean(r.trim()))
      : [];
  if (selected.length > 0) {
    return selected.map((r) => (r.startsWith("/") ? r : `/${r}`)).slice(0, 3);
  }
  const scope =
    summary.scope && typeof summary.scope === "object"
      ? (summary.scope as Record<string, unknown>)
      : null;
  const scopeRoutes = Array.isArray(scope?.routes)
    ? scope.routes.filter((r): r is string => typeof r === "string" && Boolean(r.trim()))
    : [];
  if (scopeRoutes.length > 0) {
    return scopeRoutes.map((r) => (r.startsWith("/") ? r : `/${r}`)).slice(0, 3);
  }
  const slug = agentSlug || "system-agent";
  return [`/system/agent-ops/agents/${slug}`];
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), "qa-agent", "browser-qa", ".env.owner.local"));

function parseArgs(argv: string[]): { runId: string | null } {
  let runId: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-id") {
      runId = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return { runId };
}

function createServiceClient(): SupabaseClient {
  const url =
    process.env.STAGING_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    "";
  const key =
    process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!url || !key) {
    throw new Error("Staging Supabase service role is required for website audit.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function buildScanAgent(
  agentSlug: string,
  runtimeAgentId: string | null,
  routes: string[],
): AgentOpsRuntimeAgentRow {
  const now = new Date().toISOString();
  return {
    id: runtimeAgentId || `manual-${agentSlug}`,
    name: agentSlug,
    role: "owner_manual_website_audit",
    scope: routes,
    mode: "scheduled",
    status: "active",
    tools: ["playwright_staging_scan"],
    environment: "staging",
    created_at: now,
    updated_at: now,
  };
}

function severityRank(severity: string): number {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function qualifyingFindings(findings: StagingScanFinding[]): StagingScanFinding[] {
  return findings.filter((f) => severityRank(f.severity) >= 2);
}

function duplicateKey(agentSlug: string, finding: StagingScanFinding): string {
  return createHash("sha1")
    .update(`${agentSlug}|${finding.page_url}|${finding.issue}|${finding.severity}`)
    .digest("hex")
    .slice(0, 40);
}

async function insertDraftFindings(
  client: SupabaseClient,
  runId: string,
  agentSlug: string,
  findings: StagingScanFinding[],
): Promise<{ created: number; skippedDuplicate: number; draftIds: string[] }> {
  const result = { created: 0, skippedDuplicate: 0, draftIds: [] as string[] };
  for (const finding of findings) {
    const key = duplicateKey(agentSlug, finding);
    const { data: existing } = await client
      .from(DRAFTS_TABLE)
      .select("id")
      .eq("duplicate_key", key)
      .in("status", ["draft", "owner_approved", "deferred"])
      .maybeSingle();
    if (existing?.id) {
      result.skippedDuplicate += 1;
      continue;
    }
    const row = {
      monitoring_run_id: null,
      run_id: runId,
      github_run_id: null,
      source: "owner_manual_website_audit",
      status: "draft",
      agent_slug: agentSlug,
      module: "agent-ops",
      route: finding.page_url,
      issue_type: "website_audit",
      severity: finding.severity,
      title: finding.issue.slice(0, 180),
      summary: finding.issue,
      evidence: {
        ...finding.evidence,
        ownerManual: true,
        autoPromoteBlocked: true,
        workerPhase: "b2-c",
      },
      browser_qa_evidence: {},
      suggested_fix_prompt: null,
      confidence: null,
      duplicate_key: key,
      duplicate_of: null,
    };
    const { data, error } = await client.from(DRAFTS_TABLE).insert(row).select("id").single();
    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        result.skippedDuplicate += 1;
        continue;
      }
      throw new Error(`Draft insert failed: ${error.message}`);
    }
    result.created += 1;
    if (data?.id) result.draftIds.push(data.id);
  }
  return result;
}

async function main(): Promise<void> {
  if ((process.env.AGENTOPS_ENVIRONMENT || "staging").toLowerCase() !== "staging") {
    throw new Error("AGENTOPS_ENVIRONMENT must be staging.");
  }
  if (String(process.env.AGENTOPS_PRODUCTION_BLOCKED ?? "true").toLowerCase() === "false") {
    throw new Error("AGENTOPS_PRODUCTION_BLOCKED must be true.");
  }
  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    throw new Error("Website audit engine must not run on Vercel.");
  }

  const { runId } = parseArgs(process.argv.slice(2));
  if (!runId) throw new Error("--run-id is required");

  const stagingUrl =
    process.env.STAGING_APP_URL?.trim() || "https://ai-xia-staging.vercel.app";
  const guard = assertStagingScanUrl(stagingUrl);
  if (!guard.ok) throw new Error(guard.error);

  const client = createServiceClient();
  const { data: row, error: readError } = await client
    .from(MONITORING_TABLE)
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!row) throw new Error(`Run not found: ${runId}`);
  if (String(row.status) !== "running") {
    throw new Error(`Run ${runId} must be running (got ${row.status}).`);
  }

  const summary =
    row.summary && typeof row.summary === "object"
      ? ({ ...(row.summary as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  if (summary.workType !== "website_audit") {
    throw new Error(`Run ${runId} is not website_audit.`);
  }
  if (summary.workerPhase !== "b2-c" || summary.executionEngine !== "website_audit") {
    throw new Error(`Run ${runId} missing B2-C claim markers.`);
  }

  const agentSlug =
    typeof summary.agentSlug === "string" ? summary.agentSlug : "system-agent";
  const runtimeAgentId =
    typeof summary.runtimeAgentId === "string" ? summary.runtimeAgentId : null;
  const routes = resolveLimitedAuditRoutes(summary, agentSlug);
  const startedAt =
    typeof row.started_at === "string" ? row.started_at : new Date().toISOString();
  const scanStarted = Date.now();

  const preScan = await client
    .from(MONITORING_TABLE)
    .select("summary, status")
    .eq("run_id", runId)
    .maybeSingle();
  const preSummary =
    preScan.data?.summary && typeof preScan.data.summary === "object"
      ? (preScan.data.summary as Record<string, unknown>)
      : summary;
  if (preScan.data?.status === "running" && preSummary.cancelRequested === true) {
    const endedAt = new Date().toISOString();
    const canceledSummary = {
      ...summary,
      ...preSummary,
      cancelRequested: false,
      canceledAt: endedAt,
      cancelAcknowledgedAt: endedAt,
      cancelPhase: "before_route_scan",
      cancelReason: "Canceled at checkpoint: before_route_scan",
    };
    await client
      .from(MONITORING_TABLE)
      .update({
        status: "canceled",
        ended_at: endedAt,
        duration_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
        summary: canceledSummary,
      })
      .eq("run_id", runId)
      .eq("status", "running");
    console.log(
      JSON.stringify({
        ok: true,
        canceled: true,
        runId,
        cancelPhase: "before_route_scan",
      }),
    );
    return;
  }

  let findings: StagingScanFinding[] = [];
  let failureReason: string | null = null;
  let failurePhase: string | null = null;

  try {
    const agent = buildScanAgent(agentSlug, runtimeAgentId, routes);
    findings = await scanStagingWebsite(agent, guard.normalizedUrl, {
      maxRoutes: Math.min(3, routes.length || 1),
      pageTimeoutMs: 10_000,
      screenshotDir: join(process.cwd(), "qa-agent", "reports", "runtime-scans", "manual-b2c"),
    });
  } catch (error) {
    failureReason = error instanceof Error ? error.message : String(error);
    failurePhase = "scanStagingWebsite";
  }

  const durationMs = Math.max(0, Date.now() - scanStarted);
  const endedAt = new Date().toISOString();
  const qualifying = qualifyingFindings(findings);
  const errorsCount = findings.filter((f) => severityRank(f.severity) >= 3).length;
  const artifactRefs = findings
    .map((f) => f.evidence?.screenshot_path)
    .filter((p): p is string => typeof p === "string")
    .slice(0, 12);

  let draftsCreated = 0;
  let draftsSkipped = 0;
  let draftIds: string[] = [];
  if (!failureReason && qualifying.length > 0) {
    try {
      const draftResult = await insertDraftFindings(client, runId, agentSlug, qualifying);
      draftsCreated = draftResult.created;
      draftsSkipped = draftResult.skippedDuplicate;
      draftIds = draftResult.draftIds;
    } catch (error) {
      failureReason = error instanceof Error ? error.message : String(error);
      failurePhase = "insertDraftFindings";
    }
  }

  const resultLabel = failureReason
    ? "failed"
    : qualifying.length > 0
      ? "findings_found"
      : "completed";

  const nextSummary: Record<string, unknown> = {
    ...summary,
    workerPhase: "b2-c",
    executionEngine: "website_audit",
    workerVersion: WORKER_VERSION,
    result: resultLabel,
    scope: summary.scope ?? { type: "selected_routes", routes },
    routesScanned: routes,
    selectedRoutes: routes,
    evidenceSummary: {
      scanFindingsCount: findings.length,
      qualifyingFindingsCount: qualifying.length,
      draftsCreated,
      draftsSkippedDuplicate: draftsSkipped,
      draftIds,
      zeroFindingsMessage: qualifying.length === 0 && !failureReason ? ZERO_FINDINGS : null,
      stagingUrl: guard.normalizedUrl,
    },
    artifactRefs,
    artifactVisibility: "local_worker_only",
    artifactNote:
      "Artifact refs are local-worker-only and may not be reachable from the browser.",
    rawObservations: findings.map((f) => ({
      page_url: f.page_url,
      issue: f.issue,
      severity: f.severity,
    })),
    autoPromoteBlocked: true,
    autoFixBlocked: true,
    autoMemoryApplyBlocked: true,
    productionWritesBlocked: true,
    closedAt: endedAt,
  };

  if (failureReason) {
    nextSummary.error = failureReason;
    nextSummary.failureReason = failureReason;
    nextSummary.failurePhase = failurePhase;
    nextSummary.partialEvidence = {
      routesScanned: routes,
      scanFindingsCount: findings.length,
      artifactRefs,
    };
  }

  const status = failureReason ? "failed" : "completed";
  const { data: updated, error: updateError } = await client
    .from(MONITORING_TABLE)
    .update({
      status,
      ended_at: endedAt,
      duration_ms: durationMs,
      findings_count: draftsCreated || qualifying.length,
      errors_count: errorsCount,
      agents_run: 1,
      actual_issues_created: 0,
      actual_memory_writes: 0,
      github_run_id: null,
      github_run_url: null,
      summary: nextSummary,
    })
    .eq("run_id", runId)
    .eq("status", "running")
    .select("run_id, status, duration_ms, findings_count, errors_count, summary")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error(`Failed to persist website audit result for ${runId}.`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        status,
        durationMs,
        routesScanned: routes,
        findingsCount: updated.findings_count,
        errorsCount: updated.errors_count,
        draftsCreated,
        startedAt,
        endedAt,
        message: failureReason
          ? failureReason
          : qualifying.length === 0
            ? ZERO_FINDINGS
            : `Website audit completed with ${qualifying.length} qualifying finding(s).`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "[website-audit-engine] FAILED:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
