import { AixiaBadge } from "@/components/aixia";
import type { AgentStatusStripModel } from "@/lib/agentops/agents/agentDetailControlCenter";

function toneFor(value: string): "emerald" | "amber" | "neutral" {
  if (
    value === "Active" ||
    value === "Fleet available" ||
    value === "Completed" ||
    value === "Idle"
  ) {
    return "emerald";
  }
  if (
    value === "Paused" ||
    value === "Fleet degraded" ||
    value === "Fleet unavailable" ||
    value === "Failed" ||
    value === "Error" ||
    value === "Blocked" ||
    value === "Needs attention" ||
    value === "Unavailable" ||
    value === "Memory unavailable" ||
    value === "Memory load slow"
  ) {
    return "amber";
  }
  return "neutral";
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
    <div className="min-w-[8.5rem] flex-1 space-y-1" data-testid={testId}>
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <AixiaBadge tone={toneFor(value)}>{value}</AixiaBadge>
      {detail ? <p className="text-xs text-white/50">{detail}</p> : null}
    </div>
  );
}

type AgentStatusStripProps = {
  model: AgentStatusStripModel;
};

export function AgentStatusStrip({ model }: AgentStatusStripProps) {
  return (
    <div
      className="flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
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
        value={model.memory}
        detail={model.memoryDetail}
        testId="strip-memory-status"
      />
      <Cell
        label="Last scan"
        value={model.lastScanResult}
        detail={model.lastScanLabel}
        testId="strip-last-scan"
      />
      <Cell
        label="Schedule"
        value={model.scheduleLabel}
        detail={model.scheduleDetail}
        testId="strip-schedule"
      />
      <Cell
        label="Current activity"
        value={model.currentActivity}
        testId="strip-current-activity"
      />
    </div>
  );
}
