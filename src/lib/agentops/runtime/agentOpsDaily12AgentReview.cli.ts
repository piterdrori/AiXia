/**
 * Phase 5H — daily 12-agent review CLI (GitHub Actions + local).
 * Fix B — also accepts owner-manual work_type / routes / run id env vars.
 */
import { runDaily12AgentReview } from "./agentOpsDaily12AgentReview";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  return undefined;
}

function parseSelectedRoutes(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const routes = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((route) => (route.startsWith("/") ? route : `/${route}`))
    .slice(0, 20);
  return routes.length > 0 ? routes : undefined;
}

async function main(): Promise<void> {
  const agentScope =
    readArg("agent-scope") ??
    process.env.AGENTOPS_DAILY_AGENT_SCOPE?.trim() ??
    "all";
  const forceRetry =
    process.argv.includes("--force-retry") ||
    process.env.AGENTOPS_DAILY_FORCE_RETRY?.trim().toLowerCase() === "true";
  const workTypeRaw =
    readArg("work-type") ?? process.env.AGENTOPS_MANUAL_WORK_TYPE?.trim() ?? "website_audit";
  const workType =
    workTypeRaw === "browser_qa" ? ("browser_qa" as const) : ("website_audit" as const);
  const ownerManualRunId =
    readArg("owner-manual-run-id") ??
    process.env.AGENTOPS_OWNER_MANUAL_RUN_ID?.trim() ??
    null;
  const selectedRoutes = parseSelectedRoutes(
    readArg("selected-routes") ?? process.env.AGENTOPS_MANUAL_SELECTED_ROUTES,
  );
  const maxDurationMinutes = Number(
    readArg("max-duration-minutes") ??
      process.env.AGENTOPS_MANUAL_MAX_DURATION_MINUTES ??
      "15",
  );

  const result = await runDaily12AgentReview({
    agentScope,
    forceRetry,
    workType,
    selectedRoutes,
    ownerManualRunId: ownerManualRunId || null,
    maxDurationMinutes: Number.isFinite(maxDurationMinutes) ? maxDurationMinutes : 15,
  });

  console.log(
    JSON.stringify(
      {
        runId: result.runId,
        dailyReportPath: result.dailyReportPath,
        coverage: result.coverage,
        draftInsertSummary: result.draftInsertSummary,
        persistenceMetrics: result.persistenceMetrics,
        registryErrors: result.registryErrors,
        workType,
        ownerManualRunId: ownerManualRunId || null,
        selectedRoutes: selectedRoutes ?? null,
        exitCode: result.exitCode,
      },
      null,
      2,
    ),
  );

  process.exit(result.exitCode);
}

main().catch((error) => {
  console.error(
    "[agentops-daily-12-agent-review] Fatal:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
