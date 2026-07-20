/**
 * Phase D-D — artifact retention / cleanup verify.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRetentionMeta,
  buildStorageRef,
  DEFAULT_ARTIFACT_BUCKET,
  isCleanupEligibleRef,
  listEligibleArtifactCleanups,
  validateArtifactPathForRun,
} from "./lib/agentops-staging-artifact-storage.mjs";

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

async function verify(): Promise<void> {
  const uploadedAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
  const meta = buildRetentionMeta(uploadedAt, { AGENTOPS_ARTIFACT_RETENTION_DAYS: "14" });
  if (meta.retentionClass !== "staging_default") fail("retention class");
  if (meta.retentionDays !== 14) fail("retention days");
  if (!meta.cleanupEligible) fail("old artifact should be cleanup eligible");

  const ref = buildStorageRef({
    bucket: DEFAULT_ARTIFACT_BUCKET,
    path: "agentops/run-a/evidence/summary.json",
    localFallback: null,
    artifactType: "evidence",
    contentType: "application/json",
    uploadedAt,
    env: { AGENTOPS_ARTIFACT_RETENTION_DAYS: "14" },
  });
  if (!ref.expiresAt || !isCleanupEligibleRef(ref)) fail("storage ref retention missing");

  const fresh = buildStorageRef({
    bucket: DEFAULT_ARTIFACT_BUCKET,
    path: "agentops/run-b/screenshots/page.png",
    artifactType: "screenshots",
    contentType: "image/png",
    uploadedAt: new Date().toISOString(),
    env: { AGENTOPS_ARTIFACT_RETENTION_DAYS: "14" },
  });
  if (isCleanupEligibleRef(fresh)) fail("fresh artifact must not be cleanup eligible");

  const wrongBucket = await listEligibleArtifactCleanups(
    { from: () => ({ select: () => ({ in: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }) } as never,
    { bucket: "not-staging" },
  );
  if (wrongBucket.ok || wrongBucket.error !== "wrong_bucket_rejected") {
    fail("cleanup must reject wrong bucket");
  }

  const traversal = validateArtifactPathForRun("run-a", "agentops/run-a/../x", DEFAULT_ARTIFACT_BUCKET);
  if (traversal.ok) fail("cleanup path traversal must fail validation");

  mustInclude("package.json", '"agentops:staging-worker:artifact-cleanup"');
  mustInclude("package.json", '"agentops:staging-worker-retention-verify"');
  mustInclude("scripts/agentops-staging-manual-run-worker.mjs", "artifact-cleanup");
  mustInclude("scripts/lib/agentops-staging-artifact-storage.mjs", "retentionClass");
  mustInclude("scripts/lib/agentops-staging-artifact-storage.mjs", "mutateArtifactCleanup");
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "agentops-artifact-cleaned",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "cleanup eligible",
  );
  mustInclude(
    "qa-agent/reports/agentops-staging-worker.env.example",
    "AGENTOPS_ARTIFACT_RETENTION_DAYS",
  );

  if (failures.length) {
    console.error("agentops:staging-worker-retention-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify({ ok: true, command: "agentops:staging-worker-retention-verify" }, null, 2),
  );
}

void verify();
