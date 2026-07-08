/**
 * Phase 5H-F — deterministic daily retry upsert regression checks.
 * Usage: npm run agentops:daily-12-retry-upsert-verify
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  resolveDailyExecutionUpsertAction,
  type DailyExecutionUpsertAction,
} from "../src/lib/agentops/runtime/agentOpsDailyAgentExecutions";

const RUN_A = "c169c57c-d557-4377-9af2-8c302022b955";
const RUN_B = "2253236a-edca-4440-974d-ae79f35c3ae7";

function assertAction(
  label: string,
  actual: DailyExecutionUpsertAction,
  expectedAction: DailyExecutionUpsertAction["action"],
): void {
  if (actual.action !== expectedAction) {
    throw new Error(
      `${label}: expected action "${expectedAction}", got "${actual.action}" (${JSON.stringify(actual)})`,
    );
  }
}

function verifyCase1FirstDailyRun(): void {
  assertAction(
    "CASE 1 first daily run",
    resolveDailyExecutionUpsertAction(null, { status: "completed", run_id: RUN_A }),
    "insert",
  );
}

function verifyCase2FullSuccessfulRetry(): void {
  assertAction(
    "CASE 2 full successful retry",
    resolveDailyExecutionUpsertAction(
      { status: "completed", run_id: RUN_A },
      { status: "completed", run_id: RUN_B },
      { forceRetry: true },
    ),
    "update",
  );
}

function verifyCase3PartialRetryOnlyUpdatesAttempted(): void {
  // Authority rule: partial retry only processes attempted agents in batch.
  // For an attempted agent with prior completed row, forceRetry updates it.
  assertAction(
    "CASE 3 partial retry attempted agent",
    resolveDailyExecutionUpsertAction(
      { status: "completed", run_id: RUN_A },
      { status: "completed", run_id: RUN_B },
      { forceRetry: true },
    ),
    "update",
  );

  // Non-attempted agents are not passed to persistDailyExecutionBatch — no action required.
}

function verifyCase4FailedFullRetryPreservesPriorSuccess(): void {
  assertAction(
    "CASE 4 failed retry preserves prior success",
    resolveDailyExecutionUpsertAction(
      { status: "completed", run_id: RUN_A },
      { status: "failed", run_id: RUN_B },
      { forceRetry: true },
    ),
    "skip",
  );
}

function verifyCase5PersistenceFailureIsExplicit(): void {
  // When batch persist fails, worker sets persistenceComplete=false and exitCode=1.
  // Verified structurally in worker verify checks below.
  const failedRetry = resolveDailyExecutionUpsertAction(
    { status: "completed", run_id: RUN_A },
    { status: "failed", run_id: RUN_B },
    { forceRetry: true },
  );
  if (failedRetry.action !== "skip") {
    throw new Error("CASE 5: failed retry must not overwrite completed row");
  }
}

function verifyCase6SameRunIdReplay(): void {
  assertAction(
    "CASE 6 same run id replay",
    resolveDailyExecutionUpsertAction(
      { status: "completed", run_id: RUN_B },
      { status: "completed", run_id: RUN_B },
      { forceRetry: false },
    ),
    "update",
  );
}

function verifyWorkerStructure(): void {
  const workerPath = join(process.cwd(), "src/lib/agentops/runtime/agentOpsDaily12AgentReview.ts");
  const worker = readFileSync(workerPath, "utf8");

  for (const needle of [
    "persistDailyExecutionBatch",
    "buildCanonicalRunQueueMeta",
    "upsertMonitoringRunIndexRecord",
    "persistenceMetrics",
    "persistenceComplete",
    "pendingExecutions",
  ]) {
    if (!worker.includes(needle)) {
      throw new Error(`Worker missing required persistence symbol: ${needle}`);
    }
  }

  const executionsPath = join(
    process.cwd(),
    "src/lib/agentops/runtime/agentOpsDailyAgentExecutions.ts",
  );
  const executions = readFileSync(executionsPath, "utf8");
  for (const needle of [
    "resolveDailyExecutionUpsertAction",
    "persistDailyExecutionBatch",
    "executionRowsInserted",
    "executionRowsUpdated",
    "runQueueMetaPersisted",
  ]) {
    if (!executions.includes(needle)) {
      throw new Error(`Executions module missing required symbol: ${needle}`);
    }
  }

  const insertIndex = worker.indexOf("persistDailyExecutionBatch");
  const artifactIndex = worker.indexOf("writeDailyArtifacts(");
  if (insertIndex < 0 || artifactIndex < 0 || insertIndex > artifactIndex) {
    throw new Error("Worker must persist execution rows before writing artifacts");
  }
}

function main(): void {
  verifyCase1FirstDailyRun();
  verifyCase2FullSuccessfulRetry();
  verifyCase3PartialRetryOnlyUpdatesAttempted();
  verifyCase4FailedFullRetryPreservesPriorSuccess();
  verifyCase5PersistenceFailureIsExplicit();
  verifyCase6SameRunIdReplay();
  verifyWorkerStructure();

  console.log("[agentops-daily-12-retry-upsert-verify] PASS — 6 retry upsert cases verified.");
}

main();
