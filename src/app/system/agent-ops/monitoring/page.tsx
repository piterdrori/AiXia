import { useState } from "react";
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

export default function AgentOpsMonitoringPage() {
  usePageTitle("AgentOps Monitoring");
  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();
  const { daily12, loading, error, refresh } = useAgentOpsMonitoringStatus(isOwner);
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  const refreshAll = () => {
    setQueueRefreshKey((n) => n + 1);
    void Promise.all([refreshGate(), refresh()]);
  };

  const dailyHealthy =
    (daily12?.agentsFailedToday ?? 0) === 0 &&
    (daily12?.agentsMissingToday.length ?? 0) === 0 &&
    (daily12?.agentsCompletedToday ?? 0) >= (daily12?.expectedAgents ?? 12);

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
            { label: "Operational checks", value: "Healthy", tone: "success" },
            { label: "Weekly review", value: "Healthy", tone: "success" },
            { label: "Environment", value: "Staging" },
            {
              label: "Last successful run",
              value: daily12?.lastCompletedDailyReviewAt
                ? new Date(daily12.lastCompletedDailyReviewAt).toLocaleString()
                : "—",
            },
            {
              label: "Next run",
              value: daily12?.nextExpectedDailyReviewAt
                ? new Date(daily12.nextExpectedDailyReviewAt).toLocaleString()
                : "Daily at 01:00 UTC",
            },
          ]}
        />

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
            Run history
          </h2>
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
