import { useNavigate } from "react-router-dom";

import { AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import { AgentOpsEmptyState, AgentOpsFindingCard, type FindingType } from "@/components/agentops/owner";
import { AgentDetailPanelShell } from "@/components/agentops/owner/agent-detail/AgentDetailPanelShell";
import type { AgentOpsFinding } from "@/lib/agentops";
import {
  mapFindingOwnerStatus,
  OWNER_FINDING_STATUS_LABEL,
} from "@/lib/agentops/findings/findingsLifecycleModel";

function findingTypeForIssue(finding: AgentOpsFinding): FindingType {
  const category = finding.category.toLowerCase();
  if (category.includes("improvement")) return "improvement";
  if (category.includes("feature")) return "feature";
  return "error";
}

function ageLabel(value: string): string {
  const ms = Date.now() - new Date(value).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export type AgentRunDrawerModel = {
  open: boolean;
  executionStatus: string;
  workType: string;
  trigger: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: string;
  reviewDepth: string;
  authenticationDepth: string;
  routesModules: string;
  browserToolUsage: string;
  rawObservations: string;
  filteredObservations: string;
  queuedFindings: string;
  duplicates: string;
  evidence: string;
  limitations: string;
  failureReason: string;
};

type AgentResultsPanelProps = {
  agentSlug: string;
  findings: AgentOpsFinding[];
  findingsUnavailable: boolean;
  findingsLoading: boolean;
  lastRunLabel: string;
  lastRunAt: string | null;
  openFindingsCountLabel: string;
  waitingApprovalLabel: string;
  verifiedFixesLabel: string;
  failedRunsLabel: string;
  drawer: AgentRunDrawerModel;
  onOpenLatestRun: () => void;
  onCloseDrawer: () => void;
};

export function AgentResultsPanel({
  agentSlug,
  findings,
  findingsUnavailable,
  findingsLoading,
  lastRunLabel,
  lastRunAt,
  openFindingsCountLabel,
  waitingApprovalLabel,
  verifiedFixesLabel,
  failedRunsLabel,
  drawer,
  onOpenLatestRun,
  onCloseDrawer,
}: AgentResultsPanelProps) {
  const navigate = useNavigate();

  return (
    <>
      <AgentDetailPanelShell
        title="Findings and results"
        id="agent-results"
        description="Compact view — full run evidence opens in the drawer."
        compact
        testId="agentops-agent-results-panel"
      >
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-white/45">Latest run result</p>
            <p className="text-white/85">{lastRunLabel}</p>
          </div>
          <div>
            <p className="text-white/45">Last run time</p>
            <p className="text-white/85">
              {lastRunAt ? new Date(lastRunAt).toLocaleString() : "Not recorded"}
            </p>
          </div>
          <div>
            <p className="text-white/45">Open findings</p>
            <p className="text-white/85">{openFindingsCountLabel}</p>
          </div>
          <div>
            <p className="text-white/45">Waiting for owner approval</p>
            <p className="text-white/85">{waitingApprovalLabel}</p>
          </div>
          <div>
            <p className="text-white/45">Verified fixes</p>
            <p className="text-white/85">{verifiedFixesLabel}</p>
          </div>
          <div>
            <p className="text-white/45">Failed runs</p>
            <p className="text-white/85">{failedRunsLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AixiaButton variant="secondary" onClick={onOpenLatestRun}>
            View latest run
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            onClick={() =>
              navigate(`/system/agent-ops/issues?agent=${encodeURIComponent(agentSlug)}`)
            }
          >
            View all findings
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            onClick={() => navigate("/system/agent-ops/monitoring")}
          >
            Open Monitoring
          </AixiaButton>
        </div>

        {findingsLoading ? (
          <p className="text-sm text-white/50" role="status">
            Loading findings…
          </p>
        ) : findingsUnavailable ? (
          <AixiaInfoBlock tone="gold" title="Findings unavailable">
            <p className="text-sm text-white/75">Findings could not be loaded for this agent.</p>
          </AixiaInfoBlock>
        ) : findings.length === 0 ? (
          <AgentOpsEmptyState
            title="No recent findings"
            description="No active findings for this agent are in the current Active Top 10 set."
          />
        ) : (
          <div className="space-y-3">
            {findings.slice(0, 5).map((finding) => {
              const ownerStatusMapped = mapFindingOwnerStatus(finding.status);
              return (
                <AgentOpsFindingCard
                  key={finding.id}
                  type={findingTypeForIssue(finding)}
                  title={finding.title}
                  statusLabel={OWNER_FINDING_STATUS_LABEL[ownerStatusMapped]}
                  route={finding.route ?? finding.module}
                  priority={finding.severity}
                  ageLabel={ageLabel(finding.created_at)}
                  onOpen={() =>
                    navigate(
                      `/system/agent-ops/issues/${encodeURIComponent(finding.issue_code)}`,
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </AgentDetailPanelShell>

      {drawer.open ? (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          data-testid="agentops-run-detail-drawer"
        >
          <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-white/10 bg-[#0b1220] p-5 shadow-xl sm:rounded-xl sm:border">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Latest run</h3>
              <AixiaButton variant="secondary" onClick={onCloseDrawer}>
                Close
              </AixiaButton>
            </div>
            <dl className="grid gap-3 text-sm">
              {(
                [
                  ["Execution status", drawer.executionStatus],
                  ["Work type", drawer.workType],
                  ["Trigger", drawer.trigger],
                  ["Started", drawer.startedAt ? new Date(drawer.startedAt).toLocaleString() : "Not recorded"],
                  ["Ended", drawer.endedAt ? new Date(drawer.endedAt).toLocaleString() : "Not recorded"],
                  ["Duration", drawer.duration],
                  ["Review depth", drawer.reviewDepth],
                  ["Authentication depth", drawer.authenticationDepth],
                  ["Routes / modules", drawer.routesModules],
                  ["Browser / tool usage", drawer.browserToolUsage],
                  ["Raw observations", drawer.rawObservations],
                  ["Filtered observations", drawer.filteredObservations],
                  ["Queued findings", drawer.queuedFindings],
                  ["Duplicates", drawer.duplicates],
                  ["Evidence", drawer.evidence],
                  ["Limitations", drawer.limitations],
                  ["Failure reason", drawer.failureReason],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-white/45">{label}</dt>
                  <dd className="text-white/85">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}
