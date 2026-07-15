import { AixiaBadge } from "@/components/aixia";
import type { CouncilAgentReplyView } from "@/lib/agentops/council/councilTurnModel";

type AgentOpsCouncilAgentPanelRowProps = {
  reply: CouncilAgentReplyView;
  selected: boolean;
  onSelect: () => void;
};

function statusTone(
  status: CouncilAgentReplyView["status"],
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "replied") return "emerald";
  if (status === "pending") return "cyan";
  if (status === "failed") return "rose";
  return "neutral";
}

function statusLabel(status: CouncilAgentReplyView["status"]): string {
  if (status === "replied") return "Replied";
  if (status === "pending") return "Pending";
  if (status === "failed") return "Failed";
  return "—";
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "AG"
  );
}

/** Compact side-panel row — select one agent; full text lives in the conversation column. */
export function AgentOpsCouncilAgentPanelRow({
  reply,
  selected,
  onSelect,
}: AgentOpsCouncilAgentPanelRowProps) {
  return (
    <button
      type="button"
      className={
        selected
          ? "agentops-council-agent-row is-selected"
          : "agentops-council-agent-row"
      }
      data-testid="agentops-council-response-row"
      data-expanded={selected ? "true" : "false"}
      data-status={reply.status}
      data-selected={selected ? "true" : "false"}
      onClick={onSelect}
      disabled={reply.status === "pending" || reply.status === "unavailable"}
    >
      <span className="agentops-council-agent-row__avatar" aria-hidden>
        {initials(reply.agentName)}
      </span>
      <span className="agentops-council-agent-row__identity">
        <span className="agentops-council-agent-row__name">{reply.agentName}</span>
        {reply.jobTitle ? (
          <span className="agentops-council-agent-row__role">{reply.jobTitle}</span>
        ) : null}
        {reply.status === "replied" && reply.preview ? (
          <span className="agentops-council-agent-row__preview">{reply.preview}</span>
        ) : null}
      </span>
      <AixiaBadge tone={statusTone(reply.status)}>{statusLabel(reply.status)}</AixiaBadge>
    </button>
  );
}
