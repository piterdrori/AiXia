/**
 * Phase 5H-F — staging DB integration for daily execution upsert (isolated test date).
 * Usage: npm run agentops:daily-12-retry-upsert-integration-verify
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CANONICAL_DAILY_REVIEW_PROFILES } from "../src/lib/agentops/runtime/canonicalAgentDailyReview";
import { listActiveAgents } from "../src/lib/agentops/db/agentOpsRuntimeRepository";
import { resolveAgentSlugFromRow } from "../src/lib/agentops/runtime/agentOpsMonitoringPolicy";
import {
  DAILY_REVIEW_MODE,
  persistDailyExecutionBatch,
} from "../src/lib/agentops/runtime/agentOpsDailyAgentExecutions";

const TEST_DATE = "2099-01-01";
const RUN_A = "11111111-1111-4111-8111-111111111111";
const RUN_B = "22222222-2222-4222-8222-222222222222";

function loadEnvLocal() {
  for (const file of [".env", ".env.local"]) {
    try {
      const raw = readFileSync(join(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq);
        const value = trimmed.slice(eq + 1);
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // ignore
    }
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  loadEnvLocal();
  process.env.AGENTOPS_STAGING_SUPABASE_PROJECT_REF ??= "ydppcpbxrvvardeslzrk";

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(Boolean(url && key), "Missing staging Supabase credentials in .env.local");

  const client = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const agentsResult = await listActiveAgents(client);
  if (agentsResult.error) throw new Error(agentsResult.error);
  const agents = agentsResult.data ?? [];
  assert(agents.length >= 12, `Expected at least 12 agents, found ${agents.length}`);

  const slugToId = new Map<string, string>();
  for (const row of agents) {
    slugToId.set(resolveAgentSlugFromRow(row), row.id);
  }

  await client
    .from("agentops_monitoring_daily_agent_executions")
    .delete()
    .eq("execution_date", TEST_DATE)
    .eq("review_mode", DAILY_REVIEW_MODE);

  const baseRecords = CANONICAL_DAILY_REVIEW_PROFILES.map((profile) => {
    const agentId = slugToId.get(profile.agentSlug);
    assert(Boolean(agentId), `Missing agent id for ${profile.agentSlug}`);
    return {
      run_id: RUN_A,
      execution_date: TEST_DATE,
      review_mode: DAILY_REVIEW_MODE,
      agent_id: agentId!,
      agent_slug: profile.agentSlug,
      username: profile.username,
      job_title: profile.jobTitle,
      perspective: profile.perspectiveTitle,
      status: "completed" as const,
      routes_reviewed: ["/dashboard"],
      errors_found: 1,
      improvements_found: 2,
      features_found: 0,
      drafts_created: 0,
      duplicates_skipped: 0,
      no_findings: false,
      evidence_summary: { testCase: "first-run" },
      started_at: `${TEST_DATE}T01:00:00.000Z`,
      completed_at: `${TEST_DATE}T01:05:00.000Z`,
      duration_ms: 300000,
    };
  });

  const runQueueMetaA = {
    queuePolicyVersion: "daily-12-agent-review-v1",
    candidatesDetected: 10,
    candidatesQueued: 1,
    candidatesNotQueued: 9,
    duplicatesConsolidated: 3,
  };

  const first = await persistDailyExecutionBatch(client, baseRecords, {
    forceRetry: false,
    runQueueMeta: runQueueMetaA,
    perAgentStats: new Map(baseRecords.map((row) => [row.agent_slug, { draftsCreated: 0, duplicatesSkipped: 0 }])),
  });
  assert(first.ok, `CASE 1 failed: ${first.errors.join("; ")}`);
  assert(first.metrics.executionRowsInserted === 12, "CASE 1 expected 12 inserts");

  const { data: afterFirst } = await client
    .from("agentops_monitoring_daily_agent_executions")
    .select("run_id")
    .eq("execution_date", TEST_DATE);
  assert((afterFirst ?? []).length === 12, "CASE 1 expected exactly 12 rows");
  assert(
    (afterFirst ?? []).every((row) => row.run_id === RUN_A),
    "CASE 1 rows must reference run A",
  );

  const retryRecords = baseRecords.map((row) => ({
    ...row,
    run_id: RUN_B,
    evidence_summary: { testCase: "force-retry" },
    completed_at: `${TEST_DATE}T09:00:00.000Z`,
  }));
  const runQueueMetaB = {
    queuePolicyVersion: "daily-12-agent-review-v1",
    candidatesDetected: 68,
    candidatesQueued: 1,
    candidatesNotQueued: 67,
    duplicatesConsolidated: 60,
  };

  const second = await persistDailyExecutionBatch(client, retryRecords, {
    forceRetry: true,
    runQueueMeta: runQueueMetaB,
    perAgentStats: new Map(retryRecords.map((row) => [row.agent_slug, { draftsCreated: 0, duplicatesSkipped: 0 }])),
  });
  assert(second.ok, `CASE 2 failed: ${second.errors.join("; ")}`);
  assert(second.metrics.executionRowsUpdated === 12, "CASE 2 expected 12 updates");
  assert(second.metrics.executionRowsInserted === 0, "CASE 2 must not insert duplicates");

  const { data: afterSecond } = await client
    .from("agentops_monitoring_daily_agent_executions")
    .select("run_id, evidence_summary")
    .eq("execution_date", TEST_DATE);
  assert((afterSecond ?? []).length === 12, "CASE 2 must keep exactly 12 canonical rows");
  assert(
    (afterSecond ?? []).every((row) => row.run_id === RUN_B),
    "CASE 2 rows must reference run B",
  );
  const meta = (afterSecond?.[0]?.evidence_summary as Record<string, unknown> | null)?.runQueueMeta as
    | Record<string, unknown>
    | undefined;
  assert(meta?.candidatesDetected === 68, "CASE 2 runQueueMeta must be DB-persisted");

  const partialRecords = retryRecords.slice(0, 3).map((row) => ({
    ...row,
    run_id: "33333333-3333-4333-8333-333333333333",
  }));
  const third = await persistDailyExecutionBatch(client, partialRecords, {
    forceRetry: true,
    runQueueMeta: runQueueMetaB,
    perAgentStats: new Map(
      partialRecords.map((row) => [row.agent_slug, { draftsCreated: 0, duplicatesSkipped: 0 }]),
    ),
  });
  assert(third.ok, `CASE 3 failed: ${third.errors.join("; ")}`);
  assert(third.metrics.executionRowsUpdated === 3, "CASE 3 expected 3 updates");

  const failedRecords = retryRecords.map((row) => ({
    ...row,
    run_id: "44444444-4444-4444-8444-444444444444",
    status: "failed" as const,
    failure_reason: "simulated failed retry",
  }));
  const fourth = await persistDailyExecutionBatch(client, failedRecords, {
    forceRetry: true,
    runQueueMeta: runQueueMetaB,
    perAgentStats: new Map(failedRecords.map((row) => [row.agent_slug, { draftsCreated: 0, duplicatesSkipped: 0 }])),
  });
  assert(fourth.metrics.executionRowsSkipped === 12, "CASE 4 expected 12 skipped rows");
  assert(fourth.metrics.executionRowsUpdated === 0, "CASE 4 must not update completed rows on failed retry");

  const { data: afterFailed } = await client
    .from("agentops_monitoring_daily_agent_executions")
    .select("run_id")
    .eq("execution_date", TEST_DATE);
  const runBCount = (afterFailed ?? []).filter((row) => row.run_id === RUN_B).length;
  assert(runBCount === 9, "CASE 4 must preserve 9 non-retried run B rows after failed full retry");

  const replay = await persistDailyExecutionBatch(client, retryRecords, {
    forceRetry: true,
    runQueueMeta: runQueueMetaB,
    perAgentStats: new Map(retryRecords.map((row) => [row.agent_slug, { draftsCreated: 0, duplicatesSkipped: 0 }])),
  });
  assert(replay.metrics.executionRowsUpdated === 12, "CASE 6 same run replay must idempotently update");

  await client
    .from("agentops_monitoring_daily_agent_executions")
    .delete()
    .eq("execution_date", TEST_DATE)
    .eq("review_mode", DAILY_REVIEW_MODE);

  console.log("[agentops-daily-12-retry-upsert-integration-verify] PASS — DB upsert cases verified.");
}

main().catch((error) => {
  console.error("[agentops-daily-12-retry-upsert-integration-verify] FAILED:", error);
  process.exit(1);
});
