/**
 * Phase 5H-E — deterministic daily 12 run selection regression checks.
 * Usage: npm run agentops:daily-12-run-selection-verify
 */
import {
  buildExecutionMapForSelectedRun,
  selectLatestCompletedDaily12Run,
  type Daily12ExecutionRow,
} from "../api/agentops/_lib/daily12RunSelection";

const OLD_RUN = "c169c57c-d557-4377-9af2-8c302022b955";
const NEW_RUN = "2253236a-edca-4440-974d-ae79f35c3ae7";
const EXECUTION_DATE = "2026-07-08";

function agentRow(
  slug: string,
  runId: string,
  completedAt: string,
  queueMeta?: Record<string, unknown>,
): Daily12ExecutionRow {
  return {
    run_id: runId,
    agent_slug: slug,
    status: "completed",
    errors_found: 0,
    improvements_found: 6,
    features_found: 0,
    drafts_created: 0,
    evidence_summary: queueMeta ? { runQueueMeta: queueMeta } : {},
    completed_at: completedAt,
    started_at: completedAt,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function verifyTwoRunsSameDay(): void {
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

  const oldExecutions = slugs.map((slug, index) =>
    agentRow(slug, OLD_RUN, `2026-07-08T01:${String(index).padStart(2, "0")}:00.000Z`),
  );

  const newExecutions = slugs.map((slug, index) =>
    agentRow(
      slug,
      NEW_RUN,
      `2026-07-08T09:${String(index).padStart(2, "0")}:00.000Z`,
      {
        candidatesDetected: 68,
        candidatesQueued: 1,
        candidatesNotQueued: 67,
        duplicatesConsolidated: 60,
      },
    ),
  );

  const selected = selectLatestCompletedDaily12Run({
    executionDate: EXECUTION_DATE,
    executions: [...oldExecutions, ...newExecutions],
    monitoringRuns: [
      {
        run_id: OLD_RUN,
        mode: "daily_12_agent_review",
        status: "completed",
        agents_run: 12,
        started_at: "2026-07-08T01:00:00.000Z",
        ended_at: "2026-07-08T01:30:00.000Z",
        created_at: "2026-07-08T01:00:00.000Z",
        summary: { scheduleType: "daily_12_agent_review" },
      },
      {
        run_id: NEW_RUN,
        mode: "daily_12_agent_review",
        status: "completed",
        agents_run: 12,
        started_at: "2026-07-08T09:00:00.000Z",
        ended_at: "2026-07-08T09:56:17.000Z",
        created_at: "2026-07-08T09:00:00.000Z",
        summary: { scheduleType: "daily_12_agent_review" },
      },
    ],
  });

  assert(selected?.runId === NEW_RUN, `Expected ${NEW_RUN}, got ${selected?.runId ?? "null"}`);
  assert(selected?.runQueueMeta?.candidatesDetected === 68, "Expected candidatesDetected=68");
  assert(selected?.runQueueMeta?.candidatesQueued === 1, "Expected candidatesQueued=1");
  assert(selected?.runQueueMeta?.candidatesNotQueued === 67, "Expected candidatesNotQueued=67");
  assert(selected?.runQueueMeta?.duplicatesConsolidated === 60, "Expected duplicatesConsolidated=60");

  const map = buildExecutionMapForSelectedRun([...oldExecutions, ...newExecutions], NEW_RUN);
  assert(map.size === 12, "Expected 12 roster rows for selected run");
  assert(map.get("system-agent")?.run_id === NEW_RUN, "Roster must use selected run rows");
}

function verifyIncompleteNewerRunDoesNotReplaceComplete(): void {
  const slugs = ["system-agent", "qa-agent"];
  const completeOld = slugs.map((slug) =>
    agentRow(slug, OLD_RUN, "2026-07-08T01:10:00.000Z"),
  );
  const incompleteNew = slugs.map((slug, index) => ({
    ...agentRow(slug, NEW_RUN, "2026-07-08T10:00:00.000Z"),
    status: index === 0 ? "completed" : "failed",
  }));

  const selected = selectLatestCompletedDaily12Run({
    executionDate: EXECUTION_DATE,
    executions: [...completeOld, ...incompleteNew],
    monitoringRuns: [],
    expectedAgentCount: 2,
  });

  assert(selected?.runId === OLD_RUN, "Incomplete newer run must not replace complete run");
}

function verifyForceRetryMonitoringRunWinsOverOlderExecutions(): void {
  const slugs = ["system-agent", "qa-agent", "design-agent"];
  const oldExecutions = slugs.map((slug) =>
    agentRow(slug, OLD_RUN, "2026-07-08T01:00:00.000Z"),
  );

  const selected = selectLatestCompletedDaily12Run({
    executionDate: EXECUTION_DATE,
    executions: oldExecutions,
    monitoringRuns: [
      {
        run_id: NEW_RUN,
        mode: "daily_12_agent_review",
        status: "partial",
        agents_run: 2,
        started_at: "2026-07-08T09:00:00.000Z",
        ended_at: "2026-07-08T09:56:17.000Z",
        created_at: "2026-07-08T09:00:00.000Z",
        summary: {
          scheduleType: "daily_12_agent_review",
          queueSummary: {
            candidatesDetected: 68,
            candidatesQueued: 1,
            candidatesNotQueued: 67,
            duplicatesConsolidated: 60,
          },
        },
      },
    ],
    expectedAgentCount: 3,
  });

  assert(
    selected?.runId === OLD_RUN,
    "Partial newer monitoring run must not replace older complete execution aggregate",
  );
}

function verifyForceRetryFullMonitoringRunWins(): void {
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
  const oldExecutions = slugs.map((slug) =>
    agentRow(slug, OLD_RUN, "2026-07-08T01:00:00.000Z"),
  );

  const selected = selectLatestCompletedDaily12Run({
    executionDate: EXECUTION_DATE,
    executions: oldExecutions,
    monitoringRuns: [
      {
        run_id: OLD_RUN,
        mode: "daily_12_agent_review",
        status: "completed",
        agents_run: 12,
        started_at: "2026-07-08T01:00:00.000Z",
        ended_at: "2026-07-08T01:30:00.000Z",
        created_at: "2026-07-08T01:00:00.000Z",
        summary: { scheduleType: "daily_12_agent_review" },
      },
      {
        run_id: NEW_RUN,
        mode: "daily_12_agent_review",
        status: "completed",
        agents_run: 12,
        started_at: "2026-07-08T09:00:00.000Z",
        ended_at: "2026-07-08T09:56:17.000Z",
        created_at: "2026-07-08T09:00:00.000Z",
        summary: {
          scheduleType: "daily_12_agent_review",
          queueSummary: {
            candidatesDetected: 68,
            candidatesQueued: 1,
            candidatesNotQueued: 67,
            duplicatesConsolidated: 60,
          },
        },
      },
    ],
    draftRunHints: [{ run_id: NEW_RUN, latest_created_at: "2026-07-08T09:56:17.000Z" }],
  });

  assert(selected?.runId === NEW_RUN, "Latest complete daily monitoring run must win");
  assert(selected?.runQueueMeta?.candidatesQueued === 1, "Queue summary must come from newer run");
}

function main(): void {
  verifyTwoRunsSameDay();
  verifyIncompleteNewerRunDoesNotReplaceComplete();
  verifyForceRetryMonitoringRunWinsOverOlderExecutions();
  verifyForceRetryFullMonitoringRunWins();
  console.log("[agentops-daily-12-run-selection-verify] PASS");
}

main();
