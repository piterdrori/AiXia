/**
 * Phase D-E3 — Agent Detail polish verify (static).
 * Layout hierarchy, drawer sections, compact queue, lazy mount, shell-noise filter,
 * issues preview-only, no Not-recorded spam / no approve-reject on detail.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildFleetFallbackDrawer,
  drawerFieldRows,
  drawerFieldSections,
  FLEET_DAILY_FALLBACK_BANNER,
} from "../src/lib/agentops/agents/agentDetailLatestRun.ts";
import {
  classifyBrowserQaShellNoise,
  filterBrowserQaFailedRequests,
  isAgentOpsBrowserQaRoute,
} from "../src/lib/agentops/browserQa/browserQaShellNoise.ts";

const REPO_ROOT = process.cwd();
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function read(rel: string): string {
  const full = join(REPO_ROOT, rel);
  if (!existsSync(full)) {
    fail(`Missing file: ${rel}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function mustInclude(rel: string, needle: string): void {
  if (!read(rel).includes(needle)) {
    fail(`${rel} must include ${JSON.stringify(needle)}`);
  }
}

function mustNotInclude(rel: string, needle: string): void {
  if (read(rel).includes(needle)) {
    fail(`${rel} must NOT include ${JSON.stringify(needle)}`);
  }
}

function verifyDrawerSections(): void {
  const fleet = buildFleetFallbackDrawer({
    open: true,
    executionStatus: "completed",
    startedAt: null,
    endedAt: null,
    duration: "",
    routesModules: "",
    queuedFindings: "no qualifying findings were produced by this run",
    failureReason: "",
  });
  if (fleet.banner !== FLEET_DAILY_FALLBACK_BANNER) {
    fail("fleet banner constant mismatch");
  }
  const sections = drawerFieldSections(fleet);
  const ids = sections.map((s) => s.id);
  if (!ids.includes("identity") || !ids.includes("execution")) {
    fail(`drawer sections missing identity/execution, got ${ids.join(",")}`);
  }
  const rows = drawerFieldRows(fleet);
  if (rows.some(([, value]) => value === "Not recorded")) {
    fail("drawerFieldRows must hide Not recorded");
  }
  if (rows.some(([, value]) => /GitHub Actions/i.test(value))) {
    fail("drawer must not expose bare GitHub Actions in normal fleet fallback fields");
  }
}

function verifyShellNoiseFilter(): void {
  if (!isAgentOpsBrowserQaRoute("/system/agent-ops/agents/qa-agent")) {
    fail("isAgentOpsBrowserQaRoute must match Agent Detail");
  }
  if (isAgentOpsBrowserQaRoute("/finance/vendors")) {
    fail("isAgentOpsBrowserQaRoute must not match non-AgentOps routes");
  }
  const noise = classifyBrowserQaShellNoise({
    pageUrl: "https://ai-xia-staging.vercel.app/system/agent-ops/agents/system-agent",
    failedRequestLine: "HEAD https://ai-xia-staging.vercel.app/tasks — net::ERR_ABORTED",
  });
  if (!noise.isShellNoise) {
    fail("calendar/tasks HEAD abort on AgentOps must be classified as shell noise");
  }
  const keptOnFinance = filterBrowserQaFailedRequests("/finance", [
    "HEAD https://x/tasks — net::ERR_ABORTED",
  ]);
  if (keptOnFinance.kept.length !== 1) {
    fail("shell noise filter must not suppress failures outside AgentOps routes");
  }
  const filtered = filterBrowserQaFailedRequests(
    "/system/agent-ops/agents/qa-agent",
    [
      "HEAD https://x/tasks — net::ERR_ABORTED",
      "GET https://x/api/agentops/monitoring/status — 500",
    ],
  );
  if (filtered.filtered.length !== 1 || filtered.kept.length !== 1) {
    fail("shell noise filter must keep real API failures and drop AgentOps shell probes");
  }
  mustInclude(
    "src/lib/agentops/browserQa/playwrightBrowserQaRunner.ts",
    "filterBrowserQaFailedRequests",
  );
  mustInclude(
    "src/lib/agentops/browserQa/browserQaShellNoise.ts",
    "Known app-shell prefetch/probe abort",
  );
}

function verifyLayoutAndCopy(): void {
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "DeferredVisibleMount",
  );
  mustInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "agentops-deferred-memory",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "agentops-global-worker-details",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "Global queue:",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "COMPACT_QUEUED_MAX",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "This agent queue",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "agentops-queue-open-monitoring",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "agentops-issues-preview-only",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "agentops-drawer-field-sections",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "agentops-drawer-close",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "Approve finding",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "Reject finding",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "Promote finding",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentPermissionsPanel.tsx",
    "Read runtime memory records",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentPermissionsPanel.tsx",
    "Read assigned memory",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "INITIAL_RUNTIME_MEMORY_LIMIT",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "loadSharedGlobal",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "memory-summary-agent-hermes",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "Agent Hermes connected",
  );
  mustNotInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "Daily agent review",
  );
  mustNotInclude(
    "src/app/system/agent-ops/agents/[agentId]/page.tsx",
    "daily-agent execution",
  );
  // Activity / schedule should not spam Not recorded for missing timestamps.
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentActivityPanel.tsx",
    "Not recorded",
  );
  mustInclude("package.json", '"agentops:agent-detail-polish-verify"');

  // D-E4 owner readability
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "Show global worker details",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "agentops-owner-status-badges",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailOwnerReadability.ts",
    "ownerScheduleSummaryBanner",
  );
  mustInclude(
    "src/components/agentops/owner/StagingWorkerQueuePanel.tsx",
    "agentops-queue-empty-compact",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentSchedulePanel.tsx",
    "agentops-schedule-summary-banner",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "agentops-findings-empty-compact",
  );
  mustInclude(
    "src/lib/agentops/agents/agentDetailMemoryModel.ts",
    "isPromptLikeRuntimeMemory",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "Worker stale",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "STAGING WORKER · NO GITHUB",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx",
    "Approve finding",
  );
}

function main(): void {
  verifyDrawerSections();
  verifyShellNoiseFilter();
  verifyLayoutAndCopy();

  if (failures.length > 0) {
    console.error("agentops:agent-detail-polish-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log("agentops:agent-detail-polish-verify PASS");
}

main();
