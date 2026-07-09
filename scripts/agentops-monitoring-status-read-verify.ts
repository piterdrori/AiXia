/**
 * Phase 5H-I — monitoring status read-path regression checks.
 * Usage: npm run agentops:monitoring-status-read-verify
 */
import {
  buildExecutionMapForSelectedRun,
  selectLatestCompletedDaily12Run,
  type Daily12ExecutionRow,
  type Daily12MonitoringRunRow,
} from "../api/agentops/_lib/daily12RunSelection.js";
import {
  createMonitoringReadClient,
  decodeSupabaseJwtRole,
  extractSupabaseProjectRef,
  MONITORING_STAGING_PROJECT_REF,
  resolveMonitoringServiceRoleKey,
  resolveMonitoringSupabaseUrl,
} from "../api/agentops/_lib/monitoringReadClient.js";

const CLOUD_RUN_ID = "f60b5963-4b84-4e47-838b-ed8f67943901";
const EXECUTION_DATE = "2026-07-09";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function agentExecution(slug: string, completedAt: string): Daily12ExecutionRow {
  return {
    run_id: CLOUD_RUN_ID,
    agent_slug: slug,
    status: "completed",
    errors_found: 0,
    improvements_found: 0,
    features_found: 0,
    drafts_created: 0,
    evidence_summary: {
      runQueueMeta: {
        candidatesDetected: 0,
        candidatesQueued: 0,
        candidatesNotQueued: 0,
        duplicatesConsolidated: 0,
      },
    },
    completed_at: completedAt,
    started_at: completedAt,
  };
}

function verifyReadClientRequiresServiceRole(): void {
  const missingKey = createMonitoringReadClient({
    VITE_SUPABASE_URL: `https://${MONITORING_STAGING_PROJECT_REF}.supabase.co`,
  });
  assert(missingKey.ok === false, "expected missing service role to fail");
  assert(
    missingKey.ok === false && missingKey.reason === "missing_service_role_key",
    `expected missing_service_role_key, got ${missingKey.ok ? "ok" : missingKey.reason}`,
  );

  const anonRejected = createMonitoringReadClient({
    VITE_SUPABASE_URL: `https://${MONITORING_STAGING_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: "header.eyJyb2xlIjoiYW5vbiJ9.signature",
  });
  assert(anonRejected.ok === false, "expected anon key rejection");
  assert(
    anonRejected.ok === false && anonRejected.reason === "anon_key_rejected",
    "expected anon_key_rejected",
  );

  const serviceOk = createMonitoringReadClient({
    VITE_SUPABASE_URL: `https://${MONITORING_STAGING_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: "header.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature",
  });
  assert(serviceOk.ok === true, "expected service role client");
  assert(serviceOk.ok && serviceOk.authMode === "service_role", "expected authMode service_role");
}

function verifyStagingAliasEnvNames(): void {
  const env = {
    STAGING_SUPABASE_URL: `https://${MONITORING_STAGING_PROJECT_REF}.supabase.co`,
    STAGING_SUPABASE_SERVICE_ROLE_KEY: "header.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature",
  };
  assert(
    resolveMonitoringSupabaseUrl(env) === env.STAGING_SUPABASE_URL,
    "STAGING_SUPABASE_URL should resolve",
  );
  assert(
    resolveMonitoringServiceRoleKey(env) === env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
    "STAGING_SUPABASE_SERVICE_ROLE_KEY should resolve",
  );
  assert(
    extractSupabaseProjectRef(env.STAGING_SUPABASE_URL) === MONITORING_STAGING_PROJECT_REF,
    "project ref extract",
  );
  assert(decodeSupabaseJwtRole(env.STAGING_SUPABASE_SERVICE_ROLE_KEY) === "service_role", "jwt role");
}

function verifyCloudRunSelection(): void {
  const slugs = [
    "system-agent",
    "memory-agent",
    "issue-agent",
    "evolution-agent",
    "fix-agent",
    "qa-agent",
    "design-agent",
    "runtime-agent",
    "logs-agent",
    "config-agent",
    "chat-agent",
    "analytics-agent",
  ];

  const executions = slugs.map((slug, index) =>
    agentExecution(slug, `2026-07-09T01:${String(index).padStart(2, "0")}:00.000Z`),
  );

  const monitoringRuns: Daily12MonitoringRunRow[] = [
    {
      run_id: CLOUD_RUN_ID,
      mode: "daily_12_agent_review",
      status: "completed",
      agents_run: 12,
      started_at: "2026-07-09T01:20:52.000Z",
      ended_at: "2026-07-09T01:58:02.000Z",
      created_at: "2026-07-09T01:58:02.687Z",
      summary: {
        queueSummary: {
          candidatesDetected: 0,
          candidatesQueued: 0,
          candidatesNotQueued: 0,
          duplicatesConsolidated: 0,
        },
        persistenceMetrics: {
          persistenceComplete: true,
          runQueueMetaPersisted: true,
          runIndexPersisted: true,
          executionRowsUpdated: 12,
        },
      },
    },
  ];

  const selected = selectLatestCompletedDaily12Run({
    executionDate: EXECUTION_DATE,
    executions,
    monitoringRuns,
    expectedAgentCount: 12,
  });

  assert(selected?.runId === CLOUD_RUN_ID, `expected ${CLOUD_RUN_ID}, got ${selected?.runId ?? "null"}`);
  assert(selected?.executionsForRun.length === 12, "expected 12 executions for selected run");

  const map = buildExecutionMapForSelectedRun(executions, selected?.runId ?? null);
  assert(map.size === 12, "expected 12 slugs in execution map");
}

function verifyEmptyDbHonestState(): void {
  const selected = selectLatestCompletedDaily12Run({
    executionDate: EXECUTION_DATE,
    executions: [],
    monitoringRuns: [],
    expectedAgentCount: 12,
  });
  assert(selected === null, "empty DB should not fabricate a selected run");
}

function main(): void {
  verifyReadClientRequiresServiceRole();
  verifyStagingAliasEnvNames();
  verifyCloudRunSelection();
  verifyEmptyDbHonestState();
  console.log("[agentops-monitoring-status-read-verify] PASS");
}

main();
