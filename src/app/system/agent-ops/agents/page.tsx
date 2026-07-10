import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { AixiaButton } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsAgentCard,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  AgentOpsStatusSummary,
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
  if (status.includes("complete") || row.todayResult === "no_findings" || row.todayResult === "findings") {
    return "completed";
  }
  if (row.agentStatus.toLowerCase().includes("paused") || row.agentStatus.toLowerCase().includes("disabled")) {
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

export default function AgentOpsAgentsPage() {
  usePageTitle("AgentOps Agents");
  const navigate = useNavigate();
  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();
  const { daily12, loading, error, refresh } = useAgentOpsMonitoringStatus(isOwner);

  const roster = useMemo(() => {
    const bySlug = new Map((daily12?.roster ?? []).map((row) => [row.agentSlug, row]));
    return CANONICAL_AGENTS.map((agent) => {
      const row = bySlug.get(agent.id);
      return {
        slug: agent.id,
        displayName: row?.displayName ?? agent.name,
        username: row?.username,
        jobTitle: row?.jobTitle,
        state: row ? mapTodayStatus(row) : ("not_run" as AgentCardState),
        lastRunAt: row?.lastDailyRunAt ?? null,
        errors: row?.errorsFound ?? 0,
        improvements: row?.improvementsFound ?? 0,
        features: row?.featuresFound ?? 0,
        noFindings: row?.noFindings ?? false,
      };
    });
  }, [daily12?.roster]);

  const refreshAll = () => void Promise.all([refreshGate(), refresh()]);

  return (
    <AgentOpsOwnerPageShell
      loading={gateLoading || loading}
      error={gateError ?? error}
      onRetry={refreshAll}
    >
      <AgentOpsPageHeader
        title="Agents"
        subtitle="Your 12 AI employees and whether each one completed today's staging review."
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
            { label: "Registered", value: daily12?.registeredAgents ?? 12 },
            { label: "Completed today", value: daily12?.agentsCompletedToday ?? 0, tone: "success" },
            {
              label: "Failed",
              value: daily12?.agentsFailedToday ?? 0,
              tone: daily12?.agentsFailedToday ? "danger" : "default",
            },
            {
              label: "Missing",
              value: daily12?.agentsMissingToday.length ?? 0,
              tone: daily12?.agentsMissingToday.length ? "warning" : "default",
            },
          ]}
        />

        <div className="flex flex-wrap gap-3">
          <AixiaButton onClick={() => navigate("/system/agent-ops/monitoring")}>Run all agents now</AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/monitoring")}>
            Retry failed agents
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            onClick={() => daily12?.githubWorkflowUrl && window.open(daily12.githubWorkflowUrl, "_blank")}
          >
            Open latest daily report
          </AixiaButton>
        </div>

        <section aria-labelledby="agent-grid">
          <h2 id="agent-grid" className="mb-4 text-lg font-semibold text-white">
            Agent roster
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roster.map((agent) => (
              <AgentOpsAgentCard
                key={agent.slug}
                agentSlug={agent.slug}
                displayName={agent.displayName}
                username={agent.username}
                jobTitle={agent.jobTitle}
                state={agent.state}
                lastRunAt={agent.lastRunAt}
                errors={agent.errors}
                improvements={agent.improvements}
                features={agent.features}
                noFindings={agent.noFindings}
                onOpen={() => navigate(`/system/agent-ops/agents/${agent.slug}`)}
              />
            ))}
          </div>
        </section>

        <AgentOpsAdvancedDisclosure title="Daily review schedule">
          <AgentDaily12ReviewCard />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/45">Daily review</dt>
              <dd className="text-white/85">01:00 UTC</dd>
            </div>
            <div>
              <dt className="text-white/45">Operational scan</dt>
              <dd className="text-white/85">Every 6 hours</dd>
            </div>
            <div>
              <dt className="text-white/45">Weekly improvement review</dt>
              <dd className="text-white/85">Sunday 02:00 UTC</dd>
            </div>
            <div>
              <dt className="text-white/45">Environment</dt>
              <dd className="text-white/85">Staging only</dd>
            </div>
            <div>
              <dt className="text-white/45">Continuous monitoring</dt>
              <dd className="text-white/85">Off</dd>
            </div>
          </dl>
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
