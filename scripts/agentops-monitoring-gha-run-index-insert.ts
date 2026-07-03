/**
 * Phase 5B — insert latest GHA monitoring dry-run JSON into staging Supabase run index.
 * Usage: npx tsx scripts/agentops-monitoring-gha-run-index-insert.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  assertMonitoringRunIndexSupabaseAllowed,
  buildMonitoringRunIndexRecord,
  insertMonitoringRunIndexRecord,
} from "../src/lib/agentops/runtime/agentOpsMonitoringRunIndex";
import type { MonitoringScheduledRunReport } from "../src/lib/agentops/runtime/agentOpsMonitoringScheduledReport";

const REPO_ROOT = process.cwd();
const REPORT_DIR = join(REPO_ROOT, "qa-agent", "reports", "runtime");

async function readLatestReport(): Promise<{
  filename: string;
  report: MonitoringScheduledRunReport;
} | null> {
  let entries: string[];
  try {
    entries = await readdir(REPORT_DIR);
  } catch {
    return null;
  }
  const jsonFiles = entries
    .filter((name) => name.startsWith("monitoring-scheduled-dry-run-") && name.endsWith(".json"))
    .sort()
    .reverse();
  if (jsonFiles.length === 0) return null;
  const filename = jsonFiles[0];
  const raw = await readFile(join(REPORT_DIR, filename), "utf8");
  return { filename, report: JSON.parse(raw) as MonitoringScheduledRunReport };
}

function buildGithubRunUrl(): string | null {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) return null;
  return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
}

async function main(): Promise<void> {
  const allowed = assertMonitoringRunIndexSupabaseAllowed(process.env);
  if (!allowed.ok) {
    console.error("[agentops-monitoring-run-index] Blocked:", allowed.error);
    process.exit(1);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) {
    console.error("[agentops-monitoring-run-index] Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL.");
    process.exit(1);
  }

  const latest = await readLatestReport();
  if (!latest) {
    console.error("[agentops-monitoring-run-index] No monitoring-scheduled-dry-run JSON report found.");
    process.exit(1);
  }

  const { report, filename } = latest;
  if (!report.dryRun) {
    console.error("[agentops-monitoring-run-index] Refusing index insert: dryRun is false.");
    process.exit(1);
  }

  const record = buildMonitoringRunIndexRecord(report, {
    source: "github_actions",
    mode: "scheduled_dry_run",
    githubRunId: process.env.GITHUB_RUN_ID?.trim() ?? null,
    githubRunUrl: buildGithubRunUrl(),
    artifactName: process.env.GITHUB_RUN_ID
      ? `agentops-monitoring-scheduled-dry-run-${process.env.GITHUB_RUN_ID}`
      : filename,
  });

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const inserted = await insertMonitoringRunIndexRecord(client, record, process.env);
  if (!inserted.ok) {
    console.error("[agentops-monitoring-run-index] Insert failed:", inserted.error);
    process.exit(1);
  }

  console.log(
    "[agentops-monitoring-run-index] Indexed run",
    inserted.row.run_id,
    "status=",
    inserted.row.status,
    "dry_run=",
    inserted.row.dry_run,
  );
}

main().catch((error) => {
  console.error("[agentops-monitoring-run-index] Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
