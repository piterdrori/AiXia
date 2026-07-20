/**
 * Phase D-D — alert fanout / ack / payload safety verify.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertSafeAlertPayload,
  buildAlertFanoutPayload,
  isAlertFanoutEnabled,
  selectAlertsForFanout,
  validateAlertFanoutConfig,
} from "./lib/agentops-staging-alert-fanout.mjs";

const REPO_ROOT = process.cwd();
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function mustInclude(relativePath: string, needle: string): void {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing file: ${relativePath}`);
    return;
  }
  const text = readFileSync(full, "utf8");
  if (!text.includes(needle)) {
    fail(`${relativePath} must include ${JSON.stringify(needle)}`);
  }
}

function verify(): void {
  if (isAlertFanoutEnabled({})) fail("fanout must be disabled by default");
  if (!isAlertFanoutEnabled({ AGENTOPS_ALERT_FANOUT_ENABLED: "true" })) {
    fail("fanout should enable when env true");
  }

  const disabled = validateAlertFanoutConfig({});
  if (!disabled.ok || disabled.enabled) fail("disabled config should be ok+disabled");

  const badWebhook = validateAlertFanoutConfig({
    AGENTOPS_ALERT_FANOUT_ENABLED: "true",
    AGENTOPS_ALERT_CHANNEL: "webhook",
    AGENTOPS_ALERT_WEBHOOK_URL: "https://aixia.app/hooks",
  });
  if (badWebhook.ok) fail("production webhook host must be rejected");

  const logOk = validateAlertFanoutConfig({
    AGENTOPS_ALERT_FANOUT_ENABLED: "true",
    AGENTOPS_ALERT_CHANNEL: "log",
  });
  if (!logOk.ok) fail("log channel config should be valid");

  const payload = buildAlertFanoutPayload(
    {
      type: "queue_backlog",
      level: "warning",
      message: "Queue backlog is 12 runs.",
      recommendedAction: "Drain queue",
      relatedRunId: "run-1",
      detectedAt: new Date().toISOString(),
    },
    { workerId: "worker-1" },
  );
  const safe = assertSafeAlertPayload(payload);
  if (!safe.ok) fail(safe.error || "payload unsafe");
  if (!payload.stagingUrl.includes("staging")) fail("payload stagingUrl missing");

  const unsafe = assertSafeAlertPayload({
    ...payload,
    leak: "Authorization: Bearer abc.storage_state.json",
  });
  if (unsafe.ok) fail("unsafe payload must fail redaction check");

  const now = Date.now();
  const selected1 = selectAlertsForFanout(
    [
      {
        type: "worker_stale",
        level: "critical",
        message: "stale",
        detectedAt: new Date(now).toISOString(),
      },
    ],
    {},
    { AGENTOPS_ALERT_MIN_LEVEL: "warning", AGENTOPS_ALERT_RATE_LIMIT_MINUTES: "30" },
    now,
  );
  if (selected1.selected.length !== 1) fail("expected one alert selected");

  const key = selected1.selected[0].key;
  const selected2 = selectAlertsForFanout(
    [
      {
        type: "worker_stale",
        level: "critical",
        message: "stale",
        detectedAt: new Date(now).toISOString(),
      },
    ],
    { lastByKey: { [key]: new Date(now).toISOString() } },
    { AGENTOPS_ALERT_MIN_LEVEL: "warning", AGENTOPS_ALERT_RATE_LIMIT_MINUTES: "30" },
    now + 60_000,
  );
  if (selected2.selected.length !== 0 || selected2.suppressedCount < 1) {
    fail("rate limit/dedupe should suppress repeat");
  }

  mustInclude("package.json", '"agentops:staging-worker-alerts-verify"');
  mustInclude("scripts/lib/agentops-staging-alert-fanout.mjs", "AGENTOPS_ALERT_FANOUT_ENABLED");
  mustInclude("api/agentops/_lib/monitoringArtifactUrl.ts", "acknowledgeNote");
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "agentops-alert-fanout-status",
  );
  mustInclude(
    "qa-agent/reports/agentops-staging-worker.env.example",
    "AGENTOPS_ALERT_FANOUT_ENABLED",
  );
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "fanoutHealthAlerts");

  if (failures.length) {
    console.error("agentops:staging-worker-alerts-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, command: "agentops:staging-worker-alerts-verify" }, null, 2));
}

verify();
