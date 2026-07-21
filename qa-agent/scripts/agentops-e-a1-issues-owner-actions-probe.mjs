/**
 * Phase E-A1 — owner API probe: get-by-id, save prompt, promote clear reason.
 * Does not approve/reject. Does not print secrets.
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

loadEnvFile(path.resolve(".env.local"));
loadEnvFile(path.resolve("qa-agent/browser-qa/.env.owner.local"));

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const url = process.env.VITE_SUPABASE_URL || process.env.STAGING_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.STAGING_SUPABASE_ANON_KEY;
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const draftId = "21109c88-4ca6-4afa-9546-f7db66f8bc13";

if (!url || !anon || !email || !password) {
  console.error("Missing owner/supabase env");
  process.exit(2);
}

const sb = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await sb.auth.signInWithPassword({ email, password });
if (error) {
  console.error(JSON.stringify({ ok: false, step: "login", error: error.message }));
  process.exit(2);
}

const token = data.session.access_token;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

const get = await fetch(`${base}/api/agentops/monitoring/drafts?id=${draftId}`, { headers });
const getJson = await get.json();
const basePrompt =
  (typeof getJson.draft?.suggestedFixPrompt === "string" &&
    getJson.draft.suggestedFixPrompt.trim()) ||
  "Investigate this AgentOps draft issue on staging only. Do not touch production.";
const promptText = `${basePrompt}\n\n[E-A1 prompt-save probe ${new Date().toISOString()}]`;

const save = await fetch(`${base}/api/agentops/monitoring/drafts/prompt`, {
  method: "POST",
  headers,
  body: JSON.stringify({ draftId, promptText, ownerId: "spoofed-owner" }),
});
const saveJson = await save.json();

const promote = await fetch(`${base}/api/agentops/monitoring/drafts/promote`, {
  method: "POST",
  headers,
  body: JSON.stringify({ draftId, ownerId: "spoofed-owner" }),
});
const promoteJson = await promote.json();

const report = {
  at: new Date().toISOString(),
  base,
  getStatus: get.status,
  getOk: getJson.ok === true,
  agentSlug: getJson.draft?.agentSlug ?? null,
  status: getJson.draft?.status ?? null,
  saveStatus: save.status,
  saveOk: saveJson.ok === true,
  saveAt: saveJson.savedAt ?? null,
  saveError: saveJson.error ?? null,
  promoteStatus: promote.status,
  promoteOk: promoteJson.ok === true,
  promoteError: promoteJson.error ?? null,
  spoofIgnored: true,
};

const outPath = "qa-agent/reports/runtime/phase-e-a1-issues-owner-actions-probe.json";
fs.mkdirSync("qa-agent/reports/runtime", { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const ok =
  report.getOk &&
  report.saveOk &&
  report.promoteOk === false &&
  typeof report.promoteError === "string" &&
  report.promoteError.length > 0;
process.exit(ok ? 0 : 2);
