import { AixiaBadge } from "@/components/aixia";
import type { AgentStatusStripModel } from "@/lib/agentops/agents/agentDetailControlCenter";

function toneFor(value: string): "emerald" | "amber" | "neutral" {
  if (
    value === "Active" ||
    value === "Fleet available" ||
    value === "Completed" ||
    value === "Idle" ||
    value === "Schedule executable" ||
    value === "Running" ||
    value === "Queued" ||
    /^[0-9]+ records/.test(value)
  ) {
    return "emerald";
  }
  if (
    value === "Paused" ||
    value === "Fleet degraded" ||
    value === "Fleet unavailable" ||
    value === "Failed" ||
    value === "Fleet fallback failed" ||
    value === "Error" ||
    value === "Blocked" ||
    value === "Needs attention" ||
    value === "Unavailable" ||
    value === "Memory unavailable" ||
    value === "Memory load slow" ||
    value === "Scheduler offline"
  ) {
    return "amber";
  }
  return "neutral";
}

/** Shorten long D-E2 memory strip status for owner-readable pills. */
function shortMemoryValue(value: string): string {
  const match = value.match(
    /(\d+)\s+runtime memory records\s*·\s*(\d+)\s+enabled/i,
  );
  if (match) return `${match[1]} records · ${match[2]} enabled`;
  if (/^0 runtime memory records/i.test(value)) return "0 records";
  return value.length > 42 ? `${value.slice(0, 40)}…` : value;
}

function shortScheduleValue(value: string): string {
  if (/executable by staging worker/i.test(value)) return "Schedule executable";
  if (/worker scheduler offline|Schedule saved · worker offline/i.test(value)) {
    return "Scheduler offline";
  }
  if (/Manual only/i.test(value)) return "Manual only";
  return value.length > 36 ? `${value.slice(0, 34)}…` : value;
}

function Cell({
  label,
  value,
  detail,
  testId,
}: {
  label: string;
  value: string;
  detail?: string;
  testId?: string;
}) {
  return (
    <div className="min-w-[7rem] max-w-[11rem] flex-1 space-y-1" data-testid={testId}>
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <AixiaBadge tone={toneFor(value)}>{value}</AixiaBadge>
      {detail ? (
        <p className="line-clamp-2 text-xs text-white/50" title={detail}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

type AgentStatusStripProps = {
  model: AgentStatusStripModel;
};

export function AgentStatusStrip({ model }: AgentStatusStripProps) {
  const memoryValue = shortMemoryValue(model.memory);
  const scheduleValue = shortScheduleValue(model.scheduleLabel);
  const showActivity =
    model.currentActivity &&
    model.currentActivity !== "Idle" &&
    !/^idle$/i.test(model.currentActivity);

  return (
    <div
      className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-3 lg:grid-cols-5"
      data-testid="agentops-agent-status-strip"
      role="status"
    >
      <Cell label="Owner status" value={model.agentStatus} testId="strip-agent-status" />
      <Cell
        label="Fleet Hermes"
        value={model.hermes}
        detail={model.hermesDetail}
        testId="strip-hermes-status"
      />
      <Cell
        label="Memory"
        value={memoryValue}
        detail={model.memoryDetail}
        testId="strip-memory-status"
      />
      <Cell
        label="Last run"
        value={model.lastScanResult}
        detail={model.lastScanLabel}
        testId="strip-last-scan"
      />
      <Cell
        label="Schedule"
        value={scheduleValue}
        detail={
          /offline/i.test(scheduleValue)
            ? "Runs when the staging worker is online."
            : undefined
        }
        testId="strip-schedule"
      />
      {showActivity ? (
        <Cell
          label="Current activity"
          value={model.currentActivity}
          testId="strip-current-activity"
        />
      ) : null}
    </div>
  );
}
