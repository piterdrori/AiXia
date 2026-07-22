import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { AixiaButton } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  AgentOpsRunRow,
  AgentOpsStatusSummary,
  useAgentOpsMonitoringStatus,
  useAgentOpsOwnerGate,
} from "@/components/agentops/owner";
import { StagingWorkerQueuePanel } from "@/components/agentops/owner/StagingWorkerQueuePanel";
import { AgentScheduledMonitoringCard } from "@/app/system/agent-ops/agents/AgentScheduledMonitoringCard";
import { AgentDaily12ReviewCard } from "@/app/system/agent-ops/agents/AgentDaily12ReviewCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MONITORING_OWNER_DISPLAY } from "@/lib/agentops/agents/monitoringOwnerDisplayCopy";

/** E-A9 — truthful freshness health for scheduled checks (no hardcoded Healthy). */
function freshnessHealth(
  lastRunAt: string | null | undefined,
  maxAgeMs: number,
): { value: string; tone: "success" | "warning" | undefined } {
  if (!lastRunAt) return { value: "No runs recorded", tone: "warning" };
  const age = Date.now() - Date.parse(lastRunAt);
  if (!Number.isFinite(age)) return { value: "No runs recorded", tone: "warning" };
  if (age <= maxAgeMs) return { value: "Healthy", tone: "success" };
  return { value: "Overdue", tone: "warning" };
}

type ScheduleStatusMeta = {
  lastOperationalRunAt?: string | null;
  lastWeeklyReviewAt?: string | null;
};

export default function AgentOpsMonitoringPage() {
  usePageTitle("AgentOps Monitoring");
  const navigate = useNavigate();
  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();
  const { status, daily12, loading, error, refresh } = useAgentOpsMonitoringStatus(isOwner);
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  const refreshAll = () => {
    setQueueRefreshKey((n) => n + 1);
    void Promise.all([refreshGate(), refresh()]);
  };

  const dailyHealthy =
    (daily12?.agentsFailedToday ?? 0) === 0 &&
    (daily12?.agentsMissingToday.length ?? 0) === 0 &&
    (daily12?.agentsCompletedToday ?? 0) >= (daily12?.expectedAgents ?? 12);

  const scheduleMeta = (status as { scheduleStatus?: ScheduleStatusMeta } | null)
    ?.scheduleStatus;
  // Operational cron runs every 6h; weekly review runs every 7 days (grace included).
  const operationalHealth = freshnessHealth(scheduleMeta?.lastOperationalRunAt, 12 * 3_600_000);
  const weeklyHealth = freshnessHealth(
    scheduleMeta?.lastWeeklyReviewAt,
    8 * 24 * 3_600_000,
  );

  return (
    <AgentOpsOwnerPageShell
      loading={gateLoading || loading}
      error={gateError ?? error}
      onRetry={refreshAll}
    >
      <AgentOpsPageHeader
        title="Monitoring"
        subtitle="See whether automatic staging checks are running correctly."
        actions={
          <AixiaButton variant="secondary" onClick={refreshAll} disabled={gateLoading || loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </AixiaButton>
        }
      />

      <div className="space-y-8">
        <AgentOpsStatusSummary
          items={[
            {
              label: "Daily 12-agent review",
              value: dailyHealthy ? "Healthy" : "Needs attention",
              tone: dailyHealthy ? "success" : "warning",
            },
            {
              label: "Operational checks",
              value: operationalHealth.value,
              tone: operationalHealth.tone,
            },
            { label: "Weekly review", value: weeklyHealth.value, tone: weeklyHealth.tone },
            { label: "Environment", value: "Staging" },
            {
              label: "Last daily review",
              value: daily12?.lastCompletedDailyReviewAt
                ? new Date(daily12.lastCompletedDailyReviewAt).toLocaleString()
                : "—",
            },
            {
              label: "Next daily review",
              value: daily12?.nextExpectedDailyReviewAt
                ? new Date(daily12.nextExpectedDailyReviewAt).toLocaleString()
                : "Daily at 01:00 UTC",
            },
          ]}
        />

        <div className="flex flex-wrap gap-2" data-testid="agentops-monitoring-crosslinks">
          <AixiaButton
            variant="secondary"
            onClick={() => navigate("/system/agent-ops/issues")}
          >
            Open Issues inbox
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            onClick={() => navigate("/system/agent-ops/agents")}
          >
            Open Agents
          </AixiaButton>
        </div>

        {isOwner ? <StagingWorkerQueuePanel refreshKey={queueRefreshKey} /> : null}

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <AgentDaily12ReviewCard />
          </div>
          <div>
            <AgentScheduledMonitoringCard />
          </div>
        </section>

        <section aria-labelledby="monitoring-run-history">
          <h2 id="monitoring-run-history" className="mb-3 text-lg font-semibold text-white">
            Fleet run history
          </h2>
          <p className="mb-3 text-sm text-white/55">
            Daily 12-agent fleet review. Per-agent hourly scan runs appear in the staging worker
            queue above and on each agent page.
          </p>
          {daily12?.lastCompletedDailyReviewAt ? (
            <AgentOpsRunRow
              runAt={daily12.lastCompletedDailyReviewAt}
              runType="Daily 12-agent review"
              status={daily12.latestRunStatus ?? "Completed"}
              scopeLabel={`${daily12.agentsCompletedToday}/${daily12.expectedAgents} agents`}
              findingsLabel={`${daily12.errorsFoundToday} errors · ${daily12.improvementsSuggestedToday} improvements`}
              onOpen={() => window.open(daily12.githubWorkflowUrl, "_blank", "noopener,noreferrer")}
            />
          ) : (
            <p className="text-sm text-white/55">{MONITORING_OWNER_DISPLAY.lastRunNone}</p>
          )}
        </section>

        <AgentOpsAdvancedDisclosure title="Advanced monitoring details">
          <p className="text-sm text-white/65">{MONITORING_OWNER_DISPLAY.cloudBlockedDetail}</p>
          <p className="mt-2 text-sm text-white/65">{MONITORING_OWNER_DISPLAY.liveWritesBlockedDetail}</p>
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
