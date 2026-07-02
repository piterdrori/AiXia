#!/usr/bin/env node
/**
 * Phase 3 scheduled monitoring CLI.
 *
 * Usage:
 *   npx tsx src/lib/agentops/runtime/agentOpsMonitoringScheduledWorker.cli.ts --once --dry-run
 *   npx tsx ... --loop --dry-run --max-ticks 1
 *   npx tsx ... --once   (requires AGENTOPS_OWNER_APPROVED_MONITORING_WRITE=true when dry-run false)
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScheduledMonitoringActivation } from "./agentOpsMonitoringScheduledWorker";

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

function readIntFlag(argv: string[], flag: string, fallback: number): number {
  const index = argv.indexOf(flag);
  if (index === -1 || index + 1 >= argv.length) return fallback;
  const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main(): Promise<void> {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const argv = process.argv.slice(2);
  const mode = hasFlag(argv, "--loop") ? "loop" : "once";
  const dryRunFlag = hasFlag(argv, "--dry-run");
  const dryRunFalseFlag = hasFlag(argv, "--no-dry-run");

  if (dryRunFlag) process.env.AGENTOPS_MONITORING_DRY_RUN = "true";
  if (dryRunFalseFlag) process.env.AGENTOPS_MONITORING_DRY_RUN = "false";

  const strictOwnerApproval = hasFlag(argv, "--require-owner-approval");
  const maxLoopTicks = readIntFlag(argv, "--max-ticks", mode === "loop" ? 1 : 1);

  const result = await runScheduledMonitoringActivation({
    mode,
    strictOwnerApproval,
    maxLoopTicks,
  });

  if (result.reportPath) {
    console.info(`[agentops-monitoring] report written: ${result.reportPath}`);
  }

  process.exitCode = result.exitCode;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[agentops-monitoring] fatal:", message);
  process.exitCode = 1;
});
