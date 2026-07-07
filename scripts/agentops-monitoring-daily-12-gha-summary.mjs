/**
 * Phase 5H — write GitHub Actions job summary for daily 12-agent review.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const REPORT_DIR = join(REPO_ROOT, "qa-agent", "reports", "runtime");
const SUMMARY_PATH = join(REPO_ROOT, "qa-agent", "reports", "runtime", "phase5h-daily-12-agent-review-summary.md");

async function readLatestDailyReport(): Promise<Record<string, unknown> | null> {
  let entries: string[];
  try {
    entries = await readdir(REPORT_DIR);
  } catch {
    return null;
  }
  const jsonFiles = entries
    .filter((name) => name.startsWith("agentops-daily-12-agent-review-") && name.endsWith(".json"))
    .sort()
    .reverse();
  if (jsonFiles.length === 0) return null;
  const raw = await readFile(join(REPORT_DIR, jsonFiles[0]), "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

async function main(): Promise<void> {
  const report = await readLatestDailyReport();
  const lines: string[] = [
    "# AgentOps Daily 12-Agent Review",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| Date | ${String(report?.date ?? "unknown")} |`,
    `| Run ID | ${String(report?.runId ?? "unknown")} |`,
    `| Expected agents | ${String(report?.expectedAgents ?? 12)} |`,
    `| Attempted | ${String(report?.attempted ?? 0)} |`,
    `| Completed | ${String(report?.completed ?? 0)} |`,
    `| Failed | ${String(report?.failed ?? 0)} |`,
    `| Blocked | ${String(report?.blocked ?? 0)} |`,
    `| Missing | ${Array.isArray(report?.missing) ? report.missing.join(", ") || "none" : "unknown"} |`,
    `| Errors found | ${String(report?.errorsFound ?? 0)} |`,
    `| Improvements | ${String(report?.improvementOpportunities ?? 0)} |`,
    `| New features | ${String(report?.newFeaturesProposed ?? 0)} |`,
    `| No-findings agents | ${String(report?.noFindingsAgents ?? 0)} |`,
    `| Drafts created | ${String(report?.draftsCreated ?? 0)} |`,
    `| Duplicates skipped | ${String(report?.duplicatesSkipped ?? 0)} |`,
    "",
    "**Safety:** staging-only · dry-run · no auto-promotion · no auto-fix · no deploy",
    "",
  ];

  const ghSummary = process.env.GITHUB_STEP_SUMMARY;
  if (ghSummary) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(ghSummary, `${lines.join("\n")}\n`, "utf8");
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(SUMMARY_PATH, `${lines.join("\n")}\n`, "utf8");
  console.log("[agentops-daily-12-summary] Wrote", SUMMARY_PATH);
}

main().catch((error) => {
  console.error("[agentops-daily-12-summary] Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
