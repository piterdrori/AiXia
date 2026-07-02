#!/usr/bin/env node
/**
 * Phase 3 scheduled monitoring npm script runner — sets env presets then spawns CLI.
 *
 * Usage: node scripts/agentops-monitoring-scheduled-run.mjs <preset>
 * Presets: dry-run-once | dry-run-loop | gha-dry-run | once | blocked-write-test
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const workerCli = join(
  repoRoot,
  "src/lib/agentops/runtime/agentOpsMonitoringScheduledWorker.cli.ts",
);

const PRESETS = {
  "dry-run-once": {
    env: {
      AGENTOPS_MONITORING_LEVEL: "1",
      AGENTOPS_MONITORING_SCHEDULED_ENABLED: "true",
      AGENTOPS_MONITORING_CONTINUOUS_ENABLED: "false",
      AGENTOPS_MONITORING_DRY_RUN: "true",
      AGENTOPS_MONITORING_TARGET_BASE_URL: "http://127.0.0.1:5173",
    },
    args: ["--once", "--dry-run"],
  },
  "dry-run-loop": {
    env: {
      AGENTOPS_MONITORING_LEVEL: "1",
      AGENTOPS_MONITORING_SCHEDULED_ENABLED: "true",
      AGENTOPS_MONITORING_CONTINUOUS_ENABLED: "false",
      AGENTOPS_MONITORING_DRY_RUN: "true",
      AGENTOPS_MONITORING_TARGET_BASE_URL: "http://127.0.0.1:5173",
    },
    args: ["--loop", "--dry-run", "--max-ticks", "1"],
  },
  "gha-dry-run": {
    env: {
      AGENTOPS_MONITORING_LEVEL: "1",
      AGENTOPS_MONITORING_SCHEDULED_ENABLED: "true",
      AGENTOPS_MONITORING_CONTINUOUS_ENABLED: "false",
      AGENTOPS_MONITORING_DRY_RUN: "true",
      AGENTOPS_RUNTIME_ALLOW_REMOTE_STAGING: "true",
    },
    args: ["--once", "--dry-run"],
  },
  once: {
    env: {
      AGENTOPS_MONITORING_LEVEL: "1",
      AGENTOPS_MONITORING_SCHEDULED_ENABLED: "true",
      AGENTOPS_MONITORING_CONTINUOUS_ENABLED: "false",
      AGENTOPS_MONITORING_DRY_RUN: "false",
      AGENTOPS_MONITORING_TARGET_BASE_URL: "http://127.0.0.1:5173",
    },
    args: ["--once", "--no-dry-run", "--require-owner-approval"],
  },
  "blocked-write-test": {
    env: {
      AGENTOPS_MONITORING_LEVEL: "1",
      AGENTOPS_MONITORING_SCHEDULED_ENABLED: "true",
      AGENTOPS_MONITORING_CONTINUOUS_ENABLED: "false",
      AGENTOPS_MONITORING_DRY_RUN: "false",
      AGENTOPS_OWNER_APPROVED_MONITORING_WRITE: "false",
      AGENTOPS_MONITORING_TARGET_BASE_URL: "http://127.0.0.1:5173",
    },
    args: ["--once", "--no-dry-run"],
  },
};

function quoteForShell(value) {
  if (process.platform === "win32") {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

const presetName = process.argv[2];
const preset = PRESETS[presetName];

if (!preset) {
  console.error(
    `[agentops-monitoring] Unknown preset "${presetName}". Use: ${Object.keys(PRESETS).join(", ")}`,
  );
  process.exit(1);
}

if (!existsSync(workerCli)) {
  console.error("[agentops-monitoring] CLI not found:", workerCli);
  process.exit(1);
}

const mergedEnv = { ...process.env, ...preset.env };

if (presetName === "gha-dry-run") {
  const target =
    mergedEnv.AGENTOPS_MONITORING_TARGET_BASE_URL?.trim() ||
    mergedEnv.AGENTOPS_QA_BASE_URL?.trim() ||
    "";
  if (!target) {
    console.error(
      "[agentops-monitoring] gha-dry-run requires AGENTOPS_MONITORING_TARGET_BASE_URL or AGENTOPS_QA_BASE_URL.",
    );
    process.exit(1);
  }
  mergedEnv.AGENTOPS_MONITORING_TARGET_BASE_URL = target;
  if (mergedEnv.AGENTOPS_MONITORING_DRY_RUN?.trim().toLowerCase() !== "true") {
    console.error("[agentops-monitoring] gha-dry-run requires AGENTOPS_MONITORING_DRY_RUN=true.");
    process.exit(1);
  }
  if (mergedEnv.AGENTOPS_OWNER_APPROVED_MONITORING_WRITE?.trim().toLowerCase() === "true") {
    console.error(
      "[agentops-monitoring] gha-dry-run must not set AGENTOPS_OWNER_APPROVED_MONITORING_WRITE=true.",
    );
    process.exit(1);
  }
}

const extraArgs = preset.args.map(quoteForShell).join(" ");
const command = `npx tsx ${quoteForShell(workerCli)}${extraArgs ? ` ${extraArgs}` : ""}`;

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
