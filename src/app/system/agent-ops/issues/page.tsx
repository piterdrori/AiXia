import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Filter,
  ListChecks,
  ListPlus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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
  AixiaSection,
  AixiaStatusBadge,
  AixiaTableShell,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsActiveTop10,
  getAgentOpsBacklogSummary,
  getAgentOpsOwnerStatus,
  getAgentOpsVerificationRequests,
  refillAgentOpsActiveTop10FromBacklog,
  type AgentOpsFinding,
  type AgentOpsQueueState,
  type AgentOpsVerificationRequestItem,
} from "@/lib/agentops";
import { AgentOpsQueueOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsQueueOperatorSurface";

type IssueListItem = {
  id: string;
  issueCode: string;
  title: string;
  severity: string;
  category: string;
  route: string | null;
  status: string;
  queueState: AgentOpsQueueState;
  agentId: string | null;
  nextAction: string;
  source: "active_top_10" | "backlog" | "verification";
};

type FocusFilter = "all" | "needs_attention" | "active" | "verification" | "backlog" | "archived";

const FOCUS_FILTERS: { id: FocusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_attention", label: "Needs attention" },
  { id: "active", label: "Active" },
  { id: "verification", label: "Verification" },
  { id: "backlog", label: "Backlog" },
  { id: "archived", label: "Archived" },
];

function toIssueListItem(finding: AgentOpsFinding, source: IssueListItem["source"]): IssueListItem {
  let nextAction = "Open workspace";
  if (finding.status === "Approved for Fix") nextAction = "Prepare execution request";
  if (finding.status === "Marked Fixed by Piter") nextAction = "Approve verification run";
  if (finding.status === "Verification Running") nextAction = "Record verification result";
  if (finding.status === "Verified Fixed" || finding.status === "Archived") {
    nextAction = "Review closure notes";
  }
  if (finding.status === "Needs Follow-Up Fix" || finding.status === "Still Broken") {
    nextAction = "Review follow-up";
  }
  if (finding.status === "Verification Blocked") nextAction = "Unblock verification";
  return {
    id: finding.id,
    issueCode: finding.issue_code,
    title: finding.title,
    severity: finding.severity,
    category: finding.category,
    route: finding.route,
    status: finding.status,
    queueState: finding.queue_state,
    agentId: finding.agent_id,
    nextAction,
    source,
  };
}

function itemNeedsAttention(item: IssueListItem): boolean {
  if (item.source === "verification") return true;
  return [
    "Approved for Fix",
    "Marked Fixed by Piter",
    "Verification Running",
    "Needs Follow-Up Fix",
    "Still Broken",
    "Verification Blocked",
    "In Progress",
  ].includes(item.status);
}

function toneForSeverity(severity: string): "rose" | "amber" | "cyan" | "neutral" {
  if (severity === "Critical" || severity === "High") return "rose";
  if (severity === "Medium") return "amber";
  if (severity === "Low") return "cyan";
  return "neutral";
}

function toneForQueue(queueState: AgentOpsQueueState): "emerald" | "violet" | "neutral" {
  if (queueState === "active_top_10") return "emerald";
  if (queueState === "backlog") return "violet";
  return "neutral";
}

function queueStateLabel(queueState: AgentOpsQueueState): string {
  if (queueState === "active_top_10") return "Active Top 10";
  if (queueState === "backlog") return "Backlog";
  return "Archived";
}

export default function AgentOpsIssuesPage() {
  usePageTitle("AgentOps Issues");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [refillSubmitting, setRefillSubmitting] = useState(false);

  const [activeItems, setActiveItems] = useState<IssueListItem[]>([]);
  const [backlogItems, setBacklogItems] = useState<IssueListItem[]>([]);
  const [backlogTotalCount, setBacklogTotalCount] = useState(0);
  const [verificationItems, setVerificationItems] = useState<AgentOpsVerificationRequestItem[]>([]);

  const [focusFilter, setFocusFilter] = useState<FocusFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [ownerResult, activeResult, backlogResult, verificationResult] = await Promise.all([
      getAgentOpsOwnerStatus(),
      getAgentOpsActiveTop10(),
      getAgentOpsBacklogSummary(),
      getAgentOpsVerificationRequests(),
    ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setIsOwner(false);
      setError(ownerResult.error ?? "AgentOps Owner access required.");
      setLoading(false);
      return;
    }

    setIsOwner(true);
    if (activeResult.error || backlogResult.error || verificationResult.error) {
      setError(activeResult.error ?? backlogResult.error ?? verificationResult.error ?? "Load failed.");
      setLoading(false);
      return;
    }

    const activeRows = (activeResult.data ?? []).map((finding) =>
      toIssueListItem(finding, "active_top_10"),
    );
    const backlogRows = (backlogResult.data?.preview ?? []).map((finding) =>
      toIssueListItem(finding, "backlog"),
    );

    setActiveItems(activeRows);
    setBacklogItems(backlogRows);
    setBacklogTotalCount(backlogResult.data?.count ?? backlogRows.length);
    setVerificationItems(verificationResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  const openSlots = Math.max(0, 10 - activeItems.length);
  const canShowRefillButton = openSlots > 0 && backlogTotalCount > 0;

  const mergedItems = useMemo(() => {
    const map = new Map<string, IssueListItem>();
    for (const row of [...activeItems, ...backlogItems]) {
      map.set(row.issueCode, row);
    }
    for (const vr of verificationItems) {
      if (map.has(vr.issueCode)) continue;
      map.set(vr.issueCode, {
        id: vr.findingId,
        issueCode: vr.issueCode,
        title: vr.title,
        severity: vr.severity,
        category: "Verification",
        route: null,
        status: vr.status,
        queueState: vr.queueState,
        agentId: null,
        nextAction: "Review verification request",
        source: "verification",
      });
    }
    return [...map.values()];
  }, [activeItems, backlogItems, verificationItems]);

  const verificationPending = useMemo(
    () => verificationItems.filter((item) => item.requestStatus !== "verification_passed"),
    [verificationItems],
  );

  const needsAttentionCount = useMemo(
    () => mergedItems.filter((item) => itemNeedsAttention(item)).length,
    [mergedItems],
  );

  const filteredItems = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    return mergedItems.filter((item) => {
      if (focusFilter === "needs_attention" && !itemNeedsAttention(item)) return false;
      if (focusFilter === "active" && item.queueState !== "active_top_10") return false;
      if (focusFilter === "verification" && item.source !== "verification") return false;
      if (focusFilter === "backlog" && item.queueState !== "backlog") return false;
      if (
        focusFilter === "archived" &&
        item.status !== "Verified Fixed" &&
        item.queueState !== "archived"
      ) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (queueFilter !== "all" && item.queueState !== queueFilter) return false;
      if (severityFilter !== "all" && item.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (routeFilter !== "all" && (item.route ?? "—") !== routeFilter) return false;
      if (agentFilter !== "all" && (item.agentId ?? "Not linked yet") !== agentFilter) return false;
      if (!text) return true;
      return (
        item.issueCode.toLowerCase().includes(text) ||
        item.title.toLowerCase().includes(text) ||
        (item.route ?? "").toLowerCase().includes(text)
      );
    });
  }, [
    mergedItems,
    focusFilter,
    statusFilter,
    queueFilter,
    severityFilter,
    categoryFilter,
    routeFilter,
    agentFilter,
    searchTerm,
  ]);

  const statuses = useMemo(() => [...new Set(mergedItems.map((item) => item.status))].sort(), [mergedItems]);
  const severities = useMemo(
    () => [...new Set(mergedItems.map((item) => item.severity))].sort(),
    [mergedItems],
  );
  const categories = useMemo(
    () => [...new Set(mergedItems.map((item) => item.category))].sort(),
    [mergedItems],
  );
  const routes = useMemo(
    () => [...new Set(mergedItems.map((item) => item.route ?? "—"))].sort(),
    [mergedItems],
  );
  const agents = useMemo(
    () => [...new Set(mergedItems.map((item) => item.agentId ?? "Not linked yet"))].sort(),
    [mergedItems],
  );

  const recommendedAction = useMemo(() => {
    if (verificationPending.length > 0) {
      return {
        title: "Review verification",
        description: `${verificationPending.length} verification request(s) need owner review.`,
        tone: "amber" as const,
        primaryLabel: "Show verification queue",
        onPrimary: () => setFocusFilter("verification"),
      };
    }
    const topActive = activeItems[0];
    if (topActive) {
      return {
        title: "Open highest-priority active issue",
        description: `${topActive.issueCode} — ${topActive.title}`,
        tone: "cyan" as const,
        primaryLabel: "Open Workspace",
        onPrimary: () =>
          navigate(`/system/agent-ops/issues/${encodeURIComponent(topActive.issueCode)}`),
      };
    }
    if (canShowRefillButton) {
      return {
        title: "Refill Active Top 10",
        description: `${openSlots} open slot(s) and ${backlogTotalCount} backlog item(s) available.`,
        tone: "cyan" as const,
        primaryLabel: "Refill queue",
        onPrimary: "refill" as const,
      };
    }
    if (openSlots > 0 && backlogTotalCount === 0) {
      return {
        title: "Generate or import findings",
        description:
          "Backlog is empty. Use the Advanced route to review manual import/operator tools.",
        tone: "violet" as const,
        primaryLabel: "Open Advanced",
        onPrimary: () => {
          navigate("/system/agent-ops/advanced");
        },
      };
    }
    return {
      title: "No action needed",
      description: "Queue looks stable. Continue routine review or open any issue below.",
      tone: "emerald" as const,
      primaryLabel: "Show all issues",
      onPrimary: () => setFocusFilter("all"),
    };
  }, [
    activeItems,
    backlogTotalCount,
    canShowRefillButton,
    navigate,
    openSlots,
    verificationPending.length,
  ]);

  const handleRefillQueue = useCallback(async () => {
    setRefillSubmitting(true);
    setActionFeedback(null);
    const result = await refillAgentOpsActiveTop10FromBacklog();
    setRefillSubmitting(false);
    if (result.error) {
      setActionFeedback(result.error);
      return;
    }
    setActionFeedback(result.data?.message ?? "Queue refilled.");
    void loadIssues();
  }, [loadIssues]);

  const handleRecommendedPrimary = useCallback(() => {
    if (recommendedAction.onPrimary === "refill") {
      void handleRefillQueue();
      return;
    }
    if (typeof recommendedAction.onPrimary === "function") {
      recommendedAction.onPrimary();
    }
  }, [handleRefillQueue, recommendedAction]);

  const emptyStateCopy = useMemo(() => {
    if (mergedItems.length === 0) {
      return {
        title: "No issues in queue",
        description:
          "Use Advanced import/operator tools to add backlog candidates. Nothing runs automatically.",
      };
    }
    if (focusFilter === "verification" && verificationPending.length === 0) {
      return {
        title: "No verification pending",
        description: "No open verification requests match this view.",
      };
    }
    if (focusFilter === "backlog" && backlogTotalCount === 0) {
      return {
        title: "Backlog is empty",
        description: "Run a manual import plan from Advanced when you need more candidates.",
      };
    }
    return {
      title: "No matching issues",
      description: "Adjust search or filters, or switch the focus chip above.",
    };
  }, [backlogTotalCount, focusFilter, mergedItems.length, verificationPending.length]);

  const issuesMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first AgentOps staging surface.",
        tone: "amber" as const,
      },
      {
        key: "scope",
        label: "Loaded scope",
        value: "Active, backlog, verification",
        detail: "Rows merged from current queue snapshot.",
        tone: "neutral" as const,
      },
    ],
    [],
  );

  const issuesCommandMetrics = useMemo(
    () => [
      {
        key: "active-top-10",
        title: "Active Top 10",
        value: loading ? "Checking…" : String(activeItems.length),
        subtitle: `${openSlots} open slots`,
        icon: ListChecks,
        tone: "emerald" as const,
      },
      {
        key: "verification-pending",
        title: "Verification pending",
        value: loading ? "Checking…" : String(verificationPending.length),
        subtitle: "Needs owner review",
        icon: AlertTriangle,
        tone: "amber" as const,
      },
      {
        key: "backlog",
        title: "Backlog",
        value: loading ? "Checking…" : String(backlogTotalCount),
        subtitle: `${backlogItems.length} in preview`,
        icon: ListPlus,
        tone: "violet" as const,
      },
      {
        key: "needs-attention",
        title: "Needs attention",
        value: loading ? "Checking…" : String(needsAttentionCount),
        subtitle: "Action required",
        icon: Sparkles,
        tone: "rose" as const,
      },
    ],
    [
      activeItems.length,
      backlogItems.length,
      backlogTotalCount,
      loading,
      needsAttentionCount,
      openSlots,
      verificationPending.length,
    ],
  );

  const issuesHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="Issues"
      subtitle="Canonical daily queue — active work, verification, and backlog"
      parentLabel="Control Center"
      parentPath="/system/agent-ops"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Control Center
          </AixiaButton>
          {canShowRefillButton ? (
            <AixiaButton
              variant="secondary"
              disabled={loading || refillSubmitting}
              onClick={() => void handleRefillQueue()}
            >
              <ListPlus className="mr-2 h-4 w-4" />
              Refill Queue
            </AixiaButton>
          ) : null}
          <AixiaButton
            variant="secondary"
            disabled={loading || refillSubmitting}
            onClick={() => void loadIssues()}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </>
      }
    >
      <AixiaCommandMetrics items={issuesCommandMetrics} />
    </AixiaHero>
  );

  if (!loading && (!isOwner || error?.toLowerCase().includes("owner access required"))) {
    return (
      <AixiaCommandPageLayout hero={issuesHero}>
        <AixiaSection
          surface="command"
          title="AgentOps Issues"
          description="Owner access required"
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Owner access required">
            {error ?? "Only AgentOps owner users can view this page."}
          </AixiaInfoBlock>
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  return (
    <AixiaCommandPageLayout
      hero={issuesHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={issuesMetaStripItems} />}
    >
      <div data-testid="agentops-issues-page">
        <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-300 hover:text-white">
            Queue guardrails (manual-first)
          </summary>
          <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Manual-first queue">
            Canonical daily queue for active work, verification, and backlog. Nothing runs automatically
            from this page — owner actions only.
          </AixiaInfoBlock>
        </details>

        {actionFeedback ? (
          <AixiaInfoBlock tone="emerald" icon={ListChecks} title="Queue update">
            {actionFeedback}
          </AixiaInfoBlock>
        ) : null}

        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaSection
              surface="command"
              title="Issue queue"
              description="Loading active, backlog, and verification rows."
              icon={ListChecks}
            >
              <AixiaEmptyState
                icon={ListChecks}
                title="Loading issue queue"
                description="Queue summary and issue list are being prepared."
              />
            </AixiaSection>
          }
        >
          <>
            {error && isOwner ? (
              <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Could not load issue queues">
                {error}
              </AixiaInfoBlock>
            ) : null}

            <AixiaSection
              surface="command"
              title="Recommended next action"
              description="One suggested step — then use the list below."
              icon={Sparkles}
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Focus now</p>
                    <p className="mt-1 text-lg font-semibold text-white">{recommendedAction.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{recommendedAction.description}</p>
                  </div>
                  <AixiaBadge tone={recommendedAction.tone}>{recommendedAction.title}</AixiaBadge>
                </div>
                <div className="mt-3">
                  <AixiaButton
                    variant="primary"
                    className="text-xs px-3 py-1.5"
                    disabled={refillSubmitting}
                    onClick={handleRecommendedPrimary}
                  >
                    {recommendedAction.primaryLabel}
                  </AixiaButton>
                </div>
              </div>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Find issues"
              description="Search and filter — use focus chips for common queues."
              icon={Filter}
            >
              <div className="flex flex-wrap gap-2">
                {FOCUS_FILTERS.map((chip) => {
                  const isActive = focusFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setFocusFilter(chip.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/40"
                          : "bg-white/[0.05] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search code, title, or route"
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 md:col-span-2"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  <option value="all">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={queueFilter}
                  onChange={(event) => setQueueFilter(event.target.value)}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  <option value="all">All queues</option>
                  <option value="active_top_10">Active Top 10</option>
                  <option value="backlog">Backlog</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-200">
                  More filters (severity, category, route, agent)
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <select
                    value={severityFilter}
                    onChange={(event) => setSeverityFilter(event.target.value)}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  >
                    <option value="all">All severities</option>
                    {severities.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <select
                    value={routeFilter}
                    onChange={(event) => setRouteFilter(event.target.value)}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  >
                    <option value="all">All routes</option>
                    {routes.map((route) => (
                      <option key={route} value={route}>
                        {route}
                      </option>
                    ))}
                  </select>
                  <select
                    value={agentFilter}
                    onChange={(event) => setAgentFilter(event.target.value)}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  >
                    <option value="all">All reporting agents</option>
                    {agents.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>
              </details>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Issue list"
              description="One row per issue — open Issue Workspace for the full lifecycle."
              icon={ListChecks}
              badge={<AixiaBadge tone="cyan">{filteredItems.length} shown</AixiaBadge>}
            >
              {filteredItems.length === 0 ? (
                <AixiaEmptyState
                  icon={ListChecks}
                  title={emptyStateCopy.title}
                  description={emptyStateCopy.description}
                />
              ) : (
                <div className="aixia-scrollbar agentops-dense-table w-full max-w-full overflow-x-auto pb-3">
                  <AixiaTableShell variant="registry" minWidthClassName="min-w-[1080px]">
                    <thead className="aixia-table-head">
                      <tr>
                        <th>Issue</th>
                        <th>Title</th>
                        <th>Severity</th>
                        <th>Category</th>
                        <th>Route</th>
                        <th>Status</th>
                        <th>Queue</th>
                        <th>Next action</th>
                        <th>Agent</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.issueCode}>
                          <td className="whitespace-nowrap font-mono text-xs text-cyan-200/90">
                            {item.issueCode}
                          </td>
                          <td className="max-w-[220px] truncate text-sm text-white" title={item.title}>
                            {item.title}
                          </td>
                          <td className="whitespace-nowrap">
                            <AixiaBadge tone={toneForSeverity(item.severity)}>{item.severity}</AixiaBadge>
                          </td>
                          <td className="max-w-[120px] truncate">
                            <AixiaBadge tone="violet">{item.category}</AixiaBadge>
                          </td>
                          <td
                            className="max-w-[160px] truncate font-mono text-xs text-slate-400"
                            title={item.route ?? undefined}
                          >
                            {item.route ?? "—"}
                          </td>
                          <td className="whitespace-nowrap">
                            <AixiaStatusBadge value={item.status} />
                          </td>
                          <td className="whitespace-nowrap">
                            <AixiaBadge tone={toneForQueue(item.queueState)}>
                              {queueStateLabel(item.queueState)}
                            </AixiaBadge>
                          </td>
                          <td className="max-w-[140px] truncate text-xs text-slate-300" title={item.nextAction}>
                            {item.nextAction}
                          </td>
                          <td className="max-w-[100px] truncate text-xs text-slate-400" title={item.agentId ?? undefined}>
                            {item.agentId ?? "—"}
                          </td>
                          <td className="whitespace-nowrap text-right">
                            <AixiaButton
                              variant="primary"
                              className="text-xs px-3 py-1.5"
                              onClick={() =>
                                navigate(
                                  `/system/agent-ops/issues/${encodeURIComponent(item.issueCode)}`,
                                )
                              }
                            >
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              Open Workspace
                            </AixiaButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </AixiaTableShell>
                </div>
              )}
            </AixiaSection>

            <AgentOpsQueueOperatorSurface onRefresh={loadIssues} />
          </>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}
