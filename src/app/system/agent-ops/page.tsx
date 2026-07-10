import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import {
  AixiaButton,
} from "@/components/aixia";
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
import { FetchTimeoutError, fetchWithTimeout } from "@/lib/fetchWithTimeout";

type DraftCounts = {
  pendingDrafts: number;
  pendingMemory: number;
};

function systemStatusLabel(input: {
  failed: number;
  missing: number;
  pendingDrafts: number;
  pendingMemory: number;
  verificationPending: number;
}): { label: string; tone: "success" | "warning" | "danger" } {
  if (input.failed > 0 || input.missing > 0) {
    return { label: "Needs attention", tone: "warning" };
  }
  if (input.pendingDrafts > 0 || input.pendingMemory > 0 || input.verificationPending > 0) {
    return { label: "Needs attention", tone: "warning" };
  }
  return { label: "Healthy", tone: "success" };
}

export default function AgentOpsPage() {
  usePageTitle("AgentOps");
  const navigate = useNavigate();
  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();
  const { daily12, loading: monitoringLoading, error: monitoringError, refresh: refreshMonitoring } =
    useAgentOpsMonitoringStatus(isOwner);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [draftCounts, setDraftCounts] = useState<DraftCounts>({ pendingDrafts: 0, pendingMemory: 0 });
  const [verificationPending, setVerificationPending] = useState(0);
  const [activeIssues, setActiveIssues] = useState(0);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [summaryResult, draftsResponse, memoryResponse] = await Promise.all([
        getAgentOpsDashboardSummary(),
        fetchWithTimeout("/api/agentops/monitoring/drafts?status=pending", { timeoutMs: 15_000 }),
        fetchWithTimeout("/api/agentops/monitoring/memory-proposals?status=pending", {
          timeoutMs: 15_000,
        }),
      ]);

      if (summaryResult.error) {
        setDashboardError(summaryResult.error);
      } else {
        setVerificationPending(summaryResult.data?.verificationPendingCount ?? 0);
        setActiveIssues(summaryResult.data?.activeOpenCount ?? 0);
      }

      let pendingDrafts = daily12?.draftsQueuedToday ?? 0;
      let pendingMemory = 0;

      if (draftsResponse.ok) {
        const draftsPayload = (await draftsResponse.json()) as { drafts?: unknown[] };
        pendingDrafts = draftsPayload.drafts?.length ?? pendingDrafts;
      }
      if (memoryResponse.ok) {
        const memoryPayload = (await memoryResponse.json()) as { proposals?: unknown[] };
        pendingMemory = memoryPayload.proposals?.length ?? 0;
      }

      setDraftCounts({ pendingDrafts, pendingMemory });
    } catch (error) {
      setDashboardError(
        error instanceof FetchTimeoutError
          ? "Overview data timed out."
          : error instanceof Error
            ? error.message
            : "Could not load overview data.",
      );
    } finally {
      setDashboardLoading(false);
    }
  }, [daily12?.draftsQueuedToday]);

  useEffect(() => {
    if (isOwner) void loadDashboard();
  }, [isOwner, loadDashboard, daily12?.draftsQueuedToday]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshGate(), refreshMonitoring(), loadDashboard()]);
  }, [loadDashboard, refreshGate, refreshMonitoring]);

  const statusTone = useMemo(() => {
    return systemStatusLabel({
      failed: daily12?.agentsFailedToday ?? 0,
      missing: daily12?.agentsMissingToday.length ?? 0,
      pendingDrafts: draftCounts.pendingDrafts,
      pendingMemory: draftCounts.pendingMemory,
      verificationPending,
    });
  }, [daily12, draftCounts, verificationPending]);

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];
    if (draftCounts.pendingDrafts > 0) {
      items.push({
        id: "drafts",
        title: `${draftCounts.pendingDrafts} finding${draftCounts.pendingDrafts === 1 ? "" : "s"} waiting for review`,
        detail: "Review new errors and suggestions before they become active issues.",
        actionLabel: "Review findings",
        onAction: () => navigate("/system/agent-ops/issues"),
      });
    }
    if (draftCounts.pendingMemory > 0) {
      items.push({
        id: "memory",
        title: `${draftCounts.pendingMemory} memory proposal${draftCounts.pendingMemory === 1 ? "" : "s"} waiting for approval`,
        detail: "Approve what AgentOps should remember for future reviews.",
        actionLabel: "Review memory",
        onAction: () => navigate("/system/agent-ops/memory"),
      });
    }
    if ((daily12?.agentsFailedToday ?? 0) > 0) {
      items.push({
        id: "failed-agents",
        title: `${daily12?.agentsFailedToday} agent run${daily12?.agentsFailedToday === 1 ? "" : "s"} failed today`,
        detail: "Open Agents to retry failed runs or inspect results.",
        tone: "danger",
        actionLabel: "View agents",
        onAction: () => navigate("/system/agent-ops/agents"),
      });
    }
    if ((daily12?.agentsMissingToday.length ?? 0) > 0) {
      items.push({
        id: "missing-agents",
        title: `${daily12?.agentsMissingToday.length} agent${daily12?.agentsMissingToday.length === 1 ? "" : "s"} missing from today's review`,
        detail: daily12?.agentsMissingToday.join(", ") ?? "",
        tone: "warning",
        actionLabel: "View agents",
        onAction: () => navigate("/system/agent-ops/agents"),
      });
    }
    if (verificationPending > 0) {
      items.push({
        id: "verification",
        title: `${verificationPending} item${verificationPending === 1 ? "" : "s"} waiting for verification`,
        detail: "Confirm fixes before closing active issues.",
        actionLabel: "Open findings",
        onAction: () => navigate("/system/agent-ops/issues?tab=active"),
      });
    }
    return items;
  }, [daily12, draftCounts, navigate, verificationPending]);

  const recentActivity = useMemo(() => {
    const items: string[] = [];
    if (daily12) {
      items.push(
        `Daily review — ${daily12.agentsCompletedToday}/${daily12.expectedAgents} agents completed`,
      );
      if (daily12.draftsQueuedToday > 0) {
        items.push(`${daily12.draftsQueuedToday} finding draft${daily12.draftsQueuedToday === 1 ? "" : "s"} created`);
      }
      if (daily12.duplicatesConsolidatedToday > 0) {
        items.push(`${daily12.duplicatesConsolidatedToday} duplicate findings consolidated`);
      }
      if (daily12.errorsFoundToday > 0) {
        items.push(`${daily12.errorsFoundToday} new error${daily12.errorsFoundToday === 1 ? "" : "s"} detected`);
      }
    }
    return items.slice(0, 5);
  }, [daily12]);

  const loading = gateLoading || (isOwner && (monitoringLoading || dashboardLoading));
  const error = gateError ?? monitoringError ?? dashboardError;

  return (
    <AgentOpsOwnerPageShell loading={loading} error={error} onRetry={() => void refreshAll()}>
      <AgentOpsPageHeader
          title="AgentOps"
          subtitle="Your 12 AI agents review the staging website, find issues, and suggest improvements."
          actions={
            <AixiaButton variant="secondary" onClick={() => void refreshAll()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </AixiaButton>
          }
        />

          <div className="space-y-8">
            <AgentOpsStatusSummary
              items={[
                {
                  label: "System status",
                  value: statusTone.label,
                  tone:
                    statusTone.tone === "success"
                      ? "success"
                      : statusTone.tone === "warning"
                        ? "warning"
                        : "default",
                },
                {
                  label: "Agents active today",
                  value: `${daily12?.agentsCompletedToday ?? 0}/${daily12?.expectedAgents ?? 12}`,
                  hint: "Completed daily review",
                },
                {
                  label: "Last daily review",
                  value: daily12?.lastCompletedDailyReviewAt
                    ? new Date(daily12.lastCompletedDailyReviewAt).toLocaleString()
                    : "Not yet today",
                },
                {
                  label: "Next scheduled review",
                  value: daily12?.nextExpectedDailyReviewAt
                    ? new Date(daily12.nextExpectedDailyReviewAt).toLocaleString()
                    : "Daily at 01:00 UTC",
                },
                {
                  label: "Environment",
                  value: "Staging",
                },
                {
                  label: "Safety",
                  value: "Owner approval required",
                  hint: "No automatic promotion or deployment",
                },
              ]}
            />

            <section aria-labelledby="agentops-action-cards">
              <h2 id="agentops-action-cards" className="sr-only">
                Main actions
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AgentOpsActionCard
                  title="Agents"
                  description="See whether each of your 12 AI employees completed today's review."
                  metrics={[
                    { label: "Registered", value: daily12?.registeredAgents ?? 12 },
                    { label: "Completed today", value: daily12?.agentsCompletedToday ?? 0 },
                    { label: "Failed", value: daily12?.agentsFailedToday ?? 0 },
                    { label: "Missing", value: daily12?.agentsMissingToday.length ?? 0 },
                  ]}
                  actionLabel="View agents"
                  onAction={() => navigate("/system/agent-ops/agents")}
                />
                <AgentOpsActionCard
                  title="Findings"
                  description="Review errors, improvements, and new feature suggestions."
                  metrics={[
                    { label: "Needs review", value: draftCounts.pendingDrafts },
                    { label: "New errors today", value: daily12?.errorsFoundToday ?? 0 },
                    { label: "Improvements", value: daily12?.improvementsSuggestedToday ?? 0 },
                    { label: "Feature ideas", value: daily12?.newFeaturesSuggestedToday ?? 0 },
                  ]}
                  actionLabel="Review findings"
                  onAction={() => navigate("/system/agent-ops/issues")}
                />
                <AgentOpsActionCard
                  title="Monitoring"
                  description="Automatic daily, operational, and weekly checks on staging."
                  metrics={[
                    { label: "Daily review", value: daily12?.latestRunStatus ?? "—" },
                    { label: "Findings detected", value: daily12?.candidatesDetectedToday ?? 0 },
                    { label: "Queued for review", value: daily12?.draftsQueuedToday ?? 0 },
                    { label: "Consolidated", value: daily12?.duplicatesConsolidatedToday ?? 0 },
                  ]}
                  actionLabel="View monitoring"
                  onAction={() => navigate("/system/agent-ops/monitoring")}
                />
                <AgentOpsActionCard
                  title="Memory"
                  description="Control what AgentOps learns and keeps for future reviews."
                  metrics={[
                    { label: "Needs review", value: draftCounts.pendingMemory },
                    { label: "Active issues", value: activeIssues },
                    { label: "Verification waiting", value: verificationPending },
                    { label: "Environment", value: "Staging" },
                  ]}
                  actionLabel="Review memory"
                  onAction={() => navigate("/system/agent-ops/memory")}
                />
              </div>
            </section>

            <section aria-labelledby="agentops-attention">
              <h2 id="agentops-attention" className="mb-3 text-lg font-semibold text-white">
                Needs your attention
              </h2>
              <AgentOpsAttentionList items={attentionItems} />
            </section>

            <section aria-labelledby="agentops-recent">
              <h2 id="agentops-recent" className="mb-3 text-lg font-semibold text-white">
                Recent activity
              </h2>
              {recentActivity.length > 0 ? (
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
              ) : (
                <p className="text-sm text-white/55">No recent activity recorded yet.</p>
              )}
            </section>
          </div>
    </AgentOpsOwnerPageShell>
  );
}
