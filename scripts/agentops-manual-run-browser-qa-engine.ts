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
import { shouldSkipFailedRequestDraft } from "../src/lib/agentops/findings/issueDraftNoise";
import { isCancelRequestedError } from "../src/lib/agentops/runtime/agentOpsCancelCheckpoint";
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

/** E-A8 / role-first — full-site scans use the shared inventory soft cap. */
const MAX_ROUTES_PER_RUN = Math.max(
  1,
  Number(process.env.AGENTOPS_BROWSER_QA_MAX_ROUTES || 400),
);

function isEntireStagingScope(summary: Record<string, unknown>): boolean {
  if (summary.roleFirstFullSite === true) return true;
  const scope =
    summary.scope && typeof summary.scope === "object"
      ? (summary.scope as Record<string, unknown>)
      : null;
  if (scope?.type === "entire_staging") return true;
  const mapping = typeof summary.mapping === "string" ? summary.mapping : "";
  return mapping === "role_first_full_site" || mapping.startsWith("entire_staging");
}

function resolveRoutes(
  summary: Record<string, unknown>,
  agentSlug: string,
  appUrl: string,
): Array<{ route: string; absoluteUrl: string }> {
  const base = appUrl.replace(/\/+$/, "");
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

  let merged: string[] = [];
  if (isEntireStagingScope(summary)) {
    try {
      const inventory = JSON.parse(
        readFileSync(
          join(process.cwd(), "qa-agent/agentops-agents/_shared/full-site-routes.json"),
          "utf8",
        ),
      );
      if (Array.isArray(inventory)) merged = inventory.map(String);
    } catch {
      merged = [...selected, ...scopeRoutes];
    }
  } else {
    merged = [...selected, ...scopeRoutes];
  }
  if (merged.length === 0) {
    merged.push(`/system/agent-ops/agents/${agentSlug || "system-agent"}`);
  }
  const seen = new Set<string>();
  const routes: Array<{ route: string; absoluteUrl: string }> = [];
  for (const raw of merged) {
    const route = raw.startsWith("/") ? raw : `/${raw}`;
    if (seen.has(route)) continue;
    seen.add(route);
    routes.push({ route, absoluteUrl: `${base}${route}` });
    if (routes.length >= MAX_ROUTES_PER_RUN) break;
  }
  return routes;
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

type RoutedFinding = BrowserQaFinding & { route: string };

async function insertDraftFindings(
  client: SupabaseClient,
  runId: string,
  agentSlug: string,
  findings: RoutedFinding[],
  options?: { asImprovement?: boolean },
): Promise<{ created: number; skippedDuplicate: number; skippedNoise: number; draftIds: string[] }> {
  const result = {
    created: 0,
    skippedDuplicate: 0,
    skippedNoise: 0,
    draftIds: [] as string[],
  };
  for (const finding of findings) {
    const route = finding.route;
    if (
      shouldSkipFailedRequestDraft({
        pageUrl: route,
        findingType: finding.type,
        evidenceText: finding.evidence ?? finding.description,
      })
    ) {
      result.skippedNoise += 1;
      continue;
    }
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
    const asImprovement = options?.asImprovement === true;
    const suggestedFixPrompt = [
      asImprovement
        ? `Review a Browser QA improvement suggestion on staging route ${route}.`
        : `Investigate Browser QA finding on staging route ${route}.`,
      `Title: ${finding.title}`,
      `Description: ${finding.description}`,
      finding.evidence ? `Evidence: ${finding.evidence}` : null,
      "Constraints: staging-only; no production; no PR/deploy/auto-fix unless owner later approves.",
    ]
      .filter(Boolean)
      .join("\n");
    const row = {
      monitoring_run_id: null,
      run_id: runId,
      github_run_id: null,
      source: "owner_manual_browser_qa",
      status: "draft",
      agent_slug: agentSlug,
      module: "agent-ops",
      route,
      issue_type: asImprovement ? "improvement" : finding.type,
      severity: asImprovement ? "low" : finding.severity,
      title: finding.title.slice(0, 180),
      summary: finding.description,
      evidence: {
        evidence: finding.evidence ?? null,
        ownerManual: true,
        autoPromoteBlocked: true,
        workerPhase: "b2-d",
      },
      browser_qa_evidence: {
        scan_mode: "playwright",
        route,
        absolute_url: null,
        type: finding.type,
        evidence: finding.evidence ?? null,
        source: "owner_manual_browser_qa",
        workerPhase: "b2-d",
      },
      suggested_fix_prompt: suggestedFixPrompt,
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
  const routes = resolveRoutes(summary, agentSlug, guard.normalizedUrl);
  for (const target of routes) {
    const targetGuard = assertStagingScanUrl(target.absoluteUrl);
    if (!targetGuard.ok) throw new Error(targetGuard.error);
  }
  const route = routes[0].route;
  const absoluteUrl = routes[0].absoluteUrl;

  const startedAt =
    typeof row.started_at === "string" ? row.started_at : new Date().toISOString();
  const scanStarted = Date.now();

  const preLaunch = await client
    .from(MONITORING_TABLE)
    .select("summary, status")
    .eq("run_id", runId)
    .maybeSingle();
  const preSummary =
    preLaunch.data?.summary && typeof preLaunch.data.summary === "object"
      ? (preLaunch.data.summary as Record<string, unknown>)
      : summary;
  if (preLaunch.data?.status === "running" && preSummary.cancelRequested === true) {
    const endedAt = new Date().toISOString();
    const canceledSummary = {
      ...summary,
      ...preSummary,
      cancelRequested: false,
      canceledAt: endedAt,
      cancelAcknowledgedAt: endedAt,
      cancelPhase: "before_browser_launch",
      cancelReason: "Canceled at checkpoint: before_browser_launch",
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
        cancelPhase: "before_browser_launch",
      }),
    );
    return;
  }

  const cancelCheck = async (_phase: string): Promise<boolean> => {
    const { data } = await client
      .from(MONITORING_TABLE)
      .select("summary, status")
      .eq("run_id", runId)
      .maybeSingle();
    if (!data || data.status !== "running") return true;
    const s =
      data.summary && typeof data.summary === "object"
        ? (data.summary as Record<string, unknown>)
        : {};
    return s.cancelRequested === true;
  };

  let failureReason: string | null = null;
  let failurePhase: string | null = null;

  // E-A8 — scan every route in scope (capped), aggregating findings per route.
  const routedFindings: RoutedFinding[] = [];
  const routedSuggestions: Array<{ route: string; text: string }> = [];
  const perRouteResults: Array<{
    route: string;
    findingsCount: number;
    executionType: string;
    finalUrl: string | null;
  }> = [];
  const screenshotPaths: string[] = [];
  const consoleErrorsAll: string[] = [];
  const failedRequestsAll: string[] = [];
  let lastQaResult: Awaited<ReturnType<typeof runPlaywrightBrowserQA>> | null = null;

  for (const target of routes) {
    let qaResult;
    try {
      qaResult = await runPlaywrightBrowserQA({
        targetUrl: target.absoluteUrl,
        agentId: runtimeAgentId,
        canonicalAgentId: agentSlug,
        cancelCheck,
      });
    } catch (error) {
      if (isCancelRequestedError(error)) {
        const endedAt = new Date().toISOString();
        await client
          .from(MONITORING_TABLE)
          .update({
            status: "canceled",
            ended_at: endedAt,
            duration_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
            summary: {
              ...summary,
              cancelRequested: false,
              canceledAt: endedAt,
              cancelAcknowledgedAt: endedAt,
              cancelPhase: error.phase,
              cancelReason:
                error.phase.includes("navigation") || error.phase.includes("screenshot")
                  ? `Cancel request recorded; current browser step completed before cancellation (${error.phase}).`
                  : `Canceled at checkpoint: ${error.phase}`,
              partialEvidence: {
                routesChecked: perRouteResults.map((entry) => entry.route),
                findingsCount: routedFindings.length,
              },
            },
          })
          .eq("run_id", runId)
          .eq("status", "running");
        console.log(
          JSON.stringify({ ok: true, canceled: true, runId, cancelPhase: error.phase }),
        );
        return;
      }
      throw error;
    }

    lastQaResult = qaResult;
    perRouteResults.push({
      route: target.route,
      findingsCount: qaResult.findings?.length ?? 0,
      executionType: qaResult.executionType,
      finalUrl: qaResult.finalUrl ?? null,
    });
    for (const finding of qaResult.findings ?? []) {
      routedFindings.push({ ...finding, route: target.route });
    }
    for (const text of qaResult.suggestions ?? []) {
      if (typeof text === "string" && text.trim()) {
        routedSuggestions.push({ route: target.route, text: text.trim() });
      }
    }
    if (qaResult.evidence?.screenshotPath) screenshotPaths.push(qaResult.evidence.screenshotPath);
    consoleErrorsAll.push(...(qaResult.evidence?.consoleErrors ?? []));
    failedRequestsAll.push(...(qaResult.evidence?.failedRequests ?? []));

    if (qaResult.auth?.redirectedToLogin || qaResult.error?.includes("redirected to login")) {
      failureReason = AUTH_MISSING;
      failurePhase = "browser_qa_auth";
      break;
    }
    if (qaResult.executionType === "failed" && qaResult.error) {
      failureReason = qaResult.error;
      failurePhase = "runPlaywrightBrowserQA";
      break;
    }
  }

  const qaResult = lastQaResult!;

  if (await cancelCheck("before_artifact_upload")) {
    const endedAt = new Date().toISOString();
    await client
      .from(MONITORING_TABLE)
      .update({
        status: "canceled",
        ended_at: endedAt,
        duration_ms: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
        summary: {
          ...summary,
          cancelRequested: false,
          canceledAt: endedAt,
          cancelAcknowledgedAt: endedAt,
          cancelPhase: "before_artifact_upload",
          cancelReason:
            "Cancel request recorded; current browser step completed before cancellation.",
          partialEvidence: {
            screenshotPath: qaResult.evidence?.screenshotPath ?? null,
            findingsCount: qaResult.findings?.length ?? 0,
          },
        },
      })
      .eq("run_id", runId)
      .eq("status", "running");
    console.log(
      JSON.stringify({
        ok: true,
        canceled: true,
        runId,
        cancelPhase: "before_artifact_upload",
      }),
    );
    return;
  }

  const durationMs = Math.max(0, Date.now() - scanStarted);
  const endedAt = new Date().toISOString();
  const findings = routedFindings;
  const qualifying = failureReason ? [] : (qualifyingFindings(findings) as RoutedFinding[]);
  const errorsCount = findings.filter((f) => severityRank(f.severity) >= 3).length;
  const screenshotRefs = screenshotPaths.filter(
    (path) => !/storage[-_]?state|service[_-]?role|password|token=/i.test(path),
  );
  const artifactRefs = [...screenshotRefs];

  let draftsCreated = 0;
  let draftsSkipped = 0;
  let draftIds: string[] = [];
  if (!failureReason && qualifying.length > 0) {
    try {
      const draftResult = await insertDraftFindings(client, runId, agentSlug, qualifying);
      draftsCreated = draftResult.created;
      draftsSkipped = draftResult.skippedDuplicate + draftResult.skippedNoise;
      draftIds = draftResult.draftIds;
    } catch (error) {
      failureReason = error instanceof Error ? error.message : String(error);
      failurePhase = "insertDraftFindings";
    }
  }

  // E-A8 — a completed scan must never end empty-handed: when no qualifying issue
  // was recorded, record real improvement suggestions instead (honest, deduplicated).
  let improvementDraftsCreated = 0;
  let improvementDraftsSkippedDuplicate = 0;
  let improvementNote: string | null = null;
  if (!failureReason && draftsCreated === 0) {
    let candidates: RoutedFinding[] = findings
      .filter((f) => f.type !== "clean_scan" && severityRank(f.severity) < 2)
      .slice(0, 3)
      .map((f) => ({
        ...f,
        title: `Improvement: ${f.title}`,
        description: `${f.description} (Low-severity Browser QA observation recorded as an improvement suggestion.)`,
      }));
    if (candidates.length === 0 && routedSuggestions.length > 0) {
      candidates = routedSuggestions.slice(0, 2).map((suggestion) => ({
        route: suggestion.route,
        severity: "low" as const,
        type: "improvement",
        title: `Improvement suggestion: ${suggestion.text.slice(0, 140)}`,
        description: `Browser QA suggestion for ${suggestion.route}: ${suggestion.text}`,
        evidence: undefined,
      }));
    }
    if (candidates.length === 0) {
      const routeList = routes.map((r) => r.route).join(", ");
      candidates = [
        {
          route,
          severity: "low" as const,
          type: "improvement",
          title: `Improvement: extend Browser QA coverage for ${route}`,
          description:
            `Scheduled Browser QA passed all current checks on ${routeList} — no defects were found in this run. ` +
            `Improvement suggestion: extend the checks for these routes. Accessibility landmarks, empty-state copy, ` +
            `mobile overflow, and slow-network behavior are not yet covered by the current scan, so these pages may ` +
            `still have improvement opportunities the scan cannot rule out.`,
          evidence: `Checked routes: ${routeList}`,
        },
      ];
    }
    try {
      const improvementResult = await insertDraftFindings(client, runId, agentSlug, candidates, {
        asImprovement: true,
      });
      improvementDraftsCreated = improvementResult.created;
      improvementDraftsSkippedDuplicate = improvementResult.skippedDuplicate;
      improvementNote =
        improvementDraftsCreated > 0
          ? `No qualifying defects — recorded ${improvementDraftsCreated} improvement suggestion(s) instead.`
          : improvementDraftsSkippedDuplicate > 0
            ? "No qualifying defects — the improvement suggestion from a previous run is still open (duplicate skipped)."
            : null;
    } catch (error) {
      // Improvement fallback must never fail the scan itself.
      improvementNote = `Improvement suggestion insert failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  const resultLabel = failureReason
    ? "failed"
    : qualifying.length > 0
      ? "findings_found"
      : improvementDraftsCreated > 0
        ? "improvements_suggested"
        : "completed";

  const nextSummary: Record<string, unknown> = {
    ...summary,
    workerPhase: "b2-d",
    executionEngine: "browser_qa",
    workerVersion: WORKER_VERSION,
    result: resultLabel,
    route,
    selectedRoutes: routes.map((r) => r.route),
    routesChecked: routes.map((r) => r.route),
    perRouteResults,
    scope: summary.scope ?? { type: "selected_routes", routes: routes.map((r) => r.route) },
    evidenceSummary: {
      scanFindingsCount: findings.length,
      qualifyingFindingsCount: qualifying.length,
      draftsCreated,
      draftsSkippedDuplicate: draftsSkipped,
      draftIds,
      improvementDraftsCreated,
      improvementDraftsSkippedDuplicate,
      improvementNote,
      zeroFindingsMessage:
        qualifying.length === 0 && !failureReason ? (improvementNote ?? ZERO_FINDINGS) : null,
      stagingUrl: guard.normalizedUrl,
      targetUrl: absoluteUrl,
      routesChecked: routes.map((r) => r.route),
      finalUrl: qaResult.finalUrl ?? null,
      authenticated: Boolean(qaResult.auth?.authenticated),
      executionType: qaResult.executionType,
      realBrowserUsed: qaResult.realBrowserUsed,
    },
    artifactRefs,
    screenshotRefs,
    artifactVisibility: "local_worker_only",
    artifactNote:
      "Screenshot/artifact paths are local-worker-only and may not be reachable from the browser.",
    consoleFindings: consoleErrorsAll,
    networkFindings: failedRequestsAll,
    accessibilityFindings: findings
      .filter((f) => f.type === "missing_h1" || f.type === "missing_app_shell")
      .map((f) => ({ type: f.type, title: f.title, severity: f.severity, route: f.route })),
    rawObservations: findings.map((f) => ({
      type: f.type,
      title: f.title,
      severity: f.severity,
      description: f.description,
      route: f.route,
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
      routesChecked: perRouteResults.map((entry) => entry.route),
      screenshotRefs,
      consoleFindings: consoleErrorsAll,
      networkFindings: failedRequestsAll,
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
      findings_count: (draftsCreated || qualifying.length) + improvementDraftsCreated,
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
        routesChecked: routes.map((r) => r.route),
        findingsCount: updated.findings_count,
        errorsCount: updated.errors_count,
        draftsCreated,
        improvementDraftsCreated,
        screenshots: screenshotRefs.length,
        startedAt,
        endedAt,
        message: failureReason
          ? failureReason
          : qualifying.length === 0
            ? (improvementNote ?? ZERO_FINDINGS)
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
