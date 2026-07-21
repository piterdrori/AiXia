/**
 * E-A2 — owner API probe for needs_more_info + mark_duplicate on dedicated drafts.
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
  console.error("Missing env");
  process.exit(2);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const ownerClient = createClient(url, anon, { auth: { persistSession: false } });
const stamp = Date.now();

async function insertDraft(suffix) {
  const { data, error } = await admin
    .from("agentops_monitoring_issue_drafts")
    .insert({
      run_id: `e-a2-decision-${suffix}-${stamp}`,
      source: "owner_manual_browser_qa",
      status: "draft",
      agent_slug: "qa-agent",
      module: "agent-ops",
      route: "/system/agent-ops/issues",
      issue_type: "failed_requests",
      severity: "low",
      title: `[E-A2 TEST] ${suffix} ${stamp}`,
      summary: "Dedicated E-A2 decision action smoke draft.",
      evidence: { eA2Test: true, evidence: "synthetic" },
      browser_qa_evidence: {
        scan_mode: "playwright",
        route: "/system/agent-ops/issues",
        type: "failed_requests",
        evidence: "synthetic",
        source: "owner_manual_browser_qa",
      },
      suggested_fix_prompt: "Staging-only test prompt.",
      confidence: 0.3,
      duplicate_key: `e-a2-${suffix}-${stamp}`,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

const targetId = await insertDraft("dup-target");
const subjectId = await insertDraft("dup-subject");
const moreInfoId = await insertDraft("needs-info");

const { data: auth, error: authError } = await ownerClient.auth.signInWithPassword({
  email,
  password,
});
if (authError) throw new Error(authError.message);
const headers = {
  Authorization: `Bearer ${auth.session.access_token}`,
  "Content-Type": "application/json",
};

const needs = await fetch(`${base}/api/agentops/monitoring/drafts/decision`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    draftId: moreInfoId,
    decision: "needs_more_info",
    note: "Need clearer reproduction steps.",
  }),
});
const needsJson = await needs.json();

const dup = await fetch(`${base}/api/agentops/monitoring/drafts/decision`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    draftId: subjectId,
    decision: "mark_duplicate",
    duplicateOf: targetId,
    note: "Duplicate of target test draft.",
  }),
});
const dupJson = await dup.json();

const report = {
  at: new Date().toISOString(),
  needsStatus: needs.status,
  needsOk: needsJson.ok === true,
  needsKind: needsJson.ownerDecisionKind ?? null,
  needsMessage: needsJson.message ?? null,
  needsDraftStatus: needsJson.draft?.status ?? null,
  dupStatus: dup.status,
  dupOk: dupJson.ok === true,
  dupKind: dupJson.ownerDecisionKind ?? null,
  dupOf: dupJson.draft?.duplicateOf ?? null,
  targetId,
  subjectId,
  moreInfoId,
};

const outPath = path.join(
  "qa-agent",
  "reports",
  "runtime",
  `phase-e-a2-decision-actions-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, ...report }, null, 2));
process.exit(
  report.needsOk &&
    report.dupOk &&
    report.needsDraftStatus === "deferred" &&
    report.dupOf === targetId
    ? 0
    : 2,
);
