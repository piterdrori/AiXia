/**
 * Fix B2-D — Browser QA execution for one owner_manual monitoring run.
 * Invoked by the staging worker (off Vercel). Uses runPlaywrightBrowserQA only.
 *
 * Usage:
 *   npx tsx scripts/agentops-manual-run-browser-qa-engine.ts --run-id <id>
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { runPlaywrightBrowserQA } from "../src/lib/agentops/browserQa/playwrightBrowserQaRunner";
import type { BrowserQaFinding } from "../src/lib/agentops/browserQa/browserQaRunResult";
import { assertStagingScanUrl } from "../src/lib/agentops/runtime/stagingScanUrlGuard";

const MONITORING_TABLE = "agentops_monitoring_runs";
const DRAFTS_TABLE = "agentops_monitoring_issue_drafts";
const ZERO_FINDINGS = "No qualifying findings were produced by this run.";
const AUTH_MISSING = "Browser QA auth not configured for staging worker.";
const WORKER_VERSION = "b2-d";

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
    throw new Error("Staging Supabase service role is required for Browser QA.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveStorageStatePath(): string | null {
  const raw =
    process.env.AGENTOPS_BROWSER_QA_STORAGE_STATE?.trim() ||
    "qa-agent/browser-qa-auth/storage-state.json";
  const resolved = isAbsolute(raw) ? raw : join(process.cwd(), raw);
  return existsSync(resolved) ? resolved : null;
}

function resolveRoute(summary: Record<string, unknown>, agentSlug: string, appUrl: string) {
  const selected =
    Array.isArray(summary.selectedRoutes) && summary.selectedRoutes.length > 0
      ? summary.selectedRoutes.filter((r): r is string => typeof r === "string" && Boolean(r.trim()))
      : [];
  const scope =
    summary.scope && typeof summary.scope === "object"
      ? (summary.scope as Record<string, unknown>)
      : null;
  const scopeRoutes = Array.isArray(scope?.routes)
    ? scope.routes.filter((r): r is string => typeof r === "string" && Boolean(r.trim()))
    : [];
  const routeRaw =
    selected[0] ||
    scopeRoutes[0] ||
    `/system/agent-ops/agents/${agentSlug || "system-agent"}`;
  const route = routeRaw.startsWith("/") ? routeRaw : `/${routeRaw}`;
  const base = appUrl.replace(/\/+$/, "");
  return { route, absoluteUrl: `${base}${route}` };
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

function qualifyingFindings(findings: BrowserQaFinding[]): BrowserQaFinding[] {
  return findings.filter(
    (f) => f.type !== "clean_scan" && severityRank(f.severity) >= 2,
  );
}

function duplicateKey(agentSlug: string, finding: BrowserQaFinding): string {
  return createHash("sha1")
    .update(`${agentSlug}|browser_qa|${finding.type}|${finding.title}|${finding.description}`)
    .digest("hex")
    .slice(0, 40);
}

async function insertDraftFindings(
  client: SupabaseClient,
  runId: string,
  agentSlug: string,
  route: string,
  findings: BrowserQaFinding[],
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
      source: "owner_manual_browser_qa",
      status: "draft",
      agent_slug: agentSlug,
      module: "agent-ops",
      route,
      issue_type: finding.type,
      severity: finding.severity,
      title: finding.title.slice(0, 180),
      summary: finding.description,
      evidence: {
        evidence: finding.evidence ?? null,
        ownerManual: true,
        autoPromoteBlocked: true,
        workerPhase: "b2-d",
      },
      browser_qa_evidence: {
        type: finding.type,
        evidence: finding.evidence ?? null,
      },
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
    throw new Error("Browser QA engine must not run on Vercel.");
  }

  const { runId } = parseArgs(process.argv.slice(2));
  if (!runId) throw new Error("--run-id is required");

  const stagingUrl =
    process.env.STAGING_APP_URL?.trim() || "https://ai-xia-staging.vercel.app";
  const guard = assertStagingScanUrl(stagingUrl);
  if (!guard.ok) throw new Error(guard.error);

  const storagePath = resolveStorageStatePath();
  if (!storagePath) {
    throw new Error(AUTH_MISSING);
  }

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
  if (summary.workType !== "browser_qa") {
    throw new Error(`Run ${runId} is not browser_qa.`);
  }
  if (summary.workerPhase !== "b2-d" || summary.executionEngine !== "browser_qa") {
    throw new Error(`Run ${runId} missing B2-D claim markers.`);
  }

  const agentSlug =
    typeof summary.agentSlug === "string" ? summary.agentSlug : "system-agent";
  const runtimeAgentId =
    typeof summary.runtimeAgentId === "string" ? summary.runtimeAgentId : agentSlug;
  const { route, absoluteUrl } = resolveRoute(summary, agentSlug, guard.normalizedUrl);
  const targetGuard = assertStagingScanUrl(absoluteUrl);
  if (!targetGuard.ok) throw new Error(targetGuard.error);

  const startedAt =
    typeof row.started_at === "string" ? row.started_at : new Date().toISOString();
  const scanStarted = Date.now();

  let failureReason: string | null = null;
  let failurePhase: string | null = null;
  let qaResult = await runPlaywrightBrowserQA({
    targetUrl: absoluteUrl,
    agentId: runtimeAgentId,
    canonicalAgentId: agentSlug,
  });

  if (qaResult.auth?.redirectedToLogin || qaResult.error?.includes("redirected to login")) {
    failureReason = AUTH_MISSING;
    failurePhase = "browser_qa_auth";
  } else if (qaResult.executionType === "failed" && qaResult.error) {
    failureReason = qaResult.error;
    failurePhase = "runPlaywrightBrowserQA";
  }

  const durationMs = Math.max(0, Date.now() - scanStarted);
  const endedAt = new Date().toISOString();
  const findings = qaResult.findings ?? [];
  const qualifying = failureReason ? [] : qualifyingFindings(findings);
  const errorsCount = findings.filter((f) => severityRank(f.severity) >= 3).length;
  const screenshotRefs = qaResult.evidence?.screenshotPath
    ? [qaResult.evidence.screenshotPath]
    : [];
  const artifactRefs = [...screenshotRefs];

  let draftsCreated = 0;
  let draftsSkipped = 0;
  let draftIds: string[] = [];
  if (!failureReason && qualifying.length > 0) {
    try {
      const draftResult = await insertDraftFindings(
        client,
        runId,
        agentSlug,
        route,
        qualifying,
      );
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
    workerPhase: "b2-d",
    executionEngine: "browser_qa",
    workerVersion: WORKER_VERSION,
    result: resultLabel,
    route,
    selectedRoutes: [route],
    scope: summary.scope ?? { type: "selected_routes", routes: [route] },
    evidenceSummary: {
      scanFindingsCount: findings.length,
      qualifyingFindingsCount: qualifying.length,
      draftsCreated,
      draftsSkippedDuplicate: draftsSkipped,
      draftIds,
      zeroFindingsMessage: qualifying.length === 0 && !failureReason ? ZERO_FINDINGS : null,
      stagingUrl: guard.normalizedUrl,
      targetUrl: absoluteUrl,
      finalUrl: qaResult.finalUrl ?? null,
      authenticated: Boolean(qaResult.auth?.authenticated),
      executionType: qaResult.executionType,
      realBrowserUsed: qaResult.realBrowserUsed,
    },
    artifactRefs,
    screenshotRefs,
    consoleFindings: qaResult.evidence?.consoleErrors ?? [],
    networkFindings: qaResult.evidence?.failedRequests ?? [],
    accessibilityFindings: findings
      .filter((f) => f.type === "missing_h1" || f.type === "missing_app_shell")
      .map((f) => ({ type: f.type, title: f.title, severity: f.severity })),
    rawObservations: findings.map((f) => ({
      type: f.type,
      title: f.title,
      severity: f.severity,
      description: f.description,
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
      route,
      targetUrl: absoluteUrl,
      screenshotRefs,
      consoleFindings: qaResult.evidence?.consoleErrors ?? [],
      networkFindings: qaResult.evidence?.failedRequests ?? [],
      scanFindingsCount: findings.length,
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
  if (!updated) throw new Error(`Failed to persist Browser QA result for ${runId}.`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        status,
        durationMs,
        route,
        findingsCount: updated.findings_count,
        errorsCount: updated.errors_count,
        draftsCreated,
        screenshots: screenshotRefs.length,
        startedAt,
        endedAt,
        message: failureReason
          ? failureReason
          : qualifying.length === 0
            ? ZERO_FINDINGS
            : `Browser QA completed with ${qualifying.length} qualifying finding(s).`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "[browser-qa-engine] FAILED:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
