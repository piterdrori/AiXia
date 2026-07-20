/**
 * Phase D-C — staging worker artifacts / cancel cooperation / health alerts verify.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildObjectPath,
  isArtifactUploadEnabled,
  isForbiddenUploadPath,
  redactSensitiveText,
  validateArtifactPathForRun,
} from "./lib/agentops-staging-artifact-storage.mjs";
import {
  buildCancelAcknowledgedSummary,
  deriveHealthAlerts,
  OPS_VERSION,
} from "./lib/agentops-staging-worker-ops-core.mjs";
import { validateStagingArtifactPath } from "../api/agentops/_lib/monitoringArtifactUrl.ts";

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

function mustNotInclude(relativePath: string, needle: string): void {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing file: ${relativePath}`);
    return;
  }
  const text = readFileSync(full, "utf8");
  if (text.includes(needle)) {
    fail(`${relativePath} must NOT include ${JSON.stringify(needle)}`);
  }
}

function verify(): void {
  if (OPS_VERSION !== "d-d") fail(`OPS_VERSION expected d-d, got ${OPS_VERSION}`);

  // Upload disabled by default
  if (isArtifactUploadEnabled({})) {
    fail("artifact upload must be disabled by default");
  }
  if (!isArtifactUploadEnabled({ AGENTOPS_ARTIFACT_UPLOAD_ENABLED: "true" })) {
    fail("artifact upload should enable when env true");
  }

  // Redaction
  const redacted = redactSensitiveText(
    'Authorization: Bearer secret-token-123 cookie=abc service_role=xyz ?access_token=leak storage_state.json',
  );
  if (/secret-token-123|access_token=leak|cookie=abc|service_role=xyz/i.test(redacted)) {
    fail("redactor failed to scrub secrets");
  }
  if (!/redacted/i.test(redacted)) fail("redactor should mark redacted values");

  if (!isForbiddenUploadPath("qa-agent/browser-qa-auth/storage-state.json")) {
    fail("storage_state path must be forbidden for upload");
  }
  if (!isForbiddenUploadPath(".env.local")) {
    fail(".env must be forbidden for upload");
  }

  const pathOk = validateArtifactPathForRun(
    "owner-manual-system-agent-1",
    "agentops/owner-manual-system-agent-1/screenshots/page.png",
    "agentops-artifacts-staging",
  );
  if (!pathOk.ok) fail(`valid path rejected: ${pathOk.errors.join(",")}`);

  const traversal = validateArtifactPathForRun(
    "run-a",
    "agentops/run-a/../evil/secret.png",
    "agentops-artifacts-staging",
  );
  if (traversal.ok) fail("path traversal must be rejected");

  const crossRun = validateArtifactPathForRun(
    "run-a",
    "agentops/run-b/screenshots/page.png",
    "agentops-artifacts-staging",
  );
  if (crossRun.ok) fail("cross-run path must be rejected");

  const apiValidation = validateStagingArtifactPath(
    "run-a",
    "agentops/run-a/evidence/summary.json",
    "agentops-artifacts-staging",
  );
  if (!apiValidation.ok) fail("API path validator rejected valid path");

  const badBucket = validateStagingArtifactPath(
    "run-a",
    "agentops/run-a/evidence/summary.json",
    "production-bucket",
  );
  if (badBucket.ok) fail("non-staging bucket must be rejected");

  const objectPath = buildObjectPath("run-a", "screenshots", "page.png");
  if (objectPath !== "agentops/run-a/screenshots/page.png") {
    fail(`unexpected object path ${objectPath}`);
  }

  const canceled = buildCancelAcknowledgedSummary({ cancelRequested: true }, "before_engine_spawn");
  if (!canceled.cancelAcknowledgedAt || canceled.cancelPhase !== "before_engine_spawn") {
    fail("cancel acknowledged summary missing fields");
  }

  const alerts = deriveHealthAlerts({
    lastHeartbeatAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    lastSchedulerTickAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    queueLength: 12,
    oldestQueuedAgeMs: 30 * 60 * 1000,
    staleRunningCount: 1,
    artifactUploadFailed: true,
    enginesReady: false,
    browserAuthStale: true,
  });
  const types = new Set(alerts.map((a: { type: string }) => a.type));
  for (const expected of [
    "worker_stale",
    "scheduler_stale",
    "queue_backlog",
    "oldest_queued_too_old",
    "running_lock_expired",
    "artifact_upload_failed",
    "browser_auth_stale",
    "engine_unavailable",
  ]) {
    if (!types.has(expected)) fail(`missing alert type ${expected}`);
  }

  mustInclude("package.json", '"agentops:staging-worker-artifacts-verify"');
  mustInclude("api/agentops/_lib/monitoringRoutes.ts", "/api/agentops/monitoring/manual-run/artifact-url");
  mustInclude(
    "api/agentops/_lib/monitoringRoutes.ts",
    "/api/agentops/monitoring/manual-run/health-alert-ack",
  );
  mustInclude("api/agentops/_lib/monitoringArtifactUrl.ts", "assertOwnerFromRequest");
  mustInclude("api/agentops/_lib/monitoringArtifactUrl.ts", "path traversal rejected");
  mustInclude("scripts/lib/agentops-staging-artifact-storage.mjs", "local_worker_only");
  mustInclude("scripts/lib/agentops-staging-artifact-storage.mjs", "storage_state");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "uploadRunArtifacts");
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "killAttempted");
  mustInclude("scripts/agentops-manual-run-website-audit-engine.ts", "before_route_scan");
  mustInclude("scripts/agentops-manual-run-browser-qa-engine.ts", "before_browser_launch");
  mustInclude("scripts/agentops-staging-worker-doctor.mjs", "--upload-test");
  mustInclude("src/lib/agentops/agents/agentManualRunClient.ts", "fetchArtifactSignedUrl");
  mustInclude("src/lib/agentops/agents/agentManualRunClient.ts", "Open signed link");
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "agentops-open-signed-artifact",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "agentops-worker-health-alerts",
  );
  mustInclude(
    "qa-agent/reports/agentops-staging-worker.env.example",
    "AGENTOPS_ARTIFACT_UPLOAD_ENABLED",
  );
  mustInclude(
    "supabase/migrations/20260720150000_agentops_artifacts_staging_private_bucket.sql",
    "agentops-artifacts-staging",
  );
  mustNotInclude(
    "supabase/migrations/20260720151000_agentops_artifacts_staging_fix_deny_policies.sql",
    "bucket_id <>",
  );
  mustInclude(
    "supabase/migrations/20260720150000_agentops_artifacts_staging_private_bucket.sql",
    "AND false",
  );
  mustNotInclude("src/lib/agentops/agents/agentManualRunClient.ts", "SERVICE_ROLE");
  mustNotInclude("src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx", "service_role");

  // Function count unchanged: no new vercel entry file under api/agentops root
  if (existsSync(join(REPO_ROOT, "api/agentops/monitoring-artifact.ts"))) {
    fail("must not add new api/agentops/monitoring-artifact.ts function entry");
  }

  if (failures.length > 0) {
    console.error("agentops:staging-worker-artifacts-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        command: "agentops:staging-worker-artifacts-verify",
        opsVersion: OPS_VERSION,
        checks: failures.length,
      },
      null,
      2,
    ),
  );
}

verify();
