/**
 * Phase 5H — daily 12-agent review CLI (GitHub Actions + local).
 */
import { runDaily12AgentReview } from "./agentOpsDaily12AgentReview";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  return undefined;
}

async function main(): Promise<void> {
  const agentScope =
    readArg("agent-scope") ??
    process.env.AGENTOPS_DAILY_AGENT_SCOPE?.trim() ??
    "all";
  const forceRetry =
    process.argv.includes("--force-retry") ||
    process.env.AGENTOPS_DAILY_FORCE_RETRY?.trim().toLowerCase() === "true";

  const result = await runDaily12AgentReview({ agentScope, forceRetry });

  console.log(
    JSON.stringify(
      {
        runId: result.runId,
        dailyReportPath: result.dailyReportPath,
        coverage: result.coverage,
        draftInsertSummary: result.draftInsertSummary,
        registryErrors: result.registryErrors,
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
