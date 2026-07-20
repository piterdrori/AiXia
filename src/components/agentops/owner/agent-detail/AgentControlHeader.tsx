import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreHorizontal, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import { AGENT_DETAIL_CC_COPY } from "@/lib/agentops/agents/agentDetailControlCenter";

type AgentControlHeaderProps = {
  displayName: string;
  username: string;
  jobTitle: string;
  responsibility: string;
  ownerStatusLabel: string;
  isPaused: boolean;
  isBlocked: boolean;
  statusUnknown: boolean;
  statusUpdating: boolean;
  agentSlug: string;
  runtimeAgentId: string | null;
  auditAvailable: boolean;
  browserQaAvailable: boolean;
  auditDisabledReason: string | null;
  browserQaDisabledReason: string | null;
  workerConnected: boolean;
  workerStatusLabel: string;
  workerHeartbeatLabel: string | null;
  queueLengthLabel: string | null;
  workerActiveRunId: string | null;
  runInProgress: boolean;
  activeRunId: string | null;
  currentActivityLabel: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onActivate: () => void;
  onPause: () => void;
  onRunAudit: () => void;
  onRunBrowserQa: () => void;
  onViewCurrentRun: () => void;
  onViewLatestRun: () => void;
};

export function AgentControlHeader({
  displayName,
  username,
  jobTitle,
  responsibility,
  ownerStatusLabel,
  isPaused,
  isBlocked,
  statusUnknown,
  statusUpdating,
  agentSlug,
  runtimeAgentId,
  auditAvailable,
  browserQaAvailable,
  auditDisabledReason,
  browserQaDisabledReason,
  workerConnected,
  workerStatusLabel,
  workerHeartbeatLabel,
  queueLengthLabel,
  workerActiveRunId,
  runInProgress,
  activeRunId,
  currentActivityLabel,
  onBack,
  onRefresh,
  onActivate,
  onPause,
  onRunAudit,
  onRunBrowserQa,
  onViewCurrentRun,
  onViewLatestRun,
}: AgentControlHeaderProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(username);
    } catch {
      /* clipboard may be unavailable */
    }
    setMenuOpen(false);
  };

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
          <p className="text-sm text-white/70" data-testid="agentops-owner-work-status">
            Owner work status: {ownerStatusLabel}
          </p>
          <p className="max-w-3xl text-xs text-white/45">{AGENT_DETAIL_CC_COPY.ownerStatusHelper}</p>
          <p
            className="text-sm text-white/70"
            data-testid="agentops-execution-worker-status"
          >
            {AGENT_DETAIL_CC_COPY.executionWorkerLabel}: {workerStatusLabel}
          </p>
          {workerHeartbeatLabel ? (
            <p className="text-xs text-white/45" data-testid="agentops-worker-heartbeat">
              Last heartbeat: {workerHeartbeatLabel}
            </p>
          ) : null}
          {queueLengthLabel ? (
            <p className="text-xs text-white/45" data-testid="agentops-worker-queue-length">
              Queue length: {queueLengthLabel}
            </p>
          ) : null}
          {workerActiveRunId ? (
            <p className="text-xs text-white/45" data-testid="agentops-worker-active-run">
              Active run: {workerActiveRunId}
            </p>
          ) : null}
          {currentActivityLabel ? (
            <p className="text-sm text-cyan-200/90" data-testid="agentops-manual-run-activity">
              Current activity: {currentActivityLabel}
              {runInProgress && currentActivityLabel !== "Queued for staging worker" ? "…" : ""}
            </p>
          ) : null}
        </div>

        <div className="relative flex flex-wrap items-center gap-2">
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
              title={
                statusUnknown
                  ? "Owner status is Unknown — Pause will persist an explicit owner state."
                  : undefined
              }
            >
              Pause
            </AixiaButton>
          )}
          <AixiaButton
            disabled={!auditAvailable || runInProgress || isBlocked}
            title={
              runInProgress
                ? "A run is already queued or active"
                : auditDisabledReason ?? undefined
            }
            onClick={onRunAudit}
            data-testid="agentops-run-audit-now"
          >
            {runInProgress ? "Queued…" : "Run audit now"}
          </AixiaButton>
          <AixiaButton
            disabled={!browserQaAvailable || runInProgress || isBlocked}
            title={
              runInProgress
                ? "A run is already queued or active"
                : browserQaDisabledReason ?? undefined
            }
            onClick={onRunBrowserQa}
            data-testid="agentops-run-browser-qa-now"
          >
            {runInProgress ? "Queued…" : "Run Browser QA now"}
          </AixiaButton>
          {runInProgress && activeRunId ? (
            <AixiaButton variant="secondary" onClick={onViewCurrentRun}>
              View current run
            </AixiaButton>
          ) : null}
          <div className="relative">
            <AixiaButton
              variant="secondary"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              data-testid="agentops-agent-more-actions"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </AixiaButton>
            {menuOpen ? (
              <div
                className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-white/15 bg-[#0b1220] p-1 shadow-xl"
                role="menu"
                data-testid="agentops-agent-more-menu"
              >
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/system/agent-ops/monitoring");
                  }}
                >
                  Open Monitoring
                </button>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onViewLatestRun();
                  }}
                >
                  View latest run
                </button>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/system/agent-ops/issues?agent=${encodeURIComponent(agentSlug)}`);
                  }}
                >
                  View all findings
                </button>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                  role="menuitem"
                  disabled={!runtimeAgentId}
                  onClick={() => {
                    if (!runtimeAgentId) return;
                    setMenuOpen(false);
                    navigate(`/system/agent-ops/agents/runtime?agent=${encodeURIComponent(runtimeAgentId)}`);
                  }}
                >
                  View runtime record
                </button>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                  role="menuitem"
                  onClick={() => void copyUsername()}
                >
                  Copy agent username
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-white/50">
        <AixiaBadge tone={workerConnected ? "emerald" : "neutral"}>
          {AGENT_DETAIL_CC_COPY.stagingQueueBadge}
        </AixiaBadge>
        <AixiaBadge tone={auditAvailable ? "emerald" : "neutral"}>
          Run audit:{" "}
          {auditAvailable
            ? AGENT_DETAIL_CC_COPY.runAuditConnected
            : auditDisabledReason ?? AGENT_DETAIL_CC_COPY.runAuditNotConnected}
        </AixiaBadge>
        <AixiaBadge tone={browserQaAvailable ? "emerald" : "neutral"}>
          Browser QA:{" "}
          {browserQaAvailable
            ? AGENT_DETAIL_CC_COPY.runBrowserQaConnected
            : browserQaDisabledReason ?? AGENT_DETAIL_CC_COPY.runBrowserQaNotConnected}
        </AixiaBadge>
      </div>
    </header>
  );
}
