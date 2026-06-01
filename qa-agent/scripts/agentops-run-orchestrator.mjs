import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { DEV_URL, isDevServerUp } from "../../scripts/dev-server-utils.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG_PATH = path.join(repoRoot, "qa-agent", "orchestrator", "orchestrator-config.json");
const MODES_PATH = path.join(repoRoot, "qa-agent", "orchestrator", "run-modes.json");
const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";

function parseArgs(argv) {
  const args = {
    mode: "foundation",
    dryRun: false,
    continueOnFailure: false,
    maxMinutes: null,
    noBrowser: false,
    summaryOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--mode" && argv[i + 1]) args.mode = argv[++i];
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--continue-on-failure") args.continueOnFailure = true;
    else if (token === "--max-minutes" && argv[i + 1]) args.maxMinutes = Number(argv[++i]);
    else if (token === "--no-browser") args.noBrowser = true;
    else if (token === "--summary-only") args.summaryOnly = true;
  }
  return args;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

function nowIso() {
  return new Date().toISOString();
}

function isAllowedCommand(command, allowedCommands) {
  return allowedCommands.includes(command);
}

function flattenModeSteps(modeId, modes, visited = new Set()) {
  if (visited.has(modeId)) {
    throw new Error(`Circular modeRef detected at ${modeId}`);
  }
  const mode = modes[modeId];
  if (!mode) {
    throw new Error(`Unknown mode: ${modeId}`);
  }
  visited.add(modeId);

  const commands = [];
  for (const step of mode.steps ?? []) {
    if (typeof step === "string") {
      commands.push(step);
      continue;
    }
    if (step && typeof step === "object" && step.modeRef) {
      commands.push(...flattenModeSteps(step.modeRef, modes, new Set(visited)));
      continue;
    }
    throw new Error(`Invalid step in mode ${modeId}`);
  }
  return commands;
}

function shortSummary(text) {
  if (!text) return "";
  return text.replace(/\r/g, "").split("\n").filter(Boolean).slice(-6).join(" | ").slice(0, 1200);
}

function runCommand(command) {
  const startedAt = nowIso();
  const result = spawnSync(command, {
    cwd: repoRoot,
    shell: true,
    encoding: "utf8",
    maxBuffer: 24 * 1024 * 1024,
  });
  const endedAt = nowIso();
  return {
    command,
    startedAt,
    endedAt,
    exitCode: result.status ?? 1,
    status: (result.status ?? 1) === 0 ? "passed" : "failed",
    stdoutSummary: shortSummary(result.stdout),
    stderrSummary: shortSummary(result.stderr),
  };
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function extractFindingsSummary(reportPath, data) {
  const findingKeys = ["findings", "criticalFindings", "criticalSecurityFindings"];
  const out = {
    reportPath,
    findingsCount: 0,
    criticalFindings: 0,
  };
  if (!data || typeof data !== "object") return out;
  if (Array.isArray(data.findings)) out.findingsCount = data.findings.length;
  if (Array.isArray(data.criticalFindings)) out.criticalFindings += data.criticalFindings.length;
  if (Array.isArray(data.criticalSecurityFindings)) {
    out.criticalFindings += data.criticalSecurityFindings.length;
  }
  if (!findingKeys.some((k) => k in data) && typeof data.findingsCount === "number") {
    out.findingsCount = data.findingsCount;
  }
  return out;
}

function renderMarkdown(report) {
  const lines = [
    "# AgentOps Orchestrator Run",
    "",
    "## Mode",
    "",
    `- ${report.mode}`,
    "",
    "## Environment",
    "",
    `- ${report.environment} (${report.stagingProjectRef})`,
    `- Base URL: ${report.baseUrl}`,
    `- Started: ${report.startedAt}`,
    `- Ended: ${report.endedAt}`,
    "",
    "## Command Results",
    "",
  ];

  for (const row of report.commandResults) {
    lines.push(
      `- \`${row.command}\` — ${row.status} (exit ${row.exitCode})${row.reason ? ` — ${row.reason}` : ""}`,
    );
  }

  lines.push("", "## Browser Availability", "");
  lines.push(`- ${report.devServerStatus}`);

  lines.push("", "## Findings Summary", "");
  lines.push(`- Findings from reports: ${report.summaryCounts.findingsFromReports}`);
  lines.push(`- Critical findings: ${report.summaryCounts.criticalFindings}`);
  lines.push(`- Commands passed: ${report.summaryCounts.commandsPassed}`);
  lines.push(`- Commands failed: ${report.summaryCounts.commandsFailed}`);
  lines.push(`- Commands blocked: ${report.summaryCounts.commandsBlocked}`);

  lines.push("", "## Safety Confirmations", "");
  for (const item of report.safetyConfirmations) lines.push(`- ${item}`);

  lines.push("", "## Blockers", "");
  if (report.blockers.length === 0) lines.push("- None");
  for (const blocker of report.blockers) lines.push(`- ${blocker}`);

  lines.push("", "## Next Recommended Action", "", `- ${report.nextRecommendedAction}`, "");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const modesConfig = JSON.parse(fs.readFileSync(MODES_PATH, "utf8"));
  const modeDef = modesConfig.modes?.[args.mode];
  if (!modeDef) {
    console.error(`Unknown mode: ${args.mode}`);
    process.exit(1);
  }

  const commands = flattenModeSteps(args.mode, modesConfig.modes);
  for (const command of commands) {
    if (!isAllowedCommand(command, config.allowedCommands)) {
      console.error(`Command not in allowedCommands: ${command}`);
      process.exit(1);
    }
  }

  const startedAt = nowIso();
  const modeRequiresDevServer = Boolean(modeDef.requiresDevServer);
  const devServerUp = args.noBrowser ? false : await isDevServerUp(DEV_URL);
  const devServerStatus = args.noBrowser
    ? "blocked-by-flag(--no-browser)"
    : devServerUp
      ? "available"
      : "unavailable";

  const commandResults = [];
  const blockers = [];
  const timeLimitMs = Number.isFinite(args.maxMinutes) && args.maxMinutes > 0 ? args.maxMinutes * 60_000 : null;
  const runStartedMs = Date.now();

  for (const command of commands) {
    const isBrowserCommand =
      command.includes("browser") ||
      command.includes("synthetic-users-smoke") ||
      command.includes("role-workflow-safe") ||
      command.includes("write-draft-safe") ||
      command.includes("owner-smoke");

    if (timeLimitMs && Date.now() - runStartedMs > timeLimitMs) {
      commandResults.push({
        command,
        startedAt: nowIso(),
        endedAt: nowIso(),
        exitCode: null,
        status: "blocked",
        reason: "max-minutes exceeded",
        stdoutSummary: "",
        stderrSummary: "",
      });
      blockers.push("Run hit --max-minutes limit.");
      break;
    }

    if (modeRequiresDevServer && isBrowserCommand && (!devServerUp || args.noBrowser)) {
      commandResults.push({
        command,
        startedAt: nowIso(),
        endedAt: nowIso(),
        exitCode: null,
        status: "blocked",
        reason: args.noBrowser ? "browser disabled via --no-browser" : "dev server unavailable",
        stdoutSummary: "",
        stderrSummary: "",
      });
      blockers.push(`Blocked browser command: ${command}`);
      if (!args.continueOnFailure) break;
      continue;
    }

    if (args.summaryOnly) {
      commandResults.push({
        command,
        startedAt: nowIso(),
        endedAt: nowIso(),
        exitCode: null,
        status: "skipped",
        reason: "summary-only",
        stdoutSummary: "",
        stderrSummary: "",
      });
      continue;
    }

    if (args.dryRun) {
      commandResults.push({
        command,
        startedAt: nowIso(),
        endedAt: nowIso(),
        exitCode: null,
        status: "skipped",
        reason: "dry-run",
        stdoutSummary: "",
        stderrSummary: "",
      });
      continue;
    }

    const result = runCommand(command);
    commandResults.push(result);
    if (result.status === "failed") {
      blockers.push(`Command failed: ${command}`);
      if (!args.continueOnFailure) break;
    }
  }

  const reportInputsRead = [];
  let findingsFromReports = 0;
  let criticalFindings = 0;
  for (const inputPath of config.reportInputs ?? []) {
    const abs = path.join(repoRoot, inputPath);
    const data = readJsonIfExists(abs);
    if (!data) continue;
    reportInputsRead.push(inputPath);
    const summary = extractFindingsSummary(inputPath, data);
    findingsFromReports += summary.findingsCount;
    criticalFindings += summary.criticalFindings;
  }

  const summaryCounts = {
    commandsPassed: commandResults.filter((r) => r.status === "passed").length,
    commandsFailed: commandResults.filter((r) => r.status === "failed").length,
    commandsBlocked: commandResults.filter((r) => r.status === "blocked").length,
    findingsFromReports,
    criticalFindings,
  };

  const endedAt = nowIso();
  const overallStatus =
    summaryCounts.commandsFailed > 0 ? "failed" : summaryCounts.commandsBlocked > 0 ? "pass-with-follow-up" : "passed";

  const report = {
    runId: `agentops-orchestrator-${Date.now()}`,
    mode: args.mode,
    startedAt,
    endedAt,
    environment: config.environment,
    baseUrl: config.baseUrlDefault,
    stagingProjectRef: STAGING_PROJECT_REF,
    devServerStatus,
    commandResults,
    reportInputsRead,
    summaryCounts,
    safetyConfirmations: [
      "staging-only orchestration",
      "no DB imports/refill/apply/closure executed",
      "no scheduler/cron automation",
      "no Hermes/CodeGraph runtime automation",
      "no production/main operations",
    ],
    blockers,
    overallStatus,
    nextRecommendedAction:
      summaryCounts.commandsFailed > 0 || summaryCounts.commandsBlocked > 0
        ? "Review failed/blocked commands and re-run targeted mode with --continue-on-failure if needed."
        : "Review generated summaries and proceed to issue triage/import planning.",
  };

  const outputFolder = path.join(repoRoot, config.outputFolder);
  fs.mkdirSync(outputFolder, { recursive: true });
  const jsonPath = path.join(outputFolder, "agentops-orchestrator-run.json");
  const mdPath = path.join(outputFolder, "agentops-orchestrator-run.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdown(report));

  console.log(`Mode: ${args.mode}`);
  console.log(`Status: ${overallStatus}`);
  console.log(`Commands: ${commandResults.length}`);
  console.log(`Report JSON: ${rel(jsonPath)}`);
  console.log(`Report MD: ${rel(mdPath)}`);

  process.exit(summaryCounts.commandsFailed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
