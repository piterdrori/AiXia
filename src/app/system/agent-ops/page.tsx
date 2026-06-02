import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Clock,
  FileInput,
  Gauge,
  History,
  Layers,
  ListPlus,
  MessageSquare,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import {
  AixiaAsyncState,
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaCommandMetrics,
  type AixiaCommandMetricItem,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaHero,
  AixiaInfoBlock,
  AixiaModal,
  AixiaNavigationCard,
  AixiaNavigationGrid,
  AixiaSection,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsAgentStatusDashboard,
  getAgentOpsBacklogSummary,
  getAgentOpsDashboardSummary,
  getAgentOpsOwnerStatus,
  getAgentOpsPendingVerifications,
  getAgentOpsQueueHealth,
  getAgentOpsSchedulerPreparationStatus,
  getAgentOpsVerificationRequests,
  getAgentOpsHermesReadinessGate,
  refillAgentOpsActiveTop10FromBacklog,
  type AgentOpsAgentStatusDashboardSummary,
  type AgentOpsDashboardSummary,
  type AgentOpsHermesStatus,
  type AgentOpsPendingVerificationItem,
  type AgentOpsQueueHealth,
  type AgentOpsQueueHealthRecommendedAction,
  type AgentOpsSchedulerPreparationStatus,
  type AgentOpsVerificationRequestItem,
} from "@/lib/agentops";
import { useAgentOpsLlmProbe } from "@/hooks/useAgentOpsLlmProbe";

function formatQueueHealthAction(
  action: AgentOpsQueueHealthRecommendedAction,
): string {
  switch (action) {
    case "no_action":
      return "No action";
    case "refill_from_backlog":
      return "Refill from backlog";
    case "generate_more_candidates":
      return "Generate more candidates";
    case "refill_and_generate_more_candidates":
      return "Refill and generate more candidates";
    case "run_scan_import_plan":
      return "Run scan / import plan";
    default:
      return action;
  }
}

export default function AgentOpsPage() {
  usePageTitle("AgentOps");
  const navigate = useNavigate();

  const [gateLoading, setGateLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AgentOpsDashboardSummary | null>(null);
  const [backlogCount, setBacklogCount] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState<
    AgentOpsPendingVerificationItem[]
  >([]);
  const [verificationRequests, setVerificationRequests] = useState<
    AgentOpsVerificationRequestItem[]
  >([]);

  const [queueHealth, setQueueHealth] = useState<AgentOpsQueueHealth | null>(null);
  const [queueHealthLoading, setQueueHealthLoading] = useState(false);

  const [schedulerPrep, setSchedulerPrep] = useState<AgentOpsSchedulerPreparationStatus | null>(
    null,
  );
  const [schedulerPrepLoading, setSchedulerPrepLoading] = useState(false);

  const [statusDashboardSummary, setStatusDashboardSummary] =
    useState<AgentOpsAgentStatusDashboardSummary | null>(null);
  const [statusDashboardLoading, setStatusDashboardLoading] = useState(false);

  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const [refillModalOpen, setRefillModalOpen] = useState(false);
  const [refillSubmitting, setRefillSubmitting] = useState(false);

  const legacyToolsRef = useRef<HTMLDetailsElement>(null);
  const localLlmStatus = useAgentOpsLlmProbe();
  const hermesReadinessGate = useMemo(() => getAgentOpsHermesReadinessGate(), []);

  const openSlots = dashboard?.openSlots ?? 0;
  const canShowRefillButton = openSlots > 0 && backlogCount > 0;
  const showLowBacklogHint = openSlots > 0 && backlogCount > 0 && backlogCount < openSlots;
  const maxPromoteCount = Math.min(openSlots, backlogCount);

  const loadDashboardData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    setQueueHealthLoading(true);
    setSchedulerPrepLoading(true);
    setStatusDashboardLoading(true);

    const [
      summaryResult,
      backlogResult,
      pendingVerificationsResult,
      verificationRequestsResult,
      queueHealthResult,
      schedulerPrepResult,
      statusDashboardResult,
    ] = await Promise.all([
      getAgentOpsDashboardSummary(),
      getAgentOpsBacklogSummary(),
      getAgentOpsPendingVerifications(),
      getAgentOpsVerificationRequests(),
      getAgentOpsQueueHealth(),
      getAgentOpsSchedulerPreparationStatus(),
      getAgentOpsAgentStatusDashboard(),
    ]);

    const firstError =
      summaryResult.error ??
      backlogResult.error ??
      pendingVerificationsResult.error ??
      verificationRequestsResult.error;

    if (firstError) {
      setDataError(firstError);
      setDashboard(null);
      setBacklogCount(0);
      setPendingVerifications([]);
      setVerificationRequests([]);
      setQueueHealth(null);
      setSchedulerPrep(null);
      setStatusDashboardSummary(null);
      setQueueHealthLoading(false);
      setSchedulerPrepLoading(false);
      setStatusDashboardLoading(false);
      setDataLoading(false);
      return;
    }

    setDashboard(summaryResult.data);
    setBacklogCount(backlogResult.data?.count ?? 0);
    setPendingVerifications(pendingVerificationsResult.data ?? []);
    setVerificationRequests(verificationRequestsResult.data ?? []);
    setQueueHealth(queueHealthResult.data ?? null);
    setSchedulerPrep(schedulerPrepResult.data ?? null);
    setStatusDashboardSummary(statusDashboardResult.data?.summary ?? null);
    setQueueHealthLoading(false);
    setSchedulerPrepLoading(false);
    setStatusDashboardLoading(false);
    setDataLoading(false);
  }, []);

  const confirmRefillQueue = useCallback(async () => {
    setRefillSubmitting(true);
    setActionFeedback(null);

    const result = await refillAgentOpsActiveTop10FromBacklog();

    setRefillSubmitting(false);

    if (result.error) {
      setActionFeedback({ tone: "error", message: result.error });
      return;
    }

    setActionFeedback({
      tone: "success",
      message: result.data?.message ?? "Queue refill completed.",
    });
    setRefillModalOpen(false);
    await loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    let mounted = true;

    async function checkOwner() {
      setGateLoading(true);
      setGateError(null);

      const ownerResult = await getAgentOpsOwnerStatus();
      if (!mounted) return;

      if (ownerResult.error) {
        setGateError(ownerResult.error);
      }

      const owner = Boolean(ownerResult.data?.isOwner);
      setIsOwner(owner);
      setGateLoading(false);

      if (owner) {
        void loadDashboardData();
      }
    }

    void checkOwner();

    return () => {
      mounted = false;
    };
  }, [loadDashboardData]);

  const todayPriority = useMemo(() => {
    if (pendingVerifications.length > 0 || verificationRequests.length > 0) {
      return {
        title: "Review Verification",
        description:
          "Verification is pending. Review queued verification items first before adding new work.",
        tone: "amber" as const,
      };
    }
    if (openSlots > 0 && backlogCount > 0) {
      return {
        title: "Refill Queue",
        description:
          "Active queue has open slots and backlog is available. Refill to return toward Active Top 10.",
        tone: "cyan" as const,
      };
    }
    if (backlogCount === 0 || showLowBacklogHint) {
      return {
        title: "Generate More Issues",
        description:
          "Backlog is low or empty. Open Advanced and use import/scan tools to create candidates.",
        tone: "violet" as const,
      };
    }
    return {
      title: "No action needed",
      description: "Queue health looks stable. Keep monitoring and continue regular review.",
      tone: "emerald" as const,
    };
  }, [
    backlogCount,
    openSlots,
    pendingVerifications.length,
    showLowBacklogHint,
    verificationRequests.length,
  ]);

  const handleTodayPriorityAction = useCallback(() => {
    if (todayPriority.title === "Review Verification") {
      navigate("/system/agent-ops/issues");
      return;
    }
    if (todayPriority.title === "Refill Queue") {
      if (canShowRefillButton) {
        setActionFeedback(null);
        setRefillModalOpen(true);
        return;
      }
      navigate("/system/agent-ops/issues");
      return;
    }
    if (todayPriority.title === "Generate More Issues") {
      navigate("/system/agent-ops/advanced");
      return;
    }
    navigate("/system/agent-ops/issues");
  }, [canShowRefillButton, navigate, todayPriority.title]);

  const todayPriorityActionLabel = useMemo(() => {
    if (todayPriority.title === "Review Verification") return "Open issue queue";
    if (todayPriority.title === "Refill Queue") {
      return canShowRefillButton ? "Refill queue" : "Open issue queue";
    }
    if (todayPriority.title === "Generate More Issues") return "Open Advanced import tools";
    return "Open issue queue";
  }, [canShowRefillButton, todayPriority.title]);

  const commandMetrics = useMemo((): AixiaCommandMetricItem[] => {
    const queueHealthLabel = queueHealthLoading
      ? "Loading…"
      : queueHealth
        ? formatQueueHealthAction(queueHealth.recommendedAction)
        : "—";
    const agentsAttentionValue = statusDashboardLoading
      ? "…"
      : String(statusDashboardSummary?.agentsNeedingAttention ?? "—");
    const agentsAttentionSubtitle = statusDashboardSummary
      ? `of ${statusDashboardSummary.totalAgents} agents`
      : "Open Agents for details";
    const automationLabel = schedulerPrepLoading
      ? "Loading…"
      : schedulerPrep?.active
        ? "Prep active"
        : "Not active";

    if (!dashboard) {
      return [
        {
          key: "active-top10",
          label: "Active Top 10",
          value: "—",
          subtitle: "Loading…",
          icon: Layers,
          tone: "cyan",
        },
        {
          key: "backlog",
          label: "Backlog",
          value: "—",
          subtitle: "Loading…",
          icon: ClipboardList,
          tone: "indigo",
        },
        {
          key: "verification",
          label: "Pending Verification",
          value: "—",
          subtitle: "Loading…",
          icon: Activity,
          tone: "amber",
        },
        {
          key: "queue-health",
          label: "Queue Health",
          value: queueHealthLabel,
          subtitle: "Manual review",
          icon: Gauge,
          tone: "emerald",
        },
        {
          key: "agents-attention",
          label: "Agents Needing Attention",
          value: agentsAttentionValue,
          subtitle: agentsAttentionSubtitle,
          icon: Users,
          tone: "violet",
        },
        {
          key: "automation",
          label: "Automation",
          value: automationLabel,
          subtitle: "Manual / preparation only",
          icon: Clock,
          tone: "neutral",
        },
      ];
    }

    return [
      {
        key: "active-top10",
        label: "Active Top 10",
        value: String(dashboard.activeOpenCount),
        subtitle: `${dashboard.openSlots} open slot${dashboard.openSlots === 1 ? "" : "s"}`,
        icon: Layers,
        tone: "cyan",
      },
      {
        key: "backlog",
        label: "Backlog",
        value: String(dashboard.backlogCount),
        subtitle: "Queued findings",
        icon: ClipboardList,
        tone: "indigo",
      },
      {
        key: "verification",
        label: "Pending Verification",
        value: String(dashboard.verificationPendingCount),
        subtitle: "Pending or running",
        icon: Activity,
        tone: "amber",
      },
      {
        key: "queue-health",
        label: "Queue Health",
        value: queueHealthLabel,
        subtitle: queueHealth
          ? `${queueHealth.activeOpenCount} active · ${queueHealth.backlogCount} backlog`
          : "Manual review",
        icon: Gauge,
        tone: "emerald",
      },
      {
        key: "agents-attention",
        label: "Agents Needing Attention",
        value: agentsAttentionValue,
        subtitle: agentsAttentionSubtitle,
        icon: Users,
        tone: "violet",
      },
      {
        key: "automation",
        label: "Automation",
        value: automationLabel,
        subtitle: "Scheduler inactive · request-only UI",
        icon: Clock,
        tone: "neutral",
      },
    ];
  }, [
    dashboard,
    queueHealth,
    queueHealthLoading,
    schedulerPrep,
    schedulerPrepLoading,
    statusDashboardLoading,
    statusDashboardSummary,
  ]);

  const hubMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first AgentOps staging command center.",
        tone: "amber" as const,
      },
      {
        key: "mode",
        label: "Control mode",
        value: "Manual-first",
        detail: "Dedicated routes for daily work; minimal legacy fallback below.",
        tone: "cyan" as const,
      },
      {
        key: "scope",
        label: "Hub scope",
        value: "Command center",
        detail: "Orientation, metrics, and route navigation — not full registries.",
        tone: "neutral" as const,
      },
    ],
    [],
  );

  const hermes: AgentOpsHermesStatus | null = dashboard?.hermesStatus ?? null;

  const hubHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="Control Center"
      subtitle="Daily command center — staging only, manual-first. Open dedicated routes for work surfaces."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AixiaButton
            variant="primary"
            onClick={() => navigate("/system/agent-ops/issues")}
            disabled={dataLoading}
          >
            <FileInput className="mr-2 h-4 w-4" />
            Open issue queue
          </AixiaButton>
          {canShowRefillButton ? (
            <AixiaButton
              variant="secondary"
              onClick={() => {
                setActionFeedback(null);
                setRefillModalOpen(true);
              }}
              disabled={dataLoading || refillSubmitting}
            >
              <ListPlus className="mr-2 h-4 w-4" />
              Refill Queue
            </AixiaButton>
          ) : null}
          <AixiaButton
            variant="secondary"
            onClick={() => void loadDashboardData()}
            disabled={dataLoading || refillSubmitting}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${dataLoading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </div>
      }
    >
      <AixiaCommandMetrics items={commandMetrics} />
    </AixiaHero>
  );

  if (gateLoading) {
    return (
      <AixiaCommandPageLayout hero={hubHero}>
        <AixiaSection
          surface="command"
          title="Control Center"
          description="Checking AgentOps access."
          icon={ShieldCheck}
        >
          <AixiaEmptyState
            icon={ShieldCheck}
            title="Checking AgentOps access"
            description="Owner allowlist and route permissions are being verified."
          />
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  if (!isOwner) {
    return (
      <AixiaCommandPageLayout hero={hubHero}>
        <AixiaSection
          surface="command"
          title="Control Center"
          description="Owner access required"
          icon={ShieldCheck}
        >
          <AixiaEmptyState
            icon={ShieldCheck}
            title="AgentOps is Owner-only"
            description={
              gateError
                ? `You do not have access to AgentOps. ${gateError}`
                : "Your account is not on the AgentOps Owner allowlist. Access is controlled by agentops_owners and database RLS — not by admin role or finance permissions."
            }
          />
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  return (
    <AixiaCommandPageLayout
      hero={hubHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={hubMetaStripItems} />}
    >
      <div className="flex flex-col gap-6">
        {actionFeedback ? (
          <AixiaInfoBlock
            tone={
              actionFeedback.tone === "success"
                ? "emerald"
                : actionFeedback.tone === "warning"
                  ? "gold"
                  : "rose"
            }
            icon={
              actionFeedback.tone === "error"
                ? AlertTriangle
                : actionFeedback.tone === "warning"
                  ? ClipboardList
                  : ShieldCheck
            }
            title={
              actionFeedback.tone === "error"
                ? "Action failed"
                : actionFeedback.tone === "warning"
                  ? "Attention needed"
                  : "Action saved"
            }
          >
            {actionFeedback.message}
          </AixiaInfoBlock>
        ) : null}

        {dataError ? (
          <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Could not load AgentOps data">
            {dataError}
          </AixiaInfoBlock>
        ) : null}

        <AixiaSection
          surface="command"
          title="Today's Priority"
          description="Single recommended next step based on queue state."
          icon={Sparkles}
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Recommended now</p>
                <p className="mt-1 text-lg font-semibold text-white">{todayPriority.title}</p>
                <p className="mt-1 text-sm text-slate-300">{todayPriority.description}</p>
              </div>
              <AixiaBadge tone={todayPriority.tone}>{todayPriority.title}</AixiaBadge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <AixiaButton
                variant="primary"
                className="text-xs px-3 py-1.5"
                onClick={handleTodayPriorityAction}
              >
                {todayPriorityActionLabel}
              </AixiaButton>
              {todayPriority.title !== "No action needed" ? (
                <AixiaButton
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  onClick={() => navigate("/system/agent-ops/issues")}
                >
                  Open issue queue
                </AixiaButton>
              ) : null}
            </div>
          </div>
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="System readiness"
          description="Runtime integrations for AgentOps chat and advisory layers."
          icon={ShieldCheck}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-slate-500">Hermes</p>
              <p className="mt-1 text-sm font-medium text-white">
                {hermesReadinessGate.runtimeActive && hermesReadinessGate.healthCheckPassing ?
                  "Active"
                : "Inactive / fallback"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {hermesReadinessGate.runtimeActive ?
                  "Server proxy /api/agentops/hermes · Issue chat Hermes-first"
                : hermesReadinessGate.blockers[0] ?? `${hermes?.label ?? "Learning"} · mock fallback only`}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-slate-500">CodeGraph</p>
              <p className="mt-1 text-sm font-medium text-white">Mock · inactive</p>
              <p className="mt-1 text-xs text-slate-400">Static hints in Issue Workspace</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-slate-500">Local LLM</p>
              <p className="mt-1 text-sm font-medium text-white">
                {localLlmStatus.runtimeActive ? "Active" : "Inactive"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {localLlmStatus.runtimeActive ?
                  `${localLlmStatus.model} · Issue, Council, Agent chats`
                : "Set VITE_AGENTOPS_LLM_* and run Ollama locally"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-slate-500">Scheduler</p>
              <p className="mt-1 text-sm font-medium text-white">
                {schedulerPrep?.active ? "Prep flagged" : "Not active"}
              </p>
              <p className="mt-1 text-xs text-slate-400">No cron from UI</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-slate-500">Cursor execution</p>
              <p className="mt-1 text-sm font-medium text-white">Manual-first</p>
              <p className="mt-1 text-xs text-slate-400">No auto Cursor from AgentOps</p>
            </div>
          </div>
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Navigate"
          description="Daily and technical surfaces use dedicated routes."
          icon={Route}
        >
          <AixiaNavigationGrid>
            <AixiaNavigationCard
              title="Issues"
              description="Daily issue queue and filters"
              icon={FileInput}
              tone="cyan"
              onClick={() => navigate("/system/agent-ops/issues")}
            />
            <AixiaNavigationCard
              title="Agents"
              description="12-agent registry and focus tools"
              icon={Users}
              tone="violet"
              onClick={() => navigate("/system/agent-ops/agents")}
            />
            <AixiaNavigationCard
              title="Council"
              description="Group chat shell (staging)"
              icon={MessageSquare}
              tone="cyan"
              onClick={() => navigate("/system/agent-ops/council")}
            />
            <AixiaNavigationCard
              title="Automation"
              description="Queue health, manual runs, scheduler prep"
              icon={Clock}
              tone="amber"
              onClick={() => navigate("/system/agent-ops/automation")}
            />
            <AixiaNavigationCard
              title="Knowledge"
              description="Memory, lessons, and learning surfaces"
              icon={BookOpen}
              tone="emerald"
              onClick={() => navigate("/system/agent-ops/knowledge")}
            />
            <AixiaNavigationCard
              title="Advanced"
              description="Import, fix plans, verification, operator tools"
              icon={ClipboardList}
              tone="neutral"
              onClick={() => navigate("/system/agent-ops/advanced")}
            />
            <AixiaNavigationCard
              title="History"
              description="Runs, decisions, verification, reports"
              icon={History}
              tone="cyan"
              onClick={() => navigate("/system/agent-ops/history")}
            />
          </AixiaNavigationGrid>
        </AixiaSection>

        <AixiaAsyncState
          loading={dataLoading && !dashboard}
          fallback={
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center text-sm text-muted-foreground">
              Loading AgentOps dashboard…
            </div>
          }
        >
          <details
            ref={legacyToolsRef}
            id="agentops-legacy-tools"
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-300 hover:text-white">
              Legacy tools fallback (minimal)
            </summary>
            <p className="mt-2 text-xs text-slate-500">
              Use dedicated routes first. Inner legacy tab panel was removed in Phase 0B.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <AixiaButton variant="secondary" className="text-xs" onClick={() => navigate("/system/agent-ops/issues")}>
                Open Issues
              </AixiaButton>
              <AixiaButton variant="secondary" className="text-xs" onClick={() => navigate("/system/agent-ops/automation")}>
                Open Automation
              </AixiaButton>
              <AixiaButton variant="secondary" className="text-xs" onClick={() => navigate("/system/agent-ops/advanced")}>
                Open Advanced
              </AixiaButton>
              <AixiaButton variant="secondary" className="text-xs" onClick={() => navigate("/system/agent-ops/history")}>
                Open History
              </AixiaButton>
            </div>
            <AixiaInfoBlock tone="cyan" icon={ShieldCheck} title="Legacy inner panel removed (Phase 0B)">
              Operator workflows live on dedicated routes: Issues, Advanced, Automation, Agents,
              Knowledge, and Agent Workspace. Hub primary (Refill Queue, Today's Priority, Navigate)
              remains above.
            </AixiaInfoBlock>
          </details>
        </AixiaAsyncState>
      </div>

      {refillModalOpen && dashboard ? (
        <AixiaModal
          open
          title="Refill Active Top 10 from backlog"
          description="Manual promotion only — no new findings are created."
          onClose={() => {
            if (refillSubmitting) return;
            setRefillModalOpen(false);
          }}
          maxWidthClassName="max-w-lg"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => setRefillModalOpen(false)}
                disabled={refillSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void confirmRefillQueue()}
                disabled={refillSubmitting || maxPromoteCount <= 0}
              >
                {refillSubmitting ? "Promoting…" : "Promote backlog findings"}
              </AixiaButton>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Active open</div>
                <div className="mt-1 font-semibold text-white">
                  {dashboard.activeOpenCount} / 10
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Open slots</div>
                <div className="mt-1 font-semibold text-white">{openSlots}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">Backlog</div>
                <div className="mt-1 font-semibold text-white">{backlogCount}</div>
              </div>
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-cyan-200/80">Will promote (max)</div>
                <div className="mt-1 font-semibold text-white">{maxPromoteCount}</div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Candidates are chosen by severity (Critical first), then priority score, then recency.
              Lowest available ranks 1–10 are assigned.
            </p>
          </div>
        </AixiaModal>
      ) : null}
    </AixiaCommandPageLayout>
  );
}
