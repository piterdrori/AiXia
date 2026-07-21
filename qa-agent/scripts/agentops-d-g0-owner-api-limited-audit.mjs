/**
 * D-G0 — limited website audits via owner API (worker-claimable), then wait.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

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
loadAgentOpsOwnerEnv();

const client = createClient(
  process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function token() {
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env.AGENTOPS_QA_OWNER_EMAIL,
    password: process.env.AGENTOPS_QA_OWNER_PASSWORD,
  });
  if (error) throw error;
  return data.session.access_token;
}

async function start(tok, agentSlug, route) {
  const res = await fetch("https://ai-xia-staging.vercel.app/api/agentops/monitoring/manual-run", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${tok}`,
    },
    body: JSON.stringify({
      agentSlug,
      workType: "website_audit",
      scope: { type: "selected_routes", routes: [route] },
      maxDurationMinutes: 10,
      avoidOverlap: true,
      requestedBy: "d-g0-limited-owner-api",
    }),
  });
  return { status: res.status, payload: await res.json() };
}

async function wait(runId) {
  const startAt = Date.now();
  while (Date.now() - startAt < 240_000) {
    const { data } = await client
      .from("agentops_monitoring_runs")
      .select("run_id, status, summary")
      .eq("run_id", runId)
      .maybeSingle();
    const st = String(data?.status || "").toLowerCase();
    if (["completed", "failed", "canceled", "cancelled"].includes(st)) return data;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

const tok = await token();
const jobs = [
  { slug: "system-agent", route: "/system/agent-ops" },
  { slug: "system-agent", route: "/system/agent-ops/agents" },
];
const results = [];
for (const job of jobs) {
  const accept = await start(tok, job.slug, job.route);
  const runId = accept.payload?.runId;
  const terminal = runId ? await wait(runId) : null;
  results.push({
    route: job.route,
    acceptStatus: accept.status,
    runId,
    accepted: accept.payload?.accepted === true,
    message: accept.payload?.message || null,
    terminalStatus: terminal?.status ?? null,
    rawObs: (terminal?.summary?.rawObservations || []).slice(0, 4),
  });
}

const out = {
  at: new Date().toISOString(),
  ok: results.every((r) => ["completed", "failed"].includes(String(r.terminalStatus || "").toLowerCase())),
  results,
};
const outPath = path.join(
  "qa-agent",
  "reports",
  "runtime",
  `phase-d-g0-owner-api-limited-audit-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ outPath, ...out }, null, 2));
process.exit(out.ok ? 0 : 1);
