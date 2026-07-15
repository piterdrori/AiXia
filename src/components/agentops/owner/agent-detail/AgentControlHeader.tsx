import { ArrowLeft, MoreHorizontal, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import { AGENT_DETAIL_CC_COPY } from "@/lib/agentops/agents/agentDetailControlCenter";

type AgentControlHeaderProps = {
  displayName: string;
  username: string;
  jobTitle: string;
  responsibility: string;
  isPaused: boolean;
  isBlocked: boolean;
  statusUpdating: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onActivate: () => void;
  onPause: () => void;
};

export function AgentControlHeader({
  displayName,
  username,
  jobTitle,
  responsibility,
  isPaused,
  isBlocked,
  statusUpdating,
  onBack,
  onRefresh,
  onActivate,
  onPause,
}: AgentControlHeaderProps) {
  return (
    <header className="space-y-4" data-testid="agentops-agent-control-header">
      <div className="flex flex-wrap items-center gap-3">
        <AixiaButton variant="secondary" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agents
        </AixiaButton>
        <AixiaButton variant="secondary" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </AixiaButton>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold text-white">{displayName}</h1>
          <p className="text-sm text-white/60">
            {username} · {jobTitle}
          </p>
          <p className="max-w-3xl text-sm text-white/80">{responsibility}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPaused ? (
            <AixiaButton
              variant="secondary"
              disabled={statusUpdating || isBlocked}
              onClick={onActivate}
            >
              Activate
            </AixiaButton>
          ) : (
            <AixiaButton
              variant="secondary"
              disabled={statusUpdating || isBlocked}
              onClick={onPause}
            >
              Pause
            </AixiaButton>
          )}
          <AixiaButton
            disabled
            title={AGENT_DETAIL_CC_COPY.runAuditNotConnected}
          >
            Run audit now
          </AixiaButton>
          <AixiaButton
            disabled
            title={AGENT_DETAIL_CC_COPY.runBrowserQaNotConnected}
          >
            Run Browser QA now
          </AixiaButton>
          <AixiaButton variant="secondary" disabled title="More actions not connected yet">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </AixiaButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-white/50">
        <AixiaBadge tone="neutral">Run audit: {AGENT_DETAIL_CC_COPY.runAuditNotConnected}</AixiaBadge>
        <AixiaBadge tone="neutral">
          Browser QA: {AGENT_DETAIL_CC_COPY.runBrowserQaNotConnected}
        </AixiaBadge>
      </div>
    </header>
  );
}
