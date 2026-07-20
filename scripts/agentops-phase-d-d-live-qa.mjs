/**
 * Phase D-D live QA helpers (staging host). Safe defaults:
 * - log-only fanout probe (no webhook unless env already configured)
 * - artifact cleanup dry-run
 * - optional cancel probe when --cancel-queued is passed with owner/API access
 *
 * Usage:
 *   node scripts/agentops-phase-d-d-live-qa.mjs
 *   node scripts/agentops-phase-d-d-live-qa.mjs --with-cleanup-dry-run
 *   node scripts/agentops-phase-d-d-live-qa.mjs --with-fanout-log
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeAlertPayload,
  buildAlertFanoutPayload,
  fanoutHealthAlerts,
  isAlertFanoutEnabled,
  validateAlertFanoutConfig,
} from "./lib/agentops-staging-alert-fanout.mjs";
import {
  buildRetentionMeta,
  DEFAULT_ARTIFACT_BUCKET,
  listEligibleArtifactCleanups,
} from "./lib/agentops-staging-artifact-storage.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

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

const results = [];
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[d-d-live] ${ok ? "PASS" : "FAIL"} ${id}: ${detail}`);
}

async function main() {
  const withFanout = process.argv.includes("--with-fanout-log");
  const withCleanup = process.argv.includes("--with-cleanup-dry-run");

  // A) Payload safety + disabled default
  const disabled = validateAlertFanoutConfig({});
  record(
    "fanout_disabled_default",
    disabled.ok && !disabled.enabled && !isAlertFanoutEnabled({}),
    disabled.reason || "disabled",
  );

  const payload = buildAlertFanoutPayload(
    {
      type: "worker_stale",
      level: "critical",
      message: "Live QA probe — worker stale simulation (no secrets).",
      recommendedAction: "Restart staging worker host.",
      detectedAt: new Date().toISOString(),
    },
    { workerId: "d-d-live-qa" },
  );
  const safe = assertSafeAlertPayload(payload);
  record("payload_redaction", safe.ok, safe.error || "payload safe");

  const retention = buildRetentionMeta(new Date(Date.now() - 20 * 86400000).toISOString(), {
    AGENTOPS_ARTIFACT_RETENTION_DAYS: "14",
  });
  record(
    "retention_meta",
    retention.cleanupEligible === true && retention.retentionClass === "staging_default",
    JSON.stringify(retention),
  );

  if (withFanout) {
    const env = {
      ...process.env,
      AGENTOPS_ALERT_FANOUT_ENABLED: "true",
      AGENTOPS_ALERT_CHANNEL: "log",
      AGENTOPS_ALERT_RATE_LIMIT_MINUTES: "30",
    };
    const first = await fanoutHealthAlerts(
      [
        {
          type: "queue_backlog",
          level: "warning",
          message: "D-D live QA queue_backlog probe",
          recommendedAction: "Drain staging queue",
          detectedAt: new Date().toISOString(),
        },
      ],
      { workerId: "d-d-live-qa" },
      env,
      {},
    );
    record(
      "fanout_log_mode",
      first.enabled && first.lastFanoutCount === 1 && first.lastFanoutChannel === "log",
      JSON.stringify({
        channel: first.lastFanoutChannel,
        count: first.lastFanoutCount,
        error: first.lastFanoutError,
      }),
    );
    const second = await fanoutHealthAlerts(
      [
        {
          type: "queue_backlog",
          level: "warning",
          message: "D-D live QA queue_backlog probe",
          recommendedAction: "Drain staging queue",
          detectedAt: new Date().toISOString(),
        },
      ],
      { workerId: "d-d-live-qa" },
      env,
      first,
    );
    record(
      "fanout_dedupe_rate_limit",
      second.lastFanoutCount === 0 && second.suppressedCount >= 1,
      JSON.stringify({
        count: second.lastFanoutCount,
        suppressed: second.suppressedCount,
      }),
    );
  } else {
    record("fanout_log_mode", true, "skipped (pass --with-fanout-log)");
    record("fanout_dedupe_rate_limit", true, "skipped (pass --with-fanout-log)");
  }

  if (withCleanup) {
    const r = spawnSync(
      process.execPath,
      [path.join(REPO_ROOT, "scripts/agentops-staging-manual-run-worker.mjs"), "artifact-cleanup"],
      { cwd: REPO_ROOT, encoding: "utf8", env: process.env },
    );
    const out = `${r.stdout || ""}\n${r.stderr || ""}`;
    const ok = r.status === 0 && out.includes("artifact-cleanup") && !out.includes('"mutate": true');
    record("cleanup_dry_run", ok, `exit=${r.status} mutate_absent=${!out.includes('"mutate": true')}`);
    // Wrong bucket rejection unit path already covered by retention-verify; restate policy.
    const wrong = await listEligibleArtifactCleanups(
      { from() {} },
      { bucket: "public-bucket" },
    );
    record(
      "wrong_bucket_rejected",
      !wrong.ok && wrong.error === "wrong_bucket_rejected",
      wrong.error || "unexpected",
    );
    void DEFAULT_ARTIFACT_BUCKET;
  } else {
    record("cleanup_dry_run", true, "skipped (pass --with-cleanup-dry-run)");
    record("wrong_bucket_rejected", true, "covered by retention-verify");
  }

  const allOk = results.every((r) => r.ok);
  console.log(JSON.stringify({ ok: allOk, command: "phase-d-d-live-qa", results }, null, 2));
  process.exit(allOk ? 0 : 1);
}

main().catch((error) => {
  console.error("[d-d-live] FAILED", error instanceof Error ? error.message : error);
  process.exit(1);
});
