/**
 * Phase 5E — insert monitoring memory proposals from latest GHA dry-run JSON.
 * Usage: npx tsx scripts/agentops-monitoring-gha-memory-proposals-insert.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { assertMonitoringRunIndexSupabaseAllowed } from "../src/lib/agentops/runtime/agentOpsMonitoringRunIndex";
import {
  extractMemoryProposalCandidatesFromReport,
  insertMonitoringMemoryProposals,
  patchMonitoringRunMemoryProposalSummary,
} from "../src/lib/agentops/runtime/agentOpsMonitoringMemoryProposals";
import type { MonitoringScheduledRunReport } from "../src/lib/agentops/runtime/agentOpsMonitoringScheduledReport";

const REPO_ROOT = process.cwd();
const REPORT_DIR = join(REPO_ROOT, "qa-agent", "reports", "runtime");

async function readLatestReport(): Promise<MonitoringScheduledRunReport | null> {
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
  const raw = await readFile(join(REPORT_DIR, jsonFiles[0]), "utf8");
  return JSON.parse(raw) as MonitoringScheduledRunReport;
}

async function main(): Promise<void> {
  const allowed = assertMonitoringRunIndexSupabaseAllowed(process.env);
  if (!allowed.ok) {
    console.error("[agentops-monitoring-memory-proposals] Blocked:", allowed.error);
    process.exit(1);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) {
    console.error(
      "[agentops-monitoring-memory-proposals] Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL.",
    );
    process.exit(1);
  }

  const report = await readLatestReport();
  if (!report) {
    console.error(
      "[agentops-monitoring-memory-proposals] No monitoring-scheduled-dry-run JSON report found.",
    );
    process.exit(1);
  }

  if (!report.dryRun || !report.productionBlocked) {
    console.error(
      "[agentops-monitoring-memory-proposals] Refusing: dryRun and productionBlocked required.",
    );
    process.exit(1);
  }

  if (report.actualMemoryWrites > 0) {
    console.error("[agentops-monitoring-memory-proposals] Refusing: actualMemoryWrites must be 0.");
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: runRow } = await client
    .from("agentops_monitoring_runs")
    .select("id")
    .eq("run_id", report.runId)
    .maybeSingle();

  const candidates = extractMemoryProposalCandidatesFromReport(report);
  const totalFindings = report.agentsRun.reduce((sum, agent) => sum + (agent.findings?.length ?? 0), 0);

  const inserted = await insertMonitoringMemoryProposals(client, report, candidates, {
    monitoringRunId: runRow?.id ?? null,
    githubRunId: process.env.GITHUB_RUN_ID?.trim() ?? null,
    source: "monitoring",
  });

  const skippedPolicy =
    totalFindings > 0 && candidates.length === 0
      ? totalFindings
      : inserted.skippedPolicy;

  await patchMonitoringRunMemoryProposalSummary(client, report.runId, {
    memoryProposalsCreated: inserted.created,
    memoryProposalsSkippedDuplicate: inserted.skippedDuplicate,
    memoryProposalsSkippedPolicy: skippedPolicy,
    memoryProposalsErrors: inserted.errors.length,
  });

  console.log(
    "[agentops-monitoring-memory-proposals]",
    "created=",
    inserted.created,
    "skippedDuplicate=",
    inserted.skippedDuplicate,
    "skippedPolicy=",
    skippedPolicy,
    "errors=",
    inserted.errors.length,
    "candidates=",
    candidates.length,
  );

  if (inserted.errors.length > 0) {
    for (const err of inserted.errors) {
      console.error("[agentops-monitoring-memory-proposals] error:", err);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    "[agentops-monitoring-memory-proposals] Unexpected error:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
