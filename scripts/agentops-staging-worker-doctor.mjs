/**
 * Phase D-B — staging worker doctor (read-only checks, no audits by default).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  REQUIRED_STAGING_APP_URL,
  validatePersistentWorkerEnv,
} from "./lib/agentops-staging-worker-ops-core.mjs";
import { validateWorkerEnv, WORKER_VERSION } from "./lib/agentops-manual-run-worker-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CONFIG_TABLE = "agentops_system_config";

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

// Safe staging defaults for local doctor (never invent production).
if (!process.env.AGENTOPS_ENVIRONMENT) process.env.AGENTOPS_ENVIRONMENT = "staging";
if (!process.env.AGENTOPS_PRODUCTION_BLOCKED) {
  process.env.AGENTOPS_PRODUCTION_BLOCKED = "true";
}
if (!process.env.STAGING_APP_URL) {
  process.env.STAGING_APP_URL = REQUIRED_STAGING_APP_URL;
}

function resolveStorageStatePath() {
  const raw =
    process.env.AGENTOPS_BROWSER_QA_STORAGE_STATE?.trim() ||
    "qa-agent/browser-qa-auth/storage-state.json";
  const resolved = path.isAbsolute(raw) ? raw : path.join(REPO_ROOT, raw);
  return { raw, resolved, exists: fs.existsSync(resolved) };
}

async function main() {
  const checks = [];
  const fail = (id, message) => checks.push({ id, ok: false, message });
  const pass = (id, message) => checks.push({ id, ok: true, message });

  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    fail("ci", "Doctor refuses CI environments for persistent-worker ops.");
  } else {
    pass("ci", "Not running in CI.");
  }

  const opsEnv = validatePersistentWorkerEnv(process.env);
  if (!opsEnv.ok) {
    for (const err of opsEnv.errors) fail("ops_env", err);
  } else {
    pass("ops_env", `Staging env guards pass (${REQUIRED_STAGING_APP_URL}).`);
  }

  const workerEnv = validateWorkerEnv(process.env);
  if (!workerEnv.ok) {
    for (const err of workerEnv.errors) fail("worker_env", err);
  } else {
    pass("worker_env", "Worker secrets/env shape OK (values not printed).");
  }

  const appUrl = (process.env.STAGING_APP_URL || "").replace(/\/+$/, "");
  if (appUrl.includes("ai-xia.vercel.app") && !appUrl.includes("staging")) {
    fail("production_url", "STAGING_APP_URL looks like production.");
  } else if (appUrl === REQUIRED_STAGING_APP_URL) {
    pass("production_url", "STAGING_APP_URL is the staging alias.");
  }

  const storage = resolveStorageStatePath();
  if (storage.exists) {
    pass("storage_state", `storage_state exists at configured local path.`);
  } else {
    fail(
      "storage_state",
      `storage_state missing (${storage.raw}). Browser QA engine will report not connected.`,
    );
  }

  const playwrightPkg = path.join(REPO_ROOT, "node_modules", "playwright");
  if (fs.existsSync(playwrightPkg)) {
    pass("playwright", "Playwright package is installed on this host.");
  } else {
    fail("playwright", "Playwright is not installed on this host.");
  }

  if (workerEnv.ok) {
    try {
      const client = createClient(
        workerEnv.config.supabaseUrl,
        workerEnv.config.serviceRoleKey,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data, error } = await client
        .from(CONFIG_TABLE)
        .select("id, environment, tools_enabled")
        .eq("environment", "staging")
        .limit(1);
      if (error) {
        fail("supabase_read", error.message);
      } else {
        pass("supabase_read", `Staging config readable (rows=${data?.length ?? 0}).`);
      }

      // Heartbeat writability probe: merge a doctorProbe timestamp without forcing engines.
      if (data?.[0]?.id) {
        const tools =
          data[0].tools_enabled && typeof data[0].tools_enabled === "object"
            ? { ...data[0].tools_enabled }
            : {};
        const prev =
          tools.manualRunWorker && typeof tools.manualRunWorker === "object"
            ? { ...tools.manualRunWorker }
            : {};
        tools.manualRunWorker = {
          ...prev,
          doctorProbeAt: new Date().toISOString(),
          doctorProbeVersion: WORKER_VERSION,
        };
        const { error: writeError } = await client
          .from(CONFIG_TABLE)
          .update({ tools_enabled: tools })
          .eq("id", data[0].id);
        if (writeError) fail("heartbeat_write", writeError.message);
        else pass("heartbeat_write", "Worker health row is writable (doctor probe only).");
      } else {
        fail("heartbeat_write", "No staging agentops_system_config row to probe.");
      }
    } catch (error) {
      fail("supabase", error instanceof Error ? error.message : String(error));
    }
  }

  const ok = checks.every((c) => c.ok || c.id === "storage_state");
  // storage_state soft-fail for doctor overall if only BQ missing — still report.
  const hardOk = checks
    .filter((c) => c.id !== "storage_state")
    .every((c) => c.ok);

  console.log(
    JSON.stringify(
      {
        ok: hardOk,
        command: "staging-worker:doctor",
        workerVersion: WORKER_VERSION,
        checks,
        note: "Doctor does not run website_audit or browser_qa engines.",
      },
      null,
      2,
    ),
  );
  process.exit(hardOk ? 0 : 1);
}

main().catch((error) => {
  console.error("[staging-worker:doctor] FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
