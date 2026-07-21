/**
 * D-E5 — bootstrap staging worker env (local host only).
 * Does not print secrets. Sets a local worker secret if missing (same pattern as D-A/D-B live scripts).
 * Retries transient Supabase "fetch failed" for heartbeat/status/once.
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

function sleepMs(ms) {
  spawnSync(process.execPath, ["-e", `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${ms})`], {
    stdio: "ignore",
  });
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

function runCommand(stdioInherit = false) {
  const common = {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  };
  if (stdioInherit) common.stdio = "inherit";

  if (cmd === "doctor") {
    return spawnSync(process.execPath, ["scripts/agentops-staging-worker-doctor.mjs", ...extra], common);
  }
  if (cmd === "status") {
    return spawnSync(
      process.execPath,
      ["scripts/agentops-staging-manual-run-worker.mjs", "queue-status", ...extra],
      common,
    );
  }
  if (cmd === "heartbeat") {
    return spawnSync(
      process.execPath,
      ["scripts/agentops-staging-manual-run-worker.mjs", "heartbeat", ...extra],
      common,
    );
  }
  if (cmd === "once") {
    return spawnSync(
      process.execPath,
      ["scripts/agentops-staging-manual-run-worker.mjs", "staging-worker", "--once", ...extra],
      common,
    );
  }
  if (cmd === "worker") {
    return spawnSync(
      process.execPath,
      ["scripts/agentops-staging-manual-run-worker.mjs", "staging-worker", ...extra],
      common,
    );
  }
  return null;
}

if (cmd === "worker") {
  for (;;) {
    const result = runCommand(true);
    const code = result?.status ?? 1;
    if (code === 0) process.exit(0);
    console.error(`[d-e5-bootstrap] worker exited status=${code}; restarting in 5s`);
    sleepMs(5000);
  }
}

const maxAttempts = ["heartbeat", "once", "status"].includes(cmd) ? 5 : 1;
let result = null;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  result = runCommand(false);
  if (!result) {
    console.error(`Unknown command: ${cmd}`);
    process.exit(2);
  }
  if (result.status === 0) break;
  const errText = `${result.stderr || ""}${result.stdout || ""}`;
  if (!/fetch failed/i.test(errText) || attempt === maxAttempts) break;
  sleepMs(1500 * attempt);
}

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);
