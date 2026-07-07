#!/usr/bin/env node
/**
 * Phase 5H — daily 12-agent review npm runner.
 * Usage: node scripts/agentops-monitoring-daily-12-agent-run.mjs [gha|local]
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const workerCli = join(repoRoot, "src/lib/agentops/runtime/agentOpsDaily12AgentReview.cli.ts");

const presetName = process.argv[2] ?? "gha";
const agentScope = process.env.AGENTOPS_DAILY_AGENT_SCOPE?.trim() ?? "all";
const forceRetry = process.env.AGENTOPS_DAILY_FORCE_RETRY?.trim() ?? "false";

const PRESETS = {
  gha: {
    env: {
      AGENTOPS_ENVIRONMENT: "staging",
      AGENTOPS_MONITORING_MODE: "daily_12_agent_review",
      AGENTOPS_MONITORING_SCHEDULED: "true",
      AGENTOPS_MONITORING_SCHEDULED_ENABLED: "true",
      AGENTOPS_MONITORING_CONTINUOUS: "false",
      AGENTOPS_MONITORING_CONTINUOUS_ENABLED: "false",
      AGENTOPS_MONITORING_DRY_RUN: "true",
      AGENTOPS_MONITORING_LEVEL: "1",
      AGENTOPS_RUNTIME_ALLOW_REMOTE_STAGING: "true",
      AGENTOPS_DAILY_AGENT_SCOPE: agentScope,
      AGENTOPS_DAILY_FORCE_RETRY: forceRetry,
    },
    args: [],
  },
  local: {
    env: {
      AGENTOPS_ENVIRONMENT: "staging",
      AGENTOPS_MONITORING_MODE: "daily_12_agent_review",
      AGENTOPS_MONITORING_DRY_RUN: "true",
      AGENTOPS_MONITORING_TARGET_BASE_URL: "http://127.0.0.1:5173",
      AGENTOPS_DAILY_AGENT_SCOPE: agentScope,
      AGENTOPS_DAILY_FORCE_RETRY: forceRetry,
    },
    args: [],
  },
};

const preset = PRESETS[presetName];
if (!preset) {
  console.error(`[agentops-daily-12] Unknown preset "${presetName}". Use: gha, local`);
  process.exit(1);
}

if (!existsSync(workerCli)) {
  console.error("[agentops-daily-12] CLI not found:", workerCli);
  process.exit(1);
}

const mergedEnv = { ...process.env, ...preset.env };

if (presetName === "gha") {
  const target =
    mergedEnv.AGENTOPS_MONITORING_TARGET_BASE_URL?.trim() ||
    mergedEnv.AGENTOPS_QA_BASE_URL?.trim() ||
    "";
  if (!target) {
    console.error("[agentops-daily-12] gha preset requires AGENTOPS_QA_BASE_URL or AGENTOPS_MONITORING_TARGET_BASE_URL.");
    process.exit(1);
  }
  mergedEnv.AGENTOPS_MONITORING_TARGET_BASE_URL = target;
  if (mergedEnv.AGENTOPS_MONITORING_DRY_RUN?.trim().toLowerCase() !== "true") {
    console.error("[agentops-daily-12] gha preset requires AGENTOPS_MONITORING_DRY_RUN=true.");
    process.exit(1);
  }
}

const extraArgs = [
  ...preset.args,
  `--agent-scope=${agentScope}`,
  ...(forceRetry === "true" ? ["--force-retry"] : []),
];

function quoteForShell(value) {
  if (process.platform === "win32") {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

const command = `npx tsx ${quoteForShell(workerCli)} ${extraArgs.map(quoteForShell).join(" ")}`;

const child = spawn(command, [], {
  cwd: repoRoot,
  stdio: "inherit",
  env: mergedEnv,
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
