import { AgentDetailPanelShell } from "@/components/agentops/owner/agent-detail/AgentDetailPanelShell";
import {
  operationalActivityLabel,
  selectOperationalActivity,
} from "@/lib/agentops/agents/agentDetailPhaseB1Semantics";
import type { AgentOpsAgentTimelineItem } from "@/lib/agentops";

const OPERATIONAL_HINTS = [
  "schedule",
  "activated",
  "paused",
  "audit",
  "browser qa",
  "finding",
  "memory",
  "hermes",
  "failed",
  "approved",
  "rejected",
] as const;

function isOperationalEvent(item: AgentOpsAgentTimelineItem): boolean {
  const haystack = `${item.eventType} ${item.title} ${item.summary}`.toLowerCase();
  if (haystack.includes("chat") || haystack.includes("message")) return false;
  return OPERATIONAL_HINTS.some((hint) => haystack.includes(hint)) || Boolean(item.eventType);
}

type AgentActivityPanelProps = {
  timeline: AgentOpsAgentTimelineItem[];
  unavailable: boolean;
  loading: boolean;
};

export function AgentActivityPanel({ timeline, unavailable, loading }: AgentActivityPanelProps) {
  const filtered = selectOperationalActivity(
    timeline.filter(isOperationalEvent),
    5,
  );

  return (
    <AgentDetailPanelShell
      title="Activity"
      id="agent-activity"
      description="Operational events only — chat messages are not listed here."
      compact
      defaultCollapsed
      testId="agentops-agent-activity-panel"
    >
      {loading ? (
        <p className="text-sm text-white/50" role="status">
          Loading activity…
        </p>
      ) : unavailable ? (
        <p className="text-sm text-white/60">Unavailable</p>
      ) : filtered.items.length === 0 ? (
        <p className="text-sm text-white/60">No recent operational activity.</p>
      ) : (
        <ul className="divide-y divide-white/10" data-testid="agentops-recent-activity">
          {filtered.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-white/90">{operationalActivityLabel(item)}</p>
                <p className="text-white/55">{item.summary || item.title}</p>
              </div>
              <time className="text-white/45">
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Not recorded"}
              </time>
            </li>
          ))}
        </ul>
      )}
    </AgentDetailPanelShell>
  );
}
