/**
 * Phase D-B — staging worker ops UI / cancel / queue dashboard verify.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
  mustInclude("package.json", '"agentops:staging-worker:doctor"');
  mustInclude("package.json", '"agentops:staging-worker:status"');
  mustInclude("package.json", '"agentops:staging-worker-ops-ui-verify"');
  mustInclude("scripts/agentops-staging-worker-doctor.mjs", "validatePersistentWorkerEnv");
  mustInclude("scripts/agentops-staging-worker-doctor.mjs", "storage_state");
  mustInclude("scripts/agentops-staging-worker-doctor.mjs", "Doctor does not run");

  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "handleMonitoringWorkerQueueRequest");
  mustInclude("api/agentops/_lib/monitoringManualRun.ts", "Cancel rejected: run belongs to a different agent");
  mustInclude(
    "api/agentops/_lib/monitoringRoutes.ts",
    "/api/agentops/monitoring/manual-run/queue",
  );

  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "agentops-staging-worker-queue-panel",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "agentops-stale-run-row",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentRunCancelConfirmModal.tsx",
    "agentops-run-cancel-confirm",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "agentops-cancel-run",
  );
  mustInclude(
    "src/lib/agentops/agents/agentManualRunClient.ts",
    "Local worker artifact",
  );
  mustInclude(
    "src/lib/agentops/agents/agentManualRunClient.ts",
    "formatLocalArtifactEvidence",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "agentops-drawer-cancel-run",
  );
  mustInclude(
    "src/lib/agentops/agents/agentManualRunClient.ts",
    "fetchWorkerQueueStatus",
  );
  mustInclude(
    "src/app/system/agent-ops/monitoring/page.tsx",
    "StagingWorkerQueuePanel",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "cancelOwnerManualRun",
  );

  mustInclude(
    "qa-agent/reports/agentops-staging-worker-runbook.md",
    "Durable host supervisor",
  );
  mustInclude(
    "qa-agent/reports/agentops-staging-worker-runbook.md",
    "pm2 start npm",
  );
  mustInclude(
    "qa-agent/reports/agentops-staging-worker.env.example",
    "AGENTOPS_ENVIRONMENT=staging",
  );
  mustInclude(
    "qa-agent/reports/agentops-staging-worker.env.example",
    "<worker-host-only>",
  );
  mustInclude(
    "supabase/migrations/20260720140000_agentops_monitoring_runs_canceled_status.sql",
    "'canceled'",
  );

  mustNotInclude("qa-agent/reports/agentops-staging-worker.env.example", "eyJ");
  mustNotInclude("qa-agent/reports/agentops-staging-worker.env.example", "service_role");
  mustNotInclude("scripts/agentops-staging-worker-doctor.mjs", "workflow_dispatch");
  mustNotInclude("api/agentops/_lib/monitoringManualRun.ts", "SUPABASE_SERVICE_ROLE_KEY");
  mustNotInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "SERVICE_ROLE",
  );

  // Function count stays under monitoring router — no new top-level api/agentops/*.ts
  const monitoringOnly = join(REPO_ROOT, "api/agentops/monitoring.ts");
  if (!existsSync(monitoringOnly)) {
    fail("api/agentops/monitoring.ts missing");
  }
}

verify();
if (failures.length > 0) {
  console.error("agentops:staging-worker-ops-ui-verify FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      ok: true,
      command: "agentops:staging-worker-ops-ui-verify",
      phase: "d-b",
      checks: "pass",
    },
    null,
    2,
  ),
);
