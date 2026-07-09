import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Filter, MessageSquare, RefreshCw, ShieldCheck, Users } from "lucide-react";

import {
  AixiaAsyncState,
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaCommandMetrics,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaHero,
  AixiaInfoBlock,
  AixiaRowActionMenu,
  AixiaSection,
  AixiaTableShell,
  type AixiaRowActionMenuItem,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  activateAllAgentOpsManagedAgents,
  getAgentOpsAgentStatusDashboard,
  getAgentOpsLocalLlmStatus,
  getAgentOpsManagedAgents,
  getAgentOpsOwnerStatus,
  type AgentOpsAgentStatusDashboardItem,
  type AgentOpsManagedAgent,
} from "@/lib/agentops";
import { AgentOpsFocusOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsFocusOperatorSurface";
import { AgentScheduledMonitoringCard } from "@/app/system/agent-ops/agents/AgentScheduledMonitoringCard";
import { AgentDaily12ReviewCard } from "@/app/system/agent-ops/agents/AgentDaily12ReviewCard";

type AgentFilter = "all" | "needs_attention" | "active" | "quiet" | "blocked" | "needs_memory";

const FILTERS: { id: AgentFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_attention", label: "Needs attention" },
  { id: "active", label: "Active" },
  { id: "quiet", label: "Quiet" },
  { id: "blocked", label: "Blocked" },
  { id: "needs_memory", label: "Needs memory" },
];

function managedAgentStatusTone(
  status: AgentOpsManagedAgent["status"],
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "active") return "emerald";
  if (status === "quiet") return "cyan";
  if (status === "needs_memory") return "amber";
  if (status === "blocked" || status === "disabled") return "rose";
  return "neutral";
}

function attentionReasonTone(
  reason: AgentOpsAgentStatusDashboardItem["attentionReason"] | null | undefined,
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (!reason) return "neutral";
  if (reason === "OK") return "emerald";
  if (reason === "Recently Updated") return "cyan";
  if (reason === "Blocked" || reason === "Refresh Blocked") return "rose";
  if (reason === "Sensitive Warning" || reason === "Memory File Missing") return "amber";
  if (reason === "No Memory" || reason === "Needs Focus") return "amber";
  return "neutral";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function AgentOpsAgentsPage() {
  usePageTitle("AgentOps Agents");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [managedAgents, setManagedAgents] = useState<AgentOpsManagedAgent[]>([]);
  const [statusDashboardItems, setStatusDashboardItems] = useState<AgentOpsAgentStatusDashboardItem[]>(
    [],
  );
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [activatingAgents, setActivatingAgents] = useState(false);
  const [activationFeedback, setActivationFeedback] = useState<string | null>(null);

  const localLlmStatus = useMemo(() => getAgentOpsLocalLlmStatus(), []);

  const statusByAgentId = useMemo(
    () => new Map(statusDashboardItems.map((item) => [item.agentId, item])),
    [statusDashboardItems],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ownerResult, managedResult, statusResult] = await Promise.all([
        getAgentOpsOwnerStatus(),
        getAgentOpsManagedAgents(),
        getAgentOpsAgentStatusDashboard(),
      ]);

      if (ownerResult.error || !ownerResult.data?.isOwner) {
        setIsOwner(false);
        setError(ownerResult.error ?? "AgentOps Owner access required.");
        return;
      }

      setIsOwner(true);

      if (managedResult.error) {
        setError(managedResult.error);
        setManagedAgents([]);
        setStatusDashboardItems([]);
        return;
      }

      setManagedAgents(managedResult.data ?? []);
      setStatusDashboardItems(statusResult.data?.items ?? []);
      if (statusResult.error) setError(statusResult.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleActivateAllAgents = useCallback(async () => {
    setActivatingAgents(true);
    setActivationFeedback(null);
    const result = await activateAllAgentOpsManagedAgents();
    setActivatingAgents(false);
    if (result.error) {
      setActivationFeedback(result.error);
      return;
    }
    setActivationFeedback(`Activated ${result.data?.activated ?? 0} of ${managedAgents.length} agents.`);
    await loadData();
  }, [loadData, managedAgents.length]);

  const summary = useMemo(() => {
    const active = managedAgents.filter((agent) => agent.status === "active").length;
    const quiet = managedAgents.filter((agent) => agent.status === "quiet").length;
    const blocked = managedAgents.filter((agent) => agent.status === "blocked").length;
    const needsMemory = managedAgents.filter((agent) => agent.status === "needs_memory").length;
    const restricted = managedAgents.filter((agent) => !agent.agentOpsOwnerAccess).length;
    const attention = statusDashboardItems.filter((item) => item.needsAttention).length;
    return {
      total: managedAgents.length,
      attention,
      active,
      quiet,
      blocked,
      needsMemory,
      restricted,
    };
  }, [managedAgents, statusDashboardItems]);

  const filteredAgents = useMemo(() => {
    return managedAgents.filter((agent) => {
      const dashboardItem = statusByAgentId.get(agent.agentId);
      if (filter === "all") return true;
      if (filter === "needs_attention") return dashboardItem?.needsAttention ?? false;
      if (filter === "active") return agent.status === "active";
      if (filter === "quiet") return agent.status === "quiet";
      if (filter === "blocked") return agent.status === "blocked";
      if (filter === "needs_memory") return agent.status === "needs_memory";
      return true;
    });
  }, [filter, managedAgents, statusByAgentId]);

  const buildActionItems = (agent: AgentOpsManagedAgent): AixiaRowActionMenuItem[] => [
    {
      key: `open-workspace-${agent.agentId}`,
      label: "Open Agent Workspace",
      onSelect: () => navigate(`/system/agent-ops/agents/${encodeURIComponent(agent.agentId)}`),
    },
    {
      key: `view-memory-${agent.agentId}`,
      label: "View Memory",
      onSelect: () =>
        navigate(`/system/agent-ops/agents/${encodeURIComponent(agent.agentId)}?panel=memory&mode=view`),
    },
    {
      key: `add-memory-${agent.agentId}`,
      label: "Add Memory / Focus",
      onSelect: () =>
        navigate(
          `/system/agent-ops/agents/${encodeURIComponent(agent.agentId)}?panel=memory&mode=focus`,
        ),
    },
    {
      key: `add-correction-${agent.agentId}`,
      label: "Add Correction",
      onSelect: () =>
        navigate(
          `/system/agent-ops/agents/${encodeURIComponent(agent.agentId)}?panel=memory&mode=correction`,
        ),
    },
    {
      key: `add-feature-idea-${agent.agentId}`,
      label: "Add Feature Idea",
      onSelect: () =>
        navigate(
          `/system/agent-ops/agents/${encodeURIComponent(agent.agentId)}?panel=memory&mode=feature_idea`,
        ),
    },
    {
      key: `add-interaction-note-${agent.agentId}`,
      label: "Add Interaction Note",
      onSelect: () =>
        navigate(
          `/system/agent-ops/agents/${encodeURIComponent(agent.agentId)}?panel=chat&mode=interaction_note`,
        ),
    },
  ];

  const agentsMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first AgentOps staging surface.",
        tone: "amber" as const,
      },
      {
        key: "mode",
        label: "Control mode",
        value: "Manual-first",
        detail: "Owner-controlled agent roster and workspace access.",
        tone: "cyan" as const,
      },
      {
        key: "scope",
        label: "Roster scope",
        value: "12 synthetic QA agents",
        detail: "Managed agents with status dashboard overlay.",
        tone: "neutral" as const,
      },
      {
        key: "council",
        label: "Council access",
        value: "Separate route",
        detail: "Group chat lives on Agent Council page.",
        tone: "violet" as const,
      },
    ],
    [],
  );

  const agentsCommandMetrics = useMemo(
    () => [
      {
        key: "total",
        title: "Total agents",
        value: loading ? "Checking…" : String(summary.total),
        subtitle: "Managed synthetic QA roster",
        icon: Users,
        tone: "indigo" as const,
      },
      {
        key: "attention",
        title: "Needs attention",
        value: loading ? "Checking…" : String(summary.attention),
        subtitle: "Status dashboard flags",
        icon: ShieldCheck,
        tone: "rose" as const,
      },
      {
        key: "active",
        title: "Active",
        value: loading ? "Checking…" : String(summary.active),
        subtitle: "Currently active agents",
        icon: Users,
        tone: "emerald" as const,
      },
      {
        key: "quiet",
        title: "Quiet",
        value: loading ? "Checking…" : String(summary.quiet),
        subtitle: "Quiet-mode agents",
        icon: Users,
        tone: "cyan" as const,
      },
      {
        key: "needs-memory",
        title: "Needs memory",
        value: loading ? "Checking…" : String(summary.needsMemory),
        subtitle: "Memory follow-up required",
        icon: ShieldCheck,
        tone: "amber" as const,
      },
      {
        key: "restricted",
        title: "Owner-only restricted",
        value: loading ? "Checking…" : String(summary.restricted),
        subtitle: "Agents without owner access",
        icon: ShieldCheck,
        tone: "violet" as const,
      },
    ],
    [loading, summary],
  );

  const agentsHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="Agents"
      subtitle="12 synthetic QA agents and their current focus"
      parentLabel="Control Center"
      parentPath="/system/agent-ops"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Control Center
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/knowledge")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Knowledge
          </AixiaButton>
          <AixiaButton
            variant="primary"
            disabled={loading || activatingAgents || managedAgents.length === 0}
            onClick={() => void handleActivateAllAgents()}
          >
            <Users className={`mr-2 h-4 w-4 ${activatingAgents ? "animate-pulse" : ""}`} />
            {activatingAgents ? "Activating…" : "Activate all 12 agents"}
          </AixiaButton>
          <AixiaButton variant="secondary" disabled={loading} onClick={() => void loadData()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </>
      }
    >
      <AixiaCommandMetrics items={agentsCommandMetrics} />
    </AixiaHero>
  );

  if (!loading && (!isOwner || error?.toLowerCase().includes("owner access required"))) {
    return (
      <AixiaCommandPageLayout hero={agentsHero}>
        <AixiaSection
          surface="command"
          title="AgentOps Agents"
          description="Owner access required"
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Access restricted">
            {error ?? "Only AgentOps owner users can view this page."}
          </AixiaInfoBlock>
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  return (
    <AixiaCommandPageLayout
      hero={agentsHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={agentsMetaStripItems} />}
    >
      <div data-testid="agentops-agents-overview">
        {activationFeedback ? (
          <AixiaInfoBlock tone="cyan" icon={Users} title="Agent activation">
            {activationFeedback}
          </AixiaInfoBlock>
        ) : null}
        {localLlmStatus.runtimeActive ? (
          <p className="mb-4 text-xs text-slate-400">
            Local LLM active · {localLlmStatus.model} · Council and Agent Workspace chats are live.
          </p>
        ) : null}
        <AixiaSection
          surface="command"
          title="Agent Council"
          description="Group-chat surface for all 12 agents is a dedicated route."
          icon={MessageSquare}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="text-sm font-semibold text-white">Talk to all 12 agents together.</p>
              <p className="mt-1 text-xs text-slate-400">
                Council chat belongs to its own page and is not embedded inside Agents overview.
              </p>
            </div>
            <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/council")}>
              Open Council
            </AixiaButton>
          </div>
        </AixiaSection>

        <AgentScheduledMonitoringCard />

        <AgentDaily12ReviewCard />

        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaSection
              surface="command"
              title="Agent roster"
              description="Loading managed agents and status dashboard."
              icon={Users}
            >
              <AixiaEmptyState
                icon={Users}
                title="Loading agents"
                description="Managed agent roster and status dashboard are being prepared."
              />
            </AixiaSection>
          }
        >
          <>
            <AixiaSection
              surface="command"
              title="Filters"
              description="Focus the agent list by operational state."
              icon={Filter}
            >
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <AixiaButton
                    key={`agent-filter-${item.id}`}
                    variant={filter === item.id ? "primary" : "secondary"}
                    className="text-xs px-3 py-1.5"
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </AixiaButton>
                ))}
              </div>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Agent roster"
              description="Status, specialty, focus, and direct workspace access for each agent."
              icon={Users}
              badge={<AixiaBadge tone="cyan">{filteredAgents.length} shown</AixiaBadge>}
            >
              {error && !error.toLowerCase().includes("owner access required") ? (
                <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Data issue">
                  {error}
                </AixiaInfoBlock>
              ) : null}

              {filteredAgents.length === 0 ? (
                <AixiaEmptyState
                  icon={Users}
                  title="No agents match this filter"
                  description="Try a different status filter to view the full 12-agent roster."
                />
              ) : (
                <div className="aixia-scrollbar w-full max-w-full overflow-x-auto pb-3">
                  <AixiaTableShell variant="registry" minWidthClassName="min-w-[1700px]">
                    <thead className="aixia-table-head">
                      <tr>
                        <th className="min-w-[180px]">Agent</th>
                        <th className="min-w-[150px]">App role</th>
                        <th className="min-w-[280px]">QA specialty / skill</th>
                        <th className="min-w-[260px]">Current focus</th>
                        <th className="min-w-[120px]">Status</th>
                        <th className="min-w-[120px]">Memory</th>
                        <th className="min-w-[260px]">Latest activity</th>
                        <th className="min-w-[170px]">Attention</th>
                        <th className="min-w-[260px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgents.map((agent) => {
                        const dashboardItem = statusByAgentId.get(agent.agentId);
                        return (
                          <tr key={agent.agentId}>
                            <td className="min-w-[180px] align-middle">
                              <div className="font-medium text-white">{agent.displayName}</div>
                              <div className="text-xs text-slate-500">{agent.agentId}</div>
                            </td>
                            <td className="min-w-[150px] align-middle text-sm text-white">{agent.appRole}</td>
                            <td className="min-w-[260px] align-middle text-sm text-slate-300">
                              {agent.qaSpecialty}
                            </td>
                            <td className="min-w-[260px] align-middle text-sm text-slate-300">
                              {agent.currentFocus ?? "No focus recorded yet"}
                            </td>
                            <td className="min-w-[120px] align-middle">
                              <AixiaBadge tone={managedAgentStatusTone(agent.status)}>
                                {agent.status.replaceAll("_", " ")}
                              </AixiaBadge>
                            </td>
                            <td className="min-w-[120px] align-middle text-sm text-white">
                              {agent.memoryCount}
                            </td>
                            <td className="min-w-[260px] align-middle text-xs text-slate-300">
                              <div>{agent.lastActivitySummary ?? "No interaction note yet"}</div>
                              <div className="mt-1 text-slate-500">
                                Run: {agent.lastRunStatus} · findings: {agent.latestFindingsCount}
                              </div>
                              {dashboardItem?.latestInteractionAt ? (
                                <div className="mt-1 text-slate-500">
                                  Updated: {formatDateTime(dashboardItem.latestInteractionAt)}
                                </div>
                              ) : null}
                            </td>
                            <td className="min-w-[170px] align-middle">
                              <AixiaBadge tone={attentionReasonTone(dashboardItem?.attentionReason)}>
                                {dashboardItem?.attentionReason ?? "OK"}
                              </AixiaBadge>
                            </td>
                            <td className="min-w-[260px] align-middle">
                              <div className="flex flex-wrap gap-2">
                                <AixiaButton
                                  variant="secondary"
                                  className="text-xs px-3 py-1.5"
                                  onClick={() =>
                                    navigate(`/system/agent-ops/agents/${encodeURIComponent(agent.agentId)}`)
                                  }
                                >
                                  Open Agent Workspace
                                </AixiaButton>
                                <AixiaRowActionMenu items={buildActionItems(agent)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </AixiaTableShell>
                </div>
              )}
            </AixiaSection>

            <AgentOpsFocusOperatorSurface disabled={loading} onRefresh={loadData} />

            <AixiaSection
              surface="command"
              title="Related routes"
              description="Memory refresh and deep technical tools on Knowledge and Advanced."
              icon={ShieldCheck}
            >
              <div className="flex flex-wrap gap-2">
                <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/knowledge")}>
                  Open Knowledge (memory review & refresh)
                </AixiaButton>
                <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/advanced")}>
                  Open Advanced
                </AixiaButton>
              </div>
            </AixiaSection>
          </>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}
