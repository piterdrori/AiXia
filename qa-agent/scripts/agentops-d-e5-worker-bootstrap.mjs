/**
 * D-E5 — bootstrap staging worker env (local host only).
 * Does not print secrets. Sets a local worker secret if missing (same pattern as D-A/D-B live scripts).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

loadEnvFile(path.join(REPO_ROOT, ".env.local"));
loadEnvFile(path.join(REPO_ROOT, "qa-agent", "browser-qa", ".env.owner.local"));

process.env.AGENTOPS_ENVIRONMENT = "staging";
process.env.AGENTOPS_PRODUCTION_BLOCKED = "true";
process.env.STAGING_APP_URL = "https://ai-xia-staging.vercel.app";
if (!process.env.AGENTOPS_WORKER_SECRET) {
  process.env.AGENTOPS_WORKER_SECRET = "d-e5-local-worker-secret";
}
if (!process.env.STAGING_SUPABASE_URL) {
  process.env.STAGING_SUPABASE_URL =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
}
if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
}
if (!process.env.AGENTOPS_BROWSER_QA_STORAGE_STATE) {
  process.env.AGENTOPS_BROWSER_QA_STORAGE_STATE =
    "qa-agent/browser-qa-auth/storage-state.json";
}

const cmd = process.argv[2] || "doctor";
const extra = process.argv.slice(3);

let result;
if (cmd === "doctor") {
  result = spawnSync(process.execPath, ["scripts/agentops-staging-worker-doctor.mjs", ...extra], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
} else if (cmd === "status") {
  result = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-manual-run-worker.mjs", "queue-status", ...extra],
    { cwd: REPO_ROOT, env: process.env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
} else if (cmd === "heartbeat") {
  result = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-manual-run-worker.mjs", "heartbeat", ...extra],
    { cwd: REPO_ROOT, env: process.env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
} else if (cmd === "once") {
  result = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-manual-run-worker.mjs", "staging-worker", "--once", ...extra],
    { cwd: REPO_ROOT, env: process.env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
} else if (cmd === "worker") {
  result = spawnSync(
    process.execPath,
    ["scripts/agentops-staging-manual-run-worker.mjs", "staging-worker", ...extra],
    { cwd: REPO_ROOT, env: process.env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
} else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(2);
}

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);
