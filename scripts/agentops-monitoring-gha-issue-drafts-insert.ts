/**
 * Phase 5C — insert monitoring issue drafts from latest GHA dry-run JSON.
 * Usage: npx tsx scripts/agentops-monitoring-gha-issue-drafts-insert.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  assertMonitoringRunIndexSupabaseAllowed,
} from "../src/lib/agentops/runtime/agentOpsMonitoringRunIndex";
import {
  extractDraftCandidatesForReport,
  insertMonitoringIssueDrafts,
  patchMonitoringRunDraftSummary,
} from "../src/lib/agentops/runtime/agentOpsMonitoringIssueDrafts";
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
    console.error("[agentops-monitoring-issue-drafts] Blocked:", allowed.error);
    process.exit(1);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) {
    console.error("[agentops-monitoring-issue-drafts] Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL.");
    process.exit(1);
  }

  const report = await readLatestReport();
  if (!report) {
    console.error("[agentops-monitoring-issue-drafts] No monitoring-scheduled-dry-run JSON report found.");
    process.exit(1);
  }

  if (!report.dryRun || !report.productionBlocked) {
    console.error("[agentops-monitoring-issue-drafts] Refusing: dryRun and productionBlocked required.");
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

  const candidates = extractDraftCandidatesForReport(report);
  const isWeekly = report.scheduleMeta?.monitoringMode === "weekly_improvement";
  const skippedPolicy =
    report.agentsRun.reduce((sum, agent) => sum + (agent.findings?.length ?? 0), 0) - candidates.length;

  const inserted = await insertMonitoringIssueDrafts(client, report, candidates, {
    monitoringRunId: runRow?.id ?? null,
    githubRunId: process.env.GITHUB_RUN_ID?.trim() ?? null,
    source: isWeekly ? "monitoring_weekly_improvement" : "monitoring_dry_run",
  });

  const errorDraftsCreated = isWeekly ? 0 : inserted.created;
  const improvementProposalsCreated = isWeekly ? inserted.created : 0;

  await patchMonitoringRunDraftSummary(client, report.runId, {
    findingsDetected: report.findingsCount,
    newDraftsCreated: inserted.created,
    duplicatesSkipped: inserted.skippedDuplicate,
    issueDraftsCreated: errorDraftsCreated,
    improvementProposalsCreated,
    improvementProposalsSkippedDuplicate: isWeekly ? inserted.skippedDuplicate : 0,
    issueDraftsSkippedDuplicate: isWeekly ? 0 : inserted.skippedDuplicate,
    issueDraftsSkippedPolicy: skippedPolicy + inserted.skippedPolicy,
    issueDraftsErrors: inserted.errors.length,
  });

  console.log(
    "[agentops-monitoring-issue-drafts]",
    "created=",
    inserted.created,
    "skippedDuplicate=",
    inserted.skippedDuplicate,
    "skippedPolicy=",
    skippedPolicy + inserted.skippedPolicy,
    "errors=",
    inserted.errors.length,
    "candidates=",
    candidates.length,
  );

  if (inserted.errors.length > 0) {
    for (const err of inserted.errors) console.error("[agentops-monitoring-issue-drafts] error:", err);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    "[agentops-monitoring-issue-drafts] Unexpected error:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
