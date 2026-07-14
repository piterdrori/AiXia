/**
 * Focused verify for AgentOps monitoring status client:
 * 45s timeout, single-flight, short success cache, Retry bypass.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

async function main() {
  const {
    AGENTOPS_MONITORING_STATUS_TIMEOUT_MS,
    AGENTOPS_MONITORING_STATUS_CACHE_TTL_MS,
    AGENTOPS_MONITORING_STATUS_URL,
    fetchAgentOpsMonitoringStatus,
    resetAgentOpsMonitoringStatusClientForTests,
    peekAgentOpsMonitoringStatusInFlightForTests,
  } = await import("../src/lib/agentops/monitoring/agentOpsMonitoringStatusClient.ts");

  assert.equal(AGENTOPS_MONITORING_STATUS_TIMEOUT_MS, 45_000, "timeout is 45 seconds");
  assert.ok(
    AGENTOPS_MONITORING_STATUS_CACHE_TTL_MS >= 5_000 &&
      AGENTOPS_MONITORING_STATUS_CACHE_TTL_MS <= 10_000,
    "cache TTL 5–10s",
  );
  assert.equal(AGENTOPS_MONITORING_STATUS_URL, "/api/agentops/monitoring/status");

  const hook = readSrc("src/components/agentops/owner/useAgentOpsMonitoringStatus.ts");
  assert.ok(hook.includes("fetchAgentOpsMonitoringStatus"), "hook uses shared client");
  assert.ok(!hook.includes("18_000"), "hook has no 18s timeout");

  const agentsPage = readSrc("src/app/system/agent-ops/agents/page.tsx");
  assert.ok(agentsPage.includes("rosterLoading"), "Agents page has loading state");
  assert.ok(agentsPage.includes('"Loading…"'), "loading shows Loading…");
  assert.ok(
    agentsPage.includes("!rosterLoading && (Boolean(monitoringError) || !daily12)"),
    "Unavailable only after settled failure",
  );

  for (const rel of [
    "src/app/system/agent-ops/agents/AgentDaily12ReviewCard.tsx",
    "src/app/system/agent-ops/agents/AgentScheduledMonitoringCard.tsx",
    "src/app/system/agent-ops/agents/AgentDailyReviewStatusSection.tsx",
  ]) {
    const src = readSrc(rel);
    assert.ok(src.includes("fetchAgentOpsMonitoringStatus"), `${rel} uses shared client`);
    assert.ok(!src.includes("18_000"), `${rel} has no 18s timeout`);
    assert.ok(
      !src.includes('fetch("/api/agentops/monitoring/status")') &&
        !src.includes("fetch('/api/agentops/monitoring/status')"),
      `${rel} does not raw-fetch status`,
    );
  }

  const successBody = {
    ok: true,
    status: {
      daily12ReviewStatus: {
        registeredAgents: 12,
        agentsCompletedToday: 12,
        agentsMissingToday: [] as string[],
        roster: [] as unknown[],
      },
    },
    source: "verify-extra-field",
  };

  let fetchCount = 0;
  const delayedOkFetch: typeof fetch = async () => {
    fetchCount += 1;
    await new Promise((r) => setTimeout(r, 80));
    return new Response(JSON.stringify(successBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  resetAgentOpsMonitoringStatusClientForTests();
  fetchCount = 0;
  const [a, b] = await Promise.all([
    fetchAgentOpsMonitoringStatus({ fetchImpl: delayedOkFetch, timeoutMs: 5_000 }),
    fetchAgentOpsMonitoringStatus({ fetchImpl: delayedOkFetch, timeoutMs: 5_000 }),
  ]);
  assert.equal(fetchCount, 1, "two simultaneous consumers produce one fetch");
  assert.equal(a.status?.daily12ReviewStatus?.registeredAgents, 12);
  assert.equal(b.status?.daily12ReviewStatus?.registeredAgents, 12);
  assert.equal(a, b, "both consumers receive the same success response object");
  assert.equal(peekAgentOpsMonitoringStatusInFlightForTests(), false, "in-flight cleared");

  fetchCount = 0;
  const cached = await fetchAgentOpsMonitoringStatus({
    fetchImpl: delayedOkFetch,
    timeoutMs: 5_000,
  });
  assert.equal(fetchCount, 0, "successful response may cache briefly");
  assert.equal(cached.status?.daily12ReviewStatus?.registeredAgents, 12);

  fetchCount = 0;
  await fetchAgentOpsMonitoringStatus({
    forceRefresh: true,
    fetchImpl: delayedOkFetch,
    timeoutMs: 5_000,
  });
  assert.equal(fetchCount, 1, "forceRefresh bypasses short cache");

  resetAgentOpsMonitoringStatusClientForTests();
  fetchCount = 0;
  const failingFetch: typeof fetch = async () => {
    fetchCount += 1;
    await new Promise((r) => setTimeout(r, 40));
    return new Response(JSON.stringify({ ok: false, error: "boom" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  };
  await assert.rejects(
    () => fetchAgentOpsMonitoringStatus({ fetchImpl: failingFetch, timeoutMs: 5_000 }),
    /boom|Could not load/,
  );
  assert.equal(peekAgentOpsMonitoringStatusInFlightForTests(), false, "failure clears in-flight");

  fetchCount = 0;
  await assert.rejects(
    () =>
      fetchAgentOpsMonitoringStatus({
        forceRefresh: true,
        fetchImpl: failingFetch,
        timeoutMs: 5_000,
      }),
    /boom|Could not load/,
  );
  assert.equal(fetchCount, 1, "Retry starts a fresh request after failure");

  // Errors not cached — next must fetch again
  fetchCount = 0;
  const okAfterFail: typeof fetch = async () => {
    fetchCount += 1;
    return new Response(JSON.stringify(successBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  await fetchAgentOpsMonitoringStatus({ fetchImpl: okAfterFail, timeoutMs: 5_000 });
  assert.equal(fetchCount, 1, "errors are not cached");

  // Slow response under 45s timeout mock (above old 18s wall for realism in fast test use 100ms)
  resetAgentOpsMonitoringStatusClientForTests();
  const slowOk: typeof fetch = async () => {
    await new Promise((r) => setTimeout(r, 100));
    return new Response(JSON.stringify(successBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const slow = await fetchAgentOpsMonitoringStatus({
    fetchImpl: slowOk,
    timeoutMs: 5_000,
  });
  assert.equal(slow.status?.daily12ReviewStatus?.registeredAgents, 12, "slow under timeout ok");

  // Timeout fires with short timeoutMs
  resetAgentOpsMonitoringStatusClientForTests();
  const never: typeof fetch = async (_input, init) => {
    await new Promise((_, reject) => {
      const signal = init?.signal;
      if (!signal) {
        setTimeout(() => reject(new Error("missing abort")), 5_000);
        return;
      }
      signal.addEventListener("abort", () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
    throw new Error("unreachable");
  };
  await assert.rejects(
    () => fetchAgentOpsMonitoringStatus({ fetchImpl: never, timeoutMs: 50 }),
    (err: unknown) =>
      err instanceof Error &&
      (err.name === "FetchTimeoutError" || /timed out/i.test(err.message)),
  );

  console.log("agentops-monitoring-status-client-verify: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
