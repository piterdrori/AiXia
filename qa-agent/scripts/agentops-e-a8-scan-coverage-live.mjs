/**
 * E-A8 — live proof for scan coverage + never-empty scans.
 * Creates a scheduled-shaped browser_qa run with multiple routes, executes the
 * real engine, and asserts: all routes scanned + issues or improvements recorded.
 */
import { spawnSync } from "node:child_process";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile("qa-agent/browser-qa/.env.owner.local");

const url = process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const service =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("Missing staging Supabase env.");
  process.exit(2);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const stamp = Date.now();
const runId = `e-a8-coverage-${stamp}`;
const routes = (process.env.AGENTOPS_E_A8_ROUTES || "/system/agent-ops,/system/agent-ops/issues")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

const { error: insertError } = await admin.from("agentops_monitoring_runs").insert({
  run_id: runId,
  mode: "scheduled_single_agent",
  status: "running",
  source: "staging_worker",
  level: 1,
  dry_run: true,
  target_base_url: "https://ai-xia-staging.vercel.app",
  target_class: "staging",
  production_blocked: true,
  production_guard_active: true,
  production_target_rejected: false,
  started_at: new Date().toISOString(),
  summary: {
    workType: "browser_qa",
    workerPhase: "b2-d",
    executionEngine: "browser_qa",
    agentSlug: "qa-agent",
    runtimeAgentId: "qa-agent",
    trigger: "schedule",
    selectedRoutes: routes,
    scope: { type: "selected_routes", routes },
    eA8Test: true,
  },
});
if (insertError) {
  console.error(`Run insert failed: ${insertError.message}`);
  process.exit(2);
}

const engine = spawnSync(
  "npx",
  ["tsx", "scripts/agentops-manual-run-browser-qa-engine.ts", "--run-id", runId],
  { encoding: "utf8", shell: true, timeout: 15 * 60 * 1000 },
);
const engineOut = `${engine.stdout || ""}\n${engine.stderr || ""}`;

const { data: runRow } = await admin
  .from("agentops_monitoring_runs")
  .select("status, findings_count, summary")
  .eq("run_id", runId)
  .maybeSingle();

const summary = runRow?.summary ?? {};
const evidence = summary.evidenceSummary ?? {};
const { data: drafts } = await admin
  .from("agentops_monitoring_issue_drafts")
  .select("id, issue_type, severity, title, route")
  .eq("run_id", runId);

const report = {
  at: new Date().toISOString(),
  runId,
  engineExit: engine.status,
  runStatus: runRow?.status ?? null,
  routesRequested: routes,
  routesChecked: summary.routesChecked ?? null,
  perRouteResults: summary.perRouteResults ?? null,
  findingsCount: runRow?.findings_count ?? null,
  draftsCreated: evidence.draftsCreated ?? null,
  improvementDraftsCreated: evidence.improvementDraftsCreated ?? null,
  improvementDraftsSkippedDuplicate: evidence.improvementDraftsSkippedDuplicate ?? null,
  improvementNote: evidence.improvementNote ?? null,
  draftsInDb: (drafts ?? []).map((d) => ({
    issueType: d.issue_type,
    severity: d.severity,
    route: d.route,
    title: String(d.title).slice(0, 90),
  })),
};

const allRoutesScanned =
  Array.isArray(report.routesChecked) &&
  routes.every((route) => report.routesChecked.includes(route)) &&
  Array.isArray(report.perRouteResults) &&
  report.perRouteResults.length === routes.length;

const neverEmpty =
  (report.draftsCreated ?? 0) > 0 ||
  (report.improvementDraftsCreated ?? 0) > 0 ||
  (report.improvementDraftsSkippedDuplicate ?? 0) > 0;

report.ok =
  engine.status === 0 &&
  report.runStatus === "completed" &&
  allRoutesScanned &&
  neverEmpty;

if (!report.ok) report.engineOutTail = engineOut.slice(-1200);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 2);
