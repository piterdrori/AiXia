import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AixiaBadge, AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import { AgentOpsEmptyState, AgentOpsFindingCard, type FindingType } from "@/components/agentops/owner";
import { AgentDetailPanelShell } from "@/components/agentops/owner/agent-detail/AgentDetailPanelShell";
import type { AgentOpsFinding } from "@/lib/agentops";
import {
  fetchArtifactSignedUrl,
  type AgentopsStorageArtifactRef,
} from "@/lib/agentops/agents/agentManualRunClient";
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
  runId?: string | null;
  stale?: boolean;
  cancelRequested?: boolean;
  cancelAcknowledged?: boolean;
  lockExpiresAt?: string | null;
  canCancel?: boolean;
  storageArtifacts?: AgentopsStorageArtifactRef[];
};

type AgentResultsPanelProps = {
  agentSlug: string;
  findings: AgentOpsFinding[];
  findingsUnavailable: boolean;
  findingsLoading: boolean;
  lastRunLabel: string;
  lastRunAt: string | null;
  durationLabel: string;
  openFindingsCountLabel: string;
  openFindingsScope: string;
  waitingApprovalLabel: string;
  waitingApprovalScope: string;
  verifiedFixesLabel: string;
  verifiedFixesScope: string;
  failedRunsLabel: string;
  failedRunsScope: string;
  drawer: AgentRunDrawerModel;
  onOpenLatestRun: () => void;
  onCloseDrawer: () => void;
  onCancelRun?: () => void;
  cancelBusy?: boolean;
};

export function AgentResultsPanel({
  agentSlug,
  findings,
  findingsUnavailable,
  findingsLoading,
  lastRunLabel,
  lastRunAt,
  durationLabel,
  openFindingsCountLabel,
  openFindingsScope,
  waitingApprovalLabel,
  waitingApprovalScope,
  verifiedFixesLabel,
  verifiedFixesScope,
  failedRunsLabel,
  failedRunsScope,
  drawer,
  onOpenLatestRun,
  onCloseDrawer,
  onCancelRun,
  cancelBusy = false,
}: AgentResultsPanelProps) {
  const navigate = useNavigate();
  const [artifactBusyPath, setArtifactBusyPath] = useState<string | null>(null);
  const [artifactError, setArtifactError] = useState<string | null>(null);

  const openSignedArtifact = async (ref: AgentopsStorageArtifactRef) => {
    if (!drawer.runId) {
      setArtifactError("Run id missing for signed artifact link.");
      return;
    }
    setArtifactBusyPath(ref.path);
    setArtifactError(null);
    const result = await fetchArtifactSignedUrl({
      runId: drawer.runId,
      artifactPath: ref.path,
      bucket: ref.bucket,
    });
    setArtifactBusyPath(null);
    if (!result.ok || !result.signedUrl) {
      setArtifactError(result.error || "Signed link failed.");
      return;
    }
    window.open(result.signedUrl, "_blank", "noopener,noreferrer");
  };

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
            <p className="text-white/45">Duration</p>
            <p className="text-white/85" data-testid="agentops-run-duration">
              {durationLabel}
            </p>
          </div>
          <div>
            <p className="text-white/45">Open findings</p>
            <p className="text-white/85">{openFindingsCountLabel}</p>
            <p className="text-xs text-white/40">{openFindingsScope}</p>
          </div>
          <div>
            <p className="text-white/45">Waiting for owner approval</p>
            <p className="text-white/85">{waitingApprovalLabel}</p>
            <p className="text-xs text-white/40">{waitingApprovalScope}</p>
          </div>
          <div>
            <p className="text-white/45">Verified fixes</p>
            <p className="text-white/85">{verifiedFixesLabel}</p>
            <p className="text-xs text-white/40">{verifiedFixesScope}</p>
          </div>
          <div>
            <p className="text-white/45">Failed runs</p>
            <p className="text-white/85">{failedRunsLabel}</p>
            <p className="text-xs text-white/40">{failedRunsScope}</p>
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
              <div className="flex flex-wrap gap-2">
                {drawer.canCancel && onCancelRun ? (
                  <AixiaButton
                    variant="secondary"
                    disabled={cancelBusy || drawer.cancelRequested}
                    onClick={onCancelRun}
                    data-testid="agentops-drawer-cancel-run"
                  >
                    {drawer.cancelRequested
                      ? "Cancel requested"
                      : cancelBusy
                        ? "Canceling…"
                        : "Cancel run"}
                  </AixiaButton>
                ) : null}
                <AixiaButton variant="secondary" onClick={onCloseDrawer}>
                  Close
                </AixiaButton>
              </div>
            </div>
            {drawer.stale ? (
              <p className="mb-3 text-sm text-amber-200/85" data-testid="agentops-drawer-stale-badge">
                Stale run — lock may have expired. Suggested: run cleanup-stale dry-run on the worker,
                or cancel / mark failed via owner action. No auto-delete.
              </p>
            ) : null}
            {drawer.cancelAcknowledged || drawer.executionStatus === "canceled" ? (
              <p className="mb-3 text-sm text-white/70" data-testid="agentops-drawer-canceled">
                Canceled by owner.
              </p>
            ) : drawer.cancelRequested ? (
              <p className="mb-3 text-sm text-amber-200/85" data-testid="agentops-drawer-cancel-requested">
                Cancel requested. The worker will stop at the next safe checkpoint. Current browser
                step may finish first.
              </p>
            ) : null}
            {(drawer.storageArtifacts?.length ?? 0) > 0 ? (
              <div className="mb-3 space-y-2" data-testid="agentops-drawer-storage-artifacts">
                <p className="text-sm text-white/70">Private staging artifacts</p>
                <ul className="space-y-1">
                  {drawer.storageArtifacts!.slice(0, 8).map((ref) => (
                    <li
                      key={ref.path}
                      className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1 text-xs text-white/75"
                    >
                      <AixiaBadge tone="emerald">uploaded/private</AixiaBadge>
                      <span>{ref.artifactType || "artifact"}</span>
                      <AixiaButton
                        variant="secondary"
                        disabled={artifactBusyPath === ref.path}
                        onClick={() => void openSignedArtifact(ref)}
                        data-testid="agentops-open-signed-artifact"
                      >
                        {artifactBusyPath === ref.path ? "Signing…" : "Open signed link"}
                      </AixiaButton>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-white/40">Signed link expires shortly.</p>
                {artifactError ? (
                  <p className="text-xs text-amber-200/80" role="status">
                    {artifactError}
                  </p>
                ) : null}
              </div>
            ) : null}
            <dl className="grid gap-3 text-sm">
              {(
                [
                  ["Execution status", drawer.executionStatus],
                  ["Run id", drawer.runId ?? "Not recorded"],
                  ["Work type", drawer.workType],
                  ["Trigger", drawer.trigger],
                  ["Started", drawer.startedAt ? new Date(drawer.startedAt).toLocaleString() : "Not recorded"],
                  ["Ended", drawer.endedAt ? new Date(drawer.endedAt).toLocaleString() : "Not recorded"],
                  ["Duration", drawer.duration],
                  [
                    "Lock expires",
                    drawer.lockExpiresAt
                      ? new Date(drawer.lockExpiresAt).toLocaleString()
                      : "Not recorded",
                  ],
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
