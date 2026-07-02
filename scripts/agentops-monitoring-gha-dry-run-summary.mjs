#!/usr/bin/env node
/**
 * Write human-readable GHA dry-run summary from latest runtime JSON report.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const reportDir = join(repoRoot, "qa-agent", "reports", "runtime");
const outPath = join(reportDir, "phase5a-gha-dry-run-summary.md");

async function readLatestReport() {
  let entries;
  try {
    entries = await readdir(reportDir);
  } catch {
    return null;
  }
  const jsonFiles = entries
    .filter((name) => name.startsWith("monitoring-scheduled-dry-run-") && name.endsWith(".json"))
    .sort()
    .reverse();
  if (jsonFiles.length === 0) return null;
  const raw = await readFile(join(reportDir, jsonFiles[0]), "utf8");
  return { filename: jsonFiles[0], report: JSON.parse(raw) };
}

async function main() {
  const latest = await readLatestReport();
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;

  const lines = [
    "# AgentOps Monitoring — GHA Dry-Run Summary",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    "",
  ];

  if (runUrl) {
    lines.push(`**Workflow run:** ${runUrl}`, "");
  }

  if (!latest) {
    lines.push(
      "## Status",
      "",
      "No `monitoring-scheduled-dry-run-*.json` report found. The dry-run step may have failed before writing a report.",
      "",
    );
    await writeFile(outPath, lines.join("\n"), "utf8");
    console.log("[agentops-monitoring-gha] Wrote summary (no JSON report found):", outPath);
    return;
  }

  const { report, filename } = latest;
  lines.push(
    "## Run summary",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Report file | \`${filename}\` |`,
    `| Run ID | ${report.runId ?? "—"} |`,
    `| Started | ${report.startedAt ?? "—"} |`,
    `| Ended | ${report.endedAt ?? "—"} |`,
    `| Target | ${report.targetBaseUrl ?? "—"} |`,
    `| Dry-run | ${report.dryRun ? "yes" : "no"} |`,
    `| Owner write approved | ${report.ownerWriteApproved ? "yes" : "no"} |`,
    `| Agents considered | ${report.agentsConsidered ?? 0} |`,
    `| Agents run | ${report.agentsRun?.length ?? 0} |`,
    `| Findings | ${report.findingsCount ?? 0} |`,
    `| Issues created | ${report.actualIssuesCreated ?? 0} |`,
    `| Memory writes | ${report.actualMemoryWrites ?? 0} |`,
    `| Would create issues | ${report.wouldCreateIssues ?? 0} |`,
    `| Would write memory | ${report.wouldWriteMemory ?? 0} |`,
    "",
    "## Safety",
    "",
    `- Production blocked: ${report.productionBlocked === false ? "n/a (staging target)" : "yes"}`,
    `- Writes blocked reason: ${report.writesBlockedReason ?? "dry-run"}`,
    "",
  );

  if (report.errors?.length) {
    lines.push("## Errors", "", ...report.errors.map((e) => `- ${e}`), "");
  }

  if (report.agentsRun?.length) {
    lines.push("## Agents run", "");
    for (const agent of report.agentsRun) {
      lines.push(
        `- **${agent.agentName}** (\`${agent.agentSlug}\`) — routes: ${(agent.routesScanned ?? []).join(", ") || "none"} — findings: ${agent.findingsCount ?? 0}`,
      );
    }
    lines.push("");
  }

  await writeFile(outPath, lines.join("\n"), "utf8");
  console.log("[agentops-monitoring-gha] Wrote summary:", outPath);
}

main().catch((error) => {
  console.error("[agentops-monitoring-gha] Summary failed:", error);
  process.exit(1);
});
