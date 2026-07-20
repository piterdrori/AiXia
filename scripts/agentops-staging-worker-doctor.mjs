/**
 * Phase D-D — staging worker doctor (read-only checks by default).
 * Optional flags: --upload-test --alert-test --cleanup-test
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
import {
  DEFAULT_ARTIFACT_BUCKET,
  isArtifactUploadEnabled,
  listEligibleArtifactCleanups,
  probeArtifactBucket,
  resolveArtifactBucket,
  resolveRetentionDays,
} from "./lib/agentops-staging-artifact-storage.mjs";
import {
  fanoutHealthAlerts,
  isAlertFanoutEnabled,
  validateAlertFanoutConfig,
} from "./lib/agentops-staging-alert-fanout.mjs";

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

function cancelCheckpointSourcesPresent() {
  const required = [
    ["src/lib/agentops/runtime/agentOpsCancelCheckpoint.ts", ["honorCancelCheckpoint"]],
    [
      "src/lib/agentops/runtime/playwrightStagingScanner.ts",
      ["before_browser_launch", "before_route", "after_route"],
    ],
    [
      "src/lib/agentops/browserQa/playwrightBrowserQaRunner.ts",
      ["before_browser_launch", "before_navigation", "before_screenshot", "after_screenshot"],
    ],
    ["scripts/agentops-manual-run-browser-qa-engine.ts", ["before_browser_launch"]],
    ["scripts/agentops-manual-run-website-audit-engine.ts", ["before_route_scan"]],
  ];
  for (const [rel, needles] of required) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) return { ok: false, missing: rel };
    const text = fs.readFileSync(full, "utf8");
    for (const needle of needles) {
      if (!text.includes(needle)) return { ok: false, missing: `${rel}:${needle}` };
    }
  }
  return { ok: true, missing: null };
}

async function main() {
  const uploadTest = process.argv.includes("--upload-test");
  const alertTest = process.argv.includes("--alert-test");
  const cleanupTest = process.argv.includes("--cleanup-test");
  const checks = [];
  const fail = (id, message) => checks.push({ id, ok: false, message });
  const pass = (id, message) => checks.push({ id, ok: true, message });
  const warn = (id, message) => checks.push({ id, ok: true, warn: true, message });

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

  const fanoutConfig = validateAlertFanoutConfig(process.env);
  if (!fanoutConfig.ok) {
    fail("alert_fanout_config", fanoutConfig.errors.join("; "));
  } else if (!fanoutConfig.enabled) {
    pass("alert_fanout_config", "Alert fanout disabled (safe default).");
  } else {
    pass(
      "alert_fanout_config",
      `Alert fanout enabled channel=${fanoutConfig.channel} (worker-host only).`,
    );
  }
  if (!isAlertFanoutEnabled(process.env) && String(process.env.AGENTOPS_ALERT_FANOUT_ENABLED || "")) {
    // non-true values stay disabled
    pass("alert_fanout_default", "Non-true AGENTOPS_ALERT_FANOUT_ENABLED keeps fanout off.");
  }

  const retentionDays = resolveRetentionDays(process.env);
  if (retentionDays < 1 || retentionDays > 90) {
    fail("artifact_retention_config", `Invalid retention days: ${retentionDays}`);
  } else {
    pass(
      "artifact_retention_config",
      `Artifact retentionDays=${retentionDays} (staging_default; cleanup dry-run by default).`,
    );
  }

  const cancelSupport = cancelCheckpointSourcesPresent();
  if (!cancelSupport.ok) {
    fail("cancel_checkpoints", "Deep cancel checkpoint sources incomplete.");
  } else {
    pass(
      "cancel_checkpoints",
      "Cancel checkpoints present (before_browser_launch / before_route / before_navigation / screenshots).",
    );
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

      const bucket = resolveArtifactBucket(process.env);
      const uploadEnabled = isArtifactUploadEnabled(process.env);
      if (uploadEnabled) {
        pass("artifact_upload_flag", `Artifact upload enabled (bucket=${bucket}).`);
      } else {
        warn(
          "artifact_upload_flag",
          "AGENTOPS_ARTIFACT_UPLOAD_ENABLED is not true — uploads disabled (safe default).",
        );
      }
      if (bucket !== DEFAULT_ARTIFACT_BUCKET && !String(bucket).includes("staging")) {
        fail("artifact_bucket_name", `Bucket must be staging-only (got ${bucket}).`);
      } else {
        pass("artifact_bucket_name", `Artifact bucket name OK (${bucket}).`);
      }

      const probe = await probeArtifactBucket(client, bucket);
      if (!probe.ok || !probe.exists) {
        fail("artifact_bucket", probe.error || "Artifact bucket missing.");
      } else if (probe.public) {
        fail("artifact_bucket", "Artifact bucket must be private (public=true).");
      } else {
        pass("artifact_bucket", `Bucket ${bucket} exists and is private.`);
      }

      const listed = await listEligibleArtifactCleanups(client, { bucket });
      if (!listed.ok) {
        fail("artifact_cleanup_dry_run", listed.error || "cleanup dry-run failed");
      } else {
        pass(
          "artifact_cleanup_dry_run",
          `Cleanup dry-run OK (eligible=${listed.eligible.length}; no deletes).`,
        );
      }

      if (uploadTest) {
        if (!uploadEnabled) {
          fail("artifact_upload_test", "--upload-test requires AGENTOPS_ARTIFACT_UPLOAD_ENABLED=true.");
        } else {
          const testPath = `agentops/doctor-probe/evidence/doctor-${Date.now()}.txt`;
          const body = Buffer.from("agentops-doctor-upload-test\n", "utf8");
          const { error: upErr } = await client.storage.from(bucket).upload(testPath, body, {
            contentType: "text/plain",
            upsert: true,
          });
          if (upErr) {
            fail("artifact_upload_test", upErr.message);
          } else {
            await client.storage.from(bucket).remove([testPath]);
            pass("artifact_upload_test", "Upload test object succeeded and was removed.");
          }
        }
      } else {
        warn(
          "artifact_upload_test",
          "Skipped upload test (pass --upload-test to exercise private bucket write).",
        );
      }

      if (alertTest) {
        if (!isAlertFanoutEnabled(process.env)) {
          fail(
            "alert_fanout_test",
            "--alert-test requires AGENTOPS_ALERT_FANOUT_ENABLED=true on worker host.",
          );
        } else {
          const result = await fanoutHealthAlerts(
            [
              {
                type: "queue_backlog",
                level: "warning",
                message: "Doctor alert-test probe (safe staging payload).",
                recommendedAction: "No action — doctor probe only.",
                detectedAt: new Date().toISOString(),
              },
            ],
            { workerId: process.env.AGENTOPS_WORKER_ID || "doctor" },
            process.env,
            {},
          );
          if (result.lastFanoutError) {
            fail("alert_fanout_test", result.lastFanoutError);
          } else {
            pass(
              "alert_fanout_test",
              `Alert test fanout channel=${result.lastFanoutChannel} count=${result.lastFanoutCount}.`,
            );
          }
        }
      } else {
        warn(
          "alert_fanout_test",
          "Skipped alert test (pass --alert-test; does not send unless fanout enabled).",
        );
      }

      if (cleanupTest) {
        // Explicit dry-run only — never mutate from doctor even with --cleanup-test.
        const again = await listEligibleArtifactCleanups(client, { bucket, limit: 10 });
        if (!again.ok) {
          fail("artifact_cleanup_test", again.error || "cleanup-test dry-run failed");
        } else {
          pass(
            "artifact_cleanup_test",
            `Cleanup-test dry-run only (eligible=${again.eligible.length}). Doctor never mutates.`,
          );
        }
      } else {
        warn(
          "artifact_cleanup_test",
          "Skipped cleanup-test flag (pass --cleanup-test for extra dry-run; never deletes).",
        );
      }

      const alerts = data?.[0]?.tools_enabled?.manualRunWorker?.ops?.alerts;
      if (Array.isArray(alerts) && alerts.length > 0) {
        warn(
          "health_alerts",
          `${alerts.length} health alert(s) present in worker ops (see queue dashboard).`,
        );
      } else {
        pass("health_alerts", "No active health alerts stored on worker ops.");
      }

      const fanout = data?.[0]?.tools_enabled?.manualRunWorker?.ops?.alertFanout;
      if (fanout && typeof fanout === "object") {
        pass(
          "alert_fanout_status",
          `Stored fanout channel=${fanout.lastFanoutChannel || "—"} count=${fanout.lastFanoutCount ?? 0}.`,
        );
      } else {
        warn("alert_fanout_status", "No alertFanout status stored yet (worker loop not run).");
      }
    } catch (error) {
      fail("supabase", error instanceof Error ? error.message : String(error));
    }
  }

  const hardOk = checks
    .filter((c) => c.id !== "storage_state" && !c.warn)
    .every((c) => c.ok);

  console.log(
    JSON.stringify(
      {
        ok: hardOk,
        command: "staging-worker:doctor",
        workerVersion: WORKER_VERSION,
        uploadTest,
        alertTest,
        cleanupTest,
        artifactUploadEnabled: isArtifactUploadEnabled(process.env),
        artifactBucket: resolveArtifactBucket(process.env),
        alertFanoutEnabled: isAlertFanoutEnabled(process.env),
        retentionDays,
        checks,
        note:
          "Doctor does not run website_audit or browser_qa engines. Optional: --upload-test --alert-test --cleanup-test (cleanup-test is dry-run only; never deletes).",
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
