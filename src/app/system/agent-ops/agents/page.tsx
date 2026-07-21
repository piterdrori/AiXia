import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Expand, RefreshCw } from "lucide-react";

import { AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsAgentCard,
  AgentOpsCouncilChatCard,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  AgentOpsStatusSummary,
  StagingWorkerHealthStrip,
  getAgentOwnerMeta,
  useAgentOpsMonitoringStatus,
  useAgentOpsOwnerGate,
  type AgentCardState,
} from "@/components/agentops/owner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AgentDaily12ReviewCard } from "@/app/system/agent-ops/agents/AgentDaily12ReviewCard";
import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";

function mapTodayStatus(row: {
  todayStatus: string;
  todayResult: string;
  agentStatus: string;
}): AgentCardState {
  const status = row.todayStatus.toLowerCase();
  if (status.includes("running") || status.includes("in_progress")) return "running";
  if (
    status.includes("complete") ||
    row.todayResult === "no_findings" ||
    row.todayResult === "findings"
  ) {
    return "completed";
  }
  if (
    row.agentStatus.toLowerCase().includes("paused") ||
    row.agentStatus.toLowerCase().includes("disabled")
  ) {
    return "paused";
  }
  if (status.includes("fail") || status.includes("blocked") || status.includes("missing")) {
    return "needs_attention";
  }
  if (status.includes("not_run") || row.todayResult === "not_run" || row.todayResult === "missing") {
    return "not_run";
  }
  return "needs_attention";
}

function formatNextReview(value: string | null | undefined): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString();
}

export default function AgentOpsAgentsPage() {
  usePageTitle("AgentOps Agents");
  const navigate = useNavigate();
  const {
    loading: initialLoading,
    refreshing: gateRefreshing,
    isOwner,
    error: gateError,
    refresh: refreshGate,
  } = useAgentOpsOwnerGate();
  const {
    daily12,
    loading: monitoringLoading,
    refreshing: monitoringRefreshing,
    error: monitoringError,
    refresh: refreshMonitoring,
  } = useAgentOpsMonitoringStatus(isOwner);

  const [softRefreshError, setSoftRefreshError] = useState<string | null>(null);

  const pageRefreshing = gateRefreshing || monitoringRefreshing;
  const rosterLoading = monitoringLoading && !daily12;
  const rosterUnavailable =
    !rosterLoading && (Boolean(monitoringError) || !daily12);
  const statusValue = (value: number | null | undefined) => {
    if (rosterLoading) return "Loading…";
    if (rosterUnavailable) return "Unavailable";
    return value ?? 0;
  };

  const roster = useMemo(() => {
    const bySlug = new Map((daily12?.roster ?? []).map((row) => [row.agentSlug, row]));
    return CANONICAL_AGENTS.map((agent) => {
      const row = bySlug.get(agent.id);
      const meta = getAgentOwnerMeta(agent.id);
      const openFindings =
        row == null
          ? null
          : (row.errorsFound ?? 0) + (row.improvementsFound ?? 0) + (row.featuresFound ?? 0);
      return {
        slug: agent.id,
        displayName: row?.displayName ?? agent.name,
        username: row?.username ?? meta.username,
        jobTitle: row?.jobTitle ?? meta.jobTitle,
        responsibility: meta.responsibility,
        state: row ? mapTodayStatus(row) : ("not_run" as AgentCardState),
        lastRunAt: row?.lastDailyRunAt ?? null,
        errors: row?.errorsFound ?? 0,
        improvements: row?.improvementsFound ?? 0,
        features: row?.featuresFound ?? 0,
        noFindings: row?.noFindings ?? false,
        openFindingsCount: openFindings,
      };
    });
  }, [daily12?.roster]);

  const teamCounts = useMemo(() => {
    const running = roster.filter((agent) => agent.state === "running").length;
    const needsAttention = roster.filter((agent) => agent.state === "needs_attention").length;
    return { running, needsAttention };
  }, [roster]);

  const refreshTeamData = useCallback(async () => {
    if (pageRefreshing) return;
    setSoftRefreshError(null);
    try {
      // Silent gate + monitoring only — does not remount Council Chat.
      await Promise.all([refreshGate({ silent: true }), refreshMonitoring()]);
    } catch (error) {
      setSoftRefreshError(error instanceof Error ? error.message : String(error));
    }
  }, [pageRefreshing, refreshGate, refreshMonitoring]);

  return (
    <AgentOpsOwnerPageShell
      loading={initialLoading}
      error={gateError}
      onRetry={() => void refreshGate()}
    >
      <div className="space-y-8" data-testid="agentops-agents-page">
        <AgentOpsPageHeader
          title="Agents"
          subtitle="Manage your 12 AI agents and talk to the team."
          actions={
            <>
              <AixiaButton onClick={() => navigate("/system/agent-ops/monitoring")}>
                Run all agents
              </AixiaButton>
              <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/council")}>
                <Expand className="mr-2 h-4 w-4" aria-hidden />
                Open Council
              </AixiaButton>
              <AixiaButton
                variant="secondary"
                onClick={() => void refreshTeamData()}
                disabled={initialLoading || pageRefreshing}
                aria-busy={pageRefreshing}
                data-testid="agentops-agents-refresh"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${pageRefreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {pageRefreshing ? "Refreshing…" : "Refresh"}
              </AixiaButton>
            </>
          }
        />

        {softRefreshError || (monitoringError && daily12) ? (
          <AixiaInfoBlock tone="gold" title="Team status refresh warning">
            <p className="text-sm text-white/75">
              {softRefreshError ?? monitoringError}
            </p>
            <div className="mt-3">
              <AixiaButton
                variant="secondary"
                disabled={pageRefreshing}
                onClick={() => void refreshTeamData()}
              >
                Retry
              </AixiaButton>
            </div>
          </AixiaInfoBlock>
        ) : null}

        <section aria-labelledby="team-status-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="team-status-heading" className="text-lg font-semibold text-white">
              Team status
            </h2>
            {pageRefreshing ? (
              <p className="text-xs text-white/45" data-testid="agentops-agents-refreshing-hint">
                Refreshing team metrics…
              </p>
            ) : null}
          </div>
          {rosterUnavailable ? (
            <AixiaInfoBlock tone="gold" title="Team status temporarily unavailable">
              Live monitoring metrics could not load. Council Chat remains available below.
              <div className="mt-3">
                <AixiaButton
                  variant="secondary"
                  disabled={pageRefreshing}
                  onClick={() => void refreshMonitoring()}
                >
                  Retry status
                </AixiaButton>
              </div>
            </AixiaInfoBlock>
          ) : null}
          <AgentOpsStatusSummary
            items={[
              {
                label: "Registered",
                value: statusValue(daily12?.registeredAgents),
              },
              {
                label: "Completed today",
                value: statusValue(daily12?.agentsCompletedToday),
                tone: rosterLoading || rosterUnavailable ? "default" : "success",
              },
              {
                label: "Running",
                value: rosterLoading
                  ? "Loading…"
                  : rosterUnavailable
                    ? "Unavailable"
                    : teamCounts.running,
                tone: !rosterUnavailable && !rosterLoading && teamCounts.running > 0
                  ? "warning"
                  : "default",
              },
              {
                label: "Needs attention",
                value: rosterLoading
                  ? "Loading…"
                  : rosterUnavailable
                    ? "Unavailable"
                    : teamCounts.needsAttention,
                tone:
                  !rosterUnavailable &&
                  !rosterLoading &&
                  teamCounts.needsAttention > 0
                    ? "warning"
                    : "default",
              },
              {
                label: "Failed / missing",
                value: rosterLoading
                  ? "Loading…"
                  : rosterUnavailable
                    ? "Unavailable"
                    : (daily12?.agentsFailedToday ?? 0) +
                      (daily12?.agentsMissingToday.length ?? 0),
                tone:
                  !rosterUnavailable &&
                  !rosterLoading &&
                  ((daily12?.agentsFailedToday ?? 0) > 0 ||
                    (daily12?.agentsMissingToday.length ?? 0) > 0)
                    ? "danger"
                    : "default",
              },
              {
                label: "Next daily review",
                value: rosterLoading
                  ? "Loading…"
                  : rosterUnavailable
                    ? "Unavailable"
                    : formatNextReview(daily12?.nextExpectedDailyReviewAt),
              },
            ]}
          />
          <div className="mt-3">
            <StagingWorkerHealthStrip enabled={isOwner} />
          </div>
          <p className="mt-2 text-xs text-white/45">
            Per-agent Hermes memory is on each Agent Detail page (unique namespace per agent).
          </p>
        </section>

        {/* Keep chat enabled across silent refreshes — only gated by owner status. */}
        <AgentOpsCouncilChatCard enabled={isOwner} />

        <section aria-labelledby="agent-grid">
          <h2 id="agent-grid" className="mb-4 text-lg font-semibold text-white">
            Agent roster
          </h2>
          {rosterLoading ? (
            <p className="mb-4 text-sm text-white/55">Loading live agent status…</p>
          ) : null}
          {rosterUnavailable ? (
            <p className="mb-4 text-sm text-white/55">
              Showing the registered 12-agent roster. Live today-status is unavailable until monitoring
              recovers.
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roster.map((agent) => (
              <AgentOpsAgentCard
                key={agent.slug}
                agentSlug={agent.slug}
                displayName={agent.displayName}
                username={agent.username}
                jobTitle={agent.jobTitle}
                responsibility={agent.responsibility}
                state={agent.state}
                lastRunAt={agent.lastRunAt}
                errors={agent.errors}
                improvements={agent.improvements}
                features={agent.features}
                noFindings={agent.noFindings}
                openFindingsCount={agent.openFindingsCount}
              />
            ))}
          </div>
        </section>

        <AgentOpsAdvancedDisclosure title="Team schedule">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/45">Daily 12-agent review</dt>
              <dd className="text-white/85">01:00 UTC</dd>
            </div>
            <div>
              <dt className="text-white/45">Operational checks</dt>
              <dd className="text-white/85">Every 6 hours</dd>
            </div>
            <div>
              <dt className="text-white/45">Weekly improvement review</dt>
              <dd className="text-white/85">Sunday 02:00 UTC</dd>
            </div>
            <div>
              <dt className="text-white/45">Environment</dt>
              <dd className="text-white/85">Staging</dd>
            </div>
            <div>
              <dt className="text-white/45">Continuous</dt>
              <dd className="text-white/85">Off</dd>
            </div>
            <div>
              <dt className="text-white/45">Owner approval</dt>
              <dd className="text-white/85">Required</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <AixiaButton onClick={() => navigate("/system/agent-ops/monitoring")}>
              Run all agents now
            </AixiaButton>
            <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/monitoring")}>
              Open Monitoring
            </AixiaButton>
          </div>
          <div className="mt-4">
            <AgentDaily12ReviewCard />
          </div>
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
