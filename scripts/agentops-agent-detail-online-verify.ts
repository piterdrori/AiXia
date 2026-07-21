/**
 * Phase D-E5 — Agent Detail online-state verify (static).
 * Worker/scheduler/tools copy, prompt-like memory off main Runtime, diagnostics collapsed,
 * online vs offline honesty without requiring a live worker process.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  isDiagnosticRuntimeMemory,
  isPromptLikeRuntimeMemory,
  partitionRuntimeMemory,
} from "../src/lib/agentops/agents/agentDetailMemoryModel.ts";
import type { AgentOpsRuntimeMemoryRow } from "../src/lib/agentops/db/agentOpsRuntimeTypes.ts";
import {
  OWNER_SCHEDULE_BADGE,
  OWNER_TOOLS_BADGE,
  OWNER_WORKER_COPY,
  ownerScheduleBadge,
  ownerScheduleSummaryBanner,
  ownerToolsBadge,
  ownerWorkerLabel,
} from "../src/lib/agentops/agents/agentDetailOwnerReadability.ts";

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

function row(
  partial: Partial<AgentOpsRuntimeMemoryRow> & { content: unknown },
): AgentOpsRuntimeMemoryRow {
  return {
    id: partial.id ?? "id",
    scope: partial.scope ?? "agent",
    agent_id: partial.agent_id ?? "uuid",
    content: partial.content,
    source: partial.source ?? "system",
    approved: partial.approved ?? false,
    created_at: partial.created_at ?? "2026-07-01T00:00:00.000Z",
    environment: partial.environment ?? "staging",
  } as AgentOpsRuntimeMemoryRow;
}

function verifyOnlineOfflineCopy(): void {
  if (
    ownerWorkerLabel({ workerConnected: true, workerStatus: "connected" }) !==
    OWNER_WORKER_COPY.online
  ) {
    fail("fresh heartbeat must show Worker online");
  }
  if (ownerWorkerLabel({ workerConnected: true, workerStatus: "stale" }) !== OWNER_WORKER_COPY.offline) {
    fail("stale heartbeat must show Worker offline");
  }
  if (ownerWorkerLabel({ workerConnected: false }) !== OWNER_WORKER_COPY.offline) {
    fail("disconnected must show Worker offline");
  }

  if (
    ownerScheduleBadge({
      scheduleEnabled: true,
      schedulerConnected: true,
      isManual: false,
    }) !== OWNER_SCHEDULE_BADGE.executable
  ) {
    fail("fresh scheduler must show Schedule executable");
  }
  if (
    ownerScheduleBadge({
      scheduleEnabled: true,
      schedulerConnected: false,
      isManual: false,
    }) !== OWNER_SCHEDULE_BADGE.offline
  ) {
    fail("stale scheduler must show Scheduler offline");
  }

  if (
    ownerToolsBadge({ auditAvailable: true, browserQaAvailable: true }) !== OWNER_TOOLS_BADGE.ready
  ) {
    fail("engines ready must show Audit tools ready");
  }
  if (
    ownerToolsBadge({ auditAvailable: false, browserQaAvailable: false }) !==
    OWNER_TOOLS_BADGE.unavailable
  ) {
    fail("engines down must show Audit tools unavailable");
  }

  const onlineBanner = ownerScheduleSummaryBanner({
    runtimeStatus: "Ready",
    isOwnerPaused: false,
    scheduleEnabled: true,
    isManual: false,
    workerConnected: true,
    schedulerConnected: true,
    hasQueuedScheduledRun: false,
  });
  if (onlineBanner.title !== "Schedule ready") {
    fail(`online schedule banner title expected Schedule ready, got ${onlineBanner.title}`);
  }

  const offlineBanner = ownerScheduleSummaryBanner({
    runtimeStatus: "Offline",
    isOwnerPaused: false,
    scheduleEnabled: true,
    isManual: false,
    workerConnected: false,
    schedulerConnected: false,
    hasQueuedScheduledRun: false,
  });
  if (!/will run when the staging worker is online/i.test(offlineBanner.detail)) {
    fail("offline schedule banner must say it will run when worker is online");
  }
}

function verifyPromptLikeHiddenFromMainRuntime(): void {
  const useful = row({
    id: "u1",
    content: "Prefer staging-only deploys",
    approved: true,
    source: "owner",
  });
  const prompts = [
    "Inspect this page and tell me: what is broken",
    "remember this test rule",
    "hello, describe your role",
  ].map((content, i) => row({ id: `p${i}`, content, source: "chat" }));

  for (const p of prompts) {
    if (!isPromptLikeRuntimeMemory(p)) fail(`must classify prompt-like: ${String(p.content)}`);
    if (!isDiagnosticRuntimeMemory(p)) fail(`prompt-like must be diagnostic: ${p.id}`);
  }

  const part = partitionRuntimeMemory([useful, ...prompts], []);
  if (part.usefulAgentRows.some((r) => r.id.startsWith("p"))) {
    fail("prompt-like must not appear in main Runtime usefulAgentRows");
  }
  if (part.counts.diagnostic < 3) fail("diagnostics count must include prompt-like rows");
  if (part.counts.runtimeTotal !== 4) fail("runtimeTotal must stay truthful (4)");
}

function verifyUiContracts(): void {
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "useState(false)",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "diagnosticsOpen",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "usefulAgentRows",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx",
    "diagnosticAgentRows",
  );
  mustInclude("src/lib/agentops/agents/agentDetailMemoryModel.ts", "PROMPT_LIKE_ANYWHERE_RE");
  mustInclude("src/lib/agentops/agents/agentDetailMemoryModel.ts", "inspect this page");
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "ownerWorkerLabel",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "Run audit now",
  );
  mustInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "Run Browser QA now",
  );
  mustNotInclude(
    "src/components/agentops/owner/agent-detail/AgentControlHeader.tsx",
    "workflow_dispatch",
  );
}

function main(): void {
  verifyOnlineOfflineCopy();
  verifyPromptLikeHiddenFromMainRuntime();
  verifyUiContracts();

  if (failures.length) {
    console.error("agent-detail-online-verify FAILED");
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        command: "agentops:agent-detail-online-verify",
        checks: ["online_offline_copy", "prompt_like_hidden", "ui_contracts"],
      },
      null,
      2,
    ),
  );
}

main();
