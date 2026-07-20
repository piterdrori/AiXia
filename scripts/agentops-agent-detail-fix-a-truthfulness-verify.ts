/**
 * Fix A — Agent Detail identity / status / memory truthfulness static verify.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAgentStatusStrip,
  buildScheduleStripLabel,
  mapHermesRuntimeToStripStatus,
  mapMemoryCountsToStripStatus,
  mapOwnerFacingToStripStatus,
} from "../src/lib/agentops/agents/agentDetailControlCenter.ts";
import { evaluateHermesSafeConnectionTest } from "../src/lib/agentops/agents/agentDetailHermesConnection.ts";
import {
  formatDurationMs,
  isSyntheticPersonaAgentId,
  mapFeedbackStatusToOwnerFacing,
  resolveCanonicalSlugFromRoute,
  resolveOwnerFacingStatus,
} from "../src/lib/agentops/agents/agentRuntimeIdentityModel.ts";
import {
  nextRunDisplayLabel,
  normalizeDetailSchedule,
  DEFAULT_AGENT_DETAIL_SCHEDULE,
  theoreticalNextDueLabel,
} from "../src/lib/agentops/agents/agentDetailScheduleModel.ts";
import { CANONICAL_AGENTS } from "../src/lib/agentops/canonicalAgents.ts";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`AGENT DETAIL FIX A REGRESSION: ${message}`);
  }
}

function main(): void {
  assert(resolveCanonicalSlugFromRoute("system-agent") === "system-agent", "slug resolves");
  assert(resolveCanonicalSlugFromRoute("System Agent") === "system-agent", "name resolves");
  assert(resolveCanonicalSlugFromRoute("not-an-agent") === null, "unknown slug null");

  assert(isSyntheticPersonaAgentId("agentops-owner") === true, "synthetic detected");
  assert(isSyntheticPersonaAgentId("system-agent") === false, "canonical not synthetic");
  assert(
    isSyntheticPersonaAgentId("a27b8930-bad9-43e7-892d-00236e7c7d64") === false,
    "uuid not synthetic",
  );

  const fromFeedback = resolveOwnerFacingStatus({
    feedbackRaw: "quiet",
    runtimeStatus: "active",
  });
  assert(fromFeedback.status === "Paused", "feedback overrides runtime");
  assert(fromFeedback.source === "owner_feedback", "feedback source");

  const fromRuntime = resolveOwnerFacingStatus({
    feedbackRaw: null,
    runtimeStatus: "paused",
  });
  assert(fromRuntime.status === "Paused", "runtime paused");
  assert(fromRuntime.source === "runtime_agent", "runtime source");

  const unknown = resolveOwnerFacingStatus({
    feedbackRaw: null,
    runtimeStatus: null,
  });
  assert(unknown.status === "Unknown", "no status → Unknown");
  assert(mapFeedbackStatusToOwnerFacing(null) === "Unknown", "null feedback unknown");

  const hermes = mapHermesRuntimeToStripStatus({
    loaded: true,
    ok: true,
    transportReachable: true,
  });
  assert(hermes.status === "Fleet available", "fleet available label");
  assert(!hermes.status.includes("Connected"), "no Connected for fleet");

  const hermesTestMissing = evaluateHermesSafeConnectionTest({
    health: { ok: true, transportReachable: true, status: "ok", mode: "live", checkedAt: "", message: "" } as never,
    healthError: null,
    runtimeAgentId: null,
    memoryQueryOk: false,
    memoryError: null,
    assignedMemoryCount: 0,
  });
  assert(
    hermesTestMissing.status === "Agent runtime identity missing",
    "hermes test requires runtime uuid",
  );

  const hermesTestFound = evaluateHermesSafeConnectionTest({
    health: {
      ok: true,
      transportReachable: true,
      status: "ok",
      mode: "live",
      checkedAt: "2026-07-15T00:00:00.000Z",
      message: "ok",
      loadError: null,
    } as never,
    healthError: null,
    runtimeAgentId: "a27b8930-bad9-43e7-892d-00236e7c7d64",
    memoryQueryOk: true,
    memoryError: null,
    assignedMemoryCount: 120,
  });
  assert(hermesTestFound.status.includes("memory found"), "hermes test uses runtime memory count");
  assert(hermesTestFound.detail.includes("120"), "120 records in detail");

  const memEmptyDraftIsIgnored = mapMemoryCountsToStripStatus({
    loaded: true,
    error: null,
    assignedCount: 120,
    enabledCount: 12,
  });
  assert(memEmptyDraftIsIgnored.status.includes("120"), "runtime memory count shown");
  assert(!memEmptyDraftIsIgnored.status.includes("No assigned"), "nonempty not empty");

  const memError = mapMemoryCountsToStripStatus({
    loaded: true,
    error: "timeout",
    assignedCount: 0,
    enabledCount: 0,
  });
  assert(memError.status === "Memory unavailable", "error ≠ zero");

  assert(formatDurationMs(189000) === "3m 9s", "duration 3m 9s");
  assert(formatDurationMs(42000) === "42s", "duration 42s");
  assert(formatDurationMs(null) === "Not recorded", "duration null");

  const scheduled = normalizeDetailSchedule({
    ...DEFAULT_AGENT_DETAIL_SCHEDULE,
    enableSchedule: true,
    frequencyType: "every_hours",
    intervalValue: 6,
    ownerEnabled: true,
  });
  assert(nextRunDisplayLabel(scheduled, "2026-07-16T04:52:00.000Z") === "Saved · worker scheduler offline", "next due offline when scheduler disconnected");
  assert(
    theoreticalNextDueLabel(scheduled, "2026-07-16T04:52:00.000Z").includes("2026"),
    "theoretical due shown separately",
  );

  const scheduleStrip = buildScheduleStripLabel({ configured: true, manualOnly: false });
  assert(scheduleStrip.label === "Saved · worker scheduler offline", "strip schedule honesty offline");
  const scheduleStripOnline = buildScheduleStripLabel({
    configured: true,
    manualOnly: false,
    schedulerConnected: true,
  });
  assert(
    scheduleStripOnline.label === "Saved · executable by staging worker",
    "strip schedule honesty online",
  );

  const strip = buildAgentStatusStrip({
    ownerStatus: "Paused",
    isBlocked: false,
    rosterRow: null,
    monitoringUnavailable: false,
    monitoringResolving: false,
    hermes: "Fleet available",
    hermesDetail: "x",
    memory: "120 assigned · 12 active",
    memoryDetail: "y",
    scheduleLabel: scheduleStrip.label,
    scheduleDetail: scheduleStrip.detail,
  });
  assert(strip.agentStatus === "Paused", "owner paused on strip");
  assert(strip.hermes === "Fleet available", "fleet hermes on strip");
  assert(strip.scheduleLabel === "Saved · worker scheduler offline", "schedule strip");
  assert(mapOwnerFacingToStripStatus("Unknown", "not_run") === "Unknown", "unknown strip");

  const page = read("src/app/system/agent-ops/agents/[agentId]/page.tsx");
  assert(page.includes("resolveAgentRuntimeIdentity"), "page uses identity resolver");
  assert(!page.includes("getAgentOpsManagedAgents"), "no synthetic managed agents on detail");
  assert(page.includes('agentId: canonical.id'), "status write uses canonical slug");

  const header = read("src/components/agentops/owner/agent-detail/AgentControlHeader.tsx");
  assert(header.includes("Open Monitoring"), "more menu has connected actions");
  assert(!header.includes("More actions not connected yet"), "empty more menu removed");

  const memory = read("src/components/agentops/owner/agent-detail/AgentMemoryHermesPanel.tsx");
  assert(memory.includes("fetchAgentScopedMemory"), "runtime memory bridge");
  assert(memory.includes("Owner draft"), "owner drafts preserved");
  assert(memory.includes("Read-only"), "runtime read-only");

  const schedule = read("src/components/agentops/owner/agent-detail/AgentSchedulePanel.tsx");
  assert(schedule.includes("Edit schedule"), "schedule progressive disclosure");
  assert(schedule.includes("Next due"), "next due label");
  assert(schedule.includes("worker scheduler offline") || schedule.includes("executable by staging worker"), "execution connection honesty");

  const stripUi = read("src/components/agentops/owner/agent-detail/AgentStatusStrip.tsx");
  assert(stripUi.includes("Owner status"), "owner status cell");
  assert(stripUi.includes('label="Schedule"'), "schedule cell not next run");
  assert(!stripUi.includes("Next run"), "no next run claim");

  const activity = read("src/components/agentops/owner/agent-detail/AgentActivityPanel.tsx");
  assert(activity.includes("chat messages are not listed"), "activity excludes chat");

  const results = read("src/components/agentops/owner/agent-detail/AgentResultsPanel.tsx");
  assert(results.includes("durationLabel"), "duration mapped");
  assert(results.includes("openFindingsScope"), "scope labels");

  assert(CANONICAL_AGENTS.length === 12, "12 canonical agents");

  console.log(
    JSON.stringify(
      {
        ok: true,
        fix: "A",
        identityResolver: true,
        syntheticPersonaRemoved: true,
        hermesFleetLabeled: true,
        runtimeMemoryBridge: true,
        nextDueCalculatedOnly: true,
        durationMsFormat: true,
      },
      null,
      2,
    ),
  );
}

main();
