import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { AixiaButton } from "@/components/aixia";
import {
  AgentOpsActionCard,
  AgentOpsAttentionList,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  AgentOpsStatusSummary,
  useAgentOpsMonitoringStatus,
  useAgentOpsOwnerGate,
  type AttentionItem,
} from "@/components/agentops/owner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getAgentOpsDashboardSummary } from "@/lib/agentops";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

type MemoryCounts = {
  needsReview: number | null;
  approved: number | null;
  applied: number | null;
  loaded: boolean;
};

type DraftCounts = {
  pendingDrafts: number | null;
  loaded: boolean;
};

function unavailableMetric(loaded: boolean, value: ReactNode): ReactNode {
  return loaded ? value : "Unavailable";
}

function formatReviewTime(iso: string | null | undefined): string {
  if (!iso) return "Unavailable";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  const now = new Date();
  const sameDay =
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate();
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
  return sameDay ? `Today, ${time}` : date.toLocaleString();
}

function systemStatus(input: {
  monitoringLoaded: boolean;
  failed: number;
  missing: number;
  pendingDrafts: number;
  pendingMemory: number;
  verificationPending: number;
  runFailed: boolean;
}): { label: string; tone: "success" | "warning" | "default"; hint?: string } {
  if (!input.monitoringLoaded) {
    return {
      label: "Status unavailable",
      tone: "warning",
      hint: "We could not verify the latest system state.",
    };
  }
  if (
    input.failed > 0 ||
    input.missing > 0 ||
    input.runFailed ||
    input.pendingDrafts > 0 ||
    input.pendingMemory > 0 ||
    input.verificationPending > 0
  ) {
    return { label: "Needs attention", tone: "warning" };
  }
  return { label: "Healthy", tone: "success" };
}

function OverviewDegradedBanner({
  onRetry,
  onOpenMonitoring,
}: {
  onRetry: () => void;
  onOpenMonitoring: () => void;
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3"
    >
      <p className="text-sm font-medium text-amber-100">
        Some AgentOps data is temporarily unavailable
      </p>
      <p className="mt-1 text-sm text-amber-100/75">
        We could not load the latest monitoring status. The rest of AgentOps is still available.
      </p>
      <p className="mt-1 text-xs text-amber-100/55">Status data could not be refreshed.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-sm text-amber-50 hover:bg-amber-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onOpenMonitoring}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/85 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Open Monitoring
        </button>
      </div>
    </div>
  );
}

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-16 rounded-xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

export default function AgentOpsPage() {
  usePageTitle("AgentOps");
  const navigate = useNavigate();
  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();
  const {
    daily12,
    loading: monitoringLoading,
    error: monitoringError,
    refresh: refreshMonitoring,
  } = useAgentOpsMonitoringStatus(isOwner);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [draftCounts, setDraftCounts] = useState<DraftCounts>({
    pendingDrafts: null,
    loaded: false,
  });
  const [memoryCounts, setMemoryCounts] = useState<MemoryCounts>({
    needsReview: null,
    approved: null,
    applied: null,
    loaded: false,
  });
  const [verificationPending, setVerificationPending] = useState<number | null>(null);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);

  const monitoringLoaded = Boolean(daily12) && !monitoringError && !monitoringLoading;
  const monitoringUnavailable = Boolean(monitoringError) && !monitoringLoading;
  const sectionLoading = gateLoading || monitoringLoading || dashboardLoading;

  const loadDashboard = useCallback(async () => {
    if (!isOwner) return;
    setDashboardLoading(true);

    try {
      const [summaryResult, draftsResponse, pendingMemoryResponse, approvedMemoryResponse, appliedMemoryResponse] =
        await Promise.all([
          getAgentOpsDashboardSummary(),
          fetchWithTimeout("/api/agentops/monitoring/drafts?status=pending", { timeoutMs: 15_000 }),
          fetchWithTimeout("/api/agentops/monitoring/memory-proposals?status=pending", {
            timeoutMs: 15_000,
          }),
          fetchWithTimeout("/api/agentops/monitoring/memory-proposals?status=owner_approved", {
            timeoutMs: 15_000,
          }),
          fetchWithTimeout("/api/agentops/monitoring/memory-proposals?status=applied", {
            timeoutMs: 15_000,
          }),
        ]);

      if (summaryResult.error) {
        setVerificationPending(null);
      } else {
        setVerificationPending(summaryResult.data?.verificationPendingCount ?? 0);
      }
      setDashboardLoaded(!summaryResult.error);

      if (draftsResponse.ok) {
        const draftsPayload = (await draftsResponse.json()) as { drafts?: unknown[] };
        setDraftCounts({
          pendingDrafts: draftsPayload.drafts?.length ?? 0,
          loaded: true,
        });
      } else {
        setDraftCounts({ pendingDrafts: null, loaded: false });
      }

      const readMemoryCount = async (response: Response): Promise<number | null> => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { proposals?: unknown[] };
        return payload.proposals?.length ?? 0;
      };

      const [needsReview, approved, applied] = await Promise.all([
        readMemoryCount(pendingMemoryResponse),
        readMemoryCount(approvedMemoryResponse),
        readMemoryCount(appliedMemoryResponse),
      ]);

      setMemoryCounts({
        needsReview,
        approved,
        applied,
        loaded: needsReview !== null || approved !== null || applied !== null,
      });
    } catch {
      setDraftCounts({ pendingDrafts: null, loaded: false });
      setMemoryCounts({ needsReview: null, approved: null, applied: null, loaded: false });
      setVerificationPending(null);
      setDashboardLoaded(false);
    } finally {
      setDashboardLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (isOwner) void loadDashboard();
  }, [isOwner, loadDashboard]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshGate(), refreshMonitoring(), loadDashboard()]);
  }, [loadDashboard, refreshGate, refreshMonitoring]);

  const runFailed = useMemo(() => {
    const status = daily12?.latestRunStatus?.toLowerCase() ?? "";
    return status.includes("fail") || status.includes("error");
  }, [daily12?.latestRunStatus]);

  const statusTone = useMemo(
    () =>
      systemStatus({
        monitoringLoaded,
        failed: daily12?.agentsFailedToday ?? 0,
        missing: daily12?.agentsMissingToday.length ?? 0,
        pendingDrafts: draftCounts.pendingDrafts ?? 0,
        pendingMemory: memoryCounts.needsReview ?? 0,
        verificationPending: verificationPending ?? 0,
        runFailed,
      }),
    [
      daily12,
      draftCounts.pendingDrafts,
      memoryCounts.needsReview,
      monitoringLoaded,
      runFailed,
      verificationPending,
    ],
  );

  const attentionItems = useMemo((): AttentionItem[] | "unavailable" => {
    if (monitoringUnavailable && !draftCounts.loaded && !dashboardLoaded) {
      return "unavailable";
    }

    const items: AttentionItem[] = [];

    if (draftCounts.loaded && (draftCounts.pendingDrafts ?? 0) > 0) {
      items.push({
        id: "drafts",
        title: `${draftCounts.pendingDrafts} finding${draftCounts.pendingDrafts === 1 ? "" : "s"} waiting for review`,
        detail: "Review new errors and suggestions before they become active issues.",
        actionLabel: "Review findings",
        onAction: () => navigate("/system/agent-ops/issues"),
      });
    }

    if (memoryCounts.loaded && (memoryCounts.needsReview ?? 0) > 0) {
      items.push({
        id: "memory",
        title: `${memoryCounts.needsReview} memory proposal${memoryCounts.needsReview === 1 ? "" : "s"} waiting for approval`,
        detail: "Approve what AgentOps should remember for future reviews.",
        actionLabel: "Review memory",
        onAction: () => navigate("/system/agent-ops/memory"),
      });
    }

    if (monitoringLoaded && (daily12?.agentsFailedToday ?? 0) > 0) {
      items.push({
        id: "failed-agents",
        title: `${daily12?.agentsFailedToday} agent run${daily12?.agentsFailedToday === 1 ? "" : "s"} failed today`,
        detail: "Open Agents to retry failed runs or inspect results.",
        tone: "danger",
        actionLabel: "View agents",
        onAction: () => navigate("/system/agent-ops/agents"),
      });
    }

    if (monitoringLoaded && (daily12?.agentsMissingToday.length ?? 0) > 0) {
      items.push({
        id: "missing-agents",
        title: `${daily12?.agentsMissingToday.length} agent${daily12?.agentsMissingToday.length === 1 ? "" : "s"} missing from today's review`,
        detail: daily12?.agentsMissingToday.join(", ") ?? "",
        tone: "warning",
        actionLabel: "View agents",
        onAction: () => navigate("/system/agent-ops/agents"),
      });
    }

    if (monitoringLoaded && runFailed) {
      items.push({
        id: "failed-monitoring",
        title: "Latest monitoring run did not complete successfully",
        detail: "Open Monitoring to inspect the last run and retry if needed.",
        tone: "danger",
        actionLabel: "View monitoring",
        onAction: () => navigate("/system/agent-ops/monitoring"),
      });
    }

    if (dashboardLoaded && (verificationPending ?? 0) > 0) {
      items.push({
        id: "verification",
        title: `${verificationPending} item${verificationPending === 1 ? "" : "s"} waiting for verification`,
        detail: "Confirm fixes before closing active issues.",
        actionLabel: "Open findings",
        onAction: () => navigate("/system/agent-ops/issues?tab=active"),
      });
    }

    return items.slice(0, 5);
  }, [
    daily12,
    dashboardLoaded,
    draftCounts,
    memoryCounts,
    monitoringLoaded,
    monitoringUnavailable,
    navigate,
    runFailed,
    verificationPending,
  ]);

  const recentActivity = useMemo(() => {
    if (!monitoringLoaded || !daily12) return [];

    const items: string[] = [];

    if (daily12.agentsCompletedToday > 0) {
      items.push(
        `Daily review completed — ${daily12.agentsCompletedToday}/${daily12.expectedAgents} agents`,
      );
    }

    if ((draftCounts.pendingDrafts ?? daily12.draftsQueuedToday) > 0) {
      const count = draftCounts.pendingDrafts ?? daily12.draftsQueuedToday;
      items.push(`${count} finding${count === 1 ? "" : "s"} queued for review`);
    }

    if (daily12.duplicatesConsolidatedToday > 0) {
      items.push(`${daily12.duplicatesConsolidatedToday} duplicate findings consolidated`);
    }

    if (memoryCounts.loaded && (memoryCounts.approved ?? 0) > 0) {
      items.push(`${memoryCounts.approved} memory proposal${memoryCounts.approved === 1 ? "" : "s"} approved`);
    }

    if (runFailed) {
      items.push("Monitoring run failed");
    }

    return items.slice(0, 5);
  }, [daily12, draftCounts.pendingDrafts, memoryCounts.approved, memoryCounts.loaded, monitoringLoaded, runFailed]);

  const agentsTodayLabel = monitoringLoaded
    ? `${daily12?.agentsCompletedToday ?? 0} of ${daily12?.expectedAgents ?? 12} completed`
    : "Unavailable";

  const lastReviewLabel = monitoringLoaded
    ? formatReviewTime(daily12?.lastCompletedDailyReviewAt)
    : "Unavailable";

  const nextReviewLabel = monitoringLoaded
    ? daily12?.nextExpectedDailyReviewAt
      ? formatReviewTime(daily12.nextExpectedDailyReviewAt)
      : "Daily at 01:00 UTC"
    : "Daily at 01:00 UTC";

  return (
    <AgentOpsOwnerPageShell
      loading={gateLoading}
      error={gateError}
      onRetry={() => void refreshAll()}
    >
      <AgentOpsPageHeader
        title="AgentOps"
        subtitle="Your 12 AI agents review the staging website, find issues, and suggest improvements."
        actions={
          <AixiaButton variant="secondary" onClick={() => void refreshAll()} disabled={sectionLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </AixiaButton>
        }
      />

      <div className="space-y-6">
        {monitoringUnavailable ? (
          <OverviewDegradedBanner
            onRetry={() => void refreshAll()}
            onOpenMonitoring={() => navigate("/system/agent-ops/monitoring")}
          />
        ) : null}

        {sectionLoading && !monitoringUnavailable ? (
          <SectionSkeleton rows={1} />
        ) : (
          <>
            <AgentOpsStatusSummary
              items={[
                {
                  label: "System status",
                  value: statusTone.label,
                  hint: statusTone.hint,
                  tone:
                    statusTone.tone === "success"
                      ? "success"
                      : statusTone.tone === "warning"
                        ? "warning"
                        : "default",
                },
                {
                  label: "Agents today",
                  value: agentsTodayLabel,
                },
                {
                  label: "Last daily review",
                  value: lastReviewLabel,
                },
                {
                  label: "Next scheduled review",
                  value: nextReviewLabel,
                },
              ]}
            />

            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white/65">
              <span>
                <span className="text-white/45">Environment:</span> Staging
              </span>
              <span>
                <span className="text-white/45">Safety:</span> Owner approval required
              </span>
              <span>
                <span className="text-white/45">Automation:</span> No automatic promotion or deployment
              </span>
            </div>
          </>
        )}

        <section aria-labelledby="agentops-action-cards">
          <h2 id="agentops-action-cards" className="sr-only">
            Main actions
          </h2>
          {sectionLoading ? (
            <SectionSkeleton rows={2} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AgentOpsActionCard
                title="Agents"
                description="See what each AI agent reviewed today."
                metrics={[
                  {
                    label: "Registered",
                    value: unavailableMetric(monitoringLoaded, daily12?.registeredAgents ?? 12),
                  },
                  {
                    label: "Completed today",
                    value: unavailableMetric(monitoringLoaded, daily12?.agentsCompletedToday ?? 0),
                  },
                  {
                    label: "Failed / missing",
                    value: unavailableMetric(
                      monitoringLoaded,
                      (daily12?.agentsFailedToday ?? 0) + (daily12?.agentsMissingToday.length ?? 0),
                    ),
                  },
                ]}
                actionLabel="View agents"
                onAction={() => navigate("/system/agent-ops/agents")}
              />
              <AgentOpsActionCard
                title="Findings"
                description="Review errors, improvements, and new feature ideas."
                metrics={[
                  {
                    label: "Needs review",
                    value: unavailableMetric(draftCounts.loaded, draftCounts.pendingDrafts ?? 0),
                  },
                  {
                    label: "Errors",
                    value: unavailableMetric(monitoringLoaded, daily12?.errorsFoundToday ?? 0),
                  },
                  {
                    label: "Improvements",
                    value: unavailableMetric(
                      monitoringLoaded,
                      daily12?.improvementsSuggestedToday ?? 0,
                    ),
                  },
                  {
                    label: "Feature ideas",
                    value: unavailableMetric(
                      monitoringLoaded,
                      daily12?.newFeaturesSuggestedToday ?? 0,
                    ),
                  },
                ]}
                actionLabel="Review findings"
                onAction={() => navigate("/system/agent-ops/issues")}
              />
              <AgentOpsActionCard
                title="Monitoring"
                description="Check the daily, operational, and weekly reviews."
                metrics={[
                  {
                    label: "Last run",
                    value: unavailableMetric(
                      monitoringLoaded,
                      daily12?.lastCompletedDailyReviewAt
                        ? formatReviewTime(daily12.lastCompletedDailyReviewAt)
                        : daily12?.latestRunStatus ?? "Unavailable",
                    ),
                  },
                  {
                    label: "Findings detected",
                    value: unavailableMetric(monitoringLoaded, daily12?.candidatesDetectedToday ?? 0),
                  },
                  {
                    label: "Queued for review",
                    value: unavailableMetric(
                      monitoringLoaded,
                      daily12?.draftsQueuedToday ?? draftCounts.pendingDrafts ?? 0,
                    ),
                  },
                  {
                    label: "Consolidated",
                    value: unavailableMetric(
                      monitoringLoaded,
                      daily12?.duplicatesConsolidatedToday ?? 0,
                    ),
                  },
                ]}
                actionLabel="View monitoring"
                onAction={() => navigate("/system/agent-ops/monitoring")}
              />
              <AgentOpsActionCard
                title="Memory"
                description="Control what AgentOps remembers for future reviews."
                metrics={[
                  {
                    label: "Needs review",
                    value: unavailableMetric(memoryCounts.loaded, memoryCounts.needsReview ?? 0),
                  },
                  {
                    label: "Approved",
                    value: unavailableMetric(memoryCounts.loaded, memoryCounts.approved ?? 0),
                  },
                  {
                    label: "Applied memory",
                    value: unavailableMetric(memoryCounts.loaded, memoryCounts.applied ?? 0),
                  },
                ]}
                actionLabel="Review memory"
                onAction={() => navigate("/system/agent-ops/memory")}
              />
            </div>
          )}
        </section>

        <section aria-labelledby="agentops-attention">
          <h2 id="agentops-attention" className="mb-3 text-lg font-semibold text-white">
            Needs your attention
          </h2>
          {sectionLoading ? (
            <SectionSkeleton rows={1} />
          ) : attentionItems === "unavailable" ? (
            <p className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/65">
              Attention status is temporarily unavailable.
            </p>
          ) : (
            <AgentOpsAttentionList items={attentionItems} />
          )}
        </section>

        <section aria-labelledby="agentops-recent">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="agentops-recent" className="text-lg font-semibold text-white">
              Recent activity
            </h2>
            <button
              type="button"
              onClick={() => navigate("/system/agent-ops/monitoring")}
              className="text-sm text-indigo-300 hover:text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              View monitoring history
            </button>
          </div>
          {sectionLoading ? (
            <SectionSkeleton rows={1} />
          ) : recentActivity.length > 0 ? (
            <ul className="space-y-2">
              {recentActivity.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/75"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : monitoringUnavailable ? (
            <p className="text-sm text-white/55">Recent activity is temporarily unavailable.</p>
          ) : (
            <p className="text-sm text-white/55">No recent activity recorded yet.</p>
          )}
        </section>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
