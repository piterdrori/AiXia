import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Copy, FileText, History, ListChecks, RefreshCw, ShieldCheck } from "lucide-react";

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
  AixiaTableShell,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsAutomationControlRequests,
  getAgentOpsDashboardSummary,
  getAgentOpsGeneratedFixPlans,
  getAgentOpsImportDecisionHistory,
  getAgentOpsOwnerStatus,
  getAgentOpsRunHistory,
  getAgentOpsSchedulerPreparationStatus,
  getAgentOpsVerificationRequests,
  type AgentOpsAutomationControlRequestItem,
  type AgentOpsImportDecisionHistoryItem,
  type AgentOpsRun,
  type AgentOpsVerificationRequestItem,
} from "@/lib/agentops";

type TimelineType = "run" | "verification" | "automation" | "import" | "scheduler" | "queue";
type HistoryStatus = "all" | "open" | "completed" | "blocked";
type RecentRange = "7d" | "30d" | "all";

type HistoryTimelineItem = {
  id: string;
  timestamp: string;
  type: TimelineType;
  issueCode?: string | null;
  title: string;
  details: string;
  statusLabel: string;
  statusCategory: Exclude<HistoryStatus, "all">;
  path?: string | null;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function classifyStatus(raw: string): Exclude<HistoryStatus, "all"> {
  const value = raw.toLowerCase();
  if (value.includes("pass") || value.includes("verified") || value.includes("complete") || value.includes("copied")) {
    return "completed";
  }
  if (value.includes("block") || value.includes("fail") || value.includes("reject") || value.includes("cancel")) {
    return "blocked";
  }
  return "open";
}

export default function AgentOpsHistoryPage() {
  usePageTitle("AgentOps History");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [runHistory, setRunHistory] = useState<AgentOpsRun[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<AgentOpsVerificationRequestItem[]>([]);
  const [automationRequests, setAutomationRequests] = useState<AgentOpsAutomationControlRequestItem[]>([]);
  const [importDecisions, setImportDecisions] = useState<AgentOpsImportDecisionHistoryItem[]>([]);
  const [schedulerDecision, setSchedulerDecision] = useState<string | null>(null);
  const [schedulerDecisionNote, setSchedulerDecisionNote] = useState<string | null>(null);
  const [latestOrchestratorReportPath, setLatestOrchestratorReportPath] = useState<string | null>(null);
  const [latestRunStatus, setLatestRunStatus] = useState<string | null>(null);
  const [fixPlanArtifacts, setFixPlanArtifacts] = useState<
    Array<{
      issueCode: string;
      planId: string;
      markdownPath: string;
      jsonPath: string;
      latestCursorHandoffStatus?: string | null;
      latestCursorHandoffId?: string | null;
    }>
  >([]);

  const [actionFilter, setActionFilter] = useState<TimelineType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<HistoryStatus>("all");
  const [rangeFilter, setRangeFilter] = useState<RecentRange>("30d");
  const [issueFilter, setIssueFilter] = useState("");

  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);

    const [
      ownerResult,
      runHistoryResult,
      verificationResult,
      automationResult,
      importHistoryResult,
      schedulerResult,
      dashboardResult,
      fixPlanResult,
    ] = await Promise.all([
      getAgentOpsOwnerStatus(),
      getAgentOpsRunHistory(20),
      getAgentOpsVerificationRequests(),
      getAgentOpsAutomationControlRequests(20),
      getAgentOpsImportDecisionHistory(),
      getAgentOpsSchedulerPreparationStatus(),
      getAgentOpsDashboardSummary(),
      getAgentOpsGeneratedFixPlans(),
    ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setIsOwner(false);
      setError(ownerResult.error ?? "AgentOps Owner access required.");
      setLoading(false);
      return;
    }

    setIsOwner(true);
    setRunHistory(runHistoryResult.data ?? []);
    setVerificationRequests(verificationResult.data ?? []);
    setAutomationRequests(automationResult.data ?? []);
    setImportDecisions(importHistoryResult.data ?? []);
    setSchedulerDecision(schedulerResult.data?.latestSchedulerDecision ?? null);
    setSchedulerDecisionNote(schedulerResult.data?.latestSchedulerDecisionNote ?? null);
    setLatestOrchestratorReportPath(schedulerResult.data?.latestQueueHealth?.latestOrchestratorReportPath ?? null);
    setLatestRunStatus(dashboardResult.data?.latestRun?.status ?? null);
    setFixPlanArtifacts(
      (fixPlanResult.data?.plans ?? []).slice(0, 12).map((plan) => ({
        issueCode: plan.issueCode,
        planId: plan.planId,
        markdownPath: plan.markdownPath,
        jsonPath: plan.jsonPath,
        latestCursorHandoffStatus: plan.latestCursorHandoffStatus ?? null,
        latestCursorHandoffId: plan.latestCursorHandoffId ?? null,
      })),
    );

    const firstError =
      runHistoryResult.error ??
      verificationResult.error ??
      automationResult.error ??
      importHistoryResult.error ??
      schedulerResult.error ??
      dashboardResult.error ??
      fixPlanResult.error ??
      null;
    if (firstError) setError(firstError);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const timeline = useMemo<HistoryTimelineItem[]>(() => {
    const rows: HistoryTimelineItem[] = [];

    runHistory.slice(0, 10).forEach((run) => {
      rows.push({
        id: `run-${run.id}`,
        timestamp: run.started_at,
        type: "run",
        title: `${run.run_type} run`,
        details: run.summary ?? "No run summary provided.",
        statusLabel: run.status,
        statusCategory: classifyStatus(run.status),
      });
    });

    verificationRequests.slice(0, 12).forEach((item) => {
      rows.push({
        id: `verification-${item.findingId}`,
        timestamp: item.verificationReportPath ? new Date().toISOString() : new Date().toISOString(),
        type: "verification",
        issueCode: item.issueCode,
        title: "Verification request",
        details: item.cursorReportSummary ?? "Verification request from Cursor handoff/report metadata.",
        statusLabel: item.requestStatus,
        statusCategory: classifyStatus(item.requestStatus),
        path: item.verificationReportPath,
      });
    });

    automationRequests.slice(0, 10).forEach((item) => {
      rows.push({
        id: `automation-${item.feedbackId}`,
        timestamp: item.createdAt,
        type: "automation",
        title: item.requestType.replaceAll("_", " "),
        details: item.note ?? "Automation control request logged.",
        statusLabel: item.status,
        statusCategory: classifyStatus(item.status),
        path: item.commandOrPrompt,
      });
    });

    importDecisions.slice(0, 10).forEach((item) => {
      rows.push({
        id: `import-${item.id}`,
        timestamp: item.createdAt,
        type: "import",
        issueCode: item.issueCode,
        title: `${item.sourceId.replaceAll("_", " ")} decision`,
        details: item.remark ?? "Import/scan review decision logged.",
        statusLabel: item.decision,
        statusCategory: classifyStatus(item.decision),
        path: item.planPath,
      });
    });

    if (schedulerDecision) {
      rows.push({
        id: "scheduler-decision-latest",
        timestamp: new Date().toISOString(),
        type: "scheduler",
        title: "Scheduler preparation decision",
        details: schedulerDecisionNote ?? "Latest scheduler prep decision from owner feedback.",
        statusLabel: schedulerDecision.replaceAll("_", " "),
        statusCategory: classifyStatus(schedulerDecision),
      });
    }

    if (latestOrchestratorReportPath) {
      rows.push({
        id: "queue-health-latest",
        timestamp: new Date().toISOString(),
        type: "queue",
        title: "Latest queue health/orchestrator report",
        details: "Latest queue health snapshot references orchestrator output.",
        statusLabel: latestRunStatus ?? "recorded",
        statusCategory: classifyStatus(latestRunStatus ?? "recorded"),
        path: latestOrchestratorReportPath,
      });
    }

    return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [
    automationRequests,
    importDecisions,
    latestOrchestratorReportPath,
    latestRunStatus,
    runHistory,
    schedulerDecision,
    schedulerDecisionNote,
    verificationRequests,
  ]);

  const filteredTimeline = useMemo(() => {
    const currentTime = Date.now();
    const issueQuery = issueFilter.trim().toLowerCase();

    return timeline.filter((row) => {
      if (actionFilter !== "all" && row.type !== actionFilter) return false;
      if (statusFilter !== "all" && row.statusCategory !== statusFilter) return false;
      if (rangeFilter !== "all") {
        const cutoffDays = rangeFilter === "7d" ? 7 : 30;
        const cutoff = currentTime - cutoffDays * 24 * 60 * 60 * 1000;
        if (new Date(row.timestamp).getTime() < cutoff) return false;
      }
      if (issueQuery) {
        const haystack = `${row.issueCode ?? ""} ${row.title} ${row.details}`.toLowerCase();
        if (!haystack.includes(issueQuery)) return false;
      }
      return true;
    });
  }, [actionFilter, issueFilter, rangeFilter, statusFilter, timeline]);

  const summary = useMemo(() => {
    const ownerDecisions = importDecisions.length + (schedulerDecision ? 1 : 0);
    const verificationRecords = verificationRequests.length;
    const cursorHandoffCount = fixPlanArtifacts.filter(
      (plan) => Boolean(plan.latestCursorHandoffId) || Boolean(plan.latestCursorHandoffStatus),
    ).length;
    const archivedOrVerifiedCount = verificationRequests.filter(
      (item) =>
        item.latestVerificationResult === "verified_fixed" ||
        item.requestStatus === "verification_passed" ||
        item.queueState === "archived",
    ).length;
    const followUpOrBlocked = verificationRequests.filter(
      (item) =>
        item.latestVerificationResult === "still_broken" ||
        item.latestVerificationResult === "needs_follow_up_fix" ||
        item.latestVerificationResult === "verification_blocked" ||
        item.requestStatus === "verification_failed" ||
        item.requestStatus === "verification_blocked",
    ).length;
    return {
      recentRuns: runHistory.length,
      ownerDecisions,
      verificationRecords,
      cursorHandoffCount,
      archivedOrVerifiedCount,
      followUpOrBlocked,
    };
  }, [fixPlanArtifacts, importDecisions.length, runHistory.length, schedulerDecision, verificationRequests]);

  const historyCommandMetrics = useMemo(
    () => [
      {
        key: "recent-runs",
        title: "Recent runs",
        value: loading ? "Checking…" : String(summary.recentRuns),
        subtitle: "Loaded run snapshots",
        icon: History,
        tone: "cyan" as const,
      },
      {
        key: "owner-decisions",
        title: "Owner decisions",
        value: loading ? "Checking…" : String(summary.ownerDecisions),
        subtitle: "Import and scheduler decisions",
        icon: ShieldCheck,
        tone: "amber" as const,
      },
      {
        key: "verification-records",
        title: "Verification records",
        value: loading ? "Checking…" : String(summary.verificationRecords),
        subtitle: "Verification requests in view",
        icon: FileText,
        tone: "indigo" as const,
      },
      {
        key: "cursor-handoffs",
        title: "Cursor handoffs",
        value: loading ? "Checking…" : String(summary.cursorHandoffCount),
        subtitle: "Fix-plan handoff markers",
        icon: Copy,
        tone: "violet" as const,
      },
      {
        key: "archived-verified",
        title: "Archived/verified",
        value: loading ? "Checking…" : String(summary.archivedOrVerifiedCount),
        subtitle: "Closed or verified issues",
        icon: ShieldCheck,
        tone: "emerald" as const,
      },
      {
        key: "follow-up-blocked",
        title: "Follow-up/blocked",
        value: loading ? "Checking…" : String(summary.followUpOrBlocked),
        subtitle: "Needs review or blocked",
        icon: Clock,
        tone: "rose" as const,
      },
    ],
    [loading, summary],
  );

  const historyMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first AgentOps staging surface.",
        tone: "amber" as const,
      },
      {
        key: "access",
        label: "History access",
        value: "Read-only",
        detail: "Review-first history — no scheduler, Cursor, Hermes, or runtime activation.",
        tone: "cyan" as const,
      },
      {
        key: "timeline",
        label: "Timeline scope",
        value: loading ? "Checking…" : String(timeline.length),
        detail: "Owner, verification, run, queue, and scheduler signals.",
        tone: "neutral" as const,
      },
      {
        key: "reports",
        label: "Report artifacts",
        value: loading ? "Checking…" : String(fixPlanArtifacts.length),
        detail: "Fix-plan and verification report markers loaded.",
        tone: "neutral" as const,
      },
    ],
    [fixPlanArtifacts.length, loading, timeline.length],
  );

  const copyPath = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} copied.`);
    } catch {
      setFeedback(`Could not copy ${label.toLowerCase()}.`);
    }
  }, []);

  const historyHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="History"
      subtitle="Runs, owner decisions, verification history, and reports"
      parentLabel="Control Center"
      parentPath="/system/agent-ops"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Control Center
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
            <ListChecks className="mr-2 h-4 w-4" />
            Issues
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </>
      }
    >
      <AixiaCommandMetrics items={historyCommandMetrics} />
    </AixiaHero>
  );

  if (!loading && (!isOwner || error?.toLowerCase().includes("owner access required"))) {
    return (
      <AixiaCommandPageLayout hero={historyHero}>
        <AixiaSection
          surface="command"
          title="AgentOps History"
          description="Owner access required"
          icon={ShieldCheck}
          actions={
            <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops")}>
              Back to Control Center
            </AixiaButton>
          }
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
      hero={historyHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={historyMetaStripItems} />}
    >
      <div data-testid="agentops-history">
        <AixiaSection
          surface="command"
          title="Read-only surface"
          description="History guardrails for this staging route."
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Review-first history">
            History is review-first. This page does not run scheduler, does not trigger Cursor, and does not activate
            Hermes/CodeGraph/local LLM or any runtime automation.
          </AixiaInfoBlock>
        </AixiaSection>

        {feedback ? (
          <AixiaInfoBlock tone="emerald" icon={Copy} title="Clipboard">
            {feedback}
          </AixiaInfoBlock>
        ) : null}

        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaSection
              surface="command"
              title="History data"
              description="Loading timeline and report markers."
              icon={History}
            >
              <AixiaEmptyState
                icon={History}
                title="Loading history snapshots"
                description="History timeline and report markers are being prepared."
              />
            </AixiaSection>
          }
        >
          {error && !error.toLowerCase().includes("owner access required") ? (
            <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Data issue">
              {error}
            </AixiaInfoBlock>
          ) : null}

          <AixiaSection
            surface="command"
            title="Recent activity"
            description="Latest owner feedback, verification, run, queue, and scheduler signals."
            icon={Clock}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Issue code</span>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={issueFilter}
                  onChange={(event) => setIssueFilter(event.target.value)}
                  placeholder="AIXIA-..."
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Action type</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value as TimelineType | "all")}
                >
                  <option value="all">All</option>
                  <option value="run">Run</option>
                  <option value="verification">Verification</option>
                  <option value="automation">Automation</option>
                  <option value="import">Import decision</option>
                  <option value="scheduler">Scheduler decision</option>
                  <option value="queue">Queue/orchestrator</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Status</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as HistoryStatus)}
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Recent</span>
                <select
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  value={rangeFilter}
                  onChange={(event) => setRangeFilter(event.target.value as RecentRange)}
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All available</option>
                </select>
              </label>
            </div>

            {timeline.length === 0 ? (
              <AixiaInfoBlock tone="cyan" icon={History} title="Timeline placeholder">
                History data is available through existing AgentOps feedback/report records; deeper timeline extraction
                will be refined later.
              </AixiaInfoBlock>
            ) : filteredTimeline.length === 0 ? (
              <AixiaEmptyState
                icon={History}
                title="No events match current filters"
                description="Adjust filter selections to view more history items."
                refreshSafe
              />
            ) : (
              <div className="space-y-2">
                {filteredTimeline.slice(0, 20).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <AixiaBadge tone="cyan">{item.type}</AixiaBadge>
                      <AixiaBadge
                        tone={
                          item.statusCategory === "completed"
                            ? "emerald"
                            : item.statusCategory === "blocked"
                              ? "rose"
                              : "amber"
                        }
                      >
                        {item.statusLabel}
                      </AixiaBadge>
                      <span className="text-xs text-slate-500">{formatDateTime(item.timestamp)}</span>
                      {item.issueCode ? (
                        <AixiaButton
                          variant="secondary"
                          className="text-xs px-2 py-1 ml-auto"
                          onClick={() => navigate(`/system/agent-ops/issues/${item.issueCode}`)}
                        >
                          Open issue
                        </AixiaButton>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{item.details}</p>
                    {item.path ? (
                      <AixiaButton
                        variant="secondary"
                        className="mt-2 text-xs px-2 py-1"
                        onClick={() => void copyPath(item.path ?? "", "Path")}
                      >
                        Copy path
                      </AixiaButton>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </AixiaSection>

          <AixiaSection
            surface="command"
            title="Reports"
            description="Stage, verification, and fix-plan artifact paths."
            icon={FileText}
          >
            <div className="space-y-4">
              <details className="rounded-xl border border-white/10 bg-black/20 p-3">
                <summary className="cursor-pointer text-sm font-medium text-white">Stage and browser QA reports</summary>
                <div className="mt-3 space-y-2 text-xs text-slate-300">
                  {[
                    "qa-agent/reports/verification/verification-foundation-run.json",
                    "qa-agent/reports/orchestrator/agentops-orchestrator-run.json",
                    "qa-agent/reports/fix-plans/agentops-fix-plan-summary.md",
                    "qa-agent/reports/browser-qa/role-workflow-findings-review.md",
                  ].map((path) => (
                    <div key={path} className="flex flex-wrap items-center justify-between gap-2">
                      <code>{path}</code>
                      <AixiaButton
                        variant="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => void copyPath(path, "Report path")}
                      >
                        Copy path
                      </AixiaButton>
                    </div>
                  ))}
                </div>
              </details>

              <details className="rounded-xl border border-white/10 bg-black/20 p-3">
                <summary className="cursor-pointer text-sm font-medium text-white">Verification report paths</summary>
                <div className="mt-3 space-y-2">
                  {verificationRequests.filter((item) => Boolean(item.verificationReportPath)).length === 0 ? (
                    <p className="text-xs text-slate-400">No verification report paths recorded yet.</p>
                  ) : (
                    <div className="aixia-scrollbar w-full max-w-full overflow-x-auto pb-2">
                      <AixiaTableShell variant="registry" minWidthClassName="min-w-[900px]">
                        <thead className="aixia-table-head">
                          <tr>
                            <th>Issue</th>
                            <th>Status</th>
                            <th>Report path</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verificationRequests
                            .filter((item) => Boolean(item.verificationReportPath))
                            .slice(0, 12)
                            .map((item) => (
                              <tr key={`verification-report-${item.findingId}`}>
                                <td className="font-mono text-xs text-slate-300">{item.issueCode}</td>
                                <td>{item.requestStatus.replaceAll("_", " ")}</td>
                                <td className="font-mono text-xs text-slate-300">
                                  {item.verificationReportPath}
                                </td>
                                <td>
                                  <AixiaButton
                                    variant="secondary"
                                    className="text-xs px-2 py-1"
                                    onClick={() => void copyPath(item.verificationReportPath ?? "", "Report path")}
                                  >
                                    Copy path
                                  </AixiaButton>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </AixiaTableShell>
                    </div>
                  )}
                </div>
              </details>

              <details className="rounded-xl border border-white/10 bg-black/20 p-3">
                <summary className="cursor-pointer text-sm font-medium text-white">Cursor handoffs / fix-plan artifacts</summary>
                <div className="mt-3 space-y-2">
                  {fixPlanArtifacts.length === 0 ? (
                    <p className="text-xs text-slate-400">No fix-plan artifact records loaded.</p>
                  ) : (
                    <div className="aixia-scrollbar w-full max-w-full overflow-x-auto pb-2">
                      <AixiaTableShell variant="registry" minWidthClassName="min-w-[1100px]">
                        <thead className="aixia-table-head">
                          <tr>
                            <th>Issue</th>
                            <th>Plan</th>
                            <th>Cursor handoff status</th>
                            <th>Markdown path</th>
                            <th>JSON path</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fixPlanArtifacts.map((item) => (
                            <tr key={`fix-artifact-${item.planId}`}>
                              <td className="font-mono text-xs text-slate-300">{item.issueCode}</td>
                              <td className="font-mono text-xs text-slate-300">{item.planId}</td>
                              <td>{item.latestCursorHandoffStatus?.replaceAll("_", " ") ?? "—"}</td>
                              <td className="font-mono text-xs text-slate-300">{item.markdownPath}</td>
                              <td className="font-mono text-xs text-slate-300">{item.jsonPath}</td>
                            </tr>
                          ))}
                        </tbody>
                      </AixiaTableShell>
                    </div>
                  )}
                </div>
              </details>

              {latestOrchestratorReportPath ? (
                <AixiaInfoBlock tone="cyan" icon={FileText} title="Latest orchestrator report marker">
                  <div className="flex flex-wrap items-center gap-2">
                    <code>{latestOrchestratorReportPath}</code>
                    <AixiaButton
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => void copyPath(latestOrchestratorReportPath, "Orchestrator report path")}
                    >
                      Copy path
                    </AixiaButton>
                  </div>
                </AixiaInfoBlock>
              ) : null}
            </div>
          </AixiaSection>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}
