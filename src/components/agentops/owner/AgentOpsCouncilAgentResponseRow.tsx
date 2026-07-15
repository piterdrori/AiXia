import { ChevronDown, ChevronRight, ExternalLink, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import type { CouncilAgentReplyView } from "@/lib/agentops/council/councilTurnModel";

type AgentOpsCouncilAgentResponseRowProps = {
  reply: CouncilAgentReplyView;
  expanded: boolean;
  onToggle: () => void;
  onSpeak?: (text: string, messageId: string) => void;
  speaking?: boolean;
  onStopSpeak?: () => void;
};

function statusTone(status: CouncilAgentReplyView["status"]): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "replied") return "emerald";
  if (status === "pending") return "cyan";
  if (status === "failed") return "rose";
  return "neutral";
}

function statusLabel(status: CouncilAgentReplyView["status"]): string {
  if (status === "replied") return "Replied";
  if (status === "pending") return "Pending";
  if (status === "failed") return "Failed";
  return "Unavailable";
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

export function AgentOpsCouncilAgentResponseRow({
  reply,
  expanded,
  onToggle,
  onSpeak,
  speaking = false,
  onStopSpeak,
}: AgentOpsCouncilAgentResponseRowProps) {
  const navigate = useNavigate();
  const canOpenAgent = Boolean(reply.agentId);

  return (
    <div
      className="agentops-council-response-row"
      data-expanded={expanded ? "true" : "false"}
      data-status={reply.status}
      data-testid="agentops-council-response-row"
    >
      <button
        type="button"
        className="agentops-council-response-row__header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="agentops-council-response-row__avatar" aria-hidden>
          {initials(reply.agentName)}
        </span>
        <span className="agentops-council-response-row__identity">
          <span className="agentops-council-response-row__name">{reply.agentName}</span>
          {reply.jobTitle ? (
            <span className="agentops-council-response-row__role">{reply.jobTitle}</span>
          ) : null}
        </span>
        <span className="agentops-council-response-row__preview">{reply.preview}</span>
        <AixiaBadge tone={statusTone(reply.status)}>{statusLabel(reply.status)}</AixiaBadge>
        <span className="agentops-council-response-row__chevron" aria-hidden>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {expanded ? (
        <div className="agentops-council-response-row__body">
          <p className="agentops-council-response-row__full">{reply.content || "No content."}</p>
          <div className="agentops-council-response-row__meta">
            <span>{reply.createdAt ? new Date(reply.createdAt).toLocaleString() : "—"}</span>
            <div className="agentops-council-response-row__actions">
              {reply.status === "replied" && reply.content && onSpeak ? (
                speaking ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    className="text-xs px-2.5 py-1"
                    onClick={onStopSpeak}
                  >
                    Stop
                  </AixiaButton>
                ) : (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    className="text-xs px-2.5 py-1"
                    onClick={() => onSpeak(reply.content, reply.messageId)}
                  >
                    <Volume2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Speak
                  </AixiaButton>
                )
              ) : null}
              {canOpenAgent ? (
                <AixiaButton
                  type="button"
                  variant="secondary"
                  className="text-xs px-2.5 py-1"
                  onClick={() =>
                    navigate(`/system/agent-ops/agents/${encodeURIComponent(reply.agentId!)}`)
                  }
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Open agent
                </AixiaButton>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
