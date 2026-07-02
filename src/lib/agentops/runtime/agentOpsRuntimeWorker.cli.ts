#!/usr/bin/env node
/**
 * Node CLI entry for AgentOps runtime worker.
 *
 * Usage:
 *   npx tsx src/lib/agentops/runtime/agentOpsRuntimeWorker.cli.ts --once
 *   npx tsx ... --once --manual          (default manual tick)
 *   npx tsx ... --once --scheduled       (scheduled monitoring tick)
 *   npx tsx ... --loop --scheduled       (long-running scheduled loop)
 *   npx tsx ... --loop --continuous      (long-running continuous; Level 2+)
 *   npx tsx ... --dry-run
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScheduledMonitoringTick } from "./agentOpsRuntimeEngine";
import { startAgentRuntime } from "./agentOpsRuntimeWorker";
import { createAgentOpsRuntimeSupabaseClient } from "./agentOpsRuntimeSupabase";
import { loadAgentOpsMonitoringRuntimeConfig } from "./agentOpsMonitoringRuntimeConfig";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..", "..");

function loadEnvFile(filename: string): void {
  const path = join(repoRoot, filename);
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

async function main(): Promise<void> {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  if (!process.env.AGENTOPS_STAGING_SUPABASE_PROJECT_REF) {
    const url = process.env.VITE_SUPABASE_URL ?? "";
    if (url.includes("ydppcpbxrvvardeslzrk")) {
      process.env.AGENTOPS_STAGING_SUPABASE_PROJECT_REF = "ydppcpbxrvvardeslzrk";
    }
  }

  const argv = process.argv.slice(2);
  const once = hasFlag(argv, "--once");
  const loop = hasFlag(argv, "--loop");
  const scheduled = hasFlag(argv, "--scheduled");
  const continuous = hasFlag(argv, "--continuous");
  const dryRun = hasFlag(argv, "--dry-run");

  if (dryRun) {
    process.env.AGENTOPS_MONITORING_DRY_RUN = "true";
  }

  const monitoringConfig = loadAgentOpsMonitoringRuntimeConfig();

  if (once && scheduled) {
    const bootstrap = createAgentOpsRuntimeSupabaseClient();
    if (!bootstrap.ok) throw new Error(bootstrap.error);
    const tick = await runScheduledMonitoringTick(bootstrap.client, {
      dryRun: monitoringConfig.effectiveDryRun,
      monitoringConfig,
    });
    if (tick.errors.length > 0) {
      console.error("[agentops-runtime] scheduled tick errors:", tick.errors);
      process.exitCode = 2;
    }
    return;
  }

  if (loop && (scheduled || continuous)) {
    await startAgentRuntime({
      dryRun: monitoringConfig.effectiveDryRun,
      monitoringConfig,
    });
    return;
  }

  await startAgentRuntime({
    once: once || !loop,
    dryRun: monitoringConfig.effectiveDryRun,
    monitoringConfig,
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[agentops-runtime] fatal:", message);
  process.exitCode = 1;
});
