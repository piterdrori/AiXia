/**
 * Phase E-A2 — safe promote smoke on a dedicated test-labeled draft.
 * Creates → approve → promote → re-promote blocked. No PR/deploy/auto-fix.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

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

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const url = process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const service =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.STAGING_SUPABASE_ANON_KEY;
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;

if (!url || !service || !anon || !email || !password) {
  console.error(
    JSON.stringify({
      ok: false,
      blocker: "Missing staging Supabase service role and/or owner credentials for promote smoke.",
    }),
  );
  process.exit(2);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ownerClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runId = `e-a2-promote-smoke-${stamp}`;
const duplicateKey = `e-a2-test-promote-${stamp}`;
const title = `[E-A2 TEST] Promote smoke ${stamp}`;

const { data: inserted, error: insertError } = await admin
  .from("agentops_monitoring_issue_drafts")
  .insert({
    run_id: runId,
    source: "owner_manual_browser_qa",
    status: "draft",
    agent_slug: "qa-agent",
    module: "agent-ops",
    route: "/system/agent-ops/issues",
    issue_type: "failed_requests",
    severity: "low",
    title,
    summary:
      "Dedicated E-A2 promote smoke draft. Safe test only — not a real product defect.",
    evidence: {
      ownerManual: true,
      evidence: "GET /api/agentops/monitoring/status — synthetic 500 for promote smoke",
      eA2Test: true,
    },
    browser_qa_evidence: {
      scan_mode: "playwright",
      route: "/system/agent-ops/issues",
      type: "failed_requests",
      evidence: "GET /api/agentops/monitoring/status — synthetic 500 for promote smoke",
      source: "owner_manual_browser_qa",
      summary: "Synthetic Browser QA evidence for E-A2 promote smoke.",
    },
    suggested_fix_prompt:
      "Staging-only investigation prompt for E-A2 promote smoke. Do not touch production.",
    confidence: 0.4,
    duplicate_key: duplicateKey,
  })
  .select("*")
  .single();

if (insertError || !inserted?.id) {
  console.error(JSON.stringify({ ok: false, step: "insert", error: insertError?.message }));
  process.exit(2);
}

const draftId = inserted.id;
const { data: authData, error: authError } = await ownerClient.auth.signInWithPassword({
  email,
  password,
});
if (authError) {
  console.error(JSON.stringify({ ok: false, step: "login", error: authError.message }));
  process.exit(2);
}
const headers = {
  Authorization: `Bearer ${authData.session.access_token}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

const approve = await fetch(`${base}/api/agentops/monitoring/drafts/decision`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    draftId,
    decision: "owner_approved",
    note: "E-A2 promote smoke approval",
  }),
});
const approveJson = await approve.json();

const promote = await fetch(`${base}/api/agentops/monitoring/drafts/promote`, {
  method: "POST",
  headers,
  body: JSON.stringify({ draftId }),
});
const promoteJson = await promote.json();

const rePromote = await fetch(`${base}/api/agentops/monitoring/drafts/promote`, {
  method: "POST",
  headers,
  body: JSON.stringify({ draftId }),
});
const rePromoteJson = await rePromote.json();

const report = {
  at: new Date().toISOString(),
  base,
  draftId,
  runId,
  title,
  approveStatus: approve.status,
  approveOk: approveJson.ok === true,
  promoteStatus: promote.status,
  promoteOk: promoteJson.ok === true,
  issueDisplayCode: promoteJson.issueDisplayCode ?? null,
  promotedIssueId: promoteJson.issueId ?? promoteJson.promotedIssueId ?? null,
  promoteError: promoteJson.error ?? null,
  rePromoteStatus: rePromote.status,
  rePromoteOk: rePromoteJson.ok === true,
  rePromoteError: rePromoteJson.error ?? null,
  noAutoFix: true,
  noPr: true,
  noDeploy: true,
};

const outPath = path.join(
  "qa-agent",
  "reports",
  "runtime",
  `phase-e-a2-promote-smoke-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, ...report }, null, 2));

const ok =
  report.approveOk &&
  report.promoteOk &&
  report.rePromoteOk === false &&
  typeof report.rePromoteError === "string";
process.exit(ok ? 0 : 2);
